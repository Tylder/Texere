/**
 * Types for text classification workflow.
 * Spec reference: langgraph_orchestrator_spec.md §7 (PoC workflows)
 */
import { z } from 'zod';

export interface ClassificationResult {
  label: string;
  confidence: number;
  reasoning: string;
}

export const ClassifyTextInputSchema = z.object({
  text: z.string().describe('Text to classify'),
  categories: z.array(z.string()).describe('Possible categories'),
});

export type ClassifyTextInput = z.infer<typeof ClassifyTextInputSchema>;

export interface ClassifyTextResult {
  classification: ClassificationResult;
}
