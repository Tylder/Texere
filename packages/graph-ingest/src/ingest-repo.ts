import { mkdir } from 'node:fs/promises';

import type { PolicySelection } from '@repo/graph-core';
import type { GraphStore } from '@repo/graph-store';

import { detectPackageManager, installDependencies } from './deps.js';
import { loadEnvConfig } from './env.js';
import {
  checkoutIfNeeded,
  resolveIngestRoot,
  resolveRepoSource,
  runGit,
  syncRepo,
} from './repo-git.js';

export interface RepoIngestInput {
  repoPath: string;
  repoUrl: string;
  commit: string;
  projectId: string;
  policySelection?: PolicySelection;
}

export interface RepoSourceIngestOptions {
  commit?: string;
  branch?: string;
  projectId?: string;
  policySelection?: PolicySelection;
  ingestRoot?: string;
  projectRoot?: string;
  installDependencies?: boolean;
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

export async function ingestRepoFromSource(
  source: string,
  store: GraphStore,
  connector: IngestionConnector,
  options?: RepoSourceIngestOptions,
): Promise<IngestResult> {
  const env = await loadEnvConfig(options?.projectRoot);
  const ingestRoot = resolveIngestRoot(options?.ingestRoot ?? env.GRAPH_INGEST_ROOT);
  await mkdir(ingestRoot, { recursive: true });

  const repo = await resolveRepoSource(source, ingestRoot);
  await syncRepo(repo.repoPath, source);
  await checkoutIfNeeded(repo.repoPath, options);

  const shouldInstall = options?.installDependencies ?? true;
  if (shouldInstall) {
    const packageManager = await detectPackageManager(repo.repoPath);
    await installDependencies(repo.repoPath, packageManager);
  }

  const commitHash = await runGit(['rev-parse', 'HEAD'], repo.repoPath);
  const projectId = options?.projectId ?? env.GRAPH_PROJECT_ID ?? 'default';

  store.beginTransaction();
  try {
    const input: RepoIngestInput = {
      repoPath: repo.repoPath,
      repoUrl: repo.repoUrl,
      commit: commitHash,
      projectId,
      ...(options?.policySelection ? { policySelection: options.policySelection } : {}),
    };

    const result = await ingestRepo(input, store, connector);
    store.commit();
    return result;
  } catch (error) {
    store.rollback();
    throw error;
  }
}
