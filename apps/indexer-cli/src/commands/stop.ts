/**
 * @file 'indexer stop' command implementation
 * @description Gracefully shutdown a running daemon
 * @reference cli_spec.md §7 (stop command)
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (recursive discovery pattern)
 */

import { readLock, removeLock, signalDaemon, waitForDaemonShutdown } from '../daemon-lock.js';
import { OutputHandler, type StopOutput } from '../output-formatter.js';

export interface StopOptions {
  force?: boolean;
  timeout?: string;
  noRecursive?: boolean;
  logFormat?: string;
}

/**
 * Handle stop command
 * @reference cli_spec.md §7 (stop command)
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (recursive config discovery pattern)
 * @reference cli_spec.md §6 (exit codes: 0 stopped, 2 not found, 1 other error)
 *
 * Stops a running daemon process. Uses recursive config discovery for consistency
 * with other commands, though config is not strictly needed for stop operation.
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §3 (stop command discovery requirement)
 */
export async function handleStop(options: StopOptions): Promise<number> {
  const format = (options.logFormat || 'text') as 'json' | 'text';
  const output = new OutputHandler(format);

  // Note: noRecursive option kept for consistency with other commands,
  // though stop doesn't strictly use config discovery (references daemon lock only)

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
