import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType } from './types.js';

import { Texere } from './index.js';

/**
 * Facade Contract Tests
 *
 * Tests the Texere class facade — verifies it correctly exposes all graph operations.
 * Does NOT deeply test node/edge/search behavior (that's what unit tests are for).
 *
 * Focus areas:
 * - Lifecycle: constructor, close(), double-close
 * - Delegation: each method works (thin smoke tests)
 * - Options forwarding: minimal mode, includeEdges
 * - Error propagation: facade re-throws internal errors
 * - Embedding integration: semantic search triggers flush
 */
describe('Texere facade', () => {
  let db: Texere;

  beforeEach(() => {
    db = new Texere(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('lifecycle', () => {
    it('constructor creates usable database instance', () => {
      const testDb = new Texere(':memory:');
      expect(testDb).toBeInstanceOf(Texere);

      // Verify instance is usable
      const node = testDb.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Test',
        content: 'Content',
      });
      expect(node.id).toBeDefined();

      testDb.close();
    });

    it('close() releases resources without error', () => {
      const testDb = new Texere(':memory:');
      expect(() => testDb.close()).not.toThrow();
    });

    it('double close() does not crash', () => {
      const testDb = new Texere(':memory:');
      testDb.close();
      expect(() => testDb.close()).not.toThrow();
    });
  });

  describe('delegation - node operations', () => {
    it('storeNode() delegates to internal module', () => {
      const node = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      expect(node.id).toBeDefined();
      expect(node.type).toBe(NodeType.Action);
      expect(node.role).toBe(NodeRole.Task);
    });

    it('storeNode() batch delegates to internal module', () => {
      const nodes = db.storeNode([
        {
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'Task 1',
          content: 'Content 1',
        },
        {
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'Task 2',
          content: 'Content 2',
        },
      ]);

      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBeDefined();
      expect(nodes[1].id).toBeDefined();
    });

    it('getNode() delegates to internal module', () => {
      const created = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      const retrieved = db.getNode(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('getNodes() delegates to internal module', () => {
      const node1 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 1',
        content: 'Content 1',
      });
      const node2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content 2',
      });

      const retrieved = db.getNodes([node1.id, 'missing-id', node2.id, node1.id]);

      expect(retrieved).toHaveLength(4);
      expect(retrieved[0]?.id).toBe(node1.id);
      expect(retrieved[1]).toBeNull();
      expect(retrieved[2]?.id).toBe(node2.id);
      expect(retrieved[3]?.id).toBe(node1.id);
    });

    it('invalidateNode() delegates to internal module', () => {
      const node = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      db.invalidateNode(node.id);

      const retrieved = db.getNode(node.id);
      expect(retrieved?.invalidated_at).not.toBeNull();
    });

    it('replaceNode() delegates to internal module', () => {
      const original = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Original',
        content: 'Original content',
      });

      const replacement = db.replaceNode({
        old_id: original.id,
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Replacement',
        content: 'Replacement content',
      });

      expect(replacement.id).not.toBe(original.id);
      expect(replacement.title).toBe('Replacement');

      // Original should be invalidated
      const originalNode = db.getNode(original.id);
      expect(originalNode?.invalidated_at).not.toBeNull();
    });
  });

  describe('delegation - edge operations', () => {
    it('createEdge() delegates to internal module', () => {
      const source = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Problem',
        content: 'Content',
      });

      const target = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution',
        content: 'Content',
      });

      const edge = db.createEdge({
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.Resolves,
      });

      expect(edge.id).toBeDefined();
      expect(edge.source_id).toBe(source.id);
      expect(edge.target_id).toBe(target.id);
    });

    it('createEdge() batch delegates to internal module', () => {
      const node1 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 1',
        content: 'Content',
      });

      const node2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content',
      });

      const edges = db.createEdge([
        {
          source_id: node1.id,
          target_id: node2.id,
          type: EdgeType.BasedOn,
        },
        {
          source_id: node2.id,
          target_id: node1.id,
          type: EdgeType.RelatedTo,
        },
      ]);

      expect(edges).toHaveLength(2);
      expect(edges[0].id).toBeDefined();
      expect(edges[1].id).toBeDefined();
    });

    it('deleteEdge() delegates to internal module', () => {
      const source = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      const target = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content',
      });

      const edge = db.createEdge({
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.BasedOn,
      });

      const deleted = db.deleteEdge(edge.id);
      expect(deleted).toBe(true);
    });

    it('getEdgesForNode() delegates to internal module', () => {
      const source = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      const target = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content',
      });

      db.createEdge({
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.BasedOn,
      });

      const edges = db.getEdgesForNode(source.id, 'outgoing');
      expect(edges).toHaveLength(1);
      expect(edges[0].source_id).toBe(source.id);
    });
  });

  describe('delegation - search and traversal', () => {
    it('search() delegates to internal module', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Authentication task',
        content: 'Implement JWT auth',
      });

      const results = await db.search({ query: 'authentication', mode: 'keyword' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Authentication');
    });

    it('traverse() delegates to internal module', () => {
      const node1 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 1',
        content: 'Content',
      });

      const node2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content',
      });

      db.createEdge({
        source_id: node1.id,
        target_id: node2.id,
        type: EdgeType.BasedOn,
      });

      const results = db.traverse({ startId: node1.id, direction: 'outgoing' });
      expect(results).toHaveLength(1);
      expect(results[0].node.id).toBe(node2.id);
    });

    it('about() delegates to internal module', async () => {
      const problem = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Auth problem',
        content: 'Users cannot log in',
      });

      const solution = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Auth solution',
        content: 'Fix JWT validation',
      });

      db.createEdge({
        source_id: solution.id,
        target_id: problem.id,
        type: EdgeType.Resolves,
      });

      const results = await db.about({ query: 'auth', mode: 'keyword' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('stats() delegates to internal module', () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      const stats = db.stats();
      expect(stats.nodes.total).toBe(1);
      expect(stats.nodes.byType[NodeType.Action]).toBe(1);
    });
  });

  describe('options forwarding', () => {
    it('storeNode({ minimal: true }) returns only id', () => {
      const node = db.storeNode(
        {
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'Task',
          content: 'Content',
        },
        { minimal: true },
      );

      // Minimal node has only id
      expect(node).toHaveProperty('id');
      expect(Object.keys(node)).toEqual(['id']);
    });

    it('storeNode() batch with minimal: true returns only ids', () => {
      const nodes = db.storeNode(
        [
          {
            type: NodeType.Action,
            role: NodeRole.Task,
            title: 'Task 1',
            content: 'Content',
          },
          {
            type: NodeType.Action,
            role: NodeRole.Task,
            title: 'Task 2',
            content: 'Content',
          },
        ],
        { minimal: true },
      );

      expect(nodes).toHaveLength(2);
      expect(Object.keys(nodes[0])).toEqual(['id']);
      expect(Object.keys(nodes[1])).toEqual(['id']);
    });

    it('getNode({ includeEdges: true }) includes edges', () => {
      const node1 = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Problem',
        content: 'Content',
      });

      const node2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution',
        content: 'Content',
      });

      db.createEdge({
        source_id: node2.id,
        target_id: node1.id,
        type: EdgeType.Resolves,
      });

      const retrieved = db.getNode(node1.id, { includeEdges: true });
      expect(retrieved).not.toBeNull();
      expect('edges' in retrieved!).toBe(true);
      expect((retrieved as { edges: unknown[] }).edges).toHaveLength(1);
    });

    it('replaceNode({ minimal: true }) returns only id', () => {
      const original = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Original',
        content: 'Content',
      });

      const replacement = db.replaceNode(
        {
          old_id: original.id,
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'Replacement',
          content: 'Content',
        },
        { minimal: true },
      );

      expect(replacement).toHaveProperty('id');
      expect(Object.keys(replacement)).toEqual(['id']);
    });

    it('createEdge({ minimal: true }) returns only id', () => {
      const source = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      const target = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content',
      });

      const edge = db.createEdge(
        {
          source_id: source.id,
          target_id: target.id,
          type: EdgeType.BasedOn,
        },
        { minimal: true },
      );

      expect(edge).toHaveProperty('id');
      expect(Object.keys(edge)).toEqual(['id']);
    });

    it('createEdge() batch with minimal: true returns only ids', () => {
      const node1 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 1',
        content: 'Content',
      });

      const node2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content',
      });

      const edges = db.createEdge(
        [
          {
            source_id: node1.id,
            target_id: node2.id,
            type: EdgeType.BasedOn,
          },
          {
            source_id: node2.id,
            target_id: node1.id,
            type: EdgeType.RelatedTo,
          },
        ],
        { minimal: true },
      );

      expect(edges).toHaveLength(2);
      expect(Object.keys(edges[0])).toEqual(['id']);
      expect(Object.keys(edges[1])).toEqual(['id']);
    });
  });

  describe('error propagation', () => {
    it('storeNode with invalid type-role throws with useful message', () => {
      expect(() =>
        db.storeNode({
          type: NodeType.Issue,
          role: NodeRole.CodePattern, // Invalid: Issue cannot have CodePattern role
          title: 'Invalid',
          content: 'Content',
        }),
      ).toThrow(/invalid.*type.*role/i);
    });

    it('invalidateNode with non-existent id throws', () => {
      expect(() => db.invalidateNode('non-existent-id')).toThrow(/not found/i);
    });

    it('replaceNode with non-existent old_id throws', () => {
      expect(() =>
        db.replaceNode({
          old_id: 'non-existent-id',
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'Replacement',
          content: 'Content',
        }),
      ).toThrow(/not found/i);
    });

    it('createEdge with non-existent source_id throws', () => {
      const target = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      expect(() =>
        db.createEdge({
          source_id: 'non-existent-id',
          target_id: target.id,
          type: EdgeType.BasedOn,
        }),
      ).toThrow(/foreign key/i);
    });

    it('createEdge with non-existent target_id throws', () => {
      const source = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      expect(() =>
        db.createEdge({
          source_id: source.id,
          target_id: 'non-existent-id',
          type: EdgeType.BasedOn,
        }),
      ).toThrow(/foreign key/i);
    });
  });

  describe('embedding integration', () => {
    it('semantic search triggers embedding flush', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Authentication task',
        content: 'Implement JWT authentication',
      });

      // Semantic search should trigger flush and embed query
      const results = await db.search({ query: 'authentication', mode: 'semantic' });

      // Should not throw and should return results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('hybrid search triggers embedding flush', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Logging task',
        content: 'Add structured logging',
      });

      // Hybrid search should trigger flush and embed query
      const results = await db.search({ query: 'logging', mode: 'hybrid' });

      // Should not throw and should return results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('keyword search does not trigger embedding flush', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Database task',
        content: 'Optimize queries',
      });

      // Keyword search should not trigger embedding pipeline
      const results = await db.search({ query: 'database', mode: 'keyword' });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('about() with semantic mode triggers embedding flush', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Security task',
        content: 'Add rate limiting',
      });

      // About with semantic mode should trigger flush
      const results = await db.about({ query: 'security', mode: 'semantic' });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
