import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType, Texere } from '@texere/graph';

import { createTexereMcpServer } from './server.js';
import { TOOL_DEFINITIONS } from './tools/index.js';

const TOOL_NAMES = [
  'texere_store_knowledge',
  'texere_store_issue',
  'texere_store_action',
  'texere_store_artifact',
  'texere_store_source',
  'texere_get_node',
  'texere_get_nodes',
  'texere_invalidate_node',
  'texere_invalidate_nodes',
  'texere_replace_node',
  'texere_create_edge',
  'texere_delete_edge',
  'texere_delete_edges',
  'texere_search',
  'texere_traverse',
  'texere_search_graph',
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

  it('registers exactly 18 tools', () => {
    expect(mcp.toolNames).toEqual(TOOL_NAMES);
    expect(mcp.toolNames).toHaveLength(18);
  });

  it('exposes zod input schema for each tool', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(18);

    for (const definition of TOOL_DEFINITIONS) {
      expect(typeof definition.inputSchema.safeParse).toBe('function');
    }
  });

  it('texere_store_action accepts valid input and returns a node', async () => {
    const result = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'MCP node',
          content: 'Created from tool',
          tags: ['mcp'],
          anchor_to: ['src/server.ts'],
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      nodes: [
        {
          type: NodeType.Action,
          role: NodeRole.Task,
          title: 'MCP node',
        },
      ],
    });
  });

  it('texere_store_action rejects invalid input with structured error', async () => {
    const result = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          content: 'Missing title',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('texere_store_knowledge -> texere_get_node round-trip works', async () => {
    const stored = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'decision',
          title: 'Round trip',
          content: 'Store then get',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const nodeId = (stored.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

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

  it('texere_get_nodes returns aligned results for multiple ids', async () => {
    const first = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'First node',
          content: 'First content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const second = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Second node',
          content: 'Second content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const firstId = (first.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const secondId = (second.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    const fetched = await mcp.callTool('texere_get_nodes', {
      ids: [firstId, 'missing-id', secondId, firstId],
    });

    expect(fetched.isError).toBeUndefined();
    expect(fetched.structuredContent).toMatchObject({
      nodes: [
        { id: firstId, title: 'First node' },
        null,
        { id: secondId, title: 'Second node' },
        { id: firstId, title: 'First node' },
      ],
    });
  });

  it('texere_get_nodes forwards include_edges to the graph API', async () => {
    const source = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Source node',
          content: 'Source content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const target = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Target node',
          content: 'Target content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const sourceId = (source.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const targetId = (target.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: sourceId, target_id: targetId, type: EdgeType.BasedOn }],
      minimal: false,
    });

    const fetched = await mcp.callTool('texere_get_nodes', {
      ids: [sourceId, targetId],
      include_edges: true,
    });

    expect(fetched.isError).toBeUndefined();
    const nodes = (
      fetched.structuredContent as { nodes: Array<{ edges: Array<{ type: string }> }> }
    ).nodes;
    expect(nodes[0].edges).toHaveLength(1);
    expect(nodes[1].edges).toHaveLength(1);
    expect(nodes[0].edges[0].type).toBe(EdgeType.BasedOn);
  });

  it('texere_get_nodes accepts 200 ids', async () => {
    const ids: string[] = [];

    for (let i = 0; i < 200; i++) {
      const stored = await mcp.callTool('texere_store_action', {
        nodes: [
          {
            role: 'task',
            title: `Bulk node ${i}`,
            content: `Bulk content ${i}`,
            importance: 0.5,
            confidence: 0.8,
          },
        ],
        minimal: false,
      });

      ids.push((stored.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id);
    }

    const fetched = await mcp.callTool('texere_get_nodes', { ids });

    expect(fetched.isError).toBeUndefined();
    expect((fetched.structuredContent as { nodes: unknown[] }).nodes).toHaveLength(200);
  });

  it('texere_get_nodes rejects more than 200 ids', async () => {
    const result = await mcp.callTool('texere_get_nodes', {
      ids: Array.from({ length: 201 }, (_, i) => `node-${i}`),
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('texere_invalidate_node sets invalidated_at timestamp', async () => {
    const stored = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Wrong assumption',
          content: 'Needs invalidation',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const nodeId = (stored.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    const invalidated = await mcp.callTool('texere_invalidate_node', { id: nodeId });
    expect(invalidated.isError).toBeUndefined();

    const fetched = await mcp.callTool('texere_get_node', { id: nodeId });
    expect(
      (fetched.structuredContent as { node: { invalidated_at: string | null } }).node
        .invalidated_at,
    ).not.toBeNull();
  });

  it('texere_invalidate_nodes invalidates multiple nodes in input order', async () => {
    const first = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'First invalidation target',
          content: 'Needs invalidation',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const second = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Second invalidation target',
          content: 'Also needs invalidation',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const firstId = (first.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const secondId = (second.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    const invalidated = await mcp.callTool('texere_invalidate_nodes', {
      ids: [firstId, secondId, firstId],
    });
    expect(invalidated.isError).toBeUndefined();

    expect(invalidated.structuredContent).toMatchObject({
      nodes: [{ id: firstId }, { id: secondId }, { id: firstId }],
    });

    const nodes = (
      invalidated.structuredContent as {
        nodes: Array<{ invalidated_at: number | null } | null>;
      }
    ).nodes;
    expect(nodes[0]?.invalidated_at).not.toBeNull();
    expect(nodes[1]?.invalidated_at).not.toBeNull();
    expect(nodes[2]?.invalidated_at).not.toBeNull();
  });

  it('texere_invalidate_nodes rolls back and returns TOOL_ERROR when any id is missing', async () => {
    const first = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Rollback target',
          content: 'Should remain active on batch failure',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const firstId = (first.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const invalidated = await mcp.callTool('texere_invalidate_nodes', {
      ids: [firstId, 'missing-id'],
    });

    expect(invalidated.isError).toBe(true);
    expect(invalidated.structuredContent).toMatchObject({
      error: {
        code: 'TOOL_ERROR',
        message: 'Node not found: missing-id',
      },
    });

    const fetched = await mcp.callTool('texere_get_node', { id: firstId });
    expect(
      (fetched.structuredContent as { node: { invalidated_at: number | null } }).node
        .invalidated_at,
    ).toBeNull();
  });

  it('texere_invalidate_nodes rejects empty ids', async () => {
    const result = await mcp.callTool('texere_invalidate_nodes', { ids: [] });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('texere_invalidate_nodes rejects more than 250 ids', async () => {
    const result = await mcp.callTool('texere_invalidate_nodes', {
      ids: Array.from({ length: 251 }, (_, i) => `node-${i}`),
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('texere_create_edge returns edge and REPLACES invalidates source node', async () => {
    const oldNode = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'decision',
          title: 'Old decision',
          content: 'Deprecated decision',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const newNode = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'decision',
          title: 'New decision',
          content: 'Replacement decision',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const sourceId = (oldNode.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const targetId = (newNode.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    const edgeResult = await mcp.callTool('texere_create_edge', {
      edges: [
        {
          source_id: sourceId,
          target_id: targetId,
          type: EdgeType.Replaces,
        },
      ],
      minimal: false,
    });

    expect(edgeResult.isError).toBeUndefined();
    expect(edgeResult.structuredContent).toMatchObject({
      edges: [
        {
          source_id: sourceId,
          target_id: targetId,
          type: EdgeType.Replaces,
        },
      ],
    });

    const sourceNode = await mcp.callTool('texere_get_node', { id: sourceId });
    expect(
      (sourceNode.structuredContent as { node: { invalidated_at: string | null } }).node
        .invalidated_at,
    ).not.toBeNull();
  });

  it('texere_delete_edge removes edge', async () => {
    const source = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Source',
          content: 'Source content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const target = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Target',
          content: 'Target content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const edge = await mcp.callTool('texere_create_edge', {
      edges: [
        {
          source_id: (source.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id,
          target_id: (target.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id,
          type: EdgeType.DependsOn,
        },
      ],
      minimal: false,
    });

    const deleted = await mcp.callTool('texere_delete_edge', {
      id: (edge.structuredContent as { edges: Array<{ id: string }> }).edges[0].id,
    });
    expect(deleted.isError).toBeUndefined();
    expect(deleted.structuredContent).toMatchObject({ deleted: true });
  });

  it('texere_delete_edges returns per-id deletion results', async () => {
    const source = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Batch delete source',
          content: 'Source content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const target = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Batch delete target',
          content: 'Target content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const sourceId = (source.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const targetId = (target.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    const edge = await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: sourceId, target_id: targetId, type: EdgeType.DependsOn }],
      minimal: false,
    });

    const edgeId = (edge.structuredContent as { edges: Array<{ id: string }> }).edges[0].id;
    const deleted = await mcp.callTool('texere_delete_edges', {
      ids: [edgeId, 'missing-edge', edgeId],
    });

    expect(deleted.isError).toBeUndefined();
    expect(deleted.structuredContent).toMatchObject({ deleted: [true, false, false] });
  });

  it('texere_delete_edges rejects empty ids', async () => {
    const result = await mcp.callTool('texere_delete_edges', { ids: [] });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('texere_delete_edges rejects more than 250 ids', async () => {
    const result = await mcp.callTool('texere_delete_edges', {
      ids: Array.from({ length: 251 }, (_, i) => `edge-${i}`),
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: {
        code: 'INVALID_INPUT',
      },
    });
  });

  it('texere_search returns results after storing nodes', async () => {
    await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Use immediate transactions',
          content: 'Fixes write contention',
          tags: ['sqlite', 'concurrency'],
          importance: 0.9,
          confidence: 0.8,
        },
      ],
    });

    const result = await mcp.callTool('texere_search', {
      query: 'immediate transactions',
      type: NodeType.Action,
      tags: ['sqlite'],
      min_importance: 0.5,
      limit: 5,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      page: { has_more: false, next_cursor: null, limit: 5 },
    });
    expect((result.structuredContent as { results: unknown[] }).results).toHaveLength(1);
  });

  it('texere_search paginates with cursor metadata', async () => {
    for (let i = 0; i < 3; i += 1) {
      await mcp.callTool('texere_store_action', {
        nodes: [
          {
            role: 'solution',
            title: `Paged search ${i}`,
            content: 'cursor pagination test',
            importance: 0.9,
            confidence: 0.8,
          },
        ],
      });
    }

    const firstPage = await mcp.callTool('texere_search', { query: 'Paged search', limit: 2 });
    expect(firstPage.isError).toBeUndefined();

    const firstStructured = firstPage.structuredContent as {
      results: Array<{ id: string }>;
      page: { has_more: boolean; next_cursor: string | null };
    };
    expect(firstStructured.results).toHaveLength(2);
    expect(firstStructured.page.has_more).toBe(true);
    expect(firstStructured.page.next_cursor).not.toBeNull();

    const secondPage = await mcp.callTool('texere_search', {
      query: 'Paged search',
      limit: 2,
      cursor: firstStructured.page.next_cursor,
    });
    const secondStructured = secondPage.structuredContent as {
      results: Array<{ id: string }>;
      page: { has_more: boolean };
    };

    const ids = new Set(
      [...firstStructured.results, ...secondStructured.results].map((row) => row.id),
    );
    expect(ids.size).toBe(3);
    expect(secondStructured.page.has_more).toBe(false);
  });

  it('texere_search maps invalid cursors to INVALID_INPUT', async () => {
    const result = await mcp.callTool('texere_search', {
      query: 'anything',
      cursor: 'not-a-cursor',
    });

    expect(result.isError).toBe(true);
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe(
      'INVALID_INPUT',
    );
  });

  it('texere_traverse returns neighbors', async () => {
    const start = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Traversal start',
          content: 'Root node',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const neighbor = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Traversal neighbor',
          content: 'Neighbor node',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const startId = (start.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const neighborId = (neighbor.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    await mcp.callTool('texere_create_edge', {
      edges: [
        {
          source_id: startId,
          target_id: neighborId,
          type: EdgeType.Resolves,
        },
      ],
    });

    const traversed = await mcp.callTool('texere_traverse', {
      start_id: startId,
      direction: 'outgoing',
      max_depth: 2,
    });

    expect(traversed.isError).toBeUndefined();
    expect(traversed.structuredContent).toMatchObject({
      page: { has_more: false, next_cursor: null, limit: 100 },
    });
    const results = (traversed.structuredContent as { results: Array<{ node: { id: string } }> })
      .results;
    expect(results).toHaveLength(1);
    expect(results[0].node.id).toBe(neighborId);
  });

  it('texere_traverse excludes invalidated nodes from results', async () => {
    const start = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Traversal invalidation start',
          content: 'Start node',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const active = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Traversal active node',
          content: 'Visible neighbor',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const invalidated = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Traversal invalidated node',
          content: 'Should be hidden after invalidation',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const startId = (start.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const activeId = (active.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const invalidatedId = (invalidated.structuredContent as { nodes: Array<{ id: string }> })
      .nodes[0].id;

    await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: startId, target_id: activeId, type: EdgeType.Resolves }],
    });
    await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: activeId, target_id: invalidatedId, type: EdgeType.BasedOn }],
    });
    await mcp.callTool('texere_invalidate_node', { id: invalidatedId });

    const traversed = await mcp.callTool('texere_traverse', {
      start_id: startId,
      direction: 'outgoing',
      max_depth: 3,
    });

    expect(traversed.isError).toBeUndefined();
    const results = (traversed.structuredContent as { results: Array<{ node: { id: string } }> })
      .results;
    const ids = new Set(results.map((row) => row.node.id));

    expect(ids.has(activeId)).toBe(true);
    expect(ids.has(invalidatedId)).toBe(false);
  });

  it('texere_traverse paginates and rejects scope-mismatched cursors', async () => {
    const start = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Traverse paged start',
          content: 'root',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const mid = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Traverse paged mid',
          content: 'mid',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const end = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Traverse paged end',
          content: 'end',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const startId = (start.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const midId = (mid.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const endId = (end.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: startId, target_id: midId, type: EdgeType.Resolves }],
    });
    await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: midId, target_id: endId, type: EdgeType.BasedOn }],
    });

    const firstPage = await mcp.callTool('texere_traverse', {
      start_id: startId,
      direction: 'outgoing',
      limit: 1,
    });
    const firstStructured = firstPage.structuredContent as {
      results: Array<{ node: { id: string } }>;
      page: { has_more: boolean; next_cursor: string | null };
    };
    expect(firstStructured.page.has_more).toBe(true);

    const secondPage = await mcp.callTool('texere_traverse', {
      start_id: startId,
      direction: 'outgoing',
      limit: 1,
      cursor: firstStructured.page.next_cursor,
    });
    const secondStructured = secondPage.structuredContent as {
      results: Array<{ node: { id: string } }>;
    };
    const ids = new Set(
      [...firstStructured.results, ...secondStructured.results].map((row) => row.node.id),
    );
    expect(ids.size).toBe(2);

    const invalid = await mcp.callTool('texere_traverse', {
      start_id: startId,
      direction: 'incoming',
      limit: 1,
      cursor: firstStructured.page.next_cursor,
    });
    expect(invalid.isError).toBe(true);
    expect((invalid.structuredContent as { error: { code: string } }).error.code).toBe(
      'INVALID_INPUT',
    );
  });

  it('texere_search_graph returns search plus traversal context', async () => {
    const problem = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Auth timeout problem',
          content: 'User login times out',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const solution = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Increase DB timeout',
          content: 'Use longer busy timeout',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const problemId = (problem.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const solutionId = (solution.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    await mcp.callTool('texere_create_edge', {
      edges: [
        {
          source_id: solutionId,
          target_id: problemId,
          type: EdgeType.Resolves,
        },
      ],
    });

    const result = await mcp.callTool('texere_search_graph', {
      query: 'timeout',
      direction: 'both',
      max_depth: 2,
      limit: 10,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      page: { has_more: false, limit: 10 },
    });
    const results = (result.structuredContent as { results: Array<{ node: { id: string } }> })
      .results;
    const resultIds = results.map((r) => r.node.id);
    expect(resultIds).toContain(problemId);
    expect(resultIds).toContain(solutionId);
  });

  it('texere_search_graph supports empty query with tag filters', async () => {
    const problem = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Tagged timeout issue',
          content: 'Timeout on login route',
          tags: ['auth', 'timeout'],
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const result = await mcp.callTool('texere_search_graph', {
      query: '',
      tags: ['auth'],
      limit: 10,
    });

    expect(result.isError).toBeUndefined();
    const structured = result.structuredContent as {
      results: Array<{ node: { id: string } }>;
      page: { returned: number; has_more: boolean; limit: number };
    };
    const storedId = (problem.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    expect(structured.page.limit).toBe(10);
    expect(structured.page.returned).toBeGreaterThan(0);
    expect(structured.page.has_more).toBe(false);
    expect(structured.results.map((row) => row.node.id)).toContain(storedId);
  });

  it('texere_search_graph paginates and rejects scope-mismatched cursors', async () => {
    const seedA = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Search graph paged seed A',
          content: 'timeout about seed',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const seedB = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Search graph paged seed B',
          content: 'timeout about seed',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const shared = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Search graph paged shared',
          content: 'shared timeout remedy',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    const seedAId = (seedA.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const seedBId = (seedB.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const sharedId = (shared.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: seedAId, target_id: sharedId, type: EdgeType.Resolves }],
    });
    await mcp.callTool('texere_create_edge', {
      edges: [{ source_id: seedBId, target_id: sharedId, type: EdgeType.Resolves }],
    });

    const firstPage = await mcp.callTool('texere_search_graph', {
      query: 'timeout about seed',
      direction: 'both',
      max_depth: 2,
      limit: 1,
    });
    const firstStructured = firstPage.structuredContent as {
      results: Array<{ node: { id: string } }>;
      page: { has_more: boolean; next_cursor: string | null };
    };
    expect(firstStructured.page.has_more).toBe(true);

    const secondPage = await mcp.callTool('texere_search_graph', {
      query: 'timeout about seed',
      direction: 'both',
      max_depth: 2,
      limit: 1,
      cursor: firstStructured.page.next_cursor,
    });
    const secondStructured = secondPage.structuredContent as {
      results: Array<{ node: { id: string } }>;
    };
    const ids = new Set(
      [...firstStructured.results, ...secondStructured.results].map((row) => row.node.id),
    );
    expect(ids.size).toBeGreaterThanOrEqual(2);

    const invalid = await mcp.callTool('texere_search_graph', {
      query: 'timeout about seed',
      direction: 'incoming',
      max_depth: 2,
      limit: 1,
      cursor: firstStructured.page.next_cursor,
    });
    expect(invalid.isError).toBe(true);
    expect((invalid.structuredContent as { error: { code: string } }).error.code).toBe(
      'INVALID_INPUT',
    );
  });

  it('texere_stats returns counts', async () => {
    await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Task one',
          content: 'Task content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
    });

    const result = await mcp.callTool('texere_stats', {});
    expect(result.isError).toBeUndefined();
    expect(
      (result.structuredContent as { stats: { nodes: { total: number } } }).stats.nodes.total,
    ).toBe(1);
  });

  it('accepts v1.2 roles (web_url, concept, pitfall) via per-type tools', async () => {
    const results = await Promise.all([
      mcp.callTool('texere_store_source', {
        nodes: [
          {
            role: 'web_url',
            title: 'External API docs',
            content: 'https://example.com/api',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
        minimal: false,
      }),
      mcp.callTool('texere_store_artifact', {
        nodes: [
          {
            role: 'concept',
            title: 'Event sourcing',
            content: 'Pattern for storing state changes',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
        minimal: false,
      }),
      mcp.callTool('texere_store_knowledge', {
        nodes: [
          {
            role: 'pitfall',
            title: 'Avoid N+1 queries',
            content: 'Use eager loading instead',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
        minimal: false,
      }),
    ]);

    for (const r of results) {
      expect(r.isError).toBeUndefined();
    }
    expect((results[0].structuredContent as { nodes: Array<{ role: string }> }).nodes[0].role).toBe(
      NodeRole.WebUrl,
    );
    expect((results[1].structuredContent as { nodes: Array<{ role: string }> }).nodes[0].role).toBe(
      NodeRole.Concept,
    );
    expect((results[2].structuredContent as { nodes: Array<{ role: string }> }).nodes[0].role).toBe(
      NodeRole.Pitfall,
    );
  });

  it('accepts surviving edge types (BASED_ON, RELATED_TO, EXAMPLE_OF, PART_OF)', async () => {
    const nodes = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        mcp.callTool('texere_store_action', {
          nodes: [
            {
              role: 'task',
              title: `Edge test node ${i}`,
              content: `Content ${i}`,
              importance: 0.5,
              confidence: 0.8,
            },
          ],
          minimal: false,
        }),
      ),
    );

    const ids = nodes.map(
      (n) => (n.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id,
    );
    const edgeTypes = [EdgeType.BasedOn, EdgeType.RelatedTo, EdgeType.ExampleOf, EdgeType.PartOf];

    for (let i = 0; i < edgeTypes.length; i++) {
      const result = await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: ids[i],
            target_id: ids[i + 1],
            type: edgeTypes[i],
          },
        ],
        minimal: false,
      });
      expect(result.isError).toBeUndefined();
      expect((result.structuredContent as { edges: Array<{ type: string }> }).edges[0].type).toBe(
        edgeTypes[i],
      );
    }
  });

  it('texere_store_action batch creates multiple nodes', async () => {
    const result = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Batch A',
          content: 'A',
          importance: 0.5,
          confidence: 0.8,
        },
        {
          role: 'task',
          title: 'Batch B',
          content: 'B',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    const nodes = (result.structuredContent as { nodes: Array<{ title: string }> }).nodes;
    expect(nodes).toHaveLength(2);
    expect(nodes[0].title).toBe('Batch A');
    expect(nodes[1].title).toBe('Batch B');
  });

  it('texere_create_edge batch creates multiple edges', async () => {
    const nodeA = await mcp.callTool('texere_store_action', {
      nodes: [{ role: 'task', title: 'A', content: 'A', importance: 0.5, confidence: 0.8 }],
      minimal: false,
    });
    const nodeB = await mcp.callTool('texere_store_action', {
      nodes: [{ role: 'task', title: 'B', content: 'B', importance: 0.5, confidence: 0.8 }],
      minimal: false,
    });
    const nodeC = await mcp.callTool('texere_store_action', {
      nodes: [{ role: 'task', title: 'C', content: 'C', importance: 0.5, confidence: 0.8 }],
      minimal: false,
    });

    const idA = (nodeA.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const idB = (nodeB.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const idC = (nodeC.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

    const result = await mcp.callTool('texere_create_edge', {
      edges: [
        { source_id: idA, target_id: idB, type: EdgeType.DependsOn },
        { source_id: idB, target_id: idC, type: EdgeType.DependsOn },
      ],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    const edges = (result.structuredContent as { edges: unknown[] }).edges;
    expect(edges).toHaveLength(2);
  });

  it('texere_validate returns valid for a correct batch', async () => {
    const nodeA = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Validate edge source',
          content: 'Content A',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const nodeB = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          role: 'problem',
          title: 'Validate edge target',
          content: 'Content B',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const idA = (nodeA.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;
    const idB = (nodeB.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

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
    const output = result.structuredContent as {
      valid: boolean;
      issues: Array<{ severity: string }>;
    };
    expect(output.valid).toBe(true);
    expect(output.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
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
    const output = result.structuredContent as {
      valid: boolean;
      issues: Array<{ severity: string; message: string; index?: number; item?: string }>;
    };
    expect(output.valid).toBe(false);

    const typeRoleError = output.issues.find(
      (i) => i.severity === 'error' && i.message.includes('type-role'),
    );
    expect(typeRoleError).toBeDefined();
    expect(typeRoleError!.index).toBe(1);
    expect(typeRoleError!.item).toBe('node');
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
    const output = result.structuredContent as {
      valid: boolean;
      issues: Array<{ severity: string; message: string }>;
    };
    expect(output.valid).toBe(false);

    const endpointErrors = output.issues.filter(
      (i) => i.severity === 'error' && i.message.includes('not found'),
    );
    expect(endpointErrors).toHaveLength(2);
  });

  it('texere_validate reports self-referential edge', async () => {
    const stored = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Self ref node',
          content: 'Content',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
      minimal: false,
    });
    const nodeId = (stored.structuredContent as { nodes: Array<{ id: string }> }).nodes[0].id;

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
    const output = result.structuredContent as {
      valid: boolean;
      issues: Array<{ severity: string; message: string; index?: number; item?: string }>;
    };
    expect(output.valid).toBe(false);

    const selfRefError = output.issues.find(
      (i) => i.severity === 'error' && i.message.includes('Self-referential'),
    );
    expect(selfRefError).toBeDefined();
    expect(selfRefError!.index).toBe(0);
    expect(selfRefError!.item).toBe('edge');
  });

  it('texere_validate warns on duplicate title', async () => {
    await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'solution',
          title: 'Redis caching strategy',
          content: 'Use Redis for session caching',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
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
    const output = result.structuredContent as {
      valid: boolean;
      issues: Array<{ severity: string; message: string; item?: string }>;
    };
    expect(output.valid).toBe(true);

    const warning = output.issues.find((i) => i.severity === 'warning');
    expect(warning).toBeDefined();
    expect(warning!.item).toBe('node');
    expect(warning!.message).toContain('Similar node exists');
  });

  it('texere_validate has zero side effects on the database', async () => {
    const statsBefore = await mcp.callTool('texere_stats', {});
    const countBefore = (statsBefore.structuredContent as { stats: { nodes: { total: number } } })
      .stats.nodes.total;

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
    const countAfter = (statsAfter.structuredContent as { stats: { nodes: { total: number } } })
      .stats.nodes.total;

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
    const output = result.structuredContent as {
      issues: Array<{ severity: string; message: string }>;
    };

    const endpointErrors = output.issues.filter(
      (i) => i.severity === 'error' && i.message.includes('not found'),
    );
    expect(endpointErrors).toHaveLength(0);
  });

  // --- Per-type tool tests ---

  it('per-type store tool rejects invalid role for that type', async () => {
    // 'error' is an Issue role, not a Knowledge role
    const result = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'error',
          title: 'Wrong role',
          content: 'Knowledge cannot have error role',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('per-type store tool rejects missing importance', async () => {
    const result = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'finding',
          title: 'Missing importance',
          content: 'Should fail validation',
          confidence: 0.8,
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('per-type store tool rejects missing confidence', async () => {
    const result = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          role: 'task',
          title: 'Missing confidence',
          content: 'Should fail validation',
          importance: 0.5,
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('per-type store tool defaults minimal to true (returns id only)', async () => {
    const result = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'finding',
          title: 'Minimal test',
          content: 'Should return id only',
          importance: 0.5,
          confidence: 0.8,
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    const nodes = (result.structuredContent as { nodes: Array<Record<string, unknown>> }).nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBeDefined();
    // Minimal mode: should NOT have full node fields
    expect(nodes[0].title).toBeUndefined();
    expect(nodes[0].content).toBeUndefined();
  });

  it('store_knowledge with temp_id + edges creates nodes and edges atomically', async () => {
    const result = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          temp_id: 'd1',
          role: 'decision',
          title: 'Use Hono',
          content: 'Chose Hono because...',
          importance: 0.9,
          confidence: 0.95,
          tags: ['web', 'framework'],
        },
        {
          temp_id: 'f1',
          role: 'finding',
          title: 'Hono benchmarks',
          content: 'Hono is 3x faster...',
          importance: 0.7,
          confidence: 0.9,
          tags: ['benchmark'],
        },
      ],
      edges: [{ source_id: 'd1', target_id: 'f1', type: EdgeType.BasedOn }],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      nodes: [
        { temp_id: 'd1', type: NodeType.Knowledge, role: NodeRole.Decision, title: 'Use Hono' },
        {
          temp_id: 'f1',
          type: NodeType.Knowledge,
          role: NodeRole.Finding,
          title: 'Hono benchmarks',
        },
      ],
      edges: [{ type: EdgeType.BasedOn }],
    });
    // Verify temp_id echoed and edge has real IDs
    expect(result.structuredContent).toHaveProperty('nodes');
    const nodes = (result.structuredContent as { nodes: Array<Record<string, unknown>> }).nodes;
    expect(nodes[0]).toHaveProperty('temp_id', 'd1');
    expect(nodes[0]).toHaveProperty('id');
    expect(nodes[1]).toHaveProperty('temp_id', 'f1');
    expect(nodes[1]).toHaveProperty('id');

    const edges = (result.structuredContent as { edges: Array<Record<string, unknown>> }).edges;
    expect(edges[0]).toHaveProperty('source_id');
    expect(edges[0]).toHaveProperty('target_id');
    expect(edges[0].source_id).toBe(nodes[0].id);
    expect(edges[0].target_id).toBe(nodes[1].id);
  });

  it('store_action with temp_id + edges works', async () => {
    const result = await mcp.callTool('texere_store_action', {
      nodes: [
        {
          temp_id: 't1',
          role: 'task',
          title: 'Implement feature',
          content: 'Build new feature',
          importance: 0.8,
          confidence: 0.9,
        },
        {
          temp_id: 's1',
          role: 'solution',
          title: 'Use async/await',
          content: 'Simplifies async code',
          importance: 0.7,
          confidence: 0.95,
        },
      ],
      edges: [{ source_id: 's1', target_id: 't1', type: EdgeType.Resolves }],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    const nodes = (result.structuredContent as { nodes: Array<Record<string, unknown>> }).nodes;
    const edges = (result.structuredContent as { edges: Array<Record<string, unknown>> }).edges;

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toHaveProperty('temp_id', 't1');
    expect(nodes[1]).toHaveProperty('temp_id', 's1');
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe(EdgeType.Resolves);
  });

  it('store_artifact with edge to existing node works', async () => {
    // Pre-create a knowledge node
    const knowledgeResult = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'decision',
          title: 'Use SQLite',
          content: 'Chose SQLite for embedded database',
          importance: 0.9,
          confidence: 0.95,
        },
      ],
      minimal: false,
    });
    const knowledgeId = (knowledgeResult.structuredContent as { nodes: Array<{ id: string }> })
      .nodes[0].id;

    // Create artifact with edge to existing knowledge node
    const result = await mcp.callTool('texere_store_artifact', {
      nodes: [
        {
          temp_id: 'c1',
          role: 'concept',
          title: 'WAL mode',
          content: 'Write-Ahead Logging...',
          importance: 0.8,
          confidence: 0.9,
        },
      ],
      edges: [{ source_id: 'c1', target_id: knowledgeId, type: EdgeType.PartOf }],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    const edges = (result.structuredContent as { edges: Array<Record<string, unknown>> }).edges;
    expect(edges[0].target_id).toBe(knowledgeId);
  });

  it('store_issue with temp_id but no edges works (backward compat)', async () => {
    const result = await mcp.callTool('texere_store_issue', {
      nodes: [
        {
          temp_id: 'e1',
          role: 'error',
          title: 'Timeout error',
          content: 'Connection timeout...',
          importance: 0.8,
          confidence: 0.9,
        },
      ],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toHaveProperty('nodes');
    const nodes = (result.structuredContent as { nodes: Array<Record<string, unknown>> }).nodes;
    expect(nodes[0]).toHaveProperty('temp_id', 'e1');
    expect(result.structuredContent).not.toHaveProperty('edges');
  });

  it('store_source without temp_id or edges works identically to before', async () => {
    const result = await mcp.callTool('texere_store_source', {
      nodes: [
        {
          role: 'web_url',
          title: 'SQLite docs',
          content: 'https://sqlite.org',
          importance: 0.7,
          confidence: 1.0,
        },
      ],
      minimal: false,
    });

    expect(result.isError).toBeUndefined();
    const nodes = (result.structuredContent as { nodes: Array<Record<string, unknown>> }).nodes;
    expect(nodes[0]).toHaveProperty('id');
    expect(nodes[0]).not.toHaveProperty('temp_id');
    expect(result.structuredContent).not.toHaveProperty('edges');
  });

  it('all 5 store tools accept edges array in schema', () => {
    const toolConfigs = [
      { name: 'texere_store_knowledge', role: 'decision' },
      { name: 'texere_store_issue', role: 'error' },
      { name: 'texere_store_action', role: 'task' },
      { name: 'texere_store_artifact', role: 'concept' },
      { name: 'texere_store_source', role: 'web_url' },
    ];

    for (const config of toolConfigs) {
      const tool = TOOL_DEFINITIONS.find((t) => t.name === config.name);
      expect(tool).toBeDefined();

      // Valid input with edges should parse successfully
      const validInput = {
        nodes: [
          {
            role: config.role,
            title: 'Test',
            content: 'Test',
            importance: 0.5,
            confidence: 0.5,
          },
        ],
        edges: [{ source_id: 'temp1', target_id: 'temp2', type: EdgeType.BasedOn }],
      };

      const parseResult = tool!.inputSchema.safeParse(validInput);
      expect(parseResult.success).toBe(true);
    }
  });

  it('store_knowledge rejects invalid edge type', async () => {
    const result = await mcp.callTool('texere_store_knowledge', {
      nodes: [
        {
          role: 'decision',
          title: 'Test',
          content: 'Test',
          importance: 0.5,
          confidence: 0.5,
        },
      ],
      edges: [
        {
          source_id: 'a',
          target_id: 'b',
          type: 'INVALID_TYPE' as unknown as EdgeType,
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect((result.structuredContent as { error: { code: string } }).error.code).toBe(
      'INVALID_INPUT',
    );
  });
});
