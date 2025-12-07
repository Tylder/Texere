/**
 * Tools node: executes tool calls from agent response.
 * Spec reference: langgraph_orchestrator_spec.md §6.3, §9.3
 */
import { ToolMessage } from '@langchain/core/messages';

import { buildToolRegistry } from '../adapters/tool-adapter.js';
import type { TaskStateType } from '../state/annotations.js';

export interface ToolsNodeResult {
  messages: ToolMessage[];
}

export async function toolsNode(state: TaskStateType): Promise<ToolsNodeResult> {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !('tool_calls' in lastMessage)) {
    return { messages: [] };
  }

  const tools = buildToolRegistry();
  const toolsByName: Record<string, (typeof tools)[number]> = {};
  for (const tool of tools) {
    toolsByName[tool.name] = tool;
  }

  const results: ToolMessage[] = [];

  // Extract tool_calls safely with type guard
  const toolCalls = Array.isArray(lastMessage.tool_calls)
    ? (lastMessage.tool_calls as Array<{ name: string; id?: string; args: unknown }>)
    : [];

  for (const toolCall of toolCalls) {
    try {
      const tool = toolsByName[toolCall.name];
      if (!tool) {
        results.push(
          new ToolMessage({
            tool_call_id: toolCall.id || '',
            content: JSON.stringify({
              error: `Tool ${toolCall.name} not found`,
            }),
            name: toolCall.name,
          }),
        );
        continue;
      }

      // LangChain tools accept the args directly via invoke
      // Use 'as unknown' to bypass type constraints for dynamic tool calling
      const output = await (tool.invoke as (arg: unknown) => Promise<unknown>)(toolCall.args);
      results.push(
        new ToolMessage({
          tool_call_id: toolCall.id || '',
          content: JSON.stringify(output),
          name: toolCall.name,
        }),
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push(
        new ToolMessage({
          tool_call_id: toolCall.id || '',
          content: JSON.stringify({
            error: errorMessage,
          }),
          name: toolCall.name,
        }),
      );
    }
  }

  return { messages: results };
}
