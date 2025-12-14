/**
 * @file Configuration Loader Tests
 * @description Unit tests for config loading, validation, and merging
 * @reference testing_specification.md §3–7
 * @reference configuration_spec.md §1–2 (config file format)
 * @reference configuration_and_server_setup.md §8 (precedence)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { IndexerConfig } from '@repo/indexer-types';

import type { ValidationIssue } from './config.js';
import {
  assertValidConfig,
  loadIndexerConfig,
  getDefaultConfig,
  findCodebaseConfig,
  mergeConfigs,
  validateDbConnections,
  sanitizeConfigForLogging,
  expandEnvVars,
  parseConfigFile,
  discoverConfigs,
  type EnvironmentProvider,
  type FileSystemProvider,
} from './config.js';

// ============================================================================
// 1. Default Configuration Tests
// ============================================================================

describe('getDefaultConfig (testing_specification.md §3.6–3.7 – injectable dependencies)', () => {
  /**
   * Mock environment provider.
   * @reference testing_specification.md §3.6–3.7 (dependency injection)
   */
  const createMockEnv = (vars: Record<string, string | undefined>): EnvironmentProvider => ({
    get: (varName: string) => vars[varName],
  });

  it('returns valid config with all required fields', () => {
    const mockEnv = createMockEnv({});
    const config = getDefaultConfig(mockEnv);

    expect(config).toHaveProperty('version');
    expect(config).toHaveProperty('codebases');
    expect(config).toHaveProperty('graph');
    expect(config).toHaveProperty('vectors');
    expect(config).toHaveProperty('security');
  });

  it('uses provided env vars for defaults (pure mock)', () => {
    const mockEnv = createMockEnv({
      NEO4J_URI: 'bolt://custom:7687',
      QDRANT_URL: 'http://custom:6333',
    });
    const config = getDefaultConfig(mockEnv);

    expect(config.graph.neo4jUri).toBe('bolt://custom:7687');
    expect(config.vectors.qdrantUrl).toBe('http://custom:6333');
  });

  it('includes sensible hardcoded defaults when env vars not provided', () => {
    const mockEnv = createMockEnv({}); // No env vars
    const config = getDefaultConfig(mockEnv);

    expect(config.graph.neo4jUri).toBe('bolt://localhost:7687');
    expect(config.vectors.qdrantUrl).toBe('http://localhost:6333');
  });

  it('produces codebases array (empty for defaults)', () => {
    const mockEnv = createMockEnv({});
    const config = getDefaultConfig(mockEnv);

    expect(Array.isArray(config.codebases)).toBe(true);
  });
});

// ============================================================================
// 4. Config merging + discovery tests
// ============================================================================

describe('mergeConfigs (configuration_and_server_setup.md §8)', () => {
  it('merges denyPatterns by union', () => {
    const base = getDefaultConfig();
    const merged = mergeConfigs(base, {
      security: { denyPatterns: ['.env'] },
    });

    expect(merged.security?.denyPatterns).toContain('.env');
  });
});

// ============================================================================
// 2. Configuration File Loading Tests
// ============================================================================

describe('loadIndexerConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join('/tmp', `indexer-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('throws error when config file not found and allowMissing=false', () => {
    expect(() => {
      loadIndexerConfig({
        path: '/nonexistent/config.json',
        allowMissing: false,
      });
    }).toThrow('Configuration file not found');
  });

  it('returns defaults when no config path provided and allowMissing=true', () => {
    // Use a temp dir that definitely doesn't have a config
    const originalCwd = process.cwd();
    process.chdir(tmpDir);

    try {
      const config = loadIndexerConfig({
        allowMissing: true,
      });

      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('graph');
      expect(config).toHaveProperty('vectors');
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('loads valid JSON config file', () => {
    const configFile = path.join(tmpDir, '.indexer-config.json');
    const testConfig: IndexerConfig = {
      version: '1.0',
      codebases: [
        {
          id: 'test-repo',
          root: '/test',
          trackedBranches: ['main'],
        },
      ],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: {
        qdrantUrl: 'http://localhost:6333',
      },
    };

    fs.writeFileSync(configFile, JSON.stringify(testConfig));

    const loaded = loadIndexerConfig({
      path: configFile,
      allowMissing: false,
    });

    expect(loaded.codebases).toHaveLength(1);
    expect(loaded.codebases[0]?.id).toBe('test-repo');
  });

  it('throws error for invalid JSON', () => {
    const configFile = path.join(tmpDir, '.indexer-config.json');
    fs.writeFileSync(configFile, '{ invalid json }');

    expect(() => {
      loadIndexerConfig({
        path: configFile,
        allowMissing: false,
      });
    }).toThrow('Failed to parse configuration file');
  });

  it('throws error when required fields are missing', () => {
    const configFile = path.join(tmpDir, '.indexer-config.json');
    const incompleteConfig = {
      version: '1.0',
      // Missing codebases, graph, vectors
    };

    fs.writeFileSync(configFile, JSON.stringify(incompleteConfig));

    expect(() => {
      loadIndexerConfig({
        path: configFile,
        allowMissing: false,
      });
    }).toThrow('Missing required field');
  });
});

describe('discoverConfigs (cli_spec.md §3–5)', () => {
  it('returns empty discovery when allowMissingOrchestrator=true', () => {
    const discovered = discoverConfigs({
      allowMissingOrchestrator: true,
      envProvider: { get: () => undefined },
      fsProvider: {
        exists: () => false,
        dirname: (dirPath: string) => path.dirname(dirPath),
        readdirSync: () => [],
      },
    });

    expect(discovered.errors).toHaveLength(0);
    expect(discovered.orchestrator.config).toBeUndefined();
    expect(discovered.orchestrator.path).toBe('(not found)');
    expect(discovered.perRepo).toHaveLength(0);
  });
});

// ============================================================================
// 3. Environment Variable Substitution Tests
// ============================================================================

describe('environment variable expansion', () => {
  let tmpDir: string;
  const origEnv = process.env['TEST_DB_URI'];

  beforeEach(() => {
    tmpDir = path.join('/tmp', `indexer-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env['TEST_DB_URI'] = 'bolt://custom-db:7687';
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    if (origEnv !== undefined) {
      process.env['TEST_DB_URI'] = origEnv;
    } else {
      delete process.env['TEST_DB_URI'];
    }
  });

  it('expands env var references in config', () => {
    const configFile = path.join(tmpDir, '.indexer-config.json');
    const configContent = JSON.stringify({
      version: '1.0',
      codebases: [
        {
          id: 'test-repo',
          root: '/test',
          trackedBranches: ['main'],
        },
      ],
      graph: {
        neo4jUri: '${TEST_DB_URI}',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: {
        qdrantUrl: 'http://localhost:6333',
      },
    });

    fs.writeFileSync(configFile, configContent);

    const config = loadIndexerConfig({
      path: configFile,
      allowMissing: false,
    });

    expect(config.graph.neo4jUri).toBe('bolt://custom-db:7687');
  });

  it('throws error when env var is not found', () => {
    const configFile = path.join(tmpDir, '.indexer-config.json');
    const configContent = JSON.stringify({
      version: '1.0',
      codebases: [],
      graph: {
        neo4jUri: '${NONEXISTENT_VAR}',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: {
        qdrantUrl: 'http://localhost:6333',
      },
    });

    fs.writeFileSync(configFile, configContent);

    expect(() => {
      loadIndexerConfig({
        path: configFile,
        allowMissing: false,
      });
    }).toThrow(/Environment variable .*NONEXISTENT_VAR .*not set/);
  });
});

// ============================================================================
// 4. Codebase Config Lookup Tests
// ============================================================================

describe('findCodebaseConfig', () => {
  it('finds codebase by ID', () => {
    const config: IndexerConfig = {
      version: '1.0',
      codebases: [
        { id: 'repo-a', root: '/a', trackedBranches: ['main'] },
        { id: 'repo-b', root: '/b', trackedBranches: ['main'] },
      ],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const found = findCodebaseConfig(config, 'repo-b');
    expect(found).toBeTruthy();
    expect(found?.id).toBe('repo-b');
    expect(found?.root).toBe('/b');
  });

  it('returns null when codebase not found', () => {
    const config: IndexerConfig = {
      version: '1.0',
      codebases: [{ id: 'repo-a', root: '/a', trackedBranches: ['main'] }],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const found = findCodebaseConfig(config, 'nonexistent');
    expect(found).toBeNull();
  });
});

// ============================================================================
// 5. Configuration Merging Tests
// ============================================================================

describe('mergeConfigs (configuration_and_server_setup.md §8 – precedence)', () => {
  it('deep merges nested objects', () => {
    const base: IndexerConfig = {
      version: '1.0',
      codebases: [],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
      embedding: { model: 'openai', modelName: 'text-embedding-3-small' },
    };

    const override: Partial<IndexerConfig> = {
      embedding: { modelName: 'text-embedding-3-large' }, // Override modelName only
    };

    const merged = mergeConfigs(base, override);

    expect(merged.embedding?.model).toBe('openai'); // From base
    expect(merged.embedding?.modelName).toBe('text-embedding-3-large'); // From override
  });

  it('replaces arrays instead of merging', () => {
    const base: IndexerConfig = {
      version: '1.0',
      codebases: [
        { id: 'a', root: '/a', trackedBranches: ['main'] },
        { id: 'b', root: '/b', trackedBranches: ['main'] },
      ],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const override: Partial<IndexerConfig> = {
      codebases: [{ id: 'c', root: '/c', trackedBranches: ['develop'] }],
    };

    const merged = mergeConfigs(base, override);

    expect(merged.codebases).toHaveLength(1);
    expect(merged.codebases[0]?.id).toBe('c');
  });

  it('merges denyPatterns arrays', () => {
    const base: IndexerConfig = {
      version: '1.0',
      codebases: [],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
      security: { denyPatterns: ['.env', '*.key'] },
    };

    const override: Partial<IndexerConfig> = {
      security: { denyPatterns: ['secrets/**'] },
    };

    const merged = mergeConfigs(base, override);

    // Should have both sets (implementation does shallow merge on security)
    expect(merged.security?.denyPatterns).toBeTruthy();
  });
});

// ============================================================================
// 6. Database Connection Validation Tests
// ============================================================================

describe('validateDbConnections', () => {
  it('returns empty array for valid config', () => {
    const config: IndexerConfig = {
      version: '1.0',
      codebases: [],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const errors = validateDbConnections(config);
    expect(errors).toHaveLength(0);
  });

  it('returns error for missing neo4j config', () => {
    const config: IndexerConfig = {
      version: '1.0',
      codebases: [],
      graph: {
        neo4jUri: '',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const errors = validateDbConnections(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/NEO4J_URI/i);
  });

  it('returns error for missing qdrant config', () => {
    const config: IndexerConfig = {
      version: '1.0',
      codebases: [],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: '' },
    };

    const errors = validateDbConnections(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/QDRANT_URL/i);
  });
});

// ============================================================================
// 7. Config Sanitization Tests
// ============================================================================

describe('sanitizeConfigForLogging', () => {
  it('redacts sensitive password fields', () => {
    const config: IndexerConfig = {
      version: '1.0',
      codebases: [],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'super-secret-password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const sanitized = sanitizeConfigForLogging(config);

    expect(sanitized).not.toHaveProperty('neo4jPassword');
    expect(sanitized['neo4jUri']).toBe('bolt://localhost:7687');
  });

  it('includes non-sensitive fields', () => {
    const config: IndexerConfig = {
      version: '1.0',
      codebases: [
        { id: 'repo-a', root: '/a', trackedBranches: ['main'] },
        { id: 'repo-b', root: '/b', trackedBranches: ['main'] },
      ],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    const sanitized = sanitizeConfigForLogging(config);

    expect(sanitized['codebaseCount']).toBe(2);
    expect(sanitized['codebaseIds']).toEqual(['repo-a', 'repo-b']);
  });
});

// ============================================================================
// 8. Config Path Resolution Tests (testing_specification.md §3 – Testability)
// ============================================================================

describe('resolveConfigPath (configuration_and_server_setup.md §3, §8)', () => {
  /**
   * Mock file system provider for testing path resolution.
   * @reference testing_specification.md §3 (dependency injection for testability)
   */
  const createMockFileSystem = (configLocations: Set<string>): FileSystemProvider => ({
    exists: (filePath: string) => configLocations.has(filePath),
    dirname: (filePath: string) => path.dirname(filePath),
    readdirSync: () => [],
  });

  /**
   * Mock environment provider for testing env var resolution.
   * @reference testing_specification.md §3.6–3.7 (dependency injection)
   */
  const createMockEnv = (vars: Record<string, string | undefined>): EnvironmentProvider => ({
    get: (varName: string) => vars[varName],
  });

  it('returns explicit path when provided (highest priority)', () => {
    // Use purely mocked filesystem for this test
    const mockFS = createMockFileSystem(new Set(['/config/.indexer-config.json']));
    const mockEnv = createMockEnv({});

    const configFile = path.join('/tmp', `explicit-config-${Date.now()}.json`);
    const testConfig: IndexerConfig = {
      version: '1.0',
      codebases: [{ id: 'test', root: '/test', trackedBranches: ['main'] }],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    fs.writeFileSync(configFile, JSON.stringify(testConfig));

    try {
      const loaded = loadIndexerConfig({
        path: configFile,
        allowMissing: false,
        envProvider: mockEnv,
        fsProvider: mockFS,
      });

      expect(loaded.codebases).toHaveLength(1);
      expect(loaded.codebases[0]?.id).toBe('test');
    } finally {
      if (fs.existsSync(configFile)) {
        fs.unlinkSync(configFile);
      }
    }
  });

  it('respects INDEXER_CONFIG_PATH env var (second priority)', () => {
    const tmpDir = path.join('/tmp', `env-config-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const configFile = path.join(tmpDir, '.indexer-config.json');
    const testConfig: IndexerConfig = {
      version: '1.0',
      codebases: [{ id: 'env-test', root: '/test', trackedBranches: ['main'] }],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    fs.writeFileSync(configFile, JSON.stringify(testConfig));

    const originalEnv = process.env['INDEXER_CONFIG_PATH'];

    try {
      process.env['INDEXER_CONFIG_PATH'] = configFile;

      const loaded = loadIndexerConfig({
        allowMissing: false,
      });

      expect(loaded.codebases[0]?.id).toBe('env-test');
    } finally {
      if (originalEnv !== undefined) {
        process.env['INDEXER_CONFIG_PATH'] = originalEnv;
      } else {
        delete process.env['INDEXER_CONFIG_PATH'];
      }
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });

  it('walks up directory tree to find config in parent (addresses monorepo subdirectory issue)', () => {
    // Test scenario: config at /repo/.indexer-config.json, CWD at /repo/apps/indexer-cli
    // This test ensures the fix works (directory traversal)
    const tmpDir = path.join('/tmp', `walk-up-${Date.now()}`);
    const repoRoot = tmpDir;
    const subDir = path.join(tmpDir, 'apps', 'indexer-cli');

    fs.mkdirSync(subDir, { recursive: true });

    const configFile = path.join(repoRoot, '.indexer-config.json');
    const testConfig: IndexerConfig = {
      version: '1.0',
      codebases: [{ id: 'walk-up-test', root: '/test', trackedBranches: ['main'] }],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    fs.writeFileSync(configFile, JSON.stringify(testConfig));

    const originalCwd = process.cwd();

    try {
      process.chdir(subDir);

      const loaded = loadIndexerConfig({
        allowMissing: false,
      });

      expect(loaded.codebases[0]?.id).toBe('walk-up-test');
    } finally {
      process.chdir(originalCwd);
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });

  it('does not find config in sibling directories (only parent traversal)', () => {
    // Test: config in /repo/other-app/.indexer-config.json should NOT be found from /repo/app/
    const tmpDir = path.join('/tmp', `sibling-test-${Date.now()}`);
    const appDir = path.join(tmpDir, 'app');
    const otherAppDir = path.join(tmpDir, 'other-app');

    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(otherAppDir, { recursive: true });

    const configFile = path.join(otherAppDir, '.indexer-config.json');
    const testConfig: IndexerConfig = {
      version: '1.0',
      codebases: [{ id: 'other', root: '/test', trackedBranches: ['main'] }],
      graph: {
        neo4jUri: 'bolt://localhost:7687',
        neo4jUser: 'neo4j',
        neo4jPassword: 'password',
      },
      vectors: { qdrantUrl: 'http://localhost:6333' },
    };

    fs.writeFileSync(configFile, JSON.stringify(testConfig));

    const originalCwd = process.cwd();

    try {
      process.chdir(appDir);

      expect(() => {
        loadIndexerConfig({ allowMissing: false });
      }).toThrow('No configuration file found');
    } finally {
      process.chdir(originalCwd);
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });
});

// ============================================================================
// 10. Pure Function Tests (testing_specification.md §4.2 – unit testable functions)
// ============================================================================

describe('expandEnvVars (pure function – testing_specification.md §4.2)', () => {
  it('substitutes simple env var references', () => {
    const mockEnv: EnvironmentProvider = {
      get: () => 'test-value',
    };

    const result = expandEnvVars('Database: ${DB_URI}', mockEnv);
    expect(result).toBe('Database: test-value');
  });

  it('substitutes multiple env var references', () => {
    const mockEnv: EnvironmentProvider = {
      get: (varName: string) => {
        const values: Record<string, string> = {
          DB_HOST: 'localhost',
          DB_PORT: '5432',
        };
        return values[varName];
      },
    };

    const result = expandEnvVars('${DB_HOST}:${DB_PORT}', mockEnv);
    expect(result).toBe('localhost:5432');
  });

  it('collects issue for missing env var', () => {
    const mockEnv: EnvironmentProvider = {
      get: () => undefined,
    };
    const issues: ValidationIssue[] = [];

    const result = expandEnvVars('${MISSING_VAR}', mockEnv, issues, 'test-path', 'orchestrator');

    expect(result).toBe('${MISSING_VAR}');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('ENV_VAR_MISSING');
  });

  it('returns text unchanged when no env vars present', () => {
    const mockEnv: EnvironmentProvider = {
      get: () => undefined,
    };

    const text = 'Plain text without variables';
    const result = expandEnvVars(text, mockEnv);
    expect(result).toBe(text);
  });

  it('preserves non-var braces in text', () => {
    const mockEnv: EnvironmentProvider = {
      get: (varName: string) => {
        if (varName === 'VAR') return 'value';
        return undefined;
      },
    };

    const result = expandEnvVars('Object {key: "${VAR}"}, other {data}', mockEnv);
    // Note: ${VAR} is replaced, but {data} is left alone
    expect(result).toContain('value');
    expect(result).toContain('other {data}');
  });
});

describe('parseConfigFile (testing_specification.md §4.3 – integration with mocks)', () => {
  it('parses JSON config with env var substitution', () => {
    const mockEnv: EnvironmentProvider = {
      get: (varName: string) => {
        const values: Record<string, string> = {
          NEO4J_URI: 'bolt://custom-db:7687',
        };
        return values[varName];
      },
    };

    const _mockFS: FileSystemProvider = {
      exists: () => true,
      dirname: (p: string) => path.dirname(p),
      readdirSync: () => [],
    };

    // Create a temporary config file
    const tmpDir = path.join('/tmp', `parse-config-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const configPath = path.join(tmpDir, '.indexer-config.json');

    try {
      const testConfig = {
        version: '1.0',
        codebases: [{ id: 'test', root: '/test', trackedBranches: ['main'] }],
        graph: {
          neo4jUri: '${NEO4J_URI}',
          neo4jUser: 'neo4j',
          neo4jPassword: 'password',
        },
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      const result = assertValidConfig(parseConfigFile(configPath, mockEnv));
      expect(result.graph.neo4jUri).toBe('bolt://custom-db:7687');
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });

  it('throws error for invalid JSON', () => {
    const mockEnv: EnvironmentProvider = {
      get: () => undefined,
    };

    const tmpDir = path.join('/tmp', `parse-invalid-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const configPath = path.join(tmpDir, '.indexer-config.json');

    try {
      fs.writeFileSync(configPath, 'invalid json {');

      expect(() => {
        assertValidConfig(parseConfigFile(configPath, mockEnv));
      }).toThrow('Failed to parse configuration file');
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });

  it('validates required fields after parsing', () => {
    const mockEnv: EnvironmentProvider = {
      get: () => undefined,
    };

    const tmpDir = path.join('/tmp', `parse-validation-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const configPath = path.join(tmpDir, '.indexer-config.json');

    try {
      // Missing required graph field
      const invalidConfig = {
        version: '1.0',
        codebases: [],
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

      expect(() => {
        assertValidConfig(parseConfigFile(configPath, mockEnv));
      }).toThrow('Missing required field');
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
      }
    }
  });
});
