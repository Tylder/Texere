# Research Memo: Slice 2A1 TS Symbol Extraction - Current Implementation State

Date: 2025-12-19

## Scope

Checked the current `@repo/indexer-ingest-ts` implementation to determine what is already in place
and what is still missing vs. Slice 2A1 requirements.

## Sources Reviewed

- `packages/indexer/ingest-ts/README.md`
- `packages/indexer/ingest-ts/src/index.ts`
- `packages/indexer/ingest-ts/src/symbol-extractor.ts`
- `packages/indexer/ingest-ts/src/scip-runner.ts`
- `packages/indexer/ingest-ts/src/ast-fallback.ts`
- `packages/indexer/ingest-ts/src/symbol-kinds.ts`
- `packages/indexer/ingest-ts/src/symbol-extractor.test.ts`
- `packages/indexer/ingest-ts/src/integration.test.ts`
- `packages/indexer/ingest-ts/src/scip-runner.test.ts`
- `packages/indexer/ingest-ts/src/ast-fallback.test.ts`
- `packages/indexer/ingest-ts/src/symbol-kinds.test.ts`

## Current State Summary

- Package `packages/indexer/ingest-ts` exists with scaffolding, README, tsconfig, vitest config, and
  basic source files (`symbol-extractor.ts`, `scip-runner.ts`, `ast-fallback.ts`,
  `symbol-kinds.ts`).
- `tsJsIndexer` is implemented in `symbol-extractor.ts` and exposes `indexFiles`, but it currently:
  - Uses a simple glob regex denylist (no `.gitignore` integration and no allowlist override).
  - Always runs AST fallback across all files (no per-file SCIP gap detection).
  - Does not emit `IN_SNAPSHOT` edges (only returns `symbols`, `calls`, `references` arrays).
  - Uses an internal `ExtractedSymbol` kind mapping that collapses enums/variables/parameters to
    `other` for `SymbolIndex`.
- `scip-runner.ts` is synchronous and uses `npx @sourcegraph/scip-typescript` + `print` to parse
  JSON, instead of binary parsing with SCIP protocol bindings. It currently:
  - Treats `Occurrence.range` as byte offsets and converts bytes to line/col, which does not match
    the SCIP range semantics described in the spec.
  - Treats all occurrences as definitions (does not check `symbolRoles` for Definition).
  - Infers symbol kind from `displayName` string and uses a local/not-local heuristic for export.
  - Lacks batching, per-batch timeouts, `--infer-tsconfig`, workspace flags, or output cleanup
    matching the spec.
- `ast-fallback.ts` walks AST and emits symbols, but:
  - Variable declarations are always marked as `const` (no let/var distinction).
  - Parameters are not extracted as symbols.
  - No SCIP gap detection or note tagging.
- `symbol-kinds.ts` provides helpers for classification, ranges, docstrings, and export checks; AST
  fallback partially uses these helpers.
- Tests exist, but many are placeholders or logic-only checks (no strong fixture assertions).
  Integration test writes a golden file during the test rather than validating against a committed
  golden fixture.

## Implications for Next Steps

The implementation is partially in place but is not yet compliant with Slice 2A1 requirements. Key
missing items include SCIP parsing per spec (binary + bindings), per-file SCIP gap handling, proper
ordering/dedupe, accurate range decoding, export detection, symbol kind mapping per spec,
IN_SNAPSHOT edge emission, denylist/allowlist and .gitignore handling, and fixture-based tests with
committed golden snapshots.
