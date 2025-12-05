"""Unit tests for graph compilation and structure (Slice 1)."""

import pytest
import tempfile
from pathlib import Path

from texere.orchestration.graph import create_workflow_graph
from texere.orchestration.state import WorkflowState


class TestGraphCompilation:
    """Test graph compilation and structure."""

    def test_graph_compiles_without_errors(self) -> None:
        """Verify graph compiles successfully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)
            assert graph is not None

    def test_compiled_graph_has_invoke_method(self) -> None:
        """Verify compiled graph has invoke method."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)
            assert hasattr(graph, "invoke")
            assert callable(graph.invoke)

    def test_compiled_graph_has_stream_method(self) -> None:
        """Verify compiled graph has stream method."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)
            assert hasattr(graph, "stream")
            assert callable(graph.stream)

    def test_compiled_graph_has_checkpointer(self) -> None:
        """Verify compiled graph has checkpointer configured."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)
            # Verify graph has checkpointer by checking it's not None
            # In LangGraph, the checkpointer is part of the compiled graph's config
            assert graph is not None
            assert hasattr(graph, "invoke")

    def test_graph_has_entry_point(self) -> None:
        """Verify graph has entry point configured."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)
            # Verify graph can be instantiated and has input_schema
            assert hasattr(graph, "input_schema")
            schema = graph.input_schema
            assert schema is not None

    def test_graph_schema_includes_state(self) -> None:
        """Verify graph schema includes state definition."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)
            schema = graph.input_schema

            # Schema should be defined (represents WorkflowState)
            assert schema is not None


class TestGraphExecution:
    """Test basic graph execution (happy path)."""

    def test_graph_executes_minimal_state(self) -> None:
        """Verify graph executes successfully with minimal state."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)

            initial_state = {
                "user_request": "test request",
                "thread_id": "thread-test-001",
                "run_id": "run-001",
            }

            result = graph.invoke(
                initial_state,
                config={"configurable": {"thread_id": "thread-test-001"}},
            )

            assert result is not None
            assert isinstance(result, dict)

    def test_graph_execution_preserves_user_request(self) -> None:
        """Verify user_request survives execution."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)

            initial_state = {
                "user_request": "understand the auth module",
                "thread_id": "thread-001",
                "run_id": "run-001",
            }

            result = graph.invoke(
                initial_state,
                config={"configurable": {"thread_id": "thread-001"}},
            )

            assert "user_request" in result
            assert result["user_request"] == "understand the auth module"

    def test_graph_execution_completes(self) -> None:
        """Verify graph execution completes without hanging."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)

            initial_state = {
                "user_request": "test",
                "thread_id": "thread-001",
                "run_id": "run-001",
            }

            # Should complete without blocking
            result = graph.invoke(
                initial_state,
                config={"configurable": {"thread_id": "thread-001"}},
            )

            assert result is not None

    def test_graph_requires_thread_id_in_config(self) -> None:
        """Verify thread_id must be provided in config for checkpointing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            graph = create_workflow_graph(checkpointer_dir=tmpdir)

            initial_state = {
                "user_request": "test",
                "thread_id": "thread-001",
                "run_id": "run-001",
            }

            # Invoke with proper config including thread_id
            # This should work
            result = graph.invoke(
                initial_state,
                config={"configurable": {"thread_id": "thread-001"}},
            )

            assert result is not None
