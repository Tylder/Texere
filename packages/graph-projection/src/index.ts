import type { PolicySelection, ProjectionEnvelope, SchemaVersion } from '@repo/graph-core';
import type { GraphStore } from '@repo/graph-store';

export interface ProjectionRunner {
  run(projectionName: string, store: GraphStore, selection?: PolicySelection): ProjectionEnvelope;
}

export class CurrentCommittedTruthProjection implements ProjectionRunner {
  run(projectionName: string, store: GraphStore, selection?: PolicySelection): ProjectionEnvelope {
    const policy = selection ? store.queryPolicy(selection) : undefined;

    return {
      projection_name: projectionName,
      schema_version: 'v0.1' as SchemaVersion,
      generated_at: new Date().toISOString(),
      explanation: policy
        ? `Selected policy ${policy.id} (${policy.policy_kind})`
        : 'No policy selection applied',
      nodes: store.listNodes(),
      edges: store.listEdges(),
    };
  }
}
