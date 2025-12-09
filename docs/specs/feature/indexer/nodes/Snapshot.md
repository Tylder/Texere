# Snapshot Node

**Category**: Snapshot-Scoped  
**Purpose**: Represents a Git commit being indexed (immutable point in time).

---

## Properties

| Property       | Type      | Constraints | Notes                                                      |
| -------------- | --------- | ----------- | ---------------------------------------------------------- |
| `id`           | string    | UNIQUE      | Composite: `codebaseId:commitHash`                         |
| `codebaseId`   | string    | Required    | Foreign key to [Codebase](./Codebase.md)                   |
| `commitHash`   | string    | Required    | Git commit SHA-1                                           |
| `author`       | string    | Optional    | Commit author                                              |
| `message`      | string    | Optional    | Commit message                                             |
| `timestamp`    | timestamp | Required    | Commit timestamp                                           |
| `branch`       | string    | Optional    | Branch name (e.g., "main", "snapshot-1"); tracked source   |
| `snapshotType` | enum      | Required    | "branch" \| "commit" \| "tag"; how snapshot was identified |
| `indexStatus`  | enum      | Required    | "success" \| "failed" \| "partial"                         |
| `indexedAt`    | timestamp | Required    | When indexed                                               |
| `createdAt`    | timestamp | Required    | Snapshot creation time                                     |

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
  snapshotType: "branch",
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

## Snapshot Types

### Branch Snapshots (`snapshotType: "branch"`)

- **Purpose**: Represent tracked branches in config (e.g., `main`, `develop`, `snapshot-1`)
- **Indexing**: Triggered by config's `trackedBranches` list
- **Usage**: Default v1 approach; one snapshot per tracked branch
- **Property**: `branch` field stores source branch name

**Example**:

```cypher
Snapshot {
  snapshotType: "branch",
  branch: "main",
  commitHash: "abc123...",
  id: "my-repo:abc123..."
}
```

### Commit Snapshots (`snapshotType: "commit"`)

- **Purpose**: Full Git history snapshots (optional v2+)
- **Indexing**: Index every commit in history
- **Usage**: For detailed evolution tracking
- **Property**: `branch` may be null or contain original branch

**Example**:

```cypher
Snapshot {
  snapshotType: "commit",
  branch: null,
  commitHash: "abc123...",
  id: "my-repo:abc123..."
}
```

### Tag Snapshots (`snapshotType: "tag"`)

- **Purpose**: Release/version snapshots (optional v2+)
- **Indexing**: Track Git tags (e.g., `v1.0.0`, `release/2024`)
- **Usage**: Stable version points
- **Property**: `branch` may store tag name

**Example**:

```cypher
Snapshot {
  snapshotType: "tag",
  branch: "v1.0.0",
  commitHash: "def456...",
  id: "my-repo:def456..."
}
```

---

## Lifecycle

1. **Creation**: Created when a branch/commit/tag is indexed (per config)
2. **Immutability**: Snapshot data never changes (represents fixed point in time)
3. **Historical**: Multiple snapshots per codebase (one per tracked branch, or full history in v2+)
4. **Archival**: Old snapshots marked `indexStatus: "archived"` (optional post-v1)

---

## Usage Patterns

### Get Latest Snapshot for Tracked Branch

```cypher
MATCH (cb:Codebase {id: $codebaseId})-[:CONTAINS]->(snap:Snapshot {snapshotType: "branch", branch: $branchName})
RETURN snap
ORDER BY snap.timestamp DESC
LIMIT 1
```

### Find All Branch Snapshots (Tracked Branches)

```cypher
MATCH (cb:Codebase {id: $codebaseId})-[:CONTAINS]->(snap:Snapshot {snapshotType: "branch"})
RETURN snap
ORDER BY snap.timestamp DESC
```

### Find All Snapshots by Type

```cypher
MATCH (cb:Codebase {id: $codebaseId})-[:CONTAINS]->(snap:Snapshot {snapshotType: $type})
RETURN snap, snap.snapshotType AS type
```

### Incremental Diff Between Branch Snapshots

```cypher
MATCH (cb:Codebase {id: $codebaseId})-[:CONTAINS]->(snap1:Snapshot {snapshotType: "branch", branch: $branch1})
MATCH (cb)-[:CONTAINS]->(snap2:Snapshot {snapshotType: "branch", branch: $branch2})
RETURN snap1, snap2
// Then use: git diff snap1.commitHash..snap2.commitHash
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
