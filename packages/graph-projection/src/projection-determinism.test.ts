import { createDeterministicId, type GraphNode, type PolicyNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { CurrentCommittedTruthProjection } from './index.js';

describe('Projection determinism (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('returns stable nodes and edges for the same store state', () => {
    const store = new InMemoryGraphStore();
    const node: GraphNode = {
      id: createDeterministicId('root'),
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: 'https://example.com/repo',
    };
    const policy: PolicyNode = {
      id: createDeterministicId('policy'),
      kind: 'Policy',
      schema_version: 'v0.1',
      policy_kind: 'ProjectionPolicy',
      scope: 'repo',
    };

    store.putNode(node);
    store.putNode(policy);

    const projection = new CurrentCommittedTruthProjection();
    const first = projection.run('CurrentCommittedTruth', store, {
      policy_kind: 'ProjectionPolicy',
      scope: 'repo',
    });
    const second = projection.run('CurrentCommittedTruth', store, {
      policy_kind: 'ProjectionPolicy',
      scope: 'repo',
    });

    expect(first.nodes).toEqual(second.nodes);
    expect(first.edges).toEqual(second.edges);
    expect(first.explanation).toEqual(second.explanation);
    expect(first.schema_version).toBe('v0.1');
  });
});
