import { describe, expect, it } from 'vitest';

import {
  indexSnapshot,
  resolveSnapshot,
  computeChangedFiles,
  indexFiles,
  extractBoundaries,
  extractDataContracts,
  extractFeatures,
  linkTestsToSymbols,
  runFullIndexPipeline,
  ingestVersion,
} from './index.js';

describe('Texere Indexer Ingest (ingest_spec.md §2-6)', () => {
  describe('indexSnapshot', () => {
    it('returns empty FileIndexResult array for stub', async () => {
      const results = await indexSnapshot({
        codebaseId: 'test',
        codebaseRoot: '/tmp/test',
        commitHash: 'hash',
        branch: 'main',
      });
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('accepts optional changedFiles parameter', async () => {
      const results = await indexSnapshot({
        codebaseId: 'test',
        codebaseRoot: '/tmp/test',
        commitHash: 'hash',
        branch: 'main',
        changedFiles: ['file1.ts', 'file2.ts'],
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('resolveSnapshot (ingest_spec.md §6.1)', () => {
    it('throws "Not implemented" for stub', () => {
      expect(() =>
        resolveSnapshot({
          codebaseRoot: '/tmp/test',
          codebaseId: 'test',
          branch: 'main',
        }),
      ).toThrow('Not implemented: resolveSnapshot');
    });
  });

  describe('computeChangedFiles (ingest_spec.md §6.2)', () => {
    it('throws "Not implemented" for stub', () => {
      expect(() =>
        computeChangedFiles({
          codebaseRoot: '/tmp/test',
          commitHash: 'abc123',
        }),
      ).toThrow('Not implemented: computeChangedFiles');
    });

    it('accepts optional baseCommit parameter', () => {
      expect(() =>
        computeChangedFiles({
          codebaseRoot: '/tmp/test',
          commitHash: 'abc123',
          baseCommit: 'def456',
        }),
      ).toThrow('Not implemented: computeChangedFiles');
    });
  });

  describe('indexFiles (ingest_spec.md §2.2)', () => {
    it('returns empty FileIndexResult array for stub', async () => {
      const results = await indexFiles({
        codebaseRoot: '/tmp/test',
        snapshotId: 'snap123',
        filePaths: ['file.ts'],
      });
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('extractBoundaries (ingest_spec.md §2.3)', () => {
    it('resolves without error for stub', async () => {
      await expect(extractBoundaries([])).resolves.toBeUndefined();
    });
  });

  describe('extractDataContracts (ingest_spec.md §2.3)', () => {
    it('resolves without error for stub', async () => {
      await expect(extractDataContracts([])).resolves.toBeUndefined();
    });
  });

  describe('extractFeatures (ingest_spec.md §2.3)', () => {
    it('resolves without error for stub', async () => {
      await expect(extractFeatures([])).resolves.toBeUndefined();
    });
  });

  describe('linkTestsToSymbols (ingest_spec.md §2.3)', () => {
    it('resolves without error for stub', async () => {
      await expect(linkTestsToSymbols([])).resolves.toBeUndefined();
    });
  });

  describe('runFullIndexPipeline (ingest_spec.md §6)', () => {
    it('resolves without error for stub', async () => {
      await expect(
        runFullIndexPipeline({
          codebaseId: 'test',
          codebaseRoot: '/tmp/test',
          commitHash: 'hash',
          branch: 'main',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('Runtime markers', () => {
    it('exports ingestVersion', () => {
      expect(typeof ingestVersion).toBe('string');
      expect(ingestVersion).toBe('0.0.0');
    });
  });
});
