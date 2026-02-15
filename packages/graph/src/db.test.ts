import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge } from './edges.js';
import { storeNode } from './nodes.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

describe('database schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('enforces foreign keys: edge with nonexistent source_id is rejected', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Valid Node',
      content: 'This node exists',
    });

    expect(() => {
      createEdge(db, {
        source_id: 'nonexistent-id',
        target_id: node.id,
        type: EdgeType.RelatedTo,
      });
    }).toThrow();
  });

  it('enforces foreign keys: edge with nonexistent target_id is rejected', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Valid Node',
      content: 'This node exists',
    });

    expect(() => {
      createEdge(db, {
        source_id: node.id,
        target_id: 'nonexistent-id',
        type: EdgeType.RelatedTo,
      });
    }).toThrow();
  });

  it('enforces self-referential edge constraint: edge cannot reference same node', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Valid Node',
      content: 'This node exists',
    });

    expect(() => {
      createEdge(db, {
        source_id: node.id,
        target_id: node.id,
        type: EdgeType.RelatedTo,
      });
    }).toThrow();
  });

  it('FTS5 index is populated on node insert and searchable', () => {
    storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Searchable Title',
      content: 'Searchable content with unique keyword',
    });

    const row = db
      .prepare<
        unknown[],
        { rowid: number }
      >("SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH 'unique'")
      .get();

    expect(row).toBeDefined();
    expect(row?.rowid).toBe(1);
  });

  it('FTS5 index searches across title and content fields', () => {
    storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Title with keyword alpha',
      content: 'Content without that keyword',
    });

    storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Title without that keyword',
      content: 'Content with keyword beta',
    });

    const titleMatch = db
      .prepare<
        unknown[],
        { rowid: number }
      >("SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH 'alpha'")
      .get();

    const contentMatch = db
      .prepare<
        unknown[],
        { rowid: number }
      >("SELECT rowid FROM nodes_fts WHERE nodes_fts MATCH 'beta'")
      .get();

    expect(titleMatch?.rowid).toBe(1);
    expect(contentMatch?.rowid).toBe(2);
  });

  it('tags are normalized into node_tags table and filterable', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Tagged Node',
      content: 'Node with tags',
      tags: ['alpha', 'beta', 'gamma'],
    });

    const rows = db
      .prepare<
        unknown[],
        { tag: string }
      >('SELECT tag FROM node_tags WHERE node_id = ? ORDER BY tag')
      .all(node.id);

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.tag)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('tags are queryable: can filter nodes by tag', () => {
    const node1 = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Node 1',
      content: 'Content 1',
      tags: ['target-tag', 'other'],
    });

    storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Node 2',
      content: 'Content 2',
      tags: ['different-tag'],
    });

    const rows = db
      .prepare<
        unknown[],
        { node_id: string }
      >("SELECT node_id FROM node_tags WHERE tag = 'target-tag'")
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.node_id).toBe(node1.id);
  });

  it('empty tags array does not create node_tags rows', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Untagged Node',
      content: 'No tags',
      tags: [],
    });

    const rows = db
      .prepare<unknown[], { tag: string }>('SELECT tag FROM node_tags WHERE node_id = ?')
      .all(node.id);

    expect(rows).toHaveLength(0);
  });

  it('nodes_vec table accepts embeddings for stored nodes', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Node with embedding',
      content: 'Content',
    });

    // Create a 384-dimensional embedding (all zeros for test)
    const embedding = new Float32Array(384);

    db.prepare('INSERT INTO nodes_vec (node_id, embedding) VALUES (?, ?)').run(node.id, embedding);

    const row = db
      .prepare<unknown[], { node_id: string }>('SELECT node_id FROM nodes_vec WHERE node_id = ?')
      .get(node.id);

    expect(row).toBeDefined();
    expect(row?.node_id).toBe(node.id);
  });

  it('nodes_vec stores embeddings with correct dimensionality', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Node with embedding',
      content: 'Content',
    });

    const embedding = new Float32Array(384);
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.random();
    }

    db.prepare('INSERT INTO nodes_vec (node_id, embedding) VALUES (?, ?)').run(node.id, embedding);

    const row = db
      .prepare<unknown[], { node_id: string }>('SELECT node_id FROM nodes_vec WHERE node_id = ?')
      .get(node.id);

    expect(row).toBeDefined();
    expect(row?.node_id).toBe(node.id);
  });

  it('nodes_vec trigger deletes embedding when node is invalidated', () => {
    const node = storeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      title: 'Node with embedding',
      content: 'Content',
    });

    const embedding = new Float32Array(384);
    db.prepare('INSERT INTO nodes_vec (node_id, embedding) VALUES (?, ?)').run(node.id, embedding);

    // Verify embedding exists
    const beforeInvalidation = db
      .prepare<unknown[], { node_id: string }>('SELECT node_id FROM nodes_vec WHERE node_id = ?')
      .get(node.id);
    expect(beforeInvalidation).toBeDefined();

    // Invalidate node
    db.prepare('UPDATE nodes SET invalidated_at = ? WHERE id = ?').run(Date.now(), node.id);

    // Verify embedding was deleted by trigger
    const afterInvalidation = db
      .prepare<unknown[], { node_id: string }>('SELECT node_id FROM nodes_vec WHERE node_id = ?')
      .get(node.id);
    expect(afterInvalidation).toBeUndefined();
  });
});
