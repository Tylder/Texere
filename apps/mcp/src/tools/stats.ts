import { z } from 'zod';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({}).strict();

export const statsTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_stats',
  description: 'Get node and edge counts by type.',
  inputSchema,
  execute: ({ db }) => {
    const stats = db.stats();
    return ok({ stats });
  },
};
