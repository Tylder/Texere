"""LangGraph workflow construction for Texere orchestration."""

import json
import sqlite3
from pathlib import Path
from typing import (
    TYPE_CHECKING,
    Any,
    Iterator,
    Optional,
    Sequence,
)
from uuid import uuid4

from langchain_core.runnables.config import RunnableConfig
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
)
from langgraph.graph import StateGraph

from .state import WorkflowState

if TYPE_CHECKING:
    pass


# Create a minimal SQLite checkpointer compatible with LangGraph v1.x
class SimpleCheckpointer(BaseCheckpointSaver):
    """
    Simple SQLite-based checkpointer for Slice 1.

    This is a minimal implementation to store and retrieve state by thread_id.
    Implements BaseCheckpointSaver from langgraph.checkpoint.base.
    """

    def __init__(self, db_path: str) -> None:
        """Initialize checkpointer with database path."""
        super().__init__()
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        """Create tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS checkpoints (
                thread_id TEXT NOT NULL,
                checkpoint_id TEXT NOT NULL,
                metadata TEXT,
                checkpoint_values TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (thread_id, checkpoint_id)
            )
            """
        )
        conn.commit()
        conn.close()

    def get_next_version(self, current: Any, channel: Any = None) -> Any:
        """Get the next checkpoint version."""
        if current is None:
            return 1
        return current + 1

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        """Save checkpoint to database."""
        config_dict = config or {}
        thread_id = config_dict.get("configurable", {}).get("thread_id", "default")  # type: ignore
        checkpoint_id = str(uuid4())

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            metadata_json = json.dumps(metadata or {}, default=str)
            checkpoint_json = json.dumps(checkpoint or {}, default=str)

            cursor.execute(
                """
                INSERT INTO checkpoints (thread_id, checkpoint_id, metadata, checkpoint_values)
                VALUES (?, ?, ?, ?)
                """,
                (thread_id, checkpoint_id, metadata_json, checkpoint_json),
            )
            conn.commit()
            conn.close()

            # Return updated config with checkpoint_id
            return {
                **config_dict,
                "configurable": {
                    **config_dict.get("configurable", {}),
                    "checkpoint_id": checkpoint_id,
                },
            }
        except Exception:
            return config

    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        """Retrieve latest checkpoint for thread."""
        config_dict = config or {}
        thread_id = config_dict.get("configurable", {}).get("thread_id", "default")  # type: ignore

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT checkpoint_id, metadata, checkpoint_values FROM checkpoints
                WHERE thread_id = ?
                ORDER BY created_at DESC LIMIT 1
                """,
                (thread_id,),
            )
            result = cursor.fetchone()
            conn.close()

            if result:
                checkpoint_id, metadata_json, checkpoint_json = result
                return CheckpointTuple(
                    checkpoint=json.loads(checkpoint_json),
                    metadata=CheckpointMetadata(
                        **json.loads(metadata_json) if metadata_json else {}
                    ),
                    config=config,
                )
            return None
        except Exception:
            return None

    def list(
        self,
        config: Optional[RunnableConfig] = None,
        *,
        filter: Optional[dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        """List all checkpoints for thread."""
        config_dict = config or {}
        thread_id = config_dict.get("configurable", {}).get("thread_id", "default")  # type: ignore

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = """
                SELECT checkpoint_id, metadata, checkpoint_values FROM checkpoints
                WHERE thread_id = ?
                ORDER BY created_at DESC
            """

            if limit:
                query += f" LIMIT {limit}"

            cursor.execute(query, (thread_id,))
            results = cursor.fetchall()
            conn.close()

            for r in results:
                yield CheckpointTuple(
                    checkpoint=json.loads(r[2]),
                    metadata=CheckpointMetadata(**json.loads(r[1]) if r[1] else {}),
                    config=config or {},
                )
        except Exception:
            return

    def delete_thread(self, thread_id: str) -> None:
        """Delete checkpoints for thread."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM checkpoints WHERE thread_id = ?", (thread_id,))
            conn.commit()
            conn.close()
        except Exception:
            pass

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        """Store pending writes. For Slice 1, we do nothing."""
        # Slice 1 minimal implementation: no-op
        pass


def entry_node(state: WorkflowState) -> dict[str, Any]:
    """
    Minimal entry node for Slice 1.

    This node executes successfully with no-op behavior, returning an empty
    state update. Its purpose is to establish a working graph that compiles
    and executes.

    Args:
        state: Current workflow state.

    Returns:
        Empty dict (no state mutations).
    """
    # Minimal implementation: acknowledge the request and pass through
    return {}


def create_workflow_graph(
    checkpointer_dir: str = "./.texere/checkpoints",
) -> Any:
    """
    Create and compile a minimal LangGraph StateGraph for Slice 1.

    This graph has a single entry node that executes successfully, with
    state persistence via SQLite checkpointer.

    Args:
        checkpointer_dir: Directory for SQLite checkpointer.

    Returns:
        Compiled StateGraph with checkpointer.
    """
    # Create state graph
    graph = StateGraph(WorkflowState)

    # Add single entry node
    graph.add_node("entry", entry_node)

    # Set entry point
    graph.set_entry_point("entry")

    # Set finish point (graph ends after entry node)
    graph.set_finish_point("entry")

    # Compile with checkpointer
    db_path = str(Path(checkpointer_dir) / "checkpoints.db")
    checkpointer = SimpleCheckpointer(db_path)
    compiled_graph = graph.compile(checkpointer=checkpointer)

    return compiled_graph
