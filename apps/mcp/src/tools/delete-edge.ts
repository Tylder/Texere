import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  id: z.string().min(1),
});

export const deleteEdgeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_delete_edge',
  description: 'Hard-delete an edge by ID.',
  inputSchema,
  execute: ({ db }, input) => {
    const deleted = db.deleteEdge(input.id);

    return ok({ deleted });
  },
};
