# REQ-EXEC-003: Belief update on failure

**Status:** Proposed

---

## Statement (MUST form)

Failed executions MUST update system beliefs about code state, assumptions, and next steps. System
MUST NOT treat failures as temporary noise; failures are data about what is wrong.

---

## Driven by

- **PROB-013**: Execution results are not reliably incorporated
- **PROB-008**: Hallucination and assumption drift are not mechanically prevented

**Rationale:** If failures don't update beliefs, the system proceeds from invalid assumptions and
will fail the same way repeatedly.

---

## Measurable fit criteria

- Failure type is categorized (type error, logic error, missing dependency, etc.)
- Root assumption is identified (e.g., "assumed API v2, but v1 is present")
- Beliefs are updated (facts about code state, assumptions)
- Next attempt reflects updated beliefs (not the same incorrect approach)

---

## Verification method

- **Update test**: Execution fails → verify epistemic state reflects failure
- **Root cause**: Test failure → verify system identifies root cause
- **Belief correction**: Verify next attempt does not make same mistake
- **Learning test**: Multiple similar failures → verify system adapts (not repeats same error)

---

## See also

[REQ-EXEC-001](REQ-EXEC-001.md), [REQ-ORCH-EPISTEMIC-002](REQ-ORCH-EPISTEMIC-002.md)
