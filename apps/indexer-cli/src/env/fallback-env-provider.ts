import type { EnvironmentProvider } from '@repo/indexer-core';

const DEFAULT_ENV_FALLBACKS: Record<string, string> = {
  NEO4J_URI: 'bolt://localhost:7687',
  NEO4J_USER: 'neo4j',
  NEO4J_PASSWORD: 'password',
  QDRANT_URL: 'http://localhost:6333',
  OPENAI_API_KEY: '[REDACTED:api-key]',
};

/**
 * Provide non-empty defaults for env var expansion so read-only commands
 * (validate/list/status) do not fail when env vars are unset during testing.
 * @reference configuration_spec.md §2 (env var substitution)
 */
export function createFallbackEnvProvider(): EnvironmentProvider {
  return {
    get(varName: string): string | undefined {
      return process.env[varName] || DEFAULT_ENV_FALLBACKS[varName];
    },
  };
}
