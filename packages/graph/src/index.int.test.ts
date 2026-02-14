import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType, Texere } from './index.js';
import type { Node } from './index.js';

describe('Graph package integration', () => {
  describe('package import', () => {
    it('import { Texere } from @texere/graph works', () => {
      expect(Texere).toBeDefined();
      expect(typeof Texere).toBe('function');
    });

    it('import { NodeType, NodeRole, EdgeType } from @texere/graph works', () => {
      expect(NodeType).toBeDefined();
      expect(NodeRole).toBeDefined();
      expect(EdgeType).toBeDefined();
      expect(NodeType.Action).toBe('action');
      expect(NodeRole.Task).toBe('task');
      expect(EdgeType.Resolves).toBe('RESOLVES');
    });
  });

  describe('full workflow: create DB -> store -> edges -> search -> traverse -> close', () => {
    let db: Texere;

    beforeEach(() => {
      db = new Texere(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('runs complete graph lifecycle end-to-end', async () => {
      const problem = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Database write contention',
        content: 'Concurrent writes cause SQLITE_BUSY errors under load',
        tags: ['sqlite', 'concurrency'],
        importance: 0.9,
      });

      const solution = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Use WAL mode with IMMEDIATE transactions',
        content: 'Enable WAL journal mode and wrap writes in IMMEDIATE transactions',
        tags: ['sqlite', 'concurrency', 'wal'],
        importance: 0.85,
      });

      const fix = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Fix,
        title: 'Add busy timeout pragma',
        content: 'Set pragma busy_timeout = 5000 for graceful retry',
        tags: ['sqlite'],
        importance: 0.7,
      });

      expect(problem.id).toBeDefined();
      expect(solution.id).toBeDefined();
      expect(fix.id).toBeDefined();

      const solvesEdge = db.createEdge({
        source_id: solution.id,
        target_id: problem.id,
        type: EdgeType.Resolves,
        strength: 0.95,
      });

      const buildsOnEdge = db.createEdge({
        source_id: fix.id,
        target_id: solution.id,
        type: EdgeType.Extends,
        strength: 0.8,
      });

      expect(solvesEdge.id).toBeDefined();
      expect(solvesEdge.type).toBe(EdgeType.Resolves);
      expect(buildsOnEdge.id).toBeDefined();

      const outgoingEdges = db.getEdgesForNode(solution.id, 'outgoing');
      expect(outgoingEdges).toHaveLength(1);
      expect(outgoingEdges[0].target_id).toBe(problem.id);

      const incomingEdges = db.getEdgesForNode(solution.id, 'incoming');
      expect(incomingEdges).toHaveLength(1);
      expect(incomingEdges[0].source_id).toBe(fix.id);

      const retrieved = db.getNode(problem.id, { includeEdges: true });
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(problem.id);

      const searchResults = await db.search({ query: 'WAL mode transactions' });
      expect(searchResults.length).toBeGreaterThan(0);
      const foundIds = searchResults.map((node: Node) => node.id);
      expect(foundIds).toContain(solution.id);

      const traverseResults = db.traverse({
        startId: fix.id,
        direction: 'outgoing',
        maxDepth: 3,
      });
      expect(traverseResults.length).toBeGreaterThanOrEqual(1);
      const traverseNodeIds = traverseResults.map((r) => r.node.id);
      expect(traverseNodeIds).toContain(solution.id);

      const aboutResults = await db.about({
        query: 'contention',
        direction: 'both',
        maxDepth: 2,
      });
      expect(aboutResults.length).toBeGreaterThan(0);

      const stats = db.stats();
      expect(stats.nodes.total).toBe(3);
      expect(stats.edges.total).toBe(2);
      expect(stats.nodes.byType[NodeType.Issue]).toBe(1);
      expect(stats.nodes.byType[NodeType.Action]).toBe(2);
      expect(stats.edges.byType[EdgeType.Resolves]).toBe(1);
      expect(stats.edges.byType[EdgeType.Extends]).toBe(1);

      db.invalidateNode(problem.id);
      const invalidated = db.getNode(problem.id);
      expect(invalidated?.invalidated_at).not.toBeNull();

      const updatedStats = db.stats();
      expect(updatedStats.nodes.invalidated).toBe(1);

      const deleted = db.deleteEdge(solvesEdge.id);
      expect(deleted).toBe(true);

      const finalStats = db.stats();
      expect(finalStats.edges.total).toBe(1);
    });
  });

  describe('replaceNode', () => {
    let db: Texere;

    beforeEach(() => {
      db = new Texere(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('atomically replaces node and creates REPLACES edge', () => {
      const oldNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Use REST API',
        content: 'Initial decision to use REST for API',
        tags: ['api', 'rest'],
        importance: 0.8,
      });

      const newNode = db.replaceNode({
        old_id: oldNode.id,
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Use GraphQL API',
        content: 'Updated decision to use GraphQL instead of REST',
        tags: ['api', 'graphql'],
        importance: 0.9,
      });

      expect(newNode.id).toBeDefined();
      expect(newNode.id).not.toBe(oldNode.id);
      expect(newNode.title).toBe('Use GraphQL API');

      const replacedNode = db.getNode(oldNode.id);
      expect(replacedNode?.invalidated_at).not.toBeNull();

      const edges = db.getEdgesForNode(oldNode.id, 'outgoing');
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe(EdgeType.Replaces);
      expect(edges[0].target_id).toBe(newNode.id);
    });

    it('supports minimal mode', () => {
      const oldNode = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Old task',
        content: 'Old task content',
      });

      const result = db.replaceNode(
        {
          old_id: oldNode.id,
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'New task',
          content: 'New task content',
        },
        { minimal: true },
      );

      expect(result).toHaveProperty('id');
      expect(Object.keys(result)).toHaveLength(1);

      const replacedNode = db.getNode(oldNode.id);
      expect(replacedNode?.invalidated_at).not.toBeNull();
    });

    it('throws when old node does not exist', () => {
      expect(() => {
        db.replaceNode({
          old_id: 'nonexistent',
          type: NodeType.Knowledge,
          role: NodeRole.Decision,
          title: 'New node',
          content: 'Content',
        });
      }).toThrow('Node not found: nonexistent');
    });

    it('throws when replacing already-invalidated node', () => {
      const oldNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Old decision',
        content: 'Old content',
      });

      db.invalidateNode(oldNode.id);

      expect(() => {
        db.replaceNode({
          old_id: oldNode.id,
          type: NodeType.Knowledge,
          role: NodeRole.Decision,
          title: 'New decision',
          content: 'New content',
        });
      }).toThrow('Cannot replace invalidated node');
    });

    it('fails atomically on invalid type-role combination', () => {
      const oldNode = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Valid node',
        content: 'Valid content',
      });

      expect(() => {
        db.replaceNode({
          old_id: oldNode.id,
          type: NodeType.Knowledge,
          role: NodeRole.Task,
          title: 'Invalid combination',
          content: 'This should fail',
        });
      }).toThrow('invalid type-role combination');

      const unchanged = db.getNode(oldNode.id);
      expect(unchanged?.invalidated_at).toBeNull();

      const edges = db.getEdgesForNode(oldNode.id, 'outgoing');
      expect(edges).toHaveLength(0);
    });
  });
});
