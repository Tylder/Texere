# [:MUTATES] – Data Flow

**Category**: Data  
**Semantic**: "What data does this access?"

---

## Purpose

Represents data access patterns: reading from or writing to database entities (Prisma models, SQL
tables, ORM entities). Consolidates READ and WRITE operations into single relationship type.

**Key Characteristic**: `operation` property distinguishes read vs. write; enables data dependency
analysis.

---

## Properties

| Property     | Type      | Required | Notes                               |
| ------------ | --------- | -------- | ----------------------------------- |
| `operation`  | enum      | Yes      | 'READ' \| 'WRITE'                   |
| `confidence` | float     | Optional | LLM extraction confidence (0.0–1.0) |
| `createdAt`  | timestamp | Yes      | When relationship created           |

---

## Sub-Types

### READ – Data Read Operations

```cypher
(symbol:Symbol)-[r:MUTATES {operation: 'READ'}]->(entity:SchemaEntity)
(endpoint:Endpoint)-[r:MUTATES {operation: 'READ'}]->(entity:SchemaEntity)
```

**Semantic**: Code reads from database entity (SELECT, query, fetch).

**Common READ operations**:

- `db.user.findUnique()`
- `SELECT * FROM users`
- `User.query().get()`

### WRITE – Data Write Operations

```cypher
(symbol:Symbol)-[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity)
(endpoint:Endpoint)-[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity)
```

**Semantic**: Code writes to database entity (INSERT, UPDATE, DELETE).

**Common WRITE operations**:

- `db.user.create()`
- `INSERT INTO users VALUES`
- `User.create().save()`

---

## Source → Target Pairs

| Source   | Operation     | Target       | Cardinality | Notes                |
| -------- | ------------- | ------------ | ----------- | -------------------- |
| Symbol   | READ \| WRITE | SchemaEntity | optional    | Symbol data access   |
| Endpoint | READ \| WRITE | SchemaEntity | optional    | Endpoint data access |

---

## Schema

```cypher
-- Index for data flow queries
CREATE INDEX mutates_operation IF NOT EXISTS
FOR ()-[r:MUTATES]-() ON (r.operation);

CREATE INDEX mutates_operation_target IF NOT EXISTS
FOR ()-[r:MUTATES]->(n:SchemaEntity) ON (r.operation, n.id);

-- Example: Get all data accesses for an endpoint
MATCH (ep:Endpoint {id: 'snap-123:POST:/api/users'})
  -[r:MUTATES {operation: operation}]->(entity:SchemaEntity)
RETURN entity, r.operation
```

---

## Query Patterns

### Data Access Analysis

```cypher
-- What data does this symbol read/write?
MATCH (sym:Symbol {id: $symbolId})-[r:MUTATES]->(entity:SchemaEntity)
RETURN entity, r.operation
ORDER BY r.operation DESC

-- Get all entities accessed by symbol
MATCH (sym:Symbol {id: $symbolId})-[r:MUTATES]->(entity:SchemaEntity)
RETURN DISTINCT entity
```

### Impact Analysis

```cypher
-- What reads from User entity?
MATCH (reader)-[r:MUTATES {operation: 'READ'}]->(entity:SchemaEntity {name: 'User'})
RETURN reader

-- What writes to User entity?
MATCH (writer)-[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity {name: 'User'})
RETURN writer

-- Complete data dependency
MATCH (sym:Symbol)-[r:MUTATES {operation: op}]->(entity:SchemaEntity)
RETURN sym, entity, op
```

### Data Entity Coverage

```cypher
-- What accesses this entity?
MATCH (node)-[r:MUTATES]->(entity:SchemaEntity {id: $entityId})
RETURN node, r.operation

-- Entities with no read access (write-only)
MATCH (entity:SchemaEntity)
WHERE EXISTS((writer)-[:MUTATES {operation: 'WRITE'}]->(entity))
  AND NOT EXISTS((reader)-[:MUTATES {operation: 'READ'}]->(entity))
RETURN entity
```

### Endpoint Data Footprint

```cypher
-- What data does endpoint access?
MATCH (ep:Endpoint {id: $endpointId})
  -[r:MUTATES]->(entity:SchemaEntity)
RETURN entity, r.operation
ORDER BY r.operation

-- Endpoints reading User data
MATCH (ep:Endpoint)-[r:MUTATES {operation: 'READ'}]->(entity:SchemaEntity {name: 'User'})
RETURN ep, COUNT(r) as read_count
GROUP BY ep
```

### Data Modification Tracking

```cypher
-- All writes to entity (audit trail source)
MATCH (symbol:Symbol)-[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity {name: 'User'})
RETURN symbol
ORDER BY symbol.startLine

-- Write operations in endpoint
MATCH (ep:Endpoint {id: $endpointId})
  -[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity)
RETURN entity, COUNT(*) as write_count
GROUP BY entity
```

---

## Constraints & Indexes

- **Operation Index**: `mutates_operation` for READ/WRITE filtering
- **Compound Index**: `mutates_operation_target` for entity-based queries
- **Cardinality**: Moderate (1–20 edges per symbol/endpoint)
- **No Uniqueness**: Multiple reads/writes to same entity allowed

---

## Common Use Cases

1. **Data dependency**: "What database entities does this symbol access?"
2. **Impact analysis**: "What breaks if I rename this table?"
3. **Audit trail**: "What writes to the User table?"
4. **Security analysis**: "Who can read PII data?"
5. **Performance**: "Which queries access frequently?"
6. **Refactoring**: "Is this entity still used?"

---

## Implementation Notes

### Extraction Strategy

Data access detection is LLM-based (not syntactic). Common patterns:

**Symbol-level extraction**:

```python
# Detect reads
patterns = [
  r"db\.\w+\.find\w*",        # Prisma
  r"SELECT.*FROM",             # SQL
  r"\w+\.query\(\)",           # ORM
]

# Detect writes
patterns = [
  r"db\.\w+\.create",          # Prisma create
  r"INSERT|UPDATE|DELETE",     # SQL
  r"\w+\.save\(\)|\.delete()", # ORM
]
```

**Endpoint-level extraction**:

- Trace Symbol dependencies via call graph
- Aggregate transitive data accesses

### Confidence Scoring

- **Syntactic matches** (Prisma, direct SQL): 0.95–1.0
- **LLM semantic analysis**: 0.7–0.9 (depends on code clarity)
- **Transitive inference**: 0.5–0.8 (through call chains)

---

## Performance Notes

- **Query Cost**: O(symbols × entities) = large transitive expansions
- **Caching**: Consider caching data dependency graphs for frequently queried entities
- **Batch Analysis**: Use Cypher `COLLECT` for aggregating accesses

---

## Security Implications

### PII Data Protection

```cypher
-- Who accesses PII data (tagged SchemaEntity)?
MATCH (accessor)-[r:MUTATES]->(entity:SchemaEntity {isPII: true})
RETURN accessor, entity, r.operation
```

### Authorization Checks

```cypher
-- Endpoints writing to sensitive entities
MATCH (ep:Endpoint)-[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity {sensitive: true})
MATCH (ep)-[:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN ep, handler, entity
```

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Symbol.md](../nodes/Symbol.md) – Symbol definition
- [Endpoint.md](../nodes/Endpoint.md) – Endpoint definition
- [SchemaEntity.md](../nodes/SchemaEntity.md) – Database entity definition
- [REFERENCES.md](./REFERENCES.md) – Code relations (CALL for transitive analysis)
- [REALIZES.md](./REALIZES.md) – Feature implementation
