---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-system-architecture
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: >-
  High-level requirements for the Nx package boundaries and dependency rules of the graph system
summary_long: >-
  Defines the high-level architectural Requirements for how graph system code is organized in the Nx
  monorepo, including package boundaries, dependency rules, and separation between ingestion,
  lifecycle, projections, and storage interfaces. Details are delegated to subordinate REQs/SPECs.
keywords:
  - requirements
  - graph
  - architecture
related:
  - REQ-graph-system-graph-knowledge-system
index:
  sections:
    - title: 'TLDR'
      lines: [68, 85]
      summary:
        'Separate ingestion, lifecycle, projections, and storage into distinct Nx packages with
        clean dependency rules; shared core types live in a foundational package.'
      token_est: 112
    - title: 'Scope'
      lines: [87, 113]
      summary:
        'High-level Nx package roles and dependency rules. Excludes detailed pipeline behavior,
        query semantics, or database choices.'
      token_est: 98
    - title: 'REQ-001: Package Boundary Definition'
      lines: [115, 147]
      summary:
        'The Nx monorepo MUST define distinct packages for core types, storage, ingestion,
        projections, and lifecycle logic.'
      token_est: 145
    - title: 'REQ-002: Dependency Direction Rules'
      lines: [149, 180]
      summary:
        'Package dependencies MUST follow a strict directionality to prevent cyclic coupling.'
      token_est: 166
    - title: 'REQ-003: Ingestion and Lifecycle Separation'
      lines: [182, 205]
      summary: 'Ingestion packages MUST NOT depend on lifecycle packages, and vice versa.'
      token_est: 98
    - title: 'Related Requirements'
      lines: [207, 217]
      summary: 'This REQ establishes architectural boundaries referenced by all detailed REQs.'
      token_est: 38
    - title: 'Design Decisions'
      lines: [219, 232]
      token_est: 85
    - title: 'Blockers'
      lines: [234, 238]
      token_est: 39
---

# REQ-graph-system-architecture

---

## TLDR

Summary: Separate ingestion, lifecycle, projections, and storage into distinct Nx packages with
clean dependency rules; shared core types live in a foundational package.

**What:** High-level package boundaries and dependency rules for graph system code

**Why:** Enforce separation of concerns and prevent coupling between ingestion and lifecycle logic

**How:** Define Nx package roles and allowed dependencies; enforce via linting/constraints

**Status:** Draft

**Critical path:** Approve package boundaries -> create package shells -> enforce dependency rules

**Risk:** If boundaries change later, downstream REQs/SPECs must be updated

---

## Scope

Summary: High-level Nx package roles and dependency rules. Excludes detailed pipeline behavior,
query semantics, or database choices.

**Includes:**

- Package boundaries and responsibilities
- Allowed dependency directions
- Separation between ingestion and lifecycle logic

**Excludes:**

- Detailed ingestion behavior (separate REQ)
- Lifecycle semantics and invariants (separate REQ)
- Projection definitions (separate REQ)
- Storage engine selection (separate REQ)

**In separate docs:**

- REQ-graph-knowledge-system.md
- REQ-graph-ingestion.md
- REQ-graph-lifecycle.md
- REQ-graph-projection.md
- REQ-graph-store.md

---

## REQ-001: Package Boundary Definition

Summary: The Nx monorepo MUST define distinct packages for core types, storage, ingestion,
projections, and lifecycle logic.

**Statement:**

The system MUST define separate Nx packages for:

- graph-core (canonical types/schemas)
- graph-store (persistence interfaces/adapters)
- graph-ingest (ingestion orchestration)
- graph-ingest-connector-\* (source-specific connectors)
- graph-lifecycle (decisions/requirements/specs/plans logic)
- graph-projection (deterministic projections)
- graph-api (optional composition layer)

**Rationale:**

Clear boundaries prevent cross-coupling and allow independent evolution of ingestion and lifecycle
logic.

**Measurable Fit Criteria:**

- [ ] Each package exists with a distinct Nx target and entrypoint
- [ ] Package READMEs declare their scope and non-goals

**Verification Method:**

- Repo structure inspection
- Dependency graph check

---

## REQ-002: Dependency Direction Rules

Summary: Package dependencies MUST follow a strict directionality to prevent cyclic coupling.

**Statement:**

Dependency rules MUST enforce the following directions:

- graph-core has no internal graph package dependencies
- graph-store depends only on graph-core
- graph-lifecycle depends on graph-core and graph-store
- graph-projection depends on graph-core, graph-store, and (optionally) graph-lifecycle
- graph-ingest depends on graph-core and graph-store
- graph-ingest-connector-\* depends on graph-ingest and graph-core
- graph-api may depend on all graph packages

**Rationale:**

This ensures a stable core model, isolates ingestion from lifecycle logic, and keeps projections
pure and deterministic.

**Measurable Fit Criteria:**

- [ ] Nx dependency graph contains no forbidden edges
- [ ] Lint rules enforce dependency constraints

**Verification Method:**

- Nx dep-graph audit
- Lint rule validation

---

## REQ-003: Ingestion and Lifecycle Separation

Summary: Ingestion packages MUST NOT depend on lifecycle packages, and vice versa.

**Statement:**

graph-ingest and graph-ingest-connector-\* MUST NOT depend on graph-lifecycle or graph-projection.
graph-lifecycle MUST NOT depend on graph-ingest.

**Rationale:**

Ingestion should remain source-agnostic and independent of decision/spec semantics.

**Measurable Fit Criteria:**

- [ ] No import paths cross these boundaries
- [ ] Dependency rules enforce separation

**Verification Method:**

- Static dependency checks
- Lint rule validation

---

## Related Requirements

Summary: This REQ establishes architectural boundaries referenced by all detailed REQs.

- REQ-graph-knowledge-system.md
- REQ-graph-ingestion.md (planned)
- REQ-graph-lifecycle.md (planned)
- REQ-graph-projection.md (planned)
- REQ-graph-store.md (planned)

---

## Design Decisions

| Field                  | Decision 001  |
| ---------------------- | ------------- |
| **Title**              | Not specified |
| **Options Considered** | Not specified |
| **Chosen**             | Not specified |
| **Rationale**          | Not specified |
| **Tradeoffs**          | Not specified |
| **Blocked**            | Not specified |
| **Expires**            | Not specified |
| **Decision Date**      | Not specified |

---

## Blockers

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | N/A    | N/A           | N/A    |
