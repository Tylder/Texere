import { createDeterministicId, type GraphNode } from '@repo/graph-core';

import { InMemoryGraphStore } from './index.js';

describe('InMemoryGraphStore determinism (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('returns nodes in deterministic order', () => {
    const store = new InMemoryGraphStore();
    const nodeA: GraphNode = {
      id: createDeterministicId('b'),
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: 'https://example.com/a',
    };
    const nodeB: GraphNode = {
      id: createDeterministicId('a'),
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: 'https://example.com/b',
    };

    store.putNode(nodeA);
    store.putNode(nodeB);

    const ids = store.listNodes().map((node) => node.id);
    expect(ids).toEqual([nodeA.id, nodeB.id]);
  });
});
