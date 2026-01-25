import { mkdir } from 'node:fs/promises';

import type { PolicySelection } from '@repo/graph-core';
import type { GraphStore, RelationalStore } from '@repo/graph-store';

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
  source_ref: string;
  policy_ref: string;
  snapshot_id: string;
  run_id: string;
  credentials_ref?: string;
  requested_profiles?: string[];
  projectId?: string;
  policySelection?: PolicySelection;
  connector_options?: Record<string, unknown>;
}

export interface RepoSourceIngestOptions {
  commit?: string;
  branch?: string;
  projectId?: string;
  policySelection?: PolicySelection;
  ingestRoot?: string;
  projectRoot?: string;
  policyRef?: string;
  runId?: string;
  requestedProfiles?: string[];
  credentialsRef?: string;
  connectorOptions?: Record<string, unknown>;
}

export type RunStatus = 'complete' | 'partial' | 'failed' | 'skipped';

export type RetentionMode = 'link-only' | 'excerpt' | 'hashed' | 'full';
export type MaterializationMode = 'reference-only' | 'materialized' | 'hybrid';
export type AuthorityMode =
  | 'external-authoritative'
  | 'snapshot-authoritative'
  | 'graph-authoritative';

export interface RunSummaryProfileCounts {
  profile_name: string;
  profile_version: string;
  node_count: number;
  edge_count: number;
}

export interface RunSummary {
  run_id: string;
  connector_id: string;
  connector_version: string;
  source_ref: string;
  snapshot_id: string;
  started_at: string;
  finished_at: string;
  status: RunStatus;
  profiles_emitted: Array<{ name: string; version: string }>;
  retention_mode: RetentionMode;
  profile_modes: Array<{
    profile_name: string;
    profile_version: string;
    content_materialization_mode: MaterializationMode;
    content_authority_mode: AuthorityMode;
  }>;
  counts_by_profile: RunSummaryProfileCounts[];
  failures: Array<{ code: string; message: string; scope: string }>;
  skips: Array<{ reason: string; scope: string }>;
}

export interface CapabilityDeclaration {
  profile_name: string;
  profile_version: string;
  manifest_version: string;
  capabilities: Record<string, unknown>;
  unsupported?: string[];
}

export interface PolicyDecisionRecord {
  policy_ref: string;
  selection_inputs: Record<string, unknown>;
  tie_breaks: string[];
  scope_selectors: string[];
  lens_policy: string;
  retention_mode: RetentionMode;
  materialization_mode: MaterializationMode;
  authority_mode: AuthorityMode;
  enrichments: string[];
}

export interface ProfileOutput {
  profile_name: string;
  profile_version: string;
  node_count: number;
  edge_count: number;
}

export interface IngestResult {
  run_summary: RunSummary;
  capability_declarations: CapabilityDeclaration[];
  policy_decision: PolicyDecisionRecord;
  profiles: ProfileOutput[];
}

export interface IngestionStore {
  graph: GraphStore;
  relational: RelationalStore;
}

export interface IngestionConnector {
  canHandle(sourceKind: string): boolean;
  ingest(input: RepoIngestInput, store: IngestionStore): Promise<IngestResult>;
}

export async function ingestRepo(
  input: RepoIngestInput,
  store: IngestionStore,
  connector: IngestionConnector,
): Promise<IngestResult> {
  if (!connector.canHandle('repo')) {
    throw new Error('Connector does not support repo ingestion');
  }

  return connector.ingest(input, store);
}

export async function ingestRepoFromSource(
  source: string,
  store: IngestionStore,
  connector: IngestionConnector,
  options?: RepoSourceIngestOptions,
): Promise<IngestResult> {
  const env = await loadEnvConfig(options?.projectRoot);
  const ingestRoot = resolveIngestRoot(options?.ingestRoot ?? env.GRAPH_INGEST_ROOT);
  await mkdir(ingestRoot, { recursive: true });

  const repo = await resolveRepoSource(source, ingestRoot);
  await syncRepo(repo.repoPath, source);
  await checkoutIfNeeded(repo.repoPath, options);

  const commitHash = await runGit(['rev-parse', 'HEAD'], repo.repoPath);
  const projectId = options?.projectId ?? env.GRAPH_PROJECT_ID ?? 'default';
  const policyRef = options?.policyRef ?? 'default-policy';
  const runId = options?.runId ?? `run-${Date.now()}`;

  store.graph.beginTransaction();
  store.relational.beginTransaction();
  try {
    const input: RepoIngestInput = {
      repoPath: repo.repoPath,
      repoUrl: repo.repoUrl,
      source_ref: repo.repoUrl,
      policy_ref: policyRef,
      snapshot_id: commitHash,
      run_id: runId,
      projectId,
      ...(options?.policySelection ? { policySelection: options.policySelection } : {}),
      ...(options?.credentialsRef ? { credentials_ref: options.credentialsRef } : {}),
      ...(options?.requestedProfiles ? { requested_profiles: options.requestedProfiles } : {}),
      ...(options?.connectorOptions ? { connector_options: options.connectorOptions } : {}),
    };

    const result = await ingestRepo(input, store, connector);
    store.graph.commit();
    store.relational.commit();
    return result;
  } catch (error) {
    store.graph.rollback();
    store.relational.rollback();
    throw error;
  }
}
