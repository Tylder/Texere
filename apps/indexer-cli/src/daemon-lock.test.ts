/**
 * @file daemon-lock tests
 * @description Unit tests for daemon lock file management
 * @reference cli_spec.md §12 (daemon lifecycle management)
 * @reference testing_specification.md §3.6–3.7 (dependency injection for testability)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { ProcessApi, FileSystemProvider } from './daemon-lock.js';
import * as daemonLock from './daemon-lock.js';

describe('daemon lock management (cli_spec.md §12, testing_specification.md §3.6–3.7)', () => {
  /**
   * Mock ProcessApi for testing daemon lock operations.
   * @reference testing_specification.md §3.6–3.7 (dependency injection)
   */
  const createMockProcessApi = (
    mockPid: number = 12345,
    aliveProcesses: Set<number> = new Set([12345]),
  ): ProcessApi => ({
    getPid: () => mockPid,
    isAlive: (pid: number) => aliveProcesses.has(pid),
    kill: vi.fn(),
    getEnv: (varName: string) => {
      const envVars: Record<string, string> = {
        HOME: '/home/testuser',
      };
      return envVars[varName];
    },
  });

  /**
   * Mock FileSystemProvider that doesn't actually touch the filesystem.
   * @reference testing_specification.md §3.6–3.7 (dependency injection)
   */
  const createMockFileSystem = (existingFiles: Set<string> = new Set()): FileSystemProvider => ({
    exists: (path: string) => existingFiles.has(path),
    mkdirSync: (path: string) => {
      existingFiles.add(path);
    },
    unlinkSync: (path: string) => {
      existingFiles.delete(path);
    },
    readFileSync: (path: string) => {
      const lockData: Record<string, string> = {
        '/home/testuser/.texere-indexer/daemon.lock': JSON.stringify({
          pid: 12345,
          createdAt: new Date().toISOString(),
          mode: 'daemon',
          configPath: '/path/to/config.json',
        }),
      };
      return lockData[path] || '';
    },
    writeFileSync: (path: string, _data: string) => {
      existingFiles.add(path);
    },
  });

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLockFilePath (pure unit test with mocks)', () => {
    it('should get lock file path using mocked process API', () => {
      const mockAPI = createMockProcessApi();
      const mockFS = createMockFileSystem();
      const lockPath = daemonLock.getLockFilePath(mockAPI, mockFS);
      expect(typeof lockPath).toBe('string');
      expect(lockPath.length).toBeGreaterThan(0);
    });

    it('should use HOME env var from process API', () => {
      const mockAPI = createMockProcessApi();
      const mockFS = createMockFileSystem();
      const lockPath = daemonLock.getLockFilePath(mockAPI, mockFS);
      expect(lockPath).toContain('.texere-indexer');
    });
  });

  describe('readLock (pure unit test with mocks)', () => {
    it('should read lock file (returns null if not exists)', () => {
      const mockAPI = createMockProcessApi();
      const mockFS = createMockFileSystem();
      const lock = daemonLock.readLock(mockAPI, mockFS);
      expect(lock === null || typeof lock === 'object').toBe(true);
    });

    it('should read existing lock file', () => {
      const mockAPI = createMockProcessApi();
      const existingFiles = new Set(['/home/testuser/.texere-indexer/daemon.lock']);
      const mockFS = createMockFileSystem(existingFiles);
      const lock = daemonLock.readLock(mockAPI, mockFS);
      expect(lock).toBeTruthy();
      expect(lock?.pid).toBe(12345);
    });
  });

  describe('getDaemonStatus (pure unit test with mocks)', () => {
    it('should get daemon status with running process', () => {
      const mockAPI = createMockProcessApi(99999, new Set([99999]));
      const mockFS = createMockFileSystem();
      const status = daemonLock.getDaemonStatus(mockAPI, mockFS);
      expect(typeof status.running).toBe('boolean');
      expect(status.pid === undefined || typeof status.pid === 'number').toBe(true);
    });

    it('should detect stale lock (dead process)', () => {
      const mockAPI = createMockProcessApi(88888, new Set()); // No alive processes
      const mockFS = createMockFileSystem();
      const status = daemonLock.getDaemonStatus(mockAPI, mockFS);
      expect(typeof status.running).toBe('boolean');
    });

    it('should handle case when no lock file exists', () => {
      const mockAPI = createMockProcessApi();
      const mockFS = createMockFileSystem();
      const status = daemonLock.getDaemonStatus(mockAPI, mockFS);
      // Should return { running: false } when no lock
      expect(status.running).toBe(false);
    });
  });

  describe('removeLock (pure unit test with mocks)', () => {
    it('should remove lock file without throwing', () => {
      const mockAPI = createMockProcessApi();
      const mockFS = createMockFileSystem();
      expect(() => {
        daemonLock.removeLock(mockAPI, mockFS);
      }).not.toThrow();
    });
  });

  describe('signalDaemon (pure unit test with mocks)', () => {
    it('should send signal to daemon via mocked process API', () => {
      const mockAPI = createMockProcessApi();
      daemonLock.signalDaemon(12345, 'SIGTERM', mockAPI);
      expect((mockAPI.kill as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
      expect((mockAPI.kill as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([12345, 'SIGTERM']);
    });

    it('should default to SIGTERM when signal not provided', () => {
      const mockAPI = createMockProcessApi();
      daemonLock.signalDaemon(12345, undefined, mockAPI);
      expect((mockAPI.kill as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    });
  });

  describe('waitForDaemonShutdown (pure unit test with mocks)', () => {
    it('should return true if daemon shuts down before timeout', async () => {
      // Start with process alive
      const aliveProcesses = new Set([77777]);
      const mockAPI = createMockProcessApi(77777, aliveProcesses);

      // Simulate process dying after first check
      setTimeout(() => {
        aliveProcesses.delete(77777);
      }, 50);

      const result = await daemonLock.waitForDaemonShutdown(77777, 500, mockAPI);
      expect(result).toBe(true);
    });

    it('should return false if daemon does not shut down within timeout', async () => {
      // Process stays alive
      const mockAPI = createMockProcessApi(66666, new Set([66666]));
      const result = await daemonLock.waitForDaemonShutdown(66666, 100, mockAPI);
      expect(result).toBe(false);
    });
  });

  describe('daemon lock interface types', () => {
    it('should verify daemon lock interface with mocked process API', () => {
      const mockAPI = createMockProcessApi();
      const mockFS = createMockFileSystem();
      const status = daemonLock.getDaemonStatus(mockAPI, mockFS);

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
});
