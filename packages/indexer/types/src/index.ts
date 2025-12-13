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
 * @reference docs/specs/feature/indexer/nodes/Codebase.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per workspace)
 */
export interface Codebase extends GraphNode {
  label: 'Codebase';
  name: string;
  url?: string;
  kind?: 'main' | 'vendored' | 'monorepo-sub' | 'external';
}

/**
 * Snapshot node: represents a specific commit being indexed.
 * @reference docs/specs/feature/indexer/nodes/Snapshot.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per codebase)
 */
export interface Snapshot extends GraphNode {
  label: 'Snapshot';
  codebaseId: string;
  commitHash: string;
  author?: string;
  message?: string;
  timestamp: number;
  branch?: string;
  snapshotType: 'branch' | 'commit' | 'tag';
  indexStatus: 'success' | 'failed' | 'partial';
  indexedAt: number;
}

/**
 * Module node: logical package, library, or app (e.g., Nx lib, Maven project).
 * @reference docs/specs/feature/indexer/nodes/Module.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per snapshot)
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
 * @reference docs/specs/feature/indexer/nodes/File.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per module)
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
 * Symbol node: function, class, type, interface, const, etc. Most densely connected node.
 * @reference docs/specs/feature/indexer/nodes/Symbol.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per file)
 * @reference docs/specs/feature/indexer/symbol_id_stability_spec.md (ID format: snapshotId:filePath:name:line:col)
 */
export interface Symbol extends GraphNode {
  label: 'Symbol';
  snapshotId: string;
  name: string;
  filePath: string;
  kind: 'function' | 'class' | 'method' | 'const' | 'type' | 'interface' | 'other';
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  range: Range;
  isExported?: boolean;
  docstring?: string;
  embeddingId?: string;
  isDeleted: boolean;
}

/**
 * Boundary node: any callable/invokable interface (HTTP, gRPC, CLI, event, export, webhook, job, handler, etc.).
 * @reference docs/specs/feature/indexer/nodes/Boundary.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per snapshot)
 * @reference docs/specs/feature/indexer/language_indexers_spec.md (extraction heuristics)
 */
export interface Boundary extends GraphNode {
  label: 'Boundary';
  snapshotId: string;
  kind:
    | 'http'
    | 'grpc'
    | 'graphql'
    | 'cli'
    | 'export'
    | 'event'
    | 'webhook'
    | 'job'
    | 'handler'
    | 'other';
  identifier: string;
  handlerSymbolId: string;
  description?: string;
}

/**
 * DataContract node: data model (Prisma, SQL, GraphQL, Protobuf, Zod, ORM entities, etc.).
 * @reference docs/specs/feature/indexer/nodes/DataContract.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per snapshot)
 */
export interface DataContract extends GraphNode {
  label: 'DataContract';
  snapshotId: string;
  name: string;
  kind: 'prisma-model' | 'sql-table' | 'orm-entity';
  description?: string;
}

/**
 * TestCase node: unit, integration, or e2e test.
 * @reference docs/specs/feature/indexer/nodes/TestCase.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per file)
 */
export interface TestCase extends GraphNode {
  label: 'TestCase';
  snapshotId: string;
  name: string;
  filePath: string;
  kind: 'unit' | 'integration' | 'e2e';
  startLine: number;
  range: Range;
}

/**
 * SpecDoc node: specification, ADR, design doc, guide, or ticket documentation.
 * @reference docs/specs/feature/indexer/nodes/SpecDoc.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: N per snapshot)
 * @reference docs/specs/feature/indexer/documentation_indexing_spec.md (doc sources)
 */
export interface SpecDoc extends GraphNode {
  label: 'SpecDoc';
  snapshotId: string;
  path: string;
  name: string;
  kind: 'spec' | 'adr' | 'design-doc' | 'guide' | 'ticket';
  source: 'colocated' | 'separate' | 'hosted' | 'generated';
  content?: string;
  embeddingId?: string;
  generatedAt?: number;
  generatedBy?: string;
  generatedFor?: string;
}

// Cross-Snapshot Nodes

/**
 * Feature node: user-facing feature (persistent across snapshots, cross-snapshot).
 * @reference docs/specs/feature/indexer/nodes/Feature.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: 1 per feature ID)
 */
export interface Feature extends GraphNode {
  label: 'Feature';
  featureId: string;
  name: string;
  description?: string;
  embeddingId?: string;
  isDeleted: boolean;
}

/**
 * Pattern node: code pattern (e.g., "express-middleware") (cross-snapshot).
 * @reference docs/specs/feature/indexer/nodes/Pattern.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: 1 per pattern name)
 */
export interface Pattern extends GraphNode {
  label: 'Pattern';
  name: string;
  description?: string;
  source: 'manual' | 'heuristic';
}

/**
 * Incident node: bug, issue, or production incident (cross-snapshot).
 * @reference docs/specs/feature/indexer/nodes/Incident.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: 1 per incident ID)
 */
export interface Incident extends GraphNode {
  label: 'Incident';
  incidentId: string;
  title: string;
  description?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'resolved' | 'archived';
  resolvedAt?: number;
}

/**
 * ExternalService node: third-party API (Stripe, Auth0, etc.) (cross-snapshot).
 * @reference docs/specs/feature/indexer/nodes/ExternalService.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: 1 per service name)
 */
export interface ExternalService extends GraphNode {
  label: 'ExternalService';
  name: string;
  description?: string;
  url?: string;
  category?: 'payment' | 'auth' | 'messaging' | 'analytics' | 'ai' | 'other';
  isDeleted: boolean;
}

/**
 * StyleGuide node: coding convention, architecture guide, or style guide (cross-snapshot).
 * @reference docs/specs/feature/indexer/nodes/StyleGuide.md
 * @reference docs/specs/feature/indexer/nodes/README.md (cardinality: 1 per guide path)
 */
export interface StyleGuide extends GraphNode {
  label: 'StyleGuide';
  name: string;
  description?: string;
  path?: string;
  kind?: 'lint-config' | 'architecture' | 'documentation' | 'convention' | 'principle';
  content?: string;
  isDeleted: boolean;
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
 * @reference configuration_and_server_setup.md §2 (git clone)
 */
export interface CodebaseConfig {
  id: string;
  root: string;
  gitUrl?: string; // Optional: git clone URL if root doesn't exist
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
  cloneBasePath?: string; // Base directory for git clones if codebase root missing
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
  snapshotId?: string; // composite ID: ${codebaseId}:${commitHash}
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

/**
 * Runtime dependencies for indexing operations.
 * Passed to runSnapshot/runTrackedBranches for dependency injection.
 * @reference configuration_and_server_setup.md §2 (runtime dependencies)
 */
export interface RunDeps {
  git: GitClient;
  graph?: Neo4jClient;
  vectors?: QdrantClient;
  embeddings?: EmbeddingProvider;
  logger: Logger;
  clock: Clock;
  lockProvider?: LockProvider;
}

/**
 * Git operations client interface.
 * Slice 1 implements with simple-git or NodeGit.
 */
export interface GitClient {
  /**
   * Resolve branch name to commit hash.
   * @reference ingest_spec.md §6.1
   */
  resolveCommitHash(args: { repoPath: string; ref: string }): Promise<string>;

  /**
   * Get commit metadata (author, message, timestamp).
   */
  getCommitMetadata(args: {
    repoPath: string;
    commitHash: string;
  }): Promise<{ author?: string; message?: string; timestamp: number }>;

  /**
   * Clone repository if missing.
   * @reference configuration_and_server_setup.md §2 (git clone)
   */
  clone(args: { gitUrl: string; targetPath: string; depth?: number }): Promise<void>;

  /**
   * Fetch latest commits from remote.
   * @reference plan.md Slice 1 (--fetch flag)
   */
  fetch(args: { repoPath: string; ref?: string }): Promise<void>;

  /**
   * Compute changed files between two commits.
   * Treats renames as delete+add per ingest_spec.md §2.5.
   * @reference ingest_spec.md §6.2
   */
  computeChangedFiles(args: {
    repoPath: string;
    commitHash: string;
    baseCommit?: string;
  }): Promise<ChangedFileSet>;
}

/**
 * Logging interface.
 */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error | Record<string, unknown>): void;
}

/**
 * Clock interface for testable timestamps.
 */
export interface Clock {
  now(): Date;
}

/**
 * Optional lock provider for concurrent indexing.
 * Post-v1 feature for queue orchestration.
 */
export interface LockProvider {
  acquire(key: string, ttlMs: number): Promise<string>;
  release(key: string, token: string): Promise<boolean>;
}

/**
 * Dry-run plan output (JSON-serializable).
 * Used in CLI --dry-run mode.
 * @reference plan.md Slice 1 (dry-run mode)
 */
export interface DryRunPlan {
  config: {
    codebaseId: string;
    neo4jUri?: string;
    qdrantUrl?: string;
    languages?: string[];
  };
  snapshots: Array<{
    snapshotId: string;
    commitHash: string;
    branch?: string;
    changedFiles: ChangedFileSet;
    plannedOperations: string[];
  }>;
}

/**
 * Neo4j client type reference for circular dependency avoidance.
 */
export type Neo4jClient = unknown;

/**
 * Qdrant client type reference for circular dependency avoidance.
 */
export type QdrantClient = unknown;

/**
 * Embedding provider type reference for circular dependency avoidance.
 */
export type EmbeddingProvider = unknown;

// ============================================================================
// 8. Runtime markers for test coverage
// ============================================================================

export const typesVersion = '0.0.0';
