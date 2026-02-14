import { z } from 'zod';

import { EdgeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const edgeSchema = z.object({
  source_id: z.string().min(1),
  target_id: z.string().min(1),
  type: z.nativeEnum(EdgeType),
  strength: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const singleInputSchema = edgeSchema.extend({
  minimal: z.boolean().optional(),
});

const batchInputSchema = z.object({
  edges: z.array(edgeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

export const createEdgeTool: ToolDefinition<typeof singleInputSchema> = {
  name: 'texere_create_edge',
  description: 'Create a single edge between two nodes.',
  inputSchema: singleInputSchema,
  execute: ({ db }, input) => {
    const { minimal, ...edgeData } = input;
    const createEdge = db.createEdge.bind(db) as (...args: unknown[]) => unknown;
    const raw = createEdge(edgeData, minimal ? { minimal: true } : undefined);
    const result = raw as { id: string };
    return ok({ edge: minimal ? { id: result.id } : result });
  },
};

export const createEdgesTool: ToolDefinition<typeof batchInputSchema> = {
  name: 'texere_create_edges',
  description: 'Create multiple edges atomically (max 50).',
  inputSchema: batchInputSchema,
  execute: ({ db }, input) => {
    const createEdge = db.createEdge.bind(db) as (...args: unknown[]) => unknown;
    const raw = createEdge(input.edges, input.minimal ? { minimal: true } : undefined);
    const results = raw as Array<{ id: string }>;
    return ok({ edges: input.minimal ? results.map((e) => ({ id: e.id })) : results });
  },
};
