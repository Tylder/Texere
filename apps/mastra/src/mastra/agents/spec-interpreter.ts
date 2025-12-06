import { createOllama } from 'ollama-ai-provider-v2';

import { Agent } from '@mastra/core';

import { readSpecTool } from '../tools/read-spec.js';

/**
 * Spec Interpreter Agent (mastra_orchestrator_spec.md §4.2)
 *
 * Reads SPEC.md, AGENTS.md, tickets, and user prompts.
 * Outputs a normalized, structured TaskSpec including:
 * - Goals, non-goals
 * - Constraints and assumptions
 * - Explicit acceptance criteria
 * - Affected modules / domains
 *
 * Uses Ollama for local LLM inference via ollama-ai-provider-v2
 * Reference: mastra_orchestrator_spec.md §2.3, §8.1
 */

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q5_K_S';
const ollamaProvider = createOllama({
  baseURL: ollamaBaseUrl,
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const specInterpreterAgent = new Agent({
  id: 'spec-interpreter',
  name: 'Spec Interpreter',
  instructions: `You are the Spec Interpreter Agent.

Your job is to read specifications and user prompts, then output a structured TaskSpec.

The TaskSpec must include:
1. taskId: A unique identifier for this task
2. title: Brief title of the task
3. description: Detailed description
4. goals: Array of explicit goals
5. nonGoals: Array of explicit non-goals
6. constraints: Any constraints or assumptions
7. acceptanceCriteria: Explicit acceptance criteria (testable)
8. affectedModules: Modules or areas affected
9. timestamp: ISO timestamp when spec was interpreted

Be precise and structured. Return valid JSON only.`,
  tools: {
    readSpec: readSpecTool,
  },
  model: ollamaProvider(ollamaModel),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;
