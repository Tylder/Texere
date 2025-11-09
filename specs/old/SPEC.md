# SPEC.md — Reusable Agent Packs and Graph Orchestration

Project name: **Texere**  
Audience: engineers integrating reusable agents, nodes, and tools into LangGraph applications  
Status: draft based on agreed scope and structure

**Abbreviations (expanded once)**
- **LLM, Large Language Model**  
- **RAG, Retrieval Augmented Generation**  
- **HITL, Human In The Loop**  
- **VDB, Vector Data Base**  
- **JSON, JavaScript Object Notation**  
- **CLI, Command Line Interface**  
- **MCP, Model Context Protocol**

---

## 1. Purpose
Build a reusable ecosystem of adapters, nodes, agents, and policies that can be installed as small Python packages and composed into LangGraph applications. The system must be model agnostic per agent and domain neutral. Code workflows are the first domain. Additional domains such as document RAG or ETL must be supported later without refactoring the core.

## 2. Scope
Included:
- Core contracts and registry for reusable components.
- Adapters for models, vector stores, repositories and executors.
- Node packs for retrieval, patching, and execution.
- A developer assistant app that indexes repos and supports retrieval for prompts with a path to patching and tests.
- CLI with dual output for humans and agents.
- Optional MCP server to expose tools to external agent clients.

Excluded for v1:
- Web UI beyond LangGraph Studio inspection.
- Cross encoder re rankers.
- Multi tenant deployment controls.

## 3. Goals
- Reuse across projects without copy and paste.
- Explicit orchestration with checkpointing and resume using LangGraph.
- Predictable latency and cost using deterministic retrieval first.
- Guarded writes and command execution with HITL for unsafe actions.
- Simple packaging and discovery using Python entry points.

## 4. Non goals
- A marketplace inside the IDE.
- Vendor lock in to a single LLM or vector provider.

## 5. Architecture overview
The system uses a small core that defines contracts and a plugin registry. Everything else is a package that depends only on the core. LangGraph is the runtime. Studio is used for run inspection and debugging. Adapters hide vendor SDKs. Nodes are pure functions over typed state. Agents are thin wrappers that call an LLM and a set of tools with JSON schemas. Policies wrap budgets and approval checks.

### 5.1 High level data flow
1. User issues a command or prompt.  
2. Planner produces a plan with tools and budgets.  
3. Retrieval node runs and writes final K evidence items to state.  
4. Generator answers from the evidence or proposes a diff.  
5. Verifier enforces schema and citations then either continues or asks for HITL.  
6. Optional executor runs allowlisted commands and returns artifacts.  
7. Memory writer updates the project profile and indexes incrementally.

## 6. Packages and project structure
Monorepo layout that ships independent wheels. Names are placeholders using the codename.

```
repo-root/
├─ pyproject.toml                 # tooling configs at root
├─ packages/
│  ├─ texere-core/               # contracts, state, registry
│  ├─ texere-adapters/           # llm, vector, repo, exec adapters
│  ├─ texere-node-retrieval/     # retrieval nodes and tools
│  ├─ texere-node-patch/         # propose, verify, apply diff nodes
│  ├─ texere-node-exec/          # allowlisted and docker executors
│  ├─ texere-agent-dev/          # planner, reviewer, explainer
│  ├─ texere-policies/           # budgets, retries, HITL gates
│  ├─ texere-cli/                # human plus JSON dual output CLI
│  └─ texere-mcp/                # optional MCP server for tools
├─ apps/
│  ├─ dev-assistant/              # example LangGraph app using packs
│  │  ├─ graph.py
│  │  ├─ config.toml
│  │  └─ main.py
│  └─ examples/                   # minimal graphs per domain
├─ infra/
│  ├─ docker/
│  └─ compose/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ traces/                     # golden traces and runner
└─ docs/
```

### 6.1 Package dependency rules
- Only `texere-core` may be imported across package boundaries. Non-core packs (adapters, nodes, agents, policies, CLI, MCP) depend solely on the core contracts.
- Shared helpers move into the core **as interfaces only**. Concrete implementations (e.g., FAISS bindings, repo clients) stay inside their originating pack.
- Packs exchange functionality through `RunContext.services[...]` and entry points, never via direct imports between packages.
- If two packs need the same capability, define or extend a minimal protocol in the core and let each pack implement it independently.
- Entry points (see §7.5) are the discovery layer; apps load implementations via the registry loader rather than referencing other packs directly.

## 7. Core contracts
Defined in `texere-core`.

### 7.1 State models
Use Pydantic models. Domain neutral naming.

```
class Evidence(BaseModel):
  id: str
  title: str | None = None
  uri: str | None = None
  meta: dict = {}
  text: str

class RetrieveState(BaseModel):
  query: str
  filters: dict = {}
  hits: list[Evidence] = []
  artifacts: dict = {}
```

### 7.2 Node protocol
```
S = TypeVar("S", bound=BaseModel)
C = TypeVar("C", bound=BaseModel)

class RunContext(BaseModel):
  services: dict[str, Any] = {}

class Node(Protocol, Generic[S, C]):
  def __call__(self, state: S, ctx: RunContext, cfg: C) -> S: ...
```

### 7.3 Tools and agents
```
class ToolSpec(BaseModel):
  name: str
  json_schema: dict
  description: str
  risk: str = "low"  # low, medium, high

class AgentSpec(BaseModel):
  name: str
  system_prompt: str
  tools: list[ToolSpec]
```

### 7.4 Policies
```
class Policy(Protocol):
  def before_node(self, node: str, state: BaseModel) -> None: ...
  def after_node(self, node: str, state: BaseModel, cost: dict) -> None: ...
  def require_hitl(self, reason: str) -> bool: ...
```

### 7.5 Registry and discovery
Registry dictionary and entry point loader.

```
REGISTRY = {"nodes": {}, "agents": {}, "tools": {}}

[project.entry-points."texere.nodes"]
"retrieve_hybrid" = "texere_node_retrieval.nodes:retrieve_hybrid"

[project.entry-points."texere.agents"]
"planner" = "texere_agent_dev.planner:PLANNER_SPEC"
```

### 7.6 Configuration models
Core owns small config carriers that flow through `RunContext`. Retrieval fan-out uses a shared model so every caller honors the same limits.

```python
class RetrievalConfig(BaseModel):
  default_k: int = 10        # graph/app default
  cli_k: int | None = None   # optional CLI override
  node_cap_k: int = 12       # pack-specific safety cap
  global_max_k: int = 20     # hard ceiling for any caller

  def resolve_k(self) -> int:
    requested = self.cli_k if self.cli_k is not None else self.default_k
    return max(1, min(requested, self.node_cap_k, self.global_max_k))
```

`RunContext.services["retrieval_config"]` stores the active instance for a run. Nodes query `resolve_k()` instead of reading CLI flags or environment variables directly, ensuring deterministic fan-out and aligned latency/cost budgeting.

## 8. Adapters
Implemented in `texere-adapters`. Each adapter hides vendor specifics and exposes a stable interface.

- **LLM adapter**: rich sync/streaming protocol defined in §8.1 (tool-calls, JSON mode, budgets, telemetry)
- **Vector adapter**: `upsert(ids, vectors)`, `search(vector, k) -> [(id, score)]`
- **Search adapter**: `keyword_topk(query, k, filters)`, `vector_topk(query, k, filters)`
- **Repo adapter**: local filesystem, Git, GitHub. `read_file`, `write_patch`, `list_files`, `open_pr`
- **Executor adapter**: host shell and Docker. `run(cmd, allowlist, timeout) -> {exit_code, stdout, stderr}`

Adapters are injected through `RunContext.services`.

### 8.1 LLM Adapter Protocol (texere-core)

**Goal:** a single, provider-agnostic interface that supports **sync + streaming**, **tool-calls**, **strict JSON**, **budgets/retries**, and **telemetry**. Agents and nodes must not special-case providers.

### Types

```python
# texere.core.llm types (pydantic)
class ToolSchema(BaseModel):
    name: str
    description: str = ""
    json_schema: dict  # JSON Schema for args

class MessagePart(BaseModel):
    # Multi-part content; providers may map to "content blocks"
    type: Literal["text", "image_url", "tool_result"]
    text: str | None = None
    uri: str | None = None       # for image_url
    tool_name: str | None = None # for tool_result
    result_json: dict | None = None

class Message(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: list[MessagePart]   # at least one part

class JSONMode(BaseModel):
    enabled: bool = False
    schema: dict | None = None   # optional JSON Schema to validate final output
    repair: bool = True          # allow structured repair if provider deviates
    max_repairs: int = 1

class ToolChoice(BaseModel):
    mode: Literal["auto", "required", "none"] = "auto"
    allowed: list[str] | None = None  # restrict tools

class LLMOptions(BaseModel):
    model: str
    temperature: float = 0.0
    max_tokens: int | None = None
    stop: list[str] | None = None
    seed: int | None = None
    json_mode: JSONMode = JSONMode()
    tools: list[ToolSchema] = []
    tool_choice: ToolChoice = ToolChoice()
    timeout_s: int = 60
    # Budgets
    max_cost_eur: float | None = None
    max_time_s: int | None = None
    # Tracing
    run_id: str | None = None
    meta: dict = {}

class ToolCall(BaseModel):
    id: str
    name: str
    arguments: dict   # already parsed/validated to the declared schema (adapter enforces)

class Usage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_eur: float | None = None
    latency_ms: int | None = None
    model: str | None = None
    provider: str | None = None
    retries: int = 0

class FinishReason(str, Enum):
    stop = "stop"
    length = "length"
    tool_calls = "tool_calls"
    content_filter = "content_filter"
    error = "error"

class LLMResponse(BaseModel):
    text: str | None = None            # assistant text (if any)
    json: dict | None = None           # parsed JSON when json_mode.enabled
    tool_calls: list[ToolCall] = []    # zero or more tool calls
    finish_reason: FinishReason
    usage: Usage
    raw: dict | None = None            # provider raw payload for debug

# Streaming events
class StreamEvent(BaseModel):
    type: Literal[
        "start", "token", "tool_call_delta", "tool_call", "json_delta",
        "end", "error", "usage"
    ]
    data: dict
```

### Interface

```python
class LLMAdapter(Protocol):
    def generate(self, messages: list[Message], options: LLMOptions) -> LLMResponse:
        """
        Sync call. Must:
        - Respect json_mode (validate/repair; set response.json and maybe response.text=None).
        - Validate tool_calls against ToolSchema (parsed dict args, not strings).
        - Populate Usage (tokens, latency, cost if known).
        - Enforce budgets/timeouts and reflect retries in Usage.retries.
        - Never raise for provider-format quirks; normalize into LLMResponse.
        - If budget/time exceeded, return finish_reason=error with appropriate raw/error details.
        """

    async def stream(self, messages: list[Message], options: LLMOptions) -> AsyncIterator[StreamEvent]:
        """
        Streaming call. Must emit:
          - start {provider, model, run_id}
          - token {text}  (for incremental display)
          - tool_call_delta {id, name?, arguments_delta} (as functions assemble)
          - tool_call {id, name, arguments} (once fully assembled & validated)
          - json_delta {path, value} when json_mode.enabled (JSON patch-like)
          - usage {Usage}
          - end {finish_reason}
        Errors surface as `error` events followed by `end`.
        """
```

### Required Behaviors

1. **Tool-calls are first-class**

   * The adapter **assembles and validates** tool args against `ToolSchema.json_schema`.
   * **No stringified JSON** escapes to agents; `ToolCall.arguments` is a dict.
   * When streaming, emit `tool_call_delta` while building; then a final `tool_call`.

2. **JSON-mode is strict**

   * If `options.json_mode.enabled`:

     * Enforce provider “JSON mode” when available.
     * If output isn’t valid JSON or schema, attempt **repair** up to `max_repairs`.
     * Populate `LLMResponse.json`; set `text=None` unless you also want to echo `text` from the raw (optional).
     * If still invalid, set `finish_reason=error` and include a minimal diagnostic in `raw`.

3. **Budget + retry policy**

   * Enforce `max_time_s` and `max_cost_eur` (best-effort pre-estimate + post-hoc check).
   * Implement **idempotent retries** for 429/5xx with exponential backoff; record `Usage.retries`.
   * Expose per-attempt telemetry to the Policy hook (see below).

4. **Telemetry for Policies/HITL**

   * Before returning from `generate` or yielding `end` in `stream`, call a **policy callback** (provided via `RunContext`) with:

     ```
     {
       "run_id": options.run_id,
       "model": usage.model, "provider": usage.provider,
       "latency_ms": usage.latency_ms, "tokens": usage.total_tokens,
       "cost_eur": usage.cost_eur, "retries": usage.retries,
       "finish_reason": finish_reason
     }
     ```
   * Policies may log, alert, or **interrupt** (for stream) if budgets are exceeded.

5. **Determinism knobs**

   * Support `seed` where providers allow it.
   * Respect `stop` tokens uniformly.
   * `temperature` default 0.0 for predictable orchestration.

6. **Error taxonomy** (normalized in `raw.kind`)

   * `rate_limit`, `timeout`, `invalid_json`, `provider_error`, `budget_exceeded`.
   * Never raise uncaught exceptions out of the adapter; return `finish_reason=error`.

### Agent/Tool Loop (reference)

```python
# In an agent node (pseudo)
resp = adapter.generate(messages, options)
for call in resp.tool_calls:
    tool = tool_router[call.name]
    tool_out = tool(call.arguments)          # validated dict
    messages += [
        Message(role="tool", content=[MessagePart(type="tool_result",
                                                   tool_name=call.name,
                                                   result_json=tool_out)])
    ]
    # Continue the loop with updated messages and remaining budget
    resp = adapter.generate(messages, options)
# If JSON mode requested, consume resp.json for structured downstream logic
```

**Streaming variant**: consume events; when a `tool_call` event arrives, pause the stream, run the tool, append a `tool_result` message, then resume with a new `stream()` call. Policy hooks can **HITL-interrupt** mid-stream.

### Policy Hook (budget/HITL)

Adapters receive a policy from `RunContext.services["policy"]` and call:

```python
policy.after_llm_call(
  run_id=options.run_id,
  usage=usage.model_dump(),
  finish=finish_reason.value,
  meta={"provider": usage.provider}
)

# Streaming adapters may emit intermediate deltas before the final hook.
```

### Rationale

* **One surface for all agents**: agents don’t care which provider you use; tool-calls and JSON handling are identical.
* **Budget/HITL works everywhere**: because adapters emit **usage + finish** consistently, policies can cut off or require approval in any graph.
* **Less glue**: no ad-hoc JSON repair in every agent; no provider branching sprinkled throughout nodes.
* **Future-proof**: adding new providers is adapter work only; agents and nodes stay untouched.

## 9. Node packs

### 9.1 Retrieval nodes
- `retrieve_hybrid`  
  Input: `RetrieveState.query`, optional filters  
  Uses: symbol or file narrowing, BM25 top K, vector re rank to a final K  
  Output: `RetrieveState.hits` with Evidence items

### 9.2 Patch nodes
- `propose_patch`  
  Produces unified diff in JSON with touched files and estimated line count.
- `verify_patch`  
  Validates format, size and protected paths.
- `apply_patch`  
  Applies diff using repo adapter with rollback on failure.

### 9.3 Exec nodes
- `run_allowlisted`  
  Executes allowlisted commands with timeouts.  
- `run_docker`  
  Executes in a container with CPU and memory limits.

## 10. Agents
`texere-agent-dev` supplies:
- **Planner** agent: plans steps, selects tools. Strict JSON output.
- **Reviewer** agent: summarizes results, suggests follow ups.
- **Explainer** agent: produces explanations from retrieved evidence.

Agents are model agnostic using the LLM adapter.

## 11. Policies and guardrails
- Budgets for time, tokens and cost per node and per run.  
- HITL is required for reasons such as unsafe command, large diff, protected path and network write.  
- Automatic rollback on failed patch apply or failing tests.  
- Redaction of secrets and PII in logs.

## 12. Project profile and indexing
A project profile stores persistent understanding per repository.

- Repo identity: remote URL, local path, default branch, latest indexed commit.  
- Code graph and symbol map when the code pack is installed.  
- Indexes: BM25 inverted files and FAISS vectors by repository.  
- Embedding cache keyed by file, commit, range and model id.  
- Patch log and design notes for changed modules.

Indexing is incremental based on git changes. Only changed files are re parsed and re embedded.

## 13. Retrieval pipeline
- Optional symbol or path narrowing.  
- BM25 keyword search to top 100.  
- Vector search or re rank to top 30.  
- Score combine and deduplicate to a final K of 8 to 12.  
- Hydrate text at the end and pass Evidence to the generator.
- Fan-out `K` resolved via `RetrievalConfig.resolve_k()` (graph default → CLI override → node cap → global ceiling) so every caller observes the same limits.

## 14. CLI
CLI prints human friendly output and mirrors JSON when `--json` is used. The CLI is domain neutral.

Commands:
- `proj index <repo>` build or update indexes  
- `proj search "<query>" [--k 10] [--json]` retrieve hybrid results  
- `proj explain <uri[:range]>` explain using evidence  
- `proj status` show index freshness and sizes  
- Future: `proj patch propose`, `proj patch apply`, `proj run test|lint|build`

`proj search --k` sets `RetrievalConfig.cli_k` before the graph runs; nodes still clamp through their local cap and the global ceiling so overrides never bypass safety limits.

## 15. Graph composition
LangGraph graphs use the node callables. Reusable subgraphs package multiple nodes. Retrieval is a deterministic node that runs before any generation. Planner and tools are optional and can be added later.

## 16. Security model
- Command allowlist for run nodes.  
- Protected paths for patch apply.  
- No writes outside repo root.  
- Secrets loaded from local vault or environment with redaction in logs.  
- Read only tokens by default for GitHub. Pull requests are preferred over direct pushes.

## 17. Observability
- Structured tracing of nodes, tool calls and budgets.  
- Golden traces used as regression tests.  
- Metrics: latency per node, tokens and cost, cache hit rate, index update durations.

## 18. Performance targets
- Index 1000 TypeScript files in less than 90 seconds on a developer laptop.  
- Re index after a small change in less than 5 seconds.  
- Retrieval latency under 300 milliseconds at the 50th percentile.  
- Accurate retrieval for 8 of 10 golden test queries.

## 19. Deployment
- v0: local process or single Docker container with SQLite and on disk indexes.  
- v1: add Docker executor, Redis queue and PostgreSQL for shared state.  
- Studio is used for run inspection and interrupts.

## 20. Testing
- Unit tests for chunking, BM25, embeddings and retrieval ranking.  
- Integration tests for node packs.  
- Golden traces for end to end verification and replay across model or index changes.  
- Coverage target 80 percent minimum.

## 21. Versioning and release
- Semantic Versioning per package.  
- Private PyPI recommended for publishing.  
- Entry points used for discovery. Install a pack to make nodes available.  
- Changelogs kept per package.

## 22. Roadmap
Phase 1: core contracts, adapters, retrieval pack, CLI, dev assistant app.  
Phase 2: patch nodes, executor nodes, HITL policies, Docker executor.  
Phase 3: MCP server, docs pack for RAG, optional cross encoder re rank.  
Phase 4: team features including PR automation and multi repo federation.

## 23. Open items
- Final project name and CLI verb.  
- Embedding model defaults and vector store provider list.  
- Whether to enable MCP in version one.  
- Cross encoder re rank addition criteria.
