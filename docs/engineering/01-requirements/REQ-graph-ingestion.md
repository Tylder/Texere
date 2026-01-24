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
index:
  sections:
    - title: 'Document Relationships'
      lines: [52, 76]
      summary: 'High-level Requirements for ingestion pipelines and connectors.'
      token_est: 59
    - title: 'TLDR'
      lines: [78, 96]
      summary:
        'Ingestion MUST create canonical Artifact nodes with deterministic provenance and retention
        handling; connectors are pluggable and source-specific.'
      token_est: 101
    - title: 'Scope'
      lines: [98, 122]
      summary:
        'Ingestion pipelines, connector contracts, provenance, and retention modes. Excludes
        lifecycle semantics or projection rules.'
      token_est: 84
    - title: 'REQ-001: Connector Contract'
      lines: [124, 147]
      summary: 'All ingestion connectors MUST implement a shared contract.'
      token_est: 103
    - title: 'Related Requirements'
      lines: [149, 156]
      summary: 'Ingestion must align with architecture and graph model constraints.'
      token_est: 24
    - title: 'Design Decisions'
      lines: [158, 171]
      token_est: 85
    - title: 'Blockers'
      lines: [173, 177]
      token_est: 39
---

# REQ-graph-ingestion

## Document Relationships

Summary: High-level Requirements for ingestion pipelines and connectors.

**Upstream (depends on):**

- REQ-graph_system_architecture.md
- REQ-graph_knowledge_system.md

**Downstream (depends on this):**

- REQ-graph-ingestion-repo-scip-ts.md (planned)
- REQ-graph-ingestion-web-docs.md (planned)
- REQ-graph-ingestion-forum.md (planned)

**Siblings (related Requirements):**

- REQ-graph-store.md
- REQ-graph-projection.md

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

Summary: Ingestion pipelines, connector contracts, provenance, and retention modes. Excludes
lifecycle semantics or projection rules.

**Includes:**

- Connector interface and lifecycle
- Decomposition into ArtifactRoot/State/Part
- Provenance and Activity metadata
- Retention policy outcomes (link-only/excerpt/hashed)

**Excludes:**

- Decision/Requirement semantics (separate REQ)
- Projection rules (separate REQ)
- Storage engine choice (separate REQ)

**In separate docs:**

- REQ-graph-lifecycle.md
- REQ-graph-projection.md
- REQ-graph-store.md

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

## Related Requirements

Summary: Ingestion must align with architecture and graph model constraints.

- REQ-graph_system_architecture.md
- REQ-graph_knowledge_system.md

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
