from texere_cli.ui.app import TexereApp, PaletteRun


def test_palette_list_tools_writes_transcript():
    app = TexereApp()
    app.on_PaletteRun(PaletteRun("list tools"))
    text = "\n".join(app.transcript.lines)
    assert "repo.list_files" in text and "llm.generate" in text


def test_palette_run_plan_uses_prompt_and_streams():
    app = TexereApp()
    app.prompt.value = "Hello from UI"
    app.on_PaletteRun(PaletteRun("run plan"))
    # Stream events should append tokens
    text = "\n".join(app.transcript.lines)
    assert "You said:" in text


def test_palette_clear_empties_transcript():
    app = TexereApp()
    app.transcript.write("something")
    assert app.transcript.lines
    app.on_PaletteRun(PaletteRun("clear"))
    assert not app.transcript.lines
