from texere_core.state import Plan, State, Step
from texere_core.executor import execute_plan_stream


def test_execute_plan_stream_stub_tool(capsys):
    plan = Plan(
        id="p2",
        steps=[Step(id="s1", tool="repo.list_files", args={}, out="out")],
    )
    st = State(run_id="r2", plan=plan)
    execute_plan_stream(st)
    captured = capsys.readouterr()
    assert "Stub tool: no-op" in captured.out
    assert st.artifacts.get("out") is None
