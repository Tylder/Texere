/**
 * @file JSON Schema Generator for Indexer Configuration
 * @description Generates JSON Schema 7 from Zod schemas for IDE integration and validation
 * @reference configuration_spec.md §1 (config file format)
 * @reference testing_specification.md §3.6–3.7 (dependency injection for testability)
 */

import { zodToJsonSchema } from 'zod-to-json-schema';

import { indexerConfigSchema } from './config-schema.js';

/**
 * Generate JSON Schema 7 for the complete Texere Indexer configuration.
 * Used for IDE autocomplete, validation, and documentation.
 *
 * @returns Valid JSON Schema 7 object describing .indexer-config.json structure
 * @reference https://json-schema.org/draft/2020-12/schema (JSON Schema standard)
 *
 * @example
 * ```typescript
 * const schema = generateIndexerConfigJsonSchema();
 * // Write to .vscode/settings.json or docs/schemas/indexer-config.schema.json
 * ```
 */
export function generateIndexerConfigJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(indexerConfigSchema, {
    name: 'IndexerConfig',
    $refStrategy: 'none', // Inline all refs for single-file schema
  });
}

/**
 * Configuration for IDE JSON schema validation.
 * Users should add this to their .vscode/settings.json or IDE config.
 */
export const ideConfigSchemaLocation = {
  fileMatch: ['.indexer-config.json', '.indexer-config.*.json'],
  url: './node_modules/@repo/indexer-core/dist/schemas/indexer-config.schema.json',
};

/**
 * VSCode settings snippet for IDE integration.
 * Users can copy this into their .vscode/settings.json.
 */
export const vscodeJsonSchemasSnippet = {
  'json.schemas': [
    {
      fileMatch: ['.indexer-config.json', '.indexer-config.*.json'],
      url: './node_modules/@repo/indexer-core/dist/schemas/indexer-config.schema.json',
      description: 'Texere Indexer configuration schema',
    },
  ],
};
