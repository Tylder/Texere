import { describe, it, expect, beforeEach } from 'vitest';

import {
  createDeterministicId,
  type ArtifactRootNode,
  type GraphEdge,
  type PolicyNode,
} from '@repo/graph-core';

import { InMemoryGraphStore } from './index.js';

describe('InMemoryGraphStore', () => {
  let store: InMemoryGraphStore;

  beforeEach(() => {
    store = new InMemoryGraphStore();
  });

  describe('transactions', () => {
    it('commits a transaction', () => {
      const node: ArtifactRootNode = {
        id: createDeterministicId('test'),
        kind: 'ArtifactRoot',
        schema_version: 'v0.1',
        source_kind: 'repo',
        canonical_ref: 'https://example.com/repo',
      };

      store.beginTransaction();
      store.putNode(node);
      store.commit();

      expect(store.getNode(node.id)).toEqual(node);
    });

    it('rolls back a transaction', () => {
      const node: ArtifactRootNode = {
        id: createDeterministicId('test'),
        kind: 'ArtifactRoot',
        schema_version: 'v0.1',
        source_kind: 'repo',
        canonical_ref: 'https://example.com/repo',
      };

      store.putNode(node);
      store.beginTransaction();
      const anotherNode: ArtifactRootNode = {
        id: createDeterministicId('test2'),
        kind: 'ArtifactRoot',
        schema_version: 'v0.1',
        source_kind: 'repo',
        canonical_ref: 'https://example.com/repo2',
      };
      store.putNode(anotherNode);
      store.rollback();

      expect(store.getNode(anotherNode.id)).toBeUndefined();
      expect(store.getNode(node.id)).toEqual(node);
    });

    it('handles empty rollback gracefully', () => {
      expect(() => store.rollback()).not.toThrow();
    });
  });

  describe('edges', () => {
    it('stores and retrieves edges', () => {
      const nodeA = createDeterministicId('a');
      const nodeB = createDeterministicId('b');
      const edge: GraphEdge = {
        id: createDeterministicId('edge-1'),
        kind: 'HasState',
        schema_version: 'v0.1',
        from: nodeA,
        to: nodeB,
      };

      store.putEdge(edge);
      const edges = store.listEdges();

      expect(edges).toContainEqual(edge);
    });

    it('returns edges sorted by ID', () => {
      const nodeA = createDeterministicId('a');
      const nodeB = createDeterministicId('b');
      const edge1: GraphEdge = {
        id: createDeterministicId('z'),
        kind: 'HasState',
        schema_version: 'v0.1',
        from: nodeA,
        to: nodeB,
      };
      const edge2: GraphEdge = {
        id: createDeterministicId('a'),
        kind: 'HasState',
        schema_version: 'v0.1',
        from: nodeB,
        to: nodeA,
      };

      store.putEdge(edge1);
      store.putEdge(edge2);
      const edges = store.listEdges();

      expect(edges[0]?.id.localeCompare(edges[1]?.id ?? '')).toBeLessThan(0);
    });

    it('filters edges by query', () => {
      const nodeA = createDeterministicId('a');
      const nodeB = createDeterministicId('b');
      const nodeC = createDeterministicId('c');
      const edge1: GraphEdge = {
        id: createDeterministicId('edge-1'),
        kind: 'HasState',
        schema_version: 'v0.1',
        from: nodeA,
        to: nodeB,
      };
      const edge2: GraphEdge = {
        id: createDeterministicId('edge-2'),
        kind: 'HasPart',
        schema_version: 'v0.1',
        from: nodeB,
        to: nodeC,
      };

      store.putEdge(edge1);
      store.putEdge(edge2);

      const fromA = store.getEdges({ from: nodeA });
      expect(fromA).toHaveLength(1);
      expect(fromA[0]).toEqual(edge1);

      const toC = store.getEdges({ to: nodeC });
      expect(toC).toHaveLength(1);
      expect(toC[0]).toEqual(edge2);

      const hasPart = store.getEdges({ kind: 'HasPart' });
      expect(hasPart).toHaveLength(1);
      expect(hasPart[0]).toEqual(edge2);
    });
  });

  describe('policy nodes', () => {
    it('tracks policy insertion order', () => {
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

    it('returns undefined when no policy matches', () => {
      const selected = store.queryPolicy({ policy_kind: 'IngestionPolicy', scope: 'nonexistent' });
      expect(selected).toBeUndefined();
    });

    it('handles policies with missing supersede targets', () => {
      const policyA: PolicyNode = {
        id: createDeterministicId('policy-a'),
        kind: 'Policy',
        schema_version: 'v0.1',
        policy_kind: 'ValidationPolicy',
        scope: 'module',
        supersedes: createDeterministicId('nonexistent'),
      };

      store.putNode(policyA);

      const selected = store.queryPolicy({ policy_kind: 'ValidationPolicy', scope: 'module' });
      expect(selected?.id).toBe(policyA.id);
    });
  });
});
