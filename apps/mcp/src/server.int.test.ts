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
        source_id: getNodeId(solution),
        target_id: getNodeId(problem),
        type: EdgeType.Resolves,
      });

      await mcp.callTool('texere_create_edge', {
        source_id: getNodeId(fix),
        target_id: getNodeId(solution),
        type: EdgeType.Extends,
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
        source_id: getNodeId(root),
        target_id: getNodeId(child),
        type: EdgeType.DependsOn,
      });

      await mcp.callTool('texere_create_edge', {
        source_id: getNodeId(child),
        target_id: getNodeId(grandchild),
        type: EdgeType.DependsOn,
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
        source_id: getNodeId(solution),
        target_id: getNodeId(problem),
        type: EdgeType.Resolves,
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
        source_id: getNodeId(solution),
        target_id: getNodeId(problem),
        type: EdgeType.Resolves,
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
        source_id: getNodeId(oldDecision),
        target_id: getNodeId(newDecision),
        type: EdgeType.Replaces,
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
    it('every tool has type:object at root with no top-level anyOf/oneOf/allOf', async () => {
      const listToolsResult = await listToolsViaServer(mcp);

      const parsed = ListToolsResultSchema.safeParse(listToolsResult);
      expect(parsed.success).toBe(true);

      expect(listToolsResult.tools).toHaveLength(12);

      for (const tool of listToolsResult.tools) {
        const inputSchema = tool.inputSchema as Record<string, unknown>;
        expect(inputSchema.type).toBe('object');
        expect(hasTopLevelUnion(inputSchema)).toBe(false);
      }
    });
  });

  describe('source provenance workflow', () => {
    it('links a finding to its source and discovers both via traverse and tag search', async () => {
      const source = await storeNode(mcp, {
        type: NodeType.Artifact,
        role: NodeRole.Source,
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
        source_id: getNodeId(finding),
        target_id: getNodeId(source),
        type: EdgeType.BasedOn,
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

  describe('concept hierarchy with IS_A and ABOUT edges', () => {
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
        source_id: getNodeId(router),
        target_id: getNodeId(framework),
        type: EdgeType.IsA,
      });

      await mcp.callTool('texere_create_edge', {
        source_id: getNodeId(hono),
        target_id: getNodeId(router),
        type: EdgeType.About,
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
        source_id: getNodeId(nodeA),
        target_id: getNodeId(nodeB),
        type: EdgeType.RelatedTo,
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

  describe('pitfall role for knowledge nodes', () => {
    it('stores and retrieves a pitfall node with correct type and role', async () => {
      const pitfall = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Pitfall,
        title: 'Do not use SELECT * in production queries',
        content: 'SELECT * prevents index-only scans and transfers unnecessary data',
        tags: ['sql', 'performance', 'pitfall'],
        importance: 0.8,
      });
      expect(pitfall.isError).toBeUndefined();

      const searchResult = await mcp.callTool('texere_search', {
        query: 'SELECT production',
        type: NodeType.Knowledge,
        limit: 10,
      });
      expect(searchResult.isError).toBeUndefined();
      const results = (searchResult.structuredContent as any).results;
      const ids = results.map((r: any) => r.id);
      expect(ids).toContain(getNodeId(pitfall));

      const fetched = await mcp.callTool('texere_get_node', { id: getNodeId(pitfall) });
      expect(fetched.isError).toBeUndefined();
      const node = (fetched.structuredContent as any).node;
      expect(node.type).toBe(NodeType.Knowledge);
      expect(node.role).toBe(NodeRole.Pitfall);
      expect(node.title).toBe('Do not use SELECT * in production queries');
      expect(node.importance).toBe(0.8);
    });
  });

  describe('node storage without source field', () => {
    it('stores node correctly without source field', async () => {
      const result = await storeNode(mcp, {
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: 'Use WAL mode for SQLite',
        content: 'WAL mode enables concurrent reads during writes',
      });
      expect(result.isError).toBeUndefined();

      const nodeId = getNodeId(result);
      const fetched = await mcp.callTool('texere_get_node', { id: nodeId });
      expect(fetched.isError).toBeUndefined();
      const node = (fetched.structuredContent as any).node;
      expect(node.id).toBe(nodeId);
      expect(node.type).toBe(NodeType.Knowledge);
      expect(node.role).toBe(NodeRole.Decision);
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
      expect(toolsResponse.result.tools).toHaveLength(12);

      for (const tool of toolsResponse.result.tools as Array<Record<string, unknown>>) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');

        const schema = tool.inputSchema as Record<string, unknown>;
        expect(schema.type).toBe('object');
        expect(hasTopLevelUnion(schema)).toBe(false);
      }
    });
  });
});
