/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge } from './edges.js';
import { invalidateNode, storeNode, type StoreNodeInput } from './nodes.js';
import { search } from './search.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

const store = (db: Database.Database, overrides: Partial<StoreNodeInput> = {}) =>
  storeNode(db, {
    type: NodeType.Knowledge,
    role: NodeRole.Decision,
    title: 'default title',
    content: 'default content',
    tags: [],
    ...overrides,
  } as StoreNodeInput);

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

    const results = search(db, { query: 'SQLite' });
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

    const results = search(db, { query: 'SQLite' });
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

    const results = search(db, { query: 'SQLite' });

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

    const results = search(db, { query: 'SQLite', type: NodeType.Knowledge });

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

    const results = search(db, {
      query: 'SQLite',
      type: [NodeType.Knowledge, NodeType.Action],
    });

    expect(results).toHaveLength(2);
    const types = new Set(results.map((r) => r.type));
    expect(types.has(NodeType.Knowledge)).toBe(true);
    expect(types.has(NodeType.Action)).toBe(true);
    expect(types.has(NodeType.Issue)).toBe(false);
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

    const results = search(db, { query: 'SQLite', tags: ['db'] });

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

    const results = search(db, { query: 'caching', tags: ['redis', 'sql'], tagMode: 'any' });

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

    const results = search(db, { query: 'Redis', tags: ['redis', 'sql'], tagMode: 'all' });

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

    const results = search(db, { query: 'SQLite', minImportance: 0.7 });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(important.id);
  });

  it('applies limit', () => {
    for (let i = 0; i < 7; i += 1) {
      store(db, { title: `SQLite note ${i}`, content: 'FTS5 content', tags: ['db'] });
    }

    const results = search(db, { query: 'SQLite', limit: 5 });

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

    const results = search(db, { query: 'SQLite' });
    const ids = new Set(results.map((n) => n.id));

    expect(ids.has(valid.id)).toBe(true);
    expect(ids.has(inv.id)).toBe(false);
  });

  it('supports FTS5 phrase matching with quotes', () => {
    store(db, {
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

    const results = search(db, { query: '"exact phrase"' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.title.includes('exact phrase'))).toBe(true);
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

    const results = search(db, { query: 'foo OR bar' });
    const ids = new Set(results.map((r) => r.id));
    expect(ids.has(foo.id)).toBe(true);
    expect(ids.has(bar.id)).toBe(true);
  });

  it('falls back to sanitized query on invalid FTS5 syntax', () => {
    store(db, {
      role: NodeRole.Finding,
      title: 'foo AND bar test',
      content: 'test foo AND content',
      tags: ['search'],
    });

    expect(() => search(db, { query: 'foo AND AND bar' })).not.toThrow();
    const results = search(db, { query: 'foo AND AND bar' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array on empty database', () => {
    expect(search(db, { query: 'SQLite' })).toEqual([]);
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

    const results = search(db, { query: 'SQLite' });

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(titleAndContent.id);
    expect(results[1]!.id).toBe(tagsOnly.id);
  });

  it('detects match_fields correctly', () => {
    store(db, {
      title: 'SQLite database',
      content: 'Uses PostgreSQL as backend.',
      tags: ['architecture'],
    });

    const results = search(db, { query: 'SQLite' });
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

    const results = search(db, { query: 'SQLite' });
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

    const results = search(db, { query: '', tags: ['redis'] });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(tagged.id);
  });

  it('returns empty array for empty query with no filters', () => {
    store(db, { title: 'Some node', content: 'Some content.', tags: ['test'] });
    expect(search(db, { query: '' })).toEqual([]);
  });
});
