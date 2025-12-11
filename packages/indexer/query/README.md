# @repo/indexer-query

> Agent-facing query API: read-only operations for understanding repo structure, features, and
> incidents.

**Tags**: `domain:indexer`, `layer:query`

## Purpose

This library provides **read-only queries** that agents use to understand code structure and
patterns:

- **Feature context**: symbols, boundaries, test cases, documentation, call graph for a feature
- **Boundary patterns**: how endpoints are implemented and what they call
- **Incident slices**: root cause analysis, affected features, related tests
- **Helper queries**: call graph slices, transitive closure, data mutators, symbol search
- **Statistics**: indexer stats (symbol count, latest snapshot time, etc.)

**Used by**: Agent apps and tools via direct function imports (not HTTP) **Does not**:

- Index code (that's ingest layer)
- Manage databases (that's core layer)
- Accept HTTP requests directly in v1 (optional HTTP gateway in Slice 6)

## Exports

```typescript
import {
  // Main query functions (Slice 6)
  getFeatureContext,
  getBoundaryPatternExamples,
  getIncidentSlice,

  // Helper queries
  getCallGraphSlice,
  getTransitiveCallees,
  getTransitiveCallers,
  getDataMutators,
  searchSymbols,
  getDocumentation,
  getIndexerStats,

  // Types & options
  FeatureContextOptions,
  BoundaryPatternOptions,
  IncidentSliceOptions,
  IndexerStats,
} from '@repo/indexer-query';
```

## Allowed Dependencies

- `@repo/indexer-core` ✓ (graph/vector access)
- `@repo/indexer-types` ✓
- External: logging, etc.

**Cannot depend on**: indexer-ingest, indexer-workers, agents (used by agents, not vice versa)

## Specification References

- **Query API overview**: [README.md §Overview](../../docs/specs/feature/indexer/README.md) –
  agent-facing queries
- **Query patterns & Cypher**:
  [graph_schema_spec.md §6](../../docs/specs/feature/indexer/graph_schema_spec.md#6-cypher-query-patterns)
- **Feature context slice**:
  [graph_schema_spec.md §6.3](../../docs/specs/feature/indexer/graph_schema_spec.md)
- **Boundary patterns**:
  [graph_schema_spec.md §6.2](../../docs/specs/feature/indexer/graph_schema_spec.md)
- **Incident slice**:
  [graph_schema_spec.md §6.4](../../docs/specs/feature/indexer/graph_schema_spec.md)
- **Call graph patterns**:
  [graph_schema_spec.md §6.1](../../docs/specs/feature/indexer/graph_schema_spec.md)
- **Query bundle types**:
  [layout_spec.md §2.4](../../docs/specs/feature/indexer/layout_spec.md#24-packagesfeaturesindexerquery)

## Implementation Plan

| Slice | Task                                           | Status              |
| ----- | ---------------------------------------------- | ------------------- |
| 0     | Type scaffolding & interface definitions       | ✓ (now)             |
| 3     | Neo4j graph writes (dependency for queries)    | TODO (core slice 3) |
| 5     | Qdrant embeddings (optional for vector search) | TODO (core slice 5) |
| 6     | Query API implementation                       | TODO                |

## Development

### Directory Structure

```
src/
  index.ts                        # Main exports
  get-feature-context.ts          # Feature slice query (slice 6)
  get-boundary-pattern-examples.ts # Boundary patterns query (slice 6)
  get-incident-slice.ts           # Incident analysis query (slice 6)
  helpers/
    call-graph-slice.ts           # Call graph traversal (slice 6)
    data-flow.ts                  # Data mutation analysis (slice 6)
    symbol-search.ts              # Text + vector search (slice 6)
    documentation.ts              # Fetch docs for node (slice 6)
```

### Query Patterns (Cypher)

#### Feature Context (getFeatureContext)

```cypher
-- 1. Get feature
MATCH (f:Feature {name: $featureName})

-- 2. Get implementing symbols
MATCH (sym:Symbol)-[:REALIZES {role:'IMPLEMENTS'}]->(f)

-- 3. Get boundaries
MATCH (b:Boundary)-[:REALIZES {role:'IMPLEMENTS'}]->(f)

-- 4. Get call graph
MATCH (caller:Symbol)-[:REFERENCES {type:'CALL'}*0..depth]->(sym)
MATCH (sym)-[:REFERENCES {type:'CALL'}*0..depth]->(callee:Symbol)

-- 5. Get tests
MATCH (tc:TestCase)-[:REALIZES {role:'TESTS'|'VERIFIES'}]->(sym|b|f)

-- 6. Get docs
MATCH (doc:SpecDoc)-[:DOCUMENTS {docType:'FEATURE'}]->(f)
```

#### Boundary Patterns (getBoundaryPatternExamples)

```cypher
-- 1. Get boundaries
MATCH (b:Boundary) [WHERE b.kind = $kind if specified]

-- 2. For each, get handler
MATCH (h:Symbol)-[:LOCATION {role:'HANDLED_BY'}]->(b)

-- 3. Get services called
MATCH (h)-[:REFERENCES {type:'CALL'}]->(called:Symbol)
MATCH (called)-[:DEPENDS_ON {kind:'SERVICE'}]->(svc:ExternalService)

-- 4. Get tests
MATCH (tc:TestCase)-[:REALIZES {role:'VERIFIES'}]->(b)

-- 5. Get docs
MATCH (doc:SpecDoc)-[:DOCUMENTS {docType:'ENDPOINT'}]->(b)
```

#### Incident Slice (getIncidentSlice)

```cypher
-- 1. Get incident
MATCH (inc:Incident {id: $incidentId})

-- 2. Get root causes
MATCH (sym:Symbol)<-[:IMPACTS {type:'CAUSED_BY'}]-(inc)
MATCH (b:Boundary)<-[:IMPACTS {type:'AFFECTS'}]-(inc)

-- 3. Get affected features
MATCH (sym|b)-[:REALIZES]->(f:Feature)

-- 4. Get related tests
MATCH (tc:TestCase)-[:REALIZES]->(sym|b|f)
```

### Testing

**Unit Tests** (mocked core layer):

```typescript
describe('getFeatureContext (graph_schema_spec.md §6.3)', () => {
  it('should return feature context with call graph', async () => {
    // Mock core.queries.getNodesBySnapshot(), getCallGraphSlice(), etc.
    const bundle = await getFeatureContext('user-management');
    expect(bundle.feature.name).toBe('user-management');
    expect(bundle.symbols.length).toBeGreaterThan(0);
    expect(bundle.callGraphSlice.callees.length).toBeGreaterThan(0);
  });
});
```

**Integration Tests** (real Neo4j):

Use test-typescript-app snapshot-2 fixture from test_repository_spec.md:

```typescript
describe('Query API integration (test_repository_spec.md)', () => {
  beforeAll(async () => {
    // Seed test graph with snapshot-2 data
    await indexSnapshot({ ... });
  });

  it('should return feature context matching test_repository_spec expectations', async () => {
    const bundle = await getFeatureContext('user-service');
    // Verify counts match test_repository_spec.md node/edge matrices
    expect(bundle.symbols.length).toBe(/* expected from spec */);
  });
});
```

**Golden files** store expected outputs:

```
__tests__/
  fixtures/
    feature-context-user-service.golden.json
    boundary-patterns-http.golden.json
    incident-slice-bug-xyz.golden.json
```

Run:

```bash
pnpm nx run indexer-query:test
```

## Design Principles

1. **Read-only**: Queries do not modify state; safe to call repeatedly
2. **Composable**: Helper functions can be combined for complex analyses
3. **Configurable**: Options control depth, includes, thresholds (confidence)
4. **Deterministic**: Same input → same output (except with LLM confidence scores)
5. **Well-typed**: Return types enforce structure; no `any`
6. **Efficient**: Use Neo4j/Qdrant indexes; avoid N+1 queries

## Quality & Build

- **Lint**: `pnpm nx run indexer-query:lint`
- **Typecheck**: `pnpm nx run indexer-query:check-types`
- **Build**: `pnpm nx run indexer-query:build`
- **Test**: `pnpm nx run indexer-query:test`
- **Fast validation**: `pnpm post:report:fast`

## See Also

- [layout_spec.md §2.4](../../docs/specs/feature/indexer/layout_spec.md#24-packagesfeaturesindexerquery)
  — Library design rationale
- [implementation/plan.md §Slice 6](../../docs/specs/feature/indexer/implementation/plan.md#slice-6--query-api-library--http-surface)
  — Query API implementation plan
- [graph_schema_spec.md §6](../../docs/specs/feature/indexer/graph_schema_spec.md#6-cypher-query-patterns)
  — Complete query patterns
