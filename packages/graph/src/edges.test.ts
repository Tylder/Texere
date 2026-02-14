/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge, deleteEdge, getEdgesForNode } from './edges.js';
import { getNode, invalidateNode, storeNode } from './nodes.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

const makeNode = (
  db: Database.Database,
  title: string,
  type = NodeType.Knowledge,
  role = NodeRole.Decision,
) => storeNode(db, { type, role, title, content: `${title} content` });

describe('edge CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('createEdge returns edge with nanoid id', () => {
    const source = makeNode(db, 'Source');
    const target = makeNode(db, 'Target', NodeType.Action, NodeRole.Solution);

    const edge = createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Resolves,
    });

    expect(edge.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('createEdge sets created_at automatically', () => {
    const source = makeNode(db, 'Source');
    const target = makeNode(db, 'Target', NodeType.Action, NodeRole.Solution);

    const before = Date.now();
    const edge = createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Resolves,
    });
    const after = Date.now();

    expect(edge.created_at).toBeGreaterThanOrEqual(before);
    expect(edge.created_at).toBeLessThanOrEqual(after);
  });

  it('createEdge with nonexistent source_id throws', () => {
    const target = makeNode(db, 'Target', NodeType.Action, NodeRole.Solution);

    expect(() =>
      createEdge(db, {
        source_id: 'missing-source',
        target_id: target.id,
        type: EdgeType.Resolves,
      }),
    ).toThrow();
  });

  it('createEdge with nonexistent target_id throws', () => {
    const source = makeNode(db, 'Source');

    expect(() =>
      createEdge(db, {
        source_id: source.id,
        target_id: 'missing-target',
        type: EdgeType.Resolves,
      }),
    ).toThrow();
  });

  it('createEdge with source_id === target_id throws', () => {
    const node = makeNode(db, 'Node');

    expect(() =>
      createEdge(db, {
        source_id: node.id,
        target_id: node.id,
        type: EdgeType.Resolves,
      }),
    ).toThrow();
  });

  it('createEdge with REPLACES auto-sets source node invalidated_at', () => {
    const source = makeNode(db, 'Old decision');
    const target = makeNode(db, 'New decision');

    createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Replaces,
    });

    const updatedSource = getNode(db, source.id);
    expect(updatedSource).not.toBeNull();
    expect(updatedSource!.invalidated_at).not.toBeNull();
    expect(Number.isInteger(updatedSource!.invalidated_at)).toBe(true);
  });

  it('createEdge with REPLACES on already-invalidated node succeeds', () => {
    const source = makeNode(db, 'Already invalidated');
    const target = makeNode(db, 'Replacement');

    invalidateNode(db, source.id);

    expect(() =>
      createEdge(db, {
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.Replaces,
      }),
    ).not.toThrow();
  });

  it('createEdge with RESOLVES does NOT auto-invalidate', () => {
    const source = makeNode(db, 'Problem', NodeType.Issue, NodeRole.Problem);
    const target = makeNode(db, 'Solution', NodeType.Action, NodeRole.Solution);

    createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Resolves,
    });

    const updatedSource = getNode(db, source.id);
    expect(updatedSource!.invalidated_at).toBeNull();
  });

  it('deleteEdge removes edge row entirely', () => {
    const source = makeNode(db, 'Source');
    const target = makeNode(db, 'Target', NodeType.Action, NodeRole.Solution);
    const edge = createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Resolves,
    });

    const deleted = deleteEdge(db, edge.id);
    const row = db.prepare('SELECT COUNT(*) AS count FROM edges WHERE id = ?').get(edge.id) as {
      count: number;
    };

    expect(deleted).toBe(true);
    expect(row.count).toBe(0);
  });

  it('deleteEdge for nonexistent id returns false', () => {
    expect(deleteEdge(db, 'nonexistent')).toBe(false);
  });

  it('getEdgesForNode with outgoing returns only outgoing edges', () => {
    const center = makeNode(db, 'Center');
    const outgoingTarget = makeNode(db, 'Outgoing target', NodeType.Action, NodeRole.Solution);
    const incomingSource = makeNode(db, 'Incoming source', NodeType.Issue, NodeRole.Problem);

    const outgoingEdge = createEdge(db, {
      source_id: center.id,
      target_id: outgoingTarget.id,
      type: EdgeType.Resolves,
    });
    createEdge(db, {
      source_id: incomingSource.id,
      target_id: center.id,
      type: EdgeType.Causes,
    });

    const edges = getEdgesForNode(db, center.id, 'outgoing');

    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual(outgoingEdge);
  });

  it('getEdgesForNode with incoming returns only incoming edges', () => {
    const center = makeNode(db, 'Center');
    const outgoingTarget = makeNode(db, 'Outgoing target', NodeType.Action, NodeRole.Solution);
    const incomingSource = makeNode(db, 'Incoming source', NodeType.Issue, NodeRole.Problem);

    createEdge(db, {
      source_id: center.id,
      target_id: outgoingTarget.id,
      type: EdgeType.Resolves,
    });
    const incomingEdge = createEdge(db, {
      source_id: incomingSource.id,
      target_id: center.id,
      type: EdgeType.Causes,
    });

    const edges = getEdgesForNode(db, center.id, 'incoming');

    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual(incomingEdge);
  });

  it('getEdgesForNode with both returns all incoming and outgoing edges', () => {
    const center = makeNode(db, 'Center');
    const outgoingTarget = makeNode(db, 'Outgoing target', NodeType.Action, NodeRole.Solution);
    const incomingSource = makeNode(db, 'Incoming source', NodeType.Issue, NodeRole.Problem);

    const outgoingEdge = createEdge(db, {
      source_id: center.id,
      target_id: outgoingTarget.id,
      type: EdgeType.Resolves,
    });
    const incomingEdge = createEdge(db, {
      source_id: incomingSource.id,
      target_id: center.id,
      type: EdgeType.Causes,
    });

    const edges = getEdgesForNode(db, center.id, 'both');
    const ids = new Set(edges.map((edge) => edge.id));

    expect(edges).toHaveLength(2);
    expect(ids.has(outgoingEdge.id)).toBe(true);
    expect(ids.has(incomingEdge.id)).toBe(true);
  });
});

describe('batch createEdge', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates multiple edges atomically', () => {
    const a = makeNode(db, 'A');
    const b = makeNode(db, 'B');
    const c = makeNode(db, 'C');

    const edges = createEdge(db, [
      { source_id: a.id, target_id: b.id, type: EdgeType.Extends },
      { source_id: b.id, target_id: c.id, type: EdgeType.DependsOn },
    ]);

    expect(edges).toHaveLength(2);
    expect(edges[0]!.type).toBe(EdgeType.Extends);
    expect(edges[1]!.type).toBe(EdgeType.DependsOn);
  });

  it('batch with invalid ref creates 0 edges (atomic rollback)', () => {
    const a = makeNode(db, 'A');
    const b = makeNode(db, 'B');

    expect(() =>
      createEdge(db, [
        { source_id: a.id, target_id: b.id, type: EdgeType.Extends },
        { source_id: a.id, target_id: 'nonexistent', type: EdgeType.Causes },
        { source_id: b.id, target_id: a.id, type: EdgeType.Supports },
      ]),
    ).toThrow();

    const edges = getEdgesForNode(db, a.id, 'both');
    expect(edges).toHaveLength(0);
  });

  it('empty array throws', () => {
    expect(() => createEdge(db, [])).toThrow('at least one edge required');
  });

  it('batch of 51 throws', () => {
    const inputs = Array.from({ length: 51 }, () => ({
      source_id: 'a',
      target_id: 'b',
      type: EdgeType.Extends,
    }));

    expect(() => createEdge(db, inputs)).toThrow('max batch size exceeded');
  });

  it('REPLACES auto-invalidation works within batch', () => {
    const old1 = makeNode(db, 'Old 1');
    const old2 = makeNode(db, 'Old 2');
    const new1 = makeNode(db, 'New 1');
    const new2 = makeNode(db, 'New 2');

    createEdge(db, [
      { source_id: old1.id, target_id: new1.id, type: EdgeType.Replaces },
      { source_id: old2.id, target_id: new2.id, type: EdgeType.Replaces },
    ]);

    expect(getNode(db, old1.id)!.invalidated_at).not.toBeNull();
    expect(getNode(db, old2.id)!.invalidated_at).not.toBeNull();
    expect(getNode(db, new1.id)!.invalidated_at).toBeNull();
    expect(getNode(db, new2.id)!.invalidated_at).toBeNull();
  });
});

describe('minimal response', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('single edge with minimal returns only { id }', () => {
    const a = makeNode(db, 'A');
    const b = makeNode(db, 'B');

    const result = createEdge(
      db,
      { source_id: a.id, target_id: b.id, type: EdgeType.Resolves },
      { minimal: true },
    );

    expect(Object.keys(result)).toEqual(['id']);
    expect(result.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('batch with minimal returns array of { id }', () => {
    const a = makeNode(db, 'A');
    const b = makeNode(db, 'B');
    const c = makeNode(db, 'C');

    const results = createEdge(
      db,
      [
        { source_id: a.id, target_id: b.id, type: EdgeType.Extends },
        { source_id: b.id, target_id: c.id, type: EdgeType.DependsOn },
      ],
      { minimal: true },
    );

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(Object.keys(r)).toEqual(['id']);
    }
  });
});
