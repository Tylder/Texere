import type { GraphNode } from '@repo/graph-core';
import type { GraphStore } from '@repo/graph-store';
import { InMemoryGraphStore } from '@repo/graph-store';

import type {
  DiffResult,
  GraphSnapshot,
  IngestResult,
  ProjectionResult,
  TraceResult,
} from './types.js';

export class GraphCLI {
  private store: GraphStore;

  constructor(store: GraphStore = new InMemoryGraphStore()) {
    this.store = store;
  }

  async ingestRepo(
    _source: string,
    _options?: { commit?: string; branch?: string },
  ): Promise<IngestResult> {
    await Promise.resolve();
    throw new Error('Ingest not implemented yet.');
  }

  getNodes(): Array<{ kind: string; count: number }> {
    const counts = new Map<string, number>();
    for (const node of this.store.listNodes()) {
      counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kind, count]) => ({ kind, count }));
  }

  getEdges(): Array<{ kind: string; count: number }> {
    const counts = new Map<string, number>();
    for (const edge of this.store.listEdges()) {
      counts.set(edge.kind, (counts.get(edge.kind) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kind, count]) => ({ kind, count }));
  }

  getNodeById(id: string): GraphNode | undefined {
    return this.store.getNode(id);
  }

  trace(_nodeId: string, _depth = 3): TraceResult {
    throw new Error('Trace not implemented yet.');
  }

  diff(_snap1: GraphSnapshot, _snap2: GraphSnapshot): DiffResult {
    throw new Error('Diff not implemented yet.');
  }

  async runProjection(_name: string): Promise<ProjectionResult> {
    await Promise.resolve();
    throw new Error('Projection not implemented yet.');
  }

  dumpToJSON(): GraphSnapshot {
    const nodes = this.store.listNodes();
    const edges = this.store.listEdges();
    const nodesByKind = this.countByKind(nodes);
    const edgesByKind = this.countByKind(edges);

    return {
      version: '0.1',
      generated_at: new Date().toISOString(),
      nodes,
      edges,
      summary: {
        total_nodes: nodes.length,
        total_edges: edges.length,
        nodes_by_kind: nodesByKind,
        edges_by_kind: edgesByKind,
      },
    };
  }

  dumpToText(): string {
    const snapshot = this.dumpToJSON();
    const lines = [
      `Graph State (${snapshot.summary.total_nodes} nodes, ${snapshot.summary.total_edges} edges)`,
      'Nodes:',
      ...this.formatCounts(snapshot.summary.nodes_by_kind),
      'Edges:',
      ...this.formatCounts(snapshot.summary.edges_by_kind),
    ];

    return lines.join('\n');
  }

  private countByKind(items: Array<{ kind: string }>): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {});
  }

  private formatCounts(counts: Record<string, number>): string[] {
    const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length === 0) {
      return ['  (none)'];
    }
    return entries.map(([kind, count]) => `  ${kind}: ${count}`);
  }
}
