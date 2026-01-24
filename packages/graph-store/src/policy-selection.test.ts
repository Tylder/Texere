import { createDeterministicId, type PolicyNode } from '@repo/graph-core';

import { InMemoryGraphStore } from './index.js';

describe('Policy selection (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('selects the latest non-superseded policy for a scope', () => {
    const store = new InMemoryGraphStore();
    const policyA: PolicyNode = {
      id: createDeterministicId('policy-a'),
      kind: 'Policy',
      schema_version: 'v0.1',
      policy_kind: 'IngestionPolicy',
      scope: 'repo',
    };
    const policyB: PolicyNode = {
      id: createDeterministicId('policy-b'),
      kind: 'Policy',
      schema_version: 'v0.1',
      policy_kind: 'IngestionPolicy',
      scope: 'repo',
      supersedes: policyA.id,
    };

    store.putNode(policyA);
    store.putNode(policyB);

    const selected = store.queryPolicy({ policy_kind: 'IngestionPolicy', scope: 'repo' });
    expect(selected?.id).toBe(policyB.id);
  });
});
