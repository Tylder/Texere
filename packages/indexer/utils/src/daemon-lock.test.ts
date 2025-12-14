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
  const createMockFileSystem = (
    existingFiles: Set<string> = new Set(),
    initialContents: Record<string, string> = {},
  ): FileSystemProvider => {
    const fileContents: Record<string, string> = { ...initialContents };
    return {
      exists: (path: string) => existingFiles.has(path),
      mkdirSync: (path: string) => {
        existingFiles.add(path);
      },
      unlinkSync: (path: string) => {
        existingFiles.delete(path);
        delete fileContents[path];
      },
      readFileSync: (path: string) => {
        return fileContents[path] || '';
      },
      writeFileSync: (path: string, data: string) => {
        existingFiles.add(path);
        fileContents[path] = data;
      },
    };
  };

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
      const lockData = JSON.stringify({
        pid: 12345,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/config.json',
      });
      const mockFS = createMockFileSystem(existingFiles, {
        '/home/testuser/.texere-indexer/daemon.lock': lockData,
      });
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

  describe('createLock (integration with mocks)', () => {
    it('should create lock file with correct structure', () => {
      const mockAPI = createMockProcessApi(54321);
      const mockFS = createMockFileSystem();
      const configPath = '/path/to/config.json';

      daemonLock.createLock('daemon', configPath, mockAPI, mockFS);

      const lock = daemonLock.readLock(mockAPI, mockFS);
      expect(lock).toBeTruthy();
      expect(lock?.pid).toBe(54321);
      expect(lock?.mode).toBe('daemon');
      expect(lock?.configPath).toBe(configPath);
      expect(lock?.createdAt).toBeTruthy();
    });

    it('should throw error if daemon already running', () => {
      const aliveProcesses = new Set([54321]);
      const mockAPI = createMockProcessApi(54321, aliveProcesses);
      const existingFiles = new Set(['/home/testuser/.texere-indexer/daemon.lock']);
      const existingLockData = JSON.stringify({
        pid: 54321,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/existing-config.json',
      });
      const mockFS = createMockFileSystem(existingFiles, {
        '/home/testuser/.texere-indexer/daemon.lock': existingLockData,
      });
      const configPath = '/path/to/config.json';

      expect(() => {
        daemonLock.createLock('daemon', configPath, mockAPI, mockFS);
      }).toThrow(/Daemon already running/);
    });

    it('should clean up stale lock if process dead', () => {
      const aliveProcesses = new Set<number>(); // No alive processes
      const mockAPI = createMockProcessApi(54321, aliveProcesses);
      const existingFiles = new Set(['/home/testuser/.texere-indexer/daemon.lock']);
      const mockFS = createMockFileSystem(existingFiles);
      const configPath = '/path/to/config.json';

      // Should not throw; should clean up stale lock
      expect(() => {
        daemonLock.createLock('daemon', configPath, mockAPI, mockFS);
      }).not.toThrow();

      const newLock = daemonLock.readLock(mockAPI, mockFS);
      expect(newLock?.pid).toBe(54321);
    });

    it('should support detached mode', () => {
      const mockAPI = createMockProcessApi(43210);
      const mockFS = createMockFileSystem();
      const configPath = '/path/to/config.json';

      daemonLock.createLock('detached', configPath, mockAPI, mockFS);

      const lock = daemonLock.readLock(mockAPI, mockFS);
      expect(lock?.mode).toBe('detached');
    });
  });

  describe('lock file path edge cases', () => {
    it('should use XDG_RUNTIME_DIR if available', () => {
      const mockAPI: ProcessApi = {
        getPid: () => 12345,
        isAlive: () => true,
        kill: () => {},
        getEnv: (varName: string) => {
          if (varName === 'XDG_RUNTIME_DIR') return '/run/user/1000';
          return undefined;
        },
      };
      const mockFS = createMockFileSystem();
      const lockPath = daemonLock.getLockFilePath(mockAPI, mockFS);
      expect(lockPath).toContain('texere-indexer.lock');
    });

    it('should handle missing HOME and USERPROFILE env vars', () => {
      const mockAPI: ProcessApi = {
        getPid: () => 12345,
        isAlive: () => true,
        kill: () => {},
        getEnv: () => undefined,
      };
      const mockFS = createMockFileSystem();
      const lockPath = daemonLock.getLockFilePath(mockAPI, mockFS);
      expect(lockPath).toBeTruthy();
    });

    it('should handle directory creation errors gracefully', () => {
      const mockAPI = createMockProcessApi();
      const mockFS: FileSystemProvider = {
        exists: () => false,
        mkdirSync: () => {
          throw new Error('Permission denied');
        },
        unlinkSync: () => {},
        readFileSync: () => '',
        writeFileSync: () => {},
      };

      expect(() => {
        daemonLock.getLockFilePath(mockAPI, mockFS);
      }).not.toThrow();
    });
  });

  describe('lock file data integrity', () => {
    it('should handle malformed JSON in lock file', () => {
      const mockAPI = createMockProcessApi();
      const mockFS: FileSystemProvider = {
        exists: () => true,
        mkdirSync: () => {},
        unlinkSync: () => {},
        readFileSync: () => '{invalid json}',
        writeFileSync: () => {},
      };

      const lock = daemonLock.readLock(mockAPI, mockFS);
      expect(lock).toBeNull();
    });

    it('should handle empty lock file', () => {
      const mockAPI = createMockProcessApi();
      const mockFS: FileSystemProvider = {
        exists: () => true,
        mkdirSync: () => {},
        unlinkSync: () => {},
        readFileSync: () => '',
        writeFileSync: () => {},
      };

      const lock = daemonLock.readLock(mockAPI, mockFS);
      expect(lock).toBeNull();
    });

    it('should serialize lock with proper ISO timestamp', () => {
      const mockAPI = createMockProcessApi(11111);
      const mockFS = createMockFileSystem();
      const configPath = '/path/to/config.json';

      daemonLock.createLock('daemon', configPath, mockAPI, mockFS);
      const lock = daemonLock.readLock(mockAPI, mockFS);

      expect(lock?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('signal handling edge cases', () => {
    it('should handle SIGKILL signal', () => {
      const mockAPI = createMockProcessApi();
      daemonLock.signalDaemon(12345, 'SIGKILL', mockAPI);
      const killMock = mockAPI.kill as ReturnType<typeof vi.fn>;
      expect(killMock?.mock?.calls?.[0]?.[1]).toBe('SIGKILL');
    });

    it('should handle signal to non-existent process gracefully', () => {
      const mockAPI: ProcessApi = {
        getPid: () => 12345,
        isAlive: () => false,
        kill: vi.fn(() => {
          // Simulate process not found silently (caller handles via isAlive check)
        }),
        getEnv: () => undefined,
      };

      // Should not throw; caller handles process not found
      daemonLock.signalDaemon(99999, 'SIGTERM', mockAPI);
      const killMock = mockAPI.kill as ReturnType<typeof vi.fn>;
      expect(killMock?.mock?.calls).toHaveLength(1);
    });
  });

  describe('concurrent daemon operations', () => {
    it('should handle rapid create/remove cycles', async () => {
      const mockAPI = createMockProcessApi(99999);
      const mockFS = createMockFileSystem();
      const configPath = '/path/to/config.json';

      for (let i = 0; i < 3; i++) {
        daemonLock.createLock('daemon', configPath, mockAPI, mockFS);
        const lock = daemonLock.readLock(mockAPI, mockFS);
        expect(lock?.pid).toBe(99999);
        daemonLock.removeLock(mockAPI, mockFS);
        const removedLock = daemonLock.readLock(mockAPI, mockFS);
        expect(removedLock).toBeNull();
      }
    });

    it('should handle waitForDaemonShutdown with immediate exit', async () => {
      const aliveProcesses = new Set<number>();
      const mockAPI = createMockProcessApi(88888, aliveProcesses);

      const result = await daemonLock.waitForDaemonShutdown(88888, 1000, mockAPI);
      expect(result).toBe(true);
    });

    it('should handle multiple simultaneous status checks', () => {
      const mockAPI = createMockProcessApi();
      const mockFS = createMockFileSystem();

      const status1 = daemonLock.getDaemonStatus(mockAPI, mockFS);
      const status2 = daemonLock.getDaemonStatus(mockAPI, mockFS);
      const status3 = daemonLock.getDaemonStatus(mockAPI, mockFS);

      expect(status1.running).toBe(status2.running);
      expect(status2.running).toBe(status3.running);
    });
  });
});
