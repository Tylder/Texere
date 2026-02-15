import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { getEdgesForNode } from './edges.js';
import {
  getNode,
  invalidateNode,
  storeNode,
  storeNodesWithEdges,
  type StoreNodeInput,
} from './nodes.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

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
    expect(typeof node.created_at).toBe('number');
    expect(node.invalidated_at).toBeNull();
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

  it('invalidated nodes are excluded from vector search candidates', () => {
    const node = storeNode(db, decision({ tags: [] }));

    db.prepare('INSERT INTO nodes_vec (node_id, embedding) VALUES (?, zeroblob(1536))').run(
      node.id,
    );

    const beforeInvalidation = db
      .prepare(
        `
          SELECT COUNT(*) AS c
          FROM nodes_vec v
          JOIN nodes n ON n.id = v.node_id
          WHERE n.id = ? AND n.invalidated_at IS NULL
        `,
      )
      .get(node.id) as { c: number };
    expect(beforeInvalidation.c).toBe(1);

    invalidateNode(db, node.id);

    const afterInvalidation = db
      .prepare(
        `
          SELECT COUNT(*) AS c
          FROM nodes_vec v
          JOIN nodes n ON n.id = v.node_id
          WHERE n.id = ? AND n.invalidated_at IS NULL
        `,
      )
      .get(node.id) as { c: number };
    expect(afterInvalidation.c).toBe(0);
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
      target_role: 'file_context',
    });
  });

  it('stored node is findable via FTS5 full-text search', () => {
    const node = storeNode(db, decision({ title: 'unique searchable title xyzzy', tags: [] }));

    const searchResult = db
      .prepare(
        `
          SELECT n.id, n.title
          FROM nodes_fts fts
          JOIN nodes n ON n.rowid = fts.rowid
          WHERE nodes_fts MATCH ? AND n.invalidated_at IS NULL
        `,
      )
      .get('"unique searchable title xyzzy"') as { id: string; title: string } | undefined;

    expect(searchResult).toBeDefined();
    expect(searchResult!.id).toBe(node.id);
    expect(searchResult!.title).toBe('unique searchable title xyzzy');
  });

  it('invalidated nodes remain in FTS5 index but are filtered by invalidated_at', () => {
    const node = storeNode(db, decision({ title: 'fts persists after invalidate', tags: [] }));

    invalidateNode(db, node.id);

    const ftsRowExists = db
      .prepare('SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH ?')
      .get('"fts persists after invalidate"') as { rowid: number } | undefined;

    expect(ftsRowExists).toBeDefined();

    const searchResult = db
      .prepare(
        `
          SELECT n.id
          FROM nodes_fts fts
          JOIN nodes n ON n.rowid = fts.rowid
          WHERE nodes_fts MATCH ? AND n.invalidated_at IS NULL
        `,
      )
      .get('"fts persists after invalidate"') as { id: string } | undefined;

    expect(searchResult).toBeUndefined();
  });

  it('storeNode with tags creates rows in node_tags with correct values', () => {
    const node = storeNode(db, decision({ tags: ['alpha', 'beta', 'gamma'] }));

    const tags = db
      .prepare('SELECT tag FROM node_tags WHERE node_id = ? ORDER BY tag ASC')
      .all(node.id) as { tag: string }[];

    expect(tags).toHaveLength(3);
    expect(tags.map((t) => t.tag)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('storeNode with empty tags creates zero rows in node_tags', () => {
    const node = storeNode(db, decision({ tags: [] }));

    const row = db
      .prepare('SELECT COUNT(*) AS count FROM node_tags WHERE node_id = ?')
      .get(node.id) as { count: number };

    expect(row.count).toBe(0);
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
      storeNode(db, decision({ type: NodeType.Action, role: NodeRole.Solution })),
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

describe('sources field', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('URL source creates source/web_url node and BASED_ON edge', () => {
    const node = storeNode(db, decision({ tags: [], sources: ['https://example.com/api'] }));

    const edge = db
      .prepare(
        `
          SELECT e.type, e.target_id, n.type AS target_type, n.role AS target_role
          FROM edges e
          JOIN nodes n ON n.id = e.target_id
          WHERE e.source_id = ? AND e.type = ?
        `,
      )
      .get(node.id, EdgeType.BasedOn) as
      | {
          type: string;
          target_id: string;
          target_type: string;
          target_role: string;
        }
      | undefined;

    expect(edge).toBeDefined();
    expect(edge!.target_id).toBe('source:web:https://example.com/api');
    expect(edge!.target_type).toBe(NodeType.Source);
    expect(edge!.target_role).toBe(NodeRole.WebUrl);
  });

  it('file path source creates source/file_path node and BASED_ON edge', () => {
    const node = storeNode(db, decision({ tags: [], sources: ['/docs/design.md'] }));

    const edge = db
      .prepare(
        `
          SELECT e.type, e.target_id, n.type AS target_type, n.role AS target_role
          FROM edges e
          JOIN nodes n ON n.id = e.target_id
          WHERE e.source_id = ? AND e.type = ?
        `,
      )
      .get(node.id, EdgeType.BasedOn) as
      | {
          type: string;
          target_id: string;
          target_type: string;
          target_role: string;
        }
      | undefined;

    expect(edge).toBeDefined();
    expect(edge!.target_id).toBe('source:file:/docs/design.md');
    expect(edge!.target_type).toBe(NodeType.Source);
    expect(edge!.target_role).toBe(NodeRole.FilePath);
  });

  it('duplicate source URLs use INSERT OR IGNORE (only 1 source node)', () => {
    storeNode(db, decision({ tags: [], sources: ['https://example.com/api'] }));
    storeNode(
      db,
      decision({ title: 'Another node', tags: [], sources: ['https://example.com/api'] }),
    );

    const count = db
      .prepare('SELECT COUNT(*) AS c FROM nodes WHERE id = ?')
      .get('source:web:https://example.com/api') as { c: number };

    expect(count.c).toBe(1);
  });
});

describe('storeNodesWithEdges', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates nodes and inline edges in single transaction', () => {
    const result = storeNodesWithEdges(
      db,
      [
        { ...decision(), temp_id: 'a' },
        { ...decision({ title: 'Another decision' }), temp_id: 'b' },
      ],
      [{ source_id: 'a', target_id: 'b', type: EdgeType.BasedOn }],
    );

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);

    const nodeA = getNode(db, result.nodes[0]!.id);
    const nodeB = getNode(db, result.nodes[1]!.id);
    expect(nodeA).not.toBeNull();
    expect(nodeB).not.toBeNull();

    const edge = result.edges[0]!;
    expect(edge.source_id).toBe(result.nodes[0]!.id);
    expect(edge.target_id).toBe(result.nodes[1]!.id);
    expect(edge.type).toBe(EdgeType.BasedOn);
  });

  it('resolves temp_ids to real IDs in edge source_id and target_id', () => {
    const result = storeNodesWithEdges(
      db,
      [
        { ...decision(), temp_id: 'a' },
        { ...decision({ title: 'Another decision' }), temp_id: 'b' },
      ],
      [{ source_id: 'a', target_id: 'b', type: EdgeType.BasedOn }],
    );

    const edge = result.edges[0]!;
    expect(edge.source_id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(edge.target_id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(edge.source_id).toBe(result.nodes[0]!.id);
    expect(edge.target_id).toBe(result.nodes[1]!.id);
  });

  it('echoes temp_id on returned nodes', () => {
    const result = storeNodesWithEdges(db, [{ ...decision(), temp_id: 'x' }], []);

    expect(result.nodes[0]).toHaveProperty('temp_id', 'x');
    expect(result.nodes[0]!.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('supports edge from temp_id node to existing DB node', () => {
    const existingNode = storeNode(db, decision({ title: 'Existing' }));

    const result = storeNodesWithEdges(
      db,
      [{ ...decision({ title: 'New node' }), temp_id: 'b' }],
      [{ source_id: 'b', target_id: existingNode.id, type: EdgeType.Resolves }],
    );

    const edge = result.edges[0]!;
    expect(edge.source_id).toBe(result.nodes[0]!.id);
    expect(edge.target_id).toBe(existingNode.id);
  });

  it('supports edge between two existing DB nodes', () => {
    const nodeA = storeNode(db, decision({ title: 'Node A' }));
    const nodeB = storeNode(db, decision({ title: 'Node B' }));

    const result = storeNodesWithEdges(
      db,
      [{ ...decision({ title: 'Node C' }), temp_id: 'c' }],
      [{ source_id: nodeA.id, target_id: nodeB.id, type: EdgeType.Causes }],
    );

    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);

    const edge = result.edges[0]!;
    expect(edge.source_id).toBe(nodeA.id);
    expect(edge.target_id).toBe(nodeB.id);
  });

  it('creates auto-provenance edges alongside inline edges', () => {
    const result = storeNodesWithEdges(
      db,
      [
        {
          ...decision({ title: 'Node with source', sources: ['https://example.com'] }),
          temp_id: 'a',
        },
        { ...decision({ title: 'Another node' }), temp_id: 'b' },
      ],
      [{ source_id: 'a', target_id: 'b', type: EdgeType.Resolves }],
    );

    const nodeAEdges = getEdgesForNode(db, result.nodes[0]!.id, 'outgoing');
    expect(nodeAEdges.length).toBeGreaterThanOrEqual(2);

    const inlineEdge = nodeAEdges.find((e) => e.target_id === result.nodes[1]!.id);
    expect(inlineEdge).not.toBeUndefined();
    expect(inlineEdge!.type).toBe(EdgeType.Resolves);

    const provenanceEdge = nodeAEdges.find((e) => e.type === EdgeType.BasedOn);
    expect(provenanceEdge).not.toBeUndefined();
  });

  it('handles REPLACES edge auto-invalidation', () => {
    const oldNode = storeNode(db, decision({ title: 'Old decision' }));

    const result = storeNodesWithEdges(
      db,
      [{ ...decision({ title: 'New decision' }), temp_id: 'b' }],
      [{ source_id: oldNode.id, target_id: 'b', type: EdgeType.Replaces }],
    );

    const invalidated = getNode(db, oldNode.id);
    expect(invalidated).not.toBeNull();
    expect(invalidated!.invalidated_at).not.toBeNull();

    const edge = result.edges[0]!;
    expect(edge.type).toBe(EdgeType.Replaces);
  });

  it('rolls back all nodes and edges on edge failure', () => {
    const nodeInputs = [
      { ...decision({ title: 'Node 1' }), temp_id: 'a' },
      { ...decision({ title: 'Node 2' }), temp_id: 'b' },
    ];

    expect(() => {
      storeNodesWithEdges(db, nodeInputs, [
        { source_id: 'a', target_id: 'nonexistent-id', type: EdgeType.BasedOn },
      ]);
    }).toThrow();

    expect(getNode(db, 'a')).toBeNull();
    expect(getNode(db, 'b')).toBeNull();
  });

  it('rejects duplicate temp_ids', () => {
    expect(() => {
      storeNodesWithEdges(
        db,
        [
          { ...decision({ title: 'Node 1' }), temp_id: 'dup' },
          { ...decision({ title: 'Node 2' }), temp_id: 'dup' },
        ],
        [],
      );
    }).toThrow(/duplicate/i);
  });

  it('rejects self-referential edge', () => {
    expect(() => {
      storeNodesWithEdges(
        db,
        [{ ...decision(), temp_id: 'x' }],
        [{ source_id: 'x', target_id: 'x', type: EdgeType.BasedOn }],
      );
    }).toThrow(/self-referential/i);
  });

  it('rejects edge referencing nonexistent temp_id', () => {
    expect(() => {
      storeNodesWithEdges(
        db,
        [{ ...decision(), temp_id: 'a' }],
        [{ source_id: 'a', target_id: 'b', type: EdgeType.BasedOn }],
      );
    }).toThrow(/temp_id|not found/i);
  });

  it('with empty edges array behaves like storeNode', () => {
    const result = storeNodesWithEdges(
      db,
      [
        { ...decision({ title: 'Node 1' }), temp_id: 'a' },
        { ...decision({ title: 'Node 2' }), temp_id: 'b' },
      ],
      [],
    );

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(0);
    expect(result.nodes[0]!.temp_id).toBe('a');
    expect(result.nodes[1]!.temp_id).toBe('b');
  });

  it('with minimal:true returns ids only', () => {
    const result = storeNodesWithEdges(
      db,
      [
        { ...decision({ title: 'Node 1' }), temp_id: 'a' },
        { ...decision({ title: 'Node 2' }), temp_id: 'b' },
      ],
      [{ source_id: 'a', target_id: 'b', type: EdgeType.BasedOn }],
      { minimal: true },
    );

    expect(result.nodes[0]).toEqual({ id: expect.any(String), temp_id: 'a' });
    expect(result.nodes[1]).toEqual({ id: expect.any(String), temp_id: 'b' });
    expect(result.edges[0]).toEqual({ id: expect.any(String) });
  });

  it('preserves node array ordering', () => {
    const result = storeNodesWithEdges(
      db,
      [
        { ...decision({ title: 'First' }), temp_id: 'x' },
        { ...decision({ title: 'Second' }), temp_id: 'y' },
        { ...decision({ title: 'Third' }), temp_id: 'z' },
      ],
      [],
    );

    expect(result.nodes[0]!.temp_id).toBe('x');
    expect(result.nodes[1]!.temp_id).toBe('y');
    expect(result.nodes[2]!.temp_id).toBe('z');
  });
});
