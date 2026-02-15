import { z } from 'zod';

import { type NodeRole, NodeType, type StoreNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const actionNodeSchema = z.object({
  role: z.enum(['command', 'solution', 'task', 'workflow']),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  anchor_to: z.array(z.string().min(1)).optional(),
  sources: z.array(z.string().min(1)).optional(),
});

const inputSchema = z.object({
  nodes: z.array(actionNodeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

export const storeActionTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_action',
  description:
    'Store action nodes (commands, solutions, tasks, workflows). ' +
    'Content must be actionable: include actual commands, step-by-step procedures, or concrete implementation details. ' +
    'An agent should be able to execute the action from the content alone.',
  inputSchema,
  execute: ({ db }, input) => {
    const minimal = input.minimal ?? true;
    const nodeInputs: StoreNodeInput[] = input.nodes.map((n) => ({
      type: NodeType.Action,
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
