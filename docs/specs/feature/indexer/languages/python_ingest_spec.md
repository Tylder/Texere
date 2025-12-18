# Texere Indexer – Python Ingest Spec

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

Defines how the Python indexer (basic analysis per ingest_spec §5.2) emits `FileIndexResult` while
keeping graph shape identical to other languages.

## 2. Inputs & Outputs

- **Input**: `{ codebaseRoot, snapshotId, filePaths[] }` filtered to `['py']`.
- **Output**: `FileIndexResult[]` with symbols, calls, references, boundaries, data contracts, and
  test cases.

## 3. Toolchain & Fallbacks

1. **Primary (SCIP-first)**: run `scip-python` to produce SCIP payloads; use occurrences for symbols
   and references. citeturn0search0
2. **Fallback**: Python sidecar using `libcst` for tolerant parsing plus `PyCG` for lightweight call
   graph reconstruction when SCIP fails or is unavailable. citeturn0search4turn1search0
3. **LLM usage**: only when boundary semantics cannot be resolved statically (e.g., custom router
   decorators) and must be flagged with `confidence: 'llm'`.

## 4. Node Ingestion Map (full catalog)

| Node (catalog)                                              | Extraction (SCIP-first)                                                                                                                                                             | Fallback / Notes                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Codebase                                                    | Provided by orchestrator before language pass; linked by `snapshotId`.                                                                                                              | —                                                                  |
| Snapshot                                                    | Provided by orchestrator; language pass attaches `IN_SNAPSHOT` edges only.                                                                                                          | —                                                                  |
| Module                                                      | Package roots from `__init__.py` hierarchy; SCIP `package` identifiers → `CONTAINS` to Snapshot.                                                                                    | Filesystem walk + libcst package detection.                        |
| File                                                        | Each `.py` file; `IN_SNAPSHOT` to Snapshot and `CONTAINS` to Module.                                                                                                                | Same.                                                              |
| Symbol                                                      | SCIP definitions; classify as function/class/method/const/type.                                                                                                                     | libcst visitors over `FunctionDef`, `ClassDef`, assignments.       |
| Boundary                                                    | Decorated callables: FastAPI/Starlette (`@app.get/post/...`), Flask (`@app.route`), Django views, Click/Argparse CLIs, Celery tasks. Handler symbol = decorated function or method. | libcst decorator inspection; LLM only if decorator target unknown. |
| DataContract                                                | Pydantic `BaseModel`, SQLAlchemy declarative models, dataclasses, Django ORM models; ID from class name.                                                                            | libcst class analysis; emit doc-only if fields unresolved.         |
| TestCase                                                    | Pytest functions `test_*`, pytest classes `Test*`, unittest `TestCase` methods.                                                                                                     | libcst pattern; mark skipped if syntax invalid.                    |
| SpecDoc                                                     | Markdown handled by doc indexer (not emitted here).                                                                                                                                 | —                                                                  |
| Configuration                                               | `.env.example`, `settings.py`, `config/*.py`; detected by config indexer (not emitted here).                                                                                        | —                                                                  |
| Error                                                       | Custom exceptions subclassing `Exception`; optional (v2+) unless enabled.                                                                                                           | libcst class detection.                                            |
| Message                                                     | Pub/sub payloads from clients (pydantic schemas passed to producers/consumers); optional.                                                                                           | libcst + string literal topics.                                    |
| Dependency                                                  | `requirements*.txt` / `poetry.lock` resolved centrally; language pass emits `DEPENDS_ON` only.                                                                                      | —                                                                  |
| Secret                                                      | Not emitted by language pass; security scanner handles.                                                                                                                             | —                                                                  |
| Workflow                                                    | Not emitted in v1; future Airflow/Prefect parsers.                                                                                                                                  | —                                                                  |
| Feature / Pattern / Incident / ExternalService / StyleGuide | Not emitted by language pass; produced by higher-level extractors (ingest_spec §2.3).                                                                                               | —                                                                  |

## 5. Edge Emission Rules

- **CONTAINS**: Snapshot→Module→File→Symbol; Module/File → Boundary/DataContract/TestCase when
  defined inside.
- **IN_SNAPSHOT**: exactly one per Module/File/Symbol/Boundary/DataContract/TestCase (ingest_spec
  §6.3).
- **LOCATION**: Boundary/TestCase → File + Module; Boundary → handler Symbol (`role:'HANDLED_BY'`).
- **REFERENCES**: `CALL` (SCIP or PyCG), `IMPORT`, `TYPE_REF`, `PATTERN`, `SIMILAR` (populated
  later).
- **REALIZES**:
  - `role:'IMPLEMENTS'`: Symbol ↔ Feature (higher-level extractor).
  - `role:'TESTS'`: TestCase → Symbol under test when call graph shows invocation.
  - `role:'VERIFIES'`: TestCase → Feature when feature marker found in test name/marker.
- **MUTATES**: Symbol/Boundary → DataContract when ORM session or Pydantic model methods invoked;
  HTTP client JSON schemas treated as DataContract when inferred.
- **DEPENDS_ON**: Symbol/Module/Boundary → external packages (lockfiles), HTTP clients
  (`requests/httpx`), configs.
- **DOCUMENTS**: SpecDoc/StyleGuide → Symbol/Module/Feature via doc indexer (not emitted here).
- **TRACKS**: Snapshot introduction/modification added centrally.
- **IMPACTS**: Incident relationships added by incident pipeline.
- **EVENT RELATIONSHIPS** (v2+): Message edges added only if Message nodes emitted; Python pass
  records producer/consumer sites for later edge creation.

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

| Date       | Version | Editor | Summary                                |
| ---------- | ------- | ------ | -------------------------------------- |
| 2025-12-18 | 0.1     | @agent | Initial Python ingestion spec (Draft). |
