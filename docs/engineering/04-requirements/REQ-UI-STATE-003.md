# REQ-UI-STATE-003: Open items visibility

**Status:** Proposed

---

## Statement (MUST form)

Open work items (unknowns, pending decisions, risks, flagged issues) MUST remain continuously
visible and persist until explicitly resolved or dismissed. Items MUST NOT disappear from attention
due to session boundaries or scroll-away.

---

## Driven by

- **PROB-027**: Open work (todos, unknowns, decisions) is not continuously visible

**Rationale:** If open items disappear, work is forgotten. The UI must make open items part of the
persistent state, not ephemeral chat messages.

---

## Constrained by

- **ADR-ui-react-webapp**: React component model must support persistent open items panel

---

## Measurable fit criteria

- Open items are displayed in a persistent panel (not buried in chat)
- Open items survive page reload
- Open items survive session boundaries
- Items can be marked complete/dismissed
- Dismissed items do not reappear without user action

---

## Verification method

- **Persistence test**: Create open item → reload page → verify item still visible
- **Session test**: Create open item → end session → resume → verify item appears
- **Completion test**: Mark item complete → verify it moves to completed list, not deleted
- **Re-appearance test**: Dismiss item → verify it does not reappear unless explicitly recreated

---

## See also

[REQ-UI-STATE-001](REQ-UI-STATE-001.md), [REQ-UI-STATE-004](REQ-UI-STATE-004.md),
[REQ-ORCH-SESSION-003](REQ-ORCH-SESSION-003.md)
