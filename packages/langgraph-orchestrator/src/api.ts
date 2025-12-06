/**
 * Public API surface for LangGraph orchestrator.
 * Spec reference: langgraph_orchestrator_spec.md §10.2
 */
import { HumanMessage } from '@langchain/core/messages';

import { buildAnswerQuestionGraph } from './graphs/answer-question.js';
import { TaskStateType } from './state/annotations.js';
import { AnswerQuestionInput, AnswerQuestionResult, ToolCallSummary } from './state/types.js';

function extractToolCalls(state: TaskStateType): ToolCallSummary[] {
  const calls: ToolCallSummary[] = [];

  for (const msg of state.messages) {
    if ('tool_calls' in msg && Array.isArray(msg.tool_calls)) {
      for (const call of msg.tool_calls as Array<{ name: string; args: unknown }>) {
        calls.push({
          name: call.name,
          args: call.args,
          result: null,
          duration: 0,
        });
      }
    }
  }

  return calls;
}

export async function answerQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionResult> {
  const graph = buildAnswerQuestionGraph();

  const result = await graph.invoke({
    messages: [new HumanMessage(input.question)],
    taskContext: { repoPath: input.repoPath, maxDepth: input.maxDepth },
    result: null,
  });

  const lastMessage = result.messages.at(-1);
  let answer = '';
  if (lastMessage && 'content' in lastMessage && typeof lastMessage.content === 'string') {
    answer = lastMessage.content;
  }

  return {
    answer,
    toolCalls: extractToolCalls(result),
    tokens: null,
  };
}
