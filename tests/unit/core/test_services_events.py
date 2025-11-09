from pathlib import Path

from texere_core.events import EventLogger
from texere_core.services import Services


def test_event_logger_emits_and_checkpoint(tmp_path, monkeypatch):
    # Redirect logs to temp by chdir
    monkeypatch.chdir(tmp_path)
    logger = EventLogger()
    run_id = "r1"
    logger.emit(run_id, {"event": "unit_test", "detail": 1, "run_id": run_id})
    logger.checkpoint(run_id=run_id, node="n1", plan_idx=1)

    log_file = Path(f".texere/logs/{run_id}.jsonl")
    assert log_file.exists()
    content = log_file.read_text(encoding="utf-8")
    assert "unit_test" in content and "checkpoint" in content


def test_services_default_includes_event_logger():
    svc = Services()
    assert isinstance(svc.events, EventLogger)


def test_event_logger_subscribe_and_unsubscribe(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    logger = EventLogger()
    seen = []

    def cb(e: dict):
        seen.append(e.get("event"))

    logger.subscribe(cb)
    logger.emit("r1", {"event": "e1", "run_id": "r1"})
    logger.unsubscribe(cb)
    logger.emit("r1", {"event": "e2", "run_id": "r1"})
    assert seen == ["e1"]


def test_event_logger_callback_error_is_swallowed(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    logger = EventLogger()
    seen = []

    def bad(_):
        raise RuntimeError("boom")

    def ok(e: dict):
        seen.append(e.get("event"))

    logger.subscribe(bad)
    logger.subscribe(ok)
    # Should not raise even if one subscriber fails
    logger.emit("rX", {"event": "ok", "run_id": "rX"})
    assert seen == ["ok"]
