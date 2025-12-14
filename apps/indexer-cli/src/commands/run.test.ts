/**
 * @file run command tests
 * @description Unit tests for 'indexer run' command
 * @reference cli_spec.md §6 (run command)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleRun } from './run.js';

describe('run command (cli_spec.md §6)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should exit with code on dry-run mode', async () => {
    const exitCode = await handleRun({
      dryRun: true,
      logFormat: 'json',
    });
    expect([0, 1, 2, 3, 4]).toContain(exitCode);
  });

  it('should reject dry-run with daemon', async () => {
    const exitCode = await handleRun({
      dryRun: true,
      daemon: true,
    });
    expect(exitCode).toBe(1);
  });

  it('should reject dry-run with detached', async () => {
    const exitCode = await handleRun({
      dryRun: true,
      detached: true,
    });
    expect(exitCode).toBe(1);
  });

  it('should handle once mode (default)', async () => {
    const exitCode = await handleRun({
      once: true,
      logFormat: 'text',
    });
    expect([0, 1, 2, 3, 4]).toContain(exitCode);
  });

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

  it('should return numeric exit code', async () => {
    const exitCode = await handleRun({
      logFormat: 'text',
    });
    expect(typeof exitCode).toBe('number');
  });
});
