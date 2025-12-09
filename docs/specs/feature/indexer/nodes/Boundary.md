# Boundary Node

**Category**: Snapshot-Scoped  
**Purpose**: Any callable/invokable interface or entry point into the codebase, regardless of
transport or invocation mechanism. Covers HTTP endpoints, CLI commands, exported functions, event
handlers, batch jobs, webhooks, message handlers, and other types of callable interfaces.

**Design Philosophy**: Domain-agnostic representation of all code entry points. Boundaries are
differentiated by `kind` to enable kind-specific queries while maintaining a unified model.

---

## Boundary Kinds

Boundaries are classified by `kind` to represent different invocation mechanisms and transport
layers, while maintaining a unified semantic model. Each kind has its own identifier format but
shares the same handler, feature mapping, and dependency relationships.

| Kind      | Transport/Mechanism                    | Typical Frameworks                             |
| --------- | -------------------------------------- | ---------------------------------------------- |
| `http`    | HTTP REST, Webhooks, GraphQL over HTTP | Express, FastAPI, Django, Spring Web           |
| `grpc`    | gRPC unary/streaming calls             | gRPC, Protobuf                                 |
| `graphql` | GraphQL query/mutation/subscription    | Apollo, Graphene, Relay                        |
| `cli`     | Command-line interface                 | Click, Commander, argparse                     |
| `export`  | Exported library function              | Any module exporting public APIs               |
| `event`   | Event emitter/pub-sub handler          | EventEmitter, Kafka, RabbitMQ                  |
| `webhook` | Third-party webhook receiver           | GitHub, Stripe, Twilio webhooks                |
| `job`     | Scheduled or background job            | Bull, APScheduler, Sidekiq                     |
| `handler` | Message/stream handler                 | Kafka consumer, SQS handler, stream subscriber |
| `other`   | Custom or unknown invocation mechanism | For boundaries not fitting other kinds         |

---

## Properties

| Property          | Type      | Constraints | Notes                                                                                                       |
| ----------------- | --------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `id`              | string    | UNIQUE      | Composite: `snapshotId:kind:identifier`                                                                     |
| `snapshotId`      | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)                                                                    |
| `kind`            | enum      | Required    | "http" \| "grpc" \| "graphql" \| "cli" \| "export" \| "event" \| "webhook" \| "job" \| "handler" \| "other" |
| `identifier`      | string    | Required    | Kind-specific identifier (see below)                                                                        |
| `handlerSymbolId` | string    | Required    | Foreign key to [Symbol](./Symbol.md)                                                                        |
| `description`     | string    | Optional    | Boundary description                                                                                        |
| `createdAt`       | timestamp | Required    | When created in snapshot                                                                                    |

---

## Identifier Format by Kind

| Kind      | Identifier Format            | Example                                     |
| --------- | ---------------------------- | ------------------------------------------- |
| `http`    | `{verb}:{path}`              | `POST:/api/features`                        |
| `grpc`    | `{service}/{method}`         | `UserService/GetUser`                       |
| `graphql` | `{operation}:{field}`        | `Query:user` or `Mutation:createUser`       |
| `cli`     | `{command}:{subcommand}`     | `deploy:prod` or `migrate`                  |
| `export`  | `{modulePath}::{symbolName}` | `src/auth::validateToken`                   |
| `event`   | `{eventType}`                | `user.created` or `payment.failed`          |
| `webhook` | `{eventName}`                | `github.push` or `stripe.charge.success`    |
| `job`     | `{jobName}`                  | `send-digest-email`                         |
| `handler` | `{handlerName}`              | `KafkaMessageHandler` or `RabbitMQConsumer` |
| `other`   | `{description}`              | `health-check` or `custom-integration`      |

---

## Schema

```cypher
CREATE CONSTRAINT boundary_id_unique IF NOT EXISTS
FOR (n:Boundary) REQUIRE n.id IS UNIQUE;

CREATE INDEX boundary_kind IF NOT EXISTS
FOR (n:Boundary) ON (n.kind);

CREATE INDEX boundary_kind_identifier IF NOT EXISTS
FOR (n:Boundary) ON (n.kind, n.identifier);

-- HTTP REST endpoint
CREATE (b:Boundary {
  id: "snap-123:http:POST:/api/features",
  snapshotId: "snap-123",
  kind: "http",
  identifier: "POST:/api/features",
  handlerSymbolId: "snap-123:src/api/features.ts:createFeature:10:0",
  description: "Create a new feature",
  createdAt: timestamp()
})

-- CLI command
CREATE (cli:Boundary {
  id: "snap-123:cli:deploy:prod",
  snapshotId: "snap-123",
  kind: "cli",
  identifier: "deploy:prod",
  handlerSymbolId: "snap-123:src/cli/deploy.ts:deployProd:5:0",
  description: "Deploy to production",
  createdAt: timestamp()
})

-- Exported library function
CREATE (exp:Boundary {
  id: "snap-123:export:src/auth::validateToken",
  snapshotId: "snap-123",
  kind: "export",
  identifier: "src/auth::validateToken",
  handlerSymbolId: "snap-123:src/auth.ts:validateToken:10:0",
  description: "Token validation function",
  createdAt: timestamp()
})

-- Event/message handler
CREATE (evt:Boundary {
  id: "snap-123:event:user.created",
  snapshotId: "snap-123",
  kind: "event",
  identifier: "user.created",
  handlerSymbolId: "snap-123:src/events/user.ts:onUserCreated:20:0",
  description: "Handle user creation event",
  createdAt: timestamp()
})

-- Scheduled job
CREATE (job:Boundary {
  id: "snap-123:job:send-daily-digest",
  snapshotId: "snap-123",
  kind: "job",
  identifier: "send-daily-digest",
  handlerSymbolId: "snap-123:src/jobs/digest.ts:sendDailyDigest:5:0",
  description: "Send daily email digest",
  createdAt: timestamp()
})

-- gRPC service method
CREATE (grpc:Boundary {
  id: "snap-123:grpc:UserService/GetUser",
  snapshotId: "snap-123",
  kind: "grpc",
  identifier: "UserService/GetUser",
  handlerSymbolId: "snap-123:src/grpc/user-service.ts:getUser:15:0",
  description: "Fetch user by ID",
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
| `[:MUTATES {operation: 'READ'\|'WRITE'}]`     | [DataContract](DataContract.md)         | optional    | Data access            |
| `[:DEPENDS_ON {kind: 'SERVICE'}]`             | [ExternalService](./ExternalService.md) | optional    | External APIs          |
| `[:REFERENCES {kind: 'PATTERN'}]`             | [Pattern](./Pattern.md)                 | optional    | Pattern adherence      |
| `[:REFERENCES {kind: 'SIMILAR'}]`             | [Boundary](./Boundary.md)               | optional    | Similar boundaries     |
| `[:TRACKS {event: 'INTRODUCED'\|'MODIFIED'}]` | [Snapshot](./Snapshot.md)               | optional    | Evolution              |

### Incoming (4 edge types)

| Edge                          | Source                    | Cardinality | Notes              |
| ----------------------------- | ------------------------- | ----------- | ------------------ |
| `[:IN_SNAPSHOT]`              | [Snapshot](./Snapshot.md) | exactly 1   | Snapshot scoping   |
| `[:REALIZES {role: 'TESTS'}]` | [TestCase](./TestCase.md) | optional    | Tested by test     |
| `[:DOCUMENTS]`                | [SpecDoc](./SpecDoc.md)   | optional    | Documented by spec |

---

## Usage Patterns

### Find All Boundaries (Any Kind)

```cypher
MATCH (snap:Snapshot {id: $snapshotId})<-[:IN_SNAPSHOT]-(b:Boundary)
RETURN b
ORDER BY b.kind, b.identifier
```

### Find Boundaries by Kind

```cypher
-- All HTTP boundaries in snapshot
MATCH (snap:Snapshot {id: $snapshotId})<-[:IN_SNAPSHOT]-(b:Boundary {kind: 'http'})
RETURN b

-- All CLI commands
MATCH (b:Boundary {kind: 'cli'})
RETURN b

-- All exported functions (library)
MATCH (b:Boundary {kind: 'export'})
RETURN b
```

### Find Boundary Handler

```cypher
MATCH (b:Boundary {id: $boundaryId})-[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN handler
```

### Find Data Access for Boundary

```cypher
MATCH (b:Boundary {id: $boundaryId})-[r1:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
MATCH (handler)-[r2:MUTATES]->(entity:DataContract)
RETURN entity, r2.operation
```

### Find External Dependencies

```cypher
MATCH (b:Boundary {id: $boundaryId})-[r:DEPENDS_ON {kind: 'SERVICE'}]->(svc:ExternalService)
RETURN svc
```

### Find Tests for Boundary

```cypher
MATCH (b:Boundary {id: $boundaryId})-[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
MATCH (t:TestCase)-[r2:REALIZES {role: 'TESTS'}]->(handler)
RETURN t
```

### Find Boundaries Implementing Feature

```cypher
MATCH (f:Feature {id: $featureId})<-[r:REALIZES {role: 'IMPLEMENTS'}]-(b:Boundary)
RETURN b
```

### Cross-Kind Boundary Analysis

```cypher
-- Find all boundaries calling same external service
MATCH (svc:ExternalService {id: 'stripe'})
MATCH (b1:Boundary)-[:DEPENDS_ON {kind: 'SERVICE'}]->(svc)
MATCH (b2:Boundary)-[:DEPENDS_ON {kind: 'SERVICE'}]->(svc)
RETURN DISTINCT b1, b2, b1.kind, b2.kind
```

---

## Constraints & Indexes

- **Unique Index**: `boundary_id_unique` on `id`
- **Kind Index**: `boundary_kind` for filtering by type
- **Kind/Identifier Index**: `boundary_kind_identifier` for lookup
- **Cardinality**: Many boundaries per snapshot; exactly 1 handler symbol
- **ID Uniqueness**: (snapshotId, kind, identifier) is unique per snapshot

---

## Common Use Cases

1. **Interface discovery**: "All callable interfaces in snapshot"
2. **Kind-specific queries**: "All HTTP endpoints", "All CLI commands", "All exported functions",
   "All event handlers"
3. **Handler lookup**: "What function handles this boundary?"
4. **Feature mapping**: "Which boundaries implement the payment feature?"
5. **Test discovery**: "What tests cover this boundary?"
6. **Dependency analysis**: "Which boundaries depend on external service X?"
7. **Data access analysis**: "Which boundaries access the User entity?"
8. **Impact analysis**: "What breaks if I remove User entity?"
9. **Cross-kind interface analysis**: "Which HTTP endpoints and message handlers both use the same
   authentication?"
10. **Transport-agnostic interface analysis**: "Find all boundaries with similar handler patterns
    across different kinds"

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
