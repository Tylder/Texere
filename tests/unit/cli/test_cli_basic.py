from typer.testing import CliRunner

from texere_cli.main import app


runner = CliRunner()


def test_tools_list():
    result = runner.invoke(app, ["tools:list"])
    assert result.exit_code == 0
    assert "repo.read_file" in result.stdout


def test_run_streams_fake_llm():
    result = runner.invoke(app, ["run", "Hello"])
    assert result.exit_code == 0
    assert "You said:" in result.stdout
