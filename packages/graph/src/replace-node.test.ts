import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge } from './edges.js';
import { getNode, storeNode } from './nodes.js';
import { replaceNode } from './replace-node.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

describe('replaceNode', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('replaces node atomically: new node created, old node invalidated, REPLACES edge created', () => {
    // Create original node
    const oldNode = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Use REST API',
      content: 'Initial decision',
      tags: ['api'],
    });

    // Replace with new node
    const newNode = replaceNode(db, {
      old_id: oldNode.id,
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Use GraphQL API',
      content: 'Updated decision',
      tags: ['api', 'graphql'],
    });

    // Verify new node was created
    expect(newNode.id).toBeDefined();
    expect(newNode.title).toBe('Use GraphQL API');
    expect(newNode.content).toBe('Updated decision');

    // Verify old node was invalidated
    const invalidatedNode = getNode(db, oldNode.id);
    expect(invalidatedNode).not.toBeNull();
    expect(invalidatedNode!.invalidated_at).not.toBeNull();
    expect(Number.isInteger(invalidatedNode!.invalidated_at)).toBe(true);

    // Verify REPLACES edge was created (old → new)
    const edges = db
      .prepare('SELECT * FROM edges WHERE source_id = ? AND type = ?')
      .all(oldNode.id, EdgeType.Replaces) as Array<{
      source_id: string;
      target_id: string;
      type: string;
    }>;

    expect(edges).toHaveLength(1);
    expect(edges[0]!.source_id).toBe(oldNode.id);
    expect(edges[0]!.target_id).toBe(newNode.id);
    expect(edges[0]!.type).toBe(EdgeType.Replaces);
  });

  it('new node has different ID from old node', () => {
    const oldNode = storeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'Old task',
      content: 'Old content',
    });

    const newNode = replaceNode(db, {
      old_id: oldNode.id,
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'New task',
      content: 'New content',
    });

    expect(newNode.id).not.toBe(oldNode.id);
    expect(newNode.id).toMatch(/^[A-Za-z0-9_-]{21}$/);
  });

  it('REPLACES edge points from old to new', () => {
    const oldNode = storeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Original problem',
      content: 'Problem description',
    });

    const newNode = replaceNode(db, {
      old_id: oldNode.id,
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Updated problem',
      content: 'Updated description',
    });

    // Query edge direction
    const edge = db
      .prepare('SELECT source_id, target_id FROM edges WHERE type = ?')
      .get(EdgeType.Replaces) as { source_id: string; target_id: string } | undefined;

    expect(edge).toBeDefined();
    expect(edge!.source_id).toBe(oldNode.id);
    expect(edge!.target_id).toBe(newNode.id);
  });

  it('old node invalidated_at is set to current timestamp', () => {
    const oldNode = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Research finding',
      content: 'Initial findings',
    });

    const before = Date.now();
    replaceNode(db, {
      old_id: oldNode.id,
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Updated finding',
      content: 'Revised findings',
    });
    const after = Date.now();

    const invalidatedNode = getNode(db, oldNode.id);
    expect(invalidatedNode!.invalidated_at).not.toBeNull();
    expect(invalidatedNode!.invalidated_at).toBeGreaterThanOrEqual(before);
    expect(invalidatedNode!.invalidated_at).toBeLessThanOrEqual(after);
  });

  it('throws when old_id does not exist', () => {
    expect(() => {
      replaceNode(db, {
        old_id: 'nonexistent-id',
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'New node',
        content: 'Content',
      });
    }).toThrow('Node not found: nonexistent-id');
  });

  it('throws when old node is already invalidated', () => {
    const oldNode = storeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Old solution',
      content: 'Old approach',
    });

    // Invalidate the node
    db.prepare('UPDATE nodes SET invalidated_at = ? WHERE id = ?').run(Date.now(), oldNode.id);

    expect(() => {
      replaceNode(db, {
        old_id: oldNode.id,
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'New solution',
        content: 'New approach',
      });
    }).toThrow('Cannot replace invalidated node');
  });

  it('rolls back atomically on invalid type-role combination', () => {
    const oldNode = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Valid node',
      content: 'Valid content',
    });

    // Attempt to replace with invalid type-role combination
    expect(() => {
      replaceNode(db, {
        old_id: oldNode.id,
        type: NodeType.Knowledge,
        role: NodeRole.Task, // Invalid: Task is not a valid role for Knowledge type
        title: 'Invalid node',
        content: 'This should fail',
      });
    }).toThrow(/invalid type-role/i);

    // Verify old node was NOT invalidated (rollback)
    const unchangedNode = getNode(db, oldNode.id);
    expect(unchangedNode).not.toBeNull();
    expect(unchangedNode!.invalidated_at).toBeNull();

    // Verify no REPLACES edge was created (rollback)
    const edges = db
      .prepare('SELECT COUNT(*) AS count FROM edges WHERE source_id = ?')
      .get(oldNode.id) as { count: number };
    expect(edges.count).toBe(0);

    // Verify no new node was created (rollback)
    const nodeCount = db.prepare('SELECT COUNT(*) AS count FROM nodes').get() as { count: number };
    expect(nodeCount.count).toBe(1); // Only the original node
  });

  it('preserves edges pointing TO old node after replacement', () => {
    // Create old node
    const oldNode = storeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Error,
      title: 'Original error',
      content: 'Error details',
    });

    // Create another node that references the old node
    const relatedNode = storeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Fix,
      title: 'Fix for error',
      content: 'Fix details',
    });

    // Create edge pointing TO old node
    createEdge(db, {
      source_id: relatedNode.id,
      target_id: oldNode.id,
      type: EdgeType.Resolves,
    });

    // Replace old node
    const newNode = replaceNode(db, {
      old_id: oldNode.id,
      type: NodeType.Issue,
      role: NodeRole.Error,
      title: 'Updated error',
      content: 'Updated details',
    });

    // Verify incoming edge to old node still exists
    const incomingEdges = db
      .prepare('SELECT * FROM edges WHERE target_id = ?')
      .all(oldNode.id) as Array<{ source_id: string; target_id: string; type: string }>;

    expect(incomingEdges).toHaveLength(1);
    expect(incomingEdges[0]!.source_id).toBe(relatedNode.id);
    expect(incomingEdges[0]!.target_id).toBe(oldNode.id);
    expect(incomingEdges[0]!.type).toBe(EdgeType.Resolves);

    // Verify old node has both incoming edge and outgoing REPLACES edge
    const allEdges = db
      .prepare('SELECT * FROM edges WHERE source_id = ? OR target_id = ?')
      .all(oldNode.id, oldNode.id) as Array<{ source_id: string; target_id: string; type: string }>;

    expect(allEdges).toHaveLength(2);

    const replacesEdge = allEdges.find((e) => e.type === EdgeType.Replaces);
    expect(replacesEdge).toBeDefined();
    expect(replacesEdge!.source_id).toBe(oldNode.id);
    expect(replacesEdge!.target_id).toBe(newNode.id);

    const resolvesEdge = allEdges.find((e) => e.type === EdgeType.Resolves);
    expect(resolvesEdge).toBeDefined();
    expect(resolvesEdge!.source_id).toBe(relatedNode.id);
    expect(resolvesEdge!.target_id).toBe(oldNode.id);
  });

  it('minimal mode returns only { id } for new node', () => {
    const oldNode = storeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.CodePattern,
      title: 'Old pattern',
      content: 'Old code',
    });

    const result = replaceNode(
      db,
      {
        old_id: oldNode.id,
        type: NodeType.Artifact,
        role: NodeRole.CodePattern,
        title: 'New pattern',
        content: 'New code',
      },
      { minimal: true },
    );

    // Verify minimal response
    expect(Object.keys(result)).toEqual(['id']);
    expect(result.id).toMatch(/^[A-Za-z0-9_-]{21}$/);

    // Verify old node was still invalidated
    const invalidatedNode = getNode(db, oldNode.id);
    expect(invalidatedNode!.invalidated_at).not.toBeNull();

    // Verify new node was created and persisted
    const newNode = getNode(db, result.id);
    expect(newNode).not.toBeNull();
    expect(newNode!.title).toBe('New pattern');
  });

  it('preserves all new node properties (tags, importance, confidence, status, scope)', () => {
    const oldNode = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Principle,
      title: 'Old principle',
      content: 'Old content',
      tags: ['old'],
      importance: 0.5,
    });

    const newNode = replaceNode(db, {
      old_id: oldNode.id,
      type: NodeType.Knowledge,
      role: NodeRole.Principle,
      title: 'New principle',
      content: 'New content',
      tags: ['new', 'updated'],
      importance: 0.9,
      confidence: 0.95,
    });

    // Verify all properties were set correctly
    expect(newNode.title).toBe('New principle');
    expect(newNode.content).toBe('New content');
    expect(newNode.importance).toBe(0.9);
    expect(newNode.confidence).toBe(0.95);

    // Verify tags were stored
    const tags = db
      .prepare('SELECT tag FROM node_tags WHERE node_id = ? ORDER BY tag ASC')
      .all(newNode.id) as Array<{ tag: string }>;

    expect(tags).toHaveLength(2);
    expect(tags.map((t) => t.tag)).toEqual(['new', 'updated']);
  });

  it('allows changing node type and role during replacement', () => {
    // Create node as Knowledge/Decision
    const oldNode = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Initial decision',
      content: 'Decision content',
    });

    // Replace with Action/Task (different type and role)
    const newNode = replaceNode(db, {
      old_id: oldNode.id,
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'Converted to task',
      content: 'Task content',
    });

    expect(newNode.type).toBe(NodeType.Action);
    expect(newNode.role).toBe(NodeRole.Task);

    // Verify old node still has original type/role
    const invalidatedNode = getNode(db, oldNode.id);
    expect(invalidatedNode!.type).toBe(NodeType.Knowledge);
    expect(invalidatedNode!.role).toBe(NodeRole.Decision);
  });
});
