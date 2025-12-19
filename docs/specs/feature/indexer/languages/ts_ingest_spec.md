# Texere Indexer – TypeScript/JavaScript Ingest Spec

**Document Version:** 0.7  
**Last Updated:** December 19, 2025  
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
- [9. Implementation Readiness](#9-implementation-readiness)

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

- Run the **`scip-typescript` CLI** to generate a SCIP index (`index.scip`); parse
  occurrences/relationships to build symbols, CALL/TYPE_REF/IMPORT references, and ranges. Use CLI
  invocation (child process) rather than importing internal modules.  
  Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **Generate TS bindings from `scip.proto` and commit them** under
  `packages/indexer/ingest-ts/src/scip/`. Do not depend on `scip-typescript` internal modules. SCIP
  repo guidance allows either importing bindings or generating them from the protobuf schema; we
  choose vendoring + generation for end-to-end control.  
  Docs: [Writing an indexer](https://sourcegraph.com/docs/code-search/code-navigation/writing_an_indexer);
  [SCIP repo](https://github.com/sourcegraph/scip);
  [scip-php binding regen example](https://packagist.org/packages/davidrjenni/scip-php)
- Parse `index.scip` using the generated SCIP protocol bindings; **do not** parse JSON output from
  `scip-typescript print` in the ingest pipeline. `print` is **diagnostics only**.  
  Docs: [SCIP protocol + bindings](https://github.com/sourcegraph/scip)

**Binding generation requirements (normative, specific):**

1. **Pin a schema version**: choose a specific `scip.proto` version (tag or commit hash) and record
   it in a small text file alongside the generated bindings (e.g.,
   `packages/indexer/ingest-ts/src/scip/SCIP_PROTO_VERSION.txt`).
2. **Codegen tool (required)**: use `ts-proto` (protoc plugin) + `@bufbuild/protobuf` runtime. This
   is the **only supported generator** for SCIP bindings in this repo.  
   Rationale: `ts-proto` produces idiomatic TS and uses `@bufbuild/protobuf` for encode/decode
   semantics.  
   Docs: [ts-proto](https://github.com/stephenh/ts-proto)
3. **Generate TypeScript bindings** from `scip.proto` using `protoc` + `ts-proto` and commit the
   output under `packages/indexer/ingest-ts/src/scip/`. Do not generate bindings at runtime.
4. **Runtime decoding must use the generated bindings** to parse the binary `index.scip`
   (`scip.Index` root message). No JSON round-tripping in production code.
5. **When upgrading SCIP**: update `scip.proto` → regenerate bindings → update the pinned version
   file → re-run the relevant tests.

**How to generate (required commands):**

```
# from repo root (one-time deps)
pnpm --filter @repo/indexer-ingest-ts add -D ts-proto @bufbuild/protobuf

# generate bindings (required script)
pnpm --filter @repo/indexer-ingest-ts run scip:generate
```

**When to run generation (required):**

- On initial setup of `@repo/indexer-ingest-ts`.
- Any time `SCIP_PROTO_VERSION.txt` changes (schema bump).
- Any time `scip.proto` changes (even if the version file did not).

**Prerequisite (required):**

- `protoc` **must be installed** on the system running code generation (dev/CI only). Runtime
  indexing does not require `protoc`.

**Required script (source of truth):**

- `packages/indexer/ingest-ts/package.json` → `scip:generate`
  - Runs `protoc` with `ts-proto` to emit bindings into `src/scip/generated/`
  - Adds `// @ts-nocheck` headers to generated files to skip typechecking

**Allowed layout (example):**

```
packages/indexer/ingest-ts/src/scip/
  README.md
  SCIP_PROTO_VERSION.txt
  scip.proto
  scip_pb.ts        # generated bindings (name/tool-dependent)
  index.ts          # re-exports for parser code
```

- **Supported Node versions**: v18 and v20 for `scip-typescript`.  
  Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **JS-only projects**: run with `--infer-tsconfig`.  
  Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **Workspaces**: use `--yarn-workspaces` or `--pnpm-workspaces` when applicable.  
  Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **Progress diagnostics**: use `--progress-bar` when indexing appears stalled (noisy in CI).  
  Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **OOM mitigation**: either pass `--no-global-caches` or increase Node heap via
  `node --max-old-space-size=... "$(which scip-typescript)" index ...`.  
  Docs: [scip-typescript README](https://github.com/sourcegraph/scip-typescript)
- **Debugging/inspection only**: use `scip snapshot` for golden inspection and `protoc` to decode
  `index.scip` when diagnosing parsing errors. These are diagnostics, not fallbacks in the ingest
  pipeline.  
  Docs: [Writing an indexer](https://sourcegraph.com/docs/code-search/code-navigation/writing_an_indexer);
  [Decoding SCIP index file](https://help.sourcegraph.com/hc/en-us/articles/15045932124941-Decoding-SCIP-index-file)

### 3.1.1 SCIP schema and parsing requirements (TS ingest)

- **Binary format**: `index.scip` is protobuf3 binary; root message is `scip.Index`.
- **Streaming requirement**: `Index.metadata` must appear first in the stream; parser must accept
  metadata before any documents.
- **Paths**: `Metadata.project_root` is the absolute repo URI; `Document.relative_path` is relative
  to `project_root` and is the canonical file key.
- **Encodings**: honor `Metadata.text_document_encoding` and `Document.position_encoding` when
  converting ranges into TS ingest `Range` values. Convert SCIP 0-based positions to 1-based
  `{startLine,startCol,endLine,endCol}` in `FileIndexResult`.
- **Ranges**: `Occurrence.range` is an `int32[]` with 3 or 4 elements: `[startLine,startCol,endCol]`
  or `[startLine,startCol,endLine,endCol]`. For 3-element ranges, `endLine = startLine`.
- **Definitions**: treat `SymbolRole.Definition` in `Occurrence.symbol_roles` as the canonical
  definition; occurrences without definition roles are references only.
- **Symbols**: use the SCIP symbol grammar; treat `local` scheme symbols as file-scoped and do not
  emit separate snapshot symbols for external packages unless a local definition exists.
- **External symbols**: parse `Index.external_symbols` to resolve reference targets; do not emit
  `IN_SNAPSHOT` Symbol nodes for external-only symbols (treat them as external dependencies).

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
- Prefer `index.scip` as the output filename (SCIP tooling defaults); use `scip snapshot` for
  deterministic golden tests and debugging.  
  Docs: [Writing an indexer](https://sourcegraph.com/docs/code-search/code-navigation/writing_an_indexer)

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

### 3.9 Config surface (normative defaults)

- `ingest.ts.scipBatchSize`: default 2_000 files per SCIP run.
- `ingest.ts.scipTimeoutMs`: default 120_000.
- `ingest.ts.allowlist`: optional glob array to override denylist for specific paths.
- `ingest.ts.denylist`: optional glob additions; merged with `.gitignore` + enforced defaults.
- `ingest.ts.disableLLM`: boolean, default false; when true, drop LLM fallback entirely.
- `ingest.ts.enableV2Nodes`: boolean, default false; gates Message/Secret/Workflow nodes + EVENT
  edges.
- `ingest.ts.maxParallelAst`: defaults to number of CPU cores.

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

### 5.3 V2 node/edge activation

- `enableV2Nodes=false` (default): do not emit Message/Secret/Workflow nodes or EVENT edges; other
  nodes/edges unchanged.
- `enableV2Nodes=true`: emit V2 nodes; EVENT edges (PUBLISHES/CONSUMES/EMITS/LISTENS_TO) emitted
  when channels are discovered in code or config.

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
- Integration/E2E: run full extraction against `test-typescript-app` per test_repository_spec (§2
  Repository Structure, §3–§4 coverage matrices, §8 validation checklist) and compare to golden
  snapshots.
- Repository location for integration/E2E: `/home/anon/TexereIndexerRestRepo` (mirror of
  `test-typescript-app`), use this path when wiring end-to-end runs.
- Branch coverage (test_repository_spec Git branches):
  - `main` (baseline)
  - `snapshot-1` (base structure)
  - `snapshot-2` (boundary-focused changes)
  - `snapshot-3` (rename simulated as delete+add)
  - `snapshot-4` (modified symbol tracking)
- E2E expectation: index each branch in order, assert snapshotType=`branch`, branch property set,
  IN_SNAPSHOT cardinality holds, incremental diff reflects branch deltas (ingest_spec §6.1).
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

### 7.1 Fixture→assertion mapping (minimum)

| Fixture file         | Spec sections exercised                         | Required assertions                                                      |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| express_route.ts     | Boundary §4.4; REFERENCES CALL §5; PATTERN      | Boundary verb/path detected; CALL edges present; middleware PATTERN refs |
| nest_controller.ts   | SCIP gap §3.2; Boundary §4.4                    | AST fallback fills CALL; Boundary path = controller+method; handler id   |
| dynamic_import.ts    | SCIP gap §3.2; REFERENCES IMPORT/CALL §5        | IMPORT + CALL emitted for literal and template `import()`                |
| jsx_namespace.tsx    | SCIP gap §3.2; REFERENCES CALL §5               | CALL emitted for namespaced component                                    |
| trpc_router.ts       | Boundary §4.4; REALIZES IMPLEMENTS (downstream) | Boundary per procedure key; handler symbol linked                        |
| prisma_schema.prisma | DataContract §4.5; MUTATES §5                   | DataContract nodes + CRUD MUTATES edges                                  |
| drizzle_table.ts     | DataContract §4.5; MUTATES §5                   | Table entity emitted; READ/WRITE edges where client used                 |
| zod_schema.ts        | DataContract §4.5                               | Fields captured with optional flags                                      |
| next_api_route.ts    | Boundary §4.4                                   | Boundary path from file; verb from export name                           |
| jest_tests.test.ts   | TestCase §4.6; REALIZES TESTS §5                | Nested test names; skip/todo flags; REALIZES edges to targets            |
| docs/readme.md       | SpecDoc §4.7; DOCUMENTS handoff                 | SpecDoc stub emitted; no DOCUMENTS edge from TS pass                     |
| config/.env.example  | Configuration §4.8; Secret §4.12                | Config nodes redacted; Secret nodes hashed; DEPENDS_ON config edges      |

### 7.2 Required tests (integration & e2e)

Use `/home/anon/TexereIndexerRestRepo` (branches `main`, `snapshot-1`..`snapshot-4`) as the system
test repo. Each test cites this section.

1. **Baseline snapshot (main)** — Verify full node/edge cardinality vs. golden:
   - All mandatory nodes present; one IN_SNAPSHOT each; no orphan CALL/TYPE_REF/IMPORT.
   - Branch metadata: snapshotType=`branch`, branch=`main`.
2. **Incremental diff (snapshot-1 → snapshot-2)** — Git diff drives reindex:
   - Only changed files reindexed; unchanged symbols retain IDs.
   - New boundaries from snapshot-2 appear with IN_SNAPSHOT; removed ones absent.
3. **Rename simulated as delete+add (snapshot-2 → snapshot-3)** — Per ingest_spec §3.2A:
   - Symbol IDs for renamed file change; TRACKS INTRODUCED for new, none for delete.
   - No orphan CALLs to removed symbols.
4. **Modified symbol tracking (snapshot-3 → snapshot-4)**:
   - TRACKS.MODIFIED present for changed symbols; unchanged symbols lack MODIFIED.
5. **SCIP gap coverage**:
   - `nest_controller.ts`: CALL edges present via AST; diagnostic notes SCIP gap.
   - `dynamic_import.ts`: IMPORT + CALL emitted even if SCIP misses.
6. **Boundary detection across frameworks**:
   - express_route.ts, next_api_route.ts, trpc_router.ts, nest_controller.ts: verb/path captured,
     HANDLED_BY linked, LOCATION edges set.
7. **Data contracts**:
   - prisma_schema.prisma, drizzle_table.ts, zod_schema.ts: entities emitted; fields captured;
     MUTATES READ/WRITE edges created from client usage.
8. **Tests → code**:
   - jest_tests.test.ts: REALIZES {role:'TESTS'} edges to targeted symbols; skip/todo preserved.
9. **Config/Secrets/Dependencies**:
   - .env.example: redacted Config nodes; Secret nodes hashed; DEPENDS_ON {kind:'CONFIG'} edges.
   - package.json + lockfile: Dependency nodes + DEPENDS_ON {kind:'LIBRARY'} edges from imports.
10. **Documentation handoff**:
    - docs/\*.md: SpecDoc stubs emitted; no DOCUMENTS edges from TS pass; LOCATION edges exist.
11. **Denylist enforcement**:
    - Fixture under fixtures/ or .next/: zero nodes/edges; diagnostic records skip reason.
12. **V2 flag behavior**:
    - enableV2Nodes=false: no Message/Secret/Workflow nodes or EVENT edges.
    - enableV2Nodes=true: V2 nodes emitted; EVENT edges created when code+config share channel.
13. **Diagnostics contract**:
    - Force SCIP failure (bad tsconfig); assert per-file diagnostic fields
      `{filePath, tool, severity, message, phase, retryable}` and AST fallback ran.

E2E harness expectations:

- Index branches in order (`main`, `snapshot-1`..`snapshot-4`); assert branch metadata and diff
  behavior match ingest_spec §6.1.
- Goldens stored alongside fixture repo or in `/home/anon/TexereIndexerRestRepo/goldens`.

### 7.3 Unit test expectations (minimal fixture set)

Use one-file micro-fixtures to isolate behaviors; assert sorted outputs and confidence values.

- **Symbols**: `symbol_kinds.ts` with function/class/method/const/type/interface/enum; assert kind +
  range + CONTAINS edges; skip `.d.ts` unless sole def.
- **CALL**: `single_call.ts` with one call; expect exactly one CALL edge `{fromId,toId,line,col}`
  sorted; confidence `scip`.
- **IMPORT**: `single_import.ts` with one import; assert IMPORT edge; no duplicates after dedupe.
- **TYPE_REF**: `single_typeref.ts` (interface reference); expect one TYPE_REF edge.
- **Decorator gap**: `decorator_shorthand.ts` (Nest-like property shorthand); SCIP gap triggers AST
  CALL with `confidence:'ast'`, `note:'scip-gap'`.
- **Dynamic import**: `dynamic_import_unit.ts`; expect IMPORT + CALL even if SCIP misses; confidence
  `ast`.
- **Namespace JSX**: `jsx_namespace_unit.tsx`; expect CALL to component from AST fallback.
- **Boundary microtests**:
  - `express_boundary.ts`: verb/path/handler + HANDLED_BY.
  - `trpc_boundary.ts`: procedure key → boundary.
  - `nest_boundary.ts`: controller + method decorators produce boundary path; handler linked.
- **DataContract microtests**:
  - `prisma_model_unit.prisma`: entity + fields.
  - `zod_schema_unit.ts`: fields + optionality captured.
  - `openapi_unit.json`: components.schemas parsed to DataContract.
- **TestCase microtest**: `jest_unit.test.ts` with nested describe/it + skip/todo; REALIZES {TESTS}
  edges to callee.
- **Denylist**: place fixture under `fixtures/denylisted.ts`; expect zero nodes/edges; diagnostic
  notes skip reason.
- **Diagnostics contract**: `broken_tsconfig` scenario; force SCIP failure; assert diagnostic fields
  `{filePath, tool:'scip', severity, message, phase, retryable}` and AST fallback ran when allowed.
- **Ordering & dedupe**: every unit test asserts outputs sorted by filePath/startLine/startCol and
  no duplicate edges by `{fromId,toId,line,col,type}`.

## 8. Changelog

| Date       | Version | Editor | Summary                                                                                         |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------------------------- |
| 2025-12-19 | 0.7     | @agent | Added SCIP schema parsing requirements and external symbol handling rules.                      |
| 2025-12-19 | 0.6     | @agent | Specify SCIP binding generation path, parsing/debug workflow, and CLI diagnostics.              |
| 2025-12-18 | 0.5     | @agent | Added acceptance checklists, config surface, fixture→assertion map, v2 flag semantics.          |
| 2025-12-18 | 0.4     | @agent | Added extraction matrix, merge rules, guardrails, denylist, validation checklist, fixture list. |
| 2025-12-18 | 0.3     | @agent | Made node/edge rules exhaustive; added ID/confidence rules, SCIP gaps, doc/config interactions. |
| 2025-12-18 | 0.2     | @agent | Covered all nodes/edges, optional nodes, LLM guardrails.                                        |
| 2025-12-18 | 0.1     | @agent | Initial TS/JS ingestion spec (Draft).                                                           |

## 9. Implementation Readiness

- Complete the validation checklist in §5.2 before shipping.
- Wire config defaults from §3.9 into the ingest configuration loader.
- Implement SCIP→AST merge rules (§3.6) and deterministic sort before returning results.
- Honor path denylist/allowlist semantics (§2) and feature flag for V2 nodes/edges (§5.3).
- Build and run the golden fixture set (§7.1); integrate into test_repository_spec once finalized.
