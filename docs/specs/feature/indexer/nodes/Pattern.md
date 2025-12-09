# Pattern Node

**Category**: Cross-Snapshot  
**Purpose**: Code pattern (e.g., "express-middleware", "error-handling-try-catch").

---

## Properties

| Property      | Type      | Constraints | Notes                                                |
| ------------- | --------- | ----------- | ---------------------------------------------------- |
| `id`          | string    | UNIQUE      | Pattern identifier                                   |
| `name`        | string    | Required    | Pattern name (e.g., "express-middleware")            |
| `description` | string    | Optional    | Pattern description                                  |
| `source`      | enum      | Required    | "manual" (patterns.yaml) \| "heuristic" (discovered) |
| `createdAt`   | timestamp | Required    | When defined                                         |

---

## Schema

```cypher
CREATE CONSTRAINT pattern_id_unique IF NOT EXISTS
FOR (n:Pattern) REQUIRE n.id IS UNIQUE;

CREATE (p:Pattern {
  id: "express-middleware",
  name: "Express Middleware",
  description: "Standard Express middleware pattern",
  source: "manual",
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing (3 edge types)

| Edge                              | Target                    | Cardinality | Notes                           |
| --------------------------------- | ------------------------- | ----------- | ------------------------------- |
| `[:REFERENCES {kind: 'PATTERN'}]` | [Symbol](./Symbol.md)     | optional    | Symbols exemplifying pattern    |
| `[:REFERENCES {kind: 'PATTERN'}]` | [Boundary](./Boundary.md) | optional    | Boundaries exemplifying pattern |
| `[:REFERENCES {kind: 'PATTERN'}]` | [Module](./Module.md)     | optional    | Modules exemplifying pattern    |

### Incoming (4 edge types)

| Edge                              | Source                        | Cardinality | Notes                     |
| --------------------------------- | ----------------------------- | ----------- | ------------------------- |
| `[:REFERENCES {kind: 'PATTERN'}]` | [Symbol](./Symbol.md)         | optional    | Symbol follows pattern    |
| `[:REFERENCES {kind: 'PATTERN'}]` | [Boundary](./Boundary.md)     | optional    | Boundary follows pattern  |
| `[:REFERENCES {kind: 'PATTERN'}]` | [Module](./Module.md)         | optional    | Module follows pattern    |
| `[:DOCUMENTS]`                    | [StyleGuide](./StyleGuide.md) | optional    | Documented by style guide |

---

## Pattern Discovery

Patterns can originate from two sources:

| Source      | Method                      | Example                                 |
| ----------- | --------------------------- | --------------------------------------- |
| "manual"    | Declared in `patterns.yaml` | Express middleware, singleton, factory  |
| "heuristic" | Automatically detected      | Code structure matching known libraries |

---

## Usage Patterns

### Find Exemplars of Pattern

```cypher
MATCH (p:Pattern {id: $patternId})<-[r:REFERENCES {kind: 'PATTERN'}]-(x)
WHERE x:Symbol OR x:Boundary OR x:Module
RETURN x, r.confidence
ORDER BY r.confidence DESC
```

### Find Patterns Followed by Symbol

```cypher
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {kind: 'PATTERN'}]->(p:Pattern)
RETURN p, r.confidence
```

### Pattern Compliance

```cypher
-- Check if symbol follows pattern
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {kind: 'PATTERN'}]->(p:Pattern {id: $patternId})
RETURN r.confidence
```

### Find All Patterns

```cypher
MATCH (p:Pattern)
RETURN p
ORDER BY p.name
```

### Pattern Documentation

```cypher
MATCH (p:Pattern {id: $patternId})<-[r:DOCUMENTS]-(guide:StyleGuide)
RETURN guide
```

---

## Constraints & Indexes

- **Unique Index**: `pattern_id_unique` on `id`
- **Cardinality**: Many patterns; persistent across snapshots
- **Confidence**: `[:REFERENCES {kind: 'PATTERN', confidence: 0.0-1.0}]` indicates adherence
  strength

---

## Pattern Registry (patterns.yaml)

Patterns are declared in `patterns.yaml`:

```yaml
patterns:
  express-middleware:
    name: 'Express Middleware'
    description: 'Standard Express middleware pattern'
    source: 'manual'

  singleton:
    name: 'Singleton Pattern'
    description: 'Single instance of class'
    source: 'manual'
```

---

## Common Use Cases

1. **Pattern discovery**: "Show me examples of express-middleware pattern"
2. **Code consistency**: "Does this symbol follow the pattern?"
3. **Refactoring**: "All code not following pattern X"
4. **Education**: "Pattern examples and guides"
5. **Compliance**: "Verify style guide adherence"
6. **Best practices**: "Common patterns in codebase"

---

## Agent Integration

Agents can use patterns to:

- **Suggest**: "Use pattern X here"
- **Refactor**: "Convert code to follow pattern Y"
- **Learn**: "Show examples of pattern Z"
- **Validate**: "Check pattern adherence"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Symbol.md](./Symbol.md) – Code exemplifying pattern
- [Boundary.md](./Boundary.md) – API following pattern
- [Module.md](./Module.md) – Module structure
- [StyleGuide.md](./StyleGuide.md) – Pattern documentation
- [../edges/REFERENCES.md](../edges/REFERENCES.md) – Pattern adherence
