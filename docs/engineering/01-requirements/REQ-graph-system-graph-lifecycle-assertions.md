---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-lifecycle-assertions
summary_short: >-
  Requirements for lifecycle assertion kinds and minimum schemas
summary_long: >-
  Defines Requirements for the lifecycle assertion catalog and minimum schemas used in v0.1, with a
  focus on Decisions, Requirements, and SpecClauses. Establishes required fields, provenance, and
  supersession expectations.
keywords:
  - requirements
  - graph
  - lifecycle
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
implemented_by:
  - SPEC-graph-lifecycle-assertions
related:
  - REQ-graph-lifecycle
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [67, 83]
      summary: 'Define the v0.1 lifecycle assertion catalog and minimum schemas.'
      token_est: 76
    - title: 'Scope'
      lines: [85, 102]
      summary: 'Assertion kinds and schemas for v0.1. Excludes ingestion and projection rules.'
      token_est: 69
    - title: 'REQ-001: Assertion catalog'
      lines: [104, 125]
      summary: 'The system MUST define a v0.1 catalog of assertion kinds.'
      token_est: 88
    - title: 'REQ-002: Minimum fields'
      lines: [127, 149]
      summary: 'Each assertion kind MUST define minimum required fields.'
      token_est: 98
    - title: 'REQ-003: Supersession eligibility'
      lines: [151, 173]
      summary: 'Lifecycle assertions MUST support explicit supersession.'
      token_est: 95
    - title: 'REQ-004: Extension contract for new assertion kinds'
      lines: [175, 197]
      summary: 'New assertion kinds MUST register schemas and conflict policies before use.'
      token_est: 133
    - title: 'Related Requirements'
      lines: [199, 206]
      summary: 'Assertion requirements align with lifecycle and graph model requirements.'
      token_est: 24
    - title: 'Design Decisions'
      lines: [208, 221]
      token_est: 85
    - title: 'Blockers'
      lines: [223, 227]
      token_est: 39
---

# REQ-graph-lifecycle-assertions

## TLDR

Summary: Define the v0.1 lifecycle assertion catalog and minimum schemas.

**What:** Lifecycle assertion kinds and schemas

**Why:** Consistent assertion structure enables validation and projections

**How:** Declare required fields and provenance rules per kind

**Status:** Draft

**Critical path:** Define assertion kinds -> define schemas -> enforce validation

**Risk:** Ambiguous schemas create drift and invalid graph states

---

## Scope

Summary: Assertion kinds and schemas for v0.1. Excludes ingestion and projection rules.

**Includes:**

- Assertion kinds (Decision, Requirement, SpecClause)
- Required fields for each kind
- Provenance requirements (Agent/Activity)
- Supersession expectations

**Excludes:**

- Ingestion pipelines and source parsing
- Projection definitions
- Extended assertion kinds (Plan, Verification) beyond v0.1

---

## REQ-001: Assertion catalog

Summary: The system MUST define a v0.1 catalog of assertion kinds.

**Statement:**

The system MUST support Decision, Requirement, and SpecClause assertion kinds in v0.1.

**Rationale:**

These kinds are the minimum lifecycle spine needed for current truth projections.

**Measurable Fit Criteria:**

- [ ] Each kind has a declared schema
- [ ] Validation enforces the catalog

**Verification Method:**

- Schema validation tests

---

## REQ-002: Minimum fields

Summary: Each assertion kind MUST define minimum required fields.

**Statement:**

Each supported assertion kind MUST define required fields, including provenance links to Agent and
Activity, and a deterministic conflict key when applicable.

**Rationale:**

Minimum fields enable invariants, projections, and reproducibility.

**Measurable Fit Criteria:**

- [ ] Schemas define required fields for each kind
- [ ] Assertions missing required fields are rejected

**Verification Method:**

- Validation tests for required fields

---

## REQ-003: Supersession eligibility

Summary: Lifecycle assertions MUST support explicit supersession.

**Statement:**

Decision, Requirement, and SpecClause assertions MUST be eligible for supersession by a later
assertion of the same kind.

**Rationale:**

Supersession is required to maintain append-only history with a clear current truth.

**Measurable Fit Criteria:**

- [ ] Supersession links are permitted between like kinds
- [ ] Superseded assertions are excluded from current-truth projections

**Verification Method:**

- Supersession handling tests

---

## REQ-004: Extension contract for new assertion kinds

Summary: New assertion kinds MUST register schemas and conflict policies before use.

**Statement:**

Any new assertion kind MUST be added to the knowledge type registry with a schema, required fields,
conflict key policy (when applicable), and supersession eligibility before ingestion or projection.

**Rationale:**

Extension must be deterministic and auditable to avoid rewrites when new types are introduced.

**Measurable Fit Criteria:**

- [ ] Unregistered assertion kinds are rejected at ingest time
- [ ] Each new kind declares required fields and conflict key policy

**Verification Method:**

- Registry validation tests for new kinds

---

## Related Requirements

Summary: Assertion requirements align with lifecycle and graph model requirements.

- REQ-graph-lifecycle.md
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
