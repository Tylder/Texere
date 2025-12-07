/**
 * classifyText graph: single-step LLM classification.
 * Spec reference: langgraph_orchestrator_spec.md §7.1, §8.1
 */
import { END, START, StateGraph } from '@langchain/langgraph';

import { classifierNode } from '../nodes/classifier-node.js';
import { ClassifyState } from '../state/annotations.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildClassifyGraph(): any {
  const graph = new StateGraph(ClassifyState)
    .addNode('classifier', classifierNode)
    .addEdge(START, 'classifier')
    .addEdge('classifier', END)
    .compile();

  return graph;
}
