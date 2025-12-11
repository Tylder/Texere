import { describe, expect, it } from 'vitest';

import { getBoundaryPatternExamples, getFeatureContext, getIncidentSlice } from './index.js';

describe('query skeleton (graph_schema_spec §6)', () => {
  it('returns a basic feature context bundle', async () => {
    const ctx = await getFeatureContext('feat', { depth: 1 });
    expect(ctx).toBeDefined();
    expect(ctx.symbols).toEqual([]);
    expect(ctx.boundaries).toEqual([]);
    expect(ctx.callGraphSlice).toBeDefined();
  });

  it('returns empty boundary examples', async () => {
    const examples = await getBoundaryPatternExamples({ limit: 5 });
    expect(examples).toEqual([]);
  });

  it('returns an incident slice bundle', async () => {
    const slice = await getIncidentSlice('INC-1');
    expect(slice).toBeDefined();
    expect(slice.incidentId).toBe('INC-1');
    expect(Array.isArray(slice.rootCauseSymbols)).toBe(true);
  });
});
