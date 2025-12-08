/**
 * Classifier node: calls LLM to classify text with validation and retry.
 * Spec reference: langgraph_orchestrator_spec.md §5.2, §7 (PoC workflows)
 *
 * Best practices applied:
 * - Zod schema validation for type safety
 * - Robust JSON extraction from LLM output
 * - Retry logic with error feedback (max 3 attempts)
 * - Structured output constraints in prompt
 * - Detailed error tracking
 */
import { SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

import { initializeLLM } from '../adapters/llm-adapter.js';
import type { ClassifyStateType } from '../state/annotations.js';
import {
  type ClassificationResult,
  ClassificationResultSchema,
} from '../state/classifier-types.js';

export interface ClassifierNodeResult {
  messages: unknown[];
  classification: ClassificationResult;
}

/**
 * Extract JSON object from text that may contain extra whitespace,
 * markdown formatting, or surrounding text.
 *
 * Handles cases like:
 * - ```json { ... } ```
 * - "Here's the result: { ... }"
 * - { ... } followed by text
 */
function extractJsonFromText(text: string): Record<string, unknown> | null {
  // Remove markdown code blocks if present
  const cleanText = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');

  // Look for JSON object pattern (handles nested structures)
  const jsonMatch = cleanText.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Build system prompt with strict output format guidance.
 * Uses category constraints to help guide LLM output.
 */
function buildSystemPrompt(categories: string[]): string {
  const categoryList = categories.join('", "');
  return `You are a text classifier. Classify the given text into one of these categories ONLY: "${categoryList}"

Your response MUST be ONLY a valid JSON object with no additional text, no markdown, no explanations.
Use exactly this format:
{
  "label": "<one of the provided categories>",
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "<brief explanation of why this category>"
}

Important:
- label MUST be one of the provided categories
- confidence MUST be a number between 0.0 and 1.0
- Always use lowercase for boolean values and numeric values
- Do not include markdown code blocks or any text outside the JSON`;
}

/**
 * Attempt to parse and validate classification response.
 * Returns parsed result or null if parsing/validation fails.
 */
function tryParseClassification(content: string): {
  result: ClassificationResult | null;
  error: string | null;
} {
  try {
    const jsonData = extractJsonFromText(content);
    if (!jsonData) {
      return {
        result: null,
        error: 'No valid JSON found in response',
      };
    }

    const parsed = ClassificationResultSchema.parse(jsonData);
    return {
      result: parsed,
      error: null,
    };
  } catch (err) {
    const errorMessage = err instanceof z.ZodError ? err.errors[0]?.message : String(err);
    return {
      result: null,
      error: `Validation failed: ${errorMessage}`,
    };
  }
}

/**
 * Retry logic with exponential backoff and error feedback.
 * Maximum 3 attempts to get valid classification.
 */
async function classifyWithRetry(
  state: ClassifyStateType,
  categories: string[],
  maxAttempts: number = 3,
): Promise<ClassificationResult> {
  const { model } = initializeLLM();

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const systemPrompt = buildSystemPrompt(categories);
    const systemMsg = lastError
      ? new SystemMessage(
          `${systemPrompt}\n\nPrevious attempt failed. Error: ${lastError}\nPlease fix this and respond with ONLY valid JSON.`,
        )
      : new SystemMessage(systemPrompt);

    try {
      const response = (await model.invoke([systemMsg, ...state.messages])) as unknown;

      const content =
        typeof response === 'object' &&
        response !== null &&
        'content' in response &&
        typeof (response as Record<string, unknown>).content === 'string'
          ? (response as Record<string, unknown>).content
          : '';

      const { result, error } = tryParseClassification(content as string);

      if (result) {
        // Success on this attempt
        console.log(`Classification succeeded on attempt ${attempt}`);
        return result;
      }

      // Store error for next retry feedback
      lastError = error;
      console.log(
        `Attempt ${attempt}/${maxAttempts} failed: ${error}. Retrying with error feedback...`,
      );

      // Exponential backoff before retry
      if (attempt < maxAttempts) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    } catch (err) {
      lastError = `LLM call error: ${String(err)}`;
      console.log(`Attempt ${attempt}/${maxAttempts} LLM error: ${lastError}. Retrying...`);

      if (attempt < maxAttempts) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries failed - return validated fallback
  console.warn(`All ${maxAttempts} attempts failed. Using fallback classification.`);
  return {
    label: 'unknown',
    confidence: 0,
    reasoning: `Failed to classify after ${maxAttempts} attempts. Last error: ${lastError}`,
  };
}

/**
 * Classifier node: main entry point.
 * Orchestrates LLM call with validation and retry logic.
 */
export async function classifierNode(state: ClassifyStateType): Promise<ClassifierNodeResult> {
  // Extract categories from the messages for constraint-guided prompting
  const categoriesStr = state.messages
    .map((msg) => {
      if ('content' in msg && typeof msg.content === 'string') {
        // Try to extract categories from message
        const match = msg.content.match(/categories?:?\s*(.+?)(?:\n|$)/i);
        return match?.[1];
      }
      return null;
    })
    .filter(Boolean)
    .join(', ');

  const categories = categoriesStr ? categoriesStr.split(',').map((c) => c.trim()) : [];

  // Run classification with retry logic
  const classification = await classifyWithRetry(state, categories);

  // Get the original response for messages history
  const { model } = initializeLLM();
  const systemPrompt = new SystemMessage(buildSystemPrompt(categories));
  const response = (await model.invoke([systemPrompt, ...state.messages])) as unknown;

  return {
    messages: [response],
    classification,
  };
}
