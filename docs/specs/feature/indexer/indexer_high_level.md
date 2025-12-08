# Texere Indexer v1 Specification

This document defines the Version 1 schema, ingestion pipeline, and query API for the Texere
Indexer. It integrates **all decisions provided by the user**, with **no information loss**,
rewriting the full specification for correctness and internal consistency.

---

# 1. Goals

1. Provide a unified hierarchical knowledge graph spanning:
   - Codebase, Snapshots, Modules, Files, Symbols.
   - Features, Endpoints, SchemaEntities, TestCases.
   - SpecDocs, StyleGuides, Patterns, Incidents.
   - Third‑party libraries and external services.
2. Empower complex agent workflows:
   - Implement features “in repo style”.
   - Perform refactorings consistently.
   - Debug issues using historical context.
   - Generate or update specifications and documentation.
3. Build on SCIP for code‑level indexing (language‑agnostic where possible).
4. Provide rich, strict‑schema query bundles that agents can reliably consume.
5. Support incremental reindexing by comparing Snapshots and only reprocessing changed sections.

---

# 2. v1 Schema

The schema is compact but expressive. It incorporates all constraints from the user’s answers.

## 2.1 Node Types

### Structural

- **Codebase**: The logical identity of a project. A Feature always belongs to exactly one Codebase.
- **Snapshot**: A specific version of a Codebase at a _git commit_ (v1). Only explicitly indexed
  commits produce Snapshots. All code‑level nodes attach to a Snapshot.
- **Module**: Logical subsystem within a Snapshot, detected in a language‑agnostic way. The indexer
  may use heuristics or an LLM to determine structure (e.g., Nx, Maven, Cargo, custom layouts).
- **File**: A file inside a Module.
- **Symbol**: Any code symbol extracted by SCIP (function, method, class, constant, type, etc.).

### Domain and Behaviour

- **Feature**: A business capability. Endpoints/Symbols may belong to multiple Features.
- **Endpoint**: Public API entrypoint (HTTP or analogous), extracted via AST/LLM‑assisted detection.
- **SchemaEntity**: Persistent data model or table (e.g., Prisma model, SQL table).

### Quality and Process

- **TestCase**: A single test block (unit, integration, e2e). Extraction is language‑agnostic where
  possible.
- **SpecDoc**: Specifications, ADRs, design docs, guides, imported tickets.
- **StyleGuide**: Repository‑wide or subsystem‑specific conventions.
- **Pattern**: Structural or behavioural implementation patterns, manually defined or heuristically
  identified.
- **Incident**: Historical bug, failure, outage report.

### Dependencies

- **ThirdPartyLibrary**: Any library depended on by a Module.
- **ExternalService**: Remote service used by the Codebase. ExternalServices are **scoped to the
  Codebase**, not to Snapshots.

---

## 2.2 Edge Types

### Hierarchy

- `CONTAINS`: Codebase → Snapshot → Module → File → Symbol.
- `CONTAINS`: Snapshot → SpecDoc.
- All edges are **intra‑Codebase** (no cross‑Codebase edges in v1).

### Code Relations (SCIP-based)

- `CALLS`: Symbol → Symbol.
- `REFERENCES`: Symbol → Symbol.

### Semantic Relations

- `IMPLEMENTS`: Feature → Endpoint or Feature → Symbol. (Endpoints may belong to multiple Features.)
- `READS_FROM`: Symbol → SchemaEntity.
- `WRITES_TO`: Symbol → SchemaEntity.
- `DEPENDS_ON`: Module → ThirdPartyLibrary.
- `DEPENDS_ON`: Endpoint/Feature → ExternalService.

### Testing and Documentation

- `TESTS`: TestCase → Symbol or TestCase → Feature.
- `DOCUMENTS`: SpecDoc → Feature/Endpoint/Module.
- `DOCUMENTS`: StyleGuide → Module/Pattern.

### Patterns and History

- `FOLLOWS_PATTERN`: Symbol/Endpoint/Module → Pattern.
- `INTRODUCED_IN`: Symbol/Feature → Snapshot.
- `MODIFIED_IN`: Symbol/Feature → Snapshot.
- `CAUSES`: Incident → Symbol/Feature.
- `SIMILAR_TO`: Symbol ↔ Symbol or Feature ↔ Feature (embedding‑based).

---

# 3. Ingestion Pipeline

All ingestion steps support incremental indexing: when a new Snapshot is created, only changed
Modules/Files/Symbols are reindexed.

## 3.1 Codebase, Snapshot, and Module Extraction

- Create one **Codebase** node per logical project.
- For every explicitly indexed commit, create a **Snapshot** node.
- Modules are detected via language‑agnostic heuristics or LLM assistance. They may use Nx configs,
  Maven projects, Cargo manifests, or folder patterns, but no assumptions are hard‑coded.

## 3.2 File Extraction

- All relevant source files become File nodes, tagged with language, test/production role, etc.

## 3.3 Symbol Extraction (via SCIP)

- SCIP symbols become Symbol nodes.
- Occurrences produce CALLS and REFERENCES edges.
- Symbol metadata includes signature, range, export status.

## 3.4 Endpoint Extraction

- AST + heuristic + optional LLM detection of HTTP endpoints (verb, path, handler symbol).
- Creates Endpoint nodes.

## 3.5 SchemaEntity Extraction

- ORM schema parsing (Prisma, TypeORM, Drizzle, etc.).
- Produces SchemaEntity nodes.

## 3.6 TestCase Extraction

- Extract **individual test blocks**, not just test files.
- Detection is language‑agnostic where possible.
- Tests may target Symbols or Features.

## 3.7 SpecDoc Extraction

- Ingest Markdown specs, ADRs, design docs, and imported tickets.

## 3.8 StyleGuide Extraction

- Identify StyleGuide documents through tagging or heuristics.

## 3.9 Pattern Extraction

- v1 patterns are manually defined but MAY be augmented via structural similarity.

## 3.10 Incident Extraction

- From `incidents.yaml` or ticket imports.

## 3.11 Snapshot Metadata Extraction

- A Snapshot **is** the commit.
- Snapshot stores commit hash, author, timestamp, summary, and branch/tag context.
- No separate Commit node exists in v1.

## 3.12 External Dependency Extraction

- Third‑party libraries from dependency manifests.
- ExternalService definitions from config or manual descriptors.

---

# 4. Edge Inference Rules

## 4.1 CONTAINS

- Folder structure + project metadata + heuristics define containment.
- Only changed parts reindexed when Snapshot differences are small.

## 4.2 CALLS / REFERENCES

- Derived from SCIP occurrences.

## 4.3 IMPLEMENTS

- From `features.yaml` and/or LLM‑assisted inference.
- Endpoints and symbols may map to multiple Features.

## 4.4 READS_FROM / WRITES_TO

- Derived from ORM usage patterns, e.g. `prisma.<model>.findMany`.

## 4.5 DEPENDS_ON

- Derived from dependencies or remote service usage.

## 4.6 TESTS

- Based on imports, heuristics, naming, and LLM assistance.
- Links tests to Symbols or Features.

## 4.7 DOCUMENTS

- Inferred via name/content similarity.

## 4.8 FOLLOWS_PATTERN

- Manual or heuristic association.

## 4.9 INTRODUCED_IN / MODIFIED_IN

- Computed by diffing Snapshots.

## 4.10 CAUSES

- Derived from incident descriptions or manual mapping.

## 4.11 SIMILAR_TO

- Embedding‑based symbol/feature similarity.

---

# 5. Query API (v1)

Agent‑facing APIs return structured bundles defined by **strict JSON Schemas**.

## 5.1 Query: `get_feature_context(featureName)`

Returns:

- Feature node(s).
- Implementing Endpoints.
- Handler Symbols.
- Call graph slice (depth configurable; v1 allows effectively unbounded traversal).
- Related SchemaEntities.
- TestCases.
- SpecDocs and StyleGuides.
- Patterns followed.
- Snapshots where relevant symbols were introduced/modified.
- Similar Features.

## 5.2 Query: `get_endpoint_pattern_examples()`

Returns exemplar Endpoints with:

- Handler Symbols.
- Associated Tests.
- Patterns and StyleGuides.
- Relevant SchemaEntities.

## 5.3 Query: `get_incident_slice(incidentId)`

Returns:

- Incident node.
- Related Symbols and Features.
- Snapshots modifying related areas.
- Relevant Tests.
- Related SpecDocs.

## 5.4 JSON Schema Guarantees

- All bundles conform to strict, versioned JSON Schemas.
- Core fields required; extensions follow schema evolution rules.

---

# 6. Storage and Serving Model

- Backend may be a graph database (Neo4j/Memgraph) or relational DB (Postgres).
- Exposed via HTTP or gRPC.
- Indexer runs continuously or in CI.
- Multiple Snapshots per Codebase stored; only changed parts reindexed.
- No cross‑Codebase graph edges in v1.

---

# 7. Implementation Order

1. Implement SCIP ingestion: Codebase → Snapshot → Module → File → Symbol.
2. Add Endpoint and SchemaEntity extraction.
3. Add TestCase and SpecDoc ingestion.
4. Add Feature extraction (features.yaml + LLM inference). Pattern detection optional.
5. Add similarity edges.
6. Implement v1 Query API bundles.
7. Validate using real agent tasks.

---

# 8. Future Extensions (v2+)

- Trace/log/coverage ingestion.
- Automatic pattern mining.
