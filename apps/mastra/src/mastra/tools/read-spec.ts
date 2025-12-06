import { readFileSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

import { createTool } from '@mastra/core';

/**
 * readSpec tool - Read specification files from filesystem
 * (mastra_orchestrator_spec.md §6.2)
 *
 * v0.2: Real file reader with error handling
 */
const readSpecToolInputSchema = z.object({
  specPath: z.string().describe('Relative or absolute path to the spec document'),
});

const readSpecToolOutputSchema = z.object({
  success: z.boolean(),
  content: z.string(),
  source: z.string(),
  error: z.string().optional(),
});

export const readSpecTool = createTool({
  id: 'readSpec',
  description: 'Read a specification document from the filesystem and return its content.',
  inputSchema: readSpecToolInputSchema,
  outputSchema: readSpecToolOutputSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (input: any) => {
    // Mastra passes context, extract actual input
    const specPath = input.specPath || input.input?.specPath;

    if (!specPath) {
      return {
        success: false,
        content: '',
        source: '',
        error: 'specPath is required',
      };
    }

    try {
      // Support both relative (from repo root) and absolute paths
      const fullPath = specPath.startsWith('/') ? specPath : resolve(process.cwd(), specPath);
      const content = readFileSync(fullPath, 'utf-8');

      return {
        success: true,
        content,
        source: fullPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        content: '',
        source: specPath,
        error: `Failed to read spec: ${errorMessage}`,
      };
    }
  },
});
