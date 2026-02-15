import { z } from 'zod';

import { NodeType, type StoreNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const issueNodeSchema = z.object({
  role: z.enum(['error', 'problem']),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  anchor_to: z.array(z.string().min(1)).optional(),
  sources: z.array(z.string().min(1)).optional(),
});

const inputSchema = z.object({
  nodes: z.array(issueNodeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

export const storeIssueTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_issue',
  description:
    'Store issue nodes (errors, problems). ' +
    'Content must describe the specific failure: error message, stack trace context, reproduction conditions, and affected components. ' +
    'Include what was tried and what did not work.',
  inputSchema,
  execute: ({ db }, input) => {
    const minimal = input.minimal ?? true;
    const nodeInputs: StoreNodeInput[] = input.nodes.map((n) => ({
      type: NodeType.Issue,
      role: n.role,
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
