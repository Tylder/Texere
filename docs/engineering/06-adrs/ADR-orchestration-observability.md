# ADR-orchestration-observability: Development-first observability strategy for LangGraph

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR and supersede this one.

**Quick Summary:** We will use LangGraph Studio for comprehensive development-time debugging and
graph introspection, supplemented by native LangGraph visualization (`draw_mermaid_png()`,
`get_graph()`). We skip LangSmith (commercial) and costly production tracing, because our primary
observability need is dev-time understanding of orchestration behavior. Production uses basic
logging; we add Langfuse or production tracing only if/when prod debugging becomes critical. This
resolves the graph-inspection trade-off in ADR-orchestration-langgraph-ts by prioritizing
development visibility over production observability.

---

## Quick Navigation

| Section                                             | Purpose                   | Read if...                                |
| --------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [Context](#context)                                 | Why we needed to decide   | You're choosing observability tooling     |
| [Decision](#decision)                               | What we chose             | You're implementing debugging/tracing     |
| [Alternatives Considered](#alternatives-considered) | What we rejected          | You disagree or want different trade-offs |
| [Rationale](#rationale)                             | Why this is better        | You need the full reasoning               |
| [Consequences](#consequences)                       | Positive/negative impacts | You're assessing cost/benefit             |

---

## References

**Driven by:**

- ADR-orchestration-langgraph-ts: Resolves the "graph-inspection trade-off (CRITICAL)" and open
  questions about observability strategy
- PROBDEF-ai-coding-system: PROB-031 (Orchestration is a black box), PROB-016 (No operationally
  testable definition of "healthy" behavior)
- REQ-OBS-004: LangGraph orchestration MUST be introspectable for debugging and analysis
- User priority: Development-time visibility >> production tracing

**Addressed by:** (TBD: SPEC for orchestration debugging and tracing)

**Supersedes:** N/A (new decision)

---

## Context

ADR-orchestration-langgraph-ts flagged a critical trade-off: LangGraph's advanced graph
visualization and inspection capabilities are primarily available through **LangSmith**, a
commercial service. This creates tension:

- **Requirement (REQ-OBS-004):** Graph structure, execution path, and node states MUST be visible
  for debugging and analysis
- **Constraint (open-source preference):** Avoid vendor lock-in and commercial dependencies
- **Reality:** LangSmith is powerful but not free; alternatives exist but with different trade-offs

**Key insight:** The user's actual observability need is **primarily for development and
debugging**, not continuous production monitoring. This changes the analysis: production can use
lightweight logging; development needs deep introspection.

Available tools:

1. **LangGraph Studio** — LangChain's native IDE for LangGraph debugging (free, built-in)
   - Time-travel debugging
   - Visual graph inspection
   - State/thread management
   - Live execution monitoring

2. **Native LangGraph visualization** — Built-in graph rendering
   - `draw_mermaid_png()` — Graph diagrams for documentation
   - `get_graph()` — Programmatic graph access
   - Graphviz integration

3. **LangSmith** — Commercial observability platform (optional)
   - Production traces ($0.50–$5 per 1k traces)
   - Persistent evaluation and regression tracking
   - Shared team dashboards
   - Not needed for dev-time debugging

4. **Langfuse** — Open-source observability (optional, future)
   - Self-hostable
   - LangGraph integration
   - Production tracing without vendor lock-in

---

## Decision

**We will prioritize development-time visibility using LangGraph Studio and native visualization,
skip LangSmith, and defer production tracing.**

Specifics:

- **Development:** Use **LangGraph Studio** as the primary debugging tool
  - Run graph locally with Studio for full introspection
  - Visualize execution paths, node states, and state transitions
  - Time-travel through execution steps to diagnose issues

- **Documentation & design:** Use native **`draw_mermaid_png()` and `get_graph()`** to generate
  graph diagrams for documentation and architecture discussion

- **Production:** Use **basic logging** (stdout, file logs) for runtime diagnostics
  - No persistent cloud tracing by default
  - No LangSmith subscription required
  - Option: Add Langfuse (open-source) if production introspection becomes critical

- **Reconsideration trigger:** If production issues become hard to diagnose without traces, evaluate
  Langfuse (open-source, self-hostable) before considering LangSmith

---

## Alternatives Considered

### A) Use LangSmith for both dev and prod

- **Pro:** Unified observability; powerful tracing and evaluation; shared team dashboards
- **Pro:** Excellent for production regression detection
- **Con:** Costs money ($0.50+ per 1k traces); vendor lock-in
- **Con:** Overkill for development where Studio is already sufficient
- **Why not:** Unnecessary cost given that dev needs are met by Studio; production needs haven't
  materialized yet

### B) Build custom observability layer

- **Pro:** Full control; no vendor dependencies; tailored to our epistemic state model
- **Con:** Significant engineering effort; duplicate work; introduces new debugging burden
- **Why not:** LangGraph Studio + native tools already provide what we need

### C) Use Langfuse from the start (for prod tracing)

- **Pro:** Open-source; self-hostable; avoids vendor lock-in
- **Pro:** Good for future production visibility if needed
- **Con:** Adds operational overhead (self-hosting); complexity during development phase
- **Why not:** Premature; defer until production observability becomes a real need

### D) Skip observability entirely; use logs only

- **Pro:** Minimal dependencies; simplest approach
- **Con:** Studio + visualization are "free" with LangGraph; skipping them means losing dev insights
- **Why not:** Would be false economy; LangGraph Studio is built-in and provides significant value

---

## Rationale

This decision directly solves the observability trade-off by **separating concerns:**

1. **Development observability is solved by LangGraph Studio (free, built-in)**
   - Time-travel debugging removes need for external tracing tools
   - Visual inspection satisfies REQ-OBS-004 during dev
   - No vendor lock-in; no cost

2. **Production observability deferred until it's a real need**
   - Current priority is building the system correctly, not monitoring it at scale
   - When prod visibility becomes important, Langfuse (open-source) is a clear path
   - Avoids speculative architecture

3. **Native visualization serves documentation and design purposes**
   - `draw_mermaid_png()` produces diagrams for specs, architecture reviews, and handoff
   - Keeps graph structure visible without external dependencies

4. **Aligns with actual workflow**
   - Most time is spent developing/debugging orchestration
   - Production issues are secondary until the system reaches stability
   - This prioritizes developer experience, which is the actual constraint

---

## Consequences

### Positive

- **No observability cost** during development or early production
- **Development velocity** increases: Studio provides rich debugging without setup friction
- **Open-source / no vendor lock-in** for development workflow
- **Native tools** reduce dependencies and external integrations
- **Diagrams and documentation** are auto-generated from graph structure
- **Clear upgrade path** to Langfuse (or LangSmith) when production tracing becomes valuable

### Negative

- **Limited production visibility** initially (logs only, no persistent traces)
- **Will require re-evaluation** if production issues become hard to diagnose
- **No shared team dashboards** (Studio is local/developer tool)
- **No automatic regression detection** (if that becomes important later)
- **Learning curve:** Team must become proficient with Studio, not just LangSmith

### Requires

- **Training on LangGraph Studio:** Documentation and examples for team on how to use Studio for
  debugging
- **Logging infrastructure:** Simple but effective production logging strategy (files, stdout,
  structured format)
- **Future ADR if needed:** If/when production tracing becomes critical, decide between Langfuse
  (open) and LangSmith (commercial)

---

## Known Issues / Open Questions

1. **Production regressions:** What happens if a change to orchestration logic causes subtle bugs in
   production that are hard to diagnose without traces? Decision: evaluate Langfuse before
   LangSmith.

2. **Team scale:** If the team grows and needs shared observability dashboards, current approach
   doesn't support that. Decision: revisit if team scales beyond solo developer.

3. **Graph schema evolution:** When orchestration changes, how do we understand past execution
   paths? Logs + Studio can replay on new code, but historical introspection is limited. Decision:
   document graph schema changes in PROB-022 (Knowledge schema evolution).

---

## Decision Log

- **Decided:** 2026-01-21
- **Context:** Resolving graph-inspection trade-off from ADR-orchestration-langgraph-ts
- **Reasoning:** Development visibility >> production monitoring for current project phase
- **Trigger for reconsideration:** Production debugging becomes critical; team scale grows; need for
  regression tracking becomes clear

---

## Troubleshooting

**Q: The graph changed and I can't understand old execution traces**

- A: This is inherent to development-first approach. Document schema changes. If production tracing
  becomes critical, migrate to Langfuse.

**Q: We need to share execution traces with other team members**

- A: Studio is local. If team collaboration on traces becomes essential, this is a trigger to
  evaluate Langfuse or LangSmith.

**Q: A production issue is hard to diagnose without persistent traces**

- A: This is the trigger to evaluate Langfuse (open-source) or LangSmith (commercial). Evaluate
  which aligns better with project values.

**Q: How do I generate documentation diagrams of the graph?**

- A: Use `draw_mermaid_png()` or `get_graph()` to export diagrams. Integrate into SPEC and ADR
  documentation.
