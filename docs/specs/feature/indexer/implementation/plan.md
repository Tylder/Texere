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
  `testing_strategy_spec.md` & `testing_specification.md`. **Docs to consult**:
  [`layout_spec.md`](../layout_spec.md) §2; [`ingest_spec.md`](../ingest_spec.md) §3–4;
  [`configuration_spec.md`](../configuration_spec.md) §1–2;
  [`configuration_and_server_setup.md`](../configuration_and_server_setup.md) §2–3;
  [`graph_schema_spec.md`](../graph_schema_spec.md) §6;
  [`templates/nx/README.md`](../../../../templates/nx/README.md);
  [`typescript_configuration.md`](../../engineering/typescript_configuration.md);
  [`eslint_code_quality.md`](../../engineering/eslint_code_quality.md);
  [`prettier_formatting.md`](../../engineering/prettier_formatting.md);
  [`prompt_template.md`](../../meta/prompt_template.md).  
  **Code areas**: scaffold libs under `packages/features/indexer/{types,core,ingest,query,workers}`
  via `templates/nx/node-lib`; set tags in `project.json` and `nx.json` (`domain:indexer`,
  `layer:*`).

## Slice 1 — Git Snapshot Resolution, Diff Plumbing & Full CLI Implementation

**Purpose**: Resolve tracked branches, compute changed files, and expose a programmatic + CLI
interface (run-once, daemon, status, discovery) via commander-based `apps/indexer-cli`.  
**Scope**:

- Implement config resolution: `INDEXER_CONFIG_PATH` + per-repo `.indexer-config.json` (optional)
  precedence (`configuration_and_server_setup.md` §3–9; `configuration_spec.md` §1–4).
- Implement branch resolution + snapshot selection (`ingest_spec.md` §6.1, §6.2). Treat renames as
  delete+add (`ingest_spec.md` §2.5, §6.2).
- Produce `ChangedFileSet` (added/modified/deleted/renamed) for downstream indexers.
- **Programmatic API**: export `runSnapshot` / `runTrackedBranches` from
  `@repo/features/indexer/ingest` with dependency injection hooks (`RunDeps`) for git, graph,
  vectors, embeddings, logger, clock, lock provider.
- **Full CLI app**: `apps/indexer-cli` (Node/ESM, commander) with bin `indexer`. Per
  **`cli_spec.md`** (authoritative). Commands:
  - `validate [--config <path>]`: Validate config files without running
  - `list [--log-format json|text] [--verbose]`: Discover codebases, tracked branches, index status
  - `status [--log-format json|text]`: Check daemon status and prerequisites
  - `run [OPTIONS]`: Execute indexing (modes: `--once` default, `--daemon`, `--detached`)
    - Options: `--dry-run`, `--force`, `--no-fetch`, `--log-format json|text`, `--verbose`,
      `--quiet`, `--config <path>`
  - `stop [--force] [--timeout <seconds>]`: Gracefully shutdown daemon

  All behavior per [`cli_spec.md`](./cli_spec.md). Exit codes: 0 success; 1 config/validation; 2
  git/IO; 3 DB; 4 external/LLM. Legacy `scripts/indexer-run-once.ts` removed.

- **Daemon lifecycle**: Lock file at `~/.texere-indexer/daemon.lock` (XDG fallback). Auto-recovery
  for stale locks. Reject duplicate daemons. Graceful shutdown with configurable timeout (default:
  30s).
- **Dry-run** mode: outputs JSON plan without writing graph/vectors (snapshot-tested).
- **Default behavior**: Fetch from remotes before indexing; `--no-fetch` to skip.
- Git fetch/clone: default `fetch=true`; if repo path missing, clone into configured `cloneBasePath`
  from config (see `configuration_spec.md`).
- Optional VS Code launch config ("Debug indexSnapshot").

**Acceptance**: All CLI commands work per [`cli_spec.md`](./cli_spec.md); validation catches config
errors; daemon lifecycle functions correctly (start/stop/status); all typical workflows succeed
(Workflows 1–4 in spec).

**Tests**: Unit tests over synthetic git fixture (branch precedence, rename handling per
`test_repository_spec.md`). CLI contract tests for: all commands, modes, flags, exit codes, JSON
output schemas, daemon lock handling, stale lock recovery, signal handling. Reference
[`cli_spec.md`](./cli_spec.md) implementation checklist sections (validate, list, status, run,
stop).

**Docs to consult**: **[`cli_spec.md`](./cli_spec.md)** (authoritative);
[`configuration_and_server_setup.md`](../configuration_and_server_setup.md) §2–9;
[`configuration_spec.md`](../configuration_spec.md) §1–4; [`ingest_spec.md`](../ingest_spec.md)
§6.1–6.2; [`symbol_id_stability_spec.md`](../symbol_id_stability_spec.md);
[`test_repository_spec.md`](../test_repository_spec.md) (Incremental Validation Table);
[`testing_strategy.md`](../../engineering/testing_strategy.md),
[`testing_specification.md`](../../engineering/testing_specification.md).

**Code areas**:

- Git & snapshot:
  `packages/features/indexer/ingest/src/git/{git-diff.ts,git-files.ts,index-snapshot.ts}`
- Config loading: `packages/features/indexer/core/src/config/indexer-config.ts`
- Daemon lock utilities: `packages/features/indexer/core/src/daemon/lock.ts` (new)
- CLI commands: `apps/indexer-cli/src/{commands,daemon,lock,validate}/*` (modular per command)

## Slice 2A1 — TS/JS Symbol Extraction (SCIP + AST)

**Purpose**: Emit symbols only (no edges) with stable IDs and kind classification.  
**Scope**:

- Run SCIP + AST fallback per `ts_ingest_spec` §3.1–§3.8 for symbol defs; apply ID rules (§2, §5.1).
- Vendor `scip.proto` and **generate TS bindings** into `packages/indexer/ingest-ts/src/scip/`
  (committed artifacts). Parse `index.scip` using these bindings (no dependency on `scip-typescript`
  internals). Honor SCIP parsing requirements (`ts_ingest_spec` §3.1.1) including metadata-first
  ordering, range decoding, and encoding conversion.
- Use `scip snapshot` and `protoc --decode=scip.Index scip.proto` for diagnostics only (no
  production fallback); document expected workflows in the spec.
- Enforce path filters/denylist; deterministic ordering.
- Create new Nx package `@repo/indexer-ingest-ts` with complete symbol extraction engine.

**Acceptance**: On `/home/anon/TexereIndexerRestRepo` branch `main`, symbol list matches golden; no
duplicates; IN_SNAPSHOT present for all symbols. All 287 symbols from test_repository_spec.md
extracted.

**Tests/Gates**:

- Unit: 12–15 tests covering symbol kinds, ID generation, docstrings, export detection,
  deduplication, path filtering (60–75% coverage).
- Integration: Full pipeline on `main` branch golden snapshot (symbols only) must match exactly.

**Docs to consult**: [`2a1-ts-symbol-extraction.md`](./2a1-ts-symbol-extraction.md) (comprehensive
implementation plan); `ts_ingest_spec` §2–§3, §5.1; `ingest_spec` §3; `symbol_id_stability_spec`;
`test_repository_spec` §3; `testing_strategy.md` §2.2–4.

**Code areas**:

- New package: `packages/indexer/ingest-ts/{src,__tests__,project.json,package.json,README.md}`
- Implementation: `symbol-extractor.ts`, `scip-runner.ts`, `ast-fallback.ts`, `symbol-kinds.ts`
- Integration: `packages/indexer/ingest/src/index.ts` (re-export TS indexer API)

## Slice 2A2 — TS/JS References (CALL/IMPORT/TYPE_REF) with Merge/Dedupe

**Purpose**: Add references on top of symbols with SCIP-first + AST gap fill.  
**Scope**:

- Implement CALL/IMPORT/TYPE_REF extraction per `ts_ingest_spec` §3.1–§3.8; apply merge/dedupe rules
  (§3.6), confidence tagging, ordering.
- Handle SCIP gaps (decorator_shorthand, dynamic_import_unit, jsx_namespace_unit) with diagnostics.

**Acceptance**: On branch `main`, references match golden; zero orphan edges; diagnostics recorded
for gap fixtures.  
**Tests/Gates**:

- Unit: `single_call.ts`, `single_import.ts`, `single_typeref.ts`, `decorator_shorthand.ts`,
  `dynamic_import_unit.ts`, `jsx_namespace_unit.ts`.
- Integration (gate): `main` branch golden for symbols+references must match; fail build if drift.
  **Docs**: [`languages/ts_ingest_spec.md`](../languages/ts_ingest_spec.md) §3.2–§3.8, §5.1;
  [`edges/REFERENCES.md`](../edges/REFERENCES.md);
  [`test_repository_spec.md`](../test_repository_spec.md) baseline. **Code areas**:
  `ingest/src/extractors/references.ts`; merge logic in `ts-indexer.ts`.

## Slice 2B1 — TS/JS Boundaries

**Purpose**: Add Boundary detection + related edges on top of symbols/references.  
**Scope**:

- Framework heuristics per `ts_ingest_spec` §4.4 & §4.14 (Express, Next, tRPC, Nest, WebSocket,
  CLI).
- Emit Boundary nodes, LOCATION (IN_FILE/IN_MODULE), HANDLED_BY to handler Symbol.
- Respect denylist/allowlist; diagnostics for ambiguous/LLM fallback (if used).

**Acceptance**: On `/home/anon/TexereIndexerRestRepo` branch `snapshot-2`, boundary counts and
verb/path/handler match goldens; zero orphan Boundaries.  
**Tests/Gates**:

- Unit: `express_boundary.ts`, `next_api_route.ts`, `trpc_boundary.ts`, `nest_boundary.ts`.
- Integration (gate): `snapshot-2` boundary golden must pass before proceeding to 2B2.  
  **Docs**: [`languages/ts_ingest_spec.md`](../languages/ts_ingest_spec.md) §4.4, §4.14, §7.1–§7.3;
  [`nodes/Boundary.md`](../nodes/Boundary.md); [`edges/LOCATION.md`](../edges/LOCATION.md). **Code
  areas**: `ingest/src/extractors/boundaries.ts`.

## Slice 2B2 — TS/JS Test Cases

**Purpose**: Detect TestCase nodes and REALIZES {TESTS} edges.  
**Scope**:

- Implement test DSL detection per `ts_ingest_spec` §4.6; nested name assembly; skip/todo flags.
- REALIZES {role:'TESTS'} to symbols via call graph/name heuristics (§5, §7.2).

**Acceptance**: On branch `snapshot-2` (and later), TestCase nodes + REALIZES edges match goldens;
skip/todo preserved.  
**Tests/Gates**:

- Unit: `jest_unit.test.ts`.
- Integration (gate): `snapshot-2` and `snapshot-4` test goldens must pass.  
  **Docs**: [`languages/ts_ingest_spec.md`](../languages/ts_ingest_spec.md) §4.6, §5, §7.2–§7.3;
  [`edges/REALIZES.md`](../edges/REALIZES.md). **Code areas**: `ingest/src/extractors/tests.ts`.

## Slice 2B3 — TS/JS Data Contracts & V2 Nodes (Message/Secret/Workflow)

**Purpose**: Add DataContract extraction and optional V2 nodes/edges.  
**Scope**:

- DataContract extraction per `ts_ingest_spec` §4.5 (Prisma, Zod, OpenAPI, Drizzle); emit MUTATES
  READ/WRITE edges (§5).
- Optional V2 nodes gated by `enableV2Nodes` per §5.3: Message, Secret, Workflow + EVENT edges.
- Apply fixture→assertion mapping (§7.1–§7.2) and diagnostics contract (§6).

**Acceptance**: On branches `snapshot-3`/`snapshot-4`, data contracts and MUTATES edges match
goldens; V2 nodes appear only when flag enabled.  
**Tests/Gates**:

- Unit: `prisma_model_unit.prisma`, `zod_schema_unit.ts`, `openapi_unit.json`, `drizzle_table.ts`,
  V2 node fixtures.
- Integration (gate): `snapshot-3`/`snapshot-4` goldens with flag off; repeat with flag on for V2
  coverage before advancing to Slice 3.  
  **Docs**: [`languages/ts_ingest_spec.md`](../languages/ts_ingest_spec.md) §4.5, §5.3, §7.1–§7.3;
  [`nodes/DataContract.md`](../nodes/DataContract.md); [`edges/MUTATES.md`](../edges/MUTATES.md);
  [`non_code_assets_ingest_spec.md`](../non_code_assets_ingest_spec.md) for V2 semantics.  
  **Code areas**: `ingest/src/extractors/datacontracts.ts`; `ingest/src/extractors/v2-nodes.ts`.

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
  §6 query patterns. **Docs to consult**: [`graph_schema_spec.md`](../graph_schema_spec.md) §§4–6;
  [`nodes/README.md`](../nodes/README.md); [`edges/README.md`](../edges/README.md);
  [`ingest_spec.md`](../ingest_spec.md) §6.3;
  [`SCHEMA_DOCUMENTATION_SUMMARY.md`](../SCHEMA_DOCUMENTATION_SUMMARY.md);
  [`NODE_EDGE_MAPPING.md`](../research/NODE_EDGE_MAPPING.md).  
  **Code areas**:
  `packages/features/indexer/core/src/graph/{neo4j-client.ts,graph-writes.ts,graph-reads.ts,setup.ts}`;
  transaction helpers in `packages/features/indexer/core/src/index.ts`; config in `core/src/config`.

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
  default per `documentation_indexing_spec.md` Confidence table. **Docs to consult**:
  [`documentation_indexing_spec.md`](../documentation_indexing_spec.md) §§2–5;
  [`nodes/SpecDoc.md`](../nodes/SpecDoc.md); [`edges/DOCUMENTS.md`](../edges/DOCUMENTS.md);
  [`test_repository_spec.md`](../test_repository_spec.md) (Doc coverage);
  [`graph_schema_spec.md`](../graph_schema_spec.md) §6.1–6.3.  
  **Code areas**: `packages/features/indexer/ingest/src/docs/*` (acquisition + linking); reuse
  `core` writers; add doc goldens under `packages/features/indexer/ingest/__tests__/fixtures/docs`.

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
  Qdrant unavailable (document in test). **Docs to consult**:
  [`vector_store_spec.md`](../vector_store_spec.md);
  [`configuration_spec.md`](../configuration_spec.md) (embedding defaults);
  [`ingest_spec.md`](../ingest_spec.md) §6.4; [`graph_schema_spec.md`](../graph_schema_spec.md)
  (embeddingId fields).  
  **Code areas**:
  `packages/features/indexer/core/src/vector/{qdrant-client.ts,symbol-embeddings.ts,provider.ts}`;
  config wiring in `core/src/config/indexer-config.ts`; optional stub provider in tests under
  `core/__tests__/`.

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
  `graph_schema_spec.md` §6 patterns. **Docs to consult**:
  [`graph_schema_spec.md`](../graph_schema_spec.md) §6;
  [`api_gateway_spec.md`](../api_gateway_spec.md); [`layout_spec.md`](../layout_spec.md) §2.4;
  [`README.md`](../README.md) (query API summary);
  [`SCHEMA_DOCUMENTATION_SUMMARY.md`](../SCHEMA_DOCUMENTATION_SUMMARY.md).  
  **Code areas**:
  `packages/features/indexer/query/src/{get-feature-context.ts,get-boundary-pattern-examples.ts,get-incident-slice.ts}`;
  optional HTTP handlers in `apps/indexer-admin` (Node app) or similar; response types in
  `packages/features/indexer/types`.

## Slice 7 — Server, Queues & Scheduling (Post-v1 optional)

**Purpose**: Optional server + queue orchestration for indexing requests (deferred until after v1
non-server path is stable).  
**Scope**:

- Implement BullMQ job definitions (`indexSnapshotJob`) per `layout_spec.md` §2.5 and
  `configuration_and_server_setup.md` §7 **only after** run-once/programmatic path is complete.
- If/when server is needed: add `apps/indexer-server` (HTTP) and `apps/indexer-worker` (BullMQ)
  shelling out to the same `runSnapshot` API.  
  **Acceptance**: Job enqueues and runs indexing end-to-end using earlier slices; respects `force`
  flag.  
  **Tests**: Integration with mocked queue; smoke test only (optional to ship in v1.0). **Docs to
  consult**: [`layout_spec.md`](../layout_spec.md) §2.5;
  [`configuration_and_server_setup.md`](../configuration_and_server_setup.md) §7;
  [`ingest_spec.md`](../ingest_spec.md) §6 runtime notes.  
  **Code areas**: Job definitions in
  `packages/features/indexer/workers/src/jobs/index-snapshot.job.ts`; queue wiring in
  `packages/features/indexer/workers/src/index.ts`; optional worker bootstrap in
  `apps/indexer-worker/src/main.ts`; optional server in `apps/indexer-server`.

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
  align descriptions with `testing_strategy_spec.md` §2–4. **Docs to consult**:
  [`test_repository_spec.md`](../test_repository_spec.md) (Edge Cases & Validation Checklist);
  [`ingest_spec.md`](../ingest_spec.md) §6.5; [`graph_schema_spec.md`](../graph_schema_spec.md)
  §4.1B; [`documentation_indexing_spec.md`](../documentation_indexing_spec.md);
  [`testing_strategy_spec.md`](../../engineering/testing_strategy.md);
  [`testing_specification.md`](../../engineering/testing_specification.md).  
  **Code areas**: Harden extraction in `packages/features/indexer/ingest/src` (languages,
  extractors), persistence guards in `core/src/graph-writes.ts`; expand goldens in
  `packages/features/indexer/ingest/__tests__/` and integration suites in
  `packages/features/indexer/query/__tests__/`.

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
- **Engineering baselines**: Follow repo-wide standards in
  [`typescript_configuration.md`](../../engineering/typescript_configuration.md),
  [`eslint_code_quality.md`](../../engineering/eslint_code_quality.md),
  [`prettier_formatting.md`](../../engineering/prettier_formatting.md), and testing specs
  [`testing_strategy.md`](../../engineering/testing_strategy.md),
  [`testing_specification.md`](../../engineering/testing_specification.md).
- **Boundary & ownership matrix**: Tag every project with `domain:indexer` +
  `layer:<types|core|ingest|query|workers|app>` and enforce via Nx module-boundary rules; keep a
  small matrix (lib → allowed deps) in each new lib README and in this plan. CI should block
  boundary violations.
- **Risk & dependency register**: For each slice track a short table (Risk, Mitigation, Hard/Soft
  dependency), covering DB availability, embedding quotas, config discovery, and queue backpressure;
  review before starting.
- **Testing layer targets**: Per slice, state required test types (unit/integration/golden) and
  expected coverage bands per [`testing_strategy.md`](../../engineering/testing_strategy.md); ensure
  CI runs lint, typecheck, tests, and module-boundary checks before merge.
- **Documentation chores**: Each new or modified lib/app must ship a brief README or ADR snippet
  with purpose, tags, allowed dependencies, how to run tests, and links to governing specs and this
  plan.

---

## Open Decisions to Fill

- Finalize TypeScript indexer heuristics (decorators, advanced syntax) — populate
  `language_indexers_spec.md`.
- Choose embedding model/dimensions and Qdrant distance metric — fill `vector_store_spec.md` &
  config defaults.
- Define prompt templates and output schemas — complete `llm_prompts_spec.md`; wire to ingestion
  only after placeholder replaced.
- API error contract and auth — finish `api_gateway_spec.md` before exposing beyond internal use.
