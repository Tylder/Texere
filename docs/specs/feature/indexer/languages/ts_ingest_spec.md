# Texere Indexer – TypeScript/JavaScript Ingest Spec

**Document Version:** 0.1  
**Last Updated:** December 18, 2025  
**Status:** Draft  
**Backlink:** [Ingest Spec](../ingest_spec.md) (§1.1, §2.2–§2.3),
[Language Indexers](../language_indexers_spec.md)

## Quick Navigation

- [1. Scope & Audience](#1-scope--audience)
- [2. Inputs & Outputs](#2-inputs--outputs)
- [3. Toolchain & Fallbacks](#3-toolchain--fallbacks)
- [4. Node Ingestion Map](#4-node-ingestion-map)
- [5. Edge Emission Rules](#5-edge-emission-rules)
- [6. Error Handling](#6-error-handling)
- [7. Testing Guidance](#7-testing-guidance)
- [8. Changelog](#8-changelog)

## 1. Scope & Audience

Defines how the TS/JS indexer produces `FileIndexResult` for the Texere Knowledge Graph while
keeping graph shape identical to other languages (ingest_spec §1.1). Audience: indexer engineers and
reviewers.

## 2. Inputs & Outputs

- **Input**: `{ codebaseRoot, snapshotId, filePaths[] }` filtered to `['ts','tsx','js','mjs','cjs']`
  via `canHandleFile` (ingest_spec §4).
- **Output**: `FileIndexResult[]` containing symbols, calls, references, boundaries, data contracts,
  and test cases (ingest_spec §3).

## 3. Toolchain & Fallbacks

1. **Primary (SCIP-first)**: run `scip-typescript` CLI to produce SCIP payloads; parse occurrences
   to drive symbol IDs, references, and calls. citeturn0search1
2. **Fallback**: TypeScript Compiler API (Program + TypeChecker) when SCIP is unavailable or errors.
3. **Test/boundary heuristics** reuse AST from whichever path ran (SCIP or TS AST).
4. **LLM usage**: only when static signals cannot classify a boundary kind (e.g., custom RPC
   wrappers); mark emitted edge with `confidence: 'llm'`.

## 4. Node Ingestion Map (full catalog)

| Node (catalog)                                              | Extraction (SCIP-first)                                                                                                                                              | Fallback / Notes                                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Codebase                                                    | Provided by orchestrator before language pass; linked by `snapshotId`.                                                                                               | —                                                                             |
| Snapshot                                                    | Provided by orchestrator; language pass attaches `IN_SNAPSHOT` edges only.                                                                                           | —                                                                             |
| Module                                                      | Derived from TS project refs and path roots; SCIP occurrences grouped by `packageId`; `CONTAINS` to Snapshot.                                                        | TS AST + `tsconfig` resolution.                                               |
| File                                                        | Each indexed path; `IN_SNAPSHOT` to Snapshot and `CONTAINS` to Module.                                                                                               | Same.                                                                         |
| Symbol                                                      | SCIP `definition` occurrences → symbol; kind via syntax (function/class/method/var/type).                                                                            | TS AST + TypeChecker to classify declarations.                                |
| Boundary                                                    | HTTP/CLI/Event handlers: Express `app.METHOD`, Fastify `fastify.METHOD`, Next.js route exports, tRPC routers, CLI yargs/commander. Handler symbol = callee function. | AST pattern matches; LLM only if decorator/handler type ambiguous.            |
| DataContract                                                | Prisma schema files, Zod schemas, GraphQL SDL, OpenAPI YAML/JSON; symbol IDs from declaration names.                                                                 | AST parse via zod factory calls; doc-only emit allowed when schema lacks AST. |
| TestCase                                                    | `describe/it/test` blocks (jest/vitest), `Deno.test`; name from first string arg; parent file path.                                                                  | Same.                                                                         |
| SpecDoc                                                     | Markdown handled by documentation indexer (not emitted here).                                                                                                        | —                                                                             |
| Configuration                                               | `.env.example`, `config/*.ts`, `app.config.*`; detected by config indexer (not emitted here).                                                                        | —                                                                             |
| Error                                                       | Custom error classes extending `Error`; detected via AST; marked optional (v2+) unless config enables.                                                               | AST path only; no LLM.                                                        |
| Message                                                     | Event payloads (Kafka/NATS) from producer/consumer factory calls; detected via known client APIs.                                                                    | AST only; LLM not used.                                                       |
| Dependency                                                  | package.json dependencies resolved centrally; language pass emits `DEPENDS_ON` edges only.                                                                           | —                                                                             |
| Secret                                                      | Not emitted by language pass; security scanner handles.                                                                                                              | —                                                                             |
| Workflow                                                    | Not emitted in v1; future Temporal/Airflow parsers.                                                                                                                  | —                                                                             |
| Feature / Pattern / Incident / ExternalService / StyleGuide | Not emitted by language pass; produced by higher-level extractors or other pipelines (ingest_spec §2.3).                                                             | —                                                                             |

## 5. Edge Emission Rules

- **CONTAINS**: Snapshot→Module→File→Symbol hierarchy; also Module/File →
  Boundary/DataContract/TestCase when defined inside.
- **IN_SNAPSHOT**: exactly one per Module/File/Symbol/Boundary/DataContract/TestCase (ingest_spec
  §6.3).
- **LOCATION**: Boundary/TestCase → File + Module; Boundary → handler Symbol (`role:'HANDLED_BY'`).
- **REFERENCES**: `CALL`, `IMPORT`, `TYPE_REF`, `PATTERN`, `SIMILAR` (embedding similarity populated
  later); SCIP-derived when present, AST fallback otherwise.
- **REALIZES**:
  - `role:'IMPLEMENTS'`: Symbol ↔ Feature (higher-level extractor adds).
  - `role:'TESTS'`: TestCase → Symbol under test when call graph shows invocation.
  - `role:'VERIFIES'`: TestCase → Feature when labeled in test title or mapping extractor.
- **MUTATES**: Symbol/Boundary → DataContract when Prisma/Zod schema referenced or DB client CRUD
  detected.
- **DEPENDS_ON**: Symbol/Module/Boundary → external packages (package.json), HTTP clients
  (axios/fetch), configs.
- **DOCUMENTS**: SpecDoc/StyleGuide → Symbol/Module/Feature via doc indexer (not emitted here).
- **TRACKS**: Snapshot introduction/modification added centrally (not emitted here).
- **IMPACTS**: Incident relationships added by incident pipeline (not emitted here).
- **EVENT RELATIONSHIPS** (v2+): Message edges added only if Message nodes emitted; TS pass records
  producer/consumer sites to enable later edge creation.

## 6. Error Handling

- File-level parse/SCIP failures → skip file, log, continue (ingest_spec §6.4).
- SCIP run failure → fall back to TS AST path; if both fail mark snapshot `index_failed`.
- Cardinality validation: ensure one `IN_SNAPSHOT` per snapshot-scoped node before returning
  (ingest_spec §6.3).

## 7. Testing Guidance

- Unit tests: symbol classification matrix, CALL/IMPORT/TYPE_REF extraction, boundary heuristics per
  framework.
- Integration: golden `FileIndexResult` for representative files (routes, tests, schemas).
- Tests cite sections: e.g., `ts_ingest_spec §5` for edge expectations.

## 8. Changelog

| Date       | Version | Editor | Summary                               |
| ---------- | ------- | ------ | ------------------------------------- |
| 2025-12-18 | 0.1     | @agent | Initial TS/JS ingestion spec (Draft). |
