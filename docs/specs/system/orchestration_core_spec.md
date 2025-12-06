# Orchestration Core Specification

**Document Version:** 0.1  
**Last Updated:** December 2025  
**Status:** Draft

**Relationship:** Implements layer defined in [high-level spec § 5.1](../README.md#51-orchestration-core-langgraph-python)

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Audience](#2-audience)
- [3. Overview](#3-overview)
- [4. Architecture Principles](#4-architecture-principles)
- [5. State Models](#5-state-models)
- [6. Memory Systems](#6-memory-systems)
- [7. Tool Coordination](#7-tool-coordination)
- [8. RAG Integration](#8-rag-integration)
- [9. Checkpoint & Resumption](#9-checkpoint--resumption)
- [10. Error Handling & Retries](#10-error-handling--retries)
- [11. Streaming & Observability](#11-streaming--observability)
- [12. Configuration & Extensibility](#12-configuration--extensibility)
- [13. Non-Functional](#13-non-functional)
- [14. References](#14-references)
- [15. Changelog](#15-changelog)

---

## 1. Scope

**In Scope (§1):**

- LangGraph-based workflow architecture and composition
- State models and threading semantics
- Memory systems (short-term and long-term)
- Tool coordination and invocation interfaces
- RAG (Retrieval-Augmented Generation) integration for code understanding
- Checkpoint and resumption behavior
- Error handling and retry logic
- Streaming and observability hooks
- Configuration and extensibility patterns

**Out of Scope (§1):**

- API gateway design (covered in `api_gateway_spec.md`)
- Client-facing interfaces (covered in `client_library_spec.md`)
- Deployment and infrastructure (covered in `persistence_infra_spec.md`)
- Security policies (covered in `security_policy_spec.md`)

**Cite as:** §1

## 2. Audience

This specification is written for:
- **Backend Engineers:** Implementing workflows, nodes, and tool integrations
- **Core/Platform Team:** Designing checkpointing, memory, and extensibility
- **Observability Team:** Instrumenting workflows and collecting traces
- **DevOps:** Understanding resource requirements and configuration

**Cite as:** §2

## 3. Overview

The Orchestration Core is the heart of Texere, hosting LangGraph workflows that handle stateful, multi-step agent execution for code understanding and change implementation.

This spec defines:
- LangGraph-based workflow architecture and composition
- State models and threading semantics
- Memory systems (short-term and long-term)
- Tool coordination and invocation interfaces
- RAG (Retrieval-Augmented Generation) integration for code understanding
- Checkpoint and resumption behavior
- Error handling and retry logic
- Streaming and observability hooks

## 4. Architecture Principles

### 4.1 LangGraph as Foundation

Texere uses **LangGraph** as the orchestration framework because it provides:
- **Durable execution:** Persist agent state and resume from checkpoints
- **Human-in-the-loop:** Interrupt workflows for human approval/feedback
- **Native streaming:** First-class support for token and event streaming
- **Compiled graphs:** Type-safe, compiled workflow definitions with built-in validation
- **Pregel runtime:** Message-passing execution model inspired by Google Pregel

Key LangGraph concepts in Texere:
- **State:** Shared data structure representing current workflow snapshot (TypedDict or Pydantic)
- **Nodes:** Functions receiving state, performing computation, returning updates
- **Edges:** Functions determining next node(s) based on current state
- **Reducers:** Rules for applying state updates (merge, append, replace)
- **Channels:** Named state fields with configurable update logic

### 4.2 Core Workflows

Texere orchestrates agent workflows for:
1. **Code understanding:** Parse, analyze, and semantically index codebases
2. **Planning:** Decompose user requests into actionable steps
3. **Implementation:** Execute tool calls to modify code, run tests, validate
4. **Feedback loops:** Iterate based on test results or human input

Each workflow is a LangGraph graph with explicit state, nodes, and control flow.

**Cite as:** §4.2

## 5. State Models

### 5.1 Top-Level Workflow State

```python
class WorkflowState(TypedDict):
    # User input and context
    user_request: str                    # Original user query/request
    repository_path: str                 # Target codebase location
    specification: Optional[str]         # Optional spec/requirements
    
    # Execution context
    thread_id: str                       # Long-lived session identifier
    run_id: str                          # Individual workflow execution
    
    # Messages (short-term memory)
    messages: Annotated[list[BaseMessage], operator.add]  # Conversation history
    
    # Planning and decomposition
    plan: Optional[str]                  # Structured plan/reasoning
    subtasks: Annotated[list[str], operator.add]  # Decomposed tasks
    
    # Code understanding (RAG-backed)
    codebase_summary: Optional[str]      # High-level codebase overview
    relevant_files: Annotated[list[str], operator.add]  # Retrieved code snippets
    
    # Tool execution tracking
    tool_calls: Annotated[list[dict], operator.add]  # Record of all tool invocations
    tool_results: dict[str, Any]         # Latest results from tools
    
    # Implementation state
    proposed_changes: Optional[str]      # Staged implementation plan
    executed_changes: Annotated[list[dict], operator.add]  # Applied changes
    
    # Testing and validation
    test_results: Optional[dict]         # Test execution results
    validation_errors: Annotated[list[str], operator.add]  # Accumulated errors
    
    # Final output
    final_response: Optional[str]        # Final result for user
    success: bool                        # Workflow completion status
    error_context: Optional[str]         # Error details if failed
```

### 5.2 Sub-State for Tool Coordination

When invoking tools (code search, AST analysis, test runners), maintain focused sub-state:

```python
class ToolExecutionState(TypedDict):
    tool_name: str                       # Which tool to invoke
    tool_input: dict[str, Any]          # Tool-specific parameters
    tool_output: Any                     # Tool result
    execution_time_ms: int              # Performance tracking
    error: Optional[str]                # Execution error if any
```

### 5.3 Reducers and State Merging

- **messages:** Use `operator.add` (append) to preserve conversation history
- **subtasks, tool_calls, executed_changes, validation_errors:** Append-only to build audit trail
- **tool_results, test_results, plan:** Replace-only (latest state wins)
- **messages:** Automatic deduplication if needed (avoid duplicating identical messages)

## 6. Memory Systems

### 6.1 Short-Term Memory (In-Context)

**Purpose:** Hold active reasoning, current task context, and recent observations.

**Implementation:**
- In-context message history in `State.messages` (conversation history up to context limit)
- Current tool results in `State.tool_results`
- Active reasoning in `State.plan` and `State.proposed_changes`
- Conversation window: ~4K-8K tokens of most recent messages

**Management:**
- LangGraph message deduplication and windowing
- On context overflow: summarize oldest messages and archive to long-term memory
- Keep latest N turns in full; compress earlier turns

### 6.2 Long-Term Memory (Persistent Store)

**Purpose:** Retain knowledge across sessions, user preferences, past patterns.

**Types:**
1. **Semantic Memory:** Facts about the codebase, API signatures, architectural patterns
2. **Episodic Memory:** Past interaction summaries, successful patterns from prior runs
3. **Procedural Memory:** System instructions, learned behavior adjustments

**Storage:**
- External vector store (e.g., vector database) for semantic search
- Persistent key-value store (e.g., LangGraph Store) for structured facts
- Organized by namespace: `{user_id}/{repository_id}/{memory_type}`

**Retrieval:**
- Similarity search for relevant code patterns and past solutions
- Direct lookup for architectural/style rules
- Injected into new workflow state at initialization

**Update Strategy:**
- **Background formation:** Periodically extract and consolidate memories after each run
- **Active formation:** Critical context captured during workflow (sparingly, to avoid latency)
- Conflict resolution: Newer facts override older; confidence scoring for disambiguation

## 7. Tool Coordination

### 7.1 Tool Interface

All tools follow a common contract:

```python
class Tool(Protocol):
    """Standard tool interface for LangGraph node invocation."""
    
    name: str
    description: str
    input_schema: dict  # JSON Schema
    
    async def invoke(
        self, 
        input: dict[str, Any], 
        config: RunnableConfig
    ) -> dict[str, Any]:
        """Execute tool. Must be deterministic and idempotent where possible."""
        ...
```

### 7.2 Tool Categories

#### Code Understanding Tools
- **Codebase Indexer:** Build semantic index of all source files
- **Code Search (RAG):** Semantic search over indexed code using embeddings
- **AST Parser:** Extract structure, dependencies, and definitions
- **Symbol Resolution:** Map symbols to definitions across the codebase

#### Implementation Tools
- **File Reader:** Read source file contents
- **File Writer:** Apply code modifications
- **VCS Operations:** Commit, branch, create patches
- **Linter/Formatter:** Check style compliance, auto-format

#### Validation Tools
- **Test Runner:** Execute unit/integration tests
- **Type Checker:** Run mypy, eslint, etc.
- **Security Scanner:** Check for vulnerabilities

#### Integration Tools
- **External APIs:** Call external services as needed
- **Documentation Generator:** Create/update docs

### 7.3 Tool Invocation Pattern

```python
async def tool_invocation_node(state: WorkflowState, config: RunnableConfig) -> dict:
    """Generic node for invoking a tool."""
    tool_name = state["tool_calls"][-1]["tool"]  # Get latest tool call
    tool = get_tool(tool_name)
    
    try:
        result = await tool.invoke(state["tool_calls"][-1]["args"], config)
        return {
            "tool_results": {tool_name: result},
            "tool_calls": [{"tool": tool_name, "status": "success"}]
        }
    except Exception as e:
        return {
            "tool_results": {tool_name: None},
            "tool_calls": [{"tool": tool_name, "status": "error", "error": str(e)}],
            "validation_errors": [str(e)]
        }
```

## 8. RAG Integration for Code Understanding

### 8.1 Codebase Indexing

**Phase 1: Offline**
- Parse all source files into AST
- Extract code chunks (functions, classes, modules) with semantic meaning
- Generate embeddings for each chunk using code-specific model (e.g., CodeBERT, GraphCodeBERT)
- Store in vector database with metadata (file, line range, symbol type)

**Phase 2: Online (Per-Run)**
- Initialize codebase summary from long-term memory
- Optionally re-index if codebase has changed

### 8.2 Semantic Code Search

**Query Processing:**
1. User request → Generate search query (via LLM or heuristic)
2. Query → Embedding (using same encoder as index)
3. Vector similarity search → Top-K relevant code chunks
4. Metadata filtering → Remove low-confidence or irrelevant matches
5. Return ranked results with context window around matches

**Implementation:**
- Use hybrid search: combine semantic similarity + keyword matching
- Semantic ranking to re-rank results by relevance
- Include surrounding context (parent function, docstrings)

### 8.3 RAG Context Management

**To prevent context bloat and hallucination:**

1. **Observation Masking:** Hide old tool results with placeholders (not stored in context)
2. **Selective Summarization:** LLM summarizes older messages when context grows too large
3. **Structured Note-Taking:** Agent maintains external NOTES.md with key findings
4. **Sub-agent Architecture:** Delegate deep code analysis to focused sub-agents, return summaries

**Context Budget:**
- Keep latest 10-15 turns in full detail
- Summarize turns older than that
- Max total tokens in message history: 6,000-8,000 (to leave room for tool context)

## 9. Checkpoint and Resumption

### 9.1 Checkpoint Strategy

**Checkpointing Levels:**
1. **Per-node:** After each node completes, save full state
2. **Selective:** Save only on significant state changes (tool invocation, decision point)
3. **Full:** Save after each message round

**Checkpoint Content:**
- Serialized state (messages, plan, tool results, etc.)
- Timestamp and node identifier
- Metadata (user, repository, status)

**Storage:**
- Default: LangGraph's built-in checkpointer (SQLite for dev, Postgres for prod)
- Configurable: User-provided checkpointer for custom backends

### 9.2 Resumption and Time Travel

**Resume from Checkpoint:**
1. Load saved state by thread_id and checkpoint ID
2. Re-instantiate graph with loaded state
3. Continue execution from next node
4. User can provide follow-up input or adjustments

**Time Travel:**
- List all checkpoints for a run
- Load any prior checkpoint and branch execution
- Useful for debugging and exploring alternatives

## 10. Error Handling and Retries

### 10.1 Error Categories

**Transient Errors** (retry-able):
- Tool timeout or temporary unavailability
- Network glitches
- Rate limiting

**Semantic Errors** (human intervention):
- Tool returned invalid/unexpected output
- Test failures indicating logic error
- Validation errors in proposed changes

**Fatal Errors** (stop and escalate):
- Unrecoverable tool failure
- User cancellation
- Out-of-memory or system failure

### 10.2 Retry Logic

```python
async def robust_tool_invocation(state, tool, max_retries=3):
    """Retry with exponential backoff for transient errors."""
    for attempt in range(max_retries):
        try:
            result = await tool.invoke(state, config)
            return result
        except TransientError as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
        except SemanticError as e:
            # Don't retry; escalate to human or alternative path
            raise
```

### 10.3 Human-in-the-Loop Interrupts

**Trigger Scenarios:**
- Validation error in proposed code changes
- Ambiguous user intent requiring clarification
- High-risk operation (destructive change, security concern)

**Interrupt Mechanism:**
```python
def approve_changes_node(state: WorkflowState, config) -> dict:
    """Interrupt workflow pending human approval."""
    if state["requires_approval"]:
        raise interrupt("REQUIRE_APPROVAL", {
            "proposed_changes": state["proposed_changes"],
            "reason": state["validation_errors"]
        })
    return {"changes_approved": True}
```

**Resume:**
- User inspects interrupt state via API/UI
- Provides feedback (approve, reject, modify)
- Workflow resumes with user input injected via Command
- Agent adapts plan based on feedback

## 11. Streaming and Observability Hooks

### 11.1 Streaming Events

**Event Types:**
1. `node_start` / `node_end`: Node execution lifecycle
2. `tool_call`: Tool invocation with input
3. `tool_result`: Tool output
4. `message_add`: New message added to state
5. `error`: Error occurred
6. `interrupt`: Workflow paused for human input

**Streaming Implementation:**
- LangGraph event emitters hooked into graph runtime
- API layer translates to SSE/WebSocket messages
- TS client consumes as async event stream

### 11.2 Observability Integration

**Instrumentation Points:**
- Node start/end (timing, state delta)
- Tool calls (name, input, output, latency, success)
- Message additions (role, content, embedding if relevant)
- Checkpoint saves (state size, timestamp)
- Errors and interrupts (context, stack trace)

**Backends:**
- LangSmith for tracing and debugging (built-in via LangGraph)
- Optional OpenTelemetry integration (OTEL) for distributed tracing
- Custom logging to centralized sink (JSON structured logs)

## 12. Configuration and Extensibility

### 12.1 Runtime Configuration

```python
class OrchestrationConfig:
    """Configuration for orchestration core."""
    llm_model: str = "claude-opus"           # LLM for reasoning
    code_embedding_model: str = "codebert"   # Embedding model for RAG
    max_context_tokens: int = 8000           # Context window limit
    checkpoint_dir: str = "./checkpoints"    # Where to store checkpoints
    memory_store: str = "langraph"           # Memory backend
    vector_db_url: str = "http://localhost:6333"  # Vector DB
    enable_streaming: bool = True
    enable_interrupts: bool = True
```

### 12.2 Adding New Tools

**Steps:**
1. Implement Tool protocol (name, description, input_schema, invoke)
2. Register with core: `register_tool(MyTool())`
3. Reference in graph node or agent decision logic
4. Tool automatically available to LLM via structured prompts

### 12.3 Adding New Workflows

### 12.4 Model Selection & Provider Switching (LangGraph + Langfuse)

- **Config-driven choice:** Expose `config_schema={"configurable": {"llm": str}}` on compiled graphs. Nodes read `config["configurable"]["llm"]` and instantiate the chat model at invoke time; no graph rebuild when swapping models/providers.
- **OpenAI-compatible endpoints:** All providers (local vLLM/Ollama, RunPod, Vast, Salad, Hyperbolic, Northflank, AWS Bedrock proxies) must be reachable through an OpenAI-compatible URL. Set via envs:
  - `MODEL_ENDPOINT` → passed as `base_url`
  - `MODEL_KEY` → passed as `api_key`
  - `MODEL_NAME` → default model id; override per-run via config.
- **Factory pattern:** Provide a small resolver (e.g., `get_chat_model(model_id: str, base_url: str, api_key: str) -> BaseChatModel`) that returns an OpenAI-compatible LangChain chat model instance. Keep it pure and side-effect free for testability.
- **Observability tagging:** Add `{"metadata": {"llm_model": model_id}}` to `RunnableConfig` so Langfuse traces include the chosen model. Include model id in trace tags for per-model dashboards.
- **Failover (optional):** Allow a list in config (`llm_candidates`) and try in order with backoff on rate/host errors; emit the final chosen model in metadata.
- **Environment presets:** Maintain `.env.local` (localhost vLLM) and `.env.remote` (cheap GPU endpoint). Switching models is env-only: `export $(cat .env.remote | xargs)` then rerun.

## 13. Non-Functional

### 13.1 Performance Targets

- **Node execution:** <200ms p95 for simple nodes (state inspection, routing)
- **Tool invocation:** Depends on external tool; core orchestration <100ms p95
- **Checkpoint save:** <500ms p95 for typical state sizes
- **Message deduplication:** <50ms p95

**Cite as:** §13.1

### 13.2 Reliability

- **Checkpoint durability:** 100% durability for saved checkpoints
- **Error recovery:** Automatic retry with exponential backoff (2s, 4s, 8s max)
- **Human-in-the-loop:** Workflow can be interrupted and resumed without state loss

**Cite as:** §13.2

### 13.3 Scalability

- **Context window:** Support up to 8K tokens of message history per workflow
- **Concurrent workflows:** No inherent limit; scales with infrastructure
- **Tool parallelization:** Support concurrent tool calls within single workflow execution

**Cite as:** §13.3

## 14. References

### External Documentation

**Steps:**
1. Define workflow State (TypedDict subclass)
2. Implement nodes (async functions)
3. Build graph using StateGraph
4. Compile with checkpointer and configuration
5. Register workflow with API layer
6. Expose via HTTP endpoint



- **LangGraph Docs:** https://docs.langchain.com/oss/python/langgraph/overview
    - Graph API: https://docs.langchain.com/oss/python/langgraph/graph-api
    - Persistence: https://docs.langchain.com/oss/python/langgraph/persistence
    - Streaming: https://docs.langchain.com/oss/python/langgraph/streaming
    - Human-in-the-loop: https://docs.langchain.com/oss/python/langgraph/interrupts
    - Memory Management: https://docs.langchain.com/oss/python/langgraph/add-memory

- **RAG & Vector Search:**
    - RAG Overview: https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview
    - Vector Indexing Guide: https://www.meilisearch.com/blog/rag-indexing
    - Context Management: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

- **Agent Design Patterns:**
    - LLM Agents Framework: https://www.promptingguide.ai/research/llm-agents
    - State Management: https://aisc.substack.com/p/llm-agents-part-6-state-management
    - Memory Systems: https://langchain-ai.github.io/langmem/concepts/conceptual_guide/

### Internal Documentation

- [Texere High-Level Spec](./texere_high_level_architecture_spec.md) — System overview and component relationships
- [API & Gateway Spec](./api_gateway_spec.md) — HTTP endpoints and request/response contracts
- [Async Transport Spec](./async_transport_spec.md) — Streaming protocol and event types
- [Client Library Spec](./client_library_spec.md) — TypeScript client integration surface
- [Client Applications Spec](./client_applications_spec.md) — Web UI, CLI, MCP implementations
- [Persistence & Infrastructure Spec](./persistence_infra_spec.md) — Storage schema and deployment
- [Observability & Control Spec](./observability_control_spec.md) — Tracing, logging, debugging
- [Security & Policy Spec](./security_policy_spec.md) — Authentication and access control
- [Spec Index](../README.md) — Entry point for all specifications

**Cite as:** §14

## 15. Changelog

| Date | Version | Editor | Summary |
| --- | --- | --- | --- |
| Dec 5, 2025 | 0.1 | @agent | Upgraded to Draft spec per spec_writing.md standards; added Scope, Audience, Quick Navigation, Non-Functional, Changelog sections; renumbered sections to §1–§15; added citability via § references; added performance/reliability/scalability targets. |

**Cite as:** §15
