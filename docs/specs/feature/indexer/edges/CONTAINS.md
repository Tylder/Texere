# [:CONTAINS] – Hierarchy

**Category**: Structural  
**Semantic**: "What's inside this?"

---

## Purpose

Defines the hierarchical containment relationship in the knowledge graph. Forms a transitive tree
from leaf nodes (Files) to root (Codebase).

**Key Characteristic**: Single relationship type throughout hierarchy; enables transitive queries
via `[:CONTAINS*]`.

---

## Properties

| Property    | Type      | Required | Notes                     |
| ----------- | --------- | -------- | ------------------------- |
| `createdAt` | timestamp | Yes      | When relationship created |

No additional properties; hierarchy is implicit in node types.

---

## Source → Target Pairs

| Source   | Target             | Cardinality | Notes                               |
| -------- | ------------------ | ----------- | ----------------------------------- |
| File     | Module             | exactly 1   | File contained in module            |
| Module   | Module \| Snapshot | exactly 1   | Module in parent module or snapshot |
| Snapshot | Codebase           | exactly 1   | Snapshot in codebase                |

**Cardinality Invariant**: Every snapshot-scoped node has **exactly 1** path to `Codebase` via
transitive `[:CONTAINS]`.

---

## Schema

```cypher
-- No unique constraint; allows multiple files in one module
-- Tree traversal via index on relationship

CREATE INDEX contains_source_target IF NOT EXISTS
FOR ()-[r:CONTAINS]-() ON (r.createdAt);

-- Example hierarchy
MATCH (file:File {id: 'snap-123:src/auth/jwt.ts'})
  -[:CONTAINS]->(module:Module {id: 'snap-123:src/auth'})
  -[:CONTAINS]->(snapshot:Snapshot {id: 'snap-123'})
  -[:CONTAINS]->(codebase:Codebase {id: 'texere-main'})
RETURN codebase, snapshot, module, file
```

---

## Query Patterns

### Tree Traversal (Breadth-First)

```cypher
-- Get all files in a module
MATCH (module:Module)-[:CONTAINS*]->(file:File)
RETURN file

-- Get all modules in a snapshot
MATCH (snapshot:Snapshot)-[:CONTAINS*]->(module:Module)
RETURN module

-- Get all descendants (files + modules)
MATCH (module:Module)-[:CONTAINS*]->(descendant)
RETURN descendant, labels(descendant) as type
```

### Ancestor Queries

```cypher
-- Get module containing a file
MATCH (file:File)-[:CONTAINS]->(module:Module)
RETURN module

-- Get snapshot containing a file (2 hops)
MATCH (file:File)-[:CONTAINS]->(module:Module)-[:CONTAINS]->(snapshot:Snapshot)
RETURN snapshot

-- Get root codebase
MATCH (file:File)-[:CONTAINS*]->(codebase:Codebase)
RETURN codebase
```

### Filtered Hierarchy

```cypher
-- Get TypeScript files in auth module
MATCH (module:Module {name: 'auth'})-[:CONTAINS*]->(file:File {language: 'ts'})
RETURN file

-- Get test files in a snapshot
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS*]->(file:File {isTest: true})
RETURN file
```

---

## Constraints & Indexes

- **Cardinality Invariant**: Every node has exactly 1 outgoing `[:CONTAINS]` edge (or none if at
  root)
- **Tree Structure**: No cycles; directed acyclic graph (DAG)
- **Index Priority**: High; frequent in hierarchical queries
- **Path Index**: Consider full-text or spatial index for large hierarchies (>100K nodes)

---

## Deletion Semantics

When a node is deleted:

1. All `[:CONTAINS]` edges from that node are removed
2. All descendants remain (orphaned if no other parent)
3. No cascade deletion

**Future Consideration**: Implement cascade-delete policy per retention rules.

---

## Common Use Cases

1. **Code organization**: "All files in this module?"
2. **Module inventory**: "What modules are in this snapshot?"
3. **Path resolution**: "What's the root codebase for this file?"
4. **Bulk queries**: "Get all TypeScript files across snapshot"
5. **Hierarchy visualization**: Tree rendering of codebase structure

---

## Performance Notes

- **Optimal**: Hierarchies up to 10 levels deep (typical)
- **Traversal Cost**: O(depth) with proper indexing
- **Transitive Queries**: `[:CONTAINS*]` can be expensive for deep hierarchies; use `[:CONTAINS]`
  single hops when possible
- **Cardinality**: Moderate (1–10 edges per node on average)

---

## Relationship Direction

**Bottom-up** (children → parents):

```cypher
(file:File)-[:CONTAINS]->(module:Module)-[:CONTAINS]->(snapshot:Snapshot)-[:CONTAINS]->(codebase:Codebase)
```

This allows efficient ancestor traversal and aligns with Neo4j best practices for hierarchical
queries.

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [../nodes/README.md](../nodes/README.md) – Node type catalog
- [Codebase.md](../nodes/Codebase.md), [Snapshot.md](../nodes/Snapshot.md),
  [Module.md](../nodes/Module.md), [File.md](../nodes/File.md) – Node definitions
