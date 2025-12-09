# Texere Indexer – Schema Documentation Summary

**Document Status**: Complete  
**Last Updated**: December 2025  
**Schema Version**: 1.0 (Consolidated to 10 Edge Types)

---

## Overview

The Texere Knowledge Graph schema is now fully documented across 26 files:

- **15 Node Type Specifications** (in `nodes/`)
- **10 Edge Type Specifications** (in `edges/`)
- **1 Master Schema Specification** (`graph_schema_spec.md`)
- **1 Consolidation Analysis** (in `research/`)

This document serves as a roadmap to the schema documentation.

---

## Key Design Decisions

### 1. Consolidated Edge Types (10 Core Types)

After research into Neo4j/Memgraph best practices, we consolidated ~25 explicit edge types down to
**10 core types** using relationship properties to differentiate sub-types.

**Rationale**:

- **Query Multiplexing**: Single-match queries capture all related relationships (e.g., all
  `:DEPENDS_ON` variants in one pattern)
- **Extensibility**: Add new sub-types via properties without schema migration
- **Performance**: Fewer relationship types → better cardinality optimization
- **Maintainability**: Properties are self-documenting
- **Best Practices**: Aligns with Neo4j/Memgraph guidance (10–20 types optimal)

**Trade-off**: Three structural edges (CONTAINS, IN_SNAPSHOT, LOCATION) kept separate for distinct
query patterns and cardinality invariants.

### 2. Hierarchical Organization

Each node/edge has a dedicated file with consistent structure:

- **Properties table** (with types and constraints)
- **Schema** (Cypher constraints and examples)
- **Relationships** (outgoing/incoming with cardinality)
- **Usage patterns** (Cypher examples for common queries)
- **Common use cases** (what questions this answers)
- **Cross-references** (links to related nodes/edges)

**Benefits**:

- Easily linkable and maintainable
- Self-contained specifications
- Localized changes (update one file, not a monolith)

### 3. Snapshot-Scoped vs. Cross-Snapshot Nodes

**Snapshot-Scoped (10 nodes)**:

- Created per commit/snapshot
- Deleted when snapshot is deleted
- Linked via `[:IN_SNAPSHOT]` (cardinality invariant: exactly 1)
- Examples: Module, File, Symbol, Endpoint, TestCase

**Cross-Snapshot (5 nodes)**:

- Persist across snapshots
- Soft-deleted (marked `isDeleted: true`)
- Track evolution via `[:TRACKS]` edges
- Examples: Feature, Pattern, Incident, ExternalService, StyleGuide

---

## Node Type Catalog

### Structural Nodes (4)

| Node                            | File                | Purpose                     | Scope          |
| ------------------------------- | ------------------- | --------------------------- | -------------- |
| [Codebase](./nodes/Codebase.md) | `nodes/Codebase.md` | Git repository root         | 1 per repo     |
| [Snapshot](./nodes/Snapshot.md) | `nodes/Snapshot.md` | Git commit being indexed    | N per codebase |
| [Module](./nodes/Module.md)     | `nodes/Module.md`   | Logical package/library/app | N per snapshot |
| [File](./nodes/File.md)         | `nodes/File.md`     | Source code file            | N per module   |

### Code Nodes (2)

| Node                            | File                | Purpose                          | Scope          |
| ------------------------------- | ------------------- | -------------------------------- | -------------- |
| [Symbol](./nodes/Symbol.md)     | `nodes/Symbol.md`   | Function, class, type, interface | N per file     |
| [Endpoint](./nodes/Endpoint.md) | `nodes/Endpoint.md` | HTTP API route                   | N per snapshot |

### Behavior & Data Nodes (2)

| Node                                  | File                    | Purpose                   | Scope          |
| ------------------------------------- | ----------------------- | ------------------------- | -------------- |
| [TestCase](./nodes/TestCase.md)       | `nodes/TestCase.md`     | Unit/integration/e2e test | N per file     |
| [DataContract](nodes/DataContract.md) | `nodes/DataContract.md` | Database model            | N per snapshot |

### Metadata Nodes (2)

| Node                                              | File                         | Purpose                           | Scope          |
| ------------------------------------------------- | ---------------------------- | --------------------------------- | -------------- |
| [SpecDoc](./nodes/SpecDoc.md)                     | `nodes/SpecDoc.md`           | Documentation (spec, ADR, design) | N per snapshot |
| [ThirdPartyLibrary](./nodes/ThirdPartyLibrary.md) | `nodes/ThirdPartyLibrary.md` | Installed dependency              | N per snapshot |

### Feature & Issue Nodes (3)

| Node                            | File                | Purpose             | Scope          |
| ------------------------------- | ------------------- | ------------------- | -------------- |
| [Feature](./nodes/Feature.md)   | `nodes/Feature.md`  | User-facing feature | 1 per feature  |
| [Pattern](./nodes/Pattern.md)   | `nodes/Pattern.md`  | Code pattern        | 1 per pattern  |
| [Incident](./nodes/Incident.md) | `nodes/Incident.md` | Bug/issue report    | 1 per incident |

### Governance Nodes (2)

| Node                                          | File                       | Purpose                 | Scope         |
| --------------------------------------------- | -------------------------- | ----------------------- | ------------- |
| [ExternalService](./nodes/ExternalService.md) | `nodes/ExternalService.md` | Third-party API         | 1 per service |
| [StyleGuide](./nodes/StyleGuide.md)           | `nodes/StyleGuide.md`      | Coding convention/guide | 1 per guide   |

---

## Edge Type Catalog

### Structural Edges (3)

| Edge             | File                   | Sub-Types                      | Purpose            | Cardinality       |
| ---------------- | ---------------------- | ------------------------------ | ------------------ | ----------------- |
| `[:CONTAINS]`    | `edges/CONTAINS.md`    | —                              | Hierarchy tree     | 1 per child node  |
| `[:IN_SNAPSHOT]` | `edges/IN_SNAPSHOT.md` | —                              | Version membership | 1 per scoped node |
| `[:LOCATION]`    | `edges/LOCATION.md`    | HANDLED_BY, IN_FILE, IN_MODULE | Position/ownership | 1 per role        |

### Code Relations (1)

| Edge            | File                  | Sub-Types                                | Purpose          | Cardinality |
| --------------- | --------------------- | ---------------------------------------- | ---------------- | ----------- |
| `[:REFERENCES]` | `edges/REFERENCES.md` | CALL, TYPE_REF, IMPORT, PATTERN, SIMILAR | Code connections | 0+          |

### Implementation (1)

| Edge          | File                | Sub-Types                   | Purpose                | Cardinality |
| ------------- | ------------------- | --------------------------- | ---------------------- | ----------- |
| `[:REALIZES]` | `edges/REALIZES.md` | IMPLEMENTS, TESTS, VERIFIES | Implementation/testing | 0+          |

### Data (1)

| Edge         | File               | Sub-Types   | Purpose   | Cardinality |
| ------------ | ------------------ | ----------- | --------- | ----------- |
| `[:MUTATES]` | `edges/MUTATES.md` | READ, WRITE | Data flow | 0+          |

### Dependencies (1)

| Edge            | File                  | Sub-Types                                      | Purpose      | Cardinality |
| --------------- | --------------------- | ---------------------------------------------- | ------------ | ----------- |
| `[:DEPENDS_ON]` | `edges/DEPENDS_ON.md` | LIBRARY, SERVICE, CONFIG, STYLE_GUIDE, FEATURE | Dependencies | 0+          |

### Knowledge (1)

| Edge           | File                 | Sub-Types                                  | Purpose       | Cardinality |
| -------------- | -------------------- | ------------------------------------------ | ------------- | ----------- |
| `[:DOCUMENTS]` | `edges/DOCUMENTS.md` | FEATURE, ENDPOINT, SYMBOL, MODULE, PATTERN | Documentation | 0+          |

### Evolution (1)

| Edge        | File              | Sub-Types            | Purpose        | Cardinality               |
| ----------- | ----------------- | -------------------- | -------------- | ------------------------- |
| `[:TRACKS]` | `edges/TRACKS.md` | INTRODUCED, MODIFIED | Change history | 1 (INTRO) + 0+ (MODIFIED) |

### Impact (1)

| Edge         | File               | Sub-Types          | Purpose                | Cardinality |
| ------------ | ------------------ | ------------------ | ---------------------- | ----------- |
| `[:IMPACTS]` | `edges/IMPACTS.md` | CAUSED_BY, AFFECTS | Incident relationships | 0+          |

---

## Documentation Structure

```
docs/specs/feature/indexer/
├── README.md                              # Main feature spec index
├── graph_schema_spec.md                   # Master schema spec
├── nodes/
│   ├── README.md                          # Node catalog index
│   ├── Codebase.md
│   ├── Snapshot.md
│   ├── Module.md
│   ├── File.md
│   ├── Symbol.md
│   ├── Endpoint.md
│   ├── DataContract.md
│   ├── TestCase.md
│   ├── SpecDoc.md
│   ├── ThirdPartyLibrary.md
│   ├── Feature.md
│   ├── Pattern.md
│   ├── Incident.md
│   ├── ExternalService.md
│   └── StyleGuide.md
├── edges/
│   ├── README.md                          # Edge catalog index
│   ├── CONTAINS.md
│   ├── IN_SNAPSHOT.md
│   ├── REFERENCES.md
│   ├── REALIZES.md
│   ├── MUTATES.md
│   ├── DEPENDS_ON.md
│   ├── DOCUMENTS.md
│   ├── LOCATION.md
│   ├── TRACKS.md
│   └── IMPACTS.md
├── research/
│   ├── RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md
│   ├── NODE_EDGE_MAPPING.md
│   └── ... (other research)
└── [other specs]
```

---

## Quick Start: Where to Start Reading

### For New Team Members

1. **[nodes/README.md](./nodes/README.md)** – Overview of 15 node types
2. **[edges/README.md](./edges/README.md)** – Overview of 10 edge types
3. **[graph_schema_spec.md](./graph_schema_spec.md)** – Full constraints and examples

### For Specific Questions

- **"What data does Symbol store?"** → [nodes/Symbol.md](./nodes/Symbol.md)
- **"How do we model features?"** → [nodes/Feature.md](./nodes/Feature.md)
- **"What's the call graph?"** → [edges/REFERENCES.md](./edges/REFERENCES.md) (CALL sub-type)
- **"How do we track changes?"** → [edges/TRACKS.md](./edges/TRACKS.md)
- **"What breaks when I change this?"** → [edges/MUTATES.md](./edges/MUTATES.md) or
  [edges/REALIZES.md](./edges/REALIZES.md)

### For Implementation

1. **[graph_schema_spec.md](./graph_schema_spec.md)** § 4 – Constraints & Indexes (run Cypher setup)
2. **[nodes/Symbol.md](./nodes/Symbol.md)** § Schema – Example node creation
3. **[edges/CONTAINS.md](./edges/CONTAINS.md)** § Query Patterns – Tree traversal examples

---

## Property-Based Sub-Typing Pattern

All consolidated edges follow this pattern:

```cypher
-- Example: [:REFERENCES] with type property
(symbol:Symbol)-[r:REFERENCES {type: 'CALL', line: 42, col: 10}]->(callee:Symbol)
(symbol:Symbol)-[r:REFERENCES {type: 'TYPE_REF', line: 25, col: 5}]->(type:Symbol)
(symbol:Symbol)-[r:REFERENCES {type: 'IMPORT', line: 1, col: 0}]->(imported:Symbol)

-- Example: [:MUTATES] with operation property
(symbol:Symbol)-[r:MUTATES {operation: 'READ'}]->(entity:DataContract)
(symbol:Symbol)-[r:MUTATES {operation: 'WRITE'}]->(entity:DataContract)

-- Example: [:REALIZES] with role property
(symbol:Symbol)-[r:REALIZES {role: 'IMPLEMENTS'}]->(feature:Feature)
(test:TestCase)-[r:REALIZES {role: 'TESTS'}]->(symbol:Symbol)
```

**Benefit**: Single-match queries capture all variants:

```cypher
-- Get ALL code references (calls + type refs + imports)
MATCH (sym:Symbol)-[r:REFERENCES]->(target)
RETURN target, r.type

-- Filter specific sub-type
MATCH (sym:Symbol)-[r:REFERENCES {type: 'CALL'}]->(target)
RETURN target
```

---

## Cross-References

### Node → Node Relationships

All 15 nodes can connect via various edges. Key patterns:

- **Hierarchy**: File → Module → Snapshot → Codebase (via `[:CONTAINS]`)
- **Versioning**: All scoped nodes → Snapshot (via `[:IN_SNAPSHOT]`)
- **Features**: Symbol/Endpoint → Feature (via `[:REALIZES {role: 'IMPLEMENTS'}]`)
- **Data**: Symbol/Endpoint → DataContract (via `[:MUTATES]`)
- **Testing**: TestCase → Symbol/Feature (via `[:REALIZES]`)
- **Documentation**: SpecDoc/StyleGuide → Feature/Module/Symbol (via `[:DOCUMENTS]`)
- **Dependencies**: Module/Symbol/Endpoint → ExternalService/Library/Config (via `[:DEPENDS_ON]`)
- **Evolution**: All nodes → Snapshot (via `[:TRACKS]`)

**See**: [nodes/README.md](./nodes/README.md) (Cardinality Invariants section) and
[edges/README.md](./edges/README.md) (Source/Target Pairs table).

---

## Validation Checklist

Before using schema:

- [ ] All 15 node types created with unique indexes (§4.1)
- [ ] All 10 edge types indexed by property (§4.2)
- [ ] Cardinality constraints enforced (§ IN_SNAPSHOT.md, LOCATION.md)
- [ ] CONTAINS hierarchy properly directed (bottom-up)
- [ ] IN_SNAPSHOT relationship required for all scoped nodes
- [ ] Soft-delete implemented for cross-snapshot nodes
- [ ] Temporal indexes on Snapshot timestamps

**Setup**: See [graph_schema_spec.md](./graph_schema_spec.md) § 4 for Cypher constraints.

---

## Index Strategy

### Priority 1: Unique Constraints (Auto-Indexed)

```cypher
CREATE CONSTRAINT {label}_id_unique
FOR (n:{label}) REQUIRE n.id IS UNIQUE;
```

All 15 node types (auto-generates b-tree index).

### Priority 2: Edge Property Indexes

```cypher
-- Code analysis
CREATE INDEX references_type FOR ()-[r:REFERENCES]-() ON (r.type);

-- Dependency queries
CREATE INDEX depends_on_kind FOR ()-[r:DEPENDS_ON]-() ON (r.kind);

-- Temporal analysis
CREATE INDEX tracks_event FOR ()-[r:TRACKS]-() ON (r.event);
```

See [graph_schema_spec.md](./graph_schema_spec.md) § 4.2 for full index strategy.

---

## Modification Workflow

To update the schema:

1. **Adding new node type**: Create `nodes/NewNode.md` following Symbol.md pattern
2. **Adding sub-type to edge**: Update edge file (e.g., REFERENCES.md), add property to Sub-Types
   section
3. **Changing cardinality**: Update nodes/README.md § Cardinality Invariants
4. **New edge type** (rare): Create `edges/NewEdge.md`, update edges/README.md table

**Principle**: Changes are additive; backward compatibility via properties.

---

## Research & Rationale

### Design Decisions

- **[RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md](./research/RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md)**
  – Why 10 edges instead of 25+
- **[NODE_EDGE_MAPPING.md](./research/NODE_EDGE_MAPPING.md)** – Complete node↔edge inventory matrix

### Implementation Guides

- **[LLM_EXTRACTION_PATTERNS.md](./research/LLM_EXTRACTION_PATTERNS.md)** – How to extract nodes
  from code
- **[EXTRACTION_DIFFICULTY_ANALYSIS.md](./research/EXTRACTION_DIFFICULTY_ANALYSIS.md)** – Confidence
  levels per extraction task

---

## Common Queries by Use Case

### Feature Mapping

```cypher
MATCH (f:Feature {id: 'payment'})-[r1:REALIZES {role: 'IMPLEMENTS'}]-(sym:Symbol)
OPTIONAL MATCH (sym)-[r2:REALIZES {role: 'TESTS'}]-(test:TestCase)
RETURN f, sym, test
```

**See**: [nodes/Feature.md](./nodes/Feature.md) § Usage Patterns

### Call Graph

```cypher
MATCH (sym:Symbol {id: $symbolId})-[r:REFERENCES {type: 'CALL'}*0..3]->(reachable:Symbol)
RETURN reachable
```

**See**: [edges/REFERENCES.md](./edges/REFERENCES.md) § Query Patterns

### Data Dependency

```cypher
MATCH (sym:Symbol)-[r:MUTATES {operation: op}]->(entity:DataContract)
RETURN entity, r.operation
```

**See**: [edges/MUTATES.md](./edges/MUTATES.md) § Query Patterns

### Root Cause Analysis

```cypher
MATCH (incident:Incident {id: $incidentId})-[r:IMPACTS {type: 'CAUSED_BY'}]->(cause)
RETURN cause, r.confidence
```

**See**: [edges/IMPACTS.md](./edges/IMPACTS.md) § Query Patterns

---

## Performance Tuning

- **Call graphs**: Use depth limits (`*0..5` not `*`)
- **Large hierarchies**: Cache CONTAINS traversals (>100K nodes)
- **Temporal queries**: Use snapshot timestamp index, not transitive TRACKS
- **Similarity search**: Cache embedding distances in Qdrant, not graph traversal

See individual edge docs (Performance Notes sections) for details.

---

## References

- **Master Specification**: [graph_schema_spec.md](./graph_schema_spec.md)
- **Node Index**: [nodes/README.md](./nodes/README.md)
- **Edge Index**: [edges/README.md](./edges/README.md)
- **Research**: [research/](./research/)
- **Feature Context**: [../README.md](../README.md)
