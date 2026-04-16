import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(250),
});

export const deleteEdgesTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_delete_edges',
  description: 'Hard-delete up to 250 edges by ID and return per-ID deletion status.',
  inputSchema,
  execute: ({ db }, input) => {
    const deleted = db.deleteEdges(input.ids);

    return ok({ deleted });
  },
};
