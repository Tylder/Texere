import { z } from 'zod';

import { EdgeType, NodeRole, NodeType, type SearchGraphOptions } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  query: z.string().min(1),
  type: z.union([z.nativeEnum(NodeType), z.array(z.nativeEnum(NodeType))]).optional(),
  role: z.nativeEnum(NodeRole).optional(),
  tags: z.array(z.string().min(1)).optional(),
  tag_mode: z.enum(['all', 'any']).optional(),
  min_importance: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(250).optional(),
  cursor: z.string().min(1).optional(),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional(),
  max_depth: z.number().int().min(0).max(5).optional(),
  edge_type: z.nativeEnum(EdgeType).optional(),
  mode: z.enum(['auto', 'keyword', 'semantic', 'hybrid']).optional().default('auto'),
  seed_limit: z.number().int().min(1).max(250).optional(),
  min_seed_relevance: z.number().min(0).max(1).optional(),
});

export const searchGraphTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_search_graph',
  description:
    'Search for seeds with optional semantic/hybrid modes, then traverse their neighborhood with cursor pagination over the final result set.',
  inputSchema,
  execute: async ({ db }, input) => {
    const searchGraphOptions: SearchGraphOptions = {
      query: input.query,
    };

    if (input.type !== undefined) {
      searchGraphOptions.type = input.type;
    }
    if (input.role !== undefined) {
      searchGraphOptions.role = input.role;
    }
    if (input.tags !== undefined) {
      searchGraphOptions.tags = input.tags;
    }
    if (input.tag_mode !== undefined) {
      searchGraphOptions.tagMode = input.tag_mode;
    }
    if (input.min_importance !== undefined) {
      searchGraphOptions.minImportance = input.min_importance;
    }
    if (input.limit !== undefined) {
      searchGraphOptions.limit = input.limit;
    }
    if (input.cursor !== undefined) {
      searchGraphOptions.cursor = input.cursor;
    }
    if (input.direction !== undefined) {
      searchGraphOptions.direction = input.direction;
    }
    if (input.max_depth !== undefined) {
      searchGraphOptions.maxDepth = input.max_depth;
    }
    if (input.edge_type !== undefined) {
      searchGraphOptions.edgeType = input.edge_type;
    }
    if (input.mode !== undefined) {
      searchGraphOptions.mode = input.mode;
    }
    if (input.seed_limit !== undefined) {
      searchGraphOptions.seedLimit = input.seed_limit;
    }
    if (input.min_seed_relevance !== undefined) {
      searchGraphOptions.minSeedRelevance = input.min_seed_relevance;
    }

    const page = await db.searchGraph(searchGraphOptions);

    return ok({
      results: page.results,
      page: {
        next_cursor: page.page.nextCursor,
        has_more: page.page.hasMore,
        returned: page.page.returned,
        limit: page.page.limit,
        order: page.page.order,
        ...(page.page.mode !== undefined ? { mode: page.page.mode } : {}),
      },
    });
  },
};
