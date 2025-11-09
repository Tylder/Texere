from texere_core.graph_executor import execute_plan_graph
from texere_core.state import Plan, State, Step


def test_graph_with_preprovided_plan_executes_one_step_then_summarizes(capsys):
    plan = Plan(
        id="p3",
        steps=[
            Step(id="s1", tool="llm.generate", args={"prompt": "ok"}, out="r1"),
            Step(id="s2", tool="repo.list_files", args={}, out="r2"),
        ],
    )
    st = State(run_id="r3", plan=plan)
    out = execute_plan_graph(st)
    assert out.plan_idx == 1
    assert out.artifacts.get("r1") == "<streamed>"
    # Second step should not have executed in v1 single-step slice
    assert "r2" not in out.artifacts
