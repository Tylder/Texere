import { z } from 'zod';

/**
 * TaskSpec Schema (from mastra_orchestrator_spec.md §4.2)
 * Normalized task specification output by Spec Interpreter Agent
 */
export const TaskSpecSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string(),
  goals: z.array(z.string()),
  nonGoals: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()),
  affectedModules: z.array(z.string()).optional(),
  timestamp: z.string(),
});

export type TaskSpec = z.infer<typeof TaskSpecSchema>;

/**
 * Workflow result for implementFeature
 */
export const ImplementFeatureResultSchema = z.object({
  success: z.boolean(),
  taskSpec: TaskSpecSchema,
  message: z.string(),
  timestamp: z.string(),
});

export type ImplementFeatureResult = z.infer<typeof ImplementFeatureResultSchema>;
