# Texere Indexer – Python Ingest Spec

**Document Version:** 0.2  
**Last Updated:** December 18, 2025  
**Status:** Active (Python ingestion)  
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

Defines how the Python indexer (basic analysis per ingest_spec §5.2) emits `FileIndexResult` while
keeping graph shape identical to other languages.

## 2. Inputs & Outputs

- **Input**: `{ codebaseRoot, snapshotId, filePaths[] }` filtered to `['py']` (packages, modules,
  scripts).
- **Output**: `FileIndexResult[]` with symbols, calls, references, boundaries, data contracts, test
  cases, configuration, errors, messages, dependencies, secrets (redacted), workflow markers.

## 3. Toolchain & Fallbacks

1. **Primary (SCIP-first)**: run `scip-python` to produce SCIP payloads; use occurrences for symbols
   and references. citeturn0search0
2. **Fallback**: Python sidecar using `libcst` for tolerant parsing plus `PyCG` for lightweight call
   graph reconstruction when SCIP fails or is unavailable. citeturn0search4turn1search0
3. **LLM usage**: only when static/SCIP signals cannot classify an entity; flag `confidence: 'llm'`
   and honor denylist.

## 4. Node Ingestion Map (full catalog)

| Node (catalog)                                              | Extraction (SCIP-first)                                                                                                                                                                                 | Fallback / Notes                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Codebase                                                    | Provided by orchestrator; language pass attaches `IN_SNAPSHOT` edges to outputs.                                                                                                                        | —                                                                              |
| Snapshot                                                    | Provided; language pass never creates Snapshot.                                                                                                                                                         | —                                                                              |
| Module                                                      | Package roots from `__init__.py` hierarchy; SCIP `package` identifiers → `CONTAINS` to Snapshot.                                                                                                        | Filesystem walk + libcst package detection.                                    |
| File                                                        | Each `.py` file; emit File + `IN_SNAPSHOT` and `CONTAINS` to Module.                                                                                                                                    | Same.                                                                          |
| Symbol                                                      | SCIP definitions; classify as function/class/method/const/type.                                                                                                                                         | libcst visitors over `FunctionDef`, `ClassDef`, assignments.                   |
| Boundary                                                    | Decorated callables: FastAPI/Starlette (`@app.get/post/...`), Flask (`@app.route`), Django views, Click/Argparse CLIs, Celery tasks, WebSocket handlers. Handler symbol = decorated function or method. | libcst decorator inspection; LLM only if decorator target unknown.             |
| DataContract                                                | Pydantic `BaseModel`, SQLAlchemy declarative models, dataclasses, Django ORM models; ID from class name; include field definitions.                                                                     | libcst class analysis; emit stub with `confidence:'llm'` if fields unresolved. |
| TestCase                                                    | Pytest functions `test_*`, pytest classes `Test*`, unittest `TestCase` methods.                                                                                                                         | libcst pattern; mark skipped if syntax invalid.                                |
| SpecDoc                                                     | `.md/.rst` co-located: emit SpecDoc stub + LOCATION to File/Module; doc indexer owns content (clarification 1b).                                                                                        | Stub only.                                                                     |
| Configuration                                               | `.env.example`, `settings.py`, `config/*.py`, Django settings modules; emit Configuration with key metadata; redact values.                                                                             | libcst parse.                                                                  |
| Error                                                       | Custom exceptions subclassing `Exception`; emit Error nodes; mark throw sites.                                                                                                                          | libcst class detection; no LLM.                                                |
| Message                                                     | Pub/sub payloads (Celery tasks, Kafka/NATS clients, SNS/SQS boto3, websockets); emit Message node with topic/queue.                                                                                     | libcst + string literal topics; no LLM.                                        |
| Dependency                                                  | `requirements*.txt` / `poetry.lock`; emit Dependency nodes (name/version) and file provenance.                                                                                                          | Static parse.                                                                  |
| Secret                                                      | Secret-like literals (key/token) in settings; emit Secret node with hashed placeholder; do not store value.                                                                                             | Heuristic; no LLM.                                                             |
| Workflow                                                    | Airflow DAG definitions, Prefect flows, Celery beat schedules; emit Workflow node with name/cron if present.                                                                                            | libcst pattern; LLM only if name inferred from strings.                        |
| Feature / Pattern / Incident / ExternalService / StyleGuide | Not emitted by language pass; reference owner specs (`llm_prompts_spec`, `patterns_and_incidents_spec`). Inputs supplied via symbols/boundaries.                                                        | —                                                                              |

## 5. Edge Emission Rules

- **CONTAINS**: Snapshot→Module→File→Symbol;
  File→{Boundary,DataContract,TestCase,Configuration,Error,Message,Workflow,Secret,Dependency};
  Module→same when defined at module scope.
- **IN_SNAPSHOT**: exactly one per snapshot-scoped node emitted by Python indexer (Module, File,
  Symbol, Boundary, DataContract, TestCase, Configuration, Error, Message, Workflow, Secret,
  Dependency) per ingest_spec §6.3.
- **LOCATION**: Boundary/TestCase/Configuration/Error/Message/Workflow/Secret/Dependency → File +
  Module; Boundary → handler Symbol (`role:'HANDLED_BY'`).
- **REFERENCES**: `CALL` (SCIP or PyCG), `IMPORT`, `TYPE_REF`, `PATTERN` (pattern matches),
  `SIMILAR` (embedding placeholder), `EVENT_PUBLISH`/`EVENT_CONSUME` (Message producers/consumers).
- **REALIZES**: `role:'TESTS'` (TestCase→Symbol when call graph shows invocation); `role:'VERIFIES'`
  (TestCase→Feature when feature tag in test name/marker); `role:'IMPLEMENTS'`
  (Boundary/Symbol→Feature written downstream using Python outputs).
- **DOCUMENTS**: SpecDoc/StyleGuide → Module/File/Symbol/Feature; Python emits SpecDoc stubs +
  LOCATION for deterministic edge upsert by doc indexer.
- **MUTATES**: Symbol/Boundary → DataContract when ORM session CRUD or Pydantic model serialization
  detected.
- **DEPENDS_ON**: Symbol/Module/Boundary → Dependency nodes (pip packages), ExternalService (HTTP
  host literal), Configuration.
- **TRACKS**: Snapshot introduction/modification added centrally; Python provides symbol/file
  hashes.
- **IMPACTS**: Added by incident pipeline; Python provides symbol ids only.
- **EVENT RELATIONSHIPS**: Message ↔ Symbol/Boundary via producer/consumer detection using
  topic/queue name.

## 6. Error Handling

- File parse/SCIP failures → skip file, log, continue (ingest_spec §6.4).
- SCIP run failure → fall back to libcst+pycg; if both fail mark snapshot `index_failed`.
- Validate single `IN_SNAPSHOT` per snapshot-scoped node (ingest_spec §6.3) before returning.

## 7. Testing Guidance

- Unit: symbol classification, decorator-based boundary detection (FastAPI, Flask, Django), pytest
  detection, pycg call edges.
- Integration: golden `FileIndexResult` for representative FastAPI, Flask, Django, and pytest files.
- Tests cite sections (e.g., `python_ingest_spec §5`).

## 8. Changelog

| Date       | Version | Editor | Summary                                                  |
| ---------- | ------- | ------ | -------------------------------------------------------- |
| 2025-12-18 | 0.2     | @agent | Covered all nodes/edges, optional nodes, LLM guardrails. |
| 2025-12-18 | 0.1     | @agent | Initial Python ingestion spec (Draft).                   |
