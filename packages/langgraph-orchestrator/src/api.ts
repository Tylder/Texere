/**
 * Public API surface for LangGraph orchestrator.
 * Spec reference: langgraph_orchestrator_spec.md §10.2
 */
import { HumanMessage } from '@langchain/core/messages';

import { buildAnswerQuestionGraph } from './graphs/answer-question.js';
import { buildClassifyGraph } from './graphs/classify-text.js';
import type { ClassifyStateType, TaskStateType } from './state/annotations.js';
import type { ClassifyTextInput, ClassifyTextResult } from './state/classifier-types.js';
import type { AnswerQuestionInput, AnswerQuestionResult, ToolCallSummary } from './state/types.js';

function extractToolCalls(state: TaskStateType): ToolCallSummary[] {
  const calls: ToolCallSummary[] = [];

  for (const msg of state.messages) {
    if ('tool_calls' in msg && Array.isArray(msg.tool_calls)) {
      for (const call of msg.tool_calls as unknown as Array<{ name: string; args: unknown }>) {
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
  const result = await (buildAnswerQuestionGraph() as any).invoke({
    messages: [new HumanMessage(input.question)],
    taskContext: { repoPath: input.repoPath, maxDepth: input.maxDepth },
    result: null,
  });

  const resultState = result as TaskStateType;
  const lastMessage = resultState.messages.at(-1);
  let answer = '';
  if (
    lastMessage &&
    typeof lastMessage === 'object' &&
    lastMessage !== null &&
    'content' in lastMessage
  ) {
    const content = (lastMessage as unknown as Record<string, unknown>).content;
    if (typeof content === 'string') {
      answer = content;
    }
  }

  return {
    answer,
    toolCalls: extractToolCalls(resultState),
    tokens: null,
  };
}

export async function classifyText(input: ClassifyTextInput): Promise<ClassifyTextResult> {
  const categoriesStr = input.categories.join(', ');
  const userMessage = new HumanMessage(
    `Classify this text into one of these categories: ${categoriesStr}\n\nText: "${input.text}"`,
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
  const result = await (buildClassifyGraph() as any).invoke({
    messages: [userMessage],
    classification: null,
  });

  const resultState = result as ClassifyStateType;
  const classification = resultState.classification as unknown;

  const classificationResult =
    classification &&
    typeof classification === 'object' &&
    'label' in classification &&
    'confidence' in classification &&
    'reasoning' in classification
      ? {
          label: String((classification as Record<string, unknown>).label),
          confidence: Number((classification as Record<string, unknown>).confidence),
          reasoning: String((classification as Record<string, unknown>).reasoning),
        }
      : {
          label: 'unknown',
          confidence: 0,
          reasoning: 'No classification result',
        };

  return {
    classification: classificationResult,
  };
}
