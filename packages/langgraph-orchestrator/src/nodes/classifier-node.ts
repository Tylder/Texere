/**
 * Classifier node: calls LLM to classify text.
 * Spec reference: langgraph_orchestrator_spec.md §5.2, §7 (PoC workflows)
 */
import { SystemMessage } from '@langchain/core/messages';

import { initializeLLM } from '../adapters/llm-adapter.js';
import type { ClassifyStateType } from '../state/annotations.js';

export interface ClassificationResult {
  label: string;
  confidence: number;
  reasoning: string;
}

function parseClassificationResponse(content: string): ClassificationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        label: (parsed.label as string) || 'unknown',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reasoning: (parsed.reasoning as string) || (parsed.explanation as string) || '',
      };
    }
  } catch {
    // Fall back to parsing content
  }

  // Fallback: try to extract first word as label
  const words = content.split(/\s+/);
  return {
    label: words[0] || 'unknown',
    confidence: 0.5,
    reasoning: content,
  };
}

export interface ClassifierNodeResult {
  messages: unknown[];
  classification: ClassificationResult;
}

export async function classifierNode(state: ClassifyStateType): Promise<ClassifierNodeResult> {
  const { modelWithTools } = initializeLLM();

  const systemPrompt = new SystemMessage(
    `You are a text classifier. Classify the given text into one of the provided categories.
Respond ONLY with a JSON object in this format:
{
  "label": "category_name",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}`,
  );

  const response = (await modelWithTools.invoke([systemPrompt, ...state.messages])) as unknown;

  const content =
    typeof response === 'object' &&
    response !== null &&
    'content' in response &&
    typeof (response as Record<string, unknown>).content === 'string'
      ? (response as Record<string, unknown>).content
      : '';
  const classification = parseClassificationResponse(content as string);

  return { messages: [response], classification };
}
