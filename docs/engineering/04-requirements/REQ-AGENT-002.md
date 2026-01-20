# REQ-AGENT-002: Compliance assurance

**Status:** Proposed

---

## Statement (MUST form)

Core correctness (tool use, phase discipline, epistemic separation) MUST be guaranteed by system
architecture, not by agent compliance. Violations MUST be detectable and surfaceable.

---

## Driven by

- **PROB-017**: System reliability depends on agent compliance (tools, policies, phase discipline)

**Rationale:** Perfect agent behavior is impossible. System must be robust under agent
forgetfulness.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Orchestration must enforce policy, not trust agent

---

## Measurable fit criteria

- Violations are detected (tool not used when required, phase violated, epistemic categories
  blurred)
- Violations are surfaced to user/agent
- System does not proceed past violation without explicit approval
- Violations are logged for analysis

---

## Verification method

- **Violation detection**: Intentionally violate policy → verify system detects
- **Surfacing test**: Violation is presented to user
- **Blocking test**: System does not proceed without approval
- **Audit test**: Violations are logged

---

## See also

[REQ-AGENT-001](REQ-AGENT-001.md), [REQ-TOOLS-001](REQ-TOOLS-001.md)
