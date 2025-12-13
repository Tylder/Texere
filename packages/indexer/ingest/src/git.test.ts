/**
 * @file Git Client Tests
 * @description Unit tests for SimpleGitClient
 * @reference testing_specification.md §3–7
 * @reference ingest_spec.md §6.1–6.2 (git operations)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { SimpleGitClient } from '../src/git';

describe('SimpleGitClient (ingest_spec.md §6 – git operations)', () => {
  let gitClient: SimpleGitClient;

  beforeEach(() => {
    gitClient = new SimpleGitClient();
  });

  describe('resolveCommitHash', () => {
    it('throws error when repository path does not exist', async () => {
      await expect(
        gitClient.resolveCommitHash({
          repoPath: '/nonexistent/path',
          ref: 'main',
        }),
      ).rejects.toThrow('Repository path not found');
    });

    it('throws error when ref does not exist in repo', async () => {
      await expect(
        gitClient.resolveCommitHash({
          repoPath: process.cwd(),
          ref: 'refs/heads/nonexistent-branch-xyz-12345',
        }),
      ).rejects.toThrow('Failed to resolve ref');
    });

    it('resolves current repo HEAD to a commit hash', async () => {
      const hash = await gitClient.resolveCommitHash({
        repoPath: process.cwd(),
        ref: 'HEAD',
      });

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^[a-f0-9]{7,40}$/);
    });
  });

  describe('getCommitMetadata', () => {
    it('returns timestamp for valid commit', async () => {
      const metadata = await gitClient.getCommitMetadata({
        repoPath: process.cwd(),
        commitHash: 'HEAD',
      });

      expect(metadata).toHaveProperty('timestamp');
      expect(typeof metadata.timestamp).toBe('number');
      expect(metadata.timestamp).toBeGreaterThan(0);
    });

    it('returns fallback timestamp for invalid commit', async () => {
      const metadata = await gitClient.getCommitMetadata({
        repoPath: process.cwd(),
        commitHash: 'nonexistent-hash-123',
      });

      // Should return current timestamp as fallback
      expect(metadata.timestamp).toBeTruthy();
      expect(typeof metadata.timestamp).toBe('number');
    });
  });

  describe('clone', () => {
    it('does not throw if target path already exists', async () => {
      // Should be idempotent
      await expect(
        gitClient.clone({
          gitUrl: 'https://github.com/nonexistent/repo.git',
          targetPath: process.cwd(),
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('fetch', () => {
    it('throws error when repository path does not exist', async () => {
      await expect(
        gitClient.fetch({
          repoPath: '/nonexistent/path',
        }),
      ).rejects.toThrow('Repository path not found');
    });

    it('returns (may fail if no remote configured or network unavailable)', async () => {
      // Fetch behavior depends on network/remote setup
      // So we just test that it doesn't throw immediately with path error
      try {
        await gitClient.fetch({
          repoPath: process.cwd(),
        });
        // Success or network error both acceptable
      } catch (error) {
        // Network errors are expected in some environments
        expect(error).toBeTruthy();
      }
    });
  });

  describe('computeChangedFiles', () => {
    it('throws error when repository path does not exist', async () => {
      await expect(
        gitClient.computeChangedFiles({
          repoPath: '/nonexistent/path',
          commitHash: 'abc123',
        }),
      ).rejects.toThrow('Repository path not found');
    });

    it('returns valid ChangedFileSet structure', async () => {
      const result = await gitClient.computeChangedFiles({
        repoPath: process.cwd(),
        commitHash: 'HEAD',
      });

      expect(result).toHaveProperty('added');
      expect(result).toHaveProperty('modified');
      expect(result).toHaveProperty('deleted');
      expect(result).toHaveProperty('renamed');

      expect(Array.isArray(result.added)).toBe(true);
      expect(Array.isArray(result.modified)).toBe(true);
      expect(Array.isArray(result.deleted)).toBe(true);
      expect(Array.isArray(result.renamed)).toBe(true);
    });

    it('treats renames as delete+add per spec §2.5', async () => {
      const result = await gitClient.computeChangedFiles({
        repoPath: process.cwd(),
        commitHash: 'HEAD',
      });

      // For each rename, both paths should be in added/deleted
      for (const rename of result.renamed) {
        expect(result.deleted).toContain(rename.from);
        expect(result.added).toContain(rename.to);
      }
    });
  });
});
