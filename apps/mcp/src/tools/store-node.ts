import { NodeType, type StoreNodeInput } from '@texere/graph';
import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  type: z.nativeEnum(NodeType),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  anchor_to: z.array(z.string().min(1)).optional(),
});

export const storeNodeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_node',
  description: 'Create immutable node and optional anchors.',
  inputSchema,
  execute: ({ db }, input) => {
    const nodeInput: StoreNodeInput = {
      type: input.type,
      title: input.title,
      content: input.content,
    };

    if (input.tags !== undefined) {
      nodeInput.tags = input.tags;
    }
    if (input.importance !== undefined) {
      nodeInput.importance = input.importance;
    }
    if (input.confidence !== undefined) {
      nodeInput.confidence = input.confidence;
    }
    if (input.anchor_to !== undefined) {
      nodeInput.anchor_to = input.anchor_to;
    }

    const node = db.storeNode(nodeInput);

    return ok({ node });
  },
};
