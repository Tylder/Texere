import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

import type { Texere } from '@texere/graph';

export type ToolCallResult = CallToolResult;

export interface ToolContext {
  db: Texere;
}

export interface ToolDefinition<TInputSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TInputSchema;
  execute: (
    context: ToolContext,
    input: z.infer<TInputSchema>,
  ) => Promise<ToolCallResult> | ToolCallResult;
}
