# REQ-ORCH-SESSION-003: Resumption clarity

**Status:** Proposed

---

## Statement (MUST form)

When a task is resumed, the system MUST communicate the next safe action clearly, including what was
completed, what remains, what is blocked, and what verification is needed before proceeding.

---

## Driven by

- **PROB-034**: Task interruption and resumability failures cause repeated work
- **PROB-027**: Open work (todos, unknowns, decisions) is not continuously visible

**Rationale:** Resumability without clarity is useless. A user returning to a paused task needs to
know immediately where they left off and what the next step is. Otherwise they re-read history,
re-run prior steps, or guess incorrectly.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Graph structure must encode task state transitions clearly

---

## Measurable fit criteria

- Next action is explicit (not ambiguous)
- Completed work is listed
- Remaining work is listed
- Blockers are identified
- Verification requirements are stated
- User can act within 2 minutes of resumption without re-reading history

---

## Verification method

- **User test**: Pause task, resume, measure time to understand next action (goal: < 2 min)
- **Clarity audit**: Review resume context for: completed items, remaining items, blockers, next
  step
- **Decision tree test**: Next action should be unambiguous (if/else clear, not "try different
  approaches")

---

## See also

[REQ-ORCH-SESSION-001](REQ-ORCH-SESSION-001.md), [REQ-UI-STATE-003](REQ-UI-STATE-003.md),
[REQ-UI-STATE-004](REQ-UI-STATE-004.md)
