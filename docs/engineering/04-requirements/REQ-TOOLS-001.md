# REQ-TOOLS-001: Tool usage consistency

**Status:** Proposed

---

## Statement (MUST form)

When a tool can provide evidence for a decision (e.g., repo search tool before editing), it MUST be
used consistently across sessions and model changes. Tool usage MUST NOT depend on agent memory or
whim.

---

## Driven by

- **PROB-017**: System reliability depends on agent compliance (tools, policies, phase discipline)
- **PROB-005**: Tooling interoperability is unreliable (MCP tools and beyond)

**Rationale:** Agents forget to use tools. If tool usage is optional, different agents use them
differently. This creates unreliable grounding.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Orchestration must enforce tool use as part of workflow

---

## Measurable fit criteria

- Tool is used when needed (not optional)
- Tool usage is consistent across agents and sessions
- Tool output is incorporated into state (not discarded)
- System does not proceed without tool output when tool is required

---

## Verification method

- **Consistency test**: Run same task multiple times; verify tool is used each time
- **Session test**: Tool is used in session 1 and session 2 consistently
- **Model test**: Tool is used regardless of model chosen
- **Non-negotiable test**: System cannot proceed without tool output when required

---

## See also

[REQ-TOOLS-002](REQ-TOOLS-002.md), [REQ-AGENT-002](REQ-AGENT-002.md)
