---
type: SPEC
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-vertical-slice-v0-1
summary_short: >-
  End-to-end v0.1 slice: repo ingestion (SCIP-TS) -> in-memory graph -> JSON dumps -> projection
summary_long: >-
  Specifies a minimal end-to-end vertical slice to validate the graph model: ingest a small
  TypeScript repo via scip-typescript, store nodes in an in-memory graph store, emit JSON dumps for
  inspection, and compute the CurrentCommittedTruth projection. Policies are graph-native and drive
  ingestion and projection behavior. Includes a minimal Vitest suite for determinism and policy
  selection.
keywords:
  - spec
  - graph
  - vertical-slice
implements:
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-001
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-002
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-003
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-004
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-005
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-006
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-007
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-008
  - REQ-graph-system-graph-ingestion-repo-scip-ts#REQ-009
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
  - REQ-graph-ingestion
  - REQ-graph-projection
  - REQ-graph-store
  - REQ-graph-system-graph-policy-framework
  - REQ-graph-system-graph-knowledge-system
index:
  sections:
    - title: 'TLDR'
      lines: [112, 129]
      summary:
        'Ingest `sindresorhus/ky` via scip-typescript, store in-memory, emit JSON dumps, and compute
        CurrentCommittedTruth with policy-driven selection; validate via Vitest.'
      token_est: 111
    - title: 'Scope'
      lines: [131, 154]
      summary:
        'End-to-end slice covering repo ingestion, in-memory store, policy-driven behavior, JSON
        inspection outputs, and CurrentCommittedTruth projection.'
      token_est: 127
    - title: 'Implements'
      lines: [156, 181]
      summary: 'Implements core ingestion, store, policy, and projection requirements for v0.1.'
      token_est: 127
    - title: 'Interfaces & Observable Behavior'
      lines: [183, 232]
      summary:
        'CLI-driven ingestion emits JSON dumps; projection output is deterministic and explainable.'
      token_est: 205
    - title: 'Data Models'
      lines: [234, 270]
      summary: 'Minimal node set for the slice with deterministic IDs and locators.'
      token_est: 91
    - title: 'Workflows'
      lines: [272, 284]
      summary: 'Ingestion and projection workflow with explicit policy resolution.'
      token_est: 68
    - title: 'Dump Schema (Stable and LLM-Friendly)'
      lines: [286, 309]
      summary: 'JSON dumps MUST be stable, versioned, and readable by humans and LLMs.'
      token_est: 107
    - title: 'Error Handling'
      lines: [311, 319]
      summary: 'Failure is explicit; no partial writes on SCIP failure.'
      token_est: 67
    - title: 'Testing & Verification'
      lines: [321, 339]
      summary: 'Vitest suite validates determinism and policy-driven behavior.'
      token_est: 73
    - title: 'Observability'
      lines: [341, 350]
      summary: 'Minimal inspection outputs for debugging and review.'
      token_est: 51
    - title: 'Security & Retention'
      lines: [352, 359]
      summary: 'Default link-only retention for third-party code.'
      token_est: 32
    - title: 'Non-Throwaway Guarantees'
      lines: [361, 369]
      summary: 'The slice MUST be extendable without rewrite.'
      token_est: 59
    - title: 'Open Questions'
      lines: [371, 373]
      token_est: 21
---

# SPEC-graph-system-vertical-slice-v0-1

---

## TLDR

Summary: Ingest `sindresorhus/ky` via scip-typescript, store in-memory, emit JSON dumps, and compute
CurrentCommittedTruth with policy-driven selection; validate via Vitest.

**What:** Minimal end-to-end vertical slice for graph ingestion + projection

**Why:** Validate correctness, determinism, and inspectability of the model before scaling

**How:** Repo clone -> scip-typescript index -> Artifact nodes in memory -> JSON dumps -> projection

**Status:** Draft

**Critical path:** Implement ingestion pipeline -> add policy nodes -> compute projection -> tests

**Risk:** Toolchain or policy handling issues could mask model defects

---

## Scope

Summary: End-to-end slice covering repo ingestion, in-memory store, policy-driven behavior, JSON
inspection outputs, and CurrentCommittedTruth projection.

**Includes:**

- Repo ingestion for `sindresorhus/ky` pinned to release `v1.14.2` (commit `51b0129`)
- SCIP-based symbol extraction (file + symbol parts)
- In-memory graph store
- Graph-native policies for ingestion and projection
- JSON dumps for inspection
- Vitest suite for determinism and policy selection
- Stable interfaces for store, ingestion, and projection
- Stable JSON dump schema with versioning

**Excludes:**

- External web/forum ingestion
- Production storage backends
- ActiveWork or GraphHealth projections
- UI/UX or API services

---

## Implements

Summary: Implements core ingestion, store, policy, and projection requirements for v0.1.

- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-001 (Commit-anchored ingestion)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-002 (SCIP index generation)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-003 (Install policy)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-004 (ArtifactPart mapping)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-005 (Locator format)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-006 (Toolchain provenance)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-007 (Failure policy)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-008 (Retention mode)
- REQ-graph-system-graph-ingestion-repo-scip-ts.md#REQ-009 (Monorepo coverage)
- REQ-graph-system-graph-store-inmemory.md#REQ-001 (Store interface conformance)
- REQ-graph-system-graph-store-inmemory.md#REQ-002 (Append-only semantics)
- REQ-graph-system-graph-store-inmemory.md#REQ-003 (Transaction boundaries)
- REQ-graph-system-graph-store-inmemory.md#REQ-004 (Deterministic ordering)
- REQ-graph-system-graph-projection-current-truth.md#REQ-001 (Deterministic selection)
- REQ-graph-system-graph-projection-current-truth.md#REQ-002 (Explainability)
- REQ-graph-system-graph-projection-current-truth.md#REQ-003 (Conflict visibility)
- REQ-graph-system-graph-policy-framework.md#REQ-001 (Policy kinds)
- REQ-graph-system-graph-policy-framework.md#REQ-002 (Policy supersession)
- REQ-graph-system-graph-policy-framework.md#REQ-003 (Policy scope and selection)
- REQ-graph-system-graph-policy-framework.md#REQ-004 (Policy provenance)

---

## Interfaces & Observable Behavior

Summary: CLI-driven ingestion emits JSON dumps; projection output is deterministic and explainable.

### Contract: Stable Interfaces

**GraphStore (interface):**

- `beginTransaction()` / `commit()` / `rollback()`
- `putNode(node)` / `putEdge(edge)`
- `getNode(id)` / `getEdges(query)`
- `queryPolicy(selection)`

**IngestionConnector (interface):**

- `canHandle(sourceKind)`
- `ingest(input, policy, store)`

**ProjectionRunner (interface):**

- `run(projectionName, input, policy, store)` -> `ProjectionEnvelope`

These interfaces MUST exist even if only a single in-memory implementation is provided in v0.1.

### CLI: `graph:ingest:repo`

**Inputs:**

- `repo_url` (e.g., `https://github.com/sindresorhus/ky`)
- `commit` (explicit commit hash; use `51b0129` for `v1.14.2`)
- `project_id` (target Project)
- `policy_id` (optional override; default resolved by policy selection)
- `GRAPH_INGEST_ROOT` (from `.env`, default `./tmp/Texere/graph-ingest`)

**Behavior:**

- Clones repo at commit
- Uses workspace root from `.env` (default `./tmp/Texere/graph-ingest`)
- Installs dependencies using repo lockfile and package manager
- Runs `scip-typescript index`
- Writes ArtifactRoot/State/Part to in-memory store
- Emits JSON dumps to `./tmp/graph-dump`

### Output: JSON Dumps

- `./tmp/graph-dump/artifacts.json`
- `./tmp/graph-dump/policies.json`
- `./tmp/graph-dump/projection.json`

---

## Data Models

Summary: Minimal node set for the slice with deterministic IDs and locators.

**ArtifactRoot:**

- `artifact_root_id`
- `source_kind=repo`
- `canonical_ref` (repo URL)

**ArtifactState:**

- `artifact_state_id`
- `version_ref` (commit hash)
- `content_hash`
- `retrieved_at`

**ArtifactPart (file):**

- `artifact_part_id`
- `state_id`
- `locator` (`path`)
- `retention_mode=link-only`

**ArtifactPart (symbol):**

- `artifact_part_id`
- `state_id`
- `locator` (`path#scip_symbol`)
- `retention_mode=link-only`

**Policy nodes:**

- IngestionPolicy (depth, retention, connector params)
- ProjectionPolicy (rule version)

---

## Workflows

Summary: Ingestion and projection workflow with explicit policy resolution.

1. Resolve applicable IngestionPolicy for repo
2. Clone repo and install dependencies
3. Generate SCIP index
4. Map files and symbols to ArtifactParts
5. Persist nodes in in-memory store
6. Emit JSON dumps
7. Compute CurrentCommittedTruth projection for lifecycle fixtures

---

## Dump Schema (Stable and LLM-Friendly)

Summary: JSON dumps MUST be stable, versioned, and readable by humans and LLMs.

**Envelope (all dumps):**

- `schema_version`
- `generated_at`
- `project_id`
- `items[]` (typed records)

**Records (minimum):**

- Nodes: `{ id, type, props, links[] }`
- Edges: `{ id, type, from, to, props }`
- Projection items: `{ item_id, item_type, explain }`

**LLM-friendly requirements:**

- Avoid deeply nested or ambiguous fields
- Use consistent keys across dumps
- Provide small, bounded excerpts where applicable

---

## Error Handling

Summary: Failure is explicit; no partial writes on SCIP failure.

- If install fails -> ingestion aborts with error and no writes
- If SCIP index fails -> ingestion aborts with error and no writes
- Policy resolution failures -> abort with error + policy selection trace

---

## Testing & Verification

Summary: Vitest suite validates determinism and policy-driven behavior.

**Tests:**

1. `ingestion_determinism.test.ts`
   - Ingest same commit twice
   - Assert identical ArtifactState + Part counts

2. `policy_selection.test.ts`
   - Two policies with different scopes
   - Assert correct policy applies

3. `projection_determinism.test.ts`
   - Supersession chain fixture
   - Assert CurrentCommittedTruth selects latest and includes explanation path

---

## Observability

Summary: Minimal inspection outputs for debugging and review.

- JSON dumps with counts and metadata
- Activity metadata includes toolchain versions
- Projection output includes rule version and lens metadata
- `graph_dump_summary.json` with counts for nodes/edges/parts

---

## Security & Retention

Summary: Default link-only retention for third-party code.

- Retention mode defaults to link-only
- No raw source content stored

---

## Non-Throwaway Guarantees

Summary: The slice MUST be extendable without rewrite.

- Stable interfaces for store, ingestion, and projections are required from day 1
- JSON dump schema must remain backward compatible (new fields only)
- Policy resolution stays graph-driven (no hard-coded config shortcuts)

---

## Open Questions

- Should policy fixtures live as JSON files or generated in test setup?
