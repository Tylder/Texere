import { z } from 'zod';

import { EdgeType, NodeRole, NodeType, type AboutOptions } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const inputSchema = z.object({
  query: z.string().min(1),
  type: z.union([z.nativeEnum(NodeType), z.array(z.nativeEnum(NodeType))]).optional(),
  role: z.nativeEnum(NodeRole).optional(),
  tags: z.array(z.string().min(1)).optional(),
  tag_mode: z.enum(['all', 'any']).optional(),
  min_importance: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional(),
  max_depth: z.number().int().min(0).max(5).optional(),
  edge_type: z.nativeEnum(EdgeType).optional(),
  mode: z.enum(['auto', 'keyword', 'semantic', 'hybrid']).optional().default('auto'),
});

export const aboutTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_about',
  description:
    'Search for seeds with optional semantic/hybrid modes, then traverse their neighborhood.',
  inputSchema,
  execute: async ({ db }, input) => {
    const aboutOptions: AboutOptions = {
      query: input.query,
    };

    if (input.type !== undefined) {
      aboutOptions.type = input.type;
    }
    if (input.role !== undefined) {
      aboutOptions.role = input.role;
    }
    if (input.tags !== undefined) {
      aboutOptions.tags = input.tags;
    }
    if (input.tag_mode !== undefined) {
      aboutOptions.tagMode = input.tag_mode;
    }
    if (input.min_importance !== undefined) {
      aboutOptions.minImportance = input.min_importance;
    }
    if (input.limit !== undefined) {
      aboutOptions.limit = input.limit;
    }
    if (input.direction !== undefined) {
      aboutOptions.direction = input.direction;
    }
    if (input.max_depth !== undefined) {
      aboutOptions.maxDepth = input.max_depth;
    }
    if (input.edge_type !== undefined) {
      aboutOptions.edgeType = input.edge_type;
    }
    if (input.mode !== undefined) {
      aboutOptions.mode = input.mode;
    }

    const results = await db.about(aboutOptions);

    return ok({ results });
  },
};
