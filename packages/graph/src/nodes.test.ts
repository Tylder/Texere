import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDatabase } from './db.js';
import { getEdgesForNode } from './edges.js';
import {
  getNode,
  getNodes,
  invalidateNode,
  invalidateNodes,
  storeNode,
  storeNodesWithEdges,
  type StoreNodeInput,
} from './nodes.js';
import { search } from './search.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

const decision = (overrides: Partial<StoreNodeInput> = {}): StoreNodeInput => ({
  type: NodeType.Knowledge,
  role: NodeRole.Decision,
  title: 'Use SQLite',
  content: 'Because...',
  tags: ['db', 'sqlite'],
  ...overrides,
});

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

  it('getNodes returns results aligned with input ids including nulls for missing nodes', () => {
    const nodeA = storeNode(db, decision({ title: 'Node A', tags: [] }));
    const nodeB = storeNode(db, decision({ title: 'Node B', tags: [] }));

    const results = getNodes(db, [nodeA.id, 'missing-id', nodeB.id, nodeA.id]);

    expect(results).toHaveLength(4);
    expect(results[0]?.id).toBe(nodeA.id);
    expect(results[1]).toBeNull();
    expect(results[2]?.id).toBe(nodeB.id);
    expect(results[3]?.id).toBe(nodeA.id);
  });

  it('getNodes with includeEdges includes edges for each found node', () => {
    const nodeA = storeNode(db, decision({ title: 'Node A', tags: [] }));
    const nodeB = storeNode(db, decision({ title: 'Node B', tags: [] }));

    storeNodesWithEdges(
      db,
      [
        { ...decision({ title: 'Node C', tags: [] }), temp_id: 'c' },
        { ...decision({ title: 'Node D', tags: [] }), temp_id: 'd' },
      ],
      [{ source_id: nodeA.id, target_id: nodeB.id, type: EdgeType.BasedOn }],
    );

    const results = getNodes(db, [nodeA.id, nodeB.id], { includeEdges: true });

    expect(results[0]).not.toBeNull();
    expect(results[1]).not.toBeNull();
    expect('edges' in results[0]!).toBe(true);
    expect('edges' in results[1]!).toBe(true);

    const edgesA = (results[0] as { edges: Array<{ target_id: string }> }).edges;
    const edgesB = (results[1] as { edges: Array<{ source_id: string }> }).edges;
    expect(edgesA.some((edge) => edge.target_id === nodeB.id)).toBe(true);
    expect(edgesB.some((edge) => edge.source_id === nodeA.id)).toBe(true);
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
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_700_000_000_000);

    invalidateNode(db, node.id);
    const firstInvalidatedAt = getNode(db, node.id)?.invalidated_at;
    nowSpy.mockReturnValueOnce(1_700_000_000_100);
    invalidateNode(db, node.id);
    nowSpy.mockRestore();

    const invalidated = getNode(db, node.id);
    expect(invalidated?.invalidated_at).not.toBeNull();
    expect(invalidated?.invalidated_at).toBe(firstInvalidatedAt);
  });

  it('invalidateNode for unknown id throws', () => {
    expect(() => invalidateNode(db, 'nonexistent')).toThrow(/not found/i);
  });

  it('invalidateNodes sets invalidated_at for every requested node', () => {
    const nodeA = storeNode(db, decision({ title: 'A', tags: [] }));
    const nodeB = storeNode(db, decision({ title: 'B', tags: [] }));

    invalidateNodes(db, [nodeA.id, nodeB.id]);

    expect(getNode(db, nodeA.id)?.invalidated_at).not.toBeNull();
    expect(getNode(db, nodeB.id)?.invalidated_at).not.toBeNull();
  });

  it('invalidateNodes is idempotent for already-invalidated nodes', () => {
    const node = storeNode(db, decision({ tags: [] }));
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_700_000_000_200);

    invalidateNode(db, node.id);
    const firstInvalidatedAt = getNode(db, node.id)?.invalidated_at;
    nowSpy.mockReturnValueOnce(1_700_000_000_300);
    invalidateNodes(db, [node.id, node.id]);
    nowSpy.mockRestore();

    expect(getNode(db, node.id)?.invalidated_at).not.toBeNull();
    expect(getNode(db, node.id)?.invalidated_at).toBe(firstInvalidatedAt);
  });

  it('invalidateNodes rolls back if any node is missing', () => {
    const node = storeNode(db, decision({ tags: [] }));

    expect(() => invalidateNodes(db, [node.id, 'missing-id'])).toThrow(/not found/i);

    expect(getNode(db, node.id)?.invalidated_at).toBeNull();
  });

  it('invalidated nodes are excluded from vector search candidates', () => {
    const node = storeNode(db, decision({ tags: [] }));
    const other = storeNode(
      db,
      decision({ title: 'Another decision', content: 'Other content', tags: ['other'] }),
    );

    storeEmbedding(db, node.id, embeddingOf(1, 0));
    storeEmbedding(db, other.id, embeddingOf(0, 1));

    const beforeInvalidation = search(
      db,
      { query: 'decision content', mode: 'semantic' },
      embeddingOf(1, 0),
    );
    expect(beforeInvalidation.results[0]?.id).toBe(node.id);

    invalidateNode(db, node.id);

    const afterInvalidation = search(
      db,
      { query: 'decision content', mode: 'semantic' },
      embeddingOf(1, 0),
    );
    expect(afterInvalidation.results.map((result) => result.id)).not.toContain(node.id);
    expect(afterInvalidation.results[0]?.id).toBe(other.id);
  });

  it('storeNode with anchor_to creates ANCHORED_TO edge to artifact/file_context node', () => {
    const node = storeNode(db, decision({ tags: [], anchor_to: ['/path/to/file.ts'] }));

    const stored = getNode(db, node.id, { includeEdges: true });

    expect(stored).not.toBeNull();
    expect(stored && 'edges' in stored).toBe(true);

    const anchoredEdge = (stored && 'edges' in stored ? stored.edges : []).find(
      (edge) => edge.type === EdgeType.AnchoredTo,
    );
    expect(anchoredEdge).toBeDefined();
    expect(anchoredEdge?.target_id).toBe('file_context:/path/to/file.ts');

    const target = getNode(db, 'file_context:/path/to/file.ts');
    expect(target).not.toBeNull();
    expect(target?.type).toBe(NodeType.Artifact);
    expect(target?.title).toBe('/path/to/file.ts');
  });

  it('stored node is findable via FTS5 full-text search', () => {
    const node = storeNode(db, decision({ title: 'unique searchable title xyzzy', tags: [] }));

    const results = search(db, { query: '"unique searchable title xyzzy"' });

    expect(results.results).toHaveLength(1);
    expect(results.results[0]!.id).toBe(node.id);
    expect(results.results[0]!.title).toBe('unique searchable title xyzzy');
  });

  it('invalidated nodes are filtered from search results after being indexed', () => {
    const node = storeNode(db, decision({ title: 'fts persists after invalidate', tags: [] }));

    const beforeInvalidation = search(db, { query: '"fts persists after invalidate"' });
    expect(beforeInvalidation.results.map((result) => result.id)).toContain(node.id);

    invalidateNode(db, node.id);

    const afterInvalidation = search(db, { query: '"fts persists after invalidate"' });
    expect(afterInvalidation.results.map((result) => result.id)).not.toContain(node.id);
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

    expect(search(db, { query: 'Valid node' }).results).toEqual([]);
    expect(search(db, { query: 'Invalid node' }).results).toEqual([]);
  });

  it('batch with minimal returns array of { id }', () => {
    const inputs = [decision({ title: 'Min A' }), decision({ title: 'Min B' })];
    const result = storeNode(db, inputs, { minimal: true });

    expect(result).toHaveLength(2);
    for (const n of result) {
      expect(Object.keys(n)).toEqual(['id']);
    }
  });

  it('invalidateNodes throws on empty array', () => {
    expect(() => invalidateNodes(db, [])).toThrow(/at least one node/i);
  });

  it('invalidateNodes throws when batch exceeds max size', () => {
    const ids = Array.from({ length: 251 }, (_, i) => `node-${i}`);
    expect(() => invalidateNodes(db, ids)).toThrow(/max batch size/i);
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

    const stored = getNode(db, node.id, { includeEdges: true });
    expect(stored).not.toBeNull();

    const edge = (stored && 'edges' in stored ? stored.edges : []).find(
      (candidate) => candidate.type === EdgeType.BasedOn,
    );

    expect(edge).toBeDefined();
    expect(edge?.target_id).toBe('source:web:https://example.com/api');

    const sourceNode = getNode(db, 'source:web:https://example.com/api');
    expect(sourceNode).not.toBeNull();
    expect(sourceNode?.type).toBe(NodeType.Source);
    expect(sourceNode?.role).toBe(NodeRole.WebUrl);
  });

  it('file path source creates source/file_path node and BASED_ON edge', () => {
    const node = storeNode(db, decision({ tags: [], sources: ['/docs/design.md'] }));

    const stored = getNode(db, node.id, { includeEdges: true });
    expect(stored).not.toBeNull();

    const edge = (stored && 'edges' in stored ? stored.edges : []).find(
      (candidate) => candidate.type === EdgeType.BasedOn,
    );

    expect(edge).toBeDefined();
    expect(edge?.target_id).toBe('source:file:/docs/design.md');

    const sourceNode = getNode(db, 'source:file:/docs/design.md');
    expect(sourceNode).not.toBeNull();
    expect(sourceNode?.type).toBe(NodeType.Source);
    expect(sourceNode?.role).toBe(NodeRole.FilePath);
  });

  it('duplicate source URLs reuse the same source node id', () => {
    storeNode(db, decision({ tags: [], sources: ['https://example.com/api'] }));
    storeNode(
      db,
      decision({ title: 'Another node', tags: [], sources: ['https://example.com/api'] }),
    );

    const sourceNode = getNode(db, 'source:web:https://example.com/api');
    expect(sourceNode).not.toBeNull();
    expect(sourceNode?.title).toBe('https://example.com/api');
    expect(sourceNode?.role).toBe(NodeRole.WebUrl);
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
