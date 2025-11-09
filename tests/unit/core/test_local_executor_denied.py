import os
from pathlib import Path

from texere_core.local_executor import run_local_exec


def test_local_exec_denied_logs_and_returns_130(tmp_path, mocker):
    cwd = tmp_path
    os.chdir(cwd)

    mocker.patch("texere_core.local_executor.Confirm.ask", return_value=False)

    code = run_local_exec(["echo", "hi"], timeout_sec=1, require_hitl=True)
    assert code == 130

    log_file = Path(".texere/logs/local_executor.jsonl")
    content = log_file.read_text(encoding="utf-8")
    assert "DENIED" in content
    assert "exec.local" in content
