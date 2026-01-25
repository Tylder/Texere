import { createDeterministicId, type GraphNode } from '@repo/graph-core';

import { InMemoryGraphStore } from './index.js';

describe('InMemoryGraphStore determinism (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('returns nodes in deterministic order', () => {
    const store = new InMemoryGraphStore();
    const nodeA: GraphNode = {
      id: createDeterministicId('file:b'),
      kind: 'File',
      schema_version: 'v0.1',
      fileId: createDeterministicId('file:b'),
      path: 'src/b.ts',
      packageName: 'example',
      commitSha: 'commit',
      language: 'typescript',
      stale: false,
    };
    const nodeB: GraphNode = {
      id: createDeterministicId('file:a'),
      kind: 'File',
      schema_version: 'v0.1',
      fileId: createDeterministicId('file:a'),
      path: 'src/a.ts',
      packageName: 'example',
      commitSha: 'commit',
      language: 'typescript',
      stale: false,
    };

    store.putNode(nodeA);
    store.putNode(nodeB);

    const ids = store.listNodes().map((node) => node.id);
    expect(ids).toEqual([nodeB.id, nodeA.id]);
  });
});
