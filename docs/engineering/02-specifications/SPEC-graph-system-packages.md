---
type: SPEC
status: draft
stability: experimental
created: 2026-01-25
last_updated: 2026-01-25
area: graph-system
feature: graph-packages
summary_short: >-
  Defines scope and responsibilities for core graph system packages.
summary_long: >-
  Specifies the package boundaries for graph-core, graph-store, graph-ingest,
  graph-ingest-connector-ts, graph-query, and graph-projection. Clarifies responsibilities,
  exclusions, and expected interactions to keep ingestion, storage, and querying decoupled.
keywords:
  - graph
  - packages
  - architecture
related:
  - REQ-graph-ingestion
  - REQ-graph-system-graph-ingestion-repo-ts
index:
  sections:
    - title: 'TLDR'
      lines: [71, 83]
      summary:
        'Define package boundaries so schema, storage, ingestion, and querying remain decoupled.'
      token_est: 63
    - title: 'Scope'
      lines: [85, 102]
      summary: 'Package responsibilities and explicit exclusions for the core graph system.'
      token_est: 64
    - title: 'Specification'
      lines: [104, 140]
      summary: 'Each package has a single primary responsibility.'
      token_est: 234
    - title: 'Workflow'
      lines: [142, 150]
      summary: 'Teams implement features in the package that owns the responsibility.'
      token_est: 64
    - title: 'Rationale'
      lines: [152, 157]
      token_est: 29
    - title: 'Alternatives Considered'
      lines: [159, 164]
      token_est: 33
    - title: 'Consequences'
      lines: [166, 171]
      token_est: 24
    - title: 'Verification Approach'
      lines: [173, 178]
      token_est: 32
    - title: 'Design Decisions'
      lines: [180, 184]
      token_est: 19
    - title: 'Blockers'
      lines: [186, 190]
      token_est: 6
    - title: 'Assumptions'
      lines: [192, 196]
      token_est: 16
    - title: 'Unknowns'
      lines: [198, 202]
      token_est: 17
---

# SPEC-graph-system-packages

---

## TLDR

Summary: Define package boundaries so schema, storage, ingestion, and querying remain decoupled.

**What:** Scope and responsibility of core graph packages

**Why:** Support multiple ingestion sources and storage backends without tight coupling

**How:** Enforce package contracts and keep domain logic in the correct package

**Status:** Draft

---

## Scope

Summary: Package responsibilities and explicit exclusions for the core graph system.

**Includes:**

- `graph-core`, `graph-store`, `graph-ingest`, `graph-ingest-connector-ts`, `graph-query`,
  `graph-projection`
- Inputs/outputs and ownership boundaries
- Expected dependencies between packages

**Excludes:**

- CLI application responsibilities
- Non-code ingestion connectors (web/forum) not yet implemented
- Production database adapters

---

## Specification

Summary: Each package has a single primary responsibility.

**Package boundaries:**

- `packages/graph-core`
  - Owns canonical schema types (nodes, edges, ranges, locators) and deterministic IDs.
  - No knowledge of storage, ingestion, or querying.
- `packages/graph-store`
  - Owns storage interfaces (`GraphStore`, `RelationalStore`) and in-memory implementations.
  - No ingestion logic; no source-specific handling.
- `packages/graph-ingest`
  - Owns the ingestion orchestration and connector contract.
  - Handles repo source resolution, cloning, and transaction boundaries.
  - Must stay source-agnostic.
- `packages/graph-ingest-connector-ts`
  - Owns TypeScript repo ingestion using SCIP.
  - Performs language-specific actions (dependency install, scip-typescript invocation).
  - Maps SCIP outputs into graph + relational schemas.
- `packages/graph-query`
  - Owns typed, language-agnostic query API (REQ-009).
  - Operates only on graph schema and store interfaces.
  - Does not ingest or store data.
- `packages/graph-projection`
  - Owns projection runners and derived views over stored graph data.
  - No ingestion logic; no connector-specific behavior.

**Dependency direction (allowed):**

- `graph-ingest-connector-ts` → `graph-ingest`, `graph-core`, `graph-store`
- `graph-ingest` → `graph-core`, `graph-store`
- `graph-query` → `graph-core`, `graph-store`
- `graph-projection` → `graph-core`, `graph-store`
- `graph-core` has no dependencies on other graph packages

---

## Workflow

Summary: Teams implement features in the package that owns the responsibility.

- Schema changes start in `graph-core`, then ripple to store/ingest/query as needed.
- New data sources are implemented as new connector packages, not in `graph-ingest`.
- Query features are added in `graph-query` without ingestion changes.

---

## Rationale

Separation keeps ingestion and query logic independent so multiple sources and storage backends can
evolve without rewriting unrelated layers.

---

## Alternatives Considered

- Single-package monolith: simpler but couples ingestion, storage, and querying.
- Query logic inside ingestion: reduces packages but blocks multiple backends.

---

## Consequences

- Clear interfaces and stable contracts.
- More coordination when changing schema or connector contracts.

---

## Verification Approach

- Import graph and tsconfig reference checks for dependency direction.
- Contract tests for connector inputs/outputs and query API shapes.

---

## Design Decisions

- Maintain explicit package boundaries as the primary architectural contract.

---

## Blockers

None.

---

## Assumptions

- Additional connectors and stores will be added later.

---

## Unknowns

- How web/forum ingestion will map into the same schema.

---
