import { describe, expect, it } from 'vitest';

import { loadConfig } from './index.js';

describe('core config loader skeleton', () => {
  it('returns an empty config array for now', async () => {
    const cfg = await loadConfig();
    expect(Array.isArray(cfg)).toBe(true);
    expect(cfg).toHaveLength(0);
  });
});
