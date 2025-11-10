# Texere — Terminal UI Spec (v0)

> Audience: contributors and UI implementers.
> Scope: Defines the terminal-first UI behavior that mirrors AMP CLI and Codex CLI.

## Goals
- Provide a terminal-native experience: output on top, input fixed at bottom.
- Allow native mouse text selection at all times (no special toggles).
- Offer a lightweight inline “slash menu” triggered by typing `/` as the first character.
- Keep layout stable; input auto-grows within a small cap.

## Layout
- Output pane (transcript/log) occupies all space above the input.
- Input bar is pinned to the bottom; always visible.
- Footer/help may show key hints, but no modal overlays.

## Slash Menu (inline)
- Trigger: When the first character typed in an empty input is `/`.
- Presentation: A small menu list appears immediately above the input (not full-screen).
- Navigation: Up/Down arrows move selection; Enter confirms; Esc cancels and restores the plain input.
- Behavior: Selecting a command runs it immediately (if no args) or pre-fills the input with the command and a space for args.
- Dismissal: Any non-navigation typing hides the menu and returns focus to the input.

## Commands (initial set)
- `run <prompt>` — Execute a one-step plan that streams output.
- `tools:list` — List discovered tools (names only, comma-separated).
- `adapters:list` — List registered adapters and kinds.
- `clear` — Clear the output pane.
- `help` — Show available commands and brief usage.

## Input Behavior
- Default single-line; auto-grow up to 5 lines as the user types (then scroll within the input).
- Enter submits; Shift+Enter inserts a newline.
- If `/` is typed as the first character, open the slash menu.

## Keyboard & Mouse
- Native terminal text selection must work at all times; implementation must not require a special “selection mode”.
- Scrolling: Terminal scrollback for historical output; the output pane may support PageUp/PageDown and mouse wheel where available, but this must not interfere with text selection.
- Shortcuts: `Ctrl+L` clears output; `Esc` cancels the slash menu.

## Streaming Output
- Stream tokens/chunks to the output pane as they arrive.
- Non-stream events (node start/finish, tool names) appear as concise status lines.

## Accessibility & Non-Goals
- No full-screen overlays for command palette.
- No external clipboard integrations (OSC 52) in v0.
- Keep dependencies minimal; behavior must degrade gracefully across terminals.

## Integration Notes
- Commands must map 1:1 with existing CLI behaviors where applicable (e.g., `tools:list`).
- Errors are rendered inline in the output pane with clear prefixes.
- The UI must not alter repository state or execution policy; it only dispatches requests and renders events.

---
Status: v0 approved direction for implementation. Future versions may extend menu items and add transcript export.

