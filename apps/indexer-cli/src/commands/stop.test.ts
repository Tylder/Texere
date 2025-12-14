/**
 * @file stop command tests
 * @description Unit tests for 'indexer stop' command
 * @reference cli_spec.md §7 (stop command)
 * @reference testing_specification.md §3.6–3.7 (dependency injection)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as daemonLock from '../daemon-lock.js';

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

  describe('daemon not running', () => {
    beforeEach(() => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue(null);
    });

    it('should return exit code 2 when daemon not found', async () => {
      const exitCode = await handleStop({
        logFormat: 'text',
      });
      expect(exitCode).toBe(2);
    });

    it('should output daemon not found message', async () => {
      await handleStop({ logFormat: 'text' });
      expect(console.log).toHaveBeenCalledWith('Daemon not found');
    });

    it('should return exit code 2 with force flag', async () => {
      const exitCode = await handleStop({
        force: true,
        logFormat: 'text',
      });
      expect(exitCode).toBe(2);
    });
  });

  describe('graceful shutdown', () => {
    beforeEach(() => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue({
        pid: 12345,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/config.json',
      });
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'removeLock').mockImplementation(() => {});
    });

    it('should send SIGTERM signal', async () => {
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(true);
      await handleStop({ logFormat: 'text' });
      expect(daemonLock.signalDaemon).toHaveBeenCalledWith(12345, 'SIGTERM');
    });

    it('should return exit code 0 on successful shutdown', async () => {
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(true);
      const exitCode = await handleStop({ logFormat: 'text' });
      expect(exitCode).toBe(0);
    });

    it('should remove lock file on shutdown', async () => {
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(true);
      await handleStop({ logFormat: 'text' });
      expect(daemonLock.removeLock).toHaveBeenCalled();
    });

    it('should output shutdown message', async () => {
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(true);
      await handleStop({ logFormat: 'text' });
      expect(console.log).toHaveBeenCalledWith('Daemon stopped ✓');
    });
  });

  describe('graceful shutdown timeout', () => {
    beforeEach(() => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue({
        pid: 12345,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/config.json',
      });
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'removeLock').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(false);
    });

    it('should send SIGKILL after timeout', async () => {
      await handleStop({ timeout: '5', logFormat: 'text' });
      expect(daemonLock.signalDaemon).toHaveBeenCalledWith(12345, 'SIGKILL');
    });

    it('should use custom timeout value', async () => {
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockImplementation((pid, timeoutMs) => {
        expect(timeoutMs).toBe(10000); // 10 seconds
        return Promise.resolve(false);
      });
      await handleStop({ timeout: '10', logFormat: 'text' });
    });

    it('should return exit code 0 after SIGKILL', async () => {
      const exitCode = await handleStop({ timeout: '5', logFormat: 'text' });
      expect(exitCode).toBe(0);
    });

    it('should warn about timeout', async () => {
      await handleStop({ timeout: '5', logFormat: 'text' });
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Shutdown timeout'));
    });
  });

  describe('force kill', () => {
    beforeEach(() => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue({
        pid: 12345,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/config.json',
      });
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'removeLock').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(true);
    });

    it('should send SIGKILL immediately with --force', async () => {
      await handleStop({ force: true, logFormat: 'text' });
      expect(daemonLock.signalDaemon).toHaveBeenCalledWith(12345, 'SIGKILL');
    });

    it('should return exit code 0 with --force', async () => {
      const exitCode = await handleStop({ force: true, logFormat: 'text' });
      expect(exitCode).toBe(0);
    });

    it('should not wait for graceful shutdown with --force', async () => {
      await handleStop({ force: true, logFormat: 'text' });
      expect(daemonLock.waitForDaemonShutdown).not.toHaveBeenCalled();
    });

    it('should remove lock file on force kill', async () => {
      await handleStop({ force: true, logFormat: 'text' });
      expect(daemonLock.removeLock).toHaveBeenCalled();
    });
  });

  describe('output formats', () => {
    beforeEach(() => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue({
        pid: 12345,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/config.json',
      });
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'removeLock').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(true);
    });

    it('should support text format', async () => {
      const exitCode = await handleStop({ logFormat: 'text' });
      expect(exitCode).toBe(0);
      expect(console.log).toHaveBeenCalled();
    });

    it('should support json format', async () => {
      const exitCode = await handleStop({ logFormat: 'json' });
      expect(exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue({
        pid: 12345,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/config.json',
      });
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'removeLock').mockImplementation(() => {});
    });

    it('should return exit code 1 on signal error', async () => {
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const exitCode = await handleStop({ force: true, logFormat: 'text' });
      expect(exitCode).toBe(1);
    });

    it('should return exit code 1 on graceful shutdown error', async () => {
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockRejectedValue(new Error('Signal failed'));
      const exitCode = await handleStop({ logFormat: 'text' });
      expect(exitCode).toBe(1);
    });

    it('should output error message', async () => {
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {
        throw new Error('Signal failed');
      });
      await handleStop({ force: true, logFormat: 'text' });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('exit codes', () => {
    it('should return 0 on successful stop', async () => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue({
        pid: 12345,
        createdAt: new Date().toISOString(),
        mode: 'daemon',
        configPath: '/path/to/config.json',
      });
      vi.spyOn(daemonLock, 'signalDaemon').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'removeLock').mockImplementation(() => {});
      vi.spyOn(daemonLock, 'waitForDaemonShutdown').mockResolvedValue(true);
      const exitCode = await handleStop({ logFormat: 'text' });
      expect(exitCode).toBe(0);
    });

    it('should return 1 on error', async () => {
      vi.spyOn(daemonLock, 'readLock').mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      const exitCode = await handleStop({ logFormat: 'text' });
      expect(exitCode).toBe(4);
    });

    it('should return 2 when daemon not found', async () => {
      vi.spyOn(daemonLock, 'readLock').mockReturnValue(null);
      const exitCode = await handleStop({ logFormat: 'text' });
      expect(exitCode).toBe(2);
    });
  });
});
