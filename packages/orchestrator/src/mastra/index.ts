import { Mastra } from '@mastra/core';

import { questionAnswererAgent } from './agents/question-answerer.js';
import { answerQuestionWorkflow } from './workflows/answer-question.js';

/**
 * Mastra instance - central orchestration hub.
 * Per spec §2.2 and §3.
 * Registers agents and workflows for access throughout the application.
 */
export const mastra = new Mastra({
  agents: {
    questionAnswerer: questionAnswererAgent,
  },
  workflows: {
    answerQuestion: answerQuestionWorkflow,
  },
});
