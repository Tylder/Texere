import { z } from 'zod';

import { NodeRole, NodeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  query: z.string(),
  type: z.union([z.nativeEnum(NodeType), z.array(z.nativeEnum(NodeType))]).optional(),
  role: z.nativeEnum(NodeRole).optional(),
  tags: z.array(z.string().min(1)).optional(),
  tag_mode: z.enum(['all', 'any']).optional(),
  min_importance: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  mode: z.enum(['auto', 'keyword', 'semantic', 'hybrid']).optional().default('auto'),
});

export const searchTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_search',
  description:
    'FTS5 search with BM25 ranking, type/role/tag/importance filters. Supports keyword, semantic, and hybrid search modes.',
  inputSchema,
  execute: async ({ db }, input) => {
    const searchOptions = {
      query: input.query,
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.tag_mode !== undefined ? { tagMode: input.tag_mode } : {}),
      ...(input.min_importance !== undefined ? { minImportance: input.min_importance } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
    };
    const results = await db.search(searchOptions);

    return ok({ results });
  },
};
