---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-projection
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: >-
  High-level requirements for deterministic projections
summary_long: >-
  Defines high-level Requirements for deterministic, explainable projections derived from canonical
  graph nodes. Detailed projection definitions live in subordinate REQs/SPECs.
keywords:
  - requirements
  - graph
  - projection
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [56, 73]
      summary:
        'Projections MUST be deterministic, explainable, and derived only from canonical nodes.'
      token_est: 73
    - title: 'Scope'
      lines: [75, 92]
      summary:
        'Projection contracts, determinism, and explainability. Excludes ingestion, lifecycle
        semantics, and storage decisions.'
      token_est: 62
    - title: 'REQ-001: Projection Determinism'
      lines: [94, 116]
      summary: 'Projections MUST be deterministic functions of canonical graph data.'
      token_est: 88
    - title: 'Related Requirements'
      lines: [118, 125]
      summary: 'Projections must align with architecture and graph model.'
      token_est: 23
    - title: 'Design Decisions'
      lines: [127, 140]
      token_est: 85
    - title: 'Blockers'
      lines: [142, 146]
      token_est: 39
---

# REQ-graph-projection

---

## TLDR

Summary: Projections MUST be deterministic, explainable, and derived only from canonical nodes.

**What:** High-level requirements for projections

**Why:** Provide stable, auditable views without mutating canonical truth

**How:** Define projection contracts, explainability, and determinism constraints

**Status:** Draft

**Critical path:** Define projection contract -> specify minimum projections -> enforce
explainability

**Risk:** Non-deterministic projections undermine auditability

---

## Scope

Summary: Projection contracts, determinism, and explainability. Excludes ingestion, lifecycle
semantics, and storage decisions.

**Includes:**

- Determinism requirements
- Explainability requirements
- Projection registration and metadata

**Excludes:**

- Ingestion pipelines and source parsing
- Lifecycle semantics and invariants
- Storage engine selection and transaction semantics

---

## REQ-001: Projection Determinism

Summary: Projections MUST be deterministic functions of canonical graph data.

**Statement:**

Projection membership and ordering MUST be determined by declared rules and canonical graph state.

**Rationale:**

Determinism is required for auditability and repeatable queries.

**Measurable Fit Criteria:**

- [ ] Identical inputs yield identical projection outputs
- [ ] Projection rule versions are recorded

**Verification Method:**

- Reproducibility tests
- Snapshot-based tests

---

## Related Requirements

Summary: Projections must align with architecture and graph model.

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
