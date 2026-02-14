import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { TextereDB } from '@texere/graph';

import { executeToolDefinition, TOOL_DEFINITIONS, TOOL_NAMES } from './tools/index.js';
import type { ToolCallResult } from './tools/index.js';

const serverInfo = {
  name: 'texere-mcp',
  version: '0.0.0',
};

const listTools = (): {
  tools: Array<{ name: string; description: string; inputSchema: unknown }>;
} => ({
  tools: TOOL_DEFINITIONS.map((definition) => {
    const jsonSchema = z.toJSONSchema(definition.inputSchema);
    return {
      name: definition.name,
      description: definition.description,
      inputSchema: jsonSchema,
    };
  }),
});

const unknownTool = (name: string): ToolCallResult => ({
  isError: true,
  content: [{ type: 'text', text: `Unknown tool: ${name}` }],
  structuredContent: {
    error: {
      code: 'UNKNOWN_TOOL',
      message: `Unknown tool: ${name}`,
    },
  },
});

type ToolCallRequest = {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
};

export const createTexereMcpServer = (
  db: TextereDB,
): {
  server: Server;
  toolNames: ReadonlyArray<string>;
  callTool: (name: string, input: unknown) => Promise<ToolCallResult>;
} => {
  const server = new Server(serverInfo, {
    capabilities: {
      tools: {},
    },
  });

  const callTool = async (name: string, input: unknown): Promise<ToolCallResult> => {
    const definition = TOOL_DEFINITIONS.find((tool) => tool.name === name);
    if (!definition) {
      return unknownTool(name);
    }

    return executeToolDefinition(definition, { db }, input);
  };

  server.setRequestHandler(ListToolsRequestSchema, () => listTools());
  const callToolHandler = async (request: ToolCallRequest): Promise<ToolCallResult> => {
    return callTool(request.params.name, request.params.arguments ?? {});
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any -- MCP SDK handler type mismatch
  server.setRequestHandler(CallToolRequestSchema, callToolHandler as any);

  return {
    server,
    toolNames: TOOL_NAMES,
    callTool,
  };
};
