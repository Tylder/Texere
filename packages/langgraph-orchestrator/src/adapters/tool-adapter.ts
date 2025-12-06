/**
 * Tool adapter: wraps pure tool functions for LangGraph.
 * Spec reference: langgraph_orchestrator_spec.md §6.2, §6.3
 */
import { z } from 'zod';

import { tool as langchainTool } from '@langchain/core/tools';

/**
 * Mock listFiles tool for PoC.
 * In production, would wrap @texere/tools-core functions.
 */
const listFilesMock = (input: { path: string; pattern?: string }) => {
  const { path, pattern } = input;
  // Mock response
  return {
    files: ['src/index.ts', 'src/utils/helpers.ts', 'package.json', 'README.md'],
    count: 4,
    searchPath: path,
    pattern: pattern || '*',
  };
};

/**
 * Build tool registry for agent binding.
 * Spec reference: langgraph_orchestrator_spec.md §9.2
 */
export function buildToolRegistry() {
  const tools = [
    langchainTool((input) => listFilesMock(input), {
      name: 'list_files',
      description: 'List files in a repository directory',
      schema: z.object({
        path: z.string().describe('Directory path'),
        pattern: z.string().optional().describe('File pattern filter'),
      }),
    }),
  ];

  return tools;
}

/**
 * Get tool by name for execution in tools node.
 */
export function getToolByName(name: string) {
  const tools = buildToolRegistry();
  return tools.find((t) => t.name === name);
}
