/**
 * Conditional router nodes.
 * Spec reference: langgraph_orchestrator_spec.md §5.2, §8.1
 */
import { END } from '@langchain/langgraph';

import type { TaskStateType } from '../state/annotations.js';

/**
 * Route to tools node if agent made tool calls, else END.
 */
export function shouldContinue(state: TaskStateType): string {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage) {
    return END;
  }

  // Check if message has tool_calls (duck typing to avoid version issues with isAIMessage)
  if (
    'tool_calls' in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length > 0
  ) {
    return 'tools';
  }

  return END;
}
