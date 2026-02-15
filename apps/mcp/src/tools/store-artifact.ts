import { z } from 'zod';

import { EdgeType, type NodeRole, NodeType, type StoreNodeInput } from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

const artifactNodeSchema = z.object({
  temp_id: z.string().min(1).optional(),
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
  edges: z
    .array(
      z.object({
        source_id: z.string().min(1),
        target_id: z.string().min(1),
        type: z.nativeEnum(EdgeType),
      }),
    )
    .max(50)
    .optional(),
  minimal: z.boolean().optional(),
});

export const storeArtifactTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_store_artifact',
  description:
    'Store artifact nodes (code_patterns, concepts, examples, technologies). ' +
    'code_patterns MUST include actual code snippets. examples MUST include the concrete instance. ' +
    'concepts must explain the mechanism (how it works, not just what it is). ' +
    'technologies must capture differentiators, capabilities, and limitations. ' +
    "Supports 'temp_id' on nodes and optional 'edges' array for atomic node+edge creation within a single call.",
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
      ...(n.temp_id !== undefined ? { temp_id: n.temp_id } : {}),
    }));

    // If edges present, use new atomic function
    if (input.edges && input.edges.length > 0) {
      const result = minimal
        ? db.storeNodesWithEdges(nodeInputs, input.edges, { minimal: true })
        : db.storeNodesWithEdges(nodeInputs, input.edges);
      return ok(result as unknown as Record<string, unknown>);
    }

    // No edges — use existing storeNode path, then merge temp_ids into response
    let storedNodes;
    if (nodeInputs.length === 1) {
      const result = minimal
        ? db.storeNode(nodeInputs[0]!, { minimal: true })
        : db.storeNode(nodeInputs[0]!);
      storedNodes = [result];
    } else {
      storedNodes = minimal
        ? db.storeNode(nodeInputs, { minimal: true })
        : db.storeNode(nodeInputs);
    }

    // Merge temp_ids from input onto response nodes (by array index)
    const nodesWithTempIds = (Array.isArray(storedNodes) ? storedNodes : [storedNodes]).map(
      (node, i) => {
        const tempId = input.nodes[i]?.temp_id;
        return tempId ? { ...node, temp_id: tempId } : node;
      },
    );
    return ok({ nodes: nodesWithTempIds } as unknown as Record<string, unknown>);
  },
};
