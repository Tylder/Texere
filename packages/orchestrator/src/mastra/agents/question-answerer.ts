import { Agent } from '@mastra/core';

import { mockCodeSearchTool } from '../tools/mock-code-search.js';

/**
 * Question Answerer Agent - read-only agent for codebase Q&A.
 * Per spec §4.2 (Agent Roles) and §5.5 (Q&A Workflow).
 *
 * TODO: Wire Ollama provider for model in v0.2
 */
export const questionAnswererAgent = new Agent({
  name: 'question-answerer',
  instructions: `You are a helpful assistant that answers questions about a codebase.
You have access to a code search tool to find relevant information.
When answering:
1. Use the code search tool to find relevant code snippets if needed.
2. Provide clear, concise answers with code context.
3. If you cannot find relevant information, say so clearly.`,
  model: 'placeholder/llama3.2:3b',
  tools: {
    mockCodeSearch: mockCodeSearchTool,
  },
});
