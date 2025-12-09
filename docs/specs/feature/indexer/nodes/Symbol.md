# Symbol Node

**Category**: Snapshot-Scoped  
**Purpose**: Code definition (function, class, method, const, type, interface, etc.). Most densely
connected node.

---

## Properties

| Property      | Type      | Constraints | Notes                                                                            |
| ------------- | --------- | ----------- | -------------------------------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:path:name:line:col`                                       |
| `snapshotId`  | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)                                         |
| `filePath`    | string    | Required    | File path containing symbol                                                      |
| `name`        | string    | Required    | Symbol name                                                                      |
| `kind`        | enum      | Required    | "function" \| "class" \| "method" \| "const" \| "type" \| "interface" \| "other" |
| `startLine`   | integer   | Required    | 1-indexed start line                                                             |
| `startCol`    | integer   | Required    | 0-indexed start column                                                           |
| `endLine`     | integer   | Required    | 1-indexed end line                                                               |
| `endCol`      | integer   | Required    | 0-indexed end column                                                             |
| `isExported`  | boolean   | Optional    | Is exported/public?                                                              |
| `docstring`   | string    | Optional    | JSDoc / docstring content                                                        |
| `embeddingId` | string    | Optional    | Qdrant vector ID (for similarity)                                                |
| `isDeleted`   | boolean   | Required    | Deleted in latest snapshot                                                       |
| `createdAt`   | timestamp | Required    | When created in snapshot                                                         |

---

## Schema

```cypher
CREATE CONSTRAINT symbol_id_unique IF NOT EXISTS
FOR (n:Symbol) REQUIRE n.id IS UNIQUE;

CREATE INDEX symbol_name IF NOT EXISTS
FOR (n:Symbol) ON (n.name);

CREATE (sym:Symbol {
  id: "snap-123:src/auth/jwt.ts:validateToken:10:0",
  snapshotId: "snap-123",
  filePath: "src/auth/jwt.ts",
  name: "validateToken",
  kind: "function",
  startLine: 10,
  startCol: 0,
  endLine: 35,
  endCol: 1,
  isExported: true,
  docstring: "Validates JWT token and returns decoded payload",
  embeddingId: "vec-abc123",
  isDeleted: false,
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing (11 edge types)

| Edge                                          | Target                                  | Cardinality | Notes                |
| --------------------------------------------- | --------------------------------------- | ----------- | -------------------- |
| `[:IN_SNAPSHOT]`                              | [Snapshot](./Snapshot.md)               | exactly 1   | Version scoping      |
| `[:REFERENCES {kind: 'CALL'}]`                | [Symbol](./Symbol.md)                   | optional    | Function calls       |
| `[:REFERENCES {kind: 'TYPE_REF'}]`            | [Symbol](./Symbol.md)                   | optional    | Type references      |
| `[:REFERENCES {kind: 'IMPORT'}]`              | [Symbol](./Symbol.md)                   | optional    | Import statements    |
| `[:REFERENCES {kind: 'PATTERN'}]`             | [Pattern](./Pattern.md)                 | optional    | Adheres to pattern   |
| `[:REFERENCES {kind: 'SIMILAR'}]`             | [Symbol](./Symbol.md)                   | optional    | Embedding similarity |
| `[:REALIZES {role: 'IMPLEMENTS'}]`            | [Feature](./Feature.md)                 | optional    | Implements feature   |
| `[:MUTATES {operation: 'READ'\|'WRITE'}]`     | [DataContract](DataContract.md)         | optional    | Data access          |
| `[:DEPENDS_ON {kind: 'CONFIG'}]`              | ConfigurationVariable                   | optional    | Uses config/env      |
| `[:DEPENDS_ON {kind: 'SERVICE'}]`             | [ExternalService](./ExternalService.md) | optional    | Calls external API   |
| `[:TRACKS {event: 'INTRODUCED'\|'MODIFIED'}]` | [Snapshot](./Snapshot.md)               | optional    | Evolution tracking   |

### Incoming (8 edge types)

| Edge                                      | Source                    | Cardinality | Notes                       |
| ----------------------------------------- | ------------------------- | ----------- | --------------------------- |
| `[:REFERENCES {kind: 'CALL'}]`            | [Symbol](./Symbol.md)     | optional    | Called by other symbols     |
| `[:REFERENCES {kind: 'TYPE_REF'}]`        | [Symbol](./Symbol.md)     | optional    | Referenced by other symbols |
| `[:REFERENCES {kind: 'SIMILAR'}]`         | [Symbol](./Symbol.md)     | optional    | Similar symbols (embedding) |
| `[:LOCATION {role: 'HANDLED_BY'}]`        | [Boundary](./Boundary.md) | optional    | Handler for endpoint        |
| `[:REALIZES {role: 'TESTS'}]`             | [TestCase](./TestCase.md) | optional    | Tested by test case         |
| `[:MUTATES {operation: 'READ'\|'WRITE'}]` | [Symbol](./Symbol.md)     | optional    | Accessed by other symbols   |
| `[:IMPACTS {type: 'CAUSED_BY'}]`          | [Incident](./Incident.md) | optional    | Root cause of incident      |
| `[:DOCUMENTS]`                            | [SpecDoc](./SpecDoc.md)   | optional    | Documented by spec          |

---

## Edge Density

**Symbol is the most connected node** with 19 total edge connections (11 outgoing + 8 incoming).

---

## Usage Patterns

### Call Graph

```cypher
-- Direct calls from symbol
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {kind: 'CALL'}]->(target:Symbol)
RETURN target, r.line, r.col

-- Transitive (depth 2)
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {kind: 'CALL'}*0..2]->(reachable:Symbol)
RETURN reachable
```

### Data Access

```cypher
-- What does this symbol read/write?
MATCH (sym:Symbol {id: $symbolId})-[r:MUTATES]->(entity:DataContract)
RETURN entity, r.operation
```

### Feature Implementation

```cypher
-- What features does this symbol implement?
MATCH (sym:Symbol {id: $symbolId})-[r:REALIZES {role: 'IMPLEMENTS'}]->(f:Feature)
RETURN f, r.confidence
```

### Dependencies

```cypher
-- External dependencies (services, config)
MATCH (sym:Symbol {id: $symbolId})-[r:DEPENDS_ON {kind: 'SERVICE'|'CONFIG'}]->(dep)
RETURN dep, r.kind
```

### Evolution

```cypher
-- When was symbol introduced and modified?
MATCH (sym:Symbol {id: $symbolId})-[r:TRACKS]->(snap:Snapshot)
RETURN snap, r.event
ORDER BY snap.timestamp
```

### Similarity

```cypher
-- Find similar symbols (by embedding)
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {kind: 'SIMILAR'}]->(similar:Symbol)
RETURN similar, r.distance
ORDER BY r.distance
LIMIT 5
```

---

## Constraints & Indexes

- **Unique Index**: `symbol_id_unique` on `id`
- **Name Index**: `symbol_name` on `name` (symbol lookup)
- **Cardinality Invariant**: Exactly 1 `[:IN_SNAPSHOT]` per symbol
- **Composite ID**: Includes location (line, col) for stability across versions

---

## Common Use Cases

1. **Call graph analysis**: "Who calls this function?"
2. **Data flow**: "What databases does this function access?"
3. **Feature mapping**: "What symbols implement feature X?"
4. **Testing**: "Which tests cover this symbol?"
5. **Impact analysis**: "What breaks if I change this?"
6. **Similarity search**: "Find similar implementations"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Version scoping
- [File.md](./File.md) – Location
- [../edges/REFERENCES.md](../edges/REFERENCES.md) – Code relations
- [../edges/REALIZES.md](../edges/REALIZES.md) – Feature implementation
- [../edges/MUTATES.md](../edges/MUTATES.md) – Data flow
- [../edges/DEPENDS_ON.md](../edges/DEPENDS_ON.md) – Dependencies
