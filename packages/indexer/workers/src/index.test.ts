import { describe, expect, it } from 'vitest';

import { registerIndexerWorkers } from './index.js';

describe('Texere Indexer Workers (layout_spec.md §2.5)', () => {
  describe('registerIndexerWorkers', () => {
    it('returns an object with jobs array', () => {
      const res = registerIndexerWorkers();
      expect(res).toBeDefined();
      expect(res.jobs).toBeDefined();
      expect(Array.isArray(res.jobs)).toBe(true);
    });

    it('returns empty jobs array for stub', () => {
      const res = registerIndexerWorkers();
      expect(res.jobs).toHaveLength(0);
    });

    it('returns consistent structure on repeated calls', () => {
      const res1 = registerIndexerWorkers();
      const res2 = registerIndexerWorkers();
      expect(res1.jobs.length).toBe(res2.jobs.length);
    });
  });
});
