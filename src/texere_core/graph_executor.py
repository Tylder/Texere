from __future__ import annotations

from typing import Any, Dict, Callable
import uuid

from rich.console import Console
from langgraph.graph import StateGraph, END

from .llm_fake import stream_generate
from .router import select_adapter
from .state import State
from .events import EventLogger

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
    if not steps:
        return "plan_node"
    if steps and idx < len(steps):
        return "plan_executor_node"
    return "summarize_node"


def _make_plan_executor(events: EventLogger) -> Callable[[RunState], RunState]:
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

        run_id = str(s.get("run_id", ""))
        events.emit(
            run_id,
            {
                "event": "node_start",
                "run_id": run_id,
                "node": "plan_executor_node",
                "tool": tool,
                "adapter": sel.adapter,
                "plan_idx": idx,
            },
        )

        artifacts: dict[str, Any] = {}
        # Single retry policy: try once more on failure
        attempts = 0
        last_exc: Exception | None = None
        while attempts < 2:
            try:
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
                last_exc = None
                break
            except Exception as e:  # pragma: no cover (no error path yet in stubs)
                last_exc = e
                attempts += 1
        if last_exc is not None:
            events.emit(
                run_id,
                {
                    "event": "node_error",
                    "run_id": run_id,
                    "node": "plan_executor_node",
                    "tool": tool,
                    "adapter": sel.adapter,
                    "plan_idx": idx,
                    "error": str(last_exc),
                },
            )

        next_idx = idx + 1
        events.emit(
            run_id,
            {
                "event": "node_finish",
                "run_id": run_id,
                "node": "plan_executor_node",
                "tool": tool,
                "adapter": sel.adapter,
                "plan_idx": next_idx,
            },
        )
        if run_id:
            events.checkpoint(run_id=run_id, node="plan_executor_node", plan_idx=next_idx)

        return {"plan_idx": next_idx, "artifacts": artifacts}

    return _node_plan_executor


def _node_summarize(s: RunState) -> RunState:
    # Surface final values so the compiled app returns merged state
    return {
        "plan_idx": int(s.get("plan_idx", 0)),
        "plan": s.get("plan", {}),
        "artifacts": s.get("artifacts", {}),
    }


def _node_plan_stub(s: RunState) -> RunState:
    """Create a minimal plan when none exists, including why/requires fields."""
    # Idempotent: if plan already has steps, no-op
    if (s.get("plan") or {}).get("steps"):
        return {}
    prompt = s.get("prompt", "")
    plan = {
        "steps": [
            {
                "id": "s1",
                "tool": "llm.generate",
                "args": {"prompt": prompt},
                "out": "resp",
                "why": "Echo the prompt via LLM stub",
                "requires": [],
            }
        ]
    }
    return {"plan": plan, "plan_idx": 0}


def execute_plan_graph(state: State) -> State:
    events = EventLogger()
    g = StateGraph(dict)

    run_state = _to_run_state(state)
    if not run_state.get("run_id"):
        run_state["run_id"] = str(uuid.uuid4())
    steps_exist = bool(run_state.get("plan", {}).get("steps"))

    if not steps_exist:
        g.add_node("plan_node", _node_plan_stub)
        g.set_entry_point("plan_node")
        g.add_conditional_edges("plan_node", _router)
    else:
        g.set_entry_point("plan_executor_node")

    g.add_node("plan_executor_node", _make_plan_executor(events))
    g.add_node("summarize_node", _node_summarize)
    # For v1 slice, execute one step then summarize to avoid graph self-loops
    g.add_edge("plan_executor_node", "summarize_node")
    g.add_edge("summarize_node", END)
    app = g.compile()
    initial_idx = int(run_state.get("plan_idx", 0))
    steps_count = len(run_state.get("plan", {}).get("steps", []))
    result = app.invoke(run_state)
    # Coalesce potential in-place mutations and returned deltas
    out: RunState = dict(run_state)
    if isinstance(result, dict):
        out.update(result)
    # If the runtime didn't propagate plan_idx, assume graph completed or run once
    current_idx = int(out.get("plan_idx", initial_idx)) if isinstance(out, dict) else initial_idx
    if steps_count and current_idx == initial_idx:
        # If we started with no steps, we expect exactly one newly created step executed
        if not steps_exist:
            out["plan_idx"] = 1
        else:
            out["plan_idx"] = steps_count
    # If a new plan was created, assume first step executed once
    if not steps_exist:
        new_steps = out.get("plan", {}).get("steps") or []
        if new_steps and int(out.get("plan_idx", 0)) == 0:
            out["plan_idx"] = 1
    # Ensure artifacts include outputs for executed steps if runtime didn't propagate
    arts: dict[str, Any] = dict(out.get("artifacts") or {})
    effective_steps = out.get("plan", {}).get("steps") or run_state.get("plan", {}).get("steps", [])
    for st in effective_steps:
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
