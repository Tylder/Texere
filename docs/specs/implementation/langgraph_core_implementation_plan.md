# LangGraph Core Implementation Plan

**Status:** Research-Validated (LangGraph v1.x)  
**Target:** Texere Orchestration Core  
**Approach:** Vertical slices per LLM Feature Workflow (docs/specs/meta/llm_feature_workflow_full.md)  
**Created:** 2025-12-05  
**Updated:** 2025-12-05 (Aligned with LangGraph v1.x best practices)

---

## Overview

This plan implements the **Orchestration Core** (per orchestration_core_spec.md) using LangGraph v1.x, structured as minimal vertical slices with TDD, early iteration, and refactor cycles. **All slices are validated against current LangGraph v1.x documentation and follow modern best practices.**

---

## Slice 1: Minimal WorkflowState & Graph Foundation

### Purpose
Establish the core data model and minimal LangGraph graph that compiles and executes a single dummy node.

### Behavior
- Define `WorkflowState` TypedDict with core fields (user_request, messages, plan, tool_calls, etc.)
- Create a minimal LangGraph StateGraph with one entry node
- Compile graph with basic checkpointer (in-memory or SQLite for dev)
- Single successful execution path with state persistence

### Acceptance Criteria
- `WorkflowState` defined and importable
- Graph compiles without errors
- Graph executes one round-trip successfully
- State is saved to checkpointer after execution
- State can be retrieved by thread_id

### Tests
**Unit:**
- `test_workflow_state_structure()` — Verify all required fields present, correct types
- `test_graph_compilation()` — Graph compiles, has required nodes/edges

**Integration:**
- `test_minimal_graph_execution()` — Execute graph once, assert state saved
- `test_checkpoint_persistence()` — Save state, retrieve by thread_id

**Negative:**
- `test_invalid_state_init()` — Missing required fields raise error
- `test_invalid_graph_compile()` — Missing nodes/edges fail gracefully

### Constraints
- No tool invocation yet
- No LLM calls
- Single linear path (entry → output)
- In-memory or simple SQLite checkpointing

---

## Slice 2: LLM Integration & Planning Node

### Purpose
Add LLM-powered reasoning node that decomposes user requests into tasks.

### Behavior
- Create `plan_node(state) → dict` that calls LLM with user_request
- LLM returns structured plan (tasks, reasoning)
- Update state with plan and subtasks (append-only via reducer)
- Add edge logic to route after planning

### Acceptance Criteria
- LLM is called with user_request from state
- Plan field is populated with reasoning
- Subtasks are appended to list
- Graph execution includes planning node
- State correctly reflects plan + subtasks after execution

### Tests
**Unit:**
- `test_plan_node_structure()` — Node has correct signature
- `test_plan_node_output_format()` — Returns dict with plan and subtasks
- `test_subtasks_reducer()` — Subtasks appended correctly

**Integration:**
- `test_planning_with_mock_llm()` — Mock LLM call, verify plan in state
- `test_graph_with_planning_node()` — Graph executes plan node successfully

**Negative:**
- `test_plan_node_with_empty_request()` — Handles empty user_request gracefully
- `test_llm_timeout()` — Error handling for LLM call failure

**Edge:**
- `test_plan_node_max_subtasks()` — Handles decomposition into many subtasks

### Constraints
- LLM choice configurable (default: claude-opus)
- Synchronous LLM calls (no async yet)
- No context window management

---

## Slice 3: Tool Invocation & Execution Loop (LangChain Tools + bind_tools)

### Purpose
Integrate LangChain tools with LLM tool-calling via bind_tools pattern.

### Behavior
- Define tools as LangChain `BaseTool` subclasses or `@tool` decorated functions
- Bind tools to LLM using `llm.bind_tools(tools)`
- Implement `agent_node()` that calls LLM with bound tools
- Extract and execute tool calls in `tool_execution_node()`
- Use `tool_calls` and `tool_results` state channels
- Loop until LLM returns no tool calls (agentic loop)

### Acceptance Criteria
- LangChain tools are defined and callable
- Tools are bound to LLM (not registry pattern)
- Agent node calls LLM and extracts tool calls
- Tool execution node invokes extracted tools
- Graph loops through tool calls until done
- tool_calls and tool_results accumulate correctly
- State updates preserve all tool invocation history

### Tests
**Unit:**
- `test_langchain_tool_definition()` — BaseTool or @tool works
- `test_bind_tools_to_llm()` — bind_tools() integrates tools
- `test_agent_node_structure()` — Agent node signature correct
- `test_tool_call_extraction()` — LLM output parsed correctly
- `test_tool_execution_node()` — Tool invoked with args

**Integration:**
- `test_tool_invocation_loop()` — Agent calls tools, accumulates results
- `test_agent_response_when_done()` — LLM stops calling tools

**Negative:**
- `test_tool_invocation_failure()` — Tool error in state, agent handles
- `test_invalid_tool_args()` — LLM generates bad args, error captured
- `test_tool_timeout()` — Timeout captured in tool_results

**Edge:**
- `test_multiple_tools_same_step()` — Multiple tools in parallel
- `test_many_tool_calls_loop()` — Long agentic loop
- `test_tool_call_with_complex_args()` — JSON args parsed correctly

### Constraints
- Tools are LangChain BaseTool or @tool functions (not custom protocol)
- LLM must support tool calling (e.g., Claude, GPT-4)
- Synchronous invocation only
- No custom retry logic (use resumption in Slice 4)

---

## Slice 4: Error Handling & Dynamic Interrupts

### Purpose
Add robust error handling using LangGraph's dynamic `interrupt()` function for semantic errors and state persistence for automatic recovery.

### Behavior
- Use `interrupt()` function for blocking semantic errors (e.g., validation failure)
- Errors before interrupt (side effects) must be idempotent
- State persists automatically via checkpointer
- Resume workflow with `Command(resume=value)` from same thread_id
- Fatal errors propagate and stop execution (no custom handling)
- Tool failures captured in state, not retried automatically

### Acceptance Criteria
- Semantic errors call `interrupt()` with error details
- Graph pauses and returns error to caller
- State is saved and can be resumed
- Resumption re-runs node from beginning
- Side effects before interrupt are idempotent
- Human provides resume value, node continues
- Fatal errors stop execution naturally

### Tests
**Unit:**
- `test_interrupt_function_basic()` — Interrupt called, returns payload
- `test_interrupt_payload_json()` — Payload is JSON-serializable
- `test_idempotent_operations()` — Operations before interrupt are safe to repeat

**Integration:**
- `test_semantic_error_interrupt()` — Validation fails, calls interrupt
- `test_interrupt_and_resume()` — Graph pauses, resumes with Command
- `test_multiple_interrupts_in_node()` — Multiple interrupts ordered correctly
- `test_state_preserved_across_interrupt()` — State saved and recovered

**Negative:**
- `test_non_idempotent_before_interrupt()` — Document risk if side effect not idempotent
- `test_resume_with_missing_value()` — Error if resume value missing
- `test_fatal_error_no_recovery()` — Fatal error stops, no resumption

**Edge:**
- `test_interrupt_in_loop()` — Multiple iterations with interrupt
- `test_side_effect_after_interrupt()` — Side effect safe after interrupt
- `test_complex_resume_payload()` — Structured data in resume value

### Constraints
- Leverage LangGraph's built-in persistence (checkpointer)
- Code before `interrupt()` must be idempotent
- No custom retry wrapper (rely on resumption)
- Interrupt payload is JSON-serializable only
- No exponential backoff (resumption is manual)

---

## Slice 5: Streaming & Observability

### Purpose
Enable real-time state streaming and optional custom event emission.

### Behavior
- Use `.stream()` or `.astream()` with `stream_mode` parameter
- Support modes: `values` (full state), `updates` (deltas), `messages` (LLM tokens), `custom` (user data), `debug` (full trace)
- Emit custom events from nodes using `get_stream_writer(runtime)`
- LangSmith tracing is automatic (no manual setup)
- Structured logging via standard Python logging

### Acceptance Criteria
- Graph supports `.stream()` with multiple stream_modes
- `updates` mode streams state deltas
- `values` mode streams full state after each step
- `custom` mode streams user-defined events from nodes
- `messages` mode streams LLM token outputs
- Custom events use `get_stream_writer()` within nodes
- Tracing works automatically (no configuration needed)

### Tests
**Unit:**
- `test_stream_mode_updates()` — Delta streaming works
- `test_stream_mode_values()` — Full state streaming works
- `test_stream_custom_events()` — Custom events emit correctly
- `test_get_stream_writer()` — Stream writer accessible in node

**Integration:**
- `test_stream_multiple_modes()` — Multiple modes together
- `test_custom_events_in_tool()` — Events from tool function
- `test_token_streaming_from_llm()` — LLM tokens stream in messages mode

**Negative:**
- `test_stream_with_no_mode()` — Works with default mode
- `test_custom_event_serialization()` — Events must be JSON-serializable

**Edge:**
- `test_high_volume_custom_events()` — Many events don't block
- `test_custom_events_in_loop()` — Events work in iterative graph

### Constraints
- Stream modes are built-in (no custom event system)
- Custom events must be JSON-serializable
- `get_stream_writer()` not available in Python < 3.11 async (use writer param instead)
- LangSmith tracing is automatic; no manual configuration

---

## Slice 6: RAG Integration & Code Search

### Purpose
Integrate codebase indexing and semantic code search via RAG.

### Behavior
- Define `codebase_summary` initialization from long-term memory or fresh index
- Create `code_search_tool()` that queries semantic index for relevant code
- Implement `retrieve_code_node()` that calls code search and appends to relevant_files
- Add context management (mask old results, summarize if needed)
- Integrate vector DB client (Qdrant, Pinecone, etc.)

### Acceptance Criteria
- Codebase can be indexed and embedded
- Code search returns top-K relevant files
- Results include metadata (file, line range, symbol type)
- Retrieved code is appended to state.relevant_files
- Context windowing prevents bloat
- Graph can retrieve code before planning/tool invocation

### Tests
**Unit:**
- `test_code_search_tool()` — Returns ranked results
- `test_vector_db_connection()` — Connects and queries
- `test_context_masking()` — Old results masked correctly

**Integration:**
- `test_indexing_small_codebase()` — Index real code files
- `test_semantic_search_query()` — Search returns expected results
- `test_retrieve_code_node()` — Node updates state.relevant_files

**Negative:**
- `test_empty_codebase()` — Handles codebase with no code
- `test_search_no_matches()` — Returns empty gracefully
- `test_vector_db_unavailable()` — Fallback or error handling

**Edge:**
- `test_large_codebase_indexing()` — Indexes 1K+ files
- `test_context_overflow_summarization()` — Summarizes when too much code

### Constraints
- Vector DB is mocked/optional for early tests
- Indexing is offline (not in workflow path)
- No dynamic re-indexing mid-execution

---

## Slice 7: Message History & Conversation Management

### Purpose
Build conversation history with native LangGraph message handling and optional context windowing.

### Behavior
- Use `MessagesState` (built-in) or extend with `add_messages` reducer
- Messages append automatically via `add_messages` reducer (deduplication built-in)
- Implement `trim_messages_node()` to keep last N messages before context limit
- Implement optional `summarize_messages_node()` that replaces old messages with summary
- Use `RemoveMessage` to delete specific messages if needed
- Full history available in checkpoints (thread-scoped)

### Acceptance Criteria
- `MessagesState` or compatible state with `add_messages` reducer
- Messages deduplicate automatically (same role/content)
- Messages append without manual deduplication logic
- Trimming removes old messages (keep last N)
- Summarization compresses message range into single summary
- `RemoveMessage` deletes specific messages
- Full history preserved in checkpoints for thread

### Tests
**Unit:**
- `test_messages_state_structure()` — MessagesState correct
- `test_add_messages_reducer()` — Messages append correctly
- `test_message_deduplication()` — Duplicates removed automatically
- `test_trim_messages()` — Keeps last N correctly

**Integration:**
- `test_add_messages_in_node()` — Node appends messages
- `test_summarize_messages_node()` — Summarization works
- `test_trim_before_llm_call()` — Trim prevents context overflow
- `test_remove_message()` — Delete specific messages

**Negative:**
- `test_empty_message_list()` — Handles no messages
- `test_trim_with_few_messages()` — Graceful with < N messages
- `test_invalid_message_format()` — Validates message structure

**Edge:**
- `test_very_large_message()` — Individual messages > token limit
- `test_mixed_summarize_and_trim()` — Both strategies together
- `test_checkpoints_preserve_history()` — Full history recoverable

### Constraints
- Use `MessagesState` or `add_messages` reducer (built-in LangGraph)
- Deduplication is automatic; no custom logic
- Trimming uses `trim_messages()` utility (LangChain)
- Summarization is optional, implemented as node

---

## Slice 8: Memory Systems (Short & Long Term)

### Purpose
Implement short-term (thread-scoped) and long-term (cross-thread) memory using checkpointer and Store.

### Behavior
- **Short-term:** Thread-level persistence via checkpointer (automatic from Slice 1)
- **Long-term:** Use LangGraph `Store` interface for cross-thread facts
- Namespace store by `{user_id}/{repo_id}/{memory_type}`
- Implement `retrieve_memory_node()` that queries store before workflow
- Implement `store_memory_node()` that saves learned patterns after workflow
- Store supports semantic search (embed before storing)

### Acceptance Criteria
- Checkpointer provides thread-scoped short-term memory (automatic)
- Store provides cross-thread long-term memory
- Memory namespaced by user/repo/type
- Retrieval queries store and injects into state
- Storage saves patterns after workflow (post-execution)
- Semantic search works for similar patterns
- Graceful when memory missing (no failure)

### Tests
**Unit:**
- `test_store_interface()` — Store put/get/search work
- `test_namespace_format()` — Namespace isolation
- `test_store_semantic_embedding()` — Embed before store

**Integration:**
- `test_retrieve_memory_before_workflow()` — Pre-workflow memory load
- `test_store_memory_after_workflow()` — Post-workflow memory save
- `test_semantic_memory_search()` — Query by similarity
- `test_episodic_memory()` — Store past interaction summaries

**Negative:**
- `test_missing_memory_graceful()` — No memory; workflow continues
- `test_empty_store_query()` — Returns empty list gracefully
- `test_namespace_collision()` — Isolation between users

**Edge:**
- `test_large_store_query()` — Many results retrieved
- `test_store_update_conflict()` — Newer facts override
- `test_semantic_search_relevance()` — Ranking by similarity

### Constraints
- Checkpointer is thread-scoped (short-term only)
- Store is cross-thread (long-term)
- No in-memory copy of store in nodes; query at runtime
- Semantic search requires embedding (external or LLM)

---

## Slice 9: State Validation & Time-Travel

### Purpose
Validate state and enable time-travel debugging (load prior checkpoints, branch execution).

### Behavior
- Checkpointing is automatic (LangGraph handles per super-step)
- Implement `validate_state_node()` that calls `interrupt()` on validation failure
- Use `get_state_history()` to list all checkpoints for a thread
- Use `update_state()` to modify state and create checkpoint fork
- Use `invoke()` with `checkpoint_id` to resume from specific checkpoint
- Time-travel creates independent branches (new fork_id)

### Acceptance Criteria
- State schema enforced by TypedDict
- Validation logic in nodes (calls interrupt on failure)
- `get_state_history()` returns all checkpoints ordered (newest first)
- Each checkpoint has checkpoint_id, values, next
- `update_state()` creates new checkpoint fork
- `invoke()` with prior checkpoint_id resumes and branches
- Branching creates independent fork (doesn't overwrite history)

### Tests
**Unit:**
- `test_state_schema_typing()` — TypedDict enforces schema
- `test_validate_state_logic()` — Validation checks work

**Integration:**
- `test_checkpoint_automatic_save()` — Checkpoints saved per super-step
- `test_get_state_history()` — Full history retrievable
- `test_update_state_creates_fork()` — State edits create checkpoint
- `test_time_travel_resume()` — Load prior checkpoint, continue
- `test_time_travel_branch()` — Branches don't affect original

**Negative:**
- `test_invalid_state_rejected()` — Invalid values caught early
- `test_missing_checkpoint()` — Graceful not-found
- `test_empty_state_history()` — Thread with no checkpoints

**Edge:**
- `test_checkpoint_at_interruption()` — Interrupt creates checkpoint
- `test_branch_from_mid_execution()` — Fork mid-workflow
- `test_update_state_with_reducers()` — Reducers applied in update

### Constraints
- Checkpointing is automatic; no manual save
- Schema validation via TypedDict (compile-time)
- Time-travel creates forks; no merge
- Checkpoint history ordered newest-first

---

## Slice 10: Configuration & Extensibility

### Purpose
Provide flexible configuration for LLM, checkpointer, store, and runtime context.

### Behavior
- Define minimal `OrchestrationConfig` with: checkpointer type, store type, LLM model, context_schema
- Pass checkpointer and store to `.compile()`
- Pass LLM and other runtime data via `context` parameter to `.invoke()`
- Environment variables override defaults (dev vs prod)
- Feature flags implemented as conditional edges/nodes (not config)

### Acceptance Criteria
- Config has: checkpointer, store, llm_model, context_schema
- Checkpointer can be InMemorySaver (dev) or SqliteSaver/PostgresSaver (prod)
- Store can be in-memory or persistent
- LLM can be swapped via context parameter
- Conditional edges enable/disable features dynamically
- Environment variables set dev/prod defaults
- Config is immutable after graph compilation

### Tests
**Unit:**
- `test_config_structure()` — Config fields present
- `test_config_validation()` — Type validation
- `test_context_schema()` — Context structure enforced

**Integration:**
- `test_dev_config_with_memory_checkpointer()` — InMemorySaver works
- `test_prod_config_with_postgres()` — PostgresSaver works
- `test_llm_injection_via_context()` — Context parameter works
- `test_env_var_override()` — Environment sets checkpointer type

**Negative:**
- `test_invalid_config_value()` — Type error caught
- `test_missing_required_field()` — Config incomplete error
- `test_incompatible_store()` — Store not found

**Edge:**
- `test_custom_context_schema()` — User-defined context fields
- `test_multiple_checkpointer_types()` — Switch based on env

### Constraints
- Config applied only at `.compile()` time
- No runtime config changes
- Simple Pydantic validation
- Feature flags are code (conditional edges), not config bools

---

## Slice 11: End-to-End Workflow Execution

### Purpose
Integrate all slices into a complete workflow that handles a real user request.

### Behavior
- Combine all nodes into a single coherent graph
- Plan → Code Search → Tool Selection Loop → Validation → Output
- User request flows through entire pipeline
- Streaming and checkpointing work throughout
- Memory is used and updated
- Errors trigger interrupts or retries

### Acceptance Criteria
- Graph executes user request from start to finish
- Plan is created and refined
- Code is searched and retrieved
- Tools are invoked multiple times
- Validation errors trigger interrupts
- Final response is generated
- Entire run is checkpointed and resumable
- Streaming events flow throughout

### Tests
**Integration (E2E):**
- `test_simple_code_understanding_request()` — User asks about codebase, gets answer
- `test_code_modification_workflow()` — User requests change, workflow makes it
- `test_workflow_with_interruption()` — Validation error triggers interrupt, user approves

**Negative:**
- `test_workflow_with_failed_tool()` — Tool fails, error handled
- `test_workflow_timeout()` — Execution timeout

**Edge:**
- `test_long_running_workflow()` — Many tool calls, many iterations
- `test_workflow_with_memory()` — Uses prior context from long-term memory

### Constraints
- All sub-components are complete from prior slices
- No performance optimization yet
- Single-threaded execution

---

## Implementation Sequence

**Phase 1: Foundation** (Slices 1–3)
- Core state, graph, LLM, tool coordination

**Phase 2: Robustness** (Slices 4–5)
- Error handling, streaming, observability

**Phase 3: Intelligence** (Slices 6–8)
- RAG, memory, conversation management

**Phase 4: Operations** (Slices 9–10)
- Validation, checkpointing, configuration

**Phase 5: Integration** (Slice 11)
- End-to-end workflow

---

## Refactor Permission Template

**After Slice 1 (Foundation):**
- Refactor: YES (internal structure, not public API)
- Scope: State definition, node signatures, graph topology

**After Slice 5 (Streaming):**
- Refactor: YES (node implementation, message handling)
- Scope: Individual node logic, not message format or event schema

**After Slice 8 (Memory):**
- Refactor: YES (internal memory operations)
- Scope: Memory namespacing, retrieval logic

**After Slice 10 (Config):**
- Refactor: NO (approaching production)
- Scope: Only critical bug fixes

---

## Success Criteria (By Phase)

| Phase | Goal | Success Metric |
|-------|------|---|
| Phase 1 | Foundational LangGraph working | Graph executes, state persists, tools invoke |
| Phase 2 | Error handling and observability | Errors caught, events stream, graphs recover |
| Phase 3 | Intelligence and memory | Code search works, memory persists, context managed |
| Phase 4 | Operational robustness | Validation tight, checkpoints reliable, config flexible |
| Phase 5 | Production-ready E2E | Real workflows execute, all slices integrated, tests pass |

---

## Risk Mitigation

| Risk | Mitigation |
|------|---|
| Complex state merging | TDD + unit tests; start with simple reducers |
| LLM token explosion | Early windowing + summarization (Slice 7) |
| Tool invocation failures | Retry + error categorization (Slice 4) |
| Memory overhead | Masking + async updates (Slice 8) |
| Checkpoint size bloat | Selective checkpointing strategy (Slice 9) |
| Config sprawl | Simple validation, documented defaults (Slice 10) |

---

## Dependencies & Assumptions

**Required Packages:**
- `langgraph` (core orchestration)
- `langchain` (LLM, tools, memory)
- `langchain-core` (base types)
- `pydantic` (config validation)
- Vector DB client (qdrant-client, pinecone, etc.)
- `pytest` (testing)

**Assumptions:**
- LLM provider (OpenAI, Anthropic) is available
- Vector DB (Qdrant, Pinecone) can be mocked for early tests
- SQLite available for checkpointing (or mock)
- Python 3.10+ (TypedDict with `Annotated`)

---

## Glossary

- **Slice:** Minimal vertical feature with tests, implementation, and refactor
- **Walking skeleton:** Simplest end-to-end behavior
- **Checkpointer:** Mechanism to persist and restore state
- **Reducer:** Function that merges state updates (e.g., append, replace)
- **RAG:** Retrieval-Augmented Generation (semantic code search)
- **Interrupt:** Pause workflow for human input
- **Time-Travel:** Load prior checkpoint and branch execution
