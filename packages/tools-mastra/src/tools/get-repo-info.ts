import { createTool } from '@mastra/core';

import {
  type GetRepoInfoInput,
  GetRepoInfoInputSchema,
  GetRepoInfoOutputSchema,
  getRepoInfoHandler,
} from '@repo/tools-core';

/**
 * GetRepoInfo Tool - Mastra Adapter
 *
 * Wraps the framework-agnostic getRepoInfoHandler for use in Mastra agents and workflows.
 *
 * Reference: mastra_orchestrator_spec.md §6.1 (Tool Design)
 */

export const getRepoInfoTool = createTool({
  id: 'getRepoInfo',
  description:
    'Get metadata about a repository including root path, language, file count. v0.1: Mock implementation.',
  inputSchema: GetRepoInfoInputSchema,
  outputSchema: GetRepoInfoOutputSchema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (input: any): Promise<any> => {
    // Mastra passes context as first param, extract the actual input
    const actualInput: GetRepoInfoInput = (input as GetRepoInfoInput).repoId
      ? (input as GetRepoInfoInput)
      : ((input as Record<string, unknown>).input as GetRepoInfoInput);
    return Promise.resolve(getRepoInfoHandler(actualInput));
  },
});
