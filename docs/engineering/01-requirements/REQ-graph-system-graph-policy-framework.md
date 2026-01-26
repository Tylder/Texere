---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-policy-framework
summary_short: >-
  Requirements for a queryable, append-only policy framework in the graph
summary_long: >-
  Defines Requirements for representing system policies (ingestion, projection, validation,
  retention, conflict handling) as first-class, queryable graph data with append-only semantics,
  provenance, and deterministic current/as-of selection.
keywords:
  - requirements
  - graph
  - policy
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
implemented_by:
  - SPEC-graph-policy-framework
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-ingestion
  - REQ-graph-projection
  - REQ-graph-lifecycle
  - REQ-graph-store
related_reference:
  - REFERENCE-agent-knowledge-requirements
index:
  sections:
    - title: 'TLDR'
      lines: [74, 91]
      summary:
        'Policies MUST be represented as canonical graph data with provenance, supersession, and
        queryable scope.'
      token_est: 88
    - title: 'Scope'
      lines: [93, 110]
      summary: 'Policy representation and selection in the graph. Excludes concrete policy values.'
      token_est: 78
    - title: 'REQ-001: Policy kinds'
      lines: [112, 139]
      summary: 'The system MUST support a minimal set of policy kinds.'
      token_est: 106
    - title: 'REQ-002: Policy supersession'
      lines: [141, 162]
      summary: 'Policy changes MUST be append-only and supersession-based.'
      token_est: 86
    - title: 'REQ-003: Policy scope and selection'
      lines: [164, 186]
      summary: 'Policy applicability MUST be explicit and queryable.'
      token_est: 108
    - title: 'REQ-004: Policy provenance'
      lines: [188, 208]
      summary: 'Policy changes MUST record Agent and Activity provenance.'
      token_est: 72
    - title: 'Related Requirements'
      lines: [210, 220]
      summary:
        'Policy framework aligns with ingestion, projection, lifecycle, and store requirements.'
      token_est: 33
    - title: 'Design Decisions'
      lines: [222, 235]
      token_est: 85
    - title: 'Blockers'
      lines: [237, 241]
      token_est: 39
---

# REQ-graph-policy-framework

## TLDR

Summary: Policies MUST be represented as canonical graph data with provenance, supersession, and
queryable scope.

**What:** Graph-native policy framework

**Why:** Avoid hidden configuration and make system behavior auditable and queryable

**How:** Model policies as append-only assertions with scopes, profiles, and deterministic selection

**Status:** Draft

**Critical path:** Define policy kinds -> define selection rules -> enforce policy provenance

**Risk:** Over-generalizing policies could create schema sprawl

---

## Scope

Summary: Policy representation and selection in the graph. Excludes concrete policy values.

**Includes:**

- Policy node kinds and minimum fields
- Append-only policy updates via supersession
- Scope-based policy application and selection
- Provenance requirements for policy changes

**Excludes:**

- Source-specific ingestion rules (separate REQs)
- Projection algorithm definitions (separate REQs)
- Storage backend selection (separate REQs)

---

## REQ-001: Policy kinds

Summary: The system MUST support a minimal set of policy kinds.

**Statement:**

The system MUST define policy kinds for at least:

- IngestionPolicy
- ProjectionPolicy
- ValidationPolicy
- RetentionPolicy
- ConflictPolicy

**Rationale:**

These policy kinds govern core system behavior and must be queryable and auditable.

**Measurable Fit Criteria:**

- [ ] Policy kinds are represented as canonical nodes or assertions
- [ ] Each policy kind has a declared schema

**Verification Method:**

- Schema registry validation

---

## REQ-002: Policy supersession

Summary: Policy changes MUST be append-only and supersession-based.

**Statement:**

Policy updates MUST be represented as new policy nodes that explicitly supersede prior versions.

**Rationale:**

This preserves history and enables deterministic current/as-of policy selection.

**Measurable Fit Criteria:**

- [ ] Superseded policies remain queryable as history
- [ ] Current policy is the latest non-superseded version

**Verification Method:**

- Supersession selection tests

---

## REQ-003: Policy scope and selection

Summary: Policy applicability MUST be explicit and queryable.

**Statement:**

Policies MUST declare a scope and selection rule (e.g., Project, source_kind, Subject, or Artifact)
so that the system can deterministically choose which policy applies.

**Rationale:**

Explicit scopes prevent hidden or ambiguous behavior.

**Measurable Fit Criteria:**

- [ ] Policies include a scope object or link to a scope target
- [ ] Selection rules are deterministic and documented

**Verification Method:**

- Policy selection tests against overlapping scopes

---

## REQ-004: Policy provenance

Summary: Policy changes MUST record Agent and Activity provenance.

**Statement:**

All policy nodes MUST link to `ASSERTED_BY` and `GENERATED_IN` to provide provenance.

**Rationale:**

Policies affect system behavior and must be auditable.

**Measurable Fit Criteria:**

- [ ] Policies without provenance are rejected

**Verification Method:**

- Validation tests for provenance links

---

## Related Requirements

Summary: Policy framework aligns with ingestion, projection, lifecycle, and store requirements.

- REQ-graph-system-graph-knowledge-system.md
- REQ-graph-ingestion.md
- REQ-graph-projection.md
- REQ-graph-lifecycle.md
- REQ-graph-store.md

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
