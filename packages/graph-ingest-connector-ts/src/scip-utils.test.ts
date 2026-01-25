import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { InMemoryGraphStore } from '@repo/graph-store';

import { ScipTsIngestionConnector } from './index.js';

describe('ScipTsIngestionConnector utility functions', () => {
  describe('canHandle', () => {
    it('returns true for repo source kind', () => {
      const connector = new ScipTsIngestionConnector();
      expect(connector.canHandle('repo')).toBe(true);
    });

    it('returns false for non-repo source kinds', () => {
      const connector = new ScipTsIngestionConnector();
      expect(connector.canHandle('web')).toBe(false);
      expect(connector.canHandle('file')).toBe(false);
    });
  });

  describe('ingest error handling', () => {
    it('throws when repo path is not a directory', async () => {
      const connector = new ScipTsIngestionConnector();
      const store = new InMemoryGraphStore();
      const tempFile = path.join(tmpdir(), `not-a-dir-${Date.now()}.txt`);

      await writeFile(tempFile, 'test content', 'utf-8');

      try {
        await expect(
          connector.ingest(
            {
              repoPath: tempFile,
              repoUrl: 'https://example.com/repo',
              commit: 'abc123',
              projectId: 'project-1',
            },
            store,
          ),
        ).rejects.toThrow('Repo path is not a directory');
      } finally {
        await rm(tempFile, { force: true });
      }
    });

    it('throws when repo path does not exist', async () => {
      const connector = new ScipTsIngestionConnector();
      const store = new InMemoryGraphStore();

      await expect(
        connector.ingest(
          {
            repoPath: '/nonexistent/path/that/does/not/exist',
            repoUrl: 'https://example.com/repo',
            commit: 'abc123',
            projectId: 'project-1',
          },
          store,
        ),
      ).rejects.toThrow();
    });

    it('throws when scip-typescript fails (no tsconfig)', async () => {
      const connector = new ScipTsIngestionConnector();
      const store = new InMemoryGraphStore();
      const repoRoot = path.join(tmpdir(), `empty-repo-${Date.now()}`);

      await mkdir(repoRoot, { recursive: true });
      // Create package.json but no tsconfig - scip-typescript will fail
      await writeFile(
        path.join(repoRoot, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }),
        'utf-8',
      );

      try {
        await expect(
          connector.ingest(
            {
              repoPath: repoRoot,
              repoUrl: 'https://example.com/repo',
              commit: 'abc123',
              projectId: 'project-1',
            },
            store,
          ),
        ).rejects.toThrow('scip-typescript indexing failed');
      } finally {
        await rm(repoRoot, { recursive: true, force: true });
      }
    }, 60000);
  });
});
