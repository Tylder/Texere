# @repo/indexer-ingest-ts

> TypeScript/JavaScript Language Indexer: SCIP + AST fallback symbol extraction for Texere Knowledge
> Graph

**Tags**: `domain:indexer`, `layer:ingest`

## Purpose

This library implements **complete TypeScript/JavaScript symbol extraction** for the Texere Indexer:

- **SCIP-first pipeline** (primary): Deterministic symbol extraction via
  `@sourcegraph/scip-typescript`
- **AST fallback** (secondary): TypeScript compiler API fallback when SCIP unavailable or gaps
  detected
- **Symbol metadata**: Names, kinds, ranges, docstrings, export flags, confidence levels
- **Cardinality enforcement**: IN_SNAPSHOT edges per graph_schema_spec.md §4.1B
- **Deterministic output**: Sorted, deduplicated symbols with stable IDs

## Scope (Slice 2A1 Implementation)

### In Scope

- ✅ Extract all symbol kinds: functions, classes, interfaces, types, enums, constants, variables,
  parameters
- ✅ Generate stable symbol IDs per formula:
  `${snapshotId}:${filePath}:${name}:${startLine}:${startCol}`
- ✅ Capture complete metadata: name, kind, range, isExported, docstring, confidence
- ✅ Handle all TS/JS file types: `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.mts`, `.cts`
- ✅ Path filtering: Skip denylisted paths (node_modules, dist, coverage, etc.)
- ✅ Deterministic ordering: Sort by filePath, startLine, startCol
- ✅ Emit IN_SNAPSHOT edges for cardinality invariant
- ✅ 12–15 unit tests (60–75% coverage)
- ✅ Integration test + golden file snapshot on test-typescript-app main branch (287 symbols)

### Out of Scope (Slice 2A2+)

- References (CALL/IMPORT/TYPE_REF) — Slice 2A2
- Boundaries, test cases, data contracts — Slices 2B1–2B3
- Graph persistence — Slice 3

## Exports

```typescript
import { tsJsIndexer } from '@repo/indexer-ingest-ts';

// Implements LanguageIndexer interface per ingest_spec.md §4
const indexer: LanguageIndexer = tsJsIndexer;

// Usage
const results = await indexer.indexFiles({
  codebaseRoot: '/path/to/repo',
  snapshotId: 'my-app:abc123',
  filePaths: ['src/main.ts', 'src/utils.ts'],
});
```

## Allowed Dependencies

- `@repo/indexer-types` ✓ (shared types)
- `@repo/indexer-core` ✓ (database clients, used in Slice 3+)
- `@sourcegraph/scip-typescript` ✓ (core dependency for symbol extraction)
- `typescript` ✓ (AST fallback, compiler API)
- External: `pino` (logging), `zod` (validation), etc. (TBD)

**Cannot depend on**: indexer-ingest, indexer-query, indexer-workers, agent packages

## Specification References

### Core Specifications

- **Complete TS/JS ingest spec**:
  [ts_ingest_spec.md](../../docs/specs/feature/indexer/languages/ts_ingest_spec.md)
  - §2: Input/output, ID formulas, path filters
  - §3: SCIP-first + AST fallback pipeline, known gaps
  - §4: Node extraction rules (symbols, boundaries, data contracts)
  - §7: Testing fixtures and expectations

- **Language-agnostic ingest**: [ingest_spec.md](../../docs/specs/feature/indexer/ingest_spec.md)
  - §3–4: FileIndexResult structure, LanguageIndexer interface
  - §6.1–6.2: Snapshot resolution, git diff

- **Symbol ID stability**:
  [symbol_id_stability_spec.md](../../docs/specs/feature/indexer/symbol_id_stability_spec.md)
  - §2.1: Symbol ID formula and stability guarantees
  - §5.1: Deterministic ordering

### Test Data

- **Test repository spec**:
  [test_repository_spec.md](../../docs/specs/feature/indexer/test_repository_spec.md)
  - §3: Node coverage matrix (287 symbols, 25 files on main branch)
  - §6–7: Git history, incremental testing, edge cases
  - §9: Validation checklist

### Quality & Testing

- **Testing strategy**: [testing_strategy.md](../../docs/specs/engineering/testing_strategy.md)
  - §2.2–4: Testing trophy (60–75% unit, 15–25% integration, 5–10% E2E)

- **Testing specification**:
  [testing_specification.md](../../docs/specs/engineering/testing_specification.md)
  - §3.1–3.5: Colocated test files, vitest config, coverage targets

### Graph Schema

- **Graph constraints**:
  [graph_schema_spec.md](../../docs/specs/feature/indexer/graph_schema_spec.md)
  - §4.1B: IN_SNAPSHOT cardinality invariant (every symbol has exactly 1)

### Architecture

- **Layout spec**: [nx_layout_spec.md](../../docs/specs/feature/indexer/nx_layout_spec.md)
  - §2.3: `indexer-ingest-ts` library structure, dependency boundaries

- **Implementation plan**:
  [2a1-ts-symbol-extraction.md](../../docs/specs/feature/indexer/implementation/2a1-ts-symbol-extraction.md)
  - Complete Slice 2A1 implementation guide with code examples

## Implementation Plan

**Phase 1 (Done)**: Package scaffolding + Nx setup  
**Phase 2**: Symbol extraction core (symbol-kinds.ts, symbol-extractor.ts, ast-fallback.ts)  
**Phase 3**: SCIP integration (scip-runner.ts)  
**Phase 4**: Merge & deduplication logic  
**Phase 5**: Testing + golden file validation  
**Phase 6**: Final quality gates

**Estimated time**: 12–18 hours total  
**Target completion**: End of sprint

## Development

### Structure

```
src/
  index.ts                          # Public API exports
  symbol-extractor.ts               # Main orchestrator (LanguageIndexer impl)
  scip-runner.ts                    # SCIP CLI integration + JSON parsing
  ast-fallback.ts                   # TypeScript AST fallback extraction
  symbol-kinds.ts                   # Symbol kind classification

__tests__/
  fixtures/
    main-snapshot.symbols.golden.json  # Golden snapshot (287 symbols)
  symbol-extractor.test.ts          # Unit tests (symbol kinds, IDs, docstrings, etc.)
  scip-runner.test.ts               # SCIP CLI integration tests
  integration.test.ts               # Full pipeline on test-typescript-app
```

### Key Design Principles

1. **SCIP-first** (cite: ts_ingest_spec.md §3.1): Prefer SCIP for deterministic extraction; use AST
   only for gaps
2. **Confidence tagging** (cite: ts_ingest_spec.md §3.8): Mark all symbols with extraction method
   (scip, ast, heuristic)
3. **Cardinality enforcement** (cite: graph_schema_spec.md §4.1B): Every symbol must have exactly 1
   IN_SNAPSHOT edge
4. **Deterministic output** (cite: symbol_id_stability_spec.md §2.1): Sort by filePath, startLine,
   startCol; no duplicates
5. **Path filtering** (cite: ts_ingest_spec.md §2): Skip denylisted paths; respect allowlist
   overrides

### Testing

**Unit Tests** (12–15 tests, 60–75% coverage):

- Symbol kind extraction (function, class, interface, type, enum, constant, variable)
- Symbol ID generation (formula correctness, uniqueness)
- Export + docstring detection
- Deduplication + ordering
- Path filtering (denylist/allowlist)
- Edge cases (circular imports, re-exports, async/await)

```bash
pnpm nx run indexer-ingest-ts:test
pnpm nx run indexer-ingest-ts:test:coverage
```

**Integration Tests** (full pipeline on test-typescript-app):

- Extract all symbols from main branch
- Golden file comparison (287 symbols expected)
- Verify IN_SNAPSHOT edges present

**Running Tests**:

```bash
# Unit tests
pnpm nx run indexer-ingest-ts:test

# With coverage
pnpm nx run indexer-ingest-ts:test:coverage

# Watch mode
pnpm nx run indexer-ingest-ts:test:watch
```

## Quality & Build

### Per-Change Validation

After each implementation file:

```bash
pnpm post:report:fast
```

Validates: format + oxlint + typecheck + coverage

### Before Handoff

```bash
pnpm post:report
```

Validates: format + full lint + typecheck + coverage + build + module boundary checks

### Individual Package

```bash
pnpm nx run indexer-ingest-ts:lint
pnpm nx run indexer-ingest-ts:check-types
pnpm nx run indexer-ingest-ts:build
pnpm nx run indexer-ingest-ts:test
```

## Dependencies

### Runtime

- `@repo/indexer-types` — Shared type definitions (LanguageIndexer, FileIndexResult, etc.)
- `@repo/indexer-core` — Database clients (for Slice 3+, not used in Slice 2A1)
- `@sourcegraph/scip-typescript` — **Core**: SCIP CLI + JSON parsing
- `typescript` — AST extraction via compiler API

### Development

- `simple-git` — Git operations in test fixtures
- `vitest`, `@vitest/coverage-v8` — Testing framework
- `eslint`, `@repo/eslint-config` — Code quality
- `@types/node` — Node type definitions

## See Also

- [Slice 2A1 Implementation Plan](../../docs/specs/feature/indexer/implementation/2a1-ts-symbol-extraction.md)
  — Comprehensive guide with code examples
- [ts_ingest_spec.md](../../docs/specs/feature/indexer/languages/ts_ingest_spec.md) — Complete
  specification
- [test_repository_spec.md](../../docs/specs/feature/indexer/test_repository_spec.md) — Test
  expectations
- [ingest_spec.md](../../docs/specs/feature/indexer/ingest_spec.md) — Language-agnostic
  orchestration
- [AGENTS.md](../../../../../AGENTS.md) — Development workflow & validation requirements
