/**
 * @file Configuration Loading & Precedence Handling
 * @reference configuration_spec.md §1–2 (config file format)
 * @reference configuration_and_server_setup.md §8 (precedence hierarchy)
 * @description
 * Implements three-layer config resolution:
 * 1. Runtime (CLI flags, env vars)
 * 2. Per-repo (.indexer-config.json in repo)
 * 3. App/global (INDEXER_CONFIG_PATH or default .indexer-config.json)
 * 4. Defaults (hardcoded)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { IndexerConfig, CodebaseConfig } from '@repo/indexer-types';

/**
 * Environment variable provider interface for testability.
 * @reference testing_specification.md §3.6–3.7 (dependency injection)
 */
export interface EnvironmentProvider {
  /**
   * Get an environment variable value.
   * @returns The value or undefined if not found
   */
  get(varName: string): string | undefined;
}

/**
 * Default environment provider using process.env.
 */
const defaultEnvProvider: EnvironmentProvider = {
  get: (varName: string): string | undefined => process.env[varName],
};

/**
 * Environment variable substitution patterns.
 * Supports ${VAR_NAME} syntax in config JSON.
 * @reference configuration_spec.md §2 (env var substitution)
 * @reference testing_specification.md §3.6–3.7 (injectable env provider)
 */
export function expandEnvVars(
  text: string,
  envProvider: EnvironmentProvider = defaultEnvProvider,
): string {
  return text.replace(/\$\{([^}]+)\}/g, (match: string, varName: string) => {
    const value = envProvider.get(varName);
    if (!value) {
      throw new Error(
        `Environment variable not found: ${varName} (referenced in config: ${match})`,
      );
    }
    return value;
  });
}

/**
 * Parse and validate JSON config file.
 * Performs env var substitution before parsing.
 * @reference configuration_spec.md §1 (file format)
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 */
export function parseConfigFile(
  filePath: string,
  envProvider: EnvironmentProvider = defaultEnvProvider,
): IndexerConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }

  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const expandedContents = expandEnvVars(fileContents, envProvider);

  try {
    const config = JSON.parse(expandedContents) as IndexerConfig;
    validateIndexerConfig(config);
    return config;
  } catch (error) {
    throw new Error(
      `Failed to parse configuration file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Validate IndexerConfig schema.
 * Throws if required fields are missing.
 * @reference configuration_spec.md §1 (required fields)
 */
function validateIndexerConfig(config: IndexerConfig): void {
  if (!config.version) {
    throw new Error('Missing required field: config.version');
  }

  if (!config.codebases || !Array.isArray(config.codebases)) {
    throw new Error('Missing required field: config.codebases (array)');
  }

  for (const codebase of config.codebases) {
    if (!codebase.id) {
      throw new Error('Missing required field in codebase: id');
    }
    if (!codebase.root) {
      throw new Error(`Codebase ${codebase.id}: missing required field: root`);
    }
    if (!codebase.trackedBranches || !Array.isArray(codebase.trackedBranches)) {
      throw new Error(`Codebase ${codebase.id}: missing required field: trackedBranches (array)`);
    }
  }

  if (!config.graph) {
    throw new Error('Missing required field: config.graph');
  }
  if (!config.graph.neo4jUri) {
    throw new Error('Missing required field: config.graph.neo4jUri');
  }

  if (!config.vectors) {
    throw new Error('Missing required field: config.vectors');
  }
  if (!config.vectors.qdrantUrl) {
    throw new Error('Missing required field: config.vectors.qdrantUrl');
  }
}

/**
 * File system interface for dependency injection in tests.
 * @reference testing_specification.md §3 (dependency injection for testability)
 */
export interface FileSystemProvider {
  exists(filePath: string): boolean;
  dirname(filePath: string): string;
}

/**
 * Default file system provider using Node.js fs module.
 */
const defaultFileSystem: FileSystemProvider = {
  exists: (filePath: string) => fs.existsSync(filePath),
  dirname: (filePath: string) => path.dirname(filePath),
};

/**
 * Resolve config file path with fallback precedence.
 * @reference configuration_and_server_setup.md §8 (precedence)
 * @reference testing_specification.md §3 (dependency injection for testability)
 *
 * Precedence:
 * 1. Explicit path argument
 * 2. INDEXER_CONFIG_PATH env var
 * 3. Walk up directory tree from cwd looking for .indexer-config.json
 * 4. .indexer-config.json in specified repo root (for per-repo discovery)
 *
 * @param explicitPath - Explicit config file path (highest priority)
 * @param repoRoot - Repository root for per-repo config discovery
 * @param currentDir - Current working directory (defaults to process.cwd(); can be overridden in tests)
 * @param fsProvider - File system provider (defaults to Node.js fs; can be mocked in tests)
 * @param envProvider - Environment provider (defaults to process.env; can be mocked in tests)
 */
function resolveConfigPath(
  explicitPath?: string,
  repoRoot?: string,
  currentDir?: string,
  fsProvider: FileSystemProvider = defaultFileSystem,
  envProvider: EnvironmentProvider = defaultEnvProvider,
): string | null {
  // 1. Explicit path takes highest priority
  if (explicitPath) {
    return explicitPath;
  }

  // 2. Check INDEXER_CONFIG_PATH env var
  const envConfigPath = envProvider.get('INDEXER_CONFIG_PATH');
  if (envConfigPath) {
    return envConfigPath;
  }

  // 3. Walk up directory tree from current directory
  // This handles the case where CLI is run from a subdirectory (e.g., apps/indexer-cli)
  let dir = currentDir || process.cwd();

  while (true) {
    const configPath = path.join(dir, '.indexer-config.json');
    if (fsProvider.exists(configPath)) {
      return configPath;
    }

    const parent = fsProvider.dirname(dir);
    if (parent === dir) {
      // Reached filesystem root
      break;
    }
    dir = parent;
  }

  // 4. Check repo root for per-repo config (fallback)
  if (repoRoot && fsProvider.exists(repoRoot)) {
    const repoConfigPath = path.join(repoRoot, '.indexer-config.json');
    if (fsProvider.exists(repoConfigPath)) {
      return repoConfigPath;
    }
  }

  // No config file found
  return null;
}

/**
 * Load indexer configuration from file.
 * Implements full precedence hierarchy with fallback to defaults.
 * @reference configuration_and_server_setup.md §8 (config loading)
 * @reference testing_specification.md §3.6–3.7 (injectable dependencies)
 *
 * @param options.path - Explicit config file path (highest priority)
 * @param options.repoRoot - Repository root for per-repo config discovery
 * @param options.allowMissing - If true, return defaults when no file found (default: false)
 * @param options.envProvider - Environment variable provider (for testing; default: process.env)
 * @param options.fsProvider - File system provider (for testing; default: Node.js fs)
 * @returns Parsed and validated IndexerConfig
 * @throws Error if config file not found or validation fails
 */
export function loadIndexerConfig(options?: {
  path?: string;
  repoRoot?: string;
  allowMissing?: boolean;
  discoverRepos?: boolean;
  envProvider?: EnvironmentProvider;
  fsProvider?: FileSystemProvider;
}): IndexerConfig {
  const configPath = resolveConfigPath(
    options?.path,
    options?.repoRoot,
    undefined,
    options?.fsProvider,
    options?.envProvider,
  );

  if (!configPath) {
    if (options?.allowMissing) {
      return getDefaultConfig(options?.envProvider);
    }
    throw new Error(
      'No configuration file found. ' +
        'Set INDEXER_CONFIG_PATH env var, ' +
        'pass --config <path>, ' +
        'or place .indexer-config.json in working directory or repo root.',
    );
  }

  const baseConfig = parseConfigFile(configPath, options?.envProvider);

  // Repo discovery (v1 stub — implemented in later slices)
  if (options?.discoverRepos) {
    // return mergeWithDiscoveredRepos(baseConfig);
  }

  return baseConfig;
}

/**
 * Get default configuration (hardcoded fallback).
 * Used when no config file is found and allowMissing=true.
 * @reference configuration_spec.md §1 (schema defaults)
 * @reference testing_specification.md §3.6–3.7 (injectable environment provider)
 *
 * @param envProvider - Environment variable provider (for testing; default: process.env)
 */
export function getDefaultConfig(
  envProvider: EnvironmentProvider = defaultEnvProvider,
): IndexerConfig {
  return {
    version: '1.0',
    codebases: [],
    graph: {
      neo4jUri: envProvider.get('NEO4J_URI') || 'bolt://localhost:7687',
      neo4jUser: envProvider.get('NEO4J_USER') || 'neo4j',
      neo4jPassword: envProvider.get('NEO4J_PASSWORD') || 'password',
    },
    vectors: {
      qdrantUrl: envProvider.get('QDRANT_URL') || 'http://localhost:6333',
      collectionName: 'texere-embeddings',
    },
    security: {
      denyPatterns: ['.env', '*.key', '*.pem', 'secrets/**'],
      allowPatterns: null,
    },
    embedding: {
      model: 'openai',
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
      batchSize: 128,
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 1024,
    },
    worker: {
      type: 'local',
      concurrency: 4,
      retryAttempts: 3,
      retryDelayMs: 5000,
    },
  };
}

/**
 * Find codebase config by ID.
 * @reference configuration_spec.md §1 (codebase selection)
 */
export function findCodebaseConfig(
  config: IndexerConfig,
  codebaseId: string,
): CodebaseConfig | null {
  return config.codebases.find((c) => c.id === codebaseId) || null;
}

/**
 * Merge two configs with precedence (higher overrides lower).
 * Used for runtime override of file config.
 * @reference configuration_and_server_setup.md §8 (precedence merging)
 */
export function mergeConfigs(base: IndexerConfig, override: Partial<IndexerConfig>): IndexerConfig {
  const mergedDenyPatterns =
    base.security?.denyPatterns || override.security?.denyPatterns
      ? Array.from(
          new Set([
            ...(base.security?.denyPatterns || []),
            ...(override.security?.denyPatterns || []),
          ]),
        )
      : undefined;

  return {
    ...base,
    ...override,
    // Deep merge for nested objects
    graph: { ...base.graph, ...override.graph },
    vectors: { ...base.vectors, ...override.vectors },
    security: {
      ...base.security,
      ...override.security,
      ...(mergedDenyPatterns ? { denyPatterns: mergedDenyPatterns } : {}),
    },
    embedding: { ...base.embedding, ...override.embedding },
    llm: { ...base.llm, ...override.llm },
    worker: { ...base.worker, ...override.worker },
    // Shallow merge for codebases array (don't deep merge, replace)
    codebases: override.codebases || base.codebases,
  };
}

/**
 * Validate that required Neo4j and Qdrant connections are available.
 * Called before indexing operations.
 * @reference configuration_spec.md §2 (required variables)
 */
export function validateDbConnections(config: IndexerConfig): string[] {
  const errors: string[] = [];

  if (!config.graph.neo4jUri) {
    errors.push('NEO4J_URI not configured (set env var or config.graph.neo4jUri)');
  }

  if (!config.vectors.qdrantUrl) {
    errors.push('QDRANT_URL not configured (set env var or config.vectors.qdrantUrl)');
  }

  return errors;
}

/**
 * Sanitize config for logging (redact sensitive values).
 * Used when printing config to console/logs.
 * @reference configuration_spec.md §1 (password redaction)
 */
export function sanitizeConfigForLogging(config: IndexerConfig): Record<string, unknown> {
  return {
    version: config.version,
    codebaseCount: config.codebases.length,
    codebaseIds: config.codebases.map((c) => c.id),
    neo4jUri: config.graph.neo4jUri,
    neo4jUser: config.graph.neo4jUser,
    // neo4jPassword intentionally redacted
    qdrantUrl: config.vectors.qdrantUrl,
    collectionName: config.vectors.collectionName,
    embeddingModel: config.embedding?.modelName,
    llmProvider: config.llm?.provider,
    workerType: config.worker?.type,
  };
}

/**
 * Discover per-repo configs under a reposDirectory.
 * Each .indexer-config.json contributes its codebases, overriding existing by ID.
 * @reference configuration_and_server_setup.md §8 (per-repo discovery)
 * @deprecated Implemented in later slices; stub for v1.
 */
export function discoverRepoConfigPaths(_reposDirectory?: string): string[] {
  // Per-repo discovery v1 stub; to be implemented
  return [];
}

/**
 * Merge base config with any discovered per-repo configs.
 * @deprecated Implemented in later slices; stub for v1.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mergeWithDiscoveredRepos(baseConfig: IndexerConfig): IndexerConfig {
  // Per-repo discovery v1 stub; to be implemented
  return baseConfig;
}
