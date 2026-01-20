# REQ-OBS-003: Divergence visibility

**Status:** Proposed

---

## Statement (MUST form)

When evidence, constraints, and outputs diverge (e.g., code change contradicts facts, plan
contradicts constraints), the divergence MUST be visible before large work accumulates.

---

## Driven by

- **PROB-031**: Orchestration is a black box (insufficient observability for diagnosis)
- **PROB-014**: Weakness hunting and challenge by external signal is not composable in the system

**Rationale:** If divergences are hidden, work builds on wrong assumptions. Early visibility
prevents wasted effort.

---

## Measurable fit criteria

- Divergences are detected automatically
- Divergences are surfaced with: what diverged, where, why
- User/agent is prompted to resolve before proceeding
- Divergence resolution is logged

---

## Verification method

- **Detection test**: Create divergence → verify system detects it
- **Surfacing test**: Divergence is presented clearly
- **Blocking test**: System requires resolution before proceeding
- **Logging test**: Divergence and resolution are recorded

---

## See also

[REQ-OBS-001](REQ-OBS-001.md), [REQ-ORCH-DRIFT-001](REQ-ORCH-DRIFT-001.md)
