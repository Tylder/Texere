"""Unit tests for WorkflowState structure (Slice 1)."""

import pytest
from typing import get_type_hints

from texere.orchestration.state import WorkflowState


class TestWorkflowStateStructure:
    """Test WorkflowState definition and field structure."""

    def test_workflow_state_is_typeddict(self) -> None:
        """Verify WorkflowState is properly defined as a TypedDict."""
        # TypedDict should be a dict-like type
        hints = get_type_hints(WorkflowState, include_extras=True)
        assert isinstance(hints, dict)
        assert len(hints) > 0

    def test_workflow_state_has_required_fields(self) -> None:
        """Verify all required fields are present in WorkflowState."""
        hints = get_type_hints(WorkflowState, include_extras=True)

        # Core fields for Slice 1
        required_fields = {
            "user_request",
            "thread_id",
            "run_id",
            "messages",
            "plan",
            "subtasks",
            "codebase_summary",
            "relevant_files",
            "tool_calls",
            "tool_results",
            "proposed_changes",
            "executed_changes",
            "test_results",
            "validation_errors",
            "final_response",
            "success",
            "error_context",
        }

        for field in required_fields:
            assert field in hints, f"Field '{field}' missing from WorkflowState"

    def test_workflow_state_field_types(self) -> None:
        """Verify field types are correct."""
        hints = get_type_hints(WorkflowState, include_extras=True)

        # Test key field types
        assert hints["user_request"] == str
        assert hints["thread_id"] == str
        assert hints["run_id"] == str

        # Verify string-based type hints are preserved
        assert "list" in str(hints["messages"]).lower()
        assert "dict" in str(hints["tool_results"]).lower()

    def test_workflow_state_instantiation_with_all_fields(self) -> None:
        """Test that WorkflowState can be instantiated with all fields."""
        # Note: TypedDict instances are actually just dicts
        state = WorkflowState(
            user_request="test request",
            thread_id="thread-123",
            run_id="run-456",
            messages=[],
            plan=None,
            subtasks=[],
            codebase_summary=None,
            relevant_files=[],
            tool_calls=[],
            tool_results={},
            proposed_changes=None,
            executed_changes=[],
            test_results=None,
            validation_errors=[],
            final_response=None,
            success=False,
            error_context=None,
        )

        assert state["user_request"] == "test request"
        assert state["thread_id"] == "thread-123"
        assert isinstance(state["messages"], list)
        assert isinstance(state["tool_results"], dict)

    def test_workflow_state_partial_instantiation(self) -> None:
        """Test that WorkflowState can be instantiated with partial fields (TypedDict total=False)."""
        # Since total=False, not all fields are required
        state: WorkflowState = {
            "user_request": "test",
        }

        assert state["user_request"] == "test"
        assert len(state) == 1

    def test_workflow_state_messages_field_is_annotated(self) -> None:
        """Verify messages field has operator.add reducer annotation."""
        hints = get_type_hints(WorkflowState, include_extras=True)
        # The hint includes Annotated metadata
        messages_hint = str(hints["messages"])
        assert "Annotated" in messages_hint
        assert "add" in messages_hint

    def test_workflow_state_append_only_fields(self) -> None:
        """Verify append-only fields are properly annotated."""
        hints = get_type_hints(WorkflowState, include_extras=True)

        append_fields = [
            "messages",
            "subtasks",
            "relevant_files",
            "tool_calls",
            "executed_changes",
            "validation_errors",
        ]

        for field in append_fields:
            hint_str = str(hints[field])
            assert "Annotated" in hint_str, f"{field} should be Annotated"
            assert "add" in hint_str, f"{field} should have add reducer"


class TestInvalidStateInit:
    """Test error handling for invalid state initialization (negative tests)."""

    def test_state_with_wrong_field_type(self) -> None:
        """Verify wrong types don't prevent instantiation (Python dicts are permissive)."""
        # Python TypedDict is permissive at runtime, but static type checkers would catch this
        state: WorkflowState = {
            "user_request": 123,  # Should be str
            "messages": "not a list",  # Should be list
        }

        # At runtime, dict accepts anything
        assert state["user_request"] == 123
        assert isinstance(state["messages"], str)

    def test_state_with_extra_fields(self) -> None:
        """Test that TypedDict allows extra fields at runtime."""
        state: WorkflowState = {
            "user_request": "test",
            "extra_field": "value",
        }

        assert state["user_request"] == "test"
        assert state["extra_field"] == "value"
