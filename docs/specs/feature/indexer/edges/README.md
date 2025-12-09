# Texere Indexer – Edge Type Catalog

**Overview**: This directory contains detailed specifications for all 10 consolidated relationship
types in the Texere Knowledge Graph.

After research into Neo4j and Memgraph best practices, we consolidated ~25 explicit edge types down
to 10 core types using relationship properties to differentiate sub-types. This reduces schema
complexity while maintaining query expressiveness.

---

## The 10 Core Relationship Types

### Structural (3)

| Edge                                | Purpose              | Semantic                        | Sub-Types                      |
| ----------------------------------- | -------------------- | ------------------------------- | ------------------------------ |
| **[CONTAINS](./CONTAINS.md)**       | Hierarchy tree       | "What's inside this?"           | —                              |
| **[IN_SNAPSHOT](./IN_SNAPSHOT.md)** | Version membership   | "When did this exist?"          | —                              |
| **[LOCATION](./LOCATION.md)**       | Position & ownership | "Where is this, and what role?" | HANDLED_BY, IN_FILE, IN_MODULE |

### Code Relations (1)

| Edge                              | Purpose          | Semantic                    | Sub-Types                                |
| --------------------------------- | ---------------- | --------------------------- | ---------------------------------------- |
| **[REFERENCES](./REFERENCES.md)** | Code connections | "What does this reference?" | CALL, TYPE_REF, IMPORT, PATTERN, SIMILAR |

### Implementation (1)

| Edge                          | Purpose                  | Semantic                      | Sub-Types                   |
| ----------------------------- | ------------------------ | ----------------------------- | --------------------------- |
| **[REALIZES](./REALIZES.md)** | Implementation & testing | "What implements/tests this?" | IMPLEMENTS, TESTS, VERIFIES |

### Data (1)

| Edge                        | Purpose   | Semantic                      | Sub-Types   |
| --------------------------- | --------- | ----------------------------- | ----------- |
| **[MUTATES](./MUTATES.md)** | Data flow | "What data does this access?" | READ, WRITE |

### Dependencies (1)

| Edge                              | Purpose      | Semantic                    | Sub-Types                             |
| --------------------------------- | ------------ | --------------------------- | ------------------------------------- |
| **[DEPENDS_ON](./DEPENDS_ON.md)** | Dependencies | "What does this depend on?" | LIBRARY, SERVICE, CONFIG, STYLE_GUIDE |

### Knowledge (1)

| Edge                            | Purpose                    | Semantic                         | Sub-Types                                  |
| ------------------------------- | -------------------------- | -------------------------------- | ------------------------------------------ |
| **[DOCUMENTS](./DOCUMENTS.md)** | Documentation & governance | "What explains or governs this?" | FEATURE, ENDPOINT, SYMBOL, MODULE, PATTERN |

### Evolution (1)

| Edge                      | Purpose        | Semantic                          | Sub-Types            |
| ------------------------- | -------------- | --------------------------------- | -------------------- |
| **[TRACKS](./TRACKS.md)** | Change history | "When did this appear or change?" | INTRODUCED, MODIFIED |

### Impact (1)

| Edge                        | Purpose                | Semantic                         | Sub-Types          |
| --------------------------- | ---------------------- | -------------------------------- | ------------------ |
| **[IMPACTS](./IMPACTS.md)** | Incident relationships | "How does this incident relate?" | CAUSED_BY, AFFECTS |

---

## Quick Navigation

### By Query Pattern

- **Tree Traversal** (breadth-first): [CONTAINS](./CONTAINS.md)
- **Version Lookups** (O(1) cardinality invariant): [IN_SNAPSHOT](./IN_SNAPSHOT.md)
- **Role-Based Filtering** (ownership queries): [LOCATION](./LOCATION.md)
- **Call Graphs** (code flow): [REFERENCES {type: 'CALL'}](./REFERENCES.md)
- **Type Analysis**: [REFERENCES {type: 'TYPE_REF'}](./REFERENCES.md)
- **Data Flow**: [MUTATES](./MUTATES.md)
- **Feature Implementation**: [REALIZES {role: 'IMPLEMENTS'}](./REALIZES.md)
- **Test Coverage**: [REALIZES {role: 'TESTS'|'VERIFIES'}](./REALIZES.md)
- **Documentation**: [DOCUMENTS](./DOCUMENTS.md)
- **Evolution Tracking**: [TRACKS](./TRACKS.md)

### By Source/Target Node Pairs

| Source → Target                            | Edges                            | Notes                  |
| ------------------------------------------ | -------------------------------- | ---------------------- |
| File → Module                              | CONTAINS                         | Hierarchy              |
| Module → Snapshot                          | CONTAINS                         | Hierarchy              |
| Snapshot → Codebase                        | CONTAINS                         | Hierarchy              |
| \*Scoped → Snapshot                        | IN_SNAPSHOT                      | Version membership     |
| Symbol → Symbol                            | REFERENCES {type: 'CALL'}        | Call graph             |
| Symbol → Symbol                            | REFERENCES {type: 'TYPE_REF'}    | Type references        |
| Symbol → Symbol                            | REFERENCES {type: 'IMPORT'}      | Import statements      |
| Symbol → Pattern                           | REFERENCES {type: 'PATTERN'}     | Pattern adherence      |
| Symbol → Symbol                            | REFERENCES {type: 'SIMILAR'}     | Embedding similarity   |
| Symbol/Endpoint → SchemaEntity             | MUTATES                          | Data flow (READ/WRITE) |
| Symbol/Endpoint → Feature                  | REALIZES {role: 'IMPLEMENTS'}    | Implementation         |
| TestCase → Symbol/Endpoint                 | REALIZES {role: 'TESTS'}         | Test coverage          |
| TestCase → Feature                         | REALIZES {role: 'VERIFIES'}      | Feature verification   |
| Symbol/Module → Pattern                    | REFERENCES {type: 'PATTERN'}     | Pattern usage          |
| Module/Symbol/Endpoint → ExternalService   | DEPENDS_ON {kind: 'SERVICE'}     | External APIs          |
| Module/Symbol → ConfigurationVariable      | DEPENDS_ON {kind: 'CONFIG'}      | Configuration          |
| Module/Symbol/Endpoint → ExternalService   | DEPENDS_ON {kind: 'LIBRARY'}     | Libraries (not indexed)|
| Module/Symbol → StyleGuide                 | DEPENDS_ON {kind: 'STYLE_GUIDE'} | Style conformance      |
| SpecDoc/StyleGuide → Feature/Module/Symbol | DOCUMENTS                        | Documentation          |
| Endpoint → Symbol                          | LOCATION {role: 'HANDLED_BY'}    | Endpoint handler       |
| Endpoint/TestCase → File                   | LOCATION {role: 'IN_FILE'}       | Location in file       |
| Endpoint/TestCase → Module                 | LOCATION {role: 'IN_MODULE'}     | Location in module     |
| Symbol/Feature/TestCase → Snapshot         | TRACKS {event: 'INTRODUCED'}     | Introduction           |
| Symbol/Feature/TestCase → Snapshot         | TRACKS {event: 'MODIFIED'}       | Modification           |
| Incident → Symbol/Feature/Endpoint         | IMPACTS {type: 'CAUSED_BY'}      | Root cause             |
| Incident → Symbol/Feature/Endpoint         | IMPACTS {type: 'AFFECTS'}        | Impact                 |

---

## Design Rationale

### Why Consolidate?

1. **Query Multiplexing**: Single-match queries capture all related relationships (e.g., all
   `:DEPENDS_ON` variants in one pattern)
2. **Extensibility**: Add new sub-types via properties without schema migration
3. **Performance**: Fewer relationship types → better cardinality optimization in query planner
4. **Maintainability**: Properties are self-documenting; easier to extend than creating new types
5. **Best Practices**: Aligns with Neo4j/Memgraph guidance (10–20 types optimal; Memgraph knowledge
   graph example uses 9)

### Why Keep CONTAINS, IN_SNAPSHOT, LOCATION Separate?

| Edge             | Reason                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[:CONTAINS]`    | **Transitive tree**: Forms hierarchy for breadth-first exploration (`[:CONTAINS*]`). Merging breaks path finding. Requires tree-optimized indexes.                       |
| `[:IN_SNAPSHOT]` | **Cardinality invariant**: Every snapshot-scoped node has **exactly 1**. Critical for version tracking and temporal queries. Separate index for O(1) lookups.            |
| `[:LOCATION]`    | **Role-based semantics**: Same source/target pairs (Symbol→File, Endpoint→Module) but different roles (HANDLER vs. DEFINED_IN vs. IN_FILE). Role property distinguishes. |

---

## Property-Based Sub-Typing Pattern

Each consolidated edge type uses a relationship property to differentiate sub-types:

```cypher
-- Example: [:REFERENCES] edge with type property
(symbol:Symbol)-[r:REFERENCES {type: 'CALL'}]->(target:Symbol)
(symbol:Symbol)-[r:REFERENCES {type: 'TYPE_REF'}]->(target:Symbol)
(symbol:Symbol)-[r:REFERENCES {type: 'IMPORT'}]->(target:Symbol)

-- Example: [:MUTATES] edge with operation property
(symbol:Symbol)-[r:MUTATES {operation: 'READ'}]->(entity:SchemaEntity)
(symbol:Symbol)-[r:MUTATES {operation: 'WRITE'}]->(entity:SchemaEntity)

-- Example: [:TRACKS] edge with event property
(symbol:Symbol)-[r:TRACKS {event: 'INTRODUCED'}]->(snapshot:Snapshot)
(symbol:Symbol)-[r:TRACKS {event: 'MODIFIED'}]->(snapshot:Snapshot)
```

**Querying pattern**:

```cypher
-- Get all calls from a symbol
MATCH (sym:Symbol)-[r:REFERENCES {type: 'CALL'}]->(target:Symbol)
RETURN target

-- Get all READ operations (data flow analysis)
MATCH (sym:Symbol)-[r:MUTATES {operation: 'READ'}]->(entity:SchemaEntity)
RETURN entity

-- Track when symbol was introduced (no property filter needed)
MATCH (sym:Symbol)-[r:TRACKS]->(snap:Snapshot)
RETURN snap, r.event
```

---

## Common Properties (All Edges)

| Property     | Type            | Notes                                      |
| ------------ | --------------- | ------------------------------------------ |
| `createdAt`  | timestamp       | When relationship was created/indexed      |
| `confidence` | float (0.0–1.0) | Optional; LLM extraction confidence        |
| `context`    | string          | Optional; Additional metadata or reasoning |

Edge-specific properties documented in individual edge files.

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Full schema spec with query examples
- [RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md](../research/RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md)
  – Design decisions & rationale
- [../nodes/README.md](../nodes/README.md) – Node type catalog (15 node types)
