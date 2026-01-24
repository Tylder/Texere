import { describe, expect, it } from 'vitest';

import { ingestRepo, ingestRepoFromSource, writeJsonDumps } from './index.js';

describe('index re-exports (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('exposes public APIs', () => {
    expect(typeof ingestRepo).toBe('function');
    expect(typeof ingestRepoFromSource).toBe('function');
    expect(typeof writeJsonDumps).toBe('function');
  });
});
