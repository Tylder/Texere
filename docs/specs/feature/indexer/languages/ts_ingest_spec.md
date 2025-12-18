# Texere Indexer – TypeScript/JavaScript Ingest Spec

**Document Version:** 0.4  
**Last Updated:** December 18, 2025  
**Status:** Active (TS/JS ingestion)  
**Backlink:** [High-Level Spec](../../README.md) → [Ingest Spec](../ingest_spec.md) (§1.1,
§2.2–§2.3) → [Language Indexers](../language_indexers_spec.md) →
[Non-Code Assets Ingest](../non_code_assets_ingest_spec.md)

## Quick Navigation

- [1. Scope & Audience](#1-scope--audience)
- [2. Inputs, Outputs & IDs](#2-inputs-outputs--ids)
- [3. Toolchain, Coverage & Gaps](#3-toolchain-coverage--gaps)
- [4. Node Extraction Rules](#4-node-extraction-rules)
- [5. Edge Emission Rules](#5-edge-emission-rules)
- [6. Error Handling & Logging](#6-error-handling--logging)
- [7. Testing Guidance](#7-testing-guidance)
- [8. Changelog](#8-changelog)

## 1. Scope & Audience

Defines the TS/JS language pass for producing `FileIndexResult` while keeping the graph shape
identical to other languages (ingest_spec §1.1; language_indexers_spec §2). Audience: indexer
engineers, reviewers, and agents wiring ingest to higher-level (docs/config) pipelines. Python is
explicitly out of scope per user request.

## 2. Inputs, Outputs & IDs

- **Inputs**: `{ codebaseRoot, snapshotId, filePaths[] }` filtered by
  `['ts','tsx','js','mjs','cjs','mts','cts']` via `canHandleFile` (ingest_spec §4;
  language_indexers_spec §2.5).
- **Outputs**: `FileIndexResult[]` with symbols, calls, references, boundaries, data contracts, test
  cases, SpecDoc stubs, configuration, errors, messages, dependencies, secrets (redacted), workflow
  markers.
- **ID formulas (snapshot-scoped)**:
  - Module: `${snapshotId}:${modulePath}`
  - File: `${snapshotId}:${filePath}`
  - Symbol: `${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}`
  - Boundary: `${snapshotId}:boundary:${kind}:${identifier}`
  - DataContract: `${snapshotId}:datacontract:${entityName}`
  - TestCase: `${snapshotId}:${filePath}:${testName}`
  - SpecDoc/Configuration/Error/Message/Dependency/Secret/Workflow:
    `${snapshotId}:${nodeType}:${stableKey}`
- **Confidence**: `confidence: 'static' | 'scip' | 'ast' | 'heuristic' | 'llm'`; default `scip`.
  LLM-derived items must be labeled `llm` (language_indexers_spec §2.2).
- **Path filters**: base denylist comes from the repo `.gitignore` plus enforced defaults
  `**/node_modules/**`, `**/.next/**`, `**/dist/**`, `**/coverage/**`, `**/__snapshots__/**`,
  `**/fixtures/**`, `**/vendor/**`. Allowlist overrides only via explicit config. LLM is never
  invoked on denylisted paths.

## 3. Toolchain, Coverage & Gaps

### 3.1 Primary pipeline (SCIP-first)

- Run `scip-typescript` CLI to generate SCIP payload; parse occurrences/relationships to build
  symbols, CALL/TYPE_REF/IMPORT references, and ranges. citeturn0search1

### 3.2 Known SCIP gaps (as of Dec 18, 2025)

- Decorator property shorthand and some cross-file decorator definitions are not linked in SCIP
  output (issue #415). citeturn0search4
- Historical versions missed some dynamic `import()` and namespace re-exports; treat absence as a
  potential SCIP gap when AST shows the construct. citeturn0search3
- JSX component call sites may be missing CALL edges when components are namespaced or default
  exported anonymously; validate with fallback.

### 3.3 Fallback path (TypeScript AST + TypeChecker)

Use Program + TypeChecker on the same file set when:

1. SCIP CLI fails or emits zero occurrences for a file.
2. Constructs match known SCIP gaps (3.2).
3. We need framework-specific classification (e.g., Express route handlers) that SCIP does not tag.

Fallback extracts definitions, references, and call graph by:

- Resolving symbols via `getSymbolAtLocation` and `getResolvedSignature`.
- Walking `CallExpression`, `NewExpression`, `Decorator`, `TaggedTemplateExpression`,
  `ImportDeclaration`, `Export*`, `TypeReferenceNode`, `HeritageClause`.
- Building IDs with the same formulas as §2.

### 3.4 LLM usage (last resort)

Only when static signals cannot classify Boundary/DataContract/TestCase intent (e.g., ambiguous
string-built routes). Mark `confidence: 'llm'`, attach raw heuristic evidence, and respect path
denylist (tests/fixtures/vendor). No LLM for symbols/calls/references.

### 3.5 Non-language interactions

- SpecDoc stubs: emit LOCATION edges so the doc ingest pipeline can upsert content later (ties into
  documentation_indexing_spec).
- Configuration stubs: emit CONFIG nodes with redacted values; config ingest can enrich.
- Repo-level metadata (Codebase/Snapshot) is orchestrated upstream; TS pass must not create it.

### 3.6 Merge & ordering rules (SCIP + AST)

1. Prefer SCIP ranges/occurrences; merge AST-derived items only when SCIP is absent for that
   source/target/line/col.
2. Dedupe by `{fromId,toId,line,col,type}`; keep highest-confidence source (`scip` > `ast` >
   `heuristic` > `llm`).
3. When both SCIP and AST exist but disagree on target (e.g., decorator shorthand), keep SCIP target
   and add AST target as secondary with `confidence:'ast'` and `note:'scip-gap'`.
4. Sort emissions deterministically by `filePath`, `startLine`, `startCol` before returning.

### 3.7 Performance guardrails

- Run `scip-typescript` with `--project <tsconfig>`; batch ≤ 2_000 TS-family files per invocation to
  avoid memory spikes. If repo exceeds 2_000 files, split by project references or directory.
- Default CLI timeout 120s per batch; on timeout, fall back to AST for that batch and log
  diagnostic.
- AST fallback runs per-file; cap parallelism to CPU cores to reduce heap pressure.

### 3.8 Extraction matrix (summary)

| Node/Edge                             | Source order                            | Required metadata                | Default confidence | Owner pipeline                  |
| ------------------------------------- | --------------------------------------- | -------------------------------- | ------------------ | ------------------------------- |
| Module/File                           | filesystem → tsconfig                   | path, hash                       | static             | TS ingest                       |
| Symbol                                | SCIP defs → AST defs                    | kind, range                      | scip               | TS ingest                       |
| CALL/TYPE_REF/IMPORT                  | SCIP rels → AST walker                  | fromId, toId, location, type     | scip               | TS ingest                       |
| Boundary                              | SCIP (when present) → AST pattern → LLM | verb, path, handlerId, framework | ast                | TS ingest                       |
| DataContract                          | AST (Prisma/Zod/SDL/OpenAPI) → LLM      | fields when static               | ast                | TS ingest                       |
| TestCase                              | AST test DSL walker                     | name, location, flags            | ast                | TS ingest                       |
| SpecDoc stub                          | filesystem                              | path, title preview              | static             | TS ingest → doc ingest          |
| Config/Dependency/Secret/Msg/Workflow | AST or manifest parse                   | key/version/channel/schedule     | ast/static         | TS ingest → non-code ingest     |
| DOCUMENTS edges                       | —                                       | doc→target, confidence           | —                  | documentation_indexing pipeline |
| REALIZES (TESTS/VERIFIES)             | call graph + names → heuristic          | role, target ids                 | heuristic          | TS ingest                       |
| MUTATES                               | Prisma/ORM/SQL detection                | operation, entity                | ast                | TS ingest                       |

## 4. Node Extraction Rules

For each node type, steps are ordered: SCIP → AST → heuristic → LLM.

### 4.1 Module

- Source: first path segment derived from `tsconfig` project references; if absent, use directory
  root containing the file.
- Emit Module, CONTAINS Snapshot→Module, and IN_SNAPSHOT (cardinality = 1).

### 4.2 File

- One per indexed path; CONTAINS Module→File; IN_SNAPSHOT File→Snapshot.
- Store hash (sha1 of contents) for TRACKS creation upstream.

### 4.3 Symbol

- SCIP definitions → Symbol with kind inferred from syntax node (function, class, method, const,
  type/interface/enum).
- Fill CALL/TYPE_REF/IMPORT from SCIP relationships; if missing and AST finds them, add with
  `confidence:'ast'`.
- Skip generated `.d.ts` unless it is the only definition.

### 4.4 Boundary

- Detect HTTP/gRPC/CLI/event handlers:
  - Express/Fastify/Hono/Koa: `app.METHOD`, `router.METHOD`, `fastify.route`.
  - Next.js/Remix file-based routes: default export `GET/POST/...` or `loader/action`.
  - tRPC: `router({ key: procedure... })`.
  - NestJS: `@Controller` + `@Get/@Post/...`.
  - WebSocket: `ws.on('message'|'connection')`.
  - CLI: commander/yargs `command`, `action`.
- Handler Symbol is callee; emit Boundary with verb/path/kind metadata.
- If route is string-built and AST cannot resolve, fall back to LLM classification (3.4).

### 4.5 DataContract

- Prisma schema: `model` blocks → entity + fields; mark CRUD operations via client calls.
- Zod schemas: `z.object({...})` assigned to const/export; capture field keys + optionality.
- GraphQL SDL: `type`, `input`, `enum`; derive name and fields.
- OpenAPI JSON/YAML: `components.schemas` entries.
- Drizzle/TypeORM/Sequelize models: class decorators or `pgTable`, `sequelize.define`.
- If shape cannot be parsed, emit stub with `confidence:'heuristic'` or `llm`.

### 4.6 TestCase

- Jest/Vitest: `describe`/`it`/`test`; Mocha compatible; Deno.test; Playwright `test`.
- Name = joined string/title args; nested blocks concatenate with `/`.
- Mark skip/todo flags for downstream quality metrics.

### 4.7 SpecDoc

- Files `*.md|*.mdx` co-located with source; emit SpecDoc stub + LOCATION to File & Module.
- No content ingest here; doc pipeline owns DOCUMENTS edges (non_code_assets_ingest_spec.md §4.1;
  documentation_indexing_spec.md).

### 4.8 Configuration (v2 optional but supported)

- `.env.example`, `*.env.sample`, `config/*.ts`, `next.config.*`, `vite.config.*`, `jest.config.*`.
- Parse keys; redact values; store source path and format.
- Cross-language normalization rules live in non_code_assets_ingest_spec.md §4.2.

### 4.9 Error (v2 optional)

- Classes extending `Error` or using `createError` helpers; emit Error nodes and LOCATION.

### 4.10 Message (v2 optional)

- Kafka/NATS/RabbitMQ/SNS/SQS clients; topic/subject/queue literal captured as `channel`.
- WebSocket `emit/on` string literals.
- Config-sourced channels are covered in non_code_assets_ingest_spec.md §4.5.

### 4.11 Dependency (v2 optional)

- From package.json + lockfile: name, version; LOCATION to root package file.
- Shared manifest rules: non_code_assets_ingest_spec.md §4.3.

### 4.12 Secret (v2 optional)

- Heuristic regex on identifier/key names (`token`, `secret`, `apiKey`); value replaced with hash;
  skip if value is obviously placeholder.
- Secret redaction rules shared with non_code_assets_ingest_spec.md §4.4.

### 4.13 Workflow (v2 optional)

- Temporal/Conductor/AWS Step Functions wrappers or cron schedulers; name/cron if literal.
- Config-defined workflows: non_code_assets_ingest_spec.md §4.6.

### 4.14 Framework pattern hints (normative examples)

- **Express/Fastify/Hono/Koa**: match `app|router.METHOD(path, handler)`; handler is last arg or
  returned from `compose`. Capture middleware chain as PATTERN references.
- **Next.js/Remix API routes**: file-based default export `GET/POST/...` or `loader/action`
  functions; boundary path from file location.
- **tRPC**: `router({ key: procedure`…`})`; boundary path = router key; handler = procedure
  resolver.
- **NestJS**: `@Controller('path')` + `@Get/@Post/...`; boundary path = controller path + method
  path; handler symbol = method.
- **WebSocket**: `ws.on('message'|'connection', handler)`; boundary kind = `websocket`.
- **CLI (commander/yargs)**: `program.command().action(handler)`; boundary verb = `CLI`, path =
  command string.

## 5. Edge Emission Rules

- **CONTAINS**: Snapshot→Module→File→Symbol; File→{Boundary,DataContract,TestCase,SpecDoc,
  Configuration, Error, Message, Dependency, Secret, Workflow}.
- **IN_SNAPSHOT**: exactly one per snapshot-scoped node emitted by this pass (ingest_spec §6.3).
- **LOCATION**:
  - Boundary/TestCase/... → File (role:`IN_FILE`) and Module (role:`IN_MODULE`).
  - Boundary → handler Symbol (role:`HANDLED_BY`).
- **REFERENCES**:
  - CALL: from SCIP relationships; AST fallback for decorators, JSX components, dynamic imports
    (coverage gap §3.2). citeturn0search2
  - TYPE_REF: TypeReference, HeritageClause, implements/extends.
  - IMPORT: ES imports, requires, re-exports, dynamic `import()` when literal string.
  - PATTERN: pattern tags (e.g., Express middleware) detected heuristically.
  - SIMILAR: placeholder for embedding similarity (no emission here).
- **REALIZES**:
  - TESTS: TestCase→Symbol when call graph shows invocation or name includes symbol.
  - VERIFIES: TestCase→Feature when feature tag appears in title (`[feature:foo]`).
  - IMPLEMENTS: Boundary/Symbol→Feature populated downstream using TS outputs.
- **MUTATES**: Symbol/Boundary → DataContract when CRUD or SQL tagged template detected.
- **DEPENDS_ON**: Symbol/Module/Boundary → Dependency (npm), ExternalService (URL host literals),
  Configuration (config keys).
- **DOCUMENTS**: SpecDoc → Module/File/Symbol placeholder; doc ingest resolves targets.
- **TRACKS**: Upstream process uses file/symbol hashes to add INTRODUCED/MODIFIED.
- **EVENT (v2)**: Message producers/consumers create PUBLISHES/CONSUMES/EMITS/LISTENS_TO variants
  mapped onto REFERENCED edges when event graph is enabled.

### 5.1 Symbol ID stability (TS specifics)

- Overloads: append signature index (`symbolName#<overloadIndex>`) to ID.
- Merged declarations (namespace + function/class): prefer value-space declaration for Symbol ID;
  add TYPE_REF edges to type-space declaration if present.
- Re-exports: Symbol ID stays at original defining file; create IMPORT reference from re-export
  site.

### 5.2 Validation checklist (per FileIndexResult)

- One IN_SNAPSHOT per emitted node.
- Every File has a Module parent; every Symbol has a File parent.
- No CALL edge targets an unknown Symbol ID.
- Boundary handler Symbol exists.
- Denylisted paths emit zero nodes/edges.
- If SCIP failed, AST fallback was attempted and diagnostic recorded.

## 6. Error Handling & Logging

- File-level SCIP or AST failure → log, skip file, continue (ingest_spec §6.4).
- SCIP CLI failure → rerun AST path; if both fail, mark snapshot `index_failed`.
- Validate one IN_SNAPSHOT per emitted node before returning; fail-fast if violated.
- Attach diagnostics per file (`errors[]`) with tool (`scip`|`ts-ast`|`heuristic`) and message.

## 7. Testing Guidance

- Unit: symbol classification matrix, CALL/IMPORT/TYPE_REF coverage, decorator + dynamic import gap
  tests (cite §3.2, §5).
- Integration: golden `FileIndexResult` fixtures for routes, tRPC/NestJS, Prisma/Zod, Jest/Vitest,
  Next.js API routes, and doc/config stubs.
- Each test description cites this spec section (meta/spec_writing §9; testing_specification §3.6).
- Suggested golden fixture set:
  - `express_route.ts`: Express router with middleware + error handler.
  - `nest_controller.ts`: Decorators with property shorthand (`imports`) to exercise SCIP gap.
    citeturn0search4
  - `dynamic_import.ts`: literal and template `import()` for CALL/IMPORT fallback.
    citeturn0search3
  - `jsx_namespace.tsx`: namespaced JSX component usage.
  - `trpc_router.ts`: router with nested procedures.
  - `prisma_schema.prisma` + `drizzle_table.ts`: DataContract + MUTATES coverage.
  - `zod_schema.ts`: Zod object schema with refinements.
  - `next_api_route.ts`: file-based HTTP verbs.
  - `jest_tests.test.ts`: nested describe/it with skip/todo flags.
  - `docs/readme.md`: SpecDoc stub + DOCUMENTS handoff.
  - `config/.env.example`: Configuration + Secret redaction.

## 8. Changelog

| Date       | Version | Editor | Summary                                                                                         |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------------------------- |
| 2025-12-18 | 0.4     | @agent | Added extraction matrix, merge rules, guardrails, denylist, validation checklist, fixture list. |
| 2025-12-18 | 0.3     | @agent | Made node/edge rules exhaustive; added ID/confidence rules, SCIP gaps, doc/config interactions. |
| 2025-12-18 | 0.2     | @agent | Covered all nodes/edges, optional nodes, LLM guardrails.                                        |
| 2025-12-18 | 0.1     | @agent | Initial TS/JS ingestion spec (Draft).                                                           |
