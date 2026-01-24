import { describe, expect, it } from 'vitest';

import type { GraphEdge, GraphNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { GraphCLI } from './cli.js';

describe('graph cli helpers (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('summarizes nodes and edges', () => {
    const store = new InMemoryGraphStore();
    const node: GraphNode = {
      id: 'root',
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: 'file://repo',
    };
    const edge: GraphEdge = {
      id: 'edge',
      kind: 'HasState',
      schema_version: 'v0.1',
      from: 'root',
      to: 'state',
    };
    store.putNode(node);
    store.putEdge(edge);

    const cli = new GraphCLI(store);
    const nodes = cli.getNodes();
    const edges = cli.getEdges();

    expect(nodes).toEqual([{ kind: 'ArtifactRoot', count: 1 }]);
    expect(edges).toEqual([{ kind: 'HasState', count: 1 }]);
    expect(cli.getNodeById('root')).toEqual(node);
  });

  it('formats dump output', () => {
    const store = new InMemoryGraphStore();
    const cli = new GraphCLI(store);
    const text = cli.dumpToText();

    expect(text).toContain('Graph State');
    expect(text).toContain('Nodes:');
    expect(text).toContain('Edges:');
  });
});
