from __future__ import annotations

import subprocess
import sys
from typing import List

import typer
from rich.console import Console
from texere_core.graph_executor import execute_plan_graph
from texere_core.local_executor import run_local_exec
from texere_core.state import Plan, State, Step
from texere_core.registry import list_adapters, list_tools

app = typer.Typer(help="Texere CLI — tools, runs, and UI")
console = Console()


@app.command()
def ui():
    """Launch the full-screen TUI, Text User Interface."""
    # Lazy import to avoid importing Textual unless the UI is launched.
    from texere_cli.ui.app import TexereApp  # type: ignore

    TexereApp().run()


@app.command(name="adapters:list")
def adapters_list():
    """List discovered adapters."""
    adapters = list_adapters()
    for a in adapters:
        console.print(f"{a.name} — kind={a.kind}")


@app.command(name="tools:list")
def tools_list():
    """List available tools."""
    tools = ", ".join(t.name for t in list_tools())
    console.print(tools)


@app.command()
def run(
    prompt: str = typer.Argument(..., help="Prompt to send to the demo LLM, Large Language Model"),
):
    """Run a minimal plan that streams an LLM, Large Language Model, response to the terminal."""
    plan = Plan(
        id="p1",
        steps=[Step(id="s1", tool="llm.generate", args={"prompt": prompt}, out="resp")],
    )
    state = State(run_id="r1", plan=plan)
    execute_plan_graph(state)


@app.command(name="debug-run")
def debug_run(
    prompt: str = typer.Argument(
        ..., help="Prompt to send; runs with debug tracing and optional step limit"
    ),
    steps: int = typer.Option(1, "--steps", help="Max steps to execute before stopping"),
    trace: bool = typer.Option(True, "--trace", help="Emit stack traces to logs", is_flag=True),
):
    """Run the LangGraph executor with CLI debugging aids.

    - Emits stack traces and locals to per-run logs when --trace is enabled.
    - Executes a limited number of steps (default 1) to simulate stepping.
    """
    import os

    # Configure debug environment for the executor
    if trace:
        os.environ["TEXERE_DEBUG_TRACE"] = "1"
    if steps:
        os.environ["TEXERE_DEBUG_MAX_STEPS"] = str(steps)

    plan = Plan(
        id="dbg",
        steps=[Step(id="s1", tool="llm.generate", args={"prompt": prompt}, out="resp")],
    )
    state = State(run_id="dbg-run", plan=plan)
    execute_plan_graph(state)


@app.command()
def exec(
    cmd: list[str] = typer.Argument(
        ..., help="Command to execute (use quotes for complex commands)"
    ),
    timeout: int = typer.Option(30, help="Timeout in seconds"),
    no_hitl: bool = typer.Option(
        False, "--no-hitl", help="Do not require HITL, Human In The Loop, approval"
    ),
):
    """Execute a local command with HITL, Human In The Loop, approval and JSONL audit."""
    code = run_local_exec(cmd, timeout_sec=timeout, require_hitl=not no_hitl)
    raise typer.Exit(code)


@app.command()
def test(
    paths: List[str] | None = typer.Argument(
        None,
        help="Optional test paths or files; defaults to 'tests'",
    ),
    cov: bool = typer.Option(
        False,
        "--cov",
        help="Include coverage with --cov=src and term-missing report",
        is_flag=True,
    ),
    xml: bool = typer.Option(
        False,
        "--xml",
        help="Also emit coverage XML (for CI, Continuous Integration)",
        is_flag=True,
    ),
    mark: str | None = typer.Option(
        None, "--mark", help="Pytest -m marker expression (e.g., 'not integration')"
    ),
    kexpr: str | None = typer.Option(None, "--kexpr", help="Pytest -k expression to filter tests"),
):
    """Run tests from the Texere CLI, Command Line Interface, optionally with coverage."""
    args: List[str] = ["-m", mark] if mark else []
    if kexpr:
        args += ["-k", kexpr]
    if cov:
        args += ["--cov=src", "--cov-report=term-missing"]
        if xml:
            args += ["--cov-report=xml"]
    # Default to unit tests under tests/ if no path provided
    if not paths:
        paths = ["tests"]

    cmd = [sys.executable, "-m", "pytest", "-q", *args, *paths]
    result = subprocess.run(cmd)
    raise typer.Exit(result.returncode)


if __name__ == "__main__":
    app()
