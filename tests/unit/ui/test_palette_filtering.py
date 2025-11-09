from texere_cli.ui.app import CommandPalette


def test_command_palette_filtering_results_lines():
    cp = CommandPalette(["run plan", "list tools", "clear"])
    cp.refresh_results("list")
    text = "\n".join(cp.results.lines)
    assert "list tools" in text
    assert "run plan" not in text
