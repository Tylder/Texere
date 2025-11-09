from texere_core.graph_executor import execute_plan_graph
from texere_core.state import Plan, State


def test_graph_creates_plan_when_missing(capsys):
    # Start with an empty plan; planner node should create a minimal plan
    plan = Plan(id="p0", steps=[])
    st = State(run_id="rplan", plan=plan)
    out_state = execute_plan_graph(st)
    captured = capsys.readouterr()
    assert "You said:" in captured.out
    assert out_state.plan_idx == 1
