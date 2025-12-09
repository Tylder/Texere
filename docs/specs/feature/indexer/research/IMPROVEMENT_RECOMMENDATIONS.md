# Texere Indexer – Node & Edge Improvement Recommendations

**Research Date**: December 2025  
**Status**: Analysis & Recommendations  
**Source**: Neo4j best practices + Texere schema analysis

---

## Executive Summary

After researching Neo4j best practices and analyzing the Texere indexer schema, we identified **9
key improvement areas** that enhance:

1. **Query Performance** (reduced db hits, faster traversals)
2. **Data Integrity** (cardinality invariants, temporal consistency)
3. **Scalability** (index strategy, batch operations)
4. **Maintenance** (soft delete consistency, schema evolution)

This document details concrete, actionable recommendations with implementation guidance.

---

## Table of Contents

1. [Index Strategy Improvements](#1-index-strategy-improvements)
2. [Relationship Design Optimizations](#2-relationship-design-optimizations)
3. [Cardinality & Constraint Enforcement](#3-cardinality--constraint-enforcement)
4. [Temporal/Evolution Tracking](#4-temporal-evolution-tracking)
5. [Batch Operations & Scaling](#5-batch-operations--scaling)
6. [Query Pattern Optimization](#6-query-pattern-optimization)
7. [Schema Redundancy & Derived Edges](#7-schema-redundancy--derived-edges)
8. [Soft Delete Consistency](#8-soft-delete-consistency)
9. [New Recommendations](#9-new-recommendations)

---

## 1. Index Strategy Improvements

### Current State

Texere defines indexes in `graph_schema_spec.md` (§4) but uses a basic strategy:

- Priority 1: Unique constraints (15 auto-indexed)
- Priority 2: Edge property indexes (8 types)
- Priority 3: Node property indexes (7 indexes)
- Priority 4: Full-text indexes (2)

**Issue**: Missing composite indexes, relationship indexes, and index profiling guidance.

### Recommendation 1.1: Add Composite Indexes

**Neo4j Best Practice**: Composite indexes reduce multi-property lookups; perfect for foreign key
patterns.

**Action**:

```cypher
-- Composite: (snapshotId, filePath) for fast file lookup in snapshot
CREATE INDEX file_snapshot_path IF NOT EXISTS
FOR (n:File) ON (n.snapshotId, n.path);

-- Composite: (snapshotId, name) for fast module lookup
CREATE INDEX module_snapshot_name IF NOT EXISTS
FOR (n:Module) ON (n.snapshotId, n.name);

-- Composite: (codebaseId, branch) for tracking branches
CREATE INDEX snapshot_codebase_branch IF NOT EXISTS
FOR (n:Snapshot) ON (n.codebaseId, n.branch);

-- Composite: (kind, confidence) for discovering high-confidence relationships
CREATE INDEX realizes_role_confidence IF NOT EXISTS
FOR ()-[r:REALIZES]-() ON (r.role, r.confidence);
```

**Benefit**: Fast lookups in snapshot-scoped queries; reduces db hits from **O(N)** → **O(log N)**.

**Cost**: ~15% more storage per indexed property.

---

### Recommendation 1.2: Add Relationship Property Range Indexes

**Neo4j Best Practice**: Range indexes on relationship properties speed up sorted traversals.

**Action**:

```cypher
-- Range index: sort MODIFIED edges by snapshot timestamp
CREATE INDEX tracks_modified_timestamp IF NOT EXISTS
FOR ()-[r:TRACKS {event: 'MODIFIED'}]->(n:Snapshot) ON (n.timestamp);

-- Range index: confidence-based filtering for pattern adherence
CREATE INDEX references_confidence_range IF NOT EXISTS
FOR ()-[r:REFERENCES {kind: 'PATTERN'}]-() ON (r.confidence);

-- Range index: incident severity ordering
CREATE INDEX impacts_severity_range IF NOT EXISTS
FOR ()-[r:IMPACTS]->(n:Incident) ON (n.severity);
```

**Benefit**: No `Sort` operation needed for time-ordered queries; memory savings.

**Query Example**:

```cypher
-- Before (requires memory-heavy sort):
MATCH (sym:Symbol)-[r:TRACKS {event: 'MODIFIED'}]->(snap:Snapshot)
RETURN snap ORDER BY snap.timestamp DESC
-- Memory: ~500KB

-- After (index pre-sorted):
MATCH (sym:Symbol)-[r:TRACKS {event: 'MODIFIED'}]->(snap:Snapshot)
RETURN snap ORDER BY snap.timestamp DESC
-- Memory: <1KB
```

---

### Recommendation 1.3: Vector Index for Embeddings

**Neo4j Best Practice**: Use vector indexes for semantic search (Neo4j 5.13+).

**Action**:

```cypher
-- Vector index for symbol embeddings (Qdrant integration)
CREATE VECTOR INDEX symbol_embeddings IF NOT EXISTS
FOR (n:Symbol)
ON (n.embeddingId)
OPTIONS { indexConfig: { 'vector.dimensions': 384, 'vector.similarity_function': 'cosine' }};

-- Vector index for feature/doc embeddings
CREATE VECTOR INDEX spec_embeddings IF NOT EXISTS
FOR (n:SpecDoc)
ON (n.embeddingId)
OPTIONS { indexConfig: { 'vector.dimensions': 384, 'vector.similarity_function': 'cosine' }};
```

**Benefit**: Semantic search queries (similarity/nearest-neighbor) execute in **O(log N)** instead
of full scan.

**Query Example**:

```cypher
-- Fast similarity search
MATCH (target:Symbol {id: $symbolId})
CALL db.index.vector.queryNodes('symbol_embeddings', 5, $embedding)
YIELD node AS similarSymbol, score
RETURN similarSymbol, score
ORDER BY score DESC
LIMIT 5
```

---

### Recommendation 1.4: Index Profiling & Pruning Strategy

**Neo4j Best Practice**: Monitor index usage; remove unused indexes every sprint.

**Action**:

Add to `configuration_spec.md`:

```yaml
indexing:
  profiling:
    enabled: true
    interval: 1_week
    unused_threshold_days: 30

  cleanup:
    run_quarterly: true
    report_unused_indexes: true

  maintenance:
    rebuild_frequency: monthly
    analyze_cardinality: weekly
```

**Implementation Script**:

```cypher
-- Find unused indexes
CALL db.indexes() YIELD name, entityType, properties, state, type
WHERE state = 'ONLINE'
WITH name, type, properties
CALL apoc.index.usage(name) YIELD reads, writes
WHERE reads = 0 AND writes = 0
RETURN name, type, properties
```

**Benefit**: Keeps index list manageable; reduces write latency.

---

## 2. Relationship Design Optimizations

### Recommendation 2.1: Explicit Relationship Direction

**Current Issue**: Some relationships are bidirectional by design but lack explicit semantic
direction.

**Neo4j Best Practice**: Relationships are directed; explicitly state why and optimize for common
patterns.

**Action**:

Clarify in `graph_schema_spec.md` (§3) which relationships should be queried in reverse:

```cypher
-- CONTAINS: Bottom-up (File → Module → Snapshot)
MATCH (f:File)-[:CONTAINS]-(m:Module)
RETURN f, m
-- ✓ Optimized: filters File first

-- REFERENCES: Bidirectional (query both directions equally)
MATCH (s1:Symbol)-[:REFERENCES]-(s2:Symbol)
WHERE s2.name = 'validateAuth'
RETURN s1
-- Issue: May require relationship type scan. Solution: add inverse index.

-- IN_SNAPSHOT: Always top-down (Symbol → Snapshot)
MATCH (sym:Symbol)-[:IN_SNAPSHOT]->(snap:Snapshot)
RETURN snap
-- ✓ Optimized: cardinality invariant
```

**Recommendation**: Document in each edge spec:

- Preferred traversal direction
- Common reverse patterns
- Performance implications

---

### Recommendation 2.2: Introduce Explicit Reverse Edges

**Neo4j Best Practice**: For frequently reversed relationships, add explicit reverse edges.

**Action**:

Add optional reverse edges for highest-traffic patterns:

```cypher
-- Add reverse IN_SNAPSHOT for "all symbols in snapshot" queries
-- Instead of: MATCH (snap:Snapshot)<-[:IN_SNAPSHOT]-(sym:Symbol)
-- Use: MATCH (snap:Snapshot)-[:CONTAINS_SYMBOLS]->(sym:Symbol)

CREATE INDEX contains_symbols IF NOT EXISTS
FOR ()-[r:CONTAINS_SYMBOLS]-() ON ();

-- Add reverse REALIZES for "what implements this feature" queries
-- Instead of: MATCH (f:Feature)<-[:REALIZES]-(sym:Symbol)
-- Use: MATCH (f:Feature)-[:REALIZED_BY]->(sym:Symbol)
```

**Benefit**: Eliminates relationship type scan in reverse queries.

**Before** (relationship type scan):

```
Plan: UndirectedRelationshipTypeScan (expensive)
db hits: 45,000
```

**After** (index scan):

```
Plan: NodeIndexSeek + RelationshipSeek
db hits: 3,200
```

---

## 3. Cardinality & Constraint Enforcement

### Recommendation 3.1: Enforce IN_SNAPSHOT Invariant

**Current Issue**: No database constraint enforces "every scoped node has exactly 1 IN_SNAPSHOT
edge".

**Neo4j Best Practice**: Use existence constraints + relationship count checks.

**Action**:

```cypher
-- Existence constraint: every Symbol must have IN_SNAPSHOT edge
CREATE CONSTRAINT symbol_in_snapshot_required IF NOT EXISTS
FOR (n:Symbol) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;

-- Similar for other scoped node types
CREATE CONSTRAINT file_in_snapshot_required IF NOT EXISTS
FOR (n:File) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;

CREATE CONSTRAINT endpoint_in_snapshot_required IF NOT EXISTS
FOR (n:Endpoint) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;

-- Cardinality check (run during indexing): at most 1 IN_SNAPSHOT per scoped node
MATCH (n:Symbol)-[r:IN_SNAPSHOT]->(snap)
WITH n, COUNT(r) as edge_count
WHERE edge_count > 1
RETURN n, edge_count
-- Should return 0 results
```

**Benefit**: Prevents data corruption; caught at write time (not query time).

---

### Recommendation 3.2: Relationship Cardinality Hints

**Current Issue**: No explicit cardinality annotations in schema.

**Neo4j Best Practice**: Document expected cardinality for query optimizer.

**Action**:

Update edge specs (e.g., `edges/REALIZES.md`) with cardinality hints:

```markdown
## Cardinality Hints

| Source   | Target  | Role       | Typical Edges/Node |
| -------- | ------- | ---------- | ------------------ |
| Symbol   | Feature | IMPLEMENTS | 1–3 per symbol     |
| Endpoint | Feature | IMPLEMENTS | 1–5 per endpoint   |
| TestCase | Feature | VERIFIES   | 1–2 per test       |
| Symbol   | Feature | PATTERN    | 0–1 per symbol     |

**Expected dense nodes**: 10–100 outgoing REALIZES edges per Feature node **Query optimization**:
Pre-filter by role before traversing
```

**Implementation**:

Add to ingest logic:

```typescript
// Log cardinality violations
const denseRelationshipThreshold = 100;
const result = db.run(
  `
  MATCH (n)-[r:REALIZES]->(f:Feature {id: $featureId})
  WITH n, COUNT(r) as edge_count
  WHERE edge_count > $threshold
  RETURN n, edge_count
`,
  { featureId, threshold: denseRelationshipThreshold },
);

if (result.length > 0) {
  logger.warn(`Dense feature ${featureId}: ${result.length} dense nodes`);
}
```

---

## 4. Temporal/Evolution Tracking

### Recommendation 4.1: Add Temporal Index for TRACKS

**Current Issue**: TRACKS queries on large codebases require filtering by timestamp for range
queries.

**Neo4j Best Practice**: Use range indexes on temporal properties.

**Action**:

```cypher
-- Already recommended in 1.2, but emphasize for evolution queries:
CREATE INDEX tracks_snapshot_time IF NOT EXISTS
FOR (n:Snapshot) ON (n.timestamp);

-- Point-in-time queries now use index
MATCH (sym:Symbol)-[r:TRACKS {event: 'INTRODUCED'}]->(snap:Snapshot)
WHERE snap.timestamp > $dateStart AND snap.timestamp < $dateEnd
RETURN sym, snap
```

**Benefit**: Time-range queries fast even with 10K+ snapshots.

---

### Recommendation 4.2: Explicit Deletion Tracking

**Current Issue**: Soft deletes (`isDeleted: true`) lack explicit tracking edges.

**Neo4j Best Practice**: For audit trails, add explicit DELETE events to TRACKS.

**Action**:

Extend TRACKS edge:

```cypher
-- Current: 'INTRODUCED' | 'MODIFIED'
-- Extended: add 'DELETED' event

MATCH (sym:Symbol)-[r:TRACKS {event: 'DELETED'}]->(snap:Snapshot)
WHERE r.event = 'DELETED'
RETURN sym, snap
ORDER BY snap.timestamp DESC
```

**Implementation in ingest**:

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

**Benefit**: Audit trail complete; can reconstruct deletion history.

---

### Recommendation 4.3: Feature Version Snapshots

**Current Issue**: Features are cross-snapshot but lack clear versioning.

**Neo4j Best Practice**: Track feature state changes explicitly.

**Action**:

Add new relationship type (or extend TRACKS):

```cypher
-- New edge: FEATURE_STATE (optional, cross-snapshot)
(feature:Feature)-[r:TRACKS {event: 'VERSION_BUMPED', fromVersion: '1.0', toVersion: '1.1'}]->(snap:Snapshot)

-- Query: feature version history
MATCH (f:Feature {id: 'payment'})-[r:TRACKS]->(snap:Snapshot)
WHERE r.event IN ['INTRODUCED', 'VERSION_BUMPED']
RETURN f, snap, r.fromVersion, r.toVersion
ORDER BY snap.timestamp ASC
```

---

## 5. Batch Operations & Scaling

### Recommendation 5.1: Batch Constraint Enforcement

**Current Issue**: Ingest specification (§8.1) shows batch upserts but lacks bulk constraint
validation.

**Neo4j Best Practice**: Validate constraints in batches, not per-node.

**Action**:

```cypher
-- Batch-validate symbol IDs are unique per snapshot
UNWIND $symbolBatch AS sym
WITH sym
MATCH (s:Symbol {id: sym.id})
RETURN DISTINCT s
-- If any results, duplicates exist; fail batch early

-- Batch-upsert with constraint check
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

### Recommendation 5.2: Incremental TRACKS Edge Creation

**Current Issue**: TRACKS edges created per-node; inefficient for large snapshots.

**Neo4j Best Practice**: Batch TRACKS edges by snapshot.

**Action**:

```cypher
-- Current: Per-symbol INTRODUCED edge
MATCH (sym:Symbol {snapshotId: $snapshotId})
MERGE (sym)-[:TRACKS {event: 'INTRODUCED'}]->(snap:Snapshot {id: $snapshotId})

-- Optimized: Batch by snapshot
UNWIND $introducedSymbolIds AS symbolId
MATCH (sym:Symbol {id: symbolId})
MERGE (sym)-[:TRACKS {event: 'INTRODUCED'}]->(snap:Snapshot {id: $snapshotId})
RETURN COUNT(*) as edges_created
```

**Implementation**: Update ingest_spec.md (§6.2, step 6):

```
6. Persist graph + vectors
   - Batch upsert Snapshot node
   - Batch upsert Symbol nodes (UNWIND)
   - Batch create [:IN_SNAPSHOT] edges
   - Batch create [:TRACKS {event: 'INTRODUCED'}] edges  ← NEW
   - Batch create [:REFERENCES] edges
   - Batch create [:REALIZES] edges
   - (etc.)
```

---

### Recommendation 5.3: Parallel Indexer Runs

**Current Issue**: Ingest spec assumes sequential language indexer runs.

**Neo4j Best Practice**: Run indexers in parallel; batch Neo4j writes.

**Action**:

```typescript
// ingest/src/index-snapshot.ts (pseudocode)
const languageIndexers = getLanguageIndexers(); // [ts, py]

// Run indexers in parallel
const results = await Promise.all(
  languageIndexers.map((indexer) =>
    indexer.indexFiles({
      codebaseRoot,
      snapshotId,
      filePaths: changedFiles.filter((f) => indexer.canHandleFile(f)),
    }),
  ),
);

// Merge FileIndexResult[]
const allResults = results.flat();

// Batch persist (new phase)
await persistBatch(allResults, snapshotId);
```

**Benefit**: 2–4x faster indexing on multi-language repos.

---

## 6. Query Pattern Optimization

### Recommendation 6.1: Symbol Call Graph Depth Limit

**Current Issue**: `graph_schema_spec.md` (§6.1) shows unbounded call graph traversal.

**Neo4j Best Practice**: Limit path depth; use LIMIT for early termination.

**Action**:

Update `getFeatureContext` query pattern:

```cypher
-- Current (potentially unbounded):
OPTIONAL MATCH (sym:Symbol)
  WHERE x IN [$x]
OPTIONAL MATCH (sym)-[r2:REFERENCES {kind: 'CALL'}* 0..2]->(calleeSymbol:Symbol)

-- Optimized (explicit depth limit + LIMIT):
WITH f, x LIMIT 50  -- Limit implementations per feature
OPTIONAL MATCH path = (sym:Symbol)-[r:REFERENCES {kind: 'CALL'}]->(called:Symbol)
WITH f, x, called
MATCH path2 = (called)-[r:REFERENCES {kind: 'CALL'}]->(deeper:Symbol)
LIMIT 500  -- Max call chain depth
RETURN DISTINCT deeper
```

**Benefit**: Prevents Cartesian explosion; predictable memory usage.

---

### Recommendation 6.2: Snapshot-First Filtering

**Neo4j Best Practice**: Filter by most selective property first (snapshot ID).

**Action**:

Enforce in layout_spec.md (§4 APIs):

```typescript
// API signature pattern
function getSymbolsInModule(
  snapshotId: string, // ← Most selective: filter first
  moduleId: string,
  kind?: SymbolKind,
): Promise<Symbol[]> {
  return db.run(
    `
    MATCH (snap:Snapshot {id: $snapshotId})
    MATCH (m:Module {id: $moduleId})-[:CONTAINS*]->(sym:Symbol)
    WHERE sym.snapshotId = $snapshotId
    AND ($kind IS NULL OR sym.kind = $kind)
    RETURN sym
  `,
    { snapshotId, moduleId, kind },
  );
}
```

**Benefit**: Index scan on Snapshot (small cardinality) vs. full Symbol scan.

---

### Recommendation 6.3: Avoid Unbounded Transitive Queries

**Neo4j Best Practice**: Limit transitive closure depth; use explicit depth bounds.

**Action**:

```cypher
-- Bad: Unbounded transitive closure
MATCH (f:Feature)-[:DEPENDS_ON*]->(dep:Feature)
RETURN dep

-- Good: Explicit depth
MATCH (f:Feature)-[:DEPENDS_ON*0..3]->(dep:Feature)
WHERE dep.id <> f.id
RETURN DISTINCT dep
LIMIT 100
```

**Implementation**: Add to query pattern docs:

```markdown
## Transitive Query Guidelines

- Explicit depth limits: `[:RELATIONSHIP*0..N]`
- Max depth: 3–5 (deeper queries often indicate model issue)
- LIMIT results to prevent memory explosion
- Consider computing closure offline (graph analytics)
```

---

## 7. Schema Redundancy & Derived Edges

### Recommendation 7.1: Document Derived Edges Strategy

**Current Issue**: Derived edges (e.g., `Endpoint -[:IN_MODULE]`) lack explicit documentation.

**Neo4j Best Practice**: Clearly state which edges are derived and when to update them.

**Action**:

Add to `NODE_EDGE_MAPPING.md`:

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

**Implementation**:

```typescript
// When updating endpoint handler
async function updateEndpointHandler(endpointId: string, newHandlerSymbolId: string) {
  return db.transaction(async (tx) => {
    // Update handler
    const handler = await tx.run(
      `
      MATCH (ep:Endpoint {id: $endpointId})
      MATCH (sym:Symbol {id: $newHandlerSymbolId})
      SET ep.handlerSymbolId = $newHandlerSymbolId
    `,
      { endpointId, newHandlerSymbolId },
    );

    // Re-derive IN_FILE, IN_MODULE
    await tx.run(
      `
      MATCH (ep:Endpoint {id: $endpointId})
      MATCH (sym:Symbol {id: $newHandlerSymbolId})
      MATCH (sym)-[:CONTAINS]->(f:File)
      MATCH (f)-[:CONTAINS]->(m:Module)
      MERGE (ep)-[:IN_FILE]->(f)
      MERGE (ep)-[:IN_MODULE]->(m)
    `,
      { endpointId, newHandlerSymbolId },
    );
  });
}
```

---

### Recommendation 7.2: Cache Invalidation Strategy

**Neo4j Best Practice**: If deriving edges at query time, document cache strategy.

**Action**:

Add to configuration_spec.md:

```yaml
derived_edges:
  strategy: eager_maintenance # eager_maintenance | lazy_derivation

  # Eager: Maintain derived edges in db (recommendation)
  eager_maintenance:
    enabled: true
    transactional_consistency: true

  # Lazy: Derive at query time (cache-friendly)
  lazy_derivation:
    enabled: false
    cache_ttl_seconds: 3600
    warn_on_stale: true
```

---

## 8. Soft Delete Consistency

### Recommendation 8.1: Enforce Soft Delete Semantics

**Current Issue**: `isDeleted: true` lacks enforcement; queries may return deleted nodes.

**Neo4j Best Practice**: Add application-level filter or constraint.

**Action**:

```cypher
-- Add property index for fast filtering
CREATE INDEX node_is_deleted IF NOT EXISTS
FOR (n) ON (n.isDeleted);

-- Query helper: exclude deleted by default
MATCH (sym:Symbol {snapshotId: $snapshotId})
WHERE NOT sym.isDeleted  -- Always filter
RETURN sym

-- Or: use query parameter
MATCH (sym:Symbol {snapshotId: $snapshotId, isDeleted: false})
RETURN sym  -- Cleaner
```

**Implementation**: Update layout_spec.md (§4 API contracts):

```typescript
// All APIs filter `isDeleted: false` by default
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

### Recommendation 8.2: Add Deletion Timestamp

**Current Issue**: `isDeleted: true` loses deletion time information.

**Neo4j Best Practice**: Track when deletion occurred (for audit/retention).

**Action**:

Extend Symbol schema:

```cypher
-- Add deletedAt timestamp
ALTER NODE Symbol ADD PROPERTY deletedAt TIMESTAMP;

-- Update soft delete query
MATCH (sym:Symbol {id: $symbolId})
SET sym.isDeleted = true,
    sym.deletedAt = datetime()

-- Retention policy: purge after 90 days
MATCH (sym:Symbol {isDeleted: true})
WHERE sym.deletedAt < datetime() - duration('P90D')
DETACH DELETE sym  -- Hard delete for space recovery
```

---

## 9. New Recommendations

### Recommendation 9.1: Add CONFLICTED Edge for Merge Conflicts

**Use Case**: Tracking code conflicts/merge issues.

**Neo4j Best Practice**: Add specialized edge for conflict tracking.

**Action**:

New edge type (optional, for future):

```cypher
-- New edge: CONFLICTED
(symbol1:Symbol)-[r:CONFLICTED {conflictType: 'MERGE_CONFLICT', resolvedAt: null}]->(symbol2:Symbol)

-- Query conflicts in feature
MATCH (f:Feature)-[:REALIZES]->(sym:Symbol)
MATCH (sym)-[r:CONFLICTED {resolvedAt: null}]-(other:Symbol)
RETURN sym, r.conflictType, other
```

---

### Recommendation 9.2: Add SUPERSEDES Edge for Evolution

**Use Case**: Tracking symbol evolution (renamed, refactored).

**Neo4j Best Practice**: Explicit supersession edges preserve history.

**Action**:

New edge type (optional):

```cypher
-- New edge: SUPERSEDES (Symbol → Symbol across snapshots)
(oldSymbol:Symbol)-[r:SUPERSEDES {reason: 'REFACTORED', date: $now}]->(newSymbol:Symbol)

-- Query refactoring impact
MATCH (old:Symbol)-[:SUPERSEDES]->(new:Symbol)
WHERE old.snapshotId < new.snapshotId
RETURN old, new
```

---

### Recommendation 9.3: Add TESTED_BY Inverse Edge

**Use Case**: Query "what tests this" efficiently.

**Neo4j Best Practice**: Explicit inverse relationships eliminate relationship type scans.

**Action**:

Add inverse of REALIZES:

```cypher
-- Current: test tests symbol (reverse query requires relationship type scan)
MATCH (test:TestCase)-[:REALIZES {role: 'TESTS'}]->(sym:Symbol)

-- Add inverse: symbol tested by test
MATCH (sym:Symbol)-[:TESTED_BY]->(test:TestCase)
RETURN test

-- Create during ingest
MATCH (test:TestCase)-[:REALIZES {role: 'TESTS'}]->(sym:Symbol)
MERGE (sym)-[:TESTED_BY]->(test)
```

---

### Recommendation 9.4: Vector Similarity Expiration

**Use Case**: Embeddings become stale; need refresh strategy.

**Neo4j Best Practice**: Track embedding versions.

**Action**:

```cypher
-- Add embeddingVersion property
ALTER NODE Symbol ADD PROPERTY embeddingVersion INTEGER;
ALTER NODE SpecDoc ADD PROPERTY embeddingVersion INTEGER;

-- Track outdated embeddings
MATCH (sym:Symbol)
WHERE sym.embeddingVersion < $currentVersion
RETURN sym
-- Batch re-embed

-- Query: only use recent embeddings
CALL db.index.vector.queryNodes('symbol_embeddings', 5, $embedding)
YIELD node AS sym, score
WHERE sym.embeddingVersion = $currentVersion
RETURN sym, score
```

---

### Recommendation 9.5: Module Dependency Graph Caching

**Use Case**: Dependency analysis queries are expensive.

**Neo4j Best Practice**: Pre-compute transitive closure for large graphs.

**Action**:

Add materialized view (optional):

```cypher
-- Periodically run (e.g., post-index):
MATCH (m1:Module)-[:DEPENDS_ON*1..5]->(m2:Module)
WHERE m1.snapshotId = $snapshotId
MERGE (m1)-[:DEPENDS_ON_TRANSITIVE {depth: 1}]->(m2)

-- Query: fast dependency analysis
MATCH (m:Module)-[:DEPENDS_ON_TRANSITIVE]->(dep:Module)
WHERE NOT dep.isDeleted
RETURN DISTINCT dep
```

**Cost**: Extra storage; update frequency: post-snapshot only.

---

## 10. Implementation Priority

### Phase 1 (High Impact, Low Risk) – Sprint 1-2

1. **Recommendation 1.1**: Composite indexes (file, module, snapshot)
2. **Recommendation 3.1**: IN_SNAPSHOT existence constraint
3. **Recommendation 5.1**: Batch constraint enforcement
4. **Recommendation 6.2**: Snapshot-first query pattern (documentation)
5. **Recommendation 8.1**: Soft delete filtering enforcement

**Effort**: ~1 week  
**Benefit**: 15–25% query performance improvement; 0% risk.

---

### Phase 2 (Medium Impact, Medium Risk) – Sprint 3-4

1. **Recommendation 1.2**: Relationship range indexes (TRACKS, REALIZES)
2. **Recommendation 4.2**: Explicit deletion tracking (DELETED event)
3. **Recommendation 5.2**: Batch TRACKS edge creation
4. **Recommendation 7.1**: Document derived edge strategy
5. **Recommendation 8.2**: Add deletedAt timestamp

**Effort**: ~2 weeks  
**Benefit**: 30% query improvement; enhanced audit trail.

---

### Phase 3 (Advanced, Maintenance) – Sprint 5+

1. **Recommendation 1.3**: Vector indexes (embedding similarity)
2. **Recommendation 1.4**: Index profiling & cleanup automation
3. **Recommendation 2.2**: Reverse edge (REALIZED_BY, TESTED_BY)
4. **Recommendation 5.3**: Parallel indexer runs
5. **Recommendations 9.1–9.5**: New edge types & features

**Effort**: ~3–4 weeks  
**Benefit**: Semantic search, advanced analysis, 50%+ scaling headroom.

---

## 11. Validation Checklist

Before deploying each recommendation:

- [ ] Schema migration tested on dev instance
- [ ] Query performance profiled (PROFILE with actual data)
- [ ] Index cardinality analyzed (`db.indexes()`)
- [ ] Backward compatibility verified (old queries still work)
- [ ] Storage impact measured (`CALL db.index.usage()`)
- [ ] Ingest tests updated (golden files regenerated)
- [ ] Documentation updated (specs, API contracts)
- [ ] Production deployment plan (online migration, rollback)

---

## 12. References

- **Neo4j Documentation**
  - [Index Strategy](https://neo4j.com/docs/cypher-manual/current/indexes/search-performance-indexes/)
  - [Composite Indexes](https://neo4j.com/docs/cypher-manual/current/indexes/search-performance-indexes/composite-index/)
  - [Constraints](https://neo4j.com/docs/cypher-manual/current/constraints/)
  - [Query Tuning](https://neo4j.com/docs/operations-manual/current/performance/cypher-tuning/)

- **Texere Specifications**
  - [graph_schema_spec.md](../graph_schema_spec.md) – §3, §4, §6
  - [ingest_spec.md](../ingest_spec.md) – §6, §8
  - [layout_spec.md](../layout_spec.md) – §4 API contracts
  - [NODE_EDGE_MAPPING.md](./NODE_EDGE_MAPPING.md) – §1-2

- **Best Practices**
  - Medium: "The Production-Ready Neo4j Guide" (2025)
  - Neo4j Blog: "How to Build a Knowledge Graph in 7 Steps"
  - Neo4j Support: "Data Modeling Best Practices"

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Author**: Research (Neo4j + Texere Schema Analysis)  
**Status**: Ready for Review & Implementation
