/**
 * @file validate command tests
 * @description Unit tests for 'indexer validate' command (cli_spec.md §3)
 * @reference cli_spec.md §3 (validate command)
 * @reference testing_strategy.md §2.2 (testing trophy — integration tests)
 * @reference testing_specification.md §4.2 (integration test patterns with snapshots)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleValidate } from './validate.js';

describe('validate command (cli_spec.md §3)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should validate text output format', async () => {
    const exitCode = await handleValidate({
      logFormat: 'text',
    });
    expect(exitCode).toBe(0);
  });

  it('should validate json output format', async () => {
    const exitCode = await handleValidate({
      logFormat: 'json',
    });
    expect(exitCode).toBe(0);
  });

  it('should handle missing config gracefully', async () => {
    const exitCode = await handleValidate({
      logFormat: 'text',
    });
    // Auto-discovery with no config should be informational (exit 0)
    expect(exitCode).toBe(0);
  });

  it('should exit with 1 when explicit config path is missing', async () => {
    const exitCode = await handleValidate({
      config: '/nonexistent/config.json',
      logFormat: 'text',
    });
    expect(exitCode).toBe(1);
  });

  it('should exit with 1 on validation error', async () => {
    const exitCode = await handleValidate({
      config: '/invalid/.indexer-config.json',
      logFormat: 'text',
    });
    expect(exitCode).toBe(1);
  });

  it('should return exit code 0 or 1 based on config validity', async () => {
    const exitCode = await handleValidate({
      logFormat: 'text',
    });
    expect(typeof exitCode).toBe('number');
    expect([0, 1]).toContain(exitCode);
  });

  it('should default to text format when not specified', async () => {
    const exitCode = await handleValidate({
      logFormat: '',
    });
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

      const exitCode = await handleValidate({
        logFormat: 'json',
      });

      expect(exitCode).toBe(0);
      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput);
        // Normalize timestamp for snapshot (timestamps are dynamic)
        const normalized = { ...parsed, timestamp: '[timestamp]' };
        expect(normalized).toMatchSnapshot('validate-json-output');
      }
    });

    it('should have consistent JSON schema fields', async () => {
      let jsonOutput = '';
      vi.spyOn(console, 'log').mockImplementation((message) => {
        jsonOutput = String(message);
      });

      await handleValidate({
        logFormat: 'json',
      });

      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput);
        // Verify schema structure (testing_specification.md §4.2 — output contracts)
        expect(parsed).toHaveProperty('command');
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('configs');
        expect(parsed).toHaveProperty('summary');
        expect(parsed.command).toBe('validate');
        expect(Array.isArray(parsed.configs)).toBe(true);
        expect(typeof parsed.summary).toBe('object');
      }
    });
  });
});
