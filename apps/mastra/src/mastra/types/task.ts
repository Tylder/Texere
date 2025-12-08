import { z } from 'zod';

/**
 * Task Specifications (mastra_orchestrator_spec.md §5.1, §4.2)
 *
 * Core types for task context and spec interpretation
 */

export const TaskSpecSchema = z.object({
  taskId: z.string().describe('Unique identifier for the task'),
  title: z.string().describe('Brief title of the task'),
  description: z.string().describe('Detailed description of the task'),
  goals: z.array(z.string()).describe('Array of explicit goals'),
  nonGoals: z.array(z.string()).optional().describe('Explicit non-goals'),
  constraints: z.array(z.string()).optional().describe('Constraints or assumptions'),
  acceptanceCriteria: z.array(z.string()).describe('Explicit acceptance criteria'),
  affectedModules: z.array(z.string()).optional().describe('Modules or domains affected'),
  timestamp: z.string().describe('ISO timestamp when spec was interpreted'),
});

export type TaskSpec = z.infer<typeof TaskSpecSchema>;

export const ImplementFeatureResultSchema = z.object({
  success: z.boolean(),
  taskSpec: TaskSpecSchema,
  message: z.string(),
  timestamp: z.string(),
});

export type ImplementFeatureResult = z.infer<typeof ImplementFeatureResultSchema>;
