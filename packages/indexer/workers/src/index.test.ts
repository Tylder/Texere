import { describe, expect, it } from 'vitest';

import { registerIndexerWorkers } from './index.js';

describe('workers skeleton', () => {
  it('returns a jobs array placeholder', () => {
    const res = registerIndexerWorkers();
    expect(res.jobs).toEqual([]);
  });
});
