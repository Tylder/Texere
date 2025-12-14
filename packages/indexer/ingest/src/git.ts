/**
 * @file Git Operations Client
 * @description Git-based snapshot resolution and diff computation
 * @reference ingest_spec.md §6.1–6.2 (git operations)
 * @reference configuration_and_server_setup.md §2 (git clone)
 * @reference testing_specification.md §3.6–3.7 (dependency injection for testability)
 *
 * Slice 1 implements: branch resolution, commit metadata, changed file diff.
 * Uses simple-git library for cross-platform compatibility.
 *
 * Testability: SimpleGitClient accepts injected SimpleGitImpl factory + Logger
 * for easy mocking in tests. No mutable state; no console calls.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { simpleGit } from 'simple-git';

import type { ChangedFileSet, GitClient, SimpleGitImpl, Logger } from '@repo/indexer-types';

/**
 * File system provider interface for testability.
 * @reference testing_specification.md §3.6–3.7 (dependency injection)
 */
export interface FileSystemProvider {
  /**
   * Check if a path exists
   */
  exists(path: string): boolean;

  /**
   * Create directories recursively
   */
  mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
}

/**
 * Default file system provider using Node.js fs module
 */
const defaultFileSystem: FileSystemProvider = {
  exists: (filePath: string) => fs.existsSync(filePath),
  mkdirSync: (dirPath: string, options?: { recursive?: boolean }) => fs.mkdirSync(dirPath, options),
};

/**
 * Simple-git based implementation of GitClient.
 * @reference ingest_spec.md §6 (git operations)
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 *
 * Constructor accepts:
 * - gitFactory: creates SimpleGitImpl instances (testable via mock)
 * - logger: optional logger for warnings/errors (defaults to noop)
 */
export class SimpleGitClient implements GitClient {
  /**
   * No-op logger for use when none provided
   */
  private static readonly noopLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  constructor(
    private gitFactory: (repoPath: string) => SimpleGitImpl,
    private logger: Logger = SimpleGitClient.noopLogger,
    private fsProvider: FileSystemProvider = defaultFileSystem,
  ) {}

  /**
   * Get or create SimpleGitImpl instance for a repo.
   * Factory is injected for testability.
   */
  private getGitInstance(repoPath: string): SimpleGitImpl {
    // Note: Not caching instances to avoid mutable state
    // Each call creates fresh instance (safer for tests)
    return this.gitFactory(repoPath);
  }

  /**
   * Resolve branch name to commit hash.
   * @reference ingest_spec.md §6.1 (branch resolution)
   * @throws Error if branch not found or repo invalid
   */
  async resolveCommitHash(args: { repoPath: string; ref: string }): Promise<string> {
    const { repoPath, ref } = args;

    if (!this.fsProvider.exists(repoPath)) {
      throw new Error(`Repository path not found: ${repoPath}`);
    }

    const git = this.getGitInstance(repoPath);

    try {
      // Try to resolve ref to commit hash
      // Supports: branch names, tags, commit hashes
      const hash = await git.revparse([ref]);
      return hash.trim();
    } catch (error) {
      throw new Error(
        `Failed to resolve ref '${ref}' in repository ${repoPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Get commit metadata (author, message, timestamp).
   * @reference ingest_spec.md §6.1 (snapshot metadata)
   */
  async getCommitMetadata(args: {
    repoPath: string;
    commitHash: string;
  }): Promise<{ author?: string; message?: string; timestamp: number }> {
    const { repoPath, commitHash } = args;

    const git = this.getGitInstance(repoPath);

    try {
      // Get commit details with custom format
      const log = await git.log(['-n', '1', '--format=%an|%s|%ci', commitHash]);

      if (!log.latest) {
        throw new Error(`Commit not found: ${commitHash}`);
      }

      // Parse the custom format: author|subject|committer-date-iso
      const parts = log.latest.message.split('|');
      const author = parts[0] && parts[0].length > 0 ? parts[0] : undefined;
      const message = parts[1] && parts[1].length > 0 ? parts[1] : undefined;
      const dateStr = parts[2];
      const timestamp = dateStr ? new Date(dateStr).getTime() : Date.now();

      const result: { author?: string; message?: string; timestamp: number } = {
        timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      };
      if (author) result.author = author;
      if (message) result.message = message;
      return result;
    } catch (error) {
      // If we can't get metadata, return current timestamp as fallback
      this.logger.warn(
        `Failed to get metadata for ${commitHash}`,
        error instanceof Error ? { message: error.message } : { error: String(error) },
      );
      return { timestamp: Date.now() };
    }
  }

  /**
   * Clone repository if not already present.
   * @reference configuration_and_server_setup.md §2 (git clone)
   */
  async clone(args: { gitUrl: string; targetPath: string; depth?: number }): Promise<void> {
    const { gitUrl, targetPath, depth } = args;

    if (this.fsProvider.exists(targetPath)) {
      // Already cloned
      return;
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath);
    if (!this.fsProvider.exists(parentDir)) {
      this.fsProvider.mkdirSync(parentDir, { recursive: true });
    }

    const cloneArgs: string[] = [gitUrl, targetPath];
    if (depth) {
      cloneArgs.push('--depth', String(depth));
    }

    try {
      const git = simpleGit();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cloneOptions: any = {};
      if (depth) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        cloneOptions.depth = depth;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await git.clone(gitUrl, targetPath, cloneOptions);
    } catch (error) {
      throw new Error(
        `Failed to clone repository ${gitUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Fetch latest commits from remote.
   * @reference plan.md Slice 1 (--fetch flag)
   */
  async fetch(args: { repoPath: string; ref?: string }): Promise<void> {
    const { repoPath, ref } = args;

    if (!this.fsProvider.exists(repoPath)) {
      throw new Error(`Repository path not found: ${repoPath}`);
    }

    const git = this.getGitInstance(repoPath);

    try {
      if (ref) {
        await git.fetch('origin', ref);
      } else {
        await git.fetch();
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch in repository ${repoPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Compute changed files between two commits.
   * Treats renames as delete+add per ingest_spec.md §2.5.
   * @reference ingest_spec.md §6.2 (diff computation)
   * @reference ingest_spec.md §2.5 (rename handling)
   */
  async computeChangedFiles(args: {
    repoPath: string;
    commitHash: string;
    baseCommit?: string;
  }): Promise<ChangedFileSet> {
    const { repoPath, commitHash, baseCommit } = args;

    if (!this.fsProvider.exists(repoPath)) {
      throw new Error(`Repository path not found: ${repoPath}`);
    }

    const git = this.getGitInstance(repoPath);

    try {
      const added: string[] = [];
      const modified: string[] = [];
      const deleted: string[] = [];
      const renamed: Array<{ from: string; to: string }> = [];

      // Determine base commit for diff
      const base = baseCommit || `${commitHash}^`;

      // Use raw git command to get file status
      const diff = await git.raw([
        'diff-tree',
        '-r', // recursive
        '--name-status', // show only names and status
        base,
        commitHash,
      ]);

      // Parse diff output: each line is "STATUS\tPATH" or "STATUS\tOLDPATH\tNEWPATH" for renames
      const lines = diff.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const parts = line.split('\t').filter(Boolean);
        if (parts.length === 0) continue;

        const status = parts[0];

        if (status === 'A' && parts[1]) {
          // Added file
          added.push(parts[1]);
        } else if (status === 'M' && parts[1]) {
          // Modified file
          modified.push(parts[1]);
        } else if (status === 'D' && parts[1]) {
          // Deleted file
          deleted.push(parts[1]);
        } else if (status === 'R' && parts[1] && parts[2]) {
          // Renamed file: treat as delete + add per ingest_spec.md §2.5
          // R100: old_path  new_path
          const oldPath = parts[1];
          const newPath = parts[2];
          deleted.push(oldPath);
          added.push(newPath);
          renamed.push({ from: oldPath, to: newPath });
        }
        // Ignore other statuses (C=copy, T=type change, etc.) for v1
      }

      return { added, modified, deleted, renamed };
    } catch (error) {
      throw new Error(
        `Failed to compute changed files: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

/**
 * Wrapper to make SimpleGit implement SimpleGitImpl interface.
 * For production use; tests use mock instead.
 */
function createSimpleGitImpl(repoPath: string): SimpleGitImpl {
  const git = simpleGit(repoPath);
  return {
    revparse: (args: string[]): Promise<string> => git.revparse(args),
    log: (args: string[]): Promise<{ latest?: { message: string } }> =>
      git.log(args).then((result) => {
        if (result.latest) {
          return { latest: { message: result.latest.message } };
        }
        return {};
      }),
    raw: (args: string[]): Promise<string> => git.raw(...args),
    fetch: (remote?: string, ref?: string): Promise<void> => {
      if (ref) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        git.fetch('origin', ref);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        git.fetch();
      }
      return Promise.resolve();
    },
    clone: (
      gitUrl: string,
      targetPath: string,
      options?: Record<string, unknown>,
    ): Promise<void> => {
      // Convert generic options to string array for simple-git
      const gitOptions: string[] = [];
      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          if (value === true) {
            gitOptions.push(`--${key}`);
          } else if (value && typeof value === 'string') {
            gitOptions.push(`--${key}=${value}`);
          }
        });
      }
      return (git.clone(gitUrl, targetPath, gitOptions) as Promise<unknown>).then(() => {});
    },
  };
}

/**
 * Create a git client instance for production.
 * @reference ingest_spec.md §6 (git operations)
 * @reference testing_specification.md §3.6–3.7 (use createGitClientWithDeps in tests)
 */
export function createGitClient(logger?: Logger, fsProvider?: FileSystemProvider): GitClient {
  return new SimpleGitClient(createSimpleGitImpl, logger, fsProvider);
}

/**
 * Create git client with fully injected dependencies (for testing).
 * @reference testing_specification.md §3.6–3.7
 */
export function createGitClientWithDeps(
  gitFactory: (repoPath: string) => SimpleGitImpl,
  logger?: Logger,
  fsProvider?: FileSystemProvider,
): GitClient {
  return new SimpleGitClient(gitFactory, logger, fsProvider);
}
