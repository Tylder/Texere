import { z } from 'zod';

import {
  EdgeType,
  isValidTypeRole,
  NodeRole,
  NodeType,
  sanitizeFtsQueryStrict,
} from '@texere/graph';

import { ok } from './helpers.js';
import type { ToolDefinition } from './types.js';

interface ValidationIssue {
  severity: 'error' | 'warning';
  item: 'node' | 'edge';
  index: number;
  message: string;
}

const inputSchema = z.object({
  nodes: z
    .array(
      z.object({
        temp_id: z.string().optional(),
        type: z.nativeEnum(NodeType),
        role: z.nativeEnum(NodeRole),
        title: z.string().min(1),
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
        importance: z.number().min(0).max(1).optional(),
        confidence: z.number().min(0).max(1).optional(),
        sources: z.array(z.string().min(1)).optional(),
        anchor_to: z.array(z.string().min(1)).optional(),
      }),
    )
    .optional()
    .default([]),
  edges: z
    .array(
      z.object({
        source_id: z.string().min(1),
        target_id: z.string().min(1),
        type: z.nativeEnum(EdgeType),
      }),
    )
    .optional()
    .default([]),
});

export const validateTool: ToolDefinition<typeof inputSchema> = {
  name: 'texere_validate',
  description:
    'Validate proposed nodes and edges without writing to database. Returns validation issues.',
  inputSchema,
  execute: async ({ db }, input) => {
    const issues: ValidationIssue[] = [];
    const { nodes, edges } = input;

    if (nodes.length > 50) {
      issues.push({
        severity: 'error',
        item: 'node',
        index: 0,
        message: `Batch size exceeded: ${nodes.length} nodes (max 50)`,
      });
    }
    if (edges.length > 50) {
      issues.push({
        severity: 'error',
        item: 'edge',
        index: 0,
        message: `Batch size exceeded: ${edges.length} edges (max 50)`,
      });
    }

    const tempIds = new Set<string>();
    for (const node of nodes) {
      if (node.temp_id) {
        tempIds.add(node.temp_id);
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;

      if (!isValidTypeRole(node.type, node.role)) {
        issues.push({
          severity: 'error',
          item: 'node',
          index: i,
          message: `Invalid type-role combination: ${node.type}/${node.role}`,
        });
      }

      if (!node.title || node.title.trim().length === 0) {
        issues.push({
          severity: 'error',
          item: 'node',
          index: i,
          message: 'Title is required and must not be empty',
        });
      }

      if (!node.content || node.content.trim().length === 0) {
        issues.push({
          severity: 'error',
          item: 'node',
          index: i,
          message: 'Content is required and must not be empty',
        });
      }
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]!;

      if (edge.source_id === edge.target_id) {
        issues.push({
          severity: 'error',
          item: 'edge',
          index: i,
          message: `Self-referential edge: source_id and target_id are both "${edge.source_id}"`,
        });
      }

      for (const field of ['source_id', 'target_id'] as const) {
        const id = edge[field];
        if (!tempIds.has(id)) {
          const existing = db.getNode(id);
          if (!existing) {
            issues.push({
              severity: 'error',
              item: 'edge',
              index: i,
              message: `${field} "${id}" not found in database or proposed nodes`,
            });
          }
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const sanitized = sanitizeFtsQueryStrict(node.title);
      if (sanitized.length === 0) continue;

      try {
        const results = await db.search({ query: sanitized, mode: 'keyword', limit: 5 });
        if (results.length > 0) {
          issues.push({
            severity: 'warning',
            item: 'node',
            index: i,
            message: `Similar node exists: "${results[0]!.title}"`,
          });
        }
      } catch {
        // FTS5 match failure on unusual title content — non-fatal
      }
    }

    const hasErrors = issues.some((issue) => issue.severity === 'error');

    return ok({
      valid: !hasErrors,
      issues,
    });
  },
};
