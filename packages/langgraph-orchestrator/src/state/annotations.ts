/**
 * LangGraph state definitions with Annotated reducer pattern.
 * Spec reference: langgraph_orchestrator_spec.md §5.1
 */
import type { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

import type { ClassificationResult } from './classifier-types.js';
import type { TaskContext, WorkflowResult } from './types.js';

/**
 * TaskState accumulates messages and stores task context.
 * Messages are appended via reducer; context/result replace.
 */
export const TaskState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
  }),
  taskContext: Annotation<TaskContext>({
    reducer: (_, b) => b,
  }),
  result: Annotation<WorkflowResult | null>({
    reducer: (_, b) => b,
  }),
});

// Extract the inferred type from the Annotation
type StateType = {
  messages: BaseMessage[];
  taskContext: TaskContext;
  result: WorkflowResult | null;
};

export type TaskStateType = StateType;

/**
 * ClassifyState: simple state for text classification.
 * Messages are appended; classification replaces.
 */
export const ClassifyState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
  }),
  classification: Annotation<ClassificationResult | null>({
    reducer: (_, b) => b,
  }),
});

// Extract the inferred type from the Annotation
type ClassifyStateInfo = {
  messages: BaseMessage[];
  classification: ClassificationResult | null;
};

export type ClassifyStateType = ClassifyStateInfo;
