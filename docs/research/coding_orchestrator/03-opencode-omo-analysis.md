# OpenCode + OMO Feature Analysis

**Comprehensive Feature Inventory with Loom Classification**  
**Last Updated:** 2026-02-15  
**Status:** Design Phase (Wave 2)  
**Purpose:** Factual analysis of OpenCode and OMO features with Replicate/Improve/Skip
classification for Loom

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [OpenCode Core Features](#opencode-core-features)
3. [OMO Extended Features](#omo-extended-features)
4. [Feature Classification Table](#feature-classification-table)
5. [OMO Complexity Hotspots](#omo-complexity-hotspots)
6. [OMO Limitations](#omo-limitations)
7. [What Loom Improves](#what-loom-improves)
8. [Table-Stakes 2026](#table-stakes-2026)
9. [Full Feature Inventory](#full-feature-inventory)

## Executive Summary

### What OpenCode Provides

OpenCode is a TypeScript-based coding assistant platform (Bun runtime, Hono server, SQLite database)
that provides:

- **Multi-provider LLM integration** (20+ providers via Vercel AI SDK)
- **Session system** (create, fork, compact, revert with parent-child relationships)
- **Tool system** (24+ built-in tools with Zod validation)
- **MCP integration** (stdio and HTTP/SSE transports)
- **Permission system** (allow/deny/ask per tool with wildcard patterns)
- **Event bus** (pub/sub for session lifecycle)
- **Database** (SQLite with WAL mode for sessions and messages)

### What OMO Adds

OMO is an OpenCode plugin (117,000+ lines of code across 1,069 TypeScript files) that extends
OpenCode with:

- **11 specialized agents** (Sisyphus, Hephaestus, Atlas, Prometheus, Oracle, Librarian, Explore,
  Multimodal Looker, Metis, Momus, Sisyphus-Junior)
- **41 lifecycle hooks** (context injection, keyword detection, task enforcement, code quality)
- **Background task scheduler** (1,646-line BackgroundManager with concurrency control)
- **Dynamic prompt composition** (10+ section builders for agent-specific prompts)
- **Context injection system** (auto-inject AGENTS.md, README, rules)
- **Workflow engines** (Ralph Loop, Boulder, todo continuation)
- **Skill system** (built-in + user-installed with YAML frontmatter)
- **3-tier MCP architecture** (built-in, Claude Code compatible, skill-embedded)

### Why Loom Replaces (Not Extends) Them

OpenCode's plugin architecture creates a hard boundary. OMO must work WITHIN OpenCode's hooks, which
prevents:

- Deep Texere integration (MCP indirection, not embedded)
- UI customization (plugins output text only)
- Real-time communication (polling-based, not event-driven)
- Runtime tool enforcement (advisory only)
- Dynamic agent registration (4 hardcoded agents in OpenCode core)

Loom is a standalone orchestrator with Texere as the core memory system, not a plugin.

## OpenCode Core Features

### LLM Provider Integration (20+ providers)

- Multi-provider support (OpenAI, Anthropic, Azure, Google, Bedrock, Groq, Mistral, Cohere,
  Perplexity, DeepSeek, etc.)
- Dynamic model loading from models.dev database
- Model variants with custom parameters
- Cost tracking (input/output/cache pricing per model)
- Capability detection (temperature, reasoning, attachments, tool calling, multimodal)
- Context window limits and output token constraints
- Model status tracking (alpha, beta, deprecated, active)
- Provider authentication (API keys, OAuth, env vars)
- Custom OpenAI-compatible provider support
- Streaming text generation with tool calling
- Token counting and estimation
- Exponential backoff retry logic with Retry-After header support
- Provider-specific error types (auth, context overflow, output length, abort, model not found)

### Session System

- Session creation with auto-generated IDs
- Session forking from existing sessions
- Session archival
- Parent-child session relationships (critical for agent delegation)
- Session persistence in SQLite
- Session metadata (title, directory, project, agent)
- Message history with parts (text, tool calls, snapshots, patches)
- Session compaction when context overflows (prune old tool outputs, preserve recent)
- Session revert (undo tool executions, restore conversation state)
- Session summary / auto-generated titles
- Session sharing (URLs with secret tokens)
- Session export/import
- Session status tracking (idle, running, etc.)

### Tool System

- Tool definition framework (Zod schemas for args validation)
- Tool context (sessionID, messageID, agent, abort signal)
- Permission system for tool execution (allow/deny/ask per tool, wildcard patterns)
- Output truncation (line and byte limits)
- Custom tool loading from filesystem ({tool,tools}/\*.{js,ts})
- Plugin-based tool registration
- Batch tool execution

### Built-in Tools (24+)

- bash — Command execution with timeout, working directory, tree-sitter parsing
- read — File reading with line offset/limit, directory listing
- write — File creation/overwriting
- edit — File editing with 9 replacement strategies
- multiedit — Multiple file edits in one call
- glob — File pattern matching with ignore patterns
- grep — Code search with regex and context lines (ripgrep)
- webfetch — HTTP requests with format conversion (markdown/text/HTML)
- websearch — Web search (Exa API)
- codesearch — Code search across GitHub
- question — Structured user prompts in TUI
- task — Task delegation to sub-agents
- todowrite/todoread — Todo list management
- skill — Custom skill loading/execution
- lsp — Language Server Protocol analysis
- apply_patch — Patch application (GPT models)
- plan_enter/plan_exit — Plan mode transitions

### MCP Integration

- MCP server support (stdio and HTTP/SSE transports)
- MCP tool conversion to AI SDK format
- OAuth authentication for MCP servers
- Tool list change notifications
- MCP server configuration in config files

### Database & Storage

- SQLite with WAL mode
- Schema migrations
- Session, message, metadata tables
- Snapshot storage

### Permission System

- Tool-level permissions (allow/deny/ask)
- Pattern-based rules with wildcards
- Session-scoped permissions
- Permission request UI

### Event Bus

- Pub/sub event system
- Global and session-scoped events
- Type-safe event definitions

### Configuration System

- JSON/JSONC config files
- Hierarchical precedence (remote → global → custom → project → .opencode → inline → managed)
- Agent, provider, model, plugin, permission config sections
- Environment variable overrides
- Config directory scanning for tools, agents, commands, plugins

### HTTP Server & API

- REST API endpoints (Hono framework)
- WebSocket support for real-time updates
- CORS handling, basic auth
- Agent Client Protocol (ACP) for IDE integration

## OMO Extended Features

### Multi-Agent System (11 agents)

- **Sisyphus** (Opus 4.6) — Primary orchestrator, delegates to all
- **Hephaestus** (GPT-5.3 Codex) — Autonomous deep worker, no delegation
- **Atlas** (Sonnet 4.5) — Work plan executor, delegates to Junior
- **Prometheus** (Opus 4.6) — Strategic planner, delegates research
- **Oracle** (GPT-5.2) — Architecture consultant, read-only
- **Librarian** (GLM-4.7) — Docs/OSS research, read-only
- **Explore** (Grok Fast) — Fast codebase grep, read-only
- **Multimodal Looker** (Gemini 3 Flash) — PDF/image analysis
- **Metis** (Opus 4.6) — Pre-planning analyst, delegates research
- **Momus** (GPT-5.2) — Plan validator, read-only
- **Sisyphus-Junior** (Sonnet 4.5) — Category executor, cannot delegate

Agent modes: primary (user-facing), subagent (delegate-only), all (both)

### Background Task System (1,646 lines)

- Task lifecycle (pending → running → completed/error/cancelled/interrupt)
- Task queuing with concurrency control
- Concurrency limits (per-model, per-provider, default)
- Task progress tracking (tool calls, last tool, timestamps)
- Stale task detection and auto-cancellation
- Parent session notification on completion
- Background output retrieval
- Background task cancellation
- Slot handoff (next queued task gets freed slot)

### Dynamic Prompt Composition (10+ section builders)

- Composable prompt sections (identity, tools, agents, skills, delegation, hard blocks)
- Delegation table generation (domain → agent → trigger mapping)
- Tool selection guide (cost, when-to-use)
- Category + skill selection protocol
- Agent-specific prompt templates
- Model-specific prompt variants (GPT vs Claude optimizations)

### Context Injection System

- Auto-inject AGENTS.md, README.md on file operations
- Rule file discovery (walk directory tree, match globs)
- Rule files with YAML frontmatter (glob patterns for matching)
- Session-scoped caching (avoid duplicate injections)
- Cache invalidation on session compact/delete

### Keyword/Mode Detection

- Keyword scanning ([ultrawork], [analyze-mode], [boulder], [plan])
- Mode-specific instruction injection
- Model variant selection (max for ultrawork)
- Subagent session protection (don't inject modes into background tasks)

### Workflow Engines

- Simple task → direct execution
- Complex task → parallel background research → implementation
- Precise multi-step → Plan (Prometheus) → Execute (Atlas → Junior)
- Autonomous deep work → Hephaestus
- Ralph Loop (iterative refinement until done)
- Boulder mode (continuous work until plan complete)
- Todo continuation enforcement (remind to complete todos)
- Start-work command (trigger Atlas from plan)
- Handoff command (context summary for new session)

### Skill System

- Built-in skills (playwright, git-master, frontend-ui-ux, dev-browser)
- User-installed skills (project-local and global)
- YAML frontmatter format for skill definitions
- Skill-embedded MCP servers
- Skill loading via load_skills parameter in task()
- Skill content injection into agent prompts

### Built-in MCP Integrations

- Web search (Exa/Tavily)
- Official documentation (Context7)
- GitHub code search (Grep.app)
- Claude Code compatible MCP config (.mcp.json with ${VAR} expansion)

### Lifecycle Hooks (41 hooks)

**Context Injection (4 hooks):**

- AGENTS.md auto-injection
- README.md auto-injection
- Rules file discovery and injection
- Directory context injection

**Message Transform (5 hooks):**

- Keyword detection ([ultrawork], [boulder], etc.)
- Think mode injection
- Context window monitor
- Model variant selection
- Subagent session protection

**Task Management (5 hooks):**

- Todo continuation enforcer
- Compaction preservation
- Resume info injection
- Boulder mechanism
- Atlas orchestration

**Code Quality (3 hooks):**

- Comment checker
- Edit recovery
- Write guard

**Orchestration (6 hooks):**

- Ralph Loop
- Delegation retry
- Background notifications
- Atlas integration
- Session hierarchy management
- Stale task cleanup

## Feature Classification Table

**Top 50+ Critical Features with Replicate/Improve/Skip Classification**

| Feature                           | Source   | Classification | Loom Priority | Notes                                                                                        |
| --------------------------------- | -------- | -------------- | ------------- | -------------------------------------------------------------------------------------------- |
| Multi-provider LLM                | OpenCode | **Replicate**  | MVP           | Via Vercel AI SDK + conduit-ai                                                               |
| Session fork/compact              | OpenCode | **Replicate**  | MVP           | SessionManager handles this                                                                  |
| Cost tracking                     | OpenCode | **Replicate**  | MVP           | ProviderRegistry tracks tokens/$                                                             |
| Event bus (pub/sub)               | OpenCode | **Improve**    | MVP           | OpenCode has basic pub/sub; Loom uses RxJS push-based (not polling)                          |
| Tool permissions                  | OpenCode | **Improve**    | MVP           | OpenCode advisory (boolean maps); Loom runtime-enforced (blocks before LLM)                  |
| Background tasks                  | OMO      | **Improve**    | MVP           | OMO 1646-line BackgroundManager with polling; Loom TaskScheduler ~300 lines with RxJS events |
| Context compaction                | OMO      | **Improve**    | MVP           | OMO 2232 lines (complex recovery); Loom hybrid (heuristic + LLM) ~200 lines                  |
| Dynamic agents                    | OMO      | **Improve**    | MVP           | OMO hardcoded 11 agents; Loom config-driven (pure TS, Zod validation)                        |
| Session parent-child              | OpenCode | **Replicate**  | MVP           | Critical for agent delegation tracing                                                        |
| Token counting                    | OpenCode | **Replicate**  | MVP           | Essential for cost tracking and context management                                           |
| Model fallback chains             | OMO      | **Replicate**  | MVP           | primary → fallback1 → fallback2 per agent                                                    |
| Streaming responses               | OpenCode | **Replicate**  | MVP           | Vercel AI SDK handles this                                                                   |
| Tool context (sessionID, abort)   | OpenCode | **Replicate**  | MVP           | Tool execution context                                                                       |
| Batch tool execution              | OpenCode | **Replicate**  | Post-MVP      | Execute multiple tools in one call                                                           |
| Session revert                    | OpenCode | **Replicate**  | MVP           | Undo tool executions, restore state                                                          |
| Session export/import             | OpenCode | **Skip**       | Future        | Not critical for MVP                                                                         |
| Session sharing (URLs)            | OpenCode | **Skip**       | Future        | Not needed for localhost MVP                                                                 |
| MCP stdio/HTTP transports         | OpenCode | **Replicate**  | MVP           | Standard MCP support                                                                         |
| MCP OAuth                         | OpenCode | **Skip**       | Post-MVP      | Not critical for MVP                                                                         |
| Custom tool loading               | OpenCode | **Replicate**  | Post-MVP      | Load tools from filesystem                                                                   |
| Plugin-based tool registration    | OpenCode | **Skip**       | N/A           | Loom is not a plugin system                                                                  |
| Config hierarchical precedence    | OpenCode | **Skip**       | Post-MVP      | MVP uses single config file                                                                  |
| Agent Client Protocol (ACP)       | OpenCode | **Skip**       | Future        | IDE integration not in MVP                                                                   |
| WebSocket support                 | OpenCode | **Improve**    | MVP           | OpenCode basic WS; Loom uses Fastify + RxJS for real-time UI                                 |
| Sisyphus (orchestrator)           | OMO      | **Replicate**  | MVP           | Loom Orchestrator agent                                                                      |
| Hephaestus (deep worker)          | OMO      | **Skip**       | Post-MVP      | Autonomous deep work not in MVP                                                              |
| Atlas (plan executor)             | OMO      | **Skip**       | Post-MVP      | Work plan execution not in MVP                                                               |
| Prometheus (planner)              | OMO      | **Replicate**  | MVP           | Loom Planner agent                                                                           |
| Oracle (consultant)               | OMO      | **Replicate**  | MVP           | Loom Consultant agent                                                                        |
| Librarian (researcher)            | OMO      | **Replicate**  | MVP           | Loom Researcher agent                                                                        |
| Explore (codebase search)         | OMO      | **Replicate**  | MVP           | Loom Explorer agent                                                                          |
| Multimodal Looker                 | OMO      | **Skip**       | Post-MVP      | PDF/image analysis not in MVP                                                                |
| Metis (pre-planning)              | OMO      | **Skip**       | Post-MVP      | Gap analysis not in MVP                                                                      |
| Momus (plan validator)            | OMO      | **Skip**       | Post-MVP      | Plan validation not in MVP                                                                   |
| Sisyphus-Junior (executor)        | OMO      | **Replicate**  | MVP           | Loom Executor agent                                                                          |
| Task delegation (task() tool)     | OMO      | **Replicate**  | MVP           | Core delegation mechanism                                                                    |
| Category-based delegation         | OMO      | **Replicate**  | MVP           | quick/visual/deep/ultrabrain/artistry/writing                                                |
| Sync/async execution modes        | OMO      | **Replicate**  | MVP           | Wait for result vs fire-and-forget                                                           |
| Session continuation              | OMO      | **Replicate**  | MVP           | Resume existing agent sessions                                                               |
| Concurrency limits (per-model)    | OMO      | **Replicate**  | MVP           | claude-opus: 3, sonnet: 6, etc.                                                              |
| Concurrency limits (per-provider) | OMO      | **Replicate**  | MVP           | anthropic: 10, openai: 5, etc.                                                               |
| Stale task detection              | OMO      | **Improve**    | MVP           | OMO polling-based; Loom event-based timeout                                                  |
| Parent notification on completion | OMO      | **Improve**    | MVP           | OMO batched polling; Loom immediate RxJS event                                               |
| Dynamic prompt composition        | OMO      | **Replicate**  | MVP           | Composable prompt sections                                                                   |
| Delegation table generation       | OMO      | **Replicate**  | MVP           | Domain → agent → trigger mapping                                                             |
| Tool selection guide              | OMO      | **Replicate**  | MVP           | Cost, when-to-use for each tool                                                              |
| Model-specific prompts            | OMO      | **Replicate**  | MVP           | GPT vs Claude optimizations                                                                  |
| AGENTS.md auto-injection          | OMO      | **Replicate**  | MVP           | Context injection on file operations                                                         |
| README.md auto-injection          | OMO      | **Replicate**  | MVP           | Project context injection                                                                    |
| Rule file discovery               | OMO      | **Skip**       | Post-MVP      | .claude/rules/\*.md not in MVP                                                               |
| Keyword detection                 | OMO      | **Skip**       | Post-MVP      | [ultrawork], [boulder] not in MVP                                                            |
| Ralph Loop                        | OMO      | **Skip**       | Post-MVP      | Iterative refinement not in MVP                                                              |
| Boulder mode                      | OMO      | **Skip**       | Post-MVP      | Continuous work not in MVP                                                                   |
| Todo continuation                 | OMO      | **Replicate**  | MVP           | Remind to complete todos                                                                     |
| Skill system                      | OMO      | **Skip**       | Post-MVP      | YAML frontmatter skills not in MVP                                                           |
| Built-in MCPs (Exa, Context7)     | OMO      | **Replicate**  | MVP           | Web search, docs search                                                                      |
| Claude Code MCP compatibility     | OMO      | **Skip**       | Post-MVP      | .mcp.json not in MVP                                                                         |
| Comment checker                   | OMO      | **Skip**       | Post-MVP      | Code quality hook not in MVP                                                                 |
| Edit recovery                     | OMO      | **Skip**       | Post-MVP      | Not critical for MVP                                                                         |
| Write guard                       | OMO      | **Skip**       | Post-MVP      | Not critical for MVP                                                                         |
| Context window monitor            | OMO      | **Improve**    | MVP           | OMO complex recovery; Loom 3-threshold (60%/75%/90%)                                         |
| Texere integration                | N/A      | **NEW**        | MVP           | Embedded @texere/graph (not MCP), first-class long-term memory                               |
| Texere Expert agent               | N/A      | **NEW**        | MVP           | Ingestion specialist (what to store, how to categorize, edges)                               |
| File locking (write isolation)    | N/A      | **NEW**        | MVP           | Prevent concurrent write conflicts                                                           |
| Git worktrees (write isolation)   | N/A      | **NEW**        | Post-MVP      | Full parallel isolation (Cursor-style)                                                       |
| React web UI                      | N/A      | **NEW**        | MVP           | Localhost web app (not TUI)                                                                  |
| RxJS event bus                    | N/A      | **NEW**        | MVP           | Push-based events (not polling)                                                              |
| Event-sourced observability       | N/A      | **NEW**        | MVP           | Append-only event log for full audit trail                                                   |
| Fastify server                    | N/A      | **NEW**        | MVP           | HTTP + WebSocket + Pino logging                                                              |
| Pure TypeScript config            | N/A      | **NEW**        | MVP           | Agent configs in TS (not JSON/YAML)                                                          |

**Classification Summary:**

- **Replicate:** 32 features (OpenCode/OMO features to preserve as-is)
- **Improve:** 9 features (OpenCode/OMO features to enhance)
- **Skip:** 15 features (OpenCode/OMO features to defer or omit)
- **NEW:** 8 features (Loom-specific innovations)

## OMO Complexity Hotspots

**5 components with excessive complexity that Loom simplifies:**

### 1. BackgroundManager (1,646 lines)

**What it does:**

- Manages parallel agent execution with queuing
- Enforces concurrency limits (per-model, per-provider, default)
- Polls for task completion every 100ms
- Detects stale tasks (no activity for 5 minutes)
- Batches parent notifications
- Cleans up completed/cancelled tasks

**Why it's complex:**

- Polling-based architecture (setInterval every 100ms)
- Manual state tracking (pending → running → completed/error/cancelled)
- Stale detection requires timestamp comparison on every poll
- Slot handoff logic (when task completes, find next queued task)
- Parent notification batching (collect results, send once)
- Resource cleanup (delete sessions, clear maps)

**How Loom simplifies:**

- RxJS event-based TaskScheduler (~300 lines)
- Push-based events (no polling)
- Native concurrency control via RxJS operators (mergeMap with concurrency limit)
- Task lifecycle as state machine (CREATED → QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED)
- Immediate parent notification via event emission
- Automatic cleanup via RxJS subscription disposal

### 2. Context Window Recovery (2,232 lines)

**What it does:**

- Detects context window overflow (approaching limit)
- Compacts session messages to fit within limit
- Preserves critical context (recent messages, decisions, files modified, errors)
- Handles Anthropic-specific context limits
- Recovers from overflow errors

**Why it's complex:**

- Multiple recovery strategies (heuristic truncation, LLM summarization, session fork)
- Anthropic-specific logic (different limits for different models)
- Preserve-or-prune decisions for each message type (user, assistant, tool)
- Token counting for every message
- Fallback chain (try heuristic → try LLM summary → force fork)
- Session state reconstruction after compaction

**How Loom simplifies:**

- Hybrid compaction strategy (~200 lines)
- Three-threshold system (60% yellow, 75% orange, 90% red)
- Heuristic first (truncate tool outputs, trim old reasoning, keep user messages)
- LLM summary only if heuristic fails
- Event log fallback (can always reconstruct from events)
- Provider-agnostic (no Anthropic-specific logic)

### 3. Boulder Mechanism (2,061 lines)

**What it does:**

- Continuous work mode (keep working until plan complete)
- Tracks task completion in boulder.json
- Reminds agent of incomplete tasks
- Prevents premature completion
- Integrates with Atlas (work plan executor)

**Why it's complex:**

- State tracking in filesystem (boulder.json)
- Parse and update JSON on every message
- Inject boulder state into agent prompts
- Detect completion vs in-progress
- Handle boulder.json corruption
- Coordinate with Atlas agent

**How Loom simplifies:**

- Built into TaskScheduler state machine
- No filesystem state (event log is source of truth)
- Task completion tracked in-memory (TaskScheduler.tasks Map)
- Agent decides when done (not framework-driven)
- No special boulder mode (just normal task execution)

### 4. Ralph Loop (1,687 lines)

**What it does:**

- Iterative refinement workflow
- Agent works on task, reviews, refines, repeats
- Detects when "done" (no more improvements)
- Prevents infinite loops
- Tracks iteration count

**Why it's complex:**

- Iteration detection (parse agent output for "done" signals)
- Loop prevention (max iterations, cost limits)
- State injection (tell agent which iteration)
- Review step (agent reviews own work)
- Refinement step (agent improves based on review)

**How Loom simplifies:**

- Not a framework feature (agent decision)
- Agent can iterate if it wants (no special loop mechanism)
- Cost limits enforced at TaskScheduler level (not loop-specific)
- Infinite loop detection via step count (50 steps max per task)
- No special Ralph mode

### 5. Claude Code Hooks (2,110 lines)

**What it does:**

- Full Claude Code compatibility layer
- Implements PreToolUse, PostToolUse, UserPromptSubmit hooks
- Loads Claude Code commands, agents, skills, MCPs
- Tracks session state for Claude Code
- Translates Claude Code events to OpenCode events

**Why it's complex:**

- Two event systems (Claude Code + OpenCode)
- Event translation (map CC events to OC events)
- State synchronization (CC session state ↔ OC session state)
- Hook injection (intercept CC hooks, forward to OC)
- Loader compatibility (CC command/agent/skill/MCP loaders)

**How Loom simplifies:**

- N/A — Loom is standalone, not a plugin
- No Claude Code compatibility needed
- Single event system (RxJS)
- No hook injection (Loom owns the event bus)
- No state synchronization (Loom is the source of truth)

## OMO Limitations

**11 core limitations of the OpenCode plugin architecture:**

### 1. No UI Extensibility

**Limitation:** Plugins can output text only. Cannot add custom panels, agent visualization, task
progress UI, or modify the TUI layout.

**Impact:** OMO cannot show agent delegation tree, real-time task progress, or cost dashboard. All
output is text in the chat.

**Loom Solution:** React web UI on localhost with full control over layout, components, and
real-time updates via WebSocket.

### 2. Polling-Based Communication

**Limitation:** No WebSocket or event stream between plugin and OpenCode core. Background tasks
polled every 100ms via setInterval.

**Impact:** High CPU usage, latency in task completion detection, stale task detection requires
timestamp comparison on every poll.

**Loom Solution:** RxJS event bus with push-based events. Zero polling. Immediate task completion
notification.

### 3. Session Management Opaque

**Limitation:** Plugin creates sessions through API but cannot deeply control session lifecycle,
message storage, or compaction strategy.

**Impact:** OMO must work around OpenCode's session compaction (2,232 lines of recovery logic).
Cannot customize session storage.

**Loom Solution:** SessionManager owns session lifecycle. Full control over compaction strategy,
message storage, and session state.

### 4. Tool Enforcement Advisory

**Limitation:** Plugin sets `{ write: false, edit: false }` but relies on OpenCode honoring it. No
runtime enforcement.

**Impact:** Read-only agents can write if LLM hallucinates tool calls. No fail-safe.

**Loom Solution:** ToolRuntime blocks denied tools before LLM sees them. Runtime-enforced
permissions.

### 5. No First-Class Agent-to-Agent Communication

**Limitation:** All delegation goes through `task()` tool. No direct agent-to-agent messaging.

**Impact:** Parent agent must poll for child completion. No streaming results from child to parent.

**Loom Solution:** RxJS event bus enables direct agent-to-agent events. Parent subscribes to child
events for real-time updates.

### 6. MCP Integration Bolted On

**Limitation:** MCP servers loaded at startup only. No dynamic registration. MCP tools converted to
OpenCode tools via adapter.

**Impact:** Cannot add MCPs at runtime. MCP indirection adds latency.

**Loom Solution:** Dynamic MCP registration at runtime. MCP tools registered directly with
ToolRuntime.

### 7. Only 4 Hardcoded Agents

**Limitation:** OpenCode has 4 hardcoded agents (build, plan, general, explore). Plugins cannot add
primary agents, only subagents.

**Impact:** OMO's 11 agents are all subagents. Cannot replace OpenCode's primary agent.

**Loom Solution:** AgentRegistry supports dynamic agent registration. All agents are first-class (no
primary vs subagent distinction).

### 8. Cannot Add LLM Providers

**Limitation:** 20 bundled providers, no extension point for custom providers.

**Impact:** Cannot add new providers without forking OpenCode.

**Loom Solution:** ProviderRegistry supports dynamic provider registration via Vercel AI SDK.

### 9. Cannot Extend TUI

**Limitation:** Solid.js + OpenTUI components are core, not pluggable. Plugins cannot add UI
components.

**Impact:** OMO cannot customize agent switcher, task progress, or cost dashboard.

**Loom Solution:** React web UI with full control over components and layout.

### 10. Fire-and-Forget Prompts

**Limitation:** `session.promptAsync()` returns immediately. No sync error handling. Plugin must
poll for completion.

**Impact:** Cannot catch errors synchronously. Must poll for errors in background.

**Loom Solution:** AgentRunner returns Promise that resolves/rejects synchronously. Errors caught
immediately.

### 11. No Dynamic MCP Registration

**Limitation:** MCPs loaded at startup from config files only. Cannot register MCPs at runtime.

**Impact:** Must restart OpenCode to add new MCPs.

**Loom Solution:** MCP loader supports runtime registration. Add MCPs without restart.

## What Loom Improves

**Factual comparison of Loom improvements over OpenCode/OMO:**

### Event-Driven vs Polling

**OpenCode/OMO:** Background tasks polled every 100ms via setInterval. Stale detection via timestamp
comparison on every poll.

**Loom:** RxJS event bus with push-based events. Task completion emits event immediately. Zero
polling.

**Benefit:** Lower CPU usage, lower latency, real-time UI updates.

### Enforced Permissions vs Advisory

**OpenCode/OMO:** Plugins set `{ write: false }` but rely on OpenCode honoring it. No runtime
enforcement.

**Loom:** ToolRuntime blocks denied tools before LLM sees them. Runtime-enforced permissions.

**Benefit:** Fail-safe. Read-only agents cannot write, even if LLM hallucinates tool calls.

### Config-Driven Agents vs Hardcoded

**OpenCode/OMO:** 4 hardcoded agents in OpenCode core. OMO's 11 agents are subagents only.

**Loom:** AgentRegistry with dynamic registration. All agents defined in pure TypeScript with Zod
validation.

**Benefit:** Add agents without rebuild. Full type safety. IDE autocomplete.

### First-Class Texere vs MCP Indirection

**OpenCode/OMO:** Texere accessed via MCP server (stdio transport, JSON-RPC overhead).

**Loom:** Embedded @texere/graph library (direct import, no MCP overhead).

**Benefit:** Lower latency, full control over Texere API, no MCP indirection.

### Localhost Web UI vs Constrained TUI Plugin

**OpenCode/OMO:** Solid.js + OpenTUI TUI. Plugins output text only.

**Loom:** React web app on localhost with WebSocket for real-time updates.

**Benefit:** Full UI control, agent visualization, task progress, cost dashboard. Future webapp
deployment (same React app).

### Hybrid Compaction vs Complex Recovery

**OpenCode/OMO:** 2,232 lines of context window recovery logic with multiple strategies.

**Loom:** Hybrid compaction (~200 lines): heuristic first, LLM summary if needed, event log
fallback.

**Benefit:** Simpler, faster, event-sourced advantage (can always reconstruct from events).

### TaskScheduler vs BackgroundManager

**OpenCode/OMO:** 1,646-line BackgroundManager with polling, manual state tracking, slot handoff
logic.

**Loom:** TaskScheduler (~300 lines) with RxJS operators, state machine, native concurrency control.

**Benefit:** Simpler, faster, push-based events, automatic cleanup.

### Pure TypeScript Config vs Three-Layer Hybrid

**OpenCode/OMO:** JSON config + YAML frontmatter + Markdown prompts.

**Loom:** Pure TypeScript (agent configs, prompts, delegation rules).

**Benefit:** Maximum type safety, IDE support, composability. No config file parsing.

## Table-Stakes 2026

**Features that EVERY serious coding assistant has (Cursor, Claude Code, Goose, Aider,
Continue.dev):**

### Core Editing

- Multi-file editing (actual edits, not just suggestions)
- Diff review before applying changes
- Undo/rollback (revert AI changes easily)
- Search & replace (codebase-wide)

### Codebase Understanding

- Semantic search (find code by meaning, not just text)
- AST-aware code navigation (jump to definition, find references)
- File tree navigation
- Symbol outline (classes, methods, functions)

### Terminal Integration

- Execute commands (bash, npm, git, etc.)
- View command output
- Interactive terminal sessions (PTY support)

### Git Integration

- Auto-commits (stage files, suggest commit messages)
- Branch management (create, switch, merge)
- PR creation (GitHub, GitLab)
- Diff visualization

### LLM Integration

- Streaming responses (real-time output)
- Multi-model support (GPT, Claude, Gemini, DeepSeek, local models)
- Cost tracking (tokens, dollars per session)
- Model fallback (primary fails → try fallback)

### Context Management

- Context window warnings (approaching limit)
- Auto-compact (prune old messages when over limit)
- Session fork (start fresh with summary)
- Context prioritization (keep important info)

### MCP Support

- Model Context Protocol integration
- Built-in MCPs (web search, docs search, code search)
- Custom MCP registration

### Keyboard Shortcuts

- Power-user efficiency (Cmd+K, Cmd+Enter, etc.)
- Quick agent switching
- Quick tool invocation

### Observability

- Token usage per session
- Cost attribution per task
- Real-time cost monitoring
- Budget limits (stop at threshold)

## Full Feature Inventory

**Complete feature list organized by category (200+ features from draft file):**

### Category A: Platform / Core Engine

**A1. LLM Provider Integration (14 features)**

- Multi-provider support (20+ providers)
- Dynamic model loading from models.dev
- Model variants with custom parameters
- Cost tracking (input/output/cache pricing)
- Capability detection (temperature, reasoning, attachments, tool calling, multimodal)
- Context window limits and output token constraints
- Model status tracking (alpha, beta, deprecated, active)
- Smart model selection for lightweight operations
- Provider authentication (API keys, OAuth, env vars)
- Custom OpenAI-compatible provider support
- Streaming text generation with tool calling
- Token counting and estimation
- Exponential backoff retry logic with Retry-After header support
- Provider-specific error types (auth, context overflow, output length, abort, model not found)

**A2. Session System (13 features)**

- Session creation with auto-generated IDs
- Session forking from existing sessions
- Session archival
- Parent-child session relationships
- Session persistence in SQLite
- Session metadata (title, directory, project, agent)
- Message history with parts (text, tool calls, snapshots, patches)
- Session compaction when context overflows
- Session revert (undo tool executions, restore conversation state)
- Session summary / auto-generated titles
- Session sharing (URLs with secret tokens)
- Session export/import
- Session status tracking (idle, running, etc.)

**A3. Tool System (7 features)**

- Tool definition framework (Zod schemas for args validation)
- Tool context (sessionID, messageID, agent, abort signal)
- Permission system for tool execution (allow/deny/ask per tool, wildcard patterns)
- Output truncation (line and byte limits)
- Custom tool loading from filesystem
- Plugin-based tool registration
- Batch tool execution

**A4. Built-in Tools (17 features)**

- bash — Command execution with timeout, working directory, tree-sitter parsing
- read — File reading with line offset/limit, directory listing
- write — File creation/overwriting
- edit — File editing with 9 replacement strategies
- multiedit — Multiple file edits in one call
- glob — File pattern matching with ignore patterns
- grep — Code search with regex and context lines (ripgrep)
- webfetch — HTTP requests with format conversion (markdown/text/HTML)
- websearch — Web search (Exa API)
- codesearch — Code search across GitHub
- question — Structured user prompts in TUI
- task — Task delegation to sub-agents
- todowrite/todoread — Todo list management
- skill — Custom skill loading/execution
- lsp — Language Server Protocol analysis
- apply_patch — Patch application (GPT models)
- plan_enter/plan_exit — Plan mode transitions

**A5. MCP Integration (5 features)**

- MCP server support (stdio and HTTP/SSE transports)
- MCP tool conversion to AI SDK format
- OAuth authentication for MCP servers
- Tool list change notifications
- MCP server configuration in config files

**A6. File System (4 features)**

- File change detection and watching
- Modification time tracking
- File lock management during edits
- Symlink detection

**A7. Terminal/Shell (4 features)**

- Bash/Zsh/Fish shell detection
- Command execution with timeout
- PTY support (interactive terminal sessions)
- Terminal resizing

**A8. Git/VCS Integration (3 features)**

- Git status, diff, commit detection, branch info
- GitHub PR creation
- Issue tracking integration

**A9. LSP Integration (4 features)**

- Language Server Protocol client
- Pyright, TypeScript/JavaScript, custom LSP servers
- Symbol lookup, document symbols, diagnostics
- Code navigation

**A10. Configuration System (5 features)**

- JSON/JSONC config files
- Hierarchical precedence (remote → global → custom → project → .opencode → inline → managed)
- Agent, provider, model, plugin, permission config sections
- Environment variable overrides
- Config directory scanning for tools, agents, commands, plugins

**A11. HTTP Server & API (4 features)**

- REST API endpoints (Hono framework)
- WebSocket support for real-time updates
- CORS handling, basic auth
- Agent Client Protocol (ACP) for IDE integration

**A12. Database & Storage (4 features)**

- SQLite with WAL mode
- Schema migrations
- Session, message, metadata tables
- Snapshot storage

**A13. Permission System (4 features)**

- Tool-level permissions (allow/deny/ask)
- Pattern-based rules with wildcards
- Session-scoped permissions
- Permission request UI

**A14. Event Bus (3 features)**

- Pub/sub event system
- Global and session-scoped events
- Type-safe event definitions

### Category B: Agent Orchestration

**B1. Multi-Agent System (9 features)**

- Config-driven agent definitions (not hardcoded)
- Agent modes: primary (user-facing), subagent (delegate-only), all (both)
- Agent model fallback chains (try primary → fallback 1 → fallback 2)
- Agent tool restrictions (per-agent permissions: read-only vs full access)
- Agent metadata for delegation (triggers, useWhen, avoidWhen, cost categories)
- Custom agent registration (YAML/TS config files, dynamically loaded)
- Agent disabling via config
- Agent configuration override (model, temperature, prompt, tools)
- Agent color coding for UI

**B2. Default Agents (11 features)**

- Primary Orchestrator (OMO: Sisyphus)
- Autonomous Deep Worker (OMO: Hephaestus)
- Work Plan Executor (OMO: Atlas)
- Strategic Planner (OMO: Prometheus)
- Architecture Consultant (OMO: Oracle)
- Documentation Researcher (OMO: Librarian)
- Codebase Explorer (OMO: Explore)
- Multimodal Analyzer (OMO: Multimodal Looker)
- Pre-Planning Analyst (OMO: Metis)
- Plan Validator (OMO: Momus)
- Category Executor (OMO: Sisyphus-Junior)

**B3. Task Delegation System (6 features)**

- task() tool — delegate to agents by name or category
- Background execution (fire-and-forget, async)
- Synchronous execution (wait for result)
- Session continuation (resume existing agent sessions)
- Category-based delegation (quick, visual-engineering, deep, ultrabrain, artistry, writing)
- Category-to-model mapping (cheap models for simple tasks, expensive for hard)

**B4. Background Task System (9 features)**

- Task lifecycle (pending → running → completed/error/cancelled/interrupt)
- Task queuing with concurrency control
- Concurrency limits (per-model, per-provider, default)
- Task progress tracking (tool calls, last tool, timestamps)
- Stale task detection and auto-cancellation
- Parent session notification on completion
- Background output retrieval
- Background task cancellation
- Slot handoff (next queued task gets freed slot)

**B5. Dynamic Prompt Composition (6 features)**

- Composable prompt sections (identity, tools, agents, skills, delegation, hard blocks)
- 10+ section builder functions for Sisyphus-style prompts
- Delegation table generation (domain → agent → trigger mapping)
- Tool selection guide (cost, when-to-use)
- Category + skill selection protocol
- Agent-specific prompt templates

**B6. Context Injection System (5 features)**

- Auto-inject AGENTS.md, README.md on file operations
- Rule file discovery (walk directory tree, match globs)
- Rule files with YAML frontmatter (glob patterns for matching)
- Session-scoped caching (avoid duplicate injections)
- Cache invalidation on session compact/delete

**B7. Keyword/Mode Detection (4 features)**

- Keyword scanning ([ultrawork], [analyze-mode], [boulder], [plan])
- Mode-specific instruction injection
- Model variant selection (max for ultrawork)
- Subagent session protection (don't inject modes into background tasks)

**B8. Workflow Engines (9 features)**

- Simple task → direct execution
- Complex task → parallel background research → implementation
- Precise multi-step → Plan (Prometheus) → Execute (Atlas → Junior)
- Autonomous deep work → Hephaestus
- Ralph Loop (iterative refinement until done)
- Boulder mode (continuous work until plan complete)
- Todo continuation enforcement (remind to complete todos)
- Start-work command (trigger Atlas from plan)
- Handoff command (context summary for new session)

**B9. Skill System (6 features)**

- Built-in skills (playwright, git-master, frontend-ui-ux, dev-browser)
- User-installed skills (project-local and global)
- YAML frontmatter format for skill definitions
- Skill-embedded MCP servers
- Skill loading via load_skills parameter in task()
- Skill content injection into agent prompts

**B10. Built-in MCP Integrations (4 features)**

- Web search (Exa/Tavily)
- Official documentation (Context7)
- GitHub code search (Grep.app)
- Claude Code compatible MCP config (.mcp.json with ${VAR} expansion)

### Category C: Loom Improvements Over OMO

**C1. Event-Driven Architecture (6 features)**

- Native event bus (not setInterval polling)
- Agent lifecycle events (started, running, delegating, completed, error)
- Tool execution events (before, after, error)
- Context window events (approaching limit, overflow, compaction)
- Task events (queued, started, progress, completed, cancelled)
- Session events (created, forked, compacted, deleted)

**C2. Enforced Tool Restrictions (4 features)**

- Tool enforcement at runtime (not advisory hints)
- Permission system with allow/deny/ask rules
- Agent-specific tool allowlists/denylists
- Fail-safe: tools not in allowlist are blocked, not just discouraged

**C3. Texere Integration (6 features)**

- Embedded @texere/graph library (direct import, no MCP overhead)
- Two-tier memory: short-term (ephemeral) + long-term (Texere KG)
- Auto-read from Texere on task start (relevant decisions, patterns, pitfalls)
- Auto-write decisions/findings to Texere (configurable: auto vs prompted)
- Search Texere before creating nodes (prevent duplicates)
- Cross-session knowledge persistence

**C4. Config-Driven Agents (4 features)**

- Agent definitions in pure TypeScript (not JSON/YAML)
- Dynamic agent loading at runtime (no rebuild required)
- Agent schema validation (Zod)
- Hot-reload on config change

**C5. Better UI/UX (6 features)**

- React web app on localhost (not TUI plugin)
- Agent visualization (which agent is active, delegation tree)
- Task progress display (real-time, not polling)
- Native notification system
- Agent switching with full context display
- Cost tracking dashboard (per-agent, per-session)

**C6. Conduit-AI Integration (4 features)**

- OAuth authentication (Anthropic, OpenAI)
- Token auto-refresh
- AI SDK compatibility (ConduitAuth spreads into createAnthropic/createOpenAI)
- LOOM MUST BUILD: Provider registry, model catalog, tool calling, structured output, retries

### Category D: Conduit-AI Provided

**D1. Authentication (5 features)**

- OAuth PKCE for Anthropic (console.anthropic.com)
- OAuth PKCE for OpenAI/Codex (auth.openai.com)
- Token persistence (~/.conduit/auth.json)
- Automatic token refresh via custom fetch wrapper
- Login/logout/hasCredentials API

**D2. AI SDK Compatibility (3 features)**

- ConduitAuth type matches Vercel AI SDK constructor signature
- Spreads directly into createAnthropic()/createOpenAI()
- Streaming and text generation work out of the box

**D3. Known Gaps in Conduit-AI (8 features)**

- Wrong Anthropic endpoint (console vs claude.ai)
- Missing scopes (user:profile, user:sessions:claude_code)
- No tool calling support
- No structured output
- No rate limiting/retries/fallbacks
- No model discovery
- No provider registry
- Plaintext credential storage (no encryption)

### Category E: Table-Stakes & Differentiators

**E1. Table-Stakes (13 features)**

- Multi-file editing (not just suggestions, actual edits)
- Codebase understanding / indexing (semantic + AST)
- Terminal integration (execute commands, view output)
- Git integration (auto-commits, branch management, PR creation)
- Streaming responses (real-time output)
- Multi-model support (GPT, Claude, Gemini, DeepSeek, etc.)
- Context window management (warnings at 60%, auto-compact at 75%)
- Undo/rollback (revert AI changes easily)
- Diff review before applying changes
- MCP support (Model Context Protocol)
- File tree navigation
- Search & replace (codebase-wide)
- Keyboard shortcuts (power-user efficiency)

**E2. Should-Have (6 features)**

- Background/async agent execution
- Session memory / persistent context across sessions
- Smart model routing (cost optimization)
- Plan-then-execute workflows
- Sub-agent delegation
- Workspace context (full codebase understanding)

**E3. Differentiators (5 features)**

- Multi-agent orchestration (Cursor: 8, Claude Code: 16, Loom: 7 MVP → 32+ post-MVP)
- Cost-aware routing with transparency (real-time cost tracking, budget alerts)
- Cross-session persistent memory (Texere KG as universal memory layer)
- Verification layer (auto-test, auto-lint, auto-verify before commit)
- Semantic codebase search (AST + semantic + git history fusion)

**E4. Anti-Patterns to Avoid (8 features)**

- Silent context exhaustion (proactive warnings)
- No cost visibility (real-time tracking, budget alerts)
- Session amnesia (auto-save summaries, cross-session recall)
- No rollback for destructive changes (git integration, checkpoint system)
- Slow startup times (background indexing, incremental updates)
- Token consumption without transparency (cost dashboard)
- Hallucinated code / invented APIs (source citations, web search)
- Merge conflicts from parallel agents (file locking, conflict detection, worktree isolation)

### Category F: Orchestration Architecture Patterns

**F1. Core Orchestration (14 features)**

- Sequential execution (A→B→C chain)
- Concurrent/parallel execution (multiple agents simultaneously)
- Handoff/delegation (dynamic agent-to-agent control transfer)
- Conditional routing (route tasks based on patterns/rules)
- Checkpointing (save state at every node transition)
- Resume from checkpoint (continue after crash/pause)
- Message passing between agents
- Shared context/memory accessible to all agents
- Event-driven architecture (messages, heartbeats, hooks, webhooks)
- Retry strategies (exponential backoff, max attempts)
- Timeout handling (per-agent/per-tool)
- Fallback patterns (graceful degradation)
- Circuit breakers (stop repeated failures)
- Human-in-the-loop (breakpoints, approval gates, state editing)

**F2. Observability (10 features)**

- OpenTelemetry integration (distributed tracing)
- Span hierarchy (conversation→agent→llm→tool)
- Agent turn tracking (who did what, when)
- LLM call logging (model, prompt, tokens, latency)
- Tool execution logs (inputs/outputs)
- Event audit trail (complete history)
- Token usage per agent
- Cost attribution per agent/task/session
- Real-time cost monitoring
- Budget limits (stop at threshold)

**F3. Memory Systems (6 features)**

- Observational memory (compress history into reflections)
- Async memory buffering (pre-compute in background)
- Long-term memory (persistent across sessions)
- Context overflow prevention (detect and handle)
- Context prioritization (keep important info)
- Context isolation (separate context per agent)

**F4. Planning & Reasoning (4 features)**

- Multi-step planning (decompose complex goals)
- Dynamic re-planning (adjust plan based on failures)
- Critic model (review changes before execution)
- Task decomposition (break tasks into subtasks)

**F5. Production Patterns (4 features)**

- Cursor pattern: Worktree-based isolation, each agent on separate branch
- Claude Code pattern: Task tool spawns isolated agents with 200K context each
- Devin pattern: Planner (high-reasoning) + Critic (pattern recognition)
- Three-layer persistence: Working State (volatile) + Event Memory (append-only) + Identity/Config
  (slow-changing)

**F6. Critical Success Factors (5 features)**

- Observability is non-negotiable
- Durable execution is standard (Temporal-style persistence)
- Context engineering > prompt engineering
- Error handling IS the system (happy path is demo; failure handling is production)
- Multi-agent beats single-agent (90% performance gain per Anthropic research)

---

**Total Features Documented:** 200+

**Document Line Count:** ~1,450 lines (within 1,500 line limit)

**Classification Breakdown:**

- Replicate: 32 features
- Improve: 9 features
- Skip: 15 features
- NEW: 8 features

**OMO Complexity Hotspots:** 5 components (BackgroundManager, Context Window Recovery, Boulder,
Ralph Loop, Claude Code Hooks)

**OMO Limitations:** 11 documented

**Table-Stakes 2026:** 13 features every competitor has

**Full Inventory:** 200+ features across 6 categories (A-F)
