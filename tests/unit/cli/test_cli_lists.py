from typer.testing import CliRunner

from texere_cli.main import app


runner = CliRunner()


def test_adapters_list_outputs_discovered_adapters():
    result = runner.invoke(app, ["adapters:list"])
    assert result.exit_code == 0
    # Always includes local repo adapter and demo adapters
    assert "repo.local" in result.stdout
    assert "llm" in result.stdout
    assert "exec.local" in result.stdout


def test_tools_list_outputs_known_tools():
    result = runner.invoke(app, ["tools:list"])
    assert result.exit_code == 0
    out = result.stdout
    assert "repo.list_files" in out
    assert "repo.read_file" in out
    assert "llm.generate" in out
    assert "exec.run" in out


def test_ui_cmd_tools_list():
    result = runner.invoke(app, ["ui:cmd", "tools:list"])
    assert result.exit_code == 0
    assert "repo.list_files" in result.stdout
