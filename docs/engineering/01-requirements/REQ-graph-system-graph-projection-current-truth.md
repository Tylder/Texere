---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-projection-current-truth
summary_short: >-
  Requirements for the CurrentCommittedTruth projection
summary_long: >-
  Defines Requirements for a deterministic CurrentCommittedTruth projection that surfaces the latest
  committed lifecycle assertions under supersession rules. v0.1 scope focuses on decisions,
  requirements, and spec clauses with reproducible ordering and explainability.
keywords:
  - requirements
  - graph
  - projection
related:
  - REQ-graph-projection
  - REQ-graph-system-graph-knowledge-system
index:
  sections:
    - title: 'TLDR'
      lines: [58, 74]
      summary: 'Provide a deterministic projection of the latest committed lifecycle assertions.'
      token_est: 78
    - title: 'Scope'
      lines: [76, 93]
      summary: 'CurrentCommittedTruth projection rules and outputs. Excludes other projections.'
      token_est: 60
    - title: 'REQ-001: Deterministic selection'
      lines: [95, 117]
      summary: 'The projection MUST select the latest non-superseded committed assertions.'
      token_est: 90
    - title: 'REQ-002: Explainability'
      lines: [119, 140]
      summary: 'Each projection item MUST include explainability metadata.'
      token_est: 90
    - title: 'REQ-003: Conflict visibility'
      lines: [142, 164]
      summary: 'Conflicts MUST be surfaced, not silently resolved.'
      token_est: 99
    - title: 'Related Requirements'
      lines: [166, 173]
      summary: 'Projection rules align with the projection and graph model requirements.'
      token_est: 25
    - title: 'Design Decisions'
      lines: [175, 188]
      token_est: 85
    - title: 'Blockers'
      lines: [190, 194]
      token_est: 39
---

# REQ-graph-projection-current-truth

## TLDR

Summary: Provide a deterministic projection of the latest committed lifecycle assertions.

**What:** CurrentCommittedTruth projection

**Why:** Users need a reliable "current truth" view for decisions and requirements

**How:** Select latest non-superseded committed assertions with deterministic ordering

**Status:** Draft

**Critical path:** Define selection rules -> define ordering -> enforce explainability

**Risk:** Ambiguous supersession or conflicts could yield non-deterministic results

---

## Scope

Summary: CurrentCommittedTruth projection rules and outputs. Excludes other projections.

**Includes:**

- Selection rules for committed Decisions/Requirements/SpecClauses
- Supersession handling
- Deterministic ordering
- Explainability metadata

**Excludes:**

- ActiveWork or GraphHealth projections
- Ingestion and storage concerns
- Conflict resolution policy beyond explicit rules

---

## REQ-001: Deterministic selection

Summary: The projection MUST select the latest non-superseded committed assertions.

**Statement:**

The projection MUST include the latest non-superseded Assertions with `epistemic_type=committed` for
supported kinds.

**Rationale:**

Ensures the projection reflects current committed truth under immutability.

**Measurable Fit Criteria:**

- [ ] Superseded committed assertions are excluded
- [ ] Latest committed assertion is selected per conflict key

**Verification Method:**

- Projection tests with supersession chains

---

## REQ-002: Explainability

Summary: Each projection item MUST include explainability metadata.

**Statement:**

Each item MUST include references to the canonical nodes and the rule version used to select it.

**Rationale:**

Explainability is required for auditability and trust.

**Measurable Fit Criteria:**

- [ ] Each item includes an explanation path or references
- [ ] Rule version is included in the output

**Verification Method:**

- Projection output validation tests

---

## REQ-003: Conflict visibility

Summary: Conflicts MUST be surfaced, not silently resolved.

**Statement:**

If multiple committed assertions share the same conflict key, the projection MUST surface a conflict
indicator rather than applying implicit \"latest wins\" resolution.

**Rationale:**

Silent conflict resolution undermines auditability and hides competing commitments.

**Measurable Fit Criteria:**

- [ ] Conflicting items are flagged in projection output
- [ ] Projection includes references to all conflicting assertions

**Verification Method:**

- Conflict detection tests

---

## Related Requirements

Summary: Projection rules align with the projection and graph model requirements.

- REQ-graph-projection.md
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
