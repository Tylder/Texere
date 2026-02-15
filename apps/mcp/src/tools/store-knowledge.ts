import { z } from 'zod';

import { type NodeRole, NodeType, type StoreNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const knowledgeNodeSchema = z.object({
  role: z.enum(['constraint', 'decision', 'finding', 'pitfall', 'principle', 'requirement']),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  anchor_to: z.array(z.string().min(1)).optional(),
  sources: z.array(z.string().min(1)).optional(),
});

const inputSchema = z.object({
  nodes: z.array(knowledgeNodeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

export const storeKnowledgeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_knowledge',
  description:
    'Store knowledge nodes (decisions, findings, principles, constraints, pitfalls, requirements). ' +
    'Content must pass the Recall Test: an agent finding this node later can act on it without the original source. ' +
    'Include rationale for decisions, evidence for findings, reasoning for principles, mechanisms for constraints, traps+fixes for pitfalls. ' +
    "Use 'sources' with URLs/file paths to auto-create provenance links.",
  inputSchema,
  execute: ({ db }, input) => {
    const minimal = input.minimal ?? true;
    const nodeInputs: StoreNodeInput[] = input.nodes.map((n) => ({
      type: NodeType.Knowledge,
      role: n.role as NodeRole,
      title: n.title,
      content: n.content,
      ...(n.tags !== undefined ? { tags: n.tags } : {}),
      importance: n.importance,
      confidence: n.confidence,
      ...(n.anchor_to !== undefined ? { anchor_to: n.anchor_to } : {}),
      ...(n.sources !== undefined ? { sources: n.sources } : {}),
    }));

    if (nodeInputs.length === 1) {
      const result = minimal
        ? db.storeNode(nodeInputs[0]!, { minimal: true })
        : db.storeNode(nodeInputs[0]!);
      return ok({ nodes: [result] } as unknown as Record<string, unknown>);
    }

    const results = minimal
      ? db.storeNode(nodeInputs, { minimal: true })
      : db.storeNode(nodeInputs);
    return ok({ nodes: results } as unknown as Record<string, unknown>);
  },
};
