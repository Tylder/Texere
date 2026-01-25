import { describe, it, expect, beforeEach } from 'vitest';

import {
  createDeterministicId,
  type GraphEdge,
  type PolicyNode,
  type FileNode,
} from '@repo/graph-core';

import { InMemoryGraphStore } from './index.js';
import { InMemoryRelationalStore } from './index.js';

describe('InMemoryGraphStore', () => {
  let store: InMemoryGraphStore;

  beforeEach(() => {
    store = new InMemoryGraphStore();
  });

  describe('transactions', () => {
    it('commits a transaction', () => {
      const node: FileNode = {
        id: createDeterministicId('file:test'),
        kind: 'File',
        schema_version: 'v0.1',
        fileId: 'file:test',
        path: 'src/index.ts',
        packageName: 'example',
        commitSha: 'abc123',
        language: 'typescript',
        stale: false,
      };

      store.beginTransaction();
      store.putNode(node);
      store.commit();

      expect(store.getNode(node.id)).toEqual(node);
    });

    it('rolls back a transaction', () => {
      const node: FileNode = {
        id: createDeterministicId('file:test'),
        kind: 'File',
        schema_version: 'v0.1',
        fileId: 'file:test',
        path: 'src/index.ts',
        packageName: 'example',
        commitSha: 'abc123',
        language: 'typescript',
        stale: false,
      };

      store.putNode(node);
      store.beginTransaction();
      const anotherNode: FileNode = {
        id: createDeterministicId('file:test2'),
        kind: 'File',
        schema_version: 'v0.1',
        fileId: 'file:test2',
        path: 'src/other.ts',
        packageName: 'example',
        commitSha: 'abc123',
        language: 'typescript',
        stale: false,
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
        kind: 'REFERS_TO',
        schema_version: 'v0.1',
        from: nodeA,
        to: nodeB,
        range: {
          range_kind: 'byte_offset',
          start_byte: 0,
          end_byte: 1,
        },
        referenceKind: 'read',
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
        kind: 'REFERS_TO',
        schema_version: 'v0.1',
        from: nodeA,
        to: nodeB,
        range: {
          range_kind: 'byte_offset',
          start_byte: 0,
          end_byte: 1,
        },
        referenceKind: 'read',
      };
      const edge2: GraphEdge = {
        id: createDeterministicId('a'),
        kind: 'REFERS_TO',
        schema_version: 'v0.1',
        from: nodeB,
        to: nodeA,
        range: {
          range_kind: 'byte_offset',
          start_byte: 2,
          end_byte: 3,
        },
        referenceKind: 'read',
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
        kind: 'REFERS_TO',
        schema_version: 'v0.1',
        from: nodeA,
        to: nodeB,
        range: {
          range_kind: 'byte_offset',
          start_byte: 0,
          end_byte: 1,
        },
        referenceKind: 'read',
      };
      const edge2: GraphEdge = {
        id: createDeterministicId('edge-2'),
        kind: 'DEFINES',
        schema_version: 'v0.1',
        from: nodeB,
        to: nodeC,
        range: {
          range_kind: 'byte_offset',
          start_byte: 2,
          end_byte: 4,
        },
        definitionKind: 'definition',
      };

      store.putEdge(edge1);
      store.putEdge(edge2);

      const fromA = store.getEdges({ from: nodeA });
      expect(fromA).toHaveLength(1);
      expect(fromA[0]).toEqual(edge1);

      const toC = store.getEdges({ to: nodeC });
      expect(toC).toHaveLength(1);
      expect(toC[0]).toEqual(edge2);

      const hasPart = store.getEdges({ kind: 'DEFINES' });
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

describe('InMemoryRelationalStore', () => {
  it('stores and lists records deterministically', () => {
    const store = new InMemoryRelationalStore();

    store.putFile({
      file_id: 'b',
      path: 'src/b.ts',
      package_name: 'pkg',
      commit_sha: 'commit',
      language: 'typescript',
      content_hash: 'hash-b',
      stale: false,
    });
    store.putFile({
      file_id: 'a',
      path: 'src/a.ts',
      package_name: 'pkg',
      commit_sha: 'commit',
      language: 'typescript',
      content_hash: 'hash-a',
      stale: false,
    });

    const files = store.listFiles();
    expect(files[0]?.file_id).toBe('a');
    expect(files[1]?.file_id).toBe('b');
  });

  it('rolls back relational transactions', () => {
    const store = new InMemoryRelationalStore();
    store.putCommit({
      commit_sha: 'a',
      timestamp: 't',
      author: 'author',
      message: 'message',
    });

    store.beginTransaction();
    store.putCommit({
      commit_sha: 'b',
      timestamp: 't2',
      author: 'author2',
      message: 'message2',
    });
    store.rollback();

    expect(store.listCommits()).toHaveLength(1);
    expect(store.listCommits()[0]?.commit_sha).toBe('a');
  });
});
