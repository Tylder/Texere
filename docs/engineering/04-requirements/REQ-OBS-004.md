# REQ-OBS-004: Graph introspection

**Status:** Proposed

---

## Statement (MUST form)

LangGraph orchestration MUST be introspectable: the graph structure, execution path, and node states
MUST be visible for debugging and analysis. Introspection tool MUST be available and usable.

---

## Driven by

- **PROB-031**: Orchestration is a black box (insufficient observability for diagnosis)

**Rationale:** This REQ directly addresses the LangSmith trade-off identified in
ADR-orchestration-langgraph-ts. We need to know what option to pick (LangSmith commercial vs. custom
vs. open-source).

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: LangGraph's graph-inspection depends on LangSmith or custom
  tooling

---

## Measurable fit criteria

- Graph structure can be queried (nodes, edges, conditional logic)
- Execution history is visible (which nodes ran, in order, with what inputs/outputs)
- Node state is inspectable
- Introspection tool is usable without proprietary services (or LangSmith cost is accepted)

---

## Verification method

- **Query test**: Query graph structure → verify nodes and edges appear
- **History test**: View execution history → verify path and states are clear
- **Usability test**: Tool is discoverable and straightforward to use
- **Cost test**: Verify solution (LangSmith/custom/open-source) is acceptable

---

## See also

[REQ-OBS-001](REQ-OBS-001.md), [REQ-OBS-002](REQ-OBS-002.md)
