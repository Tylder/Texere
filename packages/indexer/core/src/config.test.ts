/**
 * @file Configuration Loader Tests
 * @reference testing_specification.md §3–5 (test structure)
 * @reference configuration_spec.md §1–2 (config schema)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { IndexerConfig } from '@repo/indexer-types';

import {
  loadIndexerConfig,
  getDefaultConfig,
  findCodebaseConfig,
  mergeConfigs,
  validateDbConnections,
  sanitizeConfigForLogging,
} from './config';

describe('Config Loader (testing_specification §3.6.1)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexer-config-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('loadIndexerConfig', () => {
    it('should load valid config from file', () => {
      // reference: configuration_spec.md §1 (file format)
      const configPath = path.join(tempDir, '.indexer-config.json');
      const testConfig: IndexerConfig = {
        version: '1.0',
        codebases: [
          {
            id: 'test-repo',
            root: '/test/path',
            trackedBranches: ['main', 'develop'],
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

      fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

      const loaded = loadIndexerConfig({ path: configPath });

      expect(loaded.version).toBe('1.0');
      expect(loaded.codebases).toHaveLength(1);
      expect(loaded.codebases[0].id).toBe('test-repo');
    });

    it('should expand environment variables in config', () => {
      // reference: configuration_spec.md §2 (env var substitution)
      const configPath = path.join(tempDir, '.indexer-config.json');
      const configWithEnv = {
        version: '1.0',
        codebases: [
          {
            id: 'test-repo',
            root: '/test/path',
            trackedBranches: ['main'],
          },
        ],
        graph: {
          neo4jUri: '${NEO4J_URI}',
          neo4jUser: '${NEO4J_USER}',
          neo4jPassword: '${NEO4J_PASSWORD}',
        },
        vectors: {
          qdrantUrl: '${QDRANT_URL}',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(configWithEnv));

      // Set env vars
      vi.stubEnv('NEO4J_URI', 'bolt://test:7687');
      vi.stubEnv('NEO4J_USER', 'testuser');
      vi.stubEnv('NEO4J_PASSWORD', 'testpass');
      vi.stubEnv('QDRANT_URL', 'http://test:6333');

      const loaded = loadIndexerConfig({ path: configPath });

      expect(loaded.graph.neo4jUri).toBe('bolt://test:7687');
      expect(loaded.graph.neo4jUser).toBe('testuser');
      expect(loaded.vectors.qdrantUrl).toBe('http://test:6333');

      vi.unstubAllEnvs();
    });

    it('should throw when config file not found and allowMissing=false', () => {
      expect(() => {
        loadIndexerConfig({ path: '/nonexistent/config.json' });
      }).toThrow('Configuration file not found');
    });

    it('should return default config when file not found and allowMissing=true', () => {
      const config = loadIndexerConfig({ allowMissing: true });

      expect(config.version).toBe('1.0');
      expect(config.codebases).toEqual([]);
      expect(config.graph.neo4jUri).toBeDefined();
      expect(config.vectors.qdrantUrl).toBeDefined();
    });

    it('should validate required fields', () => {
      const configPath = path.join(tempDir, '.indexer-config.json');
      const invalidConfig = { version: '1.0' }; // Missing required fields

      fs.writeFileSync(configPath, JSON.stringify(invalidConfig));

      expect(() => {
        loadIndexerConfig({ path: configPath });
      }).toThrow('Missing required field');
    });

    it('should honor INDEXER_CONFIG_PATH env var', () => {
      const configPath = path.join(tempDir, '.indexer-config.json');
      const testConfig: IndexerConfig = {
        version: '1.0',
        codebases: [{ id: 'env-test', root: '/test', trackedBranches: ['main'] }],
        graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'pass' },
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      vi.stubEnv('INDEXER_CONFIG_PATH', configPath);
      const loaded = loadIndexerConfig(); // No explicit path
      vi.unstubAllEnvs();

      expect(loaded.codebases[0].id).toBe('env-test');
    });
  });

  describe('getDefaultConfig', () => {
    // reference: configuration_spec.md §1 (defaults)
    it('should return default config with reasonable values', () => {
      const config = getDefaultConfig();

      expect(config.version).toBe('1.0');
      expect(config.codebases).toEqual([]);
      expect(config.graph.neo4jUri).toBe('bolt://localhost:7687');
      expect(config.vectors.collectionName).toBe('texere-embeddings');
      expect(config.embedding?.dimensions).toBe(1536);
      expect(config.worker?.type).toBe('local');
    });

    it('should use env vars for defaults if available', () => {
      vi.stubEnv('NEO4J_URI', 'bolt://prod:7687');
      vi.stubEnv('QDRANT_URL', 'http://prod:6333');

      const config = getDefaultConfig();

      expect(config.graph.neo4jUri).toBe('bolt://prod:7687');
      expect(config.vectors.qdrantUrl).toBe('http://prod:6333');

      vi.unstubAllEnvs();
    });
  });

  describe('findCodebaseConfig', () => {
    // reference: configuration_spec.md §1 (codebase lookup)
    it('should find codebase by ID', () => {
      const config: IndexerConfig = {
        version: '1.0',
        codebases: [
          { id: 'repo-a', root: '/a', trackedBranches: ['main'] },
          { id: 'repo-b', root: '/b', trackedBranches: ['main'] },
        ],
        graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'pass' },
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      const found = findCodebaseConfig(config, 'repo-a');

      expect(found).toBeDefined();
      expect(found?.id).toBe('repo-a');
    });

    it('should return null if codebase not found', () => {
      const config: IndexerConfig = {
        version: '1.0',
        codebases: [{ id: 'repo-a', root: '/a', trackedBranches: ['main'] }],
        graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'pass' },
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      const found = findCodebaseConfig(config, 'nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('mergeConfigs', () => {
    // reference: configuration_and_server_setup.md §8 (precedence merging)
    it('should merge configs with override precedence', () => {
      const base: IndexerConfig = {
        version: '1.0',
        codebases: [{ id: 'base', root: '/base', trackedBranches: ['main'] }],
        graph: { neo4jUri: 'bolt://base:7687', neo4jUser: 'base-user', neo4jPassword: 'pass' },
        vectors: { qdrantUrl: 'http://base:6333' },
      };

      const override = {
        graph: { neo4jUri: 'bolt://override:7687' },
      };

      const merged = mergeConfigs(base, override);

      expect(merged.graph.neo4jUri).toBe('bolt://override:7687');
      expect(merged.graph.neo4jUser).toBe('base-user'); // Not overridden
      expect(merged.codebases[0].id).toBe('base');
    });
  });

  describe('validateDbConnections', () => {
    // reference: configuration_spec.md §2 (required variables)
    it('should detect missing Neo4j URI', () => {
      const config: IndexerConfig = {
        version: '1.0',
        codebases: [],
        graph: { neo4jUri: '', neo4jUser: 'neo4j', neo4jPassword: 'pass' },
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      const errors = validateDbConnections(config);

      expect(errors).toContainEqual(expect.stringContaining('NEO4J_URI'));
    });

    it('should detect missing Qdrant URL', () => {
      const config: IndexerConfig = {
        version: '1.0',
        codebases: [],
        graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'pass' },
        vectors: { qdrantUrl: '' },
      };

      const errors = validateDbConnections(config);

      expect(errors).toContainEqual(expect.stringContaining('QDRANT_URL'));
    });

    it('should return no errors for valid config', () => {
      const config: IndexerConfig = {
        version: '1.0',
        codebases: [],
        graph: { neo4jUri: 'bolt://localhost:7687', neo4jUser: 'neo4j', neo4jPassword: 'pass' },
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      const errors = validateDbConnections(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('sanitizeConfigForLogging', () => {
    // reference: configuration_spec.md §1 (password redaction)
    it('should redact sensitive values', () => {
      const config: IndexerConfig = {
        version: '1.0',
        codebases: [{ id: 'test', root: '/test', trackedBranches: ['main'] }],
        graph: {
          neo4jUri: 'bolt://localhost:7687',
          neo4jUser: 'neo4j',
          neo4jPassword: 'secretpass',
        },
        vectors: { qdrantUrl: 'http://localhost:6333' },
      };

      const sanitized = sanitizeConfigForLogging(config);

      expect(sanitized.neo4jUri).toBe('bolt://localhost:7687');
      expect(sanitized.neo4jUser).toBe('neo4j');
      expect(sanitized).not.toHaveProperty('neo4jPassword');
    });
  });
});
