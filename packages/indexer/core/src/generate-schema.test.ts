/**
 * @file JSON Schema Generation Test
 * @description Generates and validates JSON Schema for .indexer-config.json
 * @reference configuration_spec.md §1 (config file format)
 */

import { describe, it, expect } from 'vitest';

import { generateIndexerConfigJsonSchema } from './schema-generator.js';

describe('JSON Schema Generation', () => {
  it('should generate valid JSON Schema 7', () => {
    const schema = generateIndexerConfigJsonSchema() as Record<string, any>;

    // Verify schema has either $ref or properties (Zod generates with $ref + definitions)
    expect(schema).toBeDefined();
    if (schema['$ref']) {
      expect(schema).toHaveProperty('definitions');
      expect(schema['definitions']['IndexerConfig']).toBeDefined();
    } else {
      expect(schema).toHaveProperty('properties');
    }
  });

  it('should include descriptions for IDE hints', () => {
    const schema = generateIndexerConfigJsonSchema() as Record<string, any>;

    // Zod generates with $ref, so properties are in definitions
    const definitions = schema['definitions'];
    const indexerConfigDef = definitions?.['IndexerConfig'];
    if (indexerConfigDef) {
      const props = indexerConfigDef['properties'] as Record<string, any>;

      // Verify descriptions are present
      expect(props['version']).toHaveProperty('description');
      expect(props['codebases']).toHaveProperty('description');
      expect(props['graph']).toHaveProperty('description');
      expect(props['vectors']).toHaveProperty('description');
    }
  });

  it('should enforce required fields at top level', () => {
    const schema = generateIndexerConfigJsonSchema() as Record<string, any>;

    // Zod generates with $ref, check IndexerConfig definition
    const definitions = schema['definitions'];
    const indexerConfigDef = definitions?.['IndexerConfig'];
    if (indexerConfigDef) {
      const required = indexerConfigDef['required'] as string[];

      expect(required).toBeDefined();
      expect(required).toContain('version');
      expect(required).toContain('codebases');
      expect(required).toContain('graph');
      expect(required).toContain('vectors');
    }
  });

  it('should validate codebase schema structure', () => {
    const schema = generateIndexerConfigJsonSchema() as Record<string, any>;

    // Navigate through definitions to find codebase schema
    const definitions = schema['definitions'];
    const indexerConfigDef = definitions?.['IndexerConfig'];
    if (indexerConfigDef) {
      const codebasesField = indexerConfigDef['properties']['codebases'] as Record<string, any>;
      const codebaseItemSchema = codebasesField['items'] as Record<string, any>;
      const codebaseProps = codebaseItemSchema['properties'] as Record<string, any>;

      // Verify codebase required fields
      expect(codebaseProps).toHaveProperty('id');
      expect(codebaseProps).toHaveProperty('root');
      expect(codebaseProps).toHaveProperty('trackedBranches');
    }
  });

  it('should serialize schema to JSON without errors', () => {
    const schema = generateIndexerConfigJsonSchema();
    const json = JSON.stringify(schema, null, 2);

    // Verify JSON is valid
    expect(json).toBeDefined();
    expect(json.length).toBeGreaterThan(0);

    // Verify round-trip
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(schema);
  });
});
