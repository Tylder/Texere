from texere_core.state import Plan, State, Step


def test_plan_and_state_invariants_simple():
    plan = Plan(
        id="p1",
        steps=[Step(id="s1", tool="llm.generate", args={"prompt": "hi"}, out="resp")],
    )
    st = State(run_id="r1", plan=plan)

    assert st.status == "PENDING"
    assert st.plan_idx == 0
    assert len(st.plan.steps) == 1
