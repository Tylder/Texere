/**
 * Agent node: calls LLM and returns response.
 * Spec reference: langgraph_orchestrator_spec.md §5.2, §7.1
 */
import { SystemMessage } from '@langchain/core/messages';

import { initializeLLM } from '../adapters/llm-adapter.js';
import type { TaskStateType } from '../state/annotations.js';

export interface AgentNodeResult {
  messages: unknown[];
}

export async function agentNode(state: TaskStateType): Promise<AgentNodeResult> {
  const { modelWithTools } = initializeLLM();

  const systemPrompt = new SystemMessage(
    'You are a helpful assistant. If asked, use the list_files tool to find files. Always be concise.',
  );

  const response = (await modelWithTools.invoke([systemPrompt, ...state.messages])) as unknown;

  return { messages: [response] };
}
