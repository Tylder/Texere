import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db';
import { getNode, invalidateNode, storeNode, type StoreNodeInput } from './nodes';
import { EdgeType, NodeRole, NodeScope, NodeStatus, NodeType } from './types';

const decision = (overrides: Partial<StoreNodeInput> = {}): StoreNodeInput => ({
  type: NodeType.Knowledge,
  role: NodeRole.Decision,
  title: 'Use SQLite',
  content: 'Because...',
  tags: ['db', 'sqlite'],
  ...overrides,
});

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
    const node = storeNode(db, decision());
    const after = Date.now();

    expect(node.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(node.created_at).toBeGreaterThanOrEqual(before);
    expect(node.created_at).toBeLessThanOrEqual(after);
    expect(node.invalidated_at).toBeNull();
  });

  it('storeNode returns all fields with correct runtime types', () => {
    const node = storeNode(db, decision());

    expect(typeof node.id).toBe('string');
    expect(node.type).toBe(NodeType.Knowledge);
    expect(node.role).toBe(NodeRole.Decision);
    expect(typeof node.title).toBe('string');
    expect(typeof node.content).toBe('string');
    expect(typeof node.tags_json).toBe('string');
    expect(typeof node.importance).toBe('number');
    expect(typeof node.confidence).toBe('number');
    expect(node.status).toBe(NodeStatus.Active);
    expect(node.scope).toBe(NodeScope.Project);
    expect(typeof node.created_at).toBe('number');
    expect(node.invalidated_at).toBeNull();
    expect(node.embedding).toBeNull();
  });

  it('getNode returns the stored node', () => {
    const node = storeNode(db, decision());

    const { warning: _, ...plain } = node;
    expect(getNode(db, node.id)).toEqual(plain);
  });

  it('getNode for unknown id returns null', () => {
    expect(getNode(db, 'nonexistent')).toBeNull();
  });

  it('getNode with includeEdges returns node with an empty edges array', () => {
    const node = storeNode(db, decision({ tags: [] }));
    const { warning: _, ...plain } = node;

    expect(getNode(db, node.id, { includeEdges: true })).toEqual({
      ...plain,
      edges: [],
    });
  });

  it('invalidateNode sets invalidated_at to a non-null integer', () => {
    const node = storeNode(db, decision({ tags: [] }));

    invalidateNode(db, node.id);
    const invalidated = getNode(db, node.id);

    expect(invalidated).not.toBeNull();
    expect(Number.isInteger(invalidated!.invalidated_at)).toBe(true);
  });

  it('invalidateNode on an already invalidated node is idempotent', () => {
    const node = storeNode(db, decision({ tags: [] }));

    invalidateNode(db, node.id);
    expect(() => invalidateNode(db, node.id)).not.toThrow();

    const invalidated = getNode(db, node.id);
    expect(invalidated?.invalidated_at).not.toBeNull();
  });

  it('invalidateNode for unknown id throws', () => {
    expect(() => invalidateNode(db, 'nonexistent')).toThrow(/not found/i);
  });

  it('storeNode with anchor_to creates ANCHORED_TO edge to artifact/file_context node', () => {
    const node = storeNode(db, decision({ tags: [], anchor_to: ['/path/to/file.ts'] }));

    const anchoredEdge = db
      .prepare(
        `
          SELECT e.type, n.type AS target_type, n.role AS target_role
          FROM edges e
          JOIN nodes n ON n.id = e.target_id
          WHERE e.source_id = ?
        `,
      )
      .get(node.id) as { type: string; target_type: string; target_role: string } | undefined;

    expect(anchoredEdge).toEqual({
      type: EdgeType.AnchoredTo,
      target_type: NodeType.Artifact,
      target_role: NodeRole.FileContext,
    });
  });

  it('storeNode inserts content into FTS5 index', () => {
    const node = storeNode(db, decision({ title: 'fts index check title', tags: [] }));

    const ftsRow = db
      .prepare('SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ?')
      .get('"fts index check title"') as { rowid: number } | undefined;

    expect(ftsRow).toBeDefined();
    expect(ftsRow!.rowid).toBeGreaterThan(0);
    expect(getNode(db, node.id)).not.toBeNull();
  });

  it('invalidated nodes remain in FTS5 index', () => {
    const node = storeNode(db, decision({ title: 'fts persists after invalidate', tags: [] }));

    invalidateNode(db, node.id);

    const ftsRow = db
      .prepare('SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ?')
      .get('"fts persists after invalidate"') as { rowid: number } | undefined;

    expect(ftsRow).toBeDefined();
    expect(ftsRow!.rowid).toBeGreaterThan(0);
  });

  it('storeNode with tags creates rows in node_tags', () => {
    const node = storeNode(db, decision({ tags: ['a', 'b', 'c'] }));

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM node_tags WHERE node_id = ?')
      .get(node.id) as { count: number };

    expect(row.count).toBe(3);
  });

  it('storeNode with empty tags creates zero rows in node_tags', () => {
    const node = storeNode(db, decision({ tags: [] }));

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM node_tags WHERE node_id = ?')
      .get(node.id) as { count: number };

    expect(row.count).toBe(0);
  });
});

describe('facet defaults', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('applies default facets: status=active, scope=project', () => {
    const node = storeNode(db, decision());

    expect(node.status).toBe(NodeStatus.Active);
    expect(node.scope).toBe(NodeScope.Project);
  });

  it('accepts custom facets', () => {
    const node = storeNode(
      db,
      decision({
        status: NodeStatus.Proposed,
        scope: NodeScope.Module,
      }),
    );

    expect(node.status).toBe(NodeStatus.Proposed);
    expect(node.scope).toBe(NodeScope.Module);
  });
});

describe('type-role validation', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('throws on invalid type-role combination', () => {
    expect(() =>
      storeNode(db, decision({ type: NodeType.Knowledge, role: NodeRole.Task })),
    ).toThrow(/invalid type-role/i);
  });

  it('accepts valid type-role combinations', () => {
    expect(() =>
      storeNode(db, decision({ type: NodeType.Issue, role: NodeRole.Problem })),
    ).not.toThrow();
    expect(() =>
      storeNode(db, decision({ type: NodeType.Action, role: NodeRole.Fix })),
    ).not.toThrow();
    expect(() =>
      storeNode(db, decision({ type: NodeType.Artifact, role: NodeRole.CodePattern })),
    ).not.toThrow();
  });
});

describe('batch support', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('stores multiple nodes atomically', () => {
    const inputs = [
      decision({ title: 'Batch A' }),
      decision({ title: 'Batch B' }),
      decision({ title: 'Batch C' }),
    ];

    const nodes = storeNode(db, inputs);

    expect(nodes).toHaveLength(3);
    expect(nodes[0]!.title).toBe('Batch A');
    expect(nodes[1]!.title).toBe('Batch B');
    expect(nodes[2]!.title).toBe('Batch C');

    for (const node of nodes) {
      expect(getNode(db, node.id)).not.toBeNull();
    }
  });

  it('throws on empty array', () => {
    expect(() => storeNode(db, [])).toThrow(/at least one node/i);
  });

  it('throws when batch exceeds max size', () => {
    const inputs = Array.from({ length: 51 }, (_, i) => decision({ title: `Node ${i}` }));
    expect(() => storeNode(db, inputs)).toThrow(/max batch size/i);
  });

  it('rolls back all nodes if any validation fails', () => {
    const inputs = [
      decision({ title: 'Valid node' }),
      decision({ title: 'Invalid node', type: NodeType.Knowledge, role: NodeRole.Task }),
    ];

    expect(() => storeNode(db, inputs)).toThrow(/invalid type-role/i);

    const count = db.prepare('SELECT COUNT(*) AS c FROM nodes').get() as { c: number };
    expect(count.c).toBe(0);
  });

  it('batch with minimal returns array of { id }', () => {
    const inputs = [decision({ title: 'Min A' }), decision({ title: 'Min B' })];
    const result = storeNode(db, inputs, { minimal: true });

    expect(result).toHaveLength(2);
    for (const n of result) {
      expect(Object.keys(n)).toEqual(['id']);
    }
  });
});

describe('minimal mode', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('returns only { id } when minimal: true', () => {
    const result = storeNode(db, decision(), { minimal: true });

    expect(Object.keys(result)).toEqual(['id']);
    expect(result.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('node is still persisted to DB in minimal mode', () => {
    const result = storeNode(db, decision(), { minimal: true });
    const fetched = getNode(db, result.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe('Use SQLite');
  });
});

describe('duplicate warning', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('includes warning when similar title exists', () => {
    storeNode(db, decision({ title: 'Use SQLite for storage' }));
    const result = storeNode(db, decision({ title: 'Use SQLite for storage' }));

    expect(result.warning).toBeDefined();
    expect(result.warning!.similar_nodes.length).toBeGreaterThan(0);
    expect(result.warning!.similar_nodes[0]!.title).toBe('Use SQLite for storage');
  });

  it('no warning for unique title', () => {
    const result = storeNode(db, decision({ title: 'completely unique xyzzy plugh' }));
    expect(result.warning).toBeUndefined();
  });

  it('skips duplicate check in minimal mode', () => {
    storeNode(db, decision({ title: 'Use SQLite for storage' }));
    const result = storeNode(db, decision({ title: 'Use SQLite for storage' }), { minimal: true });
    expect('warning' in result).toBe(false);
  });

  it('skips duplicate check in batch mode', () => {
    storeNode(db, decision({ title: 'Use SQLite for storage' }));
    const result = storeNode(db, [decision({ title: 'Use SQLite for storage' })]);
    expect(result).toHaveLength(1);
    expect('warning' in result[0]!).toBe(false);
  });
});
