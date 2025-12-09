# Error Relationships – THROWS, CATCHES, HANDLES, EXTENDS (V2+)

**Category**: Error Flow  
**Status**: Optional (v2+) — Only applicable when using [Error](../nodes/Error.md) nodes.  
**Semantic**: "What throws/catches/handles/extends this error?"

---

## Purpose

Captures error handling flows, exception hierarchies, and error recovery patterns.

---

## Properties (All Error Edges)

| Property    | Type      | Required | Notes                     |
| ----------- | --------- | -------- | ------------------------- |
| `createdAt` | timestamp | Yes      | When relationship created |

---

## Sub-Types & Patterns

### [:THROWS] – Symbol Throwing Error

A Symbol throws or raises a specific error.

```cypher
(sym:Symbol {
  name: 'chargeCard'
})-[:THROWS]->(error:Error {
  name: 'PaymentError',
  kind: 'CUSTOM_ERROR'
})

-- Built-in errors
(sym:Symbol {name: 'parseJSON'})-[:THROWS]->(error:Error {
  name: 'TypeError',
  kind: 'BUILT_IN_ERROR'
})
```

**Semantic**: Symbol code throws this error in normal operation.

**Common patterns**:

- Validation errors
- Network failures
- Permission denied
- Out of memory

### [:CATCHES] – Symbol Catching Error

A Symbol catches or handles a specific error type.

```cypher
(handler:Symbol {
  name: 'tryChargeCard'
})-[:CATCHES]->(error:Error {
  name: 'PaymentError'
})

-- Generic error handler
(sym:Symbol {name: 'wrapWithErrorHandling'})-[:CATCHES]->(error:Error {
  name: 'Error',
  kind: 'BUILT_IN_ERROR'
})
```

**Semantic**: Symbol has a try/catch block for this error.

**Common patterns**:

- Try-catch blocks
- Error middleware
- Error boundary components

### [:HANDLES] – Symbol Implementing Error Recovery

A Symbol implements recovery or remediation for an error.

```cypher
(handler:Symbol {
  name: 'handlePaymentError'
})-[:HANDLES]->(error:Error {
  name: 'PaymentError'
})

(recovery:Symbol {
  name: 'retryWithFallback'
})-[:HANDLES]->(error:Error {
  name: 'NetworkError'
})
```

**Semantic**: Symbol provides recovery logic for this error (e.g., retry, fallback, logging).

**Common patterns**:

- Retry logic
- Fallback handlers
- Error logging
- User notification

### [:EXTENDS] – Error Inheritance Hierarchy

An Error extends another Error (inheritance/parent-child).

```cypher
(customError:Error {
  name: 'ValidationError',
  baseClass: 'ApplicationError'
})-[:EXTENDS]->(baseError:Error {
  name: 'ApplicationError',
  baseClass: 'Error'
})

-- Inheritance chain
(customError)-[:EXTENDS]->(baseError)
(baseError)-[:EXTENDS]->(rootError:Error {
  name: 'Error',
  kind: 'BUILT_IN_ERROR'
})
```

**Semantic**: Error class inherits from parent error class.

**Common patterns**:

- Custom error hierarchies
- Exception class inheritance
- Domain-specific error types

---

## Source → Target Pairs

| Source | Edge    | Target | Cardinality | Notes                 |
| ------ | ------- | ------ | ----------- | --------------------- |
| Symbol | THROWS  | Error  | optional    | Symbol throws error   |
| Symbol | CATCHES | Error  | optional    | Symbol catches error  |
| Symbol | HANDLES | Error  | optional    | Symbol recovers error |
| Error  | EXTENDS | Error  | optional    | Error extends parent  |

---

## Query Patterns

### Find All Exceptions Thrown by Symbol

```cypher
MATCH (sym:Symbol {name: $symbolName})
MATCH (sym)-[:THROWS]->(error:Error)
RETURN error.name, error.kind, error.description
```

### Find Error Handling Chain

```cypher
MATCH (thrower:Symbol)-[:THROWS]->(error:Error {name: 'PaymentError'})
OPTIONAL MATCH (catcher:Symbol)-[:CATCHES]->(error)
OPTIONAL MATCH (handler:Symbol)-[:HANDLES]->(error)
RETURN {
  error: error.name,
  thrown_by: COLLECT(DISTINCT thrower.name),
  caught_by: COLLECT(DISTINCT catcher.name),
  handled_by: COLLECT(DISTINCT handler.name)
}
```

### Error Inheritance Hierarchy

```cypher
-- All errors in inheritance tree from ApplicationError
MATCH (child:Error)-[:EXTENDS*0..]->(parent:Error {name: 'ApplicationError'})
RETURN child.name, child.kind
ORDER BY child.name
```

### Find Unhandled Exceptions

```cypher
-- Errors thrown but never caught
MATCH (sym:Symbol)-[:THROWS]->(error:Error)
WHERE NOT (sym)-[:CATCHES]->(error)
AND NOT ()-[:CATCHES]->(error)
RETURN DISTINCT error.name, sym.name as throws_in, "UNHANDLED" as status
ORDER BY error.name
```

### Error Recovery Coverage

```cypher
-- What % of thrown errors are caught?
WITH
  [(thrower:Symbol)-[:THROWS]->(e:Error) | e] as thrown,
  [(catcher:Symbol)-[:CATCHES]->(e:Error) | e] as caught
RETURN {
  total_thrown: SIZE(DISTINCT thrown),
  total_caught: SIZE(DISTINCT caught),
  coverage_percent: (SIZE(DISTINCT caught) * 100.0) / SIZE(DISTINCT thrown)
}
```

### Find Error Hotspots

```cypher
-- Which symbols throw the most errors?
MATCH (sym:Symbol)-[:THROWS]->(error:Error)
WITH sym, COUNT(DISTINCT error) as errorCount
RETURN sym.name, errorCount, "HOTSPOT" as status
ORDER BY errorCount DESC
LIMIT 10
```

### Error Recovery Paths

```cypher
-- For a specific error, show complete handling flow
MATCH (error:Error {name: 'PaymentError'})
MATCH (thrower:Symbol)-[:THROWS]->(error)
MATCH (catcher:Symbol)-[:CATCHES]->(error)
MATCH (catcher)-[r:REFERENCES {type: 'CALL'}]->(recovery:Symbol)
MATCH (recovery)-[:HANDLES]->(error)
RETURN thrower.name as throws, catcher.name as catches, recovery.name as recovers
```

### Symbol Exception Signature

```cypher
-- What exceptions can be thrown through a call chain?
MATCH (entry:Symbol {name: $entryPoint})
MATCH (entry)-[:REFERENCES {type: 'CALL'}*]->(called:Symbol)
MATCH (called)-[:THROWS]->(error:Error)
RETURN DISTINCT error.name
ORDER BY error.name
```

### Error Type Distribution

```cypher
-- Breakdown of error kinds in system
MATCH (error:Error)
RETURN error.kind, COUNT(*) as count, COLLECT(error.name) as errors
ORDER BY count DESC
```

---

## Common Use Cases

1. **Exception Handling Audit**: Are all thrown errors handled?
2. **Error Recovery**: What errors have recovery logic?
3. **Exception Hierarchies**: Model domain-specific error types
4. **Robustness Analysis**: Which symbols throw many errors?
5. **Resilience Patterns**: Identify retry and fallback logic
6. **Observability**: Track error flows in logs
7. **API Design**: Document error contracts
8. **Quality**: Ensure critical errors don't propagate uncaught

---

## Implementation Notes

### THROWS vs CATCHES vs HANDLES

The three edges represent different semantic relationships:

```cypher
-- Symbol throws error (declaration)
(chargePayment:Symbol)-[:THROWS]->(PaymentError)

-- Different symbol catches that error
(paymentController:Symbol)-[:CATCHES]->(PaymentError)

-- Even different symbol implements recovery
(errorLogger:Symbol)-[:HANDLES]->(PaymentError)

-- Complete flow:
chargePayment() → throws PaymentError
paymentController() → catches PaymentError
errorLogger() → logs/retries (handles)
```

### Best Practices

1. **Comprehensive Throwing**: Mark all errors a symbol can throw
2. **Catch at Boundaries**: Catch at Boundary/Boundary level when possible
3. **Implement Handlers**: For critical errors, create explicit recovery
4. **Document Hierarchies**: Model error inheritance for clarity
5. **Test Coverage**: Add tests for error paths

---

## V2+ Migration

**When to create**:

1. You have enabled [Error](../nodes/Error.md) nodes
2. You need error flow analysis
3. You want exception hierarchy modeling

**Pattern**:

```cypher
-- Example: Payment service error handling
MATCH (snap:Snapshot {id: $snapshotId})

-- Define error hierarchy
CREATE (baseError:Error {
  id: 'snap123:src/errors.ts:ApplicationError',
  name: 'ApplicationError',
  kind: 'CUSTOM_ERROR',
  baseClass: 'Error'
})-[:IN_SNAPSHOT]->(snap)

CREATE (paymentError:Error {
  id: 'snap123:src/errors.ts:PaymentError',
  name: 'PaymentError',
  kind: 'CUSTOM_ERROR',
  baseClass: 'ApplicationError'
})-[:IN_SNAPSHOT]->(snap)

-- Link hierarchy
MERGE (paymentError)-[:EXTENDS]->(baseError)

-- Link to symbols
MATCH (chargePayment:Symbol {name: 'chargeCard'})
MERGE (chargePayment)-[:THROWS]->(paymentError)

MATCH (controller:Symbol {name: 'handleChargeRequest'})
MERGE (controller)-[:CATCHES]->(paymentError)

MATCH (logger:Symbol {name: 'logPaymentFailure'})
MERGE (logger)-[:HANDLES]->(paymentError)
```

---

## References

- **Graph Schema Spec**: `docs/specs/feature/indexer/graph_schema_spec.md` §3
- **Error Node**: `docs/specs/feature/indexer/nodes/Error.md`
- **Symbol Node**: `docs/specs/feature/indexer/nodes/Symbol.md`
- **REFERENCES Edge**: [REFERENCES.md](./REFERENCES.md) (for CALL type in recovery chains)
