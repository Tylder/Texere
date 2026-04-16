import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(250),
});

export const invalidateNodesTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_invalidate_nodes',
  description: 'Invalidate up to 250 nodes by setting invalidated_at; fails if any ID is missing.',
  inputSchema,
  execute: ({ db }, input) => {
    db.invalidateNodes(input.ids);
    const nodes = db.getNodes(input.ids);

    return ok({ nodes });
  },
};
