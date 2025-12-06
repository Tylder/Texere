import { createOllama } from 'ollama-ai-provider-v2';

import { Agent } from '@mastra/core';

import { getRepoInfoTool } from '@repo/tools-mastra';

/**
 * Simple Reader Agent (Skeleton v0.1)
 *
 * Very basic agent that can read repository metadata.
 * Used to test basic agent + tool integration with Ollama.
 *
 * Reference: mastra_orchestrator_spec.md §4.2 (Agent Roles)
 */

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q5_K_S';
const ollamaProvider = createOllama({
  baseURL: ollamaBaseUrl,
});

export const simpleReaderAgent = new Agent({
  id: 'simple-reader',
  name: 'Simple Reader',
  instructions: `You are a simple repository reader.

Your job is to:
1. Read repository metadata using the getRepoInfo tool
2. Provide a brief summary of the repository

When the user asks about a repo, call the getRepoInfo tool with the repo ID.
Then summarize what you learn.

Be concise and factual.`,
  tools: {
    getRepoInfo: getRepoInfoTool,
  },
  model: ollamaProvider(ollamaModel),
});
