# TestCase Node

**Category**: Snapshot-Scoped  
**Purpose**: Single test (unit, integration, e2e).

---

## Properties

| Property     | Type      | Constraints | Notes                                                         |
| ------------ | --------- | ----------- | ------------------------------------------------------------- |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:filePath:testName`                     |
| `snapshotId` | string    | Required    | Foreign key to [Snapshot](./Snapshot.md)                      |
| `filePath`   | string    | Required    | Test file path                                                |
| `name`       | string    | Required    | Full test hierarchy (e.g., "Describe › Nested › should do X") |
| `kind`       | enum      | Required    | "unit" \| "integration" \| "e2e"                              |
| `startLine`  | integer   | Required    | Test location in file                                         |
| `createdAt`  | timestamp | Required    | When created in snapshot                                      |

---

## Schema

```cypher
CREATE CONSTRAINT test_case_id_unique IF NOT EXISTS
FOR (n:TestCase) REQUIRE n.id IS UNIQUE;

CREATE INDEX test_case_name IF NOT EXISTS
FOR (n:TestCase) ON (n.name);

CREATE (tc:TestCase {
  id: "snap-123:src/auth/__tests__/jwt.test.ts:JWT Authentication › validateToken › should validate valid token",
  snapshotId: "snap-123",
  filePath: "src/auth/__tests__/jwt.test.ts",
  name: "JWT Authentication › validateToken › should validate valid token",
  kind: "unit",
  startLine: 25,
  createdAt: timestamp()
})
```

---

## Relationships

### Outgoing (5 edge types)

| Edge                              | Target                    | Cardinality | Notes                 |
| --------------------------------- | ------------------------- | ----------- | --------------------- |
| `[:IN_SNAPSHOT]`                  | [Snapshot](./Snapshot.md) | exactly 1   | Version scoping       |
| `[:LOCATION {role: 'IN_FILE'}]`   | [File](./File.md)         | exactly 1   | Test file location    |
| `[:LOCATION {role: 'IN_MODULE'}]` | [Module](./Module.md)     | optional    | Test module           |
| `[:REALIZES {role: 'TESTS'}]`     | [Symbol](./Symbol.md)     | optional    | Tests symbol (direct) |
| `[:REALIZES {role: 'TESTS'}]`     | [Boundary](./Boundary.md) | optional    | Tests endpoint        |
| `[:REALIZES {role: 'VERIFIES'}]`  | [Feature](./Feature.md)   | optional    | Verifies feature      |

### Incoming (3 edge types)

| Edge                             | Source                    | Cardinality | Notes                     |
| -------------------------------- | ------------------------- | ----------- | ------------------------- |
| `[:CONTAINS]`                    | [Snapshot](./Snapshot.md) | optional    | Snapshot scoping          |
| `[:REALIZES {role: 'TESTS'}]`    | [Symbol](./Symbol.md)     | optional    | Reverse: symbol relation  |
| `[:REALIZES {role: 'VERIFIES'}]` | [Feature](./Feature.md)   | optional    | Reverse: feature relation |

---

## Test Classification

| Property | Value         | Heuristic                                                              |
| -------- | ------------- | ---------------------------------------------------------------------- |
| `kind`   | "unit"        | File path matches `*.test.ts`, `test_*.py`, or no prefix               |
| `kind`   | "integration" | File path contains "integration" or module indicates integration suite |
| `kind`   | "e2e"         | File path contains "e2e" or "cypress" patterns                         |

---

## Usage Patterns

### Find All Tests in Module

```cypher
MATCH (m:Module {id: $moduleId})-[:CONTAINS*]->(f:File {isTest: true})
MATCH (f)-[:LOCATION {role: 'IN_FILE'}]<-(tc:TestCase)
RETURN tc
```

### Find Tests for Symbol

```cypher
MATCH (sym:Symbol {id: $symbolId})<-[r:REALIZES {role: 'TESTS'}]-(tc:TestCase)
RETURN tc, r.coverage
```

### Find Tests Verifying Feature

```cypher
MATCH (f:Feature {id: $featureId})<-[r:REALIZES {role: 'VERIFIES'}]-(tc:TestCase)
RETURN tc, r.confidence
```

### Find Tests for Boundary

```cypher
MATCH (ep:Boundary {id: $endpointId})<-[r:REALIZES {role: 'TESTS'}]-(tc:TestCase)
RETURN tc
```

### Find All Unit Tests

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS*]->(tc:TestCase {kind: 'unit'})
RETURN tc
```

### Test Coverage by Kind

```cypher
MATCH (snap:Snapshot {id: $snapshotId})-[:CONTAINS*]->(tc:TestCase)
WITH tc.kind, COUNT(*) as count
RETURN tc.kind, count
```

---

## Constraints & Indexes

- **Unique Index**: `test_case_id_unique` on `id`
- **Name Index**: `test_case_name` on `name` (test discovery)
- **Cardinality**: Many tests per snapshot; exactly 1 file per test
- **Coverage Relationship**: Optional; many tests may not have `[:REALIZES]` edges

---

## Relationships to Features & Symbols

Tests can relate to:

1. **Symbol**: Direct import or call (heuristic: test imports symbol)
2. **Boundary**: Via handler symbol or explicit path matching
3. **Feature**: Naming + LLM inference (test name contains feature name)

---

## Common Use Cases

1. **Test discovery**: "All tests in module X"
2. **Feature validation**: "What tests verify payment feature?"
3. **Coverage analysis**: "Unit vs. integration test distribution"
4. **Regression analysis**: "When was test added/modified?"
5. **Test-driven queries**: "What code does this test cover?"

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node catalog
- [Snapshot.md](./Snapshot.md) – Version scoping
- [File.md](./File.md) – Test location
- [Symbol.md](./Symbol.md) – What's being tested
- [Feature.md](./Feature.md) – Feature verification
- [../edges/REALIZES.md](../edges/REALIZES.md) – Testing relationships
- [../edges/LOCATION.md](../edges/LOCATION.md) – File location
