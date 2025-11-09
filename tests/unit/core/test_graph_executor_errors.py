from typing import Iterator

from texere_core.graph_executor import execute_plan_graph
from texere_core.state import Plan, State, Step
from texere_core import graph_executor as ge
from texere_core.events import default_logger


def test_graph_executor_emits_node_error_on_two_failures(monkeypatch):
    # Patch stream_generate to always raise
    def always_fail(_: str) -> Iterator[str]:  # type: ignore[return-type]
        raise RuntimeError("boom")

    monkeypatch.setattr(ge, "stream_generate", always_fail)
    events: list[dict] = []
    default_logger.subscribe(events.append)

    plan = Plan(
        id="p", steps=[Step(id="s1", tool="llm.generate", args={"prompt": "x"}, out="resp")]
    )
    st = State(run_id="r1", plan=plan)
    out = execute_plan_graph(st)

    kinds = [e.get("event") for e in events]
    assert "node_error" in kinds
    assert out.plan_idx == 1
    # Artifact fallback fills for executed step even on failure in this v1 slice
    assert out.artifacts.get("resp") == "<streamed>"


def test_graph_executor_retries_then_succeeds(monkeypatch):
    calls = {"n": 0}

    def fail_once(_: str):  # type: ignore[return-type]
        if calls["n"] == 0:
            calls["n"] += 1
            raise RuntimeError("transient")

        def gen():
            yield "ok "

        return gen()

    monkeypatch.setattr(ge, "stream_generate", fail_once)
    plan = Plan(
        id="p2", steps=[Step(id="s1", tool="llm.generate", args={"prompt": "y"}, out="resp")]
    )
    st = State(run_id="r2", plan=plan)
    out = execute_plan_graph(st)
    assert out.plan_idx == 1
    assert out.artifacts.get("resp") == "<streamed>"
