import { z } from 'zod';

import { EdgeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  start_id: z.string().min(1),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional(),
  max_depth: z.number().int().min(0).max(5).optional(),
  limit: z.number().int().min(1).max(250).optional(),
  cursor: z.string().min(1).optional(),
  edge_type: z.nativeEnum(EdgeType).optional(),
});

export const traverseTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_traverse',
  description: 'Traverse graph from start node with recursive CTE and cursor pagination.',
  inputSchema,
  execute: ({ db }, input) => {
    const traverseOptions = {
      startId: input.start_id,
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.max_depth !== undefined ? { maxDepth: input.max_depth } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
      ...(input.edge_type !== undefined ? { edgeType: input.edge_type } : {}),
    };
    const page = db.traverse(traverseOptions);

    return ok({
      results: page.results,
      page: {
        next_cursor: page.page.nextCursor,
        has_more: page.page.hasMore,
        returned: page.page.returned,
        limit: page.page.limit,
        order: page.page.order,
        ...(page.page.mode !== undefined ? { mode: page.page.mode } : {}),
      },
    });
  },
};
