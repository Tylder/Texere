// Orchestrator entrypoint
// Exports public API for triggering workflows and accessing agent capabilities.
// See docs/specs/feature/mastra_orchestrator_spec.md §3 for specification.

export { mastra } from './mastra';
export {
  answerQuestion,
  AnswerQuestionParamsSchema,
  AnswerQuestionResultSchema,
  type AnswerQuestionParams,
  type AnswerQuestionResult,
} from './api';

// TODO: Implement additional entrypoints per spec §3.2:
// - runImplementFeature
// - runBugfix
// - runRefactor
// - updateIndexForChanges
