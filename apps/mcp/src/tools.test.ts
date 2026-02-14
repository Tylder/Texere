import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType, Texere } from '@texere/graph';

import { createTexereMcpServer } from './server.js';
import { TOOL_DEFINITIONS } from './tools/index.js';

const TOOL_NAMES = [
  'texere_store_node',
  'texere_store_nodes',
  'texere_get_node',
  'texere_invalidate_node',
  'texere_replace_node',
  'texere_create_edge',
  'texere_create_edges',
  'texere_delete_edge',
  'texere_search',
  'texere_search_batch',
  'texere_traverse',
  'texere_about',
  'texere_stats',
  'texere_validate',
] as const;

describe('Texere MCP tools', () => {
  let db: Texere;
  let mcp: ReturnType<typeof createTexereMcpServer>;

  beforeEach(() => {
    db = new Texere(':memory:');
    mcp = createTexereMcpServer(db);
  });

  afterEach(() => {
    db.close();
  });

  it('registers exactly 14 tools', () => {
    expect(mcp.toolNames).toEqual(TOOL_NAMES);
    expect(mcp.toolNames).toHaveLength(14);
  });

  it('exposes zod input schema for each tool', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(14);

    for (const definition of TOOL_DEFINITIONS) {
      expect(typeof definition.inputSchema.safeParse).toBe('function');
    }
  });

  it('texere_store_node accepts valid input and returns a node', async () => {
    const result = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'MCP node',
      content: 'Created from tool',
      tags: ['mcp'],
      anchor_to: ['src/server.ts'],
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      node: {
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'MCP node',
      },
    });
  });

  it('texere_store_node rejects invalid input with structured error', async () => {
    const result = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      content: 'Missing title',
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('texere_store_node -> texere_get_node round-trip works', async () => {
    const stored = await mcp.callTool('texere_store_node', {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Round trip',
      content: 'Store then get',
    });

    const nodeId = (stored.structuredContent as any).node.id as string;

    const fetched = await mcp.callTool('texere_get_node', {
      id: nodeId,
      include_edges: true,
    });

    expect(fetched.isError).toBeUndefined();
    expect(fetched.structuredContent).toMatchObject({
      node: {
        id: nodeId,
        title: 'Round trip',
      },
    });
  });

  it('texere_get_node returns null node for unknown id', async () => {
    const result = await mcp.callTool('texere_get_node', { id: 'missing-id' });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ node: null });
  });

  it('texere_invalidate_node sets invalidated_at timestamp', async () => {
    const stored = await mcp.callTool('texere_store_node', {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Wrong assumption',
      content: 'Needs invalidation',
    });
    const nodeId = (stored.structuredContent as any).node.id as string;

    const invalidated = await mcp.callTool('texere_invalidate_node', { id: nodeId });
    expect(invalidated.isError).toBeUndefined();

    const fetched = await mcp.callTool('texere_get_node', { id: nodeId });
    expect((fetched.structuredContent as any).node.invalidated_at).not.toBeNull();
  });

  it('texere_create_edge returns edge and REPLACES invalidates source node', async () => {
    const oldNode = await mcp.callTool('texere_store_node', {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Old decision',
      content: 'Deprecated decision',
    });
    const newNode = await mcp.callTool('texere_store_node', {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'New decision',
      content: 'Replacement decision',
    });

    const sourceId = (oldNode.structuredContent as any).node.id as string;
    const targetId = (newNode.structuredContent as any).node.id as string;

    const edgeResult = await mcp.callTool('texere_create_edge', {
      source_id: sourceId,
      target_id: targetId,
      type: EdgeType.Replaces,
    });

    expect(edgeResult.isError).toBeUndefined();
    expect(edgeResult.structuredContent).toMatchObject({
      edge: {
        source_id: sourceId,
        target_id: targetId,
        type: EdgeType.Replaces,
      },
    });

    const sourceNode = await mcp.callTool('texere_get_node', { id: sourceId });
    expect((sourceNode.structuredContent as any).node.invalidated_at).not.toBeNull();
  });

  it('texere_delete_edge removes edge', async () => {
    const source = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'Source',
      content: 'Source content',
    });
    const target = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'Target',
      content: 'Target content',
    });

    const edge = await mcp.callTool('texere_create_edge', {
      source_id: (source.structuredContent as any).node.id,
      target_id: (target.structuredContent as any).node.id,
      type: EdgeType.Extends,
    });

    const deleted = await mcp.callTool('texere_delete_edge', {
      id: (edge.structuredContent as any).edge.id,
    });
    expect(deleted.isError).toBeUndefined();
    expect(deleted.structuredContent).toMatchObject({ deleted: true });
  });

  it('texere_search returns results after storing nodes', async () => {
    await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Use immediate transactions',
      content: 'Fixes write contention',
      tags: ['sqlite', 'concurrency'],
      importance: 0.9,
    });

    const result = await mcp.callTool('texere_search', {
      query: 'immediate transactions',
      type: NodeType.Action,
      tags: ['sqlite'],
      min_importance: 0.5,
      limit: 5,
    });

    expect(result.isError).toBeUndefined();
    expect((result.structuredContent as any).results.length).toBeGreaterThan(0);
  });

  it('texere_traverse returns neighbors', async () => {
    const start = await mcp.callTool('texere_store_node', {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Traversal start',
      content: 'Root node',
    });
    const neighbor = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traversal neighbor',
      content: 'Neighbor node',
    });

    const startId = (start.structuredContent as any).node.id as string;
    const neighborId = (neighbor.structuredContent as any).node.id as string;

    await mcp.callTool('texere_create_edge', {
      source_id: startId,
      target_id: neighborId,
      type: EdgeType.Resolves,
    });

    const traversed = await mcp.callTool('texere_traverse', {
      start_id: startId,
      direction: 'outgoing',
      max_depth: 2,
    });

    expect(traversed.isError).toBeUndefined();
    const nodes = (traversed.structuredContent as any).results.map((row: any) => row.node.id);
    expect(nodes).toContain(neighborId);
  });

  it('texere_about returns search plus traversal context', async () => {
    const problem = await mcp.callTool('texere_store_node', {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Auth timeout problem',
      content: 'User login times out',
    });
    const fix = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Fix,
      title: 'Increase DB timeout',
      content: 'Use longer busy timeout',
    });

    await mcp.callTool('texere_create_edge', {
      source_id: (fix.structuredContent as any).node.id,
      target_id: (problem.structuredContent as any).node.id,
      type: EdgeType.Resolves,
    });

    const result = await mcp.callTool('texere_about', {
      query: 'timeout',
      direction: 'both',
      max_depth: 2,
      limit: 10,
    });

    expect(result.isError).toBeUndefined();
    expect((result.structuredContent as any).results.length).toBeGreaterThan(0);
  });

  it('texere_stats returns counts', async () => {
    await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'Task one',
      content: 'Task content',
    });

    const result = await mcp.callTool('texere_stats', {});
    expect(result.isError).toBeUndefined();
    expect((result.structuredContent as any).stats.nodes.total).toBeGreaterThanOrEqual(1);
  });

  it('accepts v1.2 roles (web_url, concept, pitfall)', async () => {
    const results = await Promise.all([
      mcp.callTool('texere_store_node', {
        type: NodeType.Source,
        role: NodeRole.WebUrl,
        title: 'External API docs',
        content: 'https://example.com/api',
      }),
      mcp.callTool('texere_store_node', {
        type: NodeType.Artifact,
        role: NodeRole.Concept,
        title: 'Event sourcing',
        content: 'Pattern for storing state changes',
      }),
      mcp.callTool('texere_store_node', {
        type: NodeType.Knowledge,
        role: NodeRole.Pitfall,
        title: 'Avoid N+1 queries',
        content: 'Use eager loading instead',
      }),
    ]);

    for (const r of results) {
      expect(r.isError).toBeUndefined();
    }
    expect((results[0].structuredContent as any).node.role).toBe(NodeRole.WebUrl);
    expect((results[1].structuredContent as any).node.role).toBe(NodeRole.Concept);
    expect((results[2].structuredContent as any).node.role).toBe(NodeRole.Pitfall);
  });

  it('accepts v1.2 edge types (BASED_ON, RELATED_TO, ABOUT, IS_A)', async () => {
    const nodes = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        mcp.callTool('texere_store_node', {
          type: NodeType.Action,
          role: NodeRole.Task,
          title: `Edge test node ${i}`,
          content: `Content ${i}`,
        }),
      ),
    );

    const ids = nodes.map((n) => (n.structuredContent as any).node.id as string);
    const edgeTypes = [EdgeType.BasedOn, EdgeType.RelatedTo, EdgeType.About, EdgeType.IsA];

    for (let i = 0; i < edgeTypes.length; i++) {
      const result = await mcp.callTool('texere_create_edge', {
        source_id: ids[i],
        target_id: ids[i + 1],
        type: edgeTypes[i],
      });
      expect(result.isError).toBeUndefined();
      expect((result.structuredContent as any).edge.type).toBe(edgeTypes[i]);
    }
  });

  it('texere_store_nodes batch creates multiple nodes', async () => {
    const result = await mcp.callTool('texere_store_nodes', {
      nodes: [
        { type: NodeType.Action, role: NodeRole.Task, title: 'Batch A', content: 'A' },
        { type: NodeType.Action, role: NodeRole.Task, title: 'Batch B', content: 'B' },
      ],
    });

    expect(result.isError).toBeUndefined();
    const nodes = (result.structuredContent as any).nodes;
    expect(nodes).toHaveLength(2);
    expect(nodes[0].title).toBe('Batch A');
    expect(nodes[1].title).toBe('Batch B');
  });

  it('texere_search_batch returns results indexed by query position', async () => {
    await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Redis caching layer',
      content: 'In-memory cache for hot data',
      tags: ['cache'],
    });
    await mcp.callTool('texere_store_node', {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite for persistence',
      content: 'Embedded database for local storage',
      tags: ['db'],
    });

    const result = await mcp.callTool('texere_search_batch', {
      queries: [{ query: 'Redis' }, { query: 'SQLite' }],
    });

    expect(result.isError).toBeUndefined();
    const results = (result.structuredContent as any).results;
    expect(results).toHaveLength(2);
    expect(results[0].length).toBeGreaterThan(0);
    expect(results[1].length).toBeGreaterThan(0);
    expect(results[0][0].title).toContain('Redis');
    expect(results[1][0].title).toContain('SQLite');
  });

  it('texere_create_edges batch creates multiple edges', async () => {
    const nodeA = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'A',
      content: 'A',
    });
    const nodeB = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'B',
      content: 'B',
    });
    const nodeC = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'C',
      content: 'C',
    });

    const idA = (nodeA.structuredContent as any).node.id as string;
    const idB = (nodeB.structuredContent as any).node.id as string;
    const idC = (nodeC.structuredContent as any).node.id as string;

    const result = await mcp.callTool('texere_create_edges', {
      edges: [
        { source_id: idA, target_id: idB, type: EdgeType.DependsOn },
        { source_id: idB, target_id: idC, type: EdgeType.DependsOn },
      ],
    });

    expect(result.isError).toBeUndefined();
    const edges = (result.structuredContent as any).edges;
    expect(edges).toHaveLength(2);
  });

  it('texere_validate returns valid for a correct batch', async () => {
    const nodeA = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'Validate edge source',
      content: 'Content A',
    });
    const nodeB = await mcp.callTool('texere_store_node', {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Validate edge target',
      content: 'Content B',
    });
    const idA = (nodeA.structuredContent as any).node.id as string;
    const idB = (nodeB.structuredContent as any).node.id as string;

    const result = await mcp.callTool('texere_validate', {
      nodes: [
        {
          type: NodeType.Knowledge,
          role: NodeRole.Decision,
          title: 'Completely unique validate node xyz123',
          content: 'Some decision content',
        },
      ],
      edges: [
        {
          source_id: idA,
          target_id: idB,
          type: EdgeType.Resolves,
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    const output = result.structuredContent as any;
    expect(output.valid).toBe(true);
    expect(output.issues.filter((i: any) => i.severity === 'error')).toHaveLength(0);
  });

  it('texere_validate reports invalid type-role combo with correct index', async () => {
    const result = await mcp.callTool('texere_validate', {
      nodes: [
        {
          type: NodeType.Knowledge,
          role: NodeRole.Decision,
          title: 'Valid node',
          content: 'OK',
        },
        {
          type: NodeType.Knowledge,
          role: NodeRole.Task,
          title: 'Invalid combo',
          content: 'Knowledge cannot have Task role',
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    const output = result.structuredContent as any;
    expect(output.valid).toBe(false);

    const typeRoleError = output.issues.find(
      (i: any) => i.severity === 'error' && i.message.includes('type-role'),
    );
    expect(typeRoleError).toBeDefined();
    expect(typeRoleError.index).toBe(1);
    expect(typeRoleError.item).toBe('node');
  });

  it('texere_validate reports missing edge endpoint', async () => {
    const result = await mcp.callTool('texere_validate', {
      edges: [
        {
          source_id: 'nonexistent-source',
          target_id: 'nonexistent-target',
          type: EdgeType.DependsOn,
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    const output = result.structuredContent as any;
    expect(output.valid).toBe(false);

    const endpointErrors = output.issues.filter(
      (i: any) => i.severity === 'error' && i.message.includes('not found'),
    );
    expect(endpointErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('texere_validate reports self-referential edge', async () => {
    const stored = await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Task,
      title: 'Self ref node',
      content: 'Content',
    });
    const nodeId = (stored.structuredContent as any).node.id as string;

    const result = await mcp.callTool('texere_validate', {
      edges: [
        {
          source_id: nodeId,
          target_id: nodeId,
          type: EdgeType.DependsOn,
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    const output = result.structuredContent as any;
    expect(output.valid).toBe(false);

    const selfRefError = output.issues.find(
      (i: any) => i.severity === 'error' && i.message.includes('Self-referential'),
    );
    expect(selfRefError).toBeDefined();
    expect(selfRefError.index).toBe(0);
    expect(selfRefError.item).toBe('edge');
  });

  it('texere_validate warns on duplicate title', async () => {
    await mcp.callTool('texere_store_node', {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Redis caching strategy',
      content: 'Use Redis for session caching',
    });

    const result = await mcp.callTool('texere_validate', {
      nodes: [
        {
          type: NodeType.Knowledge,
          role: NodeRole.Finding,
          title: 'Redis caching strategy',
          content: 'Different content about Redis caching',
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    const output = result.structuredContent as any;
    expect(output.valid).toBe(true);

    const warning = output.issues.find((i: any) => i.severity === 'warning');
    expect(warning).toBeDefined();
    expect(warning.item).toBe('node');
    expect(warning.message).toContain('Similar node exists');
  });

  it('texere_validate has zero side effects on the database', async () => {
    const statsBefore = await mcp.callTool('texere_stats', {});
    const countBefore = (statsBefore.structuredContent as any).stats.nodes.total as number;

    await mcp.callTool('texere_validate', {
      nodes: [
        {
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'Should not be stored',
          content: 'This must not appear in the database',
        },
        {
          type: NodeType.Knowledge,
          role: NodeRole.Finding,
          title: 'Another ghost node',
          content: 'Also must not be stored',
        },
      ],
      edges: [
        {
          source_id: 'fake-source',
          target_id: 'fake-target',
          type: EdgeType.RelatedTo,
        },
      ],
    });

    const statsAfter = await mcp.callTool('texere_stats', {});
    const countAfter = (statsAfter.structuredContent as any).stats.nodes.total as number;

    expect(countAfter).toBe(countBefore);
  });

  it('texere_validate accepts temp_id cross-references in edges', async () => {
    const result = await mcp.callTool('texere_validate', {
      nodes: [
        {
          temp_id: 'tmp-problem',
          type: NodeType.Issue,
          role: NodeRole.Problem,
          title: 'Proposed problem',
          content: 'A problem to solve',
        },
        {
          temp_id: 'tmp-solution',
          type: NodeType.Action,
          role: NodeRole.Solution,
          title: 'Proposed solution',
          content: 'A solution to the problem',
        },
      ],
      edges: [
        {
          source_id: 'tmp-solution',
          target_id: 'tmp-problem',
          type: EdgeType.Resolves,
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    const output = result.structuredContent as any;

    const endpointErrors = output.issues.filter(
      (i: any) => i.severity === 'error' && i.message.includes('not found'),
    );
    expect(endpointErrors).toHaveLength(0);
  });
});
