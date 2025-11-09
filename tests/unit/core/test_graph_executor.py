from texere_core.graph_executor import execute_plan_graph
from texere_core.state import Plan, State, Step


def test_execute_plan_graph_llm_stream(capsys):
    plan = Plan(
        id="p1",
        steps=[Step(id="s1", tool="llm.generate", args={"prompt": "hi"}, out="resp")],
    )
    st = State(run_id="r1", plan=plan)
    out_state = execute_plan_graph(st)
    captured = capsys.readouterr()
    assert "You said:" in captured.out
    assert out_state.plan_idx == 1
    assert out_state.artifacts.get("resp") == "<streamed>"


def test_execute_plan_graph_stub_tool(capsys):
    plan = Plan(
        id="p2",
        steps=[Step(id="s1", tool="repo.list_files", args={}, out="out")],
    )
    st = State(run_id="r2", plan=plan)
    out_state = execute_plan_graph(st)
    captured = capsys.readouterr()
    assert "Stub tool: no-op" in captured.out
    assert out_state.plan_idx == 1
    assert out_state.artifacts.get("out") is None
