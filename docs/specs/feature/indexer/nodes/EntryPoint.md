# EntryPoint Node

**Category**: Snapshot-Scoped  
**Purpose**: Callable/invokable interface (HTTP endpoint, CLI command, exported function, event
handler, batch job, etc.). Generic across all code types.

---

## Properties

| Property          | Type      | Constraints | Notes                                                      |
| ----------------- | --------- | ----------- | ---------------------------------------------------------- |
| `id`              | string    | UNIQUE      | Composite: `snapshotId:kind:identifier`                    |
| `snapshotId`      | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)                   |
| `kind`            | enum      | Required    | "http" \| "cli" \| "export" \| "event" \| "job" \| "other" |
| `identifier`      | string    | Required    | Kind-specific identifier (see below)                       |
| `handlerSymbolId` | string    | Required    | Foreign key to [Symbol](./Symbol.md)                       |
| `description`     | string    | Optional    | EntryPoint description                                     |
| `createdAt`       | timestamp | Required    | When created in snapshot                                   |

---

## Identifier Format by Kind

| Kind     | Identifier Format            | Example                            |
| -------- | ---------------------------- | ---------------------------------- |
| `http`   | `{verb}:{path}`              | `POST:/api/features`               |
| `cli`    | `{command}:{subcommand}`     | `deploy:prod` or `migrate`         |
| `export` | `{modulePath}::{symbolName}` | `src/auth::validateToken`          |
| `event`  | `{eventType}`                | `user.created` or `payment.failed` |
| `job`    | `{jobName}`                  | `send-digest-email`                |
| `other`  | `{description}`              | `health-check`                     |

---

## Schema

```cypher
CREATE CONSTRAINT entry_point_id_unique IF NOT EXISTS
FOR (n:EntryPoint) REQUIRE n.id IS UNIQUE;

CREATE INDEX entry_point_kind IF NOT EXISTS
FOR (n:EntryPoint) ON (n.kind);

CREATE INDEX entry_point_kind_identifier IF NOT EXISTS
FOR (n:EntryPoint) ON (n.kind, n.identifier);

-- HTTP endpoint
CREATE (ep:EntryPoint {
  id: "snap-123:http:POST:/api/features",
  snapshotId: "snap-123",
  kind: "http",
  identifier: "POST:/api/features",
  handlerSymbolId: "snap-123:src/api/features.ts:createFeature:10:0",
  description: "Create a new feature",
  createdAt: timestamp()
})

-- CLI command
CREATE (cli:EntryPoint {
  id: "snap-123:cli:deploy:prod",
  snapshotId: "snap-123",
  kind: "cli",
  identifier: "deploy:prod",
  handlerSymbolId: "snap-123:src/cli/deploy.ts:deployProd:5:0",
  description: "Deploy to production",
  createdAt: timestamp()
})

-- Exported function (library)
CREATE (exp:EntryPoint {
  id: "snap-123:export:src/auth::validateToken",
  snapshotId: "snap-123",
  kind: "export",
  identifier: "src/auth::validateToken",
  handlerSymbolId: "snap-123:src/auth.ts:validateToken:10:0",
  description: "Token validation export",
  createdAt: timestamp()
})

-- Event handler
CREATE (evt:EntryPoint {
  id: "snap-123:event:user.created",
  snapshotId: "snap-123",
  kind: "event",
  identifier: "user.created",
  handlerSymbolId: "snap-123:src/events/user.ts:onUserCreated:20:0",
  description: "Handle user creation event",
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
| `[:REFERENCES {kind: 'SIMILAR'}]`             | [EntryPoint](./EntryPoint.md)           | optional    | Similar entry points   |
| `[:TRACKS {event: 'INTRODUCED'\|'MODIFIED'}]` | [Snapshot](./Snapshot.md)               | optional    | Evolution              |

### Incoming (4 edge types)

| Edge                          | Source                    | Cardinality | Notes              |
| ----------------------------- | ------------------------- | ----------- | ------------------ |
| `[:IN_SNAPSHOT]`              | [Snapshot](./Snapshot.md) | exactly 1   | Snapshot scoping   |
| `[:REALIZES {role: 'TESTS'}]` | [TestCase](./TestCase.md) | optional    | Tested by test     |
| `[:DOCUMENTS]`                | [SpecDoc](./SpecDoc.md)   | optional    | Documented by spec |

---

## Usage Patterns

### Find All Entry Points (Any Kind)

```cypher
MATCH (snap:Snapshot {id: $snapshotId})<-[:IN_SNAPSHOT]-(ep:EntryPoint)
RETURN ep
ORDER BY ep.kind, ep.identifier
```

### Find Entry Points by Kind

```cypher
-- All HTTP endpoints in snapshot
MATCH (snap:Snapshot {id: $snapshotId})<-[:IN_SNAPSHOT]-(ep:EntryPoint {kind: 'http'})
RETURN ep

-- All CLI commands
MATCH (ep:EntryPoint {kind: 'cli'})
RETURN ep

-- All exported functions (library)
MATCH (ep:EntryPoint {kind: 'export'})
RETURN ep
```

### Find Entry Point Handler

```cypher
MATCH (ep:EntryPoint {id: $entryPointId})-[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN handler
```

### Find Data Access for Entry Point

```cypher
MATCH (ep:EntryPoint {id: $entryPointId})-[r1:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
MATCH (handler)-[r2:MUTATES]->(entity:SchemaEntity)
RETURN entity, r2.operation
```

### Find External Dependencies

```cypher
MATCH (ep:EntryPoint {id: $entryPointId})-[r:DEPENDS_ON {kind: 'SERVICE'}]->(svc:ExternalService)
RETURN svc
```

### Find Tests for Entry Point

```cypher
MATCH (ep:EntryPoint {id: $entryPointId})-[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
MATCH (t:TestCase)-[r2:REALIZES {role: 'TESTS'}]->(handler)
RETURN t
```

### Find Entry Points Implementing Feature

```cypher
MATCH (f:Feature {id: $featureId})<-[r:REALIZES {role: 'IMPLEMENTS'}]-(ep:EntryPoint)
RETURN ep
```

### Cross-Kind Entry Point Analysis

```cypher
-- Find all entry points calling same external service
MATCH (svc:ExternalService {id: 'stripe'})
MATCH (ep1:EntryPoint)-[:DEPENDS_ON {kind: 'SERVICE'}]->(svc)
MATCH (ep2:EntryPoint)-[:DEPENDS_ON {kind: 'SERVICE'}]->(svc)
RETURN DISTINCT ep1, ep2, ep1.kind, ep2.kind
```

---

## Constraints & Indexes

- **Unique Index**: `entry_point_id_unique` on `id`
- **Kind Index**: `entry_point_kind` for filtering by type
- **Kind/Identifier Index**: `entry_point_kind_identifier` for lookup
- **Cardinality**: Many entry points per snapshot; exactly 1 handler symbol
- **ID Uniqueness**: (snapshotId, kind, identifier) is unique per snapshot

---

## Common Use Cases

1. **Interface discovery**: "All callable interfaces in snapshot"
2. **Kind-specific queries**: "All HTTP endpoints", "All CLI commands", "All exports"
3. **Handler lookup**: "What function handles this entry point?"
4. **Feature mapping**: "Which entry points implement payment?"
5. **Test discovery**: "What tests cover this entry point?"
6. **Dependency analysis**: "Which entry points call Stripe?"
7. **Impact analysis**: "What breaks if I remove User entity?"
8. **Cross-kind analysis**: "Which HTTP endpoints and CLI commands both use auth?"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Version scoping
- [Symbol.md](./Symbol.md) – Handler
- [Feature.md](./Feature.md) – Feature implementation
- [../edges/LOCATION.md](../edges/LOCATION.md) – Position
- [../edges/REALIZES.md](../edges/REALIZES.md) – Feature implementation
- [../edges/MUTATES.md](../edges/MUTATES.md) – Data access
- [../edges/DEPENDS_ON.md](../edges/DEPENDS_ON.md) – Dependencies
