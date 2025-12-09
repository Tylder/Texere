# Message Node (Optional, V2+)

**Purpose**: Track pub/sub events and messages (Kafka, RabbitMQ, event sources, etc.).

**Status**: Optional — Add when you have event-driven architecture, need to trace event flows, or
have pub/sub systems.

---

## Schema

| Property      | Type      | Constraints | Notes                                                                              |
| ------------- | --------- | ----------- | ---------------------------------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:topicOrQueueName`                                           |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                                                            |
| `topic`       | string    | Required    | Topic/queue name (e.g., `payment-processed`, `user-created-events`)                |
| `kind`        | enum      | Required    | "KAFKA_TOPIC" \| "SQS_QUEUE" \| "PUBSUB_TOPIC" \| "EVENT_CLASS" \| "MESSAGE_CLASS" |
| `schema`      | string    | Optional    | Message schema (JSON schema, Protobuf definition, OpenAPI, etc.)                   |
| `description` | string    | Optional    | What this message represents / when it's published                                 |
| `createdAt`   | timestamp | Required    | When indexed                                                                       |

```cypher
CREATE CONSTRAINT message_id_unique IF NOT EXISTS
FOR (n:Message) REQUIRE n.id IS UNIQUE;
```

---

## Relationships

| From → To          | Type            | Property | Meaning                         |
| ------------------ | --------------- | -------- | ------------------------------- |
| Boundary → Message | `[:PUBLISHES]`  | —        | Boundary publishes this message |
| Boundary → Message | `[:CONSUMES]`   | —        | Boundary consumes this message  |
| Symbol → Message   | `[:EMITS]`      | —        | Symbol emits this message/event |
| Symbol → Message   | `[:LISTENS_TO]` | —        | Symbol listens for this message |

---

## When to Use

Add `Message` nodes when:

- You have Kafka/RabbitMQ or event-driven architecture
- You need event flow tracing (who publishes, who consumes)
- You want to track message versioning/schema evolution
- You need to understand event coupling between services
- You're modeling message-driven systems (event sourcing, CQRS)

---

## Examples

### Kafka Topic

```cypher
(msg:Message {
  id: 'snap123:payment-processed',
  topic: 'payment-processed',
  kind: 'KAFKA_TOPIC',
  description: 'Published when a payment is successfully processed',
  schema: '{
    "type": "object",
    "properties": {
      "paymentId": {"type": "string"},
      "amount": {"type": "number"},
      "timestamp": {"type": "string"}
    }
  }'
})

(publisher:Boundary {kind: 'HTTP', endpoint: '/api/charge'})
  -[:PUBLISHES]->
(msg)

(consumer:Boundary {kind: 'CONSUMER', endpoint: 'payment-processed'})
  -[:CONSUMES]->
(msg)
```

### SQS Queue

```cypher
(msg:Message {
  id: 'snap123:email-notifications',
  topic: 'email-notifications',
  kind: 'SQS_QUEUE',
  description: 'Queue for sending email notifications'
})

(sender:Symbol {name: 'sendWelcomeEmail'})-[:EMITS]->(msg)
(worker:Symbol {name: 'processEmailQueue'})-[:LISTENS_TO]->(msg)
```

### Event Class

```cypher
(msg:Message {
  id: 'snap123:UserCreatedEvent',
  topic: 'UserCreatedEvent',
  kind: 'EVENT_CLASS',
  description: 'Emitted when a user account is created'
})

(sym:Symbol {name: 'createUser'})-[:EMITS]->(msg)
(listener1:Symbol {name: 'sendWelcomeEmail'})-[:LISTENS_TO]->(msg)
(listener2:Symbol {name: 'logUserSignup'})-[:LISTENS_TO]->(msg)
```

### Event Bus / Pub-Sub Topic

```cypher
(msg:Message {
  id: 'snap123:orders.created',
  topic: 'orders.created',
  kind: 'PUBSUB_TOPIC',
  description: 'Published when a new order is created'
})

-- Multiple publishers (competing producers)
(orderService:Boundary)-[:PUBLISHES]->(msg)
(legacyService:Boundary)-[:PUBLISHES]->(msg)

-- Multiple subscribers
(inventoryService:Boundary)-[:CONSUMES]->(msg)
(shippingService:Boundary)-[:CONSUMES]->(msg)
(analyticsService:Boundary)-[:CONSUMES]->(msg)
```

---

## Query Patterns

### Find Event Flow Chain

```cypher
-- Which services are involved in payment flow?
MATCH (pub:Boundary)-[:PUBLISHES]->(msg:Message {topic: 'payment-processed'})
MATCH (sub:Boundary)-[:CONSUMES]->(msg)
RETURN pub.endpoint, msg.topic, sub.endpoint
```

### Find Consumers of a Message

```cypher
MATCH (msg:Message {topic: 'user-created-events'})
MATCH (consumer:Boundary)-[:CONSUMES]->(msg)
RETURN consumer
```

### Find Message Bottlenecks

```cypher
-- Which messages are consumed by the most services?
MATCH (msg:Message)
MATCH (consumer:Boundary)-[:CONSUMES]->(msg)
WITH msg, COUNT(DISTINCT consumer) as consumerCount
RETURN msg.topic, consumerCount
ORDER BY consumerCount DESC
```

### Trace End-to-End Event Flow

```cypher
-- Show complete flow: HTTP endpoint → event → handlers
MATCH (boundary:Boundary {kind: 'HTTP'})
  -[:PUBLISHES]->(msg:Message)
MATCH (consumer:Boundary)-[:CONSUMES]->(msg)
MATCH (consumer)-[:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN boundary.endpoint, msg.topic, handler.name
```

### Find Services Without Consumers

```cypher
-- Which messages are published but nobody consumes?
MATCH (msg:Message)
OPTIONAL MATCH (consumer:Boundary)-[:CONSUMES]->(msg)
WHERE consumer IS NULL
RETURN msg.topic
```

---

## Schema Versioning

Track message schema evolution:

```cypher
(msg:Message {
  id: 'snap123:payment-processed',
  topic: 'payment-processed'
})

-- Snapshot 1: v1 schema
(snap1:Snapshot)-[:INTRODUCED_IN]->(msg)
SET msg.schema = '{"version": 1, "properties": {"paymentId": "string"}}'

-- Snapshot 2: v2 schema (added amount)
(snap2:Snapshot)-[:MODIFIED_IN]->(msg)
SET msg.schema = '{"version": 2, "properties": {"paymentId": "string", "amount": "number"}}'

-- Query: find when schema changed
MATCH (msg)-[r:TRACKS {event: 'MODIFIED'}]->(snap:Snapshot)
RETURN msg.topic, snap.timestamp
```

---

## V1 → V2 Migration

**V1 (Current)**:

- Events/messages inferred from Symbol analysis
- No explicit Message nodes

**V2 Migration**:

1. Add `Message` node type
2. Parse message definitions (Kafka topic configs, event classes)
3. Create Message nodes with schema
4. Link Boundaries and Symbols via `[:PUBLISHES]`, `[:CONSUMES]`, `[:EMITS]`, `[:LISTENS_TO]`
5. Track message coupling between services

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §2.4.3
- **Node Catalog**: `docs/specs/feature/indexer/nodes/README.md`
- **Related Nodes**: Boundary, Symbol
