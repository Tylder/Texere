# [:IN_SNAPSHOT] – Version Membership

**Category**: Structural  
**Semantic**: "When did this exist?"

---

## Purpose

Marks snapshot-scoped nodes as belonging to a specific snapshot (Git commit). Every snapshot-scoped
node has **exactly 1** incoming `[:IN_SNAPSHOT]` edge.

**Key Characteristic**: Cardinality invariant enforced; enables version-based queries and temporal
analysis.

---

## Properties

| Property    | Type      | Required | Notes                                     |
| ----------- | --------- | -------- | ----------------------------------------- |
| `createdAt` | timestamp | Yes      | When relationship created (at index time) |

No additional properties.

---

## Source → Target Pairs

| Source            | Target   | Cardinality | Notes                          |
| ----------------- | -------- | ----------- | ------------------------------ |
| Module            | Snapshot | exactly 1   | Module versioned to snapshot   |
| File              | Snapshot | exactly 1   | File versioned to snapshot     |
| Symbol            | Snapshot | exactly 1   | Symbol versioned to snapshot   |
| Endpoint          | Snapshot | exactly 1   | Endpoint versioned to snapshot |
| SchemaEntity      | Snapshot | exactly 1   | Entity versioned to snapshot   |
| TestCase          | Snapshot | exactly 1   | Test versioned to snapshot     |
| SpecDoc           | Snapshot | exactly 1   | Doc versioned to snapshot      |
| ThirdPartyLibrary | Snapshot | exactly 1   | Library versioned to snapshot  |

**Cardinality Invariant**: No snapshot-scoped node can exist without exactly 1 incoming
`[:IN_SNAPSHOT]` edge.

---

## Schema

```cypher
-- Enforce cardinality invariant
CREATE CONSTRAINT in_snapshot_cardinality IF NOT EXISTS
FOR (n)
WHERE (n:Module OR n:File OR n:Symbol OR n:Endpoint OR n:SchemaEntity OR n:TestCase OR n:SpecDoc OR n:ThirdPartyLibrary)
REQUIRE COUNT((n)-[:IN_SNAPSHOT]->()) = 1;

-- Index for version lookups (O(1) on id)
CREATE INDEX in_snapshot_target IF NOT EXISTS
FOR ()-[r:IN_SNAPSHOT]->(n:Snapshot) ON (n.id);

-- Example
MATCH (sym:Symbol {id: 'snap-123:src/auth/jwt.ts:validateToken:10:0'})
  -[:IN_SNAPSHOT]->(snap:Snapshot {id: 'snap-123'})
RETURN sym, snap
```

---

## Query Patterns

### Get All Nodes in Snapshot

```cypher
-- All symbols in snapshot
MATCH (snap:Snapshot {id: $snapshotId})
  <-[:IN_SNAPSHOT]-(sym:Symbol)
RETURN sym

-- All endpoints and their handlers
MATCH (snap:Snapshot {id: $snapshotId})
  <-[:IN_SNAPSHOT]-(ep:Endpoint)
OPTIONAL MATCH (ep)-[:LOCATION {role: 'HANDLED_BY'}]->(sym:Symbol)
RETURN ep, sym

-- All test cases in snapshot
MATCH (snap:Snapshot {id: $snapshotId})
  <-[:IN_SNAPSHOT]-(test:TestCase)
RETURN test
```

### Version-Based Lookup

```cypher
-- Get symbol at specific commit
MATCH (snap:Snapshot {commitHash: 'abc123'})
  <-[:IN_SNAPSHOT]-(sym:Symbol {name: 'validateAuth'})
RETURN sym

-- Find all versions of a symbol
MATCH (sym:Symbol {filePath: 'src/auth.ts', name: 'validateAuth'})
  -[:IN_SNAPSHOT]->(snap:Snapshot)
RETURN sym, snap
ORDER BY snap.timestamp DESC
```

### Compare Snapshots

```cypher
-- Symbols added between snapshots
MATCH (snap1:Snapshot {id: 'old'})<-[:IN_SNAPSHOT]-(sym1:Symbol)
MATCH (snap2:Snapshot {id: 'new'})<-[:IN_SNAPSHOT]-(sym2:Symbol)
WHERE sym1.filePath = sym2.filePath AND sym1.name = sym2.name
  AND NOT EXISTS((sym1)-[:TRACKS]->(snap2))
RETURN sym2 as new_symbol, sym1 as old_symbol
```

### Filter by Version

```cypher
-- Latest snapshot only
MATCH (snap:Snapshot {indexStatus: 'success'})
ORDER BY snap.timestamp DESC
LIMIT 1
MATCH (snap)<-[:IN_SNAPSHOT]-(sym:Symbol)
RETURN sym

-- All nodes in successful snapshots
MATCH (snap:Snapshot {indexStatus: 'success'})
  <-[:IN_SNAPSHOT]-(node)
RETURN DISTINCT labels(node) as node_type, COUNT(node) as count
```

---

## Constraints & Indexes

- **Cardinality Invariant**: Exactly 1 incoming `[:IN_SNAPSHOT]` per snapshot-scoped node
- **Uniqueness**: Constraint prevents orphaned nodes
- **Index Priority**: High; frequent in version-based queries
- **Direction**: Snapshot-scoped nodes **→** Snapshot (enables efficient snapshot grouping via
  reverse traversal)

---

## Deletion Semantics

When a snapshot is deleted:

1. All `[:IN_SNAPSHOT]` edges pointing to that snapshot are removed
2. All snapshot-scoped nodes become orphaned (should be soft-deleted)
3. Cross-snapshot nodes (Feature, Pattern, Incident) persist

**Implementation**: Cascade delete in snapshot cleanup routines.

---

## Common Use Cases

1. **Version inventory**: "What symbols exist in commit X?"
2. **Temporal analysis**: "When was feature Y introduced?"
3. **Change detection**: "What changed between snapshots?"
4. **Release tracking**: "Which entities changed in release 1.0?"
5. **Blame/audit**: "Who committed this symbol?"

---

## Performance Notes

- **Optimal**: O(1) lookup via snapshot ID
- **Bulk Queries**: `<-[:IN_SNAPSHOT]` reverse traversal fast with index on target
- **Cardinality**: Low (1 edge per node)
- **Memory**: Minimal; no properties

---

## Relationship Direction

**Snapshot-scoped ← Snapshot** (child → parent):

```cypher
(symbol:Symbol)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
```

This allows:

- Efficient forward traversal: "Get snapshot for symbol" (O(1))
- Efficient reverse traversal: "Get all symbols in snapshot" (indexed)

---

## Implementation Notes

- **Cardinality Enforcement**: Some graph databases (e.g., Neo4j 5.0+) support property existence
  constraints; others require application-level validation
- **Soft Delete Alternative**: Instead of deleting snapshots, mark `isDeleted: true` and filter in
  queries
- **Temporal Indexes**: Consider time-based indexes if frequently querying by date range

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [../nodes/README.md](../nodes/README.md) – Snapshot-scoped vs. cross-snapshot nodes
- [Snapshot.md](../nodes/Snapshot.md) – Snapshot node definition
- [TRACKS.md](./TRACKS.md) – Evolution tracking (different semantics)
