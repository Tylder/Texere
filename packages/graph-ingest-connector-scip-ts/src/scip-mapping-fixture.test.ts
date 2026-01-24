import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { deserializeSCIP } from '@c4312/scip';
import type { ArtifactPartNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { ingestScipDocuments } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SCIP fixture mapping (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('creates file and symbol parts from fixture scip', async () => {
    const fixturePath = path.join(__dirname, '..', 'fixtures', 'index.scip');
    const buffer = await readFile(fixturePath);
    const index = deserializeSCIP(new Uint8Array(buffer));

    const store = new InMemoryGraphStore();

    ingestScipDocuments(
      {
        repoPath: '/tmp/fixture',
        repoUrl: 'file:///fixture',
        commit: 'fixture',
        projectId: 'fixture',
      },
      store,
      index.documents,
      {
        nodeVersion: 'v0',
        scipTypescriptVersion: 'fixture',
        packageManager: 'npm',
        packageManagerVersion: '0.0.0',
      },
    );

    const parts = store
      .listNodes()
      .filter((node): node is ArtifactPartNode => node.kind === 'ArtifactPart');

    const fileParts = parts.filter((part) => part.part_kind === 'file');
    const symbolParts = parts.filter((part) => part.part_kind === 'symbol');

    expect(fileParts.length).toBeGreaterThan(0);
    expect(symbolParts.length).toBeGreaterThan(0);
    expect(symbolParts.some((part) => part.locator.includes('#'))).toBe(true);
  });
});
