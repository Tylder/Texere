from texere_cli.ui.app import PaletteRun


def test_palette_run_message_carries_command():
    msg = PaletteRun("do thing")
    assert msg.command == "do thing"
