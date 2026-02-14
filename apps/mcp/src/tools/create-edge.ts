import { z } from 'zod';

import { EdgeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const edgeInputSchema = z.object({
  source_id: z.string().min(1),
  target_id: z.string().min(1),
  type: z.nativeEnum(EdgeType),
  strength: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const inputSchema = z.object({
  edges: z.union([edgeInputSchema, z.array(edgeInputSchema).min(1).max(50)]),
  minimal: z.boolean().optional(),
});

export const createEdgeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_create_edge',
  description:
    'Create an edge between two nodes. Accepts a single edge object or an array (max 50, atomic). Use minimal: true to return only { id }.',
  inputSchema,
  execute: ({ db }, input) => {
    const isBatch = Array.isArray(input.edges);
    const createEdge = db.createEdge.bind(db) as (...args: unknown[]) => unknown;
    const raw = createEdge(
      isBatch ? input.edges : input.edges,
      input.minimal ? { minimal: true } : undefined,
    );

    if (isBatch) {
      const results = raw as Array<{ id: string }>;
      return ok({ edges: input.minimal ? results.map((e) => ({ id: e.id })) : results });
    }

    const result = raw as { id: string };
    return ok({ edge: input.minimal ? { id: result.id } : result });
  },
};
