from texere_cli.ui.app import TexereApp


class DummyEvent:
    def __init__(self, value: str):
        self.value = value
        self.input = type("I", (), {"value": value})()


def test_app_on_input_submitted_writes_and_clears():
    app = TexereApp()
    ev = DummyEvent("hello")
    app.on_input_submitted(ev)  # type: ignore[arg-type]
    # Transcript should contain the input echoed and stub line
    transcript = "\n".join(app.transcript.lines)
    assert "hello" in transcript
    assert "stub: execute plan" in transcript
    # Input cleared
    assert ev.input.value == ""


def test_app_action_clear_empties_transcript():
    app = TexereApp()
    app.transcript.write("line")
    assert app.transcript.lines
    app.action_clear()
    assert not app.transcript.lines
