from texere_core.executor import execute_plan_stream
from texere_core.state import Plan, State, Step


def test_legacy_executor_streams_llm(capsys):
    plan = Plan(
        id="pL", steps=[Step(id="s1", tool="llm.generate", args={"prompt": "z"}, out="out")]
    )
    st = State(run_id="rL", plan=plan)
    execute_plan_stream(st)
    text = capsys.readouterr().out
    assert "You said:" in text
