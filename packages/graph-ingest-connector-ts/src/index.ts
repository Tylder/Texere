import { exec } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { deserializeSCIP } from '@c4312/scip';
import type { Document, Index, Occurrence, SymbolInformation } from '@c4312/scip';
import {
  createDeterministicId,
  type CommitNode,
  type DefinesEdge,
  type FileNode,
  type GraphEdge,
  type ImplementsEdge,
  type PackageNode,
  type RefersToEdge,
  type SymbolNode,
  type TypeNode,
  type DeclaresTypeEdge,
  type Range,
} from '@repo/graph-core';
import type {
  IngestResult,
  IngestionConnector,
  IngestionStore,
  RepoIngestInput,
} from '@repo/graph-ingest';
import type { IndexStatusRecord } from '@repo/graph-store';

const execAsync = promisify(exec);

export interface ToolchainProvenance {
  nodeVersion: string;
  scipTypescriptVersion: string;
  packageManager: string;
  packageManagerVersion: string;
}

type PackageJson = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type PackageManager = 'pnpm' | 'yarn' | 'npm';

async function detectPackageManager(repoPath: string): Promise<PackageManager> {
  const lockfiles: Array<{ name: PackageManager; lockfile: string }> = [
    { name: 'pnpm', lockfile: 'pnpm-lock.yaml' },
    { name: 'yarn', lockfile: 'yarn.lock' },
    { name: 'npm', lockfile: 'package-lock.json' },
  ];

  for (const { name, lockfile } of lockfiles) {
    try {
      await stat(path.join(repoPath, lockfile));
      return name;
    } catch {
      // Continue to next lockfile.
    }
  }

  return 'npm';
}

async function installDependencies(
  repoPath: string,
  packageManager: PackageManager,
): Promise<void> {
  let command = '';

  if (packageManager === 'pnpm') {
    command = 'pnpm install --frozen-lockfile';
  } else if (packageManager === 'yarn') {
    command = 'yarn install --frozen-lockfile';
  } else {
    const hasLockfile = await hasPackageLock(repoPath);
    command = hasLockfile ? 'npm ci' : 'npm install';
  }

  try {
    await execAsync(command, { cwd: repoPath, timeout: 300000 });
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    throw new Error(
      `Dependency install failed: ${err.message}\nstderr: ${err.stderr ?? ''}\nstdout: ${err.stdout ?? ''}`,
    );
  }
}

async function hasPackageLock(repoPath: string): Promise<boolean> {
  try {
    await stat(path.join(repoPath, 'package-lock.json'));
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(repoPath: string): Promise<PackageJson> {
  try {
    const raw = await readFile(path.join(repoPath, 'package.json'), 'utf-8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return {};
  }
}

async function getToolchainProvenance(repoPath: string): Promise<ToolchainProvenance> {
  const nodeVersion = process.version;

  let scipTypescriptVersion = 'unknown';
  try {
    const { stdout } = await execAsync('npx @sourcegraph/scip-typescript --version', {
      cwd: repoPath,
      timeout: 30000,
    });
    scipTypescriptVersion = stdout.trim();
  } catch {
    // Version detection failed.
  }

  const packageManager = await detectPackageManager(repoPath);
  let packageManagerVersion = 'unknown';

  try {
    const { stdout } = await execAsync(`${packageManager} --version`, {
      cwd: repoPath,
      timeout: 10000,
    });
    packageManagerVersion = stdout.trim();
  } catch {
    // Version detection failed.
  }

  return {
    nodeVersion,
    scipTypescriptVersion,
    packageManager,
    packageManagerVersion,
  };
}

async function runScipTypescript(repoPath: string): Promise<void> {
  const packageManager = await detectPackageManager(repoPath);

  let workspaceFlag = '';
  if (packageManager === 'pnpm') {
    try {
      await stat(path.join(repoPath, 'pnpm-workspace.yaml'));
      workspaceFlag = '--pnpm-workspaces';
    } catch {
      // Not a pnpm workspace.
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
      // Not a yarn workspace.
    }
  }

  const command = `npx @sourcegraph/scip-typescript index ${workspaceFlag}`.trim();

  try {
    await execAsync(command, {
      cwd: repoPath,
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    throw new Error(
      `scip-typescript indexing failed: ${err.message}\nstderr: ${err.stderr ?? ''}\nstdout: ${err.stdout ?? ''}`,
    );
  }
}

async function parseScipIndex(repoPath: string): Promise<Index> {
  const indexPath = path.join(repoPath, 'index.scip');

  try {
    const buffer = await readFile(indexPath);
    return deserializeSCIP(new Uint8Array(buffer));
  } catch (error) {
    throw new Error(`Failed to parse SCIP index at ${indexPath}: ${(error as Error).message}`);
  }
}

function buildRange(occurrence: Occurrence): Range | undefined {
  const range = occurrence.range;
  if (!range || range.length < 3) return undefined;

  const [startLine, startCol] = range;
  if (typeof startLine !== 'number' || typeof startCol !== 'number') return undefined;

  if (range.length === 3) {
    return {
      range_kind: 'line_col',
      start_line: startLine,
      start_col: startCol,
      end_line: startLine,
      end_col: range[2] ?? startCol,
    };
  }

  return {
    range_kind: 'line_col',
    start_line: startLine,
    start_col: startCol,
    end_line: range[2] ?? startLine,
    end_col: range[3] ?? startCol,
  };
}

function buildIndexStatus(fileId: string): IndexStatusRecord {
  return {
    file_id: fileId,
    status: 'complete',
    indexed_at: new Date().toISOString(),
    error_message: null,
  };
}

function isDefinition(symbolRoles: number): boolean {
  return (symbolRoles & 1) === 1;
}

function isReference(symbolRoles: number): boolean {
  return (symbolRoles & 2) === 2;
}

function toSymbolKind(symbol: SymbolInformation): string {
  return symbol.displayName ? symbol.displayName : String(symbol.kind);
}

export class ScipTsIngestionConnector implements IngestionConnector {
  canHandle(sourceKind: string): boolean {
    return sourceKind === 'repo';
  }

  async ingest(input: RepoIngestInput, store: IngestionStore): Promise<IngestResult> {
    const repoPath = input.repoPath;
    const repoStats = await stat(repoPath);
    if (!repoStats.isDirectory()) {
      throw new Error(`Repo path is not a directory: ${repoPath}`);
    }

    const skipInstall = Boolean(input.connector_options?.['skipInstall']);
    if (!skipInstall) {
      const packageManager = await detectPackageManager(repoPath);
      await installDependencies(repoPath, packageManager);
    }

    const provenance = await getToolchainProvenance(repoPath);
    await runScipTypescript(repoPath);

    const index = await parseScipIndex(repoPath);
    const documents = index.documents;
    const packageJson = await readPackageJson(repoPath);
    const packageName = packageJson.name ?? 'unknown';
    const packageVersion = packageJson.version ?? '0.0.0';

    return ingestScipDocuments(input, store, documents, provenance, {
      packageName,
      packageVersion,
      dependencies: {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      },
    });
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function ingestScipDocuments(
  input: RepoIngestInput,
  store: IngestionStore,
  documents: Document[],
  provenance: ToolchainProvenance,
  options: {
    packageName: string;
    packageVersion: string;
    dependencies: Record<string, string>;
  },
): IngestResult {
  const { packageName, packageVersion, dependencies } = options;

  const now = new Date().toISOString();
  const commitSha = input.snapshot_id;
  const rootPackageId = createDeterministicId(`package:${packageName}@${packageVersion}`);
  const commitId = createDeterministicId(`commit:${commitSha}`);

  const packageNode: PackageNode = {
    id: rootPackageId,
    kind: 'Package',
    schema_version: 'v0.1',
    name: packageName,
    version: packageVersion,
    language: 'typescript',
    sourceRepo: input.source_ref,
    scipUrl: '',
  };

  const commitNode: CommitNode = {
    id: commitId,
    kind: 'Commit',
    schema_version: 'v0.1',
    commitSha,
    timestamp: now,
    author: 'unknown',
    message: 'unknown',
  };

  store.graph.putNode(packageNode);
  store.graph.putNode(commitNode);
  store.relational.putCommit({
    commit_sha: commitSha,
    timestamp: now,
    author: 'unknown',
    message: 'unknown',
  });
  store.relational.putPackage({
    package_name: packageName,
    version: packageVersion,
    language: 'typescript',
    scip_url: '',
  });

  const symbolNodes = new Map<string, SymbolNode>();
  const typeNodes = new Map<string, TypeNode>();
  const edges: GraphEdge[] = [];

  for (const [depName, versionRange] of Object.entries(dependencies)) {
    const depId = createDeterministicId(`package:${depName}@${versionRange}`);
    const depNode: PackageNode = {
      id: depId,
      kind: 'Package',
      schema_version: 'v0.1',
      name: depName,
      version: versionRange,
      language: 'typescript',
      sourceRepo: '',
      scipUrl: '',
    };

    store.graph.putNode(depNode);
    store.relational.putPackage({
      package_name: depName,
      version: versionRange,
      language: 'typescript',
      scip_url: '',
    });

    edges.push({
      id: createDeterministicId(`${rootPackageId}->${depId}`),
      kind: 'DEPENDS_ON',
      schema_version: 'v0.1',
      from: rootPackageId,
      to: depId,
      versionRange: versionRange,
    });
  }

  for (const doc of documents) {
    const fileId = createDeterministicId(`${packageName}:${commitSha}:${doc.relativePath}`);
    const fileNode: FileNode = {
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: doc.relativePath,
      packageName,
      commitSha,
      language: doc.language ?? 'typescript',
      stale: false,
      locator: {
        source_ref: input.source_ref,
        snapshot_id: input.snapshot_id,
        path_or_url: doc.relativePath,
      },
    };

    store.graph.putNode(fileNode);
    store.relational.putFile({
      file_id: fileId,
      path: doc.relativePath,
      package_name: packageName,
      commit_sha: commitSha,
      language: doc.language ?? 'typescript',
      content_hash: createDeterministicId(doc.text ?? ''),
      stale: false,
    });
    store.relational.putIndexStatus(buildIndexStatus(fileId));

    for (const symbol of doc.symbols) {
      const symbolId = symbol.symbol;
      if (!symbolId) continue;

      if (!symbolNodes.has(symbolId)) {
        const symbolNode: SymbolNode = {
          id: createDeterministicId(`${symbolId}:${packageName}:${packageVersion}`),
          kind: 'Symbol',
          schema_version: 'v0.1',
          symbolId,
          symbolKind: toSymbolKind(symbol),
          visibility: 'unknown',
          packageName,
          version: packageVersion,
          stale: false,
        };
        symbolNodes.set(symbolId, symbolNode);
        store.graph.putNode(symbolNode);

        edges.push({
          id: createDeterministicId(`${symbolNode.id}->${commitId}`),
          kind: 'INDEXED_AT',
          schema_version: 'v0.1',
          from: symbolNode.id,
          to: commitId,
        });
      }

      for (const relationship of symbol.relationships ?? []) {
        const targetSymbolId = relationship.symbol;
        if (!targetSymbolId) continue;

        if (relationship.isTypeDefinition) {
          const typeId = createDeterministicId(
            `${targetSymbolId}:${packageName}:${packageVersion}`,
          );
          if (!typeNodes.has(typeId)) {
            const typeNode: TypeNode = {
              id: typeId,
              kind: 'Type',
              schema_version: 'v0.1',
              typeId: targetSymbolId,
              typeKind: 'unknown',
              packageName,
              version: packageVersion,
            };
            typeNodes.set(typeId, typeNode);
            store.graph.putNode(typeNode);
          }

          const declaresType: DeclaresTypeEdge = {
            id: createDeterministicId(`${symbolId}->${typeId}`),
            kind: 'DECLARES_TYPE',
            schema_version: 'v0.1',
            from: symbolNodes.get(symbolId)?.id ?? createDeterministicId(symbolId),
            to: typeId,
          };
          edges.push(declaresType);
        }

        if (relationship.isImplementation) {
          const implementsEdge: ImplementsEdge = {
            id: createDeterministicId(`${symbolId}->${targetSymbolId}`),
            kind: 'IMPLEMENTS',
            schema_version: 'v0.1',
            from: symbolNodes.get(symbolId)?.id ?? createDeterministicId(symbolId),
            to: createDeterministicId(`${targetSymbolId}:${packageName}:${packageVersion}`),
            relationKind: 'implements',
          };
          edges.push(implementsEdge);
        }
      }
    }

    for (const occurrence of doc.occurrences ?? []) {
      const symbolId = occurrence.symbol;
      if (!symbolId) continue;

      const symbolNode = symbolNodes.get(symbolId);
      if (!symbolNode) continue;

      const range = buildRange(occurrence);
      if (!range) continue;

      if (isDefinition(occurrence.symbolRoles)) {
        const definesEdge: DefinesEdge = {
          id: createDeterministicId(`${fileId}->${symbolNode.id}:${JSON.stringify(range)}`),
          kind: 'DEFINES',
          schema_version: 'v0.1',
          from: fileId,
          to: symbolNode.id,
          range,
          definitionKind: 'definition',
        };
        edges.push(definesEdge);
      }

      if (isReference(occurrence.symbolRoles)) {
        const refersToEdge: RefersToEdge = {
          id: createDeterministicId(`${fileId}->${symbolNode.id}:${JSON.stringify(range)}:ref`),
          kind: 'REFERS_TO',
          schema_version: 'v0.1',
          from: fileId,
          to: symbolNode.id,
          range,
          referenceKind: 'read',
        };
        edges.push(refersToEdge);
      }
    }
  }

  edges.sort((a, b) => a.id.localeCompare(b.id));
  for (const edge of edges) {
    store.graph.putEdge(edge);
  }

  const profileName = 'repo-ts';
  const profileVersion = 'v0.1';
  const nodeCount = store.graph.listNodes().length;
  const edgeCount = store.graph.listEdges().length;

  return {
    run_summary: {
      run_id: input.run_id,
      connector_id: 'graph-ingest-connector-ts',
      connector_version: '0.0.0',
      source_ref: input.source_ref,
      snapshot_id: input.snapshot_id,
      started_at: now,
      finished_at: now,
      status: 'complete',
      profiles_emitted: [{ name: profileName, version: profileVersion }],
      retention_mode: 'link-only',
      profile_modes: [
        {
          profile_name: profileName,
          profile_version: profileVersion,
          content_materialization_mode: 'reference-only',
          content_authority_mode: 'external-authoritative',
        },
      ],
      counts_by_profile: [
        {
          profile_name: profileName,
          profile_version: profileVersion,
          node_count: nodeCount,
          edge_count: edgeCount,
        },
      ],
      failures: [],
      skips: [],
    },
    capability_declarations: [
      {
        profile_name: profileName,
        profile_version: profileVersion,
        manifest_version: 'v0.1',
        capabilities: {
          incremental: false,
          scip: true,
          provenance: provenance,
        },
        unsupported: ['incremental'],
      },
    ],
    policy_decision: {
      policy_ref: input.policy_ref,
      selection_inputs: {
        source_ref: input.source_ref,
        snapshot_id: input.snapshot_id,
      },
      tie_breaks: [],
      scope_selectors: ['repo'],
      lens_policy: 'working',
      retention_mode: 'link-only',
      materialization_mode: 'reference-only',
      authority_mode: 'external-authoritative',
      enrichments: [],
    },
    profiles: [
      {
        profile_name: profileName,
        profile_version: profileVersion,
        node_count: nodeCount,
        edge_count: edgeCount,
      },
    ],
  };
}
