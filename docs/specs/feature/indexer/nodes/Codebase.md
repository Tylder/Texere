# Codebase Node

**Category**: Snapshot-Scoped  
**Purpose**: Any code repository being indexed. Can be main repo, vendored dependencies, monorepo
sub-projects, or external code. Configuration determines what gets indexed.

---

## Properties

| Property    | Type      | Constraints | Notes                                                                                          |
| ----------- | --------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `id`        | string    | UNIQUE      | Codebase identifier (e.g., "texere-main", "package:@monorepo/ui", "github.com/facebook/react") |
| `name`      | string    | Required    | Human-readable name                                                                            |
| `url`       | string    | Optional    | Repository URL (e.g., GitHub URL)                                                              |
| `kind`      | enum      | Optional    | "main" \| "vendored" \| "monorepo-sub" \| "external"                                           |
| `createdAt` | timestamp | Required    | When indexing began                                                                            |
| `updatedAt` | timestamp | Required    | Last index/update                                                                              |

---

## Schema

```cypher
CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS
FOR (n:Codebase) REQUIRE n.id IS UNIQUE;

CREATE (cb:Codebase {
  id: "texere-main",
  name: "Texere Main Repository",
  url: "https://github.com/Tylder/Texere",
  kind: "main",
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

1. **Creation**: Created on first indexing (main repo, vendored dependency, or configured
   sub-project)
2. **Configuration-Driven**: What gets indexed determined by `indexer.config.yaml`
3. **Multiple Snapshots**: Can have many snapshots (one per tracked branch + historical commits)
4. **Persistence**: Persists for entire codebase lifecycle; never deleted

## Examples

```cypher
-- Main repository
(cb:Codebase {id: "texere-main", kind: "main"})
  -[:CONTAINS]->(snap1:Snapshot {commitHash: "abc123"})
  -[:CONTAINS*]->(sym:Symbol {name: "validateAuth"})

-- Vendored dependency in monorepo
(cb:Codebase {id: "vendor:stripe-api", kind: "vendored"})
  -[:CONTAINS]->(snap2:Snapshot {commitHash: "abc123"})
  -[:CONTAINS*]->(mod:Module {name: "src/stripe"})

-- Monorepo sub-project
(cb:Codebase {id: "monorepo:@texere/ui", kind: "monorepo-sub"})
  -[:CONTAINS]->(snap3:Snapshot {commitHash: "abc123"})

-- External open-source indexed from source
(cb:Codebase {id: "github.com/facebook/react", kind: "external"})
  -[:CONTAINS]->(snap4:Snapshot {commitHash: "v18.2.0"})
```

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
