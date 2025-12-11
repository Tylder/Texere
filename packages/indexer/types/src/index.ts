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

/**
 * Represents a symbol extracted from source code.
 * @reference ingest_spec.md §3 (SymbolIndex structure)
 * @reference nodes/Symbol.md (Symbol node)
 */
export interface SymbolIndex {
  id: string; // snapshot-scoped: snapshotId:filePath:name:startLine:startCol
  name: string;
  kind: 'function' | 'class' | 'method' | 'const' | 'type' | 'interface' | 'other';
  range: Range;
  isExported?: boolean;
  docstring?: string;
}

/**
 * Represents a function call relationship.
 * @reference ingest_spec.md §4 (CallIndex structure)
 * @reference edges/REFERENCES.md (CALL sub-type)
 */
export interface CallIndex {
  callerSymbolId: string;
  calleeSymbolId: string;
  location: { filePath: string; line: number; col: number };
}

/**
 * Represents code references (imports, type refs, patterns).
 * @reference ingest_spec.md §4 (ReferenceIndex structure)
 * @reference edges/REFERENCES.md (all sub-types)
 */
export interface ReferenceIndex {
  fromSymbolId: string;
  toSymbolId: string;
  type?: 'TYPE_REF' | 'IMPORT' | 'PATTERN' | 'SIMILAR';
  location: { filePath: string; line: number; col: number };
}

/**
 * Represents an HTTP/gRPC/CLI/event boundary (endpoint).
 * @reference ingest_spec.md §5.1 (boundary detection)
 * @reference nodes/Boundary.md (Boundary node)
 * @reference language_indexers_spec.md (verb/path heuristics)
 */
export interface BoundaryIndex {
  verb: string; // 'GET', 'POST', 'DELETE', 'PATCH', 'PUT', etc.
  path: string;
  handlerSymbolId: string;
  kind?: 'http' | 'grpc' | 'cli' | 'event'; // Default: 'http'
}

/**
 * Represents a test case (unit, integration, or e2e).
 * @reference ingest_spec.md §5.1 (test detection)
 * @reference nodes/TestCase.md (TestCase node)
 */
export interface TestCaseIndex {
  id: string;
  name: string;
  location: { filePath: string; line: number; col: number };
}

/**
 * Result of indexing a single file: symbols, calls, references, boundaries, tests.
 * Produced by language indexers; consumed by extractors and graph persistence.
 * @reference ingest_spec.md §3–4
 */
export interface FileIndexResult {
  filePath: string;
  language: SupportedLanguage;
  symbols: SymbolIndex[];
  calls: CallIndex[];
  references: ReferenceIndex[];
  boundaries?: BoundaryIndex[];
  testCases?: TestCaseIndex[];
}

/**
 * Interface for language-specific indexers (TS/JS, Python, etc.).
 * @reference ingest_spec.md §2.2 (language indexer responsibility)
 * @reference language_indexers_spec.md (per-language details)
 */
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

/**
 * Base interface for all graph nodes.
 * @reference nodes/README.md (common properties)
 */
export interface GraphNode {
  id: string;
  createdAt: number;
  updatedAt?: number;
}

// Structural Nodes

/**
 * Codebase root node: represents a repository or code project.
 * @reference nodes/Codebase.md
 * @reference nodes/README.md (cardinality: N per workspace)
 */
export interface Codebase extends GraphNode {
  label: 'Codebase';
  name: string;
  url?: string;
}

/**
 * Snapshot node: represents a specific commit being indexed.
 * @reference nodes/Snapshot.md
 * @reference nodes/README.md (cardinality: N per codebase)
 */
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

/**
 * Module node: logical package, library, or app (e.g., Nx lib, Maven project).
 * @reference nodes/Module.md
 * @reference nodes/README.md (cardinality: N per snapshot)
 */
export interface Module extends GraphNode {
  label: 'Module';
  snapshotId: string;
  name: string;
  path: string;
  type?: 'nx-app' | 'nx-lib' | 'maven-project' | 'cargo-pkg';
  language?: string; // 'ts' | 'py' | 'java'
}

/**
 * File node: source code file.
 * @reference nodes/File.md
 * @reference nodes/README.md (cardinality: N per module)
 */
export interface File extends GraphNode {
  label: 'File';
  snapshotId: string;
  path: string;
  name: string;
  language: SupportedLanguage;
  isTest: boolean;
  isDeleted?: boolean;
}

/**
 * Symbol node: function, class, type, interface, const, etc.
 * @reference nodes/Symbol.md
 * @reference nodes/README.md (cardinality: N per file)
 * @reference symbol_id_stability_spec.md (ID format: snapshotId:filePath:name:line:col)
 */
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

/**
 * Boundary node: HTTP endpoint, gRPC service, CLI command, event consumer, etc.
 * @reference nodes/Boundary.md
 * @reference nodes/README.md (cardinality: N per snapshot)
 * @reference language_indexers_spec.md (extraction heuristics)
 */
export interface Boundary extends GraphNode {
  label: 'Boundary';
  snapshotId: string;
  verb: string; // 'GET', 'POST', etc.
  path: string;
  kind?: 'http' | 'grpc' | 'cli' | 'event';
  isDeleted?: boolean;
}

/**
 * DataContract node: data model (Prisma, SQL, GraphQL, Protobuf, Zod, etc.).
 * @reference nodes/DataContract.md
 * @reference nodes/README.md (cardinality: N per snapshot)
 */
export interface DataContract extends GraphNode {
  label: 'DataContract';
  snapshotId: string;
  entityName: string;
  type?: 'prisma' | 'sql' | 'graphql' | 'protobuf' | 'zod';
  definition?: string;
  isDeleted?: boolean;
}

/**
 * TestCase node: unit, integration, or e2e test.
 * @reference nodes/TestCase.md
 * @reference nodes/README.md (cardinality: N per file)
 */
export interface TestCase extends GraphNode {
  label: 'TestCase';
  snapshotId: string;
  name: string;
  filePath: string;
  range: Range;
  isDeleted?: boolean;
}

/**
 * SpecDoc node: specification, ADR, design doc, or markdown file.
 * @reference nodes/SpecDoc.md
 * @reference nodes/README.md (cardinality: N per snapshot)
 * @reference documentation_indexing_spec.md (doc sources)
 */
export interface SpecDoc extends GraphNode {
  label: 'SpecDoc';
  snapshotId: string;
  docPath: string;
  title?: string;
  content?: string;
  isDeleted?: boolean;
}

// Cross-Snapshot Nodes

/**
 * Feature node: user-facing feature (persistent across snapshots).
 * @reference nodes/Feature.md
 * @reference nodes/README.md (cardinality: 1 per feature ID)
 */
export interface Feature extends GraphNode {
  label: 'Feature';
  featureId: string;
  name: string;
  description?: string;
  isDeleted?: boolean;
}

/**
 * Pattern node: code pattern (e.g., "express-middleware").
 * @reference nodes/Pattern.md
 * @reference nodes/README.md (cardinality: 1 per pattern name)
 */
export interface Pattern extends GraphNode {
  label: 'Pattern';
  patternName: string;
  description?: string;
}

/**
 * Incident node: bug, issue, or production incident.
 * @reference nodes/Incident.md
 * @reference nodes/README.md (cardinality: 1 per incident ID)
 */
export interface Incident extends GraphNode {
  label: 'Incident';
  incidentId: string;
  title: string;
  description?: string;
  isDeleted?: boolean;
}

/**
 * ExternalService node: third-party API (Stripe, Auth0, etc.).
 * @reference nodes/ExternalService.md
 * @reference nodes/README.md (cardinality: 1 per service name)
 */
export interface ExternalService extends GraphNode {
  label: 'ExternalService';
  serviceName: string;
  url?: string;
}

/**
 * StyleGuide node: coding convention or style guide.
 * @reference nodes/StyleGuide.md
 * @reference nodes/README.md (cardinality: 1 per guide path)
 */
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

/**
 * Base interface for all graph edges.
 * @reference edges/README.md (common properties)
 */
export interface GraphEdge {
  sourceId: string;
  targetId: string;
  createdAt?: number;
  confidence?: number;
  context?: string;
}

// Structural edges

/**
 * CONTAINS edge: hierarchy tree relationship (Module→File, File→Symbol, etc.).
 * @reference edges/CONTAINS.md
 * @reference edges/README.md (cardinality invariant: transitive tree)
 */
export interface ContainsEdge extends GraphEdge {
  type: 'CONTAINS';
}

/**
 * IN_SNAPSHOT edge: version membership (every snapshot-scoped node has exactly 1).
 * @reference edges/IN_SNAPSHOT.md
 * @reference edges/README.md (cardinality invariant: exactly 1 per scoped node)
 * @reference graph_schema_spec.md §4.1B (critical constraint)
 */
export interface InSnapshotEdge extends GraphEdge {
  type: 'IN_SNAPSHOT';
}

/**
 * LOCATION edge: position and ownership relationship with role-based semantics.
 * @reference edges/LOCATION.md
 * @reference edges/README.md (roles: HANDLED_BY, IN_FILE, IN_MODULE)
 */
export interface LocationEdge extends GraphEdge {
  type: 'LOCATION';
  role: 'HANDLED_BY' | 'IN_FILE' | 'IN_MODULE';
}

// Code relation edges

/**
 * REFERENCES edge: code connections (calls, type refs, imports, patterns, similarity).
 * @reference edges/REFERENCES.md
 * @reference edges/README.md (types: CALL, TYPE_REF, IMPORT, PATTERN, SIMILAR)
 */
export interface ReferencesEdge extends GraphEdge {
  type: 'REFERENCES';
  refType: 'CALL' | 'TYPE_REF' | 'IMPORT' | 'PATTERN' | 'SIMILAR';
  location?: { filePath: string; line: number; col: number };
}

// Implementation edges

/**
 * REALIZES edge: implementation and testing relationships.
 * @reference edges/REALIZES.md
 * @reference edges/README.md (roles: IMPLEMENTS, TESTS, VERIFIES)
 */
export interface RealizesEdge extends GraphEdge {
  type: 'REALIZES';
  role: 'IMPLEMENTS' | 'TESTS' | 'VERIFIES';
}

// Data flow edges

/**
 * MUTATES edge: data flow relationships (read/write).
 * @reference edges/MUTATES.md
 * @reference edges/README.md (operations: READ, WRITE)
 */
export interface MutatesEdge extends GraphEdge {
  type: 'MUTATES';
  operation: 'READ' | 'WRITE';
}

// Dependency edges

/**
 * DEPENDS_ON edge: dependency relationships.
 * @reference edges/DEPENDS_ON.md
 * @reference edges/README.md (kinds: LIBRARY, SERVICE, CONFIG, STYLE_GUIDE)
 */
export interface DependsOnEdge extends GraphEdge {
  type: 'DEPENDS_ON';
  kind: 'LIBRARY' | 'SERVICE' | 'CONFIG' | 'STYLE_GUIDE';
}

// Documentation edges

/**
 * DOCUMENTS edge: documentation and governance relationships.
 * @reference edges/DOCUMENTS.md
 * @reference edges/README.md (types: FEATURE, ENDPOINT, SYMBOL, MODULE, PATTERN)
 */
export interface DocumentsEdge extends GraphEdge {
  type: 'DOCUMENTS';
  docType: 'FEATURE' | 'ENDPOINT' | 'SYMBOL' | 'MODULE' | 'PATTERN';
}

// Evolution edges

/**
 * TRACKS edge: change history (introduction and modification tracking).
 * @reference edges/TRACKS.md
 * @reference edges/README.md (events: INTRODUCED, MODIFIED)
 */
export interface TracksEdge extends GraphEdge {
  type: 'TRACKS';
  event: 'INTRODUCED' | 'MODIFIED';
}

// Impact edges

/**
 * IMPACTS edge: incident relationships.
 * @reference edges/IMPACTS.md
 * @reference edges/README.md (types: CAUSED_BY, AFFECTS)
 */
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

/**
 * Call graph slice: symbol and its callers/callees.
 * @reference graph_schema_spec.md §6.1 (call graph patterns)
 */
export interface CallGraphSlice {
  symbol: Symbol;
  callersCount: number;
  callers: Symbol[];
  calleesCount: number;
  callees: Symbol[];
}

/**
 * Feature context bundle: complete context for understanding a feature.
 * @reference graph_schema_spec.md §6.3 (feature slice patterns)
 * @reference indexer/query (getFeatureContext)
 */
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

/**
 * Boundary pattern example: how an endpoint is implemented.
 * @reference graph_schema_spec.md §6.2 (boundary pattern queries)
 * @reference indexer/query (getBoundaryPatternExamples)
 */
export interface BoundaryPatternExample {
  boundary: Boundary;
  handlerSymbol: Symbol;
  calledServices: Symbol[];
  testCases: TestCase[];
  documentation: SpecDoc[];
}

/**
 * Incident slice bundle: complete context for debugging an incident.
 * @reference graph_schema_spec.md §6.4 (incident slice patterns)
 * @reference indexer/query (getIncidentSlice)
 */
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

/**
 * Codebase configuration: tracked branches, languages, etc.
 * @reference configuration_spec.md §1 (codebase config)
 * @reference ingest_spec.md §6.1 (branch resolution)
 */
export interface CodebaseConfig {
  id: string;
  root: string;
  trackedBranches: string[];
  languages?: SupportedLanguage[];
  defaultBranch?: string;
}

/**
 * Graph database configuration (Neo4j).
 * @reference configuration_spec.md §1 (graph config)
 * @reference configuration_and_server_setup.md §2 (env var precedence)
 */
export interface GraphConfig {
  /**
   * Neo4j database URI (e.g., "neo4j://localhost:7687")
   */
  neo4jUri: string;

  /**
   * Neo4j username
   */
  neo4jUser: string;

  /**
   * Neo4j password. Loaded from NEO4J_PASSWORD env var; redacted in logs.
   */
  neo4jPassword: string;
}

/**
 * Vector store configuration (Qdrant).
 * @reference vector_store_spec.md (qdrant config)
 */
export interface VectorConfig {
  /**
   * Qdrant vector store URL (e.g., "http://localhost:6333")
   */
  qdrantUrl: string;

  /**
   * Qdrant collection name for symbols/boundaries/docs
   */
  collectionName?: string;
}

/**
 * Security configuration: deny/allow patterns for LLM input.
 * @reference configuration_spec.md §4 (security guards)
 * @reference ingest_spec.md §6.5 (LLM safety)
 */
export interface SecurityConfig {
  denyPatterns?: string[];
  allowPatterns?: string[] | null;
}

/**
 * Embedding provider configuration.
 * @reference configuration_spec.md §2 (embedding defaults)
 * @reference vector_store_spec.md (embedding schema)
 */
export interface EmbeddingConfig {
  model?: string; // 'openai', 'local', etc.
  modelName?: string;
  dimensions?: number;
  batchSize?: number;
}

/**
 * LLM provider configuration.
 * @reference llm_prompts_spec.md (LLM usage)
 * @reference ingest_spec.md §2.3 (LLM-assisted extraction)
 */
export interface LLMConfig {
  provider?: string; // 'openai', 'anthropic', etc.
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Worker/job queue configuration.
 * @reference configuration_spec.md §2 (worker config)
 * @reference configuration_and_server_setup.md §7 (job scheduling)
 */
export interface WorkerConfig {
  type?: 'local' | 'bullmq';
  concurrency?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

/**
 * Complete indexer configuration.
 * @reference configuration_spec.md (all sections)
 * @reference configuration_and_server_setup.md (server config hierarchy)
 */
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

/**
 * Snapshot reference: identifies a commit to index.
 * @reference ingest_spec.md §6.1 (snapshot resolution)
 * @reference symbol_id_stability_spec.md (snapshot ID usage)
 */
export interface SnapshotRef {
  codebaseId: string;
  commitHash: string;
  branch?: string;
  snapshotType?: 'branch' | 'tag' | 'dependency';
}

/**
 * Changed file set: result of Git diff computation.
 * @reference ingest_spec.md §6.2 (diff computation)
 * @reference ingest_spec.md §2.5 (rename handling: treated as delete+add)
 */
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
