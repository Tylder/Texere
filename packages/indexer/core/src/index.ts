// Core indexer stubs (slice 0). Real implementations will live in graph/vector/config modules.
export interface IndexerConfig {
  codebaseId: string;
  root: string;
  trackedBranches: string[];
}

export interface SnapshotRef {
  codebaseId: string;
  commitHash: string;
  branch?: string;
}

export const loadConfig = async (_path?: string): Promise<IndexerConfig[]> => {
  // Placeholder: slice 1 will implement config resolution.
  return await Promise.resolve([]);
};
