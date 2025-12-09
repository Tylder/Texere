# Texere Indexer – Relationship Type Consolidation Analysis

**Document Version:** 1.0  
**Status:** Design Review – Neo4j/Memgraph Best Practices  
**Last Updated:** December 2025

## Executive Summary

After researching Neo4j and Memgraph best practices, **consolidating relationship types is viable
and recommended** for your use case. The consensus from both database communities is:

1. **Don't create separate relationship types for variations** of the same semantic relationship
2. **Use relationship properties** to differentiate sub-types
3. **Too many relationship types** (especially >50) is a code smell indicating over-modeling

**Recommendation for Texere**: Reduce from ~40 explicit edge types to ~15-20 core relationship
types, using properties to capture nuance.

---

## Research Findings

### Neo4j Community Best Practices

#### 1. Relationship Type Proliferation is an Anti-Pattern

From Neo4j community discussions:

> "I would like to understand your data model." – Gary Lilienfield (Neo4j Community)

When a user asked about hitting the 65,536 relationship type limit (2^16), Neo4j experts responded:

> "Could you reduce your types down to a more granular list and differentiate the relations with a
> relationship property that specifies a sub-type?" – Gary Lilienfield

**Key insight**: Having many relationship types is considered a sign of under-thinking the domain
model.

#### 2. Property-Based Differentiation is Standard

The canonical example from Neo4j docs shows:

```cypher
-- BAD: Multiple relationship types
(actor)-[:ACTED_IN_2000]->()
(actor)-[:ACTED_IN_1999]->()

-- GOOD: Single type with properties
(actor)-[:ACTED_IN {year: 2000}]->()
(actor)-[:ACTED_IN {year: 1999}]->()
```

This pattern is **widely used** in knowledge graphs and production systems.

#### 3. Knowledge Graph Example from Memgraph

In their
[knowledge graph modeling guide](https://memgraph.com/docs/data-modeling/modeling-guides/model-a-knowledge-graph),
Memgraph demonstrates:

```cypher
-- Knowledge graph with 9 relationship types across 6 node labels
(person)-[:HAS]->(skill)
(task)-[:NEEDS]->(skill)
(person)-[:WORKS_ON]->(task)
(project)-[:REQUIRES]->(skill)
(employee)-[:WORKS_FOR]->(company)
(project)-[:HAS_DEADLINE]->(date)
(person)-[:HAS_ROLE]->(role)
(project)-[:ASSIGNED_TO]->(employee)
(budget)-[:COVERS_PROJECT]->(project)
```

**This is considered "dense" but still manageable** — and these are distinct semantic relationships.
For sub-types of relationships (like your `[:REFERENCES {type: 'CALL'}]` vs
`[:REFERENCES {type: 'REFERENCE'}]`), consolidation is even more justified.

### Memgraph Data Modeling Guidance

From Memgraph's best practices documentation:

> **Don't overcomplicate the model** "It's tempting to model every last detail of your data as nodes
> and relationships. But this can lead to a bloated graph structure that's inefficient and hard to
> maintain. Rather stick to simple and direct relationships between key entities."

> **Use relationship properties** "Neo4j supports relationship properties that store metadata about
> the relationship itself. This is perfect for adding sub-type information without creating separate
> relationship types."

---

## Current State Analysis (Texere)

### Current Edge Type Count

From `NODE_EDGE_MAPPING.md`, you currently have:

**Explicit relationship types:**

- `[:CONTAINS]` – 1 type (hierarchy)
- `[:IN_SNAPSHOT]` – 1 type (scoping)
- `[:REFERENCES {type: 'CALL'|'REFERENCE'}]` – 1 type, 2 sub-types
- `[:IMPLEMENTS]` – 1 type
- `[:READS_FROM]` – 1 type
- `[:WRITES_TO]` – 1 type
- `[:FOLLOWS_PATTERN]` – 1 type
- `[:USES_CONFIG]` – 1 type
- `[:CALLS]` – 1 type
- `[:INTRODUCED_IN]` – 1 type
- `[:MODIFIED_IN]` – 1 type
- `[:TESTED_BY]` – 1 type
- `[:DOCUMENTS]` – 1 type
- `[:APPLIES_TO]` – 1 type
- `[:DEPENDS_ON]` – 1 type
- `[:HANDLES_BY]` – 1 type
- `[:IN_FILE]` – 1 type
- `[:IN_MODULE]` – 1 type
- `[:SIMILAR_TO]` – 1 type
- `[:VERIFIES]` – 1 type
- `[:CAUSED_BY]` – 1 type
- `[:AFFECTS]` – 1 type
- `[:EXEMPLIFIED_BY]` – 1 type
- `[:HAS_INTEGRATION_PATTERN]` – 1 type

**Total: ~25 relationship types**

---

## Proposed Consolidation Strategy

### Option A: Aggressive Consolidation (8 Core Types)

```
1. [:CONTAINS]           – Hierarchy (no change)
2. [:IN_SNAPSHOT]        – Scoping (no change)
3. [:REFERENCES]         – Code relations
                           {type: 'CALL', 'TYPE_REF', 'IMPORT'}

4. [:IMPLEMENTS]         – Semantics: who implements what
                           {subject: 'symbol'|'endpoint', feature}

5. [:MUTATES]            – Data flow
                           {operation: 'READ'|'WRITE', entity: 'SchemaEntity'}

6. [:TRACKS_EVOLUTION]   – Snapshot tracking
                           {event: 'INTRODUCED'|'MODIFIED'}

7. [:ASSERTS]            – Assertions & constraints
                           {claim: 'TESTS'|'DOCUMENTS'|'DEFINES_PATTERN'}

8. [:DEPENDS_ON]         – Dependencies
                           {kind: 'CONFIG'|'SERVICE'|'LIBRARY'|'STYLE_GUIDE'}
```

**Advantages:**

- Easy to remember and query
- Clean semantics
- Minimal proliferation

**Disadvantages:**

- Properties become complex (wide range of meanings)
- Less self-documenting
- Harder to create indexes on edge type alone (must also filter properties)

---

### Option B: Moderate Consolidation (15 Core Types) ⭐ RECOMMENDED

```
1. [:CONTAINS]           – Hierarchy (no change)
2. [:IN_SNAPSHOT]        – Scoping (no change)
3. [:REFERENCES]         – Code relations: CALL, TYPE_REF, IMPORT
4. [:IMPLEMENTS]         – Symbol/Endpoint implements Feature
5. [:MUTATES]            – Symbol/Endpoint reads/writes SchemaEntity
                           {operation: 'READ'|'WRITE'}
6. [:FOLLOWS_PATTERN]    – Code/Module follows Pattern
7. [:USES_CONFIG]        – Symbol uses ConfigurationVariable
8. [:CALLS]              – Symbol/Endpoint calls ExternalService
9. [:DOCUMENTS]          – SpecDoc documents Feature/Endpoint/Symbol/Module
10. [:APPLIES_TO]        – StyleGuide applies to Module
11. [:TESTS]             – TestCase tests Symbol/Endpoint
12. [:VERIFIES]          – TestCase verifies Feature
13. [:TRACK_EVOLUTION]   – INTRODUCED_IN, MODIFIED_IN
                           {event: 'INTRODUCED'|'MODIFIED'}
14. [:IMPACTS]           – Incident caused by / affects
                           {type: 'CAUSED_BY'|'AFFECTS'}
15. [:LOCATION]          – Endpoint in File/Module, TestCase in File
                           {role: 'DEFINED_IN'|'CONTAINED_IN'}
```

**Advantages:**

- Balances readability and consolidation
- Clear semantic boundaries (each type has 1-3 variations max)
- Still queryable: `MATCH (x)-[r:REFERENCES]->(y) WHERE r.type = 'CALL'`
- Close to current naming (minimal refactor)
- Industry-standard patterns (Neo4j, Memgraph examples use this count)

**Disadvantages:**

- Slightly more properties to maintain
- Some types still have 2-3 sub-meanings

---

### Option C: Status Quo (25+ Types)

**Advantages:**

- Self-documenting edge names
- Easier to filter by type alone in queries
- No consolidation work

**Disadvantages:**

- Risk hitting relationship type limits (future-proof less)
- Harder to extend (new sub-type = new relationship type)
- Goes against Neo4j/Memgraph best practices
- Violates "simpler is better" principle

---

## Recommendation: **Aggressive Consolidation (10 Core Types)**

### Rationale

1. **Query multiplexing**: Single edge type query matches all related relationships (e.g., all
   `:DEPENDS_ON` variants in one match)
2. **Extensibility**: Add new sub-types via properties without schema migration
3. **Performance**: Fewer index types, better cardinality optimization
4. **Maintainability**: Properties are self-documenting; easier to extend than creating new types
5. **Best practices**: Aligns with Neo4j/Memgraph guidance (10-20 types is optimal)

### Why Keep CONTAINS, IN_SNAPSHOT, LOCATION Separate?

These three are **structural backbone edges** with distinct characteristics:

| Edge             | Reason to Keep Separate                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[:CONTAINS]`    | **Transitive tree**: Forms hierarchy for breadth-first exploration (`[:CONTAINS*]`). Merging breaks path finding. Requires tree-optimized indexes.                     |
| `[:IN_SNAPSHOT]` | **Cardinality invariant**: Every snapshot-scoped node has **exactly 1**. Critical for version tracking and temporal queries. Separate index for O(1) lookups.          |
| `[:LOCATION]`    | **Role-based semantics**: Same source/target nodes (Symbol→File, Endpoint→Module) but different roles (HANDLER vs DEFINED_IN vs IN_FILE). Role property distinguishes. |

**All three are position/containment semantically, but:**

- `CONTAINS` answers "what's inside this repo structure?"
- `IN_SNAPSHOT` answers "when did this exist?"
- `LOCATION` answers "where is responsibility owned?"

**Query pattern differences validate separation:**

```cypher
-- CONTAINS: Transitive (tree walking)
MATCH (m:Module)-[:CONTAINS*]->(sym:Symbol)

-- IN_SNAPSHOT: Direct 1-to-1 (version lookup)
MATCH (sym:Symbol)-[:IN_SNAPSHOT]->(snap:Snapshot)

-- LOCATION: Role-filtered (ownership query)
MATCH (ep:Endpoint)-[:LOCATION {role: 'HANDLED_BY'}]->(sym:Symbol)
```

### Implementation Plan

1. **Phase 1**: Finalize consolidated schema (10 types) ← **YOU ARE HERE**
2. **Phase 2**: Update `graph_schema_spec.md` with DDL & Cypher patterns
3. **Phase 3**: Update `NODE_EDGE_MAPPING.md` with old→new consolidation mapping
4. **Phase 4**: Update extraction logic (`EXTRACTION_DIFFICULTY_ANALYSIS.md`)
5. **Phase 5**: Implement & test with sample data

---

## Final Consolidated Schema: 10 Core Edge Types

### 1. [:CONTAINS] – Hierarchy (Structural Tree)

**Unchanged from original.** Bottom-up containment for repo structure.

```cypher
(file:File)-[:CONTAINS]->(module:Module)
(module:Module)-[:CONTAINS]->(snapshot:Snapshot)
(snapshot:Snapshot)-[:CONTAINS]->(codebase:Codebase)

-- Transitive queries:
MATCH (codebase:Codebase)-[:CONTAINS*]->(symbol:Symbol)
```

**Properties**: None  
**Cardinality**: Many-to-one (each child has one parent in tree)  
**Index priority**: High (tree traversal optimization)

---

### 2. [:IN_SNAPSHOT] – Scoping (Version Membership)

**Unchanged from original.** Every snapshot-scoped node belongs to exactly one snapshot.

```cypher
(symbol:Symbol)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
(endpoint:Endpoint)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
(testCase:TestCase)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
(specDoc:SpecDoc)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
(file:File)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
(module:Module)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
(schemaEntity:SchemaEntity)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
(thirdPartyLib:ThirdPartyLibrary)-[:IN_SNAPSHOT]->(snapshot:Snapshot)
```

**Properties**: None  
**Cardinality**: Exactly 1 (cardinality invariant)  
**Index priority**: Critical (O(1) version lookup)

---

### 3. [:REFERENCES] – Code Relations

**Consolidates**: CALL, TYPE_REF, IMPORT, FOLLOWS_PATTERN, SIMILAR_TO

```cypher
-- Symbol-to-symbol references
(symbol:Symbol)-[r:REFERENCES {kind: 'CALL', line: int, col: int}]->(symbol2:Symbol)
(symbol:Symbol)-[r:REFERENCES {kind: 'TYPE_REF', line: int, col: int}]->(symbol2:Symbol)
(symbol:Symbol)-[r:REFERENCES {kind: 'IMPORT', line: int, col: int}]->(symbol2:Symbol)
(symbol:Symbol)-[r:REFERENCES {kind: 'PATTERN', confidence: 0.0-1.0}]->(pattern:Pattern)
(symbol:Symbol)-[r:REFERENCES {kind: 'SIMILAR', distance: 0.0-1.0}]->(symbol2:Symbol)

-- Endpoint pattern references
(endpoint:Endpoint)-[r:REFERENCES {kind: 'PATTERN', confidence: 0.0-1.0}]->(pattern:Pattern)
(endpoint:Endpoint)-[r:REFERENCES {kind: 'SIMILAR', distance: 0.0-1.0}]->(endpoint2:Endpoint)

-- Module pattern references
(module:Module)-[r:REFERENCES {kind: 'PATTERN', confidence: 0.0-1.0}]->(pattern:Pattern)
```

**Properties**:

- `kind`: 'CALL' | 'TYPE_REF' | 'IMPORT' | 'PATTERN' | 'SIMILAR'
- `line`, `col`: Location (for code references)
- `confidence`, `distance`: Strength (for pattern/similarity)

**Index**: High (call graph traversal, pattern discovery)

---

### 4. [:REALIZES] – Implementation/Verification (Consolidates IMPLEMENTS, TESTS, VERIFIES)

**Semantic**: "What realizes this requirement?"

```cypher
-- Symbol/Endpoint implements Feature
(symbol:Symbol)-[r:REALIZES {role: 'IMPLEMENTS', confidence: 0.0-1.0}]->(feature:Feature)
(endpoint:Endpoint)-[r:REALIZES {role: 'IMPLEMENTS', confidence: 0.0-1.0}]->(feature:Feature)

-- TestCase tests Symbol/Endpoint
(testCase:TestCase)-[r:REALIZES {role: 'TESTS', coverage: 'DIRECT'|'INDIRECT'}]->(symbol:Symbol)
(testCase:TestCase)-[r:REALIZES {role: 'TESTS', coverage: 'DIRECT'|'INDIRECT'}]->(endpoint:Endpoint)

-- TestCase verifies Feature
(testCase:TestCase)-[r:REALIZES {role: 'VERIFIES', confidence: 0.0-1.0}]->(feature:Feature)
```

**Properties**:

- `role`: 'IMPLEMENTS' | 'TESTS' | 'VERIFIES'
- `confidence`: LLM certainty (0.0-1.0)
- `coverage`: 'DIRECT' | 'INDIRECT' (for TESTS role)

**Query example**:

```cypher
-- All ways feature X is realized
MATCH (x)-[r:REALIZES]->(f:Feature {id: 'payment'})
RETURN x, r.role
```

---

### 5. [:MUTATES] – Data Flow (Consolidates READS_FROM + WRITES_TO)

**Semantic**: "What accesses this schema entity?"

```cypher
(symbol:Symbol)-[r:MUTATES {operation: 'READ'|'WRITE', confidence: 0.0-1.0}]->(entity:SchemaEntity)
(endpoint:Endpoint)-[r:MUTATES {operation: 'READ'|'WRITE', confidence: 0.0-1.0}]->(entity:SchemaEntity)
```

**Properties**:

- `operation`: 'READ' | 'WRITE'
- `confidence`: LLM field analysis certainty

---

### 6. [:DEPENDS_ON] – Dependencies (Consolidates all dependency types)

**Semantic**: "What does this depend on?"

```cypher
-- Module depends on library/service/config/style
(module:Module)-[r:DEPENDS_ON {kind: 'LIBRARY', version?: string}]->(lib:ThirdPartyLibrary)
(module:Module)-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide:StyleGuide)

-- Symbol uses config/service
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'CONFIG', required: boolean}]->(config:ConfigurationVariable)
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'SERVICE', confidence: 0.0-1.0}]->(service:ExternalService)

-- Endpoint calls service
(endpoint:Endpoint)-[r:DEPENDS_ON {kind: 'SERVICE', confidence: 0.0-1.0}]->(service:ExternalService)

-- Feature depends on Feature (transitive)
(feature:Feature)-[r:DEPENDS_ON]->(feature2:Feature)
```

**Properties**:

- `kind`: 'LIBRARY' | 'SERVICE' | 'CONFIG' | 'STYLE_GUIDE'
- `version`, `confidence`, `required`: Context-specific metadata

**Query example**:

```cypher
-- All external dependencies for symbol
MATCH (sym:Symbol)-[r:DEPENDS_ON {kind: 'SERVICE'|'CONFIG'}]->(dep)
RETURN sym, dep, r.kind
```

---

### 7. [:DOCUMENTS] – Knowledge & Governance (Consolidates DOCUMENTS + APPLIES_TO)

**Semantic**: "What explains or governs this?"

```cypher
-- SpecDoc documents Feature/Endpoint/Symbol/Module
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'FEATURE'|'ENDPOINT'|'SYMBOL'|'MODULE', similarity: 0.0-1.0}]->(target)

-- StyleGuide documents Module/Pattern
(guide:StyleGuide)-[r:DOCUMENTS {target_role: 'MODULE'|'PATTERN'}]->(target)
```

**Properties**:

- `target_role`: Type being documented
- `similarity`: Semantic match score (for LLM-derived links)

**Query example**:

```cypher
-- All docs explaining feature X
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'FEATURE'}]->(f:Feature {id: 'payment'})
RETURN doc
```

---

### 8. [:LOCATION] – Position & Ownership (Consolidates IN_FILE + IN_MODULE + HANDLED_BY)

**Semantic**: "Where is this defined, and what role?"

```cypher
-- Endpoint handler
(endpoint:Endpoint)-[r:LOCATION {role: 'HANDLED_BY'}]->(symbol:Symbol)

-- Location in files/modules
(endpoint:Endpoint)-[r:LOCATION {role: 'IN_FILE'}]->(file:File)
(endpoint:Endpoint)-[r:LOCATION {role: 'IN_MODULE'}]->(module:Module)
(testCase:TestCase)-[r:LOCATION {role: 'IN_FILE'}]->(file:File)
(testCase:TestCase)-[r:LOCATION {role: 'IN_MODULE'}]->(module:Module)
```

**Properties**:

- `role`: 'HANDLED_BY' | 'IN_FILE' | 'IN_MODULE'

**Query pattern**: Role-filtered ownership queries (distinct from tree traversal via CONTAINS)

---

### 9. [:TRACKS] – Evolution (Consolidates INTRODUCED_IN + MODIFIED_IN)

**Semantic**: "When did this appear or change?"

```cypher
(symbol:Symbol)-[r:TRACKS {event: 'INTRODUCED'|'MODIFIED'}]->(snapshot:Snapshot)
(feature:Feature)-[r:TRACKS {event: 'INTRODUCED'|'MODIFIED'}]->(snapshot:Snapshot)
(testCase:TestCase)-[r:TRACKS {event: 'INTRODUCED'|'MODIFIED'}]->(snapshot:Snapshot)
```

**Properties**:

- `event`: 'INTRODUCED' | 'MODIFIED'

**Query example**:

```cypher
-- When was feature X introduced and modified?
MATCH (f:Feature {id: 'payment'})-[r:TRACKS]->(snap:Snapshot)
RETURN snap, r.event
ORDER BY snap.timestamp
```

---

### 10. [:IMPACTS] – Incident Relationships (Consolidates CAUSED_BY + AFFECTS)

**Semantic**: "How does this incident relate to the codebase?"

```cypher
(incident:Incident)-[r:IMPACTS {type: 'CAUSED_BY'|'AFFECTS'}]->(symbol:Symbol)
(incident:Incident)-[r:IMPACTS {type: 'CAUSED_BY'|'AFFECTS'}]->(feature:Feature)
(incident:Incident)-[r:IMPACTS {type: 'CAUSED_BY'|'AFFECTS'}]->(endpoint:Endpoint)
```

**Properties**:

- `type`: 'CAUSED_BY' (root cause) | 'AFFECTS' (impact)

---

## Summary Table

| Edge             | Type       | Sub-Types                                  | Node Pairs                       | Purpose            |
| ---------------- | ---------- | ------------------------------------------ | -------------------------------- | ------------------ |
| `[:CONTAINS]`    | Tree       | —                                          | File/Module/Snapshot→Codebase    | Hierarchy          |
| `[:IN_SNAPSHOT]` | Direct     | —                                          | All scoped→Snapshot              | Version membership |
| `[:REFERENCES]`  | Code       | CALL, TYPE_REF, IMPORT, PATTERN, SIMILAR   | Symbol/Endpoint/Module           | Code relations     |
| `[:REALIZES]`    | Semantic   | IMPLEMENTS, TESTS, VERIFIES                | Symbol/Endpoint/TestCase         | Implementation     |
| `[:MUTATES]`     | Data       | READ, WRITE                                | Symbol/Endpoint→SchemaEntity     | Data flow          |
| `[:DEPENDS_ON]`  | Dependency | LIBRARY, SERVICE, CONFIG, STYLE_GUIDE      | Module/Symbol/Endpoint/Feature   | Dependencies       |
| `[:DOCUMENTS]`   | Knowledge  | FEATURE, ENDPOINT, SYMBOL, MODULE, PATTERN | SpecDoc/StyleGuide               | Governance         |
| `[:LOCATION]`    | Position   | HANDLED_BY, IN_FILE, IN_MODULE             | Endpoint/TestCase                | Ownership          |
| `[:TRACKS]`      | Evolution  | INTRODUCED, MODIFIED                       | Symbol/Feature/TestCase→Snapshot | Version history    |
| `[:IMPACTS]`     | Incident   | CAUSED_BY, AFFECTS                         | Incident                         | Impact tracking    |

---

## Query Examples (Before & After)

### Example 1: Find Endpoints in a Module

**Before (with ~25 types):**

```cypher
MATCH (module:Module)-[:CONTAINS*]->(file:File)-[:CONTAINS]->(endpoint:Endpoint)
RETURN endpoint
```

**After (with consolidation):**

```cypher
MATCH (module:Module)-[:CONTAINS*]->(file:File)
MATCH (endpoint:Endpoint)-[r:LOCATION {role: 'IN_FILE'}]->(file)
RETURN endpoint

-- OR use the explicit IN_FILE edge:
MATCH (module:Module)-[:CONTAINS*]->(file:File)
MATCH (endpoint:Endpoint)-[:LOCATION {role: 'IN_FILE'}]->(file)
RETURN endpoint
```

**Complexity**: No change (still 1-2 steps)

---

### Example 2: Find Data Model Usage

**Before:**

```cypher
MATCH (symbol:Symbol)
OPTIONAL MATCH (symbol)-[:READS_FROM]->(entity:SchemaEntity)
OPTIONAL MATCH (symbol)-[:WRITES_TO]->(entity2:SchemaEntity)
RETURN symbol, entity, entity2
```

**After:**

```cypher
MATCH (symbol:Symbol)-[r:MUTATES]->(entity:SchemaEntity)
RETURN symbol, entity, r.operation
```

**Complexity**: Simpler (consolidated edge)

---

### Example 3: Track Symbol Evolution

**Before:**

```cypher
MATCH (symbol:Symbol)
OPTIONAL MATCH (symbol)-[:INTRODUCED_IN]->(snap1:Snapshot)
OPTIONAL MATCH (symbol)-[:MODIFIED_IN]->(snap2:Snapshot)
RETURN symbol, snap1, snap2
```

**After:**

```cypher
MATCH (symbol:Symbol)-[r:TRACKS_EVOLUTION]->(snapshot:Snapshot)
RETURN symbol, snapshot, r.event
```

**Complexity**: Simpler (consolidated edge)

---

## Memgraph-Specific Considerations

Memgraph best practices:

- No hard limit on relationship types
- Schema tracking available via `SHOW SCHEMA INFO;`
- Performance impact of too many types is minimal (indexed by type internally)
- **Recommendation still stands**: Use properties for sub-types to stay semantically clean

---

## Neo4j-Specific Considerations

Neo4j relationship type limits:

- **Community Edition**: 65,536 types (2^16)
- **Enterprise Edition**: 16.7M types (2^24)
- **High-limit format**: 1.07B types (2^30)

Even with aggressive consolidation, you'd only hit limits at 50K+ types. **Option B stays well
clear.**

---

## References

- [Neo4j: Best practices when choosing relationship direction/name](https://community.neo4j.com/t/best-practices-when-choosing-relationship-direction-name/7902)
- [Neo4j: Relationship type limits discussion](https://community.neo4j.com/t/change-relationship-type-limit/66698)
- [Memgraph: Graph data modeling best practices](https://memgraph.com/docs/data-modeling/best-practices)
- [Memgraph: Model a knowledge graph](https://memgraph.com/docs/data-modeling/modeling-guides/model-a-knowledge-graph)
- [Memgraph: Data types and relationship properties](https://memgraph.com/docs/fundamentals/data-types)
