/**
 * @file Generate JSON Schema File
 * @description Tests schema generation validates structure (testing_specification.md §3.1–§7)
 *
 * NOTE: Schema file generation for IDE integration should happen during build, not tests.
 * This test validates schema correctness in-memory without writing to the repo.
 * A build script (scripts/generate-indexer-schema.mjs) handles artifact generation.
 *
 * @reference testing_specification.md §3–7 (test isolation, cleanup)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateIndexerConfigJsonSchema } from './schema-generator.js';

describe('Generate Schema File (testing_specification.md §3.1 – test isolation)', () => {
  let tmpDir: string;

  beforeEach(() => {
    // Create unique temp directory for this test (per-test isolation)
    const prefix = path.join(os.tmpdir(), 'indexer-schema-test-');
    tmpDir = fs.mkdtempSync(prefix);
  });

  afterEach(() => {
    // Clean up temp directory (test cleanup responsibility)
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('generates valid JSON schema structure for IDE integration', () => {
    const schema = generateIndexerConfigJsonSchema();

    // Validate schema structure in-memory (no file I/O needed)
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');

    // Zod generates schemas with either $ref or properties at root
    const hasRef = '$ref' in schema;
    const hasProperties = 'properties' in schema;
    const hasDefinitions =
      'definitions' in schema && Object.keys(schema.definitions || {}).length > 0;

    expect(hasRef || hasProperties || hasDefinitions).toBe(true);
  });

  it('serializes schema to valid JSON', () => {
    const schema = generateIndexerConfigJsonSchema();

    // Verify it can be serialized to JSON (roundtrip test)
    const json = JSON.stringify(schema, null, 2);
    expect(json).toBeDefined();
    expect(json.length).toBeGreaterThan(0);

    // Verify it can be parsed back
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(schema);
  });

  it('writes schema to temp file for validation', () => {
    const schema = generateIndexerConfigJsonSchema();

    // Write to temp directory (isolated, cleaned up after test)
    const schemaPath = path.join(tmpDir, 'indexer-config.schema.json');
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

    // Verify temp file was written correctly
    expect(fs.existsSync(schemaPath)).toBe(true);

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(schema);

    // Note: File is automatically cleaned up in afterEach
  });
});
