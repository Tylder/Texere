# REQ-ORCH-EPISTEMIC-003: Assumption validation

**Status:** Proposed

---

## Statement (MUST form)

Previously unvalidated assumptions MUST NOT silently become facts in later sessions. The system MUST
either re-validate assumptions or explicitly mark them as stale/uncertain.

---

## Driven by

- **PROB-003**: No durable epistemic state (facts, hypotheses, unknowns)
- **PROB-008**: Hallucination and assumption drift are not mechanically prevented

**Rationale:** Session continuity is useless if assumptions from session N become unquestioned
"background truth" in session N+1. This is assumption drift and leads to incorrect decisions based
on stale or never-validated guesses.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: State schema must mark assumptions with validation status

---

## Measurable fit criteria

- Assumptions carry a "validated" flag
- Assumptions from prior session are checked on resumption
- Stale assumptions are either revalidated or marked as uncertain
- System does not treat unvalidated assumptions as facts without explicit user/agent review

---

## Verification method

- **Assumption tracking**: Create assumption → pause session → resume → verify assumption is flagged
  for review
- **Staleness detection**: Create assumption → wait (or mock time) → resume → verify system asks for
  revalidation
- **Rejection of stale assumptions**: Verify that stale assumptions cannot be used as premises for
  new work without approval

---

## See also

[REQ-ORCH-EPISTEMIC-001](REQ-ORCH-EPISTEMIC-001.md),
[REQ-ORCH-EPISTEMIC-002](REQ-ORCH-EPISTEMIC-002.md), [REQ-ORCH-DRIFT-001](REQ-ORCH-DRIFT-001.md)
