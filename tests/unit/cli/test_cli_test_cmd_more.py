import click
from contextlib import suppress
import texere_cli.main as m


def test_cli_test_command_respects_paths_and_no_cov(mocker):
    fake_run = mocker.patch("texere_cli.main.subprocess.run")
    fake_run.return_value.returncode = 0
    with suppress(click.exceptions.Exit):
        m.test(paths=["tests/unit/core"], cov=False, xml=False, mark=None, kexpr=None)
    called = fake_run.call_args[0][0]
    # Should end with the provided path
    assert called[-1] == "tests/unit/core"
    # No coverage flags present
    assert not any(a.startswith("--cov") for a in called)
