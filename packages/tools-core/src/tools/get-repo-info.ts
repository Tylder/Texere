import { z } from 'zod';

/**
 * GetRepoInfo Tool - Mock Implementation
 *
 * v0.1 skeleton: Returns hardcoded mock data for testing workflow integration.
 * v0.2: Will query actual repo-intel service / SCIP index.
 *
 * Reference: mastra_orchestrator_spec.md §6.2 (Repo-Intel Tools)
 */

export const GetRepoInfoInputSchema = z.object({
  repoId: z.string().describe('Repository identifier'),
  branch: z.string().optional().describe('Branch name (default: main)'),
});

export const GetRepoInfoOutputSchema = z.object({
  success: z.boolean(),
  repoId: z.string(),
  branch: z.string(),
  rootPath: z.string(),
  primaryLanguage: z.string(),
  fileCount: z.number(),
  description: z.string(),
  error: z.string().optional(),
});

export type GetRepoInfoInput = z.infer<typeof GetRepoInfoInputSchema>;
export type GetRepoInfoOutput = z.infer<typeof GetRepoInfoOutputSchema>;

/**
 * Core implementation of GetRepoInfo - framework agnostic
 */
export function getRepoInfoHandler(input: GetRepoInfoInput): GetRepoInfoOutput {
  const { repoId, branch = 'main' } = input;

  // v0.1 Mock: Return static data for testing
  // In v0.2, this will query a real repo-intel service
  const mockRepos: Record<string, Omit<GetRepoInfoOutput, 'success'>> = {
    texere: {
      repoId: 'texere',
      branch,
      rootPath: '/home/anon/Texere',
      primaryLanguage: 'TypeScript',
      fileCount: 247,
      description: 'Texere: LLM Agent Platform for Repository Understanding & Code Implementation',
    },
    'skeleton-test': {
      repoId: 'skeleton-test',
      branch,
      rootPath: '/home/test/skeleton',
      primaryLanguage: 'TypeScript',
      fileCount: 42,
      description: 'Test repository for skeleton implementation',
    },
  };

  const repoData = mockRepos[repoId];

  if (!repoData) {
    return {
      success: false,
      repoId,
      branch,
      rootPath: '',
      primaryLanguage: '',
      fileCount: 0,
      description: '',
      error: `Repository '${repoId}' not found in mock registry. Available: ${Object.keys(mockRepos).join(', ')}`,
    };
  }

  return {
    ...repoData,
    success: true,
  };
}
