import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { InMemoryGraphStore, InMemoryRelationalStore } from '@repo/graph-store';

import { ScipTsIngestionConnector } from './index.js';

function createStore(): { graph: InMemoryGraphStore; relational: InMemoryRelationalStore } {
  return {
    graph: new InMemoryGraphStore(),
    relational: new InMemoryRelationalStore(),
  };
}

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
      const store = createStore();
      const tempFile = path.join(tmpdir(), `not-a-dir-${Date.now()}.txt`);

      await writeFile(tempFile, 'test content', 'utf-8');

      try {
        await expect(
          connector.ingest(
            {
              repoPath: tempFile,
              repoUrl: 'https://example.com/repo',
              source_ref: 'https://example.com/repo',
              policy_ref: 'default-policy',
              snapshot_id: 'abc123',
              run_id: 'run-1',
              connector_options: { skipInstall: true },
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
      const store = createStore();

      await expect(
        connector.ingest(
          {
            repoPath: '/nonexistent/path/that/does/not/exist',
            repoUrl: 'https://example.com/repo',
            source_ref: 'https://example.com/repo',
            policy_ref: 'default-policy',
            snapshot_id: 'abc123',
            run_id: 'run-1',
            connector_options: { skipInstall: true },
          },
          store,
        ),
      ).rejects.toThrow();
    });

    it('throws when scip-typescript fails (no tsconfig)', async () => {
      const connector = new ScipTsIngestionConnector();
      const store = createStore();
      const repoRoot = path.join(tmpdir(), `empty-repo-${Date.now()}`);

      await mkdir(repoRoot, { recursive: true });
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
              source_ref: 'https://example.com/repo',
              policy_ref: 'default-policy',
              snapshot_id: 'abc123',
              run_id: 'run-1',
              connector_options: { skipInstall: true },
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
