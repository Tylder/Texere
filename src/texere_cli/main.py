from __future__ import annotations

import typer
from rich.console import Console

from texere_core.state import Plan, State, Step
from texere_core.executor import execute_plan_stream
from texere_core.local_executor import run_local_exec

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
    """List discovered adapters (stub)."""
    console.print("repo.local  — READ/WRITE (local working tree)")


@app.command(name="tools:list")
def tools_list():
    """List available tools (stub)."""
    console.print("repo.list_files, repo.read_file, repo.apply_patch, llm.generate, exec.run")


@app.command()
def run(prompt: str = typer.Argument(..., help="Prompt to send to the demo LLM, Large Language Model")):
    """Run a minimal plan that streams an LLM, Large Language Model, response to the terminal."""
    plan = Plan(id="p1", steps=[Step(id="s1", tool="llm.generate", args={"prompt": prompt}, out="resp")])
    state = State(run_id="r1", plan=plan)
    execute_plan_stream(state)


@app.command()
def exec(
    cmd: list[str] = typer.Argument(..., help="Command to execute (use quotes for complex commands)"),
    timeout: int = typer.Option(30, help="Timeout in seconds"),
    no_hitl: bool = typer.Option(False, help="Do not require HITL, Human In The Loop, approval"),
):
    """Execute a local command with HITL, Human In The Loop, approval and JSONL audit."""
    code = run_local_exec(cmd, timeout_sec=timeout, require_hitl=not no_hitl)
    raise typer.Exit(code)
