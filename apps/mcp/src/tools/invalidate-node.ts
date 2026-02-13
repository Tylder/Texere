import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  id: z.string().min(1),
});

export const invalidateNodeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_invalidate_node',
  description: 'Invalidate a node by setting invalidated_at.',
  inputSchema,
  execute: ({ db }, input) => {
    db.invalidateNode(input.id);
    const node = db.getNode(input.id);

    return ok({ node });
  },
};
