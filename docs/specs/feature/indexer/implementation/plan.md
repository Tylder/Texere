# Indexer Implementation Plan (Vertical Slices)

_Process template: `docs/specs/meta/llm_feature_workflow_full.md` (Steps A–G). Specs read:
feature/indexer full set, graph schema, ingest, configuration/server setup, layout, documentation
indexing, test repository, testing strategy, configuration spec, language indexers, vector store,
LLM prompts, symbol ID stability, patterns/incidents, API gateway, schema docs (nodes/edges),
research._

**Template guidance (repo-provided scaffolds)**

- Libraries (Node/ESM): use `templates/nx/node-lib` (copy + replace `__name__`, `__description__`,
  `__scope__`), per `templates/nx/README.md`.
- React libs: `templates/nx/react-lib` (not expected for indexer).
- Web apps: `templates/nx/next-app` (not expected for indexer v1).  
  Prefer these templates over ad‑hoc Nx generate to keep tsconfig/scripts aligned.

---

## Slice 0 — Scaffolding & Guards (Walking Skeleton)

**Purpose**: Create the minimal, compilable structure that wires Nx libs and shared types without
real indexing.  
**Scope**:

- Generate Nx libraries per `layout_spec.md` §2 (types, core, ingest, query, workers) using the Node
  lib template at `templates/nx/node-lib` (copy & fill placeholders; set tags `domain:indexer`,
  `layer:<layer>`).
- Export shared types for `FileIndexResult`, `LanguageIndexer` per `ingest_spec.md` §3–4.
- Add config loader stub aligned with `configuration_spec.md` §1–2 and
  `configuration_and_server_setup.md` §2–3.
- Add empty query API surface (function signatures only) for `getFeatureContext`,
  `getBoundaryPatternExamples`, `getIncidentSlice` from `graph_schema_spec.md` §6 and README.  
  **Acceptance**: Nx builds succeed; types compile; no runtime behavior.  
  **Tests** (unit stubs only; skipped/placeholder): colocate and mark todo with references to
  `testing_strategy_spec.md` & `testing_specification.md`.

## Slice 1 — Git Snapshot Resolution & Diff Plumbing

**Purpose**: Resolve tracked branches and compute changed files.  
**Scope**:

- Implement config resolution: `INDEXER_CONFIG_PATH` + per-repo `.indexer-config.json` precedence
  (`configuration_and_server_setup.md` §3–9; `configuration_spec.md` §1–4).
- Implement branch resolution + snapshot selection (`ingest_spec.md` §6.1, §6.2). Treat renames as
  delete+add (`ingest_spec.md` §2.5, §6.2).
- Produce `ChangedFileSet` (added/modified/deleted/renamed) for downstream indexers.  
  **Acceptance**: Given repo + trackedBranches, returns commit hash + file sets; deleted files
  flagged.  
  **Tests**: Unit tests over synthetic git fixture; cover branch precedence and rename handling per
  `test_repository_spec.md` (Incremental Validation Table).

## Slice 2 — TypeScript Language Indexer (Symbols/Calls/Refs/Tests/Boundaries)

**Purpose**: Extract `FileIndexResult` for TS/JS.  
**Scope**:

- Implement `ts-indexer` (AST) covering symbols, CALL/TYPE_REF/IMPORT references, Boundary
  heuristics (Express) per `ingest_spec.md` §5.1; `language_indexers_spec.md` (placeholder—document
  decisions in code comments).
- Test detection (`describe/it/test`) per `ingest_spec.md` §5.1; map to TestCase nodes.
- Boundary detection: verb/path + handler symbol IDs (`Boundary.id` format from
  `nodes/Boundary.md`).
- Enforce symbol ID construction (path+name+range) per `ingest_spec.md` §3,
  `symbol_id_stability_spec.md`.  
  **Acceptance**: For `test-typescript-app` snapshot-2 fixture, extracted counts meet
  `test_repository_spec.md` Node/Edge matrices.  
  **Tests**: Golden `FileIndexResult` for key files (user.service.ts, routes.ts, validators.ts) as
  specified in `test_repository_spec.md` (Golden Snapshots).

## Slice 3 — Graph Persistence (Neo4j) with Cardinality Constraints

**Purpose**: Write snapshot-scoped nodes/edges enforcing invariants.  
**Scope**:

- Implement `indexer/core` graph client + transactional upserts with `IN_SNAPSHOT` invariant
  (`graph_schema_spec.md` §4.1B; `ingest_spec.md` §6.3); add/mutate packages via
  `templates/nx/node-lib` if a new lib is needed.
- Create DDL bootstrap for constraints/indexes per `graph_schema_spec.md` §4.1–4.4.
- Implement persistence functions: `upsertCodebase`, `upsertSnapshot`,
  `upsertModule/File/Symbol/Boundary/TestCase/DataContract`, edge writers for CONTAINS, IN_SNAPSHOT,
  REFERENCES, REALIZES, MUTATES, LOCATION, TRACKS, DOCUMENTS, DEPENDS_ON, IMPACTS.  
  **Acceptance**: Batch write of Slice 2 output inserts without violating `IN_SNAPSHOT` or
  uniqueness; orphan check returns zero.  
  **Tests**: Integration test against ephemeral Neo4j container (or in-memory mock if container
  unavailable) asserting constraint enforcement and edge counts; references `graph_schema_spec.md`
  §6 query patterns.

## Slice 4 — Documentation & SpecDoc Ingestion

**Purpose**: Index colocated docs and create DOCUMENTS edges.  
**Scope**:

- Implement doc source handling for `colocated` per `documentation_indexing_spec.md` §2.1 and
  pipeline §3–4.
- Extract first 5KB content, embed payload stub (no real vectors yet), link docs to
  Features/Boundaries/Symbols/Modules using linking strategies (explicit mentions + basic similarity
  placeholder) per §4 (priority order).
- Persist SpecDoc nodes + DOCUMENTS edges via core layer.  
  **Acceptance**: For `test-typescript-app` docs, produces SpecDoc nodes and DOCUMENTS edges
  matching `test_repository_spec.md` Doc coverage.  
  **Tests**: Integration/golden for docs/API.md linking endpoints; uses confidence thresholds ≥0.7
  default per `documentation_indexing_spec.md` Confidence table.

## Slice 5 — Embeddings & Vector Store (Stub → Qdrant)

**Purpose**: Enable vector payload generation for symbols/boundaries/test cases/spec docs.  
**Scope**:

- Define payload schema aligned with `vector_store_spec.md` (fill placeholders: model name, dims
  from `configuration_spec.md` defaults).
- Implement pluggable embedding provider interface; stub with deterministic hash for tests; real
  call optional via config.
- Implement Qdrant client wrapper; create collection with payload indexes.  
  **Acceptance**: Embedding generation invoked for Slice 2 entities; vectors stored with ids linked
  to graph nodes via `embeddingId` field.  
  **Tests**: Unit test using stub provider to ensure deterministic vectors; integration skips if
  Qdrant unavailable (document in test).

## Slice 6 — Query API (Library + HTTP Surface)

**Purpose**: Expose agent-facing queries and minimal HTTP endpoints.  
**Scope**:

- Implement `indexer/query` functions per `layout_spec.md` §2.4 and Cypher patterns
  `graph_schema_spec.md` §6 (getFeatureContext, getBoundaryPatternExamples, getIncidentSlice);
  scaffold any supporting lib with `templates/nx/node-lib`. If an HTTP surface is added, prefer an
  Nx Node app generator or convert from `templates/nx/next-app` only if a web UI is required (not
  expected v1).
- Add thin API gateway handlers aligned with `api_gateway_spec.md` placeholders (GET endpoints,
  error shape stub).
- Ensure query layer reads from graph + vectors (similarity search where available).  
  **Acceptance**: Queries return bundles matching schema types; integration over test graph returns
  non-empty contextual slices.  
  **Tests**: Integration tests using seeded graph from Slice 3 + stub embeddings; refer to
  `graph_schema_spec.md` §6 patterns.

## Slice 7 — Workers & Scheduling (Optional v1.0)

**Purpose**: Background job orchestration for indexing requests.  
**Scope**:

- Implement BullMQ job definitions (`indexSnapshotJob`) per `layout_spec.md` §2.5 and
  `configuration_and_server_setup.md` §7; host handlers in a `templates/nx/node-lib` library, and if
  a worker app is created, scaffold with the Nx Node app generator (no custom template in repo).
- Wire worker app (`apps/indexer-worker`) to call ingest pipeline.  
  **Acceptance**: Job enqueues and runs indexing end-to-end using earlier slices; respects `force`
  flag.  
  **Tests**: Integration with mocked queue; smoke test only (optional to ship in v1.0).

## Slice 8 — Hardening & Edge Cases

**Purpose**: Cover documented edge cases and finalize testing.  
**Scope**:

- Circular imports handling (`test_repository_spec.md` Edge Case 1).
- Rename = delete+add behavior (`ingest_spec.md` §2.5; test repo Edge Case 2).
- Async methods, union types, nested object functions, Zod schema extraction, Prisma models,
  re-exports (`test_repository_spec.md` Edge Cases 3–9).
- Security deny/allow patterns for LLM input (`ingest_spec.md` §6.5; `configuration_spec.md` §4).  
  **Acceptance**: All validation checklist items in `test_repository_spec.md` pass.  
  **Tests**: Expand golden + integration coverage to include all Edge Cases & Validation Checklist;
  align descriptions with `testing_strategy_spec.md` §2–4.

---

## Cross-Cutting Practices

- **Spec-first & citations**: Keep code comments and tests referencing governing spec sections (use
  § numbers where provided, e.g., `ingest_spec.md §6.3`).
- **Incremental validation**: After each slice, run `pnpm post:report:fast` per repo workflow; full
  `post:report` before close.
- **Config precedence**: Honor hierarchy Server → Repo → Runtime
  (`configuration_and_server_setup.md` §8).
- **LLM usage bounds**: Only in feature/test/boundary mapping (`ingest_spec.md` §2.3) and doc
  linking fallback; guard with denyPatterns.
- **Data integrity**: Enforce `IN_SNAPSHOT` invariant and uniqueness constraints before merging
  writes (`graph_schema_spec.md` §4.1B).

---

## Open Decisions to Fill

- Finalize TypeScript indexer heuristics (decorators, advanced syntax) — populate
  `language_indexers_spec.md`.
- Choose embedding model/dimensions and Qdrant distance metric — fill `vector_store_spec.md` &
  config defaults.
- Define prompt templates and output schemas — complete `llm_prompts_spec.md`; wire to ingestion
  only after placeholder replaced.
- API error contract and auth — finish `api_gateway_spec.md` before exposing beyond internal use.
