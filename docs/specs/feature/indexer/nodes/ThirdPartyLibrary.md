# ThirdPartyLibrary Node

**Category**: Snapshot-Scoped  
**Purpose**: Installed dependency (npm package, PyPI package, etc.).

---

## Properties

| Property     | Type      | Constraints | Notes                                       |
| ------------ | --------- | ----------- | ------------------------------------------- |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:packageName:version` |
| `snapshotId` | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)    |
| `name`       | string    | Required    | Package name (e.g., "express")              |
| `version`    | string    | Required    | Semantic version                            |
| `registry`   | string    | Optional    | Registry URL (npm, pypi, etc.)              |
| `createdAt`  | timestamp | Required    | When indexed                                |

---

## Schema

```cypher
CREATE CONSTRAINT library_id_unique IF NOT EXISTS
FOR (n:ThirdPartyLibrary) REQUIRE n.id IS UNIQUE;

CREATE (lib:ThirdPartyLibrary {
  id: "snap-123:express:4.18.2",
  snapshotId: "snap-123",
  name: "express",
  version: "4.18.2",
  registry: "https://registry.npmjs.org",
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing

| Edge             | Target                    | Cardinality | Notes           |
| ---------------- | ------------------------- | ----------- | --------------- |
| `[:IN_SNAPSHOT]` | [Snapshot](./Snapshot.md) | exactly 1   | Version scoping |

### Incoming

| Edge                              | Source                    | Cardinality | Notes            |
| --------------------------------- | ------------------------- | ----------- | ---------------- |
| `[:CONTAINS]`                     | [Snapshot](./Snapshot.md) | optional    | Snapshot scoping |
| `[:DEPENDS_ON {kind: 'LIBRARY'}]` | [Module](./Module.md)     | optional    | Used by module   |

---

## Sparse Node

ThirdPartyLibrary is a **sparse leaf node** — minimal outgoing edges, primarily used as target of
`[:DEPENDS_ON]`.

---

## Source of Discovery

Libraries extracted from:

- `package.json` / `package-lock.json` (Node.js)
- `requirements.txt` / `poetry.lock` (Python)
- `pom.xml` (Maven)
- `Cargo.toml` / `Cargo.lock` (Rust)
- etc.

---

## Usage Patterns

### Find Libraries Used by Module

```cypher
MATCH (m:Module {id: $moduleId})-[r:DEPENDS_ON {kind: 'LIBRARY'}]->(lib:ThirdPartyLibrary)
RETURN lib, r.version
```

### Find All Libraries in Snapshot

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS]->(lib:ThirdPartyLibrary)
RETURN lib
```

### Find Modules Using Specific Library

```cypher
MATCH (lib:ThirdPartyLibrary {name: 'express'})<-[r:DEPENDS_ON {kind: 'LIBRARY'}]-(m:Module)
RETURN m
```

### Dependency Upgrade Analysis

```cypher
-- What modules use old version?
MATCH (m:Module)-[r:DEPENDS_ON {kind: 'LIBRARY'}]->(lib:ThirdPartyLibrary {name: 'lodash'})
WHERE lib.version < '4.17.21'
RETURN m, lib.version
```

---

## Constraints & Indexes

- **Unique Index**: `library_id_unique` on `id`
- **Cardinality**: Composite key includes version (multiple versions coexist)
- **Sparse**: No outgoing edges in v1

---

## Common Use Cases

1. **Dependency inventory**: "What libraries does module X use?"
2. **Vulnerability scanning**: "Modules using vulnerable version"
3. **License compliance**: "All npm packages with license"
4. **Dependency drift**: "Compare dependencies across snapshots"
5. **Version management**: "Where is lodash 4.x used?"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Version scoping
- [Module.md](./Module.md) – Consumer
- [../edges/DEPENDS_ON.md](../edges/DEPENDS_ON.md) – Dependency relationship
