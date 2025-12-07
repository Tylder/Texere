/**
 * Tests for text classification API.
 * Spec reference: langgraph_orchestrator_spec.md §7.1; testing_specification.md §3, §7
 */
import { describe, expect, it, vi } from 'vitest';

import { classifyText } from './api.js';

// Mock LLM to avoid real API calls
vi.mock('./adapters/llm-adapter', () => ({
  initializeLLM: () => ({
    model: {
      invoke: vi.fn(() =>
        Promise.resolve({
          content: JSON.stringify({
            label: 'positive',
            confidence: 0.95,
            reasoning: 'Contains positive sentiment indicators',
          }),
          tool_calls: [],
        }),
      ),
    },
    modelWithTools: {
      invoke: vi.fn(),
    },
    tools: [],
  }),
}));

describe('classifyText (langgraph_orchestrator_spec.md §7)', () => {
  it('should return ClassifyTextResult with classification', async () => {
    const result = await classifyText({
      text: 'I love this product!',
      categories: ['positive', 'negative', 'neutral'],
    });

    expect(result).toHaveProperty('classification');
    expect(result.classification).toHaveProperty('label');
    expect(result.classification).toHaveProperty('confidence');
    expect(result.classification).toHaveProperty('reasoning');
    expect(result.classification.label).toBe('positive');
    expect(result.classification.confidence).toBeGreaterThanOrEqual(0);
    expect(result.classification.confidence).toBeLessThanOrEqual(1);
  });

  it('should handle fallback when classification is null', async () => {
    vi.doMock('./adapters/llm-adapter', () => ({
      initializeLLM: () => ({
        modelWithTools: {
          invoke: vi.fn(() =>
            Promise.resolve({
              content: 'Some response',
              tool_calls: [],
            }),
          ),
        },
      }),
    }));

    const result = await classifyText({
      text: 'Test text',
      categories: ['a', 'b'],
    });

    expect(result.classification.label).toBeDefined();
    expect(result.classification.confidence).toBeDefined();
  });
});
