import { describe, expect, it } from 'vitest';

import { EdgeType, isValidTypeRole, NodeRole, NodeType, VALID_ROLES_BY_TYPE } from './types';

describe('graph types', () => {
  it('has exactly 6 node types', () => {
    expect(Object.values(NodeType)).toHaveLength(6);
  });

  it('has exactly 20 node roles', () => {
    expect(Object.values(NodeRole)).toHaveLength(20);
  });

  it('has exactly 12 edge types', () => {
    expect(Object.values(EdgeType)).toHaveLength(12);
  });

  describe('type-role constraint matrix', () => {
    it('has all 6 node types in VALID_ROLES_BY_TYPE', () => {
      expect(Object.keys(VALID_ROLES_BY_TYPE)).toHaveLength(6);
    });

    it('knowledge type has 6 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Knowledge]).toHaveLength(6);
    });

    it('issue type has 2 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Issue]).toHaveLength(2);
    });

    it('action type has 5 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Action]).toHaveLength(5);
    });

    it('artifact type has 5 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Artifact]).toHaveLength(5);
    });

    it('context type has 1 valid role', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Context]).toHaveLength(1);
    });

    it('meta type has 1 valid role', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Meta]).toHaveLength(1);
    });
  });

  describe('isValidTypeRole validation', () => {
    it('accepts valid knowledge type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Decision)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Requirement)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Constraint)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Principle)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Finding)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Research)).toBe(true);
    });

    it('accepts valid issue type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Issue, NodeRole.Problem)).toBe(true);
      expect(isValidTypeRole(NodeType.Issue, NodeRole.Error)).toBe(true);
    });

    it('accepts valid action type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Action, NodeRole.Task)).toBe(true);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Solution)).toBe(true);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Fix)).toBe(true);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Workflow)).toBe(true);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Command)).toBe(true);
    });

    it('accepts valid artifact type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Example)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.CodePattern)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Technology)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Project)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.FileContext)).toBe(true);
    });

    it('accepts valid context type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Context, NodeRole.Conversation)).toBe(true);
    });

    it('accepts valid meta type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Meta, NodeRole.System)).toBe(true);
    });

    it('rejects invalid type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Task)).toBe(false);
      expect(isValidTypeRole(NodeType.Issue, NodeRole.Decision)).toBe(false);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Problem)).toBe(false);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Error)).toBe(false);
      expect(isValidTypeRole(NodeType.Context, NodeRole.Task)).toBe(false);
      expect(isValidTypeRole(NodeType.Meta, NodeRole.Decision)).toBe(false);
    });
  });
});
