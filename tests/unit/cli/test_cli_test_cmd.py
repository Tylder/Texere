import texere_cli.main as m
import click
from contextlib import suppress


def test_cli_test_command_builds_pytest_args(mocker):
    fake_run = mocker.patch("texere_cli.main.subprocess.run")
    fake_run.return_value.returncode = 0

    # Call the function directly to bypass Typer CLI parsing quirks
    with suppress(click.exceptions.Exit):
        m.test(paths=None, cov=True, xml=True, mark="not integration", kexpr="foo")

    called_args = fake_run.call_args[0][0]
    # Ensure python -m pytest -q invocation shape (ignore exact python path)
    assert called_args[1:4] == ["-m", "pytest", "-q"]
    # Ensure our flags were passed through
    assert "--cov=src" in called_args
    assert "--cov-report=term-missing" in called_args
    assert "--cov-report=xml" in called_args
    # Marker and -k filtering
    assert "-m" in called_args and "not integration" in called_args
    assert "-k" in called_args and "foo" in called_args
    # Default test path
    assert called_args[-1] == "tests"
