import { z } from 'zod';

import { EdgeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  source_id: z.string().min(1),
  target_id: z.string().min(1),
  type: z.nativeEnum(EdgeType),
  strength: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const createEdgeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_create_edge',
  description: 'Create an edge between two nodes.',
  inputSchema,
  execute: ({ db }, input) => {
    const edgeInput = {
      source_id: input.source_id,
      target_id: input.target_id,
      type: input.type,
      ...(input.strength !== undefined ? { strength: input.strength } : {}),
      ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    };
    const edge = db.createEdge(edgeInput);

    return ok({ edge });
  },
};
