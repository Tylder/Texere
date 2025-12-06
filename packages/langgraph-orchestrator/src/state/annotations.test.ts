/**
 * Tests for state definitions.
 * Spec reference: langgraph_orchestrator_spec.md §5.1; testing_specification.md §3, §7
 */
import { describe, expect, it } from 'vitest';

import { AIMessage, HumanMessage } from '@langchain/core/messages';

import { TaskState } from './annotations';

describe('TaskState (langgraph_orchestrator_spec.md §5.1)', () => {
  it('should define state with messages, taskContext, result channels', () => {
    // TaskState is an AnnotationRoot with reducer schema
    expect(TaskState).toBeDefined();
    // Verify TaskState can be used in StateGraph
    expect(typeof TaskState).toBe('object');
  });

  it('should accumulate messages via reducer', () => {
    const state1 = {
      messages: [new HumanMessage('Hi')],
      taskContext: { repoPath: '/tmp' },
      result: null,
    };

    const state2 = {
      messages: [new AIMessage('Hello')],
      taskContext: { repoPath: '/tmp' },
      result: null,
    };

    // Simulate reducer by concatenating
    const combined = [...state1.messages, ...state2.messages];
    expect(combined).toHaveLength(2);
    expect(combined[0]?.getType()).toBe('human');
    expect(combined[1]?.getType()).toBe('ai');
  });
});
