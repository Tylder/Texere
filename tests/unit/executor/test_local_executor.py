import os
import sys
from pathlib import Path

from texere_core.local_executor import run_local_exec


def test_local_exec_approval_and_audit(tmp_path, mocker):
    # Run inside a temp dir so logs land under .texere/logs here
    cwd = tmp_path
    os.chdir(cwd)

    # Auto-approve HITL prompt
    mocker.patch("texere_core.local_executor.Confirm.ask", return_value=True)

    code = run_local_exec(
        [sys.executable, "-c", "print('hello')"], timeout_sec=5, require_hitl=True
    )
    assert code == 0

    log_file = Path(".texere/logs/local_executor.jsonl")
    assert log_file.exists()
    content = log_file.read_text(encoding="utf-8")
    assert "exec.local" in content
    assert "APPROVED" in content
