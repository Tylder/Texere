import { z } from 'zod';

import { type NodeRole, NodeType, type StoreNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const artifactNodeSchema = z.object({
  role: z.enum(['code_pattern', 'concept', 'example', 'technology']),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  anchor_to: z.array(z.string().min(1)).optional(),
  sources: z.array(z.string().min(1)).optional(),
});

const inputSchema = z.object({
  nodes: z.array(artifactNodeSchema).min(1).max(50),
  minimal: z.boolean().optional(),
});

export const storeArtifactTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_artifact',
  description:
    'Store artifact nodes (code_patterns, concepts, examples, technologies). ' +
    'code_patterns MUST include actual code snippets. examples MUST include the concrete instance. ' +
    'concepts must explain the mechanism (how it works, not just what it is). ' +
    'technologies must capture differentiators, capabilities, and limitations.',
  inputSchema,
  execute: ({ db }, input) => {
    const minimal = input.minimal ?? true;
    const nodeInputs: StoreNodeInput[] = input.nodes.map((n) => ({
      type: NodeType.Artifact,
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
