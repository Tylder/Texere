# REQ-UI-STATE-004: Session delta surfacing

**Status:** Proposed

---

## Statement (MUST form)

State changes across sessions MUST be clearly summarized so users can quickly re-orient. The summary
MUST include: what changed (new decisions, resolved unknowns, new risks), when it changed, and why.

---

## Driven by

- **PROB-030**: State changes across sessions are not clearly surfaced to the user
- **PROB-027**: Open work (todos, unknowns, decisions) is not continuously visible

**Rationale:** Without explicit session deltas, users re-read long history or miss important
changes. A clear summary enables quick re-orientation.

---

## Constrained by

- **ADR-ui-react-webapp**: UI must display session summary on re-entry

---

## Measurable fit criteria

- On session resume, a "what changed" summary is displayed first
- Summary is scannable (not prose; use bullets and structure)
- User can re-orient in < 5 minutes
- Summary includes: decisions made, unknowns resolved, new risks, execution results

---

## Verification method

- **Summary test**: Pause session → change state → resume → verify summary appears
- **Scannability test**: User can understand changes in < 5 minutes
- **Completeness test**: Verify major state changes are all included
- **Accuracy test**: Compare summary to actual changes; no contradictions or omissions

---

## See also

[REQ-UI-STATE-003](REQ-UI-STATE-003.md), [REQ-ORCH-SESSION-001](REQ-ORCH-SESSION-001.md)
