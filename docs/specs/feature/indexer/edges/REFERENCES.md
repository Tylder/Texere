# [:REFERENCES] – Code Relations

**Category**: Code Relations  
**Semantic**: "What does this reference?"

---

## Purpose

Captures code relationships between symbols, modules, patterns, and endpoints. Consolidates:
function calls, type references, imports, pattern adherence, and embedding-based similarity.

**Key Characteristic**: Single relationship type with `type` property to differentiate sub-types.
Enables multi-modal code analysis queries.

---

## Properties

| Property     | Type      | Required | Notes                                                      |
| ------------ | --------- | -------- | ---------------------------------------------------------- |
| `type`       | enum      | Yes      | 'CALL' \| 'TYPE_REF' \| 'IMPORT' \| 'PATTERN' \| 'SIMILAR' |
| `line`       | integer   | Optional | Line number in source (for CALL, TYPE_REF, IMPORT)         |
| `col`        | integer   | Optional | Column number in source                                    |
| `confidence` | float     | Optional | LLM extraction confidence (0.0–1.0)                        |
| `distance`   | float     | Optional | Embedding distance (for SIMILAR)                           |
| `createdAt`  | timestamp | Yes      | When relationship created                                  |

---

## Sub-Types

### CALL – Function/Method Calls

```cypher
(caller:Symbol)-[r:REFERENCES {type: 'CALL', line: 42, col: 10}]->(callee:Symbol)
(endpoint:Endpoint)-[r:REFERENCES {type: 'CALL'}]->(handler:Symbol)
(module:Module)-[r:REFERENCES {type: 'CALL'}]->(symbol:Symbol)
```

**Semantic**: Direct invocation of function/method.

**Source → Target**:

- Symbol → Symbol (call graph)
- Symbol → Pattern (calls pattern implementation)
- Endpoint → Symbol (handler)
- Module → Symbol (module-level calls)

### TYPE_REF – Type References

```cypher
(symbol:Symbol)-[r:REFERENCES {type: 'TYPE_REF', line: 25, col: 5}]->(type:Symbol)
(symbol:Symbol)-[r:REFERENCES {type: 'TYPE_REF'}]->(entity:DataContract)
```

**Semantic**: Use of type/interface/class in type annotations, inheritance, generics.

**Source → Target**:

- Symbol → Symbol (type reference)
- Symbol → DataContract (data model reference)

### IMPORT – Module Imports

```cypher
(symbol:Symbol)-[r:REFERENCES {type: 'IMPORT', line: 1, col: 0}]->(imported:Symbol)
(file:File)-[r:REFERENCES {type: 'IMPORT'}]->(module:Module)
```

**Semantic**: Import statements, `require()`, or module dependencies.

**Source → Target**:

- Symbol → Symbol (imported symbol)
- File → Module (module import)

### PATTERN – Pattern Adherence

```cypher
(symbol:Symbol)-[r:REFERENCES {type: 'PATTERN', confidence: 0.85}]->(pattern:Pattern)
(module:Module)-[r:REFERENCES {type: 'PATTERN'}]->(pattern:Pattern)
(endpoint:Endpoint)-[r:REFERENCES {type: 'PATTERN'}]->(pattern:Pattern)
```

**Semantic**: Code adheres to or exemplifies design pattern.

**Source → Target**:

- Symbol → Pattern (implements pattern)
- Module → Pattern (follows pattern)
- Endpoint → Pattern (REST pattern adherence)

### SIMILAR – Embedding Similarity

```cypher
(symbol1:Symbol)-[r:REFERENCES {type: 'SIMILAR', distance: 0.15}]->(symbol2:Symbol)
(feature1:Feature)-[r:REFERENCES {type: 'SIMILAR', distance: 0.22}]->(feature2:Feature)
(service1:ExternalService)-[r:REFERENCES {type: 'SIMILAR', distance: 0.18}]->(service2:ExternalService)
```

**Semantic**: Semantic similarity based on embeddings (Qdrant).

**Source → Target**:

- Symbol → Symbol (similar implementations)
- Symbol → Symbol (code duplication detection)
- Feature → Feature (similar features)
- ExternalService → ExternalService (similar services)

---

## Source → Target Pairs

| Source          | Type     | Target          | Cardinality | Notes                |
| --------------- | -------- | --------------- | ----------- | -------------------- |
| Symbol          | CALL     | Symbol          | optional    | Function calls       |
| Symbol          | CALL     | Pattern         | optional    | Pattern calls        |
| Endpoint        | CALL     | Symbol          | optional    | Handler              |
| Module          | CALL     | Symbol          | optional    | Module-level calls   |
| Symbol          | TYPE_REF | Symbol          | optional    | Type annotations     |
| Symbol          | TYPE_REF | DataContract    | optional    | Data model refs      |
| Symbol          | IMPORT   | Symbol          | optional    | Imported symbols     |
| File            | IMPORT   | Module          | optional    | Module imports       |
| Symbol          | PATTERN  | Pattern         | optional    | Pattern adherence    |
| Module          | PATTERN  | Pattern         | optional    | Module pattern       |
| Endpoint        | PATTERN  | Pattern         | optional    | REST pattern         |
| Symbol          | SIMILAR  | Symbol          | optional    | Embedding similarity |
| Feature         | SIMILAR  | Feature         | optional    | Feature similarity   |
| ExternalService | SIMILAR  | ExternalService | optional    | Service similarity   |

---

## Schema

```cypher
-- Indexes for code analysis
CREATE INDEX references_type IF NOT EXISTS
FOR ()-[r:REFERENCES]-() ON (r.type);

CREATE INDEX references_type_line IF NOT EXISTS
FOR ()-[r:REFERENCES]-() ON (r.type, r.line);

CREATE INDEX references_distance IF NOT EXISTS
FOR ()-[r:REFERENCES {type: 'SIMILAR'}]-() ON (r.distance);

-- Example: Call graph
MATCH (sym:Symbol {id: 'snap-123:src/auth/jwt.ts:validateToken:10:0'})
  -[r:REFERENCES {type: 'CALL', line: 15}]->(target:Symbol)
RETURN sym, target, r.line, r.col
```

---

## Query Patterns

### Call Graph Analysis

```cypher
-- Direct calls from symbol
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {type: 'CALL'}]->(target:Symbol)
RETURN target, r.line, r.col
ORDER BY r.line

-- Transitive call chain (depth 3)
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {type: 'CALL'}*0..3]->(reachable:Symbol)
RETURN DISTINCT reachable

-- Who calls this symbol?
MATCH (caller:Symbol)-[r:REFERENCES {type: 'CALL'}]->(sym:Symbol {id: $symbolId})
RETURN caller, r.line
```

### Type Dependencies

```cypher
-- What types does symbol use?
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {type: 'TYPE_REF'}]->(type)
RETURN type

-- What's using this type?
MATCH (user:Symbol)-[r:REFERENCES {type: 'TYPE_REF'}]->(type:Symbol {id: $typeId})
RETURN user
```

### Import Analysis

```cypher
-- What does this file import?
MATCH (file:File {id: $fileId})-[r:REFERENCES {type: 'IMPORT'}]->(imported)
RETURN imported

-- Circular imports (transitive)
MATCH (file1:File)-[r:REFERENCES {type: 'IMPORT'}*2..]->(file1)
RETURN file1
```

### Pattern Matching

```cypher
-- What symbols follow this pattern?
MATCH (sym:Symbol)-[r:REFERENCES {type: 'PATTERN', confidence: confidence}]->(pat:Pattern {id: $patternId})
RETURN sym, r.confidence
ORDER BY r.confidence DESC

-- Most common patterns
MATCH (node)-[r:REFERENCES {type: 'PATTERN'}]->(pat:Pattern)
RETURN pat, COUNT(r) as usage_count
GROUP BY pat
ORDER BY usage_count DESC
LIMIT 10
```

### Similarity Search

```cypher
-- Find similar symbols (code duplication)
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {type: 'SIMILAR'}]->(similar:Symbol)
RETURN similar, r.distance
ORDER BY r.distance
LIMIT 10

-- High-similarity clusters (potential refactoring candidates)
MATCH (sym1:Symbol)-[r:REFERENCES {type: 'SIMILAR', distance: distance}]->(sym2:Symbol)
WHERE distance < 0.25
RETURN sym1, sym2, distance
ORDER BY distance
```

---

## Constraints & Indexes

- **Type Index**: `references_type` on `type` property for fast filtering
- **Line Indexes**: `references_type_line` for location-based queries
- **Distance Index**: `references_distance` for similarity searches
- **Cardinality**: High (symbols can reference many symbols)
- **No Uniqueness**: Multiple calls to same target allowed

---

## Common Use Cases

1. **Call graph**: "What does this function call?"
2. **Dependency analysis**: "What types does this import?"
3. **Pattern detection**: "Which symbols implement pattern X?"
4. **Code duplication**: "Find similar functions"
5. **Impact analysis**: "What breaks if I change this type?"
6. **Coverage analysis**: "Is this symbol tested?"

---

## Performance Notes

- **Optimal**: Call graphs up to depth 5–10
- **Traversal Cost**: O(breadth × depth); can be expensive for complex graphs
- **Caching**: Consider caching call graphs for frequently queried symbols
- **Batch Queries**: Use `COLLECT` for aggregating caller/callee relationships

---

## Implementation Notes

### Line/Col Tracking

- `line`: 1-indexed
- `col`: 0-indexed
- Used for IDE integration (go-to-definition, rename refactoring)

### Confidence Scoring

- For PATTERN and SIMILAR: 0.0–1.0 from LLM/embedding extraction
- 1.0 = certain (exact match); <0.5 = speculative

### Distance Metric

- For SIMILAR: Euclidean distance in embedding space
- Lower = more similar
- Typical range: 0.0–1.0 (normalized)

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Symbol.md](../nodes/Symbol.md) – Symbol definition
- [Pattern.md](../nodes/Pattern.md) – Pattern definition
- [Endpoint.md](../nodes/Endpoint.md) – Endpoint definition
- [Module.md](../nodes/Module.md) – Module definition
- [REALIZES.md](./REALIZES.md) – Feature implementation (different semantics)
- [MUTATES.md](./MUTATES.md) – Data flow (different semantics)
