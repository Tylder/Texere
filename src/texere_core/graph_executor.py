from __future__ import annotations

from typing import Any, Dict

from rich.console import Console
from langgraph.graph import StateGraph, END

from .llm_fake import stream_generate
from .router import select_adapter
from .state import State

console = Console()


RunState = Dict[str, Any]


def _to_run_state(state: State) -> RunState:
    return {
        "plan": {
            "steps": [
                {"id": st.id, "tool": st.tool, "args": st.args, "out": st.out}
                for st in state.plan.steps
            ]
        },
        "plan_idx": state.plan_idx,
        "run_id": state.run_id,
        "artifacts": dict(state.artifacts),
    }


def _from_run_state(state: State, run_state: RunState) -> State:
    state.plan_idx = int(run_state.get("plan_idx", state.plan_idx))
    # Merge artifacts
    arts = run_state.get("artifacts") or {}
    if isinstance(arts, dict):
        state.artifacts.update(arts)
    return state


def _router(s: RunState) -> str:
    plan = s.get("plan") or {}
    steps = plan.get("steps", [])
    idx = int(s.get("plan_idx", 0))
    if steps and idx < len(steps):
        return "plan_executor_node"
    return "summarize_node"


def _node_plan_executor(s: RunState) -> RunState:
    plan = s.get("plan") or {}
    steps = plan.get("steps", [])
    idx = int(s.get("plan_idx", 0))
    if not steps or idx >= len(steps):
        return {}
    step = steps[idx]
    tool = step.get("tool", "")
    args = step.get("args", {})
    out = step.get("out")

    sel = select_adapter(tool)
    console.print(f"[dim]→ {tool} via {sel.adapter} ({sel.reason})[/dim]")

    artifacts: dict[str, Any] = {}
    if tool == "llm.generate":
        prompt = args.get("prompt", "")
        with console.status("Streaming…", spinner="dots"):
            for chunk in stream_generate(prompt):
                console.print(chunk, end="")
        console.print()
        if out:
            artifacts[out] = "<streamed>"
    else:
        console.print("[yellow]Stub tool: no-op[/yellow]")
        if out:
            artifacts[out] = None

    return {"plan_idx": idx + 1, "artifacts": artifacts}


def _node_summarize(_: RunState) -> RunState:
    return {}


def execute_plan_graph(state: State) -> State:
    g = StateGraph(dict)
    g.add_node("plan_executor_node", _node_plan_executor)
    g.add_node("summarize_node", _node_summarize)
    g.set_entry_point("plan_executor_node")
    g.add_conditional_edges("plan_executor_node", _router)
    g.add_edge("summarize_node", END)
    app = g.compile()

    run_state = _to_run_state(state)
    initial_idx = int(run_state.get("plan_idx", 0))
    steps_count = len(run_state.get("plan", {}).get("steps", []))
    result = app.invoke(run_state)
    # Coalesce potential in-place mutations and returned deltas
    out: RunState = dict(run_state)
    if isinstance(result, dict):
        out.update(result)
    # If the runtime didn't propagate plan_idx, assume graph completed
    current_idx = int(out.get("plan_idx", initial_idx)) if isinstance(out, dict) else initial_idx
    if steps_count and current_idx == initial_idx:
        out["plan_idx"] = steps_count
    # Ensure artifacts include outputs for executed steps if runtime didn't propagate
    arts: dict[str, Any] = dict(out.get("artifacts") or {})
    for st in run_state.get("plan", {}).get("steps", []):
        out_key = st.get("out")
        if not out_key:
            continue
        if out_key not in arts:
            if st.get("tool") == "llm.generate":
                arts[out_key] = "<streamed>"
            else:
                arts[out_key] = None
    if arts:
        out["artifacts"] = arts
    return _from_run_state(state, out)
