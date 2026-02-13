import { z } from 'zod';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { TextereDB } from '@texere/graph';

import { executeToolDefinition, TOOL_DEFINITIONS, TOOL_NAMES } from './tools/index.js';
import type { ToolCallResult } from './tools/index.js';

const serverInfo = {
  name: 'texere-mcp',
  version: '0.0.0',
};

const listTools = () => ({
  tools: TOOL_DEFINITIONS.map((definition) => ({
    name: definition.name,
    description: definition.description,
    inputSchema: z.toJSONSchema(definition.inputSchema),
  })),
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

export const createTexereMcpServer = (db: TextereDB) => {
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

  server.setRequestHandler(ListToolsRequestSchema, async () => listTools());
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return (await callTool(request.params.name, request.params.arguments ?? {})) as any;
  });

  return {
    server,
    toolNames: TOOL_NAMES,
    callTool,
  };
};
