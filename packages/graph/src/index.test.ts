import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType } from './types.js';

import { Texere } from './index.js';

describe('Texere', () => {
  let db: Texere;

  beforeEach(() => {
    db = new Texere(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  describe('constructor', () => {
    it('creates a working database instance', () => {
      expect(db).toBeDefined();
      expect(db).toBeInstanceOf(Texere);
    });
  });

  describe('node operations', () => {
    it('storeNode creates a node', () => {
      const node = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Test Task',
        content: 'Test content',
        tags: ['test'],
        importance: 0.8,
      });

      expect(node.id).toBeDefined();
      expect(node.type).toBe(NodeType.Action);
      expect(node.role).toBe(NodeRole.Task);
      expect(node.title).toBe('Test Task');
      expect(node.content).toBe('Test content');
      expect(node.importance).toBe(0.8);
    });

    it('getNode retrieves a stored node', () => {
      const created = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Test Solution',
        content: 'Solution content',
      });

      const retrieved = db.getNode(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Test Solution');
    });

    it('getNode returns null for non-existent node', () => {
      const result = db.getNode('non-existent-id');
      expect(result).toBeNull();
    });

    it('getNode with includeEdges option returns edges', () => {
      const node1 = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Problem',
        content: 'Problem content',
      });

      const node2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution',
        content: 'Solution content',
      });

      db.createEdge({
        source_id: node2.id,
        target_id: node1.id,
        type: EdgeType.Resolves,
      });

      const retrieved = db.getNode(node1.id, { includeEdges: true });
      expect(retrieved).toBeDefined();
      expect('edges' in retrieved!).toBe(true);
      expect((retrieved as any).edges).toHaveLength(1);
    });

    it('invalidateNode marks a node as invalidated', () => {
      const node = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task to invalidate',
        content: 'Content',
      });

      db.invalidateNode(node.id);

      const retrieved = db.getNode(node.id);
      expect(retrieved?.invalidated_at).not.toBeNull();
    });

    it('invalidateNode throws for non-existent node', () => {
      expect(() => db.invalidateNode('non-existent-id')).toThrow('Node not found');
    });
  });

  describe('edge operations', () => {
    it('createEdge creates an edge between nodes', () => {
      const source = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Problem',
        content: 'Problem content',
      });

      const target = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution',
        content: 'Solution content',
      });

      const edge = db.createEdge({
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.Resolves,
        strength: 0.9,
      });

      expect(edge.id).toBeDefined();
      expect(edge.source_id).toBe(source.id);
      expect(edge.target_id).toBe(target.id);
      expect(edge.type).toBe(EdgeType.Resolves);
      expect(edge.strength).toBe(0.9);
    });

    it('deleteEdge removes an edge', () => {
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
        content: 'Content 2',
      });

      const edge = db.createEdge({
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.Extends,
      });

      const deleted = db.deleteEdge(edge.id);
      expect(deleted).toBe(true);

      const edges = db.getEdgesForNode(source.id, 'outgoing');
      expect(edges).toHaveLength(0);
    });

    it('deleteEdge returns false for non-existent edge', () => {
      const deleted = db.deleteEdge('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('getEdgesForNode returns outgoing edges', () => {
      const source = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task',
        content: 'Content',
      });

      const target1 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content 2',
      });

      const target2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 3',
        content: 'Content 3',
      });

      db.createEdge({
        source_id: source.id,
        target_id: target1.id,
        type: EdgeType.Extends,
      });

      db.createEdge({
        source_id: source.id,
        target_id: target2.id,
        type: EdgeType.Extends,
      });

      const edges = db.getEdgesForNode(source.id, 'outgoing');
      expect(edges).toHaveLength(2);
    });

    it('getEdgesForNode returns incoming edges', () => {
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
        content: 'Content 2',
      });

      db.createEdge({
        source_id: source.id,
        target_id: target.id,
        type: EdgeType.Extends,
      });

      const edges = db.getEdgesForNode(target.id, 'incoming');
      expect(edges).toHaveLength(1);
      expect(edges[0].source_id).toBe(source.id);
    });

    it('getEdgesForNode returns both directions', () => {
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

      const node3 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 3',
        content: 'Content 3',
      });

      db.createEdge({
        source_id: node1.id,
        target_id: node2.id,
        type: EdgeType.Extends,
      });

      db.createEdge({
        source_id: node3.id,
        target_id: node1.id,
        type: EdgeType.Extends,
      });

      const edges = db.getEdgesForNode(node1.id, 'both');
      expect(edges).toHaveLength(2);
    });
  });

  describe('search operations', () => {
    it('search finds nodes by query', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Implement authentication',
        content: 'Add JWT authentication to API',
        tags: ['auth', 'security'],
      });

      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Add logging',
        content: 'Implement structured logging',
        tags: ['logging'],
      });

      const results = await db.search({ query: 'authentication', mode: 'keyword' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Implement authentication');
    });

    it('search filters by type and role', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task about auth',
        content: 'Auth task',
      });

      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution about auth',
        content: 'Auth solution',
      });

      const results = await db.search({
        query: 'auth',
        type: NodeType.Action,
        role: NodeRole.Solution,
      });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(NodeType.Action);
      expect(results[0].role).toBe(NodeRole.Solution);
    });

    it('search filters by tags', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 1',
        content: 'Content 1',
        tags: ['auth', 'security'],
      });

      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 2',
        content: 'Content 2',
        tags: ['auth'],
      });

      const results = await db.search({ query: 'Task', tags: ['auth', 'security'] });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Task 1');
    });

    it('search filters by minImportance', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Important task',
        content: 'Important content',
        importance: 0.9,
      });

      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Less important task',
        content: 'Less important content',
        importance: 0.3,
      });

      const results = await db.search({ query: 'task', minImportance: 0.7 });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Important task');
    });

    it('search respects limit option', async () => {
      for (let i = 0; i < 10; i++) {
        db.storeNode({
          type: NodeType.Action,
          role: NodeRole.Task,
          title: `Task ${i}`,
          content: 'Common content',
        });
      }

      const results = await db.search({ query: 'Task', limit: 5 });
      expect(results).toHaveLength(5);
    });
  });

  describe('traverse operations', () => {
    it('traverse walks outgoing edges', () => {
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

      const node3 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 3',
        content: 'Content 3',
      });

      db.createEdge({
        source_id: node1.id,
        target_id: node2.id,
        type: EdgeType.Extends,
      });

      db.createEdge({
        source_id: node2.id,
        target_id: node3.id,
        type: EdgeType.Extends,
      });

      const results = db.traverse({ startId: node1.id, direction: 'outgoing', maxDepth: 2 });
      expect(results).toHaveLength(2);
      expect(results[0].node.id).toBe(node2.id);
      expect(results[0].depth).toBe(1);
      expect(results[1].node.id).toBe(node3.id);
      expect(results[1].depth).toBe(2);
    });

    it('traverse walks incoming edges', () => {
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

      db.createEdge({
        source_id: node1.id,
        target_id: node2.id,
        type: EdgeType.Extends,
      });

      const results = db.traverse({ startId: node2.id, direction: 'incoming' });
      expect(results).toHaveLength(1);
      expect(results[0].node.id).toBe(node1.id);
    });

    it('traverse filters by edgeType', () => {
      const problem = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Problem',
        content: 'Problem content',
      });

      const solution = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution',
        content: 'Solution content',
      });

      const related = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Related',
        content: 'Related content',
      });

      db.createEdge({
        source_id: solution.id,
        target_id: problem.id,
        type: EdgeType.Resolves,
      });

      db.createEdge({
        source_id: solution.id,
        target_id: related.id,
        type: EdgeType.Extends,
      });

      const results = db.traverse({ startId: solution.id, edgeType: EdgeType.Resolves });
      expect(results).toHaveLength(1);
      expect(results[0].node.id).toBe(problem.id);
    });
  });

  describe('about operations', () => {
    it('about combines search and traverse', async () => {
      const problem = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Authentication problem',
        content: 'Users cannot log in',
        tags: ['auth'],
      });

      const solution = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Authentication solution',
        content: 'Fix JWT validation',
        tags: ['auth'],
      });

      db.createEdge({
        source_id: solution.id,
        target_id: problem.id,
        type: EdgeType.Resolves,
      });

      const results = await db.about({ query: 'authentication', direction: 'outgoing' });
      expect(results.length).toBeGreaterThan(0);
      const nodeIds = results.map((r) => r.node.id);
      expect(nodeIds).toContain(problem.id);
      expect(nodeIds).toContain(solution.id);
    });

    it('about respects search filters', async () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task about auth',
        content: 'Auth task',
        tags: ['auth'],
      });

      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution about auth',
        content: 'Auth solution',
        tags: ['auth'],
      });

      const results = await db.about({
        query: 'auth',
        type: NodeType.Action,
        role: NodeRole.Solution,
      });
      expect(results).toHaveLength(1);
      expect(results[0].node.type).toBe(NodeType.Action);
      expect(results[0].node.role).toBe(NodeRole.Solution);
    });
  });

  describe('stats operations', () => {
    it('stats returns database statistics', () => {
      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task 1',
        content: 'Content 1',
      });

      db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution 1',
        content: 'Content 1',
      });

      const node1 = db.storeNode({
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Problem 1',
        content: 'Content 1',
      });

      const node2 = db.storeNode({
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution 2',
        content: 'Content 2',
      });

      db.createEdge({
        source_id: node2.id,
        target_id: node1.id,
        type: EdgeType.Resolves,
      });

      db.invalidateNode(node1.id);

      const result = db.stats();
      expect(result.nodes.total).toBe(4);
      expect(result.nodes.byType[NodeType.Action]).toBe(3);
      expect(result.nodes.byType[NodeType.Issue]).toBe(1);
      expect(result.nodes.invalidated).toBe(1);
      expect(result.edges.total).toBe(1);
      expect(result.edges.byType[EdgeType.Resolves]).toBe(1);
    });
  });

  describe('close operations', () => {
    it('close closes the database without error', () => {
      const testDb = new Texere(':memory:');
      expect(() => testDb.close()).not.toThrow();
    });
  });
});
