# REQ-UI-STATE-001: Current state visibility

**Status:** Proposed

---

## Statement (MUST form)

Current system state (beliefs, decisions, open items, execution status) MUST be externally visible
and inspectable without reading conversation history. State MUST be presented in a scannable,
structured format.

---

## Driven by

- **PROB-025**: Current system state is not externally visible or inspectable
- **PROB-026**: No canonical, user-visible "current understanding" baseline

**Rationale:** If users must read conversation history to understand what the system believes, state
visibility has failed. The UI must present state as structured, scannable data.

---

## Constrained by

- **ADR-ui-react-webapp**: React component architecture must support real-time state display

---

## Measurable fit criteria

- State is presented in structured format (not narrative text)
- State is scannable (organized by category: facts, decisions, unknowns, risks)
- User can see state in < 10 seconds without scrolling conversation
- State is updated in real-time as orchestration progresses

---

## Verification method

- **UI test**: Open app; assess time to understand current state
- **Scannability test**: User can identify key facts, decisions, and unknowns without reading text
- **Update test**: Change state in backend; verify frontend updates within 2 seconds
- **Structure audit**: Verify state is organized logically (not a dump of all data)

---

## See also

[REQ-UI-STATE-002](REQ-UI-STATE-002.md), [REQ-UI-STATE-003](REQ-UI-STATE-003.md),
[REQ-API-002](REQ-API-002.md)
