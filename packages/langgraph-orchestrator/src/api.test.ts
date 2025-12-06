/**
 * Tests for orchestrator API surface.
 * Spec reference: langgraph_orchestrator_spec.md §7.1; testing_specification.md §3, §7
 */
import { describe, expect, it, vi } from 'vitest';

import { answerQuestion } from './api';

// Mock LLM to avoid real API calls
vi.mock('./adapters/llm-adapter', () => ({
  initializeLLM: () => ({
    model: {},
    modelWithTools: {
      invoke: vi.fn(() =>
        Promise.resolve({
          content: 'Files found: src/index.ts, package.json',
          tool_calls: [],
        }),
      ),
    },
    tools: [],
  }),
}));

describe('answerQuestion (langgraph_orchestrator_spec.md §7.1)', () => {
  it('should return AnswerQuestionResult with answer and toolCalls', async () => {
    const result = await answerQuestion({
      repoPath: '/tmp/test-repo',
      question: 'List the files',
    });

    expect(result).toHaveProperty('answer');
    expect(result).toHaveProperty('toolCalls');
    expect(result).toHaveProperty('tokens');
    expect(Array.isArray(result.toolCalls)).toBe(true);
  });
});
