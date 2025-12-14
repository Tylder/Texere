/**
 * @file Snapshot Indexing Orchestrator
 * @description Programmatic API for snapshot resolution and indexing
 * @reference ingest_spec.md §2.1, §6 (orchestration)
 * @reference plan.md Slice 1 (runSnapshot, runTrackedBranches)
 *
 * Slice 1 implements:
 * - Config loading
 * - Branch resolution + snapshot selection
 * - Changed file detection via git diff
 * - Dry-run mode (JSON plan without writes)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { loadIndexerConfig, findCodebaseConfig } from '@repo/indexer-core';
import type {
  IndexerConfig,
  SnapshotRef,
  ChangedFileSet,
  RunDeps,
  DryRunPlan,
  Logger,
} from '@repo/indexer-types';

import { createGitClient } from './git.js';

/**
 * Check if repository directory exists.
 * Used to determine if git clone is needed.
 */
async function checkRepoExists(repoPath: string): Promise<boolean> {
  try {
    await fs.promises.access(repoPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate composite snapshot ID.
 * Format: ${codebaseId}:${commitHash}
 * @reference symbol_id_stability_spec.md (snapshot ID usage)
 */
export function generateSnapshotId(codebaseId: string, commitHash: string): string {
  return `${codebaseId}:${commitHash}`;
}

/**
 * Resolve a single branch to a snapshot reference.
 * @reference ingest_spec.md §6.1 (branch resolution)
 * @reference configuration_spec.md §1 (tracked branches)
 */
export async function resolveSnapshotForBranch(args: {
  codebaseId: string;
  codebaseRoot: string;
  branch: string;
  deps: { git: ReturnType<typeof createGitClient> };
}): Promise<SnapshotRef> {
  const { codebaseId, codebaseRoot, branch, deps } = args;

  // Resolve branch to commit hash
  const commitHash = await deps.git.resolveCommitHash({
    repoPath: codebaseRoot,
    ref: `refs/heads/${branch}`,
  });

  const snapshotId = generateSnapshotId(codebaseId, commitHash);

  return {
    codebaseId,
    commitHash,
    branch,
    snapshotType: 'branch',
    snapshotId,
  };
}

/**
 * Run indexing for a single snapshot.
 *
 * Main entry point for programmatic API.
 * Later slices (2–6) will add language indexing, graph writes, etc.
 *
 * Slice 1 scope:
 * - Resolve snapshot from branch + config
 * - Compute changed files via git
 * - Populate snapshot metadata
 * - Check snapshot cache (skip if already indexed unless force=true)
 * - Exit gracefully without writing graph/vectors
 * - Optional: Clone repo if not present
 *
 * @reference plan.md Slice 1 (runSnapshot)
 * @reference ingest_spec.md §2.1, §6 (orchestration)
 * @reference configuration_and_server_setup.md §2 (git clone)
 */
export async function runSnapshot(args: {
  snapshotRef?: SnapshotRef;
  codebaseId: string;
  codebaseRoot: string;
  branch?: string;
  config?: IndexerConfig;
  deps?: Partial<RunDeps>;
  dryRun?: boolean;
  force?: boolean;
  fetch?: boolean;
}): Promise<{
  snapshotRef: SnapshotRef;
  changedFiles: ChangedFileSet;
  skipped?: boolean;
}> {
  const {
    codebaseId,
    codebaseRoot,
    branch = 'main',
    config,
    deps = {},
    dryRun = false,
    force = false,
    fetch: shouldFetch = true,
  } = args;

  // Initialize default dependencies
  const git = deps.git || createGitClient();
  const logger = deps.logger || createDefaultLogger();
  let repoRoot = codebaseRoot;

  logger.info('Starting snapshot indexing', {
    codebaseId,
    branch,
    dryRun,
    force,
  });

  try {
    // Load config if provided for clone support
    const indexerConfig = config || loadIndexerConfig({ allowMissing: true });
    const codebaseConfig = findCodebaseConfig(indexerConfig, codebaseId);

    // Resolve repo root with cloneBasePath fallback
    if (
      !(await checkRepoExists(repoRoot)) &&
      indexerConfig.cloneBasePath &&
      codebaseConfig?.gitUrl
    ) {
      repoRoot = path.join(indexerConfig.cloneBasePath, codebaseId);
    }

    // Optional: Clone repo if not present
    if (codebaseConfig?.gitUrl) {
      const repoExists = await checkRepoExists(repoRoot);
      if (!repoExists) {
        logger.info('Repository not found, attempting clone', {
          gitUrl: codebaseConfig.gitUrl,
          targetPath: repoRoot,
        });
        try {
          await git.clone({
            gitUrl: codebaseConfig.gitUrl,
            targetPath: repoRoot,
          });
          logger.info('Repository cloned successfully', { targetPath: repoRoot });
        } catch (error) {
          logger.error(
            'Failed to clone repository',
            error instanceof Error ? { message: error.message } : { error: String(error) },
          );
          throw error;
        }
      }
    }

    // Optional: fetch latest from remote
    if (shouldFetch) {
      logger.debug('Fetching latest commits from remote', { branch });
      try {
        await git.fetch({ repoPath: repoRoot, ref: branch });
      } catch (error) {
        logger.warn(
          'Failed to fetch',
          error instanceof Error ? { message: error.message } : { error: String(error) },
        );
        // Continue anyway; local ref might be sufficient
      }
    }

    // Resolve branch to snapshot
    const snapshotRef = await resolveSnapshotForBranch({
      codebaseId,
      codebaseRoot: repoRoot,
      branch,
      deps: { git },
    });

    logger.debug('Resolved snapshot', {
      snapshotId: snapshotRef.snapshotId,
      commitHash: snapshotRef.commitHash,
    });

    // TODO: Slice 3 will implement snapshot cache check
    // For now, always proceed (cache always misses)
    // if (!force && await isSnapshotCached(snapshotRef)) {
    //   logger.info('Snapshot already indexed, skipping', { snapshotId: snapshotRef.snapshotId });
    //   return { snapshotRef, changedFiles: { added: [], modified: [], deleted: [], renamed: [] }, skipped: true };
    // }

    // Compute changed files
    const changedFiles = await git.computeChangedFiles({
      repoPath: repoRoot,
      commitHash: snapshotRef.commitHash,
      // First index uses full tree; later incremental
    });

    logger.info('Computed changed files', {
      added: changedFiles.added.length,
      modified: changedFiles.modified.length,
      deleted: changedFiles.deleted.length,
      renamed: changedFiles.renamed.length,
    });

    if (dryRun) {
      logger.info('Dry-run mode: skipping graph/vector writes');
    }

    return { snapshotRef, changedFiles };
  } catch (error) {
    logger.error('Failed to run snapshot', error as Error);
    throw error;
  }
}

/**
 * Run indexing for all tracked branches of a codebase.
 *
 * Main orchestration entry point for non-server mode.
 * Calls runSnapshot for each tracked branch sequentially.
 *
 * @reference plan.md Slice 1 (runTrackedBranches)
 * @reference configuration_and_server_setup.md §3 (per-repo config)
 * @reference ingest_spec.md §6.1 (branch tracking)
 */
export async function runTrackedBranches(args: {
  codebaseId: string;
  config?: IndexerConfig;
  deps?: Partial<RunDeps>;
  dryRun?: boolean;
  force?: boolean;
  fetch?: boolean;
}): Promise<
  Array<{
    snapshotRef: SnapshotRef;
    changedFiles: ChangedFileSet;
    skipped?: boolean;
  }>
> {
  const {
    codebaseId,
    config,
    deps = {},
    dryRun = false,
    force = false,
    fetch: shouldFetch = true,
  } = args;

  const logger = deps.logger || createDefaultLogger();

  // Load config if not provided
  const indexerConfig = config || loadIndexerConfig({ allowMissing: true });

  // Find codebase config
  const codebaseConfig = findCodebaseConfig(indexerConfig, codebaseId);
  if (!codebaseConfig) {
    throw new Error(
      `Codebase configuration not found for ID: ${codebaseId}. ` +
        `Available: ${indexerConfig.codebases.map((c) => c.id).join(', ')}`,
    );
  }

  logger.info('Running tracked branches', {
    codebaseId,
    branches: codebaseConfig.trackedBranches,
    dryRun,
    force,
  });

  const results = [];

  // Index each tracked branch
  for (const branch of codebaseConfig.trackedBranches) {
    try {
      const result = await runSnapshot({
        codebaseId,
        codebaseRoot: codebaseConfig.root,
        branch,
        config: indexerConfig,
        deps: deps as RunDeps,
        dryRun,
        force,
        fetch: shouldFetch,
      });

      results.push(result);
      if (result.skipped) {
        logger.info(`Skipped branch (already indexed): ${branch}`, {
          snapshotId: result.snapshotRef.snapshotId,
        });
      } else {
        logger.info(`Indexed branch: ${branch}`, {
          snapshotId: result.snapshotRef.snapshotId,
        });
      }
    } catch (error) {
      logger.error(`Failed to index branch ${branch}`, error as Error);
      // Continue with next branch (partial success)
    }
  }

  logger.info('Completed tracked branches indexing', {
    total: codebaseConfig.trackedBranches.length,
    succeeded: results.length,
  });

  return results;
}

/**
 * Generate dry-run plan (JSON output without writes).
 * Used by CLI --dry-run mode.
 *
 * @reference plan.md Slice 1 (dry-run mode)
 */
export async function generateDryRunPlan(args: {
  codebaseId: string;
  config?: IndexerConfig;
  deps?: Partial<RunDeps>;
}): Promise<DryRunPlan> {
  const { codebaseId, config, deps = {} } = args;

  const logger = deps.logger || createDefaultLogger();

  // Load config
  const indexerConfig = config || loadIndexerConfig({ allowMissing: true });

  // Find codebase
  const codebaseConfig = findCodebaseConfig(indexerConfig, codebaseId);
  if (!codebaseConfig) {
    throw new Error(`Codebase not found: ${codebaseId}`);
  }

  // Resolve all branches
  const snapshots: DryRunPlan['snapshots'] = [];

  for (const branch of codebaseConfig.trackedBranches) {
    try {
      const result = await runSnapshot({
        codebaseId,
        codebaseRoot: codebaseConfig.root,
        branch,
        config: indexerConfig,
        deps: deps as RunDeps,
        dryRun: true,
      });

      snapshots.push({
        snapshotId: result.snapshotRef.snapshotId!,
        commitHash: result.snapshotRef.commitHash,
        branch: result.snapshotRef.branch || 'unknown',
        changedFiles: result.changedFiles,
        plannedOperations: ['index-files', 'extract-symbols', 'write-graph', 'generate-embeddings'],
      });
    } catch (error) {
      const errorInfo: Record<string, unknown> =
        error instanceof Error ? { message: error.message } : { error: String(error) };
      logger.warn(`Failed to resolve branch ${branch}`, errorInfo);
    }
  }

  return {
    config: {
      codebaseId,
      neo4jUri: indexerConfig.graph.neo4jUri,
      qdrantUrl: indexerConfig.vectors.qdrantUrl,
      languages: codebaseConfig.languages || ['ts', 'tsx', 'js'],
    },
    snapshots,
  };
}

/**
 * Default logger implementation (console-based).
 * Used when no logger provided in deps.
 */
function createDefaultLogger(): Logger {
  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      console.log(`[DEBUG] ${message}`, context ? JSON.stringify(context) : '');
    },
    info: (message: string, context?: Record<string, unknown>) => {
      console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : '');
    },
    error: (message: string, error?: Error | Record<string, unknown>) => {
      console.error(
        `[ERROR] ${message}`,
        error instanceof Error ? error.message : JSON.stringify(error),
      );
    },
  };
}
