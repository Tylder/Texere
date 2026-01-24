---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-store-inmemory
summary_short: >-
  Requirements for an in-memory graph store adapter used in v0.1
summary_long: >-
  Defines Requirements for a minimal in-memory graph store adapter that implements the graph store
  interface for v0.1 ingestion and testing. Focuses on deterministic behavior, transaction scoping,
  and append-only semantics without committing to a production database.
keywords:
  - requirements
  - graph
  - storage
implements:
  - IDEATION-PROBLEMS-graph-knowledge-system
implemented_by:
  - SPEC-graph-store-inmemory
related:
  - REQ-graph-store
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
index:
  sections:
    - title: 'TLDR'
      lines: [69, 86]
      summary:
        'Provide a deterministic in-memory graph store that satisfies the core store interface for
        v0.1 ingestion and tests.'
      token_est: 90
    - title: 'Scope'
      lines: [88, 105]
      summary: 'In-memory adapter behavior and guarantees. Excludes production database selection.'
      token_est: 62
    - title: 'REQ-001: Interface conformance'
      lines: [107, 129]
      summary: 'The in-memory adapter MUST implement the graph store interface.'
      token_est: 106
    - title: 'REQ-002: Append-only semantics'
      lines: [131, 152]
      summary: 'The adapter MUST enforce append-only writes.'
      token_est: 81
    - title: 'REQ-003: Transaction boundaries'
      lines: [154, 176]
      summary: 'The adapter MUST support explicit transaction boundaries.'
      token_est: 84
    - title: 'REQ-004: Deterministic query ordering'
      lines: [178, 198]
      summary: 'Query results MUST be deterministic for the same graph state.'
      token_est: 84
    - title: 'Related Requirements'
      lines: [200, 207]
      summary: 'In-memory storage aligns with the store interface and graph model requirements.'
      token_est: 26
    - title: 'Design Decisions'
      lines: [209, 222]
      token_est: 85
    - title: 'Blockers'
      lines: [224, 228]
      token_est: 39
---

# REQ-graph-store-inmemory

## TLDR

Summary: Provide a deterministic in-memory graph store that satisfies the core store interface for
v0.1 ingestion and tests.

**What:** In-memory graph store adapter

**Why:** Enables fast local ingestion and validation without database dependencies

**How:** Implement store interface with append-only semantics and transactional boundaries

**Status:** Draft

**Critical path:** Define store interface -> implement in-memory adapter -> validate invariants

**Risk:** Divergence from production store semantics could hide bugs

---

## Scope

Summary: In-memory adapter behavior and guarantees. Excludes production database selection.

**Includes:**

- Store interface coverage for nodes/edges
- Append-only write guarantees
- Transactional boundaries (begin/commit/rollback)
- Deterministic ordering for queries

**Excludes:**

- Production database performance requirements
- Distributed transactions
- Durability beyond process lifetime

---

## REQ-001: Interface conformance

Summary: The in-memory adapter MUST implement the graph store interface.

**Statement:**

The in-memory adapter MUST implement all required graph store operations for node/edge creation,
lookup, and query as defined by the graph-store REQ.

**Rationale:**

Ensures the adapter can be used interchangeably during v0.1 ingestion and testing.

**Measurable Fit Criteria:**

- [ ] All required store methods are implemented
- [ ] Adapter passes the shared store conformance test suite

**Verification Method:**

- Store interface conformance tests

---

## REQ-002: Append-only semantics

Summary: The adapter MUST enforce append-only writes.

**Statement:**

The adapter MUST reject in-place mutation of canonical nodes and represent updates as new nodes
linked by supersession.

**Rationale:**

Maintains immutability expectations consistent with the graph model.

**Measurable Fit Criteria:**

- [ ] Update attempts fail or create new nodes with supersession links

**Verification Method:**

- Mutation rejection tests

---

## REQ-003: Transaction boundaries

Summary: The adapter MUST support explicit transaction boundaries.

**Statement:**

The adapter MUST provide begin/commit/rollback semantics that isolate uncommitted writes from
readers.

**Rationale:**

Transactions are required to model Activity atomicity during ingestion.

**Measurable Fit Criteria:**

- [ ] Uncommitted writes are not visible outside the transaction
- [ ] Rollback removes all staged writes

**Verification Method:**

- Transaction isolation tests

---

## REQ-004: Deterministic query ordering

Summary: Query results MUST be deterministic for the same graph state.

**Statement:**

The adapter MUST return deterministic ordering for queries that yield multiple nodes or edges.

**Rationale:**

Deterministic ordering prevents test flakiness and projection drift.

**Measurable Fit Criteria:**

- [ ] Repeated identical queries return the same ordered results

**Verification Method:**

- Stable ordering tests across repeated runs

---

## Related Requirements

Summary: In-memory storage aligns with the store interface and graph model requirements.

- REQ-graph-store.md
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
