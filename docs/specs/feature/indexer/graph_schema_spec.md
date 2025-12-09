# Texere Indexer – Graph Database Schema Specification

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Active

## Overview

This specification defines the Neo4j/Memgraph schema for the Texere Knowledge Graph, including node
and edge types, constraints, indexes, query patterns, and lifecycle management.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Node Type Catalog](#2-node-type-catalog)
3. [Relationship Catalog](#3-relationship-catalog)
4. [Constraints & Indexes](#4-constraints--indexes)
5. [CONTAINS Hierarchy Algorithm](#5-contains-hierarchy-algorithm)
6. [Cypher Query Patterns](#6-cypher-query-patterns)
7. [Snapshot Lifecycle](#7-snapshot-lifecycle)
8. [Scaling Considerations](#8-scaling-considerations)
9. [Changelog](#9-changelog)

---

## 1. Design Principles

### 1.1 Labeled Nodes with Properties

- Each node type is a Neo4j label (e.g., `:Codebase`, `:Symbol`, `:Feature`)
- Immutable, derived data stored as properties (e.g., `Symbol.kind`, `Symbol.range`)
- No separate nodes for code structure metadata; all metadata lives in parent node properties

### 1.2 Hierarchical CONTAINS Relationships

- All `:CONTAINS` edges directed bottom-up:
  `File -[:CONTAINS]-> Module -[:CONTAINS]-> Snapshot -[:CONTAINS]-> Codebase`
- Single relationship type throughout hierarchy; enables transitive queries via `[:CONTAINS*]`
- No intermediate nodes for folder structure; folder paths are properties on File/Module nodes
- Simplifies hierarchy traversal and deletion semantics

### 1.3 ID Strategy

- **Unique Constraints**: Every node label has one or more unique identifiers
- **Composite Keys**: Snapshot ID = `codebaseId + commitHash`; Symbol ID =
  `snapshotId + filePath + symbolName + range`
- **No Auto-Increment**: IDs generated during ingest; deterministic and reproducible

### 1.4 Code Relation Edges

- Single `:REFERENCES` relationship type with `type` property: `{type: 'CALL'}` or
  `{type: 'REFERENCE'}`
- Avoids edge type proliferation; enables filtering and transitive queries
- Location metadata (file, line, col) stored on relationship properties

### 1.5 Snapshot-Scoped vs. Non-Scoped

- **Snapshot-Scoped Nodes**: Created per snapshot (Module, File, Symbol, Endpoint, TestCase,
  SpecDoc, ThirdPartyLib)
  - Linked to Snapshot via `[:IN_SNAPSHOT]` relationship
  - Deleted snapshots remove associated scoped nodes
- **Cross-Snapshot Nodes**: Persist across snapshots (Feature, Pattern, Incident, ExternalService)
  - Linked via `[:INTRODUCED_IN]`, `[:MODIFIED_IN]` to track evolution
  - Never deleted; marked `isDeleted: true` if obsolete

### 1.6 Audit Trail

- All CRUD nodes have `createdAt` and `updatedAt` timestamps
- Snapshot tracking via `[:INTRODUCED_IN]` and `[:MODIFIED_IN]` edges
- No deletion in v1; mark `isDeleted: true` for soft deletes

**Cite as:** §1

---

## 2. Node Type Catalog

### 2.1 Structural Nodes

#### Codebase

| Property    | Type      | Constraints | Notes                                     |
| ----------- | --------- | ----------- | ----------------------------------------- |
| `id`        | string    | UNIQUE      | Codebase identifier (e.g., "texere-main") |
| `name`      | string    | Required    | Human-readable name                       |
| `url`       | string    | Optional    | Repository URL (e.g., GitHub URL)         |
| `createdAt` | timestamp | Required    | When indexing began                       |
| `updatedAt` | timestamp | Required    | Last index/update                         |

```cypher
CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS
FOR (n:Codebase) REQUIRE n.id IS UNIQUE;
```

#### Snapshot

| Property      | Type      | Constraints | Notes                              |
| ------------- | --------- | ----------- | ---------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `codebaseId:commitHash` |
| `codebaseId`  | string    | Required    | Foreign key to Codebase            |
| `commitHash`  | string    | Required    | Git commit SHA-1                   |
| `author`      | string    | Optional    | Commit author                      |
| `message`     | string    | Optional    | Commit message                     |
| `timestamp`   | timestamp | Required    | Commit timestamp                   |
| `branch`      | string    | Optional    | Branch name (e.g., "main")         |
| `indexStatus` | enum      | Required    | "success" \| "failed" \| "partial" |
| `indexedAt`   | timestamp | Required    | When indexed                       |
| `createdAt`   | timestamp | Required    | Snapshot creation time             |

```cypher
CREATE CONSTRAINT snapshot_id_unique IF NOT EXISTS
FOR (n:Snapshot) REQUIRE n.id IS UNIQUE;
```

#### Module

| Property     | Type      | Constraints | Notes                                                  |
| ------------ | --------- | ----------- | ------------------------------------------------------ |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:modulePath`                     |
| `snapshotId` | string    | Required    | Foreign key to Snapshot                                |
| `name`       | string    | Required    | Module name (e.g., "apps/agent-orchestrator")          |
| `path`       | string    | Required    | Absolute module path                                   |
| `type`       | enum      | Optional    | "nx-app" \| "nx-lib" \| "maven-project" \| "cargo-pkg" |
| `language`   | string    | Optional    | Primary language ("ts" \| "py" \| "java")              |
| `createdAt`  | timestamp | Required    | When created in snapshot                               |

```cypher
CREATE CONSTRAINT module_id_unique IF NOT EXISTS
FOR (n:Module) REQUIRE n.id IS UNIQUE;
```

#### File

| Property     | Type      | Constraints | Notes                                   |
| ------------ | --------- | ----------- | --------------------------------------- |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:filePath`        |
| `snapshotId` | string    | Required    | Foreign key to Snapshot                 |
| `path`       | string    | Required    | Absolute file path in repo              |
| `name`       | string    | Required    | Filename only                           |
| `language`   | string    | Required    | "ts" \| "tsx" \| "js" \| "py" \| "java" |
| `isTest`     | boolean   | Required    | Is this a test file?                    |
| `isDeleted`  | boolean   | Required    | Marked deleted in latest snapshot       |
| `createdAt`  | timestamp | Required    | When created in snapshot                |

```cypher
CREATE CONSTRAINT file_id_unique IF NOT EXISTS
FOR (n:File) REQUIRE n.id IS UNIQUE;
```

#### Symbol

| Property      | Type      | Constraints | Notes                                                                            |
| ------------- | --------- | ----------- | -------------------------------------------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:path:name:line:col`                                       |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                                                          |
| `filePath`    | string    | Required    | File path containing symbol                                                      |
| `name`        | string    | Required    | Symbol name                                                                      |
| `kind`        | enum      | Required    | "function" \| "class" \| "method" \| "const" \| "type" \| "interface" \| "other" |
| `startLine`   | integer   | Required    | 1-indexed start line                                                             |
| `startCol`    | integer   | Required    | 0-indexed start column                                                           |
| `endLine`     | integer   | Required    | 1-indexed end line                                                               |
| `endCol`      | integer   | Required    | 0-indexed end column                                                             |
| `isExported`  | boolean   | Optional    | Is exported/public?                                                              |
| `docstring`   | string    | Optional    | JSDoc / docstring content                                                        |
| `embeddingId` | string    | Optional    | Qdrant vector ID (for similarity)                                                |
| `isDeleted`   | boolean   | Required    | Deleted in latest snapshot                                                       |
| `createdAt`   | timestamp | Required    | When created in snapshot                                                         |

```cypher
CREATE CONSTRAINT symbol_id_unique IF NOT EXISTS
FOR (n:Symbol) REQUIRE n.id IS UNIQUE;
```

**Cite as:** §2.1

### 2.2 Domain & Behavior Nodes

#### Endpoint

| Property          | Type      | Constraints | Notes                                           |
| ----------------- | --------- | ----------- | ----------------------------------------------- |
| `id`              | string    | UNIQUE      | Composite: `snapshotId:verb:path`               |
| `snapshotId`      | string    | Required    | Foreign key to Snapshot                         |
| `verb`            | string    | Required    | "GET" \| "POST" \| "PUT" \| "DELETE" \| "PATCH" |
| `path`            | string    | Required    | API path (e.g., "/api/features/:id")            |
| `handlerSymbolId` | string    | Required    | Foreign key to Symbol                           |
| `description`     | string    | Optional    | Endpoint description                            |
| `createdAt`       | timestamp | Required    | When created in snapshot                        |

```cypher
CREATE CONSTRAINT endpoint_id_unique IF NOT EXISTS
FOR (n:Endpoint) REQUIRE n.id IS UNIQUE;
```

#### SchemaEntity

| Property      | Type      | Constraints | Notes                                         |
| ------------- | --------- | ----------- | --------------------------------------------- |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:entityName`            |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                       |
| `name`        | string    | Required    | Entity/model name (e.g., "User", "Feature")   |
| `kind`        | enum      | Required    | "prisma-model" \| "sql-table" \| "orm-entity" |
| `description` | string    | Optional    | Entity description                            |
| `createdAt`   | timestamp | Required    | When created in snapshot                      |

```cypher
CREATE CONSTRAINT schema_entity_id_unique IF NOT EXISTS
FOR (n:SchemaEntity) REQUIRE n.id IS UNIQUE;
```

#### TestCase

| Property     | Type      | Constraints | Notes                                     |
| ------------ | --------- | ----------- | ----------------------------------------- |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:filePath:testName` |
| `snapshotId` | string    | Required    | Foreign key to Snapshot                   |
| `filePath`   | string    | Required    | Test file path                            |
| `name`       | string    | Required    | Test name (full describe/it hierarchy)    |
| `kind`       | enum      | Required    | "unit" \| "integration" \| "e2e"          |
| `startLine`  | integer   | Required    | Test location                             |
| `createdAt`  | timestamp | Required    | When created in snapshot                  |

```cypher
CREATE CONSTRAINT test_case_id_unique IF NOT EXISTS
FOR (n:TestCase) REQUIRE n.id IS UNIQUE;
```

#### SpecDoc

| Property      | Type      | Constraints | Notes                                                  |
| ------------- | --------- | ----------- | ------------------------------------------------------ |
| `id`          | string    | UNIQUE      | Composite: `snapshotId:docPath`                        |
| `snapshotId`  | string    | Required    | Foreign key to Snapshot                                |
| `path`        | string    | Required    | Spec file path in repo                                 |
| `name`        | string    | Required    | Document title                                         |
| `kind`        | enum      | Required    | "spec" \| "adr" \| "design-doc" \| "guide" \| "ticket" |
| `content`     | string    | Optional    | Document content (first 5KB)                           |
| `embeddingId` | string    | Optional    | Qdrant vector ID                                       |
| `createdAt`   | timestamp | Required    | When indexed                                           |

```cypher
CREATE CONSTRAINT spec_doc_id_unique IF NOT EXISTS
FOR (n:SpecDoc) REQUIRE n.id IS UNIQUE;
```

#### StyleGuide

| Property      | Type     | Constraints | Notes                         |
| ------------- | -------- | ----------- | ----------------------------- |
| `id`          | string   | UNIQUE      | Document path (non-scoped)    |
| `name`        | string   | Required    | Style guide name              |
| `description` | string   | Optional    | Guide description             |
| `appliesTo`   | string[] | Optional    | Module patterns it applies to |

```cypher
CREATE CONSTRAINT style_guide_id_unique IF NOT EXISTS
FOR (n:StyleGuide) REQUIRE n.id IS UNIQUE;
```

**Cite as:** §2.2

### 2.3 Cross-Snapshot Nodes

#### Feature

| Property      | Type      | Constraints | Notes                                   |
| ------------- | --------- | ----------- | --------------------------------------- |
| `id`          | string    | UNIQUE      | Feature identifier (from features.yaml) |
| `name`        | string    | Required    | Feature name                            |
| `description` | string    | Optional    | Feature description                     |
| `embeddingId` | string    | Optional    | Qdrant vector ID                        |
| `isDeleted`   | boolean   | Required    | Soft delete marker                      |
| `createdAt`   | timestamp | Required    | When first introduced                   |
| `updatedAt`   | timestamp | Required    | Last modification                       |

```cypher
CREATE CONSTRAINT feature_id_unique IF NOT EXISTS
FOR (n:Feature) REQUIRE n.id IS UNIQUE;
```

#### Pattern

| Property      | Type      | Constraints | Notes                                     |
| ------------- | --------- | ----------- | ----------------------------------------- |
| `id`          | string    | UNIQUE      | Pattern identifier                        |
| `name`        | string    | Required    | Pattern name (e.g., "express-middleware") |
| `description` | string    | Optional    | Pattern description                       |
| `source`      | enum      | Required    | "manual" \| "heuristic"                   |
| `createdAt`   | timestamp | Required    | When defined                              |

```cypher
CREATE CONSTRAINT pattern_id_unique IF NOT EXISTS
FOR (n:Pattern) REQUIRE n.id IS UNIQUE;
```

#### Incident

| Property      | Type      | Constraints | Notes                                     |
| ------------- | --------- | ----------- | ----------------------------------------- |
| `id`          | string    | UNIQUE      | Incident identifier (from incidents.yaml) |
| `title`       | string    | Required    | Incident title                            |
| `description` | string    | Optional    | Incident description                      |
| `severity`    | enum      | Optional    | "critical" \| "high" \| "medium" \| "low" |
| `status`      | enum      | Required    | "open" \| "resolved" \| "archived"        |
| `createdAt`   | timestamp | Required    | When incident occurred                    |
| `resolvedAt`  | timestamp | Optional    | When resolved                             |

```cypher
CREATE CONSTRAINT incident_id_unique IF NOT EXISTS
FOR (n:Incident) REQUIRE n.id IS UNIQUE;
```

#### ThirdPartyLibrary

| Property     | Type      | Constraints | Notes                                       |
| ------------ | --------- | ----------- | ------------------------------------------- |
| `id`         | string    | UNIQUE      | Composite: `snapshotId:packageName:version` |
| `snapshotId` | string    | Required    | Foreign key to Snapshot                     |
| `name`       | string    | Required    | Package name (e.g., "express")              |
| `version`    | string    | Required    | Semantic version                            |
| `registry`   | string    | Optional    | Registry URL (npm, pypi, etc.)              |
| `createdAt`  | timestamp | Required    | When indexed                                |

```cypher
CREATE CONSTRAINT library_id_unique IF NOT EXISTS
FOR (n:ThirdPartyLibrary) REQUIRE n.id IS UNIQUE;
```

#### ExternalService

| Property      | Type      | Constraints | Notes                                  |
| ------------- | --------- | ----------- | -------------------------------------- |
| `id`          | string    | UNIQUE      | Service identifier                     |
| `name`        | string    | Required    | Service name (e.g., "Stripe", "Auth0") |
| `description` | string    | Optional    | Service description                    |
| `url`         | string    | Optional    | Service homepage/API URL               |
| `createdAt`   | timestamp | Required    | When introduced                        |

```cypher
CREATE CONSTRAINT external_service_id_unique IF NOT EXISTS
FOR (n:ExternalService) REQUIRE n.id IS UNIQUE;
```

**Cite as:** §2.3

---

## 3. Relationship Catalog

This section defines the 10 core consolidated edge types. See
[RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md](./research/RELATIONSHIP_TYPE_CONSOLIDATION_ANALYSIS.md)
for detailed rationale and migration guidance.

### 3.1 Structural Backbone (Unchanged)

#### [:CONTAINS] – Hierarchy Tree

Bottom-up containment forming the repo structure. Enables transitive queries.

| From → To             | Meaning              | Cardinality | Notes     |
| --------------------- | -------------------- | ----------- | --------- |
| `File → Module`       | File in Module       | many-to-one | Tree edge |
| `Module → Snapshot`   | Module in Snapshot   | many-to-one | Tree edge |
| `Snapshot → Codebase` | Snapshot of Codebase | many-to-one | Tree edge |

```cypher
-- Transitive: all symbols in a module
MATCH (m:Module)-[:CONTAINS*]->(s:Symbol)
RETURN s

-- Why separate: Transitive tree requires dedicated index strategy
-- Merging breaks [:CONTAINS*] optimization
```

**Properties**: None  
**Index priority**: High (tree traversal)

**Cite as:** §3.1

---

#### [:IN_SNAPSHOT] – Version Membership

Every snapshot-scoped node belongs to exactly one snapshot (cardinality invariant).

| From → To                      | Meaning                  | Cardinality | Notes |
| ------------------------------ | ------------------------ | ----------- | ----- |
| `Symbol → Snapshot`            | Symbol in Snapshot       | exactly 1   |       |
| `Endpoint → Snapshot`          | Endpoint in Snapshot     | exactly 1   |       |
| `File → Snapshot`              | File in Snapshot         | exactly 1   |       |
| `Module → Snapshot`            | Module in Snapshot       | exactly 1   |       |
| `TestCase → Snapshot`          | TestCase in Snapshot     | exactly 1   |       |
| `SpecDoc → Snapshot`           | SpecDoc in Snapshot      | exactly 1   |       |
| `SchemaEntity → Snapshot`      | SchemaEntity in Snapshot | exactly 1   |       |
| `ThirdPartyLibrary → Snapshot` | Library in Snapshot      | exactly 1   |       |

```cypher
-- Direct lookup: "What snapshot is this symbol in?"
MATCH (sym:Symbol)-[:IN_SNAPSHOT]->(snap:Snapshot)
RETURN snap
```

**Properties**: None  
**Cardinality invariant**: CRITICAL (every scoped node has exactly 1)  
**Index priority**: Critical (O(1) version lookup)

**Cite as:** §3.1

---

### 3.2 Code Relations

#### [:REFERENCES] – Code Relations & Pattern Adherence

Consolidates: CALL, TYPE_REF, IMPORT, FOLLOWS_PATTERN, SIMILAR_TO

```cypher
-- Function calls
(symbol:Symbol)-[r:REFERENCES {kind: 'CALL', line: 42, col: 5}]->(symbol2:Symbol)

-- Type references
(symbol:Symbol)-[r:REFERENCES {kind: 'TYPE_REF', line: 10, col: 0}]->(symbol2:Symbol)

-- Imports
(symbol:Symbol)-[r:REFERENCES {kind: 'IMPORT', line: 15, col: 3}]->(symbol2:Symbol)

-- Pattern adherence
(symbol:Symbol)-[r:REFERENCES {kind: 'PATTERN', confidence: 0.85}]->(pattern:Pattern)
(endpoint:Endpoint)-[r:REFERENCES {kind: 'PATTERN', confidence: 0.92}]->(pattern:Pattern)
(module:Module)-[r:REFERENCES {kind: 'PATTERN', confidence: 0.78}]->(pattern:Pattern)

-- Embedding similarity
(symbol:Symbol)-[r:REFERENCES {kind: 'SIMILAR', distance: 0.12}]->(symbol2:Symbol)
(feature:Feature)-[r:REFERENCES {kind: 'SIMILAR', distance: 0.15}]->(feature2:Feature)
```

**Properties**:

- `kind`: 'CALL' | 'TYPE_REF' | 'IMPORT' | 'PATTERN' | 'SIMILAR'
- `line`, `col`: Integer (for code relations only)
- `confidence`: Float 0.0-1.0 (for PATTERN)
- `distance`: Float 0.0-1.0 (for SIMILAR, embedding distance)

**Index priority**: High (call graph, pattern discovery)

**Cite as:** §3.2

---

### 3.3 Realization & Implementation

#### [:REALIZES] – Implementation, Testing, Verification

Consolidates: IMPLEMENTS, TESTS, VERIFIES

Semantic: "What realizes this requirement?"

```cypher
-- Symbol implements Feature
(symbol:Symbol)-[r:REALIZES {role: 'IMPLEMENTS', confidence: 0.88}]->(feature:Feature)

-- Endpoint implements Feature
(endpoint:Endpoint)-[r:REALIZES {role: 'IMPLEMENTS', confidence: 0.92}]->(feature:Feature)

-- TestCase tests Symbol/Endpoint
(testCase:TestCase)-[r:REALIZES {role: 'TESTS', coverage: 'DIRECT'}]->(symbol:Symbol)
(testCase:TestCase)-[r:REALIZES {role: 'TESTS', coverage: 'INDIRECT'}]->(endpoint:Endpoint)

-- TestCase verifies Feature
(testCase:TestCase)-[r:REALIZES {role: 'VERIFIES', confidence: 0.95}]->(feature:Feature)
```

**Properties**:

- `role`: 'IMPLEMENTS' | 'TESTS' | 'VERIFIES'
- `confidence`: Float 0.0-1.0 (for IMPLEMENTS, VERIFIES)
- `coverage`: 'DIRECT' | 'INDIRECT' (for TESTS only)

**Cardinality**: many-to-many

**Query example**:

```cypher
-- All ways feature X is realized
MATCH (x)-[r:REALIZES]->(f:Feature {id: 'payment'})
WHERE r.role IN ['IMPLEMENTS', 'TESTS', 'VERIFIES']
RETURN x, r.role, r.confidence
```

**Cite as:** §3.3

---

### 3.4 Data Flow

#### [:MUTATES] – Data Access (Read/Write)

Consolidates: READS_FROM, WRITES_TO

Semantic: "What accesses this schema entity?"

```cypher
-- Symbol reads from entity
(symbol:Symbol)-[r:MUTATES {operation: 'READ', confidence: 0.85}]->(entity:SchemaEntity)

-- Symbol writes to entity
(symbol:Symbol)-[r:MUTATES {operation: 'WRITE', confidence: 0.82}]->(entity:SchemaEntity)

-- Endpoint reads/writes (via handler symbol)
(endpoint:Endpoint)-[r:MUTATES {operation: 'READ'|'WRITE', confidence: 0.90}]->(entity:SchemaEntity)
```

**Properties**:

- `operation`: 'READ' | 'WRITE'
- `confidence`: Float 0.0-1.0 (LLM field analysis)

**Cardinality**: many-to-many

**Query example**:

```cypher
-- Impact of renaming User entity
MATCH (sym:Symbol)-[r:MUTATES {operation: 'WRITE'}]->(e:SchemaEntity {name: 'User'})
RETURN sym, r.confidence
```

**Cite as:** §3.4

---

### 3.5 Dependencies

#### [:DEPENDS_ON] – All Dependency Types

Consolidates: USES_CONFIG, CALLS (external services), DEPENDS_ON (libraries), APPLIES_TO

Semantic: "What does this depend on?"

```cypher
-- Module depends on library
(module:Module)-[r:DEPENDS_ON {kind: 'LIBRARY', version: '3.0.1'}]->(lib:ThirdPartyLibrary)

-- Symbol uses config/env
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'CONFIG', required: true}]->(cfg:ConfigurationVariable)

-- Symbol calls external service
(symbol:Symbol)-[r:DEPENDS_ON {kind: 'SERVICE', confidence: 0.91}]->(svc:ExternalService)

-- Endpoint calls service
(endpoint:Endpoint)-[r:DEPENDS_ON {kind: 'SERVICE', confidence: 0.88}]->(svc:ExternalService)

-- Module follows style guide
(module:Module)-[r:DEPENDS_ON {kind: 'STYLE_GUIDE'}]->(guide:StyleGuide)

-- Feature depends on Feature (transitive)
(feature:Feature)-[r:DEPENDS_ON]->(feature2:Feature)
```

**Properties**:

- `kind`: 'LIBRARY' | 'SERVICE' | 'CONFIG' | 'STYLE_GUIDE'
- `version`: String (for LIBRARY)
- `required`: Boolean (for CONFIG)
- `confidence`: Float 0.0-1.0 (for SERVICE)

**Cardinality**: many-to-many

**Query example**:

```cypher
-- All external dependencies for payment symbol
MATCH (sym:Symbol {name: 'processPayment'})-[r:DEPENDS_ON {kind: 'SERVICE'|'CONFIG'}]->(dep)
RETURN dep, r.kind
```

**Index priority**: High (dependency analysis, security scanning)

**Cite as:** §3.5

---

### 3.6 Documentation & Governance

#### [:DOCUMENTS] – Knowledge & Coverage

Consolidates: DOCUMENTS, APPLIES_TO

Semantic: "What explains or governs this?"

```cypher
-- SpecDoc documents Feature
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'FEATURE', similarity: 0.87}]->(f:Feature)

-- SpecDoc documents Endpoint
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'ENDPOINT', similarity: 0.91}]->(ep:Endpoint)

-- SpecDoc documents Symbol
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'SYMBOL', similarity: 0.79}]->(sym:Symbol)

-- SpecDoc documents Module
(doc:SpecDoc)-[r:DOCUMENTS {target_role: 'MODULE'}]->(m:Module)

-- StyleGuide documents Module
(guide:StyleGuide)-[r:DOCUMENTS {target_role: 'MODULE'}]->(m:Module)

-- StyleGuide documents Pattern
(guide:StyleGuide)-[r:DOCUMENTS {target_role: 'PATTERN'}]->(pat:Pattern)
```

**Properties**:

- `target_role`: 'FEATURE' | 'ENDPOINT' | 'SYMBOL' | 'MODULE' | 'PATTERN'
- `similarity`: Float 0.0-1.0 (for LLM-derived links)

**Cardinality**: many-to-many

**Query example**:

```cypher
-- All documentation for feature X
MATCH (doc:SpecDoc)-[r:DOCUMENTS {target_role: 'FEATURE'}]->(f:Feature {id: 'payment'})
RETURN doc, r.similarity
ORDER BY r.similarity DESC
```

**Cite as:** §3.6

---

### 3.7 Position & Ownership

#### [:LOCATION] – Where Things Are Defined

Consolidates: IN_FILE, IN_MODULE, HANDLED_BY

Semantic: "Where is this defined, and what role?"

```cypher
-- Endpoint handler
(endpoint:Endpoint)-[r:LOCATION {role: 'HANDLED_BY'}]->(symbol:Symbol)

-- Endpoint in file
(endpoint:Endpoint)-[r:LOCATION {role: 'IN_FILE'}]->(file:File)

-- Endpoint in module
(endpoint:Endpoint)-[r:LOCATION {role: 'IN_MODULE'}]->(module:Module)

-- TestCase in file
(testCase:TestCase)-[r:LOCATION {role: 'IN_FILE'}]->(file:File)

-- TestCase in module
(testCase:TestCase)-[r:LOCATION {role: 'IN_MODULE'}]->(module:Module)
```

**Properties**:

- `role`: 'HANDLED_BY' | 'IN_FILE' | 'IN_MODULE'

**Cardinality**: many-to-many (for ownership queries)

**Why separate from CONTAINS**: Role-based filtering for ownership queries (e.g., "which endpoint
handles this?") vs. tree traversal for structure queries. Different query patterns, different
indexes.

**Query example**:

```cypher
-- Find handler for all payment endpoints
MATCH (ep:Endpoint {path: '/api/payment/*'})-[r:LOCATION {role: 'HANDLED_BY'}]->(sym:Symbol)
RETURN ep, sym
```

**Cite as:** §3.7

---

### 3.8 Evolution & Versioning

#### [:TRACKS] – History & Change

Consolidates: INTRODUCED_IN, MODIFIED_IN

Semantic: "When did this appear or change?"

```cypher
-- Symbol first appeared in snapshot
(symbol:Symbol)-[r:TRACKS {event: 'INTRODUCED'}]->(snapshot:Snapshot)

-- Symbol was modified in later snapshot
(symbol:Symbol)-[r:TRACKS {event: 'MODIFIED'}]->(snapshot:Snapshot)

-- Feature tracking
(feature:Feature)-[r:TRACKS {event: 'INTRODUCED'|'MODIFIED'}]->(snapshot:Snapshot)

-- TestCase tracking
(testCase:TestCase)-[r:TRACKS {event: 'INTRODUCED'|'MODIFIED'}]->(snapshot:Snapshot)
```

**Properties**:

- `event`: 'INTRODUCED' | 'MODIFIED'

**Cardinality**: many-to-many

**Query example**:

```cypher
-- When was auth symbol introduced and how many times modified?
MATCH (sym:Symbol {name: 'validateAuth'})-[r:TRACKS]->(snap:Snapshot)
WITH sym, r.event, COUNT(*) as count
RETURN sym, r.event, count
```

**Cite as:** §3.8

---

### 3.9 Incident Impact

#### [:IMPACTS] – Root Cause & Effects

Consolidates: CAUSED_BY, AFFECTS

Semantic: "How does this incident relate to the codebase?"

```cypher
-- Incident caused by symbol
(incident:Incident)-[r:IMPACTS {type: 'CAUSED_BY'}]->(symbol:Symbol)

-- Incident affects feature
(incident:Incident)-[r:IMPACTS {type: 'AFFECTS'}]->(feature:Feature)

-- Incident affects endpoint
(incident:Incident)-[r:IMPACTS {type: 'AFFECTS'}]->(endpoint:Endpoint)
```

**Properties**:

- `type`: 'CAUSED_BY' (root cause) | 'AFFECTS' (impact)

**Cardinality**: many-to-many

**Query example**:

```cypher
-- Find all incidents affecting auth feature
MATCH (i:Incident)-[r:IMPACTS {type: 'AFFECTS'}]->(f:Feature {id: 'auth'})
RETURN i, i.severity
ORDER BY i.createdAt DESC
```

**Cite as:** §3.9

---

## Summary: 10 Core Edge Types

| Edge             | Consolidates                                        | Sub-Types     | Purpose                        |
| ---------------- | --------------------------------------------------- | ------------- | ------------------------------ |
| `[:CONTAINS]`    | —                                                   | —             | Hierarchy tree                 |
| `[:IN_SNAPSHOT]` | —                                                   | —             | Version membership (invariant) |
| `[:REFERENCES]`  | CALL, TYPE_REF, IMPORT, FOLLOWS_PATTERN, SIMILAR_TO | `kind`        | Code relations                 |
| `[:REALIZES]`    | IMPLEMENTS, TESTS, VERIFIES                         | `role`        | Implementation                 |
| `[:MUTATES]`     | READS_FROM, WRITES_TO                               | `operation`   | Data flow                      |
| `[:DEPENDS_ON]`  | USES_CONFIG, CALLS, DEPENDS_ON, APPLIES_TO          | `kind`        | Dependencies                   |
| `[:DOCUMENTS]`   | DOCUMENTS, part of APPLIES_TO                       | `target_role` | Knowledge                      |
| `[:LOCATION]`    | IN_FILE, IN_MODULE, HANDLED_BY                      | `role`        | Position/Ownership             |
| `[:TRACKS]`      | INTRODUCED_IN, MODIFIED_IN                          | `event`       | Evolution                      |
| `[:IMPACTS]`     | CAUSED_BY, AFFECTS                                  | `type`        | Incident tracking              |

**Benefits**:

- ✓ Single-match queries for related edge types
- ✓ Extensible via properties (no schema migration)
- ✓ Better query cardinality optimization
- ✓ Fewer index types to maintain
- ✓ Aligns with Neo4j/Memgraph best practices

---

## 4. Constraints & Indexes

### 4.1 Priority 1: Unique Constraints (Auto-Indexed)

These create b-tree indexes automatically.

```cypher
-- Codebase
CREATE CONSTRAINT codebase_id_unique IF NOT EXISTS
FOR (n:Codebase) REQUIRE n.id IS UNIQUE;

-- Snapshot
CREATE CONSTRAINT snapshot_id_unique IF NOT EXISTS
FOR (n:Snapshot) REQUIRE n.id IS UNIQUE;

-- Module
CREATE CONSTRAINT module_id_unique IF NOT EXISTS
FOR (n:Module) REQUIRE n.id IS UNIQUE;

-- File
CREATE CONSTRAINT file_id_unique IF NOT EXISTS
FOR (n:File) REQUIRE n.id IS UNIQUE;

-- Symbol
CREATE CONSTRAINT symbol_id_unique IF NOT EXISTS
FOR (n:Symbol) REQUIRE n.id IS UNIQUE;

-- Endpoint
CREATE CONSTRAINT endpoint_id_unique IF NOT EXISTS
FOR (n:Endpoint) REQUIRE n.id IS UNIQUE;

-- SchemaEntity
CREATE CONSTRAINT schema_entity_id_unique IF NOT EXISTS
FOR (n:SchemaEntity) REQUIRE n.id IS UNIQUE;

-- TestCase
CREATE CONSTRAINT test_case_id_unique IF NOT EXISTS
FOR (n:TestCase) REQUIRE n.id IS UNIQUE;

-- SpecDoc
CREATE CONSTRAINT spec_doc_id_unique IF NOT EXISTS
FOR (n:SpecDoc) REQUIRE n.id IS UNIQUE;

-- Feature
CREATE CONSTRAINT feature_id_unique IF NOT EXISTS
FOR (n:Feature) REQUIRE n.id IS UNIQUE;

-- Pattern
CREATE CONSTRAINT pattern_id_unique IF NOT EXISTS
FOR (n:Pattern) REQUIRE n.id IS UNIQUE;

-- Incident
CREATE CONSTRAINT incident_id_unique IF NOT EXISTS
FOR (n:Incident) REQUIRE n.id IS UNIQUE;

-- StyleGuide
CREATE CONSTRAINT style_guide_id_unique IF NOT EXISTS
FOR (n:StyleGuide) REQUIRE n.id IS UNIQUE;

-- ThirdPartyLibrary
CREATE CONSTRAINT library_id_unique IF NOT EXISTS
FOR (n:ThirdPartyLibrary) REQUIRE n.id IS UNIQUE;

-- ExternalService
CREATE CONSTRAINT external_service_id_unique IF NOT EXISTS
FOR (n:ExternalService) REQUIRE n.id IS UNIQUE;
```

**Cite as:** §4.1

---

### 4.1B Priority 1B: Cardinality & Existence Constraints (Critical)

**IN_SNAPSHOT Cardinality Invariant**: Every snapshot-scoped node must have **exactly 1** incoming
`[:IN_SNAPSHOT]` edge.

This constraint prevents:

- Orphaned nodes (created without snapshot reference)
- Duplicate edges (multiple snapshots per node)
- Data corruption (lost nodes due to missing edges)

```cypher
-- Enforce cardinality: snapshot-scoped nodes MUST have exactly 1 [:IN_SNAPSHOT] edge
CREATE CONSTRAINT in_snapshot_cardinality IF NOT EXISTS
FOR (n:Module | n:File | n:Symbol | n:Endpoint | n:SchemaEntity | n:TestCase | n:SpecDoc)
REQUIRE (n)-[:IN_SNAPSHOT]->() IS NOT NULL;
```

**Why**: Each snapshot-scoped node belongs to a specific Git commit. Without this constraint:

1. **Ingest bugs silently create orphaned nodes** (not discoverable via snapshot queries)
2. **Temporal analysis breaks** ("What symbols existed at commit X?" returns incomplete results)
3. **Version tracking becomes unreliable** (can't distinguish which snapshot a node belongs to)

**Example - Bad (caught at write time)**:

```cypher
-- This will FAIL due to constraint violation:
CREATE (sym:Symbol {
  id: 'snap-123:src/auth.ts:validateAuth:10:0',
  name: 'validateAuth'
})
-- ERROR: Constraint violation! No [:IN_SNAPSHOT] edge to any snapshot
```

**Example - Good (passes constraint)**:

```cypher
-- This succeeds:
MATCH (snap:Snapshot {id: 'snap-123'})
MERGE (sym:Symbol {id: 'snap-123:src/auth.ts:validateAuth:10:0'})
SET sym.name = 'validateAuth'
MERGE (sym)-[:IN_SNAPSHOT]->(snap)
RETURN sym, snap
-- Constraint satisfied: sym has exactly 1 [:IN_SNAPSHOT] edge
```

**Implementation in Ingest** (See also ingest_spec.md §6.3):

```typescript
// Always wrap node creation + edge creation in same transaction
const result = await db.transaction(async (tx) => {
  // 1. Create symbol
  const sym = await tx.run(
    `
    MATCH (snap:Snapshot {id: $snapshotId})
    MERGE (sym:Symbol {id: $symbolId})
    SET sym += $props
    -- 2. Create [:IN_SNAPSHOT] edge in same operation
    MERGE (sym)-[:IN_SNAPSHOT]->(snap)
    RETURN sym
  `,
    { snapshotId, symbolId, props },
  );

  return sym;
});
// If constraint is violated, entire transaction rolls back
```

**Validation Queries** (Run post-ingest):

```cypher
-- Check for orphaned nodes (should return 0)
MATCH (n:Symbol)
WHERE NOT (n)-[:IN_SNAPSHOT]->()
RETURN COUNT(n) as orphaned_symbols

-- Check for multi-snapshot nodes (should return 0)
MATCH (n:Symbol)-[r:IN_SNAPSHOT]->(snap:Snapshot)
WITH n, COUNT(r) as edge_count
WHERE edge_count > 1
RETURN COUNT(n) as multi_snapshot_symbols, MAX(edge_count) as max_edges
```

**Cite as:** §4.1B

### 4.2 Priority 2: Edge Property Indexes (Consolidated Schema)

Indexes on properties of the 10 core edge types for efficient filtering.

```cypher
-- [:REFERENCES] variants (call graph, pattern discovery)
CREATE INDEX references_kind IF NOT EXISTS
FOR ()-[r:REFERENCES]-() ON (r.kind);

-- [:REALIZES] by role (feature implementation)
CREATE INDEX realizes_role IF NOT EXISTS
FOR ()-[r:REALIZES]-() ON (r.role);

-- [:DEPENDS_ON] by kind (dependency analysis, security)
CREATE INDEX depends_on_kind IF NOT EXISTS
FOR ()-[r:DEPENDS_ON]-() ON (r.kind);

-- [:DOCUMENTS] by target role (documentation lookup)
CREATE INDEX documents_target_role IF NOT EXISTS
FOR ()-[r:DOCUMENTS]-() ON (r.target_role);

-- [:LOCATION] by role (position/ownership queries)
CREATE INDEX location_role IF NOT EXISTS
FOR ()-[r:LOCATION]-() ON (r.role);

-- [:TRACKS] by event (evolution/history queries)
CREATE INDEX tracks_event IF NOT EXISTS
FOR ()-[r:TRACKS]-() ON (r.event);

-- [:MUTATES] by operation (data flow analysis)
CREATE INDEX mutates_operation IF NOT EXISTS
FOR ()-[r:MUTATES]-() ON (r.operation);

-- [:IMPACTS] by type (incident root cause vs. effect)
CREATE INDEX impacts_type IF NOT EXISTS
FOR ()-[r:IMPACTS]-() ON (r.type);
```

**Cite as:** §4.2

### 4.3 Priority 3: Node Property Indexes

For filtering and traversal optimization.

```cypher
-- File language filtering
CREATE INDEX file_language IF NOT EXISTS
FOR (n:File) ON (n.language);

-- Endpoint discovery
CREATE INDEX endpoint_verb_path IF NOT EXISTS
FOR (n:Endpoint) ON (n.verb, n.path);

-- Feature/Test/Symbol discovery
CREATE INDEX feature_name IF NOT EXISTS
FOR (n:Feature) ON (n.name);

CREATE INDEX test_case_name IF NOT EXISTS
FOR (n:TestCase) ON (n.name);

CREATE INDEX symbol_name IF NOT EXISTS
FOR (n:Symbol) ON (n.name);

-- Snapshot status
CREATE INDEX snapshot_status IF NOT EXISTS
FOR (n:Snapshot) ON (n.indexStatus);

-- Incident severity filtering
CREATE INDEX incident_severity IF NOT EXISTS
FOR (n:Incident) ON (n.severity);
```

**Cite as:** §4.3

### 4.4 Priority 4: Full-Text Indexes

For semantic search (requires `db.index.fulltext.*` procedures).

```cypher
-- Symbol discovery by name and docstring
CALL db.index.fulltext.createNodeIndex(
  'symbolFullText',
  ['Symbol'],
  ['name', 'docstring'],
  { analyzer: 'standard' }
);

-- Feature/SpecDoc text search
CALL db.index.fulltext.createNodeIndex(
  'featureSpecFullText',
  ['Feature', 'SpecDoc'],
  ['name', 'description', 'content'],
  { analyzer: 'standard' }
);
```

**Cite as:** §4.4

---

## 5. CONTAINS Hierarchy Algorithm

### 5.1 Creating the Hierarchy

When indexing a Snapshot:

```
FOR EACH (file, symbols) IN changed_files:
  1. Find or create Module node (modulePath from file)
     - Module.id = ${snapshotId}:${modulePath}
     - Module -[:CONTAINS]-> Snapshot

  2. Find or create File node
     - File.id = ${snapshotId}:${filePath}
     - File -[:CONTAINS]-> Module

  3. FOR EACH symbol IN symbols:
     Create Symbol node
     - Symbol.id = ${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}
     - Symbol -[:IN_SNAPSHOT]-> Snapshot (for scoping)

  4. Create edges: CALLS, REFERENCES (using `:REFERENCES {type}`)
```

### 5.2 Traversing the Hierarchy

```cypher
-- All symbols in a module
MATCH (m:Module {id: $moduleId})-[:CONTAINS*]->(s:Symbol)
RETURN s

-- All files containing keyword
MATCH (f:File)-[:CONTAINS]->(m:Module)
WHERE f.path CONTAINS $keyword
RETURN f, m

-- All symbols in a codebase
MATCH (c:Codebase {id: $codebaseId})
       -[:CONTAINS]->(s:Snapshot)
       -[:CONTAINS]->(m:Module)
       -[:CONTAINS]->(f:File)
       -[:CONTAINS]->(sym:Symbol)
RETURN sym
```

**Cite as:** §5

---

## 6. Cypher Query Patterns (Consolidated Schema)

### 6.1 getFeatureContext Pattern

Retrieves comprehensive context for a feature: implementation, tests, docs, dependencies.

```cypher
MATCH (f:Feature {id: $featureId})

-- Implementing endpoints/symbols
OPTIONAL MATCH (x)-[r1:REALIZES {role: 'IMPLEMENTS'}]->(f)
WITH f, x WHERE x IS NOT NULL

-- Symbol call graph (depth 2)
OPTIONAL MATCH (sym:Symbol) WHERE x IN [$x] OR r1.role = 'IMPLEMENTS'
OPTIONAL MATCH (sym)-[r2:REFERENCES {kind: 'CALL'}* 0..2]->(calleeSymbol:Symbol)

-- Data access patterns
OPTIONAL MATCH (calleeSymbol)-[r3:MUTATES]->(entity:SchemaEntity)

-- Tests for feature
OPTIONAL MATCH (t:TestCase)-[r4:REALIZES {role: 'VERIFIES'|'TESTS'}]->(f)

-- Documentation
OPTIONAL MATCH (doc:SpecDoc)-[r5:DOCUMENTS {target_role: 'FEATURE'}]->(f)

-- Dependencies & style guides
OPTIONAL MATCH (sym)-[:IN_SNAPSHOT]->(snap:Snapshot)
OPTIONAL MATCH (sym)-[:CONTAINS*0..1]->(m:Module)
OPTIONAL MATCH (guide:StyleGuide)-[r6:DOCUMENTS {target_role: 'MODULE'}]->(m)

-- Pattern adherence
OPTIONAL MATCH (x)-[r7:REFERENCES {kind: 'PATTERN'}]->(pattern:Pattern)

RETURN {
  feature: f,
  implementers: collect(DISTINCT x),
  callGraph: collect(DISTINCT calleeSymbol),
  dataAccess: collect(DISTINCT {entity: entity, operation: r3.operation}),
  tests: collect(DISTINCT t),
  docs: collect(DISTINCT doc),
  styleGuides: collect(DISTINCT guide),
  patterns: collect(DISTINCT pattern)
} AS bundle
```

**Cite as:** §6.1

### 6.2 getEndpointPatternExamples Pattern

Retrieves endpoint examples with their implementation, tests, and patterns.

```cypher
MATCH (ep:Endpoint)
OPTIONAL MATCH (ep)-[r1:LOCATION {role: 'HANDLED_BY'}]->(handler:Symbol)
OPTIONAL MATCH (t:TestCase)-[r2:REALIZES {role: 'TESTS'}]->(handler)
OPTIONAL MATCH (ep)-[r3:REFERENCES {kind: 'PATTERN'}]->(pattern:Pattern)
OPTIONAL MATCH (handler)-[:IN_SNAPSHOT]->(snap:Snapshot)
OPTIONAL MATCH (handler)-[:CONTAINS*0..1]->(m:Module)
OPTIONAL MATCH (guide:StyleGuide)-[r4:DOCUMENTS {target_role: 'MODULE'}]->(m)
OPTIONAL MATCH (handler)-[r5:MUTATES]->(entity:SchemaEntity)
OPTIONAL MATCH (ep)-[r6:DEPENDS_ON {kind: 'SERVICE'}]->(service:ExternalService)

RETURN {
  endpoint: ep,
  handler: handler,
  tests: collect(DISTINCT t),
  patterns: collect(DISTINCT pattern),
  styleGuides: collect(DISTINCT guide),
  dataAccess: collect(DISTINCT {entity: entity, operation: r5.operation}),
  externalDependencies: collect(DISTINCT service)
} AS bundle

ORDER BY ep.path
LIMIT $limit
```

**Cite as:** §6.2

### 6.3 getIncidentSlice Pattern

Retrieves all code artifacts related to an incident: root causes, affected features, tests.

```cypher
MATCH (i:Incident {id: $incidentId})

-- Root causes and impacts
OPTIONAL MATCH (i)-[r1:IMPACTS {type: 'CAUSED_BY'}]->(causeSymbol:Symbol)
OPTIONAL MATCH (i)-[r2:IMPACTS {type: 'AFFECTS'}]->(affectFeature:Feature)
OPTIONAL MATCH (i)-[r3:IMPACTS {type: 'AFFECTS'}]->(affectEndpoint:Endpoint)

-- Evolution tracking
OPTIONAL MATCH (causeSymbol)-[r4:TRACKS]->(snap:Snapshot)
OPTIONAL MATCH (affectFeature)-[r5:TRACKS]->(snap:Snapshot)

-- Related tests
OPTIONAL MATCH (t:TestCase)-[r6:REALIZES {role: 'TESTS'}]->(causeSymbol)
OPTIONAL MATCH (t2:TestCase)-[r7:REALIZES {role: 'VERIFIES'}]->(affectFeature)

-- Documentation
OPTIONAL MATCH (doc:SpecDoc)-[r8:DOCUMENTS {target_role: 'SYMBOL'}]->(causeSymbol)
OPTIONAL MATCH (doc2:SpecDoc)-[r9:DOCUMENTS {target_role: 'FEATURE'}]->(affectFeature)

RETURN {
  incident: i,
  rootCauseSymbols: collect(DISTINCT causeSymbol),
  affectedFeatures: collect(DISTINCT affectFeature),
  affectedEndpoints: collect(DISTINCT affectEndpoint),
  evolutionSnapshots: collect(DISTINCT snap),
  relatedTests: collect(DISTINCT {test: t, type: 'cause'}) + collect(DISTINCT {test: t2, type: 'feature'}),
  documentation: collect(DISTINCT doc) + collect(DISTINCT doc2)
} AS bundle
```

**Cite as:** §6.3

---

## 7. Snapshot Lifecycle

### 7.1 New Snapshot Indexing

1. Create Snapshot node with `indexStatus: "success"` or `"failed"`
2. Create snapshot-scoped nodes (Module, File, Symbol, etc.) with `[:IN_SNAPSHOT]` edge
3. Create relationships (CALLS, REFERENCES, IMPLEMENTS, etc.)
4. Link cross-snapshot nodes (Feature, Pattern) via `[:INTRODUCED_IN]` or `[:MODIFIED_IN]`

### 7.2 Snapshot Replacement

- On new successful snapshot for same branch:
  - Previous snapshot's scoped nodes remain (historical)
  - Mark previous Snapshot as `indexStatus: "archived"` (optional)
  - New Snapshot becomes current (query by latest Snapshot ID)
  - No node deletion; add `[:MODIFIED_IN]` edges to new Snapshot if symbols differ

### 7.3 Deleted Nodes

- Files/Symbols deleted in new Snapshot: mark `isDeleted: true`, add `[:MODIFIED_IN]` to new
  Snapshot
- Never delete nodes; preserve history for incident/regression analysis
- Query filters exclude `isDeleted: true` by default

**Cite as:** §7

---

## 8. Scaling Considerations

### 8.1 Batch Upserts

For large snapshots (1000+ symbols):

```cypher
-- Use UNWIND for batch creation
UNWIND $symbolBatch AS sym
MERGE (s:Symbol {id: sym.id})
SET s += sym,
    s.updatedAt = timestamp()
WITH s, sym
MATCH (f:File {id: sym.fileId})
MERGE (f)-[:CONTAINS]->(s)
```

### 8.2 Graph Cleanup (v1+)

If snapshots accumulate:

```cypher
-- Archive old snapshots (>6 months)
MATCH (s:Snapshot)
WHERE s.timestamp < (timestamp() - 180*24*60*60*1000)
SET s.indexStatus = "archived"

-- Optional: Delete archived nodes (post-v1)
MATCH (s:Snapshot {indexStatus: "archived"})
OPTIONAL MATCH (s)-[:CONTAINS*]->(n)
DETACH DELETE s, n
```

### 8.3 Query Optimization

- Always filter by Snapshot ID first (highly selective)
- Use relationship direction (`[:CONTAINS]` bottom-up for fast parent traversal)
- Avoid unbounded `[:REFERENCES*]` traversals; use depth limits (e.g., `[:REFERENCES*0..3]`)
- Create indexes on frequently filtered properties (language, name, severity)

**Cite as:** §8

---

## 9. Changelog

| Date       | Version | Editor | Summary                                                                                                         |
| ---------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| 2025-12-08 | 1.0     | @agent | Complete v1 schema spec with node/edge DDL, indexes, query patterns, lifecycle management, and scaling guidance |

---

## References

- [README.md](./README.md) – High-level schema overview (§4)
- [Ingest Specification](./ingest_spec.md) – Data flow and edge inference (§2, §3, §4.3)
- Neo4j Best Practices: [Indexes](https://neo4j.com/docs/cypher-manual/current/indexes/),
  [Hierarchical Data](https://neo4j.com/graphgists/my-bea/),
  [Knowledge Graphs](https://neo4j.com/blog/developer/knowledge-graph-generation/)
