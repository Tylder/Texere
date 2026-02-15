import { z } from 'zod';

import { type NodeRole, NodeType, type StoreNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const sourceNodeSchema = z.object({
  role: z.enum(['web_url', 'file_path', 'repository', 'api_doc']),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  anchor_to: z.array(z.string().min(1)).optional(),
  sources: z.array(z.string().min(1)).optional(),
});

const inputSchema = z.object({
  nodes: z.array(sourceNodeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

export const storeSourceTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_source',
  description:
    'Store source reference nodes (web_urls, file_paths, repositories, api_docs). ' +
    'These are provenance anchors. ' +
    "Tip: use the 'sources' field on other store tools to auto-create source nodes with BASED_ON edges instead of creating them manually.",
  inputSchema,
  execute: ({ db }, input) => {
    const minimal = input.minimal ?? true;
    const nodeInputs: StoreNodeInput[] = input.nodes.map((n) => ({
      type: NodeType.Source,
      role: n.role as NodeRole,
      title: n.title,
      content: n.content,
      ...(n.tags !== undefined ? { tags: n.tags } : {}),
      importance: n.importance,
      confidence: n.confidence,
      ...(n.anchor_to !== undefined ? { anchor_to: n.anchor_to } : {}),
      ...(n.sources !== undefined ? { sources: n.sources } : {}),
    }));

    if (nodeInputs.length === 1) {
      const result = minimal
        ? db.storeNode(nodeInputs[0]!, { minimal: true })
        : db.storeNode(nodeInputs[0]!);
      return ok({ nodes: [result] } as unknown as Record<string, unknown>);
    }

    const results = minimal
      ? db.storeNode(nodeInputs, { minimal: true })
      : db.storeNode(nodeInputs);
    return ok({ nodes: results } as unknown as Record<string, unknown>);
  },
};
