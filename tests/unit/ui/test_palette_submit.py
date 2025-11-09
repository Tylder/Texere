from texere_cli.ui.app import CommandPalette, PaletteRun


def test_command_palette_on_submit_posts_message(mocker):
    cp = CommandPalette(["cmd1"])
    called = {}

    def fake_post(msg):
        called["type"] = type(msg)
        called["cmd"] = getattr(msg, "command", None)

    mocker.patch.object(cp, "post_message", side_effect=fake_post)
    mocker.patch.object(cp, "remove", return_value=None)

    class DummyEvent:
        def __init__(self, value: str):
            self.value = value

    cp.on_input_submitted(DummyEvent("cmd1"))
    assert called["type"] is PaletteRun
    assert called["cmd"] == "cmd1"
