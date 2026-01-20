# REQ-TOOLS-002: Tool output attribution

**Status:** Proposed

---

## Statement (MUST form)

Tool outputs MUST remain retrievable and attributed for later steps and sessions. Tool outputs MUST
NOT vanish into chat history or become inaccessible.

---

## Driven by

- **PROB-005**: Tooling interoperability is unreliable (MCP tools and beyond)
- **PROB-009**: Lack of auditable history and decision traceability

**Rationale:** If tool output is lost, the grounding is lost. Attribution ensures we can trace
decisions back to tool output that justified them.

---

## Measurable fit criteria

- Tool output is stored in epistemic state with timestamp and tool ID
- Tool output can be queried in later sessions
- Decision rationale links to tool output
- Tool output cannot be accidentally deleted

---

## Verification method

- **Storage test**: Run tool → verify output is stored
- **Retrieval test**: Later session → query tool output → verify output appears
- **Attribution test**: Decision references tool output → trace back to tool
- **Durability test**: Attempt to delete tool output → verify it's protected

---

## See also

[REQ-TOOLS-001](REQ-TOOLS-001.md), [REQ-ORCH-HISTORY-002](REQ-ORCH-HISTORY-002.md)
