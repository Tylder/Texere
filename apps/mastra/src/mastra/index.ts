import { Mastra } from '@mastra/core/mastra';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { specInterpreterAgent } from './agents/spec-interpreter.js';

/**
 * Texere Mastra Instance
 *
 * Central entry point for all Mastra agents and tools.
 * Agents are registered here and exposed via Studio and REST API.
 *
 * Configuration:
 * - Model routing: Ollama (OLLAMA_BASE_URL, OLLAMA_MODEL env vars)
 * - Server: Port 4111 (configurable via MASTRA_PORT)
 */

export const mastra: Mastra = new Mastra({
  server: {
    port: parseInt(process.env.MASTRA_PORT || '4111'),
    host: process.env.MASTRA_HOST || '0.0.0.0',
  },

  // Agents: Register all agents
  agents: {
    specInterpreter: specInterpreterAgent,
  },

  // Workflows: Registered programmatically via executeImplementFeature()
  // TODO: Re-enable Mastra workflow DSL once v1 API stabilizes
});
