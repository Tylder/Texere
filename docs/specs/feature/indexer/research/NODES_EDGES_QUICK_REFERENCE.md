# Texere Indexer – Nodes & Edges Quick Reference

**Quick visual guide for all 14 nodes and 10 edges in the knowledge graph.**

---

## Node Type Matrix

### Snapshot-Scoped Nodes (9)

```
HIERARCHY TREE
═══════════════════════════════════════════════════════════════════════════════

                    ┌──────────────┐
                    │   Codebase   │ (Repository root)
                    └────────┬─────┘
                             │ [:CONTAINS]
                    ┌────────▼─────────┐
                    │    Snapshot      │ (Git commit)
                    └────────┬─────────┘
                             │ [:CONTAINS]
              ┌──────────────┼──────────────┐
              │ [:CONTAINS]  │ [:CONTAINS]  │
    ┌─────────▼────────┐  ┌──▼──────────┐  │
    │      Module      │  │  EntryPoint │  │
    │  (Nx app/lib)    │  │   (HTTP,CLI)│  │
    └─────────┬────────┘  └─────────────┘  │
              │ [:CONTAINS]                │
         ┌────▼─────┐                      │
         │    File  │                      │
         └────┬─────┘                      │
              │ [:CONTAINS]                │
         ┌────▼──────┐                     │
         │   Symbol  │                     │
         │ (func/cls)│                     │
         └───────────┘                     │
                                     ┌─────▼─────────┐
                                     │  DataContract │
                                     │  (Prisma,ORM) │
                                     └───────────────┘
                                     │  TestCase
                                     │  (unit/int/e2e)
                                     │  SpecDoc
                                     │  (spec, ADR)

ALL SCOPED NODES: [:IN_SNAPSHOT] → Snapshot (cardinality = 1, CRITICAL)
```

| Node             | Props                                          | Count                 | Cardinality                        |
| ---------------- | ---------------------------------------------- | --------------------- | ---------------------------------- |
| **Codebase**     | id, name, url, createdAt                       | 1+ per workspace      | —                                  |
| **Snapshot**     | id, commitHash, branch, indexStatus, timestamp | 1+ per codebase       | 1 per commit                       |
| **Module**       | id, path, type, language                       | 10–100+ per snapshot  | Tree (parent = Snapshot \| Module) |
| **File**         | id, path, language, isTest, isDeleted          | 100–10K+ per snapshot | Tree (parent = Module)             |
| **Symbol**       | id, name, kind, docstring, embeddingId         | 1K–100K+ per snapshot | Tree (parent = File)               |
| **EntryPoint**   | id, verb, path, handlerSymbolId                | 10–100+ per snapshot  | Independent                        |
| **DataContract** | id, name, kind, description                    | 10–50+ per snapshot   | Independent                        |
| **TestCase**     | id, filePath, name, kind                       | 100–1K+ per snapshot  | Tree (parent = File)               |
| **SpecDoc**      | id, path, name, kind, content, embeddingId     | 1–20+ per snapshot    | Independent                        |

---

### Cross-Snapshot Nodes (5)

Persistent across snapshots; soft-deleted when obsolete.

| Node                | Props                                         | Lifecycle              | Cardinality        |
| ------------------- | --------------------------------------------- | ---------------------- | ------------------ |
| **Feature**         | id, name, description, embeddingId, isDeleted | Soft-delete            | 1 per feature ID   |
| **Pattern**         | id, name, description, source                 | Manual/heuristic       | 1 per pattern name |
| **Incident**        | id, title, severity, status, resolvedAt       | Soft-delete on resolve | 1 per incident ID  |
| **ExternalService** | id, name, url, description                    | Persistent             | 1 per service name |
| **StyleGuide**      | id, name, description, appliesTo              | Persistent             | 1 per guide path   |

---

## Edge Type Matrix

### 10 Consolidated Edges

```
EDGE TYPE BREAKDOWN
═══════════════════════════════════════════════════════════════════════════════

Relationship Type           | Sub-Type Property | Values | Purpose
────────────────────────────┼──────────────────┼────────┼───────────────────────
[:CONTAINS]                 | —                 | —      | Hierarchy (bottom-up)
[:IN_SNAPSHOT]              | —                 | —      | Version membership (1:1)
[:REFERENCES]               | kind              | CALL, TYPE_REF, IMPORT, | Code relations
                            |                   | PATTERN, SIMILAR      |
[:REALIZES]                 | role              | IMPLEMENTS, TESTS,    | Implementation &
                            | coverage          | VERIFIES; DIRECT,     | testing
                            | confidence        | INDIRECT              |
[:MUTATES]                  | operation         | READ, WRITE           | Data flow
[:DEPENDS_ON]               | kind              | CONFIG, LIBRARY,      | Dependencies
                            |                   | SERVICE, PATTERN      |
[:DOCUMENTS]                | target_role       | SYMBOL, FEATURE,      | Documentation
                            |                   | MODULE, ENDPOINT      |
[:LOCATION]                 | role              | IN_FILE, IN_MODULE,   | Ownership &
                            |                   | HANDLED_BY            | position
[:TRACKS]                   | event             | INTRODUCED, MODIFIED, | Evolution &
                            |                   | DELETED (future)      | version history
[:IMPACTS]                  | type              | CAUSED_BY, AFFECTS    | Incident root
                            |                   |                       | cause & effects
```

---

## Example Query Patterns

### Pattern 1: Get Feature Implementation Context

```cypher
MATCH (f:Feature {id: 'payment'})

-- Who implements this feature?
OPTIONAL MATCH (x)-[r1:REALIZES {role: 'IMPLEMENTS'}]->(f)

-- Call graph (depth 2)
OPTIONAL MATCH (x)-[r2:REFERENCES {kind: 'CALL'}*0..2]->(deeper:Symbol)

-- Data access
OPTIONAL MATCH (deeper)-[r3:MUTATES {operation: 'WRITE'}]->(entity:DataContract)

-- Tests
OPTIONAL MATCH (t:TestCase)-[r4:REALIZES {role: 'TESTS'}]->(x)

-- Documentation
OPTIONAL MATCH (doc:SpecDoc)-[r5:DOCUMENTS {target_role: 'FEATURE'}]->(f)

RETURN {
  feature: f,
  implementers: collect(DISTINCT x),
  callGraph: collect(DISTINCT deeper),
  dataAccess: collect(DISTINCT entity),
  tests: collect(DISTINCT t),
  docs: collect(DISTINCT doc)
} AS context
```

### Pattern 2: Find Tests for Endpoint

```cypher
MATCH (ep:Endpoint {path: '/api/payments', verb: 'POST'})
MATCH (ep)-[:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
OPTIONAL MATCH (t:TestCase)-[:REALIZES {role: 'TESTS'}]->(handler)
RETURN t
```

### Pattern 3: Trace Incident Impact

```cypher
MATCH (i:Incident {id: 'bug-123'})

-- Root cause
OPTIONAL MATCH (i)-[r1:IMPACTS {type: 'CAUSED_BY'}]->(causeSymbol:Symbol)

-- Affected features
OPTIONAL MATCH (i)-[r2:IMPACTS {type: 'AFFECTS'}]->(feature:Feature)

-- Evolution tracking
OPTIONAL MATCH (causeSymbol)-[r3:TRACKS {event: 'MODIFIED'}]->(snap:Snapshot)

RETURN {
  incident: i,
  rootCause: causeSymbol,
  affected: feature,
  history: snap
}
```

### Pattern 4: Symbol Similarity Search

```cypher
-- Find symbols similar to a target
MATCH (target:Symbol {id: $symbolId})

-- Via embedding (once vector index is added)
CALL db.index.vector.queryNodes('symbol_embeddings', 5, $embedding)
YIELD node AS similar, score
WHERE similar.snapshotId = $snapshotId
RETURN similar, score
ORDER BY score DESC
LIMIT 5
```

### Pattern 5: Module Dependency Analysis

```cypher
MATCH (m:Module {id: $moduleId})

-- What modules does this depend on?
OPTIONAL MATCH (m)-[r:DEPENDS_ON]->(dep:Module)

-- What patterns does it follow?
OPTIONAL MATCH (m)-[r:REFERENCES {kind: 'PATTERN'}]->(p:Pattern)

-- What style guides apply?
OPTIONAL MATCH (guide:StyleGuide)-[r:DOCUMENTS {target_role: 'MODULE'}]->(m)

RETURN {
  module: m,
  dependencies: collect(DISTINCT dep),
  patterns: collect(DISTINCT p),
  styleGuides: collect(DISTINCT guide)
}
```

---

## Cardinality Reference

### Invariants (CRITICAL)

- **IN_SNAPSHOT**: Every snapshot-scoped node → exactly 1 Snapshot
- **CONTAINS (File)**: Every File → exactly 1 Module
- **CONTAINS (Module)**: Every Module → exactly 1 Module OR Snapshot (root)
- **CONTAINS (Snapshot)**: Every Snapshot → exactly 1 Codebase

### Many-to-Many

- Symbol ↔ Feature (via REALIZES)
- Symbol ↔ Pattern (via REFERENCES)
- Symbol ↔ TestCase (via REALIZES)
- Feature ↔ Endpoint (via REALIZES)
- Feature ↔ Incident (via IMPACTS)

### Edge Density

| Source                           | Target              | Typical Edges/Node |
| -------------------------------- | ------------------- | ------------------ |
| Symbol → Symbol (CALL)           | 5–20 outgoing calls |
| Symbol → Feature (REALIZES)      | 0–3 per symbol      |
| Endpoint → Feature (REALIZES)    | 1–5 per endpoint    |
| Feature → Symbols (implementers) | 1–50 per feature    |
| TestCase → Symbol (TESTS)        | 1 per test          |

---

## Index Strategy (Current & Recommended)

### Priority 1: Unique Constraints (Auto-Indexed)

```
✓ Codebase.id
✓ Snapshot.id
✓ Module.id
✓ File.id
✓ Symbol.id
✓ EntryPoint.id (verb + path composite)
✓ Feature.id
✓ Pattern.id
✓ Incident.id
(15 total)
```

### Priority 2: Edge Property Indexes

```
✓ REFERENCES.kind
✓ REALIZES.role
✓ DEPENDS_ON.kind
✓ DOCUMENTS.target_role
✓ LOCATION.role
✓ TRACKS.event
✓ MUTATES.operation
✓ IMPACTS.type
(8 total)
```

### Priority 3: Node Property Indexes

```
✓ File.language
✓ Symbol.name
✓ Feature.name
✓ TestCase.name
✓ Snapshot.indexStatus
✓ Incident.severity
(6 total)
```

### Priority 4: Recommended (Missing)

```
⚠ Composite: (snapshotId, filePath)      [Phase 1]
⚠ Composite: (snapshotId, modulePath)    [Phase 1]
⚠ Composite: (codebaseId, branch)        [Phase 1]
⚠ Range: Snapshot.timestamp              [Phase 2]
⚠ Range: REALIZES.confidence             [Phase 2]
⚠ Vector: Symbol.embeddingId             [Phase 3]
⚠ Vector: SpecDoc.embeddingId            [Phase 3]
```

---

## Soft Delete Semantics

| Node Type | Soft Delete Support      | Deleted Filter               |
| --------- | ------------------------ | ---------------------------- |
| Symbol    | Yes (`isDeleted` prop)   | WHERE NOT sym.isDeleted      |
| File      | Yes                      | WHERE NOT f.isDeleted        |
| Feature   | Yes (cross-snapshot)     | WHERE NOT f.isDeleted        |
| Incident  | Yes (resolved = deleted) | WHERE i.status <> 'resolved' |
| Pattern   | No (manual only)         | —                            |
| Module    | No (archive instead)     | —                            |

**Default behavior**: All queries should filter `isDeleted: false` unless explicitly including
deleted nodes.

---

## Node ID Composition

### Snapshot-Scoped IDs

```
Codebase.id = "texere-main"
                ↓
Snapshot.id = "texere-main:abc123def"  (codebaseId:commitHash)
                ↓
Module.id = "texere-main:abc123def:apps/agent"  (snapshotId:modulePath)
                ↓
File.id = "texere-main:abc123def:src/index.ts"  (snapshotId:filePath)
                ↓
Symbol.id = "texere-main:abc123def:src/index.ts:buildGraph:10:0"
            (snapshotId:filePath:symbolName:line:col)
```

### Cross-Snapshot IDs

```
Feature.id = "payment"  (from features.yaml)
Pattern.id = "express-middleware"  (from patterns.yaml)
Incident.id = "bug-123"  (from incidents.yaml)
ExternalService.id = "stripe"  (manual)
StyleGuide.id = "nest-backend-guide.md"  (path)
```

---

## Query Optimization Tips

### DO ✓

- Filter by **Snapshot ID first** (most selective)
- Use **explicit depth limits** on transitive queries (`[:REFERENCES*0..2]`)
- **Always filter** `isDeleted: false` by default
- Use **composite indexes** for snapshot-scoped lookups
- **Batch operations** in UNWIND loops for large inserts

### DON'T ✗

- Unbounded transitive closures (`[:REFERENCES*]`)
- Full Symbol scans without snapshot filter
- Bidirectional relationship type scans (use reverse edges instead)
- Memory-heavy sorts (use range indexes instead)
- Per-node constraint validation (batch validate instead)

---

## Schema Evolution Checklist

When adding a new node or edge type:

- [ ] Add to node/edge specification files
- [ ] Create unique constraint (if applicable)
- [ ] Add property indexes (if frequently filtered)
- [ ] Document cardinality invariants
- [ ] Update ingest pipeline (`index-snapshot.ts`)
- [ ] Add test cases for edge inference
- [ ] Add Cypher query patterns to `graph_schema_spec.md`
- [ ] Update `layout_spec.md` API contracts
- [ ] Document in specs with references

---

**Quick Reference Version**: 1.0  
**Last Updated**: December 2025  
**Companion to**: INDEXER_NODES_EDGES_RESEARCH.md
