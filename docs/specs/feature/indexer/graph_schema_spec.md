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

### 3.1 Hierarchy (CONTAINS)

All directed bottom-up; single type enables transitive queries.

| From → To             | Meaning              | Cardinality | Notes         |
| --------------------- | -------------------- | ----------- | ------------- |
| `File → Module`       | File in Module       | many-to-one | `[:CONTAINS]` |
| `Module → Snapshot`   | Module in Snapshot   | many-to-one | `[:CONTAINS]` |
| `Snapshot → Codebase` | Snapshot of Codebase | many-to-one | `[:CONTAINS]` |
| `Snapshot → SpecDoc`  | SpecDoc in Snapshot  | many-to-one | `[:CONTAINS]` |
| `Snapshot → TestCase` | TestCase in Snapshot | many-to-one | `[:CONTAINS]` |

```cypher
// Query: All symbols in a module
MATCH (m:Module)-[:CONTAINS*]->(s:Symbol)
RETURN s
```

**Cite as:** §3.1

### 3.2 Code Relations (Single `:REFERENCES` Type)

| Property   | Type    | Meaning               | Notes                 |
| ---------- | ------- | --------------------- | --------------------- |
| `type`     | enum    | "CALL" \| "REFERENCE" | Relationship type     |
| `filePath` | string  | Source file           | For location tracking |
| `line`     | integer | Line number           | For navigation        |
| `col`      | integer | Column number         | For navigation        |

```cypher
// Single edge type with type property
(symbol1:Symbol)-[:REFERENCES {type: 'CALL', line: 42, col: 5}]->(symbol2:Symbol)
(symbol1:Symbol)-[:REFERENCES {type: 'REFERENCE', line: 10, col: 0}]->(symbol2:Symbol)
```

**Cite as:** §3.2

### 3.3 Semantic Relations

| From → To                    | Relationship    | Cardinality  | Inference           |
| ---------------------------- | --------------- | ------------ | ------------------- |
| `Feature → Endpoint`         | `[:IMPLEMENTS]` | many-to-many | features.yaml + LLM |
| `Feature → Symbol`           | `[:IMPLEMENTS]` | many-to-many | features.yaml + LLM |
| `Symbol → SchemaEntity`      | `[:READS_FROM]` | many-to-many | ORM patterns        |
| `Symbol → SchemaEntity`      | `[:WRITES_TO]`  | many-to-many | ORM patterns        |
| `Module → ThirdPartyLib`     | `[:DEPENDS_ON]` | many-to-many | Manifest files      |
| `Endpoint → ExternalService` | `[:CALLS]`      | many-to-many | Heuristics + code   |
| `Feature → ExternalService`  | `[:DEPENDS_ON]` | many-to-many | Transitive          |

**Cite as:** §3.3

### 3.4 Testing & Documentation

| From → To              | Relationship    | Cardinality  | Inference                  |
| ---------------------- | --------------- | ------------ | -------------------------- |
| `TestCase → Symbol`    | `[:TESTS]`      | many-to-many | Imports + heuristics + LLM |
| `TestCase → Feature`   | `[:VERIFIES]`   | many-to-many | Naming + LLM               |
| `SpecDoc → Feature`    | `[:DOCUMENTS]`  | many-to-many | Name/content similarity    |
| `SpecDoc → Endpoint`   | `[:DOCUMENTS]`  | many-to-many | Name/content similarity    |
| `SpecDoc → Module`     | `[:DOCUMENTS]`  | many-to-many | Tagging                    |
| `StyleGuide → Module`  | `[:APPLIES_TO]` | many-to-many | Tagging                    |
| `StyleGuide → Pattern` | `[:REFERENCES]` | many-to-many | Tagging                    |

**Cite as:** §3.4

### 3.5 Patterns & History

| From → To            | Relationship         | Cardinality  | Inference                   |
| -------------------- | -------------------- | ------------ | --------------------------- |
| `Symbol → Pattern`   | `[:FOLLOWS_PATTERN]` | many-to-many | Heuristics + LLM            |
| `Endpoint → Pattern` | `[:FOLLOWS_PATTERN]` | many-to-many | Heuristics + LLM            |
| `Module → Pattern`   | `[:FOLLOWS_PATTERN]` | many-to-many | Heuristics + LLM            |
| `Symbol → Snapshot`  | `[:INTRODUCED_IN]`   | many-to-one  | Git diff (first occurrence) |
| `Symbol → Snapshot`  | `[:MODIFIED_IN]`     | many-to-many | Git diff (changes)          |
| `Feature → Snapshot` | `[:INTRODUCED_IN]`   | many-to-one  | Graph analysis              |
| `Feature → Snapshot` | `[:MODIFIED_IN]`     | many-to-many | Graph analysis              |
| `Incident → Symbol`  | `[:CAUSED_BY]`       | many-to-many | Manual mapping              |
| `Incident → Feature` | `[:AFFECTS]`         | many-to-many | Manual mapping              |
| `Symbol ↔ Symbol`    | `[:SIMILAR_TO]`      | many-to-many | Embedding distance          |
| `Feature ↔ Feature`  | `[:SIMILAR_TO]`      | many-to-many | Embedding distance          |
| `File → Symbol`      | `[:IN_SNAPSHOT]`     | (via Symbol) | Scoping mechanism           |

**Cite as:** §3.5

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

### 4.2 Priority 2: Range/Lookup Indexes

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

**Cite as:** §4.2

### 4.3 Priority 3: Full-Text Indexes

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

**Cite as:** §4.3

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

## 6. Cypher Query Patterns

### 6.1 getFeatureContext Pattern

```cypher
MATCH (f:Feature {id: $featureId})

-- Implementing endpoints
OPTIONAL MATCH (f)-[:IMPLEMENTS]->(ep:Endpoint)
  WITH f, ep

-- Implementing symbols (call graph depth N)
OPTIONAL MATCH (f)-[:IMPLEMENTS]->(sym:Symbol)
OPTIONAL MATCH (sym)-[:REFERENCES* 0..2 {type: 'CALL'}]->()-[:REFERENCES {type: 'CALL'}]->(calleeSymbol:Symbol)

-- Related schema entities
OPTIONAL MATCH (calleeSymbol)-[r:READS_FROM|:WRITES_TO]->(entity:SchemaEntity)

-- Tests
OPTIONAL MATCH (t:TestCase)-[:TESTS|:VERIFIES]->(f)

-- Specs
OPTIONAL MATCH (doc:SpecDoc)-[:DOCUMENTS]->(f)

-- Style guides (via module)
OPTIONAL MATCH (sym)-[:IN_SNAPSHOT]->(snap:Snapshot)
OPTIONAL MATCH sym-[:CONTAINS*0..2]->(m:Module)
OPTIONAL MATCH (guide:StyleGuide)-[:APPLIES_TO]->(m)

-- Patterns
OPTIONAL MATCH (ep)-[:FOLLOWS_PATTERN|:FOLLOWS_PATTERN]-(pattern:Pattern)

RETURN {
  feature: f,
  implementingEndpoints: collect(DISTINCT ep),
  handlerSymbols: collect(DISTINCT sym),
  callGraph: collect(DISTINCT calleeSymbol),
  relatedSchemaEntities: collect(DISTINCT entity),
  testCases: collect(DISTINCT t),
  specDocs: collect(DISTINCT doc),
  styleGuides: collect(DISTINCT guide),
  patterns: collect(DISTINCT pattern)
} AS bundle
```

**Cite as:** §6.1

### 6.2 getEndpointPatternExamples Pattern

```cypher
MATCH (ep:Endpoint)
OPTIONAL MATCH (sym:Symbol {id: ep.handlerSymbolId})
OPTIONAL MATCH (t:TestCase)-[:TESTS]->(sym)
OPTIONAL MATCH (ep)-[:FOLLOWS_PATTERN]->(pat:Pattern)
OPTIONAL MATCH (sym)-[:IN_SNAPSHOT]->(snap:Snapshot)
OPTIONAL MATCH snap-[:CONTAINS*0..2]->(m:Module)
OPTIONAL MATCH (guide:StyleGuide)-[:APPLIES_TO]->(m)
OPTIONAL MATCH (sym)-[r:READS_FROM|:WRITES_TO]->(entity:SchemaEntity)

RETURN {
  endpoint: ep,
  handler: sym,
  tests: collect(DISTINCT t),
  patterns: collect(DISTINCT pat),
  styleGuides: collect(DISTINCT guide),
  entities: collect(DISTINCT entity)
} AS bundle

ORDER BY ep.path
LIMIT $limit
```

**Cite as:** §6.2

### 6.3 getIncidentSlice Pattern

```cypher
MATCH (i:Incident {id: $incidentId})
OPTIONAL MATCH (i)-[:CAUSED_BY|:AFFECTS]->(sym:Symbol)
OPTIONAL MATCH (i)-[:AFFECTS]->(feat:Feature)
OPTIONAL MATCH (sym)-[:INTRODUCED_IN|:MODIFIED_IN]->(snap:Snapshot)
OPTIONAL MATCH (feat)-[:INTRODUCED_IN|:MODIFIED_IN]->(snap:Snapshot)
OPTIONAL MATCH (t:TestCase)-[:TESTS]->(sym)
OPTIONAL MATCH (doc:SpecDoc)-[:DOCUMENTS]->(sym)

RETURN {
  incident: i,
  relatedSymbols: collect(DISTINCT sym),
  relatedFeatures: collect(DISTINCT feat),
  snapshots: collect(DISTINCT snap),
  tests: collect(DISTINCT t),
  specDocs: collect(DISTINCT doc)
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
