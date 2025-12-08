# Texere Indexer v1 Specification

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Active

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Audience](#2-audience)
- [3. Goals & Architecture](#3-goals--architecture)
- [4. Knowledge Graph Schema](#4-knowledge-graph-schema)
- [5. Ingestion Pipeline (Logical)](#5-ingestion-pipeline-logical)
- [6. Query API](#6-query-api)
- [7. Storage & Serving](#7-storage--serving)
- [8. Non-Functional](#8-non-functional)
- [9. Implementation Order](#9-implementation-order)
- [10. Dependencies & References](#10-dependencies--references)
- [11. Future Extensions (v2+)](#11-future-extensions-v2)
- [12. Changelog](#12-changelog)

---

## 1. Scope

### 1.1 In Scope

- High-level schema design for a unified hierarchical knowledge graph spanning code, features,
  tests, specs, and incidents.
- Graph node types (Codebase, Snapshot, Module, File, Symbol, Feature, Endpoint, SchemaEntity,
  TestCase, SpecDoc, StyleGuide, Pattern, Incident, ThirdPartyLibrary, ExternalService).
- Graph edge types (CONTAINS, CALLS, REFERENCES, IMPLEMENTS, READS_FROM, WRITES_TO, DEPENDS_ON,
  TESTS, DOCUMENTS, FOLLOWS_PATTERN, INTRODUCED_IN, MODIFIED_IN, CAUSES, SIMILAR_TO).
- Logical architecture of the ingestion pipeline (snapshot selection, language indexers,
  higher-level extraction, persistence).
- Agent-facing query API contracts (get_feature_context, get_endpoint_pattern_examples,
  get_incident_slice).
- Version 1 constraints: single-node execution, local or self-hosted deployment, best-effort LLM
  determinism, incremental indexing by Snapshot.

### 1.2 Out of Scope

- Detailed ingestion implementation (language indexer algorithms, LLM prompts, Git diff specifics) →
  see `ingest_spec.md`
- Monorepo layout, Nx package structure, and library dependencies → see `nx_layout_spec.md`
- Vector search algorithms, embedding model selection, or similarity ranking strategies
- Graph database selection or Cypher query patterns
- Configuration formats, deployment procedures, or operational runbooks
- Agent tool signatures or rate limiting; tool integration is covered in `ingest_spec.md` and
  `nx_layout_spec.md`

**Cite as:** §1

---

## 2. Audience

- **Developers & Engineers:** Understanding the knowledge graph model and what data flows through
  it.
- **LLM Agents:** Navigating the spec, understanding node/edge types, query API contracts.
- **DevOps/Infra:** Understanding the logical components and persistence model.
- **Product & Design:** Understanding capabilities enabled by the index (context, patterns, incident
  history).

**Cite as:** §2

---

## 3. Goals & Architecture

### 3.1 Goals

1. **Unified Knowledge Graph**: Provide a single hierarchical graph spanning codebase structure
   (modules, files, symbols), domain concepts (features, endpoints, schema entities), quality
   artifacts (tests, specs, patterns), and historical context (incidents, snapshots).
2. **Enable Agent Workflows**: Empower agents to understand "repo style," perform consistent
   refactorings, debug issues using historical context, and generate or update specifications.
3. **Leverage SCIP**: Build on SCIP for code-level indexing (function, class, constant, type symbols
   and their references/calls) in a language-agnostic way where possible.
4. **Strict Query Schemas**: Return agent-facing query bundles with strict JSON schemas; no
   ambiguity in data structure.
5. **Incremental Indexing**: Support efficient re-indexing by comparing Snapshots; only changed
   files/symbols reprocessed.

**Cite as:** §3.1

### 3.2 High-Level Architecture

The indexer operates in three logical phases:

1. **Ingestion (Per-Snapshot)**:
   - Compute Git diff from previous Snapshot.
   - Run language-specific indexers (TypeScript, Python) on changed files.
   - Extract higher-level concepts (endpoints, schema entities, features, test-feature links).
   - Persist nodes, edges, and embeddings to graph database (Neo4j/Memgraph) and vector store
     (Qdrant).

2. **Querying (Agent-Facing)**:
   - Agents call read-only query API (getFeatureContext, getEndpointPatternExamples,
     getIncidentSlice).
   - Queries compose data from graph and vector store; return strict TypeScript types.

3. **Serving**:
   - Backend is a graph database (Neo4j/Memgraph) or relational DB (Postgres) for node/edge storage.
   - Vector store (Qdrant) for embedding-based similarity.
   - HTTP or gRPC API layer exposes queries.
   - Indexer runs continuously (CI on every commit) or on-demand.

**Cite as:** §3.2

---

## 4. Knowledge Graph Schema

### 4.1 Node Types

#### 4.1.1 Structural Nodes

| Node Type    | Definition                                                                                                                                                                                                           | Snapshot-Scoped? |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Codebase** | Logical identity of a project; contains all snapshots                                                                                                                                                                | No               |
| **Snapshot** | A git commit indexed; contains code-level nodes (Module, File, Symbol). No separate Commit node exists in v1; Snapshot **is** the commit and stores commit hash, author, timestamp, summary, and branch/tag context. | N/A (is root)    |
| **Module**   | Logical subsystem within a Snapshot (e.g., Nx app, Maven project, Cargo pkg)                                                                                                                                         | Yes              |
| **File**     | Source file inside a Module; tagged with language and test/prod role                                                                                                                                                 | Yes              |
| **Symbol**   | SCIP symbol (function, method, class, const, type, etc.)                                                                                                                                                             | Yes              |

**Cite as:** §4.1.1

#### 4.1.2 Domain & Behavior Nodes

| Node Type        | Definition                                                | Snapshot-Scoped? |
| ---------------- | --------------------------------------------------------- | ---------------- |
| **Feature**      | Business capability; may span multiple Endpoints/Symbols  | No               |
| **Endpoint**     | Public API entrypoint (HTTP verb + path + handler symbol) | Yes              |
| **SchemaEntity** | Persistent data model (Prisma model, SQL table, etc.)     | Yes              |

**Cite as:** §4.1.2

#### 4.1.3 Quality & Process Nodes

| Node Type      | Definition                                                                                                                                           | Snapshot-Scoped? |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **TestCase**   | Individual test block (unit, integration, e2e)                                                                                                       | Yes              |
| **SpecDoc**    | Specification, ADR, design doc, design guide, or ticket                                                                                              | Yes              |
| **StyleGuide** | Repository or subsystem-wide coding conventions                                                                                                      | Yes              |
| **Pattern**    | Structural or behavioral implementation pattern. In v1, patterns are **manually defined** but may be augmented via structural similarity heuristics. | No (reference)   |
| **Incident**   | Bug, failure, or outage report (with historical context)                                                                                             | No (reference)   |

**Cite as:** §4.1.3

#### 4.1.4 Dependency Nodes

| Node Type             | Definition                                     | Snapshot-Scoped?   |
| --------------------- | ---------------------------------------------- | ------------------ |
| **ThirdPartyLibrary** | External dependency of a Module                | Yes                |
| **ExternalService**   | Remote service used by Codebase (e.g., Stripe) | No (codebase-wide) |

**Cite as:** §4.1.4

### 4.2 Edge Types

#### 4.2.1 Hierarchy (CONTAINS)

| From → To           | Meaning                                         | Notes        |
| ------------------- | ----------------------------------------------- | ------------ |
| Codebase → Snapshot | Codebase holds all snapshots of itself          | Time-ordered |
| Snapshot → Module   | Snapshot contains modules                       | Structural   |
| Module → File       | Module contains files                           | Structural   |
| File → Symbol       | File contains symbols (SCIP)                    | Structural   |
| Snapshot → SpecDoc  | Snapshot indexes available specs at that commit | Attachment   |

**Cite as:** §4.2.1

#### 4.2.2 Code Relations (SCIP-based)

| From → To       | Meaning                                 | Derived From     |
| --------------- | --------------------------------------- | ---------------- |
| Symbol → Symbol | Caller → Callee (function/method calls) | SCIP occurrences |
| Symbol → Symbol | Reference → Definition (variable, type) | SCIP occurrences |

**Cite as:** §4.2.2

#### 4.2.3 Semantic Relations

| From → To                  | Meaning                                               | Derived From         |
| -------------------------- | ----------------------------------------------------- | -------------------- |
| Feature → Endpoint         | Feature is implemented by Endpoint                    | features.yaml + LLM  |
| Feature → Symbol           | Feature is implemented by Symbol                      | features.yaml + LLM  |
| Symbol → SchemaEntity      | Symbol reads from entity (e.g., prisma.User.findMany) | ORM usage patterns   |
| Symbol → SchemaEntity      | Symbol writes to entity                               | ORM usage patterns   |
| Module → ThirdPartyLib     | Module depends on library                             | Dependency manifests |
| Endpoint → ExternalService | Endpoint calls external service                       | Heuristics + code    |
| Feature → ExternalService  | Feature depends on external service                   | Heuristics + code    |

**Cite as:** §4.2.3

#### 4.2.4 Testing & Documentation

| From → To            | Meaning                       | Derived From   |
| -------------------- | ----------------------------- | -------------- |
| TestCase → Symbol    | Test exercises Symbol         | Heuristics+LLM |
| TestCase → Feature   | Test verifies Feature         | Heuristics+LLM |
| SpecDoc → Feature    | Spec documents Feature        | Name/content   |
| SpecDoc → Endpoint   | Spec documents Endpoint       | Name/content   |
| SpecDoc → Module     | Spec documents Module         | Name/content   |
| StyleGuide → Module  | StyleGuide applies to Module  | Tagging        |
| StyleGuide → Pattern | StyleGuide references Pattern | Tagging        |

**Cite as:** §4.2.4

#### 4.2.5 Patterns & History

| From → To          | Meaning                                     | Derived From       |
| ------------------ | ------------------------------------------- | ------------------ |
| Symbol → Pattern   | Symbol follows Pattern                      | Heuristics + LLM   |
| Endpoint → Pattern | Endpoint follows Pattern                    | Heuristics + LLM   |
| Module → Pattern   | Module follows Pattern                      | Heuristics + LLM   |
| Symbol → Snapshot  | Symbol was introduced in Snapshot           | Git diff (first)   |
| Symbol → Snapshot  | Symbol was modified in Snapshot             | Git diff (changes) |
| Feature → Snapshot | Feature was introduced/modified in Snapshot | Graph analysis     |
| Incident → Symbol  | Incident is caused by/related to Symbol     | Manual mapping     |
| Incident → Feature | Incident is related to Feature              | Manual mapping     |
| Symbol ↔ Symbol    | Symbols are similar (embedding-based)       | Vector search      |
| Feature ↔ Feature  | Features are similar (embedding-based)      | Vector search      |

**Cite as:** §4.2.5

### 4.3 Edge Inference Rules

This section details how each edge type is derived or computed during ingestion.

#### 4.3.1 CONTAINS (Hierarchy)

- **Folder structure + project metadata + heuristics** define containment.
- Module detection is language-agnostic; may use Nx configs, Maven projects, Cargo manifests, or
  folder patterns (no hard-coded assumptions).
- Only changed parts reindexed when Snapshot differences are small.

**Cite as:** §4.3.1

#### 4.3.2 CALLS / REFERENCES (Code Relations)

- **Derived from SCIP occurrences**.
- SCIP symbols become Symbol nodes; occurrences produce CALLS and REFERENCES edges.
- Symbol metadata includes signature, range, export status.

**Cite as:** §4.3.2

#### 4.3.3 IMPLEMENTS (Feature → Endpoint/Symbol)

- **From `features.yaml` and/or LLM-assisted inference**.
- Endpoints and symbols may map to **multiple Features**.
- Endpoints and symbols may belong to multiple Features.

**Cite as:** §4.3.3

#### 4.3.4 READS_FROM / WRITES_TO (Symbol → SchemaEntity)

- **Derived from ORM usage patterns**, e.g., `prisma.<model>.findMany`, `User.find()`.
- ORM schema parsing (Prisma, TypeORM, Drizzle, etc.) produces SchemaEntity nodes.

**Cite as:** §4.3.4

#### 4.3.5 DEPENDS_ON (Module → ThirdPartyLibrary, Endpoint/Feature → ExternalService)

- **Derived from dependency manifests** (package.json, requirements.txt, Cargo.toml, etc.).
- **ExternalService definitions** from config or manual descriptors.

**Cite as:** §4.3.5

#### 4.3.6 TESTS (TestCase → Symbol/Feature)

- **Based on imports, heuristics, naming, and LLM assistance**.
- Extract **individual test blocks**, not just test files.
- Detection is language-agnostic where possible.
- Tests may target Symbols or Features.

**Cite as:** §4.3.6

#### 4.3.7 DOCUMENTS (SpecDoc → Feature/Endpoint/Module, StyleGuide → Module/Pattern)

- **Inferred via name/content similarity**.
- Ingest Markdown specs, ADRs, design docs, guides, and imported tickets as SpecDoc nodes.
- Identify StyleGuide documents through tagging or heuristics.

**Cite as:** §4.3.7

#### 4.3.8 FOLLOWS_PATTERN (Symbol/Endpoint/Module → Pattern)

- **Manual or heuristic association**.
- v1 patterns are manually defined but may be augmented via structural similarity.

**Cite as:** §4.3.8

#### 4.3.9 INTRODUCED_IN / MODIFIED_IN (Symbol/Feature → Snapshot)

- **Computed by diffing Snapshots**.
- Symbols where introduced/modified are tracked across Snapshot versions.

**Cite as:** §4.3.9

#### 4.3.10 CAUSES (Incident → Symbol/Feature)

- **Derived from incident descriptions or manual mapping**.
- From `incidents.yaml` or ticket imports.

**Cite as:** §4.3.10

#### 4.3.11 SIMILAR_TO (Symbol ↔ Symbol, Feature ↔ Feature)

- **Embedding-based symbol/feature similarity**.
- Embeddings generated only for changed entities per Snapshot.

**Cite as:** §4.3.11

### 4.4 Node & Edge Scope

- **Snapshot-scoped nodes** (Module, File, Symbol, Endpoint, TestCase, SpecDoc, ThirdPartyLib) are
  created per Snapshot. Deleting or renaming in a new Snapshot is treated as delete + add in v1 (no
  continuity tracking).
- **Non-scoped nodes** (Codebase, Feature, Pattern, Incident, ExternalService) persist across
  Snapshots.
- **Edges within a Snapshot** (CONTAINS, CALLS, REFERENCES, READS_FROM, WRITES_TO, TESTS) link
  snapshot-scoped nodes.
- **Cross-Snapshot edges** (INTRODUCED_IN, MODIFIED_IN) link snapshot-scoped nodes to Snapshots.
- **Cross-Codebase edges**: None in v1.

**Cite as:** §4.4

---

## 5. Ingestion Pipeline (Logical)

### 5.1 Snapshot Selection & Retention

**For own repositories**:

- Configured list of tracked branches (e.g., `main`, `develop`).
- Index **only the latest commit** per tracked branch.
- Previous commits pruned after new indexing succeeds.

**For third-party dependencies**:

- Index **only the specific versions** in lockfiles (e.g., `package-lock.json`, `poetry.lock`).
- No historic indexing of dependencies.

**Cite as:** §5.1

### 5.2 Per-Snapshot Indexing Steps

1. **Resolve Snapshot**: Fetch git commit hash, author, timestamp, summary, branch/tag context.
2. **Compute Git Diff**: Added/modified/deleted/renamed files vs. parent Snapshot.
3. **Run Language Indexers**: Group changed files by language; invoke TypeScript and Python
   indexers.
4. **Higher-Level Extraction**: From FileIndexResult + repo config + LLM:
   - Endpoint extraction (AST + heuristics + LLM)
   - Schema entity extraction (ORM parsing)
   - TestCase extraction (pytest, vitest, etc.; language-agnostic)
   - Feature mapping (features.yaml + LLM inference)
   - Test↔Feature mapping (LLM)
   - Endpoint↔Feature mapping (LLM)
5. **Persist Graph & Vectors**: Upsert nodes, edges, embeddings via `indexer/core`.
6. **Incremental Behavior**:
   - Unchanged files reuse prior graph state.
   - Deleted files marked removed.
   - Renamed files: delete + add (no continuity).

**Cite as:** §5.2

### 5.3 Language Indexers

All language indexers produce a unified `FileIndexResult[]` structure containing:

- **Symbols** (name, kind, range, export status)
- **Calls** (caller → callee symbol links)
- **References** (reference → definition symbol links)
- **Endpoints** (verb, path, handler symbol) — _optional, framework-specific_
- **TestCases** (name, location) — _optional, language-specific_

**Supported in v1**:

- TypeScript/JavaScript: Full AST + SCIP-style analysis
- Python: Basic analysis (simple AST parsing, no deep type inference)

**Cite as:** §5.3

### 5.4 LLM-Assisted Extraction

LLM is used for:

- **Feature Mapping**: Map Endpoints/Symbols to Features (from features.yaml).
- **Test↔Feature Mapping**: Link TestCases to Features.
- **Endpoint↔Feature Mapping**: Link Endpoints to Features.

**Design rule**: Missed links worse than bad links; prefer generating plausible associations.

**Determinism**: Best-effort (not strict); re-running may produce different mappings.

**Cite as:** §5.4

### 5.5 Incremental Behavior & Symbol ID Stability

- Symbol IDs are **stable within a Snapshot**: path + name + range define a unique ID.
- Between Snapshots, symbol IDs may differ if code moves (no continuity tracking in v1).
- Renames: treated as delete in old Snapshot + add in new Snapshot.

**Cite as:** §5.5

### 5.6 Error Handling

**File-level failures** (parse errors, invalid syntax):

- Logged; file skipped; Snapshot continues.

**Indexer-level failures** (TS indexer crash, Python sidecar failure):

- Snapshot marked `index_failed`; no partial graph updates written.
- Worker may retry per configuration.

**LLM failures**:

- Skip only affected mapping (feature/test/endpoint).
- Never fail entire Snapshot due to LLM error.

**Cite as:** §5.6

---

## 6. Query API

### 6.1 Query: `getFeatureContext`

**Purpose**: Retrieve full context for a single Feature.

**Input**:

```typescript
interface GetFeatureContextInput {
  featureName: string;
}
```

**Returns: `FeatureContextBundle`**

| Field                     | Type           | Description                                      |
| ------------------------- | -------------- | ------------------------------------------------ |
| **feature**               | Feature node   | The Feature itself                               |
| **implementingEndpoints** | Endpoint[]     | Endpoints tagged with this Feature               |
| **handlerSymbols**        | Symbol[]       | Symbols directly implementing Feature            |
| **callGraph**             | Graph slice    | Call graph of handlers (configurable depth)      |
| **relatedSchemaEntities** | SchemaEntity[] | Entities read/written by symbols in call graph   |
| **testCases**             | TestCase[]     | Tests linked to Feature or handlers              |
| **specDocs**              | SpecDoc[]      | Specs documenting this Feature                   |
| **styleGuides**           | StyleGuide[]   | Applicable style guides for Module/symbols       |
| **patterns**              | Pattern[]      | Patterns followed by Feature                     |
| **snapshots**             | Snapshot[]     | Snapshots where symbols were introduced/modified |
| **similarFeatures**       | Feature[]      | Features with similar embeddings                 |

**Cite as:** §6.1

### 6.2 Query: `getEndpointPatternExamples`

**Purpose**: Retrieve exemplar Endpoints to demonstrate API patterns.

**Input**:

```typescript
interface GetEndpointPatternExamplesInput {
  limit?: number; // default: 10
}
```

**Returns: Array of objects**

Each object contains:

| Field           | Type           | Description                    |
| --------------- | -------------- | ------------------------------ |
| **endpoint**    | Endpoint node  | The exemplar Endpoint          |
| **handler**     | Symbol         | Handler function for Endpoint  |
| **tests**       | TestCase[]     | Tests exercising this Endpoint |
| **patterns**    | Pattern[]      | Patterns this Endpoint follows |
| **styleGuides** | StyleGuide[]   | Applicable style guides        |
| **entities**    | SchemaEntity[] | Schema entities read/written   |

**Cite as:** §6.2

### 6.3 Query: `getIncidentSlice`

**Purpose**: Retrieve context around a single Incident.

**Input**:

```typescript
interface GetIncidentSliceInput {
  incidentId: string;
}
```

**Returns: `IncidentSliceBundle`**

| Field               | Type          | Description                                    |
| ------------------- | ------------- | ---------------------------------------------- |
| **incident**        | Incident node | The Incident itself                            |
| **relatedSymbols**  | Symbol[]      | Symbols identified as cause/involved           |
| **relatedFeatures** | Feature[]     | Features affected by Incident                  |
| **snapshots**       | Snapshot[]    | Snapshots modifying related Symbols/Features   |
| **tests**           | TestCase[]    | Tests related to area (may detect regressions) |
| **specDocs**        | SpecDoc[]     | Spec docs or ADRs related to fix/context       |

**Cite as:** §6.3

### 6.4 JSON Schema Guarantees

- All query responses conform to strict, versioned JSON schemas.
- Core fields required; extensions follow schema evolution rules (additive only).
- Agents can rely on exact type contracts.

**Cite as:** §6.4

---

## 7. Storage & Serving

### 7.1 Backend Options

**Graph Database** (recommended for v1):

- Neo4j or Memgraph
- Stores nodes, edges, CONTAINS hierarchy, code relations

**Vector Store**:

- Qdrant (embedded or managed)
- Stores embeddings for symbols, SpecDocs, Features
- Enables similarity-based queries

**Alternative Monolithic Backend**:

- PostgreSQL with JSONified nodes/edges
- Simpler ops; may have performance trade-offs for large graphs

**Cite as:** §7.1

### 7.2 API Exposure

- HTTP REST API (recommended) or gRPC
- Stateless query nodes; database as single source of truth
- No caching layer in v1 (add in v1+ if perf required)

**Cite as:** §7.2

### 7.3 Indexer Execution

**v1 Runtime Model**:

- Local or single-node execution
- BullMQ optional; design must not block future horizontal scaling

**Execution Trigger**:

- CI on every commit (automated)
- On-demand via HTTP API (manual)

**Cite as:** §7.3

---

## 8. Non-Functional

### 8.1 Performance

| Target                                             | Rationale                      |
| -------------------------------------------------- | ------------------------------ |
| Snapshot indexing: ≤5m per commit (TS/JS + Python) | Interactive feedback in CI     |
| Query (getFeatureContext): ≤500ms p95              | Real-time agent invocation     |
| Embedding generation: Async; no blocking on ingest | Allows soft performance budget |

**Cite as:** §8.1

### 8.2 Correctness & Coverage

- **Determinism**: Non-LLM paths fully deterministic; LLM paths best-effort.
- **Symbol ID stability**: Within a Snapshot, stable; across Snapshots, may differ (v1).
- **Completeness**: Missed links preferred to incorrect links (LLM design rule §5.4).

**Cite as:** §8.2

### 8.3 Scalability

**v1 Scope**:

- Single codebase + dependencies per indexer instance
- All snapshots in one graph database
- No sharding; no cross-instance federation

**Future (v2+)**:

- Multi-codebase graph federation
- Snapshot pruning strategy
- Horizontal scaling of query layer

**Cite as:** §8.3

### 8.4 Security & Privacy

- Never send denylist-matched files (`.env`, secrets) to LLM components
- Configurable allow/deny lists for sensitive paths
- No logging of full code content; metadata only

**Cite as:** §8.4

### 8.5 Observability

- Structured logging (JSON format) for all ingest steps
- Per-node logging: entry, exit, duration, state changes
- Tool call logging: name, input, output, duration, errors
- Graph-level summary: total duration, node count, edge count, final status

**Cite as:** §8.5

---

## 9. Implementation Order

1. **Phase 1**: SCIP ingestion → Codebase → Snapshot → Module → File → Symbol (CALLS/REFERENCES)
2. **Phase 2**: Add Endpoint and SchemaEntity extraction
3. **Phase 3**: Add TestCase and SpecDoc ingestion
4. **Phase 4**: Add Feature extraction (features.yaml + LLM inference)
5. **Phase 5**: Add similarity edges (embedding-based)
6. **Phase 6**: Implement v1 Query API bundles
7. **Phase 7**: Validate using real agent tasks

**Cite as:** §9

---

## 10. Dependencies & References

### 10.1 Related Specifications (v1 Indexer)

- **`ingest_spec.md`** (Active): Complete ingestion pipeline, language indexers, Git diff,
  higher-level extractors, testing & quality requirements.
- **`nx_layout_spec.md`** (Active): Monorepo layout, Nx library structure (types, core, ingest,
  query, workers), dependency boundaries.

### 10.2 Implementation Detail Specs (Placeholders – Fill Before Coding)

**CRITICAL (Implement First)**:

- **`graph_schema_spec.md`** (Placeholder): Neo4j/Memgraph schema, node/edge DDL, indexes, Cypher
  query patterns.
- **`vector_store_spec.md`** (Placeholder): Qdrant payload schema, embedding model, dimensions,
  similarity queries.
- **`llm_prompts_spec.md`** (Placeholder): LLM prompt templates, feature mapping, test↔feature,
  endpoint↔feature output schemas.

**HIGH PRIORITY (Before Coding)**:

- **`configuration_spec.md`** (Placeholder): Environment variables, config files, tracked branches,
  security lists.
- **`api_gateway_spec.md`** (Placeholder): HTTP REST endpoints, request/response schemas, error
  handling.
- **`testing_strategy_spec.md`** (Placeholder): Unit/integration/golden test structure, fixtures,
  coverage targets.

**MEDIUM PRIORITY**:

- **`symbol_id_stability_spec.md`** (Placeholder): Symbol ID algorithm, Git rename handling, symbol
  movement, incremental diff.
- **`language_indexers_spec.md`** (Placeholder): TypeScript/JavaScript AST rules, Python sidecar
  protocol, framework heuristics, test detection.

**OPTIONAL for v1**:

- **`patterns_and_incidents_spec.md`** (Placeholder): Pattern definitions, incident manifest,
  historical tracking.

### 10.3 High-Level Spec

- [System & Architecture Overview](../../README.md §5–7): Texere architecture, major components.

### 10.4 External References

- [SCIP Specification](https://sourcegraph.com/github.com/sourcegraph/scip): Code indexing protocol
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/): Neo4j queries (if
  applicable)
- [Qdrant Documentation](https://qdrant.tech/documentation/): Vector store usage

**Cite as:** §10

---

## 11. Future Extensions (v2+)

The following enhancements are deferred beyond v1 and may be explored in future versions:

### 11.1 Trace / Log / Coverage Ingestion

- Ingest runtime execution traces (function entry/exit, timing, arguments).
- Ingest application logs to correlate with graph nodes (errors, warnings, events).
- Ingest code coverage data to identify untested symbols and features.
- Link traces, logs, and coverage to Snapshots to enable debugging workflows.

**Cite as:** §11.1

### 11.2 Automatic Pattern Mining

- Use structural/behavioral clustering to automatically discover implementation patterns from the
  codebase.
- Augment manually-defined patterns with heuristically-identified patterns.
- Enable agents to learn and apply patterns dynamically.

**Cite as:** §11.2

### 11.3 Multi-Codebase Federation

- Extend schema to support cross-Codebase edges (currently prohibited in v1).
- Enable querying relationships between symbols in different projects.
- Support monorepo scenarios with internal and external dependencies.

**Cite as:** §11.3

---

## 12. Changelog

| Date       | Version | Editor | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-06 | 1.1     | @agent | Added missing data from original spec: (1) Expanded Snapshot definition to include "No separate Commit node" constraint and metadata details (§4.1.1). (2) Enhanced Pattern definition with "manually defined but may be augmented" distinction (§4.1.3). (3) Added §4.3 Edge Inference Rules with detailed logic for each edge type (CONTAINS, CALLS/REFERENCES, IMPLEMENTS, READS_FROM/WRITES_TO, DEPENDS_ON, TESTS, DOCUMENTS, FOLLOWS_PATTERN, INTRODUCED_IN/MODIFIED_IN, CAUSES, SIMILAR_TO). (4) Added §10 Future Extensions (v2+): Trace/Log/Coverage Ingestion, Automatic Pattern Mining, Multi-Codebase Federation. All original v1 data now fully preserved. |
| 2025-12-06 | 1.0     | @agent | Rewrote high-level spec per `spec_writing.md` standards. Added Quick Navigation, explicit Audience section, structured node/edge type tables (4.1–4.2), logical pipeline steps (§5), strict Query API section with bundle contracts (§6), Non-Functional targets (§8, quantified), and proper sections for Implementation Order, Dependencies, Changelog. Consolidated original data from `indexer_high_level.md` with no loss. References updated to point to `ingest_spec.md` and `nx_layout_spec.md`.                                                                                                                                                               |

**Cite as:** §12

---

## End of Texere Indexer v1 Specification
