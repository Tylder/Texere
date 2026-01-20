# REQ-AGENT-001: Phase boundary enforcement

**Status:** Proposed

---

## Statement (MUST form)

Phase boundaries (discovery → requirements → implementation) MUST be enforced by the system, not by
agent memory. System MUST prevent premature commitment (e.g., implementation before unknowns are
resolved).

---

## Driven by

- **PROB-017**: System reliability depends on agent compliance (tools, policies, phase discipline)
- **PROB-011**: Discovery, requirements, and implementation blur together

**Rationale:** Agents proceed under momentum. System must enforce phases mechanically, not rely on
agent discipline.

---

## Measurable fit criteria

- Discovery phase: requirements cannot be locked until unknowns are closed
- Requirements phase: implementation cannot start until requirements are approved
- Implementation phase: code cannot be committed until tests pass
- Phase transitions are explicit and logged

---

## Verification method

- **Boundary test**: Attempt to implement before requirements locked → verify system blocks
- **Transition test**: Complete discovery → system flags "ready for requirements"
- **Logging test**: Phase transitions are recorded in state history

---

## See also

[REQ-AGENT-002](REQ-AGENT-002.md), [REQ-TOOLS-001](REQ-TOOLS-001.md)
