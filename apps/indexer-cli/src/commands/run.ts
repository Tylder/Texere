/**
 * @file 'indexer run' command implementation
 * @description Execute indexing across all configured codebases and branches
 * @reference cli_spec.md §6 (run command)
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (recursive discovery pattern)
 */

import { discoverConfigs } from '@repo/indexer-core';
import { runTrackedBranches, generateDryRunPlan } from '@repo/indexer-ingest';
import type { Logger } from '@repo/indexer-types';

import { createLock, removeLock, getDaemonStatus } from '../daemon-lock.js';
import { OutputHandler, type RunOutput } from '../output-formatter.js';

type ValidationIssue = { message: string };

export interface RunOptions {
  once?: boolean;
  daemon?: boolean;
  detached?: boolean;
  dryRun?: boolean;
  force?: boolean;
  noFetch?: boolean;
  noRecursive?: boolean;
  logFormat?: string;
  verbose?: boolean;
  quiet?: boolean;
  config?: string;
}

/**
 * Create logger for run command
 */
function createLogger(format: string, verbose: boolean, quiet: boolean): Logger {
  const timestamp = (): string => new Date().toISOString();

  if (format === 'json') {
    return {
      debug: (message: string, context?: Record<string, unknown>) => {
        if (verbose) {
          console.log(
            JSON.stringify({
              timestamp: timestamp(),
              level: 'DEBUG',
              message,
              ...context,
            }),
          );
        }
      },
      info: (message: string, context?: Record<string, unknown>) => {
        if (!quiet) {
          console.log(
            JSON.stringify({
              timestamp: timestamp(),
              level: 'INFO',
              message,
              ...context,
            }),
          );
        }
      },
      warn: (message: string, context?: Record<string, unknown>) => {
        console.warn(
          JSON.stringify({
            timestamp: timestamp(),
            level: 'WARN',
            message,
            ...context,
          }),
        );
      },
      error: (message: string, error?: Error | Record<string, unknown>) => {
        console.error(
          JSON.stringify({
            timestamp: timestamp(),
            level: 'ERROR',
            message,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          }),
        );
      },
    };
  }

  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      if (verbose) {
        console.log(`[${timestamp()}] DEBUG: ${message}`, context ? JSON.stringify(context) : '');
      }
    },
    info: (message: string, context?: Record<string, unknown>) => {
      if (!quiet) {
        console.log(`[${timestamp()}] INFO: ${message}`, context ? JSON.stringify(context) : '');
      }
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      console.warn(`[${timestamp()}] WARN: ${message}`, context ? JSON.stringify(context) : '');
    },
    error: (message: string, error?: Error | Record<string, unknown>) => {
      const errorStr =
        error instanceof Error
          ? `${error.message}\n${error.stack}`
          : JSON.stringify(error, null, 2);
      console.error(`[${timestamp()}] ERROR: ${message}\n${errorStr}`);
    },
  };
}

/**
 * Handle run command
 * @reference cli_spec.md §6 (run command)
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (recursive config discovery pattern)
 * @reference cli_spec.md §6.1–6.3 (validation rules, modes)
 *
 * Complex function handles multiple modes (once/daemon/detached) with validation rules,
 * daemon lifecycle, dry-run, logging, and error handling per cli_spec.md §6. Implements
 * recursive config discovery (RECURSIVE_CONFIG_DISCOVERY.md §1). Complexity is intentional
 * and necessary to orchestrate these concerns.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function handleRun(options: RunOptions): Promise<number> {
  const format = (options.logFormat || 'text') as 'json' | 'text';
  const logger = createLogger(format, options.verbose || false, options.quiet || false);
  const output = new OutputHandler(format);

  try {
    // Validation Rule 1: --dry-run cannot combine with --daemon or --detached
    if (options.dryRun && (options.daemon || options.detached)) {
      console.error(
        'Error: --dry-run cannot be combined with --daemon or --detached. Use --dry-run with --once (default).',
      );
      return 1;
    }

    // Determine mode (default: --once)
    const mode: 'once' | 'daemon' | 'detached' = options.daemon
      ? 'daemon'
      : options.detached
        ? 'detached'
        : 'once';

    // Validation Rule 2: Check for existing daemon if --daemon or --detached
    if ((mode === 'daemon' || mode === 'detached') && !options.dryRun) {
      const daemonStatus = getDaemonStatus();
      if (daemonStatus.running && daemonStatus.pid) {
        console.error(
          `Daemon already running (PID ${daemonStatus.pid}). Stop existing daemon with 'indexer stop' first.`,
        );
        return 2;
      }
      if (!daemonStatus.running && daemonStatus.stalePid) {
        console.warn(`Found stale daemon lock (PID ${daemonStatus.stalePid}); cleaning up.`);
        removeLock();
      }
    }

    // Load config using recursive discovery
    let indexerConfig;
    try {
      const recursive = options.noRecursive !== true; // default: true
      // Discover configs using unified pattern
      // @reference RECURSIVE_CONFIG_DISCOVERY.md §1 (discovery pattern)
      const discoveryOptions: Parameters<typeof discoverConfigs>[0] = {
        recursive,
        ...(options.config ? { configPath: options.config } : {}),
      };
      const discovered = discoverConfigs(discoveryOptions);
      const discoveryErrors: ValidationIssue[] =
        (discovered as unknown as { errors?: ValidationIssue[] }).errors ?? [];
      if (discoveryErrors.length > 0) {
        discoveryErrors.forEach((err) => logger.error(`Config error: ${err.message}`));
        return 1;
      }
      indexerConfig = discovered.orchestrator.config;
    } catch (error) {
      logger.error(
        'Failed to load configuration',
        error instanceof Error ? { message: error.message } : { error: String(error) },
      );
      return 1;
    }

    if (!indexerConfig) {
      logger.error(
        'No orchestrator configuration found. Set INDEXER_CONFIG_PATH or pass --config.',
      );
      return 1;
    }

    // Validation Rule 3: At least one codebase configured
    if (!indexerConfig.codebases || indexerConfig.codebases.length === 0) {
      console.error('Error: No codebases found in config. Add repos to configuration.');
      return 1;
    }

    const shouldFetch = !options.noFetch;

    logger.info(`Texere Indexer – ${mode} mode`, {
      mode,
      dryRun: options.dryRun,
      force: options.force,
      fetch: shouldFetch,
    });

    // Handle dry-run mode
    if (options.dryRun) {
      try {
        const allSnapshots = [];

        for (const codebaseConfig of indexerConfig.codebases) {
          const plan = await generateDryRunPlan({
            codebaseId: codebaseConfig.id,
            config: indexerConfig,
            deps: { logger },
          });
          // Map ChangedFileSet to explicit arrays with branch defaulting
          const mappedSnapshots = plan.snapshots.map((s) => ({
            snapshotId: s.snapshotId,
            commitHash: s.commitHash,
            branch: s.branch || 'unknown',
            changedFiles: {
              added: s.changedFiles.added,
              modified: s.changedFiles.modified,
              deleted: s.changedFiles.deleted,
              renamed: s.changedFiles.renamed,
            },
            plannedOperations: s.plannedOperations,
          }));
          allSnapshots.push(...mappedSnapshots);
        }

        const json: RunOutput = {
          command: 'run',
          timestamp: new Date().toISOString(),
          mode: 'once',
          dryRun: true,
          plan: { snapshots: allSnapshots },
        };

        console.log(JSON.stringify(json, null, 2));
        return 0;
      } catch (error) {
        logger.error(
          'Failed to generate dry-run plan',
          error instanceof Error ? { message: error.message } : { error: String(error) },
        );
        return error instanceof Error && error.message.includes('not found') ? 1 : 2;
      }
    }

    // Create lock for daemon modes (auto-cleans stale locks)
    if (mode === 'daemon' || mode === 'detached') {
      try {
        createLock(mode, options.config || process.env['INDEXER_CONFIG_PATH'] || '');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        return 2;
      }
    }

    // Run indexing
    try {
      const results = [];

      for (const codebaseConfig of indexerConfig.codebases) {
        const codebaseResults = await runTrackedBranches({
          codebaseId: codebaseConfig.id,
          config: indexerConfig,
          deps: { logger },
          dryRun: false,
          force: options.force || false,
          fetch: shouldFetch,
        });
        results.push(...codebaseResults);
      }

      logger.info(`Indexing completed`, {
        succeeded: results.length,
      });

      // Format output
      const json: RunOutput = {
        command: 'run',
        timestamp: new Date().toISOString(),
        mode,
        dryRun: false,
        results: results.map((r) => ({
          codebaseId: r.snapshotRef.codebaseId,
          branch: r.snapshotRef.branch || 'unknown',
          snapshotId: r.snapshotRef.snapshotId || '',
          commitHash: r.snapshotRef.commitHash,
          changedFiles: {
            added: r.changedFiles.added.length,
            modified: r.changedFiles.modified.length,
            deleted: r.changedFiles.deleted.length,
            renamed: r.changedFiles.renamed.length,
          },
          skipped: r.skipped || false,
        })),
      };

      if (mode === 'detached') {
        json.daemonPid = process.pid;
        json.summary = `Daemon started (PID ${process.pid})`;
        logger.info(json.summary);
      }

      output.json(json);

      return 0;
    } catch (error) {
      logger.error(
        'Failed to run indexing',
        error instanceof Error ? { message: error.message } : { error: String(error) },
      );

      // Clean up lock on error
      if (mode === 'daemon' || mode === 'detached') {
        removeLock();
      }

      if (error instanceof Error && error.message.includes('not found')) {
        return 1;
      }
      return 2;
    }
  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? error.message : String(error));
    return 4;
  }
}
