import { Agent } from '@mastra/core';

import { readSpecTool } from '../tools/read-spec.js';

/**
 * Spec Interpreter Agent (mastra_orchestrator_spec.md §4.2)
 *
 * v0.1 Placeholder: Uses mock agent
 * Reads SPEC.md, AGENTS.md, tickets, and user prompts.
 * Outputs a normalized, structured TaskSpec including:
 * - Goals, non-goals
 * - Constraints and assumptions
 * - Explicit acceptance criteria
 * - Affected modules / domains
 *
 * TODO v0.2: Real Ollama integration (waiting for Mastra 1.0 stable)
 */

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const specInterpreterAgent = new Agent({
  id: 'spec-interpreter',
  name: 'spec-interpreter',
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

Be precise and structured. Return JSON only.`,
  tools: {
    readSpec: readSpecTool,
  },
  // v0.2: Wire actual Ollama provider
  // For now, use a placeholder to avoid network failures in tests
  model: 'placeholder/llama3.2:3b',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;
