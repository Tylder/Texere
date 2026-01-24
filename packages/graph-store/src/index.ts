import type {
  EdgeQuery,
  GraphEdge,
  GraphNode,
  NodeId,
  PolicyNode,
  PolicySelection,
} from '@repo/graph-core';

export interface GraphStore {
  beginTransaction(): void;
  commit(): void;
  rollback(): void;
  putNode(node: GraphNode): void;
  putEdge(edge: GraphEdge): void;
  getNode(id: NodeId): GraphNode | undefined;
  listNodes(): GraphNode[];
  listEdges(): GraphEdge[];
  getEdges(query?: EdgeQuery): GraphEdge[];
  queryPolicy(selection: PolicySelection): PolicyNode | undefined;
}

type StoreSnapshot = {
  nodes: Map<NodeId, GraphNode>;
  edges: GraphEdge[];
  policyOrder: NodeId[];
};

export class InMemoryGraphStore implements GraphStore {
  private nodes = new Map<NodeId, GraphNode>();
  private edges: GraphEdge[] = [];
  private policyOrder: NodeId[] = [];
  private snapshots: StoreSnapshot[] = [];

  beginTransaction(): void {
    this.snapshots.push({
      nodes: new Map(this.nodes),
      edges: [...this.edges],
      policyOrder: [...this.policyOrder],
    });
  }

  commit(): void {
    this.snapshots.pop();
  }

  rollback(): void {
    const snapshot = this.snapshots.pop();
    if (!snapshot) return;
    this.nodes = snapshot.nodes;
    this.edges = snapshot.edges;
    this.policyOrder = snapshot.policyOrder;
  }

  putNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (node.kind === 'Policy') {
      this.policyOrder.push(node.id);
    }
  }

  putEdge(edge: GraphEdge): void {
    this.edges.push(edge);
  }

  getNode(id: NodeId): GraphNode | undefined {
    return this.nodes.get(id);
  }

  listNodes(): GraphNode[] {
    return [...this.nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  listEdges(): GraphEdge[] {
    return [...this.edges].sort((a, b) => a.id.localeCompare(b.id));
  }

  getEdges(query?: EdgeQuery): GraphEdge[] {
    if (!query) return this.listEdges();
    return this.listEdges().filter((edge) => {
      if (query.from && edge.from !== query.from) return false;
      if (query.to && edge.to !== query.to) return false;
      if (query.kind && edge.kind !== query.kind) return false;
      return true;
    });
  }

  queryPolicy(selection: PolicySelection): PolicyNode | undefined {
    const policies = this.policyOrder
      .map((id) => this.nodes.get(id))
      .filter((node): node is PolicyNode => node?.kind === 'Policy')
      .filter(
        (policy) =>
          policy.policy_kind === selection.policy_kind && policy.scope === selection.scope,
      );

    const superseded = new Set<string>();
    for (const policy of policies) {
      if (policy.supersedes) superseded.add(policy.supersedes);
    }

    const candidates = policies.filter((policy) => !superseded.has(policy.id));
    if (candidates.length === 0) return undefined;

    return candidates[candidates.length - 1];
  }
}
