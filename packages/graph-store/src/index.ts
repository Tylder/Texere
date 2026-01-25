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

export type FileMetadata = {
  file_id: string;
  path: string;
  package_name: string;
  commit_sha: string;
  language: string;
  content_hash: string;
  stale: boolean;
};

export type CommitMetadata = {
  commit_sha: string;
  timestamp: string;
  author: string;
  message: string;
};

export type PackageMetadata = {
  package_name: string;
  version: string;
  language: string;
  scip_url: string;
};

export type IndexStatusRecord = {
  file_id: string;
  status: 'complete' | 'partial' | 'failed' | 'skipped';
  indexed_at: string;
  error_message: string | null;
};

export interface RelationalStore {
  beginTransaction(): void;
  commit(): void;
  rollback(): void;
  putFile(record: FileMetadata): void;
  putCommit(record: CommitMetadata): void;
  putPackage(record: PackageMetadata): void;
  putIndexStatus(record: IndexStatusRecord): void;
  getFile(file_id: string): FileMetadata | undefined;
  listFiles(): FileMetadata[];
  listCommits(): CommitMetadata[];
  listPackages(): PackageMetadata[];
  listIndexStatus(): IndexStatusRecord[];
}

type RelationalSnapshot = {
  files: Map<string, FileMetadata>;
  commits: Map<string, CommitMetadata>;
  packages: Map<string, PackageMetadata>;
  indexStatus: Map<string, IndexStatusRecord>;
};

export class InMemoryRelationalStore implements RelationalStore {
  private files = new Map<string, FileMetadata>();
  private commits = new Map<string, CommitMetadata>();
  private packages = new Map<string, PackageMetadata>();
  private indexStatus = new Map<string, IndexStatusRecord>();
  private snapshots: RelationalSnapshot[] = [];

  beginTransaction(): void {
    this.snapshots.push({
      files: new Map(this.files),
      commits: new Map(this.commits),
      packages: new Map(this.packages),
      indexStatus: new Map(this.indexStatus),
    });
  }

  commit(): void {
    this.snapshots.pop();
  }

  rollback(): void {
    const snapshot = this.snapshots.pop();
    if (!snapshot) return;
    this.files = snapshot.files;
    this.commits = snapshot.commits;
    this.packages = snapshot.packages;
    this.indexStatus = snapshot.indexStatus;
  }

  putFile(record: FileMetadata): void {
    this.files.set(record.file_id, record);
  }

  putCommit(record: CommitMetadata): void {
    this.commits.set(record.commit_sha, record);
  }

  putPackage(record: PackageMetadata): void {
    this.packages.set(`${record.package_name}@${record.version}`, record);
  }

  putIndexStatus(record: IndexStatusRecord): void {
    this.indexStatus.set(record.file_id, record);
  }

  getFile(file_id: string): FileMetadata | undefined {
    return this.files.get(file_id);
  }

  listFiles(): FileMetadata[] {
    return [...this.files.values()].sort((a, b) => a.file_id.localeCompare(b.file_id));
  }

  listCommits(): CommitMetadata[] {
    return [...this.commits.values()].sort((a, b) => a.commit_sha.localeCompare(b.commit_sha));
  }

  listPackages(): PackageMetadata[] {
    return [...this.packages.values()].sort((a, b) =>
      `${a.package_name}@${a.version}`.localeCompare(`${b.package_name}@${b.version}`),
    );
  }

  listIndexStatus(): IndexStatusRecord[] {
    return [...this.indexStatus.values()].sort((a, b) => a.file_id.localeCompare(b.file_id));
  }
}
