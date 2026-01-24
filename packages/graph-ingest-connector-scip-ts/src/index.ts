import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  createDeterministicId,
  type ArtifactPartNode,
  type ArtifactRootNode,
  type ArtifactStateNode,
  type GraphEdge,
} from '@repo/graph-core';
import type { IngestResult, IngestionConnector, RepoIngestInput } from '@repo/graph-ingest';
import type { GraphStore } from '@repo/graph-store';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.nx', '.cache']);

async function collectFiles(root: string, current: string = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...(await collectFiles(root, path.join(current, entry.name))));
      continue;
    }

    if (entry.isFile()) {
      const relPath = path.relative(root, path.join(current, entry.name));
      files.push(relPath.split(path.sep).join('/'));
    }
  }

  return files.sort();
}

async function hashFile(fullPath: string): Promise<string> {
  const contents = await readFile(fullPath, 'utf-8');
  return createDeterministicId(contents);
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

    const files = await collectFiles(repoPath);
    const fileHashes = await Promise.all(files.map((file) => hashFile(path.join(repoPath, file))));

    const rootId = createDeterministicId(`${input.repoUrl}:${input.commit}`);
    const stateId = createDeterministicId(`${rootId}:${input.commit}`);
    const contentHash = createDeterministicId(fileHashes.join('|'));

    const rootNode: ArtifactRootNode = {
      id: rootId,
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: input.repoUrl,
    };

    const stateNode: ArtifactStateNode = {
      id: stateId,
      kind: 'ArtifactState',
      schema_version: 'v0.1',
      artifact_root_id: rootId,
      version_ref: input.commit,
      content_hash: contentHash,
      retrieved_at: new Date().toISOString(),
    };

    store.putNode(rootNode);
    store.putNode(stateNode);

    const edges: GraphEdge[] = [];
    const stateEdge: GraphEdge = {
      id: createDeterministicId(`${rootId}->${stateId}`),
      kind: 'HasState',
      schema_version: 'v0.1',
      from: rootId,
      to: stateId,
    };
    edges.push(stateEdge);

    for (const file of files) {
      const filePartId = createDeterministicId(`${stateId}:${file}`);
      const symbolPartId = createDeterministicId(`${stateId}:${file}#symbol`);

      const fileNode: ArtifactPartNode = {
        id: filePartId,
        kind: 'ArtifactPart',
        schema_version: 'v0.1',
        artifact_state_id: stateId,
        locator: file,
        retention_mode: 'link-only',
        part_kind: 'file',
      };

      const symbolNode: ArtifactPartNode = {
        id: symbolPartId,
        kind: 'ArtifactPart',
        schema_version: 'v0.1',
        artifact_state_id: stateId,
        locator: `${file}#symbol:root`,
        retention_mode: 'link-only',
        part_kind: 'symbol',
      };

      store.putNode(fileNode);
      store.putNode(symbolNode);

      edges.push({
        id: createDeterministicId(`${stateId}->${filePartId}`),
        kind: 'HasPart',
        schema_version: 'v0.1',
        from: stateId,
        to: filePartId,
      });

      edges.push({
        id: createDeterministicId(`${stateId}->${symbolPartId}`),
        kind: 'HasPart',
        schema_version: 'v0.1',
        from: stateId,
        to: symbolPartId,
      });
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
}
