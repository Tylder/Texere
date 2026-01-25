import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { deserializeSCIP } from '@c4312/scip';
import { createDeterministicId } from '@repo/graph-core';
import type { ArtifactPartNode, GraphNode } from '@repo/graph-core';
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

    const repoUrl = 'file:///fixture';
    const commit = 'fixture';

    const result = ingestScipDocuments(
      {
        repoPath: '/tmp/fixture',
        repoUrl,
        commit,
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

    const nodes = store.listNodes();
    const edges = store.listEdges();

    const parts = nodes.filter((node): node is ArtifactPartNode => node.kind === 'ArtifactPart');

    const fileParts = parts.filter((part) => part.part_kind === 'file');
    const symbolParts = parts.filter((part) => part.part_kind === 'symbol');

    expect(fileParts.length).toBeGreaterThan(0);
    expect(symbolParts.length).toBeGreaterThan(0);

    const rootId = createDeterministicId(`${repoUrl}:${commit}`);
    const stateId = createDeterministicId(`${rootId}:${commit}`);

    const root = nodes.find((node): node is GraphNode => node.id === rootId);
    const state = nodes.find((node): node is GraphNode => node.id === stateId);

    expect(result.artifact_root_id).toBe(rootId);
    expect(result.artifact_state_id).toBe(stateId);
    expect(root).toBeDefined();
    expect(state).toBeDefined();

    // Use any actual file from the fixture
    const firstFilePart = fileParts[0];
    expect(firstFilePart).toBeDefined();
    if (!firstFilePart) throw new Error('No file parts found');

    const fileLocator = firstFilePart.locator;
    const filePartId = firstFilePart.id;
    const symbolPart = symbolParts.find((part) => part.locator.startsWith(`${fileLocator}#`));

    expect(firstFilePart.locator).toMatch(/\.ts$|\.js$/);
    expect(firstFilePart.retention_mode).toBe('link-only');

    if (symbolPart) {
      expect(symbolPart.locator).toContain(`${fileLocator}#`);
      expect(symbolPart.retention_mode).toBe('link-only');
    }

    expect(edges.length).toBeGreaterThanOrEqual(3);

    // Verify HasState edge exists
    const hasStateEdge = edges.find(
      (edge) => edge.kind === 'HasState' && edge.from === rootId && edge.to === stateId,
    );
    expect(hasStateEdge).toBeDefined();
    expect(hasStateEdge?.from).toBe(rootId);
    expect(hasStateEdge?.to).toBe(stateId);

    // Verify HasPart edge for file exists
    const hasPartFileEdge = edges.find(
      (edge) => edge.kind === 'HasPart' && edge.from === stateId && edge.to === filePartId,
    );
    expect(hasPartFileEdge).toBeDefined();
    expect(hasPartFileEdge?.from).toBe(stateId);
    expect(hasPartFileEdge?.to).toBe(filePartId);

    // Verify HasPart edge for symbol exists if symbol found
    if (symbolPart) {
      const hasPartSymbolEdge = edges.find(
        (edge) => edge.kind === 'HasPart' && edge.from === stateId && edge.to === symbolPart.id,
      );
      expect(hasPartSymbolEdge).toBeDefined();
      expect(hasPartSymbolEdge?.from).toBe(stateId);
      expect(hasPartSymbolEdge?.to).toBe(symbolPart.id);
    }
  });
});
