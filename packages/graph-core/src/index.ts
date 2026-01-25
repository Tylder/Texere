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

export type RangeKind = 'line_col' | 'byte_offset' | 'dom' | 'opaque';

export interface LineColRange {
  range_kind: 'line_col';
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

export interface ByteOffsetRange {
  range_kind: 'byte_offset';
  start_byte: number;
  end_byte: number;
}

export interface DomRange {
  range_kind: 'dom';
  selector: string;
  start_offset?: number;
  end_offset?: number;
}

export interface OpaqueRange {
  range_kind: 'opaque';
  pointer: string;
}

export type Range = LineColRange | ByteOffsetRange | DomRange | OpaqueRange;

export interface Locator {
  source_ref: string;
  snapshot_id: string;
  path_or_url: string;
  range?: Range;
}

export interface FileNode extends BaseNode {
  kind: 'File';
  fileId: string;
  path: string;
  packageName: string;
  commitSha: string;
  language: string;
  stale: boolean;
  locator?: Locator;
}

export interface SymbolNode extends BaseNode {
  kind: 'Symbol';
  symbolId: string;
  symbolKind: string;
  visibility: 'public' | 'private' | 'protected' | 'internal' | 'unknown';
  packageName: string;
  version: string;
  stale: boolean;
}

export interface TypeNode extends BaseNode {
  kind: 'Type';
  typeId: string;
  typeKind: string;
  packageName: string;
  version: string;
}

export interface CommitNode extends BaseNode {
  kind: 'Commit';
  commitSha: string;
  timestamp: string;
  author: string;
  message: string;
}

export interface PackageNode extends BaseNode {
  kind: 'Package';
  name: string;
  version: string;
  language: string;
  sourceRepo: string;
  scipUrl: string;
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

export type GraphNode = FileNode | SymbolNode | TypeNode | CommitNode | PackageNode | PolicyNode;

export interface DefinesEdge extends BaseEdge {
  kind: 'DEFINES';
  range: Range;
  definitionKind: 'declaration' | 'definition' | 'ambient';
}

export interface RefersToEdge extends BaseEdge {
  kind: 'REFERS_TO';
  range: Range;
  referenceKind: 'call' | 'read' | 'write' | 'type';
}

export interface DeclaresTypeEdge extends BaseEdge {
  kind: 'DECLARES_TYPE';
}

export interface ImplementsEdge extends BaseEdge {
  kind: 'IMPLEMENTS';
  relationKind: 'implements' | 'overrides';
}

export interface InheritsFromEdge extends BaseEdge {
  kind: 'INHERITS_FROM';
}

export interface ExportsEdge extends BaseEdge {
  kind: 'EXPORTS';
}

export interface HasChildEdge extends BaseEdge {
  kind: 'HAS_CHILD';
  descriptor: string;
}

export interface DependsOnEdge extends BaseEdge {
  kind: 'DEPENDS_ON';
  versionRange: string;
}

export interface IndexedAtEdge extends BaseEdge {
  kind: 'INDEXED_AT';
}

export type GraphEdge =
  | DefinesEdge
  | RefersToEdge
  | DeclaresTypeEdge
  | ImplementsEdge
  | InheritsFromEdge
  | ExportsEdge
  | HasChildEdge
  | DependsOnEdge
  | IndexedAtEdge
  | BaseEdge;

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
