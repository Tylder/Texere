import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ArtifactPartNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { ScipTsIngestionConnector } from './index.js';

describe('SCIP-TS mapping (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('creates file and symbol parts for each file', async () => {
    const connector = new ScipTsIngestionConnector();
    const repoRoot = await mkdtemp(path.join(tmpdir(), 'graph-scip-'));
    try {
      await mkdir(path.join(repoRoot, 'src'));
      await writeFile(path.join(repoRoot, 'src', 'index.ts'), 'export const y = 2;\n', 'utf-8');

      const store = new InMemoryGraphStore();
      await connector.ingest(
        {
          repoPath: repoRoot,
          repoUrl: 'https://example.com/repo',
          commit: 'def456',
          projectId: 'project-1',
        },
        store,
      );

      const parts = store
        .listNodes()
        .filter((node): node is ArtifactPartNode => node.kind === 'ArtifactPart');

      const locators = parts.map((node) => node.locator).sort();
      expect(locators).toEqual(['src/index.ts', 'src/index.ts#symbol:root']);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});
