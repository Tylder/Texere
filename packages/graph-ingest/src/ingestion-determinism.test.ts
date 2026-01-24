import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createDeterministicId,
  type ArtifactPartNode,
  type GraphEdge,
  type PolicyNode,
  type ProjectionEnvelope,
} from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import type { IngestionConnector, RepoIngestInput } from './index.js';
import { ingestRepo, writeJsonDumps } from './index.js';

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

  it('throws when connector does not support repo ingestion', async () => {
    const connector: IngestionConnector = {
      canHandle: () => false,
      ingest: async () => ({
        artifact_root_id: '',
        artifact_state_id: '',
        node_count: 0,
        edge_count: 0,
      }),
    };
    const input = {
      repoPath: '/tmp/example',
      repoUrl: 'https://example.com/repo',
      commit: 'abc123',
      projectId: 'project-1',
    };
    const store = new InMemoryGraphStore();

    await expect(ingestRepo(input, store, connector)).rejects.toThrow(
      'Connector does not support repo ingestion',
    );
  });
});

describe('writeJsonDumps (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('writes artifacts, policies, and summary JSON files', async () => {
    const store = new InMemoryGraphStore();
    const rootId = createDeterministicId('root');
    store.putNode({
      id: rootId,
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: 'https://example.com/repo',
    });

    const policy: PolicyNode = {
      id: createDeterministicId('policy'),
      kind: 'Policy',
      schema_version: 'v0.1',
      policy_kind: 'IngestionPolicy',
      scope: 'repo',
    };
    store.putNode(policy);

    const outputDir = path.join(tmpdir(), `graph-dump-test-${Date.now()}`);

    try {
      await writeJsonDumps({ store, outputDir });

      const artifacts = JSON.parse(await readFile(path.join(outputDir, 'artifacts.json'), 'utf-8'));
      expect(artifacts.nodes).toHaveLength(1);
      expect(artifacts.nodes[0].kind).toBe('ArtifactRoot');

      const policies = JSON.parse(await readFile(path.join(outputDir, 'policies.json'), 'utf-8'));
      expect(policies.policies).toHaveLength(1);
      expect(policies.policies[0].kind).toBe('Policy');

      const summary = JSON.parse(
        await readFile(path.join(outputDir, 'graph_dump_summary.json'), 'utf-8'),
      );
      expect(summary.node_count).toBe(2);
      expect(summary.policy_count).toBe(1);
      expect(summary.projection).toBeNull();
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('writes projection JSON when provided', async () => {
    const store = new InMemoryGraphStore();
    const projection: ProjectionEnvelope = {
      projection_name: 'TestProjection',
      schema_version: 'v0.1',
      generated_at: new Date().toISOString(),
      explanation: 'Test explanation',
      nodes: [],
      edges: [],
    };

    const outputDir = path.join(tmpdir(), `graph-dump-projection-${Date.now()}`);

    try {
      await writeJsonDumps({ store, projection, outputDir });

      const projectionData = JSON.parse(
        await readFile(path.join(outputDir, 'projection.json'), 'utf-8'),
      );
      expect(projectionData.projection_name).toBe('TestProjection');
      expect(projectionData.explanation).toBe('Test explanation');

      const summary = JSON.parse(
        await readFile(path.join(outputDir, 'graph_dump_summary.json'), 'utf-8'),
      );
      expect(summary.projection).toBe('TestProjection');
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
