import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  id: z.string().min(1),
  include_edges: z.boolean().optional(),
});

export const getNodeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_get_node',
  description: 'Read node by ID with optional edges.',
  inputSchema,
  execute: ({ db }, input) => {
    const node = input.include_edges === undefined ? db.getNode(input.id) : db.getNode(input.id, { includeEdges: input.include_edges });

    return ok({ node });
  },
};
