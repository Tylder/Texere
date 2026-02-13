# Draft: Deep KG Integration into Oh-My-OpenCode

## Requirements (confirmed)

- NOT just adding KG as an MCP server — it's already that
- Deep integration: KG outputs injected into prompts/context automatically
- Agents should "just know" codebase structure without explicit tool calls
- Two separate efforts: fixtures overhaul (parked) and this integration

## Research Findings

### Oh-My-OpenCode Hook System

- **`experimental.chat.messages.transform`** — Rewrites entire message array before LLM. Used by AGENTS.md, README, rules injection.
- **`chat.message`** — Per-message hook with ContextCollector (priority-based dedup: critical → high → normal → low)
- **`experimental.chat.system.transform`** — Modifies system prompt sections directly.
- Existing patterns: `directoryReadmeInjector`, `rulesInjector`, `keywordDetector` all use ContextCollector

### ContextCollector Pattern

- `collector.register({ id, source, content, priority, metadata })`
- Auto-deduplicates by ID
- Sorts by priority
- Merges into single string
- Injected at right lifecycle point

### KG MCP Server (Current State)

- 8 tools exposed via MCP stdio
- SQLite-backed, auto-ingests on startup with file watching
- TypeScript only
- Search limited to 20 results, module deps depth 3
- No MCP Resources or Prompts exposed (only Tools)

## Technical Decisions

- **Strategy**: Hook in oh-my-opencode that talks to KG MCP server (Strategy A)
- **Where**: Hook lives in oh-my-opencode codebase, uses MCP client to query KG
- **Context selection**: LLM-driven — use a small/fast LLM call to analyze the user's message and determine what KG context is relevant, then inject that
- **Inference model**: Haiku/Flash class (fast & cheap) for context-selection
- **Placement**: Needs thorough OMO research — where does this give most value in the agent orchestration flow?
- **Development**: Standalone OpenCode plugin (`@texere/opencode-kg`), no fork of OMO needed
- **Runtime**: Plugin reads `.kg/knowledge-graph.db` directly (read-only). MCP server owns writes/ingestion.
- **Code org**: Monorepo — kg-mcp repo hosts both the MCP server and the OpenCode plugin as separate packages, sharing query/DB-read code
- **Retrieval strategy**: Hybrid — heuristics for file/symbol mentions, Haiku/Flash LLM for ambiguous messages
- (pending) Exact hook point in OMO lifecycle
- (pending) Fallback if KG server isn't running
- (pending) Which agents benefit most from auto-injected KG context?

## Critical Research Findings (Round 2)

### Plugin Architecture — External Plugin IS Possible

- OpenCode supports MULTIPLE plugins via `plugin: []` array in opencode.json
- `@opencode-ai/plugin` defines standard Plugin interface — any npm package can implement it
- Real precedent: `opencode-anthropic-auth` is a standalone plugin that coexists with oh-my-opencode
- **No fork needed.** KG can be a standalone `@texere/opencode-kg-plugin` npm package.

### Agent Dispatch Flow — Context Loss is the Key Problem

- When Sisyphus spawns sub-agents via `delegate-task`, sub-agents get:
  - ✅ User prompt (task description)
  - ✅ System prompt (skills + category config)
  - ❌ Parent's message history (NOT passed)
  - ❌ Parent's context injections (NOT inherited)
- This means sub-agents start from scratch regarding codebase knowledge
- KG context injection at the sub-agent level would be HIGH value

### Message Lifecycle — Where to Inject

1. `experimental.chat.messages.transform` → modify messages before LLM (used by AGENTS.md, README)
2. `chat.message` → per-message hook with ContextCollector
3. `tool.execute.before/after` → around tool calls (used by rulesInjector, readmeInjector)
4. `experimental.session.compacting` → re-inject during compaction (prevents knowledge loss)
5. `buildSystemContent()` → sub-agent prompt construction (delegate-task)

### Highest Impact Integration Points

1. **`experimental.chat.messages.transform`** — auto-inject conventions + relevant module info
2. **`experimental.session.compacting`** — re-inject KG context surviving compaction
3. **Sub-agent prompt builder** — give explore/librarian agents codebase structure knowledge
4. **`chat.message`** — heuristic + LLM hybrid to determine what KG context is relevant

## Confirmed Decisions

- Standalone OpenCode plugin (`@texere/opencode-kg`) — no OMO fork
- Plugin reads .kg/knowledge-graph.db directly (read-only), MCP server handles writes/ingestion
- Monorepo in kg-mcp repo: MCP server + OpenCode plugin as separate packages, shared query code
- Plugin registers its OWN tools (kg_search, kg_module_deps, etc.) — faster than MCP roundtrip
- MCP server remains for non-opencode clients (Cursor, Claude Desktop)
- Hybrid retrieval: heuristics for file/symbol mentions, Haiku/Flash for ambiguous messages
- Inference model: Haiku/Flash class (cheap, fast)

## OMO Research Findings (Round 3)

### Hooks DO Fire for Sub-Agents — But with a Timing Caveat

- All hooks (chat.message, tool.execute.before/after, event) fire for sub-agent sessions
- Sub-agent sessions are tracked in `subagentSessions` Set but NOT filtered from hooks
- **CRITICAL TIMING**: chat.message fires AFTER initial prompt is sent — cannot modify first message
- **IMPLICATION**: To inject KG context into the sub-agent's FIRST prompt, must inject via buildSystemContent() (system prompt construction), not via hooks

### Token Budget: 50% of Remaining, Max 50k

- Each injector uses `createDynamicTruncator()`
- Allocates: `min(remainingTokens * 0.5, 50000)` tokens
- If context exhausted: returns suppression message
- No centralized global budget — first-come-first-served
- Anthropic limit: 200k tokens (or 1M if extended)

### Agent Impact Tiers

- **TIER 1 (Highest ROI)**: Explore (eliminate search tool calls), Librarian (pre-load library APIs), Sisyphus/Hephaestus (skip exploration phase)
- **TIER 2**: Metis (better intent classification with conventions), Prometheus (module graph for planning), Atlas (verify against conventions)
- **TIER 3**: Oracle (module graph for architecture advice), Momus (file structure for reference validation)

### Existing Injector Patterns

- `directoryReadmeInjector`: Triggers on `tool.execute.after` for "read" tools. Walks directory tree UP from file being read. Full README content with dynamic truncation.
- `rulesInjector`: Triggers on `tool.execute.after` for read/write/edit/multiedit. Glob-based rule matching with distance scoring (closer rules = higher priority).
- `keywordDetector`: Triggers on `chat.message`. Regex pattern matching on user text. Directly modifies message parts (no ContextCollector).
- `compactionContextInjector`: Triggers on `session.compacted`. Injects structured template for what to preserve during compaction.
- `contextInjectorMessagesTransform`: `experimental.chat.messages.transform`. Consumes from ContextCollector, sorts by priority, inserts synthetic part before user text.

### Context Flow in Delegation

- Parent → Child: ONLY sessionID, messageID, agent, model passed
- NO message history, NO tool results, NO context injections transferred
- System prompt constructed from: skills + category prompt append. NO conventions, NO README, NO rules
- Sub-agents start from ZERO codebase knowledge

## OMO Research Findings (Round 4) — CONFIRMED ARCHITECTURE

### The Enrichment-at-Delegation Pattern (VALIDATED)

- `tool.execute.before` on the `task` tool fires BEFORE sub-agent session is created
- Can modify `output.args.prompt` — this becomes the sub-agent's initial message
- **OMO already uses this exact pattern**: line 44121 injects a system directive into task prompts
- This is the ONLY hook that fires before the sub-agent's initial prompt
- All other hooks (`chat.message`, `chat.params`, `messages.transform`) fire TOO LATE

### Hook Summary Table

| Hook                       | Fires for sub-agents? | Before initial prompt? | Can modify prompt? | Verdict                       |
| -------------------------- | --------------------- | ---------------------- | ------------------ | ----------------------------- |
| tool.execute.before (task) | YES                   | YES                    | YES                | **USE THIS**                  |
| chat.message               | YES                   | NO (after)             | NO                 | Not viable for initial prompt |
| chat.params                | NO                    | NO                     | NO                 | Not viable                    |
| messages.transform         | NO                    | NO                     | NO                 | Not viable                    |
| system.transform           | DOES NOT EXIST        | N/A                    | N/A                | N/A                           |

### Plugin Can Register tool.execute.before

- Plugin interface exposes `tool.execute.before` handler
- No OMO source modification needed
- Plugin intercepts task() calls, enriches prompt with KG context, sub-agent receives enriched prompt transparently

## Test Strategy (Confirmed: TDD)

### Testing Layers

1. **Extraction logic** (pure functions): prompt → extracted entities (symbols, modules, files)
2. **Query decision logic** (pure functions): entities → KG query plan
3. **KG query execution** (needs test DB): queries → results from pre-built .kg/knowledge-graph.db
4. **Context formatting** (pure functions): KG results → formatted injection string
5. **Hook integration** (mocked plugin interface): mock input/output → assert prompt modification

### Mock Strategy

- Research exact types from `@opencode-ai/plugin` package for tool.execute.before/after input/output shapes
- Build mocks from those precise types

### Test Database

- Hand-craft a separate minimal .kg/knowledge-graph.db for plugin tests
- Independent of the fixture overhaul effort
- Known symbols, modules, deps, conventions for deterministic assertions

## Open Questions (Remaining)

- How to handle KG server not running / DB not existing (graceful fallback)?
- What's the right content format for injected KG context?
- How to handle the main session (Sisyphus itself, not sub-agents)?

## Scope Boundaries

- INCLUDE: OpenCode plugin with context injection + direct tools, monorepo restructure, shared query layer
- EXCLUDE: Fixture overhaul (separate effort), MCP server changes (it stays as-is), new KG features
