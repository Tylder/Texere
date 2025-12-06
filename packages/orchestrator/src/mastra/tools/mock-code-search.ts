import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Mock code search tool for skeleton implementation.
 * Returns dummy results; real implementation uses repo-intel tools.
 * Per spec §6.2.1 (Repo-Intel Tools).
 */
export const mockCodeSearchTool = createTool({
  id: 'mock-code-search',
  description: 'Search codebase for symbols, patterns, or concepts (mocked for skeleton)',
  inputSchema: z.object({
    query: z.string().describe('Search query (symbol name, pattern, or concept)'),
    repoId: z.string().optional().describe('Repository identifier'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        filePath: z.string(),
        lineNumber: z.number(),
        snippet: z.string(),
        relevanceScore: z.number().min(0).max(1),
      }),
    ),
    totalResults: z.number(),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async () => {
    // Mock response: return dummy results for any query
    // (ignoring context for skeleton; real implementation would search)
    return {
      results: [
        {
          filePath: 'packages/orchestrator/src/index.ts',
          lineNumber: 1,
          snippet: '// Orchestrator entrypoint\n// Exports public API for triggering workflows',
          relevanceScore: 0.92,
        },
        {
          filePath: 'packages/tools-core/src/types.ts',
          lineNumber: 11,
          snippet: 'export interface ToolMeta<I, O> {\n  id: string;',
          relevanceScore: 0.78,
        },
      ],
      totalResults: 2,
    };
  },
});
