import { describe, expect, it } from 'vitest';

import {
  loadConfig,
  reloadConfig,
  getDatabase,
  initializeDatabase,
  IndexerDatabase,
  coreVersion,
} from './index.js';

describe('Texere Indexer Core (configuration_spec.md §1-2)', () => {
  describe('loadConfig', () => {
    it('returns an empty config array for stub implementation', async () => {
      const cfg = await loadConfig();
      expect(Array.isArray(cfg)).toBe(true);
      expect(cfg).toHaveLength(0);
    });

    it('accepts optional path parameter', async () => {
      const cfg = await loadConfig('/optional/path');
      expect(Array.isArray(cfg)).toBe(true);
    });
  });

  describe('reloadConfig', () => {
    it('returns an empty config array for stub implementation', async () => {
      const cfg = await reloadConfig();
      expect(Array.isArray(cfg)).toBe(true);
      expect(cfg).toHaveLength(0);
    });
  });

  describe('IndexerDatabase singleton (layout_spec.md §2.2)', () => {
    it('returns same instance on repeated getDatabase calls', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });

    it('initializes with null clients', () => {
      const db = getDatabase();
      expect(db.neo4j).toBe(null);
      expect(db.qdrant).toBe(null);
      expect(db.persistence).toBe(null);
      expect(db.queries).toBe(null);
    });

    it('is an instance of IndexerDatabase', () => {
      const db = getDatabase();
      expect(db).toBeInstanceOf(IndexerDatabase);
    });
  });

  describe('initializeDatabase', () => {
    it('returns the database instance', async () => {
      const testConfig = {
        version: '0.0.0',
        codebases: [],
        graph: {
          neo4jUri: 'neo4j://localhost',
          neo4jUser: 'neo4j',
          neo4jPassword: 'password',
        },
        vectors: {
          qdrantUrl: 'http://localhost:6333',
        },
      };

      const db = await initializeDatabase(testConfig);
      expect(db).toBeInstanceOf(IndexerDatabase);
    });
  });

  describe('Runtime markers', () => {
    it('exports coreVersion', () => {
      expect(typeof coreVersion).toBe('string');
      expect(coreVersion).toBe('0.0.0');
    });
  });
});
