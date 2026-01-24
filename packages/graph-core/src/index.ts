import { createHash } from 'node:crypto';

export type SchemaVersion = 'v0.1';
export type NodeId = string;
export type EdgeId = string;

export interface BaseNode {
  id: NodeId;
  kind: string;
  schema_version: SchemaVersion;
}

export interface BaseEdge {
  id: EdgeId;
  kind: string;
  schema_version: SchemaVersion;
  from: NodeId;
  to: NodeId;
}

export interface ArtifactRootNode extends BaseNode {
  kind: 'ArtifactRoot';
  source_kind: 'repo';
  canonical_ref: string;
}

export interface ArtifactStateNode extends BaseNode {
  kind: 'ArtifactState';
  artifact_root_id: NodeId;
  version_ref: string;
  content_hash: string;
  retrieved_at: string;
}

export interface ArtifactPartNode extends BaseNode {
  kind: 'ArtifactPart';
  artifact_state_id: NodeId;
  locator: string;
  retention_mode: 'link-only' | 'full';
  part_kind: 'file' | 'symbol';
}

export type PolicyKind =
  | 'IngestionPolicy'
  | 'ProjectionPolicy'
  | 'ValidationPolicy'
  | 'RetentionPolicy'
  | 'ConflictPolicy';

export interface PolicyNode extends BaseNode {
  kind: 'Policy';
  policy_kind: PolicyKind;
  scope: string;
  supersedes?: NodeId;
}

export type GraphNode = ArtifactRootNode | ArtifactStateNode | ArtifactPartNode | PolicyNode;

export type GraphEdge = BaseEdge;

export interface EdgeQuery {
  from?: NodeId;
  to?: NodeId;
  kind?: string;
}

export interface PolicySelection {
  policy_kind: PolicyKind;
  scope: string;
}

export interface ProjectionEnvelope {
  projection_name: string;
  schema_version: SchemaVersion;
  generated_at: string;
  explanation: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function createDeterministicId(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
