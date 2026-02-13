import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { invalidateNode, storeNode } from './nodes.js';
import { search } from './search.js';
import { NodeType } from './types.js';

describe('search', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('returns nodes matching title/content/tags via BM25', () => {
    const titleMatch = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite indexing strategy',
      content: 'Use FTS5 BM25 ranking for retrieval.',
      tags: ['database'],
    });
    const contentMatch = storeNode(db, {
      type: NodeType.Solution,
      title: 'Ranking choices',
      content: 'SQLite is the selected persistence layer.',
      tags: ['search'],
    });
    const tagsMatch = storeNode(db, {
      type: NodeType.Requirement,
      title: 'Storage requirements',
      content: 'Needs lightweight embedded storage.',
      tags: ['SQLite', 'db'],
    });

    const results = search(db, { query: 'SQLite' });
    const ids = new Set(results.map((node) => node.id));

    expect(ids.has(titleMatch.id)).toBe(true);
    expect(ids.has(contentMatch.id)).toBe(true);
    expect(ids.has(tagsMatch.id)).toBe(true);
  });

  it('orders results by relevance (BM25 ascending)', () => {
    const strongest = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite database',
      content: 'SQLite database for local memory graph.',
      tags: ['db'],
    });
    const weaker = storeNode(db, {
      type: NodeType.Decision,
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
    const decision = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite choice',
      content: 'Decision content',
      tags: ['db'],
    });
    storeNode(db, {
      type: NodeType.Solution,
      title: 'SQLite implementation',
      content: 'Solution content',
      tags: ['db'],
    });

    const results = search(db, { query: 'SQLite', type: NodeType.Decision });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(decision.id);
  });

  it('filters by tag via node_tags join', () => {
    const withTag = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite indexing',
      content: 'Query planner details',
      tags: ['db'],
    });
    storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite migration',
      content: 'Migrate from neo4j',
      tags: ['storage'],
    });

    const results = search(db, { query: 'SQLite', tags: ['db'] });

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(withTag.id);
  });

  it('filters by minimum importance', () => {
    const important = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite baseline',
      content: 'High confidence and high importance',
      tags: ['db'],
      importance: 0.9,
    });
    storeNode(db, {
      type: NodeType.Decision,
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
      storeNode(db, {
        type: NodeType.Decision,
        title: `SQLite note ${i}`,
        content: 'FTS5 content',
        tags: ['db'],
      });
    }

    const results = search(db, { query: 'SQLite', limit: 5 });

    expect(results).toHaveLength(5);
  });

  it('does not return invalidated nodes', () => {
    const valid = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite valid node',
      content: 'Still active',
      tags: ['db'],
    });
    const invalidated = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite invalidated node',
      content: 'Should be hidden',
      tags: ['db'],
    });

    invalidateNode(db, invalidated.id);

    const results = search(db, { query: 'SQLite' });
    const ids = new Set(results.map((node) => node.id));

    expect(ids.has(valid.id)).toBe(true);
    expect(ids.has(invalidated.id)).toBe(false);
  });

  it('does not throw with FTS5 special characters', () => {
    storeNode(db, {
      type: NodeType.Decision,
      title: 'special chars check',
      content: 'test foo content',
      tags: ['search'],
    });

    expect(() => search(db, { query: '"test" OR "foo"' })).not.toThrow();
  });

  it('returns empty array on empty database', () => {
    expect(search(db, { query: 'SQLite' })).toEqual([]);
  });

  it('ranks title/content match higher than tags-only match', () => {
    const titleAndContent = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite database',
      content: 'SQLite database is the selected architecture.',
      tags: ['architecture'],
    });
    const tagsOnly = storeNode(db, {
      type: NodeType.Decision,
      title: 'Storage architecture',
      content: 'No explicit mention in title or body',
      tags: ['SQLite'],
    });

    const results = search(db, { query: 'SQLite' });

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe(titleAndContent.id);
    expect(results[1]!.id).toBe(tagsOnly.id);
  });
});
