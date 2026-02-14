import { z } from 'zod';

import { NodeRole, NodeScope, NodeStatus, NodeType, type ReplaceNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  old_id: z.string().min(1),
  type: z.nativeEnum(NodeType),
  role: z.nativeEnum(NodeRole),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  status: z.nativeEnum(NodeStatus).optional(),
  scope: z.nativeEnum(NodeScope).optional(),
  anchor_to: z.array(z.string().min(1)).optional(),
  minimal: z.boolean().optional(),
});

const toReplaceNodeInput = (item: z.infer<typeof inputSchema>): ReplaceNodeInput => {
  const replaceInput: ReplaceNodeInput = {
    old_id: item.old_id,
    type: item.type,
    role: item.role,
    title: item.title,
    content: item.content,
  };

  if (item.tags !== undefined) replaceInput.tags = item.tags;
  if (item.importance !== undefined) replaceInput.importance = item.importance;
  if (item.confidence !== undefined) replaceInput.confidence = item.confidence;
  if (item.status !== undefined) replaceInput.status = item.status;
  if (item.scope !== undefined) replaceInput.scope = item.scope;
  if (item.anchor_to !== undefined) replaceInput.anchor_to = item.anchor_to;

  return replaceInput;
};

export const replaceNodeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_replace_node',
  description:
    'Atomically replace a node: store new node, create REPLACES edge, invalidate old node.',
  inputSchema,
  execute: ({ db }, input) => {
    const replaceInput = toReplaceNodeInput(input);
    const minimal = input.minimal ?? false;
    const result = minimal
      ? db.replaceNode(replaceInput, { minimal: true })
      : db.replaceNode(replaceInput);
    return ok({ node: result } as unknown as Record<string, unknown>);
  },
};
