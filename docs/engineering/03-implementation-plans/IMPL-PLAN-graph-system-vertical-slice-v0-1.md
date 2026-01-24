---
type: IMPL-PLAN
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-vertical-slice-v0-1
summary_short: >-
  Implement the v0.1 vertical slice for graph ingestion, policy, storage, projection, and tests
summary_long: >-
  Coordinates implementation of the v0.1 vertical slice: repo ingestion via SCIP-TS, in-memory
  store, graph-native policies, JSON dumps for inspection, and CurrentCommittedTruth projection.
  Includes milestones, verification criteria, and test coverage to validate determinism and
  policy-driven behavior.
keywords:
  - implementation
  - planning
  - graph
coordinates:
  - SPEC-graph-system-vertical-slice-v0-1
covers:
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-001
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-002
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-003
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-004
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-005
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-006
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-007
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-008
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-009
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-010
  - REQ-graph-system-graph-store-inmemory#REQ-001
  - REQ-graph-system-graph-store-inmemory#REQ-002
  - REQ-graph-system-graph-store-inmemory#REQ-003
  - REQ-graph-system-graph-store-inmemory#REQ-004
  - REQ-graph-system-graph-projection-current-truth#REQ-001
  - REQ-graph-system-graph-projection-current-truth#REQ-002
  - REQ-graph-system-graph-projection-current-truth#REQ-003
  - REQ-graph-system-graph-policy-framework#REQ-001
  - REQ-graph-system-graph-policy-framework#REQ-002
  - REQ-graph-system-graph-policy-framework#REQ-003
  - REQ-graph-system-graph-policy-framework#REQ-004
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-ingestion
  - REQ-graph-store
  - REQ-graph-projection
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [103, 120]
      summary:
        'Build the v0.1 vertical slice end-to-end with stable interfaces, policy-driven behavior,
        and testable JSON outputs for inspection.'
      token_est: 102
    - title: 'Scope'
      lines: [122, 142]
      summary: 'Implementation of the v0.1 vertical slice with inspection outputs and tests.'
      token_est: 85
    - title: 'Execution Default'
      lines: [144, 158]
      summary:
        'Unless explicitly scoped down, the default execution scope is the full v0.1 end-to-end
        slice.'
      token_est: 78
    - title: 'Preconditions'
      lines: [160, 170]
      token_est: 67
    - title: 'Milestones'
      lines: [172, 279]
      token_est: 388
      subsections:
        - title: 'Milestone 1: Core Interfaces and Node Shapes'
          lines: [174, 190]
          token_est: 67
        - title: 'Milestone 2: In-Memory Store + Policy Persistence'
          lines: [192, 207]
          token_est: 64
        - title: 'Milestone 3: Repo Ingestion Pipeline (SCIP-TS)'
          lines: [209, 227]
          token_est: 90
        - title: 'Milestone 4: JSON Dumps (LLM-Friendly)'
          lines: [229, 245]
          token_est: 55
        - title: 'Milestone 5: CurrentCommittedTruth Projection'
          lines: [247, 261]
          token_est: 56
        - title: 'Milestone 6: Test Suite (Vitest)'
          lines: [263, 279]
          token_est: 55
    - title: 'Risks and Mitigations'
      lines: [281, 290]
      token_est: 63
    - title: 'Exit Criteria'
      lines: [292, 297]
      token_est: 49
---

---

## TLDR

Summary: Build the v0.1 vertical slice end-to-end with stable interfaces, policy-driven behavior,
and testable JSON outputs for inspection.

**What:** Implement ingestion, policy, storage, projection, dumps, and tests

**Why:** Validate the model early with deterministic, inspectable outputs

**How:** Implement interfaces -> ingestion pipeline -> in-memory store -> projection -> tests

**Status:** Draft

**Critical path:** Interfaces -> ingestion + policy -> store -> dumps -> projection -> tests

**Risk:** Toolchain or policy handling errors obscure model issues

---

## Scope

Summary: Implementation of the v0.1 vertical slice with inspection outputs and tests.

**Includes:**

- GraphStore, IngestionConnector, ProjectionRunner interfaces
- In-memory store implementation
- Repo ingestion for `sindresorhus/ky` (v1.14.2)
- Graph-native policies (ingestion + projection)
- JSON dump outputs and summary
- Vitest tests for determinism and policy selection

**Excludes:**

- External web/forum ingestion
- Production databases
- ActiveWork/GraphHealth projections
- API/UX layers

---

## Execution Default

Summary: Unless explicitly scoped down, the default execution scope is the full v0.1 end-to-end
slice.

**Default scope includes:**

- All v0.1 packages in "Packages to Create (v0.1)"
- Ingestion CLI + SCIP-TS connector
- In-memory store, policies, projection, JSON dumps
- Required test suite (unit, integration, determinism)

**Scoping down requires explicit agreement** (e.g., "Milestones 1-2 only").

---

## Preconditions

- [ ] SPEC-graph-system-vertical-slice-v0-1 approved
- [ ] `.env` support for `GRAPH_INGEST_ROOT`
- [ ] Tooling available: node, pnpm, scip-typescript
- [ ] Nx templates from `/templates` will be used for any generated packages/files
- [ ] Tooling/testing workflow follows:
  - [ ] docs/engineering/02-specifications/SPEC-tooling-testing-implementation-specification.md
  - [ ] docs/engineering/02-specifications/SPEC-tooling-testing-trophy-strategy.md

---

## Milestones

### Milestone 1: Core Interfaces and Node Shapes

**Goal:** Establish stable interfaces and base node/edge schemas.

**Deliverables:**

- GraphStore interface
- IngestionConnector interface
- ProjectionRunner interface
- Node/edge type definitions with schema_version

**Verification:**

- [ ] Interfaces compile and are imported by implementations
- [ ] Node/edge shapes include `schema_version`

---

### Milestone 2: In-Memory Store + Policy Persistence

**Goal:** Implement in-memory store with policy queries and deterministic ordering.

**Deliverables:**

- In-memory store adapter
- Policy persistence and selection queries
- Transaction boundaries

**Verification:**

- [ ] Store conformance tests pass
- [ ] Policy queries return deterministic results

---

### Milestone 3: Repo Ingestion Pipeline (SCIP-TS)

**Goal:** Ingest `sindresorhus/ky` (v1.14.2) into ArtifactRoot/State/Part.

**Deliverables:**

- Clone to `GRAPH_INGEST_ROOT` (default `./tmp/Texere/graph-ingest`)
- Install dependencies via lockfile
- Run scip-typescript index
- Map files + symbols to ArtifactParts
- Record toolchain versions in Activity metadata

**Verification:**

- [ ] Ingestion creates file + symbol parts
- [ ] Locator format `path#scip_symbol` used
- [ ] Retention mode defaults to link-only

---

### Milestone 4: JSON Dumps (LLM-Friendly)

**Goal:** Emit stable, versioned JSON dumps for inspection.

**Deliverables:**

- `./tmp/graph-dump/artifacts.json`
- `./tmp/graph-dump/policies.json`
- `./tmp/graph-dump/projection.json`
- `./tmp/graph-dump/graph_dump_summary.json`

**Verification:**

- [ ] Dumps follow the stable envelope schema
- [ ] Summary includes counts for nodes/edges/parts

---

### Milestone 5: CurrentCommittedTruth Projection

**Goal:** Compute deterministic projection with explainability.

**Deliverables:**

- Projection runner for CurrentCommittedTruth
- Explainability metadata in output

**Verification:**

- [ ] Latest non-superseded committed assertions selected
- [ ] Projection output includes rule version and explanation path

---

### Milestone 6: Test Suite (Vitest)

**Goal:** Validate determinism and policy-driven behavior.

**Deliverables:**

- `ingestion_determinism.test.ts`
- `policy_selection.test.ts`
- `projection_determinism.test.ts`

**Verification:**

- [ ] Tests pass and are reproducible
- [ ] Policy selection is deterministic
- [ ] Projection determinism verified

---

## Risks and Mitigations

- **Risk:** scip-typescript indexing fails on external repo
  - **Mitigation:** Pin commit/tag and capture toolchain versions
- **Risk:** Policy selection ambiguity
  - **Mitigation:** Deterministic selection rules + tests
- **Risk:** JSON dumps drift over time
  - **Mitigation:** Schema versioning and backward-compatible changes only

---

## Exit Criteria

- [ ] Ingestion completes deterministically on `sindresorhus/ky` v1.14.2
- [ ] JSON dumps are stable and inspectable
- [ ] CurrentCommittedTruth projection is deterministic and explainable
- [ ] All Vitest checks pass
