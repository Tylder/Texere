import { createDeterministicId, type ArtifactPartNode, type GraphEdge } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import type { IngestionConnector, RepoIngestInput } from './index.js';
import { ingestRepo } from './index.js';

class FakeRepoConnector implements IngestionConnector {
  canHandle(sourceKind: string): boolean {
    return sourceKind === 'repo';
  }

  async ingest(input: RepoIngestInput, store: InMemoryGraphStore): Promise<any> {
    const rootId = createDeterministicId(`${input.repoUrl}:${input.commit}`);
    const stateId = createDeterministicId(`${rootId}:${input.commit}`);
    const filePartId = createDeterministicId(`${stateId}:README.md`);
    const symbolPartId = createDeterministicId(`${stateId}:README.md#symbol`);

    store.putNode({
      id: rootId,
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: input.repoUrl,
    });

    store.putNode({
      id: stateId,
      kind: 'ArtifactState',
      schema_version: 'v0.1',
      artifact_root_id: rootId,
      version_ref: input.commit,
      content_hash: createDeterministicId('content'),
      retrieved_at: new Date(0).toISOString(),
    });

    const fileNode: ArtifactPartNode = {
      id: filePartId,
      kind: 'ArtifactPart',
      schema_version: 'v0.1',
      artifact_state_id: stateId,
      locator: 'README.md',
      retention_mode: 'link-only',
      part_kind: 'file',
    };

    const symbolNode: ArtifactPartNode = {
      id: symbolPartId,
      kind: 'ArtifactPart',
      schema_version: 'v0.1',
      artifact_state_id: stateId,
      locator: 'README.md#symbol:root',
      retention_mode: 'link-only',
      part_kind: 'symbol',
    };

    store.putNode(fileNode);
    store.putNode(symbolNode);

    const edges: GraphEdge[] = [
      {
        id: createDeterministicId(`${rootId}->${stateId}`),
        kind: 'HasState',
        schema_version: 'v0.1',
        from: rootId,
        to: stateId,
      },
      {
        id: createDeterministicId(`${stateId}->${filePartId}`),
        kind: 'HasPart',
        schema_version: 'v0.1',
        from: stateId,
        to: filePartId,
      },
      {
        id: createDeterministicId(`${stateId}->${symbolPartId}`),
        kind: 'HasPart',
        schema_version: 'v0.1',
        from: stateId,
        to: symbolPartId,
      },
    ];

    edges.forEach((edge) => store.putEdge(edge));

    return {
      artifact_root_id: rootId,
      artifact_state_id: stateId,
      node_count: store.listNodes().length,
      edge_count: store.listEdges().length,
    };
  }
}

describe('Ingestion determinism (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('produces identical outputs for the same repo inputs', async () => {
    const connector = new FakeRepoConnector();
    const input = {
      repoPath: '/tmp/example',
      repoUrl: 'https://example.com/repo',
      commit: 'abc123',
      projectId: 'project-1',
    };

    const storeA = new InMemoryGraphStore();
    await ingestRepo(input, storeA, connector);
    const snapshotA = {
      nodes: storeA.listNodes(),
      edges: storeA.listEdges(),
    };

    const storeB = new InMemoryGraphStore();
    await ingestRepo(input, storeB, connector);
    const snapshotB = {
      nodes: storeB.listNodes(),
      edges: storeB.listEdges(),
    };

    expect(snapshotA).toEqual(snapshotB);
  });
});
