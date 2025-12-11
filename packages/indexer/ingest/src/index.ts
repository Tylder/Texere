import type { SnapshotRef } from '@repo/indexer-core';
import type { FileIndexResult } from '@repo/indexer-types';

export interface IndexSnapshotParams extends SnapshotRef {
  codebaseRoot: string;
  changedFiles?: string[];
}

// Placeholder orchestrator; slice 1–3 will implement
export function indexSnapshot(_params: IndexSnapshotParams): Promise<FileIndexResult[]> {
  return Promise.resolve([]);
}
