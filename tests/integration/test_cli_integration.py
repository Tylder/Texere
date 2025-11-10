import pytest
from typer.testing import CliRunner

from texere_cli.main import app


@pytest.mark.integration
def test_cli_run_smoke():
    runner = CliRunner()
    result = runner.invoke(app, ["run", "Hello"], catch_exceptions=False)
    assert result.exit_code == 0
    assert "You said: Hello" in result.stdout
