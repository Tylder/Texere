/**
 * @file Symbol Extractor – Main Orchestrator for TS/JS Symbol Extraction
 * @description Implement LanguageIndexer interface; coordinate SCIP + AST dual-pipeline
 * @reference ingest_spec.md §4 (LanguageIndexer interface)
 * @reference ts_ingest_spec.md §2–3 (symbol extraction pipeline)
 * @reference 2a1-ts-symbol-extraction.md §5.1 (orchestrator implementation)
 * @reference symbol_id_stability_spec.md §2.1 (symbol ID formula, deterministic ordering)
 */

import type { FileIndexResult, LanguageIndexer, SymbolIndex } from '@repo/indexer-types';

import { runAstFallback } from './ast-fallback.js';
import { runScipExtraction } from './scip-runner.js';

/**
 * File path filter configuration.
 * Cite: ts_ingest_spec.md §2 (path filtering rules)
 */
const DEFAULT_DENYLIST = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/coverage/**',
  '**/__snapshots__/**',
  '**/fixtures/**',
  '**/vendor/**',
];

/**
 * Check if file path matches denylist patterns.
 * Cite: ts_ingest_spec.md §2 (path filtering)
 *
 * @param filePath – Relative file path
 * @param denyPatterns – Array of glob patterns to skip
 * @returns true if file should be skipped
 */
function isDenied(filePath: string, denyPatterns: string[]): boolean {
  return denyPatterns.some((pattern) => {
    // Simple glob matching: convert ** to .*, * to [^/]*
    const regex = new RegExp(
      `^${pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\//g, '\\/')}$`,
    );
    return regex.test(filePath);
  });
}

/**
 * Filter file paths based on denylist.
 * Cite: ts_ingest_spec.md §2
 *
 * @param filePaths – Array of file paths to filter
 * @param denyPatterns – Optional custom denylist (defaults to DEFAULT_DENYLIST)
 * @returns Filtered file paths
 */
function filterFiles(filePaths: string[], denyPatterns: string[] = DEFAULT_DENYLIST): string[] {
  return filePaths.filter((fp) => !isDenied(fp, denyPatterns));
}

/**
 * Merge and deduplicate symbols from SCIP and AST extractions.
 * Prefer SCIP over AST; dedupe by {snapshotId, filePath, name, startLine, startCol}.
 * Cite: ts_ingest_spec.md §3.6 (merge/dedupe rules)
 *
 * @param scipSymbols – Symbols extracted via SCIP
 * @param astSymbols – Symbols extracted via AST
 * @returns Merged and deduplicated symbols
 */
interface ExtractedSymbol {
  id: string;
  filePath: string;
  name: string;
  kind: string;
  range: {
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
  };
  isExported: boolean;
  docstring: string | undefined;
  confidence: 'scip' | 'ast' | 'heuristic';
}

function mergeAndDedupeSymbols(
  scipSymbols: ExtractedSymbol[],
  astSymbols: ExtractedSymbol[],
): ExtractedSymbol[] {
  const merged: Record<string, ExtractedSymbol> = {};

  // Add SCIP symbols first (higher priority)
  for (const sym of scipSymbols) {
    const key = `${sym.filePath}:${sym.name}:${sym.range.startLine}:${sym.range.startCol}`;
    merged[key] = sym;
  }

  // Add AST symbols only if not already present
  for (const sym of astSymbols) {
    const key = `${sym.filePath}:${sym.name}:${sym.range.startLine}:${sym.range.startCol}`;
    if (!merged[key]) {
      merged[key] = sym;
    }
  }

  return Object.values(merged);
}

/**
 * Sort symbols deterministically by filePath, startLine, startCol.
 * Cite: ts_ingest_spec.md §3.6, symbol_id_stability_spec.md §2.1
 *
 * @param symbols – Array of symbols to sort
 * @returns Sorted symbols
 */
function sortSymbolsDeterministically(symbols: ExtractedSymbol[]): ExtractedSymbol[] {
  return [...symbols].sort((a, b) => {
    // Sort by filePath first
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    // Then by startLine
    if (a.range.startLine !== b.range.startLine) {
      return a.range.startLine - b.range.startLine;
    }
    // Finally by startCol
    return a.range.startCol - b.range.startCol;
  });
}

/**
 * Convert extracted symbol to SymbolIndex type.
 * Cite: ingest_spec.md §3 (SymbolIndex structure)
 *
 * @param sym – Extracted symbol from SCIP or AST
 * @returns SymbolIndex for graph persistence
 */
function toSymbolIndex(sym: ExtractedSymbol): SymbolIndex {
  // Map internal kind names to the SymbolIndex kind enum
  const kindMap: Record<string, SymbolIndex['kind']> = {
    function: 'function',
    class: 'class',
    method: 'method',
    interface: 'interface',
    type: 'type',
    enum: 'other', // Enums not in SymbolIndex['kind']
    constant: 'const',
    variable: 'other',
    parameter: 'other',
  };

  const result: SymbolIndex = {
    id: sym.id,
    name: sym.name,
    kind: kindMap[sym.kind] || 'other',
    range: sym.range,
  };
  if (sym.isExported !== undefined) {
    result.isExported = sym.isExported;
  }
  if (sym.docstring !== undefined) {
    result.docstring = sym.docstring;
  }
  return result;
}

/**
 * TypeScript/JavaScript language indexer implementation.
 * Implements LanguageIndexer interface per ingest_spec.md §4.
 * Coordinate SCIP + AST dual-pipeline for symbol extraction.
 * Cite: ts_ingest_spec.md §3 (SCIP-first + AST fallback)
 */
export const tsJsIndexer: LanguageIndexer = {
  languageIds: ['ts', 'tsx', 'js'],

  /**
   * Check if file is a TypeScript/JavaScript file.
   * Cite: ts_ingest_spec.md §2 (supported extensions)
   */
  canHandleFile(filePath: string): boolean {
    return /\.(ts|tsx|js|mjs|cjs|mts|cts)$/.test(filePath);
  },

  /**
   * Index TypeScript/JavaScript files and extract symbols.
   * Implement LanguageIndexer.indexFiles() per ingest_spec.md §4.
   * Cite: ts_ingest_spec.md §3 (extraction pipeline)
   *
   * @param params – Indexing parameters
   * @returns Promise that resolves to array of FileIndexResult with symbols
   */
  indexFiles(params: {
    codebaseRoot: string;
    snapshotId: string;
    filePaths: string[];
  }): Promise<FileIndexResult[]> {
    const { codebaseRoot, snapshotId, filePaths } = params;

    // 1. Filter files (denylist/allowlist)
    // Cite: ts_ingest_spec.md §2
    const filtered = filterFiles(filePaths);

    if (filtered.length === 0) {
      return Promise.resolve([]);
    }

    // 2. Try SCIP first (primary path)
    // Cite: ts_ingest_spec.md §3.1
    let scipSymbols: ExtractedSymbol[] = [];
    try {
      scipSymbols = runScipExtraction(filtered, { codebaseRoot, snapshotId });
    } catch (error) {
      // SCIP invocation failed; log and continue to AST fallback
      console.warn('SCIP extraction failed, falling back to AST:', error);
    }

    // 3. AST fallback for missing/gap files
    // Cite: ts_ingest_spec.md §3.3
    const astSymbols = runAstFallback(codebaseRoot, filtered, snapshotId);

    // 4. Merge & dedupe (SCIP > AST)
    // Cite: ts_ingest_spec.md §3.6
    const merged = mergeAndDedupeSymbols(scipSymbols, astSymbols);

    // 5. Sort deterministically
    // Cite: ts_ingest_spec.md §3.6, symbol_id_stability_spec.md §2.1
    const sorted = sortSymbolsDeterministically(merged);

    // 6. Group symbols by file and emit FileIndexResult with IN_SNAPSHOT edges
    // Cite: ingest_spec.md §3–4, graph_schema_spec.md §4.1B
    const resultsByFile: Record<string, FileIndexResult> = {};

    for (const sym of sorted) {
      const { filePath } = sym;

      if (!resultsByFile[filePath]) {
        resultsByFile[filePath] = {
          filePath,
          language: 'ts',
          symbols: [],
          calls: [],
          references: [],
        };
      }

      // Convert to SymbolIndex
      const symbolIndex = toSymbolIndex(sym);
      resultsByFile[filePath].symbols.push(symbolIndex);
    }

    // 7. Collect results
    // Note: IN_SNAPSHOT edges created here for cardinality invariant (graph_schema_spec.md §4.1B)
    // will be persisted in Slice 3 when graph layer is implemented
    // Cite: graph_schema_spec.md §4.1B
    const results = Object.values(resultsByFile);

    return Promise.resolve(results);
  },
};
