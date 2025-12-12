/**
 * @file Texere Indexer – Core Infrastructure Layer
 * @description Low-level infrastructure: config loading, database clients, persistence APIs
 * @reference docs/specs/feature/indexer/configuration_spec.md §1–2
 * @reference docs/specs/feature/indexer/configuration_and_server_setup.md §2–3
 * @reference docs/specs/feature/indexer/graph_schema_spec.md §4–6
 * @reference docs/specs/feature/indexer/layout_spec.md §2.2
 */

import type {
  IndexerConfig,
  GraphNode,
  AnyGraphEdge,
  Codebase,
  Snapshot,
  Module,
  File,
  Symbol,
  Boundary,
  DataContract,
  TestCase,
  SpecDoc,
} from '@repo/indexer-types';

// Re-export Slice 1 config implementation
export {
  loadIndexerConfig,
  getDefaultConfig,
  findCodebaseConfig,
  mergeConfigs,
  validateDbConnections,
  sanitizeConfigForLogging,
} from './config.js';

// ============================================================================
// 1. Database Client Interfaces (graph_schema_spec.md §4–6)
// ============================================================================

/**
 * Neo4j transaction interface for atomic graph operations.
 * Slice 3 will implement with real Neo4j driver.
 * @reference layout_spec.md §2.2 – constraint enforcement
 */
export interface Neo4jTransaction {
  run(query: string, params?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Neo4j client interface for graph persistence.
 * Implements constraint enforcement per graph_schema_spec.md §4.1B.
 */
export interface Neo4jClient {
  /**
   * Create a new transaction. Caller must commit() or rollback().
   * Used to enforce IN_SNAPSHOT cardinality invariant atomically.
   */
  transaction(): Promise<Neo4jTransaction>;

  /**
   * Run a query outside of transaction (auto-commit).
   */
  query(query: string, params?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;

  /**
   * Bootstrap DDL: create constraints, indexes per graph_schema_spec.md §4.1–4.4
   */
  bootstrap(): Promise<void>;

  /**
   * Close connection pool
   */
  close(): Promise<void>;
}

/**
 * Qdrant vector store client interface.
 * Slice 5 will implement with real Qdrant SDK.
 * @reference vector_store_spec.md
 */
export interface QdrantClient {
  /**
   * Create or get collection with payload schema
   */
  ensureCollection(collectionName: string, vectorSize: number): Promise<void>;

  /**
   * Store embedding vector with associated metadata
   */
  upsertVector(args: {
    collectionName: string;
    id: string;
    vector: number[];
    payload: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Search for similar vectors by cosine/euclidean distance
   */
  search(args: {
    collectionName: string;
    vector: number[];
    limit: number;
    scoreThreshold?: number;
  }): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>>;

  /**
   * Delete vector by ID
   */
  delete(args: { collectionName: string; id: string }): Promise<void>;

  /**
   * Batch upsert for efficiency
   */
  upsertBatch(args: {
    collectionName: string;
    vectors: Array<{
      id: string;
      vector: number[];
      payload: Record<string, unknown>;
    }>;
  }): Promise<void>;
}

// ============================================================================
// 2. Embedding Provider Interface (vector_store_spec.md)
// ============================================================================

export interface EmbeddingProvider {
  /**
   * Generate embedding(s) for text.
   * Slice 5 will provide: real (OpenAI, etc.) + stub for testing.
   */
  embed(text: string | string[]): Promise<number[] | number[][]>;

  /**
   * Get embedding dimensionality
   */
  getDimensions(): number;
}

// ============================================================================
// 3. Database Persistence APIs (graph_schema_spec.md §6 query patterns)
// ============================================================================

/**
 * Persistence layer for graph writes. Slice 3 implements with Neo4j.
 * All functions enforce IN_SNAPSHOT cardinality invariant.
 * @reference graph_schema_spec.md §4.1B
 */
export interface GraphPersistence {
  /**
   * Upsert codebase root node
   */
  upsertCodebase(codebase: Codebase): Promise<Codebase>;

  /**
   * Upsert snapshot node with CONTAINS edge to codebase.
   * Must enforce: every snapshot has exactly 1 parent codebase.
   */
  upsertSnapshot(snapshot: Snapshot): Promise<Snapshot>;

  /**
   * Upsert module with CONTAINS edges to parent module/snapshot and IN_SNAPSHOT edge.
   * Must enforce: every module has exactly 1 parent (module or snapshot).
   */
  upsertModule(module: Module): Promise<Module>;

  /**
   * Upsert file with CONTAINS edge to module and IN_SNAPSHOT edge.
   * Must enforce: every file has exactly 1 parent module.
   */
  upsertFile(file: File): Promise<File>;

  /**
   * Upsert symbol with CONTAINS edge to file and IN_SNAPSHOT edge.
   * Must enforce: IN_SNAPSHOT cardinality invariant.
   */
  upsertSymbol(symbol: Symbol): Promise<Symbol>;

  /**
   * Upsert boundary with IN_SNAPSHOT and LOCATION edges.
   */
  upsertBoundary(boundary: Boundary): Promise<Boundary>;

  /**
   * Upsert data contract (schema entity) with IN_SNAPSHOT edge.
   */
  upsertDataContract(contract: DataContract): Promise<DataContract>;

  /**
   * Upsert test case with IN_SNAPSHOT and LOCATION edges.
   */
  upsertTestCase(testCase: TestCase): Promise<TestCase>;

  /**
   * Upsert spec doc with IN_SNAPSHOT edge.
   */
  upsertSpecDoc(doc: SpecDoc): Promise<SpecDoc>;

  /**
   * Create edge between two nodes. Edge type determines validation.
   */
  createEdge(edge: AnyGraphEdge): Promise<void>;

  /**
   * Batch upsert for efficiency (many nodes + edges)
   */
  upsertBatch(args: { nodes: GraphNode[]; edges: AnyGraphEdge[] }): Promise<void>;
}

// ============================================================================
// 4. Database Query APIs (graph_schema_spec.md §6 read patterns)
// ============================================================================

/**
 * Query layer for reading graph. Slice 6 implements.
 */
export interface GraphQueries {
  /**
   * Get all symbols reachable from a given symbol via call graph.
   * @reference graph_schema_spec.md §6.1 call graph patterns
   */
  getCallGraphSlice(
    symbolId: string,
    depth?: number,
  ): Promise<{
    symbol: Symbol;
    callersCount: number;
    callers: Symbol[];
    calleesCount: number;
    callees: Symbol[];
  }>;

  /**
   * Get symbols that reference (TYPE_REF, IMPORT) a given symbol.
   */
  getReferencers(symbolId: string): Promise<Symbol[]>;

  /**
   * Get symbols referenced by a given symbol.
   */
  getReferences(symbolId: string): Promise<Symbol[]>;

  /**
   * Get test cases that test a given symbol.
   */
  getTestsForSymbol(symbolId: string): Promise<TestCase[]>;

  /**
   * Get boundaries that call a given symbol.
   */
  getBoundariesForSymbol(symbolId: string): Promise<Boundary[]>;

  /**
   * Get all nodes in snapshot by label and optional filter.
   */
  getNodesBySnapshot<T extends GraphNode>(args: {
    snapshotId: string;
    label: string;
    limit?: number;
    offset?: number;
  }): Promise<T[]>;

  /**
   * Get documentation for a given symbol.
   */
  getDocumentationForSymbol(symbolId: string): Promise<SpecDoc[]>;
}

// ============================================================================
// 5. Configuration Loading (configuration_spec.md §1–2)
// ============================================================================

/**
 * Load and parse indexer configuration.
 * Implements precedence: Server → Repo → Runtime
 * @reference configuration_and_server_setup.md §8 (precedence)
 * @reference configuration_spec.md §1 (file format)
 *
 * @param _path - Optional path to .indexer-config.json (default: INDEXER_CONFIG_PATH env var)
 * @returns Parsed and validated IndexerConfig[]
 */
export async function loadConfig(_path?: string): Promise<IndexerConfig[]> {
  // Slice 1 will implement:
  // 1. Check INDEXER_CONFIG_PATH env var
  // 2. Fall back to _path argument
  // 3. Try per-repo .indexer-config.json discovery
  // 4. Parse and validate against schema
  // 5. Expand env var references in values
  // 6. Return array of IndexerConfig objects
  return await Promise.resolve([]);
}

/**
 * Reload configuration at runtime (for dynamic per-repo discovery).
 * Called by indexer-worker or admin API.
 */
export async function reloadConfig(): Promise<IndexerConfig[]> {
  // Slice 1 will implement
  return await Promise.resolve([]);
}

// ============================================================================
// 6. Core Exports for Slice 0 Guards
// ============================================================================

/**
 * Container for database clients. Initialized once per process.
 * Slice 3 provides real implementation.
 */
export class IndexerDatabase {
  /**
   * Neo4j client (initialized on first use)
   */
  neo4j: Neo4jClient | null = null;

  /**
   * Qdrant vector store client (initialized on first use)
   */
  qdrant: QdrantClient | null = null;

  /**
   * Persistence layer using neo4j client
   */
  persistence: GraphPersistence | null = null;

  /**
   * Query layer using neo4j and qdrant
   */
  queries: GraphQueries | null = null;

  /**
   * Initialize database clients from config.
   * Slice 3 implements real initialization.
   */
  async initialize(_config: IndexerConfig): Promise<void> {
    // Slice 3 will implement:
    // 1. Create Neo4j driver with connection pooling
    // 2. Create Qdrant client
    // 3. Bootstrap DDL (constraints, indexes)
    // 4. Initialize persistence and query layers
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    // Slice 3 will implement cleanup
  }
}

// Singleton instance
let dbInstance: IndexerDatabase | null = null;

export function getDatabase(): IndexerDatabase {
  if (!dbInstance) {
    dbInstance = new IndexerDatabase();
  }
  return dbInstance;
}

export async function initializeDatabase(config: IndexerConfig): Promise<IndexerDatabase> {
  const db = getDatabase();
  await db.initialize(config);
  return db;
}

// ============================================================================
// 7. Runtime marker for test coverage
// ============================================================================

export const coreVersion = '0.0.0';
