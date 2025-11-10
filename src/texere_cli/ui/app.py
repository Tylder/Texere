from __future__ import annotations

from textual import events
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Vertical
from textual.widgets import Footer, Header, Input, Static, Log
from texere_core.events import default_logger
from textual.message import Message
from typing import AbstractSet, cast
from typing import ClassVar
from texere_core.registry import list_tools
from texere_core.graph_executor import execute_plan_graph
from texere_core.state import Plan, State, Step
import shlex


class CommandPalette(Static):
    """Simple overlay command palette opened with '/' key."""

    DEFAULT_CSS = """
    CommandPalette {
        layer: overlay;
        width: 80%;
        height: 50%;
        dock: top;
        margin: 2 10;
        border: round $accent;
        background: $panel;
    }
    CommandPalette > .body {
        height: 100%;
    }
    """

    def __init__(self, commands: list[str]):
        super().__init__()
        self.commands = commands
        self.query_input = Input(placeholder="Type to filter… (Enter to run, Esc to close)")
        self.results = Log(highlight=False)

    def compose(self) -> ComposeResult:  # type: ignore[override]
        yield Container(self.query_input, self.results, classes="body")  # type: ignore[arg-type]

    def on_mount(self) -> None:
        self.refresh_results("")
        self.query_input.focus()

    def refresh_results(self, text: str) -> None:
        self.results.clear()
        for cmd in filter(lambda c: text.lower() in c.lower(), self.commands):
            self.results.write(cmd)

    def on_input_changed(self, event: Input.Changed) -> None:
        self.refresh_results(event.value)

    def on_input_submitted(self, event: Input.Submitted) -> None:
        cmd = event.value.strip()
        if cmd:
            self.post_message(PaletteRun(cmd))
        self.remove()

    def on_key(self, event: events.Key) -> None:
        if event.key == "escape":
            self.remove()


class TexereApp(App):
    CSS = """
    Screen {
        layout: vertical;
    }
    .transcript {
        width: 100%;
        height: 1fr;
        overflow-y: auto;
    }
    .prompt {
        width: 100%;
        height: auto;
    }
    Log {
        overflow-x: hidden;
    }
    """

    BINDINGS: ClassVar[list[Binding | tuple[str, str] | tuple[str, str, str]]] = [
        ("/", "open_palette", "Command Palette"),
        ("ctrl+l", "clear", "Clear"),
    ]

    def __init__(self) -> None:
        super().__init__()
        self.transcript = Log(highlight=True)
        self.transcript.add_class("transcript")
        self.prompt = Input(
            placeholder="Type your prompt… (Enter=send, Shift+Enter=newline, /=commands)"
        )
        self.prompt.add_class("prompt")
        self.palette_commands: list[str] = [
            "run plan",
            "list tools",
            "switch adapter",
            "open file",
            "clear",
        ]

        # Subscribe to runtime events for live updates
        def _on_event(e: dict) -> None:
            self.handle_runtime_event(e)

        self._event_cb = _on_event  # type: ignore[attr-defined]
        default_logger.subscribe(self._event_cb)

    def compose(self) -> ComposeResult:  # type: ignore[override]
        yield Header(show_clock=False)
        with Vertical():
            yield self.transcript
            yield self.prompt
        yield Footer()

    def on_mount(self) -> None:
        self.prompt.focus()
        self.transcript.write("Texere UI ready. Press '/' for commands.")

    def action_open_palette(self) -> None:
        # Create and mount palette, then focus its input for immediate typing
        pal = CommandPalette(self.palette_commands)
        self.mount(pal)
        try:
            pal.refresh_results("")
            pal.query_input.focus()
        except Exception:
            pass

    def action_clear(self) -> None:
        self.transcript.clear()

    def on_input_submitted(self, event: Input.Submitted) -> None:
        text = event.value.strip()
        if not text:
            return
        self.transcript.write(f"[bold]>[/bold] {text}")
        # TODO: route the prompt to planner/executor and stream output
        self.transcript.write("[dim]… (stub: execute plan and stream results) …[/dim]")
        event.input.value = ""

    def on_key(self, event: events.Key) -> None:
        # Shift+Enter inserts newline in the prompt
        modifiers: AbstractSet[str] = cast(AbstractSet[str], getattr(event, "modifiers", set()))
        if event.key == "enter" and ("shift" in modifiers) and self.prompt.has_focus:
            self.prompt.value = (self.prompt.value or "") + "\n"
            event.stop()

    def on_input_changed(self, event: Input.Changed) -> None:
        # If the prompt receives '/' as the first character, open palette and clear prompt
        if event.input is self.prompt and event.value == "/":
            self.action_open_palette()
            event.input.value = ""
            event.stop()

    def handle_runtime_event(self, event: dict) -> None:
        kind = event.get("event", "")
        if kind == "stream":
            chunk = event.get("chunk", "")
            self.transcript.write(str(chunk))
        else:
            parts = [
                kind,
                event.get("node", ""),
                event.get("tool", ""),
                str(event.get("plan_idx", "")),
            ]
            self.transcript.write(" ".join(p for p in parts if p))

    def unsubscribe_events(self) -> None:
        cb = getattr(self, "_event_cb", None)
        if cb is not None:
            default_logger.unsubscribe(cb)  # type: ignore[arg-type]

    def on_PaletteRun(self, msg: "PaletteRun") -> None:  # type: ignore[override]
        raw = (msg.command or "").strip()
        if not raw:
            return
        tokens = shlex.split(raw)
        if not tokens:
            return
        cmd = tokens[0].lower()
        args = tokens[1:]
        if cmd in ("clear", "cls"):
            self.action_clear()
            return
        if cmd in ("tools", "tools:list", "list-tools", "list", "ls"):
            tools = ", ".join(t.name for t in list_tools())
            self.transcript.write(tools)
            return
        if cmd in ("adapters:list", "adapters", "list-adapters"):
            from texere_core.registry import list_adapters

            adapters = list_adapters()
            for a in adapters:
                self.transcript.write(f"{a.name} — kind={a.kind}")
            return
        if cmd in ("run", "run:plan", "run-plan", "runplan"):
            text = " ".join(args).strip() if args else (self.prompt.value or "").strip()
            if not text:
                self.transcript.write("[yellow]No prompt to run.[/yellow]")
                return
            plan = Plan(
                id="ui",
                steps=[Step(id="s1", tool="llm.generate", args={"prompt": text}, out="resp")],
            )
            st = State(run_id="ui-run", plan=plan)
            execute_plan_graph(st)
            return
        if cmd in ("help", "?", ":help"):
            self.transcript.write("Commands: run <text>, tools:list, adapters:list, clear")
            return
        # Fallback: echo unknown command
        self.transcript.write(f"[red]Unknown command:[/red] {msg.command}")


class PaletteRun(Message):
    bubble = True

    def __init__(self, command: str) -> None:
        super().__init__()
        self.command = command
