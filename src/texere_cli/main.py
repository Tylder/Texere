from __future__ import annotations

import typer
from rich.console import Console

from texere_cli.ui.app import TexereApp
from texere_core.state import Plan, State, Step
from texere_core.executor import execute_plan_stream

app = typer.Typer(help="Texere CLI — tools, runs, and UI")
console = Console()


@app.command()
def ui():
    """Launch the full-screen TUI, Text User Interface."""
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
def run(prompt: str = typer.Option(..., help="Prompt to send to the demo LLM, Large Language Model")):
    """Run a minimal plan that streams an LLM, Large Language Model, response to the terminal."""
    plan = Plan(id="p1", steps=[Step(id="s1", tool="llm.generate", args={"prompt": prompt}, out="resp")])
    state = State(run_id="r1", plan=plan)
    execute_plan_stream(state)
