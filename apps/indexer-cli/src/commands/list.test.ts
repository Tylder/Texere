/**
 * @file list command tests
 * @description Unit tests for 'indexer list' command
 * @reference cli_spec.md §4 (list command)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleList } from './list.js';

describe('list command (cli_spec.md §4)', () => {
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
});
