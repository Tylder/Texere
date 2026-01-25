import { describe, expect, it } from 'vitest';

import type { GraphEdge, GraphNode } from '@repo/graph-core';
import { InMemoryGraphStore, InMemoryRelationalStore } from '@repo/graph-store';

import { GraphCLI } from './cli.js';

describe('graph cli helpers (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('summarizes nodes and edges', () => {
    const store = { graph: new InMemoryGraphStore(), relational: new InMemoryRelationalStore() };
    const node: GraphNode = {
      id: 'file:root',
      kind: 'File',
      schema_version: 'v0.1',
      fileId: 'file:root',
      path: 'README.md',
      packageName: 'repo',
      commitSha: 'commit',
      language: 'typescript',
      stale: false,
    };
    const edge: GraphEdge = {
      id: 'edge',
      kind: 'REFERS_TO',
      schema_version: 'v0.1',
      from: 'file:root',
      to: 'symbol:state',
      range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 1 },
      referenceKind: 'read',
    };
    store.graph.putNode(node);
    store.graph.putEdge(edge);

    const cli = new GraphCLI(store);
    const nodes = cli.getNodes();
    const edges = cli.getEdges();

    expect(nodes).toEqual([{ kind: 'File', count: 1 }]);
    expect(edges).toEqual([{ kind: 'REFERS_TO', count: 1 }]);
    expect(cli.getNodeById('file:root')).toEqual(node);
  });

  it('formats dump output', () => {
    const store = { graph: new InMemoryGraphStore(), relational: new InMemoryRelationalStore() };
    const cli = new GraphCLI(store);
    const text = cli.dumpToText();

    expect(text).toContain('Graph State');
    expect(text).toContain('Nodes:');
    expect(text).toContain('Edges:');
  });
});
