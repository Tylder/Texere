---
type: IMPL-PLAN
status: draft
stability: experimental
created: 2026-01-25
last_updated: 2026-01-25
area: graph-system
feature: graph-vertical-slice-v0-2
summary_short: >-
  Implement the v0.2 vertical slice for repo ingestion with the full TypeScript profile and
  connector contract
summary_long: >-
  Coordinates the v0.2 implementation: the TypeScript repo connector using SCIP, graph schema
  mapping, in-memory relational metadata store, agent-facing query API, and ky fixture ingestion.
  Moves language-specific steps into the connector package while keeping graph-ingest orchestration
  source-agnostic. Includes milestones, validation, and exit criteria.
keywords:
  - implementation
  - planning
  - graph
coordinates:
  - SPEC-graph-system-graph-ingestion-repo-ts
covers:
  - REQ-graph-ingestion#REQ-001
  - REQ-graph-ingestion#REQ-002
  - REQ-graph-ingestion#REQ-003
  - REQ-graph-ingestion#REQ-004
  - REQ-graph-ingestion#REQ-005
  - REQ-graph-ingestion#REQ-006
  - REQ-graph-ingestion#REQ-007
  - REQ-graph-ingestion#REQ-008
  - REQ-graph-ingestion#REQ-009
  - REQ-graph-ingestion#REQ-011
  - REQ-graph-ingestion#REQ-012
  - REQ-graph-ingestion#REQ-013
  - REQ-graph-ingestion#REQ-014
  - REQ-graph-ingestion#REQ-015
  - REQ-graph-ingestion#REQ-016
  - REQ-graph-ingestion#REQ-017
  - REQ-graph-ingestion#REQ-018
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-001
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-002
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-003
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-004
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-005
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-006
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-007
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-008
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-009
  - REQ-graph-system-graph-ingestion-repo-ts#REQ-010
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-ingestion
  - REQ-graph-store
  - REQ-graph-projection
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [111, 129]
      summary:
        'Implement the v0.2 vertical slice for repo ingestion with a full TypeScript profile,
        connector contract outputs, and ky fixture validation.'
      token_est: 124
    - title: 'Scope'
      lines: [131, 154]
      summary:
        'Implement the repo TypeScript ingestion profile end-to-end using the updated connector
        contract and schema requirements.'
      token_est: 151
    - title: 'Execution Default'
      lines: [156, 163]
      summary:
        'Default execution is the full v0.2 slice, including connector contract outputs and query
        API, unless explicitly scoped down.'
      token_est: 42
    - title: 'Preconditions'
      lines: [165, 176]
      token_est: 78
    - title: 'Milestones'
      lines: [178, 269]
      token_est: 496
      subsections:
        - title: 'Milestone 1: Connector Contract Alignment'
          lines: [180, 195]
          token_est: 85
        - title: 'Milestone 2: Orchestration and Language-Specific Steps'
          lines: [197, 214]
          token_est: 102
        - title: 'Milestone 3: Graph + Relational Schema Mapping'
          lines: [216, 234]
          token_est: 123
        - title: 'Milestone 4: Agent-Facing Query API'
          lines: [236, 251]
          token_est: 81
        - title: 'Milestone 5: Ky Fixture Ingestion and Integration Tests'
          lines: [253, 269]
          token_est: 104
    - title: 'Risks and Mitigations'
      lines: [271, 280]
      token_est: 98
    - title: 'Exit Criteria'
      lines: [282, 288]
      token_est: 67
---

# IMPL-PLAN-graph-system-vertical-slice-v0-2

---

## TLDR

Summary: Implement the v0.2 vertical slice for repo ingestion with a full TypeScript profile,
connector contract outputs, and ky fixture validation.

**What:** Full repo-TS ingestion pipeline + schema mapping + query API

**Why:** Align the implementation with REQ-graph-ingestion and the repo-TS spec

**How:** Refactor connector contract, move language actions into the connector, map SCIP to the
graph + relational schemas, and validate with ky fixture tests

**Status:** Draft

**Critical path:** Connector contract + schema mapping -> metadata store -> query API -> ky ingest

**Risk:** Connector refactor scope and schema mapping complexity

---

## Scope

Summary: Implement the repo TypeScript ingestion profile end-to-end using the updated connector
contract and schema requirements.

**Includes:**

- `@repo/graph-ingest` remains source-agnostic orchestration
- Rename TS connector package to `@repo/graph-ingest-connector-ts`
- Move language-specific steps (dependency install, scip-typescript invocation) into the connector
- Graph schema implementation for `File`, `Symbol`, `Type`, `Commit`, `Package` nodes + edges
- In-memory relational metadata store for files, commits, packages, and index status
- Policy decision record, run summary, and capability declarations for repo-ts profile
- Typed agent-facing query API from REQ-009
- Ky repo fixture ingestion (v1.14.2) with deterministic tests

**Excludes:**

- Web/forum ingestion connectors
- Production graph DB adapters (Janus/Neo4j)
- Semantic/vector search ingestion
- Multi-language indexers beyond TypeScript

---

## Execution Default

Summary: Default execution is the full v0.2 slice, including connector contract outputs and query
API, unless explicitly scoped down.

**Scoping down requires explicit agreement** (e.g., "Milestones 1-3 only").

---

## Preconditions

- [ ] SPEC-graph-system-graph-ingestion-repo-ts accepted
- [ ] REQ-graph-ingestion accepted for connector outputs
- [ ] `RUN_INTEGRATION=true` gated tests are optional unless explicitly requested
- [ ] `GRAPH_KY_FIXTURE_PATH` points at `sindresorhus/ky` v1.14.2 for fixture ingestion
- [ ] Tooling available: node, pnpm, scip-typescript
- [ ] Testing workflow follows:
  - [ ] docs/engineering/02-specifications/SPEC-tooling-testing-implementation-specification.md
  - [ ] docs/engineering/02-specifications/SPEC-tooling-testing-trophy-strategy.md

---

## Milestones

### Milestone 1: Connector Contract Alignment

**Goal:** Align package naming and connector inputs/outputs with REQ-graph-ingestion.

**Deliverables:**

- Expand connector interface to accept `source_ref`, `policy_ref`, `snapshot_id`, `run_id`
- Define run summary, capability declaration, and policy decision record outputs
- Keep `@repo/graph-ingest` orchestration source-agnostic

**Verification:**

- [ ] Type checks compile with the new contract types
- [ ] Graph CLI uses the renamed connector package

---

### Milestone 2: Orchestration and Language-Specific Steps

**Goal:** Move language-specific steps into the connector while keeping repo cloning in
graph-ingest.

**Deliverables:**

- `ingest-repo` continues to clone/checkout and resolve repo sources
- Dependency installation moved into the TS connector
- scip-typescript invocation and toolchain provenance recorded in connector
- Connector handles workspace detection (pnpm/yarn/npm)

**Verification:**

- [ ] Unit tests confirm graph-ingest no longer installs dependencies
- [ ] Connector tests confirm dependency install and scip invocation paths

---

### Milestone 3: Graph + Relational Schema Mapping

**Goal:** Implement the required node/edge schema and metadata tables.

**Deliverables:**

- Graph node/edge types for `File`, `Symbol`, `Type`, `Commit`, `Package`
- Edge creation for `DEFINES`, `REFERS_TO`, `DECLARES_TYPE`, `IMPLEMENTS`, `INHERITS_FROM`,
  `EXPORTS`, `HAS_CHILD`, `DEPENDS_ON`, `INDEXED_AT`
- In-memory relational store for `files`, `commits`, `packages`, `index_status`
- Stale handling and content hash tracking for rename detection

**Verification:**

- [ ] Fixture mapping tests validate expected node/edge shapes
- [ ] Relational store tests validate required tables/fields
- [ ] Graph outputs are deterministically ordered (nodes, edges, and relational records)

---

### Milestone 4: Agent-Facing Query API

**Goal:** Provide typed query methods required by REQ-009 over the in-memory stores.

**Deliverables:**

- Implement query methods (`getSymbolReferences`, `getSymbolDefinition`, etc.)
- Ensure each method returns `stale` flags
- Contract tests for each query API method

**Verification:**

- [ ] Contract tests assert shape and required data paths
- [ ] Methods return deterministic output ordering

---

### Milestone 5: Ky Fixture Ingestion and Integration Tests

**Goal:** Ingest the ky repo end-to-end using the updated connector and schema.

**Deliverables:**

- Fixture-based tests using the existing SCIP file
- Integration test that ingests ky repo at v1.14.2
- JSON dump output for inspection

**Verification:**

- [ ] Tests confirm file/symbol mapping and edge creation
- [ ] Run summary includes status, counts, and policy record
- [ ] JSON dump outputs are deterministically ordered for stable diffs

---

## Risks and Mitigations

- **Schema breadth**: Mapping all SCIP relationships to the full graph schema may be incomplete.
  Mitigation: annotate unknowns and add focused tests for each edge type.
- **Connector refactor churn**: Interface changes may break existing callers/tests. Mitigation:
  update all app imports in the same milestone with compile-time checks.
- **Incremental correctness**: Stale handling may be under-specified for now. Mitigation: add
  deterministic tests and explicitly mark staleness as unsupported where needed.

---

## Exit Criteria

- [ ] `@repo/graph-ingest-connector-ts` ingests ky repo successfully
- [ ] Required run summary + capability + policy decision records are emitted
- [ ] Graph and relational schemas conform to REQ-graph-ingestion-repo-ts
- [ ] Typed query API methods pass contract tests
- [ ] `pnpm post:report:fast` passes
