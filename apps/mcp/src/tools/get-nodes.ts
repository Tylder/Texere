import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  include_edges: z.boolean().optional(),
});

export const getNodesTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_get_nodes',
  description: 'Read up to 200 nodes by ID with optional edges.',
  inputSchema,
  execute: ({ db }, input) => {
    const nodes =
      input.include_edges === undefined
        ? db.getNodes(input.ids)
        : db.getNodes(input.ids, { includeEdges: input.include_edges });

    return ok({ nodes });
  },
};
