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
      const foundIds = searchResults.map((node: Node) => node.id);
      expect(foundIds).toContain(solution.id);

      const traverseResults = db.traverse({
        startId: fix.id,
        direction: 'outgoing',
        maxDepth: 3,
      });
      expect(traverseResults).toHaveLength(2);
      expect(traverseResults[0].node.id).toBe(solution.id);
      expect(traverseResults[1].node.id).toBe(problem.id);

      const aboutResults = await db.about({
        query: 'contention',
        direction: 'both',
        maxDepth: 2,
      });
      const aboutIds = aboutResults.map((r) => r.node.id);
      expect(aboutIds).toContain(problem.id);

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

  // SQLite with WAL mode serializes writes, so these tests verify graceful
  // handling of rapid concurrent operations rather than true parallelism.
  describe('concurrency', () => {
    let db: Texere;

    beforeEach(() => {
      db = new Texere(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('concurrent storeNode calls do not corrupt data', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          Promise.resolve().then(() =>
            db.storeNode({
              type: NodeType.Knowledge,
              role: NodeRole.Finding,
              title: `Concurrent node ${i}`,
              content: `Content for concurrent test node number ${i}`,
              tags: ['concurrency-test'],
              importance: 0.5,
            }),
          ),
        ),
      );

      expect(results).toHaveLength(10);

      const ids = results.map((n) => n.id);
      expect(new Set(ids).size).toBe(10);

      for (let i = 0; i < 10; i++) {
        const node = db.getNode(ids[i]!);
        expect(node).toBeDefined();
        expect(node!.title).toBe(`Concurrent node ${i}`);
      }

      const stats = db.stats();
      expect(stats.nodes.total).toBe(10);
    });

    it('storeNode during search does not cause errors', async () => {
      db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: 'Searchable finding about databases',
        content: 'SQLite uses WAL mode for concurrent readers',
        tags: ['search-test'],
      });

      const [searchResults] = await Promise.all([
        db.search({ query: 'databases WAL mode', mode: 'keyword' }),
        Promise.resolve().then(() =>
          db.storeNode({
            type: NodeType.Action,
            role: NodeRole.Task,
            title: 'New task inserted during search',
            content: 'Inserted while search is running',
          }),
        ),
      ]);

      expect(searchResults.length).toBeGreaterThanOrEqual(1);

      const stats = db.stats();
      expect(stats.nodes.total).toBe(2);
    });

    it('invalidateNode during traverse does not crash', () => {
      const a = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Root problem',
        content: 'The root cause issue',
      });
      const b = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution node',
        content: 'Addresses the root problem',
      });
      const c = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Fix,
        title: 'Fix node',
        content: 'Concrete fix implementation',
      });

      db.createEdge({ source_id: a.id, target_id: b.id, type: EdgeType.Causes });
      db.createEdge({ source_id: b.id, target_id: c.id, type: EdgeType.Extends });

      const traverseResults = db.traverse({
        startId: a.id,
        direction: 'outgoing',
        maxDepth: 3,
      });

      db.invalidateNode(b.id);

      expect(traverseResults).toHaveLength(2);
      expect(traverseResults[0]!.node.id).toBe(b.id);
      expect(traverseResults[1]!.node.id).toBe(c.id);

      const invalidated = db.getNode(b.id);
      expect(invalidated?.invalidated_at).not.toBeNull();
    });

    it('concurrent batch operations maintain atomicity', async () => {
      const batch1 = Array.from({ length: 50 }, (_, i) => ({
        type: NodeType.Knowledge as const,
        role: NodeRole.Finding as const,
        title: `Batch 1 node ${i}`,
        content: `Content for batch 1 node ${i}`,
      }));

      const batch2 = Array.from({ length: 50 }, (_, i) => ({
        type: NodeType.Action as const,
        role: NodeRole.Task as const,
        title: `Batch 2 node ${i}`,
        content: `Content for batch 2 node ${i}`,
      }));

      const [results1, results2] = await Promise.all([
        Promise.resolve().then(() => db.storeNode(batch1)),
        Promise.resolve().then(() => db.storeNode(batch2)),
      ]);

      expect(results1).toHaveLength(50);
      expect(results2).toHaveLength(50);

      const stats = db.stats();
      expect(stats.nodes.total).toBe(100);

      const allIds = [...results1.map((n) => n.id), ...results2.map((n) => n.id)];
      expect(new Set(allIds).size).toBe(100);
    });

    it('replaceNode is atomic under concurrent access', async () => {
      const original = db.storeNode({
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Original decision',
        content: 'The initial decision content',
        importance: 0.8,
      });

      const [replacement, retrieved] = await Promise.all([
        Promise.resolve().then(() =>
          db.replaceNode({
            old_id: original.id,
            type: NodeType.Knowledge,
            role: NodeRole.Decision,
            title: 'Updated decision',
            content: 'The revised decision content',
            importance: 0.9,
          }),
        ),
        Promise.resolve().then(() => db.getNode(original.id)),
      ]);

      expect(replacement.id).toBeDefined();
      expect(replacement.id).not.toBe(original.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(original.id);
      expect(retrieved!.title).toBe('Original decision');

      const afterReplace = db.getNode(original.id);
      expect(afterReplace!.invalidated_at).not.toBeNull();

      const newNode = db.getNode(replacement.id);
      expect(newNode!.title).toBe('Updated decision');
    });
  });

  describe('performance benchmarks', { timeout: 60_000 }, () => {
    let db: Texere;

    beforeEach(() => {
      db = new Texere(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('batch storeNode (50 nodes) completes in <50ms', () => {
      const inputs = Array.from({ length: 50 }, (_, i) => ({
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: `Batch node ${i}`,
        content: `Content for batch node ${i} with additional text for realism`,
      }));

      const start = performance.now();
      const nodes = db.storeNode(inputs);
      const elapsed = performance.now() - start;

      expect(nodes).toHaveLength(50);
      expect(elapsed).toBeLessThan(50);
    });

    it('keyword search completes in <200ms with 10,000 nodes', async () => {
      for (let batch = 0; batch < 200; batch++) {
        db.storeNode(
          Array.from({ length: 50 }, (_, i) => ({
            type: NodeType.Knowledge,
            role: NodeRole.Finding,
            title: `Knowledge finding ${batch * 50 + i}`,
            content: `Detailed content about knowledge finding number ${batch * 50 + i}`,
          })),
          { minimal: true },
        );
      }

      expect(db.stats().nodes.total).toBe(10_000);

      const start = performance.now();
      const results = await db.search({ query: 'knowledge finding', mode: 'keyword', limit: 20 });
      const elapsed = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(200);
    });

    it('traverse depth-5 completes in <100ms with 1,000-node graph', () => {
      const nodeIds: string[] = [];
      for (let batch = 0; batch < 20; batch++) {
        const nodes = db.storeNode(
          Array.from({ length: 50 }, (_, i) => ({
            type: NodeType.Knowledge,
            role: NodeRole.Finding,
            title: `Graph node ${batch * 50 + i}`,
            content: `Content for graph node ${batch * 50 + i}`,
          })),
          { minimal: true },
        );
        nodeIds.push(...nodes.map((n) => n.id));
      }

      // Binary tree edges (~999) + chain edges (~999) ≈ 2k total
      const edgeBatch: { source_id: string; target_id: string; type: EdgeType }[] = [];
      for (let i = 0; i < nodeIds.length; i++) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        if (left < nodeIds.length) {
          edgeBatch.push({
            source_id: nodeIds[i]!,
            target_id: nodeIds[left]!,
            type: EdgeType.DependsOn,
          });
        }
        if (right < nodeIds.length) {
          edgeBatch.push({
            source_id: nodeIds[i]!,
            target_id: nodeIds[right]!,
            type: EdgeType.DependsOn,
          });
        }
      }
      for (let i = 0; i < nodeIds.length - 1; i++) {
        edgeBatch.push({
          source_id: nodeIds[i]!,
          target_id: nodeIds[i + 1]!,
          type: EdgeType.RelatedTo,
        });
      }
      for (let i = 0; i < edgeBatch.length; i += 50) {
        db.createEdge(edgeBatch.slice(i, i + 50), { minimal: true });
      }

      const start = performance.now();
      const results = db.traverse({
        startId: nodeIds[0]!,
        direction: 'outgoing',
        maxDepth: 5,
      });
      const elapsed = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100);
    });

    it('stats() completes in <20ms with 10,000 nodes', () => {
      for (let batch = 0; batch < 200; batch++) {
        db.storeNode(
          Array.from({ length: 50 }, (_, i) => ({
            type: NodeType.Knowledge,
            role: NodeRole.Finding,
            title: `Stats node ${batch * 50 + i}`,
            content: `Content for stats node ${batch * 50 + i}`,
          })),
          { minimal: true },
        );
      }

      expect(db.stats().nodes.total).toBe(10_000);

      const start = performance.now();
      const result = db.stats();
      const elapsed = performance.now() - start;

      expect(result.nodes.total).toBe(10_000);
      expect(elapsed).toBeLessThan(20);
    });
  });
});
