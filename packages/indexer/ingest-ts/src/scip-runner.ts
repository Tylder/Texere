/**
 * @file SCIP Runner – TypeScript/JavaScript Symbol Extraction via SCIP CLI + Binary Parsing
 * @description Invoke SCIP CLI, parse binary SCIP output with proto bindings, extract symbols with confidence tagging
 * @reference ts_ingest_spec.md §3.1, §3.1.1, §3.7 (SCIP integration, binary parsing, batching, timeouts)
 * @reference 2a1-ts-symbol-extraction.md §5.2 (implementation details)
 * @reference symbol_id_stability_spec.md §2.1 (symbol ID formula)
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Range } from '@repo/indexer-types';

import {
  Index as ScipIndexMessage,
  SymbolInformation_Kind,
  SymbolRole,
} from './scip/generated/scip.js';
import type {
  Index as ScipIndex,
  Occurrence as ScipOccurrence,
  SymbolInformation as ScipSymbolInformation,
} from './scip/generated/scip.js';

/**
 * SCIP proto index structure (deserialized from binary).
 * Cite: ts_ingest_spec.md §3.1.1 (SCIP schema)
 */
export type { ScipIndex };

/**
 * Symbol extracted via SCIP with complete metadata and confidence tagging.
 * Cite: ts_ingest_spec.md §3.1, §3.8
 */
export interface ScipSymbol {
  id: string; // Stable ID per symbol_id_stability_spec §2.1
  name: string;
  kind:
    | 'function'
    | 'class'
    | 'method'
    | 'interface'
    | 'type'
    | 'enum'
    | 'const'
    | 'variable'
    | 'other';
  range: Range;
  filePath: string;
  isExported: boolean;
  docstring: string | undefined;
  confidence: 'scip';
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
 * Convert SCIP range format to 1-indexed line/column positions.
 * SCIP range format: 0-indexed [startLine, startCol, endCol] or [startLine, startCol, endLine, endCol]
 * (position encoding: UTF8/UTF16 code units or UTF32 units per position_encoding).
 * Cite: ts_ingest_spec.md §3.1.1 (Ranges)
 *
 * @param range – SCIP range as [startLine, startCol, endCol] or [startLine, startCol, endLine, endCol]
 * @returns Line/column range (1-indexed)
 */
export function convertScipRangeToRange(range: readonly number[]): Range | null {
  // SCIP range format: [startLine, startCol, endCol] or [startLine, startCol, endLine, endCol]
  // All are 0-indexed; convert to 1-indexed
  // Cite: ts_ingest_spec.md §3.1.1 (Ranges)
  if (range.length < 3) {
    return null;
  }

  const startLine = (range[0] ?? 0) + 1;
  const startCol = (range[1] ?? 0) + 1;

  if (range.length >= 4) {
    const endLine = (range[2] ?? 0) + 1;
    const endCol = (range[3] ?? 0) + 1;
    return {
      startLine,
      startCol,
      endLine,
      endCol,
    };
  }

  const endCol = (range[2] ?? 0) + 1;
  return {
    startLine,
    startCol,
    endLine: startLine,
    endCol,
  };
}

/**
 * Invoke SCIP CLI to generate binary SCIP output.
 * Generates binary SCIP format (.scip file) that will be parsed with proto bindings.
 * Returns the file path; parsing happens in parseScipBinary().
 * Falls back gracefully to AST if SCIP invocation fails.
 * Cite: ts_ingest_spec.md §3.1 (SCIP CLI invocation)
 * Cite: ts_ingest_spec.md §3.1.1 (binary format, protocol parsing)
 * Cite: ts_ingest_spec.md §3.7 (batching, timeouts)
 *
 * @param codebaseRoot – Root directory of codebase
 * @param tsconfigPath – Path to tsconfig.json
 * @param timeoutMs – Timeout in milliseconds (default: 120000 = 120s)
 * @returns Path to SCIP binary file, or null if invocation failed/timed out (triggers AST fallback)
 */
export function invokeScipCli(
  codebaseRoot: string,
  tsconfigPath: string,
  timeoutMs: number = 120_000,
): string | null {
  const tmpDir = path.join(codebaseRoot, '.scip-tmp');
  const outputFile = path.join(tmpDir, `index-${Date.now()}.scip`);

  try {
    // Create temporary directory for SCIP output
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Invoke `scip-typescript index` to generate binary SCIP file
    // Cite: ts_ingest_spec.md §3.1 (SCIP CLI invocation)
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
      console.debug('[SCIP] Invocation failed. Using AST fallback.');
      return null;
    }

    // Verify output file was created
    if (!fs.existsSync(outputFile)) {
      console.debug('[SCIP] Output file not created. Using AST fallback.');
      return null;
    }

    return outputFile;
  } catch (error) {
    console.debug(
      '[SCIP] Unexpected error:',
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Parse binary SCIP file using proto bindings.
 * Cite: ts_ingest_spec.md §3.1.1 (binary format, protocol parsing)
 * TODO: Implement with ts-proto + @bufbuild/protobuf generated bindings.
 *
 * @param binaryPath – Path to .scip binary file
 * @returns Parsed SCIP Index, or null on parse error
 */
export function parseScipBinary(binaryPath: string): ScipIndex | null {
  try {
    const buffer = fs.readFileSync(binaryPath);
    const parsedIndex = ScipIndexMessage.decode(buffer);
    return parsedIndex;
  } catch (error) {
    console.debug(
      '[SCIP] Failed to parse binary SCIP file:',
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Check if occurrence has Definition symbol role.
 * Pure function: checks bitmask of symbol roles.
 * Cite: ts_ingest_spec.md §3.1.1 (Definitions)
 * SymbolRole.Definition = 1 per SCIP schema.
 *
 * @param symbolRoles – Array of symbol role bits
 * @returns true if occurrence contains Definition role
 */
export function hasDefinitionRole(symbolRoles: number | undefined): boolean {
  if (symbolRoles === undefined) {
    return false;
  }
  // SymbolRole.Definition = 1; check bitmask
  // Cite: ts_ingest_spec.md §3.1.1
  return (symbolRoles & SymbolRole.Definition) !== 0;
}

/**
 * Infer symbol kind from display name heuristically.
 * Pure function: deterministic based on SCIP symbol metadata.
 * Cite: ts_ingest_spec.md §3.1 (symbol kind inference)
 *
 * @param displayName – Display name from SCIP metadata
 * @returns Inferred symbol kind
 */
export function inferSymbolKind(symbolInfo: ScipSymbolInformation | undefined): ScipSymbol['kind'] {
  // Prefer SCIP SymbolInformation.kind when available; fall back to displayName heuristics.
  // Cite: ts_ingest_spec.md §3.1 (kind inference)
  const kind = symbolInfo?.kind;
  switch (kind) {
    case SymbolInformation_Kind.Function:
      return 'function';
    case SymbolInformation_Kind.Method:
    case SymbolInformation_Kind.AbstractMethod:
    case SymbolInformation_Kind.ProtocolMethod:
    case SymbolInformation_Kind.PureVirtualMethod:
    case SymbolInformation_Kind.Constructor:
    case SymbolInformation_Kind.Accessor:
    case SymbolInformation_Kind.Getter:
    case SymbolInformation_Kind.Setter:
    case SymbolInformation_Kind.SingletonMethod:
    case SymbolInformation_Kind.StaticMethod:
      return 'method';
    case SymbolInformation_Kind.Class:
    case SymbolInformation_Kind.SingletonClass:
      return 'class';
    case SymbolInformation_Kind.Interface:
    case SymbolInformation_Kind.Protocol:
      return 'interface';
    case SymbolInformation_Kind.TypeAlias:
    case SymbolInformation_Kind.TypeParameter:
      return 'type';
    case SymbolInformation_Kind.Enum:
    case SymbolInformation_Kind.EnumMember:
      return 'enum';
    case SymbolInformation_Kind.Constant:
      return 'const';
    case SymbolInformation_Kind.Variable:
    case SymbolInformation_Kind.Field:
    case SymbolInformation_Kind.Property:
    case SymbolInformation_Kind.StaticField:
      return 'variable';
    default:
      break;
  }

  const displayName = symbolInfo?.displayName ?? '';
  const lower = displayName.toLowerCase();
  if (lower.includes('function')) return 'function';
  if (lower.includes('class')) return 'class';
  if (lower.includes('interface')) return 'interface';
  if (lower.includes('enum')) return 'enum';
  if (lower.includes('type') || lower.includes('alias')) return 'type';
  if (lower.includes('const') || lower.includes('constant')) return 'const';
  if (lower.includes('variable')) return 'variable';
  if (lower.includes('method')) return 'method';
  return 'other';
}

function extractSymbolName(symbolPath: string): string {
  if (!symbolPath) {
    return 'unknown';
  }
  const lastSegment = symbolPath.split(/[.:#]/).pop();
  return lastSegment && lastSegment.length > 0 ? lastSegment : symbolPath;
}

function resolveSymbolName(
  symbolPath: string,
  symbolInfo: ScipSymbolInformation | undefined,
): string {
  const displayName = symbolInfo?.displayName;
  if (displayName && displayName.trim().length > 0) {
    return displayName;
  }
  return extractSymbolName(symbolPath);
}

function buildSymbolInfoMap(
  symbols: ScipSymbolInformation[] | undefined,
): Map<string, ScipSymbolInformation> {
  const map = new Map<string, ScipSymbolInformation>();
  if (!symbols) {
    return map;
  }
  for (const symbol of symbols) {
    if (symbol.symbol) {
      map.set(symbol.symbol, symbol);
    }
  }
  return map;
}

/**
 * Process a single occurrence and add symbol to collection if valid.
 * Only emit symbols with Definition role; other occurrences are references (Slice 2A2).
 * Cite: ts_ingest_spec.md §3.1 (occurrence-based symbol extraction)
 * Cite: ts_ingest_spec.md §3.1.1 (Definitions)
 *
 * @param occurrence – SCIP occurrence with range, symbol path, and roles
 * @param filePath – Relative file path
 * @param scipIndex – Parsed SCIP index
 * @param snapshotId – Snapshot identifier
 * @param seenSymbolIds – Set of already-emitted symbol IDs (for deduping)
 * @param symbols – Array to collect extracted symbols
 */
function processOccurrence(
  occurrence: ScipOccurrence,
  filePath: string,
  symbolInfoMap: Map<string, ScipSymbolInformation>,
  snapshotId: string,
  seenSymbolIds: Set<string>,
  symbols: ScipSymbol[],
): void {
  const symbolPath = occurrence.symbol ?? '';

  // Only emit definitions; references are Slice 2A2
  // Cite: ts_ingest_spec.md §3.1.1 (Definitions)
  if (!hasDefinitionRole(occurrence.symbolRoles)) {
    return;
  }

  if (!symbolPath) {
    return;
  }

  // Convert SCIP range (0-indexed line/col) to 1-indexed Range
  // Cite: ts_ingest_spec.md §3.1.1 (Ranges)
  const range = convertScipRangeToRange(occurrence.range ?? []);
  if (!range) {
    return;
  }

  const symbolInfo = symbolInfoMap.get(symbolPath);
  const symbolName = resolveSymbolName(symbolPath, symbolInfo);
  const symbolId = generateSymbolId(
    snapshotId,
    filePath,
    symbolName,
    range.startLine,
    range.startCol,
  );

  // Dedupe by ID
  if (seenSymbolIds.has(symbolId)) {
    return;
  }

  const kind = inferSymbolKind(symbolInfo);
  const docstring = symbolInfo?.documentation?.[0];
  const isExported = !symbolPath.startsWith('local');

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
 * Extract symbols from parsed SCIP Index structure.
 * Processes occurrences (symbol definitions only) and builds symbol definitions with metadata.
 * Cite: ts_ingest_spec.md §3.1, §3.1.1, §3.7
 * Cite: ts_ingest_spec.md §3.6 (merge & ordering rules)
 *
 * @param scipIndex – Parsed SCIP Index from binary deserialization
 * @param snapshotId – Snapshot identifier
 * @returns Array of extracted symbols with stable IDs and metadata, sorted deterministically
 */
export function parseScipOutput(scipIndex: ScipIndex, snapshotId: string): ScipSymbol[] {
  const symbols: ScipSymbol[] = [];
  const seenSymbolIds = new Set<string>();

  const documents = scipIndex.documents ?? [];

  // Process each document (file) in the SCIP index
  // Cite: ts_ingest_spec.md §3.1.1 (Document.relative_path is the canonical file key)
  for (const doc of documents) {
    const filePath = doc.relativePath ?? '';

    if (!filePath) {
      continue;
    }

    const occurrences = doc.occurrences ?? [];
    if (occurrences.length === 0) {
      continue;
    }

    const symbolInfoMap = buildSymbolInfoMap(doc.symbols);

    // Process occurrences (symbol definitions in the file)
    // Only definitions are emitted here; references are Slice 2A2
    // Cite: ts_ingest_spec.md §3.1 (occurrence-based symbol extraction)
    for (const occurrence of occurrences) {
      processOccurrence(occurrence, filePath, symbolInfoMap, snapshotId, seenSymbolIds, symbols);
    }
  }

  return symbols;
}

/**
 * Run SCIP extraction on a batch of files.
 * Invokes SCIP CLI, parses output, extracts symbols with stable IDs.
 * Returns symbols sorted deterministically for deduplication in caller.
 * Cite: ts_ingest_spec.md §3.1, §3.7 (batching ≤2000 files, timeout 120s)
 * Cite: ts_ingest_spec.md §3.6 (deterministic ordering)
 *
 * @param _filePaths – Array of file paths to index (currently unused; SCIP indexes all)
 * @param params – Indexing parameters (codebaseRoot, snapshotId)
 * @returns Extracted symbols sorted by filePath/startLine/startCol, or empty array on SCIP failure/timeout
 */
export function runScipExtraction(
  _filePaths: string[],
  params: { codebaseRoot: string; snapshotId: string },
): ScipSymbol[] {
  const { codebaseRoot, snapshotId } = params;

  // Find tsconfig.json in codebase root or nearest parent
  // Cite: ts_ingest_spec.md §3.1 (tsconfig.json location)
  let tsconfigPath = path.join(codebaseRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    // Try parent directory
    tsconfigPath = path.join(codebaseRoot, '..', 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      // Not found – return empty (will trigger AST fallback)
      console.debug('[SCIP] tsconfig.json not found; SCIP cannot run. Using AST fallback.');
      return [];
    }
  }

  // Invoke SCIP CLI with timeout (120s per batch, cite: ts_ingest_spec §3.7)
  // Cite: ts_ingest_spec.md §3.1 (SCIP-first principle)
  const scipBinaryPath = invokeScipCli(codebaseRoot, tsconfigPath, 120_000);

  if (!scipBinaryPath) {
    // Timeout or invocation failed – return empty to trigger AST fallback
    return [];
  }

  // Parse binary SCIP file
  // Cite: ts_ingest_spec.md §3.1.1 (protocol parsing)
  const scipIndex = parseScipBinary(scipBinaryPath);

  // Clean up binary file
  try {
    if (fs.existsSync(scipBinaryPath)) {
      fs.unlinkSync(scipBinaryPath);
    }
  } catch {
    // Ignore cleanup errors
  }

  if (!scipIndex) {
    // Binary parsing failed – return empty to trigger AST fallback
    return [];
  }

  // Parse and return extracted symbols
  const symbols = parseScipOutput(scipIndex, snapshotId);

  // Sort deterministically for caller's merge/dedupe
  // Cite: ts_ingest_spec.md §3.6 (deterministic ordering)
  return symbols.sort((a, b): number => {
    if (a.filePath !== b.filePath) {
      return a.filePath.localeCompare(b.filePath);
    }
    if (a.range.startLine !== b.range.startLine) {
      return a.range.startLine - b.range.startLine;
    }
    return a.range.startCol - b.range.startCol;
  });
}
