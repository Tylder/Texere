# Error Node (Optional, V2+)

**Purpose**: Track custom exceptions and error types for error flow analysis.

**Status**: Optional — Add when you need exception handling chains, error recovery patterns, or
error flow analysis.

---

## Schema

| Property      | Type      | Constraints | Notes                                                    |
| ------------- | --------- | ----------- | -------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:filePath:className`               |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                                  |
| `filePath`    | string    | Required    | File defining the error                                  |
| `name`        | string    | Required    | Error name (e.g., `PaymentError`, `ValidationException`) |
| `kind`        | enum      | Required    | "CUSTOM_ERROR" \| "BUILT_IN_ERROR" \| "EXCEPTION_CLASS"  |
| `baseClass`   | string    | Optional    | What it extends (e.g., `Error`, `Exception`)             |
| `description` | string    | Optional    | Error documentation / what causes it                     |
| `createdAt`   | timestamp | Required    | When indexed                                             |

```cypher
CREATE CONSTRAINT error_id_unique IF NOT EXISTS
FOR (n:Error) REQUIRE n.id IS UNIQUE;
```

---

## Relationships

| From → To      | Type         | Property | Meaning                              |
| -------------- | ------------ | -------- | ------------------------------------ |
| Symbol → Error | `[:THROWS]`  | —        | Symbol throws this error             |
| Symbol → Error | `[:CATCHES]` | —        | Symbol catches this error            |
| Error → Error  | `[:EXTENDS]` | —        | Error inheritance chain              |
| Symbol → Error | `[:HANDLES]` | —        | Symbol implements recovery for error |

---

## When to Use

Add `Error` nodes when:

- You need error flow analysis (which symbols throw/catch what)
- You're tracking error recovery patterns
- You need to find unhandled exceptions
- You want to understand exception hierarchies
- You're building observability for error rates by type

---

## Examples

### Custom Error Definition

```cypher
(error:Error {
  id: 'snap123:src/errors.ts:PaymentError',
  filePath: 'src/errors.ts',
  name: 'PaymentError',
  kind: 'CUSTOM_ERROR',
  baseClass: 'Error',
  description: 'Thrown when payment processing fails'
})
```

### Exception Class Hierarchy

```cypher
(baseError:Error {
  id: 'snap123:src/errors.ts:ApplicationError',
  name: 'ApplicationError',
  kind: 'EXCEPTION_CLASS',
  baseClass: 'Error'
})

(paymentError:Error {
  id: 'snap123:src/errors.ts:PaymentError',
  name: 'PaymentError',
  kind: 'CUSTOM_ERROR',
  baseClass: 'ApplicationError'
})

(paymentError)-[:EXTENDS]->(baseError)
```

### Error Throwing

```cypher
(sym:Symbol {name: 'chargeCard'})
  -[:THROWS]->
(error:Error {name: 'PaymentError'})
```

### Error Handling

```cypher
(sym:Symbol {name: 'chargeCard'})
  -[:THROWS]->
(error:Error {name: 'PaymentError'})

(handler:Symbol {name: 'handlePaymentError'})
  -[:CATCHES]->
(error)

(handler)-[:HANDLES]->(error)  -- Implements recovery
```

### Built-in Error

```cypher
(error:Error {
  id: 'snap123:builtin:TypeError',
  name: 'TypeError',
  kind: 'BUILT_IN_ERROR',
  baseClass: 'Error'
})

(sym:Symbol {name: 'parseJSON'})-[:THROWS]->(error)
(recovery:Symbol {name: 'handleTypeError'})-[:CATCHES]->(error)
```

---

## Query Patterns

### Find All Unhandled Exceptions

```cypher
MATCH (sym:Symbol)-[:THROWS]->(error:Error)
WHERE NOT (sym)-[:CATCHES]->(error)
RETURN sym, error
```

### Find Error Handling Chain

```cypher
MATCH (error:Error {name: 'PaymentError'})
MATCH (thrower:Symbol)-[:THROWS]->(error)
MATCH (catcher:Symbol)-[:CATCHES]->(error)
MATCH (handler:Symbol)-[:HANDLES]->(error)
RETURN thrower, catcher, handler
```

### Error Inheritance Hierarchy

```cypher
MATCH (child:Error)-[:EXTENDS*]->(parent:Error)
WHERE parent.name = 'ApplicationError'
RETURN child
```

### Find Error Hotspots

```cypher
-- Which symbols throw the most errors?
MATCH (sym:Symbol)-[:THROWS]->(error:Error)
WITH sym, COUNT(DISTINCT error) as errorCount
RETURN sym, errorCount
ORDER BY errorCount DESC
LIMIT 10
```

### Error Recovery Rate

```cypher
-- What % of thrown errors are caught?
MATCH (thrown:Symbol)-[:THROWS]->(error:Error)
WITH COUNT(DISTINCT error) as totalThrown
MATCH (caught:Symbol)-[:CATCHES]->(error2:Error)
WITH totalThrown, COUNT(DISTINCT error2) as totalCaught
RETURN totalCaught * 100.0 / totalThrown as recoveryPercent
```

---

## V1 → V2 Migration

**V1 (Current)**:

- Exceptions inferred from Symbol analysis
- No explicit Error nodes

**V2 Migration**:

1. Add `Error` node type
2. Parse custom error definitions from code
3. Create Error nodes with inheritance
4. Link symbols that throw/catch via `[:THROWS]`, `[:CATCHES]`
5. Track exception handling coverage

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §2.4.2
- **Node Catalog**: `docs/specs/feature/indexer/nodes/README.md`
- **Related Nodes**: Symbol
