import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db';
import { getNode, invalidateNode, storeNode } from './nodes';
import { EdgeType, NodeType } from './types';

describe('node CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('storeNode returns a node with nanoid id, created_at set, and invalidated_at null', () => {
    const before = Date.now();
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: ['db', 'sqlite'],
    });
    const after = Date.now();

    expect(node.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(node.created_at).toBeGreaterThanOrEqual(before);
    expect(node.created_at).toBeLessThanOrEqual(after);
    expect(node.invalidated_at).toBeNull();
  });

  it('storeNode returns all fields with correct runtime types', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: ['db', 'sqlite'],
    });

    expect(typeof node.id).toBe('string');
    expect(node.type).toBe(NodeType.Decision);
    expect(typeof node.title).toBe('string');
    expect(typeof node.content).toBe('string');
    expect(typeof node.tags_json).toBe('string');
    expect(typeof node.importance).toBe('number');
    expect(typeof node.confidence).toBe('number');
    expect(typeof node.created_at).toBe('number');
    expect(node.invalidated_at).toBeNull();
    expect(node.embedding).toBeNull();
  });

  it('getNode returns the stored node', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: ['db', 'sqlite'],
    });

    expect(getNode(db, node.id)).toEqual(node);
  });

  it('getNode for unknown id returns null', () => {
    expect(getNode(db, 'nonexistent')).toBeNull();
  });

  it('getNode with includeEdges returns node with an empty edges array', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: [],
    });

    expect(getNode(db, node.id, { includeEdges: true })).toEqual({ ...node, edges: [] });
  });

  it('invalidateNode sets invalidated_at to a non-null integer', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: [],
    });

    invalidateNode(db, node.id);
    const invalidated = getNode(db, node.id);

    expect(invalidated).not.toBeNull();
    expect(Number.isInteger(invalidated!.invalidated_at)).toBe(true);
  });

  it('invalidateNode on an already invalidated node is idempotent', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: [],
    });

    invalidateNode(db, node.id);
    expect(() => invalidateNode(db, node.id)).not.toThrow();

    const invalidated = getNode(db, node.id);
    expect(invalidated?.invalidated_at).not.toBeNull();
  });

  it('invalidateNode for unknown id throws', () => {
    expect(() => invalidateNode(db, 'nonexistent')).toThrow(/not found/i);
  });

  it('storeNode with anchor_to creates ANCHORED_TO edge to file_context node', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: [],
      anchor_to: ['/path/to/file.ts'],
    });

    const anchoredEdge = db
      .prepare(
        `
          SELECT e.type, n.type AS target_type
          FROM edges e
          JOIN nodes n ON n.id = e.target_id
          WHERE e.source_id = ?
        `,
      )
      .get(node.id) as { type: string; target_type: string } | undefined;

    expect(anchoredEdge).toEqual({
      type: EdgeType.AnchoredTo,
      target_type: NodeType.FileContext,
    });
  });

  it('storeNode inserts content into FTS5 index', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'fts index check title',
      content: 'Because...',
      tags: [],
    });

    const ftsRow = db
      .prepare('SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ?')
      .get('"fts index check title"') as { rowid: number } | undefined;

    expect(ftsRow).toBeDefined();
    expect(ftsRow!.rowid).toBeGreaterThan(0);
    expect(getNode(db, node.id)).not.toBeNull();
  });

  it('invalidated nodes remain in FTS5 index', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'fts persists after invalidate',
      content: 'Because...',
      tags: [],
    });

    invalidateNode(db, node.id);

    const ftsRow = db
      .prepare('SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ?')
      .get('"fts persists after invalidate"') as { rowid: number } | undefined;

    expect(ftsRow).toBeDefined();
    expect(ftsRow!.rowid).toBeGreaterThan(0);
  });

  it('storeNode with tags creates rows in node_tags', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: ['a', 'b', 'c'],
    });

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM node_tags WHERE node_id = ?')
      .get(node.id) as {
      count: number;
    };

    expect(row.count).toBe(3);
  });

  it('storeNode with empty tags creates zero rows in node_tags', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use SQLite',
      content: 'Because...',
      tags: [],
    });

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM node_tags WHERE node_id = ?')
      .get(node.id) as {
      count: number;
    };

    expect(row.count).toBe(0);
  });
});
