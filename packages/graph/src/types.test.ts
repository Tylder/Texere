import { describe, expect, it } from 'vitest';

import { EdgeType, isValidTypeRole, NodeRole, NodeType } from './types.js';

describe('graph types', () => {
  describe('isValidTypeRole validation', () => {
    it('accepts valid knowledge type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Decision)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Requirement)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Constraint)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Principle)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Finding)).toBe(true);
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Pitfall)).toBe(true);
    });

    it('accepts valid issue type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Issue, NodeRole.Problem)).toBe(true);
      expect(isValidTypeRole(NodeType.Issue, NodeRole.Error)).toBe(true);
    });

    it('accepts valid action type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Action, NodeRole.Task)).toBe(true);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Solution)).toBe(true);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Workflow)).toBe(true);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Command)).toBe(true);
    });

    it('artifact type has 4 valid roles', () => {
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.CodePattern)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Concept)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Example)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Technology)).toBe(true);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.WebUrl)).toBe(false);
    });

    it('source type has 4 valid roles', () => {
      expect(isValidTypeRole(NodeType.Source, NodeRole.WebUrl)).toBe(true);
      expect(isValidTypeRole(NodeType.Source, NodeRole.FilePath)).toBe(true);
      expect(isValidTypeRole(NodeType.Source, NodeRole.Repository)).toBe(true);
      expect(isValidTypeRole(NodeType.Source, NodeRole.ApiDoc)).toBe(true);
    });

    it('rejects invalid type-role pairs', () => {
      expect(isValidTypeRole(NodeType.Knowledge, NodeRole.Task)).toBe(false);
      expect(isValidTypeRole(NodeType.Issue, NodeRole.Decision)).toBe(false);
      expect(isValidTypeRole(NodeType.Action, NodeRole.Problem)).toBe(false);
      expect(isValidTypeRole(NodeType.Artifact, NodeRole.Error)).toBe(false);
    });
  });

  describe('enum counts', () => {
    it('exposes the complete node type enum surface', () => {
      expect(Object.values(NodeType)).toEqual([
        'knowledge',
        'issue',
        'action',
        'artifact',
        'source',
      ]);
    });

    it('exposes the complete node role enum surface', () => {
      expect(Object.values(NodeRole)).toEqual([
        'constraint',
        'decision',
        'finding',
        'pitfall',
        'principle',
        'requirement',
        'error',
        'problem',
        'command',
        'solution',
        'task',
        'workflow',
        'code_pattern',
        'concept',
        'example',
        'technology',
        'web_url',
        'file_path',
        'repository',
        'api_doc',
      ]);
    });

    it('exposes the complete edge type enum surface', () => {
      expect(Object.values(EdgeType)).toEqual([
        'ALTERNATIVE_TO',
        'ANCHORED_TO',
        'BASED_ON',
        'CAUSES',
        'CONTRADICTS',
        'DEPENDS_ON',
        'EXAMPLE_OF',
        'PART_OF',
        'RELATED_TO',
        'REPLACES',
        'RESOLVES',
      ]);
    });
  });
});
