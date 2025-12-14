/**
 * @file Generate JSON Schema File
 * @description One-time test to generate the JSON schema file for IDE integration
 * @reference testing_specification.md §3–7
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, it } from 'vitest';

import { generateIndexerConfigJsonSchema } from './schema-generator.js';

describe('Generate Schema File', () => {
  it('generates and writes schema to docs/schemas/indexer-config.schema.json', () => {
    const schema = generateIndexerConfigJsonSchema();

    // Resolve path relative to monorepo root (4 levels up: core/src -> core -> packages -> root)
    const repoRoot = path.resolve(__dirname, '../../../..');
    const schemaDir = path.join(repoRoot, 'docs', 'schemas');
    const schemaPath = path.join(schemaDir, 'indexer-config.schema.json');

    // Ensure directory exists
    fs.mkdirSync(schemaDir, { recursive: true });

    // Write schema to file
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

    // Verify file was written
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Zod generates schemas with $ref and definitions
    // Either a $ref at root or properties at root is valid
    if (!parsed['$ref'] && !parsed.properties) {
      if (!parsed.definitions || Object.keys(parsed.definitions).length === 0) {
        throw new Error('Generated schema is missing expected structure');
      }
    }

    console.log(`✓ Schema written to ${schemaPath}`);
  });
});
