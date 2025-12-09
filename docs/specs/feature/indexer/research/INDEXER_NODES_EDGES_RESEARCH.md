# Texere Indexer – Nodes & Edges Research Summary

**Research Date**: December 2025  
**Status**: Complete Analysis with Improvement Recommendations  
**Source**: Neo4j best practices + Texere specification analysis

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Node Catalog Overview](#node-catalog-overview)
3. [Edge Catalog Overview](#edge-catalog-overview)
4. [Current Architecture](#current-architecture)
5. [Neo4j Best Practices Applied](#neo4j-best-practices-applied)
6. [Key Improvement Areas](#key-improvement-areas)
7. [Implementation Phases](#implementation-phases)

---

## Executive Summary

Texere's indexer builds a **knowledge graph** using Neo4j/Memgraph to represent code structure,
features, tests, patterns, and incidents. The schema is **well-architected** with 14 node types and
10 consolidated edge types, implementing Neo4j best practices.

**Key Findings**:

✓ **Strengths**:

- Hierarchical design with CONTAINS relationships (bottom-up)
- Snapshot-scoped vs. cross-snapshot node distinction (temporal versioning)
- Consolidated edge types (single type with property discrimination)
- Cardinality invariants (IN_SNAPSHOT = exactly 1 per scoped node)
- Explicit soft-delete semantics for audit trails

⚠ **Improvement Opportunities** (9 areas):

1. **Index strategy**: Missing composite, range, and vector indexes
2. **Relationship design**: Implicit reverse edges for high-traffic queries
3. **Cardinality enforcement**: No database constraints on IN_SNAPSHOT invariant
4. **Temporal tracking**: Deletion events not explicitly tracked
5. **Batch operations**: No bulk constraint validation guidance
6. **Query patterns**: Unbounded transitive closures & cartesian explosions
7. **Derived edges**: No documented maintenance strategy
8. **Soft delete consistency**: Queries may return deleted nodes
9. **New edge types**: CONFLICTED, SUPERSEDES, TESTED_BY for future phases

---

## Node Catalog Overview

### Snapshot-Scoped Nodes (9)

Created per commit; versioned; linked via `[:IN_SNAPSHOT]` (cardinality = 1).

| Node             | Purpose                                                     | Key Properties                                                                          | Cardinality     |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------- |
| **Codebase**     | Repository root                                             | `id`, `name`, `url`, `createdAt`, `updatedAt`                                           | N per workspace |
| **Snapshot**     | Git commit being indexed                                    | `id` (composite: codebaseId:commitHash), `branch`, `indexStatus`                        | N per codebase  |
| **Module**       | Package/app/lib (Nx module)                                 | `id` (composite: snapshotId:modulePath), `type`, `language`                             | N per snapshot  |
| **File**         | Source code file                                            | `id` (composite: snapshotId:filePath), `language`, `isTest`, `isDeleted`                | N per module    |
| **Symbol**       | Function/class/type/interface/const                         | `id` (composite: snapshotId:filePath:name:line:col), `kind`, `docstring`, `embeddingId` | N per file      |
| **EntryPoint**   | Callable interface (HTTP endpoint, CLI, export, event, job) | `id` (composite: snapshotId:kind:identifier), `verb`, `path`, `handlerSymbolId`         | N per snapshot  |
| **SchemaEntity** | Database model (Prisma, SQLAlchemy)                         | `id` (composite: snapshotId:entityName), `kind`, `description`                          | N per snapshot  |
| **TestCase**     | Unit/integration/e2e test                                   | `id` (composite: snapshotId:filePath:testName), `kind`, `name`                          | N per file      |
| **SpecDoc**      | Documentation (spec, ADR, design doc)                       | `id` (composite: snapshotId:docPath), `kind`, `content`, `embeddingId`                  | N per snapshot  |

### Cross-Snapshot Nodes (5)

Persistent across snapshots; soft-deleted when obsolete; linked via `[:INTRODUCED_IN]` and
`[:MODIFIED_IN]`.

| Node                | Purpose                                   | Key Properties                                                    | Lifecycle                      |
| ------------------- | ----------------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| **Feature**         | User-facing feature                       | `id`, `name`, `description`, `embeddingId`, `isDeleted`           | Soft-delete on removal         |
| **Pattern**         | Code pattern (e.g., "express-middleware") | `id`, `name`, `description`, `source` (manual/heuristic)          | Manual or heuristic definition |
| **Incident**        | Bug/issue report                          | `id`, `title`, `severity`, `status`, `createdAt`, `resolvedAt`    | Soft-delete on resolution      |
| **ExternalService** | Third-party API (Stripe, Auth0)           | `id`, `name`, `description`, `url`                                | Persistent                     |
| **StyleGuide**      | Coding convention/guide                   | `id` (path), `name`, `description`, `appliesTo` (module patterns) | Persistent                     |

**Cardinality Invariants (CRITICAL)**:

- Every snapshot-scoped node: exactly 1 `[:IN_SNAPSHOT]` edge
- Every file: exactly 1 parent module
- Every module: exactly 1 parent module OR snapshot (root modules)
- Every snapshot: exactly 1 parent codebase

---

## Edge Catalog Overview

### 10 Consolidated Edge Types

The schema consolidates 30+ relationship types into **10 core edges**, each with a `kind` or `role`
property for type discrimination.

| Edge               | Consolidates                                        | Sub-Types (Properties)                                                        | Purpose                                              |
| ------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| **[:CONTAINS]**    | —                                                   | —                                                                             | Hierarchy tree (File → Module → Snapshot → Codebase) |
| **[:IN_SNAPSHOT]** | —                                                   | —                                                                             | Version membership (cardinality invariant)           |
| **[:REFERENCES]**  | CALL, TYPE_REF, IMPORT, FOLLOWS_PATTERN, SIMILAR_TO | `kind` = 'CALL', 'TYPE_REF', 'IMPORT', 'PATTERN', 'SIMILAR'                   | Code relations & pattern adherence                   |
| **[:REALIZES]**    | IMPLEMENTS, TESTS, VERIFIES                         | `role` = 'IMPLEMENTS', 'TESTS', 'VERIFIES'; `coverage` = 'DIRECT', 'INDIRECT' | Implementation, testing, verification                |
| **[:MUTATES]**     | READS_FROM, WRITES_TO                               | `operation` = 'READ', 'WRITE'                                                 | Data access & flow                                   |
| **[:DEPENDS_ON]**  | USES_CONFIG, CALLS, DEPENDS_ON, APPLIES_TO          | `kind` = 'CONFIG', 'LIBRARY', 'SERVICE', 'PATTERN'                            | Dependencies & external usage                        |
| **[:DOCUMENTS]**   | DOCUMENTS, part of APPLIES_TO                       | `target_role` = 'SYMBOL', 'FEATURE', 'MODULE', 'ENDPOINT'                     | Knowledge mapping                                    |
| **[:LOCATION]**    | IN_FILE, IN_MODULE, HANDLED_BY                      | `role` = 'IN_FILE', 'IN_MODULE', 'HANDLED_BY'                                 | Position & ownership                                 |
| **[:TRACKS]**      | INTRODUCED_IN, MODIFIED_IN                          | `event` = 'INTRODUCED', 'MODIFIED', 'DELETED' (future)                        | Evolution & version history                          |
| **[:IMPACTS]**     | CAUSED_BY, AFFECTS                                  | `type` = 'CAUSED_BY', 'AFFECTS'                                               | Incident root cause & effects                        |

**Example Queries**:

```cypher
-- Call graph: symbol A calls symbol B
(symbolA:Symbol)-[r:REFERENCES {kind: 'CALL', line: 42, col: 5}]->(symbolB:Symbol)

-- Feature implementation
(symbol:Symbol)-[r:REALIZES {role: 'IMPLEMENTS', confidence: 0.88}]->(feature:Feature)

-- Test coverage
(testCase:TestCase)-[r:REALIZES {role: 'TESTS', coverage: 'DIRECT'}]->(symbol:Symbol)

-- Data mutation
(symbol:Symbol)-[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity)

-- Evolution tracking
(symbol:Symbol)-[r:TRACKS {event: 'MODIFIED'}]->(snapshot:Snapshot)

-- Incident impact
(incident:Incident)-[r:IMPACTS {type: 'CAUSED_BY'}]->(symbol:Symbol)
```

---

## Current Architecture

### Design Principles

1. **Labeled Nodes with Properties**: Each node type is a Neo4j label; metadata stored as properties
2. **Hierarchical CONTAINS**: Bottom-up tree (File → Module → Snapshot → Codebase)
3. **Composite Key IDs**: Deterministic, reproducible (e.g.,
   `snapshotId:filePath:symbolName:line:col`)
4. **Snapshot Scoping**: Critical cardinality invariant (`[:IN_SNAPSHOT]` = exactly 1)
5. **Audit Trail**: Timestamps (`createdAt`, `updatedAt`, `deletedAt`) + soft deletes
6. **Consolidated Edges**: Single relationship type with property discrimination (avoids edge
   proliferation)

### Current Index Strategy

**Priority 1**: Unique constraints (15 auto-indexed)

- `Codebase.id`, `Snapshot.id`, `Module.id`, `File.id`, `Symbol.id`, etc.

**Priority 2**: Edge property indexes (8 types)

- `REFERENCES.kind`, `REALIZES.role`, `DEPENDS_ON.kind`, `DOCUMENTS.target_role`, `LOCATION.role`,
  `TRACKS.event`, `MUTATES.operation`, `IMPACTS.type`

**Priority 3**: Node property indexes (7)

- `File.language`, `Endpoint.verb,path`, `Feature.name`, `TestCase.name`, `Symbol.name`,
  `Snapshot.indexStatus`, `Incident.severity`

**Priority 4**: Full-text indexes (2)

- Symbol (name + docstring), Feature/SpecDoc (name + description + content)

### How Nodes & Edges Are Created (Ingest Pipeline)

```
1. Git diff: Get changed files for new commit
   ↓
2. Language indexers (TS, Python, Java): Extract symbols, calls, endpoints, tests
   ↓
3. Feature mapping: Match symbols to features (manual YAML + LLM assistance)
   ↓
4. Graph persistence (via neo4j-client):
   - UPSERT Snapshot node
   - UPSERT Module, File nodes
   - CREATE Symbol nodes with [:CONTAINS] to File
   - CREATE [:IN_SNAPSHOT] edges (cardinality invariant)
   - CREATE [:REFERENCES] edges (calls, type refs, imports)
   - CREATE [:REALIZES] edges (feature implementations, tests)
   - CREATE [:MUTATES] edges (data access)
   - CREATE [:TRACKS] edges (evolution)
   ↓
5. Vector embeddings: Store Symbol/SpecDoc embeddings in Qdrant
```

---

## Neo4j Best Practices Applied

### ✓ Already Implemented

| Practice                            | How Texere Uses It                                                       | Evidence                        |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| **Labeled nodes**                   | Each node type is a Neo4j label (`:Codebase`, `:Symbol`, etc.)           | graph_schema_spec.md §1.1       |
| **Composite keys**                  | Deterministic IDs: `snapshotId:filePath:symbolName:line:col`             | graph_schema_spec.md §1.3       |
| **Hierarchical CONTAINS**           | Bottom-up tree for fast parent traversal                                 | graph_schema_spec.md §1.2       |
| **Cardinality invariants**          | Every scoped node: exactly 1 `[:IN_SNAPSHOT]` edge                       | graph_schema_spec.md §1.5, §3.1 |
| **Unique constraints**              | 15 auto-indexed unique constraints                                       | graph_schema_spec.md §4.1       |
| **Edge property indexes**           | 8 indexes on high-traffic relationship properties                        | graph_schema_spec.md §4.2       |
| **Node property indexes**           | 7 indexes for filtering & traversal optimization                         | graph_schema_spec.md §4.3       |
| **Soft deletes**                    | `isDeleted: true` for non-hard-delete semantics                          | graph_schema_spec.md §1.6, §7.3 |
| **Explicit relationship direction** | CONTAINS (bottom-up), IN_SNAPSHOT (top-down), REFERENCES (bidirectional) | graph_schema_spec.md §3         |
| **Query optimization**              | Snapshot-first filtering, depth limits on transitive queries             | graph_schema_spec.md §8.3       |

### ⚠ Missing or Underdeveloped

| Best Practice                   | Gap                                                          | Recommendation                                                    |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Composite indexes**           | None defined for (snapshotId, filePath) lookups              | Add 4 composite indexes (§1.1)                                    |
| **Range indexes**               | Missing for temporal & confidence-based filtering            | Add range indexes on TRACKS.timestamp, REALIZES.confidence (§1.2) |
| **Vector indexes**              | Embeddings not indexed for semantic search                   | Add vector indexes for Symbol/SpecDoc embeddings (§1.3)           |
| **Existence constraints**       | IN_SNAPSHOT cardinality not enforced at DB level             | Add existence constraints (§3.1)                                  |
| **Reverse edges**               | Frequent reverse queries require relationship type scans     | Add reverse edges for REALIZED_BY, TESTED_BY (§2.2)               |
| **Batch constraint validation** | Ingest assumes per-node validation                           | Batch validation in UNWIND loops (§5.1)                           |
| **Temporal indexes**            | Deletion events not tracked; soft delete queries can be slow | Add deletion tracking & temporal indexes (§4.2)                   |
| **Soft delete filtering**       | No enforcement; APIs may return deleted nodes                | Add index & default filter to all queries (§8.1)                  |
| **Index profiling**             | No guidance on monitoring index usage                        | Add quarterly profiling + cleanup process (§1.4)                  |

---

## Key Improvement Areas

### 1. Index Strategy Improvements

**Issue**: Missing composite, range, and vector indexes.

**Recommendations**:

#### 1.1: Composite Indexes

```cypher
-- Fast (snapshotId, filePath) file lookups
CREATE INDEX file_snapshot_path IF NOT EXISTS
FOR (n:File) ON (n.snapshotId, n.path);

-- Fast (snapshotId, modulePath) module lookups
CREATE INDEX module_snapshot_name IF NOT EXISTS
FOR (n:Module) ON (n.snapshotId, n.name);

-- Track branches efficiently
CREATE INDEX snapshot_codebase_branch IF NOT EXISTS
FOR (n:Snapshot) ON (n.codebaseId, n.branch);

-- High-confidence relationship discovery
CREATE INDEX realizes_role_confidence IF NOT EXISTS
FOR ()-[r:REALIZES]-() ON (r.role, r.confidence);
```

**Benefit**: Query cardinality O(N) → O(log N) for snapshot-scoped lookups.

---

#### 1.2: Range Indexes

```cypher
-- Sort MODIFIED edges by snapshot timestamp
CREATE INDEX snapshot_timestamp IF NOT EXISTS
FOR (n:Snapshot) ON (n.timestamp);

-- Confidence-based filtering for pattern adherence
CREATE INDEX references_confidence_range IF NOT EXISTS
FOR ()-[r:REFERENCES {kind: 'PATTERN'}]-() ON (r.confidence);

-- Incident severity ordering
CREATE INDEX incident_severity_range IF NOT EXISTS
FOR (n:Incident) ON (n.severity);
```

**Benefit**: Time-ordered queries use index pre-sorting; eliminates memory-heavy Sort operation.

---

#### 1.3: Vector Indexes (Neo4j 5.13+)

```cypher
-- Semantic search for similar symbols
CREATE VECTOR INDEX symbol_embeddings IF NOT EXISTS
FOR (n:Symbol)
ON (n.embeddingId)
OPTIONS { indexConfig: { 'vector.dimensions': 384, 'vector.similarity_function': 'cosine' }};

-- Semantic search for documentation
CREATE VECTOR INDEX spec_embeddings IF NOT EXISTS
FOR (n:SpecDoc)
ON (n.embeddingId)
OPTIONS { indexConfig: { 'vector.dimensions': 384, 'vector.similarity_function': 'cosine' }};
```

**Benefit**: Embedding similarity queries O(N) → O(log N).

---

#### 1.4: Index Profiling & Cleanup

- Enable quarterly index profiling (identify unused indexes)
- Remove unused indexes to reduce write latency
- Rebuild indexes monthly for cardinality analysis

---

### 2. Relationship Design Optimizations

**Issue**: Frequently reversed relationships require relationship type scans.

**Recommendations**:

#### 2.1: Document Relationship Direction Semantics

- `:CONTAINS`: Always bottom-up (File → Module → Snapshot)
- `:IN_SNAPSHOT`: Always top-down (Symbol → Snapshot)
- `:REFERENCES`: Bidirectional (query both directions equally)
- `:REALIZES`: High-traffic in both directions:
  - Forward: "What implements this feature?" → Symbol/Endpoint → Feature
  - Reverse: "What is implemented by this symbol?" → Feature ← Symbol

---

#### 2.2: Add Reverse Edges for High-Traffic Patterns

```cypher
-- Instead of: MATCH (f:Feature)<-[:REALIZES]-(sym:Symbol)
-- Use: MATCH (f:Feature)-[:REALIZED_BY]->(sym:Symbol)
MERGE (f:Feature)-[:REALIZED_BY]->(sym:Symbol)

-- Similarly for TESTS
MERGE (sym:Symbol)-[:TESTED_BY]->(test:TestCase)

-- Create during ingest whenever forward edge is created
-- Cost: 2x edges; benefit: eliminate relationship type scans
```

**Benefit**: Index scan + RelationshipSeek instead of UndirectedRelationshipTypeScan.

---

### 3. Cardinality & Constraint Enforcement

**Issue**: No database constraints enforce the IN_SNAPSHOT invariant.

**Recommendations**:

#### 3.1: Existence Constraints

```cypher
-- Enforce: every Symbol must have exactly 1 IN_SNAPSHOT edge
CREATE CONSTRAINT symbol_in_snapshot_required IF NOT EXISTS
FOR (n:Symbol) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;

-- Similarly for other scoped node types
CREATE CONSTRAINT file_in_snapshot_required IF NOT EXISTS
FOR (n:File) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;

CREATE CONSTRAINT endpoint_in_snapshot_required IF NOT EXISTS
FOR (n:Endpoint) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;
```

**Benefit**: Data corruption caught at write time, not query time.

---

#### 3.2: Relationship Cardinality Hints

Document expected cardinality per edge type (e.g., 1–3 IMPLEMENTS edges per Symbol).

```markdown
| Source   | Target  | Role       | Typical Edges/Node |
| -------- | ------- | ---------- | ------------------ |
| Symbol   | Feature | IMPLEMENTS | 1–3 per symbol     |
| Endpoint | Feature | IMPLEMENTS | 1–5 per endpoint   |
| TestCase | Feature | VERIFIES   | 1–2 per test       |
```

---

### 4. Temporal & Evolution Tracking

**Issue**: Soft deletes (`isDeleted: true`) lack explicit tracking edges.

**Recommendations**:

#### 4.1: Explicit Deletion Events

```cypher
-- Extend TRACKS edge with DELETED event
MATCH (sym:Symbol)-[r:TRACKS {event: 'DELETED'}]->(snap:Snapshot)
WHERE r.event = 'DELETED'
RETURN sym, snap
ORDER BY snap.timestamp DESC
```

**Implementation**:

```typescript
// When marking node deleted in new snapshot
if (symbol.isDeleted && !previousSnapshot.contains(symbol.id)) {
  await graph.createEdge({
    from: symbol,
    to: latestSnapshot,
    type: 'TRACKS',
    properties: { event: 'DELETED', createdAt: Date.now() },
  });
}
```

---

#### 4.2: Add Deletion Timestamp

```cypher
ALTER NODE Symbol ADD PROPERTY deletedAt TIMESTAMP;

-- Track deletion time
MATCH (sym:Symbol {id: $symbolId})
SET sym.isDeleted = true,
    sym.deletedAt = datetime()

-- Retention policy: hard delete after 90 days
MATCH (sym:Symbol {isDeleted: true})
WHERE sym.deletedAt < datetime() - duration('P90D')
DETACH DELETE sym
```

---

#### 4.3: Feature Version Tracking

```cypher
-- Track feature state changes
(feature:Feature)-[r:TRACKS {event: 'VERSION_BUMPED', fromVersion: '1.0', toVersion: '1.1'}]->(snap:Snapshot)

-- Query feature evolution
MATCH (f:Feature {id: 'payment'})-[r:TRACKS]->(snap:Snapshot)
WHERE r.event IN ['INTRODUCED', 'VERSION_BUMPED']
RETURN f, snap, r.fromVersion, r.toVersion
ORDER BY snap.timestamp ASC
```

---

### 5. Batch Operations & Scaling

**Issue**: Ingest specification lacks bulk constraint validation guidance.

**Recommendations**:

#### 5.1: Batch Constraint Enforcement

```cypher
-- Batch-validate symbol IDs are unique per snapshot
UNWIND $symbolBatch AS sym
WITH sym
MATCH (s:Symbol {id: sym.id})
RETURN DISTINCT s
-- If any results, duplicates exist; fail batch early

-- Batch-upsert with constraint checks
UNWIND $symbolBatch AS sym
MERGE (s:Symbol {id: sym.id})
SET s += sym
WITH s, sym
MATCH (f:File {id: sym.fileId})
MERGE (f)-[:CONTAINS]->(s)
MERGE (snap:Snapshot {id: sym.snapshotId})
MERGE (s)-[:IN_SNAPSHOT]->(snap)
RETURN COUNT(s) as created
```

**Benefit**: O(1) validation per batch vs. O(N) per-node.

---

#### 5.2: Incremental TRACKS Edge Creation

```cypher
-- Batch by snapshot instead of per-symbol
UNWIND $introducedSymbolIds AS symbolId
MATCH (sym:Symbol {id: symbolId})
MERGE (sym)-[:TRACKS {event: 'INTRODUCED'}]->(snap:Snapshot {id: $snapshotId})
RETURN COUNT(*) as edges_created
```

---

#### 5.3: Parallel Indexer Runs

```typescript
// Run language indexers in parallel
const results = await Promise.all(
  languageIndexers.map((indexer) =>
    indexer.indexFiles({
      codebaseRoot,
      snapshotId,
      filePaths: changedFiles.filter((f) => indexer.canHandleFile(f)),
    }),
  ),
);

// Merge and batch persist
await persistBatch(results.flat(), snapshotId);
```

**Benefit**: 2–4x faster indexing on multi-language repos.

---

### 6. Query Pattern Optimization

**Issue**: Unbounded transitive closures & potential cartesian explosions.

**Recommendations**:

#### 6.1: Explicit Depth Limits

```cypher
-- Bad: unbounded call graph
MATCH (f:Feature)-[:IMPLEMENTS]->(sym:Symbol)
OPTIONAL MATCH (sym)-[r:REFERENCES {kind: 'CALL'}*]->(called:Symbol)
RETURN called

-- Good: explicit depth limit + LIMIT
WITH f, x LIMIT 50  -- Implementations per feature
OPTIONAL MATCH (sym:Symbol)-[r:REFERENCES {kind: 'CALL'}*0..2]->(called:Symbol)
WITH f, x, called
MATCH path = (called)-[r:REFERENCES {kind: 'CALL'}]->(deeper:Symbol)
LIMIT 500  -- Max call chain results
RETURN DISTINCT deeper
```

---

#### 6.2: Snapshot-First Filtering (Most Selective First)

```cypher
-- Good: filter by snapshot ID first
MATCH (snap:Snapshot {id: $snapshotId})
MATCH (m:Module {id: $moduleId})-[:CONTAINS*]->(sym:Symbol)
WHERE sym.snapshotId = $snapshotId
RETURN sym

-- Bad: full Symbol scan
MATCH (sym:Symbol)-[:CONTAINS*]->(m:Module {id: $moduleId})
RETURN sym
```

---

#### 6.3: Avoid Unbounded Transitive Closure

```cypher
-- Bad: deep transitive closure
MATCH (f:Feature)-[:DEPENDS_ON*]->(dep:Feature)
RETURN dep

-- Good: explicit depth + distinct
MATCH (f:Feature)-[:DEPENDS_ON*0..3]->(dep:Feature)
WHERE dep.id <> f.id
RETURN DISTINCT dep
LIMIT 100
```

---

### 7. Schema Redundancy & Derived Edges

**Issue**: Derived edges lack documented maintenance strategy.

**Recommendations**:

#### 7.1: Document Derived Edges Strategy

```markdown
## Derived Edges (Stored for Query Convenience)

| Edge                   | Derived From                               | Update Condition           |
| ---------------------- | ------------------------------------------ | -------------------------- |
| Endpoint -[:IN_FILE]   | Endpoint.handlerSymbolId → Symbol.filePath | On handler change          |
| Endpoint -[:IN_MODULE] | Endpoint.handlerSymbolId → Symbol.module   | On handler change          |
| TestCase -[:IN_MODULE] | TestCase.location.file → Module            | On file location change    |
| Symbol -[:SIMILAR_TO]  | Embedding distance < threshold             | On embedding recomputation |

**Maintenance Rule**: When parent edge changes, re-derive in same transaction.
```

---

#### 7.2: Cache Invalidation Strategy

```yaml
derived_edges:
  strategy: eager_maintenance # Maintain in DB, not lazy-derived

  eager_maintenance:
    enabled: true
    transactional_consistency: true
    update_on: ['handler_change', 'file_location_change']
```

---

### 8. Soft Delete Consistency

**Issue**: Queries may return deleted nodes; no enforcement.

**Recommendations**:

#### 8.1: Enforce Soft Delete Filtering

```cypher
-- Add index for fast filtering
CREATE INDEX node_is_deleted IF NOT EXISTS
FOR (n) ON (n.isDeleted);

-- Always filter by default
MATCH (sym:Symbol {snapshotId: $snapshotId, isDeleted: false})
RETURN sym
```

**Implementation** (API contracts):

```typescript
function getSymbols(snapshotId: string, includeDeleted = false): Promise<Symbol[]> {
  const query = `
    MATCH (sym:Symbol {snapshotId: $snapshotId})
    ${includeDeleted ? '' : 'WHERE NOT sym.isDeleted'}
    RETURN sym
  `;
  // ...
}
```

---

#### 8.2: Add Deletion Timestamp

```cypher
ALTER NODE Symbol ADD PROPERTY deletedAt TIMESTAMP;

MATCH (sym:Symbol {id: $symbolId})
SET sym.isDeleted = true,
    sym.deletedAt = datetime()

-- Retention: hard delete after 90 days
MATCH (sym:Symbol {isDeleted: true})
WHERE sym.deletedAt < datetime() - duration('P90D')
DETACH DELETE sym
```

---

### 9. New Relationship Types (Future)

#### 9.1: CONFLICTED (Merge Conflicts)

```cypher
(symbol1:Symbol)-[r:CONFLICTED {conflictType: 'MERGE_CONFLICT', resolvedAt: null}]->(symbol2:Symbol)
```

#### 9.2: SUPERSEDES (Symbol Evolution)

```cypher
(oldSymbol:Symbol)-[r:SUPERSEDES {reason: 'REFACTORED', date: $now}]->(newSymbol:Symbol)
```

#### 9.3: TESTED_BY (Inverse of REALIZES)

```cypher
-- Add for efficient "what tests this" queries
(sym:Symbol)-[:TESTED_BY]->(test:TestCase)
```

#### 9.4: Vector Similarity Expiration

```cypher
ALTER NODE Symbol ADD PROPERTY embeddingVersion INTEGER;

-- Batch re-embed outdated symbols
MATCH (sym:Symbol)
WHERE sym.embeddingVersion < $currentVersion
RETURN sym
```

#### 9.5: Module Dependency Caching

```cypher
-- Pre-compute transitive closure (post-index)
MATCH (m1:Module)-[:DEPENDS_ON*1..5]->(m2:Module)
WHERE m1.snapshotId = $snapshotId
MERGE (m1)-[:DEPENDS_ON_TRANSITIVE {depth: 1}]->(m2)
```

---

## Implementation Phases

### Phase 1 (High Impact, Low Risk) – Sprint 1–2

**Effort**: ~1 week | **Benefit**: 15–25% query improvement

1. **Recommendation 1.1**: Composite indexes
2. **Recommendation 3.1**: IN_SNAPSHOT existence constraints
3. **Recommendation 5.1**: Batch constraint enforcement
4. **Recommendation 6.2**: Snapshot-first query documentation
5. **Recommendation 8.1**: Soft delete filtering enforcement

### Phase 2 (Medium Impact, Medium Risk) – Sprint 3–4

**Effort**: ~2 weeks | **Benefit**: 30% query improvement + enhanced audit trail

1. **Recommendation 1.2**: Range indexes
2. **Recommendation 4.2**: Explicit deletion tracking (DELETED event)
3. **Recommendation 5.2**: Batch TRACKS edge creation
4. **Recommendation 7.1**: Document derived edge strategy
5. **Recommendation 8.2**: Add deletedAt timestamp

### Phase 3 (Advanced, Maintenance) – Sprint 5+

**Effort**: ~3–4 weeks | **Benefit**: 50%+ scaling headroom

1. **Recommendation 1.3**: Vector indexes
2. **Recommendation 1.4**: Index profiling automation
3. **Recommendation 2.2**: Reverse edges (REALIZED_BY, TESTED_BY)
4. **Recommendation 5.3**: Parallel indexer runs
5. **Recommendations 9.1–9.5**: New edge types & evolution tracking

---

## Validation Checklist

Before deploying each recommendation:

- [ ] Schema migration tested on dev instance
- [ ] Query performance profiled with PROFILE (actual data)
- [ ] Index cardinality analyzed (`db.indexes()`)
- [ ] Backward compatibility verified
- [ ] Storage impact measured
- [ ] Ingest tests updated
- [ ] Documentation updated (specs, API contracts)
- [ ] Production deployment plan (online migration, rollback)

---

## References

### Texere Specifications

- `docs/specs/feature/indexer/graph_schema_spec.md` – Node & edge DDL, constraints, indexes,
  lifecycle
- `docs/specs/feature/indexer/layout_spec.md` – Project structure & API contracts
- `docs/specs/feature/indexer/ingest_spec.md` – Indexing pipeline & edge inference
- `docs/specs/feature/indexer/research/IMPROVEMENT_RECOMMENDATIONS.md` – Detailed improvement guide
- `docs/specs/feature/indexer/nodes/README.md` – Node catalog with cardinality invariants
- `docs/specs/feature/indexer/edges/README.md` – Edge catalog with sub-types

### Neo4j Best Practices

- [Neo4j Index Strategy](https://neo4j.com/docs/cypher-manual/current/indexes/search-performance-indexes/)
- [Composite Indexes](https://neo4j.com/docs/cypher-manual/current/indexes/search-performance-indexes/composite-index/)
- [Constraints](https://neo4j.com/docs/cypher-manual/current/constraints/)
- [Query Tuning](https://neo4j.com/docs/operations-manual/current/performance/cypher-tuning/)
- [Knowledge Graphs](https://neo4j.com/blog/developer/knowledge-graph-generation/)

---

**Document Version**: 1.0  
**Research Date**: December 2025  
**Status**: Ready for Implementation Planning
