import { describe, expect, it } from 'vitest';

import type { ArtifactRootNode, ArtifactStateNode, GraphEdge, GraphNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { GraphCLI } from './cli.js';

describe('GraphCLI core behaviors (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('summarizes an empty store for dumps', () => {
    const cli = new GraphCLI(new InMemoryGraphStore());
    const snapshot = cli.dumpToJSON();

    expect(snapshot.summary.total_nodes).toBe(0);
    expect(snapshot.summary.total_edges).toBe(0);
    expect(snapshot.summary.nodes_by_kind).toEqual({});
    expect(snapshot.summary.edges_by_kind).toEqual({});
  });

  it('traces connected nodes up to the requested depth', () => {
    const store = new InMemoryGraphStore();
    const root: GraphNode = {
      id: 'root',
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: 'file://repo',
    };
    const state: GraphNode = {
      id: 'state',
      kind: 'ArtifactState',
      schema_version: 'v0.1',
      artifact_root_id: 'root',
      version_ref: 'abc',
      content_hash: 'hash',
      retrieved_at: 'now',
    };
    const edge: GraphEdge = {
      id: 'edge',
      kind: 'HasState',
      schema_version: 'v0.1',
      from: 'root',
      to: 'state',
    };

    store.putNode(root);
    store.putNode(state);
    store.putEdge(edge);

    const cli = new GraphCLI(store);
    const trace = cli.trace('root', 1);

    expect(trace.nodes.map((node) => node.id).sort()).toEqual(['root', 'state']);
    expect(trace.edges.map((stored) => stored.id)).toEqual(['edge']);
  });

  it('diffs snapshots by node identity', () => {
    const cli = new GraphCLI(new InMemoryGraphStore());
    const rootNode: ArtifactRootNode = {
      id: 'a',
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: 'x',
    };
    const updatedRoot: ArtifactRootNode = {
      ...rootNode,
      canonical_ref: 'y',
    };
    const stateNode: ArtifactStateNode = {
      id: 'b',
      kind: 'ArtifactState',
      schema_version: 'v0.1',
      artifact_root_id: 'a',
      version_ref: 'abc',
      content_hash: 'hash',
      retrieved_at: 'now',
    };

    const snap1 = {
      version: '0.1',
      generated_at: 't1',
      nodes: [rootNode],
      edges: [],
      summary: {
        total_nodes: 1,
        total_edges: 0,
        nodes_by_kind: { ArtifactRoot: 1 },
        edges_by_kind: {},
      },
    };
    const snap2 = {
      version: '0.1',
      generated_at: 't2',
      nodes: [updatedRoot, stateNode],
      edges: [],
      summary: {
        total_nodes: 2,
        total_edges: 0,
        nodes_by_kind: { ArtifactRoot: 1, ArtifactState: 1 },
        edges_by_kind: {},
      },
    };

    const diff = cli.diff(snap1, snap2);
    expect(diff.added).toEqual(['b']);
    expect(diff.modified).toEqual(['a']);
    expect(diff.removed).toEqual([]);
  });
});
