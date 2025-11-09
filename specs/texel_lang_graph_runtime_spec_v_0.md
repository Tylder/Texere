# Texel — LangGraph Runtime Spec (v0.1)

> **Purpose:** Define exactly what LangGraph does in Texel, how nodes interact with adapters/tools, and the runtime
> guarantees (state, routing, retries, checkpoints, interrupts). This spec is implementation‑ready and LLM‑friendly.

## 1) Role of LangGraph in Texel

LangGraph is the **stateful orchestration engine**. It provides:

- A **typed State** container that nodes read/write.
- **Deterministic control flow** (edges, conditional routing, parallel branches).
- **Checkpoints** (persist state at node boundaries; resume/replay runs).
- **Interrupts** for **HITL, Human‑In‑The‑Loop** approvals.
- A home for **tools** (LangGraph tools) that wrap adapter calls.
- Lifecycle hooks for **telemetry** and **policy enforcement**.

> All domain IO (repos, retrieval, LLMs, exec) happens via **adapters** that nodes call; adapters never call each other
> implicitly. State is the interface between nodes.

## 2) Process/Module Boundaries

- **In‑proc (texel app):** LangGraph runtime, nodes, router, plan executor, policy wrapper, tool registry, adapter
  clients.
- **Out‑of‑proc:** executor sandbox container; model servers; Redis (events). Nodes talk to these via adapters.

## 3) State Model (authoritative)

State is an immutable mapping with merge semantics. All nodes accept and return **partial updates**. The unified State
type is the single source of truth.

### 3.1 Pydantic/TypedDict shape

```python
from typing import TypedDict, Literal


class RunState(TypedDict, total=False):
    # inputs
    prompt: str
    repo_url: str

    # planning
    plan: dict  # {steps:[{tool,args,out,why,requires?}]}
    plan_idx: int  # next step index

    # retrieval
    passages: list[dict]  # [{path, snippet, rev, score}]

    # generation/patch
    diff: str | None
    pr_url: str | None

    # budgets
    budget: dict  # {tokens:int, time_s:int}

    # telemetry / meta
    run_id: str
    errors: list[dict]
```

### 3.2 Merge rule

- Nodes return a **partial dict**; LangGraph merges into the current state.
- Numbers/strings replace; lists are replaced unless a node implements an explicit reducer.

## 4) Node Contracts

Nodes are **pure functions** over `RunState` that may call adapters.

```python
def node_name(state: RunState, ctx: Services) -> RunState: ...
```

- **`ctx: Services`** is an injected registry containing `RepoAdapter`, `LLMAdapter`, `RetrievalAdapter`, `ExecAdapter`,
  `Policy`, `Events`.
- Nodes must be **idempotent** when re‑invoked with the same input state.

### Required nodes (v1)

- `plan_node` — produces `state.plan` and initial budgets.
- `plan_executor_node` — validates and executes `state.plan` steps (calls tools/adapters, writes outputs, increments
  `plan_idx`).
- `retrieval_node` — optional specialized node when executing retrieval‑type steps.
- `propose_patch_node` — calls LLM adapter to produce unified diff.
- `apply_node` — wraps patch apply/test/PR; calls Policy/HITL before risky actions; uses RepoAdapter & ExecAdapter.
- `summarize_node` — returns user‑facing summary and links (PR URL).

## 5) Routing & Control Flow

Routing decides **which node runs next** based on state.

### 5.1 Router function

```python
def route(state: RunState) -> str | list[str]:
    if not state.get("plan"):
        return "plan_node"
    if state.get("plan") and state.get("plan_idx", 0) < len(state["plan"]["steps"]):
        return "plan_executor_node"
    if state.get("diff") and not state.get("pr_url"):
        return "apply_node"
    return "summarize_node"
```

- Router may return a **list** for parallel branches. LangGraph merges outputs deterministically.

### 5.2 Edges

- Entry: `plan_node`
- Conditional edges: `add_conditional_edges("plan_node", route)`, `add_conditional_edges("plan_executor_node", route)`,
  etc.
- Terminal: `END` after `summarize_node`.

## 6) Plan + Plan Executor Pattern (canonical)

The planner writes a **structured plan** the executor can run without more LLM reasoning.

### 6.1 Plan schema (LLM‑friendly)

```json
{
  "steps": [
    {
      "id": "s1",
      "tool": "retrieval.search",
      "args": {
        "query": "Express router",
        "k": 8
      },
      "out": "passages",
      "why": "Find endpoints"
    },
    {
      "id": "s2",
      "tool": "llm.propose_patch",
      "args": {
        "target": "src/users.ts",
        "context_ref": "passages"
      },
      "out": "diff"
    },
    {
      "id": "s3",
      "tool": "exec.run",
      "args": {
        "cmd": "pnpm test -r users"
      },
      "requires": [
        "diff"
      ]
    },
    {
      "id": "s4",
      "tool": "repo.open_pr",
      "args": {
        "title": "feat: users/me",
        "base": "main",
        "head": "texere/run-{run_id}"
      },
      "requires": [
        "diff"
      ]
    }
  ]
}
```

### 6.2 Executor semantics

- Validate `tool` against registry; **no unknown tools**.
- Resolve `context_ref` to previous outputs in state.
- Apply **budget accounting** (tokens/time); decrement per step.
- Apply **policy** (risk) per step; call **interrupt** for HITL when required.
- Invoke tool (LangGraph tool or MCP proxy) and store output under `out` label.
- Increment `plan_idx`; checkpoint after each step.
- On failure: retry w/ backoff up to N; record error in `state.errors`; re‑route (repair or abort) based on policy.

## 7) Tools & Adapters Integration

- **Tool registry** exposes functions with JSON Schemas; wrappers call adapters.
- **Capability gating:** tools are registered only when the underlying adapter `capabilities()` allow it.
- **MCP (stdio):** optional mirror of the same tools for external clients.

## 8) Policy & HITL Integration

- A **policy wrapper** runs around node execution. For steps with risk tag `WRITE`/`EXECUTE`/`NET`, the wrapper may:
    - **ALLOW** (log context);
    - **REQUIRE_HITL** (call LangGraph `interrupt()` and wait for approval);
    - **DENY** (record and route to summary).
- Policy decisions, inputs, and outcomes are logged once per step for **auditing**.

## 9) Checkpoints & Persistence

- Checkpoints at **node boundaries** and **after each plan step**.
- Each checkpoint records: `run_id`, `state hash`, `node`, `timestamp`, `budget snapshot`.
- Runs can **resume** from last checkpoint or **replay** from any checkpoint (read‑only) for debugging.

## 10) Concurrency & Parallelism

- Router may return multiple next nodes; LangGraph runs them concurrently and merges outputs.
- Merge conflicts are resolved deterministically by reducer functions or last‑writer wins for disjoint keys.

## 11) Retries & Timeouts

- Default per‑node timeout (e.g., 60 s) and **max retries** (e.g., 2) with exponential backoff.
- Nodes must be **idempotent**; retries must not produce duplicate PRs/commits.

## 12) Telemetry Hooks

Per node and per tool call, record:

-
`run_id, node, op/tool, start/end, duration_ms, tokens_in/out (if LLM), bytes_read, driver/host, outcome (ok|hitl|denied|error)`.
- Emit `repo.rate_limit_low` events to the bus as needed (from Repo layer).

## 13) Configuration (graph level)

- **k hierarchy** for retrieval: **graph default → CLI override → node cap** (single source of truth).
- **Budgets:** default token/time budgets at graph level; planner may propose stricter values, but CLI can cap globally.
- **Risk policy:** environment profile (dev/staging/prod) drives default actions for `WRITE/EXECUTE/NET`.

## 14) Dependency Injection (Services)

A single `Services` object is created at startup and closed over or injected into nodes:

```python
class Services:
    def __init__(self, repo, retr, llm, exec, policy, events):
        self.repo = repo;
        self.retr = retr;
        self.llm = llm
        self.exec = exec;
        self.policy = policy;
        self.events = events
```

## 15) Event Bus Usage (from LangGraph perspective)

- Graph itself does **not** depend on Redis; nodes may subscribe/consume repo events via
  `events.subscribe(repo_id, handler)` to enrich state or trigger runs.
- Background workers (outside the graph) can start new runs when `repo.files_changed` occurs.

## 16) CLI & Entry Points

- `texel run --repo gh://org/repo --prompt "…"` launches a graph run.
- `texel resume --run <id>` resumes a paused/HITL run.
- `texel inspect --run <id>` prints checkpoint timeline.

## 17) Non‑Goals for LangGraph layer

- No direct network calls to providers; always via adapters.
- No long‑polling loops inside nodes; background polling handled by services/workers.

## 18) Minimal Example Wiring (pseudo)

```python
from langgraph.graph import StateGraph, END

services = Services(repo_adapter, retr_adapter, llm_adapter, exec_adapter, policy, events)


def wrap(node):
    def _wrapped(state):
        return policy.around_node(node, state, services)

    return _wrapped


g = StateGraph(RunState)
g.add_node("plan_node", wrap(lambda s: plan_node(s, services)))
g.add_node("plan_executor_node", wrap(lambda s: plan_executor_node(s, services)))
g.add_node("apply_node", wrap(lambda s: apply_node(s, services)))
g.add_node("summarize_node", lambda s: summarize_node(s))

g.set_entry_point("plan_node")
g.add_conditional_edges("plan_node", route)
g.add_conditional_edges("plan_executor_node", route)
g.add_edge("apply_node", "summarize_node")
g.add_edge("summarize_node", END)
```

## 19) Acceptance Criteria (for this layer)

- Plan→Executor loop runs end‑to‑end with checkpoints and HITL pauses.
- Tool registry gating by `capabilities()` is enforced.
- Retrieval `k` honors the configuration hierarchy.
- Policies reliably gate WRITE/EXEC/NET steps and log decisions.
- Telemetry present for every node and tool call.

## 20) Future Extensions

- HTTP/SSE MCP transport alongside stdio.
- Graph‑level plugin system for reusable subgraphs.
- Multi‑run coordination (schedulers) for large refactors.

**Status:** Ready for implementation. All open items from earlier drafts are now reflected here with defaults chosen to
match Phase‑1 deployment.

