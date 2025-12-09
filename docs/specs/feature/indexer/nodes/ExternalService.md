# ExternalService Node

**Category**: Cross-Snapshot  
**Purpose**: Third-party API or external integration (e.g., Stripe, Auth0, OpenAI). Persists across
snapshots.

---

## Properties

| Property      | Type      | Constraints | Notes                                                                |
| ------------- | --------- | ----------- | -------------------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Service identifier (e.g., "stripe", "auth0")                         |
| `name`        | string    | Required    | Human-readable service name                                          |
| `description` | string    | Optional    | Service description                                                  |
| `url`         | string    | Optional    | API endpoint or documentation URL                                    |
| `category`    | enum      | Optional    | "payment" \| "auth" \| "messaging" \| "analytics" \| "ai" \| "other" |
| `isDeleted`   | boolean   | Required    | Soft delete marker                                                   |
| `createdAt`   | timestamp | Required    | When first discovered/indexed                                        |
| `updatedAt`   | timestamp | Required    | Last modification                                                    |

---

## Schema

```cypher
CREATE CONSTRAINT external_service_id_unique IF NOT EXISTS
FOR (n:ExternalService) REQUIRE n.id IS UNIQUE;

CREATE INDEX external_service_name IF NOT EXISTS
FOR (n:ExternalService) ON (n.name);

CREATE (svc:ExternalService {
  id: "stripe",
  name: "Stripe",
  description: "Payment processing platform",
  url: "https://api.stripe.com",
  category: "payment",
  isDeleted: false,
  createdAt: timestamp(),
  updatedAt: timestamp()
})
```

---

## Relationships

### Outgoing (2 edge types)

| Edge                              | Target                                  | Cardinality | Notes                             |
| --------------------------------- | --------------------------------------- | ----------- | --------------------------------- |
| `[:DEPENDS_ON]`                   | [ExternalService](./ExternalService.md) | optional    | Service depends on other services |
| `[:REFERENCES {kind: 'SIMILAR'}]` | [ExternalService](./ExternalService.md) | optional    | Similar services (embedding)      |

### Incoming (3 edge types)

| Edge                              | Source                                  | Cardinality | Notes               |
| --------------------------------- | --------------------------------------- | ----------- | ------------------- |
| `[:DEPENDS_ON {kind: 'SERVICE'}]` | [Symbol](./Symbol.md)                   | optional    | Called by symbols   |
| `[:DEPENDS_ON {kind: 'SERVICE'}]` | [Endpoint](./Endpoint.md)               | optional    | Called by endpoints |
| `[:DEPENDS_ON]`                   | [ExternalService](./ExternalService.md) | optional    | Reverse: dependency |

---

## Lifecycle

1. **Discovery**: Detected during code analysis (LLM extraction of API calls)
2. **Creation**: First reference to service creates node
3. **Persistence**: Survives across snapshots (cross-snapshot node)
4. **Soft Delete**: Marked `isDeleted: true` if no longer referenced
5. **No Hard Delete**: Maintains historical record for incident tracking

---

## Usage Patterns

### Find All External Services in Codebase

```cypher
MATCH (svc:ExternalService {isDeleted: false})
RETURN svc, svc.name, svc.category
ORDER BY svc.category, svc.name
```

### What Symbols Call a Service?

```cypher
MATCH (svc:ExternalService {id: 'stripe'})
OPTIONAL MATCH (sym:Symbol)-[r:DEPENDS_ON {kind: 'SERVICE'}]->(svc)
OPTIONAL MATCH (ep:Endpoint)-[r2:DEPENDS_ON {kind: 'SERVICE'}]->(svc)
RETURN {
  service: svc,
  symbols: collect(DISTINCT sym),
  endpoints: collect(DISTINCT ep)
}
```

### Find Service Dependencies

```cypher
-- What does this service depend on?
MATCH (svc:ExternalService {id: 'stripe'})-[:DEPENDS_ON]->(dep:ExternalService)
RETURN dep
```

### Find Similar Services (Embedding-Based)

```cypher
MATCH (svc:ExternalService {id: 'stripe'})-[r:REFERENCES {kind: 'SIMILAR'}]->(similar:ExternalService)
RETURN similar, r.distance
ORDER BY r.distance
LIMIT 5
```

### Integration Impact Analysis

```cypher
-- Find all symbols that depend on payment services
MATCH (sym:Symbol)-[r:DEPENDS_ON {kind: 'SERVICE'}]->(svc:ExternalService {category: 'payment'})
RETURN sym, svc, COUNT(*) as dependency_count
GROUP BY sym, svc
```

---

## Constraints & Indexes

- **Unique Index**: `external_service_id_unique` on `id`
- **Name Index**: `external_service_name` on `name`
- **Soft Delete**: Never hard deleted; marked `isDeleted: true` when obsolete
- **Cross-Snapshot**: Persists across commits; referenced via incoming `[:DEPENDS_ON]` edges

---

## Common Use Cases

1. **Integration catalog**: "What external services does our system use?"
2. **Service impact**: "What breaks if Stripe API changes?"
3. **Security audit**: "Which symbols call Auth0?"
4. **Dependency management**: "What services do we depend on?"
5. **Cost analysis**: "Which features use paid services?"
6. **Incident root cause**: "Did a Stripe outage affect us?"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Symbol.md](./Symbol.md) – Service consumers
- [Endpoint.md](./Endpoint.md) – API endpoints calling services
- [../edges/DEPENDS_ON.md](../edges/DEPENDS_ON.md) – Service dependencies
- [../edges/REFERENCES.md](../edges/REFERENCES.md) – Similarity relationships
