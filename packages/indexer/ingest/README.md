# @repo/indexer-ingest

> Indexing pipeline: Git operations, language-specific extraction, higher-level concept detection,
> graph writes.

**Tags**: `domain:indexer`, `layer:ingest`

## Purpose

This library implements the **complete indexing pipeline** from Git snapshot to populated knowledge
graph:

1. **Git integration** (Slice 1): Resolve branches to commits, compute file diffs
2. **Language indexers** (Slice 2): TypeScript/JavaScript AST extraction; Python via subprocess
3. **Higher-level extraction** (Slices 2–4): Boundaries (endpoints), data contracts, test cases,
   features, docs
4. **Graph persistence** (Slice 3+): Write all nodes/edges to Neo4j via core layer
5. **Embedding generation** (Slice 5): Generate vectors for symbols/docs and store in Qdrant

**Orchestrator**: `indexSnapshot()` — single entry point coordinating all steps

## Exports

```typescript
import {
  // Main orchestrator (Slice 1–5 assembly)
  indexSnapshot,
  runFullIndexPipeline,

  // Sub-components (called by orchestrator; internal)
  resolveSnapshot,
  computeChangedFiles,
  indexFiles,
  extractBoundaries,
  extractDataContracts,
  extractFeatures,
  linkTestsToSymbols,

  // Types
  IndexSnapshotParams,
} from '@repo/indexer-ingest';
```

## Allowed Dependencies

- `@repo/indexer-core` ✓
- `@repo/indexer-types` ✓
- External: `simple-git`, TypeScript compiler API, tree-sitter, etc. (to be added)

**Cannot depend on**: indexer-query, indexer-workers, agents

## Specification References

- **Ingest orchestration & types**:
  [ingest_spec.md §2–6](../../docs/specs/feature/indexer/ingest_spec.md)
- **Git resolution & incremental indexing**:
  [ingest_spec.md §6.1–6.2](../../docs/specs/feature/indexer/ingest_spec.md)
- **Symbol ID stability**:
  [symbol_id_stability_spec.md](../../docs/specs/feature/indexer/symbol_id_stability_spec.md)
- **Language indexer interface**:
  [language_indexers_spec.md](../../docs/specs/feature/indexer/language_indexers_spec.md)
  (placeholder)
- **Boundary & test detection**:
  [ingest_spec.md §5.1](../../docs/specs/feature/indexer/ingest_spec.md),
  [test_repository_spec.md](../../docs/specs/feature/indexer/test_repository_spec.md)
- **Documentation ingestion**:
  [documentation_indexing_spec.md](../../docs/specs/feature/indexer/documentation_indexing_spec.md)
- **Config discovery**:
  [configuration_and_server_setup.md §3–9](../../docs/specs/feature/indexer/configuration_and_server_setup.md)

## Implementation Plan

| Slice | Task                                                            | Status              |
| ----- | --------------------------------------------------------------- | ------------------- |
| 0     | Scaffolding & interface definitions                             | ✓ (now)             |
| 1     | Git snapshot resolution & diff plumbing                         | TODO                |
| 2     | TypeScript language indexer (symbols, calls, boundaries, tests) | TODO                |
| 3     | Graph persistence (via core layer)                              | TODO (core slice 3) |
| 4     | Documentation & SpecDoc ingestion                               | TODO                |
| 5     | Embeddings & vector generation                                  | TODO (core slice 5) |

## Development

### Directory Structure

```
src/
  index.ts                  # Main exports
  index-snapshot.ts         # Orchestrator (slice 1+)
  git/
    git-diff.ts             # Compute changed files (slice 1)
    git-files.ts            # Get file lists, metadata (slice 1)
    resolve-snapshot.ts     # Branch → commit (slice 1)
  languages/
    language-indexer.ts     # Interface definition
    ts-indexer.ts           # TS/JS AST extraction (slice 2)
    py-indexer.ts           # Python sidecar integration (slice 2+)
  extractors/
    boundaries.ts           # Express/FastAPI endpoint detection (slice 2)
    data-contracts.ts       # Prisma/SQL/Zod schema extraction (slice 4)
    test-cases.ts           # Test detection from AST (slice 2)
    features.ts             # Feature mapping + LLM (slice ?)
  docs/
    doc-discovery.ts        # Find markdown, doc sources (slice 4)
    doc-linker.ts           # Link docs to symbols/features (slice 4)
```

### Key Concepts

**Symbol ID Stability** (symbol_id_stability_spec.md):

- Format: `snapshotId:filePath:name:startLine:startCol`
- **Immutable** within snapshot (used for call/reference relationships)
- Renames treated as delete+add (no continuity in v1)
- Critical for incremental indexing

**Boundary Heuristics** (ingest_spec.md §5.1):

- **Express**: `app.get(path, handler)`, `router.post(path, handler)`, etc.
- Extract: `verb` (HTTP method), `path` (string literal), `handler` (symbol ID)
- Create Boundary node + LOCATION {role: 'HANDLED_BY'} to handler
- Extensible for FastAPI, gRPC, CLI, events

**Test Detection** (ingest_spec.md §5.1):

- Look for: `describe()`, `it()`, `test()` (Jest/Vitest style)
- Extract: test name, location (file+line), scope (describe hierarchy)
- Create TestCase node + link to tested symbols via heuristics or LLM

**Feature Mapping** (ingest_spec.md §2.3):

- Read `features.yaml` or similar from repo config
- Map: feature ID → symbols, boundaries, test cases
- Use LLM for best-effort mappings (design rule: missed links worse than bad links)

### Testing

**Unit Tests** (golden snapshots):

For test-typescript-app fixture, store expected `FileIndexResult` objects and compare:

```typescript
describe('ts-indexer (language_indexers_spec.md)', () => {
  it('should extract symbols/calls/references for user.service.ts', async () => {
    const result = await indexFiles({
      codebaseRoot: '/path/to/test-typescript-app',
      snapshotId: 'test-ts-app:abc123',
      filePaths: ['src/services/user.service.ts'],
    });
    expect(result).toMatchSnapshot();
  });
});
```

**Integration Tests**:

End-to-end via `indexSnapshot()` on test repo; verify Neo4j graph state:

```typescript
describe('indexSnapshot (ingest_spec.md §6)', () => {
  it('should populate knowledge graph for snapshot-2', async () => {
    await indexSnapshot({
      codebaseId: 'test-ts-app',
      codebaseRoot: '/path/to/test-typescript-app',
      commitHash: 'snapshot-2-hash',
      branch: 'snapshot-2',
    });

    const db = getDatabase();
    const symbols = await db.queries.getNodesBySnapshot({
      snapshotId: 'test-ts-app:snapshot-2-hash',
      label: 'Symbol',
    });
    expect(symbols.length).toBeGreaterThan(100); // Per test_repository_spec.md
  });
});
```

**Golden files** stored in `__tests__/fixtures/`:

```
__tests__/
  fixtures/
    user.service.ts.golden.json     # Expected FileIndexResult
    routes.ts.golden.json
    snapshot-2-node-count.json      # Expected node/edge counts per test_repository_spec.md
```

Run:

```bash
pnpm nx run indexer-ingest:test
```

## Debug Runner

Slice 1 adds `scripts/dev-index.ts`:

```bash
pnpm dev:index --repo /path/to/repo --branch main
```

Outputs:

- Resolved snapshot (commitHash, metadata)
- Changed file set (added/modified/deleted)
- Per-language indexer results (symbol/call/boundary counts)
- Graph write results (node/edge counts)

Optional VS Code launch config: "Debug indexSnapshot"

## Quality & Build

- **Lint**: `pnpm nx run indexer-ingest:lint`
- **Typecheck**: `pnpm nx run indexer-ingest:check-types`
- **Build**: `pnpm nx run indexer-ingest:build`
- **Test**: `pnpm nx run indexer-ingest:test`
- **Fast validation**: `pnpm post:report:fast`

## See Also

- [layout_spec.md §2.3](../../docs/specs/feature/indexer/layout_spec.md#23-packagesfeaturesindexeringest)
  — Library design rationale
- [implementation/plan.md](../../docs/specs/feature/indexer/implementation/plan.md) — Full slice
  breakdown
- [ingest_spec.md](../../docs/specs/feature/indexer/ingest_spec.md) — Complete ingest specification
- [test_repository_spec.md](../../docs/specs/feature/indexer/test_repository_spec.md) — Test data
  expectations
