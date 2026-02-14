import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType, TextereDB } from '@texere/graph';

import { createTexereMcpServer } from './server.js';
import type { ToolCallResult } from './tools/types.js';

type McpServer = ReturnType<typeof createTexereMcpServer>;

const storeNode = async (
  mcp: McpServer,
  overrides: Record<string, unknown> = {},
): Promise<ToolCallResult> =>
  mcp.callTool('texere_store_node', {
    type: NodeType.Action,
    role: NodeRole.Task,
    title: 'Default title',
    content: 'Default content',
    ...overrides,
  });

const getNodeId = (result: Awaited<ReturnType<McpServer['callTool']>>): string =>
  (result.structuredContent as Record<string, Record<string, string>>).node.id;

const listToolsViaServer = async (
  mcp: McpServer,
): Promise<{ tools: Array<Record<string, unknown>> }> => {
  const requestHandlers = (
    mcp.server as unknown as {
      _requestHandlers: Map<string, (request: unknown, extra?: unknown) => Promise<unknown>>;
    }
  )._requestHandlers;

  const handler = requestHandlers.get('tools/list');
  if (!handler) {
    throw new Error('tools/list handler not registered');
  }

  const result = await handler({ method: 'tools/list', params: {} });
  return result as { tools: Array<Record<string, unknown>> };
};

const hasObjectBranch = (schema: unknown): boolean => {
  if (!Array.isArray(schema)) {
    return false;
  }

  return schema.some(
    (branch) =>
      typeof branch === 'object' &&
      branch !== null &&
      !Array.isArray(branch) &&
      (branch as { type?: unknown }).type === 'object',
  );
};

describe('MCP server integration', () => {
  let db: TextereDB;
  let mcp: McpServer;

  beforeEach(() => {
    db = new TextereDB(':memory:');
    mcp = createTexereMcpServer(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('round-trip: store_node -> get_node', () => {
    it('stores a node and retrieves it with identical data', async () => {
      const stored = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Use SQLite for storage',
        content: 'SQLite is sufficient for expected scale',
        tags: ['database', 'architecture'],
        importance: 0.9,
        confidence: 0.85,
      });

      expect(stored.isError).toBeUndefined();
      const nodeId = getNodeId(stored);

      const fetched = await mcp.callTool('texere_get_node', { id: nodeId, include_edges: true });

      expect(fetched.isError).toBeUndefined();
      const node = (fetched.structuredContent as any).node;
      expect(node.id).toBe(nodeId);
      expect(node.type).toBe(NodeType.Knowledge);
      expect(node.role).toBe(NodeRole.Decision);
      expect(node.title).toBe('Use SQLite for storage');
      expect(node.content).toBe('SQLite is sufficient for expected scale');
      expect(node.importance).toBe(0.9);
      expect(node.confidence).toBe(0.85);
    });
  });

  describe('store 3 nodes with edges -> search -> verify results', () => {
    it('finds nodes via full-text search after storing with edges', async () => {
      const problem = await storeNode(mcp, {
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Authentication timeout errors',
        content: 'Users experience timeout when logging in during peak hours',
        tags: ['auth', 'performance'],
        importance: 0.8,
      });

      const solution = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Increase connection pool size',
        content: 'Scale database connection pool to handle peak authentication load',
        tags: ['auth', 'database'],
        importance: 0.85,
      });

      const fix = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Fix,
        title: 'Set pool size to 20 connections',
        content: 'Updated config to use 20 max connections for auth database',
        tags: ['auth', 'config'],
      });

      await mcp.callTool('texere_create_edge', {
        edges: {
          source_id: getNodeId(solution),
          target_id: getNodeId(problem),
          type: EdgeType.Resolves,
        },
      });

      await mcp.callTool('texere_create_edge', {
        edges: {
          source_id: getNodeId(fix),
          target_id: getNodeId(solution),
          type: EdgeType.Extends,
        },
      });

      const searchResult = await mcp.callTool('texere_search', {
        query: 'authentication timeout',
        limit: 10,
      });

      expect(searchResult.isError).toBeUndefined();
      const results = (searchResult.structuredContent as any).results;
      expect(results.length).toBeGreaterThan(0);
      const ids = results.map((r: any) => r.id);
      expect(ids).toContain(getNodeId(problem));
    });
  });

  describe('store nodes -> traverse -> verify graph walk', () => {
    it('traverses edges correctly in outgoing direction', async () => {
      const root = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Root task',
        content: 'Starting point for traversal',
      });

      const child = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Child task',
        content: 'First level neighbor',
      });

      const grandchild = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Grandchild task',
        content: 'Second level neighbor',
      });

      await mcp.callTool('texere_create_edge', {
        edges: {
          source_id: getNodeId(root),
          target_id: getNodeId(child),
          type: EdgeType.DependsOn,
        },
      });

      await mcp.callTool('texere_create_edge', {
        edges: {
          source_id: getNodeId(child),
          target_id: getNodeId(grandchild),
          type: EdgeType.DependsOn,
        },
      });

      const traversed = await mcp.callTool('texere_traverse', {
        start_id: getNodeId(root),
        direction: 'outgoing',
        max_depth: 3,
      });

      expect(traversed.isError).toBeUndefined();
      const nodes = (traversed.structuredContent as any).results;
      expect(nodes).toHaveLength(2);

      const nodeIds = nodes.map((r: any) => r.node.id);
      expect(nodeIds).toContain(getNodeId(child));
      expect(nodeIds).toContain(getNodeId(grandchild));

      const childResult = nodes.find((r: any) => r.node.id === getNodeId(child));
      expect(childResult.depth).toBe(1);

      const grandchildResult = nodes.find((r: any) => r.node.id === getNodeId(grandchild));
      expect(grandchildResult.depth).toBe(2);
    });
  });

  describe('about -> verify combined search + traverse', () => {
    it('returns search seeds and their graph neighbors', async () => {
      const problem = await storeNode(mcp, {
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Memory leak in worker threads',
        content: 'Worker processes accumulate memory over time',
        tags: ['performance'],
      });

      const solution = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Implement worker recycling',
        content: 'Restart workers after processing N requests',
        tags: ['performance'],
      });

      await mcp.callTool('texere_create_edge', {
        edges: {
          source_id: getNodeId(solution),
          target_id: getNodeId(problem),
          type: EdgeType.Resolves,
        },
      });

      const aboutResult = await mcp.callTool('texere_about', {
        query: 'memory leak',
        direction: 'both',
        max_depth: 2,
        limit: 10,
      });

      expect(aboutResult.isError).toBeUndefined();
      const results = (aboutResult.structuredContent as any).results;
      expect(results.length).toBeGreaterThan(0);

      const nodeIds = results.map((r: any) => r.node.id);
      expect(nodeIds).toContain(getNodeId(problem));
    });
  });

  describe('stats -> verify counts match', () => {
    it('returns accurate node and edge counts', async () => {
      await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task A',
        content: 'A',
      });
      await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Task B',
        content: 'B',
      });
      const problem = await storeNode(mcp, {
        type: NodeType.Issue,
        role: NodeRole.Problem,
        title: 'Problem C',
        content: 'C',
      });
      const solution = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Solution,
        title: 'Solution D',
        content: 'D',
      });

      await mcp.callTool('texere_create_edge', {
        edges: {
          source_id: getNodeId(solution),
          target_id: getNodeId(problem),
          type: EdgeType.Resolves,
        },
      });

      const statsResult = await mcp.callTool('texere_stats', {});

      expect(statsResult.isError).toBeUndefined();
      const stats = (statsResult.structuredContent as any).stats;
      expect(stats.nodes.total).toBe(4);
      expect(stats.nodes.byType[NodeType.Action]).toBe(3);
      expect(stats.nodes.byType[NodeType.Issue]).toBe(1);
      expect(stats.edges.total).toBe(1);
      expect(stats.edges.byType[EdgeType.Resolves]).toBe(1);
    });
  });

  describe('REPLACES -> search excludes old node', () => {
    it('auto-invalidates source node and search omits it', async () => {
      const oldDecision = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Use REST API for communication',
        content: 'REST API chosen for simplicity',
        importance: 0.8,
      });

      const newDecision = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Use GraphQL API for communication',
        content: 'GraphQL chosen for flexible queries',
        importance: 0.9,
      });

      await mcp.callTool('texere_create_edge', {
        edges: {
          source_id: getNodeId(oldDecision),
          target_id: getNodeId(newDecision),
          type: EdgeType.Replaces,
        },
      });

      const oldNode = await mcp.callTool('texere_get_node', { id: getNodeId(oldDecision) });
      expect((oldNode.structuredContent as any).node.invalidated_at).not.toBeNull();

      const searchResult = await mcp.callTool('texere_search', {
        query: 'API communication',
        limit: 10,
      });

      const results = (searchResult.structuredContent as any).results;
      const resultIds = results.map((r: any) => r.id);
      expect(resultIds).not.toContain(getNodeId(oldDecision));
      expect(resultIds).toContain(getNodeId(newDecision));
    });
  });

  describe('invalidate_node -> get_node -> verify invalidated_at', () => {
    it('sets invalidated_at timestamp on node', async () => {
      const node = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Research,
        title: 'Outdated research finding',
        content: 'This finding is no longer valid',
      });

      const beforeInvalidation = await mcp.callTool('texere_get_node', { id: getNodeId(node) });
      expect((beforeInvalidation.structuredContent as any).node.invalidated_at).toBeNull();

      await mcp.callTool('texere_invalidate_node', { id: getNodeId(node) });

      const afterInvalidation = await mcp.callTool('texere_get_node', { id: getNodeId(node) });
      expect((afterInvalidation.structuredContent as any).node.invalidated_at).not.toBeNull();
      expect(typeof (afterInvalidation.structuredContent as any).node.invalidated_at).toBe(
        'number',
      );
    });
  });

  describe('all tools return valid MCP response format', () => {
    it('every tool result has content array with text entries', async () => {
      const stored = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Task,
        title: 'Format test node',
        content: 'Testing response format',
      });
      const nodeId = getNodeId(stored);

      const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [
        {
          name: 'texere_store_node',
          args: {
            type: NodeType.Action,
            role: NodeRole.Task,
            title: 'Another',
            content: 'Node',
          },
        },
        { name: 'texere_get_node', args: { id: nodeId } },
        { name: 'texere_invalidate_node', args: { id: nodeId } },
        { name: 'texere_search', args: { query: 'format test' } },
        { name: 'texere_stats', args: {} },
      ];

      for (const call of toolCalls) {
        const result = await mcp.callTool(call.name, call.args);

        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content.length).toBeGreaterThan(0);

        for (const entry of result.content) {
          expect(entry).toHaveProperty('type', 'text');
          expect(entry).toHaveProperty('text');
          expect(typeof (entry as any).text).toBe('string');
        }

        expect(result.structuredContent).toBeDefined();
      }
    });

    it('error results include isError flag and error structure', async () => {
      const result = await mcp.callTool('texere_store_node', {
        type: NodeType.Action,
        role: NodeRole.Task,
        content: 'Missing required title',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect((result.structuredContent as any).error).toBeDefined();
      expect((result.structuredContent as any).error.code).toBeDefined();
    });

    it('unknown tool returns UNKNOWN_TOOL error', async () => {
      const result = await mcp.callTool('texere_nonexistent', {});

      expect(result.isError).toBe(true);
      expect((result.structuredContent as any).error.code).toBe('UNKNOWN_TOOL');
    });
  });

  describe('tools/list schema regression', () => {
    it('returns client-acceptable JSON schemas and preserves object branches in unions', async () => {
      const listToolsResult = await listToolsViaServer(mcp);

      const parsed = ListToolsResultSchema.safeParse(listToolsResult);
      expect(parsed.success).toBe(true);

      expect(listToolsResult.tools).toHaveLength(10);

      for (const tool of listToolsResult.tools) {
        const inputSchema = tool.inputSchema as { type?: unknown; anyOf?: unknown };
        const hasValidRoot =
          inputSchema.type === 'object' ||
          (Array.isArray(inputSchema.anyOf) && inputSchema.anyOf.length > 0);
        expect(hasValidRoot).toBe(true);
      }

      const storeNodeSchema = listToolsResult.tools.find(
        (tool) => tool.name === 'texere_store_node',
      )?.inputSchema as { anyOf?: unknown };
      expect(hasObjectBranch(storeNodeSchema.anyOf)).toBe(true);

      const createEdgeSchema = listToolsResult.tools.find(
        (tool) => tool.name === 'texere_create_edge',
      )?.inputSchema as {
        properties?: {
          edges?: {
            anyOf?: unknown;
          };
        };
      };
      expect(hasObjectBranch(createEdgeSchema.properties?.edges?.anyOf)).toBe(true);
    });
  });
});
