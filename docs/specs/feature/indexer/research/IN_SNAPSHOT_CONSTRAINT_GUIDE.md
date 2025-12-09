# IN_SNAPSHOT Cardinality Constraint – Implementation Guide

**Quick Reference**: Database-enforced guarantee that every snapshot-scoped node has exactly 1
incoming `[:IN_SNAPSHOT]` edge.

**Status**: Added to specs  
**Last Updated**: December 2025

---

## The Constraint

```cypher
CREATE CONSTRAINT in_snapshot_cardinality IF NOT EXISTS
FOR (n:Module | n:File | n:Symbol | n:Endpoint | n:SchemaEntity | n:TestCase | n:SpecDoc)
REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;
```

**Scope**: 7 snapshot-scoped node types:

1. Module
2. File
3. Symbol
4. Endpoint
5. SchemaEntity
6. TestCase
7. SpecDoc

**Enforcement**: Database-level (caught at write time, not query time)

---

## Why It Matters

### Problem Without Constraint

```cypher
-- Can accidentally create orphaned symbol
CREATE (sym:Symbol {id: 'snap-123:src/auth.ts:validateAuth:10:0'})
-- Missing: -[:IN_SNAPSHOT]->(snap:Snapshot)

-- Now this query returns nothing (data lost!)
MATCH (snap:Snapshot {id: 'snap-123'})<-[:IN_SNAPSHOT]-(sym:Symbol)
RETURN sym
-- Returns: empty (symbol is unreachable)
```

**Impact**:

- Silent data loss (orphaned nodes invisible to version queries)
- Ingest bugs go undetected
- Temporal analysis becomes unreliable

### With Constraint

```cypher
-- Fails immediately at write time
CREATE (sym:Symbol {id: 'snap-123:src/auth.ts:validateAuth:10:0'})
-- ERROR: Constraint violation! No [:IN_SNAPSHOT] edge

-- Must create atomically with edge
MATCH (snap:Snapshot {id: 'snap-123'})
MERGE (sym:Symbol {id: 'snap-123:src/auth.ts:validateAuth:10:0'})
MERGE (sym)-[:IN_SNAPSHOT]->(snap)
RETURN sym
-- SUCCESS: Constraint satisfied
```

**Benefits**:

- Bugs caught early (write time)
- Guaranteed data integrity
- Reliable temporal queries

---

## Implementation Pattern

### In `indexer/core/src/graph/graph-writes.ts`

```typescript
export async function upsertSymbol(symbol: Symbol, snapshotId: string): Promise<Symbol> {
  // Always wrap creation + edge in same transaction
  return await db.transaction(async (tx) => {
    // 1. Verify snapshot exists (foreign key)
    const snapshot = await tx.run('MATCH (snap:Snapshot {id: $snapshotId}) RETURN snap', {
      snapshotId,
    });
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    // 2. Create/upsert symbol + edge atomically
    // If constraint is violated, transaction rolls back
    const result = await tx.run(
      `
      MATCH (snap:Snapshot {id: $snapshotId})
      MERGE (sym:Symbol {id: $symbolId})
      SET sym += $props
      MERGE (sym)-[:IN_SNAPSHOT]->(snap)
      RETURN sym
    `,
      {
        snapshotId,
        symbolId: symbol.id,
        props: {
          name: symbol.name,
          filePath: symbol.filePath,
          kind: symbol.kind,
          startLine: symbol.startLine,
          startCol: symbol.startCol,
          endLine: symbol.endLine,
          endCol: symbol.endCol,
          createdAt: Date.now(),
        },
      },
    );

    return result;
  });
}

// Apply same pattern to:
// - upsertModule(...)
// - upsertFile(...)
// - upsertEndpoint(...)
// - upsertTestCase(...)
// - upsertSchemaEntity(...)
// - upsertSpecDoc(...)
```

### In `indexer/ingest/src/index-snapshot.ts`

```typescript
async function persistSnapshot(snapshotId: string, symbolResults: FileIndexResult[]) {
  // Batch upsert with constraint enforcement
  const symbols = symbolResults.flatMap((f) => f.symbols);

  for (const batch of chunkArray(symbols, 1000)) {
    // Each transaction enforces IN_SNAPSHOT constraint
    await coreGraph.upsertSymbolBatch(batch, snapshotId);
  }

  // Validation: check for constraint violations
  const orphaned = await coreGraph.checkOrphanedNodes(snapshotId);
  if (orphaned.length > 0) {
    throw new Error(`Ingest failed: ${orphaned.length} orphaned nodes (constraint violation)`);
  }
}
```

---

## Validation Queries

Run these post-ingest to verify constraint is satisfied:

```cypher
-- 1. Check for orphaned symbols (should return 0)
MATCH (n:Symbol {snapshotId: $snapshotId})
WHERE NOT (n)-[:IN_SNAPSHOT]->()
RETURN COUNT(n) as orphaned_symbols;

-- 2. Check for multi-snapshot symbols (should return 0)
MATCH (n:Symbol)-[r:IN_SNAPSHOT]->(snap:Snapshot)
WITH n, COUNT(r) as edge_count
WHERE edge_count > 1
RETURN COUNT(n) as multi_snapshot_symbols, MAX(edge_count) as max_edges;

-- 3. Check all snapshot-scoped nodes
MATCH (n:Module|n:File|n:TestCase|n:Endpoint|n:SchemaEntity|n:SpecDoc)
WHERE NOT (n)-[:IN_SNAPSHOT]->()
RETURN labels(n)[0] as node_type, COUNT(n) as orphaned_count;
```

---

## Common Errors & Solutions

### ❌ Error 1: Creating node without edge

```cypher
CREATE (sym:Symbol {id: 'snap-123:src/auth.ts:validateAuth:10:0'})
-- ERROR: Constraint violation
```

**Fix**: Create node + edge in same transaction:

```cypher
MATCH (snap:Snapshot {id: 'snap-123'})
MERGE (sym:Symbol {id: 'snap-123:src/auth.ts:validateAuth:10:0'})
MERGE (sym)-[:IN_SNAPSHOT]->(snap)
```

---

### ❌ Error 2: Orphaned edge after snapshot deletion

```cypher
MATCH (sym:Symbol)-[r:IN_SNAPSHOT]->(snap:Snapshot {id: 'snap-123'})
DELETE snap
-- sym now violates constraint (no edge to snapshot)
```

**Fix**: Cascade delete snapshot-scoped nodes first:

```cypher
MATCH (snap:Snapshot {id: 'snap-123'})
MATCH (n)-[:IN_SNAPSHOT]->(snap)
DETACH DELETE n  -- Delete scoped nodes first
DELETE snap      -- Then delete snapshot
```

---

### ❌ Error 3: Trying to move node between snapshots (mid-transaction)

```cypher
MATCH (sym:Symbol)-[r1:IN_SNAPSHOT]->(:Snapshot)
MATCH (snap2:Snapshot {id: 'snap-456'})
DELETE r1  -- ❌ sym now violates constraint (temporary state)
CREATE (sym)-[:IN_SNAPSHOT]->(snap2)
-- ERROR if constraint checked mid-transaction
```

**Fix**: Use MERGE to atomically replace edge:

```cypher
MATCH (sym:Symbol)
MATCH (snap2:Snapshot {id: 'snap-456'})
MATCH (sym)-[r:IN_SNAPSHOT]->()
DELETE r
MERGE (sym)-[:IN_SNAPSHOT]->(snap2)
-- Keep in same transaction; constraint checked at commit
```

---

## Key Takeaways

| Aspect             | Detail                                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| **What**           | Every snapshot-scoped node must have exactly 1 incoming `[:IN_SNAPSHOT]` edge |
| **Why**            | Prevents orphaned nodes; guarantees temporal correctness                      |
| **Enforcement**    | Database-level (caught at write time)                                         |
| **Implementation** | Create node + edge in same transaction                                        |
| **Validation**     | Run post-ingest orphan checks                                                 |
| **Node Types**     | Module, File, Symbol, Endpoint, SchemaEntity, TestCase, SpecDoc (7 types)     |

---

## Related Documentation

- **graph_schema_spec.md** - §4.1B: Full constraint specification
- **ingest_spec.md** - §6.3: Node-edge creation enforcement
- **IN_SNAPSHOT.md** - Edge specification with implementation patterns
- **layout_spec.md** - §2.2: Core module responsibility for constraint enforcement

---

## FAQ

**Q: What if I need to move a symbol between snapshots?**

A: Snapshot-scoped nodes belong to one snapshot only. If code moves files, treat it as delete +
re-add in the new snapshot (per ingest_spec.md §6.2: "Renames are treated as delete + add").

**Q: What about soft-deletes?**

A: Mark `isDeleted: true` on the node, but keep the `[:IN_SNAPSHOT]` edge (constraint satisfied).
Filter `isDeleted: false` in queries.

**Q: Can I batch-create nodes without edges, then link them later?**

A: No. If constraint is enabled, each node must have its edge before the transaction commits. This
is intentional—it prevents ingest bugs.

**Q: What if the Snapshot doesn't exist?**

A: The foreign key check (`MATCH (snap:Snapshot {id: ...})`) fails before creating the node. The
entire transaction rolls back.

---

**Last Updated**: December 2025  
**Author**: Research + Schema Team
