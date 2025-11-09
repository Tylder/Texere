from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Callable, List


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _run_log_path(run_id: str) -> Path:
    base = Path(".texere/logs")
    base.mkdir(parents=True, exist_ok=True)
    # Per-run JSONL file
    return base / f"{run_id}.jsonl"


class EventLogger:
    """Minimal JSONL event sink for runtime and checkpoints (per-run files)."""

    def __init__(self) -> None:
        self._subs: List[Callable[[Dict[str, Any]], None]] = []

    def subscribe(self, cb: Callable[[Dict[str, Any]], None]) -> None:
        self._subs.append(cb)

    def unsubscribe(self, cb: Callable[[Dict[str, Any]], None]) -> None:
        if cb in self._subs:
            self._subs.remove(cb)

    def emit(self, run_id: str, event: Dict[str, Any]) -> None:
        rec = {"ts": _now_iso(), **event}
        with _run_log_path(run_id).open("a", encoding="utf-8") as f:
            f.write(json.dumps(rec) + "\n")
        for cb in list(self._subs):
            try:
                cb(rec)
            except Exception:
                # Swallow callback errors to not break runtime
                pass

    def checkpoint(self, *, run_id: str, node: str, plan_idx: int) -> None:
        self.emit(
            run_id,
            {
                "event": "checkpoint",
                "run_id": run_id,
                "node": node,
                "plan_idx": plan_idx,
            },
        )


# Default, process‑wide logger for simple in‑proc pub/sub
default_logger = EventLogger()
