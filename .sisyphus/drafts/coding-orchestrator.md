# Draft: Custom Coding Orchestrator (OMO Replacement)

## Problem Statement (confirmed)
- OpenCode's plugin architecture creates a hard boundary — OMO must work WITHIN OpenCode's hooks
- No way to deeply integrate Texere (knowledge graph) with its own agents without forking
- UI/UX is constrained by OpenCode's TUI — plugins can output text but not customize the interface
- Background task management (1646-line BackgroundManager) is a workaround for lack of native async support
- Session polling is a hack — OpenCode doesn't provide real-time events to plugins
- Tool restrictions are advisory (plugins set boolean maps) not enforced at the runtime level
- Agent switching UX is poor — OpenCode's UI was designed for 1 agent, not 11

## Core Pain Points (from research)
1. **No UI extensibility** — Can't add custom panels, agent visualization, task progress
2. **Polling-based communication** — No WebSocket/event stream between plugin and core
3. **Session management is opaque** — Plugin creates sessions through API but can't deeply control them
4. **Tool enforcement is advisory** — Plugin sets `{ write: false }` but relies on OpenCode honoring it
5. **No first-class agent-to-agent communication** — All delegation goes through `task()` tool
6. **MCP integration is bolted on** — Not native to the orchestration layer
7. **Only 4 hardcoded agents** (build, plan, general, explore) — cannot add primary agents via plugin
8. **Cannot add LLM providers** — 20 bundled providers, no extension point
9. **Cannot extend TUI** — Solid.js + OpenTUI components are core, not pluggable
10. **Fire-and-forget prompts** — No sync error handling for session.promptAsync()
11. **No dynamic MCP registration** — MCPs loaded at startup only

## User's Requirements (confirmed)
- Feature equivalent to OMO as minimum
- Better extensibility — Texere as first-class citizen with own agents
- Better agent communication / delegation
- Better UI/UX
- LangGraph TS or custom code as base
- Must be a standalone project (not OpenCode plugin)

## Decisions Made (Round 1)
- **Deployment**: TUI + webapp, TUI first, TUI copies OpenCode style/features
- **Language**: Pure TypeScript (Node.js runtime, pnpm — changed from Bun in Round 8)
- **Texere integration**: Core memory system — embedded @texere/graph, NOT MCP indirection
- **Solo developer**: Optimize for velocity, less ceremony
- **Memory architecture**: TWO-TIER
  - Short-term: Notepads, drafts, plans (ephemeral, per-session/plan) — like OMO's .sisyphus/
  - Long-term: Texere (decisions, research, patterns) — persists across all sessions
  - Saved to Texere as decision node: v8emyxmTewU8tL3pnrRES

## Critical Research Finding: OpenCode is TypeScript, NOT Go!
- Runtime: Bun (JavaScript)
- Server: Hono (lightweight HTTP)
- Database: SQLite (append-only sessions)
- LLM: Vercel AI SDK
- TUI: Solid.js + OpenTUI (NOT React/Ink/Blessed)
- This means a TS replacement is directly comparable, no language barrier

## Framework Evaluation (from librarian research)
| Framework | Multi-Agent | MCP | Streaming | Provider Abstraction | Maturity |
|-----------|-------------|-----|-----------|---------------------|----------|
| LangGraph.js | ★★★★★ (best) | ❌ custom | ★★★★ | LangChain | GA v1.0 |
| Mastra | ★★★★ | ★★★★★ (native) | ★★★ | Built-in | Rising star |
| Vercel AI SDK | ★★ (DIY) | ❌ custom | ★★★★★ (best) | ★★★★★ (best) | 20K stars |
| Custom (XState) | ★★★★ | ❌ custom | DIY | DIY | N/A |

**Librarian recommendation**: Mastra + OpenTUI (MCP-native, production-ready)
**Fallback**: LangGraph.js + Vercel AI SDK + OpenTUI

## Competitor Landscape (from librarian research)
- **Cursor**: 8 parallel agents via git worktree isolation — gold standard for multi-agent
- **Goose (Block)**: MCP-native, Rust extensions, 30K stars, closest philosophy
- **Aider**: Best git integration, unified diff format, 75+ providers
- **Claude Code**: Best reasoning (Opus), MCP-native, but Claude-only
- **Continue.dev**: Most extensible open-source (context providers + MCP)
- **Table-stakes features**: Multi-model, MCP, multi-file editing, terminal, git, codebase understanding

## Differentiation Opportunities
1. Multi-agent orchestration with Texere as shared memory
2. Hybrid context management (git + index + Texere knowledge graph)
3. Event-driven architecture (not polling)
4. Native tool enforcement (not advisory)
5. Dynamic agent/MCP registration at runtime
6. Smart model routing (cheap models for simple tasks)
7. AST-aware editing via tree-sitter/LSP

## Open Questions (Round 2)
1. Framework choice: Mastra vs LangGraph.js vs Vercel AI SDK + custom orchestration?
2. TUI framework: OpenTUI (proven with OpenCode) vs Ink (mature ecosystem)?
3. Which LLM providers are must-have? (Anthropic, OpenAI, Google, local?)
4. Project name?
5. How much of OMO's agent architecture to replicate? (11 agents vs core 6?)
6. Timeline/pacing expectations?

## Naming Decision (Round 3 — FINAL)
- **Loom**: The multi-agent coding orchestrator (new project)
- **Texere**: Stays as the knowledge graph (no rename)
- Rationale: "Loom" = weaving agents together. Texere = the persistent fabric of knowledge.

## Document Scope (confirmed: all 6)
Target: `/docs/research/coding_orchestrator/`
1. `00-overview.md` — Project vision, problem statement, all decisions
2. `01-architecture.md` — System design (event-driven, agent graph, tools, Texere integration)
3. `02-agent-system.md` — Config-driven agents, schema, default agents
4. `03-opencode-omo-analysis.md` — Feature parity checklist, what to replicate/improve
5. `04-tech-stack.md` — Framework choices with rationale
6. `05-implementation-roadmap.md` — Phased plan

## Decisions Made (Round 3)
- **Project name**: Loom (orchestrator), Texere (knowledge graph stays)
- **Prioritization**: MVP-first — tight MVP for a single coding session, iterate
- **Parallel agent pattern**: HYBRID
  - Context isolation (Claude Code style) for research/consultation agents
  - Worktree isolation (Cursor style) for implementation agents editing files
  - Decision: route based on agent type — read-only agents get context isolation, write agents get worktree isolation

## Decisions Made (Round 4)
- **MVP Agents (7)**:
  1. Orchestrator (Sisyphus equivalent) — main user-facing agent
  2. Explorer — fast codebase search (cheap model, read-only)
  3. Researcher (Librarian equivalent) — web/docs search (cheap model, read-only)
  4. Consultant (Oracle equivalent) — architecture advice (expensive model, read-only)
  5. Executor (Junior equivalent) — category-based task execution
  6. Planner (Prometheus equivalent) — strategic planning, interviews, work plans
  7. **Texere Expert** — specialized agent for knowledge graph interactions (NEW, not in OMO)
- **UI Architecture**: Localhost Web UI (REPLACES earlier Ink TUI decision)
  - Engine: TypeScript/Bun server (Hono) with WebSocket for real-time events
  - UI: React web app served on localhost (Vite dev, production build)
  - Headless mode: Engine runs without UI for CI/automation/API-only use
  - Future webapp: Same React app deploys as hosted webapp (zero migration)
  - Future desktop: Wrap in Electron if needed (~1 day work)
  - Why: LLMs are extremely fluent with React/DOM/HTML, much more reliable agent-built UI than Ink
- **Texere Expert Agent**: INGESTION specialist, not search
  - Any agent can search Texere via tools, but proper ingestion is hard
  - Decides: what to store, how to categorize (type/role), what edges to create, avoid duplicates
  - Called by orchestrator to properly catalog decisions, findings, patterns
  - NOT autonomous background listener — on-demand ingestion
- **Tool Strategy**: Framework-first, add tools incrementally
  - MVP day 1: Tier 1 (bash, read, write, edit, glob, grep, task)
  - Add quickly: Tier 2 (webfetch, websearch, question, todo, sessions)
  - Add soon: Tier 3 (LSP, AST-grep, apply_patch, batch, interactive_bash)
  - Key insight: All tools already implemented in OpenCode/OMO — design the tool framework to make adding tools trivial, then port existing implementations

## Decisions Made (Round 5)
- **Execution Architecture**: Event-Sourced
  - Every action is an event. State derived from event log.
  - Full audit trail, replayable, maximum observability.
  - Events flow through central event bus — UI subscribes for real-time updates.
- **Repository**: New Loom monorepo (separate from Texere)
  - Texere imported as dependency (@texere/graph)
- **Event Persistence**: Persistent append-only log
  - Every event stored in SQLite. Enables full replay, debugging, analytics.
  - Can be pruned/archived but never lost.
- **Texere Integration Method**: Copy @texere/graph into Loom monorepo
  - Full control, no dependency on external publishing/linking
  - packages/texere/ inside Loom monorepo
  - Maintained as authoritative copy going forward

## Decisions Made (Round 6)
- **Build System**: Turborepo (confirmed — familiar, stable, 7x faster than NX, minimal config)
- **Agent Config Pattern**: Pure TypeScript (confirmed)
  - Zod schema (source of truth, runtime validation, type generation)
  - TypeScript objects (built-in agents, type-safe, IDE support)
  - Prompts are template literals or builder functions in agent TS files
  - Users who want custom agents write TypeScript
- **Texere in Loom**: Copy source + restructure to match Loom conventions
  - Not a direct copy — reorganize to fit Loom's package structure
  - packages/texere/ inside Loom monorepo
  - Maintained as authoritative copy going forward

## Decisions Made (Round 7)
- **Agent Definition**: Pure TypeScript — everything in code
  - Agent configs, prompts, delegation rules — ALL TypeScript
  - No JSON config files, no Markdown prompt files
  - Users who want custom agents write TypeScript
  - Maximum type safety, IDE support, composability
  - Prompts are template literals or builder functions in agent TS files
- **HTTP Server**: Fastify (changed from Hono after Bun→Node switch)
  - Native to Node.js — no adapter layer needed (Hono needs @hono/node-server on Node)
  - Built-in Pino logging — structured JSON logs for free, important for event-sourced system
  - Mature WebSocket plugin (@fastify/websocket) — battle-tested on Node
  - Rich lifecycle hooks (onRequest → preParsing → preValidation → preHandler → etc.)
  - Plugin encapsulation — isolate WebSocket, REST, static serving concerns
  - JSON Schema / Zod validation built-in if REST API grows
  - Hono's advantage was native Bun WS — that's gone now that we're on Node.js
- **Event Bus**: RxJS
  - Parallel agent coordination (wait for N agents, combine results)
  - WebSocket batching (bufferTime(16) for 60fps UI)
  - Cost/context monitoring (scan + debounce + filter)
  - Memory safety (takeUntil prevents leaked subscriptions)
  - Fundamentally push-based — guarantees zero polling
  - ~30KB bundle cost, justified by real use cases
- **Event Storage**: Separate tables
  - events table (audit/observability) separate from messages table (conversation history)
  - Different concerns, different query patterns

## Decisions Made (Round 8)
- **Runtime**: Node.js (NOT Bun)
  - Bun has native module compatibility issues (better-sqlite3, onnxruntime-node, sharp)
  - MCP SDK, Playwright, tree-sitter all assume Node.js
  - Loom is a long-running server — Bun's startup speed advantage is irrelevant
  - Bun's DX conveniences (built-in TS, fast install) are matched by tsx + pnpm
  - Risk too high for a multi-agent system that must support unpredictable libraries
- **Package Manager**: pnpm (fast, reliable, workspace support, proven with Texere)
- **TypeScript Execution**: tsx for dev, tsc/tsdown for production builds

## Decisions Made (Round 9)
- **Custom Orchestration**: Build on Vercel AI SDK, NOT LangGraph/Mastra
  - Vercel AI SDK handles: single-agent loop, tool calling, streaming, multi-provider
  - Loom builds: AgentRunner, TaskScheduler, task() tool, LoomEngine
  - ~2000 lines of orchestration code, purpose-built for coding agents
- **Context Compaction**: Hybrid (heuristic truncation first, LLM summary if still over)
- **Write Isolation (MVP)**: File locking (simple, no conflicts possible)
- **Write Isolation (Post-MVP)**: Git worktrees (full parallel isolation, Cursor-style)

## Decisions Made (Round 10)
- **Testing Strategy**: TDD (Red-Green-Refactor), mandatory
  - Integration tests from day 1 (not unit tests first)
  - Test INTENT, not implementation (no testing internal method calls, mock counts, etc.)
  - Real SQLite (`:memory:`) for all tests — no mocking DB
  - Real tool execution where feasible — no mocking tool outputs
  - Final plan step: "Test Audit" — review ALL tests, remove fluff, verify intent-based testing
- **Test Framework**: Vitest (consistent with Texere, Node.js native, fast)
- **Test Anti-Patterns (FORBIDDEN)**:
  - Testing implementation details (private methods, internal state)
  - Excessive mocking (mock everything except the thing under test)
  - Tautological tests (test that a mock was called with the args you passed)
  - Testing framework code (testing that Zod validates, that RxJS emits)
  - Snapshot tests for logic (snapshots are for UI only, if ever)
- **LLM in Tests**: FakeLLM — a real implementation of the provider interface that returns scripted,
  deterministic responses. NOT a mock — it implements the same interface as real providers.
  Returns predictable tool calls and text. Tests are fast, free, deterministic.
  Example: FakeLLM configured to return `tool_call(bash, {command: "echo hello"})` then `"Done."` 
- **Test Audit Step**: Final task in every plan — review all tests for:
  - Does this test verify user-observable behavior or business intent?
  - Would this test break if we refactored internals? (If yes → bad test)
  - Is this test testing OUR code or a library? (If library → delete)
  - Remove all fluff tests that add maintenance cost without catching bugs

## Architecture Summary

### Execution: Event-Sourced
- Every meaningful action becomes a typed LoomEvent
- Events flow through RxJS Subject (central event bus)
- Consumers: React UI (WebSocket), Logger, Cost Tracker, Observability, SQLite event log
- Agent internal loop is still direct (LLM call → tool execute → repeat)
- Events emitted AROUND execution, not instead of it

### Monorepo: Turborepo + 6 Packages + 2 Apps
```
loom/
├── packages/
│   ├── texere/     # @loom/texere — Knowledge graph (restructured)
│   ├── engine/     # @loom/engine — Orchestrator, agents, tasks, events, tools, memory, sessions, providers
│   ├── tools/      # @loom/tools — Built-in tool implementations (bash, read, write, edit, etc.)
│   ├── agents/     # @loom/agents — Built-in agent definitions (pure TypeScript)
│   └── shared/     # @loom/shared — Shared types, errors, utilities
├── apps/
│   ├── server/     # Fastify HTTP + WebSocket server (thin layer over engine)
│   └── ui/         # React web UI (Vite, WebSocket subscriber)
└── tooling/        # Shared ESLint + TypeScript configs
```

### Dependency Flow
```
@loom/server → @loom/engine → @loom/tools
                            → @loom/agents  
                            → @loom/texere
                            → @loom/shared
@loom/ui → (WebSocket only, no direct imports)
```

### Custom Orchestration Layer

Built ON TOP of Vercel AI SDK (which handles single-agent LLM loop, tool calling, streaming).
Loom builds the multi-agent coordination layer:

#### Core Abstractions (4 pieces)

1. **AgentRunner** — Wraps Vercel AI SDK's `streamText()` for a single agent
   - Resolves agent config → model, tools, system prompt
   - Enforces tool permissions (blocks denied tools before LLM sees them)
   - Emits RxJS events around each step (tool:called, tool:result, context:usage)
   - Tracks token usage, streams chunks to event bus
   - Persists messages to session

2. **TaskScheduler** — Manages parallel agent execution + queuing
   - Concurrency limits: global (10), per-model (claude-opus: 3, sonnet: 6), per-provider
   - Priority queue for waiting tasks
   - Task lifecycle: CREATED → QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED
   - Slot handoff: completed task frees slot → next queued task starts
   - Retry logic: FAILED → RETRYING → RUNNING (with fallback models)

3. **`task()` Tool** — How agents delegate to other agents
   - Available to agents with delegation enabled
   - Resolves target agent by name OR category
   - Modes: sync (wait for result) or async (fire-and-forget, return taskId)
   - Session continuation: can resume an existing agent session
   - Creates parent-child session relationships for tracing

4. **LoomEngine** — Central coordinator, wires everything together
   - `events$`: RxJS Subject (the event spine)
   - Subsystems: AgentRegistry, TaskScheduler, ToolRuntime, SessionManager, MemoryManager, ProviderRegistry, EventStore
   - Main entry: `handleMessage(sessionId, content)` → runs agent → emits events
   - All events auto-persisted to SQLite event log

#### Crash Recovery (Event-Sourced)
- Event log + session messages = implicit checkpoints
- On restart: read event log → find RUNNING tasks → re-spawn from last session state
- Not as sophisticated as LangGraph graph-level checkpointing, but sufficient for MVP

#### What We Skip (Intentionally)
- Graph-based workflows (LangGraph StateGraph) — delegation is simpler for coding agents
- Typed state channels — coding agents pass messages, not structured state
- Full time-travel debugging — partial via event log replay, enhance post-MVP

### Context Window Management

Three-threshold system:
- **60% (Yellow)**: Emit warning event → UI indicator, agent hint to be concise
- **75% (Orange)**: Auto-compact using hybrid strategy
- **90% (Red)**: Force fork session with summary, fresh context

Compaction strategy: **Hybrid** (heuristic first, LLM if needed)
1. Heuristic pass: Truncate tool outputs (keep "Read 500 lines of src/auth.ts" instead of full content), 
   trim old assistant reasoning, keep all user messages verbatim. Preserves last 10 messages verbatim.
2. If still over 75% after heuristic: Use cheap/fast model to summarize oldest conversation segment.
   Preserve decisions, files modified, errors encountered, current task state.
3. Event-sourced advantage: Can always reconstruct full history from event log even after compaction.

### Error Handling & Resilience

Retry strategy:
- Retryable: rate_limit (429), timeout, server_error (500/503) → exponential backoff (1s, 2s, 4s), max 3 attempts
- Non-retryable: auth_error (401), context_overflow, model_not_found, content_filter → surface immediately
- Model fallback chain: primary → fallback1 → fallback2 (defined per agent)
- Event emitted on fallback: provider:fallback with from/to/reason

Infinite loop detection:
- Hard limit: 50 steps per agent invocation
- Repetition: same tool called 5x consecutively → warn → abort
- Cost limit: $2 per task default, configurable

Cascading failures:
- Agent failure → error returned as tool result to parent agent
- Parent LLM decides: retry, try different agent, different approach, or report to user
- Parallel async: partial results returned, parent decides whether to proceed or retry failed agent

### Write Agent Isolation

**MVP: File locking** (simplest, no conflicts possible)
- FileLockManager tracks which files are locked by which task
- Agent tries to edit locked file → tool returns error → agent waits or works on other files
- Single write agent → direct access (no locking overhead)
- Multiple write agents → file locking prevents same-file conflicts

**Post-MVP: Git worktrees** (full parallel isolation)
- Each write agent gets isolated worktree (git worktree add)
- Agent works on separate branch
- On completion: merge back (auto-merge if clean, surface conflicts if not)
- Conflict resolution: last-completed wins (MVP), agent-assisted review (post-MVP)

### Tech Stack
- Runtime: Node.js (NOT Bun — compatibility risk with native modules, MCP SDK, Playwright, etc.)
- Package Manager: pnpm
- TypeScript Execution: tsx (dev), tsc/tsdown (build)
- Build: Turborepo
- LLM: Vercel AI SDK + conduit-ai
- Server: Fastify (HTTP + WebSocket + Pino logging)
- UI: React (Vite)
- Event Bus: RxJS
- Knowledge Graph: @texere/graph (copied, restructured)
- Database: SQLite (sessions + events)
- Agent Config: Pure TypeScript (Zod validation)
- Testing: Vitest, TDD, FakeLLM, integration tests from day 1

## Scope Boundaries
- INCLUDE: Multi-agent orchestration, Web UI, webapp, Texere integration, MCP, multi-provider
- EXCLUDE: IDE extension (for now), mobile, cloud hosting

---

# FEATURE REQUIREMENTS INVENTORY (Work in Progress)

## A. PLATFORM / CORE ENGINE (From OpenCode Analysis)

### A1. LLM Provider Integration
- [ ] Multi-provider support (20+ providers: OpenAI, Anthropic, Azure, Google, Bedrock, etc.)
- [ ] Dynamic model loading from models.dev database
- [ ] Model variants with custom parameters
- [ ] Cost tracking (input/output/cache pricing per model)
- [ ] Capability detection per model (temperature, reasoning, attachments, tool calling, multimodal)
- [ ] Context window limits and output token constraints
- [ ] Model status tracking (alpha, beta, deprecated, active)
- [ ] Smart model selection for lightweight operations (small model routing)
- [ ] Provider authentication (API keys, OAuth, env vars)
- [ ] Custom OpenAI-compatible provider support
- [ ] Streaming text generation with tool calling
- [ ] Token counting and estimation
- [ ] Exponential backoff retry logic with Retry-After header support
- [ ] Provider-specific error types (auth, context overflow, output length, abort, model not found)

### A2. Session System
- [ ] Session creation with auto-generated IDs
- [ ] Session forking from existing sessions
- [ ] Session archival
- [ ] Parent-child session relationships (critical for agent delegation)
- [ ] Session persistence in SQLite
- [ ] Session metadata (title, directory, project, agent)
- [ ] Message history with parts (text, tool calls, snapshots, patches)
- [ ] Session compaction when context overflows (prune old tool outputs, preserve recent)
- [ ] Session revert (undo tool executions, restore conversation state)
- [ ] Session summary / auto-generated titles
- [ ] Session sharing (URLs with secret tokens)
- [ ] Session export/import
- [ ] Session status tracking (idle, running, etc.)

### A3. Tool System
- [ ] Tool definition framework (Zod schemas for args validation)
- [ ] Tool context (sessionID, messageID, agent, abort signal)
- [ ] Permission system for tool execution (allow/deny/ask per tool, wildcard patterns)
- [ ] Output truncation (line and byte limits)
- [ ] Custom tool loading from filesystem ({tool,tools}/*.{js,ts})
- [ ] Plugin-based tool registration
- [ ] Batch tool execution

### A4. Built-in Tools (24+)
- [ ] bash — Command execution with timeout, working directory, tree-sitter parsing
- [ ] read — File reading with line offset/limit, directory listing
- [ ] write — File creation/overwriting
- [ ] edit — File editing with 9 replacement strategies
- [ ] multiedit — Multiple file edits in one call
- [ ] glob — File pattern matching with ignore patterns
- [ ] grep — Code search with regex and context lines (ripgrep)
- [ ] webfetch — HTTP requests with format conversion (markdown/text/HTML)
- [ ] websearch — Web search (Exa API)
- [ ] codesearch — Code search across GitHub
- [ ] question — Structured user prompts in TUI
- [ ] task — Task delegation to sub-agents
- [ ] todowrite/todoread — Todo list management
- [ ] skill — Custom skill loading/execution
- [ ] lsp — Language Server Protocol analysis
- [ ] apply_patch — Patch application (GPT models)
- [ ] plan_enter/plan_exit — Plan mode transitions

### A5. MCP Integration
- [ ] MCP server support (stdio and HTTP/SSE transports)
- [ ] MCP tool conversion to AI SDK format
- [ ] OAuth authentication for MCP servers
- [ ] Tool list change notifications
- [ ] MCP server configuration in config files
- [ ] Dynamic MCP server registration (improvement over OpenCode's static-only)

### A6. File System
- [ ] File change detection and watching
- [ ] Modification time tracking
- [ ] File lock management during edits
- [ ] Symlink detection

### A7. Terminal/Shell
- [ ] Bash/Zsh/Fish shell detection
- [ ] Command execution with timeout
- [ ] PTY support (interactive terminal sessions)
- [ ] Terminal resizing

### A8. Git/VCS Integration
- [ ] Git status, diff, commit detection, branch info
- [ ] GitHub PR creation
- [ ] Issue tracking integration

### A9. LSP Integration
- [ ] Language Server Protocol client
- [ ] Pyright, TypeScript/JavaScript, custom LSP servers
- [ ] Symbol lookup, document symbols, diagnostics
- [ ] Code navigation

### A10. Configuration System
- [ ] JSON/JSONC config files
- [ ] Hierarchical precedence (remote → global → custom → project → .opencode → inline → managed)
- [ ] Agent, provider, model, plugin, permission config sections
- [ ] Environment variable overrides
- [ ] Config directory scanning for tools, agents, commands, plugins

### A11. HTTP Server & API
- [ ] REST API endpoints (Fastify framework)
- [ ] WebSocket support for real-time updates
- [ ] CORS handling, basic auth
- [ ] Agent Client Protocol (ACP) for IDE integration

### A12. Database & Storage
- [ ] SQLite with WAL mode
- [ ] Schema migrations
- [ ] Session, message, metadata tables
- [ ] Snapshot storage

### A13. Permission System
- [ ] Tool-level permissions (allow/deny/ask)
- [ ] Pattern-based rules with wildcards
- [ ] Session-scoped permissions
- [ ] Permission request UI

### A14. Event Bus
- [ ] Pub/sub event system
- [ ] Global and session-scoped events
- [ ] Type-safe event definitions

---

## B. AGENT ORCHESTRATION (From OMO Analysis + Existing Research)

### B1. Multi-Agent System
- [ ] Config-driven agent definitions (not hardcoded)
- [ ] Agent modes: primary (user-facing), subagent (delegate-only), all (both)
- [ ] Agent model fallback chains (try primary → fallback 1 → fallback 2)
- [ ] Agent tool restrictions (per-agent permissions: read-only vs full access)
- [ ] Agent metadata for delegation (triggers, useWhen, avoidWhen, cost categories)
- [ ] Custom agent registration (TypeScript config files, dynamically loaded)
- [ ] Agent disabling via config
- [ ] Agent configuration override (model, temperature, prompt, tools)
- [ ] Agent color coding for UI

### B2. Default Agents (Feature Parity with OMO)
- [ ] Primary Orchestrator (OMO: Sisyphus) — main user-facing agent, delegates to all
- [ ] Autonomous Deep Worker (OMO: Hephaestus) — goal-oriented, no delegation, thorough research
- [ ] Work Plan Executor (OMO: Atlas) — executes plans from planner, delegates via categories
- [ ] Strategic Planner (OMO: Prometheus) — interviews user, generates work plans, read-only
- [ ] Architecture Consultant (OMO: Oracle) — read-only, debugging, design decisions
- [ ] Documentation Researcher (OMO: Librarian) — web search, official docs, GitHub examples
- [ ] Codebase Explorer (OMO: Explore) — fast grep/glob/LSP, read-only
- [ ] Multimodal Analyzer (OMO: Multimodal Looker) — PDF/image/screenshot analysis
- [ ] Pre-Planning Analyst (OMO: Metis) — gap analysis, ambiguity detection before planning
- [ ] Plan Validator (OMO: Momus) — review plans for clarity, completeness, verifiability
- [ ] Category Executor (OMO: Sisyphus-Junior) — executes delegated tasks by category

### B3. Task Delegation System
- [ ] task() tool — delegate to agents by name or category
- [ ] Background execution (fire-and-forget, async)
- [ ] Synchronous execution (wait for result)
- [ ] Session continuation (resume existing agent sessions)
- [ ] Category-based delegation (quick, visual-engineering, deep, ultrabrain, artistry, writing)
- [ ] Category-to-model mapping (cheap models for simple tasks, expensive for hard)

### B4. Background Task System
- [ ] Task lifecycle (pending → running → completed/error/cancelled/interrupt)
- [ ] Task queuing with concurrency control
- [ ] Concurrency limits (per-model, per-provider, default)
- [ ] Task progress tracking (tool calls, last tool, timestamps)
- [ ] Stale task detection and auto-cancellation
- [ ] Parent session notification on completion
- [ ] Background output retrieval
- [ ] Background task cancellation
- [ ] Slot handoff (next queued task gets freed slot)

### B5. Dynamic Prompt Composition
- [ ] Composable prompt sections (identity, tools, agents, skills, delegation, hard blocks)
- [ ] 10+ section builder functions for Sisyphus-style prompts
- [ ] Delegation table generation (domain → agent → trigger mapping)
- [ ] Tool selection guide (cost, when-to-use)
- [ ] Category + skill selection protocol
- [ ] Agent-specific prompt templates
- [ ] Model-specific prompt variants (GPT vs Claude optimizations)

### B6. Context Injection System
- [ ] Auto-inject AGENTS.md, README.md on file operations
- [ ] Rule file discovery (walk directory tree, match globs)
- [ ] Rule files with YAML frontmatter (glob patterns for matching)
- [ ] Session-scoped caching (avoid duplicate injections)
- [ ] Cache invalidation on session compact/delete

### B7. Keyword/Mode Detection
- [ ] Keyword scanning ([ultrawork], [analyze-mode], [boulder], [plan])
- [ ] Mode-specific instruction injection
- [ ] Model variant selection (max for ultrawork)
- [ ] Subagent session protection (don't inject modes into background tasks)

### B8. Workflow Engines
- [ ] Simple task → direct execution
- [ ] Complex task → parallel background research → implementation
- [ ] Precise multi-step → Plan (Prometheus) → Execute (Atlas → Junior)
- [ ] Autonomous deep work → Hephaestus
- [ ] Ralph Loop (iterative refinement until done)
- [ ] Boulder mode (continuous work until plan complete)
- [ ] Todo continuation enforcement (remind to complete todos)
- [ ] Start-work command (trigger Atlas from plan)
- [ ] Handoff command (context summary for new session)

### B9. Skill System
- [ ] Built-in skills (playwright, git-master, frontend-ui-ux, dev-browser)
- [ ] User-installed skills (project-local and global)
- [ ] YAML frontmatter format for skill definitions
- [ ] Skill-embedded MCP servers
- [ ] Skill loading via load_skills parameter in task()
- [ ] Skill content injection into agent prompts

### B10. Built-in MCP Integrations
- [ ] Web search (Exa/Tavily)
- [ ] Official documentation (Context7)
- [ ] GitHub code search (Grep.app)
- [ ] Claude Code compatible MCP config (.mcp.json with ${VAR} expansion)

---

## C. LOOM IMPROVEMENTS OVER OMO (New/Better)

### C1. Event-Driven Architecture (replaces OMO's polling)
- [ ] Native event bus (not setInterval polling)
- [ ] Agent lifecycle events (started, running, delegating, completed, error)
- [ ] Tool execution events (before, after, error)
- [ ] Context window events (approaching limit, overflow, compaction)
- [ ] Task events (queued, started, progress, completed, cancelled)
- [ ] Session events (created, forked, compacted, deleted)

### C2. Enforced Tool Restrictions (replaces OMO's advisory booleans)
- [ ] Tool enforcement at runtime (not advisory hints)
- [ ] Permission system with allow/deny/ask rules
- [ ] Agent-specific tool allowlists/denylists
- [ ] Fail-safe: tools not in allowlist are blocked, not just discouraged

### C3. Texere Integration (First-Class, Not MCP)
- [ ] Embedded @texere/graph library (direct import, no MCP overhead)
- [ ] Two-tier memory: short-term (ephemeral) + long-term (Texere KG)
- [ ] Auto-read from Texere on task start (relevant decisions, patterns, pitfalls)
- [ ] Auto-write decisions/findings to Texere (configurable: auto vs prompted)
- [ ] Search Texere before creating nodes (prevent duplicates)
- [ ] Cross-session knowledge persistence

### C4. Config-Driven Agents (replaces OMO's hardcoded agents)
- [ ] Agent definitions in TypeScript config files
- [ ] Dynamic agent loading at runtime (no rebuild required)
- [ ] Agent schema validation (Zod)
- [ ] Hot-reload on config change

### C5. Better UI/UX
- [ ] React web UI on localhost (Vite)
- [ ] Agent visualization (which agent is active, delegation tree)
- [ ] Task progress display (real-time, not polling)
- [ ] Native notification system
- [ ] Agent switching with full context display
- [ ] Cost tracking dashboard (per-agent, per-session)

### C6. Conduit-AI Integration
- [ ] OAuth authentication (Anthropic, OpenAI — from conduit-ai)
- [ ] Token auto-refresh (from conduit-ai)
- [ ] AI SDK compatibility (ConduitAuth spreads into createAnthropic/createOpenAI)
- [ ] LOOM MUST BUILD: Provider registry, model catalog, tool calling, structured output, retries

---

## D. CONDUIT-AI PROVIDED (Free)

### D1. Authentication
- [ ] OAuth PKCE for Anthropic (console.anthropic.com)
- [ ] OAuth PKCE for OpenAI/Codex (auth.openai.com)
- [ ] Token persistence (~/.conduit/auth.json)
- [ ] Automatic token refresh via custom fetch wrapper
- [ ] Login/logout/hasCredentials API

### D2. AI SDK Compatibility
- [ ] ConduitAuth type matches Vercel AI SDK constructor signature
- [ ] Spreads directly into createAnthropic()/createOpenAI()
- [ ] Streaming and text generation work out of the box

### D3. Known Gaps in Conduit-AI (Loom Must Address)
- [ ] Wrong Anthropic endpoint (console vs claude.ai)
- [ ] Missing scopes (user:profile, user:sessions:claude_code)
- [ ] No tool calling support
- [ ] No structured output
- [ ] No rate limiting/retries/fallbacks
- [ ] No model discovery
- [ ] No provider registry
- [ ] Plaintext credential storage (no encryption)

---

## E. TABLE-STAKES & DIFFERENTIATORS (Awaiting librarian research)

### E1. Table-Stakes (Must Have — every serious tool has these in 2026)
- [ ] Multi-file editing (not just suggestions, actual edits)
- [ ] Codebase understanding / indexing (semantic + AST)
- [ ] Terminal integration (execute commands, view output)
- [ ] Git integration (auto-commits, branch management, PR creation)
- [ ] Streaming responses (real-time output)
- [ ] Multi-model support (GPT, Claude, Gemini, DeepSeek, etc.)
- [ ] Context window management (warnings at 60%, auto-compact at 75%)
- [ ] Undo/rollback (revert AI changes easily)
- [ ] Diff review before applying changes
- [ ] MCP support (Model Context Protocol)
- [ ] File tree navigation
- [ ] Search & replace (codebase-wide)
- [ ] Keyboard shortcuts (power-user efficiency)

### E2. Should-Have (Competitive Parity)
- [ ] Background/async agent execution
- [ ] Session memory / persistent context across sessions
- [ ] Smart model routing (cost optimization — cheap for simple, expensive for complex)
- [ ] Plan-then-execute workflows
- [ ] Sub-agent delegation
- [ ] Workspace context (full codebase understanding)

### E3. Differentiators (Pick 2-3 to win)
- [ ] Multi-agent orchestration (Cursor has 8, Claude Code experimental 16 → Loom: 32+?)
- [ ] Cost-aware routing with transparency (real-time cost tracking, budget alerts)
- [ ] Cross-session persistent memory (Texere KG as universal memory layer)
- [ ] Verification layer (auto-test, auto-lint, auto-verify before commit)
- [ ] Semantic codebase search (AST + semantic + git history fusion)

### E4. Anti-Patterns to Avoid
- [ ] Silent context exhaustion (#1 user complaint → proactive warnings)
- [ ] No cost visibility (surprise bills → real-time tracking, budget alerts)
- [ ] Session amnesia (re-explaining projects → auto-save summaries, cross-session recall)
- [ ] No rollback for destructive changes (→ git integration, checkpoint system)
- [ ] Slow startup times (→ background indexing, incremental updates)
- [ ] Token consumption without transparency (→ cost dashboard)
- [ ] Hallucinated code / invented APIs (→ source citations, web search)
- [ ] Merge conflicts from parallel agents (→ file locking, conflict detection, worktree isolation)

---

## F. ORCHESTRATION ARCHITECTURE PATTERNS (From Multi-Agent Research)

### F1. Core Orchestration (Every orchestrator needs these)
- [ ] Sequential execution (A→B→C chain)
- [ ] Concurrent/parallel execution (multiple agents simultaneously)
- [ ] Handoff/delegation (dynamic agent-to-agent control transfer)
- [ ] Conditional routing (route tasks based on patterns/rules)
- [ ] Checkpointing (save state at every node transition)
- [ ] Resume from checkpoint (continue after crash/pause)
- [ ] Message passing between agents
- [ ] Shared context/memory accessible to all agents
- [ ] Event-driven architecture (messages, heartbeats, hooks, webhooks)
- [ ] Retry strategies (exponential backoff, max attempts)
- [ ] Timeout handling (per-agent/per-tool)
- [ ] Fallback patterns (graceful degradation)
- [ ] Circuit breakers (stop repeated failures)
- [ ] Human-in-the-loop (breakpoints, approval gates, state editing)

### F2. Observability (Non-negotiable for production)
- [ ] OpenTelemetry integration (distributed tracing)
- [ ] Span hierarchy (conversation→agent→llm→tool)
- [ ] Agent turn tracking (who did what, when)
- [ ] LLM call logging (model, prompt, tokens, latency)
- [ ] Tool execution logs (inputs/outputs)
- [ ] Event audit trail (complete history)
- [ ] Token usage per agent
- [ ] Cost attribution per agent/task/session
- [ ] Real-time cost monitoring
- [ ] Budget limits (stop at threshold)

### F3. Memory Systems (Competitive advantage)
- [ ] Observational memory (compress history into reflections — 5-40x compression)
- [ ] Async memory buffering (pre-compute in background)
- [ ] Long-term memory (persistent across sessions — Texere)
- [ ] Context overflow prevention (detect and handle)
- [ ] Context prioritization (keep important info)
- [ ] Context isolation (separate context per agent — 200K each like Claude Code)

### F4. Planning & Reasoning
- [ ] Multi-step planning (decompose complex goals)
- [ ] Dynamic re-planning (adjust plan based on failures)
- [ ] Critic model (review changes before execution)
- [ ] Task decomposition (break tasks into subtasks)

### F5. Production Patterns (From real systems)
- [ ] Cursor pattern: Worktree-based isolation, each agent on separate branch
- [ ] Claude Code pattern: Task tool spawns isolated agents with 200K context each
- [ ] Devin pattern: Planner (high-reasoning) + Critic (pattern recognition)
- [ ] Three-layer persistence: Working State (volatile) + Event Memory (append-only) + Identity/Config (slow-changing)

### F6. Critical Success Factors
- Observability is non-negotiable
- Durable execution is standard (Temporal-style persistence)
- Context engineering > prompt engineering
- Error handling IS the system (happy path is demo; failure handling is production)
- Multi-agent beats single-agent (90% performance gain per Anthropic research)
