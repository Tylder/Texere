import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EdgeQuery,
  GraphEdge,
  GraphNode,
  NodeId,
  PolicyNode,
  PolicySelection,
} from '@repo/graph-core';
import type { GraphStore } from '@repo/graph-store';

import type { IngestionConnector, RepoIngestInput } from './ingest-repo.js';

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

const detectPackageManagerMock = vi.hoisted(() => vi.fn(async () => 'npm'));
const installDependenciesMock = vi.hoisted(() => vi.fn(async () => {}));

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

vi.mock('./deps.js', () => ({
  detectPackageManager: detectPackageManagerMock,
  installDependencies: installDependenciesMock,
}));

import { ingestRepo, ingestRepoFromSource } from './ingest-repo.js';

class FakeStore implements GraphStore {
  beginTransaction = vi.fn();
  commit = vi.fn();
  rollback = vi.fn();
  putNode(node: GraphNode): void {}
  putEdge(edge: GraphEdge): void {}
  getNode(id: NodeId): GraphNode | undefined {
    return undefined;
  }
  listNodes(): GraphNode[] {
    return [];
  }
  listEdges(): GraphEdge[] {
    return [];
  }
  getEdges(query?: EdgeQuery): GraphEdge[] {
    return [];
  }
  queryPolicy(selection: PolicySelection): PolicyNode | undefined {
    return undefined;
  }
}

describe('ingest repo orchestration (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  beforeEach(() => {
    loadEnvConfigMock.mockClear();
    resolveIngestRootMock.mockClear();
    resolveRepoSourceMock.mockClear();
    syncRepoMock.mockClear();
    checkoutIfNeededMock.mockClear();
    runGitMock.mockClear();
    detectPackageManagerMock.mockClear();
    installDependenciesMock.mockClear();
  });
  it('delegates ingestRepo to connector', async () => {
    const store = new FakeStore();
    const connector: IngestionConnector = {
      canHandle: () => true,
      ingest: async (input: RepoIngestInput) => ({
        artifact_root_id: input.repoUrl,
        artifact_state_id: input.commit,
        node_count: 1,
        edge_count: 0,
      }),
    };

    const result = await ingestRepo(
      {
        repoPath: '/tmp/repo',
        repoUrl: 'https://example.com/repo',
        commit: 'commit',
        projectId: 'project-1',
      },
      store,
      connector,
    );

    expect(result.node_count).toBe(1);
  });

  it('runs ingestion with dependency install by default', async () => {
    const store = new FakeStore();
    const connector: IngestionConnector = {
      canHandle: () => true,
      ingest: async () => ({
        artifact_root_id: 'root',
        artifact_state_id: 'state',
        node_count: 1,
        edge_count: 0,
      }),
    };

    const result = await ingestRepoFromSource('https://example.com/repo', store, connector);

    expect(result.artifact_root_id).toBe('root');
    expect(store.beginTransaction).toHaveBeenCalled();
    expect(store.commit).toHaveBeenCalled();
    expect(installDependenciesMock).toHaveBeenCalled();
    expect(detectPackageManagerMock).toHaveBeenCalled();
  });

  it('skips dependency install when disabled', async () => {
    const store = new FakeStore();
    const connector: IngestionConnector = {
      canHandle: () => true,
      ingest: async () => ({
        artifact_root_id: 'root',
        artifact_state_id: 'state',
        node_count: 1,
        edge_count: 0,
      }),
    };

    await ingestRepoFromSource('https://example.com/repo', store, connector, {
      installDependencies: false,
    });

    expect(installDependenciesMock).not.toHaveBeenCalled();
  });

  it('rolls back when connector fails', async () => {
    const store = new FakeStore();
    const connector: IngestionConnector = {
      canHandle: () => true,
      ingest: async () => {
        throw new Error('boom');
      },
    };

    await expect(
      ingestRepoFromSource('https://example.com/repo', store, connector),
    ).rejects.toThrow('boom');

    expect(store.rollback).toHaveBeenCalled();
  });
});
