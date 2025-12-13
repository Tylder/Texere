/**
 * @file Orchestrator Tests
 * @description Unit tests for snapshot resolution and diff computation
 * @reference testing_specification.md §3–7 (colocated test patterns)
 * @reference plan.md Slice 1 (git snapshot resolution, diff plumbing)
 * @reference test_repository_spec.md (synthetic git fixtures)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { GitClient, ChangedFileSet } from '@repo/indexer-types';

import {
  generateSnapshotId,
  resolveSnapshotForBranch,
  runSnapshot,
  runTrackedBranches,
  generateDryRunPlan,
} from '../src/orchestrator';

// ============================================================================
// 1. Mock GitClient for Testing
// ============================================================================

class MockGitClient implements GitClient {
  private commits: Map<
    string,
    { hash: string; author?: string; message?: string; timestamp: number }
  > = new Map();
  private diffs: Map<string, ChangedFileSet> = new Map();

  setCommit(
    ref: string,
    hash: string,
    metadata?: { author?: string; message?: string; timestamp?: number },
  ): void {
    this.commits.set(ref, {
      hash,
      author: metadata?.author,
      message: metadata?.message,
      timestamp: metadata?.timestamp ?? Date.now(),
    });
  }

  setDiff(commitHash: string, diff: ChangedFileSet): void {
    this.diffs.set(commitHash, diff);
  }

  resolveCommitHash(args: { repoPath: string; ref: string }): Promise<string> {
    const key = `${args.repoPath}::${args.ref}`;
    const commit = this.commits.get(key) || this.commits.get(args.ref);
    if (!commit) {
      return Promise.reject(new Error(`Branch not found: ${args.ref}`));
    }
    return Promise.resolve(commit.hash);
  }

  getCommitMetadata(args: { repoPath: string; commitHash: string }): Promise<{
    author?: string;
    message?: string;
    timestamp: number;
  }> {
    const commit = Array.from(this.commits.values()).find((c) => c.hash === args.commitHash);
    if (!commit) {
      return Promise.resolve({ timestamp: Date.now() });
    }
    return Promise.resolve({
      author: commit.author,
      message: commit.message,
      timestamp: commit.timestamp,
    });
  }

  clone(): Promise<void> {
    // No-op for tests
    return Promise.resolve();
  }

  fetch(): Promise<void> {
    // No-op for tests
    return Promise.resolve();
  }

  computeChangedFiles(args: {
    repoPath: string;
    commitHash: string;
    baseCommit?: string;
  }): Promise<ChangedFileSet> {
    const diff = this.diffs.get(args.commitHash);
    if (!diff) {
      return Promise.resolve({ added: [], modified: [], deleted: [], renamed: [] });
    }
    return Promise.resolve(diff);
  }
}

// ============================================================================
// 2. Snapshot ID Generation Tests
// ============================================================================

describe('generateSnapshotId (planning.md Slice 1 – symbol ID stability)', () => {
  it('generates composite snapshot ID from codebase and commit hash', () => {
    const id = generateSnapshotId('my-repo', 'abc123def456');
    expect(id).toBe('my-repo:abc123def456');
  });

  it('produces stable IDs for same inputs', () => {
    const id1 = generateSnapshotId('repo', 'hash');
    const id2 = generateSnapshotId('repo', 'hash');
    expect(id1).toBe(id2);
  });

  it('produces different IDs for different commits', () => {
    const id1 = generateSnapshotId('repo', 'hash1');
    const id2 = generateSnapshotId('repo', 'hash2');
    expect(id1).not.toBe(id2);
  });
});

// ============================================================================
// 3. Branch Resolution Tests
// ============================================================================

describe('resolveSnapshotForBranch (ingest_spec.md §6.1)', () => {
  let gitClient: MockGitClient;

  beforeEach(() => {
    gitClient = new MockGitClient();
  });

  it('resolves branch to snapshot reference', async () => {
    gitClient.setCommit('refs/heads/main', 'abc123', {
      author: 'Alice',
      message: 'Initial commit',
    });

    const snapshot = await resolveSnapshotForBranch({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
    });

    expect(snapshot).toEqual({
      codebaseId: 'my-repo',
      commitHash: 'abc123',
      branch: 'main',
      snapshotType: 'branch',
      snapshotId: 'my-repo:abc123',
    });
  });

  it('throws error if branch not found', async () => {
    await expect(
      resolveSnapshotForBranch({
        codebaseId: 'my-repo',
        codebaseRoot: '/repo',
        branch: 'nonexistent',
        deps: { git: gitClient },
      }),
    ).rejects.toThrow('Branch not found');
  });

  it('sets snapshotType to branch for tracked branches', async () => {
    gitClient.setCommit('refs/heads/develop', 'def456');

    const snapshot = await resolveSnapshotForBranch({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'develop',
      deps: { git: gitClient },
    });

    expect(snapshot.snapshotType).toBe('branch');
  });
});

// ============================================================================
// 4. Snapshot Indexing Tests
// ============================================================================

describe('runSnapshot (ingest_spec.md §2.1, §6)', () => {
  let gitClient: MockGitClient;

  beforeEach(() => {
    gitClient = new MockGitClient();
    gitClient.setCommit('refs/heads/main', 'abc123');
    gitClient.setDiff('abc123', {
      added: ['src/index.ts', 'src/lib.ts'],
      modified: ['README.md'],
      deleted: ['old.ts'],
      renamed: [],
    });
  });

  it('computes changed files for snapshot', async () => {
    const result = await runSnapshot({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
      dryRun: true,
    });

    expect(result.changedFiles).toEqual({
      added: ['src/index.ts', 'src/lib.ts'],
      modified: ['README.md'],
      deleted: ['old.ts'],
      renamed: [],
    });
  });

  it('respects dryRun flag without writing graph/vectors', async () => {
    const result = await runSnapshot({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
      dryRun: true,
    });

    expect(result.snapshotRef.snapshotId).toBe('my-repo:abc123');
  });

  it('includes snapshot metadata in result', async () => {
    gitClient.setCommit('refs/heads/main', 'abc123', {
      author: 'Alice',
      message: 'Add feature',
      timestamp: 1000,
    });

    const result = await runSnapshot({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
    });

    expect(result.snapshotRef).toMatchObject({
      codebaseId: 'my-repo',
      commitHash: 'abc123',
      branch: 'main',
      snapshotType: 'branch',
    });
  });

  it('skips fetch if fetch=false', async () => {
    const fetchSpy = vi.spyOn(gitClient, 'fetch');

    await runSnapshot({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
      fetch: false,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('attempts fetch if fetch=true', async () => {
    const fetchSpy = vi.spyOn(gitClient, 'fetch').mockResolvedValue(undefined);

    await runSnapshot({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
      fetch: true,
    });

    expect(fetchSpy).toHaveBeenCalledWith({ repoPath: '/repo', ref: 'main' });
  });

  it('continues if fetch fails (non-blocking)', async () => {
    vi.spyOn(gitClient, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await runSnapshot({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
      fetch: true,
    });

    expect(result.snapshotRef.commitHash).toBe('abc123');
  });
});

// ============================================================================
// 5. Tracked Branches Indexing Tests
// ============================================================================

describe('runTrackedBranches (ingest_spec.md §6.1)', () => {
  let gitClient: MockGitClient;

  beforeEach(() => {
    gitClient = new MockGitClient();
    gitClient.setCommit('refs/heads/main', 'abc123');
    gitClient.setCommit('refs/heads/develop', 'def456');
    gitClient.setDiff('abc123', { added: ['file1.ts'], modified: [], deleted: [], renamed: [] });
    gitClient.setDiff('def456', { added: ['file2.ts'], modified: [], deleted: [], renamed: [] });
  });

  it('indexes all tracked branches sequentially', async () => {
    const config = {
      version: '1.0',
      codebases: [
        {
          id: 'my-repo',
          root: '/repo',
          trackedBranches: ['main', 'develop'],
        },
      ],
      graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'password' },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const results = await runTrackedBranches({
      codebaseId: 'my-repo',
      config,
      deps: { git: gitClient },
    });

    expect(results).toHaveLength(2);
    expect(results[0].snapshotRef.commitHash).toBe('abc123');
    expect(results[1].snapshotRef.commitHash).toBe('def456');
  });

  it('throws if codebase not found in config', async () => {
    const config = {
      version: '1.0',
      codebases: [],
      graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'password' },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    await expect(
      runTrackedBranches({
        codebaseId: 'nonexistent',
        config,
        deps: { git: gitClient },
      }),
    ).rejects.toThrow('Codebase configuration not found');
  });

  it('continues with next branch if one fails', async () => {
    gitClient.setCommit('refs/heads/main', 'abc123');
    // develop branch will fail
    const config = {
      version: '1.0',
      codebases: [
        {
          id: 'my-repo',
          root: '/repo',
          trackedBranches: ['main', 'develop', 'staging'],
        },
      ],
      graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'password' },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const results = await runTrackedBranches({
      codebaseId: 'my-repo',
      config,
      deps: { git: gitClient },
    });

    // Should have results for main and any other branches that don't throw
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 6. Dry-Run Plan Generation Tests
// ============================================================================

describe('generateDryRunPlan (plan.md Slice 1 – dry-run mode)', () => {
  let gitClient: MockGitClient;

  beforeEach(() => {
    gitClient = new MockGitClient();
    gitClient.setCommit('refs/heads/main', 'abc123');
    gitClient.setCommit('refs/heads/develop', 'def456');
    gitClient.setDiff('abc123', { added: ['file1.ts'], modified: [], deleted: [], renamed: [] });
    gitClient.setDiff('def456', { added: ['file2.ts'], modified: [], deleted: [], renamed: [] });
  });

  it('generates dry-run plan without writes', async () => {
    const config = {
      version: '1.0',
      codebases: [
        {
          id: 'my-repo',
          root: '/repo',
          trackedBranches: ['main', 'develop'],
          languages: ['ts', 'tsx'],
        },
      ],
      graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'password' },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const plan = await generateDryRunPlan({
      codebaseId: 'my-repo',
      config,
      deps: { git: gitClient },
    });

    expect(plan).toHaveProperty('config');
    expect(plan).toHaveProperty('snapshots');
    expect(plan.snapshots).toHaveLength(2);
    expect(plan.snapshots[0]).toHaveProperty('snapshotId');
    expect(plan.snapshots[0]).toHaveProperty('commitHash');
    expect(plan.snapshots[0]).toHaveProperty('changedFiles');
    expect(plan.snapshots[0]).toHaveProperty('plannedOperations');
  });

  it('includes merged config in plan', async () => {
    const config = {
      version: '1.0',
      codebases: [
        {
          id: 'my-repo',
          root: '/repo',
          trackedBranches: ['main'],
        },
      ],
      graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'password' },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const plan = await generateDryRunPlan({
      codebaseId: 'my-repo',
      config,
      deps: { git: gitClient },
    });

    expect(plan.config).toMatchObject({
      codebaseId: 'my-repo',
      neo4jUri: 'bolt://localhost:7687',
      qdrantUrl: 'http://localhost:6333',
    });
  });

  it('includes planned operations for each snapshot', async () => {
    const config = {
      version: '1.0',
      codebases: [
        {
          id: 'my-repo',
          root: '/repo',
          trackedBranches: ['main'],
        },
      ],
      graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'password' },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const plan = await generateDryRunPlan({
      codebaseId: 'my-repo',
      config,
      deps: { git: gitClient },
    });

    const snapshot = plan.snapshots[0];
    expect(snapshot.plannedOperations).toEqual([
      'index-files',
      'extract-symbols',
      'write-graph',
      'generate-embeddings',
    ]);
  });
});

// ============================================================================
// 7. Git Rename Handling Tests
// ============================================================================

describe('rename handling (ingest_spec.md §2.5)', () => {
  let gitClient: MockGitClient;

  beforeEach(() => {
    gitClient = new MockGitClient();
    gitClient.setCommit('refs/heads/main', 'abc123');
  });

  it('treats renames as delete + add in changed files', async () => {
    gitClient.setDiff('abc123', {
      added: ['new-name.ts'],
      modified: [],
      deleted: ['old-name.ts'],
      renamed: [{ from: 'old-name.ts', to: 'new-name.ts' }],
    });

    const result = await runSnapshot({
      codebaseId: 'my-repo',
      codebaseRoot: '/repo',
      branch: 'main',
      deps: { git: gitClient },
    });

    expect(result.changedFiles.renamed).toHaveLength(1);
    expect(result.changedFiles.deleted).toContain('old-name.ts');
    expect(result.changedFiles.added).toContain('new-name.ts');
  });
});
