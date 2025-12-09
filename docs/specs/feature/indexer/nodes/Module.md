# Module Node

**Category**: Snapshot-Scoped  
**Purpose**: Logical module/package/directory (e.g., Nx library, Python package, app).

---

## Properties

| Property     | Type      | Constraints | Notes                                                  |
| ------------ | --------- | ----------- | ------------------------------------------------------ |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:modulePath`                     |
| `snapshotId` | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)               |
| `name`       | string    | Required    | Module name (e.g., "apps/agent-orchestrator")          |
| `path`       | string    | Required    | Absolute module path                                   |
| `type`       | enum      | Optional    | "nx-app" \| "nx-lib" \| "maven-project" \| "cargo-pkg" |
| `language`   | string    | Optional    | Primary language ("ts" \| "py" \| "java")              |
| `createdAt`  | timestamp | Required    | When created in snapshot                               |

---

## Schema

```cypher
CREATE CONSTRAINT module_id_unique IF NOT EXISTS
FOR (n:Module) REQUIRE n.id IS UNIQUE;

CREATE (m:Module {
  id: "snap-123:apps/agent-orchestrator",
  snapshotId: "snap-123",
  name: "apps/agent-orchestrator",
  path: "/home/user/repo/apps/agent-orchestrator",
  type: "nx-app",
  language: "ts",
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing

| Edge                                  | Target                                      | Cardinality | Notes             |
| ------------------------------------- | ------------------------------------------- | ----------- | ----------------- |
| `[:CONTAINS]`                         | [File](./File.md)                           | many-to-one | Files in module   |
| `[:CONTAINS]`                         | [Module](./Module.md)                       | optional    | Nested modules    |
| `[:DEPENDS_ON {kind: 'LIBRARY'}]`     | [ThirdPartyLibrary](./ThirdPartyLibrary.md) | optional    | From manifest     |
| `[:DEPENDS_ON {kind: 'STYLE_GUIDE'}]` | [StyleGuide](./StyleGuide.md)               | optional    | Applicable guides |
| `[:REFERENCES {kind: 'PATTERN'}]`     | [Pattern](./Pattern.md)                     | optional    | Matches pattern   |

### Incoming

| Edge           | Source                    | Cardinality | Notes                   |
| -------------- | ------------------------- | ----------- | ----------------------- |
| `[:CONTAINS]`  | [Snapshot](./Snapshot.md) | many-to-one | Module in snapshot      |
| `[:CONTAINS]`  | [Module](./Module.md)     | optional    | Parent module (nesting) |
| `[:DOCUMENTS]` | [SpecDoc](./SpecDoc.md)   | optional    | Docs tag module         |

---

## Hierarchy

Modules form a tree via nesting:

```
Snapshot
  └─ Module (apps/)
      └─ Module (apps/agent-orchestrator)
          └─ Files
              └─ Symbols
```

---

## Usage Patterns

### Find All Modules in Snapshot

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS]->(m:Module)
RETURN m
```

### Find All Files in Module

```cypher
MATCH (m:Module {id: $moduleId})-[:CONTAINS]->(f:File)
RETURN f
```

### Find All Symbols in Module (Transitive)

```cypher
MATCH (m:Module {id: $moduleId})-[:CONTAINS*]->(sym:Symbol)
RETURN sym
```

### Find Dependencies

```cypher
MATCH (m:Module {id: $moduleId})-[r:DEPENDS_ON {kind: 'LIBRARY'|'SERVICE'|'STYLE_GUIDE'}]->(dep)
RETURN dep, r.kind
```

### Find Applicable Style Guides

```cypher
MATCH (m:Module {id: $moduleId})-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide:StyleGuide)
RETURN guide
```

---

## Constraints & Indexes

- **Unique Index**: `module_id_unique` on `id`
- **Tree Cardinality**: Supports arbitrary nesting depth
- **Module Path**: Determines parent (directory structure)

---

## Common Use Cases

1. **Module-level queries**: "All tests in this module", "All endpoints in this module"
2. **Dependency analysis**: "What libraries does this module use?"
3. **Style guide compliance**: "Which guides apply to this module?"
4. **Pattern conformance**: "Does this module follow the microservice pattern?"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Parent node
- [File.md](./File.md) – Child node
- [../edges/CONTAINS.md](../edges/CONTAINS.md) – Hierarchy
- [../edges/DEPENDS_ON.md](../edges/DEPENDS_ON.md) – Dependencies
