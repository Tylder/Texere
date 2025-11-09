from __future__ import annotations

from textual import events
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Vertical
from textual.widgets import Footer, Header, Input, Static, TextLog
from typing import Iterable


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
        self.query = Input(placeholder="Type to filter… (Enter to run, Esc to close)")
        self.results = TextLog(highlight=False, markup=False)

    def compose(self) -> ComposeResult:  # type: ignore[override]
        yield Container(self.query, self.results, classes="body")

    def on_mount(self) -> None:
        self.refresh_results("")
        self.query.focus()

    def refresh_results(self, text: str) -> None:
        self.results.clear()
        for cmd in filter(lambda c: text.lower() in c.lower(), self.commands):
            self.results.write(cmd)

    def on_input_changed(self, event: Input.Changed) -> None:
        self.refresh_results(event.value)

    def on_input_submitted(self, event: Input.Submitted) -> None:
        cmd = event.value.strip()
        if cmd:
            self.post_message(events.Message("palette_run", cmd))
        self.remove()

    def on_key(self, event: events.Key) -> None:
        if event.key == "escape":
            self.remove()


class TexereApp(App):
    CSS = """
    Screen {
        layout: vertical;
    }
    # Top transcript grows; prompt stays at bottom
    # Use min-height to keep prompt visible; it expands as needed.
    # Textual handles auto-resize with the terminal.
    #
    # Containers
    # transcript area
    # prompt area
    .pane {
        width: 100%;
    }
    # Keep prompt visually distinct
    #
    # TextLog tweaks
    TextLog {
        overflow-x: hidden;
    }
    """

    BINDINGS: Iterable[Binding | tuple[str, str, str]] = (
        ("/", "open_palette", "Command Palette"),
        ("ctrl+l", "clear", "Clear"),
    )

    def __init__(self) -> None:
        super().__init__()
        self.transcript = TextLog(highlight=True, markup=True)
        self.prompt = Input(
            placeholder="Type your prompt… (Enter=send, Shift+Enter=newline, /=commands)"
        )
        self.palette_commands: list[str] = [
            "run plan",
            "list tools",
            "switch adapter",
            "open file",
            "clear",
        ]

    def compose(self) -> ComposeResult:  # type: ignore[override]
        yield Header(show_clock=False)
        with Vertical(classes="pane"):
            yield self.transcript
        with Container(classes="pane"):
            yield self.prompt
        yield Footer()

    def on_mount(self) -> None:
        self.prompt.focus()
        self.transcript.write("Texere UI ready. Press '/' for commands.")

    def action_open_palette(self) -> None:
        self.mount(CommandPalette(self.palette_commands))

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
        if event.key == "enter" and event.shift and self.prompt.has_focus:
            self.prompt.value = (self.prompt.value or "") + "\n"
            event.stop()
