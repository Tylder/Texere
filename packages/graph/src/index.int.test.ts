import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeType, TextereDB } from './index.js';
import type { Node } from './index.js';

describe('Graph package integration', () => {
  describe('package import', () => {
    it('import { TextereDB } from @texere/graph works', () => {
      expect(TextereDB).toBeDefined();
      expect(typeof TextereDB).toBe('function');
    });

    it('import { NodeType, EdgeType } from @texere/graph works', () => {
      expect(NodeType).toBeDefined();
      expect(EdgeType).toBeDefined();
      expect(NodeType.Task).toBe('task');
      expect(EdgeType.RelatedTo).toBe('RELATED_TO');
    });
  });

  describe('full workflow: create DB -> store -> edges -> search -> traverse -> close', () => {
    let db: TextereDB;

    beforeEach(() => {
      db = new TextereDB(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('runs complete graph lifecycle end-to-end', () => {
      const problem = db.storeNode({
        type: NodeType.Problem,
        title: 'Database write contention',
        content: 'Concurrent writes cause SQLITE_BUSY errors under load',
        tags: ['sqlite', 'concurrency'],
        importance: 0.9,
      });

      const solution = db.storeNode({
        type: NodeType.Solution,
        title: 'Use WAL mode with IMMEDIATE transactions',
        content: 'Enable WAL journal mode and wrap writes in IMMEDIATE transactions',
        tags: ['sqlite', 'concurrency', 'wal'],
        importance: 0.85,
      });

      const fix = db.storeNode({
        type: NodeType.Fix,
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
        type: EdgeType.Solves,
        strength: 0.95,
      });

      const buildsOnEdge = db.createEdge({
        source_id: fix.id,
        target_id: solution.id,
        type: EdgeType.BuildsOn,
        strength: 0.8,
      });

      expect(solvesEdge.id).toBeDefined();
      expect(solvesEdge.type).toBe(EdgeType.Solves);
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

      const searchResults = db.search({ query: 'WAL mode transactions' });
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

      const aboutResults = db.about({
        query: 'contention',
        direction: 'both',
        maxDepth: 2,
      });
      expect(aboutResults.length).toBeGreaterThan(0);

      const stats = db.stats();
      expect(stats.nodes.total).toBe(3);
      expect(stats.edges.total).toBe(2);
      expect(stats.nodes.byType[NodeType.Problem]).toBe(1);
      expect(stats.nodes.byType[NodeType.Solution]).toBe(1);
      expect(stats.nodes.byType[NodeType.Fix]).toBe(1);
      expect(stats.edges.byType[EdgeType.Solves]).toBe(1);
      expect(stats.edges.byType[EdgeType.BuildsOn]).toBe(1);

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
});
