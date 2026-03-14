/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge } from './edges.js';
import { invalidateNode, storeNode, type StoreNodeInput } from './nodes.js';
import { detectSearchMode, search } from './search.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

const searchResults = (
  db: Database.Database,
  options: Parameters<typeof search>[1],
  queryEmbedding?: Float32Array,
) => search(db, options, queryEmbedding).results;

const collectSearchPages = (
  db: Database.Database,
  options: Parameters<typeof search>[1],
  queryEmbedding?: Float32Array,
) => {
  const all: ReturnType<typeof search>['results'] = [];
  let cursor = options.cursor;

  while (true) {
    const page = search(
      db,
      {
        ...options,
        ...(cursor ? { cursor } : {}),
      },
      queryEmbedding,
    );
    all.push(...page.results);
    if (!page.page.hasMore || !page.page.nextCursor) {
      return all;
    }
    cursor = page.page.nextCursor;
  }
};

const store = (db: Database.Database, overrides: Partial<StoreNodeInput> = {}) =>
  storeNode(db, {
    type: NodeType.Knowledge,
    role: NodeRole.Decision,
    title: 'default title',
    content: 'default content',
    tags: [],
    ...overrides,
  } as StoreNodeInput);

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

describe('search', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('returns SearchResult with rank, match_quality, match_fields, relationships', () => {
    store(db, {
      title: 'SQLite indexing strategy',
      content: 'Use FTS5 BM25 ranking for retrieval.',
      tags: ['database'],
    });

    const results = searchResults(db, { query: 'SQLite' });
    expect(results).toHaveLength(1);

    const r = results[0]!;
    expect(r.rank).toBeTypeOf('number');
    expect(r.rank).toBeLessThan(0);
    expect(r.match_quality).toBeTypeOf('number');
    expect(r.match_quality).toBeGreaterThan(0);
    expect(r.match_quality).toBeLessThanOrEqual(1);
    expect(r.match_fields).toBeInstanceOf(Array);
    expect(r.match_fields.length).toBeGreaterThan(0);
    expect(r.relationships).toHaveProperty('incoming');
    expect(r.relationships).toHaveProperty('outgoing');
  });

  it('finds node when query term appears only in tags', () => {
    store(db, {
      title: 'Storage overview',
      content: 'General storage discussion.',
      tags: ['redis'],
    });

    const results = searchResults(db, { query: 'redis' });
    expect(results).toHaveLength(1);
  });

  it('finds node when query terms are split across title and tags', () => {
    store(db, { title: 'Caching strategy', content: 'How to cache data.', tags: ['redis'] });

    const results = searchResults(db, { query: 'redis caching' });
    expect(results).toHaveLength(1);
  });

  it('finds node when query terms are split across content and tags', () => {
    store(db, { title: 'Infrastructure plan', content: 'Set up caching layer.', tags: ['redis'] });

    const results = searchResults(db, { query: 'redis caching' });
    expect(results).toHaveLength(1);
  });

  it('does not find node when one query term is missing from all columns', () => {
    store(db, { title: 'Database options', content: 'Various storage backends.', tags: ['redis'] });

    const results = searchResults(db, { query: 'redis caching' });
    expect(results).toHaveLength(0);
  });

  it('finds all nodes matching across different column combinations', () => {
    store(db, { title: 'Redis caching', content: 'In-memory store.', tags: ['performance'] });
    store(db, { title: 'Performance tuning', content: 'Use caching for speed.', tags: ['redis'] });
    store(db, { title: 'Speed improvements', content: 'Redis helps.', tags: ['caching'] });
    store(db, { title: 'Unrelated', content: 'Nothing relevant here.', tags: ['database'] });

    const results = searchResults(db, { query: 'redis caching' });
    expect(results).toHaveLength(3);
  });

  it('keyword match_quality increases with stronger BM25 rank', () => {
    store(db, {
      title: 'Redis caching strategy',
      content: 'Redis provides fast in-memory caching for session data.',
      tags: ['redis', 'caching'],
    });
    store(db, {
      title: 'Caching overview',
      content: 'Redis is one option among many caching backends.',
      tags: ['database'],
    });

    const results = searchResults(db, { query: 'Redis caching' });
    expect(results.length).toBeGreaterThanOrEqual(2);

    const better = results[0]!;
    const worse = results[1]!;

    expect(better.rank).toBeLessThan(worse.rank);
    expect(better.match_quality).toBeGreaterThan(worse.match_quality);
  });

  it('returns nodes matching title/content/tags via BM25', () => {
    const titleMatch = store(db, {
      title: 'SQLite indexing strategy',
      content: 'Use FTS5 BM25 ranking for retrieval.',
      tags: ['database'],
    });
    const contentMatch = store(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Ranking choices',
      content: 'SQLite is the selected persistence layer.',
      tags: ['search'],
    });
    const tagsMatch = store(db, {
      role: NodeRole.Requirement,
      title: 'Storage requirements',
      content: 'Needs lightweight embedded storage.',
      tags: ['SQLite', 'db'],
    });

    const results = searchResults(db, { query: 'SQLite' });
    const ids = new Set(results.map((n) => n.id));

    expect(ids.has(titleMatch.id)).toBe(true);
    expect(ids.has(contentMatch.id)).toBe(true);
    expect(ids.has(tagsMatch.id)).toBe(true);
  });

  it('orders results by relevance (BM25 ascending)', () => {
    const strongest = store(db, {
      title: 'SQLite database',
      content: 'SQLite database for local memory graph.',
      tags: ['db'],
    });
    const weaker = store(db, {
      title: 'Persistence option',
      content: 'Potential backend choices are still open.',
      tags: ['SQLite'],
    });

    const results = searchResults(db, { query: 'SQLite' });

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(strongest.id);
    expect(results[1]!.id).toBe(weaker.id);
  });

  it('filters by node type', () => {
    const decision = store(db, {
      title: 'SQLite choice',
      content: 'Decision content',
      tags: ['db'],
    });
    store(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'SQLite implementation',
      content: 'Solution content',
      tags: ['db'],
    });

    const results = searchResults(db, { query: 'SQLite', type: NodeType.Knowledge });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(decision.id);
  });

  it('filters by multiple node types', () => {
    store(db, { title: 'SQLite choice', content: 'Decision content', tags: ['db'] });
    store(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'SQLite implementation',
      content: 'Solution content',
      tags: ['db'],
    });
    store(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'SQLite locking',
      content: 'Problem content',
      tags: ['db'],
    });

    const results = searchResults(db, {
      query: 'SQLite',
      type: [NodeType.Knowledge, NodeType.Action],
    });

    expect(results).toHaveLength(2);
    const types = new Set(results.map((r) => r.type));
    expect(types.has(NodeType.Knowledge)).toBe(true);
    expect(types.has(NodeType.Action)).toBe(true);
    expect(types.has(NodeType.Issue)).toBe(false);
  });

  it('filters by role', () => {
    const finding = store(db, {
      role: NodeRole.Finding,
      title: 'SQLite field notes',
      content: 'Observed SQLite locking under write load.',
      tags: ['db'],
    });
    store(db, {
      role: NodeRole.Decision,
      title: 'SQLite decision log',
      content: 'Selected SQLite for local persistence.',
      tags: ['db'],
    });

    const results = searchResults(db, { query: 'SQLite', role: NodeRole.Finding });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(finding.id);
    expect(results[0]!.role).toBe(NodeRole.Finding);
  });

  it('supports composite type, role, tags, and minimum-importance filters together', () => {
    const matching = store(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite auth design',
      content: 'SQLite auth design for offline token storage.',
      tags: ['auth', 'db'],
      importance: 0.9,
    });
    store(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'SQLite auth findings',
      content: 'Observed auth storage behavior.',
      tags: ['auth', 'db'],
      importance: 0.95,
    });
    store(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite auth draft',
      content: 'Low-priority auth design note.',
      tags: ['auth'],
      importance: 0.5,
    });
    store(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'SQLite auth implementation',
      content: 'Implementation task for auth storage.',
      tags: ['auth', 'db'],
      importance: 0.95,
    });

    const results = searchResults(db, {
      query: 'SQLite auth',
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      tags: ['auth', 'db'],
      minImportance: 0.8,
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(matching.id);
  });

  it('treats an empty type array as no type filter', () => {
    const knowledge = store(db, {
      title: 'SQLite knowledge note',
      content: 'Knowledge entry for SQLite.',
      tags: ['db'],
    });
    const solution = store(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'SQLite solution note',
      content: 'Action entry for SQLite.',
      tags: ['db'],
    });

    const results = searchResults(db, { query: 'SQLite', type: [] });
    const ids = new Set(results.map((row) => row.id));

    expect(ids).toEqual(new Set([knowledge.id, solution.id]));
  });

  it('filters by tag via node_tags join', () => {
    const withTag = store(db, {
      title: 'SQLite indexing',
      content: 'Query planner details',
      tags: ['db'],
    });
    store(db, {
      title: 'SQLite migration',
      content: 'Migrate from neo4j',
      tags: ['storage'],
    });

    const results = searchResults(db, { query: 'SQLite', tags: ['db'] });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(withTag.id);
  });

  it('supports tagMode "any" for OR tag matching', () => {
    const redis = store(db, {
      role: NodeRole.Finding,
      title: 'Redis caching',
      content: 'Redis as cache layer.',
      tags: ['redis'],
    });
    const sql = store(db, {
      role: NodeRole.Finding,
      title: 'SQL caching',
      content: 'SQL query cache.',
      tags: ['sql'],
    });
    store(db, {
      role: NodeRole.Finding,
      title: 'Memcached caching',
      content: 'Memcached option.',
      tags: ['memcached'],
    });

    const results = searchResults(db, { query: 'caching', tags: ['redis', 'sql'], tagMode: 'any' });

    expect(results).toHaveLength(2);
    const ids = new Set(results.map((r) => r.id));
    expect(ids.has(redis.id)).toBe(true);
    expect(ids.has(sql.id)).toBe(true);
  });

  it('supports tagMode "all" for AND tag matching (default)', () => {
    const both = store(db, {
      role: NodeRole.Finding,
      title: 'Redis SQL bridge',
      content: 'Bridge between Redis and SQL.',
      tags: ['redis', 'sql'],
    });
    store(db, {
      role: NodeRole.Finding,
      title: 'Redis standalone',
      content: 'Redis standalone setup.',
      tags: ['redis'],
    });

    const results = searchResults(db, { query: 'Redis', tags: ['redis', 'sql'], tagMode: 'all' });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(both.id);
  });

  it('filters by minimum importance', () => {
    const important = store(db, {
      title: 'SQLite baseline',
      content: 'High confidence and high importance',
      tags: ['db'],
      importance: 0.9,
    });
    store(db, {
      title: 'SQLite fallback',
      content: 'Lower importance note',
      tags: ['db'],
      importance: 0.6,
    });

    const results = searchResults(db, { query: 'SQLite', minImportance: 0.7 });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(important.id);
  });

  it('applies limit', () => {
    for (let i = 0; i < 7; i += 1) {
      store(db, { title: `SQLite note ${i}`, content: 'FTS5 content', tags: ['db'] });
    }

    const results = searchResults(db, { query: 'SQLite', limit: 5 });

    expect(results).toHaveLength(5);
  });

  it('does not return invalidated nodes', () => {
    const valid = store(db, {
      title: 'SQLite valid node',
      content: 'Still active',
      tags: ['db'],
    });
    const inv = store(db, {
      title: 'SQLite invalidated node',
      content: 'Should be hidden',
      tags: ['db'],
    });

    invalidateNode(db, inv.id);

    const results = searchResults(db, { query: 'SQLite' });
    const ids = new Set(results.map((n) => n.id));

    expect(ids.has(valid.id)).toBe(true);
    expect(ids.has(inv.id)).toBe(false);
  });

  it('supports FTS5 phrase matching with quotes', () => {
    const phraseMatch = store(db, {
      role: NodeRole.Finding,
      title: 'exact phrase matching',
      content: 'This has the exact phrase we want.',
      tags: ['search'],
    });
    store(db, {
      role: NodeRole.Finding,
      title: 'word matching only',
      content: 'This has exact and then later phrase separately.',
      tags: ['search'],
    });

    const results = searchResults(db, { query: '"exact phrase"' });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(phraseMatch.id);
  });

  it('supports FTS5 boolean OR', () => {
    const foo = store(db, {
      role: NodeRole.Finding,
      title: 'foo document',
      content: 'Only foo content here.',
      tags: ['test'],
    });
    const bar = store(db, {
      role: NodeRole.Finding,
      title: 'bar document',
      content: 'Only bar content here.',
      tags: ['test'],
    });

    const results = searchResults(db, { query: 'foo OR bar' });
    const ids = new Set(results.map((r) => r.id));
    expect(ids.has(foo.id)).toBe(true);
    expect(ids.has(bar.id)).toBe(true);
  });

  it('falls back to sanitized query on invalid FTS5 syntax', () => {
    const node = store(db, {
      role: NodeRole.Finding,
      title: 'better-sqlite3 driver evaluation',
      content: 'Comparing better-sqlite3 with sql.js for performance.',
      tags: ['database'],
    });

    expect(() => searchResults(db, { query: 'better-sqlite3' })).not.toThrow();
    const results = searchResults(db, { query: 'better-sqlite3' });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(node.id);
  });

  it('returns empty array on empty database', () => {
    expect(searchResults(db, { query: 'SQLite' })).toEqual([]);
  });

  it('ranks title/content match higher than tags-only match', () => {
    const titleAndContent = store(db, {
      title: 'SQLite database',
      content: 'SQLite database is the selected architecture.',
      tags: ['architecture'],
    });
    const tagsOnly = store(db, {
      title: 'Storage architecture',
      content: 'No explicit mention in title or body',
      tags: ['SQLite'],
    });

    const results = searchResults(db, { query: 'SQLite' });

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(titleAndContent.id);
    expect(results[1]!.id).toBe(tagsOnly.id);
  });

  it('exact title match outranks partial content match', () => {
    const exactTitle = store(db, {
      title: 'authentication',
      content: 'Details about user verification.',
      tags: ['security'],
    });
    const partialContent = store(db, {
      title: 'Security overview',
      content: 'This document covers authentication, authorization, and encryption.',
      tags: ['security'],
    });

    const results = searchResults(db, { query: 'authentication' });

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(exactTitle.id);
    expect(results[1]!.id).toBe(partialContent.id);
  });

  it('multi-field match outranks single-field match', () => {
    const multiField = store(db, {
      title: 'Redis caching strategy',
      content: 'Redis provides fast in-memory caching for session data.',
      tags: ['redis', 'cache'],
    });
    const singleField = store(db, {
      title: 'Database options',
      content: 'Considering various storage backends.',
      tags: ['redis'],
    });

    const results = searchResults(db, { query: 'Redis' });

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(multiField.id);
    expect(results[1]!.id).toBe(singleField.id);
  });

  it('semantic search ranks closest embedding first', () => {
    const closest = store(db, {
      title: 'JWT authentication flow',
      content: 'Token-based stateless authentication with refresh tokens.',
      tags: ['auth'],
    });
    const farther = store(db, {
      title: 'Database indexing',
      content: 'B-tree index optimization strategies.',
      tags: ['db'],
    });

    // Closest has embedding [1, 0], farther has [0, 1], query is [1, 0]
    storeEmbedding(db, closest.id, embeddingOf(1, 0));
    storeEmbedding(db, farther.id, embeddingOf(0, 1));

    const results = searchResults(
      db,
      { query: 'auth tokens', mode: 'semantic' },
      embeddingOf(1, 0),
    );

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(closest.id);
    expect(results[1]!.id).toBe(farther.id);
  });

  it('hybrid RRF boost is measurable: dual-signal node scores higher than single-signal', () => {
    const dualSignal = store(db, {
      title: 'JWT session management',
      content: 'Token rotation and refresh strategies for stateless auth.',
      tags: ['auth'],
    });
    const keywordOnly = store(db, {
      title: 'JWT JWT JWT session',
      content: 'Repeated keyword stuffing for testing purposes.',
      tags: ['test'],
    });
    const semanticOnly = store(db, {
      title: 'Authentication lifecycle',
      content: 'Stateless token-based verification patterns.',
      tags: ['auth'],
    });

    // dualSignal: embedding matches query [1, 0]
    // keywordOnly: embedding far from query [0, 1]
    // semanticOnly: embedding close to query [0.9, 0.1]
    storeEmbedding(db, dualSignal.id, embeddingOf(1, 0));
    storeEmbedding(db, keywordOnly.id, embeddingOf(0, 1));
    storeEmbedding(db, semanticOnly.id, embeddingOf(0.9, 0.1));

    const results = searchResults(db, { query: 'JWT session', mode: 'hybrid' }, embeddingOf(1, 0));

    // dualSignal should rank first (matches both keyword and semantic)
    expect(results[0]!.id).toBe(dualSignal.id);
    expect(results[0]!.match_fields).toContain('semantic');
    expect(results[0]!.search_mode).toBe('hybrid');
  });

  it('detects match_fields correctly', () => {
    store(db, {
      title: 'SQLite database',
      content: 'Uses PostgreSQL as backend.',
      tags: ['architecture'],
    });

    const results = searchResults(db, { query: 'SQLite' });
    expect(results).toHaveLength(1);
    expect(results[0]!.match_fields).toContain('title');
    expect(results[0]!.match_fields).not.toContain('content');
  });

  it('includes relationships in results', () => {
    const decision = store(db, {
      title: 'SQLite decision',
      content: 'Architecture decision.',
      tags: ['db'],
    });
    const solution = store(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Implementation solution',
      content: 'How to implement.',
      tags: ['db'],
    });

    createEdge(db, {
      source_id: solution.id,
      target_id: decision.id,
      type: EdgeType.Resolves,
    });

    const results = searchResults(db, { query: 'SQLite' });
    const found = results.find((r) => r.id === decision.id)!;
    expect(found.relationships.incoming).toHaveLength(1);
    expect(found.relationships.incoming[0]!.type).toBe(EdgeType.Resolves);
  });

  it('returns results for tag-only search with empty query', () => {
    const tagged = store(db, {
      role: NodeRole.Finding,
      title: 'Redis notes',
      content: 'Some redis information.',
      tags: ['redis'],
    });
    store(db, {
      role: NodeRole.Finding,
      title: 'SQL notes',
      content: 'Some SQL information.',
      tags: ['sql'],
    });

    const results = searchResults(db, { query: '', tags: ['redis'] });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(tagged.id);
  });

  it('returns empty array for empty query with no filters', () => {
    store(db, { title: 'Some node', content: 'Some content.', tags: ['test'] });
    expect(searchResults(db, { query: '' })).toEqual([]);
  });

  it('semantic mode finds vocabulary-mismatched content', () => {
    const authNode = store(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Chose JWT for authentication',
      content: 'We use JSON Web Tokens with 24h expiry for stateless auth',
      tags: ['auth'],
    });
    const unrelatedNode = store(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Redis caching',
      content: 'Cache invalidation and TTL policy',
      tags: ['cache'],
    });

    storeEmbedding(db, authNode.id, embeddingOf(0, 1));
    storeEmbedding(db, unrelatedNode.id, embeddingOf(1, 0));

    const results = searchResults(
      db,
      { query: 'session management approach', mode: 'semantic' },
      embeddingOf(0, 1),
    );

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(authNode.id);
    expect(results[1]!.id).toBe(unrelatedNode.id);
    expect(results[0]!.search_mode).toBe('semantic');
  });

  it('hybrid mode boosts nodes that match keyword and semantic signals', () => {
    const bothNode = store(db, {
      title: 'JWT auth architecture',
      content: 'Session management with token rotation and refresh',
      tags: ['auth'],
    });
    const keywordOnlyNode = store(db, {
      title: 'JWT session session session',
      content: 'JWT session persistence details for operators',
      tags: ['ops'],
    });
    const semanticOnlyNode = store(db, {
      title: 'Access token strategy',
      content: 'Stateless authentication lifecycle planning',
      tags: ['auth'],
    });

    storeEmbedding(db, bothNode.id, embeddingOf(1, 0));
    storeEmbedding(db, keywordOnlyNode.id, embeddingOf(0, 1));
    storeEmbedding(db, semanticOnlyNode.id, embeddingOf(0.9, 0.1));

    const results = searchResults(db, { query: 'JWT session', mode: 'hybrid' }, embeddingOf(1, 0));

    expect(results[0]?.id).toBe(bothNode.id);
    expect(results[0]?.search_mode).toBe('hybrid');
    expect(results[0]?.match_fields).toContain('semantic');
  });

  it('auto mode detects keyword for short uppercase queries', () => {
    const jwtNode = store(db, {
      title: 'JWT authentication',
      content: 'Token verification flow',
      tags: ['auth'],
    });

    const results = searchResults(db, { query: 'JWT' });

    expect(results[0]?.id).toBe(jwtNode.id);
    expect(results[0]?.search_mode).toBe('keyword');
  });

  it('auto mode detects semantic for question queries', () => {
    const authNode = store(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Chose JWT for authentication',
      content: 'We use JSON Web Tokens with rotating refresh tokens',
      tags: ['auth'],
    });

    storeEmbedding(db, authNode.id, embeddingOf(0, 1));

    const results = searchResults(
      db,
      { query: 'How does session management work?' },
      embeddingOf(0, 1),
    );

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(authNode.id);
    expect(results[0]!.search_mode).toBe('semantic');
  });

  it('auto mode detects hybrid for multi-word lowercase queries', () => {
    const node = store(db, {
      title: 'Redis caching strategy',
      content: 'Use Redis as the caching layer for auth sessions.',
      tags: ['redis', 'cache'],
    });

    storeEmbedding(db, node.id, embeddingOf(1, 0));

    const results = searchResults(db, { query: 'redis caching' }, embeddingOf(1, 0));

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(node.id);
    expect(results[0]!.search_mode).toBe('hybrid');
  });

  it('returns page metadata and advances with cursor for keyword search', () => {
    for (let i = 0; i < 4; i += 1) {
      store(db, {
        title: `SQLite page ${i}`,
        content: 'paged keyword result',
        tags: ['db'],
      });
    }

    const page1 = search(db, { query: 'SQLite', limit: 2 });
    expect(page1.results).toHaveLength(2);
    expect(page1.page.hasMore).toBe(true);
    expect(page1.page.nextCursor).not.toBeNull();

    const page2 = search(db, {
      query: 'SQLite',
      limit: 2,
      cursor: page1.page.nextCursor!,
    });

    const ids = new Set([...page1.results, ...page2.results].map((row) => row.id));
    expect(ids.size).toBe(4);
    expect(page2.page.hasMore).toBe(false);
    expect(page2.page.nextCursor).toBeNull();
  });

  it('rejects cursor reuse with a different search scope', () => {
    store(db, { title: 'SQLite cursor scope', content: 'scope test', tags: ['db'] });
    store(db, { title: 'SQLite cursor scope two', content: 'scope test', tags: ['db'] });

    const page = search(db, { query: 'SQLite', limit: 1 });
    expect(page.page.hasMore).toBe(true);
    expect(page.page.nextCursor).not.toBeNull();

    expect(() =>
      search(db, {
        query: 'different query',
        limit: 1,
        cursor: page.page.nextCursor!,
      }),
    ).toThrow('Cursor does not match the current request');
  });

  it('rejects malformed search cursors', () => {
    store(db, { title: 'SQLite malformed cursor', content: 'scope test', tags: ['db'] });

    expect(() =>
      search(db, { query: 'SQLite', limit: 1, cursor: 'definitely-not-base64' }),
    ).toThrow('Invalid cursor');
  });

  it('keeps keyword pagination stable when BM25 ranks tie', () => {
    for (let i = 0; i < 3; i += 1) {
      store(db, {
        title: 'Same rank title',
        content: 'Same rank content',
        tags: ['tie'],
      });
    }

    const page1 = search(db, { query: 'Same', limit: 2 });
    const repeatedPage1 = search(db, { query: 'Same', limit: 2 });
    expect(page1.page.hasMore).toBe(true);
    expect(page1.page.nextCursor).not.toBeNull();

    const page2 = search(db, { query: 'Same', limit: 2, cursor: page1.page.nextCursor! });

    expect(page1.results.map((row) => row.id)).toEqual(repeatedPage1.results.map((row) => row.id));
    const ids = new Set([...page1.results, ...page2.results].map((row) => row.id));
    expect(ids.size).toBe(3);
  });

  it('keeps semantic match_quality stable across page boundaries', () => {
    const first = store(db, { title: 'Auth one', content: 'semantic page one', tags: ['auth'] });
    const second = store(db, { title: 'Auth two', content: 'semantic page two', tags: ['auth'] });
    const third = store(db, {
      title: 'Auth three',
      content: 'semantic page three',
      tags: ['auth'],
    });

    storeEmbedding(db, first.id, embeddingOf(1, 0));
    storeEmbedding(db, second.id, embeddingOf(0.8, 0.2));
    storeEmbedding(db, third.id, embeddingOf(0.6, 0.4));

    const full = search(db, { query: 'auth flow', mode: 'semantic', limit: 10 }, embeddingOf(1, 0));
    const page1 = search(db, { query: 'auth flow', mode: 'semantic', limit: 2 }, embeddingOf(1, 0));
    expect(page1.page.hasMore).toBe(true);
    expect(page1.page.nextCursor).not.toBeNull();

    const page2 = search(
      db,
      {
        query: 'auth flow',
        mode: 'semantic',
        limit: 2,
        cursor: page1.page.nextCursor!,
      },
      embeddingOf(1, 0),
    );

    const secondPageRow = page2.results[0]!;
    const fullRow = full.results.find((row) => row.id === secondPageRow.id)!;
    expect(secondPageRow.match_quality).toBe(fullRow.match_quality);
  });

  it('paginates hybrid results without duplicates', () => {
    const both1 = store(db, {
      title: 'JWT session alpha',
      content: 'Token rotation and refresh flow',
      tags: ['auth'],
    });
    const both2 = store(db, {
      title: 'JWT session beta',
      content: 'Token rotation and refresh flow',
      tags: ['auth'],
    });
    const semanticOnly = store(db, {
      title: 'Access lifecycle',
      content: 'Stateless authentication lifecycle planning',
      tags: ['auth'],
    });

    storeEmbedding(db, both1.id, embeddingOf(1, 0));
    storeEmbedding(db, both2.id, embeddingOf(0.95, 0.05));
    storeEmbedding(db, semanticOnly.id, embeddingOf(0.9, 0.1));

    const page1 = search(db, { query: 'JWT session', mode: 'hybrid', limit: 2 }, embeddingOf(1, 0));
    expect(page1.page.hasMore).toBe(true);
    expect(page1.page.nextCursor).not.toBeNull();

    const page2 = search(
      db,
      { query: 'JWT session', mode: 'hybrid', limit: 2, cursor: page1.page.nextCursor! },
      embeddingOf(1, 0),
    );

    const ids = new Set([...page1.results, ...page2.results].map((row) => row.id));
    expect(ids.size).toBe(3);
    expect(page1.page.mode).toBe('hybrid');
  });

  it('does not skip tied hybrid scores across pages', () => {
    const alpha = store(db, { title: 'JWT alpha', content: 'token refresh', tags: ['auth'] });
    const beta = store(db, { title: 'JWT beta', content: 'token refresh', tags: ['auth'] });

    storeEmbedding(db, alpha.id, embeddingOf(1, 0));
    storeEmbedding(db, beta.id, embeddingOf(1, 0));

    const firstPage = search(db, { query: 'JWT', mode: 'hybrid', limit: 1 }, embeddingOf(1, 0));
    expect(firstPage.page.hasMore).toBe(true);
    expect(firstPage.page.nextCursor).not.toBeNull();

    const secondPage = search(
      db,
      { query: 'JWT', mode: 'hybrid', limit: 1, cursor: firstPage.page.nextCursor! },
      embeddingOf(1, 0),
    );

    expect(firstPage.results).toHaveLength(1);
    expect(secondPage.results).toHaveLength(1);
    expect(firstPage.results[0]!.id).not.toBe(secondPage.results[0]!.id);
  });

  it('matches single large-page results when collecting all keyword pages', () => {
    for (let i = 0; i < 5; i += 1) {
      store(db, {
        title: `Roundtrip SQLite ${i}`,
        content: 'keyword pagination roundtrip',
        tags: ['db'],
      });
    }

    const allPaged = collectSearchPages(db, { query: 'Roundtrip SQLite', limit: 2 });
    const singlePage = search(db, { query: 'Roundtrip SQLite', limit: 10 });

    expect(allPaged.map((row) => row.id)).toEqual(singlePage.results.map((row) => row.id));
  });

  it('matches single large-page results when collecting all semantic pages', () => {
    const nodes = [
      store(db, { title: 'Semantic roundtrip 1', content: 'auth one', tags: ['auth'] }),
      store(db, { title: 'Semantic roundtrip 2', content: 'auth two', tags: ['auth'] }),
      store(db, { title: 'Semantic roundtrip 3', content: 'auth three', tags: ['auth'] }),
      store(db, { title: 'Semantic roundtrip 4', content: 'auth four', tags: ['auth'] }),
    ];

    nodes.forEach((node, index) => {
      storeEmbedding(db, node.id, embeddingOf(1 - index * 0.1, index * 0.1));
    });

    const embedding = embeddingOf(1, 0);
    const allPaged = collectSearchPages(
      db,
      { query: 'auth roundtrip', mode: 'semantic', limit: 2 },
      embedding,
    );
    const singlePage = search(
      db,
      { query: 'auth roundtrip', mode: 'semantic', limit: 10 },
      embedding,
    );

    expect(allPaged.map((row) => row.id)).toEqual(singlePage.results.map((row) => row.id));
  });

  it('matches single large-page results when collecting all hybrid pages', () => {
    const nodes = [
      store(db, {
        title: 'Hybrid roundtrip alpha',
        content: 'token refresh alpha',
        tags: ['auth'],
      }),
      store(db, { title: 'Hybrid roundtrip beta', content: 'token refresh beta', tags: ['auth'] }),
      store(db, {
        title: 'Hybrid roundtrip gamma',
        content: 'session continuity gamma',
        tags: ['auth'],
      }),
    ];

    nodes.forEach((node, index) => {
      storeEmbedding(db, node.id, embeddingOf(1 - index * 0.05, index * 0.05));
    });

    const embedding = embeddingOf(1, 0);
    const allPaged = collectSearchPages(
      db,
      { query: 'Hybrid roundtrip', mode: 'hybrid', limit: 1 },
      embedding,
    );
    const singlePage = search(
      db,
      { query: 'Hybrid roundtrip', mode: 'hybrid', limit: 10 },
      embedding,
    );

    expect(allPaged.map((row) => row.id)).toEqual(singlePage.results.map((row) => row.id));
  });
});

describe('detectSearchMode', () => {
  it('covers the key auto-detection branches directly', () => {
    expect(detectSearchMode('JWT')).toBe('keyword');
    expect(detectSearchMode('redis')).toBe('keyword');
    expect(detectSearchMode('JWT session')).toBe('keyword');
    expect(detectSearchMode('What causes auth drift?')).toBe('semantic');
    expect(detectSearchMode('redis caching')).toBe('hybrid');
    expect(detectSearchMode('')).toBe('hybrid');
  });
});
