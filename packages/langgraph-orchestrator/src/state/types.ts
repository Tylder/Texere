/**
 * Shared types for LangGraph orchestrator state.
 * Spec reference: langgraph_orchestrator_spec.md §5.1
 */
import { z } from 'zod';

export interface TaskContext {
  repoPath: string;
  maxDepth?: number;
}

export interface ToolCallSummary {
  name: string;
  args: unknown;
  result: unknown;
  duration: number;
}

export interface WorkflowResult {
  answer?: string;
  toolCalls: ToolCallSummary[];
  tokens?: {
    input: number;
    output: number;
  };
}

export const AnswerQuestionInputSchema = z.object({
  repoPath: z.string().describe('Path to repository'),
  question: z.string().describe('Question to answer'),
  maxDepth: z.number().optional().describe('Max tool iterations'),
});

export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

export interface AnswerQuestionResult {
  answer: string;
  toolCalls: ToolCallSummary[];
  tokens: { input: number; output: number } | null;
}
