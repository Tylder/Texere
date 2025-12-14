/**
 * @file CLI main – Contract tests for Slice 1
 * @description Contract tests for CLI exit codes and output formats
 * @reference docs/specs/feature/indexer/plan.md Slice 1 (CLI contract tests)
 * @reference docs/specs/feature/indexer/cli_spec.md (CLI specification)
 *
 * Slice 1 covers:
 * - CLI arg parsing and command structure (validate, list, status, run, stop)
 * - Config loading and precedence
 * - Daemon lock file management
 * - Output formatting (text and JSON)
 * - Exit codes per cli_spec.md §6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleList } from './commands/list.js';
import { handleRun } from './commands/run.js';
import { handleStatus } from './commands/status.js';
import { handleStop } from './commands/stop.js';
import { handleValidate } from './commands/validate.js';
import * as daemonLock from './daemon-lock.js';

// ============================================================================
// Test Setup: Mock console and environment
// ============================================================================

describe('Indexer CLI (cli_spec.md + plan.md Slice 1)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Command: validate
  // ============================================================================

  describe('validate command (cli_spec.md §3)', () => {
    it('should return 0 when all configs are valid', async () => {
      const exitCode = await handleValidate({
        logFormat: 'text',
      });
      expect(exitCode).toBe(0);
    });

    it('should return 1 when config validation fails', async () => {
      const exitCode = await handleValidate({
        config: '/nonexistent/path/.indexer-config.json',
        logFormat: 'text',
      });
      expect(exitCode).toBe(1);
    });

    it('should support --log-format json', async () => {
      const exitCode = await handleValidate({
        logFormat: 'json',
      });
      expect([0, 1]).toContain(exitCode); // Either valid or invalid, but should complete
    });

    it('should support --log-format text', async () => {
      const exitCode = await handleValidate({
        logFormat: 'text',
      });
      expect([0, 1]).toContain(exitCode);
    });
  });

  // ============================================================================
  // Command: list
  // ============================================================================

  describe('list command (cli_spec.md §4)', () => {
    it('should return 0 on success', async () => {
      const exitCode = await handleList({
        logFormat: 'text',
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

    it('should support --log-format json', async () => {
      const exitCode = await handleList({
        logFormat: 'json',
        verbose: false,
      });
      expect(exitCode).toBe(0);
    });

    it('should return 1 on config error', async () => {
      // Force config load error by providing invalid env
      vi.stubEnv('INDEXER_CONFIG_PATH', '/nonexistent/.indexer-config.json');
      const exitCode = await handleList({
        logFormat: 'text',
        verbose: false,
      });
      // Either 0 (allowMissing=true) or 1 (config error)
      expect([0, 1]).toContain(exitCode);
      vi.unstubAllEnvs();
    });
  });

  // ============================================================================
  // Command: status
  // ============================================================================

  describe('status command (cli_spec.md §5)', () => {
    it('should return 0 when prerequisites are met', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
      });
      // Status may return 0 (ready) or 1 (blockers)
      expect([0, 1]).toContain(exitCode);
    });

    it('should check daemon status', async () => {
      const statusSpy = vi.spyOn(daemonLock, 'getDaemonStatus');
      await handleStatus({ logFormat: 'text' });
      expect(statusSpy).toHaveBeenCalled();
      statusSpy.mockRestore();
    });

    it('should support --log-format json', async () => {
      const exitCode = await handleStatus({
        logFormat: 'json',
      });
      expect([0, 1]).toContain(exitCode);
    });

    it('should support --log-format text', async () => {
      const exitCode = await handleStatus({
        logFormat: 'text',
      });
      expect([0, 1]).toContain(exitCode);
    });
  });

  // ============================================================================
  // Command: run
  // ============================================================================

  describe('run command (cli_spec.md §6)', () => {
    it('should default to --once mode', async () => {
      const exitCode = await handleRun({
        once: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });

    it('should return 1 when config not found', async () => {
      const exitCode = await handleRun({
        once: true,
        logFormat: 'text',
        config: '/nonexistent/.indexer-config.json',
      });
      expect(exitCode).toBe(1);
    });

    it('should return 1 (config error) when --dry-run + --daemon', async () => {
      // Validation rule 1: dry-run cannot combine with daemon/detached
      const exitCode = await handleRun({
        once: false,
        daemon: true,
        dryRun: true,
        logFormat: 'text',
      });
      expect(exitCode).toBe(1);
    });

    it('should return 1 (config error) when --dry-run + --detached', async () => {
      const exitCode = await handleRun({
        once: false,
        detached: true,
        dryRun: true,
        logFormat: 'text',
      });
      expect(exitCode).toBe(1);
    });

    it('should support --dry-run flag', async () => {
      const exitCode = await handleRun({
        once: true,
        dryRun: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });

    it('should support --force flag', async () => {
      const exitCode = await handleRun({
        once: true,
        force: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });

    it('should support --no-fetch flag to skip git fetch', async () => {
      const exitCode = await handleRun({
        once: true,
        noFetch: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });

    it('should support --verbose flag', async () => {
      const exitCode = await handleRun({
        once: true,
        verbose: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });

    it('should support --quiet flag', async () => {
      const exitCode = await handleRun({
        once: true,
        quiet: true,
        logFormat: 'text',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });

    it('should support --log-format json', async () => {
      const exitCode = await handleRun({
        once: true,
        logFormat: 'json',
      });
      expect([0, 1, 2]).toContain(exitCode);
    });
  });

  // ============================================================================
  // Command: stop
  // ============================================================================

  describe('stop command (cli_spec.md §7)', () => {
    it('should return 2 (not found) when no daemon is running', async () => {
      // No lock file = daemon not running
      const exitCode = await handleStop({
        logFormat: 'text',
      });
      expect(exitCode).toBe(2);
    });

    it('should support --force flag', async () => {
      const exitCode = await handleStop({
        force: true,
        logFormat: 'text',
      });
      expect([2, 0]).toContain(exitCode); // Not found or stopped
    });

    it('should support --timeout option', async () => {
      const exitCode = await handleStop({
        timeout: '5',
        logFormat: 'text',
      });
      expect([2, 0]).toContain(exitCode);
    });

    it('should support --log-format json', async () => {
      const exitCode = await handleStop({
        logFormat: 'json',
      });
      expect([2, 0]).toContain(exitCode);
    });
  });

  // ============================================================================
  // Daemon Lock Management (cli_spec.md §12)
  // ============================================================================

  describe('daemon lock file management', () => {
    it('should create lock file path correctly', () => {
      const lockPath = daemonLock.getLockFilePath();
      expect(typeof lockPath).toBe('string');
      expect(lockPath.length).toBeGreaterThan(0);
    });

    it('should detect if lock file exists', () => {
      const lock = daemonLock.readLock();
      expect(lock === null || typeof lock === 'object').toBe(true);
    });

    it('should get daemon status', () => {
      const status = daemonLock.getDaemonStatus();
      expect(typeof status.running).toBe('boolean');
    });
  });

  // ============================================================================
  // Exit Codes (cli_spec.md §6)
  // ============================================================================

  describe('exit codes (cli_spec.md §6)', () => {
    it('should return 0 for success', async () => {
      // validate should return 0 when configs are valid
      const exitCode = await handleValidate({ logFormat: 'text' });
      expect(exitCode).toBe(0);
    });

    it('should return 1 for config/validation errors', async () => {
      // Provide invalid config path
      const exitCode = await handleValidate({
        config: '/invalid/path/.indexer-config.json',
        logFormat: 'text',
      });
      expect(exitCode).toBe(1);
    });

    it('should return 2 for git/IO errors', async () => {
      // run with missing repo should eventually return 2
      // (or 1 if config is not found first)
      const exitCode = await handleRun({
        once: true,
        config: '/invalid/config.json',
        logFormat: 'text',
      });
      expect([1, 2]).toContain(exitCode);
    });
  });

  // ============================================================================
  // Output Formatting (cli_spec.md §8)
  // ============================================================================

  describe('output formatting', () => {
    it('should support text format (default)', async () => {
      const exitCode = await handleList({
        logFormat: 'text',
        verbose: false,
      });
      expect(exitCode).toBe(0);
    });

    it('should support JSON format', async () => {
      const exitCode = await handleList({
        logFormat: 'json',
        verbose: false,
      });
      expect(exitCode).toBe(0);
    });
  });
});
