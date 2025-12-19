# Slice 2A1: TypeScript/JavaScript Symbol Extraction – Implementation Plan

**Document Version:** 1.1  
**Status:** Implementation-Ready  
**Last Updated:** December 19, 2025  
**Author:** Agent (Texere Indexer Team)  
**Related Slices:** [Slice 2A Plan Overview](./plan.md) → Slices 2A1 → 2A2 → 2B1–2B3

---

## Quick Navigation

- [1. Executive Summary](#1-executive-summary)
- [2. Scope & Acceptance Criteria](#2-scope--acceptance-criteria)
- [3. Governing Specifications](#3-governing-specifications)
- [4. Architecture & Design](#4-architecture--design)
- [5. Implementation Breakdown](#5-implementation-breakdown)
- [6. Testing Strategy](#6-testing-strategy)
- [7. Golden Files & Validation](#7-golden-files--validation)
- [8. Files & Dependencies](#8-files--dependencies)
- [9. Quality Gates & Validation](#9-quality-gates--validation)
- [10. Implementation Order](#10-implementation-order)
- [11. Risks & Mitigations](#11-risks--mitigations)
- [12. Success Criteria Checklist](#12-success-criteria-checklist)

---

## 1. Executive Summary

**Slice 2A1** extracts **TypeScript/JavaScript symbols** from source files using **SCIP-first + AST
fallback**, emitting stable symbol nodes with complete metadata (name, kind, range, docstring,
export flags, confidence levels). This slice produces the foundation for all downstream reference
extraction, boundary detection, and test case linking.

**Deliverables:**

- ✅ `@repo/indexer-ingest-ts` Nx package (symbol extraction engine)
- ✅ SCIP + AST integration (dual-pipeline symbol extraction)
- ✅ Comprehensive unit tests (12–15 tests, 60–75% coverage)
- ✅ Integration test with golden file snapshot (test-typescript-app `main` branch, 287 symbols)
- ✅ Zero regressions vs. golden (CI gate)

**Non-Deliverables (Slice 2A2):**

- References (CALL/IMPORT/TYPE_REF) — Slice 2A2
- Boundaries, test cases, data contracts — Slices 2B1–2B3
- Graph persistence — Slice 3

---

## 2. Scope & Acceptance Criteria

### 2.1 Scope (In Scope)

1. **Extract all symbol kinds** from TS/JS files:
   - Functions (function declarations)
   - Classes (class declarations + methods)
   - Interfaces (interface declarations)
   - Type aliases (type keyword)
   - Enums (enum declarations)
   - Constants & variables (const/let/var at module level)
   - Parameters (function/method parameters captured in context)

2. **Generate stable symbol IDs** per formula:

   ```
   ${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}
   ```

   Cite: `symbol_id_stability_spec.md` §1.1, §2.1

3. **Capture complete metadata** for each symbol:
   - Name, kind, range (start/end line/col)
   - Export flags (is exported? re-exported?)
   - JSDoc/docstring (first line, if present)
   - Confidence level (scip, ast, heuristic)

4. **Emit IN_SNAPSHOT edges** for cardinality invariant:
   - Each symbol must have exactly 1 `[:IN_SNAPSHOT]` edge
   - Cite: `graph_schema_spec.md` §4.1B

5. **Handle all file types** in scope:
   - `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.mts`, `.cts`
   - Cite: `ts_ingest_spec.md` §2 (input filtering)

6. **Path filtering** (denylist enforcement):
   - Skip files matching `.gitignore` + enforced defaults:
     - `**/node_modules/**`, `**/.next/**`, `**/dist/**`, `**/coverage/**`
     - `**/__snapshots__/**`, `**/fixtures/**`, `**/vendor/**`
   - Cite: `ts_ingest_spec.md` §2 (path filters)

7. **Deterministic ordering**:
   - Sort output by `filePath`, `startLine`, `startCol`
   - No duplicates (dedupe by `{snapshotId, filePath, name, startLine, startCol}`)
   - Cite: `ts_ingest_spec.md` §3.6 (deterministic ordering)

### 2.2 Acceptance Criteria (Definition of Done)

- ✅ On test-typescript-app `main` branch, symbol extraction matches golden snapshot exactly
- ✅ No orphan symbols (every symbol linked via IN_SNAPSHOT)
- ✅ No missing symbols (full coverage of test_repository_spec.md expectations: 287 symbols, 25
  files)
- ✅ All symbol kinds properly classified (per test_repository_spec.md §3: functions, classes,
  interfaces, types, enums, constants)
- ✅ Docstrings extracted for JSDoc-annotated symbols
- ✅ Export flags correct for all symbols
- ✅ Unit tests pass (12–15 tests, 60–75% line coverage minimum)
- ✅ Integration test passes (full pipeline + golden comparison)
- ✅ Zero linting/type errors (`pnpm lint`, `pnpm typecheck`)
- ✅ Build succeeds (`pnpm build`)

---

## 3. Governing Specifications

All implementation decisions must cite and comply with these specifications:

| Spec Document                 | Section(s)   | Purpose                                                                              | Cite As                  |
| ----------------------------- | ------------ | ------------------------------------------------------------------------------------ | ------------------------ |
| `ts_ingest_spec.md`           | §2–3, §7     | TS/JS symbol extraction rules, ID formulas, testing fixtures                         | ts_ingest_spec           |
| `ingest_spec.md`              | §3–4, §6.1   | FileIndexResult structure, LanguageIndexer interface, snapshot resolution            | ingest_spec              |
| `symbol_id_stability_spec.md` | §1–2, §5     | Symbol ID algorithm, stability guarantees, deterministic ordering                    | symbol_id_stability_spec |
| `test_repository_spec.md`     | §3, §6–7, §9 | Node coverage matrix (287 symbols), file breakdown, edge cases, validation checklist | test_repository_spec     |
| `testing_strategy.md`         | §2.2–4       | Testing trophy (60–75% unit, 15–25% integration), what to test by level              | testing_strategy         |
| `testing_specification.md`    | §3.1–3.5, §7 | Colocated test files, vitest config, coverage targets                                | testing_specification    |
| `nx_layout_spec.md`           | §2.3         | `indexer-ingest-ts` library structure, dependency boundaries, tags                   | nx_layout_spec           |
| `graph_schema_spec.md`        | §4.1B        | IN_SNAPSHOT cardinality invariant, constraint enforcement                            | graph_schema_spec        |

**How to cite in code:**

```typescript
/**
 * Extract symbols from TS source file
 * @reference ts_ingest_spec.md §3 (symbol extraction rules)
 * @reference symbol_id_stability_spec.md §2.1 (ID formula)
 * @reference test_repository_spec.md §3 (expected 287 symbols)
 */
function extractSymbols(...) { ... }
```

---

## 4. Architecture & Design

### 4.1 Package Structure

```
packages/indexer/ingest-ts/
├── src/
│   ├── index.ts                           # Public API exports
│   ├── symbol-extractor.ts                # Main orchestrator (LanguageIndexer impl)
│   ├── scip-runner.ts                     # SCIP CLI integration
│   ├── ast-fallback.ts                    # TypeScript AST fallback
│   ├── symbol-kinds.ts                    # Symbol kind classification
│   ├── types.ts                           # Internal types (optional)
│   └── __tests__/
│       ├── fixtures/
│       │   └── main-snapshot.symbols.golden.json  # Golden snapshot
│       ├── symbol-extractor.test.ts       # Unit tests (symbol kinds, docstrings, etc.)
│       ├── scip-runner.test.ts            # SCIP CLI tests
│       └── integration.test.ts            # Full pipeline on test-typescript-app
├── package.json
├── project.json                           # Nx configuration
├── tsconfig.json                          # Project-level TypeScript config
├── vitest.config.ts                       # Vitest configuration
├── vitest.setup.ts                        # Test setup/teardown
├── README.md                              # Package documentation
└── dist/                                  # Build output (generated)
```

**Nx Tags** (enforced by module-boundary rules):

```json
{
  "tags": ["domain:indexer", "layer:ingest"]
}
```

### 4.2 Data Flow

```
Input (TS/JS files)
    ↓
[Symbol Extractor Orchestrator]
    ├─→ File filtering (denylist/allowlist per ts_ingest_spec §2)
    ├─→ SCIP Runner (primary path)
    │   └─→ Parse `index.scip` via SCIP bindings → symbols + metadata
    ├─→ AST Fallback (on SCIP failure or gaps)
    │   └─→ TypeScript compiler API → symbols + metadata
    ├─→ Merge & Dedupe (SCIP > AST by confidence)
    ├─→ Sort deterministically (filePath, startLine, startCol)
    └─→ Emit FileIndexResult[]
         └─→ Golden comparison (test-typescript-app validation)
```

### 4.3 Key Concepts

### 4.4 SCIP Runner Notes (Implementation Detail)

**STATUS (Slice 2A1)**: SCIP binary protobuf parsing is required in Slice 2A1. Use generated
bindings and the schema parsing requirements in `ts_ingest_spec.md` §3.1.1; AST fallback remains
secondary for SCIP gaps and failures.

- **Invocation**: run the `scip-typescript` **CLI** (child process), not a programmatic API.  
   Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)  
   Command:
  `npx @sourcegraph/scip-typescript index --cwd=<codebaseRoot> --output=<outputFile> <tsconfigPath>`
- **Output**: Binary SCIP protobuf format (`index.scip`). Parse via generated bindings; follow
  `ts_ingest_spec.md` §3.1.1 for metadata ordering, range decoding, and encoding conversions.  
   Docs: [SCIP schema](https://github.com/sourcegraph/scip/blob/main/scip.proto) |
  [CLI reference](https://github.com/sourcegraph/scip/blob/main/docs/CLI.md)
- **Flags**: use `--cwd` for working directory; `--infer-tsconfig` for JS-only repos;
  `--yarn-workspaces` / `--pnpm-workspaces` for workspaces; `--progress-bar` for diagnosing
  stalls.  
   Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **OOM mitigation**: prefer `--no-global-caches` or increase Node heap size when the CLI OOMs.  
   Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **Diagnostics**: use `scip snapshot` or `protoc --decode=scip.Index scip.proto` for inspection
  only (no ingest fallback).

**Symbol ID Formula** (cite: symbol_id_stability_spec.md §2.1):

```
${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}

Example: test-ts-app:abc123:src/services/user.service.ts:UserService:5:7
```

**Confidence Levels** (cite: ts_ingest_spec.md §3.8):

- `scip` — Extracted via SCIP (preferred, deterministic)
- `ast` — Extracted via TypeScript AST (fallback, manual verification needed)
- `heuristic` — Inferred via naming/pattern heuristics
- `llm` — LLM-assisted (not used in symbol extraction; reserved for boundaries/features)

**Cardinality Invariant** (cite: graph_schema_spec.md §4.1B):

- Every snapshot-scoped symbol must have exactly 1 `[:IN_SNAPSHOT]` edge
- Enforced at persistence layer (Slice 3), but emitted here

---

## 5. Implementation Breakdown

### 5.1 `symbol-extractor.ts` — Main Orchestrator

**Responsibility:** Implement `LanguageIndexer` interface; coordinate SCIP + AST; emit
`FileIndexResult[]`.

**Interface** (cite: ingest_spec.md §4):

```typescript
export interface LanguageIndexer {
  canHandleFile(filePath: string): boolean;
  indexFiles(params: IndexFilesParams): Promise<FileIndexResult[]>;
}

export interface IndexFilesParams {
  codebaseRoot: string;
  snapshotId: string;
  filePaths: string[];
}
```

**Export:**

```typescript
export const tsJsIndexer: LanguageIndexer;
```

**Implementation outline:**

```typescript
export const tsJsIndexer: LanguageIndexer = {
  canHandleFile(filePath: string): boolean {
    // ts_ingest_spec.md §2: supported extensions
    return /\.(ts|tsx|js|mjs|cjs|mts|cts)$/.test(filePath);
  },

  async indexFiles(params: IndexFilesParams): Promise<FileIndexResult[]> {
    // 1. Filter files (denylist/allowlist, ts_ingest_spec §2)
    const filtered = filterFiles(params.filePaths);

    // 2. Try SCIP first (primary path, ts_ingest_spec §3.1)
    const scipSymbols = await runScipExtraction(filtered, params);

    // 3. AST fallback for missing/gap files (ts_ingest_spec §3.3)
    const astSymbols = await runAstFallback(filtered, params, scipSymbols);

    // 4. Merge & dedupe (ts_ingest_spec §3.6)
    const merged = mergeAndDedupeSymbols(scipSymbols, astSymbols);

    // 5. Sort deterministically (symbol_id_stability_spec §2.1)
    const sorted = sorted(merged, (a, b) => {
      if (a.range.filePath !== b.range.filePath)
        return a.range.filePath.localeCompare(b.range.filePath);
      if (a.range.startLine !== b.range.startLine) return a.range.startLine - b.range.startLine;
      return a.range.startCol - b.range.startCol;
    });

    // 6. Emit FileIndexResult with IN_SNAPSHOT edges
    return emitFileIndexResults(sorted, params.snapshotId);
  },
};
```

**Tests:**

- `symbol-extractor.test.ts` — Integration between SCIP + AST + merge logic

---

### 5.2 `scip-runner.ts` — SCIP CLI Integration

**Responsibility:** Invoke SCIP CLI, parse output, extract symbols with confidence tagging.

**SCIP Flow** (cite: ts_ingest_spec.md §3.1, §3.7):

```typescript
export interface ScipSymbol {
  id: string; // Stable ID per symbol_id_stability_spec
  name: string;
  kind: SymbolIndex['kind'];
  range: Range;
  isExported: boolean;
  docstring?: string;
  confidence: 'scip'; // Always 'scip' from this module
}

export async function runScipExtraction(
  filePaths: string[],
  params: { codebaseRoot: string; snapshotId: string },
): Promise<ScipSymbol[]> {
  // 1. Batch files per ts_ingest_spec §3.7 (≤ 2_000 files per batch)
  const batches = chunkArray(filePaths, 2000);

  // 2. For each batch:
  //    - Find tsconfig.json (project references if multi-project)
  //    - Invoke: scip-typescript index --project <tsconfig>
  //    - Parse SCIP JSON output
  //    - Extract symbols + occurrence ranges
  //    - Timeout 120s per batch; on timeout, mark for AST fallback

  // 3. Emit ScipSymbol[] with metadata
}

export function parseScipOutput(
  scipJson: ScipIndex,
  snapshotId: string,
  codebaseRoot: string,
): ScipSymbol[] {
  // Parse SCIP output format (per @sourcegraph/scip-typescript docs)
  // Extract:
  // - Document URIs (files)
  // - Occurrences (ranges + symbol references)
  // - Definitions (build symbol table)
  // Build symbol IDs per symbol_id_stability_spec §2.1
}
```

**Spec References:**

- ts_ingest_spec.md §3.1 (SCIP-first principle)
- ts_ingest_spec.md §3.2 (known gaps: decorator shorthand, dynamic imports, JSX)
- ts_ingest_spec.md §3.7 (batching, timeouts)

**Timeout Handling** (cite: ts_ingest_spec.md §3.7):

- Default: 120s per batch
- On timeout: log diagnostic, skip SCIP for that batch, mark for AST fallback
- Continue with other batches

**Tests:**

- `scip-runner.test.ts` — SCIP CLI invocation, JSON parsing, symbol extraction

---

### 5.3 `ast-fallback.ts` — TypeScript AST Fallback

**Responsibility:** Extract symbols via TypeScript compiler API when SCIP unavailable or gaps
detected.

**AST Flow** (cite: ts_ingest_spec.md §3.3):

```typescript
export interface AstSymbol {
  id: string; // Stable ID per symbol_id_stability_spec
  name: string;
  kind: SymbolIndex['kind'];
  range: Range;
  isExported: boolean;
  docstring?: string;
  confidence: 'ast' | 'heuristic'; // Marks AST-derived items
  note?: string; // e.g., 'scip-gap:decorator-shorthand'
}

export async function runAstFallback(
  filePaths: string[],
  params: { codebaseRoot: string; snapshotId: string },
  scipResults?: ScipSymbol[],
): Promise<AstSymbol[]> {
  // 1. Create TypeScript Program (project references, compilerOptions)
  // 2. For each file not covered by SCIP or matching known gaps:
  //    - Get SourceFile via program
  //    - Walk AST via TypeChecker
  //    - Extract function/class/interface/type/enum/const definitions
  //    - Build symbol table with getSymbolAtLocation()
  //    - Generate symbol IDs per symbol_id_stability_spec §2.1
  // 3. Emit AstSymbol[] with confidence: 'ast'
}

function walkAst(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  snapshotId: string,
  filePath: string,
): AstSymbol[] {
  const symbols: AstSymbol[] = [];

  function visit(node: ts.Node): void {
    // ts_ingest_spec §4: node extraction rules

    if (ts.isFunctionDeclaration(node) && node.name) {
      symbols.push(createSymbol(node, 'function', snapshotId, filePath));
    }

    if (ts.isClassDeclaration(node) && node.name) {
      symbols.push(createSymbol(node, 'class', snapshotId, filePath));
      // Extract methods
      node.forEachChild((methodNode) => {
        if (ts.isMethodDeclaration(methodNode) && methodNode.name) {
          symbols.push(createSymbol(methodNode, 'method', snapshotId, filePath));
        }
      });
    }

    // ... interfaces, types, enums, constants

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return symbols;
}

function createSymbol(
  node: ts.Node,
  kind: SymbolIndex['kind'],
  snapshotId: string,
  filePath: string,
): AstSymbol {
  const sourceFile = node.getSourceFile();
  const range = getRange(sourceFile, node);
  const name = getNameFromNode(node);

  return {
    id: generateSymbolId(snapshotId, filePath, name, range.startLine, range.startCol),
    name,
    kind,
    range,
    isExported: isExported(node),
    docstring: getDocstring(node, sourceFile),
    confidence: 'ast',
  };
}
```

**Spec References:**

- ts_ingest_spec.md §3.3 (AST fallback triggers)
- ts_ingest_spec.md §3.2 (known gaps)
- ts_ingest_spec.md §4.1–4.7 (node extraction rules)

**Tests:**

- `ast-fallback.test.ts` — Symbol extraction via TypeScript compiler API

---

### 5.4 `symbol-kinds.ts` — Symbol Kind Classification

**Responsibility:** Classify extracted nodes into canonical symbol kinds.

**Symbol Kinds** (cite: ts_ingest_spec.md §4, test_repository_spec.md §3):

```typescript
export type SymbolKind =
  | 'function'
  | 'class'
  | 'method'
  | 'interface'
  | 'type'
  | 'enum'
  | 'constant'
  | 'variable'
  | 'parameter';

export function classifySymbolKind(node: ts.Node): SymbolKind {
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isMethodDeclaration(node)) return 'method';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isVariableDeclaration(node)) {
    const parent = node.parent?.parent;
    if (parent && ts.isVariableDeclarationList(parent)) {
      const flags = parent.flags;
      if (flags & ts.NodeFlags.Const) return 'constant';
      if (flags & ts.NodeFlags.Let) return 'variable';
    }
  }
  if (ts.isParameter(node)) return 'parameter';
  // ... fallback
}
```

**Tests:**

- `symbol-kinds.test.ts` — Classification for each kind

---

### 5.5 Helper Utilities (within modules above)

**generateSymbolId()**

- Formula: `${snapshotId}:${filePath}:${name}:${startLine}:${startCol}`
- Cite: symbol_id_stability_spec.md §2.1

**getRange(sourceFile, node)**

- Convert TS AST node to Range (1-indexed line/col)
- Cite: ts_ingest_spec.md §2 (ID formula includes range)

**getDocstring(node, sourceFile)**

- Extract JSDoc/comment from leading comments
- Return first line or full block

**isExported(node)**

- Check `ModifierFlags.Export` via `ts.getCombinedModifierFlags()`
- Handle re-exports and namespace exports

**filterFiles(filePaths)**

- Apply denylist/allowlist per ts_ingest_spec.md §2
- Skip `.gitignore` entries + enforced defaults

**emitFileIndexResults(symbols, snapshotId)**

- Convert `SymbolIndex[]` → `FileIndexResult[]`
- Emit IN_SNAPSHOT edges per graph_schema_spec.md §4.1B

---

## 6. Testing Strategy

Cite: `testing_strategy.md` §2.2–4, `testing_specification.md` §3–7

### 6.1 Testing Trophy Distribution

- **Unit Tests: 60–75%** (primary — test symbol extraction logic in isolation)
- **Integration Tests: 15–25%** (test pipeline on full test repo)
- **Golden/E2E: 5–10%** (regression detection via snapshots)

### 6.2 Unit Tests (12–15 tests)

**Location:** `packages/indexer/ingest-ts/src/__tests__/symbol-extractor.test.ts`

**Test Categories:**

1. **Symbol Kind Extraction** (4 tests):

   ```typescript
   describe('Symbol kind extraction (ts_ingest_spec.md §4)', () => {
     it('should extract function declarations', async () => {
       // Fixture: simple function
       const symbols = await extractSymbols(fixture, snapshotId, 'test.ts');
       expect(symbols[0].kind).toBe('function');
     });

     it('should extract class declarations and methods', async () => {
       // Fixture: class with methods
       expect(symbols.find((s) => s.kind === 'class')).toBeDefined();
       expect(symbols.filter((s) => s.kind === 'method').length).toBeGreaterThan(0);
     });

     it('should extract interfaces and type aliases', async () => {
       // Fixture: interface + type alias
       expect(symbols.some((s) => s.kind === 'interface')).toBe(true);
       expect(symbols.some((s) => s.kind === 'type')).toBe(true);
     });

     it('should extract enums and constants', async () => {
       // Fixture: enum + const
       expect(symbols.some((s) => s.kind === 'enum')).toBe(true);
       expect(symbols.some((s) => s.kind === 'constant')).toBe(true);
     });
   });
   ```

2. **Symbol ID Generation** (2 tests):

   ```typescript
   describe('Symbol ID generation (symbol_id_stability_spec.md §2.1)', () => {
     it('should generate stable IDs with correct format', () => {
       const id = generateSymbolId('snap:abc123', 'src/test.ts', 'myFunc', 5, 7);
       expect(id).toBe('snap:abc123:src/test.ts:myFunc:5:7');
     });

     it('should produce identical IDs for same symbol', () => {
       // Same node extracted twice should have same ID
     });
   });
   ```

3. **Export & Docstring Detection** (2 tests):

   ```typescript
   describe('Export and docstring extraction', () => {
     it('should detect exported symbols', () => {
       // Fixture: export function foo() {}
       expect(symbol.isExported).toBe(true);
     });

     it('should extract JSDoc comments', () => {
       // Fixture: /** my func */ function foo() {}
       expect(symbol.docstring).toBe('my func');
     });
   });
   ```

4. **Deduplication & Ordering** (2 tests):

   ```typescript
   describe('Deduplication and ordering (ts_ingest_spec.md §3.6)', () => {
     it('should dedupe by symbol ID', () => {
       // Create duplicate symbols, verify only one remains
     });

     it('should sort deterministically by filePath/line/col', () => {
       const sorted = symbols.sort(byLocation);
       // Verify sorted[i].id < sorted[i+1].id in natural order
     });
   });
   ```

5. **Path Filtering** (2 tests):

   ```typescript
   describe('Path filtering (ts_ingest_spec.md §2)', () => {
     it('should skip node_modules and dist directories', () => {
       const filtered = filterFiles(allPaths);
       expect(filtered.some((p) => p.includes('node_modules'))).toBe(false);
       expect(filtered.some((p) => p.includes('dist'))).toBe(false);
     });

     it('should respect denylist/allowlist from config', () => {
       // Load config with custom denylist
       const filtered = filterFiles(allPaths, config);
       // Verify custom rules applied
     });
   });
   ```

6. **Edge Cases** (3+ tests):

   ```typescript
   describe('Edge cases (test_repository_spec.md §7)', () => {
     it('should handle circular imports', () => {
       // Fixture: A imports B, B imports A
       // Should extract both without stack overflow
     });

     it('should handle re-exports (export { x })', () => {
       // Fixture: export { userService } from './services'
       // Should create symbol for re-export
     });

     it('should handle async/await and advanced syntax', () => {
       // Fixture: async function, arrow functions, template literals
       // Should extract all without parser errors
     });
   });
   ```

### 6.3 Integration Tests (1–2 tests)

**Location:** `packages/indexer/ingest-ts/src/__tests__/integration.test.ts`

```typescript
describe('Full pipeline integration (ts_ingest_spec.md §6)', () => {
  beforeAll(async () => {
    // Initialize with test-typescript-app at /home/anon/TexereIndexerRestRepo
    testRepoPath = '/home/anon/TexereIndexerRestRepo';
    snapshotId = 'test-ts-app:main';
  });

  it('should extract all symbols from test-typescript-app main branch', async () => {
    const files = getAllTsFilesInRepo(testRepoPath);
    const result = await tsJsIndexer.indexFiles({
      codebaseRoot: testRepoPath,
      snapshotId,
      filePaths: files,
    });

    // Verify results match golden snapshot
    expect(result).toMatchSnapshot(); // Vitest .snap file

    // Verify counts match test_repository_spec.md §3
    const symbolCount = result.flatMap((r) => r.symbols).length;
    expect(symbolCount).toBe(287); // Per test_repository_spec.md
  });

  it('should emit IN_SNAPSHOT edges for all symbols', async () => {
    const result = await tsJsIndexer.indexFiles({
      /* ... */
    });

    for (const fileResult of result) {
      for (const symbol of fileResult.symbols) {
        // Verify IN_SNAPSHOT edge exists
        const inSnapshotEdges = fileResult.edges.filter(
          (e) => e.type === 'IN_SNAPSHOT' && e.fromId === symbol.id,
        );
        expect(inSnapshotEdges.length).toBe(1);
      }
    }
  });
});
```

**Validation against test_repository_spec.md:**

- Cite: test_repository_spec.md §3 (node coverage matrix: 287 symbols, 25 files)
- Cite: test_repository_spec.md §6 (git history, 5 snapshots)
- Cite: test_repository_spec.md §9 (validation checklist)

### 6.4 Golden Files

**Location:** `packages/indexer/ingest-ts/src/__tests__/fixtures/main-snapshot.symbols.golden.json`

```json
{
  "snapshotId": "test-ts-app:main-commit-hash",
  "summary": {
    "totalSymbols": 287,
    "totalFiles": 25,
    "byKind": {
      "function": 50,
      "class": 12,
      "method": 40,
      "interface": 8,
      "type": 15,
      "enum": 3,
      "constant": 20,
      "variable": 139
    }
  },
  "files": {
    "src/services/user.service.ts": {
      "count": 12,
      "symbols": [
        {
          "id": "test-ts-app:main-hash:src/services/user.service.ts:UserService:5:7",
          "name": "UserService",
          "kind": "class",
          "range": { "startLine": 5, "startCol": 7, "endLine": 42, "endCol": 1 },
          "isExported": true,
          "confidence": "scip"
        },
        {
          "id": "test-ts-app:main-hash:src/services/user.service.ts:getUserById:10:5",
          "name": "getUserById",
          "kind": "method",
          "range": { "startLine": 10, "startCol": 5, "endLine": 15, "endCol": 4 },
          "isExported": false,
          "confidence": "scip"
        }
        // ... more symbols
      ]
    }
    // ... more files
  }
}
```

**Golden Validation:**

- Checked into git
- Updated via `--update` flag when intentional changes made
- CI fails if output drifts unexpectedly
- Cite: testing_specification.md §3.1 (test file organization)

---

## 7. Golden Files & Validation

### 7.1 Golden File Generation

**Workflow:**

1. **First Run** (generate):

   ```bash
   pnpm nx run indexer-ingest-ts:test -- --update
   ```

   Creates `main-snapshot.symbols.golden.json` snapshot

2. **Verify Manually**:
   - Review snapshot file for correctness
   - Spot-check 5–10 symbols (names, kinds, IDs, ranges)
   - Commit to git

3. **Subsequent Runs** (regression detection):
   ```bash
   pnpm nx run indexer-ingest-ts:test
   ```
   Fails if output doesn't match golden

### 7.2 Validation Checklist

Per test_repository_spec.md §9 (Validation Checklist):

- [ ] All 287 symbols extracted (per §3 node coverage matrix)
- [ ] All 25 files processed
- [ ] Symbols correctly classified by kind (functions, classes, interfaces, types, enums, constants)
- [ ] Symbol IDs stable and correctly formatted
- [ ] Docstrings extracted for JSDoc-annotated symbols
- [ ] Export flags correct for all public/private symbols
- [ ] No duplicate symbols (by ID)
- [ ] Deterministically sorted output
- [ ] All IN_SNAPSHOT edges present (cardinality invariant)
- [ ] Zero missing symbols (compare to test_repository_spec.md expected counts)
- [ ] Edge cases handled (circular imports, re-exports, async/await)

---

## 8. Files & Dependencies

### 8.1 New Files to Create

**Nx Package Scaffolding:**

```
packages/indexer/ingest-ts/
├── project.json                           # Nx project config
├── package.json                           # Dependencies
├── tsconfig.json                          # TypeScript project ref
├── vitest.config.ts                       # Vitest config
├── vitest.setup.ts                        # Test setup
└── README.md                              # Package docs
```

**Implementation Files:**

```
src/
├── index.ts                               # Public API
├── symbol-extractor.ts                    # Main orchestrator
├── scip-runner.ts                         # SCIP CLI integration
├── ast-fallback.ts                        # AST fallback
└── symbol-kinds.ts                        # Kind classification
```

**Test Files:**

```
src/__tests__/
├── fixtures/
│   └── main-snapshot.symbols.golden.json  # Golden snapshot
├── symbol-extractor.test.ts               # Unit tests
├── scip-runner.test.ts                    # SCIP integration tests
└── integration.test.ts                    # Full pipeline tests
```

### 8.2 Files to Modify

1. **`packages/indexer/ingest/src/index.ts`**:
   - Import + re-export `@repo/indexer-ingest-ts` public API
   - Update docs/README

2. **`packages/indexer/ingest/src/orchestrator.ts`**:
   - Call TS indexer during snapshot indexing (future slice when graph persistence ready)

3. **Root Configuration**:
   - `nx.json` — Add `indexer-ingest-ts` project reference if not auto-discovered
   - `tsconfig.base.json` — Add path alias if needed

### 8.3 Dependencies

**`packages/indexer/ingest-ts/package.json`:**

```json
{
  "name": "@repo/indexer-ingest-ts",
  "version": "0.1.0",
  "dependencies": {
    "@repo/indexer-types": "workspace:*",
    "@repo/indexer-core": "workspace:*",
    "@sourcegraph/scip-typescript": "^0.3.0",
    "typescript": "^5.9"
  },
  "devDependencies": {
    "simple-git": "^3.22.0",
    "vitest": "workspace:*"
  }
}
```

**Rationale:**

- `@sourcegraph/scip-typescript` — Primary extraction engine (core dependency)
- `typescript` — AST fallback + compiler API
- `@repo/indexer-types` — Shared type definitions
- `@repo/indexer-core` — Database clients (for Slice 3+)
- `simple-git` — Git operations in tests

---

## 9. Quality Gates & Validation

### 9.1 Per-File Validation

After each implementation file:

```bash
pnpm post:report:fast
```

Checks:

- Format (Prettier)
- Lint (oxlint fast + ESLint full)
- Type checking (TypeScript)
- Test coverage (target: 60–75%)

### 9.2 Full Package Validation

Before handoff:

```bash
pnpm post:report
```

Checks:

- Format + lint + typecheck (same as fast)
- Full test suite + coverage
- Build (`tsc -b`)
- Nx boundary rules (domain:indexer, layer:ingest)

### 9.3 CI Gates

All must pass before merge:

- ✅ Lint (oxlint + ESLint)
- ✅ Type check (TypeScript strict)
- ✅ Tests (unit + integration + golden)
- ✅ Coverage (≥60% for ingest-ts)
- ✅ Build (Nx + tsc)
- ✅ Module boundary checks (Nx)

---

## 10. Implementation Order

**Phase 1: Package Scaffolding** (1–2 hours)

1. Generate `@repo/indexer-ingest-ts` via template
2. Configure Nx tags, tsconfig, vitest
3. Set up README, dependencies
4. Verify builds and type checking

**Phase 2: Symbol Extraction Core** (4–6 hours)

1. Implement `symbol-kinds.ts` (classification logic)
2. Implement `symbol-extractor.ts` orchestrator (interface + wiring)
3. Implement `ast-fallback.ts` (TypeScript compiler API)
4. Unit tests for each module (2–3 tests per file)

**Phase 3: SCIP Integration** (2–3 hours)

1. Implement `scip-runner.ts` (CLI invocation + parsing)
2. Add SCIP timeout handling + diagnostics
3. Unit tests for SCIP parsing

**Phase 4: Merge & Deduplication** (1–2 hours)

1. Finalize merge logic in `symbol-extractor.ts`
2. Deduplication + sorting
3. Emit FileIndexResult + IN_SNAPSHOT edges

**Phase 5: Testing & Validation** (3–4 hours)

1. Golden file generation from test-typescript-app
2. Full integration test
3. Edge case unit tests (circular imports, re-exports, etc.)
4. Manual validation against test_repository_spec.md

**Phase 6: Final Quality Gates** (1 hour)

1. `pnpm post:report` full validation
2. Fix any linting/coverage gaps
3. Commit golden files + code

**Total Estimated Time: 12–18 hours of development**

---

## 11. Risks & Mitigations

| Risk                                     | Impact                   | Mitigation                                                                                         | Owner     |
| ---------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- | --------- |
| SCIP CLI not installed or unavailable    | Blocks primary path      | Verify `@sourcegraph/scip-typescript` npm package availability; fallback to AST always works       | Developer |
| Test repo access denied or missing       | Blocks golden validation | Assume `/home/anon/TexereIndexerRestRepo` exists; document setup if needed                         | User      |
| Golden file diverges unexpectedly        | Regression undetected    | Commit golden files; use CI to flag drifts; `--update` only when intentional                       | CI        |
| Performance: SCIP timeout on large files | Extraction incomplete    | Implement batching (§3.7: ≤2_000 files/batch); log diagnostics; AST fallback handles gaps          | Developer |
| Symbol ID collision (duplicate IDs)      | Silent data loss         | Dedupe strictly by `{snapshotId, filePath, name, startLine, startCol}`; assert uniqueness in tests | Developer |
| Coverage < 60%                           | Quality gate fails       | Target 12–15 unit tests; test each symbol kind + edge cases                                        | Developer |
| Circular dependencies in test repo       | Stack overflow           | Test on fixtures with known cycles; verify no infinite loops in AST walker                         | Developer |

---

## 12. Success Criteria Checklist

- [ ] `@repo/indexer-ingest-ts` package created and builds successfully
- [ ] Nx tags applied (`domain:indexer`, `layer:ingest`)
- [ ] `symbol-extractor.ts` implements `LanguageIndexer` interface
- [ ] `scip-runner.ts` invokes SCIP CLI and parses JSON output
- [ ] `ast-fallback.ts` extracts symbols via TypeScript compiler API
- [ ] `symbol-kinds.ts` correctly classifies all symbol kinds
- [ ] Unit tests (12–15 tests) pass with ≥60% coverage
- [ ] Integration test on test-typescript-app main branch passes
- [ ] Golden file snapshot generated and committed
- [ ] All 287 symbols extracted (per test_repository_spec.md)
- [ ] Docstrings extracted for JSDoc symbols
- [ ] Export flags correct
- [ ] Symbol IDs stable and formatted correctly
- [ ] IN_SNAPSHOT edges emitted for cardinality invariant
- [ ] Deterministic ordering verified
- [ ] Path filtering enforced (denylist/allowlist)
- [ ] Zero lint/type errors (`pnpm lint`, `pnpm typecheck`)
- [ ] Full build succeeds (`pnpm build`)
- [ ] `pnpm post:report:fast` passes after each file
- [ ] `pnpm post:report` passes before handoff
- [ ] Documentation updated (README, spec citations)

---

## References

### Governing Specifications

- [ts_ingest_spec.md](../languages/ts_ingest_spec.md) — Complete TS/JS ingest specification
- [ingest_spec.md](../ingest_spec.md) — Language-agnostic ingest orchestration
- [symbol_id_stability_spec.md](../symbol_id_stability_spec.md) — Symbol ID algorithm
- [test_repository_spec.md](../test_repository_spec.md) — Test data expectations
- [graph_schema_spec.md](../graph_schema_spec.md) — Graph node/edge schema
- [nx_layout_spec.md](../nx_layout_spec.md) — Nx library structure

### Engineering Standards

- [testing_strategy.md](../../engineering/testing_strategy.md) — Testing philosophy & tower
- [testing_specification.md](../../engineering/testing_specification.md) — Test structure & setup
- [typescript_configuration.md](../../engineering/typescript_configuration.md) — TypeScript strict
  mode
- [eslint_code_quality.md](../../engineering/eslint_code_quality.md) — Code quality standards

### Process

- [AGENTS.md](../../../../../../AGENTS.md) — Development workflow & validation
- [prompt_template.md](../../meta/prompt_template.md) — Task template for LLM agents
- [llm_feature_workflow_full.md](../../meta/llm_feature_workflow_full.md) — Spec-first workflow

### External Docs

- [@sourcegraph/scip-typescript](https://github.com/sourcegraph/scip) — SCIP indexer docs
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) —
  AST/TypeChecker reference
- [Vitest Documentation](https://vitest.dev/) — Test runner docs

---

**Document Status:** Ready for Implementation  
**Last Reviewed:** December 18, 2025  
**Next Review:** After Slice 2A1 completion
