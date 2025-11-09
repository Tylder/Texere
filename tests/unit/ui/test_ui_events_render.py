from texere_cli.ui.app import TexereApp


def test_ui_handles_runtime_events_without_loop():
    app = TexereApp()
    # Simulate stream event
    app.handle_runtime_event({"event": "stream", "chunk": "token"})
    # Simulate node start/finish and checkpoint
    app.handle_runtime_event(
        {"event": "node_start", "node": "plan_executor_node", "tool": "llm.generate", "plan_idx": 0}
    )
    app.handle_runtime_event(
        {
            "event": "node_finish",
            "node": "plan_executor_node",
            "tool": "llm.generate",
            "plan_idx": 1,
        }
    )
    app.handle_runtime_event({"event": "checkpoint", "node": "plan_executor_node", "plan_idx": 1})
    # Verify transcript got lines
    transcript = "\n".join(app.transcript.lines)
    assert "token" in transcript
    assert "node_start" in transcript and "node_finish" in transcript and "checkpoint" in transcript
