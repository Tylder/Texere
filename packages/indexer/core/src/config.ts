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

export type ValidationIssueSource = 'orchestrator' | 'per-repo' | 'discovery';
export type ValidationIssueCode =
  | 'CONFIG_NOT_FOUND'
  | 'ENV_VAR_MISSING'
  | 'MISSING_FIELD'
  | 'AMBIGUOUS_CONFIG'
  | 'JSON_PARSE_ERROR';

export interface ValidationIssue {
  source: ValidationIssueSource;
  configPath: string;
  code?: ValidationIssueCode;
  message: string;
  fieldPath?: string;
  codebaseId?: string;
}

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
  issues?: ValidationIssue[],
  configPath?: string,
  source: ValidationIssueSource = 'orchestrator',
  fieldPath?: string,
): string {
  return text.replace(/\$\{([^}]+)\}/g, (match: string, varName: string) => {
    const value = envProvider.get(varName);
    if (!value) {
      issues?.push({
        source,
        configPath: configPath || 'unknown',
        code: 'ENV_VAR_MISSING',
        ...(fieldPath ? { fieldPath } : {}),
        message: `Environment variable ${varName} is not set (referenced as ${match}).`,
      });
      return match; // leave placeholder intact for downstream parsing
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
export interface ParsedConfigFile {
  path: string;
  config?: IndexerConfig;
  errors: ValidationIssue[];
}

export function parseConfigFile(
  filePath: string,
  envProvider: EnvironmentProvider = defaultEnvProvider,
  source: ValidationIssueSource = 'orchestrator',
): ParsedConfigFile {
  const errors: ValidationIssue[] = [];

  if (!fs.existsSync(filePath)) {
    errors.push({
      source: 'discovery',
      configPath: filePath,
      code: 'CONFIG_NOT_FOUND',
      message: `Configuration file not found: ${filePath}`,
    });
    return { errors, path: filePath };
  }

  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const expandedContents = expandEnvVars(fileContents, envProvider, errors, filePath, source);

  let parsed: IndexerConfig | undefined;
  try {
    parsed = JSON.parse(expandedContents) as IndexerConfig;
  } catch (error) {
    errors.push({
      source: 'discovery',
      configPath: filePath,
      code: 'JSON_PARSE_ERROR',
      message: `Failed to parse configuration file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return { errors, path: filePath };
  }

  const validationIssues = validateIndexerConfig(parsed, filePath, source);
  errors.push(...validationIssues);

  return { config: parsed, errors, path: filePath };
}

function formatIssuesForMessage(issues: ValidationIssue[]): string {
  return issues
    .map((issue) => {
      const location = issue.fieldPath ? `${issue.fieldPath} – ` : '';
      return `${issue.configPath}: ${location}${issue.message}`;
    })
    .join('; ');
}

export function assertValidConfig(parsed: ParsedConfigFile): IndexerConfig {
  if (!parsed.config || parsed.errors.length > 0) {
    const detail =
      parsed.errors.length > 0 ? ` Issues: ${formatIssuesForMessage(parsed.errors)}` : '';
    throw new Error(`Invalid configuration at ${parsed.path}.${detail}`);
  }
  return parsed.config;
}

/**
 * Validate IndexerConfig schema.
 * Returns validation issues if required fields are missing.
 * @reference configuration_spec.md §1 (required fields)
 */
function validateIndexerConfig(
  config: IndexerConfig,
  configPath: string,
  source: ValidationIssueSource,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!config.version) {
    issues.push({
      source,
      configPath,
      code: 'MISSING_FIELD',
      fieldPath: 'version',
      message: 'Missing required field: config.version',
    });
  }

  if (!config.codebases || !Array.isArray(config.codebases)) {
    issues.push({
      source,
      configPath,
      code: 'MISSING_FIELD',
      fieldPath: 'codebases',
      message: 'Missing required field: config.codebases (array)',
    });
  } else {
    for (const codebase of config.codebases) {
      if (!codebase.id) {
        issues.push({
          source,
          configPath,
          code: 'MISSING_FIELD',
          fieldPath: 'codebases[].id',
          message: 'Missing required field in codebase: id',
        });
      }
      if (!codebase.root) {
        issues.push({
          source,
          configPath,
          code: 'MISSING_FIELD',
          fieldPath: `codebases[${codebase.id || '?'}].root`,
          message: `Codebase ${codebase.id || '<unknown>'}: missing required field: root`,
        });
      }
      if (!codebase.trackedBranches || !Array.isArray(codebase.trackedBranches)) {
        issues.push({
          source,
          configPath,
          code: 'MISSING_FIELD',
          fieldPath: `codebases[${codebase.id || '?'}].trackedBranches`,
          message: `Codebase ${codebase.id || '<unknown>'}: missing required field: trackedBranches (array)`,
        });
      }
    }
  }

  if (!config.graph) {
    issues.push({
      source,
      configPath,
      code: 'MISSING_FIELD',
      fieldPath: 'graph',
      message: 'Missing required field: config.graph',
    });
  } else if (!config.graph.neo4jUri) {
    issues.push({
      source,
      configPath,
      code: 'MISSING_FIELD',
      fieldPath: 'graph.neo4jUri',
      message: 'Missing required field: config.graph.neo4jUri',
    });
  }

  if (!config.vectors) {
    issues.push({
      source,
      configPath,
      code: 'MISSING_FIELD',
      fieldPath: 'vectors',
      message: 'Missing required field: config.vectors',
    });
  } else if (!config.vectors.qdrantUrl) {
    issues.push({
      source,
      configPath,
      code: 'MISSING_FIELD',
      fieldPath: 'vectors.qdrantUrl',
      message: 'Missing required field: config.vectors.qdrantUrl',
    });
  }

  return issues;
}

/**
 * File system interface for dependency injection in tests.
 * @reference testing_specification.md §3 (dependency injection for testability)
 */
export interface FileSystemProvider {
  exists(filePath: string): boolean;
  dirname(filePath: string): string;
  readdirSync(dirPath: string): string[];
}

/**
 * Discovered config result from recursive discovery.
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1 (discovery pattern)
 */
export interface DiscoveredConfigs {
  orchestrator: {
    path: string;
    config?: IndexerConfig;
  };
  perRepo: Array<{
    path: string;
    config?: IndexerConfig;
    codebaseId: string;
  }>;
  errors: ValidationIssue[];
}

/**
 * Default file system provider using Node.js fs module.
 */
const defaultFileSystem: FileSystemProvider = {
  exists: (filePath: string) => fs.existsSync(filePath),
  dirname: (filePath: string) => path.dirname(filePath),
  readdirSync: (dirPath: string) => fs.readdirSync(dirPath),
};

/**
 * Detect multiple .indexer-config.json files in a directory (shallow, not recursive).
 * Used to safeguard against ambiguous configurations.
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §2 (ambiguity safeguard)
 * @reference testing_specification.md §3.6 (injectable file system provider)
 *
 * @param dirPath - Directory to scan
 * @param fsProvider - File system provider (default: Node.js fs)
 * @returns Array of full paths to .indexer-config.json files found in directory
 */
export function detectAmbiguousConfigs(
  dirPath: string,
  fsProvider: FileSystemProvider = defaultFileSystem,
): string[] {
  if (!fsProvider.exists(dirPath)) {
    return [];
  }

  try {
    const entries = fsProvider.readdirSync(dirPath);
    const configFiles: string[] = [];

    for (const entry of entries) {
      if (entry === '.indexer-config.json') {
        const fullPath = path.join(dirPath, entry);
        if (fsProvider.exists(fullPath)) {
          configFiles.push(fullPath);
        }
      }
    }

    return configFiles;
  } catch {
    // Directory not readable or doesn't exist
    return [];
  }
}

/**
 * Find .indexer-config.json at codebase root (not recursively).
 * Returns path if exists, null if not.
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1 (per-repo config discovery)
 * @reference testing_specification.md §3.6 (injectable file system provider)
 *
 * @param codebaseRoot - Root path of codebase
 * @param fsProvider - File system provider (default: Node.js fs)
 * @returns Full path to config file or null if not found
 */
export function findConfigAtCodebaseRoot(
  codebaseRoot: string,
  fsProvider: FileSystemProvider = defaultFileSystem,
): string | null {
  const configPath = path.join(codebaseRoot, '.indexer-config.json');
  if (fsProvider.exists(configPath)) {
    return configPath;
  }
  return null;
}

/**
 * Discover and validate configuration files recursively across codebases.
 * Implements unified discovery pattern used by all CLI commands.
 * @reference RECURSIVE_CONFIG_DISCOVERY.md §1–2 (discovery pattern and safeguards)
 * @reference cli_spec.md §3–7 (command specifications)
 *
 * @param options.configPath - Explicit path to orchestrator config
 * @param options.recursive - Enable per-repo config discovery (default: true)
 * @param options.orchestratorConfig - Pre-loaded orchestrator config (optional)
 * @param options.envProvider - Environment provider (default: process.env)
 * @param options.fsProvider - File system provider (default: Node.js fs)
 * @returns Discovered configs with orchestrator and per-repo paths
 * @throws Error if multiple configs found in same codebase directory or config invalid
 */
export function discoverConfigs(options?: {
  configPath?: string;
  recursive?: boolean;
  orchestratorConfig?: IndexerConfig;
  envProvider?: EnvironmentProvider;
  fsProvider?: FileSystemProvider;
  allowMissingOrchestrator?: boolean;
}): DiscoveredConfigs {
  const recursive = options?.recursive !== false; // default: true
  const fsProvider = options?.fsProvider || defaultFileSystem;
  const envProvider = options?.envProvider || defaultEnvProvider;
  const errors: ValidationIssue[] = [];

  // 1. Load or use provided orchestrator config
  let orchestratorConfig: IndexerConfig | undefined;
  let orchestratorPath = options?.configPath || 'auto-discover';

  if (options?.orchestratorConfig) {
    orchestratorConfig = options.orchestratorConfig;
    orchestratorPath = options.configPath || 'in-memory';
  } else {
    const resolvedPath = resolveConfigPath(
      options?.configPath,
      undefined,
      undefined,
      fsProvider,
      envProvider,
    );

    if (!resolvedPath) {
      orchestratorPath = options?.configPath || '(not found)';
      if (!options?.allowMissingOrchestrator) {
        errors.push({
          source: 'discovery',
          configPath: orchestratorPath,
          code: 'CONFIG_NOT_FOUND',
          message:
            'No orchestrator configuration found. Set INDEXER_CONFIG_PATH env var, pass --config <path>, or place .indexer-config.json in working directory or repo root.',
        });
      }
    } else {
      orchestratorPath = resolvedPath;
      const parsed = parseConfigFile(resolvedPath, envProvider, 'orchestrator');
      orchestratorConfig = parsed.config;
      errors.push(...parsed.errors);
    }
  }

  // 2. Recursive discovery (if enabled)
  const perRepoConfigs: Array<{
    path: string;
    config?: IndexerConfig;
    codebaseId: string;
  }> = [];

  if (recursive && orchestratorConfig?.codebases) {
    for (const codebase of orchestratorConfig.codebases) {
      const perRepoResult = processPerRepoConfig(codebase, fsProvider, envProvider);
      errors.push(...perRepoResult.errors);
      if (perRepoResult.config) {
        perRepoConfigs.push(perRepoResult.config);
      }
    }
  }

  return {
    orchestrator: {
      path: orchestratorPath,
      ...(orchestratorConfig ? { config: orchestratorConfig } : {}),
    },
    perRepo: perRepoConfigs,
    errors,
  };
}

function processPerRepoConfig(
  codebase: IndexerConfig['codebases'][number],
  fsProvider: FileSystemProvider,
  envProvider: EnvironmentProvider,
): {
  config?: { path: string; config?: IndexerConfig; codebaseId: string };
  errors: ValidationIssue[];
} {
  const errors: ValidationIssue[] = [];
  const foundConfig = findConfigAtCodebaseRoot(codebase.root, fsProvider);

  if (!foundConfig) {
    return { errors };
  }

  const ambiguous = detectAmbiguousConfigs(codebase.root, fsProvider);
  if (ambiguous.length > 1) {
    errors.push({
      source: 'discovery',
      configPath: codebase.root,
      code: 'AMBIGUOUS_CONFIG',
      message: `Ambiguous configuration: Multiple .indexer-config.json files found in ${codebase.root}: ${ambiguous.join(
        ', ',
      )}. Please keep only one .indexer-config.json per codebase root.`,
      codebaseId: codebase.id,
    });
  }

  const parsed = parseConfigFile(foundConfig, envProvider, 'per-repo');
  errors.push(
    ...parsed.errors.map((issue) => ({
      ...issue,
      source: 'per-repo' as const,
      codebaseId: codebase.id,
      configPath: parsed.path,
    })),
  );

  return {
    errors,
    config: {
      path: foundConfig,
      ...(parsed.config ? { config: parsed.config } : {}),
      codebaseId: codebase.id,
    },
  };
}

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

  const parsedConfig = parseConfigFile(configPath, options?.envProvider);

  // Repo discovery (v1 stub — implemented in later slices)
  if (options?.discoverRepos) {
    // return mergeWithDiscoveredRepos(baseConfig);
  }

  return assertValidConfig(parsedConfig);
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
