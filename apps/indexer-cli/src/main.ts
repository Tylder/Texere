#!/usr/bin/env node
/**
 * @file Texere Indexer – Run-Once CLI
 * @description CLI entrypoint for one-off snapshot indexing (non-server mode)
 * @reference docs/specs/feature/indexer/plan.md Slice 1 (run-once CLI)
 * @reference docs/specs/feature/indexer/configuration_and_server_setup.md §3–9 (config resolution)
 * @reference docs/specs/feature/indexer/ingest_spec.md §6 (orchestration flow)
 *
 * Usage:
 *   indexer --repo my-repo [--branch main] [--dry-run] [--force]
 *   indexer --repo my-repo --tracked-branches [--dry-run]
 *
 * Flags:
 *   --repo <id>              Codebase ID from config (required)
 *   --branch <name>          Single branch to index (default: main)
 *   --tracked-branches       Index all tracked branches from config
 *   --dry-run                Output JSON plan without writing to graph/vectors
 *   --force                  Reindex even if snapshot already indexed
 *   --fetch / --no-fetch     Fetch latest from remote (default: --fetch)
 *   --config <path>          Explicit config file path (default: auto-discovery)
 *   --log-format <format>    Console output format: 'json' | 'text' (default: 'text')
 *   --verbose                Enable debug logging
 *   --quiet                  Suppress non-error output
 *
 * Exit codes:
 *   0 - Success or dry-run
 *   1 - Config/validation error
 *   2 - Git/IO error
 *   3 - Database error
 *   4 - External/LLM error
 */

import { Command } from 'commander';

import {
  loadIndexerConfig,
  findCodebaseConfig,
  sanitizeConfigForLogging,
} from '@repo/indexer-core';
import { runSnapshot, runTrackedBranches, generateDryRunPlan } from '@repo/indexer-ingest';
import type { IndexerConfig, Logger } from '@repo/indexer-types';

// ============================================================================
// 1. Logging Implementation
// ============================================================================

interface LoggerConfig {
  format: 'json' | 'text';
  verbose?: boolean;
  quiet?: boolean;
}

function createLogger(config: LoggerConfig): Logger {
  const { format, verbose = false, quiet = false } = config;
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

  // Default: text format
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

// ============================================================================
// 2. CLI Implementation
// ============================================================================

async function main(): Promise<number> {
  const program = new Command();

  program
    .name('indexer')
    .description('Texere Indexer – CLI for snapshot indexing and configuration management')
    .version('0.0.0');

  program
    .command('snapshot')
    .description('Index a single snapshot (branch)')
    .option('--repo <id>', 'Codebase ID from config (required)')
    .option('--branch <name>', 'Branch to index (default: main)', 'main')
    .option('--dry-run', 'Output JSON plan without writing to graph/vectors', false)
    .option('--force', 'Reindex even if snapshot already indexed', false)
    .option('--fetch', 'Fetch latest from remote', true)
    .option('--no-fetch', 'Skip fetching from remote')
    .option('--config <path>', 'Explicit config file path')
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .option('--verbose', 'Enable debug logging', false)
    .option('--quiet', 'Suppress non-error output', false)
    .action(
      async (options: {
        repo?: string;
        branch: string;
        dryRun: boolean;
        force: boolean;
        fetch: boolean;
        noFetch: boolean;
        config?: string;
        logFormat: string;
        verbose: boolean;
        quiet: boolean;
      }) => {
        const exitCode = await handleSnapshot(options);
        process.exit(exitCode);
      },
    );

  program
    .command('branches')
    .description('Index all tracked branches for a codebase')
    .option('--repo <id>', 'Codebase ID from config (required)')
    .option('--dry-run', 'Output JSON plan without writing to graph/vectors', false)
    .option('--force', 'Reindex even if snapshots already indexed', false)
    .option('--fetch', 'Fetch latest from remote', true)
    .option('--no-fetch', 'Skip fetching from remote')
    .option('--config <path>', 'Explicit config file path')
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .option('--verbose', 'Enable debug logging', false)
    .option('--quiet', 'Suppress non-error output', false)
    .action(
      async (options: {
        repo?: string;
        dryRun: boolean;
        force: boolean;
        fetch: boolean;
        noFetch: boolean;
        config?: string;
        logFormat: string;
        verbose: boolean;
        quiet: boolean;
      }) => {
        const exitCode = await handleBranches(options);
        process.exit(exitCode);
      },
    );

  // Default to snapshot command if no subcommand
  program
    .option('--repo <id>', 'Codebase ID from config (required)')
    .option('--branch <name>', 'Branch to index (default: main)', 'main')
    .option('--tracked-branches', 'Index all tracked branches from config', false)
    .option('--dry-run', 'Output JSON plan without writing to graph/vectors', false)
    .option('--force', 'Reindex even if snapshot already indexed', false)
    .option('--fetch', 'Fetch latest from remote', true)
    .option('--no-fetch', 'Skip fetching from remote')
    .option('--config <path>', 'Explicit config file path')
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .option('--verbose', 'Enable debug logging', false)
    .option('--quiet', 'Suppress non-error output', false)
    .action(
      async (options: {
        repo?: string;
        branch: string;
        trackedBranches: boolean;
        dryRun: boolean;
        force: boolean;
        fetch: boolean;
        noFetch: boolean;
        config?: string;
        logFormat: string;
        verbose: boolean;
        quiet: boolean;
      }) => {
        if (options.trackedBranches) {
          const branchesOpts = {
            dryRun: options.dryRun,
            force: options.force,
            fetch: options.fetch && !options.noFetch,
            noFetch: options.noFetch,
            logFormat: options.logFormat,
            verbose: options.verbose,
            quiet: options.quiet,
          } as Parameters<typeof handleBranches>[0];
          if (options.repo) branchesOpts.repo = options.repo;
          if (options.config) branchesOpts.config = options.config;
          const exitCode = await handleBranches(branchesOpts);
          process.exit(exitCode);
        } else {
          const snapshotOpts = {
            dryRun: options.dryRun,
            force: options.force,
            fetch: options.fetch && !options.noFetch,
            noFetch: options.noFetch,
            logFormat: options.logFormat,
            verbose: options.verbose,
            quiet: options.quiet,
          } as Parameters<typeof handleSnapshot>[0];
          if (options.repo) snapshotOpts.repo = options.repo;
          if (options.branch) snapshotOpts.branch = options.branch;
          if (options.config) snapshotOpts.config = options.config;
          const exitCode = await handleSnapshot(snapshotOpts);
          process.exit(exitCode);
        }
      },
    );

  try {
    await program.parseAsync(process.argv);
    return 0;
  } catch (error) {
    console.error('CLI Error:', error instanceof Error ? error.message : String(error));
    return 4;
  }
}

// ============================================================================
// 3. Command Handlers (refactored to reduce cognitive complexity)
// ============================================================================

async function handleSnapshot(options: {
  repo?: string;
  branch?: string;
  dryRun: boolean;
  force: boolean;
  fetch?: boolean;
  noFetch?: boolean;
  config?: string;
  logFormat: string;
  verbose: boolean;
  quiet: boolean;
}): Promise<number> {
  try {
    if (!options.repo) {
      console.error('Error: --repo is required');
      return 1;
    }

    const logger = createLogger({
      format: (options.logFormat as 'json' | 'text') || 'text',
      verbose: options.verbose,
      quiet: options.quiet,
    });

    const branch = options.branch || 'main';
    const shouldFetch = options.fetch !== false && !options.noFetch;

    logger.info('Texere Indexer – Snapshot mode', {
      codebaseId: options.repo,
      branch,
      dryRun: options.dryRun,
      force: options.force,
      fetch: shouldFetch,
    });

    let indexerConfig: IndexerConfig;
    try {
      indexerConfig = loadIndexerConfig({
        ...(options.config && { path: options.config }),
        allowMissing: false,
      });
      logger.debug('Configuration loaded', {
        codebaseCount: indexerConfig.codebases.length,
        config: sanitizeConfigForLogging(indexerConfig),
      });
    } catch (error) {
      logger.error(
        'Failed to load configuration',
        error instanceof Error ? { message: error.message } : { error: String(error) },
      );
      return 1;
    }

    const codebaseConfig = findCodebaseConfig(indexerConfig, options.repo);
    if (!codebaseConfig) {
      logger.error('Codebase not found', {
        codebaseId: options.repo,
        available: indexerConfig.codebases.map((c) => c.id).join(', '),
      });
      return 1;
    }

    try {
      const result = await runSnapshot({
        codebaseId: options.repo,
        codebaseRoot: codebaseConfig.root,
        branch,
        config: indexerConfig,
        deps: { logger },
        dryRun: options.dryRun,
        force: options.force,
        fetch: shouldFetch,
      });

      if (options.dryRun) {
        const plan = {
          config: {
            codebaseId: options.repo,
            branch,
            neo4jUri: indexerConfig.graph.neo4jUri,
            qdrantUrl: indexerConfig.vectors.qdrantUrl,
          },
          snapshot: {
            snapshotId: result.snapshotRef.snapshotId,
            commitHash: result.snapshotRef.commitHash,
            changedFiles: result.changedFiles,
            plannedOperations: [
              'index-files',
              'extract-symbols',
              'write-graph',
              'generate-embeddings',
            ],
          },
        };
        console.log(JSON.stringify(plan, null, 2));
      } else {
        logger.info('Snapshot indexed successfully', {
          snapshotId: result.snapshotRef.snapshotId,
          commitHash: result.snapshotRef.commitHash,
          addedFiles: result.changedFiles.added.length,
          modifiedFiles: result.changedFiles.modified.length,
          deletedFiles: result.changedFiles.deleted.length,
          renamedFiles: result.changedFiles.renamed.length,
          skipped: result.skipped,
        });
      }

      return 0;
    } catch (error) {
      logger.error(
        'Failed to index snapshot',
        error instanceof Error ? { message: error.message } : { error: String(error) },
      );
      return error instanceof Error && error.message.includes('not found') ? 1 : 2;
    }
  } catch (error) {
    console.error('Unexpected error', error instanceof Error ? error.message : String(error));
    return 4;
  }
}

async function handleBranches(options: {
  repo?: string;
  dryRun: boolean;
  force: boolean;
  fetch?: boolean;
  noFetch?: boolean;
  config?: string;
  logFormat: string;
  verbose: boolean;
  quiet: boolean;
}): Promise<number> {
  try {
    if (!options.repo) {
      console.error('Error: --repo is required');
      return 1;
    }

    const logger = createLogger({
      format: (options.logFormat as 'json' | 'text') || 'text',
      verbose: options.verbose,
      quiet: options.quiet,
    });

    const shouldFetch = options.fetch !== false && !options.noFetch;

    logger.info('Texere Indexer – Tracked branches mode', {
      codebaseId: options.repo,
      dryRun: options.dryRun,
      force: options.force,
      fetch: shouldFetch,
    });

    let indexerConfig: IndexerConfig;
    try {
      indexerConfig = loadIndexerConfig({
        ...(options.config && { path: options.config }),
        allowMissing: false,
      });
      logger.debug('Configuration loaded', {
        codebaseCount: indexerConfig.codebases.length,
        config: sanitizeConfigForLogging(indexerConfig),
      });
    } catch (error) {
      logger.error(
        'Failed to load configuration',
        error instanceof Error ? { message: error.message } : { error: String(error) },
      );
      return 1;
    }

    if (options.dryRun) {
      return await runDryRunPlan(options.repo, indexerConfig, logger);
    }

    return await runBranchIndexing(options.repo, indexerConfig, logger, options.force, shouldFetch);
  } catch (error) {
    console.error('Unexpected error', error instanceof Error ? error.message : String(error));
    return 4;
  }
}

async function runDryRunPlan(
  codebaseId: string,
  indexerConfig: IndexerConfig,
  logger: Logger,
): Promise<number> {
  try {
    const plan = await generateDryRunPlan({
      codebaseId,
      config: indexerConfig,
      deps: { logger },
    });

    console.log(JSON.stringify(plan, null, 2));
    logger.info('Dry-run plan generated', {
      snapshots: plan.snapshots.length,
    });
    return 0;
  } catch (error) {
    logger.error(
      'Failed to generate dry-run plan',
      error instanceof Error ? { message: error.message } : { error: String(error) },
    );
    return error instanceof Error && error.message.includes('Codebase') ? 1 : 2;
  }
}

async function runBranchIndexing(
  codebaseId: string,
  indexerConfig: IndexerConfig,
  logger: Logger,
  force: boolean,
  shouldFetch: boolean,
): Promise<number> {
  try {
    const results = await runTrackedBranches({
      codebaseId,
      config: indexerConfig,
      deps: { logger },
      dryRun: false,
      force,
      fetch: shouldFetch,
    });

    logger.info('Tracked branches indexed', {
      succeeded: results.length,
    });

    for (const result of results) {
      logger.info(`Indexed ${result.snapshotRef.branch}`, {
        snapshotId: result.snapshotRef.snapshotId,
        commitHash: result.snapshotRef.commitHash,
        changedFiles: result.changedFiles.added.length + result.changedFiles.modified.length,
        skipped: result.skipped,
      });
    }

    return 0;
  } catch (error) {
    logger.error(
      'Failed to index tracked branches',
      error instanceof Error ? { message: error.message } : { error: String(error) },
    );
    return error instanceof Error && error.message.includes('not found') ? 1 : 2;
  }
}

// ============================================================================
// 4. CLI Entry Point
// ============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(4);
});
