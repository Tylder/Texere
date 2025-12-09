# Codebase Node

**Category**: Snapshot-Scoped  
**Purpose**: Represents a Git repository being indexed.

---

## Properties

| Property    | Type      | Constraints | Notes                                     |
| ----------- | --------- | ----------- | ----------------------------------------- |
| `id`        | string    | UNIQUE      | Codebase identifier (e.g., "texere-main") |
| `name`      | string    | Required    | Human-readable name                       |
| `url`       | string    | Optional    | Repository URL (e.g., GitHub URL)         |
| `createdAt` | timestamp | Required    | When indexing began                       |
| `updatedAt` | timestamp | Required    | Last index/update                         |

---

## Schema

```cypher
CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS
FOR (n:Codebase) REQUIRE n.id IS UNIQUE;

CREATE (cb:Codebase {
  id: "texere-main",
  name: "Texere Main Repository",
  url: "https://github.com/Tylder/Texere",
  createdAt: timestamp(),
  updatedAt: timestamp()
})
```

---

## Relationships

### Outgoing

| Edge          | Target                    | Cardinality | Notes                                         |
| ------------- | ------------------------- | ----------- | --------------------------------------------- |
| `[:CONTAINS]` | [Snapshot](./Snapshot.md) | many-to-one | Each snapshot belongs to exactly one codebase |

---

### Incoming

None. Codebase is the root node.

---

## Lifecycle

1. **Creation**: Created on first indexing of a Git repository
2. **Persistence**: Persists as long as indexing is active
3. **Multiple Snapshots**: Can have many snapshots (one per tracked branch + historical)

---

## Example

```cypher
-- Find a codebase
MATCH (cb:Codebase {id: "texere-main"})
RETURN cb

-- Find all snapshots for a codebase
MATCH (cb:Codebase {id: "texere-main"})-[:CONTAINS]->(snap:Snapshot)
RETURN snap
ORDER BY snap.timestamp DESC

-- Find all code in a codebase
MATCH (cb:Codebase {id: "texere-main"})-[:CONTAINS*]->(sym:Symbol)
RETURN COUNT(DISTINCT sym) AS symbolCount
```

---

## Constraints & Indexes

- **Unique Index**: `codebase_id_unique` on `id`
- **Tree Cardinality**: Each codebase can have N snapshots
- **No Soft Delete**: Codebases are never deleted (repository persists)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Child node
