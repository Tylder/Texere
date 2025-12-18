/**
 * @file SCIP Runner – TypeScript/JavaScript Symbol Extraction via SCIP CLI
 * @description Invoke SCIP CLI, parse JSON output, extract symbols with confidence tagging
 * @reference ts_ingest_spec.md §3.1, §3.7 (SCIP integration, batching, timeouts)
 * @reference 2a1-ts-symbol-extraction.md §5.2 (implementation details)
 * @reference symbol_id_stability_spec.md §2.1 (symbol ID formula)
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Range } from '@repo/indexer-types';

/**
 * Symbol extracted via SCIP with complete metadata and confidence tagging.
 * Cite: ts_ingest_spec.md §3.1, §3.8
 */
export interface ScipSymbol {
  id: string; // Stable ID per symbol_id_stability_spec §2.1
  name: string;
  kind: 'function' | 'class' | 'method' | 'interface' | 'type' | 'enum' | 'const' | 'other';
  range: Range;
  filePath: string;
  isExported: boolean;
  docstring: string | undefined;
  confidence: 'scip';
}

/**
 * Internal SCIP JSON output schema (partial – only fields we need).
 * Cite: @sourcegraph/scip-typescript documentation
 */
interface ScipIndex {
  documents?: Array<{
    uri: string;
    occurrences?: Array<{
      range: [number, number, number, number, number, number]; // [start byte, end byte]
      symbol: string;
      symbolRoles?: number[];
    }>;
  }>;
  externalSymbols?: Record<string, unknown>;
  symbols?: Record<
    string,
    {
      documentation?: string[];
      displayName?: string;
      kind?: number;
      isForwardDeclaration?: boolean;
    }
  >;
}

/**
 * Generate stable symbol ID per formula.
 * Cite: symbol_id_stability_spec.md §2.1
 * Formula: ${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}
 *
 * @param snapshotId – Snapshot identifier
 * @param filePath – File path relative to codebase root
 * @param symbolName – Symbol name
 * @param startLine – 1-indexed start line
 * @param startCol – 1-indexed start column
 * @returns Stable symbol ID
 */
function generateSymbolId(
  snapshotId: string,
  filePath: string,
  symbolName: string,
  startLine: number,
  startCol: number,
): string {
  return `${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}`;
}

/**
 * Convert SCIP byte range to line/column positions.
 * Helper to map SCIP's byte offsets to 1-indexed line/col.
 *
 * @param fileContent – Full file content as string
 * @param startByte – Start byte offset (0-indexed)
 * @param endByte – End byte offset (0-indexed)
 * @returns Line/column range (1-indexed)
 */
function convertByteOffsetToLineCol(
  fileContent: string,
  startByte: number,
  endByte: number,
): Range {
  // Split by newlines and track cumulative byte offset
  const lines = fileContent.split('\n');
  let currentByte = 0;
  let startLine = 1,
    startCol = 1,
    endLine = 1,
    endCol = 1;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i]!.length + 1; // +1 for newline

    // Check if startByte falls in this line
    if (currentByte <= startByte && startByte < currentByte + lineLength) {
      startLine = i + 1;
      startCol = startByte - currentByte + 1;
    }

    // Check if endByte falls in this line
    if (currentByte <= endByte && endByte < currentByte + lineLength) {
      endLine = i + 1;
      endCol = endByte - currentByte + 1;
    }

    currentByte += lineLength;
  }

  return { startLine, startCol, endLine, endCol };
}

/**
 * Invoke SCIP CLI for a set of files.
 * Cite: ts_ingest_spec.md §3.7 (batching, timeouts)
 *
 * @param codebaseRoot – Root directory of codebase
 * @param tsconfigPath – Path to tsconfig.json
 * @param timeoutMs – Timeout in milliseconds (default: 120000 = 120s)
 * @returns Parsed SCIP index, or null if invocation failed/timed out
 * @throws On exec error (non-timeout)
 */
function invokeScipCli(
  codebaseRoot: string,
  tsconfigPath: string,
  timeoutMs: number = 120_000,
): ScipIndex | null {
  try {
    const command = `scip-typescript index --project "${tsconfigPath}" --output json`;

    // Run SCIP with timeout
    const output = execSync(command, {
      cwd: codebaseRoot,
      timeout: timeoutMs,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    // Parse JSON output
    const scipIndex = JSON.parse(output) as ScipIndex;
    return scipIndex;
  } catch (error) {
    // Timeout or command failure
    if (error instanceof Error && error.message.includes('ETIMEDOUT')) {
      // Timeout – return null to trigger AST fallback
      return null;
    }

    // Re-throw actual errors
    throw error;
  }
}

/**
 * Extract symbols from parsed SCIP JSON output.
 * Cite: ts_ingest_spec.md §3.1, §3.7
 *
 * @param scipIndex – Parsed SCIP JSON output
 * @param codebaseRoot – Root directory of codebase
 * @param snapshotId – Snapshot identifier
 * @returns Array of extracted symbols
 */
export function parseScipOutput(
  scipIndex: ScipIndex,
  codebaseRoot: string,
  snapshotId: string,
): ScipSymbol[] {
  const symbols: ScipSymbol[] = [];
  const processedSymbols = new Set<string>();

  if (!scipIndex.documents) {
    return symbols;
  }

  for (const doc of scipIndex.documents) {
    // Extract file path from SCIP URI (format: file:///<path>)
    const filePath = doc.uri
      .replace(/^file:\/\/\/?/, '') // Remove file:// prefix
      .replace(new RegExp(`^${codebaseRoot}/?`), ''); // Remove codebase root

    // Load file content for byte→line/col conversion
    const fullPath = path.join(codebaseRoot, filePath);
    let fileContent = '';
    try {
      fileContent = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      // File not readable – skip
      continue;
    }

    if (!doc.occurrences) {
      continue;
    }

    // Process occurrences
    for (const occurrence of doc.occurrences) {
      const [startByte, endByte] = occurrence.range;
      const symbolPath = occurrence.symbol;

      // Skip if already processed (dedupe)
      if (processedSymbols.has(symbolPath)) {
        continue;
      }

      // Extract symbol name (last component of scoped name, e.g., "foo.Bar::method" → "method")
      const symbolName = symbolPath.split(/[.:#]/).pop() || 'unknown';

      // Look up symbol metadata from SCIP index
      const symbolMeta = scipIndex.symbols?.[symbolPath];

      // Infer kind from symbol documentation/name heuristics
      // (SCIP doesn't always provide explicit kind, so we use basic heuristics)
      let kind: ScipSymbol['kind'] = 'other';
      const displayName = symbolMeta?.displayName?.toLowerCase() || '';
      if (displayName.includes('function')) kind = 'function';
      else if (displayName.includes('class')) kind = 'class';
      else if (displayName.includes('interface')) kind = 'interface';
      else if (displayName.includes('enum')) kind = 'enum';
      else if (displayName.includes('type')) kind = 'type';
      else if (displayName.includes('const')) kind = 'const';

      // Extract docstring (first line of documentation if present)
      const docstring = symbolMeta?.documentation?.[0];

      // Convert byte range to line/col
      const range = convertByteOffsetToLineCol(fileContent, startByte, endByte);

      // Determine if exported (basic heuristic: assume symbol path indicates export)
      const isExported = !symbolPath.startsWith('local/');

      const symbol: ScipSymbol = {
        id: generateSymbolId(snapshotId, filePath, symbolName, range.startLine, range.startCol),
        name: symbolName,
        kind,
        range,
        filePath,
        isExported,
        docstring,
        confidence: 'scip',
      };

      symbols.push(symbol);
      processedSymbols.add(symbolPath);
    }
  }

  return symbols;
}

/**
 * Run SCIP extraction on a batch of files.
 * Cite: ts_ingest_spec.md §3.1, §3.7 (batching ≤2000 files, timeout 120s)
 *
 * @param filePaths – Array of file paths to index
 * @param params – Indexing parameters (codebaseRoot, snapshotId)
 * @returns Extracted symbols, or empty array on SCIP failure/timeout
 */
export function runScipExtraction(
  filePaths: string[],
  params: { codebaseRoot: string; snapshotId: string },
): ScipSymbol[] {
  const { codebaseRoot, snapshotId } = params;

  // Find tsconfig.json in codebase root or nearest parent
  let tsconfigPath = path.join(codebaseRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    // Try parent directory
    tsconfigPath = path.join(codebaseRoot, '..', 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      // Not found – return empty (will trigger AST fallback)
      return [];
    }
  }

  // Invoke SCIP CLI with timeout (120s per batch, cite: ts_ingest_spec §3.7)
  const scipIndex = invokeScipCli(codebaseRoot, tsconfigPath, 120_000);

  if (!scipIndex) {
    // Timeout or invocation failed – return empty to trigger AST fallback
    return [];
  }

  // Parse and return extracted symbols
  return parseScipOutput(scipIndex, codebaseRoot, snapshotId);
}
