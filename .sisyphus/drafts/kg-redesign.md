# Draft: KG Redesign — From Code Indexer to Knowledge Management System

## Core Problem Statement
As projects grow past a certain size, LLM coding agents lose the ability to understand them. Productivity dies. Agents forget crucial requirements, constraints, and decisions.

## Vision
KG should be the system that ensures agents **always have the right information available** — they never forget crucial requirements, EVER.

## Key Insight (from user)
- Code indexing is secondary — it's just for linking knowledge to code locations
- The PRIMARY value is capturing **requirements, ADRs, problems, issues, constraints, domain knowledge**
- Ingestion should be **conversational**, not just automated code parsing

## Ingestion Model (confirmed)
- **Ingestion Orchestrator Agent**: Specialized oh-my-opencode agent (not pure opencode)
  - Communicates with user
  - Delegates research into codebase
  - Delegates writing of data into KG
  - Asks intelligent, researched questions
  - Is the primary interface for interrogating and adding knowledge
- **Code ingest**: Secondary, mainly to allow KG to link requirements/ADRs/problems/issues to code symbols/files

## Open Questions
1. What specific knowledge types matter most? (requirements, ADRs, problems, issues, constraints, domain knowledge — which kills productivity most when forgotten?)
2. How is the orchestrator triggered? (dedicated session / inline "remember this" / both?)
3. How do coding agents consume KG at work time? (auto-inject / explicit query / both?)
4. Data model: What are the entities and relationships?
5. How does knowledge stay current? (versioning, deprecation, conflict resolution)

## Research Findings

### Current KG Architecture (what exists today)
- **Storage**: SQLite with WAL at `.kg/knowledge-graph.db`
- **7 tables**: modules, files, symbols, dependencies, sources, conventions, schema_version
- **8 MCP tools**: kg_search, kg_module_deps, kg_conventions, kg_discover_conventions, kg_library_api, kg_ingest_remote, kg_ingest_conventions, kg_ingest_git
- **Entities are 100% code-centric**: Module, File, Symbol, Dependency, Convention, Source
- **NO support for**: Requirements, ADRs, issues, problems, domain knowledge, or any human-authored knowledge entities
- **Ingestion is automated**: TS parser extracts symbols from code, file watcher for live updates, npm package types, git ref snapshots
- **Convention system**: Closest thing to "knowledge" — parses markdown docs and discovers code patterns, but limited to 5 categories (naming, imports, errors, testing, structure)
- **Connector pattern**: Pluggable language support (currently TypeScript only)

### Gap Analysis: Current vs Vision
The current system is a **code structure indexer**. The vision is a **knowledge management system**. The gap is massive:

| Aspect | Current | Vision |
|--------|---------|--------|
| Primary entity | Code symbols | Requirements, ADRs, constraints, domain knowledge |
| Ingestion | Automated code parsing | Conversational + code parsing |
| Knowledge source | Source code files | User's brain + code + docs |
| Agent interaction | Tool calls to query code | Auto-injected context + explicit queries |
| Code role | Primary content | Anchor for linking knowledge |
| Intelligence | Static analysis | Agent-driven research + user dialogue |

## Key Insights (from user)

### The Core Pain: Research Amnesia
- Agents do extensive research (30 findings from explore/librarian agents)
- Delegating agent reads them, but immediately forgets all but ~2
- Even those 2 are forgotten later in the session
- Decisions made based on that research? Gone completely
- **This is the #1 productivity killer** — not code navigation, not symbol lookup

### Focus Order
- User wants to focus on **INGESTION first** (how knowledge gets IN)
- Retrieval/consumption is secondary for now

### Knowledge Types That Matter Most (ranked by pain)
1. **Research findings** — the 30 results from explore/librarian that get forgotten
2. **Decisions** — choices made based on research, and their rationale
3. Requirements, constraints, ADRs — these flow from decisions

### Implication for Architecture
KG is not a code indexer. It's a **research & decision persistence layer**.
The conversational orchestrator agent is the primary interface.
Code symbols are just anchors for linking research/decisions to code locations.

### Ingestion Scenarios (all valid, B is V1 focus)
- **A: Post-Research Capture** — after a session, capture research + decisions into KG
- **B: Active Knowledge Building** (V1 FOCUS) — user switches to KG orchestrator agent, proactively interrogates and documents a domain area
- **C: During Work** — coding agent persists findings to KG inline

### Agent Switching (key architectural insight)
- opencode supports switching agents mid-chat
- oh-my-opencode extends this further with commands
- KG orchestrator is NOT a separate session/app — it's just another agent you switch to
- This means: work with coding agent → switch to KG orchestrator → capture knowledge → switch back
- The orchestrator lives in the same oh-my-opencode ecosystem with same MCP access

## Oh-My-OpenCode Architecture Findings (critical for design)

### Agent System
- Agents are factory functions returning `AgentConfig`
- Two modes: `"primary"` (Tab-cycleable, like build/plan) and `"subagent"` (callable via `task()`)
- Adding a new agent = 5 steps: create factory, register in builtin-agents.ts, add to schema, export, add overrides
- All agents share the same MCP servers — KG MCP tools are available to ALL agents

### Agent Switching
- **Tab/Shift+Tab** cycles through primary agents in TUI
- **`task(subagent_type="name")`** dispatches to subagents
- When switching agents, **FULL CONVERSATION HISTORY IS PRESERVED** — new agent sees everything
- Auto-switching exists: plan_enter/plan_exit tools trigger automatic agent switch

### Skills & Commands
- Skills = markdown files with YAML frontmatter, injected into agent prompts
- Skills can be loaded at agent level OR task level (`load_skills`)
- Slash commands can trigger agent delegation
- Commands come from config, MCP prompts, and skills

### MCP Integration
- MCP servers registered globally, available to ALL agents
- Tools discovered dynamically
- KG MCP is already registered and available

### Key Implication for KG Orchestrator
The KG orchestrator could be:
- **Option A**: A PRIMARY agent (Tab-cycleable) — user switches to it like build/plan
- **Option B**: A SUBAGENT (callable via `task()`) — invoked from other agents
- **Option C**: Both — primary for dedicated sessions, subagent for inline captures

Agent switching preserves full history — so switching to KG orchestrator mid-conversation means it can see what was discussed!

## Data Model Decision (from user)
- **Atomic small facts**, NOT full documents
- **As linked as possible** — true graph structure
- **Query-first** — reads vastly outnumber writes, optimize for retrieval
- Implication: property graph model (nodes + typed edges) not document store

### Knowledge Taxonomy (3 categories)
Three fundamentally different kinds of knowledge, each with different truth status and linking behavior:

| Category | Truth Status | Source | Links To | Staleness |
|----------|-------------|--------|----------|-----------|
| **1. Code/Implementation Facts** | Ground truth, verifiable | Auto-derived from code | Real symbols, files, modules as graph nodes | Stale when code changes |
| **2. Research** | External truth, imported | Explore/librarian agents, docs, repos | Code entities where relevant + other research | Stale over time |
| **3. Plans & Choices** | Normative (intentions, not facts) | Human decisions, agent reasoning | Code entities affected + research that informed them + requirements/problems they solve | Stale when superseded |

**Key architectural implication**: Code entities (symbols, files, modules) are **first-class graph nodes** that other knowledge links TO. They're not the primary purpose of the KG, but they're the **anchor points** that give research and decisions concrete locations in the codebase.

## Research: Existing Patterns for Graph-in-SQLite

### Pattern 1: nodes + relationships (memory-graph project)
```sql
nodes(id, label, properties JSON, created_at, updated_at)
relationships(id, from_id, to_id, rel_type, properties JSON, 
              valid_from, valid_until, recorded_at, invalidated_by)
```
- Properties as JSON blob = flexible schema
- Bi-temporal tracking (valid_from/until for when fact is true, recorded_at for when stored)
- FTS5 virtual table for full-text search on node content
- Indexes: label, from_id, to_id, rel_type, temporal fields

### Pattern 2: codegraph project (code-specific graph)
```sql
nodes(id, kind, name, qualified_name, file_path, language, start_line, end_line, ...)
edges(id, source, target, kind, metadata JSON, line, col, provenance)
files(path, content_hash, language, size, ...)
```
- Code-specific nodes with structured fields
- FTS5 with triggers to keep in sync
- Comprehensive indexes (name, kind, file_path, source+kind, target+kind)

### Pattern 3: OpenAI Cookbook temporal KG
```sql
entities(id, name, type, description, resolved_id)
triplets(id, event_id, subject_name, subject_id, predicate, object_name, object_id, value)
events(id, statement, statement_type, temporal_type, created_at, valid_at, expired_at)
```
- Triple-store approach (subject-predicate-object)
- Temporal events with validity windows
- Entity resolution (resolved_id for deduplication)

### Pattern 4: MemOS (memories + edges)
```sql
memories(id, memory TEXT, properties JSONB, embedding vector, user_name, created_at, updated_at)
edges(id, source_id, target_id, edge_type, created_at, UNIQUE(source_id, target_id, edge_type))
```
- Simplest viable graph: nodes + typed edges
- Embeddings for semantic search

### Key Insights from Research
1. **Property graph > triple store for our case**: Triple stores are verbose and harder to query in SQL. Property graphs with JSON properties give us flexibility + queryability.
2. **FTS5 is essential**: Full-text search on fact content is a must for "find facts about auth"
3. **Bi-temporal tracking is smart**: Know when a fact was true vs when it was recorded. Important for "this decision was superseded by..."
4. **JSON properties give schema flexibility**: Different fact types need different fields. JSON properties avoid schema explosion.

## Potential Pivot: Use memory-graph as Storage Layer

**User insight**: Instead of building the graph storage layer from scratch, use the existing `memory-graph/memory-graph` project (MIT license) as the storage backend. 

**What this would mean**:
- KG-MCP becomes a thin layer: orchestrator agent + MCP tools + memory-graph storage
- We don't build: SQLite schema, graph traversal, FTS, node/edge CRUD
- We DO build: MCP tools, code-anchoring layer, orchestrator agent, skill files
- memory-graph already has: nodes, relationships, bi-temporal tracking, FTS5, SQLite backend

### memory-graph Deep Dive Results

**Language**: Python 3.10+ (NOT TypeScript — our kg-mcp is TypeScript)
**Status**: Production-ready v0.12.4, 1,200+ tests, 198 commits, active dev
**License**: MIT
**Architecture**: MCP server + importable library (dual mode)

**What it HAS (matches our needs):**
- ✅ 21 MCP tools already registered
- ✅ SQLite backend with zero-config (+ 7 other backend options)
- ✅ 35 relationship types across 7 semantic categories
- ✅ Bi-temporal tracking (valid_from/until, recorded_at, invalidated_by)
- ✅ Rich node model: type, title, content, summary, tags, importance, confidence, context
- ✅ 13 memory types (task, problem, solution, code_pattern, etc.)
- ✅ Multi-hop graph traversal via NetworkX
- ✅ Tag-based filtering, type filtering, importance filtering
- ✅ Cluster detection, path finding, bridge memory detection
- ✅ MemoryContext with: project_path, files_involved, languages, frameworks, git info, session_id
- ✅ Multi-tenancy support (Phase 1)
- ✅ Fuzzy search with typo tolerance, plural/tense handling
- ✅ Contextual search (graph-scoped semantic search)

**What it's MISSING (gaps for our use case):**
- ❌ No FTS5 — uses LIKE queries (perf issue at scale)
- ❌ No code entity linking — can't link facts to specific symbols/functions
- ❌ No code path PREFIX queries — only exact project_path match
- ❌ No "decision/constraint/requirement" fact types (has 13 types but different ones)
- ❌ Python, not TypeScript — can't import into kg-mcp directly

### Integration Options

**Option 1: Run memory-graph as separate MCP server alongside kg-mcp**
```
Agent → kg-mcp (TypeScript) → code search, symbol lookup
Agent → memory-graph (Python) → knowledge storage, relationships
```
- Simplest, no code changes to either
- Agent calls both servers
- Code linking done via MemoryContext.additional_metadata

**Option 2: Python wrapper MCP server on top of memory-graph**
```
Agent → kg-wrapper (Python) → wraps memory-graph + adds code-linking
Agent → kg-mcp (TypeScript) → code search only
```
- Adds code-linking tools, prefix queries, FTS
- ~2-3 days to build

**Option 3: Rewrite kg-mcp to USE memory-graph as storage**
```
Agent → kg-mcp-v2 (Python) → uses memory-graph lib + code indexer
```
- Complete rewrite, single server
- Most integrated but biggest effort

## CONFIRMED DECISIONS

### 1. Project Identity
- **Name**: Texere (Latin for "to weave" — weaving knowledge together)
- **NOT an MCP server** — it's the opencode/omo wrapper around memory-graph
- **This repo** (kg-mcp) gets renamed to Texere, TypeScript code gutted

### 2. Architecture
- **Storage**: memory-graph (Python MCP server, run as dependency)
- **Code indexing**: Lightweight — code entities (symbols, files, modules) exist as linkable graph nodes, but deep analysis deferred to LSP. Purpose: anchor points for knowledge, not a code intelligence tool.
- **Orchestrator agent**: Lives in Texere, registered as oh-my-opencode primary agent
- **memory-graph extensions**: FTS5 + code path prefix queries (PR or fork)

### 3. What Texere Contains
- Orchestrator agent factory + system prompt (TypeScript, oh-my-opencode pattern)
- Skill files teaching agents how to use KG
- memory-graph config/setup
- Documentation

### 4. memory-graph Extension Details (from research)
**FTS5**: Table stub exists but is UNUSED. Need:
- Redesign FTS5 virtual table (add tags field)
- Add INSERT/UPDATE/DELETE triggers for sync
- Route search through FTS5 MATCH when available, fallback to LIKE
- Key files: sqlite_fallback.py (schema), sqlite_database.py (queries)

**Code Path Prefix**: Currently exact match only. Need:
- Change `context_project_path = ?` to `LIKE ?` with wildcard
- Add `files_involved` filtering via json_each()
- Add SearchQuery parameters: project_path_prefix, file_path_prefix
- Add expression indexes on json_extract paths

### 5. Orchestrator Agent Design
- **Mode**: Primary agent (Tab-cycleable)
- **Pattern**: Same as Sisyphus/Hephaestus — factory function + dynamic prompt
- **Delegation**: Can fire explore/librarian for codebase research
- **MCP access**: Uses memory-graph tools for knowledge storage
- **System prompt**: Interview-focused — research first, ask intelligent questions, capture small atomic facts

## REWRITE ANALYSIS: memory-graph Python → TypeScript

### The Numbers
- **Total memory-graph**: 22,013 lines Python across 65 files
- **Essential core**: ~5,123 lines across 8 files
- **Would drop**: 17K lines (77%) — multi-backend, multi-tenant, migration, analytics, NetworkX, intelligence, proactive, integration

### What the Essential Core Actually Is
| Component | Python Lines | TS Estimate | Notes |
|-----------|-------------|-------------|-------|
| Models (Memory, Relationship, SearchQuery) | 699 | ~200 | Drop multi-tenant fields, use TS interfaces |
| SQLite Database (33 SQL queries) | 1,861 | ~600 | Drop fuzzy matching (FTS5 replaces), drop pagination, simplify |
| SQLite Backend (schema + connection) | 480 | ~150 | Drop NetworkX, just better-sqlite3 + schema |
| Relationships (types + management) | 668 | ~150 | Mostly enum definitions + validation |
| MCP Server (tool registration) | 721 | ~150 | Already have this pattern in current kg-mcp |
| Tool Handlers (CRUD + search + relationships) | 694 | ~300 | Simpler without fuzzy matching, pagination |
| **TOTAL** | **5,123** | **~1,550** | **~70% reduction** |

### Key Simplifications in TS Rewrite
1. **No NetworkX**: Graph traversal done in SQL with CTEs (NetworkX is only used for init + counts anyway)
2. **No fuzzy matching engine**: FTS5 handles search from day one
3. **No multi-backend**: SQLite only via better-sqlite3 (already a dependency)
4. **No multi-tenancy**: Single user, single project
5. **No migration tools**: Fresh schema, no legacy
6. **No advanced analytics**: No cluster detection, bridge finding, graph metrics

### What We Get with TS Rewrite
- **Single language**: Entire Texere project in TypeScript
- **Simpler architecture**: No Python subprocess, no separate MCP server
- **Query-first from day 1**: FTS5, CTEs for graph traversal, prefix queries — all built in
- **Reuse current infra**: better-sqlite3, @modelcontextprotocol/sdk, zod, vitest — all already in package.json
- **Smaller, faster**: ~1,550 lines vs 5,123 lines (or 22K total)

### Effort Estimate
- SQL queries: 33 patterns → 2-3 days
- Models/types: 4 models + enums → 0.5 day
- Tool handlers: ~12 handlers → 2 days
- MCP server: Already exists, adapt → 0.5 day
- FTS5 + prefix queries: Built in from start → 1 day
- Tests: 2-3 days
- **Total: ~8-10 days** (vs 2-3 days to wrap Python memory-graph)

### Verdict
The rewrite is ~3x more effort than wrapping Python, BUT:
- No Python dependency management
- No two-language project
- Query-first design from scratch
- Can be done incrementally (schema first, then CRUD, then search, then relationships)
- Current kg-mcp already has: better-sqlite3, MCP SDK, zod, vitest, build pipeline
- **The rewrite is ~1,550 lines of TypeScript. That's a SMALL project.**

## Data Model (DECIDED)

### Node Types (17 total — 13 from memory-graph + 4 new)

**Original 13 (from memory-graph):**

| Type | Purpose | Example |
|------|---------|---------|
| `task` | Work items, things to do | "Migrate auth module to JWT" |
| `code_pattern` | Recurring code conventions, idioms | "All services use factory function pattern" |
| `problem` | Known issues, pain points, bugs | "Session sharing breaks across microservices" |
| `solution` | Proven answers to problems | "Use JWT with shared secret for cross-service auth" |
| `project` | Project-level metadata, overview | "Texere — knowledge graph for AI agents" |
| `technology` | Tech stack, libraries, frameworks | "better-sqlite3 v11 with WAL mode" |
| `error` | Specific error messages, conditions | "SQLITE_BUSY when concurrent writes exceed WAL capacity" |
| `fix` | Specific fixes for specific errors | "Set journal_mode=WAL and busy_timeout=5000" |
| `command` | CLI commands, scripts, invocations | "bun test --reporter verbose" |
| `file_context` | Context about specific files/modules | "auth.ts handles JWT creation and validation" |
| `workflow` | Processes, sequences of steps | "Deploy flow: test → build → push → tag" |
| `general` | Catch-all for uncategorized knowledge | Any fact that doesn't fit other types |
| `conversation` | Captured conversation excerpts | "User said: never use cloud APIs" |

**New 4 (Texere-specific):**

| Type | Purpose | Example | Why not `general` |
|------|---------|---------|-------------------|
| `decision` | Choices made + rationale + alternatives considered | "Chose JWT over sessions because of microservice boundary requirements. Considered: sessions with Redis, OAuth tokens." | Decisions are *normative* (intentions). They have rationale, alternatives, and can be superseded. Agents must know WHY, not just WHAT. |
| `requirement` | Things that MUST be true — non-negotiable specs | "System must support SSO via SAML 2.0" | Prescriptive and non-negotiable. Agents must treat these as hard constraints during implementation. |
| `constraint` | Things that MUST NOT happen — restrictions, boundaries | "Cannot use cloud APIs — must be fully local-first" | Restrictive. Different from requirements (what TO do vs what NOT to do). Forgetting a constraint causes the most expensive mistakes. |
| `research` | Imported external findings with a shelf life | "sqlite-vec has 6,891 stars, works with better-sqlite3, Mozilla Builders project" | External truth that may go stale. Distinct from decisions made based on it. Needs to be traceable back to source. |

### Edge Types (14 total — derived from questions, not taxonomy)

#### Design Rationale

memory-graph has 35 relationship types in a symmetric 5×7 grid. Analysis of their source code revealed:
- `suggest_relationship_type()` only meaningfully maps ~10 types; everything else falls to RELATED_TO
- Contradiction detection only checks 5 pairs — most types aren't distinct enough to contradict
- Many types have identical default_strength/confidence (e.g. TRIGGERS vs LEADS_TO: both 0.7/0.7)
- The 35 types were designed for taxonomic completeness, not for LLM discriminability

**Texere's principle**: Since LLMs choose the types, every type must be **unambiguously distinct**. If an LLM would hesitate between two types, they should be merged. We derived edge types from **questions the graph must answer**, not from categories.

#### The 14 Edge Types

Each edge exists because a specific question requires it.

**RELATED_TO** — General association (catch-all, bidirectional)
> Question: "What's connected to this?" / "What else is relevant?"
> Use when: No specific relationship fits. Two things are associated but you can't say how.
> Examples: research ↔ research on same topic, technology ↔ technology in same stack
> Merges from memory-graph: RELATED_TO, SIMILAR_TO, VARIANT_OF, ANALOGY_TO, WORKS_WITH, OCCURS_IN, APPLIES_TO, USED_IN

**CAUSES** — X leads to / produces / triggers Y (directional)
> Question: "What caused this?" / "What does this lead to?"
> Use when: There is a cause-and-effect chain. A happened, therefore B happened.
> Examples: problem → error, misconfiguration → crash, tech debt → bug
> Merges from memory-graph: CAUSES, TRIGGERS, LEADS_TO, BREAKS

**SOLVES** — X resolves / fixes Y (directional)
> Question: "What solves this problem?" / "What does this solution fix?"
> Use when: One thing is a direct answer to another. The problem goes away because of the solution.
> Examples: solution → problem, fix → error, decision → problem
> Merges from memory-graph: SOLVES, ADDRESSES

**REQUIRES** — X depends on / needs Y (directional)
> Question: "What does this depend on?" / "What would break if this disappeared?"
> Use when: X cannot exist or function without Y. Removing Y breaks X.
> Examples: task → task, requirement → requirement, technology → technology, feature → technology
> Merges from memory-graph: REQUIRES, DEPENDS_ON

**CONTRADICTS** — X conflicts with Y (bidirectional)
> Question: "Does anything contradict this?" / "Are there conflicting facts?"
> Use when: Two pieces of knowledge cannot both be true. One invalidates the other.
> Examples: research ↔ research (conflicting findings), decision ↔ constraint (decision violates constraint)
> Merges from memory-graph: CONTRADICTS, OPPOSITE_OF

**BUILDS_ON** — X extends / elaborates Y (directional)
> Question: "What is this based on?" / "What builds on this foundation?"
> Use when: X takes Y as a starting point and adds to it. Y is a prerequisite understanding.
> Examples: research → earlier research, solution → existing solution, code_pattern → code_pattern
> Merges from memory-graph: BUILDS_ON, GENERALIZES, SPECIALIZES

**SUPERSEDES** — X replaces Y (directional, temporal)
> Question: "Is this still current?" / "Has this been replaced?"
> Use when: A newer version replaces an older one. The old one is now outdated.
> Examples: new decision → old decision, updated requirement → old requirement, fix → older fix
> Merges from memory-graph: REPLACES, IMPROVES, DEPRECATED_BY

**PREVENTS** — X stops Y from happening (directional)
> Question: "What prevents this problem?" / "Why doesn't this issue occur?"
> Use when: X is the reason Y doesn't happen. If you remove X, Y would occur.
> Examples: constraint → problem, solution → error, fix → regression
> Merges from memory-graph: PREVENTS

**VALIDATES** — X confirms / proves Y is correct (directional)
> Question: "What evidence supports this?" / "How do we know this works?"
> Use when: X is evidence that Y is true or effective. X provides confidence in Y.
> Examples: test → solution, research → decision, fix → solution
> Merges from memory-graph: VALIDATED_BY, CONFIRMS

**ALTERNATIVE_TO** — X is an option alongside Y (bidirectional)
> Question: "What alternatives were considered?" / "What else could we have done?"
> Use when: X and Y are both valid approaches to the same problem. A choice was made between them.
> Examples: decision ↔ decision (JWT vs sessions), technology ↔ technology (Postgres vs SQLite)
> Merges from memory-graph: ALTERNATIVE_TO

**MOTIVATED_BY** — X was driven by / decided because of Y (directional)
> Question: "Why was this decision made?" / "What motivated this?"
> Use when: Y is the reason X exists. Y provides the rationale, evidence, or pain that led to X.
> Examples: decision → research, decision → problem, requirement → problem, constraint → research
> NEW — not in memory-graph (closest was no direct equivalent)

**IMPLEMENTS** — X fulfills / realizes Y (directional)
> Question: "What code implements this requirement?" / "What requirement does this file fulfill?"
> Use when: X is the concrete realization of abstract Y. Y said "do this", X is the code that does it.
> Examples: file_context → requirement, file_context → decision, code_pattern → decision
> NEW — not in memory-graph

**CONSTRAINS** — X restricts / limits Y (directional)
> Question: "What constraints apply to this?" / "What does this constraint affect?"
> Use when: X imposes a limitation on Y. Y must operate within the boundaries set by X.
> Examples: constraint → project, constraint → technology, constraint → decision, requirement → technology
> NEW — not in memory-graph

**ANCHORED_TO** — X is linked to code location Y (directional)
> Question: "What do I need to know about this file?" / "Where in the code is this relevant?"
> Use when: X is any knowledge (decision, requirement, problem, etc.) that is relevant to code location Y.
> Examples: decision → file_context, requirement → file_context, problem → file_context, research → file_context
> NEW — not in memory-graph. This is the code-anchoring mechanism that enables future push.

#### What Was Dropped from memory-graph's 35 (and why)

**Dropped — too subtle for LLMs to distinguish from neighbors:**
- TRIGGERS, LEADS_TO → merged into CAUSES (LLMs can't reliably distinguish "causes" vs "triggers" vs "leads to")
- ADDRESSES → merged into SOLVES (partial solve vs full solve is a distinction LLMs inconsistently make)
- IMPROVES → merged into SUPERSEDES (if it improves, the old version is superseded)
- ENABLES → merged into REQUIRES (inverse of REQUIRES — if A enables B, then B requires A)
- FOLLOWS → merged into REQUIRES (if A follows B in sequence, A depends on B completing)
- VARIANT_OF, ANALOGY_TO → merged into RELATED_TO (too subtle)
- SIMILAR_TO → merged into RELATED_TO (similarity is a form of relatedness)
- CONFIRMS → merged into VALIDATES (confirming is validating)
- GENERALIZES, SPECIALIZES → merged into BUILDS_ON (generalization and specialization are both forms of building on knowledge)
- BREAKS → merged into CAUSES (breaking is causing a failure)

**Dropped — subjective quality judgments better expressed in node content:**
- EFFECTIVE_FOR, INEFFECTIVE_FOR → Put effectiveness judgment in the node's content, not in the edge type
- PREFERRED_OVER → Express preference in a decision node with rationale, not as an edge type

**Dropped — vague context edges replaced by specific edges:**
- OCCURS_IN, APPLIES_TO, WORKS_WITH, USED_IN → replaced by RELATED_TO (catch-all) or ANCHORED_TO (code-specific)
- PARALLEL_TO → express parallelism in workflow/task node content
- BLOCKS → express blocking in task/problem node content (or use PREVENTS for causal blocking)

#### Edge Properties (per edge)

Every edge carries these properties (from memory-graph, simplified):
- `strength` (0.0-1.0): How strong is this relationship? Default varies by type.
- `confidence` (0.0-1.0): How sure are we this relationship exists? Default 0.8.
- `context` (string, optional): Human-readable description of why this edge exists.
- `valid_from` (datetime): When this relationship became true (bi-temporal).
- `valid_until` (datetime, optional): When this relationship stopped being true. Null = still valid.
- `recorded_at` (datetime): When we learned about this relationship (transaction time).
- `invalidated_by` (string, optional): ID of edge that superseded this one.

#### Edge Metadata (per type)

| Edge | Directional | Bidirectional | Default Strength | Inverse |
|------|:-----------:|:-------------:|:----------------:|---------|
| RELATED_TO | | ✅ | 0.5 | self |
| CAUSES | ✅ | | 0.8 | — |
| SOLVES | ✅ | | 0.9 | — |
| REQUIRES | ✅ | | 0.8 | — |
| CONTRADICTS | | ✅ | 0.8 | self |
| BUILDS_ON | ✅ | | 0.7 | — |
| SUPERSEDES | ✅ | | 0.8 | — |
| PREVENTS | ✅ | | 0.7 | — |
| VALIDATES | ✅ | | 0.8 | — |
| ALTERNATIVE_TO | | ✅ | 0.6 | self |
| MOTIVATED_BY | ✅ | | 0.7 | — |
| IMPLEMENTS | ✅ | | 0.8 | — |
| CONSTRAINS | ✅ | | 0.7 | — |
| ANCHORED_TO | ✅ | | 0.6 | — |

#### Per-Node-Type Edge Guide (what edges does each node type typically have?)

**decision**:
- MOTIVATED_BY → research, problem, constraint ("why this decision was made")
- SUPERSEDES → decision ("replaces older decision")
- ALTERNATIVE_TO ↔ decision ("other options considered")
- SOLVES → problem ("this decision resolves this problem")
- ANCHORED_TO → file_context ("this decision affects this code")
- IMPLEMENTS ← file_context ("this code realizes this decision")
- CONSTRAINS ← constraint ("this decision was limited by this constraint")

**requirement**:
- IMPLEMENTS ← file_context ("this code fulfills this requirement")
- REQUIRES → requirement ("this requirement depends on that one")
- SUPERSEDES → requirement ("this replaces an older requirement")
- MOTIVATED_BY → problem, research ("why this requirement exists")
- ANCHORED_TO → file_context ("this requirement applies to this code")
- CONSTRAINS ← constraint ("this requirement is bounded by this constraint")

**constraint**:
- CONSTRAINS → decision, project, technology, file_context ("this restricts that")
- MOTIVATED_BY → problem, research ("why this constraint exists")
- PREVENTS → problem, error ("this constraint prevents this issue")
- CONTRADICTS ↔ decision ("this constraint conflicts with that decision")

**research**:
- BUILDS_ON → research ("this extends earlier findings")
- MOTIVATED_BY ← decision ("this research motivated that decision")
- VALIDATES → decision, solution ("this research confirms that works")
- CONTRADICTS ↔ research ("this conflicts with that finding")
- ANCHORED_TO → file_context ("this research is about this code")
- RELATED_TO ↔ technology ("this research covers this technology")

**problem**:
- SOLVES ← solution, fix, decision ("what resolves this")
- CAUSES → error ("this problem produces this error")
- MOTIVATED_BY ← decision, requirement ("this problem motivated that decision")
- PREVENTS ← constraint, solution ("what stops this from happening")
- ANCHORED_TO → file_context ("this problem exists in this code")
- REQUIRES → technology ("this problem exists in context of this tech")

**solution**:
- SOLVES → problem ("what this solution fixes")
- BUILDS_ON → solution ("improves on earlier solution")
- SUPERSEDES → solution ("replaces older solution")
- VALIDATES ← research ("research confirms this works")
- ANCHORED_TO → file_context ("where this solution is implemented")

**error**:
- SOLVES ← fix ("what fixes this error")
- CAUSES ← problem ("what produces this error")
- ANCHORED_TO → file_context ("where this error occurs")

**fix**:
- SOLVES → error ("what error this fixes")
- SUPERSEDES → fix ("replaces older fix")
- ANCHORED_TO → file_context ("where this fix is applied")

**file_context**:
- ANCHORED_TO ← any ("knowledge linked to this file/module")
- IMPLEMENTS → requirement, decision ("this code fulfills that")
- REQUIRES → technology ("this file depends on this technology")
- RELATED_TO ↔ file_context ("these files are related")

**technology**:
- REQUIRES → technology ("this tech depends on that tech")
- ALTERNATIVE_TO ↔ technology ("these are alternatives")
- RELATED_TO ↔ technology ("these techs are in the same stack")
- CONSTRAINS ← constraint ("this tech is constrained by that")

**code_pattern**:
- BUILDS_ON → code_pattern ("this pattern extends that one")
- ANCHORED_TO → file_context ("this pattern is used in this file")
- RELATED_TO ↔ technology ("this pattern applies to this tech")

**task**:
- REQUIRES → task ("this task depends on that task")
- SOLVES → problem ("this task addresses this problem")
- IMPLEMENTS → requirement ("this task fulfills this requirement")
- ANCHORED_TO → file_context ("this task involves this file")

**project**:
- CONSTRAINS ← constraint ("this project is constrained by that")
- REQUIRES → technology ("this project uses this tech")
- RELATED_TO ↔ project ("related projects")

**workflow**:
- REQUIRES → task ("this workflow depends on this task")
- RELATED_TO ↔ workflow ("related workflows")

**general**:
- RELATED_TO ↔ any ("general knowledge linked to anything")

**conversation**:
- RELATED_TO ↔ any ("conversation excerpt linked to relevant nodes")
- MOTIVATED_BY ← decision ("this conversation led to that decision")

**command**:
- RELATED_TO ↔ technology, workflow ("command related to tech/workflow")
- SOLVES → problem ("this command fixes this problem")
- ANCHORED_TO → file_context ("this command operates on this file")

---

### LLM Agent Quick Reference Guide

> **This section is designed to be included in agent system prompts / skill files.**
> It tells the LLM agent exactly how to choose the right node type and edge type.

#### Choosing a Node Type — Ask yourself:

```
Is this about code structure/conventions?
  → code_pattern (if pattern/idiom) or file_context (if about a specific file) or technology (if about a library/framework)

Is this something that MUST be done or MUST be true?
  → requirement

Is this something that MUST NOT happen?
  → constraint

Is this a choice that was made, with reasons?
  → decision

Is this something we learned from research/docs/external sources?
  → research

Is this something broken or wrong?
  → problem (if conceptual issue) or error (if specific error message/condition)

Is this a fix or answer to something broken?
  → solution (if conceptual answer) or fix (if specific fix for specific error)

Is this a work item?
  → task

Is this a process or sequence?
  → workflow

Is this a CLI command or script invocation?
  → command

Is this a direct quote or excerpt from a conversation?
  → conversation

None of the above?
  → general
```

#### Choosing an Edge Type — Ask yourself:

```
Am I linking knowledge to a code file/module?
  → ANCHORED_TO (knowledge → file_context)

Does code fulfill/realize a requirement or decision?
  → IMPLEMENTS (file_context → requirement/decision)

Does one thing restrict/limit another?
  → CONSTRAINS (constraint → what it restricts)

Was something decided BECAUSE OF something else?
  → MOTIVATED_BY (decision → what motivated it)

Does one thing directly fix/resolve another?
  → SOLVES (solution/fix → problem/error)

Does X need Y to work?
  → REQUIRES (dependent → dependency)

Does one thing replace an older version?
  → SUPERSEDES (new → old)

Were multiple options considered for the same problem?
  → ALTERNATIVE_TO (option ↔ option)

Does one thing extend or build upon another?
  → BUILDS_ON (newer → foundation)

Do two things conflict/contradict each other?
  → CONTRADICTS (fact ↔ fact)

Does one thing prove/confirm another is correct?
  → VALIDATES (evidence → claim)

Does one thing cause/produce another?
  → CAUSES (cause → effect)

Does one thing stop another from happening?
  → PREVENTS (preventor → what it prevents)

None of the above? Just related somehow?
  → RELATED_TO (anything ↔ anything)
```

#### Common Patterns (copy-paste examples)

```
Storing a decision with full context:
  1. Create node: type=decision, "Chose JWT over sessions"
  2. Create node: type=research, "JWT supports stateless microservices"
  3. Create node: type=problem, "Sessions don't share across services"
  4. Edge: decision --MOTIVATED_BY--> research
  5. Edge: decision --MOTIVATED_BY--> problem  
  6. Edge: decision --SOLVES--> problem
  7. Edge: decision --ANCHORED_TO--> file_context("auth.ts")

Recording a constraint and its effects:
  1. Create node: type=constraint, "No cloud API dependencies"
  2. Edge: constraint --CONSTRAINS--> project
  3. Edge: constraint --CONSTRAINS--> decision("embedding model choice")
  4. Edge: constraint --PREVENTS--> problem("API key leakage")

Capturing research that informs a choice:
  1. Create node: type=research, "sqlite-vec works with better-sqlite3"
  2. Create node: type=research, "Transformers.js runs locally"
  3. Create node: type=decision, "Use sqlite-vec + Transformers.js for embeddings"
  4. Edge: decision --MOTIVATED_BY--> research(sqlite-vec)
  5. Edge: decision --MOTIVATED_BY--> research(transformers.js)
  6. Edge: research(sqlite-vec) --VALIDATES--> decision

Replacing an old decision:
  1. Create node: type=decision, "Switch from REST to GraphQL"
  2. Edge: new_decision --SUPERSEDES--> old_decision("Use REST API")
  3. Edge: new_decision --MOTIVATED_BY--> research("GraphQL reduces over-fetching")
```

### Temporal Model (DECIDED)

#### Design Decisions

**Q1: Bi-temporal on nodes? → NO**

Nodes are "eternal" — they represent the fact that something existed. A decision node "We chose JWT" is a historical truth forever. What changes is its relationships and status, not its existence.

Sources:
- **Neo4j temporal graphs**: Temporal properties on relationships, nodes remain "eternal". "Everyday queries (fetching the 'current' graph) must remain simple. Temporal properties are added to relationships, not nodes." (DEV Community, Neo4j temporal versioning)
- **Wikidata/RDF**: Statement-level temporal qualifiers. "Wikidata's revision history encodes changes as sets of deletions and additions of RDF triples. Entities persist; their statements evolve." (Wikidated research paper)
- **Temporal KG survey**: "Time-aware knowledge graphs distinguish between entity existence (ontological time) and fact validity (epistemological time). Most production systems track the latter." (Generalized Framework for Time-Aware KGs)
- **Oracle consultation**: "Node 'invalidity' is usually a new fact ('we changed our mind'), best modeled as new nodes + SUPERSEDES, preserving audit history without extra temporal columns everywhere."

**How "decision is no longer current" works:**
1. Create NEW decision node: "We switched to sessions"
2. Link: new_decision --SUPERSEDES--> old_decision
3. Old node stays forever as historical record
4. Query "current decisions" = decisions with no incoming SUPERSEDES edge

**Node additions (lightweight):**
- `archived_at` (optional) — UI/filter convenience, not truth semantics
- NO `valid_from`/`valid_until` on nodes

**Q2: Point-in-time reconstruction? → YES, transaction-time in V1**

Two kinds of temporal:
- **Transaction-time** (`recorded_at`/`invalidated_at`): "What was in the graph at time T?" — what the agent could have known
- **Valid-time** (`valid_from`/`valid_until`): "What was true in the world at time T?" — when the fact was actually true

V1 builds transaction-time. It answers the most useful debugging question: "What did the agent know when it made that bad decision?"

Default `valid_from = recorded_at` in V1. Callers can override later when they care about backdating ("this decision was actually made last Tuesday but we're recording it today").

Sources:
- **Oracle consultation**: "Point-in-time is most valuable for agents as transaction-time (what it could have known), and it's cheap/robust if you centralize the predicate."
- **"Poor Man's Bitemporal Data System in SQLite and Clojure"**: Full bi-temporal in SQLite with tx_time/tx_end + valid_from/valid_until pattern
- **EventSourcingDB blog (Feb 2026)**: "Soft Delete Is a Workaround" — soft-delete 20-40% slower queries due to WHERE deleted_at IS NULL; recommend hard-delete + event log for <10K nodes
- **Mathias Verraes "Multi-temporal Events" (2022)**: "Within a Domain Event, use separate timestamps for when the event occurred vs when it was captured."

#### Schema Design

**Nodes (no bi-temporal):**
```sql
CREATE TABLE nodes (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  title        TEXT,
  content      TEXT NOT NULL,
  summary      TEXT,
  tags_json    TEXT,           -- JSON array
  importance   REAL DEFAULT 0.5,
  confidence   REAL DEFAULT 0.8,
  created_at   INTEGER NOT NULL,  -- unix ms UTC
  updated_at   INTEGER NOT NULL,
  archived_at  INTEGER            -- optional: hide from default views
);
```

**Edges (bi-temporal-ready, tx-time primary in V1):**
```sql
CREATE TABLE edges (
  id             TEXT PRIMARY KEY,
  from_id        TEXT NOT NULL REFERENCES nodes(id),
  to_id          TEXT NOT NULL REFERENCES nodes(id),
  type           TEXT NOT NULL,
  properties_json TEXT,

  -- valid-time (default to recorded_at in V1)
  valid_from     INTEGER NOT NULL,   -- unix ms UTC
  valid_until    INTEGER,            -- NULL = open-ended

  -- transaction-time
  recorded_at    INTEGER NOT NULL,   -- when inserted into DB
  invalidated_at INTEGER,            -- when soft-deleted

  -- integrity
  invalidated_by TEXT,               -- edge id that superseded this
  strength       REAL DEFAULT 0.5,
  confidence     REAL DEFAULT 0.8,
  context        TEXT,               -- human-readable reason for this edge

  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK (invalidated_at IS NULL OR invalidated_at >= recorded_at)
);
```

**Indexes:**
```sql
-- Current graph (fast default queries)
CREATE INDEX edges_current ON edges(invalidated_at) WHERE invalidated_at IS NULL;
CREATE INDEX edges_current_from ON edges(from_id, type) WHERE invalidated_at IS NULL;
CREATE INDEX edges_current_to ON edges(to_id, type) WHERE invalidated_at IS NULL;

-- Point-in-time (transaction-time)
CREATE INDEX edges_tx_time ON edges(recorded_at, invalidated_at);

-- Point-in-time (valid-time, for V1.5+)
CREATE INDEX edges_valid_time ON edges(valid_from, valid_until);
```

#### Core Query Predicates

```sql
-- Current graph (default for all queries)
WHERE invalidated_at IS NULL

-- What agent knew at time T (transaction-time as-of)
WHERE recorded_at <= :t AND (invalidated_at IS NULL OR invalidated_at > :t)

-- What was true at time T (valid-time as-of, V1.5+)
WHERE valid_from <= :t AND (valid_until IS NULL OR valid_until > :t)

-- Full bi-temporal (known at T_tx about time T_valid) — just AND both
```

#### Edge Lifecycle

1. **Create**: Insert row with `recorded_at=now`, `valid_from=now` (or caller-specified), `invalidated_at=NULL`
2. **Invalidate**: Set `invalidated_at=now`, optionally set `invalidated_by=new_edge_id`. NEVER delete the row.
3. **Supersede**: In single transaction: invalidate old edge + create new edge with `invalidated_by` pointing to new edge
4. **Query history**: `get_edge_history(node_id)` returns all edges including invalidated, ordered by `valid_from`
5. **What changed**: `what_changed(since)` returns edges where `recorded_at >= since` OR `invalidated_at >= since`

#### Pitfalls to Avoid (from research)
1. **Time format drift**: Use unix ms UTC everywhere. Never mix text timestamps. (Source: Oracle consultation)
2. **Half-open intervals**: `[valid_from, valid_until)` consistently — use `<` on valid_until, never `<=`. (Source: Oracle)
3. **Invalidation races**: Always close old edge + create new edge in SAME SQLite transaction. (Source: Oracle)
4. **Content mutation lies**: If nodes are mutable, PIT only reconstructs topology, not historical text. Accept this or make nodes immutable. (Source: Oracle — "either treat nodes as immutable or accept that PIT only reconstructs relationships/topology")
5. **Soft-delete bloat**: At scale, soft-deleted rows pollute indexes. Partial index `WHERE invalidated_at IS NULL` mitigates this. (Source: EventSourcingDB blog)
6. **Query overhead**: Soft-delete adds 20-40% overhead vs hard-delete. Acceptable for <10K nodes. (Source: Librarian research — performance benchmarks)

#### What's Deferred to V2+
- Node bi-temporal validity (valid_from/valid_until on nodes)
- Node immutability enforcement (V1 allows node content edits)
- Full bi-temporal queries combining tx-time + valid-time
- Snapshot tables / materialized views for large graph PIT
- Node revision history table
- Event sourcing / append-only event log

## Query Performance Research

### Current Texere Codebase State
- **better-sqlite3 v12.6.2** already in package.json (used for test adapter only)
- **No production SQLite** — current KG uses Neo4j, orchestrator uses PostgreSQL
- **No FTS5, no WAL mode, no performance tuning** in existing code
- **Prisma ORM** for relational queries, neo4j-driver for graph
- **Texere rewrite replaces ALL of this** with direct better-sqlite3 + raw SQL

### Performance Expectations at Scale (10K nodes, 50K edges)

Sources: better-sqlite3 benchmarks, SQLite Forum (2024-2026), production apps (ChatLab, Joplin, massCode, kb-fusion)

| Operation | Latency | Throughput | Source |
|-----------|---------|------------|--------|
| Get node by ID (indexed) | <0.01ms | 313,899 ops/s | better-sqlite3 official benchmark |
| Insert single node | 1-5ms | 62,554 ops/s | better-sqlite3 official benchmark |
| Batch insert 100 nodes (transaction) | 5-20ms | 414,100 rows/s | better-sqlite3 benchmark (6.6x faster than individual) |
| FTS5 MATCH single term | 5-20ms | — | Reddit r/sqlite 2025, VADOSWARE FTS benchmarks |
| FTS5 MATCH with BM25 rank | 30-100ms | — | kb-fusion production measurements |
| FTS5 prefix query (`auth*`) | 10-30ms | — | SQLite FTS5 docs |
| Recursive CTE 1-2 hops | 1-10ms | — | SQLite Forum, production implementations |
| Recursive CTE 3-5 hops | 10-50ms | — | SQLite Forum, production implementations |
| Recursive CTE 6-10 hops | 50-200ms | — | Practical limit for interactive use |
| 3-table JOIN (node→edge→node) | 5-30ms | — | Production benchmarks |
| json_each() filter | 100-500ms | — | SQLite JSON benchmarks |
| Denormalized tag table filter | 5-20ms | — | 10-50x faster than json_each() |

### Critical Finding: Denormalize Tags

`json_each()` for filtering tags is **10-100x slower** than a denormalized tag table.

```sql
-- SLOW: json_each() (100-500ms at 10K nodes)
SELECT * FROM nodes WHERE id IN (
  SELECT n.id FROM nodes n, json_each(n.tags_json) j WHERE j.value = 'auth'
);

-- FAST: Denormalized table (5-20ms at 10K nodes)
SELECT n.* FROM nodes n
JOIN node_tags nt ON nt.node_id = n.id
WHERE nt.tag = 'auth';
```

Decision: **Keep tags_json on nodes for display, add node_tags table for querying.**

Source: SQLite JSON docs (2025), Medium articles, production benchmarks

### PRAGMA Configuration (Production)

```typescript
const db = new Database('texere.db', { timeout: 5000 });

db.pragma('journal_mode = WAL');        // 5-10x faster reads, concurrent read/write
db.pragma('synchronous = NORMAL');      // 2-3x faster writes, safe with WAL
db.pragma('cache_size = -64000');       // 64MB cache (default is 2MB)
db.pragma('mmap_size = 268435456');     // 256MB memory-mapped I/O
db.pragma('temp_store = MEMORY');       // Temp tables in RAM
db.pragma('foreign_keys = ON');         // Data integrity
```

Sources:
- better-sqlite3 docs: `SQLITE_DEFAULT_WAL_SYNCHRONOUS=1` compiled in by default
- SQLite WAL docs: readers don't block writers, 2-15x faster writes
- Production code: claude-mem, lnreader, massCode all use this pattern
- better-sqlite3 performance.md: WAL + checkpoint management pattern

### FTS5 Design (Production Pattern)

**Contentless FTS5 with triggers** — avoids data duplication, automatic sync:

```sql
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  title,
  content,
  summary,
  tags,                    -- Space-separated (converted from JSON)
  content='',              -- Contentless: no duplication
  tokenize='porter unicode61 remove_diacritics 2',
  prefix='2 3'             -- 2-3 char prefix indexes for autocomplete
);
```

**Column weights via bm25():**
```sql
-- Title matches weighted 10x, content 1x, summary 5x, tags 3x
SELECT n.*, bm25(nodes_fts, 10.0, 1.0, 5.0, 3.0) AS rank
FROM nodes_fts nf
JOIN nodes n ON n.id = nf.rowid  -- Note: requires INTEGER rowid mapping
WHERE nf MATCH 'authentication'
ORDER BY rank
LIMIT 20;
```

**Tokenizer choice**: `porter unicode61` for English knowledge graphs. Porter handles stemming (authenticate/authentication/authenticator → same stem). For code symbols and acronyms, use unicode61 without porter (exact match).

**Hybrid approach for mixed content** (from calibre, kb-fusion):
- Stemmed FTS5 table for prose content (porter + unicode61)
- Exact FTS5 table for code/acronyms (unicode61 only)
- Query both, merge results

Sources:
- kb-fusion/lss_store.py — contentless FTS5 with porter, prefix='2'
- memory-graph/turso.py — FTS5 with CRUD triggers
- mcp_agent_mail — bm25() column weighting pattern
- calibre/schema_upgrades.py — porter unicode61 remove_diacritics 2

### FTS5 Sync via Triggers

```sql
CREATE TRIGGER nodes_fts_insert AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(rowid, title, content, summary, tags)
  VALUES (new.rowid, new.title, new.content, new.summary,
    (SELECT group_concat(value, ' ') FROM json_each(new.tags_json)));
END;

CREATE TRIGGER nodes_fts_update AFTER UPDATE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, title, content, summary, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.summary,
    (SELECT group_concat(value, ' ') FROM json_each(old.tags_json)));
  INSERT INTO nodes_fts(rowid, title, content, summary, tags)
  VALUES (new.rowid, new.title, new.content, new.summary,
    (SELECT group_concat(value, ' ') FROM json_each(new.tags_json)));
END;

CREATE TRIGGER nodes_fts_delete AFTER DELETE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, title, content, summary, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.summary,
    (SELECT group_concat(value, ' ') FROM json_each(old.tags_json)));
END;
```

Overhead: +15-30% insert, +25-40% update, +10-20% delete. Acceptable for <10K nodes.
Recovery: `INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild')` to rebuild from scratch.

Sources: mcp_agent_mail/db.py, memory-graph/turso.py, SQLite FTS5 docs

### Recursive CTE for Graph Traversal

```sql
WITH RECURSIVE graph_walk(node_id, depth, path) AS (
  SELECT id, 0, '/' || id || '/'
  FROM nodes WHERE id = :start_id

  UNION ALL

  SELECT e.to_id, gw.depth + 1, gw.path || e.to_id || '/'
  FROM graph_walk gw
  JOIN edges e ON e.from_id = gw.node_id
  WHERE e.invalidated_at IS NULL           -- current edges only
    AND gw.depth < :max_depth              -- depth limit
    AND instr(gw.path, '/' || e.to_id || '/') = 0  -- cycle detection
)
SELECT DISTINCT node_id, depth FROM graph_walk ORDER BY depth;
```

Practical depth limit: 10 hops for interactive use (<200ms).
Cycle detection via path string prevents infinite loops.
Bidirectional: run same CTE on `to_id` for incoming edges.

Sources: SQLite official docs, Stack Overflow (2024-2026), production code (Joplin, TLDraw)

### Index Strategy (Final)

```sql
-- Nodes
CREATE INDEX idx_nodes_type ON nodes(type) WHERE archived_at IS NULL;
CREATE INDEX idx_nodes_updated ON nodes(updated_at) WHERE archived_at IS NULL;

-- Edges: current graph (most queries)
CREATE INDEX idx_edges_current_from ON edges(from_id, type) WHERE invalidated_at IS NULL;
CREATE INDEX idx_edges_current_to ON edges(to_id, type) WHERE invalidated_at IS NULL;

-- Edges: point-in-time
CREATE INDEX idx_edges_tx_time ON edges(recorded_at, invalidated_at);
CREATE INDEX idx_edges_valid_time ON edges(valid_from, valid_until);

-- Tags (denormalized)
CREATE TABLE node_tags (
  node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (node_id, tag)
);
CREATE INDEX idx_tags_tag ON node_tags(tag);

-- FTS5 (automatic via virtual table)
```

**Index order rule**: Equality columns first, range columns last, most selective first.
**Partial indexes**: `WHERE invalidated_at IS NULL` on edges — 10-40x faster for current-graph queries, 50% smaller index.
**Covering indexes**: Include all SELECTed columns to avoid table lookup (2-5x faster).

Sources: SQLite query planner docs, OneUptime blog (2026), High Performance SQLite

### better-sqlite3 Patterns

**Prepared statement reuse** (10-30% faster for repeated queries):
```typescript
class TextereDB {
  private stmts = {
    getNode: this.db.prepare('SELECT * FROM nodes WHERE id = ?'),
    getEdges: this.db.prepare('SELECT * FROM edges WHERE from_id = ? AND invalidated_at IS NULL'),
    // ... cache all statements at class level
  };
}
```

**Transaction batching** (6-15x faster for bulk ops):
```typescript
const insertMany = db.transaction((nodes: Node[]) => {
  for (const node of nodes) this.stmts.insertNode.run(node);
});
```

**Periodic maintenance**:
```typescript
// Update query planner statistics after bulk operations
db.exec('ANALYZE');
// Optimize periodically
db.pragma('optimize');
```

Sources:
- better-sqlite3 official docs + benchmarks
- better-sqlite3 vs sqlite3: 2-24x faster (official README benchmarks)
- WAL checkpoint: auto at 1000 pages (~4MB), manual via `PRAGMA wal_checkpoint(RESTART)`

### Performance Summary

At 10K nodes / 50K edges with proper indexes + WAL + prepared statements:
- **95% of queries < 50ms** (graph traversal, FTS5, JOINs)
- **Node lookup: sub-millisecond** (indexed)
- **FTS5 search: 10-50ms** (with BM25 ranking)
- **Graph traversal 3 hops: 10-50ms** (recursive CTE)
- **Bulk insert 100 nodes: 5-20ms** (in transaction)
- **Total memory: ~100MB** (64MB cache + 10-50MB DB + WAL)

## Test Strategy (DECIDED)
- **TDD**: Red → Green → Refactor, always
- **Unit tests**: All code
- **Integration tests**: SQLite in-memory (`:memory:`)
- **Framework**: vitest (already in package.json)

## Technical Decisions
- **DECIDED**: Rewrite memory-graph core in TypeScript
- Texere = this repo renamed, TypeScript code replaced with knowledge graph
- Single-language project (TypeScript only)
- better-sqlite3 for storage (already a dependency)
- FTS5 for search (built-in from day 1)
- SQL CTEs for graph traversal (no NetworkX)
- Orchestrator agent = primary oh-my-opencode agent

## Memory-Graph Memories as Plan References

**Decision**: The 44 code_pattern memories in memory-graph contain detailed implementation patterns from the Python memory-graph source. The work plan should reference these by ID so the executing agent can `get_memory(memory_id="...")` to retrieve exact patterns during implementation.

### Memory → Task Mapping

**Schema & Storage Layer (SQLite + better-sqlite3)**
| Memory | ID | Relevance |
|--------|----|-----------|
| SQLite schema - nodes and relationships tables | `eb25dc20` | THE primary reference — exact table DDL to port |
| SQLite FTS5 full-text search table | `0cce0f98` | FTS5 virtual table design (note: stub exists but unused in Python) |
| SQLite + NetworkX dual storage pattern | `f711f161` | Understand what to DROP (NetworkX) and what to keep (SQLite) |
| Multi-tenant SQLite indexes | `00fdbcba` | Index patterns — adapt for single-tenant |

**Models & Types (TypeScript interfaces)**
| Memory | ID | Relevance |
|--------|----|-----------|
| Memory model fields | `4b5f2ee8` | Exact field list for Memory interface |
| 13 Memory Types | `47231dc4` | MemoryType enum definition |
| RelationshipType - 35 types in 7 categories | `cb7ea227` | RelationshipType enum + categories |
| RelationshipProperties with bi-temporal tracking | `86b35eaa` | Relationship model with temporal fields |
| SearchQuery model | `4081d767` | SearchQuery interface for filtering |
| MemoryContext with multi-tenancy | `2c3969a9` | Context model — simplify for single-tenant |
| Error hierarchy | `c3dc4f18` | Error types to port |

**CRUD Operations**
| Memory | ID | Relevance |
|--------|----|-----------|
| SQLiteMemoryDatabase - core CRUD | `2090604b` | All CRUD SQL patterns — store, get, update, delete |
| Memory Parser - deserialization | `fdc62558` | Row-to-Memory conversion logic |

**Search Implementation**
| Memory | ID | Relevance |
|--------|----|-----------|
| Search with stemming and fuzzy patterns | `8b6bcb48` | What to REPLACE with FTS5 |
| Multi-term search with match modes | `bead63ba` | Multi-term query logic to port |
| Search result enrichment | `2764f99a` | Match quality scoring pattern |
| recall vs search - Two Search Interfaces | `1937d32d` | API design for dual search modes |
| Contextual Search - Two-Phase Graph-Scoped | `a85111ea` | Graph-scoped search pattern |

**Relationship System**
| Memory | ID | Relevance |
|--------|----|-----------|
| Relationship creation with cycle detection | `9c26ede0` | Create + cycle check logic |
| Cycle detection via DFS | `3bc9620c` | DFS algorithm for cycles |
| Bidirectional relationships and inverse types | `769e1052` | Inverse relationship mapping |
| Relationship invalidation (soft delete) | `2ed77305` | Temporal invalidation pattern |
| RelationshipManager - metadata and strength | `a65b4b30` | Strength calculation logic |
| get_related_memories with point-in-time queries | `52a387db` | Temporal traversal queries |
| Contradiction detection | `38c2b251` | Contradiction checking logic |

**MCP Server & Tools**
| Memory | ID | Relevance |
|--------|----|-----------|
| Tool Registry Pattern | `baf19eeb` | Handler dispatch pattern |
| Tool Handler Signature | `d83b2789` | (db, args) -> result pattern |
| MCP Tool Dispatch - Three-Tier Routing | `02652234` | Request routing architecture |
| MCP Server Initialization | `9a649efd` | Server startup flow |
| MCP Server stdio Transport + Tool Definitions | `9772953c` | stdio + inline tool schemas |
| Tool profiles - core vs extended | `23bdd9c0` | Tool grouping strategy |
| Error Handling Decorator | `be4f4a8b` | Error wrapping for tools |
| Advanced Tools - 7 Graph Analysis | `f6451bc9` | Graph analysis tool definitions |

**Temporal System**
| Memory | ID | Relevance |
|--------|----|-----------|
| SQLite Temporal Queries - what_changed | `0b624c29` | Temporal query patterns |

**Lower Priority / Reference Only**
| Memory | ID | Relevance |
|--------|----|-----------|
| GraphBackend ABC | `5c512a47` | Interface pattern — may inform TS interface design |
| MemoryOperations protocol | `2def402c` | Backend protocol — simplify (no multi-backend) |
| BackendFactory - 8 backends | `da883a62` | DROP — single backend only |
| Config system - _EnvVar | `516c46ed` | Config pattern — simplify |
| GraphAnalyzer - BFS/DFS | `45a2f705` | May defer graph analytics |
| Cypher Query Patterns | `ca01443e` | DROP — no Neo4j |
| Neo4jConnection | `f992f16c` | DROP — no Neo4j |
| Migration System | `f9602038` | DEFER — no migrations needed for fresh schema |
| Export/Import System | `eead7faf` | DEFER — nice to have later |
| Pagination Utility | `7264d2ea` | DEFER — premature optimization |

## Search/Retrieval Research (Vocabulary Mismatch Problem)

### The Core Problem
Agent stores: "Authentication uses JWT tokens with 24h expiry"
Agent searches: "How does login session management work?"
Zero keyword overlap. FTS5 returns nothing. Knowledge is invisible.

### Research Findings — Three Pillars

**Pillar 1: Hybrid FTS5 + Vector Search (sqlite-vec)**
- sqlite-vec: 6,891 stars, Mozilla Builders, works with better-sqlite3 out of box
- Transformers.js: 15K stars, official HuggingFace, local ONNX inference, no cloud APIs
- Model: Xenova/all-MiniLM-L6-v2 (384 dims, ~50MB, CPU-only)
- Merge strategy: Reciprocal Rank Fusion (rank-based, no tuning needed)
- Alex Garcia's proven pattern: FTS5 + vec0 + RRF

**Pillar 2: Graph Structure as Semantic Bridge**
- Relationship traversal expands results to lexically-different-but-connected knowledge
- Hierarchical tags with path tokenization (BM25 rewards rare category matches)
- Community detection + summaries (GraphRAG approach — viable at small scale)
- Graph-only works for <500 nodes; 500-5K needs lightweight embeddings too
- Sparse/disconnected graphs fail — graph quality is critical

**Pillar 3: LLM-as-Retriever (unique Texere advantage)**
- LLM is ALREADY in the loop — it's the agent running the query
- Query reformulation: "How does login work?" → ["authentication", "JWT", "session", "login flow"]
- LLM-judged relevance: evaluate candidates directly (viable at small scale)
- Iterative graph navigation: LLM decides breadth vs depth search
- Cost: essentially free (agent is already running, query expansion is cheap tokens)

### How Existing Systems Solve It
| System | Primary | Fallback | Embedding | Local? |
|--------|---------|----------|-----------|--------|
| mem0 | Vector | Graph + BM25 rerank | OpenAI 1536d | Ollama option |
| Cognee | Vector on graph triplets | Lexical (Jaccard) | FastEmbed local | YES default |
| Windsurf/Devin | Agentic search (parallel grep) | N/A | None | N/A |
| Obsidian+AI | Vector | Note link graph | Configurable | Ollama option |

### Key Insight: Windsurf Uses NO Embeddings
Windsurf/Devin uses specialized subagent for retrieval — parallel tool calls (grep, read, glob), 8 parallel per turn, 4 serial turns max. No embeddings. The AGENT is the semantic layer.

### The Deeper Problem: Unknown Unknowns (CRITICAL INSIGHT)

The vocabulary mismatch problem assumes the agent **knows to search**. But the actual killer:

> Agent is implementing auth. KG has a critical decision: "We chose JWT over sessions because of microservice boundary requirements." Agent never searches for it because **it doesn't know that decision exists**. It implements sessions. Hours wasted.

**The agent cannot evaluate completeness of results it doesn't know should exist.** Three results come back — is that everything? Is there a 4th critical constraint it missed? It has no way to know.

This reframes the architecture from **PULL** (agent searches KG) to **PUSH** (KG injects relevant knowledge into agent context).

### Push Mechanisms (how KG delivers knowledge the agent didn't ask for)

1. **Code-anchored auto-injection**: Agent opens `auth.ts` → KG knows facts are linked to that file/module → injects them automatically into context
2. **Task-level briefing**: Before any task starts, scan task description against KG → pre-load all relevant knowledge
3. **Concept triggers**: Agent mentions "authentication" in its reasoning → KG surfaces everything tagged/linked to that concept
4. **Orchestrator as gatekeeper**: KG orchestrator reads coding agent's context and decides what's relevant to inject

### Why Graph Structure Is the Solution to Push

Graph structure enables push because it answers: **"given that the agent is touching X, what else is connected to X that the agent needs to know?"**

- Agent touches `auth.ts` → graph knows `auth.ts` is linked to Decision("JWT over sessions") via IMPLEMENTS, linked to Constraint("microservice boundaries") via MOTIVATED_BY, linked to Problem("session sharing across services") via SOLVES
- **All of these get surfaced automatically** — agent never needed to search for them
- Embeddings can't do this — they find similar content, not structurally connected knowledge
- LLM reformulation can't do this — it can only expand what the agent already thought to ask about

**Graph structure is the ONLY mechanism that surfaces knowledge the agent didn't know to look for.**

### V1 Interaction Model (DECIDED)
- **Custom orchestrator agent(s)** for ingestion — user switches to it in oh-my-opencode, it researches codebase, asks questions, writes atomic facts to KG
- **Any agent** can also use Texere MCP tools directly for ad-hoc reads/writes
- **No automatic push/injection** — no hooks, no auto-injection in V1
- The graph structure is designed so push CAN be built later
- **Proof manual works**: The 44 memory-graph memories used in this planning session — all created via MCP tools, all useful

### Decision: All Three Pillars, Different Roles

| Pillar | Role | Solves |
|--------|------|--------|
| **Graph structure** | PRIMARY — Push mechanism. Auto-inject connected knowledge when agent touches code/concepts | Unknown unknowns. The agent doesn't know what it doesn't know. |
| **Embeddings (sqlite-vec)** | SECONDARY — Pull mechanism. Fuzzy semantic search when agent explicitly queries | Known unknowns. Agent knows it needs something but uses wrong words. |
| **LLM reformulation** | TERTIARY — Enhancement. Expand explicit queries, judge relevance of candidates | Query quality. Make pull searches more effective. |

**Build order**: Graph structure first (it solves the hardest problem). Embeddings second. LLM reformulation is nearly free once the other two exist.

## V1 Scope (DECIDED)

### IN — V1
- Graph storage + CRUD (nodes, relationships, bi-temporal tracking)
- Relationship types + management (typed edges, cycle detection, invalidation)
- FTS5 search (full-text on content + tags + titles)
- MCP server + tools (agent-facing interface)
- Orchestrator agent(s) for ingestion (oh-my-opencode primary agent)
- Lightweight code-anchoring (file/module paths on nodes, ANCHORED_TO relationships, "what do I know about auth.ts?" works)
- Embedding column in schema (exists but not populated — design for V1.5)

### OUT — V2+
- Embedding population + sqlite-vec vector search (V1.5 — schema ready, not implemented)
- Automatic push/injection (hooks, auto-context, file-open triggers)
- Deep code-anchoring (symbol-level, line numbers, AST references)
- Community detection / GraphRAG summaries
- Advanced analytics (clustering, bridge detection, graph metrics)
- Export/import
- Migration tools
