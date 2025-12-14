/**
 * @file status command tests
 * @description Unit tests for 'indexer status' command
 * @reference cli_spec.md §5 (status command)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleStatus } from './status.js';

describe('status command (cli_spec.md §5)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should check status with text format', async () => {
    const exitCode = await handleStatus({
      logFormat: 'text',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should check status with json format', async () => {
    const exitCode = await handleStatus({
      logFormat: 'json',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should return 0 or 1 (not blocker means ready)', async () => {
    const exitCode = await handleStatus({
      logFormat: 'text',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should handle empty logFormat', async () => {
    const exitCode = await handleStatus({
      logFormat: '',
    });
    expect([0, 1]).toContain(exitCode);
  });

  it('should return numeric exit code', async () => {
    const exitCode = await handleStatus({
      logFormat: 'json',
    });
    expect(typeof exitCode).toBe('number');
  });
});
