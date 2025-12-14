/**
 * @file Daemon Lock File Management
 * @description Lock file operations for preventing duplicate daemons and graceful shutdown
 * @reference cli_spec.md §10 (daemon lifecycle management)
 * @reference cli_spec.md §12 (lock file location: ~/.texere-indexer/daemon.lock)
 * @reference testing_specification.md §3.6–3.7 (dependency injection for testability)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

type BufferEncoding =
  | 'utf-8'
  | 'ascii'
  | 'utf8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'latin1'
  | 'binary'
  | 'base64'
  | 'base64url'
  | 'hex';

export interface DaemonLock {
  pid: number;
  createdAt: string;
  mode: 'daemon' | 'detached';
  configPath: string;
}

/**
 * Environment variable provider interface for testability.
 * @reference testing_specification.md §3.6–3.7
 */
export interface EnvironmentProvider {
  get(varName: string): string | undefined;
}

/**
 * File system provider interface for testability.
 * @reference testing_specification.md §3.6–3.7
 */
export interface FileSystemProvider {
  exists(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  unlinkSync(path: string): void;
  readFileSync(path: string, encoding?: BufferEncoding): string;
  writeFileSync(path: string, data: string, encoding?: BufferEncoding): void;
}

/**
 * Default file system provider using Node.js fs module
 */
const defaultFileSystem: FileSystemProvider = {
  exists: (path: string) => fs.existsSync(path),
  mkdirSync: (path: string, options?: { recursive?: boolean }) => {
    fs.mkdirSync(path, options);
  },
  unlinkSync: (path: string) => {
    fs.unlinkSync(path);
  },
  readFileSync: (path: string, encoding?: BufferEncoding) =>
    fs.readFileSync(path, encoding || 'utf-8'),
  writeFileSync: (path: string, data: string, encoding?: BufferEncoding) => {
    fs.writeFileSync(path, data, encoding || 'utf-8');
  },
};

/**
 * Process API interface for testability.
 * @reference testing_specification.md §3.6–3.7 (dependency injection for process operations)
 */
export interface ProcessApi {
  /**
   * Get current process PID
   */
  getPid(): number;

  /**
   * Check if process is alive via signal 0 test (or actual signal)
   * @returns true if process exists, false otherwise
   */
  isAlive(pid: number): boolean;

  /**
   * Send signal to process
   */
  kill(pid: number, signal?: NodeJS.Signals): void;

  /**
   * Get environment variable
   */
  getEnv(varName: string): string | undefined;
}

/**
 * Default process API implementation using Node.js process module
 */
const defaultProcessApi: ProcessApi = {
  getPid: () => process.pid,
  isAlive: (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  },
  kill: (pid: number, signal?: NodeJS.Signals) => {
    process.kill(pid, signal);
  },
  getEnv: (varName: string) => process.env[varName],
};

/**
 * Get daemon lock file path.
 * Uses XDG_RUNTIME_DIR if available, otherwise ~/.texere-indexer/daemon.lock
 * @reference cli_spec.md §12 (lock file location)
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export function getLockFilePath(
  processApi: ProcessApi = defaultProcessApi,
  fsProvider: FileSystemProvider = defaultFileSystem,
): string {
  const xdgRuntime = processApi.getEnv('XDG_RUNTIME_DIR');
  if (xdgRuntime) {
    return path.join(xdgRuntime, 'texere-indexer.lock');
  }

  const homeDir = processApi.getEnv('HOME') || processApi.getEnv('USERPROFILE') || '~';
  const daemonDir = path.join(homeDir, '.texere-indexer');

  // Create directory if it doesn't exist
  // Note: Only try to create if we have a real filesystem provider
  // (tests can mock this to avoid creating directories)
  try {
    if (!fsProvider.exists(daemonDir)) {
      fsProvider.mkdirSync(daemonDir, { recursive: true });
    }
  } catch {
    // Ignore errors if directory creation fails (e.g., in tests)
  }

  return path.join(daemonDir, 'daemon.lock');
}

/**
 * Create daemon lock file.
 * Checks for existing daemon first.
 * @throws Error if daemon already running
 * @reference cli_spec.md §12.1 (lock file creation)
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export function createLock(
  mode: 'daemon' | 'detached',
  configPath: string,
  processApi: ProcessApi = defaultProcessApi,
  fsProvider: FileSystemProvider = defaultFileSystem,
): void {
  const lockPath = getLockFilePath(processApi, fsProvider);
  const pid = processApi.getPid();

  // Check for existing lock
  if (fsProvider.exists(lockPath)) {
    const existingLock = readLock(processApi, fsProvider);
    if (existingLock && processApi.isAlive(existingLock.pid)) {
      throw new Error(
        `Daemon already running (PID ${existingLock.pid}). Stop existing daemon with \`indexer stop\` first.`,
      );
    }

    // Stale lock found; clean it up
    try {
      fsProvider.unlinkSync(lockPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  const lock: DaemonLock = {
    pid,
    createdAt: new Date().toISOString(),
    mode,
    configPath,
  };

  fsProvider.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
}

/**
 * Read daemon lock file.
 * @returns Lock data or null if file doesn't exist or is invalid
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export function readLock(
  processApi: ProcessApi = defaultProcessApi,
  fsProvider: FileSystemProvider = defaultFileSystem,
): DaemonLock | null {
  const lockPath = getLockFilePath(processApi, fsProvider);

  if (!fsProvider.exists(lockPath)) {
    return null;
  }

  try {
    const data = fsProvider.readFileSync(lockPath, 'utf-8');
    return JSON.parse(data) as DaemonLock;
  } catch {
    return null;
  }
}

/**
 * Remove daemon lock file.
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export function removeLock(
  processApi: ProcessApi = defaultProcessApi,
  fsProvider: FileSystemProvider = defaultFileSystem,
): void {
  const lockPath = getLockFilePath(processApi, fsProvider);
  if (fsProvider.exists(lockPath)) {
    try {
      fsProvider.unlinkSync(lockPath);
    } catch {
      // Ignore if already deleted
    }
  }
}

/**
 * Get daemon status from lock file.
 * @returns { running: true; pid: number; } | { running: false; stalePid?: number }
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export function getDaemonStatus(
  processApi: ProcessApi = defaultProcessApi,
  fsProvider: FileSystemProvider = defaultFileSystem,
): {
  running: boolean;
  pid?: number;
  stalePid?: number;
} {
  const lock = readLock(processApi, fsProvider);

  if (!lock) {
    return { running: false };
  }

  if (processApi.isAlive(lock.pid)) {
    return { running: true, pid: lock.pid };
  }

  // Stale lock detected
  return { running: false, stalePid: lock.pid };
}

/**
 * Signal daemon to shutdown gracefully.
 * @reference cli_spec.md §12.3 (graceful shutdown)
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export function signalDaemon(
  pid: number,
  signal: NodeJS.Signals = 'SIGTERM',
  processApi: ProcessApi = defaultProcessApi,
): void {
  processApi.kill(pid, signal);
}

/**
 * Wait for daemon to shutdown or timeout.
 * @param pid Daemon PID
 * @param timeoutMs Max time to wait
 * @param processApi Process API (injectable for testing)
 * @returns true if daemon exited, false if timeout
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export async function waitForDaemonShutdown(
  pid: number,
  timeoutMs: number,
  processApi: ProcessApi = defaultProcessApi,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (!processApi.isAlive(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}
