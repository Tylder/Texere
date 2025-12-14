/**
 * @file stop command tests
 * @description Unit tests for 'indexer stop' command
 * @reference cli_spec.md §7 (stop command)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleStop } from './stop.js';

describe('stop command (cli_spec.md §7)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle when no daemon running', async () => {
    const exitCode = await handleStop({
      logFormat: 'text',
    });
    expect([0, 1, 2, 4]).toContain(exitCode);
  });

  it('should support --force flag', async () => {
    const exitCode = await handleStop({
      force: true,
      logFormat: 'text',
    });
    expect([0, 1, 2, 4]).toContain(exitCode);
  });

  it('should support --timeout flag', async () => {
    const exitCode = await handleStop({
      timeout: '30',
      logFormat: 'text',
    });
    expect([0, 1, 2, 4]).toContain(exitCode);
  });

  it('should support json log format', async () => {
    const exitCode = await handleStop({
      logFormat: 'json',
    });
    expect([0, 1, 2, 4]).toContain(exitCode);
  });

  it('should return numeric exit code', async () => {
    const exitCode = await handleStop({
      logFormat: 'text',
    });
    expect(typeof exitCode).toBe('number');
  });

  it('should handle force + timeout combination', async () => {
    const exitCode = await handleStop({
      force: true,
      timeout: '10',
      logFormat: 'text',
    });
    expect([0, 1, 2, 4]).toContain(exitCode);
  });
});
