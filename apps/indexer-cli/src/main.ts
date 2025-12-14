#!/usr/bin/env node
/**
 * @file Texere Indexer – Full CLI Implementation
 * @description Complete CLI entrypoint with all commands: validate, list, status, run, stop
 * @reference docs/specs/feature/indexer/cli_spec.md (authoritative)
 * @reference docs/specs/feature/indexer/configuration_and_server_setup.md §3–9
 * @reference docs/specs/feature/indexer/ingest_spec.md §6
 *
 * Slice 1 scope: Git snapshot resolution, diff plumbing, programmatic API, full CLI
 */

import { Command } from 'commander';

import {
  handleValidate,
  handleList,
  handleStatus,
  handleRun,
  handleStop,
  type ValidateOptions,
  type ListOptions,
  type StatusOptions,
  type RunOptions,
  type StopOptions,
} from './commands/index.js';

async function main(): Promise<number> {
  const program = new Command();

  program
    .name('indexer')
    .description('Texere Indexer – Snapshot indexing and configuration management')
    .version('0.0.0');

  // ============================================================================
  // validate command
  // ============================================================================
  program
    .command('validate')
    .description('Validate configuration syntax and structure without executing indexing')
    .option('--config <path>', 'Explicit config file path')
    .option(
      '--no-recursive',
      'Disable per-repo config discovery (validate only orchestrator)',
      false,
    )
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .action(async (options: unknown) => {
      const exitCode = await handleValidate(options as ValidateOptions);
      process.exit(exitCode);
    });

  // ============================================================================
  // list command
  // ============================================================================
  program
    .command('list')
    .description('Discover all configured codebases, their tracked branches, and index status')
    .option('--no-recursive', 'Disable per-repo config discovery', false)
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .option('--verbose', 'Show discovery details (config paths scanned, etc.)', false)
    .action(async (options: unknown) => {
      const exitCode = await handleList(options as ListOptions);
      process.exit(exitCode);
    });

  // ============================================================================
  // status command
  // ============================================================================
  program
    .command('status')
    .description('Check daemon status and database connectivity')
    .option('--no-recursive', 'Disable per-repo config discovery', false)
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .action(async (options: unknown) => {
      const exitCode = await handleStatus(options as StatusOptions);
      process.exit(exitCode);
    });

  // ============================================================================
  // run command
  // ============================================================================
  program
    .command('run')
    .description('Execute indexing across all configured codebases and branches')
    .option('--once', 'Run once and exit (default, cron/CI friendly)', true)
    .option('--daemon', 'Run in foreground with streaming logs', false)
    .option('--detached', 'Start daemon in background', false)
    .option('--dry-run', 'Generate plan without writing to graph/vectors', false)
    .option('--force', 'Reindex even if snapshot already exists', false)
    .option('--no-fetch', 'Skip fetching; use only local git state', false)
    .option('--no-recursive', 'Disable per-repo config discovery', false)
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .option('--verbose', 'Enable debug logging', false)
    .option('--quiet', 'Suppress non-error output', false)
    .option('--config <path>', 'Explicit config file path')
    .action(async (options: unknown) => {
      const exitCode = await handleRun(options as RunOptions);
      process.exit(exitCode);
    });

  // ============================================================================
  // stop command
  // ============================================================================
  program
    .command('stop')
    .description('Gracefully shutdown a running daemon')
    .option('--force', 'Force kill immediately (SIGKILL)', false)
    .option('--timeout <seconds>', 'Seconds to wait for graceful shutdown', '30')
    .option('--no-recursive', 'Disable per-repo config discovery', false)
    .option('--log-format <format>', 'Output format: json|text', 'text')
    .action(async (options: unknown) => {
      const exitCode = await handleStop(options as StopOptions);
      process.exit(exitCode);
    });

  try {
    await program.parseAsync(process.argv);
    return 0;
  } catch (error) {
    console.error('CLI Error:', error instanceof Error ? error.message : String(error));
    return 4;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(4);
});
