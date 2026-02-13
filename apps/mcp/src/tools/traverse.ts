import { EdgeType } from '@texere/graph';
import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  start_id: z.string().min(1),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional(),
  max_depth: z.number().int().min(0).max(5).optional(),
  edge_type: z.nativeEnum(EdgeType).optional(),
});

export const traverseTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_traverse',
  description: 'Traverse graph from start node with recursive CTE.',
  inputSchema,
  execute: ({ db }, input) => {
    const traverseOptions = {
      startId: input.start_id,
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.max_depth !== undefined ? { maxDepth: input.max_depth } : {}),
      ...(input.edge_type !== undefined ? { edgeType: input.edge_type } : {}),
    };
    const results = db.traverse(traverseOptions);

    return ok({ results });
  },
};
