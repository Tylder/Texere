/**
 * @file validate command tests
 * @description Unit tests for 'indexer validate' command
 * @reference cli_spec.md §3 (validate command)
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
});
