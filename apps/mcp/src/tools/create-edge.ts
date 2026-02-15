import { z } from 'zod';

import { EdgeType } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const edgeSchema = z.object({
  source_id: z.string().min(1),
  target_id: z.string().min(1),
  type: z.nativeEnum(EdgeType),
});

const inputSchema = z.object({
  edges: z.array(edgeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

export const createEdgeTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_create_edge',
  description:
    'Link nodes with typed edges. ' +
    'Use RESOLVES (solution\u2192problem), DEPENDS_ON (dependent\u2192dependency), ' +
    'BASED_ON (derived\u2192source), CAUSES (cause\u2192effect), EXAMPLE_OF (instance\u2192concept). ' +
    'Use RELATED_TO only as last resort.',
  inputSchema,
  execute: ({ db }, input) => {
    const minimal = input.minimal ?? true;
    const createEdge = db.createEdge.bind(db) as (...args: unknown[]) => unknown;

    if (input.edges.length === 1) {
      const raw = createEdge(input.edges[0], minimal ? { minimal: true } : undefined);
      const result = raw as { id: string };
      return ok({ edges: [minimal ? { id: result.id } : result] });
    }

    const raw = createEdge(input.edges, minimal ? { minimal: true } : undefined);
    const results = raw as Array<{ id: string }>;
    return ok({ edges: minimal ? results.map((e) => ({ id: e.id })) : results });
  },
};
