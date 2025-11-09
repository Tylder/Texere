from texere_core.graph_executor import execute_plan_graph
from texere_core.state import Plan, State, Step


def test_graph_first_step_non_llm_sets_none_artifact(capsys):
    plan = Plan(
        id="p4",
        steps=[Step(id="s1", tool="repo.list_files", args={}, out="r1")],
    )
    st = State(run_id="r4", plan=plan)
    out = execute_plan_graph(st)
    assert out.plan_idx == 1
    assert out.artifacts.get("r1") is None
