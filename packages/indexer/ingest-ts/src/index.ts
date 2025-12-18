/**
 * @file TypeScript/JavaScript Language Indexer – Public API
 * @description Extracts symbols, references, boundaries, and test cases from TS/JS files
 * @reference docs/specs/feature/indexer/languages/ts_ingest_spec.md (complete specification)
 * @reference docs/specs/feature/indexer/implementation/2a1-ts-symbol-extraction.md (Slice 2A1 plan)
 */

import type { LanguageIndexer } from '@repo/indexer-types';

/**
 * TypeScript/JavaScript language indexer instance
 * Implements LanguageIndexer interface per ingest_spec.md §4
 *
 * @reference ingest_spec.md §4 (LanguageIndexer interface)
 * @reference ts_ingest_spec.md §3 (symbol extraction pipeline)
 */
export const tsJsIndexer: LanguageIndexer = {
  languageIds: ['ts', 'tsx', 'js'],

  canHandleFile(filePath: string): boolean {
    // ts_ingest_spec.md §2: supported extensions
    return /\.(ts|tsx|js|mjs|cjs|mts|cts)$/.test(filePath);
  },

  indexFiles() {
    // Placeholder for Slice 2A1 implementation
    throw new Error('Slice 2A1: Symbol extraction not yet implemented');
  },
};
