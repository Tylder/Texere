/**
 * @file Daemon Lock File Management
 * @description Lock file operations for preventing duplicate daemons and graceful shutdown
 * @reference cli_spec.md §10 (daemon lifecycle management)
 * @reference cli_spec.md §12 (lock file location: ~/.texere-indexer/daemon.lock)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DaemonLock {
  pid: number;
  createdAt: string;
  mode: 'daemon' | 'detached';
  configPath: string;
}

/**
 * Get daemon lock file path.
 * Uses XDG_RUNTIME_DIR if available, otherwise ~/.texere-indexer/daemon.lock
 * @reference cli_spec.md §12 (lock file location)
 */
export function getLockFilePath(): string {
  const xdgRuntime = process.env['XDG_RUNTIME_DIR'];
  if (xdgRuntime) {
    return path.join(xdgRuntime, 'texere-indexer.lock');
  }

  const homeDir = process.env['HOME'] || process.env['USERPROFILE'] || '~';
  const daemonDir = path.join(homeDir, '.texere-indexer');

  // Create directory if it doesn't exist
  if (!fs.existsSync(daemonDir)) {
    fs.mkdirSync(daemonDir, { recursive: true });
  }

  return path.join(daemonDir, 'daemon.lock');
}

/**
 * Check if a process is alive by PID.
 */
function isProcessAlive(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create daemon lock file.
 * Checks for existing daemon first.
 * @throws Error if daemon already running
 * @reference cli_spec.md §12.1 (lock file creation)
 */
export function createLock(mode: 'daemon' | 'detached', configPath: string): void {
  const lockPath = getLockFilePath();
  const pid = process.pid;

  // Check for existing lock
  if (fs.existsSync(lockPath)) {
    const existingLock = readLock();
    if (existingLock && isProcessAlive(existingLock.pid)) {
      throw new Error(
        `Daemon already running (PID ${existingLock.pid}). Stop existing daemon with \`indexer stop\` first.`,
      );
    }

    // Stale lock found; clean it up
    try {
      fs.unlinkSync(lockPath);
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

  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
}

/**
 * Read daemon lock file.
 * @returns Lock data or null if file doesn't exist or is invalid
 */
export function readLock(): DaemonLock | null {
  const lockPath = getLockFilePath();

  if (!fs.existsSync(lockPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(lockPath, 'utf-8');
    return JSON.parse(data) as DaemonLock;
  } catch {
    return null;
  }
}

/**
 * Remove daemon lock file.
 */
export function removeLock(): void {
  const lockPath = getLockFilePath();
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // Ignore if already deleted
    }
  }
}

/**
 * Get daemon status from lock file.
 * @returns { running: true; pid: number; } | { running: false; stalePid?: number }
 */
export function getDaemonStatus(): { running: boolean; pid?: number; stalePid?: number } {
  const lock = readLock();

  if (!lock) {
    return { running: false };
  }

  if (isProcessAlive(lock.pid)) {
    return { running: true, pid: lock.pid };
  }

  // Stale lock detected
  return { running: false, stalePid: lock.pid };
}

/**
 * Signal daemon to shutdown gracefully.
 * @reference cli_spec.md §12.3 (graceful shutdown)
 */
export function signalDaemon(pid: number, signal: NodeJS.Signals = 'SIGTERM'): void {
  process.kill(pid, signal);
}

/**
 * Wait for daemon to shutdown or timeout.
 * @param pid Daemon PID
 * @param timeoutMs Max time to wait
 * @returns true if daemon exited, false if timeout
 */
export async function waitForDaemonShutdown(pid: number, timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (!isProcessAlive(pid)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}
