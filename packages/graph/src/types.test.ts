import { describe, expect, it } from 'vitest';

import { isValidTypeRole, NodeRole, NodeType } from './types';

describe('graph types', () => {
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
});
