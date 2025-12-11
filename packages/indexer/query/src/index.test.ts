import { describe, expect, it } from 'vitest';

import {
  getFeatureContext,
  getBoundaryPatternExamples,
  getIncidentSlice,
  getCallGraphSlice,
  getTransitiveCallees,
  getTransitiveCallers,
  getDataMutators,
  searchSymbols,
  getDocumentation,
  getIndexerStats,
  queryVersion,
} from './index.js';

describe('Texere Indexer Query (graph_schema_spec.md §6)', () => {
  describe('getFeatureContext', () => {
    it('returns a FeatureContextBundle with minimal stub data', async () => {
      const ctx = await getFeatureContext('test-feature', { depth: 1 });
      expect(ctx).toBeDefined();
      expect(ctx.feature).toBeDefined();
      expect(ctx.feature.name).toBe('');
      expect(Array.isArray(ctx.symbols)).toBe(true);
      expect(Array.isArray(ctx.boundaries)).toBe(true);
      expect(ctx.callGraphSlice).toBeDefined();
      expect(ctx.confidence).toBe(0);
    });

    it('accepts optional FeatureContextOptions', async () => {
      const ctx = await getFeatureContext('feature', {
        depth: 3,
        includeTests: false,
        includeDocs: true,
        confidenceThreshold: 0.8,
      });
      expect(ctx).toBeDefined();
    });
  });

  describe('getBoundaryPatternExamples (graph_schema_spec.md §6.2)', () => {
    it('returns empty BoundaryPatternExample array', async () => {
      const examples = await getBoundaryPatternExamples({ limit: 5 });
      expect(Array.isArray(examples)).toBe(true);
      expect(examples).toHaveLength(0);
    });

    it('accepts optional BoundaryPatternOptions', async () => {
      const examples = await getBoundaryPatternExamples({
        limit: 10,
        kind: 'http',
        includeCallees: true,
        includeTests: false,
      });
      expect(Array.isArray(examples)).toBe(true);
    });
  });

  describe('getIncidentSlice (graph_schema_spec.md §6.4)', () => {
    it('returns IncidentSliceBundle with minimal stub data', async () => {
      const slice = await getIncidentSlice('INC-1', { includeTests: true });
      expect(slice).toBeDefined();
      expect(slice.incident).toBeDefined();
      expect(slice.incident.id).toBe('');
      expect(Array.isArray(slice.rootCauseSymbols)).toBe(true);
      expect(Array.isArray(slice.affectedFeatures)).toBe(true);
      expect(slice.confidence).toBe(0);
    });

    it('accepts optional IncidentSliceOptions', async () => {
      const slice = await getIncidentSlice('INC-2', {
        includeTests: false,
        includeDocs: true,
        confidenceThreshold: 0.6,
      });
      expect(slice).toBeDefined();
    });
  });

  describe('getCallGraphSlice (graph_schema_spec.md §6.1)', () => {
    it('returns CallGraphSlice with symbol stub', async () => {
      const slice = await getCallGraphSlice('sym-123', 2);
      expect(slice).toBeDefined();
      expect(slice.symbol).toBeDefined();
      expect(slice.symbol.name).toBe('');
      expect(slice.callersCount).toBe(0);
      expect(Array.isArray(slice.callers)).toBe(true);
      expect(slice.calleesCount).toBe(0);
      expect(Array.isArray(slice.callees)).toBe(true);
    });

    it('accepts depth parameter', async () => {
      const slice = await getCallGraphSlice('sym-456', 5);
      expect(slice).toBeDefined();
    });
  });

  describe('getTransitiveCallees', () => {
    it('returns empty Symbol array', async () => {
      const callees = await getTransitiveCallees('sym-789', 3);
      expect(Array.isArray(callees)).toBe(true);
      expect(callees).toHaveLength(0);
    });
  });

  describe('getTransitiveCallers', () => {
    it('returns empty Symbol array', async () => {
      const callers = await getTransitiveCallers('sym-789', 3);
      expect(Array.isArray(callers)).toBe(true);
      expect(callers).toHaveLength(0);
    });
  });

  describe('getDataMutators', () => {
    it('returns empty mutator array', async () => {
      const mutators = await getDataMutators('contract-123');
      expect(Array.isArray(mutators)).toBe(true);
      expect(mutators).toHaveLength(0);
    });
  });

  describe('searchSymbols', () => {
    it('returns empty Symbol array', async () => {
      const results = await searchSymbols('test', 20);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('accepts optional limit parameter', async () => {
      const results = await searchSymbols('query', 50);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getDocumentation', () => {
    it('returns empty SpecDoc array', async () => {
      const docs = await getDocumentation('node-123');
      expect(Array.isArray(docs)).toBe(true);
      expect(docs).toHaveLength(0);
    });
  });

  describe('getIndexerStats', () => {
    it('returns IndexerStats with zero counts', async () => {
      const stats = await getIndexerStats();
      expect(stats).toBeDefined();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalBoundaries).toBe(0);
      expect(stats.totalTestCases).toBe(0);
      expect(stats.totalFeatures).toBe(0);
      expect(stats.totalIncidents).toBe(0);
      expect(typeof stats.latestSnapshotAt).toBe('number');
    });
  });

  describe('Runtime markers', () => {
    it('exports queryVersion', () => {
      expect(typeof queryVersion).toBe('string');
      expect(queryVersion).toBe('0.0.0');
    });
  });
});
