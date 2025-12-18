/**
 * @file Language Indexer Registry & Dispatcher
 * @description Registers language-specific indexers and dispatches files to appropriate handlers
 * @reference ingest_spec.md §2.2 (language indexer orchestration)
 * @reference language_indexers_spec.md (per-language details)
 */

import type { LanguageIndexer, FileIndexResult } from '@repo/indexer-types';

import { tsIndexer } from './ts-indexer.js';

/**
 * Registry of all available language indexers
 * Slice 2 registers TS/JS; Python and others come in future slices
 *
 * @reference ingest_spec.md §2.2 (dispatcher responsibility)
 */
const languageIndexers: LanguageIndexer[] = [tsIndexer];

/**
 * Get the appropriate language indexer for a file
 * Iterates through registered indexers and returns the first matching one
 *
 * @reference ingest_spec.md §2.2
 */
export function getLanguageIndexer(filePath: string): LanguageIndexer | undefined {
  return languageIndexers.find((indexer) => indexer.canHandleFile(filePath));
}

/**
 * Run all applicable language indexers on a set of files
 * Groups files by language and dispatches to appropriate indexers
 *
 * @reference ingest_spec.md §2.2 (dispatcher orchestration)
 * @reference plan.md Slice 2 (integration point)
 */
export async function indexFiles(args: {
  codebaseRoot: string;
  snapshotId: string;
  filePaths: string[];
}): Promise<FileIndexResult[]> {
  const { codebaseRoot, snapshotId, filePaths } = args;

  // Group files by language indexer
  const filesByIndexer = new Map<LanguageIndexer, string[]>();

  for (const filePath of filePaths) {
    const indexer = getLanguageIndexer(filePath);
    if (indexer) {
      if (!filesByIndexer.has(indexer)) {
        filesByIndexer.set(indexer, []);
      }
      filesByIndexer.get(indexer)!.push(filePath);
    }
  }

  // Run each indexer on its files and collect results
  const results: FileIndexResult[] = [];

  for (const [indexer, files] of filesByIndexer.entries()) {
    const indexerResults = await indexer.indexFiles({
      codebaseRoot,
      snapshotId,
      filePaths: files,
    });
    results.push(...indexerResults);
  }

  return results;
}

/**
 * Export language indexers for direct use if needed
 */
export { tsIndexer };
