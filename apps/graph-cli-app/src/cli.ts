import path from 'node:path';

import type { GraphEdge, GraphNode, PolicySelection } from '@repo/graph-core';
import { ingestRepoFromSource, writeJsonDumps } from '@repo/graph-ingest';
import { ScipTsIngestionConnector } from '@repo/graph-ingest-connector-scip-ts';
import { CurrentCommittedTruthProjection } from '@repo/graph-projection';
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
    source: string,
    options?: {
      commit?: string;
      branch?: string;
      projectId?: string;
      policyScope?: string;
    },
  ): Promise<IngestResult> {
    const selection: PolicySelection | undefined = options?.policyScope
      ? { policy_kind: 'IngestionPolicy', scope: options.policyScope }
      : undefined;

    const result = await ingestRepoFromSource(source, this.store, new ScipTsIngestionConnector(), {
      ...(options?.commit ? { commit: options.commit } : {}),
      ...(options?.branch ? { branch: options.branch } : {}),
      ...(options?.projectId ? { projectId: options.projectId } : {}),
      ...(selection ? { policySelection: selection } : {}),
    });

    const outputDir = path.join('.', 'tmp', 'graph-dump');
    await writeJsonDumps({ store: this.store, outputDir });

    return {
      success: true,
      nodeCount: result.node_count,
      edgeCount: result.edge_count,
      outputDir,
    };
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

  trace(nodeId: string, depth = 3): TraceResult {
    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || current.level > depth) {
        continue;
      }

      this.visitNode(current.id, visitedNodes, nodes);
      this.collectEdges(current, visitedNodes, visitedEdges, edges, queue);
    }

    return { node_id: nodeId, depth, nodes, edges };
  }

  diff(snap1: GraphSnapshot, snap2: GraphSnapshot): DiffResult {
    const ids1 = new Set(snap1.nodes.map((node) => node.id));
    const ids2 = new Set(snap2.nodes.map((node) => node.id));

    const added = snap2.nodes.filter((node) => !ids1.has(node.id)).map((node) => node.id);
    const removed = snap1.nodes.filter((node) => !ids2.has(node.id)).map((node) => node.id);
    const modified = snap2.nodes
      .filter((node) => ids1.has(node.id))
      .filter((node) => {
        const previous = snap1.nodes.find((candidate) => candidate.id === node.id);
        return previous && JSON.stringify(previous) !== JSON.stringify(node);
      })
      .map((node) => node.id);

    const summary = `Nodes: ${snap1.nodes.length} -> ${snap2.nodes.length} (added ${added.length}, removed ${removed.length}, modified ${modified.length})`;

    return { summary, added, removed, modified };
  }

  async runProjection(name: string, options?: { policyScope?: string }): Promise<ProjectionResult> {
    const selection: PolicySelection | undefined = options?.policyScope
      ? { policy_kind: 'ProjectionPolicy', scope: options.policyScope }
      : undefined;
    const runner = new CurrentCommittedTruthProjection();
    const projection = runner.run(name, this.store, selection);

    const outputDir = path.join('.', 'tmp', 'graph-dump');
    await writeJsonDumps({ store: this.store, projection, outputDir });

    return {
      name: projection.projection_name,
      nodes: projection.nodes,
      edges: projection.edges,
    };
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

  private visitNode(id: string, visitedNodes: Set<string>, nodes: GraphNode[]): void {
    if (visitedNodes.has(id)) {
      return;
    }

    const node = this.store.getNode(id);
    if (!node) {
      return;
    }

    visitedNodes.add(id);
    nodes.push(node);
  }

  private collectEdges(
    current: { id: string; level: number },
    visitedNodes: Set<string>,
    visitedEdges: Set<string>,
    edges: GraphEdge[],
    queue: Array<{ id: string; level: number }>,
  ): void {
    for (const edge of this.store.getEdges()) {
      if (edge.from !== current.id && edge.to !== current.id) {
        continue;
      }

      if (!visitedEdges.has(edge.id)) {
        visitedEdges.add(edge.id);
        edges.push(edge);
      }

      const neighbor = edge.from === current.id ? edge.to : edge.from;
      if (!visitedNodes.has(neighbor)) {
        queue.push({ id: neighbor, level: current.level + 1 });
      }
    }
  }
}
