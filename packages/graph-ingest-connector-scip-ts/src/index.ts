import { exec } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { deserializeSCIP } from '@c4312/scip';
import type { Document, SymbolInformation } from '@c4312/scip';
import {
  createDeterministicId,
  type ArtifactPartNode,
  type ArtifactRootNode,
  type ArtifactStateNode,
  type GraphEdge,
} from '@repo/graph-core';
import type { IngestResult, IngestionConnector, RepoIngestInput } from '@repo/graph-ingest';
import type { GraphStore } from '@repo/graph-store';

const execAsync = promisify(exec);

export interface ToolchainProvenance {
  nodeVersion: string;
  scipTypescriptVersion: string;
  packageManager: string;
  packageManagerVersion: string;
}

async function detectPackageManager(
  repoPath: string,
): Promise<{ name: string; lockfile: string } | null> {
  const lockfiles = [
    { name: 'pnpm', lockfile: 'pnpm-lock.yaml' },
    { name: 'yarn', lockfile: 'yarn.lock' },
    { name: 'npm', lockfile: 'package-lock.json' },
  ];

  for (const { name, lockfile } of lockfiles) {
    try {
      await stat(path.join(repoPath, lockfile));
      return { name, lockfile };
    } catch {
      // Continue to next lockfile
    }
  }

  return null;
}

async function getToolchainProvenance(repoPath: string): Promise<ToolchainProvenance> {
  const nodeVersion = process.version;

  // Get scip-typescript version
  let scipTypescriptVersion = 'unknown';
  try {
    const { stdout } = await execAsync('npx @sourcegraph/scip-typescript --version', {
      cwd: repoPath,
      timeout: 30000,
    });
    scipTypescriptVersion = stdout.trim();
  } catch {
    // Version detection failed, use unknown
  }

  // Get package manager info
  const pm = await detectPackageManager(repoPath);
  const packageManager = pm?.name ?? 'npm';
  let packageManagerVersion = 'unknown';

  try {
    const { stdout } = await execAsync(`${packageManager} --version`, {
      cwd: repoPath,
      timeout: 10000,
    });
    packageManagerVersion = stdout.trim();
  } catch {
    // Version detection failed
  }

  return {
    nodeVersion,
    scipTypescriptVersion,
    packageManager,
    packageManagerVersion,
  };
}

async function runScipTypescript(repoPath: string): Promise<void> {
  const pm = await detectPackageManager(repoPath);
  const packageManager = pm?.name ?? 'npm';

  // Determine workspace flag for monorepos
  let workspaceFlag = '';
  if (packageManager === 'pnpm') {
    try {
      await stat(path.join(repoPath, 'pnpm-workspace.yaml'));
      workspaceFlag = '--pnpm-workspaces';
    } catch {
      // Not a pnpm workspace
    }
  } else if (packageManager === 'yarn') {
    try {
      const pkgJson = JSON.parse(await readFile(path.join(repoPath, 'package.json'), 'utf-8')) as {
        workspaces?: unknown;
      };
      if (pkgJson.workspaces) {
        workspaceFlag = '--yarn-workspaces';
      }
    } catch {
      // Not a yarn workspace
    }
  }

  const command = `npx @sourcegraph/scip-typescript index ${workspaceFlag}`.trim();

  try {
    await execAsync(command, {
      cwd: repoPath,
      timeout: 300000, // 5 minute timeout for large repos
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    throw new Error(
      `scip-typescript indexing failed: ${err.message}\nstderr: ${err.stderr ?? ''}\nstdout: ${err.stdout ?? ''}`,
    );
  }
}

async function parseScipIndex(repoPath: string): Promise<Document[]> {
  const indexPath = path.join(repoPath, 'index.scip');

  try {
    const buffer = await readFile(indexPath);
    const index = deserializeSCIP(new Uint8Array(buffer));
    return index.documents;
  } catch (error) {
    throw new Error(`Failed to parse SCIP index at ${indexPath}: ${(error as Error).message}`);
  }
}

function formatSymbolLocator(relativePath: string, symbol: SymbolInformation): string {
  // Use the SCIP symbol identifier as the locator suffix
  // Format: path#scip_symbol (per REQ-005)
  return `${relativePath}#${symbol.symbol}`;
}

export class ScipTsIngestionConnector implements IngestionConnector {
  canHandle(sourceKind: string): boolean {
    return sourceKind === 'repo';
  }

  async ingest(input: RepoIngestInput, store: GraphStore): Promise<IngestResult> {
    const repoPath = input.repoPath;
    const repoStats = await stat(repoPath);
    if (!repoStats.isDirectory()) {
      throw new Error(`Repo path is not a directory: ${repoPath}`);
    }

    // Capture toolchain provenance before running scip-typescript
    const provenance = await getToolchainProvenance(repoPath);

    // Run scip-typescript to generate the index
    await runScipTypescript(repoPath);

    // Parse the generated SCIP index
    const documents = await parseScipIndex(repoPath);

    return ingestScipDocuments(input, store, documents, provenance);
  }
}

export function ingestScipDocuments(
  input: RepoIngestInput,
  store: GraphStore,
  documents: Document[],
  provenance: ToolchainProvenance,
): IngestResult {
  // Create deterministic IDs
  const rootId = createDeterministicId(`${input.repoUrl}:${input.commit}`);
  const stateId = createDeterministicId(`${rootId}:${input.commit}`);

  // Compute content hash from all file paths and their symbol counts
  const contentHashInput = documents
    .map((doc) => `${doc.relativePath}:${doc.symbols.length}`)
    .sort()
    .join('|');
  const contentHash = createDeterministicId(contentHashInput);

  // Create root node
  const rootNode: ArtifactRootNode = {
    id: rootId,
    kind: 'ArtifactRoot',
    schema_version: 'v0.1',
    source_kind: 'repo',
    canonical_ref: input.repoUrl,
  };

  // Create state node with provenance metadata
  const stateNode: ArtifactStateNode & { provenance: ToolchainProvenance } = {
    id: stateId,
    kind: 'ArtifactState',
    schema_version: 'v0.1',
    artifact_root_id: rootId,
    version_ref: input.commit,
    content_hash: contentHash,
    retrieved_at: new Date().toISOString(),
    provenance,
  };

  store.putNode(rootNode);
  store.putNode(stateNode as ArtifactStateNode);

  const edges: GraphEdge[] = [];
  const stateEdge: GraphEdge = {
    id: createDeterministicId(`${rootId}->${stateId}`),
    kind: 'HasState',
    schema_version: 'v0.1',
    from: rootId,
    to: stateId,
  };
  edges.push(stateEdge);

  // Process each document (file) and its symbols
  for (const doc of documents) {
    const relativePath = doc.relativePath;

    // Create file-level ArtifactPart
    const filePartId = createDeterministicId(`${stateId}:${relativePath}`);
    const fileNode: ArtifactPartNode = {
      id: filePartId,
      kind: 'ArtifactPart',
      schema_version: 'v0.1',
      artifact_state_id: stateId,
      locator: relativePath,
      retention_mode: 'link-only',
      part_kind: 'file',
    };

    store.putNode(fileNode);
    edges.push({
      id: createDeterministicId(`${stateId}->${filePartId}`),
      kind: 'HasPart',
      schema_version: 'v0.1',
      from: stateId,
      to: filePartId,
    });

    // Create symbol-level ArtifactParts for each symbol in this file
    for (const symbol of doc.symbols) {
      const locator = formatSymbolLocator(relativePath, symbol);
      const symbolPartId = createDeterministicId(`${stateId}:${locator}`);

      const symbolNode: ArtifactPartNode = {
        id: symbolPartId,
        kind: 'ArtifactPart',
        schema_version: 'v0.1',
        artifact_state_id: stateId,
        locator,
        retention_mode: 'link-only',
        part_kind: 'symbol',
      };

      store.putNode(symbolNode);
      edges.push({
        id: createDeterministicId(`${stateId}->${symbolPartId}`),
        kind: 'HasPart',
        schema_version: 'v0.1',
        from: stateId,
        to: symbolPartId,
      });
    }
  }

  for (const edge of edges) {
    store.putEdge(edge);
  }

  return {
    artifact_root_id: rootId,
    artifact_state_id: stateId,
    node_count: store.listNodes().length,
    edge_count: store.listEdges().length,
  };
}
