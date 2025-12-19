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
 * Pure function: deterministic based on input parameters only.
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
export function generateSymbolId(
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
 * Invoke SCIP CLI and parse binary output.
 * Outputs to binary SCIP format (.scip file), then converts to JSON via `scip-typescript print`.
 * Falls back gracefully to AST if SCIP invocation fails.
 * Cite: ts_ingest_spec.md §3.7 (batching, timeouts)
 * Cite: ts_ingest_spec.md §3.1 (SCIP-first principle)
 * Cite: ts_ingest_spec.md §3.3 (AST fallback triggers)
 *
 * @param codebaseRoot – Root directory of codebase
 * @param tsconfigPath – Path to tsconfig.json
 * @param timeoutMs – Timeout in milliseconds (default: 120000 = 120s)
 * @returns Parsed SCIP JSON output, or null if invocation failed/timed out (triggers AST fallback)
 */
function invokeScipCliAndParse(
  codebaseRoot: string,
  tsconfigPath: string,
  timeoutMs: number = 120_000,
): ScipIndex | null {
  const tmpDir = path.join(codebaseRoot, '.scip-tmp');
  const outputFile = path.join(tmpDir, `index-${Date.now()}.scip`);

  try {
    // Create temporary directory for SCIP output
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Step 1: Invoke `scip-typescript index` to generate binary SCIP file
    // Use absolute path for tsconfig to ensure correct project resolution
    // Cite: ts_ingest_spec.md §3.1 (SCIP CLI invocation)
    // Cite: https://github.com/sourcegraph/scip-typescript (CLI documentation)
    const absoluteTsconfigPath = path.isAbsolute(tsconfigPath)
      ? tsconfigPath
      : path.join(codebaseRoot, tsconfigPath);

    const scipCommand = [
      'npx',
      '@sourcegraph/scip-typescript',
      'index',
      `--cwd=${codebaseRoot}`,
      `--output=${outputFile}`,
      absoluteTsconfigPath,
    ].join(' ');

    try {
      execSync(scipCommand, {
        cwd: codebaseRoot,
        timeout: timeoutMs,
        stdio: ['pipe', 'pipe', 'pipe'], // Capture stdout/stderr to prevent noise
      });
    } catch (error) {
      // Handle invocation errors gracefully – fall back to AST
      // Cite: ts_ingest_spec.md §3.3 (AST fallback on SCIP failure)
      if (error instanceof Error) {
        const errorStr = error.toString();
        if (errorStr.includes('ETIMEDOUT')) {
          console.debug(`[SCIP] Timeout after ${timeoutMs}ms. Using AST fallback.`);
          return null;
        }
        if (errorStr.includes('ENOENT') || errorStr.includes('not found')) {
          console.debug(
            '[SCIP] scip-typescript command not found or tsconfig not found. Using AST fallback.',
          );
          return null;
        }
      }
      // Any SCIP error triggers AST fallback
      console.debug('[SCIP] Invocation failed. Using AST fallback.');
      return null;
    }

    // Verify output file was created
    if (!fs.existsSync(outputFile)) {
      console.debug('[SCIP] Output file not created. Using AST fallback.');
      return null;
    }

    // Step 2: Parse binary SCIP file using `scip-typescript print` command
    // Convert binary SCIP protobuf to JSON format for easier parsing
    let jsonOutput: string;
    try {
      jsonOutput = execSync(`npx @sourcegraph/scip-typescript print "${outputFile}"`, {
        cwd: codebaseRoot,
        timeout: timeoutMs,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
      });
    } catch {
      console.debug('[SCIP] Print command failed. Using AST fallback.');
      return null;
    }

    // Step 3: Parse JSON output
    let scipIndex: ScipIndex;
    try {
      scipIndex = JSON.parse(jsonOutput) as ScipIndex;
    } catch {
      console.debug('[SCIP] Failed to parse JSON output. Using AST fallback.');
      return null;
    }

    return scipIndex;
  } catch {
    console.debug('[SCIP] Unexpected error. Using AST fallback.');
    return null;
  } finally {
    // Clean up temporary file (best effort)
    try {
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Infer symbol kind from display name.
 * Pure function: deterministic based on input string only.
 * Cite: ts_ingest_spec.md §3.1 (symbol kind inference)
 *
 * @param displayName – Display name from SCIP metadata
 * @returns Inferred symbol kind
 */
export function inferSymbolKind(displayName: string): ScipSymbol['kind'] {
  const lower = displayName.toLowerCase();
  if (lower.includes('function')) return 'function';
  if (lower.includes('class')) return 'class';
  if (lower.includes('interface')) return 'interface';
  if (lower.includes('enum')) return 'enum';
  if (lower.includes('type') || lower.includes('alias')) return 'type';
  if (lower.includes('const')) return 'const';
  if (lower.includes('method')) return 'method';
  return 'other';
}

/**
 * Extract relative file path from SCIP URI.
 * URI examples: "file:///home/user/repo/src/main.ts"
 */
function extractFilePathFromUri(uri: string, codebaseRoot: string): string {
  const filePath = uri
    .replace(/^file:\/\/\/?/, '') // Remove file:// or file:/// prefix
    .replace(new RegExp(`^${codebaseRoot}/?`), '') // Remove codebase root to get relative path
    .replace(/\\/g, '/'); // Normalize backslashes to forward slashes (Windows)
  return filePath === uri ? '' : filePath;
}

/**
 * Process a single occurrence and add symbol to collection if valid.
 * Cite: ts_ingest_spec.md §3.1 (occurrence-based symbol extraction)
 */
function processOccurrence(
  occurrence: {
    range: [number, number, number, number, number, number];
    symbol: string;
    symbolRoles?: number[];
  },
  filePath: string,
  fileContent: string,
  scipIndex: ScipIndex,
  snapshotId: string,
  seenSymbolIds: Set<string>,
  symbols: ScipSymbol[],
): void {
  const [startByte, endByte] = occurrence.range;
  const symbolPath = occurrence.symbol || '';

  if (!symbolPath) {
    return;
  }

  const range = convertByteOffsetToLineCol(fileContent, startByte, endByte);
  const symbolName = symbolPath.split(/[.:#]/).pop() || 'unknown';
  const symbolId = generateSymbolId(
    snapshotId,
    filePath,
    symbolName,
    range.startLine,
    range.startCol,
  );

  if (seenSymbolIds.has(symbolId)) {
    return;
  }

  const symbolMeta = scipIndex.symbols?.[symbolPath];
  const kind = inferSymbolKind(symbolMeta?.displayName || '');
  const docstring = symbolMeta?.documentation?.[0];
  const isExported = !symbolPath.startsWith('local/');

  const symbol: ScipSymbol = {
    id: symbolId,
    name: symbolName,
    kind,
    range,
    filePath,
    isExported,
    docstring,
    confidence: 'scip',
  };

  symbols.push(symbol);
  seenSymbolIds.add(symbolId);
}

/**
 * Extract symbols from parsed SCIP JSON output.
 * Processes occurrences (symbol references) and builds symbol definitions.
 * Cite: ts_ingest_spec.md §3.1, §3.7
 *
 * @param scipIndex – Parsed SCIP JSON output from `scip-typescript print`
 * @param codebaseRoot – Root directory of codebase
 * @param snapshotId – Snapshot identifier
 * @returns Array of extracted symbols with stable IDs and metadata
 */
export function parseScipOutput(
  scipIndex: ScipIndex,
  codebaseRoot: string,
  snapshotId: string,
): ScipSymbol[] {
  const symbols: ScipSymbol[] = [];
  const seenSymbolIds = new Set<string>();

  if (!scipIndex.documents) {
    return symbols;
  }

  // Process each document (file) in the SCIP index
  for (const doc of scipIndex.documents) {
    const uri = doc.uri || '';
    const filePath = extractFilePathFromUri(uri, codebaseRoot);

    if (!filePath) {
      continue;
    }

    // Load file content for byte→line/col conversion
    const fullPath = path.join(codebaseRoot, filePath);
    let fileContent = '';
    try {
      fileContent = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      // File not readable – skip this document
      continue;
    }

    if (!doc.occurrences || doc.occurrences.length === 0) {
      continue;
    }

    // Process occurrences (symbol references and definitions in the file)
    // Cite: ts_ingest_spec.md §3.1 (occurrence-based symbol extraction)
    for (const occurrence of doc.occurrences) {
      processOccurrence(
        occurrence,
        filePath,
        fileContent,
        scipIndex,
        snapshotId,
        seenSymbolIds,
        symbols,
      );
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
      console.debug('tsconfig.json not found; SCIP cannot run');
      return [];
    }
  }

  // Invoke SCIP CLI with timeout (120s per batch, cite: ts_ingest_spec §3.7)
  // Cite: ts_ingest_spec.md §3.1 (SCIP-first principle)
  const scipIndex = invokeScipCliAndParse(codebaseRoot, tsconfigPath, 120_000);

  if (!scipIndex) {
    // Timeout or invocation failed – return empty to trigger AST fallback
    return [];
  }

  // Parse and return extracted symbols
  return parseScipOutput(scipIndex, codebaseRoot, snapshotId);
}
