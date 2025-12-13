/**
 * @file Shared Types Tests
 * @description Unit tests for LangGraph orchestrator state types
 * @reference testing_specification.md §3–7
 * @reference langgraph_orchestrator_spec.md §5.1
 */

import { describe, it, expect } from 'vitest';

import {
  AnswerQuestionInputSchema,
  type AnswerQuestionInput,
  type TaskContext,
  type ToolCallSummary,
  type WorkflowResult,
  type AnswerQuestionResult,
} from './types.js';

describe('Types (langgraph_orchestrator_spec.md §5.1)', () => {
  describe('TaskContext', () => {
    it('requires repoPath', () => {
      const context: TaskContext = {
        repoPath: '/path/to/repo',
      };

      expect(context.repoPath).toBe('/path/to/repo');
    });

    it('optionally includes maxDepth', () => {
      const context: TaskContext = {
        repoPath: '/path/to/repo',
        maxDepth: 5,
      };

      expect(context.maxDepth).toBe(5);
    });
  });

  describe('ToolCallSummary', () => {
    it('contains tool name, args, result, and duration', () => {
      const summary: ToolCallSummary = {
        name: 'get_context',
        args: { repoPath: '/repo' },
        result: { context: 'found' },
        duration: 150,
      };

      expect(summary.name).toBe('get_context');
      expect(summary.args).toEqual({ repoPath: '/repo' });
      expect(summary.result).toEqual({ context: 'found' });
      expect(summary.duration).toBe(150);
    });
  });

  describe('WorkflowResult', () => {
    it('includes optional answer and required toolCalls', () => {
      const result: WorkflowResult = {
        answer: 'The answer is 42',
        toolCalls: [],
      };

      expect(result.answer).toBe('The answer is 42');
      expect(Array.isArray(result.toolCalls)).toBe(true);
    });

    it('optionally includes token counts', () => {
      const result: WorkflowResult = {
        toolCalls: [],
        tokens: {
          input: 100,
          output: 50,
        },
      };

      expect(result.tokens?.input).toBe(100);
      expect(result.tokens?.output).toBe(50);
    });
  });

  describe('AnswerQuestionInputSchema', () => {
    it('validates repoPath and question as required fields', () => {
      const input: AnswerQuestionInput = {
        repoPath: '/path/to/repo',
        question: 'What does this function do?',
      };

      const validated = AnswerQuestionInputSchema.parse(input);

      expect(validated.repoPath).toBe('/path/to/repo');
      expect(validated.question).toBe('What does this function do?');
    });

    it('accepts optional maxDepth', () => {
      const input: AnswerQuestionInput = {
        repoPath: '/repo',
        question: 'How is this used?',
        maxDepth: 10,
      };

      const validated = AnswerQuestionInputSchema.parse(input);

      expect(validated.maxDepth).toBe(10);
    });

    it('rejects missing repoPath', () => {
      const input = { question: 'What?' };

      expect(() => {
        AnswerQuestionInputSchema.parse(input);
      }).toThrow();
    });

    it('rejects missing question', () => {
      const input = { repoPath: '/repo' };

      expect(() => {
        AnswerQuestionInputSchema.parse(input);
      }).toThrow();
    });

    it('provides helpful descriptions for fields', () => {
      const schema = AnswerQuestionInputSchema.shape;

      expect(schema.repoPath.description).toContain('repository');
      expect(schema.question.description).toContain('Question');
    });
  });

  describe('AnswerQuestionResult', () => {
    it('contains answer, toolCalls, and tokens', () => {
      const result: AnswerQuestionResult = {
        answer: 'The function validates user input',
        toolCalls: [
          {
            name: 'search_symbols',
            args: { query: 'validate' },
            result: { found: 3 },
            duration: 200,
          },
        ],
        tokens: { input: 250, output: 150 },
      };

      expect(result.answer).toBeTruthy();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.tokens).toEqual({ input: 250, output: 150 });
    });

    it('allows null tokens', () => {
      const result: AnswerQuestionResult = {
        answer: 'Result',
        toolCalls: [],
        tokens: null,
      };

      expect(result.tokens).toBeNull();
    });
  });
});
