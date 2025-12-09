# Texere Indexer – Edge Consolidation Migration Map

**Document Version:** 1.0  
**Status:** Implementation Reference  
**Last Updated:** December 2025

## Overview

This document maps the old ~25 edge types to the new 10-edge consolidated schema. Use this as a
reference when:

- Updating extraction logic
- Writing Cypher migrations
- Refactoring queries
- Training on the new model

---

## Consolidation Mapping

### Old → New Edge Type Mapping

| Old Edge Type                | New Edge Type    | Property      | Value(s)                                    | Notes                                      |
| ---------------------------- | ---------------- | ------------- | ------------------------------------------- | ------------------------------------------ |
| `[:CALL]`                    | `[:REFERENCES]`  | `kind`        | `'CALL'`                                    | Symbol→Symbol function calls               |
| `[:REFERENCE]`               | `[:REFERENCES]`  | `kind`        | `'TYPE_REF'`                                | Type references, const refs                |
| `[:IMPORT]`                  | `[:REFERENCES]`  | `kind`        | `'IMPORT'`                                  | Import statements (derived)                |
| `[:FOLLOWS_PATTERN]`         | `[:REFERENCES]`  | `kind`        | `'PATTERN'`                                 | Pattern adherence                          |
| `[:SIMILAR_TO]`              | `[:REFERENCES]`  | `kind`        | `'SIMILAR'`                                 | Embedding-based similarity                 |
| `[:IMPLEMENTS]`              | `[:REALIZES]`    | `role`        | `'IMPLEMENTS'`                              | Feature implementation                     |
| `[:TESTS]`                   | `[:REALIZES]`    | `role`        | `'TESTS'`                                   | TestCase→Symbol/Boundary                   |
| `[:TESTED_BY]`               | `[:REALIZES]`    | `role`        | `'TESTS'`                                   | Reverse: delete, use forward only          |
| `[:VERIFIES]`                | `[:REALIZES]`    | `role`        | `'VERIFIES'`                                | TestCase→Feature                           |
| `[:READS_FROM]`              | `[:MUTATES]`     | `operation`   | `'READ'`                                    | Symbol/Boundary→DataContract               |
| `[:WRITES_TO]`               | `[:MUTATES]`     | `operation`   | `'WRITE'`                                   | Symbol/Boundary→DataContract               |
| `[:USES_CONFIG]`             | `[:DEPENDS_ON]`  | `kind`        | `'CONFIG'`                                  | Symbol→ConfigurationVariable               |
| `[:CALLS]`                   | `[:DEPENDS_ON]`  | `kind`        | `'SERVICE'`                                 | Symbol/Boundary→ExternalService            |
| `[:APPLIES_TO]`              | `[:DOCUMENTS]`   | `target_role` | `'MODULE'`                                  | StyleGuide→Module                          |
| `[:DOCUMENTS]`               | `[:DOCUMENTS]`   | `target_role` | `'FEATURE'\|'ENDPOINT'\|'SYMBOL'\|'MODULE'` | SpecDoc relationships                      |
| `[:IN_FILE]`                 | `[:LOCATION]`    | `role`        | `'IN_FILE'`                                 | Boundary/TestCase→File                     |
| `[:IN_MODULE]`               | `[:LOCATION]`    | `role`        | `'IN_MODULE'`                               | Boundary/TestCase→Module                   |
| `[:HANDLED_BY]`              | `[:LOCATION]`    | `role`        | `'HANDLED_BY'`                              | Boundary→Symbol handler                    |
| `[:INTRODUCED_IN]`           | `[:TRACKS]`      | `event`       | `'INTRODUCED'`                              | First snapshot appearance                  |
| `[:MODIFIED_IN]`             | `[:TRACKS]`      | `event`       | `'MODIFIED'`                                | Later snapshot changes                     |
| `[:CAUSED_BY]`               | `[:IMPACTS]`     | `type`        | `'CAUSED_BY'`                               | Incident root cause                        |
| `[:AFFECTS]`                 | `[:IMPACTS]`     | `type`        | `'AFFECTS'`                                 | Incident impact                            |
| `[:DEPENDS_ON]`              | `[:DEPENDS_ON]`  | `kind`        | `'LIBRARY'`                                 | Module→ThirdPartyLibrary                   |
| `[:CONTAINS]`                | `[:CONTAINS]`    | —             | —                                           | **Unchanged**                              |
| `[:IN_SNAPSHOT]`             | `[:IN_SNAPSHOT]` | —             | —                                           | **Unchanged**                              |
| `[:EXEMPLIFIED_BY]`          | `[:REFERENCES]`  | `kind`        | `'PATTERN'`                                 | Delete; use reverse of FOLLOWS_PATTERN     |
| `[:HAS_INTEGRATION_PATTERN]` | `[:DEPENDS_ON]`  | `kind`        | `'SERVICE'`                                 | Symbol/Boundary→ExternalService (metadata) |

---

## Property Structure by Edge Type

### [:REFERENCES]

```cypher
{
  kind: 'CALL' | 'TYPE_REF' | 'IMPORT' | 'PATTERN' | 'SIMILAR',
  line?: integer,           -- For code relations (CALL, TYPE_REF, IMPORT)
  col?: integer,            -- For code relations
  confidence?: 0.0-1.0,     -- For PATTERN
  distance?: 0.0-1.0        -- For SIMILAR (embedding distance)
}
```

### [:REALIZES]

```cypher
{
  role: 'IMPLEMENTS' | 'TESTS' | 'VERIFIES',
  confidence?: 0.0-1.0,     -- For all roles
  coverage?: 'DIRECT' | 'INDIRECT'  -- For TESTS only
}
```

### [:MUTATES]

```cypher
{
  operation: 'READ' | 'WRITE',
  confidence?: 0.0-1.0
}
```

### [:DEPENDS_ON]

```cypher
{
  kind: 'LIBRARY' | 'SERVICE' | 'CONFIG' | 'STYLE_GUIDE',
  version?: string,         -- For LIBRARY
  required?: boolean,       -- For CONFIG
  confidence?: 0.0-1.0      -- For SERVICE
}
```

### [:DOCUMENTS]

```cypher
{
  target_role: 'FEATURE' | 'ENDPOINT' | 'SYMBOL' | 'MODULE' | 'PATTERN',
  similarity?: 0.0-1.0
}
```

### [:LOCATION]

```cypher
{
  role: 'HANDLED_BY' | 'IN_FILE' | 'IN_MODULE'
}
```

### [:TRACKS]

```cypher
{
  event: 'INTRODUCED' | 'MODIFIED'
}
```

### [:IMPACTS]

```cypher
{
  type: 'CAUSED_BY' | 'AFFECTS'
}
```

---

## Cypher Query Migration Examples

### Example 1: Find Call Graph

**Old:**

```cypher
MATCH (sym:Symbol)-[:CALL]->(target:Symbol)
RETURN sym, target
```

**New:**

```cypher
MATCH (sym:Symbol)-[r:REFERENCES {kind: 'CALL'}]->(target:Symbol)
RETURN sym, target
```

---

### Example 2: Find Features and Their Tests

**Old:**

```cypher
MATCH (f:Feature)
OPTIONAL MATCH (f)<-[:IMPLEMENTS]-(sym:Symbol)
OPTIONAL MATCH (t:TestCase)-[:TESTS]->(sym)
RETURN f, sym, t
```

**New:**

```cypher
MATCH (f:Feature)
OPTIONAL MATCH (sym)-[r1:REALIZES {role: 'IMPLEMENTS'}]->(f)
OPTIONAL MATCH (t:TestCase)-[r2:REALIZES {role: 'TESTS'}]->(sym)
RETURN f, sym, t
```

---

### Example 3: Find Data Model Access

**Old:**

```cypher
MATCH (sym:Symbol)
OPTIONAL MATCH (sym)-[:READS_FROM]->(entity:DataContract)
OPTIONAL MATCH (sym)-[:WRITES_TO]->(entity2:DataContract)
RETURN sym, entity, entity2
```

**New:**

```cypher
MATCH (sym:Symbol)-[r:MUTATES]->(entity:DataContract)
RETURN sym, entity, r.operation
```

---

### Example 4: Find All Dependencies

**Old:**

```cypher
MATCH (sym:Symbol)
OPTIONAL MATCH (sym)-[:USES_CONFIG]->(config:ConfigurationVariable)
OPTIONAL MATCH (sym)-[:CALLS]->(service:ExternalService)
RETURN sym, config, service
```

**New:**

```cypher
MATCH (sym:Symbol)-[r:DEPENDS_ON {kind: 'CONFIG' | 'SERVICE'}]->(dep)
RETURN sym, dep, r.kind
```

---

### Example 5: Find Symbol Evolution

**Old:**

```cypher
MATCH (sym:Symbol)
OPTIONAL MATCH (sym)-[:INTRODUCED_IN]->(snap1:Snapshot)
OPTIONAL MATCH (sym)-[:MODIFIED_IN]->(snap2:Snapshot)
RETURN sym, snap1, snap2
```

**New:**

```cypher
MATCH (sym:Symbol)-[r:TRACKS]->(snap:Snapshot)
RETURN sym, snap, r.event
ORDER BY snap.timestamp
```

---

## Index Migration

### Create New Indexes

```cypher
-- [:REFERENCES] variants (high priority)
CREATE INDEX references_kind IF NOT EXISTS
FOR ()-[r:REFERENCES]-() ON (r.kind);

-- [:REALIZES] by role
CREATE INDEX realizes_role IF NOT EXISTS
FOR ()-[r:REALIZES]-() ON (r.role);

-- [:DEPENDS_ON] by kind (dependency queries)
CREATE INDEX depends_on_kind IF NOT EXISTS
FOR ()-[r:DEPENDS_ON]-() ON (r.kind);

-- [:DOCUMENTS] by target (documentation lookup)
CREATE INDEX documents_target_role IF NOT EXISTS
FOR ()-[r:DOCUMENTS]-() ON (r.target_role);

-- [:LOCATION] by role (position queries)
CREATE INDEX location_role IF NOT EXISTS
FOR ()-[r:LOCATION]-() ON (r.role);

-- [:TRACKS] by event (evolution analysis)
CREATE INDEX tracks_event IF NOT EXISTS
FOR ()-[r:TRACKS]-() ON (r.event);

-- [:MUTATES] by operation (data flow)
CREATE INDEX mutates_operation IF NOT EXISTS
FOR ()-[r:MUTATES]-() ON (r.operation);

-- [:IMPACTS] by type (incident analysis)
CREATE INDEX impacts_type IF NOT EXISTS
FOR ()-[r:IMPACTS]-() ON (r.type);
```

### Drop Old Indexes

```cypher
-- Drop indexes on old edge types (if they existed)
DROP INDEX call_index IF EXISTS;
DROP INDEX reference_index IF EXISTS;
DROP INDEX import_index IF EXISTS;
DROP INDEX follows_pattern_index IF EXISTS;
DROP INDEX similar_to_index IF EXISTS;
-- ... etc for all old types
```

---

## Implementation Checklist

- [ ] Update extraction code to create new edge types with properties
- [ ] Create Cypher migration script for existing data
- [ ] Update all agent query code to use new edges
- [ ] Update tests to match new schema
- [ ] Create new indexes per section above
- [ ] Validate data integrity (no orphaned old edges)
- [ ] Performance test: compare old vs. new query patterns
- [ ] Update NODE_EDGE_MAPPING.md with new consolidated structure
- [ ] Update graph_schema_spec.md with DDL
- [ ] Documentation: update extraction specs with new edge creation rules

---

## References

- [RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md](./RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md) –
  Design rationale
- [graph_schema_spec.md](../graph_schema_spec.md) – Schema definitions (to be updated)
- [NODE_EDGE_MAPPING.md](./NODE_EDGE_MAPPING.md) – Node/edge catalog (to be updated)
