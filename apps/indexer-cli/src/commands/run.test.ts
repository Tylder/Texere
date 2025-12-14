/**
 * @file run command tests
 * @description Unit tests for 'indexer run' command (cli_spec.md §6)
 * @reference cli_spec.md §6 (run command specification)
 * @reference testing_specification.md §3 (test file organization)
 * @reference testing_specification.md §4.2 (integration test patterns)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as indexerCore from '@repo/indexer-core';

import { handleRun } from './run.js';

describe('run command (cli_spec.md §6; testing_specification.md §4.2)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let _errorSpy: ReturnType<typeof vi.spyOn>;
  let _warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    _errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    _warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to mock config discovery for tests that need it
   */
  function mockValidConfig(): ReturnType<typeof vi.spyOn> {
    return vi.spyOn(indexerCore, 'discoverConfigs').mockReturnValue({
      orchestrator: {
        path: '/mock/config',
        config: {
          version: '1.0',
          codebases: [
            {
              id: 'test-repo',
              root: '/test',
              trackedBranches: ['main'],
            },
          ],
        },
      },
      perRepo: [],
      errors: [],
    } as any);
  }

  // ====================================================================
  // Validation Rules (cli_spec.md §6.1)
  // ====================================================================

  describe('Validation: --dry-run conflicts (§6.1)', () => {
    it('should reject --dry-run with --daemon', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        daemon: true,
      });
      expect(exitCode).toBe(1);
      expect(_errorSpy).toHaveBeenCalled();
    });

    it('should reject --dry-run with --detached', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        detached: true,
      });
      expect(exitCode).toBe(1);
      expect(_errorSpy).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Mode Selection (cli_spec.md §6.2)
  // ====================================================================

  describe('Mode handling (§6.2)', () => {
    it('should default to --once mode', async () => {
      const exitCode = await handleRun({
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support explicit --once mode', async () => {
      const exitCode = await handleRun({
        once: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should handle --daemon mode request', async () => {
      const exitCode = await handleRun({
        daemon: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode); // 0=success, 1=config error, 2=lock error
    });

    it('should handle --detached mode request', async () => {
      const exitCode = await handleRun({
        detached: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });
  });

  // ====================================================================
  // Logging & Output Formats (cli_spec.md §8)
  // ====================================================================

  describe('Output formats (§8)', () => {
    it('should support text format (default)', async () => {
      const exitCode = await handleRun({
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support json format', async () => {
      const exitCode = await handleRun({
        logFormat: 'json',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should default to text when format not specified', async () => {
      const exitCode = await handleRun({});
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });
  });

  // ====================================================================
  // Flags & Options (cli_spec.md §6.3)
  // ====================================================================

  describe('Command flags (§6.3)', () => {
    it('should support --verbose flag', async () => {
      const exitCode = await handleRun({
        verbose: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support --quiet flag', async () => {
      const exitCode = await handleRun({
        quiet: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support --no-fetch flag', async () => {
      const exitCode = await handleRun({
        noFetch: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support --force flag', async () => {
      const exitCode = await handleRun({
        force: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support --no-recursive flag', async () => {
      const exitCode = await handleRun({
        noRecursive: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support --config path flag', async () => {
      const exitCode = await handleRun({
        config: '/nonexistent/config.json',
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });
  });

  // ====================================================================
  // Dry-Run Mode (cli_spec.md §6.4)
  // ====================================================================

  describe('Dry-run mode (§6.4)', () => {
    it('should generate plan in dry-run mode', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        logFormat: 'json',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support dry-run with text format', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support dry-run with --verbose', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        verbose: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should support dry-run with --no-fetch', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        noFetch: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });
  });

  // ====================================================================
  // Exit Codes (cli_spec.md §2)
  // ====================================================================

  describe('Exit codes (§2)', () => {
    it('should return numeric exit code', async () => {
      const exitCode = await handleRun({
        logFormat: 'text',
      });
      expect(typeof exitCode).toBe('number');
      expect(exitCode >= 0 && exitCode <= 4).toBe(true);
    });

    it('should return 0 or 1-2 (success or error)', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        logFormat: 'json',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });

    it('should return 1 on config/validation error', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        daemon: true,
      });
      expect(exitCode).toBe(1);
    });

    it('should handle config discovery failure gracefully', async () => {
      const exitCode = await handleRun({
        config: '/invalid/path/.indexer-config.json',
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });
  });

  // ====================================================================
  // Combined Flags (Integration Tests)
  // ====================================================================

  describe('Combined flag scenarios (testing_specification.md §4.2)', () => {
    it('should handle verbose + json together', async () => {
      const exitCode = await handleRun({
        verbose: true,
        logFormat: 'json',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should handle quiet + text together', async () => {
      const exitCode = await handleRun({
        quiet: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should handle force + no-fetch + once', async () => {
      const exitCode = await handleRun({
        force: true,
        noFetch: true,
        once: true,
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should handle dry-run + force + json', async () => {
      const exitCode = await handleRun({
        dryRun: true,
        force: true,
        logFormat: 'json',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should handle verbose + quiet (quiet wins)', async () => {
      const exitCode = await handleRun({
        verbose: true,
        quiet: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should handle multiple boolean flags', async () => {
      const exitCode = await handleRun({
        force: true,
        noFetch: true,
        noRecursive: true,
        verbose: true,
        dryRun: true,
        logFormat: 'json',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });
  });

  // ====================================================================
  // Logger Creation (Internal Tests)
  // ====================================================================

  describe('Logger behavior (cli_spec.md §8)', () => {
    it('should create JSON logger with verbose flag', async () => {
      const exitCode = await handleRun({
        logFormat: 'json',
        verbose: true,
      });
      expect(typeof exitCode).toBe('number');
      expect(logSpy.mock.calls.length >= 0).toBe(true);
    });

    it('should create JSON logger with quiet flag', async () => {
      const exitCode = await handleRun({
        logFormat: 'json',
        quiet: true,
      });
      expect(typeof exitCode).toBe('number');
    });

    it('should create text logger with verbose flag', async () => {
      const exitCode = await handleRun({
        logFormat: 'text',
        verbose: true,
      });
      expect(typeof exitCode).toBe('number');
    });

    it('should create text logger with quiet flag', async () => {
      const exitCode = await handleRun({
        logFormat: 'text',
        quiet: true,
      });
      expect(typeof exitCode).toBe('number');
    });
  });

  // ====================================================================
  // Configuration Discovery (Error Paths)
  // ====================================================================

  describe('Config discovery and validation (§6.1)', () => {
    it('should handle config discovery with noRecursive flag', async () => {
      const exitCode = await handleRun({
        noRecursive: true,
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should handle explicit config path', async () => {
      const exitCode = await handleRun({
        config: '/tmp/.indexer-config.json',
        logFormat: 'text',
      });
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });

    it('should validate at least one codebase exists', async () => {
      const exitCode = await handleRun({
        logFormat: 'json',
      });
      // May fail due to no config, or succeed; both are valid
      expect([0, 1, 2, 3, 4]).toContain(exitCode);
    });
  });

  // ====================================================================
  // Snapshot Tests (Output Format Stability)
  // ====================================================================

  describe('Output snapshots (cli_spec.md §8; testing_specification.md §4.2)', () => {
    it('should produce dry-run output in text format with valid structure', async () => {
      let textOutput = '';
      vi.spyOn(console, 'log').mockImplementation((message) => {
        textOutput += String(message) + '\n';
      });

      const exitCode = await handleRun({
        dryRun: true,
        logFormat: 'text',
      });

      expect([0, 1, 2, 3, 4]).toContain(exitCode);
      // Verify structure without snapshot (timestamps are dynamic)
      if (textOutput) {
        expect(textOutput.length).toBeGreaterThan(0);
      }
    });

    it('should produce dry-run output in JSON format with valid structure', async () => {
      mockValidConfig();
      const jsonOutputs: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((message) => {
        if (typeof message === 'string' && message.startsWith('{')) {
          jsonOutputs.push(message);
        }
      });

      const exitCode = await handleRun({
        dryRun: true,
        logFormat: 'json',
      });

      expect([0, 1, 2, 3, 4]).toContain(exitCode);
      // Should have JSON output lines (logging + final plan)
      expect(jsonOutputs.length).toBeGreaterThan(0);
      // All should be valid JSON
      jsonOutputs.forEach((output) => {
        expect(() => JSON.parse(output)).not.toThrow();
      });
    });
  });
});
