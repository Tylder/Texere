# Texere Indexer – Complete Node & Edge Mapping

**Document Version:** 1.0  
**Status:** Comprehensive Edge Reference  
**Last Updated:** December 2025

## Overview

This document lists every node type and all edges (incoming and outgoing) that connect to it. For
each edge:

- **Optionality**: Required (edge must exist) vs Optional (may not exist for all instances)
- **Extraction group**: Which extraction phase discovers/creates this edge
- **Method**: How the edge is discovered (AST, heuristic, LLM, Git diff, etc.)

---

## Table of Contents

1. [Snapshot-Scoped Nodes](#snapshot-scoped-nodes)
   - [Codebase](#codebase)
   - [Snapshot](#snapshot)
   - [Module](#module)
   - [File](#file)
   - [Symbol](#symbol)
   - [Endpoint](#endpoint)
   - [SchemaEntity](#schemaentity)
   - [TestCase](#testcase)
   - [SpecDoc](#specdoc)
   - [ThirdPartyLibrary](#thirdpartylibrary)

2. [Cross-Snapshot Nodes](#cross-snapshot-nodes)
   - [Feature](#feature)
   - [Pattern](#pattern)
   - [Incident](#incident)
   - [ExternalService](#externalservice)
   - [StyleGuide](#styleguide)
   - [ConfigurationVariable](#configurationvariable)

---

## Snapshot-Scoped Nodes

### Codebase

Node represents a Git repository being indexed.

#### Outgoing Edges

| Edge          | Target   | Optionality  | Group | Method                                                                             |
| ------------- | -------- | ------------ | ----- | ---------------------------------------------------------------------------------- |
| `[:CONTAINS]` | Snapshot | **Required** | 1     | Git branch/commit tracking; create one Snapshot per tracked branch's latest commit |

#### Incoming Edges

None.

#### Notes

- Codebase is the root; every snapshot belongs to exactly one codebase
- Multiple snapshots per codebase (one per tracked branch, or multiple historical)
- No incoming edges; identified by git repo URL

---

### Snapshot

Node represents a Git commit being indexed.

#### Outgoing Edges

| Edge          | Target            | Optionality  | Group | Method                                                       |
| ------------- | ----------------- | ------------ | ----- | ------------------------------------------------------------ |
| `[:CONTAINS]` | Module            | **Required** | 1     | File path parsing; one Module per unique directory structure |
| `[:CONTAINS]` | File              | **Required** | 1     | All files in snapshot (from Git tree)                        |
| `[:CONTAINS]` | Symbol            | **Required** | 1     | All symbols extracted from files                             |
| `[:CONTAINS]` | Endpoint          | Optional     | 3     | Only if endpoints found in code (framework pattern matching) |
| `[:CONTAINS]` | SchemaEntity      | Optional     | 3     | Only if ORM models found                                     |
| `[:CONTAINS]` | TestCase          | Optional     | 4     | Only if test files present                                   |
| `[:CONTAINS]` | SpecDoc           | Optional     | 1     | Only if docs/ present in snapshot                            |
| `[:CONTAINS]` | ThirdPartyLibrary | Optional     | 3     | Only if lockfile present                                     |

#### Incoming Edges

| Edge               | Source   | Optionality  | Group | Method                                                                    |
| ------------------ | -------- | ------------ | ----- | ------------------------------------------------------------------------- |
| `[:CONTAINS]`      | Codebase | **Required** | 1     | Codebase references this snapshot (many-to-one)                           |
| `[:INTRODUCED_IN]` | Symbol   | Optional     | 8     | Git diff: symbol added in this snapshot (first occurrence per symbol ID)  |
| `[:INTRODUCED_IN]` | Feature  | Optional     | 8     | Graph analysis: feature first appeared with symbols in this snapshot      |
| `[:INTRODUCED_IN]` | TestCase | Optional     | 8     | Git diff: test added in this snapshot                                     |
| `[:MODIFIED_IN]`   | Symbol   | Optional     | 8     | Git diff: symbol changed in this snapshot (modified file, same symbol ID) |
| `[:MODIFIED_IN]`   | Feature  | Optional     | 8     | Graph analysis: feature's implementing symbols changed in this snapshot   |
| `[:MODIFIED_IN]`   | TestCase | Optional     | 8     | Git diff: test modified in this snapshot                                  |

#### Notes

- Snapshot ID is composite: `codebaseId:commitHash`
- Represents immutable point in time; multiple snapshots tracked per codebase
- All scoped nodes (`Symbol`, `File`, `Module`, etc.) must point to one Snapshot via
  `[:IN_SNAPSHOT]` or `[:CONTAINS]`
- `[:INTRODUCED_IN]` vs `[:MODIFIED_IN]` track evolution for impact analysis (e.g., "which commits
  modified auth symbol?")

---

### Module

Node represents a logical module/package/directory (e.g., Nx library, Python package, app).

#### Outgoing Edges

| Edge                 | Target            | Optionality  | Group | Method                                                                            |
| -------------------- | ----------------- | ------------ | ----- | --------------------------------------------------------------------------------- |
| `[:CONTAINS]`        | File              | **Required** | 1     | Directory structure; all files in module's path                                   |
| `[:CONTAINS]`        | Module            | Optional     | 1     | Nested modules (e.g., subdirectories)                                             |
| `[:DEPENDS_ON]`      | ThirdPartyLibrary | Optional     | 3     | Manifest parsing (package.json imports, import statements in module code)         |
| `[:FOLLOWS_PATTERN]` | Pattern           | Optional     | 7     | Heuristic: module structure matches pattern (e.g., "monorepo-lib", "express-app") |

#### Incoming Edges

| Edge            | Source     | Optionality  | Group | Method                                                                    |
| --------------- | ---------- | ------------ | ----- | ------------------------------------------------------------------------- |
| `[:CONTAINS]`   | Snapshot   | **Required** | 1     | Snapshot creates module nodes from file structure                         |
| `[:CONTAINS]`   | Module     | Optional     | 1     | Parent module (for nested structure)                                      |
| `[:APPLIES_TO]` | StyleGuide | Optional     | 7     | Style guide specifies it applies to this module (via metadata or tagging) |
| `[:DOCUMENTS]`  | SpecDoc    | Optional     | 7     | Doc explicitly tags this module (in metadata or content)                  |

#### Notes

- Module provides organizational structure above files
- `[:DEPENDS_ON]` connects module to installed packages (from lockfile versions)
- Module path determines nesting (e.g., `apps/agent` contains `apps/agent/src`)
- Useful for module-level queries: "all endpoints in this module", "all tests in this module"

---

### File

Node represents a source code file.

#### Outgoing Edges

| Edge             | Target   | Optionality  | Group | Method                                               |
| ---------------- | -------- | ------------ | ----- | ---------------------------------------------------- |
| `[:IN_SNAPSHOT]` | Snapshot | **Required** | 1     | Scoping relationship; all files belong to a snapshot |
| `[:CONTAINS]`    | Symbol   | Optional     | 1     | All symbols defined in this file (AST traversal)     |

#### Incoming Edges

| Edge           | Source  | Optionality  | Group | Method                                                   |
| -------------- | ------- | ------------ | ----- | -------------------------------------------------------- |
| `[:CONTAINS]`  | Module  | **Required** | 1     | File belongs to a module (directory structure)           |
| `[:DOCUMENTS]` | SpecDoc | Optional     | 7     | Doc references this file (e.g., "see src/utils/auth.ts") |

#### Notes

- File is minimal node; most edges go through symbols
- `isTest` property determines test file classification (file name pattern: `*.test.ts`,
  `test_*.py`)
- `isDeleted` property: set to true when file removed in later snapshot
- No explicit module link from file; traverse via `[:CONTAINS]` from module

---

### Symbol

Node represents a code definition (function, class, variable, type, interface, etc.).

#### Outgoing Edges

| Edge                                | Target                | Optionality  | Group | Method                                                                        |
| ----------------------------------- | --------------------- | ------------ | ----- | ----------------------------------------------------------------------------- |
| `[:IN_SNAPSHOT]`                    | Snapshot              | **Required** | 1     | Scoping; every symbol belongs to exactly one snapshot                         |
| `[:REFERENCES {type: 'CALL'}]`      | Symbol                | Optional     | 2     | Function call within this symbol's body (AST call expression → target symbol) |
| `[:REFERENCES {type: 'REFERENCE'}]` | Symbol                | Optional     | 2     | Type or const reference (import, type annotation, variable reference)         |
| `[:IMPLEMENTS]`                     | Feature               | Optional     | 5     | Symbol is part of feature implementation (features.yaml or LLM inference)     |
| `[:READS_FROM]`                     | SchemaEntity          | Optional     | 6     | Symbol reads from data model (ORM pattern or LLM field analysis)              |
| `[:WRITES_TO]`                      | SchemaEntity          | Optional     | 6     | Symbol writes to data model (ORM pattern or LLM field analysis)               |
| `[:FOLLOWS_PATTERN]`                | Pattern               | Optional     | 7     | Symbol matches known code pattern (heuristic or LLM detection)                |
| `[:USES_CONFIG]`                    | ConfigurationVariable | Optional     | 9     | Symbol accesses environment variable (code scanning or LLM extraction)        |
| `[:INTRODUCED_IN]`                  | Snapshot              | Optional     | 8     | First snapshot where this symbol appears (Git diff)                           |
| `[:MODIFIED_IN]`                    | Snapshot              | Optional     | 8     | Later snapshots where this symbol changed (Git diff)                          |
| `[:SIMILAR_TO]`                     | Symbol                | Optional     | 6     | Embedding-based similarity (Qdrant vector distance)                           |

#### Incoming Edges

| Edge                                | Source   | Optionality | Group  | Method                                                             |
| ----------------------------------- | -------- | ----------- | ------ | ------------------------------------------------------------------ |
| `[:REFERENCES {type: 'CALL'}]`      | Symbol   | Optional    | 2      | Called by another symbol (reverse of outgoing CALL edge)           |
| `[:REFERENCES {type: 'REFERENCE'}]` | Symbol   | Optional    | 2      | Referenced by another symbol (reverse of outgoing REFERENCE edge)  |
| `[:HANDLED_BY]`                     | Endpoint | Optional    | 3      | This symbol is the handler for an endpoint                         |
| `[:TESTS]`                          | TestCase | Optional    | 4      | Test case tests this symbol (import or explicit reference)         |
| `[:READS_FROM]`                     | Symbol   | Optional    | 6      | Another symbol reads data that this symbol provides (transitively) |
| `[:WRITES_TO]`                      | Symbol   | Optional    | 6      | Another symbol writes data that this symbol uses (transitively)    |
| `[:FOLLOWS_PATTERN]`                | Pattern  | Optional    | 7      | Pattern node explicitly references this symbol as exemplar         |
| `[:CAUSED_BY]`                      | Incident | Optional    | manual | Incident root cause is this symbol (manual incident mapping)       |
| `[:SIMILAR_TO]`                     | Symbol   | Optional    | 6      | Embedding similarity (reverse of outgoing edge)                    |

#### Notes

- Symbol is central; most queries flow through symbol connections
- `id` is composite: `snapshotId:filePath:symbolName:startLine:startCol` (stable within snapshot)
- `[:REFERENCES]` is single edge type with `type` property (`'CALL'` or `'REFERENCE'`)
- `[:IMPLEMENTS]` connects to Feature; `[:READS_FROM]`/`[:WRITES_TO]` connect to SchemaEntity
- Embedding ID stored on node; used for `[:SIMILAR_TO]` edge creation
- Properties on node include extracted patterns: `codeTemplate`, `fieldMutations`,
  `configVariables`, `externalServices`, `dataFlow` (from GROUP 6 LLM extraction)

---

### Endpoint

Node represents an HTTP API endpoint (verb + path).

#### Outgoing Edges

| Edge                 | Target          | Optionality  | Group | Method                                                                       |
| -------------------- | --------------- | ------------ | ----- | ---------------------------------------------------------------------------- |
| `[:IN_SNAPSHOT]`     | Snapshot        | **Required** | 3     | Scoping; endpoint exists in this snapshot                                    |
| `[:HANDLED_BY]`      | Symbol          | **Required** | 3     | Endpoint handler symbol (extracted from framework pattern)                   |
| `[:IN_FILE]`         | File            | **Required** | 3     | Endpoint definition location (derived from handler symbol's file)            |
| `[:IN_MODULE]`       | Module          | Optional     | 3     | Endpoint's module (derived: handler symbol's module, or from path heuristic) |
| `[:IMPLEMENTS]`      | Feature         | Optional     | 5     | Endpoint implements this feature (feature name matching or LLM)              |
| `[:READS_FROM]`      | SchemaEntity    | Optional     | 6     | Endpoint reads from data model (via handler symbol field analysis)           |
| `[:WRITES_TO]`       | SchemaEntity    | Optional     | 6     | Endpoint writes to data model (via handler symbol field analysis)            |
| `[:CALLS]`           | ExternalService | Optional     | 9     | Endpoint calls external API (handler symbol analysis or code scanning)       |
| `[:FOLLOWS_PATTERN]` | Pattern         | Optional     | 7     | Endpoint handler matches pattern (heuristic or LLM detection)                |
| `[:INTRODUCED_IN]`   | Snapshot        | Optional     | 8     | Endpoint first appeared in this snapshot                                     |
| `[:MODIFIED_IN]`     | Snapshot        | Optional     | 8     | Endpoint modified in later snapshot                                          |

#### Incoming Edges

| Edge            | Source   | Optionality | Group | Method                                                                |
| --------------- | -------- | ----------- | ----- | --------------------------------------------------------------------- |
| `[:CONTAINS]`   | Snapshot | Optional    | 3     | Snapshot contains this endpoint (scoping)                             |
| `[:TESTED_BY]`  | TestCase | Optional    | 4     | Test case tests this endpoint (test imports handler or endpoint path) |
| `[:DOCUMENTS]`  | SpecDoc  | Optional    | 7     | Spec doc references endpoint (path matching or explicit tagging)      |
| `[:IMPLEMENTS]` | Feature  | Optional    | 5     | Feature edge from feature side (reverse)                              |

#### Notes

- Endpoint ID is composite: `snapshotId:verb:path`
- `handlerSymbolId` property + `[:HANDLED_BY]` edge both exist (property faster for single lookup,
  edge better for graph traversal)
- `[:IN_FILE]` and `[:IN_MODULE]` are derived from handler symbol but essential for queries like
  "endpoints in module"
- `[:READS_FROM]` and `[:WRITES_TO]` are derived from handler symbol but explicit for agent
  convenience
- Endpoint is API-centric view; queries like "all endpoints calling Stripe" are straightforward

---

### SchemaEntity

Node represents a database model/entity (Prisma model, SQLAlchemy class, TypeORM entity, etc.).

#### Outgoing Edges

| Edge             | Target   | Optionality  | Group | Method                                   |
| ---------------- | -------- | ------------ | ----- | ---------------------------------------- |
| `[:IN_SNAPSHOT]` | Snapshot | **Required** | 3     | Scoping; entity defined in this snapshot |

#### Incoming Edges

| Edge            | Source   | Optionality | Group | Method                                                        |
| --------------- | -------- | ----------- | ----- | ------------------------------------------------------------- |
| `[:CONTAINS]`   | Snapshot | Optional    | 3     | Snapshot scoping                                              |
| `[:READS_FROM]` | Symbol   | Optional    | 6     | Symbol reads this entity (ORM pattern or LLM field analysis)  |
| `[:READS_FROM]` | Endpoint | Optional    | 6     | Endpoint reads this entity (via handler symbol)               |
| `[:WRITES_TO]`  | Symbol   | Optional    | 6     | Symbol writes this entity (ORM pattern or LLM field analysis) |
| `[:WRITES_TO]`  | Endpoint | Optional    | 6     | Endpoint writes this entity (via handler symbol)              |

#### Notes

- SchemaEntity is relatively sparse in edges (mostly incoming from Symbol/Endpoint)
- Useful for refactoring queries: "all symbols touching User entity" or "impact of User → User +
  Profile split"
- No `[:DEPENDS_ON]` edge in v1; FK relationships handled implicitly (refactor analysis via field
  mutations)
- Multi-language support: Prisma models, SQLAlchemy, TypeORM, Pydantic, etc.

---

### TestCase

Node represents a single test (unit, integration, e2e).

#### Outgoing Edges

| Edge             | Target   | Optionality  | Group | Method                                                         |
| ---------------- | -------- | ------------ | ----- | -------------------------------------------------------------- |
| `[:IN_SNAPSHOT]` | Snapshot | **Required** | 4     | Scoping; test defined in this snapshot                         |
| `[:IN_FILE]`     | File     | **Required** | 4     | Test location (file where test is defined)                     |
| `[:IN_MODULE]`   | Module   | Optional     | 4     | Test's module (derived from file path)                         |
| `[:TESTS]`       | Symbol   | Optional     | 4     | Test tests/exercises this symbol (import analysis + heuristic) |
| `[:VERIFIES]`    | Feature  | Optional     | 5     | Test verifies this feature (test name matching or LLM)         |

#### Incoming Edges

| Edge           | Source   | Optionality | Group | Method                                                                            |
| -------------- | -------- | ----------- | ----- | --------------------------------------------------------------------------------- |
| `[:CONTAINS]`  | Snapshot | Optional    | 4     | Snapshot scoping                                                                  |
| `[:TESTED_BY]` | Endpoint | Optional    | 4     | Endpoint is tested by this test (reverse of TESTS edge, often via handler symbol) |
| `[:VERIFIES]`  | Feature  | Optional    | 5     | Feature edge from feature side (reverse)                                          |

#### Notes

- TestCase ID is composite: `snapshotId:filePath:testName`
- `testName` includes full hierarchy: `"Describe › Nested › should do X"` for TS or
  `"TestClass::test_method"` for Python
- `[:TESTS]` edge created by analyzing test imports and heuristics (function name matching "test\*")
- `kind` property: 'unit', 'integration', 'e2e' (heuristic from file location)
- Useful for test discovery: "tests for this feature" or "tests in this module"

---

### SpecDoc

Node represents a documentation file (spec, ADR, design doc, guide, ticket).

#### Outgoing Edges

| Edge             | Target   | Optionality  | Group | Method                                                                    |
| ---------------- | -------- | ------------ | ----- | ------------------------------------------------------------------------- |
| `[:IN_SNAPSHOT]` | Snapshot | **Required** | 1     | Scoping; doc indexed in this snapshot                                     |
| `[:DOCUMENTS]`   | Feature  | Optional     | 7     | Doc explains this feature (name/content similarity or tagging)            |
| `[:DOCUMENTS]`   | Endpoint | Optional     | 7     | Doc describes this endpoint (content matching or explicit path reference) |
| `[:DOCUMENTS]`   | Symbol   | Optional     | 7     | Doc references this symbol (explicit tagging or semantic matching)        |
| `[:DOCUMENTS]`   | Module   | Optional     | 7     | Doc applies to this module (metadata tagging)                             |
| `[:DOCUMENTS]`   | File     | Optional     | 7     | Doc references this file (explicit path mention)                          |

#### Incoming Edges

| Edge           | Source   | Optionality | Group | Method                                                            |
| -------------- | -------- | ----------- | ----- | ----------------------------------------------------------------- |
| `[:CONTAINS]`  | Snapshot | Optional    | 1     | Snapshot scoping                                                  |
| `[:DOCUMENTS]` | SpecDoc  | Optional    | 7     | Another doc cross-references this doc (explicit links in content) |

#### Notes

- SpecDoc is non-snapshot-scoped in some systems but v1 treats as snapshot-scoped (versioned with
  code)
- `kind` property: 'spec', 'adr', 'design-doc', 'guide', 'ticket' (inferred from path or metadata)
- `embeddingId` stored on node for vector similarity search (Qdrant)
- `[:DOCUMENTS]` edges created via:
  - Name matching: SpecDoc title contains Feature/Symbol name
  - Content similarity: embedding distance > threshold
  - Explicit tagging: doc metadata lists what it documents
- Useful for agent context: "get all docs explaining this feature"

---

### ThirdPartyLibrary

Node represents an installed dependency (npm package, PyPI package, etc.).

#### Outgoing Edges

| Edge             | Target   | Optionality  | Group | Method                                                 |
| ---------------- | -------- | ------------ | ----- | ------------------------------------------------------ |
| `[:IN_SNAPSHOT]` | Snapshot | **Required** | 3     | Scoping; dependency exists in this snapshot's lockfile |

#### Incoming Edges

| Edge            | Source   | Optionality | Group | Method                                            |
| --------------- | -------- | ----------- | ----- | ------------------------------------------------- |
| `[:CONTAINS]`   | Snapshot | Optional    | 3     | Snapshot scoping                                  |
| `[:DEPENDS_ON]` | Module   | Optional    | 3     | Module depends on this library (lockfile parsing) |

#### Notes

- ThirdPartyLibrary ID is composite: `snapshotId:packageName:version`
- Version extracted from lockfile (package-lock.json, poetry.lock, pnpm-lock.yaml, etc.)
- `registry` property: 'npm', 'pypi', 'crates.io', etc. (inferred from package ecosystem)
- No outgoing edges in v1 (could add in future: `[:PROVIDES]` symbols, etc.)
- Useful for dependency analysis: "what modules use Stripe SDK"

---

## Cross-Snapshot Nodes

### Feature

Node represents a user-facing feature (persistent across snapshots).

#### Outgoing Edges

| Edge               | Target   | Optionality | Group  | Method                                                                     |
| ------------------ | -------- | ----------- | ------ | -------------------------------------------------------------------------- |
| `[:IMPLEMENTS]`    | Symbol   | Optional    | 5      | Symbols implementing this feature (reverse: symbols [:IMPLEMENTS] feature) |
| `[:IMPLEMENTS]`    | Endpoint | Optional    | 5      | Endpoints serving this feature (reverse: endpoints [:IMPLEMENTS] feature)  |
| `[:IMPLEMENTS]`    | TestCase | Optional    | 5      | Tests verifying this feature (reverse: tests [:VERIFIES] feature)          |
| `[:DEPENDS_ON]`    | Feature  | Optional    | manual | Feature depends on another feature (transitive)                            |
| `[:INTRODUCED_IN]` | Snapshot | Optional    | 8      | Snapshot where this feature first appeared (first symbol implementing it)  |
| `[:MODIFIED_IN]`   | Snapshot | Optional    | 8      | Later snapshots where feature changed (symbols added/removed/modified)     |

#### Incoming Edges

| Edge            | Source   | Optionality | Group  | Method                              |
| --------------- | -------- | ----------- | ------ | ----------------------------------- |
| `[:IMPLEMENTS]` | Symbol   | Optional    | 5      | Symbol implements feature           |
| `[:IMPLEMENTS]` | Endpoint | Optional    | 5      | Endpoint implements feature         |
| `[:VERIFIES]`   | TestCase | Optional    | 5      | Test verifies feature               |
| `[:DOCUMENTS]`  | SpecDoc  | Optional    | 7      | Doc describes feature               |
| `[:AFFECTS]`    | Incident | Optional    | manual | Incident affects this feature       |
| `[:DEPENDS_ON]` | Feature  | Optional    | manual | Another feature depends on this one |

#### Notes

- Feature is defined in `features.yaml` (manual registry)
- Cross-snapshot; persists across commits
- Soft-delete: `isDeleted: true` if feature removed from registry (no hard delete)
- Edges from symbols/endpoints/tests are REVERSE of those nodes (feature side of many-to-many)
- Useful queries: "what's in the payment feature" (all symbols/endpoints/tests), "what features were
  affected by this change"

---

### Pattern

Node represents a code pattern (e.g., "express-middleware", "error-handling-try-catch",
"payment-flow").

#### Outgoing Edges

| Edge                | Target   | Optionality | Group | Method                                                                           |
| ------------------- | -------- | ----------- | ----- | -------------------------------------------------------------------------------- |
| `[:EXEMPLIFIED_BY]` | Symbol   | Optional    | 7     | Symbol exemplifies this pattern (reverse: symbol [:FOLLOWS_PATTERN] pattern)     |
| `[:EXEMPLIFIED_BY]` | Endpoint | Optional    | 7     | Endpoint exemplifies this pattern (reverse: endpoint [:FOLLOWS_PATTERN] pattern) |
| `[:EXEMPLIFIED_BY]` | Module   | Optional    | 7     | Module exemplifies this pattern (reverse: module [:FOLLOWS_PATTERN] pattern)     |

#### Incoming Edges

| Edge                 | Source     | Optionality | Group | Method                                                 |
| -------------------- | ---------- | ----------- | ----- | ------------------------------------------------------ |
| `[:FOLLOWS_PATTERN]` | Symbol     | Optional    | 7     | Symbol matches this pattern (heuristic or LLM)         |
| `[:FOLLOWS_PATTERN]` | Endpoint   | Optional    | 7     | Endpoint matches this pattern (heuristic or LLM)       |
| `[:FOLLOWS_PATTERN]` | Module     | Optional    | 7     | Module matches this pattern (heuristic or LLM)         |
| `[:REFERENCES]`      | StyleGuide | Optional    | 7     | Style guide references this pattern (metadata tagging) |

#### Notes

- Pattern ID is name-based (e.g., "express-middleware", "error-handling-v2")
- `source` property: 'manual' (patterns.yaml) or 'heuristic' (discovered)
- Patterns are cross-snapshot (persistent)
- Useful for: "show me examples of this pattern" (query symbols/endpoints following it), "is this
  code following the pattern?"
- Agent can discover patterns automatically (GROUP 7 LLM) or maintain manual registry

---

### Incident

Node represents a reported issue/bug (persistent, not tied to specific snapshot).

#### Outgoing Edges

| Edge           | Target   | Optionality | Group  | Method                                                  |
| -------------- | -------- | ----------- | ------ | ------------------------------------------------------- |
| `[:CAUSED_BY]` | Symbol   | Optional    | manual | Root cause is this symbol (manual incident mapping)     |
| `[:AFFECTS]`   | Feature  | Optional    | manual | Incident affects this feature (manual incident mapping) |
| `[:CAUSED_BY]` | Endpoint | Optional    | manual | Root cause is this endpoint (manual incident mapping)   |

#### Incoming Edges

None (incidents are created/updated externally).

#### Notes

- Incident ID from incidents.yaml or external system
- Properties: `id`, `title`, `description`, `severity` ('critical', 'high', 'medium', 'low'),
  `status` ('open', 'resolved', 'archived'), `createdAt`, `resolvedAt`
- `[:CAUSED_BY]` and `[:AFFECTS]` are manually maintained (not auto-extracted)
- Useful for: "what incidents are caused by this symbol", "impact of this change on open incidents"
- v1: no auto-generation; manual mapping only

---

### ExternalService

Node represents a third-party API/service (Stripe, Auth0, Sendgrid, etc.).

#### Outgoing Edges

| Edge         | Target | Optionality | Group | Method |
| ------------ | ------ | ----------- | ----- | ------ |
| (none in v1) |        |             |       |        |

#### Incoming Edges

| Edge       | Source   | Optionality | Group | Method                                                     |
| ---------- | -------- | ----------- | ----- | ---------------------------------------------------------- |
| `[:CALLS]` | Symbol   | Optional    | 9     | Symbol calls this service (code scanning or LLM detection) |
| `[:CALLS]` | Endpoint | Optional    | 9     | Endpoint calls this service (via handler symbol)           |

#### Notes

- ExternalService is cross-snapshot (persistent)
- ExternalService ID is name-based (e.g., "stripe", "auth0")
- Properties include `integrationPatterns` (from GROUP 9 LLM extraction): how to initialize client,
  operations, error handling, retry strategy, timeout
- Useful for: "all symbols integrating with Stripe", "which endpoints call external services"
- Service discovery: heuristic (known SDK imports) + LLM (code analysis)

---

### StyleGuide

Node represents a coding style guide or convention (persistent).

#### Outgoing Edges

| Edge            | Target  | Optionality | Group | Method                                           |
| --------------- | ------- | ----------- | ----- | ------------------------------------------------ |
| `[:APPLIES_TO]` | Module  | Optional    | 7     | Guide applies to this module (metadata tagging)  |
| `[:REFERENCES]` | Pattern | Optional    | 7     | Guide references this pattern (metadata tagging) |

#### Incoming Edges

| Edge                                                    | Source | Optionality | Group | Method |
| ------------------------------------------------------- | ------ | ----------- | ----- | ------ |
| (incoming via [:APPLIES_TO] and [:REFERENCES] reversal) |        |             |       |        |

#### Notes

- StyleGuide is cross-snapshot (persistent)
- StyleGuide ID is document path (e.g., "docs/style-guides/error-handling")
- Source from tagged docs in `docs/style-guides/` or metadata in any doc
- Useful for: "which style guides apply to this module", "compliance checking"
- `appliesTo` property: list of module patterns (regex or exact names)

---

### ConfigurationVariable

Node represents an environment variable or configuration setting.

#### Outgoing Edges

| Edge         | Target | Optionality | Group | Method |
| ------------ | ------ | ----------- | ----- | ------ |
| (none in v1) |        |             |       |        |

#### Incoming Edges

| Edge             | Source | Optionality | Group | Method                                                             |
| ---------------- | ------ | ----------- | ----- | ------------------------------------------------------------------ |
| `[:USES_CONFIG]` | Symbol | Optional    | 9     | Symbol uses this config variable (code scanning or LLM extraction) |

#### Notes

- ConfigurationVariable is cross-snapshot (persistent)
- ConfigurationVariable ID is variable name (e.g., "STRIPE_API_KEY")
- Properties: `secret` (boolean; true for API keys, passwords), `defaultValue`, `documentation`,
  `required`
- Created by: code scanning (process.env patterns) + LLM extraction (from GROUP 9)
- Useful for: "what secrets does payment system need", "where is this config variable used"

---

## Summary: Edge Density by Node Type

| Node                      | Outgoing | Incoming | Total | Complexity     |
| ------------------------- | -------- | -------- | ----- | -------------- |
| **Codebase**              | 1        | 0        | 1     | Sparse         |
| **Snapshot**              | 8        | 7        | 15    | Dense          |
| **Module**                | 4        | 4        | 8     | Medium         |
| **File**                  | 2        | 2        | 4     | Sparse         |
| **Symbol**                | 11       | 8        | 19    | **Very Dense** |
| **Endpoint**              | 11       | 4        | 15    | **Dense**      |
| **SchemaEntity**          | 1        | 5        | 6     | Sparse         |
| **TestCase**              | 5        | 3        | 8     | Medium         |
| **SpecDoc**               | 6        | 2        | 8     | Medium         |
| **ThirdPartyLibrary**     | 1        | 2        | 3     | Sparse         |
| **Feature**               | 6        | 6        | 12    | **Dense**      |
| **Pattern**               | 3        | 4        | 7     | Medium         |
| **Incident**              | 3        | 0        | 3     | Sparse         |
| **ExternalService**       | 0        | 2        | 2     | Sparse         |
| **StyleGuide**            | 2        | 1        | 3     | Sparse         |
| **ConfigurationVariable** | 0        | 1        | 1     | Sparse         |

**Most connected**: Symbol (19), Endpoint (15), Snapshot (15), Feature (12)  
**Least connected**: ConfigurationVariable (1), Codebase (1), ExternalService (2)

---

## Notes on Edge Redundancy

Some edges are **derived** (can be computed from other edges) but stored explicitly for **query
convenience**:

- `Endpoint -[:IN_FILE]`, `[:IN_MODULE]` (derived from `[:HANDLED_BY]` → Symbol → containing
  File/Module)
- `Endpoint -[:READS_FROM]`, `[:WRITES_TO]` (derived from handler Symbol's edges)
- `TestCase -[:IN_MODULE]` (derived from File → Module)
- `Symbol -[:SIMILAR_TO]` (computed from embeddings, not structural)

**Design decision**: Store derived edges for agent convenience. Queries like "all endpoints in this
module" are much simpler with explicit `[:IN_MODULE]` than traversing Symbol containment.

---

## References

- [graph_schema_spec.md](../graph_schema_spec.md) – Node/edge definitions
- [ingest_spec.md](../ingest_spec.md) – Ingest pipeline & extraction
- [EXTRACTION_DIFFICULTY_ANALYSIS.md](./EXTRACTION_DIFFICULTY_ANALYSIS.md) – Which group extracts
  each edge
