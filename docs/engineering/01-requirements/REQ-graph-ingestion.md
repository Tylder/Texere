---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-ingestion
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: >-
  High-level requirements for ingestion pipelines and source connectors
summary_long: >-
  Defines high-level Requirements for ingestion of code and external sources into canonical graph
  nodes, including connectors, decomposition rules, provenance, and retention policies. Detailed
  source-specific rules are delegated to subordinate REQs/SPECs.
keywords:
  - requirements
  - graph
  - ingestion
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [65, 83]
      summary:
        'Ingestion MUST create canonical Artifact nodes with deterministic provenance and retention
        handling; connectors are pluggable and source-specific.'
      token_est: 101
    - title: 'Scope'
      lines: [85, 105]
      summary:
        'Source-agnostic ingestion pipeline requirements, connector contracts, provenance, and
        retention modes. Excludes source-specific parsing rules, lifecycle semantics, and projection
        logic.'
      token_est: 98
    - title: 'REQ-001: Connector Contract'
      lines: [107, 130]
      summary: 'All ingestion connectors MUST implement a shared contract.'
      token_est: 103
    - title: 'REQ-002: Ingestion policy as source of truth'
      lines: [132, 155]
      summary: 'Ingestion behavior MUST be driven by graph-native IngestionPolicy.'
      token_est: 111
    - title: 'Related Requirements'
      lines: [157, 164]
      summary: 'Ingestion must align with architecture and graph model constraints.'
      token_est: 24
    - title: 'Design Decisions'
      lines: [166, 179]
      token_est: 85
    - title: 'Blockers'
      lines: [181, 185]
      token_est: 39
---

# REQ-graph-ingestion

---

## TLDR

Summary: Ingestion MUST create canonical Artifact nodes with deterministic provenance and retention
handling; connectors are pluggable and source-specific.

**What:** High-level ingestion requirements for code and external sources

**Why:** Ensure reproducible, auditable source capture across heterogeneous inputs

**How:** Define ingestion pipeline stages, connector contracts, and retention semantics

**Status:** Draft

**Critical path:** Define connector interface -> specify repo ingestion v0.1 -> validate output
schema

**Risk:** If ingestion contracts change, projections and lifecycle linkage must be updated

---

## Scope

Summary: Source-agnostic ingestion pipeline requirements, connector contracts, provenance, and
retention modes. Excludes source-specific parsing rules, lifecycle semantics, and projection logic.

**Includes:**

- Connector interface and lifecycle
- Source-agnostic pipeline stages (fetch -> decompose -> write)
- Decomposition into ArtifactRoot/State/Part
- Provenance and Activity metadata
- Retention policy outcomes (link-only/excerpt/hashed)

**Excludes:**

- Source-specific parsing/decomposition rules (separate REQs)
- Decision/Requirement semantics (separate REQ)
- Projection rules (separate REQ)
- Storage engine choice (separate REQ)

---

## REQ-001: Connector Contract

Summary: All ingestion connectors MUST implement a shared contract.

**Statement:**

Each connector MUST implement a common interface that defines input parameters, output schema, and
error/partial-result behavior.

**Rationale:**

A shared contract ensures connectors can be orchestrated uniformly.

**Measurable Fit Criteria:**

- [ ] All connectors implement the common interface
- [ ] Orchestrator can invoke any connector via the same API

**Verification Method:**

- Interface conformance tests
- Integration tests across at least two connectors

---

## REQ-002: Ingestion policy as source of truth

Summary: Ingestion behavior MUST be driven by graph-native IngestionPolicy.

**Statement:**

The ingestion pipeline MUST resolve depth, retention mode, and connector parameters from the current
applicable IngestionPolicy (and associated profiles) stored in the graph.

**Rationale:**

Policy-driven ingestion keeps configuration auditable, queryable, and consistent with the graph
model.

**Measurable Fit Criteria:**

- [ ] Ingestion depth and retention mode are derived from IngestionPolicy
- [ ] Policy selection is deterministic and explainable

**Verification Method:**

- Policy-driven ingestion tests

---

## Related Requirements

Summary: Ingestion must align with architecture and graph model constraints.

- REQ-graph-system-graph-system-architecture.md
- REQ-graph-system-graph-knowledge-system.md

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
