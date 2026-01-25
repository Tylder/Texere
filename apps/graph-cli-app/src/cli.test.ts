import { describe, expect, it } from 'vitest';

import type { GraphEdge, GraphNode, FileNode, SymbolNode } from '@repo/graph-core';
import { InMemoryGraphStore, InMemoryRelationalStore } from '@repo/graph-store';

import { GraphCLI } from './cli.js';

describe('GraphCLI core behaviors (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('summarizes an empty store for dumps', () => {
    const cli = new GraphCLI({
      graph: new InMemoryGraphStore(),
      relational: new InMemoryRelationalStore(),
    });
    const snapshot = cli.dumpToJSON();

    expect(snapshot.summary.total_nodes).toBe(0);
    expect(snapshot.summary.total_edges).toBe(0);
    expect(snapshot.summary.nodes_by_kind).toEqual({});
    expect(snapshot.summary.edges_by_kind).toEqual({});
  });

  it('traces connected nodes up to the requested depth', () => {
    const store = { graph: new InMemoryGraphStore(), relational: new InMemoryRelationalStore() };
    const file: GraphNode = {
      id: 'file:root',
      kind: 'File',
      schema_version: 'v0.1',
      fileId: 'file:root',
      path: 'README.md',
      packageName: 'repo',
      commitSha: 'abc',
      language: 'typescript',
      stale: false,
    };
    const symbol: GraphNode = {
      id: 'symbol:state',
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId: 'symbol:state',
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'repo',
      version: '0.0.0',
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

    store.graph.putNode(file);
    store.graph.putNode(symbol);
    store.graph.putEdge(edge);

    const cli = new GraphCLI(store);
    const trace = cli.trace('file:root', 1);

    expect(trace.nodes.map((node: GraphNode) => node.id).sort()).toEqual([
      'file:root',
      'symbol:state',
    ]);
    expect(trace.edges.map((stored: GraphEdge) => stored.id)).toEqual(['edge']);
  });

  it('diffs snapshots by node identity', () => {
    const cli = new GraphCLI({
      graph: new InMemoryGraphStore(),
      relational: new InMemoryRelationalStore(),
    });
    const fileNode: FileNode = {
      id: 'a',
      kind: 'File',
      schema_version: 'v0.1',
      fileId: 'a',
      path: 'src/a.ts',
      packageName: 'repo',
      commitSha: 'abc',
      language: 'typescript',
      stale: false,
    };
    const updatedFile: FileNode = {
      ...fileNode,
      path: 'src/b.ts',
    };
    const symbolNode: SymbolNode = {
      id: 'b',
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId: 'symbol:b',
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'repo',
      version: '0.0.0',
      stale: false,
    };

    const snap1 = {
      version: '0.1',
      generated_at: 't1',
      nodes: [fileNode],
      edges: [],
      summary: {
        total_nodes: 1,
        total_edges: 0,
        nodes_by_kind: { File: 1 },
        edges_by_kind: {},
      },
    };
    const snap2 = {
      version: '0.1',
      generated_at: 't2',
      nodes: [updatedFile, symbolNode],
      edges: [],
      summary: {
        total_nodes: 2,
        total_edges: 0,
        nodes_by_kind: { File: 1, Symbol: 1 },
        edges_by_kind: {},
      },
    };

    const diff = cli.diff(snap1, snap2);
    expect(diff.added).toEqual(['b']);
    expect(diff.modified).toEqual(['a']);
    expect(diff.removed).toEqual([]);
  });
});
