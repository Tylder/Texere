import { describe, expect, it } from 'vitest';

import { indexSnapshot } from './index.js';

describe('indexSnapshot skeleton', () => {
  it('resolves to an empty result for now', async () => {
    const results = await indexSnapshot({
      codebaseId: 'test',
      codebaseRoot: '/tmp/test',
      commitHash: 'hash',
      branch: 'main',
    });
    expect(results).toEqual([]);
  });
});
