# REQ-ORCH-EPISTEMIC-001: Epistemic state separation

**Status:** Proposed

---

## Statement (MUST form)

The system MUST maintain a durable, machine-readable separation between facts, hypotheses,
assumptions, unknowns, and constraints. These categories MUST NOT blur or convert between types
(e.g., assumptions must not silently become facts).

---

## Driven by

- **PROB-003**: No durable epistemic state (facts, hypotheses, unknowns)
- **PROB-008**: Hallucination and assumption drift are not mechanically prevented

**Rationale:** If the system cannot distinguish what it knows from what it guesses, it will treat
guesses as facts, leading to incorrect decisions and compounding errors. Explicit separation is the
foundation for avoiding hallucination and drift.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: State schema must encode epistemic categories as distinct
  types

---

## Measurable fit criteria

- Each fact, hypothesis, assumption, unknown, and constraint has an explicit type marker
- Type is immutable for the lifetime of the item (conversion to new type creates new item with
  traceability)
- System can query "all facts", "all hypotheses", "all unknowns" without ambiguity
- Queries return no cross-category pollution

---

## Verification method

- **Type test**: Create item of each type; verify type is stored and retrievable
- **Immutability test**: Attempt to change type; should fail or create new item with link to old
- **Query test**: Query each category; verify no cross-pollution
- **Audit test**: Sample epistemic state; classify each item manually; compare to system
  classification

---

## See also

[REQ-ORCH-SESSION-002](REQ-ORCH-SESSION-002.md),
[REQ-ORCH-EPISTEMIC-002](REQ-ORCH-EPISTEMIC-002.md),
[REQ-ORCH-EPISTEMIC-003](REQ-ORCH-EPISTEMIC-003.md)
