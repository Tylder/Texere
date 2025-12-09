# Feature Node

**Category**: Cross-Snapshot  
**Purpose**: User-facing feature (persistent across snapshots).

---

## Properties

| Property      | Type      | Constraints | Notes                                   |
| ------------- | --------- | ----------- | --------------------------------------- |
| `id`          | string    | UNIQUE      | Feature identifier (from features.yaml) |
| `name`        | string    | Required    | Feature name                            |
| `description` | string    | Optional    | Feature description                     |
| `embeddingId` | string    | Optional    | Qdrant vector ID                        |
| `isDeleted`   | boolean   | Required    | Soft delete marker                      |
| `createdAt`   | timestamp | Required    | When first introduced                   |
| `updatedAt`   | timestamp | Required    | Last modification                       |

---

## Schema

```cypher
CREATE CONSTRAINT feature_id_unique IF NOT EXISTS
FOR (n:Feature) REQUIRE n.id IS UNIQUE;

CREATE INDEX feature_name IF NOT EXISTS
FOR (n:Feature) ON (n.name);

CREATE (f:Feature {
  id: "payment-processing",
  name: "Payment Processing",
  description: "Handle card payments via Stripe",
  embeddingId: "vec-abc123",
  isDeleted: false,
  createdAt: timestamp(1700000000),
  updatedAt: timestamp()
})
```

---

## Relationships

### Outgoing (6 edge types)

| Edge                                          | Target                    | Cardinality | Notes                        |
| --------------------------------------------- | ------------------------- | ----------- | ---------------------------- |
| `[:REALIZES {role: 'IMPLEMENTS'}]`            | [Symbol](./Symbol.md)     | optional    | Symbols implementing feature |
| `[:REALIZES {role: 'IMPLEMENTS'}]`            | [Boundary](./Boundary.md) | optional    | Boundaries serving feature   |
| `[:REALIZES {role: 'TESTS'}]`                 | [TestCase](./TestCase.md) | optional    | Tests verifying feature      |
| `[:DEPENDS_ON]`                               | [Feature](./Feature.md)   | optional    | Feature depends on feature   |
| `[:TRACKS {event: 'INTRODUCED'\|'MODIFIED'}]` | [Snapshot](./Snapshot.md) | optional    | Evolution tracking           |
| `[:REFERENCES {kind: 'SIMILAR'}]`             | [Feature](./Feature.md)   | optional    | Embedding similarity         |

### Incoming (6 edge types)

| Edge                               | Source                    | Cardinality | Notes                   |
| ---------------------------------- | ------------------------- | ----------- | ----------------------- |
| `[:REALIZES {role: 'IMPLEMENTS'}]` | [Symbol](./Symbol.md)     | optional    | Reverse: implementation |
| `[:REALIZES {role: 'IMPLEMENTS'}]` | [Boundary](./Boundary.md) | optional    | Reverse: serving        |
| `[:REALIZES {role: 'VERIFIES'}]`   | [TestCase](./TestCase.md) | optional    | Reverse: verification   |
| `[:DOCUMENTS]`                     | [SpecDoc](./SpecDoc.md)   | optional    | Documented by spec      |
| `[:IMPACTS {type: 'AFFECTS'}]`     | [Incident](./Incident.md) | optional    | Affected by incident    |
| `[:DEPENDS_ON]`                    | [Feature](./Feature.md)   | optional    | Reverse: dependency     |

---

## Lifecycle

1. **Definition**: Defined in `features.yaml` (manual registry)
2. **Introduction**: First symbol/endpoint implementing it creates `[:TRACKS {event: 'INTRODUCED'}]`
   edge
3. **Modification**: Symbol/endpoint changes create `[:TRACKS {event: 'MODIFIED'}]` edge
4. **Soft Delete**: Marked `isDeleted: true` when removed from registry (no hard delete)
5. **Persistence**: Persists across snapshots (snapshot-independent)

---

## Usage Patterns

### Get Feature Context

```cypher
MATCH (f:Feature {id: $featureId})

-- What implements it?
OPTIONAL MATCH (sym:Symbol)-[r1:REALIZES {role: 'IMPLEMENTS'}]->(f)
OPTIONAL MATCH (ep:Boundary)-[r2:REALIZES {role: 'IMPLEMENTS'}]->(f)

-- What tests it?
OPTIONAL MATCH (t:TestCase)-[r3:REALIZES {role: 'VERIFIES'}]->(f)

-- What docs it?
OPTIONAL MATCH (doc:SpecDoc)-[r4:DOCUMENTS {target_role: 'FEATURE'}]->(f)

RETURN {
  feature: f,
  implementingSymbols: collect(DISTINCT sym),
  implementingBoundaries: collect(DISTINCT ep),
  verifyingTests: collect(DISTINCT t),
  documentation: collect(DISTINCT doc)
}
```

### Find All Features in Snapshot

```cypher
MATCH (f:Feature)-[r:TRACKS {event: 'INTRODUCED'|'MODIFIED'}]->(snap:Snapshot {id: $snapshotId})
RETURN DISTINCT f
```

### Feature Dependency Graph

```cypher
MATCH (f:Feature {id: $featureId})-[:DEPENDS_ON*]->(dep:Feature)
RETURN dep
```

### Find Similar Features

```cypher
MATCH (f:Feature {id: $featureId})-[r:REFERENCES {kind: 'SIMILAR'}]->(similar:Feature)
RETURN similar, r.distance
```

### Impact Analysis

```cypher
-- What features are affected by incident?
MATCH (i:Incident {id: $incidentId})-[r:IMPACTS {type: 'AFFECTS'}]->(f:Feature)
RETURN f
```

---

## Constraints & Indexes

- **Unique Index**: `feature_id_unique` on `id`
- **Name Index**: `feature_name` on `name`
- **Soft Delete**: Never hard deleted; `isDeleted: true` marks obsolete features
- **Cross-Snapshot**: Persists across commits (referenced via `[:TRACKS]`)

---

## Feature Definition (features.yaml)

Features are declared in `features.yaml`:

```yaml
features:
  payment-processing:
    name: 'Payment Processing'
    description: 'Handle card payments via Stripe'
    status: 'active'

  analytics-dashboard:
    name: 'Analytics Dashboard'
    description: 'Real-time metrics and reporting'
    status: 'planning'
```

---

## Common Use Cases

1. **Feature context**: "All code implementing feature X"
2. **Documentation**: "Get docs for feature"
3. **Testing**: "What tests verify feature?"
4. **Impact analysis**: "Which features affected by incident?"
5. **Dependency graph**: "Feature X depends on Y?"
6. **Release planning**: "What changed in feature X?"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Symbol.md](./Symbol.md) – Implementation
- [Boundary.md](./Boundary.md) – API serving feature
- [TestCase.md](./TestCase.md) – Feature verification
- [SpecDoc.md](./SpecDoc.md) – Feature documentation
- [../edges/REALIZES.md](../edges/REALIZES.md) – Implementation
- [../edges/TRACKS.md](../edges/TRACKS.md) – Evolution
