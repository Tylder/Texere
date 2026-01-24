import type { GraphEdge, GraphNode } from '@repo/graph-core';

import type { GraphCLI } from './cli.js';

export type CommandResult = {
  success: boolean;
  message: string;
  data?: unknown;
  error?: Error;
};

export type CommandHandler = (
  args: string[],
  flags: Record<string, string | boolean>,
  cli: GraphCLI,
) => Promise<CommandResult>;

export type CommandDefinition = {
  handler: CommandHandler;
  description: string;
  usage: string;
  aliases?: string[];
};

export type ParsedInput = {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
};

export type GraphSnapshot = {
  version: string;
  generated_at: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    total_nodes: number;
    total_edges: number;
    nodes_by_kind: Record<string, number>;
    edges_by_kind: Record<string, number>;
  };
};

export type IngestResult = {
  success: boolean;
  nodeCount: number;
  edgeCount: number;
  outputDir: string;
};

export type TraceResult = {
  node_id: string;
  depth: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type DiffResult = {
  summary: string;
  added: string[];
  removed: string[];
  modified: string[];
};

export type ProjectionResult = {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};
