import { exec } from 'node:child_process';
import { readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import type { FileNode, SymbolNode } from '@repo/graph-core';
import { ingestRepoFromSource, writeJsonDumps } from '@repo/graph-ingest';
import { InMemoryGraphStore, InMemoryRelationalStore } from '@repo/graph-store';

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

const runIntegration = process.env['RUN_INTEGRATION'] === 'true';
const describeIf = runIntegration ? describe : describe.skip;

describeIf('ky repo ingestion integration (fixture-based)', () => {
  it('ingests ky and emits inspection dumps', async () => {
    const { repoPath, commit } = await ensureKyFixture();
    const store = { graph: new InMemoryGraphStore(), relational: new InMemoryRelationalStore() };
    const connector = new ScipTsIngestionConnector();
    const outputDir = path.join(tmpdir(), `graph-ky-dump-${Date.now()}`);
    const ingestRoot = path.join(tmpdir(), `graph-ky-ingest-${Date.now()}`);

    try {
      const result = await ingestRepoFromSource(repoPath, store, connector, {
        commit,
        projectId: 'ky-fixture',
        ingestRoot,
      });

      const files = store.graph
        .listNodes()
        .filter((node): node is FileNode => node.kind === 'File');
      const symbols = store.graph
        .listNodes()
        .filter((node): node is SymbolNode => node.kind === 'Symbol');

      expect(result.run_summary.snapshot_id).toBe(commit);
      expect(files.length).toBeGreaterThan(0);
      expect(symbols.length).toBeGreaterThan(0);
      expect(files.some((file) => file.locator?.path_or_url)).toBe(true);

      await writeJsonDumps({ store: store.graph, outputDir });

      const artifacts = JSON.parse(await readFile(path.join(outputDir, 'artifacts.json'), 'utf-8'));
      expect(artifacts.nodes.length).toBeGreaterThan(0);

      const summary = JSON.parse(
        await readFile(path.join(outputDir, 'graph_dump_summary.json'), 'utf-8'),
      );
      expect(summary.node_count).toBe(store.graph.listNodes().length);
      expect(summary.policy_count).toBeGreaterThanOrEqual(0);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
      await rm(ingestRoot, { recursive: true, force: true });
    }
  }, 900000);
});
