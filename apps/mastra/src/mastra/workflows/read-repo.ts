import { z } from 'zod';

import { simpleReaderAgent } from '../agents/simple-reader.js';

/**
 * Read Repo Workflow (Skeleton v0.1)
 *
 * Linear workflow for testing basic agent + tool integration:
 * - Step 1: Call simpleReaderAgent with repo ID
 * - Step 2: Return agent response
 *
 * Reference: mastra_orchestrator_spec.md §5.5 (Q&A / Exploration Workflow)
 */

const ReadRepoInputSchema = z.object({
  repoId: z.string().describe('Repository ID to read metadata for'),
  branch: z.string().optional().default('main').describe('Branch name (default: main)'),
});

const ReadRepoOutputSchema = z.object({
  success: z.boolean(),
  repoId: z.string(),
  summary: z.string(),
  message: z.string(),
  timestamp: z.string(),
});

type ReadRepoInput = z.infer<typeof ReadRepoInputSchema>;
type ReadRepoOutput = z.infer<typeof ReadRepoOutputSchema>;

/**
 * Execute the read-repo workflow
 */
export async function executeReadRepo(input: ReadRepoInput): Promise<ReadRepoOutput> {
  console.log(`[readRepo] Starting workflow for repo: ${input.repoId}`);

  const prompt = `Please read the repository "${input.repoId}" and provide a brief summary. Use the getRepoInfo tool to fetch metadata.`;

  try {
    // Step 1: Call agent
    const agentResponse = await simpleReaderAgent.generate(prompt);

    console.log(`[readRepo] Agent response received`);

    // Extract text from response
    let responseText: string;
    if (typeof agentResponse === 'string') {
      responseText = agentResponse;
    } else if (agentResponse !== null && typeof agentResponse === 'object') {
      const agentResponseObj = agentResponse as Record<string, unknown>;
      if ('text' in agentResponseObj) {
        responseText = String(agentResponseObj.text);
      } else {
        responseText = JSON.stringify(agentResponseObj);
      }
    } else {
      responseText = String(agentResponse);
    }

    return {
      success: true,
      repoId: input.repoId,
      summary: responseText,
      message: `Successfully read repository: ${input.repoId}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[readRepo] Workflow failed: ${errorMessage}`);

    return {
      success: false,
      repoId: input.repoId,
      summary: '',
      message: `Failed to read repository: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export workflow definition for Mastra registration
export const readRepoWorkflow = {
  name: 'readRepo',
  description:
    'Read repository metadata and provide a summary. Skeleton v0.1: Uses simple agent with mock tool.',
  inputSchema: ReadRepoInputSchema,
  outputSchema: ReadRepoOutputSchema,
  execute: executeReadRepo,
};
