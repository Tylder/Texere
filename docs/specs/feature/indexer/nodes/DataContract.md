# DataContract Node

**Category**: Snapshot-Scoped  
**Purpose**: Database model/entity (Prisma model, SQLAlchemy class, TypeORM entity, SQL table).

---

## Properties

| Property      | Type      | Constraints | Notes                                         |
| ------------- | --------- | ----------- | --------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:entityName`            |
| `snapshotId`  | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)      |
| `name`        | string    | Required    | Entity name (e.g., "User", "Feature")         |
| `kind`        | enum      | Required    | "prisma-model" \| "sql-table" \| "orm-entity" |
| `description` | string    | Optional    | Entity description                            |
| `createdAt`   | timestamp | Required    | When created in snapshot                      |

---

## Schema

```cypher
CREATE CONSTRAINT schema_entity_id_unique IF NOT EXISTS
FOR (n:DataContract) REQUIRE n.id IS UNIQUE;

CREATE (se:DataContract {
  id: "snap-123:User",
  snapshotId: "snap-123",
  name: "User",
  kind: "prisma-model",
  description: "User account model",
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

| Edge                              | Source                    | Cardinality | Notes               |
| --------------------------------- | ------------------------- | ----------- | ------------------- |
| `[:CONTAINS]`                     | [Snapshot](./Snapshot.md) | optional    | Snapshot scoping    |
| `[:MUTATES {operation: 'READ'}]`  | [Symbol](./Symbol.md)     | optional    | Read by symbol      |
| `[:MUTATES {operation: 'READ'}]`  | [Endpoint](./Endpoint.md) | optional    | Read by endpoint    |
| `[:MUTATES {operation: 'WRITE'}]` | [Symbol](./Symbol.md)     | optional    | Written by symbol   |
| `[:MUTATES {operation: 'WRITE'}]` | [Endpoint](./Endpoint.md) | optional    | Written by endpoint |

---

## Sparse Node

DataContract has minimal outgoing edges (sparse). Primary value is as **target** of `[:MUTATES]`
edges.

---

## Usage Patterns

### Find All Symbols Reading Entity

```cypher
MATCH (sym:Symbol)-[r:MUTATES {operation: 'READ'}]->(se:DataContract {id: $entityId})
RETURN sym, r.confidence
```

### Find All Symbols Writing Entity

```cypher
MATCH (sym:Symbol)-[r:MUTATES {operation: 'WRITE'}]->(se:DataContract {id: $entityId})
RETURN sym, r.confidence
```

### Impact: Rename Entity

```cypher
-- Find all code that would be affected
MATCH (se:DataContract {name: 'User'})<-[r:MUTATES]-(x)
RETURN x, r.operation
```

### Find Endpoints Accessing Entity

```cypher
MATCH (ep:Endpoint)-[r:MUTATES {operation: 'READ'|'WRITE'}]->(se:DataContract {id: $entityId})
RETURN ep, r.operation
```

### Find All Entities in Schema

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS]->(se:DataContract)
RETURN se
```

---

## Constraints & Indexes

- **Unique Index**: `schema_entity_id_unique` on `id`
- **Cardinality**: Many entities per snapshot; exactly 1 per snapshot per name
- **Sparse Graph**: Few outgoing edges; primarily used as target

---

## Common Use Cases

1. **Data model queries**: "What entities exist in snapshot?"
2. **Impact analysis**: "What code accesses User entity?"
3. **Refactoring**: "All symbols touching Product table"
4. **Database schema evolution**: "When was entity added/removed?"

---

## Integration with Symbol & Endpoint

Data access relationships flow through both direct and transitive paths:

```
[Symbol] --[:MUTATES]--> [DataContract]
[Endpoint] --[:LOCATION {role: 'HANDLED_BY'}]--> [Symbol]
                                                       |
                                                   [:MUTATES]--> [DataContract]
```

Both direct and transitive queries are supported.

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Version scoping
- [Symbol.md](./Symbol.md) – Code accessing entity
- [Endpoint.md](./Endpoint.md) – API accessing entity
- [../edges/MUTATES.md](../edges/MUTATES.md) – Data flow
