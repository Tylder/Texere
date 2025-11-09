from __future__ import annotations

from typing import Any, Dict

from rich.console import Console

from .llm_fake import stream_generate
from .state import State
from .router import select_adapter


console = Console()


def execute_plan_stream(state: State) -> State:
    """Execute steps sequentially; stream output for llm.generate.

    This is a minimal demo executor: validates the step, routes to a stub adapter,
    and streams results to the terminal via Rich.
    """
    state.status = "RUNNING"
    while state.plan_idx < len(state.plan.steps):
        step = state.plan.steps[state.plan_idx]
        sel = select_adapter(step.tool)
        console.print(f"[dim]→ {step.tool} via {sel.adapter} ({sel.reason})[/dim]")

        if step.tool == "llm.generate":
            prompt = step.args.get("prompt", "")
            with console.status("Streaming…", spinner="dots"):
                for chunk in stream_generate(prompt):
                    console.print(chunk, end="")
            console.print()  # newline
            if step.out:
                state.artifacts[step.out] = "<streamed>"
        else:
            console.print("[yellow]Stub tool: no-op[/yellow]")
            if step.out:
                state.artifacts[step.out] = None

        state.plan_idx += 1

    state.status = "DONE"
    return state

