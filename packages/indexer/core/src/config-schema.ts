/**
 * @file Configuration Schema Definitions (Zod)
 * @description Authoritative Zod schemas for config validation, used for runtime validation and JSON Schema generation
 * @reference configuration_spec.md §1–5 (config file format, fields, required/optional, defaults)
 * @reference configuration_and_server_setup.md §3–9 (precedence hierarchy)
 * @reference testing_specification.md §3.6–3.7 (dependency injection for testability)
 */

import { z } from 'zod';

/**
 * Security configuration: deny/allow patterns for LLM input.
 * @reference configuration_spec.md §4 (security & privacy lists)
 * @reference ingest_spec.md §6.5 (LLM safety guardrails)
 */
export const securityConfigSchema = z
  .object({
    /**
     * Glob patterns to exclude from indexing and LLM processing.
     * Examples: ".env", "*.key", "*.pem", "secrets/**"
     * @reference configuration_spec.md Table (default patterns)
     */
    denyPatterns: z
      .array(z.string())
      .optional()
      .describe(
        'Glob patterns to exclude from indexing and LLM processing. Default: [".env", "*.key"]',
      ),

    /**
     * If set, ONLY files matching these patterns are indexed.
     * When both denyPatterns and allowPatterns are set, intersection applies.
     * @reference configuration_spec.md §4
     */
    allowPatterns: z
      .array(z.string())
      .nullable()
      .optional()
      .describe(
        'If set, only files matching these patterns are indexed. Default: null (allow all)',
      ),
  })
  .describe('Security & privacy configuration for indexing and LLM input');

/**
 * Embedding provider configuration.
 * @reference configuration_spec.md §5 (embedding configuration)
 * @reference vector_store_spec.md (embedding schema)
 */
export const embeddingConfigSchema = z
  .object({
    /**
     * Embedding provider identifier.
     * @reference configuration_spec.md (model field)
     */
    model: z
      .enum(['openai', 'local'])
      .optional()
      .describe('Embedding provider ("openai", "local", etc.). Default: "openai"'),

    /**
     * Provider-specific model identifier.
     * @reference configuration_spec.md (modelName field)
     */
    modelName: z
      .string()
      .optional()
      .describe('Model identifier for provider. Default: "text-embedding-3-small"'),

    /**
     * Embedding vector dimensionality (must match Qdrant collection).
     * @reference configuration_spec.md (dimensions field)
     */
    dimensions: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Embedding vector dimensionality. Default: 1536'),

    /**
     * Batch size for embedding requests.
     * @reference configuration_spec.md (batchSize field)
     */
    batchSize: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Batch size for embedding requests. Default: 128'),
  })
  .describe('Embedding provider configuration');

/**
 * LLM provider configuration (used for feature mapping, test associations).
 * @reference configuration_spec.md §5 (LLM configuration)
 * @reference ingest_spec.md §2.3 (LLM-assisted extraction)
 * @reference llm_prompts_spec.md (LLM usage)
 */
export const llmConfigSchema = z
  .object({
    /**
     * LLM provider identifier.
     * @reference configuration_spec.md (provider field)
     */
    provider: z
      .enum(['openai', 'anthropic'])
      .optional()
      .describe('LLM provider ("openai", "anthropic", etc.). Default: "openai"'),

    /**
     * Provider-specific model identifier.
     * @reference configuration_spec.md (model field)
     */
    model: z.string().optional().describe('Model identifier for LLM. Default: "gpt-4o-mini"'),

    /**
     * Temperature for generation (0.0–1.0).
     * Lower values = more deterministic.
     * @reference configuration_spec.md (temperature field)
     * @reference ingest_spec.md §8 (best-effort semantics)
     */
    temperature: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Generation temperature (0.0–1.0). Default: 0.3'),

    /**
     * Maximum output tokens.
     * @reference configuration_spec.md (maxTokens field)
     */
    maxTokens: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Max output tokens for LLM responses. Default: 1024'),
  })
  .describe('LLM provider configuration for feature mapping and LLM-assisted extraction');

/**
 * Worker/job queue configuration.
 * @reference configuration_spec.md §1 (worker config)
 * @reference configuration_and_server_setup.md §7 (job scheduling & v2 feature)
 */
export const workerConfigSchema = z
  .object({
    /**
     * Executor type: "local" for single-process, "bullmq" for queue-based.
     * @reference configuration_spec.md (type field)
     */
    type: z
      .enum(['local', 'bullmq'])
      .optional()
      .describe('Executor type ("local" or "bullmq"). Default: "local"'),

    /**
     * Maximum concurrent index operations.
     * @reference configuration_spec.md (concurrency field)
     */
    concurrency: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Max concurrent index operations. Default: 4'),

    /**
     * Number of retries on failure.
     * @reference configuration_spec.md (retryAttempts field)
     */
    retryAttempts: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe('Number of retries on failure. Default: 3'),

    /**
     * Delay between retries (milliseconds).
     * @reference configuration_spec.md (retryDelayMs field)
     */
    retryDelayMs: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Delay between retries (milliseconds). Default: 5000'),
  })
  .describe('Worker/executor configuration');

/**
 * Graph database (Neo4j) configuration.
 * @reference configuration_spec.md §1 (graph config)
 * @reference configuration_and_server_setup.md §2 (env var precedence)
 */
export const graphConfigSchema = z
  .object({
    /**
     * Neo4j connection URI.
     * Supports ${VAR} environment variable substitution.
     * Examples: "bolt://localhost:7687", "neo4j://cloud.neo4j.io:7687"
     * @reference configuration_spec.md (neo4jUri field)
     * @reference configuration_spec.md §2 (env var substitution)
     */
    neo4jUri: z.string().describe('Neo4j connection URI (env var substitution supported)'),

    /**
     * Neo4j username.
     * Supports ${VAR} environment variable substitution.
     * @reference configuration_spec.md (neo4jUser field)
     */
    neo4jUser: z.string().describe('Neo4j username (env var substitution supported)'),

    /**
     * Neo4j password.
     * Supports ${VAR} environment variable substitution.
     * @reference configuration_spec.md (neo4jPassword field)
     * @reference configuration_spec.md §2 (env var substitution, redaction)
     */
    neo4jPassword: z.string().describe('Neo4j password (env var substitution supported)'),
  })
  .describe('Graph database (Neo4j) configuration');

/**
 * Vector store (Qdrant) configuration.
 * @reference vector_store_spec.md (qdrant config)
 * @reference configuration_spec.md §1 (vectors section)
 */
export const vectorsConfigSchema = z
  .object({
    /**
     * Qdrant instance URL.
     * Supports ${VAR} environment variable substitution.
     * Examples: "http://localhost:6333", "http://cloud.qdrant.io:6333"
     * @reference configuration_spec.md (qdrantUrl field)
     * @reference configuration_spec.md §2 (env var substitution)
     */
    qdrantUrl: z.string().describe('Qdrant instance URL (env var substitution supported)'),

    /**
     * Qdrant collection name for embeddings.
     * @reference configuration_spec.md (collectionName field, default)
     */
    collectionName: z
      .string()
      .optional()
      .describe('Qdrant collection name for embeddings. Default: "texere-embeddings"'),
  })
  .describe('Vector store (Qdrant) configuration');

/**
 * Per-codebase configuration: repository metadata and tracked branches.
 * @reference configuration_spec.md §1 (codebase schema)
 * @reference configuration_spec.md §3 (tracked branches)
 * @reference ingest_spec.md §6.1 (branch resolution & snapshot selection)
 */
export const codebaseConfigSchema = z
  .object({
    /**
     * Unique identifier for this codebase.
     * Used in snapshot IDs and node identification.
     * Example: "my-app", "texere-indexer-test-repo"
     * @reference configuration_spec.md (id field, required)
     * @reference symbol_id_stability_spec.md (snapshot ID format)
     */
    id: z.string().min(1).describe('Unique identifier for codebase (e.g., "my-repo")'),

    /**
     * Absolute path to repository root.
     * Used for git operations and file discovery.
     * @reference configuration_spec.md (root field, required)
     * @reference configuration_and_server_setup.md §2 (git clone destination)
     */
    root: z.string().describe('Absolute path to repo root'),

    /**
     * Optional git clone URL if repo path doesn't exist.
     * Used to automatically clone the repository.
     * @reference configuration_and_server_setup.md §2 (git clone)
     */
    gitUrl: z.string().url().optional().describe('Optional git clone URL if root path missing'),

    /**
     * Array of branch names to index.
     * The indexer processes the latest commit of each branch.
     * Supports branch renames via git tracking.
     * @reference configuration_spec.md §3 (tracked branches)
     * @reference ingest_spec.md §6.1 (snapshot selection)
     */
    trackedBranches: z
      .array(z.string().min(1))
      .min(1)
      .describe('Array of branch names to index (e.g., ["main", "develop"])'),
  })
  .describe('Per-codebase configuration (tracked branches, repository metadata)');

/**
 * Complete Texere Indexer configuration.
 * Combines all subsections: codebases, graph, vectors, security, embedding, LLM, worker.
 * @reference configuration_spec.md (all sections §1–5)
 * @reference configuration_and_server_setup.md §2–9 (server config, precedence hierarchy)
 */
export const indexerConfigSchema = z
  .object({
    /**
     * Configuration schema version.
     * Used for versioning and migration.
     * Current version: "1.0"
     * @reference configuration_spec.md §1 (version field, required)
     */
    version: z.literal('1.0').describe('Schema version (current: "1.0")'),

    /**
     * Array of codebase configurations.
     * Each codebase has its own tracked branches and repository path.
     * @reference configuration_spec.md §1 (codebases section, required)
     */
    codebases: z
      .array(codebaseConfigSchema)
      .min(1)
      .describe('Array of codebase configurations (required)'),

    /**
     * Neo4j graph database connection.
     * @reference configuration_spec.md §1 (graph section, required)
     */
    graph: graphConfigSchema.describe('Neo4j graph database configuration (required)'),

    /**
     * Qdrant vector store connection.
     * @reference configuration_spec.md §1 (vectors section, required)
     */
    vectors: vectorsConfigSchema.describe('Qdrant vector store configuration (required)'),

    /**
     * Base directory for git clones if codebase root missing.
     * Used when codebase.root doesn't exist but gitUrl is provided.
     * @reference configuration_and_server_setup.md §2 (git clone behavior)
     */
    cloneBasePath: z
      .string()
      .optional()
      .describe('Base directory for git clones if codebase root missing'),

    /**
     * Base directory to auto-discover per-repo configs.
     * Stub for v1; full discovery in v2+.
     * @reference configuration_and_server_setup.md §3 (per-repo discovery)
     */
    reposDirectory: z
      .string()
      .optional()
      .describe('Base directory to auto-discover per-repo configs (v1 stub)'),

    /**
     * Glob patterns for per-repo config discovery.
     * Stub for v1; full discovery in v2+.
     * @reference configuration_and_server_setup.md §3 (per-repo discovery)
     */
    repoPatterns: z
      .array(z.string())
      .optional()
      .describe('Glob patterns for per-repo config discovery (v1 stub)'),

    /**
     * Security & privacy configuration.
     * Controls which files are indexed and sent to LLM components.
     * @reference configuration_spec.md §4 (security section, optional)
     * @reference ingest_spec.md §6.5 (LLM safety)
     */
    security: securityConfigSchema.optional().describe('Security & privacy configuration'),

    /**
     * Embedding provider configuration.
     * Controls vector generation for symbols, boundaries, test cases, docs.
     * @reference configuration_spec.md §5 (embedding section, optional)
     * @reference vector_store_spec.md (payload schema)
     */
    embedding: embeddingConfigSchema.optional().describe('Embedding provider configuration'),

    /**
     * LLM provider configuration.
     * Used for feature mapping, test associations, best-effort analysis.
     * @reference configuration_spec.md §5 (LLM section, optional)
     * @reference ingest_spec.md §2.3 (LLM-assisted extraction)
     */
    llm: llmConfigSchema.optional().describe('LLM provider configuration'),

    /**
     * Worker/executor configuration.
     * Controls concurrency, retries, and job scheduling.
     * @reference configuration_spec.md §1 (worker section, optional)
     * @reference configuration_and_server_setup.md §7 (job scheduling)
     */
    worker: workerConfigSchema.optional().describe('Worker/executor configuration'),
  })
  .strict()
  .describe('Texere Indexer configuration. See configuration_spec.md §1–5 for complete reference.');

/**
 * Inferred TypeScript type from Zod schema.
 * Used for runtime validation and type checking.
 */
export type IndexerConfigType = z.infer<typeof indexerConfigSchema>;

/**
 * Inferred type for security config.
 */
export type SecurityConfigType = z.infer<typeof securityConfigSchema>;

/**
 * Inferred type for embedding config.
 */
export type EmbeddingConfigType = z.infer<typeof embeddingConfigSchema>;

/**
 * Inferred type for LLM config.
 */
export type LLMConfigType = z.infer<typeof llmConfigSchema>;

/**
 * Inferred type for worker config.
 */
export type WorkerConfigType = z.infer<typeof workerConfigSchema>;

/**
 * Inferred type for graph config.
 */
export type GraphConfigType = z.infer<typeof graphConfigSchema>;

/**
 * Inferred type for vectors config.
 */
export type VectorsConfigType = z.infer<typeof vectorsConfigSchema>;

/**
 * Inferred type for codebase config.
 */
export type CodebaseConfigType = z.infer<typeof codebaseConfigSchema>;
