import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EdgeQuery,
  GraphEdge,
  GraphNode,
  NodeId,
  PolicyNode,
  PolicySelection,
} from '@repo/graph-core';
import type { GraphStore, RelationalStore } from '@repo/graph-store';

// eslint-disable-next-line import/order
import type { IngestionConnector, IngestionStore, RepoIngestInput } from './ingest-repo.js';

const loadEnvConfigMock = vi.hoisted(() =>
  vi.fn(async () => ({
    GRAPH_INGEST_ROOT: '/tmp/ingest',
    GRAPH_PROJECT_ID: 'project-1',
  })),
);

const resolveIngestRootMock = vi.hoisted(() => vi.fn((value?: string) => value ?? '/tmp/ingest'));
const resolveRepoSourceMock = vi.hoisted(() =>
  vi.fn(async () => ({
    repoPath: '/tmp/ingest/repo',
    repoUrl: 'https://example.com/repo',
  })),
);
const syncRepoMock = vi.hoisted(() => vi.fn(async () => {}));
const checkoutIfNeededMock = vi.hoisted(() => vi.fn(async () => {}));
const runGitMock = vi.hoisted(() => vi.fn(async () => 'commit-sha'));

vi.mock('./env.js', () => ({
  loadEnvConfig: loadEnvConfigMock,
}));

vi.mock('./repo-git.js', () => ({
  resolveIngestRoot: resolveIngestRootMock,
  resolveRepoSource: resolveRepoSourceMock,
  syncRepo: syncRepoMock,
  checkoutIfNeeded: checkoutIfNeededMock,
  runGit: runGitMock,
}));

import { ingestRepo, ingestRepoFromSource } from './ingest-repo.js';

class FakeGraphStore implements GraphStore {
  beginTransaction = vi.fn();
  commit = vi.fn();
  rollback = vi.fn();
  putNode(_node: GraphNode): void {}
  putEdge(_edge: GraphEdge): void {}
  getNode(_id: NodeId): GraphNode | undefined {
    return undefined;
  }
  listNodes(): GraphNode[] {
    return [];
  }
  listEdges(): GraphEdge[] {
    return [];
  }
  getEdges(_query?: EdgeQuery): GraphEdge[] {
    return [];
  }
  queryPolicy(_selection: PolicySelection): PolicyNode | undefined {
    return undefined;
  }
}

class FakeRelationalStore implements RelationalStore {
  beginTransaction = vi.fn();
  commit = vi.fn();
  rollback = vi.fn();
  putFile(): void {}
  putCommit(): void {}
  putPackage(): void {}
  putIndexStatus(): void {}
  getFile(): undefined {
    return undefined;
  }
  listFiles(): [] {
    return [];
  }
  listCommits(): [] {
    return [];
  }
  listPackages(): [] {
    return [];
  }
  listIndexStatus(): [] {
    return [];
  }
}

function createStore(): IngestionStore {
  return {
    graph: new FakeGraphStore(),
    relational: new FakeRelationalStore(),
  };
}

describe('ingest repo orchestration (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  beforeEach(() => {
    loadEnvConfigMock.mockClear();
    resolveIngestRootMock.mockClear();
    resolveRepoSourceMock.mockClear();
    syncRepoMock.mockClear();
    checkoutIfNeededMock.mockClear();
    runGitMock.mockClear();
  });

  it('delegates ingestRepo to connector', async () => {
    const store = createStore();
    const connector: IngestionConnector = {
      canHandle: () => true,
      ingest: async (input: RepoIngestInput) => ({
        run_summary: {
          run_id: input.run_id,
          connector_id: 'connector',
          connector_version: '0.0.0',
          source_ref: input.source_ref,
          snapshot_id: input.snapshot_id,
          started_at: 'start',
          finished_at: 'end',
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
      }),
    };

    const result = await ingestRepo(
      {
        repoPath: '/tmp/repo',
        repoUrl: 'https://example.com/repo',
        source_ref: 'https://example.com/repo',
        policy_ref: 'default-policy',
        snapshot_id: 'commit',
        run_id: 'run-1',
      },
      store,
      connector,
    );

    expect(result.run_summary.status).toBe('complete');
  });

  it('runs ingestion with transactional boundaries', async () => {
    const store = createStore();
    const connector: IngestionConnector = {
      canHandle: () => true,
      ingest: async () => ({
        run_summary: {
          run_id: 'run-1',
          connector_id: 'connector',
          connector_version: '0.0.0',
          source_ref: 'https://example.com/repo',
          snapshot_id: 'commit-sha',
          started_at: 'start',
          finished_at: 'end',
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

    await ingestRepoFromSource('https://example.com/repo', store, connector);

    expect(store.graph.beginTransaction).toHaveBeenCalled();
    expect(store.graph.commit).toHaveBeenCalled();
    expect(store.relational.beginTransaction).toHaveBeenCalled();
    expect(store.relational.commit).toHaveBeenCalled();
  });

  it('rolls back when connector fails', async () => {
    const store = createStore();
    const connector: IngestionConnector = {
      canHandle: () => true,
      ingest: async () => {
        throw new Error('boom');
      },
    };

    await expect(
      ingestRepoFromSource('https://example.com/repo', store, connector),
    ).rejects.toThrow('boom');

    expect(store.graph.rollback).toHaveBeenCalled();
    expect(store.relational.rollback).toHaveBeenCalled();
  });
});
