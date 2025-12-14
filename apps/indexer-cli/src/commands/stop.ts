/**
 * @file 'indexer stop' command implementation
 * @description Gracefully shutdown a running daemon
 * @reference cli_spec.md §7 (stop command)
 */

import { readLock, removeLock, signalDaemon, waitForDaemonShutdown } from '../daemon-lock.js';
import { OutputHandler, type StopOutput } from '../output-formatter.js';

export interface StopOptions {
  force?: boolean;
  timeout?: string;
  logFormat?: string;
}

/**
 * Handle stop command
 * @reference cli_spec.md §7 (stop command)
 * @reference cli_spec.md §6 (exit codes: 0 stopped, 2 not found, 1 other error)
 */
export async function handleStop(options: StopOptions): Promise<number> {
  const format = (options.logFormat || 'text') as 'json' | 'text';
  const output = new OutputHandler(format);

  try {
    const lock = readLock();

    if (!lock) {
      const message = 'Daemon not found';
      console.log(message);

      const json: StopOutput = {
        command: 'stop',
        timestamp: new Date().toISOString(),
        state: 'not found',
        message,
      };

      output.json(json);
      return 2;
    }

    const { pid } = lock;
    const timeoutSeconds = parseInt(options.timeout || '30', 10);
    const timeoutMs = timeoutSeconds * 1000;

    if (options.force) {
      // Force kill immediately
      try {
        signalDaemon(pid, 'SIGKILL');
        console.log(`Daemon terminated forcefully (PID ${pid})`);
        removeLock();

        const json: StopOutput = {
          command: 'stop',
          timestamp: new Date().toISOString(),
          daemonPid: pid,
          state: 'stopped',
          message: `Daemon terminated forcefully`,
        };

        output.json(json);
        return 0;
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        return 1;
      }
    }

    // Graceful shutdown
    try {
      console.log(`Stopping daemon (PID ${pid})...`);
      signalDaemon(pid, 'SIGTERM');

      const stopped = await waitForDaemonShutdown(pid, timeoutMs);

      if (stopped) {
        console.log(`Daemon stopped ✓`);
        removeLock();

        const json: StopOutput = {
          command: 'stop',
          timestamp: new Date().toISOString(),
          daemonPid: pid,
          state: 'stopped',
          message: 'Daemon stopped gracefully',
        };

        output.json(json);
        return 0;
      }

      // Timeout: send SIGKILL
      console.warn(`Shutdown timeout (${timeoutSeconds}s); sending SIGKILL...`);
      signalDaemon(pid, 'SIGKILL');
      removeLock();

      const json: StopOutput = {
        command: 'stop',
        timestamp: new Date().toISOString(),
        daemonPid: pid,
        state: 'stopped',
        message: `Daemon forcefully killed after ${timeoutSeconds}s timeout`,
      };

      output.json(json);
      return 0;
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      return 1;
    }
  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? error.message : String(error));
    return 4;
  }
}
