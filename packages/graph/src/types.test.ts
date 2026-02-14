import { describe, expect, it } from 'vitest';

import {
  EdgeType,
  isValidTypeRole,
  NodeRole,
  NodeType,
  VALID_ROLES_BY_TYPE,
  type Node,
  type SearchMode,
  type SearchOptions,
} from './types';

describe('graph types', () => {
  it('has exactly 7 node types', () => {
    expect(Object.values(NodeType)).toHaveLength(7);
  });

  it('has exactly 26 node roles', () => {
    expect(Object.values(NodeRole)).toHaveLength(26);
  });

  it('has exactly 16 edge types', () => {
    expect(Object.values(EdgeType)).toHaveLength(16);
  });

  it('has new v1.2 node roles', () => {
    expect(NodeType.Source).toBe('source');
    expect(NodeRole.Concept).toBe('concept');
    expect(NodeRole.Pitfall).toBe('pitfall');
  });

  it('has new v1.2 edge types', () => {
    expect(EdgeType.BasedOn).toBe('BASED_ON');
    expect(EdgeType.RelatedTo).toBe('RELATED_TO');
    expect(EdgeType.About).toBe('ABOUT');
    expect(EdgeType.IsA).toBe('IS_A');
  });

  describe('type-role constraint matrix', () => {
    it('has all 7 node types in VALID_ROLES_BY_TYPE', () => {
      expect(Object.keys(VALID_ROLES_BY_TYPE)).toHaveLength(7);
    });

    it('knowledge type has 7 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Knowledge]).toHaveLength(7);
    });

    it('issue type has 2 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Issue]).toHaveLength(2);
    });

    it('action type has 5 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Action]).toHaveLength(5);
    });

    it('artifact type has 6 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Artifact]).toHaveLength(6);
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
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Pitfall)).toBe(true);
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

    it('artifact type has 6 valid roles (Source removed)', () => {
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.CodePattern)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Concept)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Example)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.FileContext)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Project)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Technology)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.WebUrl)).toBe(false);
    });

    it('source type has 4 valid roles', () => {
      expect(VALID_ROLES_BY_TYPE[NodeType.Source]).toHaveLength(4);
      expect(isValidTypeRole(NodeType.Source, NodeRole.WebUrl)).toBe(true);
      expect(isValidTypeRole(NodeType.Source, NodeRole.FilePath)).toBe(true);
      expect(isValidTypeRole(NodeType.Source, NodeRole.Repository)).toBe(true);
      expect(isValidTypeRole(NodeType.Source, NodeRole.ApiDoc)).toBe(true);
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

  describe('v2 schema types', () => {
    it('Node interface does not have embedding property', () => {
      const node = {} as Node;
      expect('embedding' in node).toBe(false);
    });

    it('SearchOptions accepts mode field', () => {
      const opts: SearchOptions = { query: 'test', mode: 'hybrid' };
      expect(opts.mode).toBe('hybrid');
    });

    it('SearchMode accepts all valid values', () => {
      const modes: SearchMode[] = ['auto', 'keyword', 'semantic', 'hybrid'];
      expect(modes).toHaveLength(4);
    });
  });
});
