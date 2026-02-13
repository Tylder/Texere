import { z } from 'zod';

import { NodeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  query: z.string(),
  type: z.nativeEnum(NodeType).optional(),
  tags: z.array(z.string().min(1)).optional(),
  min_importance: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const searchTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_search',
  description: 'FTS5 search with type/tag/importance filters.',
  inputSchema,
  execute: ({ db }, input) => {
    const searchOptions = {
      query: input.query,
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.min_importance !== undefined ? { minImportance: input.min_importance } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    };
    const results = db.search(searchOptions);

    return ok({ results });
  },
};
