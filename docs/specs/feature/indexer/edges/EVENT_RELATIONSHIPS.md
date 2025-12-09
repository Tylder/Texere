# Event Relationships – PUBLISHES, CONSUMES, EMITS, LISTENS_TO (V2+)

**Category**: Message Flow  
**Status**: Optional (v2+) — Only applicable when using [Message](../nodes/Message.md) and
[Boundary](../nodes/Boundary.md) nodes.  
**Semantic**: "What publishes/consumes/emits/listens to this message?"

---

## Purpose

Captures pub/sub and event-driven message flows (Kafka, RabbitMQ, event classes, etc.).

---

## Properties (All Event Edges)

| Property    | Type      | Required | Notes                     |
| ----------- | --------- | -------- | ------------------------- |
| `createdAt` | timestamp | Yes      | When relationship created |

---

## Sub-Types & Patterns

### [:PUBLISHES] – Boundary Publishing Messages

A Boundary (HTTP endpoint, gRPC service, Lambda, etc.) publishes an event/message.

```cypher
-- HTTP endpoint publishes event
(boundary:Boundary {
  kind: 'HTTP',
  endpoint: '/api/charge'
})-[:PUBLISHES]->(msg:Message {
  topic: 'payment-processed',
  kind: 'KAFKA_TOPIC'
})

-- Lambda function publishes S3 event
(boundary:Boundary {
  kind: 'LAMBDA',
  endpoint: 'processS3Upload'
})-[:PUBLISHES]->(msg:Message {
  topic: 'files-uploaded',
  kind: 'EVENT_CLASS'
})
```

**Semantic**: Boundary emits this message when invoked.

**Common patterns**:

- HTTP endpoint triggers Kafka topic
- Lambda publishes to SNS/SQS
- gRPC service emits event

### [:CONSUMES] – Boundary Consuming Messages

A Boundary consumes/listens to events from a message queue or topic.

```cypher
-- Kafka consumer
(boundary:Boundary {
  kind: 'CONSUMER',
  endpoint: 'payment-processed'
})-[:CONSUMES]->(msg:Message {
  topic: 'payment-processed',
  kind: 'KAFKA_TOPIC'
})

-- SQS consumer
(boundary:Boundary {
  kind: 'CONSUMER',
  endpoint: 'email-notifications'
})-[:CONSUMES]->(msg:Message {
  topic: 'email-notifications',
  kind: 'SQS_QUEUE'
})
```

**Semantic**: Boundary is triggered by this message/event.

**Common patterns**:

- Kafka consumer group
- SQS worker
- Event listener

### [:EMITS] – Symbol Emitting Messages

A Symbol directly emits/publishes an event or message.

```cypher
-- Function emits custom event
(sym:Symbol {name: 'createUser'})-[:EMITS]->(msg:Message {
  topic: 'UserCreatedEvent',
  kind: 'EVENT_CLASS'
})

-- Symbol publishes to queue
(sym:Symbol {name: 'sendEmailNotification'})-[:EMITS]->(msg:Message {
  topic: 'email-queue',
  kind: 'SQS_QUEUE'
})
```

**Semantic**: Symbol code directly creates/sends this message.

**Common patterns**:

- Event emitter pattern (Node.js EventEmitter)
- Message producer
- Direct publish call

### [:LISTENS_TO] – Symbol Listening for Messages

A Symbol listens for or handles events from a message source.

```cypher
-- Event listener
(sym:Symbol {name: 'handleUserCreated'})-[:LISTENS_TO]->(msg:Message {
  topic: 'UserCreatedEvent',
  kind: 'EVENT_CLASS'
})

-- Queue consumer
(sym:Symbol {name: 'processEmailQueue'})-[:LISTENS_TO]->(msg:Message {
  topic: 'email-notifications',
  kind: 'SQS_QUEUE'
})
```

**Semantic**: Symbol is registered to handle this message.

**Common patterns**:

- Event listener registration
- Message handler
- Consumer callback

---

## Source → Target Pairs

| Source   | Edge       | Target  | Cardinality | Notes                      |
| -------- | ---------- | ------- | ----------- | -------------------------- |
| Boundary | PUBLISHES  | Message | optional    | Boundary publishes message |
| Boundary | CONSUMES   | Message | optional    | Boundary consumes message  |
| Symbol   | EMITS      | Message | optional    | Symbol emits message       |
| Symbol   | LISTENS_TO | Message | optional    | Symbol listens for message |

---

## Query Patterns

### Find Event Flow for a Message

```cypher
MATCH (msg:Message {topic: 'payment-processed'})
OPTIONAL MATCH (pub:Boundary)-[:PUBLISHES]->(msg)
OPTIONAL MATCH (cons:Boundary)-[:CONSUMES]->(msg)
RETURN {
  topic: msg.topic,
  kind: msg.kind,
  publishers: COLLECT(DISTINCT pub.endpoint),
  consumers: COLLECT(DISTINCT cons.endpoint)
}
```

### Find All Messages Published by a Boundary

```cypher
MATCH (boundary:Boundary {endpoint: '/api/charge'})
MATCH (boundary)-[:PUBLISHES]->(msg:Message)
RETURN msg.topic, msg.kind, msg.description
```

### Find All Consumers of a Message

```cypher
MATCH (msg:Message {topic: $topicName})
MATCH (consumer)-[:CONSUMES|LISTENS_TO]->(msg)
RETURN DISTINCT consumer.endpoint as consumers
```

### Event Flow Chain (End-to-End)

```cypher
-- HTTP endpoint → message → handler symbol
MATCH (boundary:Boundary {kind: 'HTTP'})
MATCH (boundary)-[:PUBLISHES]->(msg:Message)
MATCH (consumer:Boundary {kind: 'CONSUMER'})-[:CONSUMES]->(msg)
MATCH (consumer)-[:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN boundary.endpoint, msg.topic, consumer.endpoint, handler.name
```

### Find Messages with No Consumers

```cypher
-- Which messages are published but nobody consumes?
MATCH (msg:Message)
OPTIONAL MATCH (consumer)-[:CONSUMES|LISTENS_TO]->(msg)
WHERE consumer IS NULL
RETURN msg.topic, "ORPHANED" as status
```

### Message Coupling Analysis

```cypher
-- Which services/modules share messages?
MATCH (b1:Boundary)-[:PUBLISHES]->(msg:Message)
MATCH (b2:Boundary)-[:CONSUMES]->(msg)
WHERE b1 <> b2
RETURN b1.endpoint as publisher, msg.topic, b2.endpoint as consumer
ORDER BY msg.topic
```

### Message Bottlenecks

```cypher
-- Which messages have many consumers? (potential bottleneck)
MATCH (msg:Message)
MATCH (consumer)-[:CONSUMES|LISTENS_TO]->(msg)
WITH msg, COUNT(DISTINCT consumer) as consumerCount
WHERE consumerCount > 1
RETURN msg.topic, consumerCount, msg.kind
ORDER BY consumerCount DESC
```

### Schema Versioning Across Snapshots

```cypher
-- Track message schema changes
MATCH (snap1:Snapshot {id: $snap1Id})
MATCH (snap2:Snapshot {id: $snap2Id})
MATCH (msg1:Message {topic: $topicName})-[:IN_SNAPSHOT]->(snap1)
MATCH (msg2:Message {topic: $topicName})-[:IN_SNAPSHOT]->(snap2)
WHERE msg1.schema <> msg2.schema
RETURN snap1.timestamp, msg1.schema, snap2.timestamp, msg2.schema
```

---

## Common Use Cases

1. **Event Flow Tracing**: Understand message flow through system
2. **Dependency Discovery**: Which services couple via messages?
3. **Performance Analysis**: Which messages have high fan-out?
4. **Observability**: Track event publishing/consumption in logs
5. **Schema Evolution**: Monitor message schema changes
6. **Failure Analysis**: Which consumers might miss events if producer fails?
7. **Data Lineage**: Track data transformations through event pipeline

---

## Implementation Notes

### PUBLISHES vs EMITS

- **PUBLISHES**: Used with [Boundary](../nodes/Boundary.md) nodes (boundarys)
- **EMITS**: Used with [Symbol](../nodes/Symbol.md) nodes (internal functions)

Choose based on abstraction level:

```cypher
-- HTTP endpoint (boundary) publishes
(boundary:Boundary {kind: 'HTTP'})-[:PUBLISHES]->(msg:Message)

-- Internal function emits
(sym:Symbol {name: 'logEvent'})-[:EMITS]->(msg:Message)
```

### CONSUMES vs LISTENS_TO

- **CONSUMES**: Used with [Boundary](../nodes/Boundary.md) nodes (consumer group/endpoint)
- **LISTENS_TO**: Used with [Symbol](../nodes/Symbol.md) nodes (handler callback)

```cypher
-- Consumer boundary (Kafka consumer group, SQS worker)
(boundary:Boundary {kind: 'CONSUMER'})-[:CONSUMES]->(msg:Message)

-- Symbol handler
(sym:Symbol {name: 'handleEvent'})-[:LISTENS_TO]->(msg:Message)
```

---

## V2+ Migration

**When to create**:

1. You have enabled [Message](../nodes/Message.md) nodes
2. You have event-driven architecture (Kafka, RabbitMQ, etc.)
3. You need to trace event flows

**Pattern**:

```cypher
-- Example: HTTP endpoint publishes to Kafka
MATCH (snap:Snapshot {id: $snapshotId})
MATCH (boundary:Boundary {kind: 'HTTP', endpoint: '/api/charge'})-[:IN_SNAPSHOT]->(snap)
MATCH (msg:Message {topic: 'payment-processed'})-[:IN_SNAPSHOT]->(snap)
MERGE (boundary)-[:PUBLISHES]->(msg)

-- Consumer listens
MATCH (consumer:Boundary {kind: 'CONSUMER', endpoint: 'payment-processed'})
MERGE (consumer)-[:CONSUMES]->(msg)

-- Handler symbol
MATCH (handler:Symbol {name: 'handlePayment'})
MERGE (handler)-[:LISTENS_TO]->(msg)
```

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §3
- **Message Node**: `docs/specs/feature/indexer/nodes/Message.md`
- **Boundary Node**: `docs/specs/feature/indexer/nodes/Boundary.md`
- **Symbol Node**: `docs/specs/feature/indexer/nodes/Symbol.md`
- **LOCATION Edge**: [LOCATION.md](./LOCATION.md) (for HANDLED_BY role)
