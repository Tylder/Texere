/**
 * @file Texere Indexer – Complete Type System
 * @reference docs/specs/feature/indexer/ingest_spec.md §3–4 (core types)
 * @reference docs/specs/feature/indexer/nodes/README.md (node types)
 * @reference docs/specs/feature/indexer/edges/README.md (edge types)
 * @reference docs/specs/feature/indexer/graph_schema_spec.md §2–3
 */

// ============================================================================
// 1. Foundational Types
// ============================================================================

export type SupportedLanguage = 'ts' | 'tsx' | 'js' | 'py';

export interface Range {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

// ============================================================================
// 2. File Indexer Input/Output (ingest_spec.md §3–4)
// ============================================================================

export interface SymbolIndex {
  id: string; // snapshot-scoped: snapshotId:filePath:name:startLine:startCol
  name: string;
  kind: 'function' | 'class' | 'method' | 'const' | 'type' | 'interface' | 'other';
  range: Range;
  isExported?: boolean;
  docstring?: string;
}

export interface CallIndex {
  callerSymbolId: string;
  calleeSymbolId: string;
  location: { filePath: string; line: number; col: number };
}

export interface ReferenceIndex {
  fromSymbolId: string;
  toSymbolId: string;
  type?: 'TYPE_REF' | 'IMPORT' | 'PATTERN' | 'SIMILAR';
  location: { filePath: string; line: number; col: number };
}

export interface BoundaryIndex {
  verb: string; // 'GET', 'POST', 'DELETE', 'PATCH', 'PUT', etc.
  path: string;
  handlerSymbolId: string;
  kind?: 'http' | 'grpc' | 'cli' | 'event'; // Default: 'http'
}

export interface TestCaseIndex {
  id: string;
  name: string;
  location: { filePath: string; line: number; col: number };
}

export interface FileIndexResult {
  filePath: string;
  language: SupportedLanguage;
  symbols: SymbolIndex[];
  calls: CallIndex[];
  references: ReferenceIndex[];
  boundaries?: BoundaryIndex[];
  testCases?: TestCaseIndex[];
}

export interface LanguageIndexer {
  languageIds: SupportedLanguage[];
  canHandleFile: (path: string) => boolean;
  indexFiles: (args: {
    codebaseRoot: string;
    snapshotId: string;
    filePaths: string[];
  }) => Promise<FileIndexResult[]>;
}

// ============================================================================
// 3. Graph Node Types (nodes/README.md – Snapshot-Scoped)
// ============================================================================

export interface GraphNode {
  id: string;
  createdAt: number;
  updatedAt?: number;
}

// Structural Nodes
export interface Codebase extends GraphNode {
  label: 'Codebase';
  name: string;
  url?: string;
}

export interface Snapshot extends GraphNode {
  label: 'Snapshot';
  codebaseId: string;
  commitHash: string;
  author?: string;
  message?: string;
  timestamp: number;
  branch?: string;
  snapshotType?: 'branch' | 'tag' | 'dependency';
  indexStatus: 'success' | 'failed' | 'partial';
  indexedAt: number;
}

export interface Module extends GraphNode {
  label: 'Module';
  snapshotId: string;
  name: string;
  path: string;
  type?: 'nx-app' | 'nx-lib' | 'maven-project' | 'cargo-pkg';
  language?: string; // 'ts' | 'py' | 'java'
}

export interface File extends GraphNode {
  label: 'File';
  snapshotId: string;
  path: string;
  name: string;
  language: SupportedLanguage;
  isTest: boolean;
  isDeleted?: boolean;
}

export interface Symbol extends GraphNode {
  label: 'Symbol';
  snapshotId: string;
  name: string;
  filePath: string;
  kind: 'function' | 'class' | 'method' | 'const' | 'type' | 'interface' | 'other';
  range: Range;
  isExported?: boolean;
  docstring?: string;
  isDeleted?: boolean;
}

export interface Boundary extends GraphNode {
  label: 'Boundary';
  snapshotId: string;
  verb: string; // 'GET', 'POST', etc.
  path: string;
  kind?: 'http' | 'grpc' | 'cli' | 'event';
  isDeleted?: boolean;
}

export interface DataContract extends GraphNode {
  label: 'DataContract';
  snapshotId: string;
  entityName: string;
  type?: 'prisma' | 'sql' | 'graphql' | 'protobuf' | 'zod';
  definition?: string;
  isDeleted?: boolean;
}

export interface TestCase extends GraphNode {
  label: 'TestCase';
  snapshotId: string;
  name: string;
  filePath: string;
  range: Range;
  isDeleted?: boolean;
}

export interface SpecDoc extends GraphNode {
  label: 'SpecDoc';
  snapshotId: string;
  docPath: string;
  title?: string;
  content?: string;
  isDeleted?: boolean;
}

// Cross-Snapshot Nodes
export interface Feature extends GraphNode {
  label: 'Feature';
  featureId: string;
  name: string;
  description?: string;
  isDeleted?: boolean;
}

export interface Pattern extends GraphNode {
  label: 'Pattern';
  patternName: string;
  description?: string;
}

export interface Incident extends GraphNode {
  label: 'Incident';
  incidentId: string;
  title: string;
  description?: string;
  isDeleted?: boolean;
}

export interface ExternalService extends GraphNode {
  label: 'ExternalService';
  serviceName: string;
  url?: string;
}

export interface StyleGuide extends GraphNode {
  label: 'StyleGuide';
  guidePath: string;
  title?: string;
}

// Union type for all nodes
export type AnyGraphNode =
  | Codebase
  | Snapshot
  | Module
  | File
  | Symbol
  | Boundary
  | DataContract
  | TestCase
  | SpecDoc
  | Feature
  | Pattern
  | Incident
  | ExternalService
  | StyleGuide;

// ============================================================================
// 4. Graph Edge Types (edges/README.md)
// ============================================================================

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  createdAt?: number;
  confidence?: number;
  context?: string;
}

// Structural edges
export interface ContainsEdge extends GraphEdge {
  type: 'CONTAINS';
}

export interface InSnapshotEdge extends GraphEdge {
  type: 'IN_SNAPSHOT';
}

export interface LocationEdge extends GraphEdge {
  type: 'LOCATION';
  role: 'HANDLED_BY' | 'IN_FILE' | 'IN_MODULE';
}

// Code relation edges
export interface ReferencesEdge extends GraphEdge {
  type: 'REFERENCES';
  refType: 'CALL' | 'TYPE_REF' | 'IMPORT' | 'PATTERN' | 'SIMILAR';
  location?: { filePath: string; line: number; col: number };
}

// Implementation edges
export interface RealizesEdge extends GraphEdge {
  type: 'REALIZES';
  role: 'IMPLEMENTS' | 'TESTS' | 'VERIFIES';
}

// Data flow edges
export interface MutatesEdge extends GraphEdge {
  type: 'MUTATES';
  operation: 'READ' | 'WRITE';
}

// Dependency edges
export interface DependsOnEdge extends GraphEdge {
  type: 'DEPENDS_ON';
  kind: 'LIBRARY' | 'SERVICE' | 'CONFIG' | 'STYLE_GUIDE';
}

// Documentation edges
export interface DocumentsEdge extends GraphEdge {
  type: 'DOCUMENTS';
  docType: 'FEATURE' | 'ENDPOINT' | 'SYMBOL' | 'MODULE' | 'PATTERN';
}

// Evolution edges
export interface TracksEdge extends GraphEdge {
  type: 'TRACKS';
  event: 'INTRODUCED' | 'MODIFIED';
}

// Impact edges
export interface ImpactsEdge extends GraphEdge {
  type: 'IMPACTS';
  impactType: 'CAUSED_BY' | 'AFFECTS';
}

// Union type for all edges
export type AnyGraphEdge =
  | ContainsEdge
  | InSnapshotEdge
  | LocationEdge
  | ReferencesEdge
  | RealizesEdge
  | MutatesEdge
  | DependsOnEdge
  | DocumentsEdge
  | TracksEdge
  | ImpactsEdge;

// ============================================================================
// 5. Query Bundle Types (graph_schema_spec.md §6)
// ============================================================================

export interface CallGraphSlice {
  symbol: Symbol;
  callersCount: number;
  callers: Symbol[];
  calleesCount: number;
  callees: Symbol[];
}

export interface FeatureContextBundle {
  feature: Feature;
  symbols: Symbol[];
  boundaries: Boundary[];
  testCases: TestCase[];
  specDocs: SpecDoc[];
  callGraphSlice: CallGraphSlice;
  relatedPatterns: Pattern[];
  confidence: number;
}

export interface BoundaryPatternExample {
  boundary: Boundary;
  handlerSymbol: Symbol;
  calledServices: Symbol[];
  testCases: TestCase[];
  documentation: SpecDoc[];
}

export interface IncidentSliceBundle {
  incident: Incident;
  rootCauseSymbols: Symbol[];
  rootCauseBoundaries: Boundary[];
  affectedFeatures: Feature[];
  affectedBoundaries: Boundary[];
  relatedTestCases: TestCase[];
  confidence: number;
}

// ============================================================================
// 6. Configuration Types (configuration_spec.md §1–2)
// ============================================================================

export interface CodebaseConfig {
  id: string;
  root: string;
  trackedBranches: string[];
  languages?: SupportedLanguage[];
  defaultBranch?: string;
}

export interface GraphConfig {
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
}

export interface VectorConfig {
  qdrantUrl: string;
  collectionName?: string;
}

export interface SecurityConfig {
  denyPatterns?: string[];
  allowPatterns?: string[] | null;
}

export interface EmbeddingConfig {
  model?: string; // 'openai', 'local', etc.
  modelName?: string;
  dimensions?: number;
  batchSize?: number;
}

export interface LLMConfig {
  provider?: string; // 'openai', 'anthropic', etc.
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface WorkerConfig {
  type?: 'local' | 'bullmq';
  concurrency?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface IndexerConfig {
  version: string;
  codebases: CodebaseConfig[];
  graph: GraphConfig;
  vectors: VectorConfig;
  security?: SecurityConfig;
  embedding?: EmbeddingConfig;
  llm?: LLMConfig;
  worker?: WorkerConfig;
}

// ============================================================================
// 7. Snapshot Resolution & Diff (ingest_spec.md §6.1–6.2)
// ============================================================================

export interface SnapshotRef {
  codebaseId: string;
  commitHash: string;
  branch?: string;
  snapshotType?: 'branch' | 'tag' | 'dependency';
}

export interface ChangedFileSet {
  added: string[];
  modified: string[];
  deleted: string[];
  renamed: Array<{ from: string; to: string }>;
}

// ============================================================================
// 8. Runtime markers for test coverage
// ============================================================================

export const typesVersion = '0.0.0';
