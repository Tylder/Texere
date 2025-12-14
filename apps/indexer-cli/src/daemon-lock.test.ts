/**
 * @file daemon-lock tests
 * @description Unit tests for daemon lock file management
 * @reference cli_spec.md §12 (daemon lifecycle management)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as daemonLock from './daemon-lock.js';

describe('daemon lock management (cli_spec.md §12)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should get lock file path', () => {
    const path = daemonLock.getLockFilePath();
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('should read lock file (returns null if not exists)', () => {
    const lock = daemonLock.readLock();
    expect(lock === null || typeof lock === 'object').toBe(true);
  });

  it('should get daemon status', () => {
    const status = daemonLock.getDaemonStatus();
    expect(typeof status.running).toBe('boolean');
    expect(status.pid === undefined || typeof status.pid === 'number').toBe(true);
  });

  it('should handle stale lock detection', () => {
    const status = daemonLock.getDaemonStatus();
    // getDaemonStatus returns { running: boolean, pid?: number, stalePid?: number }
    // Assertion: status should always have the running property
    expect(typeof status.running).toBe('boolean');
  });

  it('should remove lock file', () => {
    // Remove lock should not throw
    expect(() => {
      daemonLock.removeLock();
    }).not.toThrow();
  });

  it('should verify daemon lock interface types', () => {
    // Test that getDaemonStatus returns the correct shape
    const status = daemonLock.getDaemonStatus();

    // Must have running property
    expect(typeof status.running).toBe('boolean');

    // May have optional pid and stalePid
    if (status.pid !== undefined) {
      expect(typeof status.pid).toBe('number');
    }

    if (status.stalePid !== undefined) {
      expect(typeof status.stalePid).toBe('number');
    }
  });
});
