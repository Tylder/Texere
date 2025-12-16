# @repo/indexer-core

> Low-level infrastructure: Neo4j/Qdrant clients, graph persistence APIs, config loading.

**Tags**: `domain:indexer`, `layer:core`

## Purpose

This library provides **infrastructure and database access** for the entire indexer system:

- **Configuration loading**: parse `.indexer-config.json`, respect precedence (Server → Repo →
  Runtime), validate
- **Neo4j client**: connection pooling, transaction management, DDL bootstrap, constraint
  enforcement
- **Qdrant client**: vector storage, similarity search, batch operations
- **Embedding provider interface**: pluggable embedding sources (OpenAI, local, etc.)
- **Graph persistence APIs**: `upsertSymbol()`, `createEdge()`, `upsertBatch()` — enforce
  cardinality invariants
- **Graph query APIs**: `getCallGraphSlice()`, `getReferencers()`, `getTestsForSymbol()` — read-only
  operations

**Does not implement**:

- Git operations (that's ingest layer)
- Language parsing (that's ingest layer)
- Query logic for agents (that's query layer)

## Exports

```typescript
import {
  // Configuration
  loadConfig,
  reloadConfig,

  // Database clients
  IndexerDatabase,
  getDatabase,
  initializeDatabase,

  // Interfaces (for testing/mocking)
  Neo4jClient,
  Neo4jTransaction,
  QdrantClient,
  EmbeddingProvider,
  GraphPersistence,
  GraphQueries,
} from '@repo/indexer-core';
```

## Allowed Dependencies

- `@repo/indexer-types` ✓
- External: `neo4j`, `qdrant-js-client`, `pino` (logging), etc. (to be added as needed)

**Cannot depend on**: indexer-ingest, indexer-query, indexer-workers

## Specification References

- **Configuration loading**:
  [configuration_spec.md §1–2](../../docs/specs/feature/indexer/configuration_spec.md),
  [configuration_and_server_setup.md §2–3](../../docs/specs/feature/indexer/configuration_and_server_setup.md)
- **Neo4j schema & constraints**:
  [graph_schema_spec.md §4](../../docs/specs/feature/indexer/graph_schema_spec.md#4-constraints--indexes)
- **Cardinality enforcement**:
  [layout_spec.md §2.2](../../docs/specs/feature/indexer/layout_spec.md#key-responsibility-constraint-enforcement)
  – IN_SNAPSHOT invariant
- **Graph read patterns**:
  [graph_schema_spec.md §6](../../docs/specs/feature/indexer/graph_schema_spec.md#6-cypher-query-patterns)
- **Vector store schema**:
  [vector_store_spec.md](../../docs/specs/feature/indexer/vector_store_spec.md)

## Implementation Plan

**Slice 0 (now)**: Type scaffolding and interface definitions (stubs) **Slice 1**: Config loader
(environment variables, `.indexer-config.json` parsing) **Slice 3**: Neo4j client + graph
persistence with constraint enforcement **Slice 5**: Qdrant client + embedding provider interface
**Slice 6**: Graph query APIs (read-only Cypher patterns)

## Development

### Structure

```
src/
  index.ts              # Main exports, stubs, singleton database instance
  [slice1] config/
    indexer-config.ts   # Config loader (when implemented)
  [slice3] graph/
    neo4j-client.ts     # Neo4j driver wrapper
    graph-writes.ts     # Persistence layer (insert/update/upsert)
    graph-reads.ts      # Query layer (read-only)
    schema-bootstrap.ts # DDL, constraints, indexes
  [slice5] vector/
    qdrant-client.ts    # Qdrant wrapper
    embedding-provider.ts # Interface + stubs
    symbol-embeddings.ts # Embedding generation
```

### Key Design Principles

1. **Constraint enforcement first**: All write functions enforce cardinality invariants (esp.
   `IN_SNAPSHOT` uniqueness) before returning. Use transactions for atomicity.

2. **Config hierarchy**: Environment variables override config file; both can reference runtime
   state (Server → Repo → Runtime precedence per config_and_server_setup.md §8).

3. **Client pooling**: Neo4j and Qdrant clients use connection pooling and are initialized once per
   process via `initializeDatabase()`.

4. **Transaction interface**: All mutations wrap in `Neo4jTransaction` for ACID semantics and
   rollback on constraint violation.

5. **Type safety**: All parameters are strongly typed per `@repo/indexer-types`; no `any` types.

## Testing

### Unit Tests

Test configuration loading with synthetic `.env` and config files:

```typescript
describe('loadConfig (configuration_spec.md §1–2)', () => {
  it('should load and validate .indexer-config.json', async () => {
    // Create temp file, call loadConfig(), assert schema
  });

  it('should respect env var precedence', async () => {
    // Set NEO4J_URI env var, verify it overrides config file value
  });
});
```

### Integration Tests

Test against ephemeral Neo4j container (or in-memory mock):

```typescript
describe('Neo4jClient (graph_schema_spec.md §4)', () => {
  it('should enforce IN_SNAPSHOT cardinality invariant', async () => {
    // Create snapshot, try creating symbol without IN_SNAPSHOT edge, expect error
  });
});
```

Run:

```bash
pnpm nx run indexer-core:test
```

## Quality & Build

- **Lint**: `pnpm nx run indexer-core:lint`
- **Typecheck**: `pnpm nx run indexer-core:check-types`
- **Build**: `pnpm nx run indexer-core:build`
- **Test**: `pnpm nx run indexer-core:test`
- **Fast validation**: `pnpm post:report:fast`

## Schema Generation for IDE Support

The indexer config schema is exported as a JSON Schema file for IDE integration (VSCode, JetBrains,
etc.). When editing `.indexer-config.json` files, IDEs use this schema for validation and
auto-completion.

### Regenerating the Schema

After modifying config types in `config-schema.ts`, regenerate the schema artifact:

```bash
pnpm --filter indexer-core build
pnpm --filter indexer-core generate:schema
```

This updates `docs/schemas/indexer-config.schema.json`, which should be committed to git.

### Schema Generation Process

- **Tests** (runtime): Validate schema structure in-memory via `generate-schema-file.test.ts`. Tests
  use temporary directories (`os.tmpdir()`) for isolation and cleanup.
- **Artifact generation** (manual): The `generate:schema` script (`scripts/generate-schema.mjs`)
  produces the IDE integration artifact. Developers must run this explicitly after config changes.

This separation follows industry standards:

- JSON Schema generation is a **build artifact**, not a test side effect
- Tests validate correctness; scripts generate files
- Prevents uncommitted schema files in working directory
- Maintains clean separation of concerns per
  [testing_specification.md §3.1](../../docs/specs/engineering/testing_specification.md#31-test-file-organization-colocated-pattern)

### Exporting the Schema Function

Other packages can generate or inspect the schema via:

```typescript
import { generateIndexerConfigJsonSchema } from '@repo/indexer-core';

const schema = generateIndexerConfigJsonSchema();
// Use schema for validation, documentation, or tooling
```

## See Also

- [layout_spec.md §2.2](../../docs/specs/feature/indexer/layout_spec.md#22-packagesfeaturesindexercore)
  — Library design rationale
- [implementation/plan.md](../../docs/specs/feature/indexer/implementation/plan.md) — Full slice
  breakdown
- [graph_schema_spec.md](../../docs/specs/feature/indexer/graph_schema_spec.md) — Complete schema
  reference
- [configuration_spec.md](../../docs/specs/feature/indexer/configuration_spec.md) — Configuration
  schema
