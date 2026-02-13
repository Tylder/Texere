import { describe, expect, it } from 'vitest';

import { EdgeType, NodeType } from './types';

describe('graph types', () => {
  it('has exactly 17 node types', () => {
    expect(Object.values(NodeType)).toHaveLength(17);
  });

  it('has exactly 14 edge types', () => {
    expect(Object.values(EdgeType)).toHaveLength(14);
  });
});
