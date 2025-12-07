/**
 * answerQuestion graph: simple agent → tools → agent loop.
 * Spec reference: langgraph_orchestrator_spec.md §7.1, §8.1
 */
import { END, START, StateGraph } from '@langchain/langgraph';

import { agentNode } from '../nodes/agent-node.js';
import { shouldContinue } from '../nodes/router-nodes.js';
import { toolsNode } from '../nodes/tools-node.js';
import { TaskState } from '../state/annotations.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildAnswerQuestionGraph(): any {
  const graph = new StateGraph(TaskState)
    .addNode('agent', agentNode)
    .addNode('tools', toolsNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, ['tools', END])
    .addEdge('tools', 'agent')
    .compile();

  return graph;
}
