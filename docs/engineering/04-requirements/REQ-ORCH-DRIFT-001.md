# REQ-ORCH-DRIFT-001: Drift detection

**Status:** Proposed

---

## Statement (MUST form)

The system MUST detect and surface belief drift: contradictions between current and prior work,
reversals of decisions without explanation, or changes in constraints that invalidate prior work.

---

## Driven by

- **PROB-004**: The agent cannot behave like it has deep, accurate historical knowledge
- **PROB-008**: Hallucination and assumption drift are not mechanically prevented

**Rationale:** Without drift detection, the system silently contradicts itself. Users and agents
proceed unaware that the foundation has shifted. Explicit drift signals allow correction before
compounding errors.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: State comparison logic must be built into orchestration

---

## Measurable fit criteria

- Contradictions between current and prior beliefs are detected automatically
- Drift is surfaced with: what changed, when, why (if known)
- System does not proceed with contradictory beliefs without explicit user/agent acknowledgment
- False positives (harmless re-exploration) can be dismissed by user

---

## Verification method

- **Contradiction test**: Make statement A → later make contradictory statement B → verify system
  flags drift
- **Surfacing test**: Drift is surfaced to user and agent
- **Resolution test**: Verify system requires explicit acknowledgment before proceeding past drift
- **False positive test**: User can dismiss benign re-exploration without penalty

---

## See also

[REQ-ORCH-EPISTEMIC-001](REQ-ORCH-EPISTEMIC-001.md),
[REQ-ORCH-HISTORY-001](REQ-ORCH-HISTORY-001.md), [REQ-OBS-003](REQ-OBS-003.md)
