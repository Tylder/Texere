import { describe, expect, it } from 'vitest';

import { getBoundaryPatternExamples, getFeatureContext, getIncidentSlice } from './index.js';

describe('query skeleton', () => {
  it('returns a basic feature context stub', async () => {
    const ctx = await getFeatureContext('feat', { depth: 1 });
    expect(ctx.feature).toBe('feat');
    expect(Array.isArray(ctx.implementers)).toBe(true);
  });

  it('returns empty boundary examples', async () => {
    const examples = await getBoundaryPatternExamples(5);
    expect(examples).toEqual([]);
  });

  it('returns an incident slice stub', async () => {
    const slice = await getIncidentSlice('INC-1');
    expect(slice.incidentId).toBe('INC-1');
    expect(Array.isArray(slice.rootCauseSymbols)).toBe(true);
  });
});
