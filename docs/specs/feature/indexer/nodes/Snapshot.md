# Snapshot Node

**Category**: Snapshot-Scoped  
**Purpose**: Represents a Git commit being indexed (immutable point in time).

---

## Properties

| Property      | Type      | Constraints | Notes                                    |
| ------------- | --------- | ----------- | ---------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `codebaseId:commitHash`       |
| `codebaseId`  | string    | Required    | Foreign key to [Codebase](./Codebase.md) |
| `commitHash`  | string    | Required    | Git commit SHA-1                         |
| `author`      | string    | Optional    | Commit author                            |
| `message`     | string    | Optional    | Commit message                           |
| `timestamp`   | timestamp | Required    | Commit timestamp                         |
| `branch`      | string    | Optional    | Branch name (e.g., "main")               |
| `indexStatus` | enum      | Required    | "success" \| "failed" \| "partial"       |
| `indexedAt`   | timestamp | Required    | When indexed                             |
| `createdAt`   | timestamp | Required    | Snapshot creation time                   |

---

## Schema

```cypher
CREATE CONSTRAINT snapshot_id_unique IF NOT EXISTS
FOR (n:Snapshot) REQUIRE n.id IS UNIQUE;

CREATE INDEX snapshot_status IF NOT EXISTS
FOR (n:Snapshot) ON (n.indexStatus);

CREATE (snap:Snapshot {
  id: "texere-main:abc123def456",
  codebaseId: "texere-main",
  commitHash: "abc123def456",
  author: "Alice <alice@example.com>",
  message: "feat: add indexer",
  timestamp: timestamp(1700000000),
  branch: "main",
  indexStatus: "success",
  indexedAt: timestamp(),
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing

| Edge          | Target                                      | Cardinality | Notes                     |
| ------------- | ------------------------------------------- | ----------- | ------------------------- |
| `[:CONTAINS]` | [Module](./Module.md)                       | many-to-one | Modules in this snapshot  |
| `[:CONTAINS]` | [File](./File.md)                           | many-to-one | Files in this snapshot    |
| `[:CONTAINS]` | [Symbol](./Symbol.md)                       | many-to-one | Symbols in this snapshot  |
| `[:CONTAINS]` | [Boundary](./Boundary.md)                   | many-to-one | Optional: endpoints found |
| `[:CONTAINS]` | [DataContract](DataContract.md)             | many-to-one | Optional: ORM entities    |
| `[:CONTAINS]` | [TestCase](./TestCase.md)                   | many-to-one | Optional: tests found     |
| `[:CONTAINS]` | [SpecDoc](./SpecDoc.md)                     | many-to-one | Optional: docs indexed    |
| `[:CONTAINS]` | [ThirdPartyLibrary](./ThirdPartyLibrary.md) | many-to-one | Optional: from lockfile   |

### Incoming

| Edge                                          | Source                                                                    | Cardinality  | Notes                        |
| --------------------------------------------- | ------------------------------------------------------------------------- | ------------ | ---------------------------- |
| `[:CONTAINS]`                                 | [Codebase](./Codebase.md)                                                 | many-to-one  | Snapshot belongs to codebase |
| `[:IN_SNAPSHOT]`                              | All scoped nodes                                                          | many-to-one  | Scoping edges                |
| `[:TRACKS {event: 'INTRODUCED'\|'MODIFIED'}]` | [Symbol](./Symbol.md), [Feature](./Feature.md), [TestCase](./TestCase.md) | many-to-many | Evolution tracking           |

---

## Lifecycle

1. **Creation**: Created when a new commit is indexed
2. **Immutability**: Snapshot data never changes (represents fixed point in time)
3. **Historical**: Multiple snapshots per codebase (one per branch + history)
4. **Archival**: Old snapshots marked `indexStatus: "archived"` (optional post-v1)

---

## Usage Patterns

### Get Latest Snapshot for Branch

```cypher
MATCH (cb:Codebase {id: $codebaseId})-[:CONTAINS]->(snap:Snapshot {branch: $branch})
RETURN snap
ORDER BY snap.timestamp DESC
LIMIT 1
```

### Find All Snapshots

```cypher
MATCH (cb:Codebase {id: $codebaseId})-[:CONTAINS]->(snap:Snapshot)
RETURN snap
ORDER BY snap.timestamp DESC
```

### Get All Code in Snapshot

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS*]->(sym:Symbol)
RETURN COUNT(DISTINCT sym) AS symbolCount
```

### Evolution: When was Symbol Introduced?

```cypher
MATCH (sym:Symbol {id: $symbolId})-[r:TRACKS {event: 'INTRODUCED'}]->(snap:Snapshot)
RETURN snap
```

---

## Constraints & Indexes

- **Unique Index**: `snapshot_id_unique` on `id`
- **Status Index**: `snapshot_status` on `indexStatus` (filter by success/failed)
- **Tree Cardinality**: Each snapshot can have many modules, files, symbols
- **Version Tracking**: Critical for temporal queries and impact analysis

---

## Scoped Node Membership

All of these must point to exactly one snapshot via `[:IN_SNAPSHOT]`:

- [Symbol](./Symbol.md)
- [Boundary](./Boundary.md)
- [File](./File.md)
- [Module](./Module.md)
- [TestCase](./TestCase.md)
- [SpecDoc](./SpecDoc.md)
- [DataContract](DataContract.md)
- [ThirdPartyLibrary](./ThirdPartyLibrary.md)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Codebase.md](./Codebase.md) – Parent node
- [Module.md](./Module.md), [File.md](./File.md), [Symbol.md](./Symbol.md) – Child nodes
- [../edges/TRACKS.md](../edges/TRACKS.md) – Evolution tracking
