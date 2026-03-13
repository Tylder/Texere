import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType } from './types.js';

import { Texere } from './index.js';

const searchResults = async (db: Texere, options: Parameters<Texere['search']>[0]) =>
  (await db.search(options)).results;

const aboutResults = async (db: Texere, options: Parameters<Texere['about']>[0]) =>
  (await db.about(options)).results;

const traverseResults = (db: Texere, options: Parameters<Texere['traverse']>[0]) =>
  db.traverse(options).results;

describe('Integration: Semantic Search End-to-End', () => {
  let db: Texere;

  beforeEach(() => {
    db = new Texere(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('vocabulary mismatch (semantic mode)', () => {
    it('finds JWT authentication node via "login session management" query', async () => {
      const authNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Authentication uses JWT tokens',
        content: 'We use JSON Web Tokens with 24h expiry for stateless authentication',
        tags: ['auth'],
      });

      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Redis caching strategy',
        content: 'Use Redis for cache invalidation with TTL policy',
        tags: ['cache'],
      });

      const results = await searchResults(db, {
        query: 'login session management',
        mode: 'semantic',
      });

      // Closest semantic match should rank first
      expect(results[0]!.id).toBe(authNode.id);
      expect(results[0]?.search_mode).toBe('semantic');
      // Should return exactly 2 nodes
      expect(results).toHaveLength(2);
    }, 30_000);

    it('finds PostgreSQL node via "how is data stored" query', async () => {
      const dbNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Database uses PostgreSQL',
        content: 'PostgreSQL with connection pooling and read replicas for data persistence',
        tags: ['database'],
      });

      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'CI/CD pipeline configuration',
        content: 'GitHub Actions for continuous integration and deployment workflow',
        tags: ['ci'],
      });

      const results = await searchResults(db, {
        query: 'how is data stored',
        mode: 'semantic',
      });

      // PostgreSQL node should rank above CI/CD node (semantically closer)
      expect(results[0]!.id).toBe(dbNode.id);
      expect(results).toHaveLength(2);
    }, 30_000);
  });

  describe('keyword regression (V1 behavior)', () => {
    it('finds JWT node via exact keyword "JWT"', async () => {
      const authNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'JWT authentication',
        content: 'Token-based auth with JWT',
        tags: ['auth'],
      });

      const results = await searchResults(db, {
        query: 'JWT',
        mode: 'keyword',
      });

      // Exact keyword match should be first result
      expect(results[0]!.id).toBe(authNode.id);
      expect(results[0]?.search_mode).toBe('keyword');
    });
  });

  describe('hybrid RRF boost', () => {
    it('boosts nodes matching both keyword AND semantic over keyword-only', async () => {
      const dualMatchNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'JWT session management',
        content: 'JWT tokens for session handling and user authentication',
        tags: ['auth'],
      });

      // FTS5 implicit AND: "JWT session" requires BOTH tokens in document.
      // This node has "JWT" but not "session" → keyword miss, semantic only.
      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'JWT library comparison',
        content: 'Comparing jose and jsonwebtoken npm packages for JWT parsing',
        tags: ['auth'],
      });

      const results = await searchResults(db, {
        query: 'JWT session',
        mode: 'hybrid',
      });

      // Dual-match node (keyword + semantic) should rank first
      expect(results[0]!.id).toBe(dualMatchNode.id);
      expect(results[0]?.search_mode).toBe('hybrid');
      // Dual-match should have higher match_quality than keyword-only match
      expect(results[0]!.match_quality).toBeGreaterThan(results[1]!.match_quality);
    }, 30_000);
  });

  describe('negative precision (semantic mode)', () => {
    it('does NOT return completely unrelated nodes', async () => {
      // Related nodes (authentication domain)
      const authNode1 = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'JWT authentication strategy',
        content: 'Use JSON Web Tokens for stateless authentication with 24h expiry',
        tags: ['auth'],
      });

      const authNode2 = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: 'OAuth2 integration',
        content: 'OAuth2 provider integration for third-party authentication',
        tags: ['auth'],
      });

      // Unrelated nodes (completely different domains)
      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Database sharding strategy',
        content: 'Horizontal sharding by user ID for PostgreSQL scalability',
        tags: ['database'],
      });

      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: 'CSS grid layout patterns',
        content: 'Responsive grid layouts using CSS Grid specification',
        tags: ['frontend'],
      });

      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Logging infrastructure',
        content: 'Centralized logging with structured JSON logs to CloudWatch',
        tags: ['observability'],
      });

      const results = await searchResults(db, {
        query: 'authentication and login',
        mode: 'semantic',
        limit: 3,
      });

      // Top 2 results should be auth-related nodes (order may vary)
      expect(results.length).toBeGreaterThanOrEqual(2);
      const topTwoIds = [results[0]!.id, results[1]!.id];
      expect(topTwoIds).toContain(authNode1.id);
      expect(topTwoIds).toContain(authNode2.id);
    }, 30_000);
  });

  describe('invalidation exclusion', () => {
    it('excludes invalidated node from all search modes', async () => {
      const invalidatedNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Deprecated authentication method',
        content: 'Old authentication approach using basic auth',
        tags: ['auth'],
      });

      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: 'API rate limiting policy',
        content: 'Rate limiting set to 100 requests per minute',
        tags: ['api'],
      });

      db.invalidateNode(invalidatedNode.id);

      const keywordResults = await searchResults(db, { query: 'authentication', mode: 'keyword' });
      const semanticResults = await searchResults(db, {
        query: 'authentication approach',
        mode: 'semantic',
      });
      const hybridResults = await searchResults(db, { query: 'authentication', mode: 'hybrid' });

      expect(keywordResults.every((r) => r.id !== invalidatedNode.id)).toBe(true);
      expect(semanticResults.every((r) => r.id !== invalidatedNode.id)).toBe(true);
      expect(hybridResults.every((r) => r.id !== invalidatedNode.id)).toBe(true);
    }, 30_000);
  });

  describe('about() integration (search + traversal)', () => {
    it('finds seed via keyword search and traverses to connected nodes', async () => {
      // decision --RESOLVES--> problem <--RESOLVES-- solution
      const decision = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'JWT authentication decision',
        content: 'Chose JWT tokens with 24h expiry for authentication',
        tags: ['auth'],
      });

      const problem = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Stateful sessions problem',
        content: 'Server memory issues with stateful sessions',
        tags: ['sessions'],
      });

      const solution = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Stateless token solution',
        content: 'Stateless auth via signed tokens',
        tags: ['auth'],
      });

      db.createEdge({ source_id: decision.id, target_id: problem.id, type: EdgeType.Resolves });
      db.createEdge({ source_id: solution.id, target_id: problem.id, type: EdgeType.Resolves });

      const results = await aboutResults(db, {
        query: 'authentication',
        direction: 'both',
        maxDepth: 2,
      });

      const ids = results.map((r) => r.node.id);
      expect(ids).toContain(decision.id);
      expect(ids).toContain(problem.id);
      expect(ids).toContain(solution.id);
    });

    it('semantic search seeds + manual traverse reaches connected nodes', async () => {
      const decision = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Use JWT for authentication',
        content: 'JWT tokens with 24h expiry for stateless auth',
        tags: ['auth'],
      });

      const problem = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Stateful sessions memory problem',
        content: 'Server memory issues with sessions',
        tags: ['sessions'],
      });

      db.createEdge({ source_id: decision.id, target_id: problem.id, type: EdgeType.Resolves });

      const seeds = await searchResults(db, {
        query: 'login session management',
        mode: 'semantic',
      });
      const seedIds = seeds.map((r) => r.id);
      expect(seedIds).toContain(decision.id);

      const traversed = traverseResults(db, {
        startId: decision.id,
        direction: 'outgoing',
        maxDepth: 2,
      });
      const traversedIds = traversed.map((r) => r.node.id);
      expect(traversedIds).toContain(problem.id);
    }, 30_000);
  });
});
