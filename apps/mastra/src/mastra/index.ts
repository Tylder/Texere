import { Mastra } from '@mastra/core/mastra';

/**
 * Texere Mastra Instance
 *
 * Central entry point for all Mastra agents, workflows, and tools.
 * Agents and workflows are registered here and exposed via Studio and REST API.
 */
export const mastra: Mastra = new Mastra({
  server: {
    port: 4111,
    host: '0.0.0.0',
  },
  // Agents and workflows will be registered here as they are created
  // Example: agents: { /* agent definitions */ }
});
