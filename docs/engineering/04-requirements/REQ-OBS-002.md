# REQ-OBS-002: Failure mode diagnosis

**Status:** Proposed

---

## Statement (MUST form)

When orchestration fails (agent error, tool failure, test failure, contradiction), the system MUST
provide diagnostics: what failed, why (if known), where in the graph, and what evidence is
available.

---

## Driven by

- **PROB-031**: Orchestration is a black box (insufficient observability for diagnosis)
- **PROB-016**: Debugging agent behavior requires tracing through model calls without introspection

**Rationale:** Without diagnostics, failures are mysteries. Good diagnostics enable recovery.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Graph structure provides diagnostic information

---

## Measurable fit criteria

- Failure type is categorized (agent error, tool failure, assertion failure, etc.)
- Failure context is logged (what the agent was doing, what state it was in)
- Error messages are clear and actionable
- Debugging information is available to user/agent (not hidden)

---

## Verification method

- **Error test**: Create failure; verify diagnostic info is logged
- **Clarity test**: User sees enough info to debug
- **Categorization test**: Verify failure type is correct
- **Actionability test**: Verify user/agent can determine next step from diagnostic

---

## See also

[REQ-OBS-001](REQ-OBS-001.md), [REQ-OBS-003](REQ-OBS-003.md)
