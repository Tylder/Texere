# Texere Indexer – Implementation Checklist & Action Items

**Purpose**: Actionable checklist for implementing indexer nodes, edges, and Neo4j improvements.

**Status**: Ready for Development Sprint Planning

---

## Pre-Implementation

### Repository Setup

- [ ] Verify `packages/features/indexer` structure matches `layout_spec.md` §2
  - [ ] `packages/features/indexer/types` exists (Nx lib)
  - [ ] `packages/features/indexer/core` exists (Nx lib)
  - [ ] `packages/features/indexer/ingest` exists (Nx lib)
  - [ ] `packages/features/indexer/query` exists (Nx lib)
- [ ] Verify Neo4j/Memgraph instance is accessible
  - [ ] Connection string in `.env`
  - [ ] Auth credentials configured
  - [ ] Test connection: `neo4j-cli test-connection`
- [ ] Verify Qdrant vector store is accessible
  - [ ] Connection to Qdrant instance
  - [ ] Collection names defined

### Specification Review

- [ ] Read `docs/specs/feature/indexer/graph_schema_spec.md` (§1–3)
- [ ] Read `docs/specs/feature/indexer/nodes/README.md`
- [ ] Read `docs/specs/feature/indexer/edges/README.md`
- [ ] Read `docs/specs/feature/indexer/layout_spec.md` (§2–4)
- [ ] Read `docs/specs/feature/indexer/ingest_spec.md` (§1–6)
- [ ] Read `docs/specs/feature/indexer/research/IMPROVEMENT_RECOMMENDATIONS.md`

---

## Phase 1: Core Schema & Constraints (Sprint 1–2)

**Effort**: ~1 week  
**Benefit**: 15–25% query performance improvement

### 1.1: Create Unique Constraints

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
/**
 * Initialize graph schema constraints (idempotent, runs on indexer startup).
 * Spec reference: graph_schema_spec.md §4.1
 */
export async function initializeUniqueConstraints(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    // Codebase
    await session.run(`
      CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS
      FOR (n:Codebase) REQUIRE n.id IS UNIQUE
    `);

    // Snapshot
    await session.run(`
      CREATE CONSTRAINT snapshot_id_unique IF NOT EXISTS
      FOR (n:Snapshot) REQUIRE n.id IS UNIQUE
    `);

    // Module
    await session.run(`
      CREATE CONSTRAINT module_id_unique IF NOT EXISTS
      FOR (n:Module) REQUIRE n.id IS UNIQUE
    `);

    // File
    await session.run(`
      CREATE CONSTRAINT file_id_unique IF NOT EXISTS
      FOR (n:File) REQUIRE n.id IS UNIQUE
    `);

    // Symbol
    await session.run(`
      CREATE CONSTRAINT symbol_id_unique IF NOT EXISTS
      FOR (n:Symbol) REQUIRE n.id IS UNIQUE
    `);

    // (repeat for other 10 node types: Boundary, Feature, Pattern, Incident, etc.)

    console.log('✓ Unique constraints created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Test on dev Neo4j instance
- [ ] Verify all 15 constraints created: `CALL db.constraints()`
- [ ] Add to indexer startup (`index-snapshot.ts` or `neo4j-client.ts`)

---

### 1.2: Create Edge Property Indexes

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
export async function initializeEdgeIndexes(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    // REFERENCES.kind (call graph)
    await session.run(`
      CREATE INDEX references_kind IF NOT EXISTS
      FOR ()-[r:REFERENCES]-() ON (r.kind)
    `);

    // REALIZES.role (feature implementation)
    await session.run(`
      CREATE INDEX realizes_role IF NOT EXISTS
      FOR ()-[r:REALIZES]-() ON (r.role)
    `);

    // (repeat for 6 more: DEPENDS_ON.kind, DOCUMENTS.target_role, LOCATION.role,
    //                     TRACKS.event, MUTATES.operation, IMPACTS.type)

    console.log('✓ Edge property indexes created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Test all 8 indexes: `CALL db.indexes() | filter(index.type = 'RANGE')`
- [ ] Verify no duplicates

---

### 1.3: Create Node Property Indexes

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
export async function initializeNodeIndexes(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    // File language filtering
    await session.run(`
      CREATE INDEX file_language IF NOT EXISTS
      FOR (n:File) ON (n.language)
    `);

    // Symbol name discovery
    await session.run(`
      CREATE INDEX symbol_name IF NOT EXISTS
      FOR (n:Symbol) ON (n.name)
    `);

    // Feature name discovery
    await session.run(`
      CREATE INDEX feature_name IF NOT EXISTS
      FOR (n:Feature) ON (n.name)
    `);

    // (repeat for 4 more: Boundary.verb+path, TestCase.name, Snapshot.indexStatus, Incident.severity)

    console.log('✓ Node property indexes created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Verify all 7 indexes: `CALL db.indexes()`

---

### 1.4: Add Existence Constraints (IN_SNAPSHOT Invariant)

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
export async function initializeInSnapshotConstraints(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    // Every Symbol must have IN_SNAPSHOT edge
    await session.run(`
      CREATE CONSTRAINT symbol_in_snapshot_required IF NOT EXISTS
      FOR (n:Symbol) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL
    `);

    // Every File must have IN_SNAPSHOT edge
    await session.run(`
      CREATE CONSTRAINT file_in_snapshot_required IF NOT EXISTS
      FOR (n:File) REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL
    `);

    // (repeat for: Module, Boundary, DataContract, TestCase, SpecDoc)

    console.log('✓ IN_SNAPSHOT existence constraints created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Verify existence constraints: `CALL db.constraints() | filter(name contains 'required')`
- [ ] Add constraint violation test case

---

### 1.5: Implement Batch Constraint Validation

**File**: `packages/features/indexer/ingest/src/persist-batch.ts`

```typescript
/**
 * Batch-validate symbol IDs before upsert.
 * Spec reference: IMPROVEMENT_RECOMMENDATIONS.md §5.1
 */
export async function validateSymbolIdUniqueness(
  session: neo4j.Session,
  symbolBatch: Symbol[],
  snapshotId: string,
): Promise<boolean> {
  const symbolIds = symbolBatch.map((s) => s.id);

  // Check for duplicates in DB
  const result = await session.run(
    `
    UNWIND $symbolIds AS symbolId
    MATCH (s:Symbol {id: symbolId})
    RETURN COUNT(DISTINCT s) as existingCount
  `,
    { symbolIds, snapshotId },
  );

  const existingCount = result.records[0]?.get('existingCount') || 0;

  if (existingCount > 0) {
    logger.error(`Duplicate symbols found in batch: ${existingCount} existing`);
    return false;
  }

  return true;
}

/**
 * Batch upsert symbols with validation.
 */
export async function upsertSymbolsBatch(
  session: neo4j.Session,
  symbolBatch: Symbol[],
  snapshotId: string,
): Promise<number> {
  // Validate first
  if (!(await validateSymbolIdUniqueness(session, symbolBatch, snapshotId))) {
    throw new Error('Symbol ID constraint violation');
  }

  // Batch upsert
  const result = await session.run(
    `
    UNWIND $symbolBatch AS sym
    MERGE (s:Symbol {id: sym.id})
    SET s += sym,
        s.updatedAt = timestamp()
    WITH s, sym
    MATCH (f:File {id: sym.fileId})
    MERGE (f)-[:CONTAINS]->(s)
    MERGE (snap:Snapshot {id: $snapshotId})
    MERGE (s)-[:IN_SNAPSHOT]->(snap)
    RETURN COUNT(DISTINCT s) as created
  `,
    { symbolBatch, snapshotId },
  );

  return result.records[0]?.get('created') || 0;
}
```

**Checklist**:

- [ ] Add test case: batch with duplicates should fail
- [ ] Verify transaction rollback on constraint violation

---

### 1.6: Implement Soft Delete Filtering

**File**: `packages/features/indexer/core/graph/graph-reads.ts`

```typescript
/**
 * Get symbols in snapshot, excluding deleted by default.
 * Spec reference: IMPROVEMENT_RECOMMENDATIONS.md §8.1
 */
export async function getSymbols(
  session: neo4j.Session,
  snapshotId: string,
  { includeDeleted = false } = {},
): Promise<Symbol[]> {
  const query = `
    MATCH (sym:Symbol {snapshotId: $snapshotId})
    ${includeDeleted ? '' : 'WHERE NOT sym.isDeleted'}
    RETURN sym
  `;

  const result = await session.run(query, { snapshotId });
  return result.records.map((r) => r.get('sym').properties as Symbol);
}

/**
 * Similar for other scoped node types: getFiles, getModules, getBoundaries, etc.
 */
```

**Checklist**:

- [ ] Implement for all scoped node types (9 node types)
- [ ] Add test: includeDeleted=true returns deleted nodes
- [ ] Add test: includeDeleted=false filters deleted nodes

---

### 1.7: Add isDeleted Index

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
export async function initializeSoftDeleteIndex(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    await session.run(`
      CREATE INDEX node_is_deleted IF NOT EXISTS
      FOR (n) ON (n.isDeleted)
    `);
    console.log('✓ Soft delete index created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Verify index: `CALL db.indexes() | filter(name = 'node_is_deleted')`

---

## Phase 2: Composite Indexes & Range Indexes (Sprint 1–2 cont'd)

**Effort**: ~3 days  
**Benefit**: Fast snapshot-scoped lookups, no sorting overhead

### 2.1: Add Composite Indexes

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
export async function initializeCompositeIndexes(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    // (snapshotId, filePath) for fast file lookup
    await session.run(`
      CREATE INDEX file_snapshot_path IF NOT EXISTS
      FOR (n:File) ON (n.snapshotId, n.path)
    `);

    // (snapshotId, modulePath) for fast module lookup
    await session.run(`
      CREATE INDEX module_snapshot_name IF NOT EXISTS
      FOR (n:Module) ON (n.snapshotId, n.name)
    `);

    // (codebaseId, branch) for tracking branches
    await session.run(`
      CREATE INDEX snapshot_codebase_branch IF NOT EXISTS
      FOR (n:Snapshot) ON (n.codebaseId, n.branch)
    `);

    // (role, confidence) for high-confidence filtering
    await session.run(`
      CREATE INDEX realizes_role_confidence IF NOT EXISTS
      FOR ()-[r:REALIZES]-() ON (r.role, r.confidence)
    `);

    console.log('✓ Composite indexes created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Verify all 4 composite indexes: `CALL db.indexes()`
- [ ] Profile query performance: `PROFILE MATCH (f:File {snapshotId: $id, path: $path})`
- [ ] Compare db hits before/after (should drop significantly)

---

### 2.2: Add Range Indexes

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
export async function initializeRangeIndexes(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    // Snapshot timestamp for time-range queries
    await session.run(`
      CREATE INDEX snapshot_timestamp IF NOT EXISTS
      FOR (n:Snapshot) ON (n.timestamp)
    `);

    // Confidence-based filtering for patterns
    await session.run(`
      CREATE INDEX references_confidence_range IF NOT EXISTS
      FOR ()-[r:REFERENCES {kind: 'PATTERN'}]-() ON (r.confidence)
    `);

    console.log('✓ Range indexes created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Profile range query: `PROFILE MATCH (snap:Snapshot) WHERE snap.timestamp > $date RETURN snap`
- [ ] Verify no Sort operation in plan

---

## Phase 3: Deletion Tracking & Temporal Features (Sprint 3)

**Effort**: ~4 days

### 3.1: Add deletedAt Timestamp Property

**File**: Schema modification (all scoped nodes)

```cypher
-- Add to Symbol, File, Feature, Incident
ALTER NODE Symbol ADD PROPERTY deletedAt TIMESTAMP;
ALTER NODE File ADD PROPERTY deletedAt TIMESTAMP;
ALTER NODE Feature ADD PROPERTY deletedAt TIMESTAMP;
ALTER NODE Incident ADD PROPERTY deletedAt TIMESTAMP;
```

**Implementation** (`packages/features/indexer/core/graph/graph-writes.ts`):

```typescript
export async function softDeleteSymbol(session: neo4j.Session, symbolId: string): Promise<void> {
  await session.run(
    `
    MATCH (sym:Symbol {id: $symbolId})
    SET sym.isDeleted = true,
        sym.deletedAt = datetime()
  `,
    { symbolId },
  );
}
```

**Checklist**:

- [ ] Add migration script for existing nodes
- [ ] Add deletedAt to all soft-delete node types (5 types)
- [ ] Add test: deletedAt is set when isDeleted = true

---

### 3.2: Track Deletion Events in TRACKS Edge

**File**: `packages/features/indexer/ingest/src/index-snapshot.ts`

```typescript
/**
 * Create DELETED event for symbols that were deleted in new snapshot.
 * Spec reference: IMPROVEMENT_RECOMMENDATIONS.md §4.2
 */
export async function trackDeletedSymbols(
  session: neo4j.Session,
  previousSnapshotId: string,
  newSnapshotId: string,
  deletedSymbolIds: string[],
): Promise<void> {
  await session.run(
    `
    UNWIND $deletedSymbolIds AS symbolId
    MATCH (sym:Symbol {id: symbolId})
    MERGE (sym)-[r:TRACKS {event: 'DELETED'}]->(snap:Snapshot {id: $newSnapshotId})
    SET r.createdAt = datetime()
  `,
    { deletedSymbolIds, newSnapshotId },
  );
}
```

**Checklist**:

- [ ] Call trackDeletedSymbols() during snapshot indexing
- [ ] Add test: query TRACKS edges with event='DELETED'
- [ ] Document in `ingest_spec.md` §6.2

---

### 3.3: Batch TRACKS Edge Creation

**File**: `packages/features/indexer/ingest/src/persist-batch.ts`

```typescript
/**
 * Batch create INTRODUCED_IN edges for new symbols.
 * Spec reference: IMPROVEMENT_RECOMMENDATIONS.md §5.2
 */
export async function createTracksEdgesBatch(
  session: neo4j.Session,
  symbolIds: string[],
  snapshotId: string,
  event: 'INTRODUCED' | 'MODIFIED' = 'INTRODUCED',
): Promise<number> {
  const result = await session.run(
    `
    UNWIND $symbolIds AS symbolId
    MATCH (sym:Symbol {id: symbolId})
    MERGE (sym)-[r:TRACKS {event: $event}]->(snap:Snapshot {id: $snapshotId})
    SET r.createdAt = datetime()
    RETURN COUNT(r) as created
  `,
    { symbolIds, snapshotId, event },
  );

  return result.records[0]?.get('created') || 0;
}
```

**Checklist**:

- [ ] Integrate into ingest pipeline (replace per-symbol TRACKS creation)
- [ ] Benchmark batch vs. per-node (should be 10–20x faster)
- [ ] Add test: createTracksEdgesBatch with 1000+ symbols

---

## Phase 3: Advanced Features (Sprint 5+)

**Effort**: ~3–4 weeks

### 4.1: Vector Indexes (Neo4j 5.13+)

**File**: `packages/features/indexer/core/graph/schema-initialization.ts`

```typescript
export async function initializeVectorIndexes(driver: neo4j.Driver) {
  const session = driver.session();

  try {
    // Symbol embedding similarity
    await session.run(`
      CREATE VECTOR INDEX symbol_embeddings IF NOT EXISTS
      FOR (n:Symbol)
      ON (n.embeddingId)
      OPTIONS { indexConfig: { 'vector.dimensions': 384, 'vector.similarity_function': 'cosine' }}
    `);

    // SpecDoc embedding similarity
    await session.run(`
      CREATE VECTOR INDEX spec_embeddings IF NOT EXISTS
      FOR (n:SpecDoc)
      ON (n.embeddingId)
      OPTIONS { indexConfig: { 'vector.dimensions': 384, 'vector.similarity_function': 'cosine' }}
    `);

    console.log('✓ Vector indexes created');
  } finally {
    await session.close();
  }
}
```

**Checklist**:

- [ ] Verify Neo4j version >= 5.13
- [ ] Test vector search: `CALL db.index.vector.queryNodes('symbol_embeddings', 5, $embedding)`

---

### 4.2: Reverse Edges (REALIZED_BY, TESTED_BY)

**File**: `packages/features/indexer/ingest/src/link-edges.ts`

```typescript
/**
 * Create reverse REALIZES edge: Feature -[:REALIZED_BY]-> Symbol
 * Spec reference: IMPROVEMENT_RECOMMENDATIONS.md §2.2
 */
export async function linkRealizesBidir(
  session: neo4j.Session,
  implementerSymbolId: string,
  featureId: string,
  confidence: number,
): Promise<void> {
  await session.run(
    `
    MATCH (sym:Symbol {id: $implementerSymbolId})
    MATCH (f:Feature {id: $featureId})
    MERGE (sym)-[r:REALIZES {role: 'IMPLEMENTS', confidence: $confidence}]->(f)
    MERGE (f)-[r2:REALIZED_BY {role: 'IMPLEMENTED_BY', confidence: $confidence}]->(sym)
  `,
    { implementerSymbolId, featureId, confidence },
  );
}

/**
 * Create reverse TESTS edge: Symbol -[:TESTED_BY]-> TestCase
 */
export async function linkTestsBidir(
  session: neo4j.Session,
  testCaseId: string,
  symbolId: string,
): Promise<void> {
  await session.run(
    `
    MATCH (t:TestCase {id: $testCaseId})
    MATCH (sym:Symbol {id: $symbolId})
    MERGE (t)-[r1:REALIZES {role: 'TESTS', coverage: 'DIRECT'}]->(sym)
    MERGE (sym)-[r2:TESTED_BY]->(t)
  `,
    { testCaseId, symbolId },
  );
}
```

**Checklist**:

- [ ] Update ingest pipeline to create reverse edges
- [ ] Add test: query both directions
- [ ] Performance comparison: reverse edge vs. relationship type scan

---

### 4.3: Parallel Indexer Runs

**File**: `packages/features/indexer/ingest/src/index-snapshot.ts`

```typescript
/**
 * Run language indexers in parallel, then batch persist.
 * Spec reference: IMPROVEMENT_RECOMMENDATIONS.md §5.3
 */
export async function indexSnapshotParallel(
  snapshotId: string,
  codebaseRoot: string,
): Promise<IndexResult> {
  const languageIndexers = [new TypeScriptIndexer(), new PythonIndexer(), new JavaIndexer()];

  // 1. Get changed files
  const changedFiles = await getChangedFilesForSnapshot(codebaseRoot, snapshotId);

  // 2. Run indexers in parallel
  const indexerResults = await Promise.all(
    languageIndexers.map((indexer) =>
      indexer.indexFiles({
        codebaseRoot,
        snapshotId,
        filePaths: changedFiles.filter((f) => indexer.canHandleFile(f)),
      }),
    ),
  );

  // 3. Merge results
  const allResults = indexerResults.flat();

  // 4. Batch persist to graph
  await persistBatch(allResults, snapshotId);

  return { snapshotId, totalSymbols: allResults.length };
}
```

**Checklist**:

- [ ] Benchmark: parallel vs. sequential (expect 2–4x speedup)
- [ ] Test with large multi-language repo (10K+ files)

---

## Testing Checklist

### Unit Tests

- [ ] `test/graph/schema-initialization.test.ts`
  - [ ] All constraints created idempotently
  - [ ] All indexes created with correct properties
  - [ ] No duplicate constraint/index names
- [ ] `test/graph/graph-writes.test.ts`
  - [ ] upsertCodebase creates node correctly
  - [ ] upsertSnapshot creates with correct composite ID
  - [ ] Batch upsert symbols validates constraints
  - [ ] Soft delete sets isDeleted + deletedAt
- [ ] `test/graph/graph-reads.test.ts`
  - [ ] getSymbols excludes deleted by default
  - [ ] getSymbols includes deleted when includeDeleted=true
  - [ ] getSymbols by snapshot uses composite index
- [ ] `test/ingest/link-edges.test.ts`
  - [ ] linkCalls creates REFERENCES edge with kind='CALL'
  - [ ] linkRealizes creates REALIZES edge with role='IMPLEMENTS'
  - [ ] linkTests creates REALIZES edge with role='TESTS'
  - [ ] Reverse edges created correctly

### Integration Tests

- [ ] `test/integration/end-to-end-indexing.test.ts`
  - [ ] Full snapshot index creates all node types
  - [ ] All IN_SNAPSHOT constraints satisfied
  - [ ] All CONTAINS edges form valid tree
  - [ ] Call graph edges present
- [ ] `test/integration/soft-delete.test.ts`
  - [ ] Deleted symbols marked isDeleted=true
  - [ ] deletedAt timestamp set correctly
  - [ ] TRACKS edge with event='DELETED' created
  - [ ] Hard delete after 90 days
- [ ] `test/integration/query-patterns.test.ts`
  - [ ] getFeatureContext returns complete bundle
  - [ ] getEndpointPatternExamples returns examples
  - [ ] getIncidentSlice returns root causes + effects

### Performance Tests

- [ ] `test/performance/index-cardinality.test.ts`
  - [ ] Composite index cardinality < 0.1
  - [ ] Unique constraint cardinality = 0
  - [ ] Node property index cardinality < 0.5
- [ ] `test/performance/query-profiling.test.ts`
  - [ ] File lookup: O(log N) with composite index
  - [ ] Symbol lookup: O(log N) with snapshot filter
  - [ ] Soft delete filter uses index
  - [ ] Range index eliminates Sort operation

---

## Documentation Checklist

### Update Spec Files

- [ ] `docs/specs/feature/indexer/graph_schema_spec.md`
  - [ ] Add new composite indexes to §4.2
  - [ ] Add range indexes to §4.2
  - [ ] Add vector indexes to §4.2
  - [ ] Update CHANGELOG
- [ ] `docs/specs/feature/indexer/layout_spec.md`
  - [ ] Update API contracts (soft delete filtering)
  - [ ] Add example queries with snapshots
- [ ] `docs/specs/feature/indexer/ingest_spec.md`
  - [ ] Document batch TRACKS edge creation
  - [ ] Document parallel indexer runs
  - [ ] Document soft delete semantics

- [ ] `docs/specs/feature/indexer/research/IMPROVEMENT_RECOMMENDATIONS.md`
  - [ ] Mark completed recommendations ✓
  - [ ] Update priority table with actual times

### Create Implementation Guides

- [ ] `packages/features/indexer/SCHEMA_INITIALIZATION.md`
  - How to initialize schema (constraints, indexes)
  - Idempotency guarantees
  - Troubleshooting guide
- [ ] `packages/features/indexer/INGEST_PIPELINE.md`
  - Step-by-step ingest flow
  - Batch operation sizes
  - Error handling
- [ ] `packages/features/indexer/QUERY_PATTERNS.md`
  - Example queries for common tasks
  - Performance notes
  - Index usage tips

---

## Deployment Checklist

### Pre-Deployment

- [ ] All phase 1 tests passing (unit + integration)
- [ ] Performance benchmarks recorded
- [ ] Schema migration tested on staging
- [ ] Rollback plan documented
- [ ] Team trained on soft delete semantics

### Deployment Steps

1. [ ] Backup production Neo4j database
2. [ ] Create unique constraints (online, no downtime)
3. [ ] Create edge property indexes (online, no downtime)
4. [ ] Create node property indexes (online, no downtime)
5. [ ] Create composite indexes (online, no downtime)
6. [ ] Test production queries with PROFILE
7. [ ] Update application code (isDeleted filtering)
8. [ ] Deploy indexer service
9. [ ] Monitor query performance (db hits should drop)
10. [ ] Document lessons learned

### Post-Deployment

- [ ] Verify all constraints: `CALL db.constraints()`
- [ ] Verify all indexes: `CALL db.indexes()`
- [ ] Monitor db hit counts (should be 20–30% lower)
- [ ] Check error logs for constraint violations
- [ ] Schedule follow-up review (1 week)

---

## Rollback Plan

If issues arise:

1. **Delete new indexes**: `DROP INDEX index_name`
2. **Drop new constraints**: `DROP CONSTRAINT constraint_name`
3. **Revert code changes**: `git revert <commit>`
4. **Restart indexer service**
5. **Notify team**

---

## Success Criteria

✓ **Phase 1** (Done when):

- All 15 unique constraints created
- All 8 edge property indexes created
- All 7 node property indexes created
- IN_SNAPSHOT existence constraints created
- Soft delete filtering enforced in all APIs
- Query performance improved 15–25%

✓ **Phase 2** (Done when):

- 4 composite indexes created
- 2 range indexes created
- deletedAt timestamps tracked
- DELETED events tracked in TRACKS
- Batch TRACKS edge creation integrated

✓ **Phase 3** (Done when):

- Vector indexes created (if Neo4j 5.13+)
- Reverse edges (REALIZED_BY, TESTED_BY) created
- Parallel indexer runs integrated
- Performance: 2–4x faster indexing

---

**Checklist Version**: 1.0  
**Last Updated**: December 2025  
**Ready for Sprint Planning**: Yes
