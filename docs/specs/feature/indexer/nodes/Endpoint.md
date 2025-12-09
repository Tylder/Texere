# Endpoint Node

**Category**: Snapshot-Scoped  
**Purpose**: HTTP API endpoint (verb + path). API-centric view of code.

---

## Properties

| Property          | Type      | Constraints | Notes                                           |
| ----------------- | --------- | ----------- | ----------------------------------------------- |
| `id`              | string    | UNIQUE      | Composite: `snapshotId:verb:path`               |
| `snapshotId`      | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)        |
| `verb`            | string    | Required    | "GET" \| "POST" \| "PUT" \| "DELETE" \| "PATCH" |
| `path`            | string    | Required    | API path (e.g., "/api/features/:id")            |
| `handlerSymbolId` | string    | Required    | Foreign key to [Symbol](./Symbol.md)            |
| `description`     | string    | Optional    | Endpoint description                            |
| `createdAt`       | timestamp | Required    | When created in snapshot                        |

---

## Schema

```cypher
CREATE CONSTRAINT endpoint_id_unique IF NOT EXISTS
FOR (n:Endpoint) REQUIRE n.id IS UNIQUE;

CREATE INDEX endpoint_verb_path IF NOT EXISTS
FOR (n:Endpoint) ON (n.verb, n.path);

CREATE (ep:Endpoint {
  id: "snap-123:POST:/api/features",
  snapshotId: "snap-123",
  verb: "POST",
  path: "/api/features",
  handlerSymbolId: "snap-123:src/api/features.ts:createFeature:10:0",
  description: "Create a new feature",
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing (11 edge types)

| Edge                                          | Target                                  | Cardinality | Notes                  |
| --------------------------------------------- | --------------------------------------- | ----------- | ---------------------- |
| `[:IN_SNAPSHOT]`                              | [Snapshot](./Snapshot.md)               | exactly 1   | Version scoping        |
| `[:LOCATION {role: 'HANDLED_BY'}]`            | [Symbol](./Symbol.md)                   | exactly 1   | Handler symbol         |
| `[:LOCATION {role: 'IN_FILE'}]`               | [File](./File.md)                       | exactly 1   | Handler file           |
| `[:LOCATION {role: 'IN_MODULE'}]`             | [Module](./Module.md)                   | optional    | Handler module         |
| `[:REALIZES {role: 'IMPLEMENTS'}]`            | [Feature](./Feature.md)                 | optional    | Feature implementation |
| `[:MUTATES {operation: 'READ'\|'WRITE'}]`     | [SchemaEntity](./SchemaEntity.md)       | optional    | Data access            |
| `[:DEPENDS_ON {kind: 'SERVICE'}]`             | [ExternalService](./ExternalService.md) | optional    | External APIs          |
| `[:REFERENCES {kind: 'PATTERN'}]`             | [Pattern](./Pattern.md)                 | optional    | Pattern adherence      |
| `[:REFERENCES {kind: 'SIMILAR'}]`             | [Endpoint](./Endpoint.md)               | optional    | Similar endpoints      |
| `[:TRACKS {event: 'INTRODUCED'\|'MODIFIED'}]` | [Snapshot](./Snapshot.md)               | optional    | Evolution              |

### Incoming (4 edge types)

| Edge                          | Source                    | Cardinality | Notes              |
| ----------------------------- | ------------------------- | ----------- | ------------------ |
| `[:CONTAINS]`                 | [Snapshot](./Snapshot.md) | optional    | Snapshot scoping   |
| `[:REALIZES {role: 'TESTS'}]` | [TestCase](./TestCase.md) | optional    | Tested by test     |
| `[:DOCUMENTS]`                | [SpecDoc](./SpecDoc.md)   | optional    | Documented by spec |

---

## Derived Properties

- **Handler**: Stored via `handlerSymbolId` property AND `[:LOCATION {role: 'HANDLED_BY'}]` edge
- **File/Module**: Derived from handler symbol's file/module, also explicit edges for query
  convenience

---

## Usage Patterns

### Find All Endpoints

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS]->(ep:Endpoint)
RETURN ep
ORDER BY ep.path
```

### Find Endpoint Handler

```cypher
MATCH (ep:Endpoint {id: $endpointId})-[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN handler
```

### Find Data Access for Endpoint

```cypher
MATCH (ep:Endpoint {id: $endpointId})-[r1:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
MATCH (handler)-[r2:MUTATES]->(entity:SchemaEntity)
RETURN entity, r2.operation
```

### Find External Dependencies

```cypher
MATCH (ep:Endpoint {id: $endpointId})-[r:DEPENDS_ON {kind: 'SERVICE'}]->(svc:ExternalService)
RETURN svc
```

### Find Tests for Endpoint

```cypher
MATCH (ep:Endpoint {id: $endpointId})-[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
MATCH (t:TestCase)-[r2:REALIZES {role: 'TESTS'}]->(handler)
RETURN t
```

### Find Endpoints Implementing Feature

```cypher
MATCH (f:Feature {id: $featureId})<-[r:REALIZES {role: 'IMPLEMENTS'}]-(ep:Endpoint)
RETURN ep
```

---

## Constraints & Indexes

- **Unique Index**: `endpoint_id_unique` on `id`
- **Verb/Path Index**: `endpoint_verb_path` on (verb, path) — for routing lookup
- **Cardinality**: Many endpoints per snapshot; exactly 1 handler symbol
- **ID Uniqueness**: (snapshotId, verb, path) is unique per snapshot

---

## Common Use Cases

1. **API discovery**: "All GET endpoints in snapshot"
2. **Handler lookup**: "What handler is /api/features/:id?"
3. **Feature mapping**: "Which endpoints implement payment?"
4. **Test discovery**: "What tests cover this endpoint?"
5. **Dependency analysis**: "Which endpoints call Stripe?"
6. **Impact analysis**: "What endpoints break if I remove User entity?"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Version scoping
- [Symbol.md](./Symbol.md) – Handler
- [Feature.md](./Feature.md) – Feature implementation
- [../edges/LOCATION.md](../edges/LOCATION.md) – Position
- [../edges/REALIZES.md](../edges/REALIZES.md) – Feature implementation
