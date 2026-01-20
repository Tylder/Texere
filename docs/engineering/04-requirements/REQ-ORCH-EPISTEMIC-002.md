# REQ-ORCH-EPISTEMIC-002: Epistemic state durability

**Status:** Proposed

---

## Statement (MUST form)

Changes in epistemic state (belief reversals, unknowns resolved, assumptions invalidated, new
constraints discovered) MUST be recorded when they occur, with timestamp and rationale for the
change.

---

## Driven by

- **PROB-003**: No durable epistemic state (facts, hypotheses, unknowns)
- **PROB-004**: The agent cannot behave like it has deep, accurate historical knowledge

**Rationale:** Without a history of how beliefs changed, the system cannot explain why a prior
decision was made or what evidence contradicted it. This prevents learning and forces repeated
investigation.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Checkpoint system must preserve full change history

---

## Measurable fit criteria

- Every state change is timestamped
- Every state change includes rationale (what evidence caused the change?)
- State history is immutable (append-only; no rewrites)
- State at any prior point in time can be reconstructed

---

## Verification method

- **Change audit**: Make a belief change; verify it's logged with timestamp and rationale
- **History reconstruction**: Query state at prior timestamp; verify correctness
- **Immutability test**: Attempt to edit past change; should fail or create new entry
- **Rationale requirement**: Verify that every change has documented reason

---

## See also

[REQ-ORCH-EPISTEMIC-001](REQ-ORCH-EPISTEMIC-001.md),
[REQ-ORCH-EPISTEMIC-003](REQ-ORCH-EPISTEMIC-003.md), [REQ-ORCH-HISTORY-001](REQ-ORCH-HISTORY-001.md)
