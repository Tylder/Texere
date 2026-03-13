# Loom: Multi-Agent Coding Orchestrator

**Project Vision Document**  
**Last Updated:** 2026-02-15  
**Status:** Design Phase (Wave 2)  
**Source of Truth:** This document establishes canonical terminology, decision log, and scope
boundaries for all Loom research documents.

## Table of Contents

1. [Project Vision](#project-vision)
2. [Problem Statement](#problem-statement)
3. [Canonical Terminology](#canonical-terminology)
4. [Decision Log](#decision-log)
5. [Decision Evolution](#decision-evolution)
6. [Scope Boundaries](#scope-boundaries)
7. [User Constraints](#user-constraints)
8. [Differentiation Strategy](#differentiation-strategy)
9. [Architecture Summary](#architecture-summary)
10. [Tech Stack](#tech-stack)

## Project Vision

### What is Loom?

Loom is a **custom multi-agent coding orchestrator** built from the ground up to replace OpenCode +
OMO plugin. It's a standalone TypeScript application that coordinates multiple specialized AI agents
to handle complex software development tasks.

**Core Capabilities:**

- **Multi-agent orchestration** with 7 MVP agents (expandable to 32+)
- **Event-driven architecture** (RxJS event bus, zero polling)
- **Texere knowledge graph** as first-class long-term memory
- **Web UI** (React on localhost) with real-time updates
- **Multi-provider LLM support** (Anthropic, OpenAI, Google, local models)
- **Native tool enforcement** (not advisory hints)
- **Dynamic agent/MCP registration** at runtime

### Why Loom Exists

OpenCode's plugin architecture creates a hard boundary that prevents deep integration of Texere with
its own agents. OMO must work WITHIN OpenCode's hooks, which limits:

- UI/UX customization (plugins can output text but not customize the interface)
- Real-time communication (polling-based, not event-driven)
- Session management (opaque to plugins)
- Tool enforcement (advisory only, not runtime-enforced)
- Agent-to-agent communication (all delegation goes through `task()` tool)
- MCP integration (bolted on, not native)

**The Solution:** Build a standalone orchestrator with Texere as the core memory system, not a
plugin.

### What Problem It Solves

**11 Core Pain Points with OpenCode Plugin Boundary:**

1. **No UI extensibility** — Can't add custom panels, agent visualization, task progress
2. **Polling-based communication** — No WebSocket/event stream between plugin and core
3. **Session management is opaque** — Plugin creates sessions through API but can't deeply control
   them
4. **Tool enforcement is advisory** — Plugin sets `{ write: false }` but relies on OpenCode honoring
   it
5. **No first-class agent-to-agent communication** — All delegation goes through `task()` tool
6. **MCP integration is bolted on** — Not native to the orchestration layer
7. **Only 4 hardcoded agents** (build, plan, general, explore) — cannot add primary agents via
   plugin
8. **Cannot add LLM providers** — 20 bundled providers, no extension point
9. **Cannot extend TUI** — Solid.js + OpenTUI components are core, not pluggable
10. **Fire-and-forget prompts** — No sync error handling for session.promptAsync()
11. **No dynamic MCP registration** — MCPs loaded at startup only

## Canonical Terminology

**This glossary is the source of truth for all Loom documentation. All other docs (01-05) must
reference these definitions.**

### Core Components

| Term                 | Definition                                                         |
| -------------------- | ------------------------------------------------------------------ |
| **Loom**             | The multi-agent coding orchestrator (project name)                 |
| **LoomEngine**       | Central coordinator that wires all subsystems together             |
| **AgentRunner**      | Wraps Vercel AI SDK's `streamText()` for single-agent execution    |
| **TaskScheduler**    | Manages parallel agent execution, queuing, and concurrency control |
| **EventBus**         | RxJS Subject serving as the central event spine                    |
| **ToolRuntime**      | Tool registration, permission enforcement, and execution           |
| **SessionManager**   | CRUD operations for sessions (create, fork, compact, revert)       |
| **MemoryManager**    | Two-tier memory: ephemeral (notepads/drafts) + Texere KG           |
| **ProviderRegistry** | LLM provider catalog, model metadata, cost tracking                |
| **EventStore**       | Persistent append-only event log (SQLite)                          |
| **AgentRegistry**    | Registry of available agents with metadata                         |
| **FileLockManager**  | Tracks file locks to prevent concurrent write conflicts            |

### Agent Names (MVP)

| Agent             | Role                                                   | Delegation          | Model Tier |
| ----------------- | ------------------------------------------------------ | ------------------- | ---------- |
| **Orchestrator**  | Main user-facing agent (Sisyphus equivalent)           | Can delegate to all | Expensive  |
| **Explorer**      | Fast codebase search (grep/glob/LSP)                   | Read-only           | Cheap      |
| **Researcher**    | Web/docs search (Librarian equivalent)                 | Read-only           | Cheap      |
| **Consultant**    | Architecture advice (Oracle equivalent)                | Read-only           | Expensive  |
| **Executor**      | Category-based task execution (Junior equivalent)      | Cannot delegate     | Mid-tier   |
| **Planner**       | Strategic planning, interviews (Prometheus equivalent) | Delegates research  | Expensive  |
| **Texere Expert** | Knowledge graph ingestion specialist (NEW)             | Read-only           | Mid-tier   |

### Memory Tiers

| Tier           | Storage                 | Scope            | Persistence                                |
| -------------- | ----------------------- | ---------------- | ------------------------------------------ |
| **Short-term** | Notepads, drafts, plans | Per-session/plan | Ephemeral (like OMO's .sisyphus/)          |
| **Long-term**  | Texere knowledge graph  | Cross-session    | Persistent (decisions, patterns, pitfalls) |

### Execution Modes

| Mode             | Description                    | Use Case              |
| ---------------- | ------------------------------ | --------------------- |
| **Sync**         | Wait for agent completion      | Critical path tasks   |
| **Async**        | Fire-and-forget, return taskId | Background research   |
| **Continuation** | Resume existing agent session  | Multi-turn delegation |

### Task Categories

| Category       | Model Tier               | Use Case                          |
| -------------- | ------------------------ | --------------------------------- |
| **quick**      | Cheap (Sonnet, Haiku)    | Simple edits, grep, read          |
| **visual**     | Mid-tier (Sonnet 4.5)    | UI/UX, frontend work              |
| **deep**       | Expensive (Opus, GPT-5)  | Complex refactoring, architecture |
| **ultrabrain** | Max reasoning (Opus 4.6) | Novel problems, research          |
| **artistry**   | Creative models          | Design, documentation             |
| **writing**    | Language models          | Prose, technical writing          |

### Event Types

| Event               | Emitted When           | Consumers                       |
| ------------------- | ---------------------- | ------------------------------- |
| `agent:started`     | Agent begins execution | UI, Logger, EventStore          |
| `agent:completed`   | Agent finishes         | UI, TaskScheduler, EventStore   |
| `tool:called`       | Tool invoked           | UI, Logger, EventStore          |
| `tool:result`       | Tool returns           | UI, Logger, EventStore          |
| `context:usage`     | Token usage updated    | UI, Cost Tracker, EventStore    |
| `error:occurred`    | Error thrown           | UI, Logger, EventStore          |
| `session:created`   | New session            | SessionManager, EventStore      |
| `session:forked`    | Session forked         | SessionManager, EventStore      |
| `session:compacted` | Context compacted      | SessionManager, EventStore      |
| `task:queued`       | Task added to queue    | UI, TaskScheduler               |
| `task:started`      | Task begins            | UI, TaskScheduler               |
| `task:completed`    | Task finishes          | UI, TaskScheduler, Parent Agent |

### Edge Types (Texere Integration)

| Edge Type        | Direction              | Meaning                                  |
| ---------------- | ---------------------- | ---------------------------------------- |
| `RESOLVES`       | Solution → Problem     | X fixes/solves Y                         |
| `DEPENDS_ON`     | Dependent → Dependency | X requires Y                             |
| `BASED_ON`       | Derived → Source       | X derived from Y                         |
| `CAUSES`         | Cause → Effect         | X leads to Y                             |
| `REPLACES`       | New → Old              | X replaces Y (auto-invalidates Y)        |
| `EXAMPLE_OF`     | Instance → Concept     | X demonstrates Y                         |
| `PART_OF`        | Component → Whole      | X is component of Y                      |
| `ANCHORED_TO`    | Knowledge → Code       | X is relevant to file Y                  |
| `ALTERNATIVE_TO` | Option A ↔ Option B    | X and Y are alternatives (bidirectional) |
| `CONTRADICTS`    | X ↔ Y                  | X conflicts with Y (bidirectional)       |
| `RELATED_TO`     | X ↔ Y                  | Weak association (last resort)           |

## Decision Log

**All decisions from interview rounds 1-10, with rationale. Decisions are immutable once made;
changes are tracked in Decision Evolution section.**

### Round 1: Foundation

| Decision                                   | Rationale                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Deployment: TUI + webapp, TUI first**    | TUI copies OpenCode style/features for familiarity, webapp enables future hosted deployment |
| **Language: Pure TypeScript**              | Direct comparability with OpenCode (also TypeScript), no language barrier                   |
| **Texere integration: Core memory system** | Embedded @texere/graph, NOT MCP indirection. Texere is first-class citizen.                 |
| **Solo developer optimization**            | Optimize for velocity, less ceremony, rapid iteration                                       |
| **Memory architecture: TWO-TIER**          | Short-term (notepads/drafts/plans, ephemeral) + Long-term (Texere KG, persistent)           |

### Round 2: Framework Evaluation

| Decision                         | Rationale                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework research complete**  | Evaluated LangGraph.js, Mastra, Vercel AI SDK, Custom (XState). Deferred final choice to Round 9.                                      |
| **Competitor analysis complete** | Studied Cursor (8 parallel agents), Goose (MCP-native), Aider (git integration), Claude Code (reasoning), Continue.dev (extensibility) |

### Round 3: Naming & Scope

| Decision                           | Rationale                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Project name: Loom**             | Metaphor: weaving agents together. Texere stays as knowledge graph name.                                       |
| **Prioritization: MVP-first**      | Tight MVP for a single coding session, iterate from there                                                      |
| **Parallel agent pattern: HYBRID** | Context isolation (Claude Code style) for read-only agents, worktree isolation (Cursor style) for write agents |

### Round 4: MVP Agents & UI

| Decision                              | Rationale                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MVP Agents: 7**                     | Orchestrator, Explorer, Researcher, Consultant, Executor, Planner, Texere Expert (NEW)                                                                                                                  |
| **UI Architecture: Localhost Web UI** | REPLACES earlier Ink TUI decision. LLMs are extremely fluent with React/DOM/HTML, much more reliable agent-built UI than Ink.                                                                           |
| **Texere Expert Agent**               | INGESTION specialist, not search. Decides what to store, how to categorize, what edges to create, avoid duplicates.                                                                                     |
| **Tool Strategy: Framework-first**    | MVP day 1: Tier 1 (bash, read, write, edit, glob, grep, task). Add incrementally: Tier 2 (webfetch, websearch, question, todo, sessions), Tier 3 (LSP, AST-grep, apply_patch, batch, interactive_bash). |

### Round 5: Event Sourcing & Monorepo

| Decision                                          | Rationale                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Execution Architecture: Event-Sourced**         | Every action is an event. State derived from event log. Full audit trail, replayable, maximum observability. |
| **Repository: New Loom monorepo**                 | Separate from Texere. Texere imported as dependency (@texere/graph).                                         |
| **Build System: Turborepo**                       | Already familiar, stable Bun support (later changed to Node.js), 7x faster than NX, minimal config.          |
| **Event Persistence: Persistent append-only log** | Every event stored in SQLite. Enables full replay, debugging, analytics.                                     |
| **Texere Integration Method: Copy into monorepo** | Full control, no dependency on external publishing/linking. packages/texere/ inside Loom monorepo.           |

### Round 6: Agent Config Pattern

| Decision                                     | Rationale                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Agent Config Pattern: Three-layer hybrid** | Layer 1: Zod schema (source of truth, runtime validation, type generation). Layer 2: TypeScript objects (built-in agents, type-safe). Layer 3: JSON config (user overrides + custom agents, no rebuild). Prompts: Markdown files with Handlebars templating. |

### Round 7: Pure TypeScript Config

| Decision                              | Rationale                                                                                                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Definition: Pure TypeScript** | REPLACES three-layer hybrid. Everything in code: agent configs, prompts, delegation rules. No JSON, no Markdown. Maximum type safety, IDE support, composability. Users who want custom agents write TypeScript. |
| **HTTP Server: Fastify**              | REPLACES Hono after Bun→Node switch. Native to Node.js, built-in Pino logging, mature WebSocket plugin, rich lifecycle hooks.                                                                                    |
| **Event Bus: RxJS**                   | Parallel agent coordination, WebSocket batching, cost/context monitoring, memory safety (takeUntil), fundamentally push-based (zero polling).                                                                    |
| **Event Storage: Separate tables**    | events table (audit/observability) separate from messages table (conversation history). Different concerns, different query patterns.                                                                            |

### Round 8: Runtime Switch

| Decision                                                         | Rationale                                                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime: Node.js (NOT Bun)**                                   | Bun has native module compatibility issues (better-sqlite3, onnxruntime-node, sharp, MCP SDK, Playwright). Loom is long-running server, startup speed irrelevant. Risk too high for multi-agent system. |
| **Package Manager: pnpm**                                        | Fast, reliable, workspace support, proven with Texere.                                                                                                                                                  |
| **TypeScript Execution: tsx for dev, tsc/tsdown for production** | tsx replaces Bun's built-in TS support.                                                                                                                                                                 |

### Round 9: Custom Orchestration

| Decision                                         | Rationale                                                                                                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custom Orchestration: Build on Vercel AI SDK** | NOT LangGraph/Mastra. Vercel AI SDK handles single-agent loop, tool calling, streaming, multi-provider. Loom builds: AgentRunner, TaskScheduler, task() tool, LoomEngine (~2000 lines of purpose-built code). |
| **Context Compaction: Hybrid**                   | Heuristic truncation first (truncate tool outputs, trim old reasoning, keep user messages), LLM summary if still over 75%.                                                                                    |
| **Write Isolation (MVP): File locking**          | Simple, no conflicts possible. Single write agent = direct access. Multiple write agents = file locking prevents same-file conflicts.                                                                         |
| **Write Isolation (Post-MVP): Git worktrees**    | Full parallel isolation, Cursor-style. Each write agent gets isolated worktree, merge back on completion.                                                                                                     |

### Round 10: Testing Strategy

| Decision                                       | Rationale                                                                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Testing Strategy: TDD (Red-Green-Refactor)** | Mandatory. Integration tests from day 1 (not unit tests first). Test INTENT, not implementation.                                                                           |
| **Test Framework: Vitest**                     | Consistent with Texere, Node.js native, fast.                                                                                                                              |
| **LLM in Tests: FakeLLM**                      | Real implementation of provider interface with scripted deterministic responses. NOT a mock. Returns predictable tool calls and text. Tests are fast, free, deterministic. |
| **Test Audit Step**                            | Final task in every plan: review all tests for intent-based testing, remove fluff, verify no library testing.                                                              |

## Decision Evolution

**This section tracks how decisions changed over time, showing the reasoning behind pivots.**

### Bun → Node.js (Round 8)

**Original Decision (Round 1):** Use Bun as runtime for fast startup and built-in TypeScript
support.

**Changed To:** Node.js with pnpm and tsx.

**Why:**

- Bun has native module compatibility issues with critical dependencies:
  - better-sqlite3 (native SQLite bindings)
  - onnxruntime-node (ML inference for embeddings)
  - sharp (image processing)
  - MCP SDK (assumes Node.js)
  - Playwright (browser automation)
- Loom is a long-running server where Bun's startup speed advantage is irrelevant
- Risk of unpredictable library compatibility is too high for a production coding orchestrator
- Node.js has mature, battle-tested support for all required native modules

**Impact:** Changed HTTP server from Hono to Fastify (see below).

### Hono → Fastify (Round 7)

**Original Decision (Round 1):** Use Hono as HTTP server (lightweight, Bun-native).

**Changed To:** Fastify.

**Why:**

- After switching to Node.js, Hono's advantage (native Bun WebSocket) was gone
- Hono requires @hono/node-server adapter on Node.js, adding complexity
- Fastify is native to Node.js with no adapter layer
- Built-in Pino logging provides structured JSON logs for free (critical for event-sourced system)
- Mature WebSocket plugin (@fastify/websocket) is battle-tested on Node.js
- Rich lifecycle hooks (onRequest → preParsing → preValidation → preHandler) enable fine-grained
  control
- Plugin encapsulation isolates WebSocket, REST, static serving concerns

**Impact:** None on architecture, just implementation detail.

### Three-Layer Hybrid Config → Pure TypeScript (Round 7)

**Original Decision (Round 6):** Three-layer hybrid agent config:

- Layer 1: Zod schema (source of truth)
- Layer 2: TypeScript objects (built-in agents)
- Layer 3: JSON config (user overrides)
- Prompts: Markdown files with Handlebars templating

**Changed To:** Pure TypeScript for everything (configs, prompts, delegation rules).

**Why:**

- Maximum type safety — agent configs validated at compile time, not runtime
- IDE support — full autocomplete, refactoring, type checking for agent definitions
- Composability — agents can be composed from other agents with full type inference
- No config file parsing — eliminates a class of bugs and simplifies deployment
- Prompts as template literals or builder functions enable dynamic prompt generation
- Deliberate choice to optimize for developer experience over configuration flexibility

**Impact:** Users who want custom agents must write TypeScript (acceptable for developer-focused
tool).

### Ink TUI → Localhost Web UI → React on localhost (Round 4)

**Original Decision (Round 1):** TUI using Ink (React for CLI).

**Changed To:** React web app served on localhost.

**Why:**

- LLMs are extremely fluent with React/DOM/HTML
- Much more reliable agent-built UI than Ink (which has limited ecosystem)
- Enables future webapp deployment with zero migration (same React app)
- WebSocket for real-time events (not polling)
- Headless mode: Engine runs without UI for CI/automation/API-only use
- Future desktop: Wrap in Electron if needed (~1 day work)

**Impact:** Changed UI architecture from TUI to web-based, but retained localhost-first approach.

## Scope Boundaries

### IN SCOPE (MVP)

**Core Orchestration:**

- Multi-agent coordination (7 MVP agents)
- Event-driven architecture (RxJS event bus)
- Task delegation (sync/async/continuation modes)
- Concurrency control (per-model, per-provider limits)
- Session management (create, fork, compact, revert)
- Background task execution

**Memory & Knowledge:**

- Two-tier memory (ephemeral + Texere KG)
- Texere integration (embedded @texere/graph)
- Cross-session knowledge persistence
- Auto-read from Texere on task start
- Auto-write decisions/findings to Texere

**UI/UX:**

- React web app on localhost
- WebSocket for real-time updates
- Agent visualization (active agent, delegation tree)
- Task progress display
- Cost tracking dashboard

**LLM Integration:**

- Multi-provider support (Anthropic, OpenAI, Google, local)
- Smart model routing (cheap for simple, expensive for complex)
- Token usage tracking
- Cost attribution per agent/task/session
- Model fallback chains

**Tools (Tier 1 - MVP Day 1):**

- bash — Command execution
- read — File reading
- write — File creation/overwriting
- edit — File editing
- glob — File pattern matching
- grep — Code search
- task — Agent delegation

**Tools (Tier 2 - Add Quickly):**

- webfetch — HTTP requests
- websearch — Web search (Exa/Tavily)
- question — Structured user prompts
- todo — Todo list management
- sessions — Session CRUD

**Tools (Tier 3 - Add Soon):**

- LSP — Language Server Protocol
- AST-grep — AST-aware code search/replace
- apply_patch — Patch application
- batch — Batch tool execution
- interactive_bash — PTY support

**MCP Support:**

- Built-in MCPs (Exa, Context7, Grep.app)
- Claude Code compatible (.mcp.json)
- Dynamic MCP registration at runtime

**Write Isolation:**

- File locking (MVP)
- Git worktrees (Post-MVP)

### OUT OF SCOPE (MVP)

**Deferred to Post-MVP:**

- IDE extension (VS Code, JetBrains)
- Mobile app
- Cloud hosting / SaaS deployment
- Desktop app (Electron wrapper)
- Additional agents (Atlas, Momus, Metis, Hephaestus, Multimodal Looker)
- Advanced context management (observational memory, async buffering)
- Critic model (review changes before execution)
- Multi-step planning with dynamic re-planning
- Worktree-based write isolation
- Full time-travel debugging

**Explicitly NOT Building:**

- IDE-specific features (inline suggestions, autocomplete)
- Code hosting / version control (use git)
- CI/CD pipeline (use existing tools)
- Package management (use npm/pnpm/yarn)
- Database migrations (use existing tools)

## User Constraints

**These are verbatim quotes from the user. They are non-negotiable requirements.**

### Feature Parity

> "It must be feature equivalent to OMO as a minimum"

Loom must replicate all core OMO capabilities:

- 11 agents (7 in MVP, 11 post-MVP)
- Background task execution
- Multi-agent delegation
- Session management
- Tool enforcement
- MCP integration
- Context injection
- Cost tracking

### Memory Persistence

> "Save this because I don't want to explain this again"

Two-tier memory architecture:

- Short-term: Notepads, drafts, plans (ephemeral, per-session/plan)
- Long-term: Texere (decisions, research, patterns) — persists across all sessions

> "I HATE how it forgets things, I see Texere as the medium and long term memory"

Texere is the authoritative long-term memory. Agents must:

- Search Texere before creating nodes (prevent duplicates)
- Auto-read from Texere on task start (relevant decisions, patterns, pitfalls)
- Auto-write decisions/findings to Texere (configurable: auto vs prompted)

### Code Commit Control

> "NEVER COMMIT CODE, THAT MUST BE UP TO THE OPERATOR NOT AN AGENT!!"

Agents can:

- Stage files (git add)
- Show diffs (git diff)
- Suggest commit messages

Agents CANNOT:

- Run git commit
- Run git push
- Modify git history (rebase, reset, etc.)

Operator must explicitly approve all commits.

### Tool Framework Design

> "since all these have already been implemented for opencode and others it shouldn't be too hard to
> add them"

Design the tool framework to make adding tools trivial, then port existing implementations from
OpenCode/OMO. Don't reinvent the wheel.

## Differentiation Strategy

**What makes Loom unique vs. competitors (Cursor, Claude Code, Goose, Aider, Continue.dev)?**

### 1. Multi-Agent Orchestration with Texere as Shared Memory

**Unique Aspect:** Not just multi-agent, but persistent memory across sessions.

- Cursor: 8 parallel agents, but no cross-session memory
- Claude Code: 16 experimental agents, but session-scoped only
- Loom: 7 MVP agents (32+ post-MVP) with Texere KG as universal memory layer

**Value:** Agents learn from past sessions. Decisions, patterns, pitfalls persist. No re-explaining
projects.

### 2. Hybrid Context Management (Git + Index + Texere KG)

**Unique Aspect:** Three-layer context system.

- Git: File history, blame, diffs
- Index: Semantic search, AST-aware code search
- Texere KG: Decisions, requirements, constraints, patterns

**Value:** Agents have full context: what changed (git), what exists (index), why it exists
(Texere).

### 3. Event-Driven Architecture (Not Polling)

**Unique Aspect:** RxJS event bus, zero polling.

- OpenCode/OMO: Polling-based background tasks (setInterval every 100ms)
- Loom: Push-based events, WebSocket for real-time UI updates

**Value:** Responsive UI, lower latency, better observability.

### 4. Native Tool Enforcement (Not Advisory)

**Unique Aspect:** Tool permissions enforced at runtime, not advisory hints.

- OpenCode/OMO: Plugins set `{ write: false }`, rely on OpenCode honoring it
- Loom: ToolRuntime blocks denied tools before LLM sees them

**Value:** Fail-safe. Read-only agents cannot write, even if LLM hallucinates tool calls.

### 5. Dynamic Agent/MCP Registration at Runtime

**Unique Aspect:** Add agents and MCPs without restart.

- OpenCode: 4 hardcoded agents, MCPs loaded at startup only
- Loom: AgentRegistry and MCP loader support runtime registration

**Value:** Extensibility without downtime. Hot-reload custom agents.

### 6. Smart Model Routing (Cheap Models for Simple Tasks)

**Unique Aspect:** Category-based model selection.

- quick → Cheap (Sonnet, Haiku)
- visual → Mid-tier (Sonnet 4.5)
- deep → Expensive (Opus, GPT-5)
- ultrabrain → Max reasoning (Opus 4.6)

**Value:** Cost optimization. Don't use Opus for grep. Use Opus for novel problems.

### 7. AST-Aware Editing via Tree-Sitter/LSP

**Unique Aspect:** Surgical edits, not regex replacements.

- Aider: Unified diff format (text-based)
- Loom: LSP rename, AST-grep replace (structure-aware)

**Value:** Refactoring without breaking code. Rename across files safely.

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

Built ON TOP of Vercel AI SDK (which handles single-agent LLM loop, tool calling, streaming). Loom
builds the multi-agent coordination layer:

#### Core Abstractions (4 pieces)

**1. AgentRunner** — Wraps Vercel AI SDK's `streamText()` for a single agent

- Resolves agent config → model, tools, system prompt
- Enforces tool permissions (blocks denied tools before LLM sees them)
- Emits RxJS events around each step (tool:called, tool:result, context:usage)
- Tracks token usage, streams chunks to event bus
- Persists messages to session

**2. TaskScheduler** — Manages parallel agent execution + queuing

- Concurrency limits: global (10), per-model (claude-opus: 3, sonnet: 6), per-provider
- Priority queue for waiting tasks
- Task lifecycle: CREATED → QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED
- Slot handoff: completed task frees slot → next queued task starts
- Retry logic: FAILED → RETRYING → RUNNING (with fallback models)

**3. `task()` Tool** — How agents delegate to other agents

- Available to agents with delegation enabled
- Resolves target agent by name OR category
- Modes: sync (wait for result) or async (fire-and-forget, return taskId)
- Session continuation: can resume an existing agent session
- Creates parent-child session relationships for tracing

**4. LoomEngine** — Central coordinator, wires everything together

- `events$`: RxJS Subject (the event spine)
- Subsystems: AgentRegistry, TaskScheduler, ToolRuntime, SessionManager, MemoryManager,
  ProviderRegistry, EventStore
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

1. Heuristic pass: Truncate tool outputs (keep "Read 500 lines of src/auth.ts" instead of full
   content), trim old assistant reasoning, keep all user messages verbatim. Preserves last 10
   messages verbatim.
2. If still over 75% after heuristic: Use cheap/fast model to summarize oldest conversation segment.
   Preserve decisions, files modified, errors encountered, current task state.
3. Event-sourced advantage: Can always reconstruct full history from event log even after
   compaction.

### Error Handling & Resilience

Retry strategy:

- Retryable: rate_limit (429), timeout, server_error (500/503) → exponential backoff (1s, 2s, 4s),
  max 3 attempts
- Non-retryable: auth_error (401), context_overflow, model_not_found, content_filter → surface
  immediately
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

## Tech Stack

| Layer                    | Technology                           | Rationale                                                                                  |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| **Runtime**              | Node.js                              | Native module compatibility (better-sqlite3, onnxruntime-node, sharp, MCP SDK, Playwright) |
| **Package Manager**      | pnpm                                 | Fast, reliable, workspace support, proven with Texere                                      |
| **TypeScript Execution** | tsx (dev), tsc/tsdown (build)        | tsx replaces Bun's built-in TS support                                                     |
| **Build**                | Turborepo                            | Familiar, stable, 7x faster than NX, minimal config                                        |
| **LLM**                  | Vercel AI SDK + conduit-ai           | Best-in-class streaming, provider abstraction (20K stars, 5 providers)                     |
| **Server**               | Fastify                              | Native to Node.js, built-in Pino logging, mature WebSocket plugin, rich lifecycle hooks    |
| **UI**                   | React (Vite)                         | LLM fluency with React/DOM/HTML, future webapp deployment                                  |
| **Event Bus**            | RxJS                                 | Parallel agent coordination, WebSocket batching, cost/context monitoring, memory safety    |
| **Knowledge Graph**      | @texere/graph (copied, restructured) | Embedded, not MCP. First-class long-term memory.                                           |
| **Database**             | SQLite (sessions + events)           | WAL mode, append-only event log, session persistence                                       |
| **Agent Config**         | Pure TypeScript (Zod validation)     | Maximum type safety, IDE support, composability                                            |
| **Testing**              | Vitest                               | Consistent with Texere, Node.js native, fast                                               |

### Why NOT Bun?

- Native module compatibility issues (better-sqlite3, onnxruntime-node, sharp)
- MCP SDK, Playwright, tree-sitter all assume Node.js
- Loom is long-running server — startup speed advantage irrelevant
- Risk too high for multi-agent system that must support unpredictable libraries

### Why NOT Hono?

- After switching to Node.js, Hono's advantage (native Bun WebSocket) was gone
- Requires @hono/node-server adapter on Node.js
- Fastify is native to Node.js with built-in Pino logging and mature WebSocket plugin

### Why NOT LangGraph/Mastra?

- Vercel AI SDK is best-in-class for streaming and provider abstraction
- Building custom orchestration gives full control over multi-agent coordination
- Custom layer is ~2000 lines of purpose-built code for coding agents, not a generic framework
- Avoids lock-in to LangGraph or Mastra

## Next Steps

For detailed documentation, see:

- **[01-architecture.md](01-architecture.md)** — System design (event-driven, agent graph, tools,
  Texere integration)
- **[02-agent-system.md](02-agent-system.md)** — Config-driven agents, schema, default agents
- **[03-opencode-omo-analysis.md](03-opencode-omo-analysis.md)** — Feature parity checklist, what to
  replicate/improve
- **[04-tech-stack.md](04-tech-stack.md)** — Framework choices with rationale
- **[05-implementation-roadmap.md](05-implementation-roadmap.md)** — Phased plan

## Key Principles

1. **Specialization over generalization** — Each agent has a specific role
2. **Parallel by default** — Background tasks maximize throughput
3. **Context preservation** — Session hierarchy maintains state across agents
4. **Immutable design** — Events don't mutate, they transform
5. **Type safety** — Zod schemas validate everything
6. **Modular architecture** — 200 LOC hard limit per file
7. **TDD mandatory** — RED-GREEN-REFACTOR workflow
8. **Event-sourced observability** — Every action is an event, full audit trail
9. **Texere as source of truth** — Long-term memory persists across all sessions
10. **Developer-first** — Optimize for developer experience, not configuration flexibility

## Resources

- **Loom Repository:** (TBD — new monorepo)
- **Texere Repository:** https://github.com/danscan/texere
- **OpenCode:** https://github.com/anomalyco/opencode
- **OMO:** https://github.com/code-yeongyu/oh-my-opencode
- **Vercel AI SDK:** https://sdk.vercel.ai
- **Fastify:** https://fastify.dev
- **RxJS:** https://rxjs.dev
