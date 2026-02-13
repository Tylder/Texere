import type { z } from 'zod';

import type { ToolCallResult, ToolContext, ToolDefinition } from './types.js';

const asText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
};

export const ok = (data: Record<string, unknown>): ToolCallResult => ({
  content: [{ type: 'text', text: asText(data) }],
  structuredContent: data,
});

export const invalidInput = (error: z.ZodError): ToolCallResult => ({
  isError: true,
  content: [{ type: 'text', text: 'Input validation failed.' }],
  structuredContent: {
    error: {
      code: 'INVALID_INPUT',
      message: 'Input validation failed.',
      issues: error.issues,
    },
  },
});

export const toolFailure = (message: string): ToolCallResult => ({
  isError: true,
  content: [{ type: 'text', text: message }],
  structuredContent: {
    error: {
      code: 'TOOL_ERROR',
      message,
    },
  },
});

export const executeToolDefinition = async (
  definition: ToolDefinition,
  context: ToolContext,
  input: unknown,
): Promise<ToolCallResult> => {
  const parsed = definition.inputSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  try {
    return await definition.execute(context, parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown tool error';
    return toolFailure(message);
  }
};
