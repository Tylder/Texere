import { z } from 'zod';

import {
  NodeRole,
  NodeScope,
  NodeSource,
  NodeStatus,
  NodeType,
  type StoreNodeInput,
} from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const singleNodeSchema = z.object({
  type: z.nativeEnum(NodeType),
  role: z.nativeEnum(NodeRole),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.nativeEnum(NodeSource).optional(),
  status: z.nativeEnum(NodeStatus).optional(),
  scope: z.nativeEnum(NodeScope).optional(),
  anchor_to: z.array(z.string().min(1)).optional(),
});

const inputSchema = z.union([
  singleNodeSchema.extend({ minimal: z.boolean().optional() }),
  z.array(singleNodeSchema).min(1).max(50),
]);

const toNodeInput = (item: z.infer<typeof singleNodeSchema>): StoreNodeInput => {
  const nodeInput: StoreNodeInput = {
    type: item.type,
    role: item.role,
    title: item.title,
    content: item.content,
  };

  if (item.tags !== undefined) nodeInput.tags = item.tags;
  if (item.importance !== undefined) nodeInput.importance = item.importance;
  if (item.confidence !== undefined) nodeInput.confidence = item.confidence;
  if (item.status !== undefined) nodeInput.status = item.status;
  if (item.scope !== undefined) nodeInput.scope = item.scope;
  if (item.anchor_to !== undefined) nodeInput.anchor_to = item.anchor_to;

  return nodeInput;
};

export const storeNodeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_node',
  description: 'Create immutable node and optional anchors.',
  inputSchema,
  execute: ({ db }, input) => {
    if (Array.isArray(input)) {
      const nodeInputs = input.map(toNodeInput);
      const nodes = db.storeNode(nodeInputs);
      return ok({ nodes } as unknown as Record<string, unknown>);
    }

    const nodeInput = toNodeInput(input);
    const minimal = input.minimal ?? false;
    const result = minimal ? db.storeNode(nodeInput, { minimal: true }) : db.storeNode(nodeInput);
    return ok({ node: result } as unknown as Record<string, unknown>);
  },
};
