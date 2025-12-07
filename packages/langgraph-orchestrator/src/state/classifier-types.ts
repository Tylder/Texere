/**
 * Types for text classification workflow.
 * Spec reference: langgraph_orchestrator_spec.md §7 (PoC workflows)
 */
import { z } from 'zod';

/**
 * ClassificationResult schema with validation.
 * Enforces structure returned from LLM with Zod validation.
 */
export const ClassificationResultSchema = z.object({
  label: z.string().describe('Predicted category name'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0.0-1.0'),
  reasoning: z.string().describe('Explanation for classification'),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const ClassifyTextInputSchema = z.object({
  text: z.string().describe('Text to classify'),
  categories: z.array(z.string()).describe('Possible categories'),
});

export type ClassifyTextInput = z.infer<typeof ClassifyTextInputSchema>;

export interface ClassifyTextResult {
  classification: ClassificationResult;
}
