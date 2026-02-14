import { z } from 'zod';

import { NodeRole, NodeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const searchOptionsSchema = z.object({
  query: z.string(),
  type: z.union([z.nativeEnum(NodeType), z.array(z.nativeEnum(NodeType))]).optional(),
  role: z.nativeEnum(NodeRole).optional(),
  tags: z.array(z.string().min(1)).optional(),
  tag_mode: z.enum(['all', 'any']).optional(),
  min_importance: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  mode: z.enum(['auto', 'keyword', 'semantic', 'hybrid']).optional().default('auto'),
});

const inputSchema = z.object({
  queries: z.array(searchOptionsSchema).min(1).max(50),
});

export const searchBatchTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_search_batch',
  description: 'Run multiple searches in one call. Results indexed by query position.',
  inputSchema,
  execute: async ({ db }, input) => {
    const searchQueries = input.queries.map((q) => ({
      query: q.query,
      ...(q.type !== undefined ? { type: q.type } : {}),
      ...(q.role !== undefined ? { role: q.role } : {}),
      ...(q.tags !== undefined ? { tags: q.tags } : {}),
      ...(q.tag_mode !== undefined ? { tagMode: q.tag_mode } : {}),
      ...(q.min_importance !== undefined ? { minImportance: q.min_importance } : {}),
      ...(q.limit !== undefined ? { limit: q.limit } : {}),
      ...(q.mode !== undefined ? { mode: q.mode } : {}),
    }));

    const results = db.searchBatch(searchQueries);
    return ok({ results });
  },
};
