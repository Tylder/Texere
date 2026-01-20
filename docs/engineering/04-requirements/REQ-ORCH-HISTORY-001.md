# REQ-ORCH-HISTORY-001: Decision history retrieval

**Status:** Proposed

---

## Statement (MUST form)

Prior decisions and their rationale MUST be retrievable by the system and used to guide current
work, preventing repetition of rejected ideas and maintaining consistency with established
constraints.

---

## Driven by

- **PROB-004**: The agent cannot behave like it has deep, accurate historical knowledge
- **PROB-009**: Lack of auditable history and decision traceability

**Rationale:** If the system cannot retrieve and apply prior decisions, it repeats rejected
approaches and ignores established constraints. This wastes effort and creates inconsistency.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Graph structure must encode decision history and be queryable

---

## Measurable fit criteria

- Decision history can be queried (e.g., "what decisions have we made about authentication?")
- Rationale for each decision is stored and retrievable
- System can retrieve "we rejected approach X because Y"
- Rejected approaches are not suggested again without new evidence

---

## Verification method

- **Query test**: Make decision → query history → verify decision and rationale appear
- **Rejection test**: Reject approach A; verify system does not suggest A again without new evidence
  or user override
- **Consistency test**: Make decision D1; make decision D2 that contradicts D1; system flags
  inconsistency

---

## See also

[REQ-ORCH-HISTORY-002](REQ-ORCH-HISTORY-002.md), [REQ-ORCH-DRIFT-001](REQ-ORCH-DRIFT-001.md)
