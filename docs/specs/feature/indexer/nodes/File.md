# File Node

**Category**: Snapshot-Scoped  
**Purpose**: Source code file.

---

## Properties

| Property     | Type      | Constraints | Notes                                    |
| ------------ | --------- | ----------- | ---------------------------------------- |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:filePath`         |
| `snapshotId` | string    | Required    | Foreign key to [Snapshot](./Snapshot.md) |
| `path`       | string    | Required    | Absolute file path in repo               |
| `name`       | string    | Required    | Filename only                            |
| `language`   | string    | Required    | "ts" \| "tsx" \| "js" \| "py" \| "java"  |
| `isTest`     | boolean   | Required    | Is this a test file?                     |
| `isDeleted`  | boolean   | Required    | Marked deleted in latest snapshot        |
| `createdAt`  | timestamp | Required    | When created in snapshot                 |

---

## Schema

```cypher
CREATE CONSTRAINT file_id_unique IF NOT EXISTS
FOR (n:File) REQUIRE n.id IS UNIQUE;

CREATE INDEX file_language IF NOT EXISTS
FOR (n:File) ON (n.language);

CREATE (f:File {
  id: "snap-123:src/auth/strategies/jwt.ts",
  snapshotId: "snap-123",
  path: "/home/user/repo/src/auth/strategies/jwt.ts",
  name: "jwt.ts",
  language: "ts",
  isTest: false,
  isDeleted: false,
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing

| Edge             | Target                    | Cardinality | Notes                   |
| ---------------- | ------------------------- | ----------- | ----------------------- |
| `[:IN_SNAPSHOT]` | [Snapshot](./Snapshot.md) | exactly 1   | Scoping                 |
| `[:CONTAINS]`    | [Symbol](./Symbol.md)     | optional    | Symbols defined in file |

### Incoming

| Edge                            | Source                    | Cardinality | Notes                  |
| ------------------------------- | ------------------------- | ----------- | ---------------------- |
| `[:CONTAINS]`                   | [Module](./Module.md)     | exactly 1   | File belongs to module |
| `[:LOCATION {role: 'IN_FILE'}]` | [Endpoint](./Endpoint.md) | optional    | Endpoint location      |
| `[:LOCATION {role: 'IN_FILE'}]` | [TestCase](./TestCase.md) | optional    | Test location          |
| `[:DOCUMENTS]`                  | [SpecDoc](./SpecDoc.md)   | optional    | Doc references file    |

---

## Classification

Files are classified by properties:

| Property    | Value | Meaning                                                        |
| ----------- | ----- | -------------------------------------------------------------- |
| `isTest`    | true  | Test file (matched by pattern: `*.test.ts`, `test_*.py`, etc.) |
| `isTest`    | false | Source code file                                               |
| `isDeleted` | true  | File removed in latest snapshot                                |
| `isDeleted` | false | File present in latest snapshot                                |

---

## Usage Patterns

### Find All Test Files in Module

```cypher
MATCH (m:Module {id: $moduleId})-[:CONTAINS*]->(f:File {isTest: true})
RETURN f
```

### Find All Source Files

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS*]->(f:File {isTest: false})
RETURN f
```

### Find Symbols in File

```cypher
MATCH (f:File {id: $fileId})-[:CONTAINS]->(sym:Symbol)
RETURN sym
```

### Find Deleted Files

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS*]->(f:File {isDeleted: true})
RETURN f
```

---

## Constraints & Indexes

- **Unique Index**: `file_id_unique` on `id`
- **Language Index**: `file_language` on `language` (filter by language)
- **File Cardinality**: Many files per module; exactly 1 parent module
- **Soft Delete**: `isDeleted: true` marks file as removed (no hard delete)

---

## Common Use Cases

1. **Test discovery**: "All test files in module X"
2. **Language filtering**: "All Python files in codebase"
3. **Impact analysis**: "What symbols are in deleted file?"
4. **File organization**: "All files in this module"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Module.md](./Module.md) – Parent node
- [Symbol.md](./Symbol.md) – Child node
- [../edges/CONTAINS.md](../edges/CONTAINS.md) – Hierarchy
- [../edges/LOCATION.md](../edges/LOCATION.md) – File locations
