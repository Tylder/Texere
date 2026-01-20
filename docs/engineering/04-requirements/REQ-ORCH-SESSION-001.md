# REQ-ORCH-SESSION-001: Session state persistence

**Status:** Proposed

---

## Statement (MUST form)

Session state, including all epistemic state (facts, hypotheses, unknowns, constraints, decisions,
and their rationale), MUST persist across user sessions and support task resumption without loss of
context.

---

## Driven by

- **PROB-001**: Session resets force repo research from scratch
- **PROB-034**: Task interruption and resumability failures cause repeated work
- **PROB-010**: No safe separation between "current baseline" and historical record

**Rationale:** These three problems stem from a shared root cause: when sessions end, the system's
state is lost. Users must re-establish what was known, what was tried, and what remains unknown.
This requirement ensures that session boundaries do not cause work loss or repeated discovery.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: LangGraph checkpoint system must store and restore full state

**Rationale:** We committed to LangGraph. Its checkpoint mechanism must be capable of preserving
complete epistemic state. If we later discover checkpoints are insufficient, we must either extend
the schema or reconsider the orchestration choice.

---

## Measurable fit criteria

- A paused 4-hour task can be resumed 24 hours later with full context
- Resume context includes: prior decisions, their rationale, unknowns at pause time, next safe steps
- User can determine the next step without re-reading chat history or re-running prior analyses
- Checkpoints are captured at logical breakpoints (end of research phase, decision point, task
  pause)

---

## Verification method

- **Integration test**: Create task → collect state → pause → wait 24h → resume → verify state
  equals or improves on stored state
- **User experience test**: Measure time to re-orient after resumption (goal: < 5 minutes for 4h
  task)
- **Checkpoint audit**: Verify checkpoints contain: task status, epistemic state, execution history,
  next actions

---

## See also

[REQ-ORCH-SESSION-002](REQ-ORCH-SESSION-002.md), [REQ-ORCH-SESSION-003](REQ-ORCH-SESSION-003.md),
[REQ-ORCH-EPISTEMIC-001](REQ-ORCH-EPISTEMIC-001.md), [REQ-OBS-001](REQ-OBS-001.md)
