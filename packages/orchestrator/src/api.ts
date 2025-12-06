import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { mastra } from './mastra';

/**
 * Public API for triggering orchestrator workflows.
 * Per spec §3.2 (Programmatic API).
 */

export const AnswerQuestionParamsSchema = z.object({
  userInput: z.string().describe('User question about the codebase'),
});

export type AnswerQuestionParams = z.infer<typeof AnswerQuestionParamsSchema>;

export const AnswerQuestionResultSchema = z.object({
  ok: z.boolean(),
  answer: z.string().optional(),
  sources: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type AnswerQuestionResult = z.infer<typeof AnswerQuestionResultSchema>;

/**
 * Answer a question about the codebase.
 * Triggers the answerQuestion workflow via the question-answerer agent.
 * Per spec §5.5 (Q&A Workflow).
 */
export async function answerQuestion(
  params: AnswerQuestionParams,
): Promise<AnswerQuestionResult> {
  try {
    const validated = AnswerQuestionParamsSchema.parse(params);

    const workflow = mastra.getWorkflow('answerQuestion');
    if (!workflow) {
      return {
        ok: false,
        error: 'answerQuestion workflow not found',
      };
    }

    const run = await workflow.createRunAsync();
    const result = await run.start({
      inputData: {
        userInput: validated.userInput,
      },
    });

    if (result.status === 'success' && result.result) {
      return {
        ok: true,
        answer: result.result.answer,
        sources: result.result.sources,
      };
    }

    return {
      ok: false,
      error: `Workflow failed with status: ${result.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test suite for orchestrator public API.
 * Per testing_specification §3.1 (colocated patterns).
 * Per mastra_orchestrator_spec §3.2 (Programmatic API).
 */
describe('Orchestrator API (§3.2)', () => {
  describe('AnswerQuestionParamsSchema', () => {
    it('should validate correct input', () => {
      const result = AnswerQuestionParamsSchema.safeParse({
        userInput: 'What does this function do?',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing userInput', () => {
      const result = AnswerQuestionParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string userInput', () => {
      const result = AnswerQuestionParamsSchema.safeParse({
        userInput: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('AnswerQuestionResultSchema', () => {
    it('should validate success result', () => {
      const result = AnswerQuestionResultSchema.safeParse({
        ok: true,
        answer: 'This function processes data',
        sources: ['src/processors/index.ts'],
      });
      expect(result.success).toBe(true);
    });

    it('should validate error result', () => {
      const result = AnswerQuestionResultSchema.safeParse({
        ok: false,
        error: 'Workflow not found',
      });
      expect(result.success).toBe(true);
    });

    it('should require ok field', () => {
      const result = AnswerQuestionResultSchema.safeParse({
        answer: 'This function processes data',
      });
      expect(result.success).toBe(false);
    });
  });
});
