import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EdgeType, NodeRole, NodeType, Texere } from '@texere/graph';

import { createTexereMcpServer } from './server.js';
import type { ToolCallResult } from './tools/types.js';

type McpServer = ReturnType<typeof createTexereMcpServer>;

// Maps NodeType to per-type store tool name
const STORE_TOOL_BY_TYPE: Record<string, string> = {
  [NodeType.Knowledge]: 'texere_store_knowledge',
  [NodeType.Issue]: 'texere_store_issue',
  [NodeType.Action]: 'texere_store_action',
  [NodeType.Artifact]: 'texere_store_artifact',
  [NodeType.Source]: 'texere_store_source',
};

const storeNode = async (
  mcp: McpServer,
  overrides: Record<string, unknown> = {},
): Promise<ToolCallResult> => {
  const type = (overrides.type as string) ?? NodeType.Action;
  const toolName = STORE_TOOL_BY_TYPE[type] ?? 'texere_store_action';
  const { type: _type, ...rest } = overrides;
  return mcp.callTool(toolName, {
    nodes: [
      {
        role: (rest.role as string) ?? 'task',
        title: (rest.title as string) ?? 'Default title',
        content: (rest.content as string) ?? 'Default content',
        importance: (rest.importance as number) ?? 0.5,
        confidence: (rest.confidence as number) ?? 0.8,
        ...Object.fromEntries(
          Object.entries(rest).filter(
            ([k]) => !['role', 'title', 'content', 'importance', 'confidence'].includes(k),
          ),
        ),
      },
    ],
    minimal: false,
  });
};

const getNodeId = (result: Awaited<ReturnType<McpServer['callTool']>>): string =>
  (result.structuredContent as Record<string, Array<Record<string, string>>>).nodes[0].id;

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

const FORBIDDEN_SCHEMA_KEYWORDS = ['anyOf', 'oneOf', 'allOf'];

const hasTopLevelUnion = (schema: unknown): boolean => {
  if (typeof schema !== 'object' || schema === null) return false;
  return FORBIDDEN_SCHEMA_KEYWORDS.some((kw) => kw in (schema as Record<string, unknown>));
};

describe('MCP server integration', () => {
  let db: Texere;
  let mcp: McpServer;

  beforeEach(() => {
    db = new Texere(':memory:');
    mcp = createTexereMcpServer(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('malformed input handling', () => {
    it('returns INVALID_INPUT with field path when required title is missing', async () => {
      const result = await mcp.callTool('texere_store_action', {
        nodes: [
          {
            role: 'task',
            content: 'Missing required title field',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
      });

      expect(result.isError).toBe(true);
      const error = (
        result.structuredContent as { error: { code: string; issues: Array<{ path: string[] }> } }
      ).error;
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.issues.length).toBeGreaterThan(0);
      expect(error.issues.some((i) => i.path?.includes('title'))).toBe(true);
    });

    it('returns INVALID_INPUT for null in required string field', async () => {
      const result = await mcp.callTool('texere_store_knowledge', {
        nodes: [
          {
            role: 'decision',
            title: null,
            content: 'Has content but null title',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
      });

      expect(result.isError).toBe(true);
      expect((result.structuredContent as { error: { code: string } }).error.code).toBe(
        'INVALID_INPUT',
      );
    });

    it('silently strips extra unknown fields from input', async () => {
      const result = await storeNode(mcp, {
        unknown_extra_field: 'should be ignored',
        another_bogus: 42,
      });

      expect(result.isError).toBeUndefined();
      const nodeId = getNodeId(result);

      const fetched = await mcp.callTool('texere_get_node', { id: nodeId });
      expect(fetched.isError).toBeUndefined();
      const node = (fetched.structuredContent as { node: Record<string, unknown> }).node;
      expect(node.unknown_extra_field).toBeUndefined();
      expect(node.another_bogus).toBeUndefined();
    });

    it('handles extremely long strings without crashing', async () => {
      const longContent = 'x'.repeat(100_000);
      const result = await storeNode(mcp, {
        title: 'Long content test',
        content: longContent,
      });

      expect(result.isError).toBeUndefined();
      const nodeId = getNodeId(result);

      const fetched = await mcp.callTool('texere_get_node', { id: nodeId });
      expect((fetched.structuredContent as { node: { content: string } }).node.content).toBe(
        longContent,
      );
    });

    it('returns INVALID_INPUT for empty string in min(1) field', async () => {
      const result = await mcp.callTool('texere_store_action', {
        nodes: [
          {
            role: 'task',
            title: '',
            content: 'Has content but empty title',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
      });

      expect(result.isError).toBe(true);
      expect((result.structuredContent as { error: { code: string } }).error.code).toBe(
        'INVALID_INPUT',
      );
    });

    it('returns INVALID_INPUT for wrong type in numeric field', async () => {
      const result = await mcp.callTool('texere_store_action', {
        nodes: [
          {
            role: 'task',
            title: 'Test node',
            content: 'Content',
            importance: 'high',
            confidence: 0.8,
          },
        ],
      });

      expect(result.isError).toBe(true);
      expect((result.structuredContent as { error: { code: string } }).error.code).toBe(
        'INVALID_INPUT',
      );
    });

    it('returns INVALID_INPUT for malformed search cursors', async () => {
      const result = await mcp.callTool('texere_search', {
        query: 'auth',
        cursor: 'not-a-cursor',
      });

      expect(result.isError).toBe(true);
      expect((result.structuredContent as { error: { code: string } }).error.code).toBe(
        'INVALID_INPUT',
      );
    });
  });

  describe('error boundary propagation', () => {
    it('wraps type-role validation errors as TOOL_ERROR with descriptive message', async () => {
      // Use Knowledge tool but with 'task' role which is invalid for Knowledge
      // However per-type tools use z.enum so this will be INVALID_INPUT, not TOOL_ERROR
      const result = await mcp.callTool('texere_store_knowledge', {
        nodes: [
          {
            role: 'task',
            title: 'Invalid combo',
            content: 'Knowledge type does not allow Task role',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
      });

      expect(result.isError).toBe(true);
      const error = (result.structuredContent as { error: { code: string; message: string } })
        .error;
      // Per-type tools use z.enum for role, so invalid role is caught by Zod as INVALID_INPUT
      expect(error.code).toBe('INVALID_INPUT');
    });

    it('wraps foreign key errors when creating edge with nonexistent node', async () => {
      const result = await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: 'nonexistent-source-id',
            target_id: 'nonexistent-target-id',
            type: EdgeType.RelatedTo,
          },
        ],
      });

      expect(result.isError).toBe(true);
      const error = (result.structuredContent as { error: { code: string; message: string } })
        .error;
      expect(error.code).toBe('TOOL_ERROR');
      expect(error.message).toMatch(/foreign key|constraint/i);
    });

    it('concurrent tool calls produce isolated results without interference', async () => {
      const concurrentStores = Array.from({ length: 10 }, (_, i) =>
        storeNode(mcp, {
          title: `Concurrent node ${i}`,
          content: `Content for concurrent test ${i}`,
        }),
      );

      const results = await Promise.all(concurrentStores);

      for (const result of results) {
        expect(result.isError).toBeUndefined();
      }

      const ids = results.map(getNodeId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      const statsResult = await mcp.callTool('texere_stats', {});
      expect(
        (statsResult.structuredContent as { stats: { nodes: { total: number } } }).stats.nodes
          .total,
      ).toBe(10);
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

      const command = await storeNode(mcp, {
        type: NodeType.Action,
        role: NodeRole.Command,
        title: 'Set pool size to 20 connections',
        content: 'Updated config to use 20 max connections for auth database',
        tags: ['auth', 'config'],
      });

      await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: getNodeId(solution),
            target_id: getNodeId(problem),
            type: EdgeType.Resolves,
          },
        ],
      });

      await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: getNodeId(command),
            target_id: getNodeId(solution),
            type: EdgeType.PartOf,
          },
        ],
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
        edges: [
          {
            source_id: getNodeId(root),
            target_id: getNodeId(child),
            type: EdgeType.DependsOn,
          },
        ],
      });

      await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: getNodeId(child),
            target_id: getNodeId(grandchild),
            type: EdgeType.DependsOn,
          },
        ],
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
        edges: [
          {
            source_id: getNodeId(solution),
            target_id: getNodeId(problem),
            type: EdgeType.Resolves,
          },
        ],
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
        edges: [
          {
            source_id: getNodeId(solution),
            target_id: getNodeId(problem),
            type: EdgeType.Resolves,
          },
        ],
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
        edges: [
          {
            source_id: getNodeId(oldDecision),
            target_id: getNodeId(newDecision),
            type: EdgeType.Replaces,
          },
        ],
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
          name: 'texere_store_action',
          args: {
            nodes: [
              {
                role: 'task',
                title: 'Another',
                content: 'Node',
                importance: 0.5,
                confidence: 0.8,
              },
            ],
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
      const result = await mcp.callTool('texere_store_action', {
        nodes: [
          {
            role: 'task',
            content: 'Missing required title',
            importance: 0.5,
            confidence: 0.8,
          },
        ],
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

  describe('schema compliance', () => {
    it('every tool has type:object at root with no top-level anyOf/oneOf/allOf', async () => {
      const listToolsResult = await listToolsViaServer(mcp);

      const parsed = ListToolsResultSchema.safeParse(listToolsResult);
      expect(parsed.success).toBe(true);

      expect(listToolsResult.tools).toHaveLength(18);

      for (const tool of listToolsResult.tools) {
        const inputSchema = tool.inputSchema as Record<string, unknown>;
        expect(inputSchema.type).toBe('object');
        expect(hasTopLevelUnion(inputSchema)).toBe(false);
      }
    });

    it('tools with required inputs declare required fields in JSON schema', async () => {
      const listToolsResult = await listToolsViaServer(mcp);

      const toolsWithRequiredInputs = [
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
        'texere_about',
      ];

      for (const toolName of toolsWithRequiredInputs) {
        const tool = listToolsResult.tools.find(
          (t) => (t as Record<string, unknown>).name === toolName,
        );
        expect(tool).toBeDefined();
        const schema = (tool as Record<string, unknown>).inputSchema as Record<string, unknown>;
        expect(schema.properties).toBeDefined();
        expect(schema.required).toBeDefined();
        expect(Array.isArray(schema.required)).toBe(true);
        expect((schema.required as string[]).length).toBeGreaterThan(0);
      }
    });

    it('every tool schema has properties defined', async () => {
      const listToolsResult = await listToolsViaServer(mcp);

      for (const tool of listToolsResult.tools) {
        const schema = (tool as Record<string, unknown>).inputSchema as Record<string, unknown>;
        expect(schema.properties).toBeDefined();
        expect(typeof schema.properties).toBe('object');
      }
    });
  });

  describe('source provenance workflow', () => {
    it('links a finding to its source and discovers both via traverse and tag search', async () => {
      const source = await storeNode(mcp, {
        type: NodeType.Source,
        role: NodeRole.WebUrl,
        title: 'Hono framework documentation',
        content: 'Official Hono web framework docs at hono.dev',
        tags: ['url:hono.dev/docs', 'kind:web_url'],
      });
      expect(source.isError).toBeUndefined();

      const finding = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: 'Hono supports middleware chaining',
        content: 'Hono allows composing middleware via c.next() similar to Express',
        tags: ['hono', 'middleware'],
      });
      expect(finding.isError).toBeUndefined();

      const edgeResult = await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: getNodeId(finding),
            target_id: getNodeId(source),
            type: EdgeType.BasedOn,
          },
        ],
      });
      expect(edgeResult.isError).toBeUndefined();

      const traversed = await mcp.callTool('texere_traverse', {
        start_id: getNodeId(source),
        direction: 'incoming',
        max_depth: 1,
      });
      expect(traversed.isError).toBeUndefined();
      const traverseNodes = (traversed.structuredContent as any).results;
      const traverseIds = traverseNodes.map((r: any) => r.node.id);
      expect(traverseIds).toContain(getNodeId(finding));

      const tagSearch = await mcp.callTool('texere_search', {
        query: '',
        tags: ['url:hono.dev/docs'],
        tag_mode: 'all',
        limit: 10,
      });
      expect(tagSearch.isError).toBeUndefined();
      const tagResults = (tagSearch.structuredContent as any).results;
      const tagIds = tagResults.map((r: any) => r.id);
      expect(tagIds).toContain(getNodeId(source));
    });
  });

  describe('concept hierarchy with EXAMPLE_OF and PART_OF edges', () => {
    it('builds a concept tree and traverses it at depth 2', async () => {
      const framework = await storeNode(mcp, {
        type: NodeType.Artifact,
        role: NodeRole.Concept,
        title: 'Web Framework',
        content: 'A software framework for building web applications',
        tags: ['concept', 'web'],
      });

      const router = await storeNode(mcp, {
        type: NodeType.Artifact,
        role: NodeRole.Concept,
        title: 'HTTP Router',
        content: 'Component that maps HTTP requests to handlers',
        tags: ['concept', 'routing'],
      });

      const hono = await storeNode(mcp, {
        type: NodeType.Artifact,
        role: NodeRole.Technology,
        title: 'Hono',
        content: 'Ultrafast web framework for the edge',
        tags: ['hono', 'framework'],
      });

      await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: getNodeId(router),
            target_id: getNodeId(framework),
            type: EdgeType.PartOf,
          },
        ],
      });

      await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: getNodeId(hono),
            target_id: getNodeId(router),
            type: EdgeType.ExampleOf,
          },
        ],
      });

      const traversed = await mcp.callTool('texere_traverse', {
        start_id: getNodeId(framework),
        direction: 'incoming',
        max_depth: 2,
      });
      expect(traversed.isError).toBeUndefined();
      const nodes = (traversed.structuredContent as any).results;
      expect(nodes).toHaveLength(2);

      const nodeIds = nodes.map((r: any) => r.node.id);
      expect(nodeIds).toContain(getNodeId(router));
      expect(nodeIds).toContain(getNodeId(hono));

      const routerResult = nodes.find((r: any) => r.node.id === getNodeId(router));
      expect(routerResult.depth).toBe(1);

      const honoResult = nodes.find((r: any) => r.node.id === getNodeId(hono));
      expect(honoResult.depth).toBe(2);
    });
  });

  describe('RELATED_TO catch-all edge', () => {
    it('connects loosely related nodes and discovers them via traverse', async () => {
      const nodeA = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: 'Edge functions reduce latency',
        content: 'Running code at the edge cuts response time by 40%',
        tags: ['edge', 'performance'],
      });

      const nodeB = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Finding,
        title: 'CDN caching improves throughput',
        content: 'Static assets served from CDN reduce origin load',
        tags: ['cdn', 'performance'],
      });

      const edgeResult = await mcp.callTool('texere_create_edge', {
        edges: [
          {
            source_id: getNodeId(nodeA),
            target_id: getNodeId(nodeB),
            type: EdgeType.RelatedTo,
          },
        ],
      });
      expect(edgeResult.isError).toBeUndefined();

      const traversed = await mcp.callTool('texere_traverse', {
        start_id: getNodeId(nodeA),
        direction: 'outgoing',
        max_depth: 1,
      });
      expect(traversed.isError).toBeUndefined();
      const nodes = (traversed.structuredContent as any).results;
      const nodeIds = nodes.map((r: any) => r.node.id);
      expect(nodeIds).toContain(getNodeId(nodeB));
    });
  });

  describe('stdio handshake (real binary)', () => {
    const dbPath = `/tmp/texere-stdio-test-${process.pid}.db`;
    const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

    afterEach(() => {
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        const file = `${dbPath}${suffix}`;
        if (existsSync(file)) {
          unlinkSync(file);
        }
      }
    });

    it('completes initialize + tools/list handshake over stdio', () => {
      const distEntry = resolve(projectRoot, 'apps/mcp/dist/index.js');
      if (!existsSync(distEntry)) {
        execSync('pnpm build', { cwd: projectRoot, timeout: 30_000, stdio: 'pipe' });
      }

      const input =
        [
          '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}',
          '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}',
        ].join('\n') + '\n';

      const stdout = execSync(`node apps/mcp/dist/index.js --db-path ${dbPath}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        input,
        timeout: 10_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const lines = stdout.split('\n').filter((l) => l.trim().length > 0);

      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }

      const responses = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
      const initResponse = responses.find((r) => r.id === 1) as Record<string, any>;
      const toolsResponse = responses.find((r) => r.id === 2) as Record<string, any>;

      expect(initResponse).toBeDefined();
      expect(initResponse.result.protocolVersion).toBeDefined();
      expect(initResponse.result.capabilities).toBeDefined();
      expect(initResponse.result.serverInfo).toBeDefined();

      expect(toolsResponse).toBeDefined();
      expect(toolsResponse.result.tools).toHaveLength(18);

      for (const tool of toolsResponse.result.tools as Array<Record<string, unknown>>) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');

        const schema = tool.inputSchema as Record<string, unknown>;
        expect(schema.type).toBe('object');
        expect(hasTopLevelUnion(schema)).toBe(false);
      }
    });

    it('tool schemas include edges property without anyOf/oneOf/allOf', async () => {
      const listToolsResult = await listToolsViaServer(mcp);
      const storeTools = listToolsResult.tools.filter(
        (t) =>
          t.name && typeof t.name === 'string' && (t.name as string).startsWith('texere_store_'),
      );

      expect(storeTools).toHaveLength(5);

      for (const tool of storeTools) {
        const schema = tool.inputSchema as Record<string, unknown>;

        // Verify edges property exists
        const properties = schema.properties as Record<string, unknown> | undefined;
        expect(properties).toBeDefined();
        expect(properties).toHaveProperty('edges');

        // Verify no forbidden union keywords at top level
        expect(hasTopLevelUnion(schema)).toBe(false);
      }
    });
  });
});
