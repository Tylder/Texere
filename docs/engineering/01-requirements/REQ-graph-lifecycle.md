---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-lifecycle
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: >-
  High-level requirements for lifecycle assertions and invariants
summary_long: >-
  Defines high-level Requirements for lifecycle assertions (Decisions, Requirements, Specs, Plans,
  Verification) and the invariants that govern them. Detailed semantics live in subordinate
  REQs/SPECs.
keywords:
  - requirements
  - graph
  - lifecycle
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [60, 77]
      summary:
        'Lifecycle assertions MUST be modeled as canonical graph nodes with explicit supersession,
        provenance, and validation invariants.'
      token_est: 89
    - title: 'Scope'
      lines: [79, 96]
      summary:
        'Lifecycle assertion kinds, supersession rules, and validation invariants. Excludes
        ingestion mechanics, projection logic, and storage semantics.'
      token_est: 73
    - title: 'REQ-001: Lifecycle Assertion Catalog'
      lines: [98, 120]
      summary: 'The system MUST define a canonical set of lifecycle assertion kinds.'
      token_est: 103
    - title: 'REQ-002: Policy-driven validation'
      lines: [122, 145]
      summary: 'Validation and conflict rules MUST be driven by graph-native policy.'
      token_est: 101
    - title: 'Design Decisions'
      lines: [147, 160]
      token_est: 85
    - title: 'Blockers'
      lines: [162, 166]
      token_est: 39
---

# REQ-graph-lifecycle

---

## TLDR

Summary: Lifecycle assertions MUST be modeled as canonical graph nodes with explicit supersession,
provenance, and validation invariants.

**What:** High-level lifecycle assertion requirements

**Why:** Ensure decisions, requirements, and plans are traceable and auditable

**How:** Define assertion kinds, invariants, and validation rules

**Status:** Draft

**Critical path:** Define assertion kinds -> define invariants -> specify validation rules

**Risk:** If lifecycle rules drift, projections and ingestion linkage become inconsistent

---

## Scope

Summary: Lifecycle assertion kinds, supersession rules, and validation invariants. Excludes
ingestion mechanics, projection logic, and storage semantics.

**Includes:**

- Assertion kinds and minimum fields
- Supersession rules
- Validation invariants for lifecycle assertions

**Excludes:**

- Ingestion pipelines and source parsing
- Projection definitions and selection rules
- Storage engine selection and transaction semantics

---

## REQ-001: Lifecycle Assertion Catalog

Summary: The system MUST define a canonical set of lifecycle assertion kinds.

**Statement:**

The system MUST define a catalog of assertion kinds and their minimum required fields.

**Rationale:**

A stable catalog prevents semantic drift across agents and tools.

**Measurable Fit Criteria:**

- [ ] A catalog exists and is enforced by validation
- [ ] Each assertion kind has a declared schema

**Verification Method:**

- Schema validation tests
- Linting or build-time checks

---

## REQ-002: Policy-driven validation

Summary: Validation and conflict rules MUST be driven by graph-native policy.

**Statement:**

Validation rules and conflict handling MUST be governed by the current applicable ValidationPolicy
and ConflictPolicy stored in the graph.

**Rationale:**

Policy-driven validation ensures lifecycle enforcement is auditable and consistent with graph
governance.

**Measurable Fit Criteria:**

- [ ] Validation thresholds are sourced from ValidationPolicy
- [ ] Conflict handling rules are sourced from ConflictPolicy

**Verification Method:**

- Policy-driven validation tests

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
