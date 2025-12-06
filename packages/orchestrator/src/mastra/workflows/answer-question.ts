import { describe, it, expect } from 'vitest';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

/**
 * Answer Question Workflow - read-only workflow for codebase Q&A.
 * Per spec §5.5 (Q&A Workflow).
 *
 * Steps:
 * 1. parseQuestion - Extract structured question from user input
 * 2. generateAnswer - Call agent to answer the question
 */

const parseQuestionStep = createStep({
  id: 'parse-question',
  inputSchema: z.object({
    userInput: z.string().describe('User question about the codebase'),
  }),
  outputSchema: z.object({
    question: z.string().describe('Normalized question'),
    context: z.string().optional().describe('Additional context if provided'),
  }),
  execute: async ({ inputData }) => {
    const { userInput } = inputData;
    // Simple parsing: treat entire input as question for now
    return Promise.resolve({
      question: userInput,
      context: undefined,
    });
  },
});

const generateAnswerStep = createStep({
  id: 'generate-answer',
  inputSchema: z.object({
    question: z.string(),
    context: z.string().optional(),
  }),
  outputSchema: z.object({
    answer: z.string().describe('Answer to the question'),
    sources: z.array(z.string()).optional().describe('File paths or references'),
  }),
  execute: async ({ inputData, mastra }) => {
    const { question } = inputData;

    // Get the agent from the Mastra instance
    const agent = mastra.getAgent('question-answerer');
    if (!agent) {
      throw new Error('question-answerer agent not found');
    }

    // Generate response using agent
    const response = await agent.generate(question);

    return {
      answer: response.text,
      sources: undefined,
    };
  },
});

/**
 * Main workflow: parse question -> generate answer
 */
export const answerQuestionWorkflow = createWorkflow({
  id: 'answer-question',
  inputSchema: z.object({
    userInput: z.string().describe('User question about the codebase'),
  }),
  outputSchema: z.object({
    answer: z.string().describe('Answer to the question'),
    sources: z.array(z.string()).optional().describe('File paths or references'),
  }),
})
  .then(parseQuestionStep)
  .then(generateAnswerStep)
  .commit();

/**
 * Test suite for answer-question workflow.
 * Per testing_specification §3.1 (colocated patterns).
 * Per mastra_orchestrator_spec §5.5 (Q&A Workflow).
 */
describe('Answer Question Workflow (§5.5)', () => {
  it('should have correct schema definitions', () => {
    const inputSchema = answerQuestionWorkflow.inputSchema as z.ZodType;
    const outputSchema = answerQuestionWorkflow.outputSchema as z.ZodType;

    // Validate input schema accepts userInput
    const inputValidation = inputSchema.safeParse({ userInput: 'What is this code?' });
    expect(inputValidation.success).toBe(true);

    // Validate output schema structure
    const outputValidation = outputSchema.safeParse({
      answer: 'This is test code',
      sources: ['test.ts'],
    });
    expect(outputValidation.success).toBe(true);
  });

  it('should have correct workflow id', () => {
    expect(answerQuestionWorkflow.id).toBe('answer-question');
  });

  it('should have defined steps', () => {
    // Basic structure check - workflow should be committable
    expect(answerQuestionWorkflow).toBeDefined();
    expect(typeof answerQuestionWorkflow).toBe('object');
  });
});
