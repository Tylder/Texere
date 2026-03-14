/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge } from './edges.js';
import { invalidateNode, storeNode } from './nodes.js';
import { searchGraph, stats, traverse } from './traverse.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

const traverseResults = (db: Database.Database, options: Parameters<typeof traverse>[1]) =>
  traverse(db, options).results;

const searchGraphResults = (db: Database.Database, options: Parameters<typeof searchGraph>[1]) =>
  searchGraph(db, options).results;

const collectTraversePages = (db: Database.Database, options: Parameters<typeof traverse>[1]) => {
  const all: ReturnType<typeof traverse>['results'] = [];
  let cursor = options.cursor;

  while (true) {
    const page = traverse(db, {
      ...options,
      ...(cursor ? { cursor } : {}),
    });
    all.push(...page.results);
    if (!page.page.hasMore || !page.page.nextCursor) {
      return all;
    }
    cursor = page.page.nextCursor;
  }
};

const collectSearchGraphPages = (
  db: Database.Database,
  options: Parameters<typeof searchGraph>[1],
) => {
  const all: ReturnType<typeof searchGraph>['results'] = [];
  let cursor = options.cursor;

  while (true) {
    const page = searchGraph(db, {
      ...options,
      ...(cursor ? { cursor } : {}),
    });
    all.push(...page.results);
    if (!page.page.hasMore || !page.page.nextCursor) {
      return all;
    }
    cursor = page.page.nextCursor;
  }
};

const makeNode = (
  db: Database.Database,
  opts: {
    type: NodeType;
    role: NodeRole;
    title: string;
    content: string;
    tags?: string[];
    importance?: number;
    confidence?: number;
  },
) => storeNode(db, opts);
const embeddingOf = (first: number, second = 0): Float32Array => {
  const embedding = new Float32Array(384);
  embedding[0] = first;
  embedding[1] = second;
  return embedding;
};
const toBuffer = (embedding: Float32Array): Buffer =>
  Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
const storeEmbedding = (db: Database.Database, nodeId: string, embedding: Float32Array): void => {
  db.prepare('INSERT OR REPLACE INTO nodes_vec(node_id, embedding) VALUES (?, ?)').run(
    nodeId,
    toBuffer(embedding),
  );
};
const toDepthById = (rows: Array<{ node: { id: string }; depth: number }>): Map<string, number> =>
  new Map(rows.map((row) => [row.node.id, row.depth]));

describe('traverse', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it("follows outgoing edges with traverse({ direction: 'outgoing', maxDepth: 2 })", () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const depth1 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth1',
      content: 'Depth1',
    });
    const depth2 = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Depth2',
      content: 'Depth2',
    });
    const depth3 = makeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.Technology,
      title: 'Depth3',
      content: 'Depth3',
    });

    createEdge(db, { source_id: start.id, target_id: depth1.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: depth1.id, target_id: depth2.id, type: EdgeType.DependsOn });
    createEdge(db, { source_id: depth2.id, target_id: depth3.id, type: EdgeType.BasedOn });

    const result = traverseResults(db, { startId: start.id, direction: 'outgoing', maxDepth: 2 });
    const depthById = toDepthById(result);

    expect(depthById.get(depth1.id)).toBe(1);
    expect(depthById.get(depth2.id)).toBe(2);
    expect(depthById.has(depth3.id)).toBe(false);
  });

  it("follows incoming edges with traverse({ direction: 'incoming', maxDepth: 2 })", () => {
    const upstream2 = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Upstream2',
      content: 'U2',
    });
    const upstream1 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Upstream1',
      content: 'U1',
    });
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });

    createEdge(db, { source_id: upstream1.id, target_id: start.id, type: EdgeType.Causes });
    createEdge(db, { source_id: upstream2.id, target_id: upstream1.id, type: EdgeType.DependsOn });

    const result = traverseResults(db, { startId: start.id, direction: 'incoming', maxDepth: 2 });
    const depthById = toDepthById(result);

    expect(depthById.get(upstream1.id)).toBe(1);
    expect(depthById.get(upstream2.id)).toBe(2);
  });

  it("follows both directions with traverse({ direction: 'both', maxDepth: 2 })", () => {
    const incoming = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Incoming',
      content: 'Incoming',
    });
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const outgoing = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Outgoing',
      content: 'Outgoing',
    });

    createEdge(db, { source_id: incoming.id, target_id: start.id, type: EdgeType.Causes });
    createEdge(db, { source_id: start.id, target_id: outgoing.id, type: EdgeType.Resolves });

    const result = traverseResults(db, { startId: start.id, direction: 'both', maxDepth: 2 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(incoming.id)).toBe(true);
    expect(ids.has(outgoing.id)).toBe(true);
  });

  it('respects maxDepth and excludes nodes beyond it', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const d1 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'D1',
      content: 'D1',
    });
    const d2 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'D2',
      content: 'D2',
    });
    const d3 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'D3',
      content: 'D3',
    });

    createEdge(db, { source_id: start.id, target_id: d1.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: d1.id, target_id: d2.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: d2.id, target_id: d3.id, type: EdgeType.Resolves });

    const result = traverseResults(db, { startId: start.id, maxDepth: 2 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(d1.id)).toBe(true);
    expect(ids.has(d2.id)).toBe(true);
    expect(ids.has(d3.id)).toBe(false);
  });

  it('excludes invalidated nodes from traversal output', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const active = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Active',
      content: 'Active',
    });
    const invalidated = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Invalidated',
      content: 'Invalidated',
    });

    createEdge(db, { source_id: start.id, target_id: active.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: active.id, target_id: invalidated.id, type: EdgeType.DependsOn });
    invalidateNode(db, invalidated.id);

    const result = traverseResults(db, { startId: start.id, maxDepth: 3 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(active.id)).toBe(true);
    expect(ids.has(invalidated.id)).toBe(false);
  });

  it('returns empty for nonexistent start node', () => {
    const result = traverseResults(db, { startId: 'missing-node-id' });
    expect(result).toEqual([]);
  });

  it('returns empty when start node has no edges', () => {
    const lonely = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Lonely',
      content: 'Lonely',
    });
    const result = traverseResults(db, { startId: lonely.id });
    expect(result).toEqual([]);
  });

  it('handles cycles without infinite recursion via depth limit', () => {
    const a = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'A',
      content: 'A',
    });
    const b = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'B',
      content: 'B',
    });
    const c = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'C',
      content: 'C',
    });

    createEdge(db, { source_id: a.id, target_id: b.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: b.id, target_id: c.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: c.id, target_id: a.id, type: EdgeType.BasedOn });

    const result = traverseResults(db, { startId: a.id, direction: 'outgoing', maxDepth: 4 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(b.id)).toBe(true);
    expect(ids.has(c.id)).toBe(true);
    expect(ids.has(a.id)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('applies edge type filter when provided', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const solves = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Solves',
      content: 'Solves',
    });
    const causes = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Causes',
      content: 'Causes',
    });

    createEdge(db, { source_id: start.id, target_id: solves.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: start.id, target_id: causes.id, type: EdgeType.Causes });

    const result = traverseResults(db, {
      startId: start.id,
      edgeType: EdgeType.Resolves,
      maxDepth: 2,
    });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(solves.id)).toBe(true);
    expect(ids.has(causes.id)).toBe(false);
  });

  it('uses default maxDepth of 3 when maxDepth is omitted', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const d1 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D1',
      content: 'D1',
    });
    const d2 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D2',
      content: 'D2',
    });
    const d3 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D3',
      content: 'D3',
    });
    const d4 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D4',
      content: 'D4',
    });

    createEdge(db, { source_id: start.id, target_id: d1.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: d1.id, target_id: d2.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: d2.id, target_id: d3.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: d3.id, target_id: d4.id, type: EdgeType.BasedOn });

    const result = traverseResults(db, { startId: start.id, direction: 'outgoing' });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(d1.id)).toBe(true);
    expect(ids.has(d2.id)).toBe(true);
    expect(ids.has(d3.id)).toBe(true);
    expect(ids.has(d4.id)).toBe(false);
  });

  it('caps maxDepth at 5 when input exceeds limit', () => {
    const nodes = Array.from({ length: 7 }, (_, idx) =>
      makeNode(db, {
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: `N${idx}`,
        content: `N${idx}`,
      }),
    );

    for (let idx = 0; idx < nodes.length - 1; idx += 1) {
      createEdge(db, {
        source_id: nodes[idx]!.id,
        target_id: nodes[idx + 1]!.id,
        type: EdgeType.BasedOn,
      });
    }

    const result = traverseResults(db, { startId: nodes[0]!.id, maxDepth: 99 });
    const depthById = toDepthById(result);

    expect(depthById.get(nodes[5]!.id)).toBe(5);
    expect(depthById.has(nodes[6]!.id)).toBe(false);
  });
});

describe('searchGraph', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('finds seed nodes via FTS and traverses neighbors', () => {
    const seed = makeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.Technology,
      title: 'SQLite recursion',
      content: 'Recursive CTE patterns',
      tags: ['sqlite'],
    });
    const neighbor = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Use CTE traversal',
      content: 'Decision referencing SQLite',
    });

    createEdge(db, { source_id: seed.id, target_id: neighbor.id, type: EdgeType.BasedOn });

    const result = searchGraphResults(db, {
      query: 'SQLite',
      maxDepth: 2,
      direction: 'outgoing',
    });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(seed.id)).toBe(true);
    expect(ids.has(neighbor.id)).toBe(true);
  });

  it('applies searchGraph filters for type, role, tags, and minimum importance', () => {
    const matchingSeed = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite auth decision',
      content: 'SQLite auth decision for token persistence',
      tags: ['auth', 'db'],
    });
    const matchingNeighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'SQLite auth implementation',
      content: 'Use SQLite-backed token persistence',
      tags: ['auth'],
    });
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'SQLite auth finding',
      content: 'Observed SQLite auth latency',
      tags: ['auth', 'db'],
    });
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite auth low-importance',
      content: 'SQLite auth low-importance note',
      tags: ['auth', 'db'],
      importance: 0.2,
    });
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite untagged decision',
      content: 'SQLite auth decision without required tags',
      tags: ['ops'],
    });

    createEdge(db, {
      source_id: matchingSeed.id,
      target_id: matchingNeighbor.id,
      type: EdgeType.Resolves,
    });

    const result = searchGraphResults(db, {
      query: 'SQLite auth',
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      tags: ['auth', 'db'],
      minImportance: 0.5,
      maxDepth: 1,
    });

    expect(result.map((row) => row.node.id)).toEqual([matchingSeed.id, matchingNeighbor.id]);
  });

  it('supports searchGraph tagMode any across seed selection', () => {
    const redis = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Redis cache plan',
      content: 'Redis cache plan for auth state',
      tags: ['redis'],
    });
    const sql = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQL cache plan',
      content: 'SQL cache plan for auth state',
      tags: ['sql'],
    });
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Memcached cache plan',
      content: 'Memcached cache plan for auth state',
      tags: ['memcached'],
    });

    const result = searchGraphResults(db, {
      query: 'cache plan',
      tags: ['redis', 'sql'],
      tagMode: 'any',
      maxDepth: 0,
    });

    expect(new Set(result.map((row) => row.node.id))).toEqual(new Set([redis.id, sql.id]));
  });

  it('uses explicit semantic mode for searchGraph seed ranking', () => {
    const auth = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'JWT auth decision',
      content: 'Use JWT with refresh tokens.',
      tags: ['auth'],
    });
    const database = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Database indexing',
      content: 'Use SQLite indexes.',
      tags: ['db'],
    });

    storeEmbedding(db, auth.id, embeddingOf(1, 0));
    storeEmbedding(db, database.id, embeddingOf(0, 1));

    const result = searchGraph(
      db,
      { query: 'session management', mode: 'semantic', maxDepth: 0 },
      embeddingOf(1, 0),
    );

    expect(result.page.mode).toBe('semantic');
    expect(result.results[0]!.node.id).toBe(auth.id);
    expect(result.results.map((row) => row.node.id)).toContain(database.id);
  });

  it('applies searchGraph edgeType with incoming traversal', () => {
    const problem = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Auth timeout problem',
      content: 'Users hit auth timeout errors.',
    });
    const solution = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Auth timeout solution',
      content: 'Increase refresh retry window.',
    });
    const dependency = makeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.Technology,
      title: 'Retry library',
      content: 'Retry helper library.',
    });

    createEdge(db, { source_id: problem.id, target_id: solution.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: dependency.id, target_id: solution.id, type: EdgeType.DependsOn });

    const result = searchGraphResults(db, {
      query: 'timeout solution',
      direction: 'incoming',
      edgeType: EdgeType.Resolves,
      maxDepth: 1,
    });

    expect(result.map((row) => row.node.id)).toEqual([solution.id, problem.id]);
  });

  it('limits seed collection before traversal with seedLimit', () => {
    const seedA = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Primary auth seed',
      content: 'auth seed auth seed with the strongest exact match',
      tags: ['auth', 'seed'],
    });
    const seedB = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Secondary candidate',
      content: 'auth seed candidate',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Only seed B neighbor',
      content: 'neighbor reachable only from seed B',
    });

    createEdge(db, { source_id: seedB.id, target_id: neighbor.id, type: EdgeType.Resolves });

    const limited = searchGraphResults(db, {
      query: 'auth seed',
      seedLimit: 1,
      maxDepth: 1,
    });
    const full = searchGraphResults(db, {
      query: 'auth seed',
      seedLimit: 2,
      maxDepth: 1,
    });

    expect(limited.map((row) => row.node.id)).not.toContain(neighbor.id);
    expect(full.map((row) => row.node.id)).toContain(neighbor.id);
    expect(full.map((row) => row.node.id)).toContain(seedA.id);
  });

  it('filters weak seeds with minSeedRelevance', () => {
    const strong = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'JWT session management',
      content: 'JWT session management with refresh rotation',
      tags: ['auth'],
    });
    const weaker = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'JWT notes',
      content: 'Session management notes with partial overlap',
      tags: ['notes'],
    });
    const weakNeighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Weak neighbor',
      content: 'Only reachable from weaker seed',
    });

    createEdge(db, { source_id: weaker.id, target_id: weakNeighbor.id, type: EdgeType.Resolves });

    const permissive = searchGraphResults(db, {
      query: 'JWT session management',
      minSeedRelevance: 0,
      maxDepth: 1,
    });
    const strict = searchGraphResults(db, {
      query: 'JWT session management',
      minSeedRelevance: 0.95,
      maxDepth: 1,
    });

    expect(permissive.map((row) => row.node.id)).toContain(weakNeighbor.id);
    expect(strict.map((row) => row.node.id)).not.toContain(weakNeighbor.id);
    expect(strict.map((row) => row.node.id)).toContain(strong.id);
  });

  it('returns search + traversal nodes deduplicated by id', () => {
    const seed = makeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.Technology,
      title: 'SQLite search seed',
      content: 'SQLite',
      tags: ['sqlite'],
    });
    const matchingNeighbor = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite neighbor',
      content: 'SQLite usage',
    });

    createEdge(db, {
      source_id: seed.id,
      target_id: matchingNeighbor.id,
      type: EdgeType.BasedOn,
    });

    const result = searchGraphResults(db, { query: 'SQLite', maxDepth: 2 });
    const ids = result.map((row) => row.node.id);
    const unique = new Set(ids);

    expect(unique.has(seed.id)).toBe(true);
    expect(unique.has(matchingNeighbor.id)).toBe(true);
    expect(ids.length).toBe(unique.size);
  });

  it('returns empty when search finds no seed nodes', () => {
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Unrelated',
      content: 'No sqlite here',
    });
    const result = searchGraphResults(db, { query: 'nonexistentqueryterm' });
    expect(result).toEqual([]);
  });

  it('paginates traverse results with stable ordering', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Pagination start',
      content: 'root',
    });
    const depth1a = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth1a',
      content: 'one',
    });
    const depth1b = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth1b',
      content: 'two',
    });
    const depth2 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth2',
      content: 'three',
    });

    createEdge(db, { source_id: start.id, target_id: depth1a.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: start.id, target_id: depth1b.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: depth1a.id, target_id: depth2.id, type: EdgeType.BasedOn });

    const page1 = traverse(db, { startId: start.id, limit: 2 });
    expect(page1.page.hasMore).toBe(true);
    expect(page1.page.nextCursor).not.toBeNull();

    const page2 = traverse(db, { startId: start.id, limit: 2, cursor: page1.page.nextCursor! });

    const ids = new Set([...page1.results, ...page2.results].map((row) => row.node.id));
    expect(ids.size).toBe(3);
    expect(page1.page.hasMore).toBe(true);
    expect(page2.page.hasMore).toBe(false);
  });

  it('returns no traversal rows at maxDepth 0', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Depth zero start',
      content: 'root',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Neighbor',
      content: 'one hop',
    });

    createEdge(db, { source_id: start.id, target_id: neighbor.id, type: EdgeType.BasedOn });

    const page = traverse(db, { startId: start.id, maxDepth: 0 });
    expect(page.results).toEqual([]);
    expect(page.page.hasMore).toBe(false);
  });

  it('rejects malformed traverse cursors', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Traverse bad cursor start',
      content: 'root',
    });

    expect(() => traverse(db, { startId: start.id, cursor: 'not-a-cursor' })).toThrow(
      'Invalid cursor',
    );
  });

  it('rejects traverse cursors when request scope changes', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Traverse scope start',
      content: 'root',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse scope neighbor',
      content: 'one hop',
    });
    const otherNeighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse scope other neighbor',
      content: 'second hop peer',
    });

    createEdge(db, { source_id: start.id, target_id: neighbor.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: start.id, target_id: otherNeighbor.id, type: EdgeType.BasedOn });

    const firstPage = traverse(db, { startId: start.id, direction: 'outgoing', limit: 1 });
    expect(firstPage.page.hasMore).toBe(true);
    expect(firstPage.page.nextCursor).not.toBeNull();

    expect(() =>
      traverse(db, {
        startId: start.id,
        direction: 'incoming',
        limit: 1,
        cursor: firstPage.page.nextCursor!,
      }),
    ).toThrow('Cursor does not match the current request');
  });

  it('matches single large-page results when collecting all traverse pages', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Traverse roundtrip start',
      content: 'root',
    });
    const depth1a = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse roundtrip a',
      content: 'a',
    });
    const depth1b = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse roundtrip b',
      content: 'b',
    });
    const depth2 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse roundtrip c',
      content: 'c',
    });

    createEdge(db, { source_id: start.id, target_id: depth1a.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: start.id, target_id: depth1b.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: depth1a.id, target_id: depth2.id, type: EdgeType.BasedOn });

    const allPaged = collectTraversePages(db, { startId: start.id, limit: 1 });
    const singlePage = traverse(db, { startId: start.id, limit: 10 });

    expect(allPaged.map((row) => row.node.id)).toEqual(
      singlePage.results.map((row) => row.node.id),
    );
  });

  it('paginates searchGraph results after deduplication', () => {
    const seedA = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Auth timeout A',
      content: 'timeout details',
    });
    const seedB = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Auth timeout B',
      content: 'timeout details',
    });
    const shared = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Shared solution',
      content: 'use longer retry window',
    });

    createEdge(db, { source_id: seedA.id, target_id: shared.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: seedB.id, target_id: shared.id, type: EdgeType.Resolves });

    const page1 = searchGraph(db, {
      query: 'timeout',
      direction: 'both',
      maxDepth: 2,
      limit: 2,
    });
    expect(page1.page.hasMore).toBe(true);
    expect(page1.page.nextCursor).not.toBeNull();

    const page2 = searchGraph(db, {
      query: 'timeout',
      direction: 'both',
      maxDepth: 2,
      limit: 2,
      cursor: page1.page.nextCursor!,
    });

    const ids = new Set([...page1.results, ...page2.results].map((row) => row.node.id));
    expect(ids.has(shared.id)).toBe(true);
    expect(ids.size).toBe(3);
  });

  it('keeps only seeds when searchGraph maxDepth is 0', () => {
    const seed = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Auth zero depth seed only',
      content: 'seed-only lookup',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Zero depth neighbor',
      content: 'use longer retry window',
    });

    createEdge(db, { source_id: seed.id, target_id: neighbor.id, type: EdgeType.Resolves });

    const page = searchGraph(db, { query: 'seed-only', maxDepth: 0 });
    expect(page.results.some((row) => row.depth > 0)).toBe(false);
    expect(page.results.map((row) => row.node.id)).toContain(seed.id);
  });

  it('rejects malformed searchGraph cursors', () => {
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Timeout cursor seed',
      content: 'timeout details',
    });

    expect(() => searchGraph(db, { query: 'timeout', cursor: 'not-a-cursor' })).toThrow(
      'Invalid cursor',
    );
  });

  it('rejects searchGraph cursors when request scope changes', () => {
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'About scope seed',
      content: 'timeout details',
    });
    makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'About scope solution',
      content: 'timeout solution',
    });

    const firstPage = searchGraph(db, { query: 'timeout', direction: 'outgoing', limit: 1 });
    expect(firstPage.page.hasMore).toBe(true);
    expect(firstPage.page.nextCursor).not.toBeNull();

    expect(() =>
      searchGraph(db, {
        query: 'timeout',
        direction: 'incoming',
        limit: 1,
        cursor: firstPage.page.nextCursor!,
      }),
    ).toThrow('Cursor does not match the current request');
  });

  it('preserves search relevance ranking for seeds at depth 0', () => {
    // Create 15 old nodes that match the query equally well via BM25
    for (let i = 0; i < 15; i++) {
      makeNode(db, {
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: `Database migration issue ${i}`,
        content: 'database migration failed during deployment',
      });
    }

    // Create a node that ranks higher in search (matched in title, content, AND tags)
    const bestMatch = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Database migration strategy',
      content: 'database migration with zero-downtime deployment',
      tags: ['database', 'migration'],
    });

    const { results: searchResults } = searchGraph(db, {
      query: 'database migration',
      limit: 5,
    });

    const searchRankedIds = searchResults.map((row) => row.node.id);

    // searchGraph() sorts seeds by created_at ASC, so the 15 older nodes fill the first page
    // and push bestMatch (the newest, last-created) out of the top 5.
    // If ranking were preserved, bestMatch would appear in the top 5.
    expect(searchRankedIds).toContain(bestMatch.id);
  });

  it('matches single large-page results when collecting all searchGraph pages', () => {
    const seedA = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'About roundtrip seed A',
      content: 'about roundtrip timeout',
    });
    const seedB = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'About roundtrip seed B',
      content: 'about roundtrip timeout',
    });
    const shared = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'About roundtrip shared',
      content: 'shared remedy',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'About roundtrip neighbor',
      content: 'neighbor remedy',
    });

    createEdge(db, { source_id: seedA.id, target_id: shared.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: seedB.id, target_id: shared.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: shared.id, target_id: neighbor.id, type: EdgeType.BasedOn });

    const allPaged = collectSearchGraphPages(db, {
      query: 'about roundtrip timeout',
      direction: 'both',
      maxDepth: 2,
      limit: 1,
    });
    const ids = allPaged.map((row) => row.node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set([seedA.id, seedB.id, shared.id, neighbor.id]));
  });
});

describe('stats', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('returns node and edge totals plus by-type breakdowns and invalidated count', () => {
    const decision = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Decision',
      content: 'Decision',
    });
    const problem = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Problem',
      content: 'Problem',
    });
    const solution = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Solution',
      content: 'Solution',
    });

    createEdge(db, { source_id: decision.id, target_id: solution.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: problem.id, target_id: decision.id, type: EdgeType.Causes });

    invalidateNode(db, problem.id);

    expect(stats(db)).toEqual({
      nodes: {
        total: 3,
        byType: {
          [NodeType.Knowledge]: 1,
          [NodeType.Issue]: 1,
          [NodeType.Action]: 1,
        },
        invalidated: 1,
      },
      edges: {
        total: 2,
        byType: {
          [EdgeType.Resolves]: 1,
          [EdgeType.Causes]: 1,
        },
      },
    });
  });
});
