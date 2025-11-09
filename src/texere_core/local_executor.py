from __future__ import annotations

import json
import os
import shlex
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from rich.console import Console
from rich.prompt import Confirm


console = Console()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _log_path() -> Path:
    base = Path(".texere/logs")
    base.mkdir(parents=True, exist_ok=True)
    # Single rolling file keeps it simple for v0
    return base / "local_executor.jsonl"


def run_local_exec(
    cmd: List[str],
    cwd: str | None = None,
    timeout_sec: int = 30,
    require_hitl: bool = True,
) -> int:
    """Execute a command on the local machine with optional HITL approval.

    - No sandbox by design (Amp/Codex behavior). Gate with HITL.
    - Writes JSONL audit to .texere/logs/local_executor.jsonl
    """
    text_cmd = " ".join(shlex.quote(c) for c in cmd)
    if require_hitl:
        approved = Confirm.ask(
            f"Approve EXEC? [dim]{text_cmd}[/dim] (timeout={timeout_sec}s)", default=False
        )
        decision = "APPROVED" if approved else "DENIED"
        if not approved:
            _write_log(
                command=text_cmd,
                cwd=cwd or os.getcwd(),
                timeout_sec=timeout_sec,
                decision=decision,
                exit_code=None,
                duration_ms=0,
            )
            console.print("[yellow]Execution cancelled by user (HITL).[/yellow]")
            return 130
    else:
        decision = "AUTO"

    start = time.time()
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            timeout=timeout_sec,
            capture_output=True,
            text=True,
        )
        exit_code = proc.returncode
        if proc.stdout:
            console.print(proc.stdout, end="")
        if proc.stderr:
            console.print(proc.stderr, end="")
        return exit_code
    finally:
        duration_ms = int((time.time() - start) * 1000)
        _write_log(
            command=text_cmd,
            cwd=cwd or os.getcwd(),
            timeout_sec=timeout_sec,
            decision=decision,
            exit_code=locals().get("exit_code"),
            duration_ms=duration_ms,
        )


def _write_log(
    *,
    command: str,
    cwd: str,
    timeout_sec: int,
    decision: str,
    exit_code: Optional[int],
    duration_ms: int,
) -> None:
    rec = {
        "ts": _now_iso(),
        "event": "exec.local",
        "command": command,
        "cwd": cwd,
        "timeout_sec": timeout_sec,
        "decision": decision,
        "exit_code": exit_code,
        "duration_ms": duration_ms,
    }
    with _log_path().open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")

