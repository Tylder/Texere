import { exec } from 'node:child_process';
import { readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import type { ArtifactPartNode, ArtifactRootNode, ArtifactStateNode } from '@repo/graph-core';
import { ingestRepoFromSource, writeJsonDumps } from '@repo/graph-ingest';
import { InMemoryGraphStore } from '@repo/graph-store';

import { ScipTsIngestionConnector } from './index.js';

const execAsync = promisify(exec);

async function ensureKyFixture(): Promise<{ repoPath: string; commit: string }> {
  const fixturePath =
    process.env['GRAPH_KY_FIXTURE_PATH'] ?? path.join('/tmp', 'graph-fixtures', 'ky');

  try {
    const stats = await stat(fixturePath);
    if (!stats.isDirectory()) {
      throw new Error('Fixture path is not a directory.');
    }
  } catch {
    throw new Error(
      `ky fixture not found at ${fixturePath}. Set GRAPH_KY_FIXTURE_PATH to a local clone of sindresorhus/ky at v1.14.2.`,
    );
  }

  const { stdout } = await execAsync('git rev-parse HEAD', { cwd: fixturePath });
  const commit = stdout.trim();
  if (!commit.startsWith('51b0129')) {
    throw new Error(`ky fixture commit ${commit} does not match expected v1.14.2 (51b0129...).`);
  }

  return { repoPath: fixturePath, commit };
}

describe('ky repo ingestion integration (fixture-based)', () => {
  it('ingests ky and emits inspection dumps', async () => {
    const { repoPath, commit } = await ensureKyFixture();
    const store = new InMemoryGraphStore();
    const connector = new ScipTsIngestionConnector();
    const outputDir = path.join(tmpdir(), `graph-ky-dump-${Date.now()}`);
    const ingestRoot = path.join(tmpdir(), `graph-ky-ingest-${Date.now()}`);

    try {
      await ingestRepoFromSource(repoPath, store, connector, {
        commit,
        projectId: 'ky-fixture',
        ingestRoot,
      });

      const root = store
        .listNodes()
        .find((node): node is ArtifactRootNode => node.kind === 'ArtifactRoot');
      const state = store
        .listNodes()
        .find((node): node is ArtifactStateNode => node.kind === 'ArtifactState');
      const parts = store
        .listNodes()
        .filter((node): node is ArtifactPartNode => node.kind === 'ArtifactPart');

      expect(root?.canonical_ref).toBe(`file://${path.resolve(repoPath)}`);
      expect(state?.version_ref).toBe(commit);
      expect(parts.length).toBeGreaterThan(0);
      expect(parts.some((part) => part.part_kind === 'file')).toBe(true);
      expect(parts.some((part) => part.part_kind === 'symbol')).toBe(true);
      expect(parts.every((part) => part.retention_mode === 'link-only')).toBe(true);
      expect(parts.some((part) => part.locator.includes('#'))).toBe(true);

      await writeJsonDumps({ store, outputDir });

      const artifacts = JSON.parse(await readFile(path.join(outputDir, 'artifacts.json'), 'utf-8'));
      expect(artifacts.nodes.length).toBeGreaterThan(0);

      const summary = JSON.parse(
        await readFile(path.join(outputDir, 'graph_dump_summary.json'), 'utf-8'),
      );
      expect(summary.node_count).toBe(store.listNodes().length);
      expect(summary.policy_count).toBeGreaterThanOrEqual(0);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
      await rm(ingestRoot, { recursive: true, force: true });
    }
  }, 900000);
});
