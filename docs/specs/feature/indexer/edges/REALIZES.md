# [:REALIZES] – Implementation & Testing

**Category**: Implementation  
**Semantic**: "What implements, tests, or verifies this?"

---

## Purpose

Connects implementation artifacts (Symbol, Endpoint, TestCase) to their responsibilities (Feature,
TestCase). Consolidates: feature implementation, test coverage, and feature verification.

**Key Characteristic**: Multi-directional semantics (IMPLEMENTS, TESTS, VERIFIES) using `role`
property.

---

## Properties

| Property     | Type      | Required | Notes                                 |
| ------------ | --------- | -------- | ------------------------------------- |
| `role`       | enum      | Yes      | 'IMPLEMENTS' \| 'TESTS' \| 'VERIFIES' |
| `confidence` | float     | Optional | LLM extraction confidence (0.0–1.0)   |
| `createdAt`  | timestamp | Yes      | When relationship created             |

---

## Sub-Types

### IMPLEMENTS – Symbol/Endpoint Implements Feature

```cypher
(symbol:Symbol)-[r:REALIZES {role: 'IMPLEMENTS', confidence: 0.9}]->(feature:Feature)
(endpoint:Endpoint)-[r:REALIZES {role: 'IMPLEMENTS', confidence: 0.95}]->(feature:Feature)
```

**Semantic**: Code directly realizes/implements user-facing feature.

**Source → Target**:

- Symbol → Feature (symbol implements feature)
- Endpoint → Feature (endpoint serves feature)

**Common**: High confidence; typically 1+ symbols per feature; 0 or 1 endpoint per feature.

### TESTS – TestCase Tests Symbol/Endpoint

```cypher
(test:TestCase)-[r:REALIZES {role: 'TESTS', confidence: 0.99}]->(symbol:Symbol)
(test:TestCase)-[r:REALIZES {role: 'TESTS', confidence: 0.99}]->(endpoint:Endpoint)
```

**Semantic**: Test case covers/exercises symbol or endpoint.

**Source → Target**:

- TestCase → Symbol (unit test)
- TestCase → Endpoint (integration/e2e test)

**Common**: Very high confidence (syntactic match); typically many tests per symbol.

### VERIFIES – TestCase Verifies Feature

```cypher
(test:TestCase)-[r:REALIZES {role: 'VERIFIES', confidence: 0.85}]->(feature:Feature)
```

**Semantic**: Test case validates behavior of feature.

**Source → Target**:

- TestCase → Feature (feature verification)

**Common**: Medium–high confidence; requires semantic analysis to link test to feature.

---

## Source → Target Pairs

| Source   | Role       | Target   | Cardinality | Notes                 |
| -------- | ---------- | -------- | ----------- | --------------------- |
| Symbol   | IMPLEMENTS | Feature  | optional    | Core implementation   |
| Endpoint | IMPLEMENTS | Feature  | optional    | API entry point       |
| TestCase | TESTS      | Symbol   | optional    | Unit/integration test |
| TestCase | TESTS      | Endpoint | optional    | E2E test              |
| TestCase | VERIFIES   | Feature  | optional    | Feature verification  |

---

## Schema

```cypher
-- Index for feature implementation queries
CREATE INDEX realizes_role IF NOT EXISTS
FOR ()-[r:REALIZES]-() ON (r.role);

CREATE INDEX realizes_confidence IF NOT EXISTS
FOR ()-[r:REALIZES]-() ON (r.role, r.confidence);

-- Example: Get all symbols implementing a feature
MATCH (sym:Symbol)-[r:REALIZES {role: 'IMPLEMENTS', confidence: confidence}]->(f:Feature {id: 'auth'})
RETURN sym, r.confidence
ORDER BY r.confidence DESC
```

---

## Query Patterns

### Get Feature Context (Full Implementation Picture)

```cypher
-- What implements feature X?
MATCH (f:Feature {id: 'payment-processing'})
OPTIONAL MATCH (sym:Symbol)-[r1:REALIZES {role: 'IMPLEMENTS'}]->(f)
OPTIONAL MATCH (ep:Endpoint)-[r2:REALIZES {role: 'IMPLEMENTS'}]->(f)
OPTIONAL MATCH (test:TestCase)-[r3:REALIZES {role: 'VERIFIES'}]->(f)
RETURN {
  feature: f,
  implementingSymbols: collect(DISTINCT sym),
  implementingEndpoints: collect(DISTINCT ep),
  verifyingTests: collect(DISTINCT test)
}
```

### Symbol Implementation Coverage

```cypher
-- What features does this symbol implement?
MATCH (sym:Symbol {id: $symbolId})-[r:REALIZES {role: 'IMPLEMENTS'}]->(f:Feature)
RETURN f, r.confidence

-- What tests cover this symbol?
MATCH (sym:Symbol {id: $symbolId})<-[r:REALIZES {role: 'TESTS'}]-(test:TestCase)
RETURN test, test.kind, test.startLine
```

### Test Coverage Analysis

```cypher
-- What symbols are tested?
MATCH (test:TestCase)-[r:REALIZES {role: 'TESTS'}]->(sym:Symbol)
RETURN sym, COUNT(test) as test_count
GROUP BY sym

-- Untested symbols
MATCH (sym:Symbol {isDeleted: false})
WHERE NOT EXISTS((test:TestCase)-[:REALIZES {role: 'TESTS'}]->(sym))
RETURN sym
LIMIT 100
```

### Feature Test Coverage

```cypher
-- How many tests verify each feature?
MATCH (f:Feature)
OPTIONAL MATCH (test:TestCase)-[r:REALIZES {role: 'VERIFIES'}]->(f)
RETURN f.id, COUNT(test) as test_count
ORDER BY test_count DESC
```

### Confidence-Based Filtering

```cypher
-- High-confidence implementations only
MATCH (sym:Symbol)-[r:REALIZES {role: 'IMPLEMENTS', confidence: confidence}]->(f:Feature)
WHERE confidence >= 0.8
RETURN sym, f, r.confidence

-- Low-confidence test links (needs verification)
MATCH (test:TestCase)-[r:REALIZES {role: 'TESTS', confidence: confidence}]->(sym:Symbol)
WHERE confidence < 0.6
RETURN test, sym, r.confidence
```

---

## Constraints & Indexes

- **Role Index**: `realizes_role` for fast filtering by IMPLEMENTS/TESTS/VERIFIES
- **Confidence Index**: `realizes_confidence` for quality-based queries
- **Cardinality**: Moderate (1–10 edges per source node)
- **No Uniqueness**: Multiple symbols can implement same feature; multiple tests can cover same
  symbol

---

## Common Use Cases

1. **Feature documentation**: "What code implements feature X?"
2. **Test coverage**: "Is this symbol tested?"
3. **Feature validation**: "What tests verify feature X?"
4. **Release planning**: "What changed in feature X?"
5. **Refactoring**: "Which symbols can I safely change?"
6. **Impact analysis**: "What breaks if I modify this implementation?"

---

## Implementation Notes

### Confidence Scoring

- **IMPLEMENTS (Symbol→Feature)**: 0.7–1.0 (LLM-derived; can be speculative)
- **IMPLEMENTS (Endpoint→Feature)**: 0.95–1.0 (syntactic; very reliable)
- **TESTS**: 0.95–1.0 (syntactic; test name → symbol name matching)
- **VERIFIES**: 0.6–0.9 (LLM-derived; requires semantic understanding)

### Role-Based Filtering

Different roles serve different purposes:

- **IMPLEMENTS**: For feature documentation, release notes
- **TESTS**: For test coverage, quality metrics
- **VERIFIES**: For feature validation, acceptance testing

### Feature Completeness

Query to check if feature is fully implemented:

```cypher
MATCH (f:Feature {id: 'payment'})
OPTIONAL MATCH (sym:Symbol)-[:REALIZES {role: 'IMPLEMENTS'}]->(f)
OPTIONAL MATCH (ep:Endpoint)-[:REALIZES {role: 'IMPLEMENTS'}]->(f)
WHERE ep IS NOT NULL OR sym IS NOT NULL
RETURN f, 'implemented' as status
```

---

## Cross-References

- **Feature without implementation**: Potential incomplete feature
- **Test without implementation**: Potential orphaned test
- **Implementation without test**: Potential coverage gap

---

## Performance Notes

- **Optimal**: <100K features, <1M symbols
- **Bulk Queries**: `COLLECT` for aggregating implementation lists
- **Indexed Lookups**: O(log N) via confidence index

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Core schema
- [Symbol.md](../nodes/Symbol.md) – Symbol definition
- [Endpoint.md](../nodes/Endpoint.md) – Endpoint definition
- [Feature.md](../nodes/Feature.md) – Feature definition
- [TestCase.md](../nodes/TestCase.md) – Test definition
- [REFERENCES.md](./REFERENCES.md) – Code relations
- [MUTATES.md](./MUTATES.md) – Data flow
