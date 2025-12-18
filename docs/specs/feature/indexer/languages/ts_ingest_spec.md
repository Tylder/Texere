# Texere Indexer – TypeScript/JavaScript Ingest Spec

**Document Version:** 0.2  
**Last Updated:** December 18, 2025  
**Status:** Active (TS/JS ingestion)  
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

- **Input**: `{ codebaseRoot, snapshotId, filePaths[] }` filtered to
  `['ts','tsx','js','mjs','cjs','mts','cts']` via `canHandleFile` (ingest_spec §4; clarification
  7a).
- **Output**: `FileIndexResult[]` containing symbols, calls, references, boundaries, data contracts,
  test cases, configuration, errors, messages, dependencies, secrets (redacted), and workflow
  markers when present (clarification 2a).

## 3. Toolchain & Fallbacks

1. **Primary (SCIP-first)**: run `scip-typescript` CLI to produce SCIP payloads; parse occurrences
   to drive symbol IDs, references, and calls. citeturn0search1
2. **Fallback**: TypeScript Compiler API (Program + TypeChecker) when SCIP is unavailable or errors.
3. **Test/boundary heuristics** reuse AST from whichever path ran (SCIP or TS AST).
4. **LLM usage**: only when static/SCIP signals cannot classify an entity; every LLM-derived
   node/edge carries `confidence: 'llm'` and honors path denylist (clarification 5a).

## 4. Node Ingestion Map (full catalog)

| Node (catalog)                                              | Extraction (SCIP-first)                                                                                                                                                                      | Fallback / Notes                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Codebase                                                    | Provided by orchestrator; language pass does not create; attaches `IN_SNAPSHOT` edges to its outputs.                                                                                        | —                                                                               |
| Snapshot                                                    | Provided; language pass never creates Snapshot.                                                                                                                                              | —                                                                               |
| Module                                                      | Derived from TS project refs and path roots; SCIP package/symbol path first segment → Module; emit Module + `CONTAINS` to Snapshot.                                                          | TS AST + `tsconfig` resolution.                                                 |
| File                                                        | Each indexed path; emit File + `IN_SNAPSHOT` to Snapshot and `CONTAINS` to Module.                                                                                                           | Same.                                                                           |
| Symbol                                                      | SCIP `definition` occurrences → Symbol; kind from syntax (function/class/method/const/type/interface/enum).                                                                                  | TS AST + TypeChecker fallback.                                                  |
| Boundary                                                    | Express/Fastify/Hono `app/fastify/hono.METHOD`, Next.js route exports, tRPC routers, NestJS controllers, WebSocket handlers, CLI (yargs/commander), event emitters. Handler Symbol = callee. | AST patterns; LLM only if handler kind ambiguous.                               |
| DataContract                                                | Prisma schema, Zod schemas, GraphQL SDL, OpenAPI YAML/JSON; ID from declaration name; include field shape when static.                                                                       | Zod/Prisma AST; JSON/YAML parse; if unknown, emit stub with `confidence:'llm'`. |
| TestCase                                                    | `describe/it/test` (jest/vitest), `Deno.test`; name from first string arg; nested blocks create hierarchical IDs.                                                                            | Same.                                                                           |
| SpecDoc                                                     | `.md/.mdx` co-located: emit SpecDoc stub + LOCATION to File/Module so doc pipeline can upsert content; owner: documentation_indexing_spec (clarification 1b).                                | Stub only; doc indexer fills content.                                           |
| Configuration                                               | `.env.example`, `config/*.ts`, `next.config.*`, `vite.config.*`, `jest.config.*`; emit Configuration node with key path metadata; redact values.                                             | AST/JSON parse.                                                                 |
| Error                                                       | Classes extending `Error`; emit Error nodes; mark thrown sites.                                                                                                                              | AST only; no LLM.                                                               |
| Message                                                     | Kafka/NATS/RabbitMQ clients, SNS/SQS SDKs, WebSocket pub/sub; emit Message with topic/channel name.                                                                                          | AST string literal/topic inference; no LLM.                                     |
| Dependency                                                  | From package.json + lockfile; emit Dependency nodes (name/version).                                                                                                                          | Static parse.                                                                   |
| Secret                                                      | Secret-like literals in config (regex on key names); emit Secret node with hashed placeholder; do not store value.                                                                           | AST heuristic; no LLM.                                                          |
| Workflow                                                    | Temporal/Conductor/cron wrappers (`workflow.execute`, `cron.schedule`); emit Workflow node with name/cron.                                                                                   | AST pattern; LLM only if name inferred from string templates.                   |
| Feature / Pattern / Incident / ExternalService / StyleGuide | Not emitted by language pass; reference owner specs (`llm_prompts_spec`, `patterns_and_incidents_spec`). TS supplies symbols/boundaries for downstream edges (clarif 1b).                    | —                                                                               |

## 5. Edge Emission Rules

- **CONTAINS**: Snapshot→Module→File→Symbol;
  File→{Boundary,DataContract,TestCase,Configuration,Error,Message,Workflow,Secret,Dependency};
  Module→same when defined at module scope.
- **IN_SNAPSHOT**: exactly one per snapshot-scoped node emitted by TS indexer (Module, File, Symbol,
  Boundary, DataContract, TestCase, Configuration, Error, Message, Workflow, Secret, Dependency) per
  ingest_spec §6.3.
- **LOCATION**: Boundary/TestCase/Configuration/Error/Message/Workflow/Secret/Dependency → File +
  Module; Boundary → handler Symbol (`role:'HANDLED_BY'}`).
- **REFERENCES**: `CALL` (SCIP or CallExpression), `IMPORT` (import/require), `TYPE_REF`
  (TypeReference), `PATTERN` (pattern matches), `SIMILAR` (embedding similarity placeholder),
  `EVENT_PUBLISH`/`EVENT_CONSUME` (Message producers/consumers).
- **REALIZES**: `role:'TESTS'` (TestCase→Symbol when call graph shows invocation); `role:'VERIFIES'`
  (TestCase→Feature when feature tag in test name); `role:'IMPLEMENTS'` (Boundary/Symbol→Feature
  written downstream using TS outputs).
- **DOCUMENTS**: SpecDoc/StyleGuide → Module/File/Symbol/Feature; TS emits SpecDoc stubs + LOCATION
  for deterministic edge upsert by doc indexer.
- **MUTATES**: Symbol/Boundary → DataContract when Prisma/TypeORM/Drizzle client CRUD or SQL tags
  detected.
- **DEPENDS_ON**: Symbol/Module/Boundary → Dependency nodes (npm packages), ExternalService (HTTP
  host literal), Configuration.
- **TRACKS**: Snapshot introduction/modification edges created centrally; TS provides symbol/file
  hashes.
- **IMPACTS**: Created by incident pipeline; TS provides symbol ids only.
- **EVENT RELATIONSHIPS**: Message ↔ Symbol/Boundary via producer/consumer detection using topic
  name.

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

| Date       | Version | Editor | Summary                                                  |
| ---------- | ------- | ------ | -------------------------------------------------------- |
| 2025-12-18 | 0.2     | @agent | Covered all nodes/edges, optional nodes, LLM guardrails. |
| 2025-12-18 | 0.1     | @agent | Initial TS/JS ingestion spec (Draft).                    |
