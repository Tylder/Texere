# ADR-orchestration-langgraph-ts: Use LangGraph TS for orchestration

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR and supersede this one.

**Quick Summary:** We chose LangGraph TS for orchestration because it provides explicit, resumable
state management and multi-agent coordination primitives needed to solve session continuity
(PROB-001, PROB-034) and epistemic state durability (PROB-003, PROB-010). We accept vendor lock-in
and graph-inspection trade-offs.

---

## Quick Navigation

| Section                                             | Purpose                   | Read if...                                   |
| --------------------------------------------------- | ------------------------- | -------------------------------------------- |
| [Context](#context)                                 | Why we needed to decide   | You're unfamiliar with orchestration choices |
| [Decision](#decision)                               | What we chose             | You're implementing or understanding this    |
| [Alternatives Considered](#alternatives-considered) | What we rejected          | You disagree or want trade-offs              |
| [Rationale](#rationale)                             | Why this is better        | You need the full reasoning                  |
| [Consequences](#consequences)                       | Positive/negative impacts | You're assessing cost/benefit                |

---

## References

**Driven by:**

- PROBDEF-ai-coding-system: PROB-001 (Session resets), PROB-003 (No epistemic state), PROB-010 (No
  safe separation of baseline/history), PROB-017 (System reliability on compliance), PROB-034 (Task
  interruption/resumability)
- User intent: Multi-session continuity is non-negotiable

**Implemented by:** (TBD: SPEC for orchestration architecture)

---

## Context

The AI coding system must handle:

1. **Session resets** (PROB-001): Agent work spans days; state cannot be lost on session boundaries
2. **Resumability** (PROB-034): Long tasks must pause/resume without re-running prior work
3. **Durable epistemic state** (PROB-003, PROB-010): Facts, hypotheses, unknowns, and decisions must
   survive sessions
4. **Multi-agent coordination** (PROB-020): Multiple specialized agents (research, planning,
   execution) need explicit handoff without silent conflicts

Orchestration must be:

- **Explicit**: State transitions visible, debuggable, auditable
- **Resumable**: Any node in the workflow can be paused and resumed with full context
- **Stateful**: Not merely a sequence of function calls, but a graph with checkpoints
- **Observable**: We must be able to see what happened and why (for PROB-031)

We also wanted to avoid building orchestration from scratch, which would consume effort better spent
on domain logic.

---

## Decision

**We will use LangGraph TypeScript (TS) for orchestration.**

Specifics:

- LangGraph for state machine definition and execution
- TypeScript as the implementation language (consistent with React UI)
- LangGraph's checkpoint/persistence system for resumability
- LangGraph's routing and conditional logic for agent coordination
- Graph serialization for durable history and debugging

---

## Alternatives Considered

### A) Custom orchestration engine

- **Pro:** Full control over design, no vendor lock-in, tailored to our needs
- **Con:** 6–12 months of engineering; orchestration is complex (state management, checkpoints, tool
  calling, error recovery); high debugging burden; we solve a solved problem
- **Why not:** High opportunity cost; leverage existing ecosystem instead

### B) LangChain agents (without LangGraph)

- **Pro:** Simpler, lighter-weight, easier to learn
- **Con:** Stateless by design; no explicit checkpoints; resumability requires custom wrapping; less
  suitable for multi-session continuity; multi-agent coordination less explicit
- **Why not:** Doesn't adequately solve PROB-001 and PROB-034

### C) Mastra

- **Pro:** Newer, lighter-weight alternative to LangGraph; potentially simpler mental model
- **Con:** Smaller ecosystem, less mature, fewer examples; still evaluating capabilities around
  resumability and introspection
- **Why not:** Less proven; LangGraph is the more established choice for complex orchestration

### D) AutoGen (Microsoft)

- **Pro:** Excellent for true multi-agent scenarios with explicit roles and capabilities
- **Con:** Harder to customize, less integrated with LangChain/tool ecosystem, steeper learning
  curve
- **Why not:** Over-engineered for our use case; LangGraph's routing is simpler and sufficient

---

## Rationale

LangGraph directly solves our core problems:

1. **Resumability (PROB-034):** LangGraph's checkpoint system lets you pause at any node, persist
   state, and resume later with full context. This is built-in, not retrofitted.

2. **Session continuity (PROB-001):** State is explicit and versioned. Each agent run produces a
   snapshot; sessions can load prior state and continue from there.

3. **Durable epistemic state (PROB-003, PROB-010):** The graph _is_ the epistemic state:
   - Nodes represent discrete investigation steps or decisions
   - Edges represent valid transitions
   - Node outputs become part of durable state
   - Historical graphs remain readable for audit and analysis

4. **Multi-agent coordination (PROB-020):** LangGraph's routing and conditional logic make agent
   handoffs explicit:
   - Conflicts surface as routing decisions
   - Output from agent A becomes input to agent B
   - No silent merging of contradictory conclusions

5. **Observability (PROB-031):** Graph structure is introspectable; you can see the exact path a
   task took, which agents ran, what each produced.

6. **Team alignment:** TypeScript keeps UI and orchestration in the same language, reducing
   cognitive load.

---

## Consequences

### Positive

- **Explicit state:** Every orchestration decision is visible in graph structure
- **Built-in resumability:** Checkpoints are first-class; no custom serialization needed
- **Rich ecosystem:** LangChain integration, tool definitions, model providers all plugged in
- **Language alignment:** TS across UI and backend reduces context switching
- **Debuggability:** Graph visualization helps diagnose what went wrong

### Negative

- **Vendor lock-in:** Committing to LangChain/LangGraph ecosystem; switching costs are high if this
  proves wrong
- **Graph-inspection trade-off (CRITICAL):** LangGraph's advanced graph visualization and inspection
  is built into **LangSmith**, LangChain's commercial tracing service. Open-source inspection is
  limited. This conflicts with PROB-031 (observability).
  - **Mitigation required:** We must either (1) accept LangSmith costs for production observability,
    (2) build custom introspection tools, or (3) accept limited graph visibility and rely on
    log-based debugging
- **Opinionated patterns:** Some workflows fit naturally; others feel forced into the graph model
- **Learning curve:** Team must understand graph-based execution (not imperative procedural code)
- **TS-only:** Harder to integrate Python-based agents without wrapper complexity

### Requires

- **ADR-X (graph-inspection strategy):** Decide how to handle PROB-031 observability given
  LangSmith's commercial nature. Options: (A) pay for LangSmith, (B) build custom observability, (C)
  accept limited visibility
- **SPEC-orchestration-interface:** Define LangGraph node/edge patterns and state schema
- **SPEC-checkpointing-strategy:** Define when/how checkpoints are created, how state is serialized

---

## Known Issues / Open Questions

1. **Graph inspection cost:** We have not yet evaluated whether LangSmith's cost is acceptable, or
   whether open-source alternatives are sufficient. This is a blocker for PROB-031.
2. **Schema evolution:** What happens to old checkpoints when the epistemic state schema changes?
   (PROB-022)
3. **Agent compliance:** LangGraph makes routes explicit, but agents still choose to use tools; how
   do we enforce PROB-017 (system reliability vs agent compliance)?

---

## Troubleshooting

**Q: The graph is becoming unwieldy (too many nodes)**

- A: Consider hierarchical/composite graphs; group related decisions into sub-graphs

**Q: We can't see what the graph is doing**

- A: This is the LangSmith trade-off (see Consequences). Evaluate acceptance or build custom
  logging.

**Q: We need to change the epistemic state schema**

- A: Document in PROBDEF-022; new checkpoints use new schema; old checkpoints need migration or
  discarding.
