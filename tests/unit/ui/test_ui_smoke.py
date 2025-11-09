from texere_cli.ui.app import TexereApp, CommandPalette


def test_texere_app_init_and_clear():
    app = TexereApp()
    # Ensure key widgets exist
    assert app.transcript is not None
    assert app.prompt is not None
    # Exercise a simple action
    app.action_clear()


def test_command_palette_compose_and_refresh():
    cp = CommandPalette(["run plan", "list tools", "clear"])
    # Compose should yield container with children (no mount required)
    parts = list(cp.compose())
    assert parts, "compose should yield at least one widget container"
    # Exercise result refresh filtering
    cp.refresh_results("list")
