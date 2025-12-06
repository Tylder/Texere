import { createOllama } from 'ollama-ai-provider-v2';

import { Agent } from '@mastra/core';

/**
 * Chat Agents - Multiple models for testing
 *
 * Simple agents for testing Ollama connectivity with different models.
 * No tools, just basic chat functionality.
 *
 * Available models:
 * - llama3.2:3b-instruct-q5_K_S (fastest, 2.1GB)
 * - llama3.1:8b (4.6GB)
 * - mistral:7b (4.1GB)
 * - qwen2.5:7b-instruct-q4_0 (4.1GB)
 *
 * Reference: mastra_orchestrator_spec.md §4.2
 */

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api';
const ollamaProvider = createOllama({
  baseURL: ollamaBaseUrl,
});

const systemPrompt = `You are a helpful AI assistant. Answer questions clearly and concisely.`;

export const chatLlama32Agent = new Agent({
  id: 'chat-llama32',
  name: 'Chat (Llama 3.2 3B - Fast)',
  instructions: systemPrompt,
  model: ollamaProvider('llama3.2:3b-instruct-q5_K_S'),
});

export const chatLlama31Agent = new Agent({
  id: 'chat-llama31',
  name: 'Chat (Llama 3.1 8B)',
  instructions: systemPrompt,
  model: ollamaProvider('llama3.1:8b'),
});

export const chatMistralAgent = new Agent({
  id: 'chat-mistral',
  name: 'Chat (Mistral 7B)',
  instructions: systemPrompt,
  model: ollamaProvider('mistral:7b'),
});

export const chatQwenAgent = new Agent({
  id: 'chat-qwen',
  name: 'Chat (Qwen 2.5 7B)',
  instructions: systemPrompt,
  model: ollamaProvider('qwen2.5:7b-instruct-q4_0'),
});
