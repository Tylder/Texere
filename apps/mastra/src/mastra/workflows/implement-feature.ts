import { z } from 'zod';

import { specInterpreterAgent } from '../agents/spec-interpreter.js';
import type { TaskSpec } from '../types/task.js';
import { ImplementFeatureResultSchema, TaskSpecSchema } from '../types/task.js';

/**
 * implementFeature Workflow (mastra_orchestrator_spec.md §5.2)
 *
 * Linear skeleton implementation:
 * - Step 1: interpret_spec - Run Spec Interpreter Agent to parse spec
 * - Step 2: return_result - Return success + TaskSpec
 *
 * No actual coding, testing, or git operations in v0.1
 */

const implementFeatureInputSchema = z.object({
  specPath: z.string().describe('Path to the feature specification'),
  featureDescription: z.string().describe('Free-text description of the feature'),
});

type ImplementFeatureInput = z.infer<typeof implementFeatureInputSchema>;

/**
 * Create fallback TaskSpec when agent fails
 */
function createFallbackTaskSpec(input: ImplementFeatureInput): TaskSpec {
  const fallback: TaskSpec = {
    taskId: `task-${Date.now()}`,
    title: 'Feature Implementation Task',
    description: input.featureDescription,
    goals: ['Implement feature according to spec'],
    nonGoals: [],
    constraints: [],
    acceptanceCriteria: ['Feature works as specified', 'Tests pass'],
    affectedModules: [],
    timestamp: new Date().toISOString(),
  };
  return fallback;
}

/**
 * Execute the implementFeature workflow
 */
export async function executeImplementFeature(
  input: ImplementFeatureInput,
): Promise<z.infer<typeof ImplementFeatureResultSchema>> {
  console.log(`[implementFeature] Starting workflow for: ${input.specPath}`);

  // Step 1: Interpret spec using the agent
  let taskSpec: TaskSpec;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const agentResponse = await specInterpreterAgent.generate(
      `Please interpret this spec and return valid JSON:
      
Spec Path: ${input.specPath}
Feature Description: ${input.featureDescription}

Return ONLY a JSON object matching this structure:
{
  "taskId": "string",
  "title": "string",
  "description": "string",
  "goals": ["string"],
  "nonGoals": ["string"],
  "constraints": ["string"],
  "acceptanceCriteria": ["string"],
  "affectedModules": ["string"],
  "timestamp": "ISO string"
}`,
    );

    console.log(`[interpretSpec] Agent response received`);

    // Extract JSON from response - handle both string and object responses
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

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch?.[0];
    const parsed: unknown = jsonString ? JSON.parse(jsonString) : null;

    // Validate and coerce to TaskSpec
    taskSpec = TaskSpecSchema.parse(parsed || {});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[interpretSpec] Agent response parsing failed, using fallback: ${errorMessage}`);
    // Fallback to mock TaskSpec
    taskSpec = createFallbackTaskSpec(input);
  }

  // Step 2: Return result
  console.log(`[returnResult] Returning result for: ${taskSpec.title}`);

  return {
    success: true,
    taskSpec,
    message: `Feature spec interpreted: ${taskSpec.title}`,
    timestamp: new Date().toISOString(),
  };
}

// Export input/output schemas for Mastra registration
export const implementFeatureWorkflow = {
  name: 'implementFeature',
  description:
    'Implement a feature according to a specification. Skeleton v0.1: interprets spec only.',
  inputSchema: implementFeatureInputSchema,
  outputSchema: ImplementFeatureResultSchema,
  execute: executeImplementFeature,
};
