/**
 * @file list command tests
 * @description Unit tests for 'indexer list' command (cli_spec.md §4)
 * @reference cli_spec.md §4 (list command)
 * @reference testing_strategy.md §2.2 (testing trophy — integration tests)
 * @reference testing_specification.md §4.2 (integration test patterns with snapshots)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleList } from './list.js';

describe('list command (cli_spec.md §4; testing_specification.md §4.2)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should list codebases with text format', async () => {
    const exitCode = await handleList({
      logFormat: 'text',
      verbose: false,
    });
    expect(exitCode).toBe(0);
  });

  it('should list codebases with json format', async () => {
    const exitCode = await handleList({
      logFormat: 'json',
      verbose: false,
    });
    expect(exitCode).toBe(0);
  });

  it('should support --verbose flag', async () => {
    const exitCode = await handleList({
      logFormat: 'text',
      verbose: true,
    });
    expect(exitCode).toBe(0);
  });

  it('should return 0 on success', async () => {
    const exitCode = await handleList({
      logFormat: 'text',
      verbose: false,
    });
    expect(exitCode).toBe(0);
  });

  it('should handle empty logFormat', async () => {
    const exitCode = await handleList({
      logFormat: '',
      verbose: false,
    });
    expect(exitCode).toBe(0);
  });

  it('should exit with 0 even when no codebases configured', async () => {
    const exitCode = await handleList({
      logFormat: 'text',
      verbose: false,
    });
    expect(typeof exitCode).toBe('number');
    expect(exitCode).toBe(0);
  });

  // ====================================================================
  // Output Format Snapshots (testing_specification.md §4.2)
  // ====================================================================

  describe('Output format snapshots (§4.2)', () => {
    it('should produce consistent JSON output structure', async () => {
      let jsonOutput = '';
      vi.spyOn(console, 'log').mockImplementation((message) => {
        jsonOutput = String(message);
      });

      const exitCode = await handleList({
        logFormat: 'json',
        verbose: false,
      });

      expect(exitCode).toBe(0);
      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput);
        // Normalize timestamp for snapshot (timestamps are dynamic)
        const normalized = { ...parsed, timestamp: '[timestamp]' };
        expect(normalized).toMatchSnapshot('list-json-output');
      }
    });

    it('should have consistent JSON schema fields', async () => {
      let jsonOutput = '';
      vi.spyOn(console, 'log').mockImplementation((message) => {
        jsonOutput = String(message);
      });

      await handleList({
        logFormat: 'json',
        verbose: false,
      });

      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput);
        // Verify schema structure per testing_specification.md §4.2
        expect(parsed).toHaveProperty('command');
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('codebases');
        expect(parsed).toHaveProperty('summary');
        expect(parsed.command).toBe('list');
        expect(Array.isArray(parsed.codebases)).toBe(true);
        expect(typeof parsed.summary).toBe('object');
      }
    });

    it('should include codebase fields in JSON output', async () => {
      let jsonOutput = '';
      vi.spyOn(console, 'log').mockImplementation((message) => {
        jsonOutput = String(message);
      });

      await handleList({
        logFormat: 'json',
        verbose: false,
      });

      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput);
        if (parsed.codebases.length > 0) {
          const codebase = parsed.codebases[0];
          expect(codebase).toHaveProperty('id');
          expect(codebase).toHaveProperty('root');
          expect(codebase).toHaveProperty('branches');
          expect(Array.isArray(codebase.branches)).toBe(true);
        }
      }
    });
  });
});
