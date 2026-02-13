import type { z } from 'zod';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { TextereDB } from '@texere/graph';

export type ToolCallResult = CallToolResult;

export interface ToolContext {
  db: TextereDB;
}

export interface ToolDefinition<TInputSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TInputSchema;
  execute: (context: ToolContext, input: z.infer<TInputSchema>) => Promise<ToolCallResult> | ToolCallResult;
}
