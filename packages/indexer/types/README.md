# @repo/indexer-types

> Shared type system for the Texere Indexer: graph nodes/edges, file extraction results, query
> bundles, and configuration.

**Tags**: `domain:indexer`, `layer:types`

## Purpose

This library defines all **TypeScript types** used across the indexer system:

- **File extraction** (`FileIndexResult`, `SymbolIndex`, `CallIndex`, etc.) — output from language
  indexers
- **Graph schema** (node types: `Codebase`, `Snapshot`, `Symbol`, `Feature`, etc.; edge types:
  `ContainsEdge`, `RealizesEdge`, etc.)
- **Query bundles** (`FeatureContextBundle`, `BoundaryPatternExample`, `IncidentSliceBundle`) —
  return types for agent-facing queries
- **Configuration** (`IndexerConfig`, `CodebaseConfig`, `GraphConfig`, etc.) — ingest and runtime
  configuration
- **Language indexer interface** (`LanguageIndexer`) — contract for per-language extraction plugins

## Exports

All types are exported from the main index:

```typescript
import {
  // File extraction
  FileIndexResult,
  SymbolIndex,
  CallIndex,
  BoundaryIndex,
  TestCaseIndex,
  LanguageIndexer,

  // Graph nodes
  Codebase,
  Snapshot,
  Module,
  File,
  Symbol,
  Boundary,
  DataContract,
  TestCase,
  SpecDoc,
  Feature,
  Pattern,
  Incident,
  ExternalService,
  StyleGuide,

  // Graph edges
  ContainsEdge,
  ReferencesEdge,
  RealizesEdge,
  MutatesEdge,
  DependsOnEdge,
  DocumentsEdge,
  TracksEdge,
  ImpactsEdge,

  // Query bundles
  FeatureContextBundle,
  BoundaryPatternExample,
  IncidentSliceBundle,
  CallGraphSlice,

  // Configuration
  IndexerConfig,
  CodebaseConfig,
  GraphConfig,
  VectorConfig,
  EmbeddingConfig,
  LLMConfig,
  WorkerConfig,

  // Runtime types
  SnapshotRef,
  ChangedFileSet,
  Range,
} from '@repo/indexer-types';
```

## Dependencies

**No external runtime dependencies** (type-only package).

- Extends: `@repo/typescript-config/node-library.json`
- Used by: all indexer libraries and agent applications

## Specification References

- **File extraction types**: [ingest_spec.md §3–4](../../docs/specs/feature/indexer/ingest_spec.md)
- **Graph node types**: [nodes/README.md](../../docs/specs/feature/indexer/nodes/README.md) and
  individual node specs
- **Graph edge types**: [edges/README.md](../../docs/specs/feature/indexer/edges/README.md)
- **Query bundle types**:
  [graph_schema_spec.md §6](../../docs/specs/feature/indexer/graph_schema_spec.md#6-cypher-query-patterns)
- **Configuration types**:
  [configuration_spec.md](../../docs/specs/feature/indexer/configuration_spec.md)
- **Graph schema**:
  [graph_schema_spec.md §2–3](../../docs/specs/feature/indexer/graph_schema_spec.md)

## Development

### Structure

```
src/
  index.ts              # All type definitions (no runtime code)
```

### Testing

Types are **validated at compile time**. Unit tests verify:

- Type inference (Zod schemas, generic distributions)
- Union type narrowing
- Interface compatibility

Run tests:

```bash
pnpm nx run indexer-types:test
```

### Maintaining Types

When updating the indexer specification:

1. **Read the governing spec** (e.g., `nodes/README.md` for node types)
2. **Update types in this file**, citing spec section (e.g., `@reference nodes/Codebase.md`)
3. **Keep naming aligned** with spec (e.g., `Snapshot.indexStatus` maps to `snapshot_index_status`
   in Neo4j)
4. **Document new fields** with inline JSDoc comments
5. **Run `pnpm typecheck`** to ensure all consuming code compiles

## Quality & Build

- **Lint**: `pnpm nx run indexer-types:lint`
- **Typecheck**: `pnpm nx run indexer-types:check-types`
- **Build (emit d.ts)**: `pnpm nx run indexer-types:build`
- **Test**: `pnpm nx run indexer-types:test`
- **Fast validation**: `pnpm post:report:fast` (from repo root)

## See Also

- [layout_spec.md §2.1](../../docs/specs/feature/indexer/layout_spec.md#21-packagesfeaturesindexertypes)
  — Library design rationale
- [implementation/plan.md §Slice 0](../../docs/specs/feature/indexer/implementation/plan.md#slice-0--scaffolding--guards-walking-skeleton)
  — Implementation plan
- [testing_specification.md](../../docs/specs/engineering/testing_specification.md) — Test structure
  and coverage targets
