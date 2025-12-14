/**
 * @file Tests for @repo/indexer-utils exports
 * @description Verify all public exports are available
 * @reference testing_specification.md §3.6.1 (test file structure)
 * @reference config-schema-cli-refactoring.md §4 (Phase 3: migration validation)
 */

import { describe, it, expect } from 'vitest';

import {
  TextFormatter,
  JsonFormatter,
  OutputHandler,
  type OutputFormat,
  type JsonOutput,
} from './index.js';

describe('indexer-utils exports (testing_specification.md §3.6.1)', () => {
  it('exports TextFormatter class', () => {
    expect(TextFormatter).toBeDefined();
    expect(typeof TextFormatter.section).toBe('function');
    expect(typeof TextFormatter.pair).toBe('function');
  });

  it('exports JsonFormatter class', () => {
    expect(JsonFormatter).toBeDefined();
    expect(typeof JsonFormatter.create).toBe('function');
  });

  it('exports OutputHandler class', () => {
    expect(OutputHandler).toBeDefined();
    const handler = new OutputHandler('text');
    expect(handler).toBeInstanceOf(OutputHandler);
  });

  it('exports OutputFormat type', () => {
    const format: OutputFormat = 'json';
    expect(format).toBe('json');
  });

  it('exports JsonOutput type', () => {
    const output: JsonOutput = {
      command: 'test',
      timestamp: new Date().toISOString(),
    };
    expect(output.command).toBe('test');
  });
});
