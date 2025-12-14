/**
 * @file Git Client Tests
 * @description Unit tests for SimpleGitClient with full DI mocking
 * @reference testing_specification.md §3.6–3.7 (dependency injection patterns)
 * @reference ingest_spec.md §6.1–6.2 (git operations)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { SimpleGitImpl, Logger } from '@repo/indexer-types';

import type { FileSystemProvider } from './git.js';
import { createGitClientWithDeps } from './git.js';

/**
 * Mock SimpleGitImpl for testing
 * @reference testing_specification.md §3.6.1 (mock implementations)
 */
class MockSimpleGit implements SimpleGitImpl {
  constructor(private repoPath: string = '/test-repo') {}

  revparse(args: string[]): Promise<string> {
    // Simulate branch name resolution
    if (args[0]?.includes('main')) {
      return Promise.resolve('abc123def456');
    }
    if (args[0]?.includes('nonexistent')) {
      return Promise.reject(new Error('fatal: ambiguous argument'));
    }
    if (args[0] === 'HEAD') {
      return Promise.resolve('abc123def456');
    }
    return Promise.resolve('abc123def456');
  }

  log(args: string[]): Promise<{ latest?: { message: string } }> {
    if (args.includes('nonexistent')) {
      return Promise.resolve({}); // No commit found
    }
    return Promise.resolve({
      latest: {
        message: 'John Doe|Test commit|2024-01-15T10:30:00+00:00',
      },
    });
  }

  raw(args: string[]): Promise<string> {
    // Mock diff-tree output
    if (args[0] === 'diff-tree') {
      return Promise.resolve(
        'A\tscr/new-file.ts\nM\tsrc/modified.ts\nD\tsrc/deleted.ts\nR\tsrc/old.ts\tsrc/new.ts\n',
      );
    }
    return Promise.resolve('');
  }

  fetch(): Promise<void> {
    return Promise.resolve();
  }

  clone(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Mock file system provider for testing
 */
class MockFileSystem implements FileSystemProvider {
  constructor(private existingPaths: Set<string> = new Set()) {}

  exists(filePath: string): boolean {
    return this.existingPaths.has(filePath);
  }

  mkdirSync(filePath: string, options?: { recursive?: boolean }): string | undefined {
    if (options?.recursive) {
      // Simulate recursive mkdir
      const parts = filePath.split('/');
      for (let i = 1; i < parts.length; i++) {
        this.existingPaths.add(parts.slice(0, i + 1).join('/'));
      }
    }
    this.existingPaths.add(filePath);
    return filePath;
  }
}

/**
 * Mock logger for testing
 */
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('SimpleGitClient (ingest_spec.md §6, testing_specification.md §3.6–3.7)', () => {
  let mockGit: MockSimpleGit;
  let mockLogger: Logger;
  let mockFileSystem: MockFileSystem;

  beforeEach(() => {
    mockGit = new MockSimpleGit();
    mockLogger = createMockLogger();
    mockFileSystem = new MockFileSystem(new Set(['/test-repo']));
  });

  describe('resolveCommitHash (pure unit test with mocks)', () => {
    it('resolves branch name to commit hash', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      const hash = await client.resolveCommitHash({
        repoPath: '/test-repo',
        ref: 'main',
      });

      expect(hash).toBe('abc123def456');
    });

    it('throws error when repository path does not exist', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      await expect(
        client.resolveCommitHash({
          repoPath: '/nonexistent/path',
          ref: 'main',
        }),
      ).rejects.toThrow('Repository path not found');
    });

    it('throws error when git ref does not exist', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      await expect(
        client.resolveCommitHash({
          repoPath: '/test-repo',
          ref: 'nonexistent',
        }),
      ).rejects.toThrow('Failed to resolve ref');
    });
  });

  describe('getCommitMetadata (pure unit test with mocks)', () => {
    it('extracts author, message, and timestamp from git log', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      const metadata = await client.getCommitMetadata({
        repoPath: '/test-repo',
        commitHash: 'abc123def456',
      });

      expect(metadata).toHaveProperty('timestamp');
      expect(metadata.timestamp).toBeGreaterThan(0);
      expect(metadata.author).toBe('John Doe');
      expect(metadata.message).toBe('Test commit');
    });

    it('returns fallback timestamp when commit not found', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      const metadata = await client.getCommitMetadata({
        repoPath: '/test-repo',
        commitHash: 'nonexistent',
      });

      // Should return current timestamp as fallback
      expect(metadata.timestamp).toBeTruthy();
      expect(typeof metadata.timestamp).toBe('number');
    });

    it('logs warning when metadata extraction fails', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      await client.getCommitMetadata({
        repoPath: '/test-repo',
        commitHash: 'nonexistent',
      });

      expect((mockLogger.warn as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('clone (pure unit test with mocks)', () => {
    it('is idempotent when target path exists', async () => {
      mockFileSystem = new MockFileSystem(new Set(['/test-repo', '/existing/path']));
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      await expect(
        client.clone({
          gitUrl: 'https://github.com/test/repo.git',
          targetPath: '/existing/path',
        }),
      ).resolves.not.toThrow();
    });

    it('creates parent directory when cloning to new path', async () => {
      mockFileSystem = new MockFileSystem(new Set(['/test-repo']));
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      // Mock mkdirSync to track calls
      const mkdirSpy = vi.spyOn(mockFileSystem, 'mkdirSync');

      await expect(
        client.clone({
          gitUrl: 'https://github.com/test/repo.git',
          targetPath: '/new/path/repo',
        }),
      ).rejects.toThrow(); // Will fail in actual clone, but mkdir should be called

      // At least one mkdir call should have been made
      expect(mkdirSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('fetch (pure unit test with mocks)', () => {
    it('throws error when repository path does not exist', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      await expect(
        client.fetch({
          repoPath: '/nonexistent/path',
        }),
      ).rejects.toThrow('Repository path not found');
    });

    it('fetches from origin when ref not specified', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      await expect(
        client.fetch({
          repoPath: '/test-repo',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('computeChangedFiles (pure unit test with mocks)', () => {
    it('parses diff-tree output correctly', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      const result = await client.computeChangedFiles({
        repoPath: '/test-repo',
        commitHash: 'abc123def456',
      });

      expect(result.added).toContain('scr/new-file.ts');
      expect(result.modified).toContain('src/modified.ts');
      expect(result.deleted).toContain('src/deleted.ts');
      expect(result.renamed).toEqual([{ from: 'src/old.ts', to: 'src/new.ts' }]);
    });

    it('treats renames as delete+add (ingest_spec.md §2.5)', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      const result = await client.computeChangedFiles({
        repoPath: '/test-repo',
        commitHash: 'abc123def456',
      });

      // Renamed file should appear in both deleted and added
      expect(result.deleted).toContain('src/old.ts');
      expect(result.added).toContain('src/new.ts');
    });

    it('throws error when repository path does not exist', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      await expect(
        client.computeChangedFiles({
          repoPath: '/nonexistent/path',
          commitHash: 'abc123',
        }),
      ).rejects.toThrow('Repository path not found');
    });

    it('returns valid ChangedFileSet structure', async () => {
      const client = createGitClientWithDeps(() => mockGit, mockLogger, mockFileSystem);

      const result = await client.computeChangedFiles({
        repoPath: '/test-repo',
        commitHash: 'abc123def456',
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
  });
});
