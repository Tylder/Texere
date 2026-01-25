import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createDeterministicId,
  type GraphEdge,
  type PolicyNode,
  type ProjectionEnvelope,
  type FileNode,
  type SymbolNode,
} from '@repo/graph-core';
import { InMemoryGraphStore, InMemoryRelationalStore } from '@repo/graph-store';

import type { IngestionConnector, RepoIngestInput } from './index.js';
import { ingestRepo, writeJsonDumps } from './index.js';

class FakeRepoConnector implements IngestionConnector {
  canHandle(sourceKind: string): boolean {
    return sourceKind === 'repo';
  }

  async ingest(
    input: RepoIngestInput,
    store: { graph: InMemoryGraphStore; relational: any },
  ): Promise<any> {
    const packageName = 'example';
    const version = '0.0.0';
    const fileId = createDeterministicId(`${packageName}:${input.snapshot_id}:README.md`);
    const symbolId = 'scip-ts example README md symbol';

    const fileNode: FileNode = {
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: 'README.md',
      packageName,
      commitSha: input.snapshot_id,
      language: 'typescript',
      stale: false,
    };

    const symbolNode: SymbolNode = {
      id: createDeterministicId(`${symbolId}:${packageName}:${version}`),
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId,
      symbolKind: 'symbol',
      visibility: 'public',
      packageName,
      version,
      stale: false,
    };

    store.graph.putNode(fileNode);
    store.graph.putNode(symbolNode);

    const edges: GraphEdge[] = [
      {
        id: createDeterministicId(`${fileId}->${symbolNode.id}`),
        kind: 'DEFINES',
        schema_version: 'v0.1',
        from: fileId,
        to: symbolNode.id,
        range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 1 },
        definitionKind: 'definition',
      },
    ];

    edges.forEach((edge) => store.graph.putEdge(edge));

    return {
      run_summary: {
        run_id: input.run_id,
        connector_id: 'fake',
        connector_version: '0.0.0',
        source_ref: input.source_ref,
        snapshot_id: input.snapshot_id,
        started_at: new Date(0).toISOString(),
        finished_at: new Date(0).toISOString(),
        status: 'complete',
        profiles_emitted: [],
        retention_mode: 'link-only',
        profile_modes: [],
        counts_by_profile: [],
        failures: [],
        skips: [],
      },
      capability_declarations: [],
      policy_decision: {
        policy_ref: input.policy_ref,
        selection_inputs: {},
        tie_breaks: [],
        scope_selectors: [],
        lens_policy: 'working',
        retention_mode: 'link-only',
        materialization_mode: 'reference-only',
        authority_mode: 'external-authoritative',
        enrichments: [],
      },
      profiles: [],
    };
  }
}

describe('Ingestion determinism (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('produces identical outputs for the same repo inputs', async () => {
    const connector = new FakeRepoConnector();
    const input = {
      repoPath: '/tmp/example',
      repoUrl: 'https://example.com/repo',
      source_ref: 'https://example.com/repo',
      policy_ref: 'default-policy',
      snapshot_id: 'abc123',
      run_id: 'run-1',
    };

    const storeA = { graph: new InMemoryGraphStore(), relational: new InMemoryRelationalStore() };
    await ingestRepo(input, storeA, connector);
    const snapshotA = {
      nodes: storeA.graph.listNodes(),
      edges: storeA.graph.listEdges(),
    };

    const storeB = { graph: new InMemoryGraphStore(), relational: new InMemoryRelationalStore() };
    await ingestRepo(input, storeB, connector);
    const snapshotB = {
      nodes: storeB.graph.listNodes(),
      edges: storeB.graph.listEdges(),
    };

    expect(snapshotA).toEqual(snapshotB);
  });

  it('throws when connector does not support repo ingestion', async () => {
    const connector: IngestionConnector = {
      canHandle: () => false,
      ingest: async () => ({
        run_summary: {
          run_id: 'run-1',
          connector_id: 'fake',
          connector_version: '0.0.0',
          source_ref: 'https://example.com/repo',
          snapshot_id: 'abc123',
          started_at: new Date(0).toISOString(),
          finished_at: new Date(0).toISOString(),
          status: 'complete',
          profiles_emitted: [],
          retention_mode: 'link-only',
          profile_modes: [],
          counts_by_profile: [],
          failures: [],
          skips: [],
        },
        capability_declarations: [],
        policy_decision: {
          policy_ref: 'default-policy',
          selection_inputs: {},
          tie_breaks: [],
          scope_selectors: [],
          lens_policy: 'working',
          retention_mode: 'link-only',
          materialization_mode: 'reference-only',
          authority_mode: 'external-authoritative',
          enrichments: [],
        },
        profiles: [],
      }),
    };
    const input = {
      repoPath: '/tmp/example',
      repoUrl: 'https://example.com/repo',
      source_ref: 'https://example.com/repo',
      policy_ref: 'default-policy',
      snapshot_id: 'abc123',
      run_id: 'run-1',
    };
    const store = { graph: new InMemoryGraphStore(), relational: new InMemoryRelationalStore() };

    await expect(ingestRepo(input, store, connector)).rejects.toThrow(
      'Connector does not support repo ingestion',
    );
  });
});

describe('writeJsonDumps (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('writes artifacts, policies, and summary JSON files', async () => {
    const store = new InMemoryGraphStore();
    const fileId = createDeterministicId('file:root');
    store.putNode({
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: 'README.md',
      packageName: 'example',
      commitSha: 'abc123',
      language: 'typescript',
      stale: false,
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
      expect(artifacts.nodes[0].kind).toBe('File');

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
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
