# REQ-OBS-001: Chain of responsibility

**Status:** Proposed

---

## Statement (MUST form)

For any output or decision, the chain of responsibility MUST be clear: which agents ran, in what
order, using what evidence and tools. Chain MUST be auditable and queryable.

---

## Driven by

- **PROB-031**: Orchestration is a black box (insufficient observability for diagnosis)
- **PROB-016**: Debugging agent behavior requires tracing through model calls without introspection

**Rationale:** When things go wrong, we must trace them back. Chain of responsibility is the audit
trail.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Graph structure encodes agent execution order

---

## Measurable fit criteria

- Execution graph shows agents in order
- Each agent's inputs (evidence, facts) are logged
- Each agent's outputs are logged
- Tool calls are attributed to agents
- Chain is queryable (e.g., "what led to decision D?")

---

## Verification method

- **Traceability test**: Pick output → trace back through chain to source
- **Completeness test**: All agents, tools, inputs are logged
- **Query test**: Query system for chain → get full picture
- **Attribution test**: Verify no ambiguity about which agent did what

---

## See also

[REQ-OBS-002](REQ-OBS-002.md), [REQ-OBS-003](REQ-OBS-003.md), [REQ-TOOLS-002](REQ-TOOLS-002.md)
