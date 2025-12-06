/**
 * LLM adapter: initializes ChatOllama with local Ollama endpoint.
 * Spec reference: langgraph_orchestrator_spec.md §10.1
 */
import { ChatOllama } from '@langchain/ollama';

import { buildToolRegistry } from './tool-adapter.js';

/**
 * Initialize LLM with local Ollama endpoint.
 * Environment variables:
 *   - OLLAMA_BASE_URL: Ollama endpoint (default: http://localhost:11434)
 *   - OLLAMA_MODEL: model name (default: llama3.2:3b-instruct-q5_K_S)
 */
export function initializeLLM() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const modelName = process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q5_K_S';

  const model = new ChatOllama({
    baseUrl,
    model: modelName,
    temperature: 0.7,
    // Optional: for local development, disable SSL verification if needed
  });

  const tools = buildToolRegistry();
  const modelWithTools = model.bindTools(tools);

  return { model, modelWithTools, tools };
}
