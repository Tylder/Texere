import { z } from 'zod';

import { NodeRole, NodeScope, NodeStatus, NodeType, type StoreNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const nodeSchema = z.object({
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
  sources: z.array(z.string().min(1)).optional(),
});

const singleInputSchema = nodeSchema.extend({
  minimal: z.boolean().optional(),
});

const batchInputSchema = z.object({
  nodes: z.array(nodeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

const toNodeInput = (item: z.infer<typeof nodeSchema>): StoreNodeInput => {
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
  if (item.sources !== undefined) nodeInput.sources = item.sources;

  return nodeInput;
};

export const storeNodeTool: ToolDefinition<typeof singleInputSchema> = {
  name: 'texere_store_node',
  description: 'Create a single immutable node with optional anchors.',
  inputSchema: singleInputSchema,
  execute: ({ db }, input) => {
    const nodeInput = toNodeInput(input);
    const minimal = input.minimal ?? false;
    const result = minimal ? db.storeNode(nodeInput, { minimal: true }) : db.storeNode(nodeInput);
    return ok({ node: result } as unknown as Record<string, unknown>);
  },
};

export const storeNodesTool: ToolDefinition<typeof batchInputSchema> = {
  name: 'texere_store_nodes',
  description: 'Create multiple immutable nodes atomically (max 50).',
  inputSchema: batchInputSchema,
  execute: ({ db }, input) => {
    const nodeInputs = input.nodes.map(toNodeInput);
    const nodes = db.storeNode(nodeInputs);
    return ok({ nodes } as unknown as Record<string, unknown>);
  },
};
