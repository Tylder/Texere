# [:LOCATION] – Position & Ownership

**Category**: Position & Ownership  
**Semantic**: "Where is this, and what role?"

---

## Purpose

Represents location and ownership relationships: where symbols handle endpoints, where endpoints are
defined, where test cases are located.

**Key Characteristic**: Separate from `[:CONTAINS]` hierarchy; enables role-based ownership queries
vs. tree traversal.

**Distinction from CONTAINS**:

- `[:CONTAINS]` = tree structure (breadth-first, transitive)
- `[:LOCATION]` = role-based semantics (direct, filtered by role property)

---

## Properties

| Property    | Type      | Required | Notes                                    |
| ----------- | --------- | -------- | ---------------------------------------- |
| `role`      | enum      | Yes      | 'HANDLED_BY' \| 'IN_FILE' \| 'IN_MODULE' |
| `createdAt` | timestamp | Yes      | When relationship created                |

---

## Sub-Types

### HANDLED_BY – Symbol Handles Boundary

```cypher
(endpoint:Boundary)-[r:LOCATION {role: 'HANDLED_BY'}]->(symbol:Symbol)
```

**Semantic**: Symbol is the handler/implementation of HTTP endpoint.

**Properties**:

- Direct 1-to-1 relationship
- Symbol must be in same or parent module as endpoint

**Common**:

- Express route handler
- FastAPI endpoint function
- Spring REST controller method

### IN_FILE – Location in File

```cypher
(endpoint:Boundary)-[r:LOCATION {role: 'IN_FILE'}]->(file:File)
(testCase:TestCase)-[r:LOCATION {role: 'IN_FILE'}]->(file:File)
```

**Semantic**: Node is defined/located in file.

**Purpose**: Direct file reference (complements `[:CONTAINS]` hierarchy for specific queries).

### IN_MODULE – Location in Module

```cypher
(endpoint:Boundary)-[r:LOCATION {role: 'IN_MODULE'}]->(module:Module)
(testCase:TestCase)-[r:LOCATION {role: 'IN_MODULE'}]->(module:Module)
```

**Semantic**: Node belongs to/is scoped within module.

**Purpose**: Module-level queries without traversing full hierarchy.

---

## Source → Target Pairs

| Source   | Role       | Target | Cardinality | Notes               |
| -------- | ---------- | ------ | ----------- | ------------------- |
| Boundary | HANDLED_BY | Symbol | exactly 1   | Handler requirement |
| Boundary | IN_FILE    | File   | exactly 1   | File requirement    |
| Boundary | IN_MODULE  | Module | exactly 1   | Module requirement  |
| TestCase | IN_FILE    | File   | exactly 1   | File requirement    |
| TestCase | IN_MODULE  | Module | exactly 1   | Module requirement  |

---

## Schema

```cypher
-- Index for ownership/location queries
CREATE INDEX location_role IF NOT EXISTS
FOR ()-[r:LOCATION]-() ON (r.role);

-- Enforce cardinality for HANDLED_BY
CREATE CONSTRAINT endpoint_handler_unique IF NOT EXISTS
FOR (ep:Boundary)
REQUIRE SIZE([(ep)-[:LOCATION {role: 'HANDLED_BY'}]->()]) = 1;

-- Example: Find handler for endpoint
MATCH (ep:Boundary {id: 'snap-123:POST:/api/payment'})
  -[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN handler
```

---

## Query Patterns

### Find Boundary Handler

```cypher
-- Get handler for specific endpoint
MATCH (ep:Boundary {id: $endpointId})
  -[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN handler

-- All endpoints and their handlers
MATCH (ep:Boundary)-[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN ep, handler

-- Boundaries in module and their handlers
MATCH (ep:Boundary)-[r:LOCATION {role: 'IN_MODULE'}]->(mod:Module {id: $moduleId})
OPTIONAL MATCH (ep)-[r2:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN ep, handler
```

### File Location

```cypher
-- All boundaries defined in file
MATCH (file:File {id: $fileId})
  <-[r:LOCATION {role: 'IN_FILE'}]-(ep:Boundary)
RETURN ep

-- Test cases in file
MATCH (file:File {id: $fileId})
  <-[r:LOCATION {role: 'IN_FILE'}]-(test:TestCase)
RETURN test

-- Boundaries and tests in same file
MATCH (file:File {id: $fileId})<-[:LOCATION {role: 'IN_FILE'}]-(item)
RETURN item, labels(item) as type
```

### Module Inventory

```cypher
-- All boundaries in module
MATCH (mod:Module {id: $moduleId})
  <-[r:LOCATION {role: 'IN_MODULE'}]-(ep:Boundary)
RETURN ep

-- Test cases in module
MATCH (mod:Module {id: $moduleId})
  <-[r:LOCATION {role: 'IN_MODULE'}]-(test:TestCase)
RETURN test

-- Full boundary location info
MATCH (mod:Module {id: $moduleId})
  <-[r1:LOCATION {role: 'IN_MODULE'}]-(ep:Boundary)
OPTIONAL MATCH (ep)-[r2:LOCATION {role: 'IN_FILE'}]->(file:File)
OPTIONAL MATCH (ep)-[r3:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN ep, file, handler
```

### Handler Analysis

```cypher
-- Handlers for payment-related boundaries
MATCH (ep:Boundary {path: '/api/payment*'})
  -[r:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
RETURN handler, COUNT(ep) as boundary_count
GROUP BY handler

-- Boundaries handled by symbol
MATCH (sym:Symbol {id: $symbolId})
  <-[r:LOCATION {role: 'HANDLED_BY'}]-(ep:Boundary)
RETURN ep

-- Test coverage for endpoint handlers
MATCH (ep:Boundary)-[r1:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
OPTIONAL MATCH (test:TestCase)-[r2:REALIZES {role: 'TESTS'}]->(handler)
RETURN ep, handler, COUNT(test) as test_count
```

### Missing Locations

```cypher
-- Boundaries without handler (invalid state)
MATCH (ep:Boundary)
WHERE NOT EXISTS((ep)-[:LOCATION {role: 'HANDLED_BY'}]->())
RETURN ep

-- Test cases not in any file (invalid state)
MATCH (test:TestCase)
WHERE NOT EXISTS((test)-[:LOCATION {role: 'IN_FILE'}]->())
RETURN test
```

---

## Constraints & Indexes

- **Role Index**: `location_role` for filtering by role
- **Handler Uniqueness**: Enforce exactly 1 `HANDLED_BY` per Boundary
- **File/Module Cardinality**: Exactly 1 `IN_FILE` and 1 `IN_MODULE` per Boundary/TestCase
- **No Cycles**: LOCATION edges never form cycles

---

## Cardinality Invariants

| Relationship                   | Source    | Cardinality      |
| ------------------------------ | --------- | ---------------- |
| Boundary → HANDLED_BY → Symbol | exactly 1 | Handler required |
| Boundary → IN_FILE → File      | exactly 1 | File required    |
| Boundary → IN_MODULE → Module  | exactly 1 | Module required  |
| TestCase → IN_FILE → File      | exactly 1 | File required    |
| TestCase → IN_MODULE → Module  | exactly 1 | Module required  |

---

## Common Use Cases

1. **Boundary discovery**: "What function handles this API route?"
2. **File inventory**: "What endpoints are defined in this file?"
3. **Module organization**: "All endpoints in auth module?"
4. **Test location**: "Where are tests for this endpoint?"
5. **Code navigation**: "Go to handler for this endpoint"
6. **Responsibility mapping**: "Who owns endpoint X?"

---

## Implementation Notes

### Handler Assignment

When indexing endpoints, handler symbol is determined via:

1. **Explicit annotation** (e.g., `@handler('POST /api/users')`)
2. **Framework convention** (e.g., Express route → function name matching)
3. **LLM semantic analysis** (match endpoint path to function definitions)

### File/Module Redundancy

Why both `IN_FILE` and `IN_MODULE`?

- `IN_FILE`: Direct file lookup (fast, specific)
- `IN_MODULE`: Module-level aggregation (no traversal needed)
- `[:CONTAINS]`: Hierarchy traversal (slower, but captures structure)

Trade-off: Redundant relationships but enable role-specific queries.

---

## Performance Notes

- **Lookup Cost**: O(1) direct relationship lookups
- **Aggregation**: Fast via `IN_MODULE` (no traversal)
- **Index Selectivity**: High (role property has low cardinality)

---

## Difference from CONTAINS

| Aspect            | CONTAINS                | LOCATION             |
| ----------------- | ----------------------- | -------------------- |
| **Structure**     | Tree hierarchy          | Role-based ownership |
| **Transitivity**  | Transitive (`*`)        | Direct only          |
| **Cardinality**   | 1 per node (up to root) | 1 per role           |
| **Query Pattern** | Breadth-first traversal | Direct filtering     |
| **Index Type**    | Tree-optimized          | Property-based       |

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Boundary.md](../nodes/Boundary.md) – Boundary definition
- [TestCase.md](../nodes/TestCase.md) – Test definition
- [Symbol.md](../nodes/Symbol.md) – Handler symbol
- [File.md](../nodes/File.md) – File definition
- [Module.md](../nodes/Module.md) – Module definition
- [CONTAINS.md](./CONTAINS.md) – Hierarchy (complementary)
- [REALIZES.md](./REALIZES.md) – Testing (test-symbol relationship)
