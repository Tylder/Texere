import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge, deleteEdge, getEdgesForNode } from './edges.js';
import { getNode, invalidateNode, storeNode } from './nodes.js';
import { EdgeType, NodeType } from './types.js';

describe('edge CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('createEdge returns edge with nanoid id', () => {
    const source = storeNode(db, {
      type: NodeType.Decision,
      title: 'Source',
      content: 'Source node',
    });
    const target = storeNode(db, {
      type: NodeType.Solution,
      title: 'Target',
      content: 'Target node',
    });

    const edge = createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Solves,
    });

    expect(edge.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('createEdge sets created_at automatically', () => {
    const source = storeNode(db, {
      type: NodeType.Decision,
      title: 'Source',
      content: 'Source node',
    });
    const target = storeNode(db, {
      type: NodeType.Solution,
      title: 'Target',
      content: 'Target node',
    });

    const before = Date.now();
    const edge = createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Solves,
    });
    const after = Date.now();

    expect(edge.created_at).toBeGreaterThanOrEqual(before);
    expect(edge.created_at).toBeLessThanOrEqual(after);
  });

  it('createEdge with nonexistent source_id throws', () => {
    const target = storeNode(db, {
      type: NodeType.Solution,
      title: 'Target',
      content: 'Target node',
    });

    expect(() =>
      createEdge(db, {
        source_id: 'missing-source',
        target_id: target.id,
        type: EdgeType.Solves,
      }),
    ).toThrow();
  });

  it('createEdge with nonexistent target_id throws', () => {
    const source = storeNode(db, {
      type: NodeType.Decision,
      title: 'Source',
      content: 'Source node',
    });

    expect(() =>
      createEdge(db, {
        source_id: source.id,
        target_id: 'missing-target',
        type: EdgeType.Solves,
      }),
    ).toThrow();
  });

  it('createEdge with source_id === target_id throws', () => {
    const node = storeNode(db, {
      type: NodeType.Decision,
      title: 'Node',
      content: 'Single node',
    });

    expect(() =>
      createEdge(db, {
        source_id: node.id,
        target_id: node.id,
        type: EdgeType.Solves,
      }),
    ).toThrow();
  });

  it('createEdge with DEPRECATED_BY auto-sets source node invalidated_at', () => {
    const source = storeNode(db, {
      type: NodeType.Decision,
      title: 'Old decision',
      content: 'To be deprecated',
    });
    const target = storeNode(db, {
      type: NodeType.Decision,
      title: 'New decision',
      content: 'Replacement',
    });

    createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.DeprecatedBy,
    });

    const updatedSource = getNode(db, source.id);
    expect(updatedSource).not.toBeNull();
    expect(updatedSource!.invalidated_at).not.toBeNull();
    expect(Number.isInteger(updatedSource!.invalidated_at)).toBe(true);
  });

  it('createEdge with DEPRECATED_BY on already-invalidated node succeeds', () => {
    const source = storeNode(db, {
      type: NodeType.Decision,
      title: 'Already invalidated',
      content: 'Old decision',
    });
    const target = storeNode(db, {
      type: NodeType.Decision,
      title: 'Replacement',
      content: 'New decision',
    });

    invalidateNode(db, source.id);

    expect(() =>
      createEdge(db, {
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.DeprecatedBy,
      }),
    ).not.toThrow();
  });

  it('deleteEdge removes edge row entirely', () => {
    const source = storeNode(db, {
      type: NodeType.Decision,
      title: 'Source',
      content: 'Source node',
    });
    const target = storeNode(db, {
      type: NodeType.Solution,
      title: 'Target',
      content: 'Target node',
    });
    const edge = createEdge(db, {
      source_id: source.id,
      target_id: target.id,
      type: EdgeType.Solves,
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
    const center = storeNode(db, {
      type: NodeType.Decision,
      title: 'Center',
      content: 'Center node',
    });
    const outgoingTarget = storeNode(db, {
      type: NodeType.Solution,
      title: 'Outgoing target',
      content: 'Target',
    });
    const incomingSource = storeNode(db, {
      type: NodeType.Problem,
      title: 'Incoming source',
      content: 'Source',
    });

    const outgoingEdge = createEdge(db, {
      source_id: center.id,
      target_id: outgoingTarget.id,
      type: EdgeType.Solves,
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
    const center = storeNode(db, {
      type: NodeType.Decision,
      title: 'Center',
      content: 'Center node',
    });
    const outgoingTarget = storeNode(db, {
      type: NodeType.Solution,
      title: 'Outgoing target',
      content: 'Target',
    });
    const incomingSource = storeNode(db, {
      type: NodeType.Problem,
      title: 'Incoming source',
      content: 'Source',
    });

    createEdge(db, {
      source_id: center.id,
      target_id: outgoingTarget.id,
      type: EdgeType.Solves,
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
    const center = storeNode(db, {
      type: NodeType.Decision,
      title: 'Center',
      content: 'Center node',
    });
    const outgoingTarget = storeNode(db, {
      type: NodeType.Solution,
      title: 'Outgoing target',
      content: 'Target',
    });
    const incomingSource = storeNode(db, {
      type: NodeType.Problem,
      title: 'Incoming source',
      content: 'Source',
    });

    const outgoingEdge = createEdge(db, {
      source_id: center.id,
      target_id: outgoingTarget.id,
      type: EdgeType.Solves,
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
