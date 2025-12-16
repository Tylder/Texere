/**
 * @file Generate JSON Schema for IDE Integration
 * @description Generates indexer-config.schema.json as an IDE integration artifact
 *
 * Usage: pnpm generate:schema
 *
 * This script generates the schema file for IDE integration (VSCode, JetBrains, etc.).
 * It is NOT run as part of tests or automatic builds. Schema generation must be
 * explicit to maintain separation of concerns.
 *
 * The generated file is checked into git and used for JSON schema validation
 * in IDEs when editing .indexer-config.json files.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import from dist (requires build first)
import { generateIndexerConfigJsonSchema } from '../dist/schema-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const schemaDir = path.join(repoRoot, 'docs', 'schemas');
const schemaPath = path.join(schemaDir, 'indexer-config.schema.json');

try {
  // Ensure directory exists
  fs.mkdirSync(schemaDir, { recursive: true });

  // Generate and write schema
  const schema = generateIndexerConfigJsonSchema();
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');

  console.log(`✓ Schema generated: ${schemaPath}`);
  process.exit(0);
} catch (error) {
  console.error(`✗ Failed to generate schema: ${error.message}`);
  process.exit(1);
}
