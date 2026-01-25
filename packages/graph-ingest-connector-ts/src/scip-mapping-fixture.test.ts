import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { deserializeSCIP } from '@c4312/scip';
import { createDeterministicId } from '@repo/graph-core';
import type { FileNode, SymbolNode, GraphEdge } from '@repo/graph-core';
import { InMemoryGraphStore, InMemoryRelationalStore } from '@repo/graph-store';

import { ingestScipDocuments } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SCIP fixture mapping (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('creates file and symbol nodes from fixture scip', async () => {
    const fixturePath = path.join(__dirname, '..', 'fixtures', 'index.scip');
    const buffer = await readFile(fixturePath);
    const index = deserializeSCIP(new Uint8Array(buffer));

    const store = {
      graph: new InMemoryGraphStore(),
      relational: new InMemoryRelationalStore(),
    };

    const repoUrl = 'file:///fixture';
    const commit = 'fixture';

    const result = ingestScipDocuments(
      {
        repoPath: '/tmp/fixture',
        repoUrl,
        source_ref: repoUrl,
        policy_ref: 'default-policy',
        snapshot_id: commit,
        run_id: 'run-1',
      },
      store,
      index.documents,
      {
        nodeVersion: 'v0',
        scipTypescriptVersion: 'fixture',
        packageManager: 'npm',
        packageManagerVersion: '0.0.0',
      },
      {
        packageName: 'fixture',
        packageVersion: '0.0.0',
        dependencies: {},
      },
    );

    const nodes = store.graph.listNodes();
    const edges = store.graph.listEdges();

    const files = nodes.filter((node): node is FileNode => node.kind === 'File');
    const symbols = nodes.filter((node): node is SymbolNode => node.kind === 'Symbol');

    expect(files.length).toBeGreaterThan(0);
    expect(symbols.length).toBeGreaterThan(0);

    const firstFile = files[0];
    expect(firstFile).toBeDefined();
    if (!firstFile) throw new Error('No file nodes found');

    expect(firstFile.path).toMatch(/\.ts$|\.js$/);
    expect(firstFile.locator?.path_or_url).toBe(firstFile.path);

    const definesEdges = edges.filter((edge): edge is GraphEdge => edge.kind === 'DEFINES');
    const refersEdges = edges.filter((edge): edge is GraphEdge => edge.kind === 'REFERS_TO');

    expect(definesEdges.length + refersEdges.length).toBeGreaterThan(0);

    const expectedFileId = createDeterministicId(`fixture:${commit}:${firstFile.path}`);
    expect(firstFile.id).toBe(expectedFileId);

    expect(result.run_summary.status).toBe('complete');
  });
});
