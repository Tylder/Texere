import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';

import {
  chatLlama31Agent,
  chatLlama32Agent,
  chatMistralAgent,
  chatQwenAgent,
} from './agents/chat.js';
import { simpleReaderAgent } from './agents/simple-reader.js';
import { specInterpreterAgent } from './agents/spec-interpreter.js';

/**
 * Texere Mastra Instance
 *
 * Central entry point for all Mastra agents and tools.
 * Agents are registered here and exposed via Studio and REST API.
 *
 * Configuration:
 * - Model routing: Ollama (local container on localhost:11434)
 * - Server: Port 4111 (configurable via MASTRA_PORT)
 * - Storage: SQLite with dev.db (configurable via DATABASE_URL)
 *
 * Reference: mastra_orchestrator_spec.md §2.3, §8.1, §5.2
 */

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

export const mastra: Mastra = new Mastra({
  server: {
    port: parseInt(process.env.MASTRA_PORT || '4111', 10),
    host: process.env.MASTRA_HOST || '0.0.0.0',
  },

  storage: new LibSQLStore({
    url: databaseUrl,
  }),

  // Agents: Register all agents
  agents: {
    chatLlama32: chatLlama32Agent,
    chatLlama31: chatLlama31Agent,
    chatMistral: chatMistralAgent,
    chatQwen: chatQwenAgent,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    specInterpreter: specInterpreterAgent,
    simpleReader: simpleReaderAgent,
  },

  // Workflows: Registered programmatically via executeImplementFeature(), executeReadRepo()
  // TODO: Re-enable Mastra workflow DSL once v1 API stabilizes
});
