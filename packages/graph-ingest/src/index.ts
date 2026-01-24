import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PolicyNode, PolicySelection, ProjectionEnvelope } from '@repo/graph-core';
import type { GraphStore } from '@repo/graph-store';

export interface RepoIngestInput {
  repoPath: string;
  repoUrl: string;
  commit: string;
  projectId: string;
  policySelection?: PolicySelection;
}

export interface IngestResult {
  artifact_root_id: string;
  artifact_state_id: string;
  node_count: number;
  edge_count: number;
}

export interface IngestionConnector {
  canHandle(sourceKind: string): boolean;
  ingest(input: RepoIngestInput, store: GraphStore): Promise<IngestResult>;
}

export async function ingestRepo(
  input: RepoIngestInput,
  store: GraphStore,
  connector: IngestionConnector,
): Promise<IngestResult> {
  if (!connector.canHandle('repo')) {
    throw new Error('Connector does not support repo ingestion');
  }

  return connector.ingest(input, store);
}

export async function writeJsonDumps(options: {
  store: GraphStore;
  projection?: ProjectionEnvelope;
  outputDir?: string;
}): Promise<void> {
  const outputDir = options.outputDir ?? path.join('.', 'tmp', 'graph-dump');
  await mkdir(outputDir, { recursive: true });

  const nodes = options.store.listNodes();
  const policies = nodes.filter((node): node is PolicyNode => node.kind === 'Policy');

  await writeFile(
    path.join(outputDir, 'artifacts.json'),
    JSON.stringify({ nodes: nodes.filter((node) => node.kind !== 'Policy') }, null, 2),
    'utf-8',
  );

  await writeFile(
    path.join(outputDir, 'policies.json'),
    JSON.stringify({ policies }, null, 2),
    'utf-8',
  );

  if (options.projection) {
    await writeFile(
      path.join(outputDir, 'projection.json'),
      JSON.stringify(options.projection, null, 2),
      'utf-8',
    );
  }

  await writeFile(
    path.join(outputDir, 'graph_dump_summary.json'),
    JSON.stringify(
      {
        node_count: nodes.length,
        policy_count: policies.length,
        projection: options.projection?.projection_name ?? null,
      },
      null,
      2,
    ),
    'utf-8',
  );
}
