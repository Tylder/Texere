# Texere Indexer – Testing Strategy Specification

**Document Version:** 0.1 (Placeholder)  
**Last Updated:** December 2025  
**Status:** Pending Implementation

## Overview

This specification defines the testing strategy for the Texere Indexer, including unit tests,
integration tests, golden file validation, and runtime contract tests for the non-server run-once
CLI and programmatic API.

## Scope

- Unit test structure and coverage targets
- Integration test fixtures (synthetic repos)
- Golden file snapshots for FileIndexResult
- Graph validation helpers and assertions
- Regression detection strategy
- Test coverage targets per layer

## Out of Scope

- End-to-end agent testing (handled separately)
- Performance benchmarking suite
- Chaos engineering tests

## Table of Contents

1. [Unit Tests](#1-unit-tests)
2. [Integration Tests](#2-integration-tests)
3. [Golden Files](#3-golden-files)
4. [Runtime Contract Tests](#4-runtime-contract-tests)
5. [Coverage Targets](#5-coverage-targets)
6. [Changelog](#6-changelog)

---

## 1. Unit Tests

### 1.1 Git Diff Logic

- Table-driven cases for added/modified/deleted/renamed.
- Branch resolution precedence (runtime > per-repo > app/global > defaults).
- Clone-when-missing behavior controlled by `cloneBasePath` (simulate missing repo path).

### 1.2 Per-Language Indexers

_(To be detailed: TS/JS and Python indexer unit tests)_

### 1.3 Higher-Level Extractors

_(To be detailed: endpoint, schema, testcase, feature extraction tests)_

### 1.4 Graph Write Adapters

- Enforce `IN_SNAPSHOT` invariant; ensure orphan checks.
- Deterministic embedding stub support (DI) to keep tests stable.

---

## 2. Integration Tests

### 2.1 Synthetic TS/JS Repository

Use synthetic repos and in-memory/fake deps where possible; optional Neo4j/Qdrant docker-compose for
full end-to-end.

### 2.2 Synthetic Python Repository

_(To be detailed: fixture structure, test cases)_

### 2.3 Graph Correctness Validation

_(To be detailed: end-to-end indexing tests with graph assertions)_

---

## 3. Golden Files

### 3.1 FileIndexResult Snapshots

_(To be detailed: golden FileIndexResult for selected test files)_

### 3.2 Graph State Snapshots

Include dry-run plan snapshots (JSON) for run-once CLI to detect config/diff regressions without
writes.

## 4. Runtime Contract Tests

- CLI wrapper (`scripts/indexer-run-once.ts`): spawn with flags; assert exit codes (0/1/2/3/4),
  dry-run JSON shape, and log format.
- Programmatic API (`runSnapshot`, `runTrackedBranches`): exercise with injected fakes (`RunDeps`),
  ensure deterministic results with stub embedder and in-memory graph.
- Locking behavior: per-repo/branch lock (in-memory and file-based) prevents concurrent same-branch
  runs.

---

## 5. Coverage Targets

| Layer       | Target |
| ----------- | ------ |
| Unit        | TBD    |
| Integration | TBD    |
| Golden      | TBD    |

_(To be detailed per ingest_spec.md §10)_

---

## 6. Changelog

| Date       | Version | Editor | Summary                                                                |
| ---------- | ------- | ------ | ---------------------------------------------------------------------- |
| 2025-12-08 | 0.1     | @agent | Placeholder created; references ingest_spec.md §10. Test fixtures TBD. |

---

## References

- [Ingest Specification](./ingest_spec.md) – Testing requirements (§10)
- [General Testing Strategy](../../engineering/testing_strategy.md) – Repository-wide strategy
