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
nodes(id, label, properties JSON, created_at)
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
- **This repo** (kg-mcp) gets renamed to Texere, TypeScript code gutted

> **⚠️ SUPERSEDED by Session 2+3**: Original plan was Python memory-graph wrapper. Now a full TypeScript rewrite. See "Session 3 Decisions" section for final architecture.

### 2. Architecture (SUPERSEDED — see Session 3 Decisions)
- ~~**Storage**: memory-graph (Python MCP server, run as dependency)~~
- **ACTUAL V1**: `packages/graph/` (TypeScript library) + `apps/mcp/` (MCP server) + `skills/texere.md`
- **Code indexing**: Deferred to V2
- **Orchestrator agent**: Deferred to V3
- ~~**memory-graph extensions**: FTS5 + code path prefix queries (PR or fork)~~

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

**DEPRECATED_BY** — X replaces Y (directional, temporal) *(renamed from SUPERSEDES in Session 3 — Datomic-inspired)*
> Question: "Is this still current?" / "Has this been replaced?"
> Use when: A newer version replaces an older one. The old one is now outdated.
> Examples: new decision → old decision, updated requirement → old requirement, fix → older fix
> When created with `texere_create_edge`, auto-sets `invalidated_at` on the source node.
> Merges from memory-graph: REPLACES, IMPROVES, SUPERSEDES

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
| DEPRECATED_BY | ✅ | | 0.8 | — |
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
- DEPRECATED_BY → decision ("replaces older decision")
- ALTERNATIVE_TO ↔ decision ("other options considered")
- SOLVES → problem ("this decision resolves this problem")
- ANCHORED_TO → file_context ("this decision affects this code")
- IMPLEMENTS ← file_context ("this code realizes this decision")
- CONSTRAINS ← constraint ("this decision was limited by this constraint")

**requirement**:
- IMPLEMENTS ← file_context ("this code fulfills this requirement")
- REQUIRES → requirement ("this requirement depends on that one")
- DEPRECATED_BY → requirement ("this replaces an older requirement")
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
- DEPRECATED_BY → solution ("replaces older solution")
- VALIDATES ← research ("research confirms this works")
- ANCHORED_TO → file_context ("where this solution is implemented")

**error**:
- SOLVES ← fix ("what fixes this error")
- CAUSES ← problem ("what produces this error")
- ANCHORED_TO → file_context ("where this error occurs")

**fix**:
- SOLVES → error ("what error this fixes")
- DEPRECATED_BY → fix ("replaces older fix")
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
  → DEPRECATED_BY (new → old) — auto-invalidates the old node

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
  2. Edge: new_decision --DEPRECATED_BY--> old_decision("Use REST API")  ← auto-invalidates old_decision
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

**How "decision is no longer current" works** (REVISED Session 3 — Datomic-inspired):
1. Create NEW decision node: "We switched to sessions"
2. Link: new_decision --DEPRECATED_BY--> old_decision → auto-sets `invalidated_at` on old node
3. Old node stays forever as historical record (eternal, never deleted)
4. Query "current decisions" = `WHERE invalidated_at IS NULL` (fast column filter, 0.075ms constant)

**Node columns (Session 3 FINAL):**
- `created_at` — when node was stored
- `invalidated_at` — when node was deprecated (NULL = still current)
- NO `updated_at` (immutable nodes)
- NO `archived_at` (redundant with `invalidated_at`)
- NO `summary` (nodes are small — title + content is enough)
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

**Nodes (REVISED Session 3 — immutable, eternal, Datomic-inspired):**
```sql
CREATE TABLE nodes (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  tags_json      TEXT,              -- JSON array, synced to node_tags via trigger
  importance     REAL DEFAULT 0.5,
  confidence     REAL DEFAULT 0.8,
  created_at     INTEGER NOT NULL,  -- unix ms UTC
  invalidated_at INTEGER,           -- NULL = current; set when deprecated
  embedding      BLOB              -- V1.5: unpopulated, ready for sqlite-vec
);
```
Session 3 changes: dropped `summary` (nodes are small), dropped `updated_at` (immutable), renamed `archived_at` → `invalidated_at`, added `embedding` column (unpopulated V1).

**Edges (column names REVISED Session 3; full schema TBD — see Open Questions):**
```sql
CREATE TABLE edges (
  id             TEXT PRIMARY KEY,
  source_id      TEXT NOT NULL REFERENCES nodes(id),  -- renamed from from_id
  target_id      TEXT NOT NULL REFERENCES nodes(id),  -- renamed from to_id
  type           TEXT NOT NULL,

  -- ⚠️ OPEN QUESTION: How much of the below survives Session 3 simplification?
  -- Node schema was simplified to just created_at + invalidated_at.
  -- Edge schema may get the same treatment. See "Open Questions" section.

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

**Indexes (REVISED Session 3+4 — see "Index Strategy" section for authoritative version):**
```sql
-- See "Index Strategy (REVISED Session 3+4)" section for the complete, up-to-date index list.
-- Key changes: from_id→source_id, to_id→target_id, composite covering indexes,
-- partial indexes on invalidated_at IS NULL.
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
- ~~Node immutability enforcement (V1 allows node content edits)~~ **DONE in Session 3**: Nodes ARE immutable in V1. No `texere_update_node` tool. Changes via deprecation pattern (new node + DEPRECATED_BY edge).
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

Sources: better-sqlite3 benchmarks, SQLite Forum (2024-2026), production apps (ChatLab, Joplin, massCode, kb-fusion), Session 4 benchmark research (2026-02-13)

| Operation | Latency | Throughput | Source |
|-----------|---------|------------|--------|
| Get node by ID (indexed) | <0.01ms | 313,899 ops/s | better-sqlite3 official benchmark |
| Insert single node | 1-5ms | 62,554 ops/s | better-sqlite3 official benchmark |
| Batch insert 100 nodes (transaction) | 5-20ms | 414,100 rows/s | better-sqlite3 benchmark (6.6x faster than individual) |
| FTS5 MATCH single term | 5-20ms | — | Reddit r/sqlite 2025, VADOSWARE FTS benchmarks |
| FTS5 MATCH with BM25 rank | 2-20ms | — | "I Replaced Elasticsearch with SQLite" (single-digit ms at 100K docs) |
| FTS5 prefix query (`auth*`) | 10-30ms | — | SQLite FTS5 docs |
| 3-table JOIN (node→edge→node) | 5-30ms | — | Production benchmarks |
| json_each() filter | 100-500ms | — | SQLite JSON benchmarks |
| Denormalized tag table filter | 5-20ms | — | 10-50x faster than json_each() |

**Recursive CTE — Depth × Density Matrix** (REVISED Session 4):

Performance is exponential in `depth × avg_degree`, not just depth.
At each hop, fan-out = avg_degree. Total visited ≈ `d^0 + d^1 + ... + d^k`.

| Depth | Sparse (degree 3-5) — Texere typical | Dense (degree 10+) — code indexer |
|-------|---------------------------------------|-----------------------------------|
| 1 hop | 0.1-1ms | 0.1-1ms |
| 2 hops | 1-10ms | 10-50ms |
| 3 hops | 10-50ms | 100-500ms |
| 5 hops | 50-200ms | **1-10 seconds** ⚠️ |

**Texere is sparse (degree 3-5)**: A "solution" links to a "problem", a "technology", maybe a "decision". Not 20 things. Dense graphs (degree 10+) only relevant for V2 code indexing (heavily-imported modules).

**Practical depth limit: 5 hops** (not 10). Even sparse graphs approach 200ms at depth 5 with 100K nodes. Depth 3 is the sweet spot for interactive queries.

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

db.pragma('journal_mode = WAL');        // 12-33% faster writes, concurrent read/write
db.pragma('synchronous = NORMAL');      // Safe with WAL (SQLITE_DEFAULT_WAL_SYNCHRONOUS=1)
db.pragma('cache_size = -64000');       // 64MB cache (default is 2MB)
db.pragma('mmap_size = 268435456');     // 256MB memory-mapped I/O
db.pragma('temp_store = MEMORY');       // Temp tables in RAM
db.pragma('foreign_keys = ON');         // Data integrity
db.pragma('wal_autocheckpoint = 1000'); // Checkpoint every 1000 pages (~4MB), prevents WAL bloat
```

**BEGIN IMMEDIATE for write transactions** (ADDED Session 4):

SQLite's default `BEGIN` starts a read transaction that gets upgraded to write on first INSERT/UPDATE. Under concurrent load, this upgrade can fail with `SQLITE_BUSY`. Use `BEGIN IMMEDIATE` for any transaction that will write.

Critical for: `texere_create_edge` with DEPRECATED_BY (INSERT edge + UPDATE node.invalidated_at in one transaction).

```typescript
// BAD: implicit read→write upgrade, can SQLITE_BUSY
db.transaction(() => {
  insertEdge.run(edge);
  invalidateNode.run(nodeId);  // May fail!
})();

// GOOD: BEGIN IMMEDIATE, locks from start
const createDeprecatingEdge = db.transaction(() => {
  insertEdge.run(edge);
  invalidateNode.run(nodeId);
});
// better-sqlite3's .transaction() uses BEGIN IMMEDIATE by default ✓
// But verify this — if not, use db.exec('BEGIN IMMEDIATE') manually
```

**WAL checkpoint management** (ADDED Session 4):

Monitor WAL file size, checkpoint when >10MB to prevent unbounded growth:
```typescript
import { stat } from 'fs/promises';

// Periodic check (e.g., after every N writes)
const walPath = dbPath + '-wal';
const walStat = await stat(walPath).catch(() => null);
if (walStat && walStat.size > 10 * 1024 * 1024) {
  db.pragma('wal_checkpoint(RESTART)');
}
```

Sources:
- better-sqlite3 docs: `SQLITE_DEFAULT_WAL_SYNCHRONOUS=1` compiled in by default
- SQLite WAL docs: readers don't block writers, 12-33% faster writes (Forward Email benchmarks)
- Production code: claude-mem, lnreader, massCode all use this pattern
- better-sqlite3 performance.md: WAL + checkpoint management pattern
- SQLite Forum: SQLITE_BUSY from read→write transaction upgrades (Session 4 research)

### FTS5 Design (REVISED Session 3+4)

**Contentless FTS5 with triggers** — avoids data duplication, automatic sync.

`summary` column dropped in Session 3 (nodes are small — title + content is enough).
3 FTS columns: title, content, tags.

```sql
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  title,
  content,
  tags,                    -- Space-separated (converted from JSON)
  content='',              -- Contentless: no duplication
  tokenize='porter unicode61 remove_diacritics 2',
  prefix='2 3'             -- 2-3 char prefix indexes for autocomplete
);
```

**Alternative: External content table** (Session 4 finding):
```sql
-- External content FTS5 — auto-looks up data from source table
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  title, content, tags,
  content=nodes,           -- Points to source table
  content_rowid=rowid,     -- Link via rowid
  tokenize='porter unicode61 remove_diacritics 2',
  prefix='2 3'
);
```
Trade-off: external content avoids duplication without manual trigger management,
but still needs DELETE triggers for contentless. Evaluate during implementation.

**⚠️ Note**: External content FTS5 uses `content_rowid=rowid` which requires INTEGER rowid.
Our nodes use TEXT PRIMARY KEY (`id`). This means external content tables won't work
out-of-the-box — would need an INTEGER alias column or stick with contentless + triggers.

**Column weights via bm25():**
```sql
-- Title matches weighted 10x, content 1x, tags 3x (3 columns, not 4)
-- Note: BM25 returns NEGATIVE scores — lower = better match
SELECT n.*, bm25(nodes_fts, 10.0, 1.0, 3.0) AS rank
FROM nodes_fts nf
JOIN nodes n ON n.id = nf.rowid  -- Note: requires INTEGER rowid mapping
WHERE nf MATCH 'authentication'
ORDER BY rank  -- ascending: most negative = best match
LIMIT 20;
```

**Tokenizer choice**: `porter unicode61` for English knowledge graphs. Porter handles stemming (authenticate/authentication/authenticator → same stem). For code symbols and acronyms, use unicode61 without porter (exact match).

**Hybrid approach for mixed content** (from calibre, kb-fusion):
- Stemmed FTS5 table for prose content (porter + unicode61)
- Exact FTS5 table for code/acronyms (unicode61 only)
- Query both, merge results

**Performance at scale** (Session 4 research):
- FTS5 MATCH with BM25: single-digit ms at 100K documents ("I Replaced Elasticsearch with SQLite")
- FTS5 index rebuild at 100K docs: 1-5 seconds (expensive — avoid during normal operation)
- FTS5 triggers add +15-30% overhead per INSERT. For bulk loads, drop triggers and rebuild.

Sources:
- kb-fusion/lss_store.py — contentless FTS5 with porter, prefix='2'
- memory-graph/turso.py — FTS5 with CRUD triggers
- mcp_agent_mail — bm25() column weighting pattern (Angular CLI MCP uses same)
- calibre/schema_upgrades.py — porter unicode61 remove_diacritics 2
- n8n-mcp — external content table pattern
- Beaker Browser — FTS5 trigger patterns
- Session 4 benchmark research (2026-02-13)

### FTS5 Sync via Triggers (REVISED Session 3+4)

**No UPDATE trigger needed** — nodes are immutable (Session 3 decision).
Only INSERT and DELETE triggers. `summary` column removed.

```sql
CREATE TRIGGER nodes_fts_insert AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(rowid, title, content, tags)
  VALUES (new.rowid, new.title, new.content,
    (SELECT group_concat(value, ' ') FROM json_each(new.tags_json)));
END;

-- DELETE trigger: for eventual garbage collection of invalidated nodes
CREATE TRIGGER nodes_fts_delete AFTER DELETE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, title, content, tags)
  VALUES ('delete', old.rowid, old.title, old.content,
    (SELECT group_concat(value, ' ') FROM json_each(old.tags_json)));
END;
```

Overhead: +15-30% per INSERT. No UPDATE overhead (immutable nodes).
Recovery: `INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild')` to rebuild from scratch.

**Bulk load optimization** (Session 4 finding): For seeding large datasets, drop triggers first, bulk INSERT, then rebuild FTS index:
```sql
DROP TRIGGER IF EXISTS nodes_fts_insert;
-- ... bulk insert nodes ...
INSERT INTO nodes_fts(nodes_fts) VALUES('rebuild');  -- Rebuild entire index
-- ... re-create trigger ...
```

Sources: mcp_agent_mail/db.py, memory-graph/turso.py, SQLite FTS5 docs, Beaker Browser (Session 4)

### Recursive CTE for Graph Traversal (REVISED Session 4)

**Key Session 4 findings:**
1. `instr()` path tracking adds ~20-30% overhead and becomes a bottleneck at 100K nodes
2. Depth limit alone prevents infinite loops — path tracking is redundant for termination
3. `UNION` (dedup per step) vs `UNION ALL` (dedup at end) is the real trade-off
4. SQLite query planner DOES use indexes on the recursive term (confirmed via EXPLAIN)
5. Materialization hints (`NOT MATERIALIZED`) may help for >10K node graphs (SQLite 3.35.0+)

**Strategy A: UNION ALL + depth limit + DISTINCT output** (RECOMMENDED for Texere):
```sql
WITH RECURSIVE graph_walk(node_id, depth) AS (
  -- Seed: start node's direct neighbors
  SELECT target_id, 1
  FROM edges
  WHERE source_id = :start_id AND invalidated_at IS NULL

  UNION ALL

  -- Recurse: expand frontier
  SELECT e.target_id, gw.depth + 1
  FROM graph_walk gw
  JOIN edges e ON e.source_id = gw.node_id
  WHERE e.invalidated_at IS NULL
    AND gw.depth < :max_depth
)
SELECT DISTINCT n.*
FROM nodes n
JOIN graph_walk gw ON n.id = gw.node_id
WHERE n.invalidated_at IS NULL
ORDER BY gw.depth;
```

**Why UNION ALL over UNION**: In Texere's sparse graph (degree 3-5, cycle density ~10-20%), UNION ALL + final DISTINCT is faster than per-step dedup. May revisit a few nodes in cyclic subgraphs, but depth limit caps total work. The wasted work from revisiting << the overhead of maintaining a B-tree for dedup on every recursive step.

**Strategy B: UNION (dedup per step)** — use if cycle density is higher than expected:
```sql
  ...
  UNION  -- Not UNION ALL: deduplicates per iteration, prevents revisits
  ...
```
Slower per step (~20-30% overhead for B-tree maintenance) but prevents exponential blowup in highly cyclic graphs. Benchmark both during TDD.

**Bidirectional traversal**: Same CTE on `target_id → source_id` for incoming edges. Or UNION both directions in one CTE.

**Practical depth limit: 5 hops** (revised down from 10).
- Depth 3 is the sweet spot for interactive queries (<50ms at 100K sparse nodes)
- Depth 5 approaches 200ms — acceptable for "deep exploration" mode
- Depth 10 is unrealistic for interactive use

**Materialization hint** (SQLite 3.35.0+, investigate during implementation):
```sql
WITH RECURSIVE graph_walk AS NOT MATERIALIZED (...)  -- May improve streaming for >10K results
```

Sources: SQLite official docs, Stack Overflow (2024-2026), simple-graph (dpapathanasiou), sqlite-graph (agentflare-ai), DuckDB USING KEY paper (2025), Session 4 benchmark research (2026-02-13)

### Index Strategy (REVISED Session 3+4)

Column renames: `archived_at` → `invalidated_at`, `from_id`/`to_id` → `source_id`/`target_id`, `updated_at` dropped (immutable nodes).

```sql
-- Nodes: filter by type for current (non-invalidated) nodes
CREATE INDEX idx_nodes_type ON nodes(type) WHERE invalidated_at IS NULL;

-- Nodes: created_at for recency queries
CREATE INDEX idx_nodes_created ON nodes(created_at) WHERE invalidated_at IS NULL;

-- Edges: current graph — THE critical indexes for recursive CTE performance
-- SQLite query planner confirmed to use these in recursive step (Session 4 EXPLAIN analysis)
CREATE INDEX idx_edges_source_active ON edges(source_id, target_id) WHERE invalidated_at IS NULL;
CREATE INDEX idx_edges_target_active ON edges(target_id, source_id) WHERE invalidated_at IS NULL;

-- Edges: type-filtered traversal (e.g., "only DEPRECATED_BY edges")
CREATE INDEX idx_edges_source_type ON edges(source_id, type) WHERE invalidated_at IS NULL;
CREATE INDEX idx_edges_target_type ON edges(target_id, type) WHERE invalidated_at IS NULL;

-- Tags (denormalized)
CREATE TABLE node_tags (
  node_id TEXT NOT NULL REFERENCES nodes(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (node_id, tag)
);
CREATE INDEX idx_tags_tag ON node_tags(tag);

-- FTS5 (automatic via virtual table)
```

**Why composite `(source_id, target_id)` instead of just `(source_id)`**: The recursive CTE JOINs on `source_id` and SELECTs `target_id` — a composite index makes this a **covering index** for the edge traversal, avoiding a table lookup entirely. 2-5x faster per recursive step.

**Partial indexes** (`WHERE invalidated_at IS NULL`): 10-40x faster for current-graph queries, ~50% smaller index (Session 3 benchmarks). Since most queries filter out invalidated data, the partial index is the common path.

**Index order rule**: Equality columns first, range columns last, most selective first.

Sources: SQLite query planner docs, OneUptime blog (2026), High Performance SQLite, Session 3 benchmarks, Session 4 EXPLAIN analysis

### better-sqlite3 Patterns (REVISED Session 4)

**Prepared statement reuse** (10-30% faster for repeated queries):
```typescript
class TextereDB {
  private stmts = {
    getNode: this.db.prepare('SELECT * FROM nodes WHERE id = ?'),
    getEdges: this.db.prepare('SELECT * FROM edges WHERE source_id = ? AND invalidated_at IS NULL'),
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

**Write transactions use BEGIN IMMEDIATE** (Session 4):
better-sqlite3's `.transaction()` uses `BEGIN IMMEDIATE` by default — verify during implementation. This prevents `SQLITE_BUSY` errors from read→write upgrades. Critical for `texere_create_edge` with DEPRECATED_BY.

**Periodic maintenance**:
```typescript
// Update query planner statistics after bulk operations
db.exec('ANALYZE');
// Optimize periodically
db.pragma('optimize');
```

**Cold start performance** (Session 4 research):
- better-sqlite3 setup: ~25ms (native C++ binding, file-based)
- sql.js setup: ~100-200ms (WASM init + memory load)
- better-sqlite3 is **4-8x faster** to initialize — matters for MCP server cold start

Sources:
- better-sqlite3 official docs + benchmarks
- better-sqlite3 vs sqlite3: 11.7x faster reads, 15.6x faster batch inserts (official benchmark)
- better-sqlite3 vs sql.js: 6-1000x faster across all operations (SQG, Forward Email benchmarks)
- WAL checkpoint: auto at 1000 pages (~4MB), manual via `PRAGMA wal_checkpoint(RESTART)`
- Session 4 benchmark research (2026-02-13)

### Performance Summary (REVISED Session 4)

**At 10K nodes / 50K edges** (sparse, degree ~5) with proper indexes + WAL + prepared statements:
- **95% of queries < 50ms** (graph traversal, FTS5, JOINs)
- **Node lookup: sub-millisecond** (~314K ops/sec)
- **FTS5 search: 2-20ms** (with BM25 ranking — single-digit ms typical)
- **Graph traversal 3 hops: 10-50ms** (recursive CTE, sparse graph)
- **Bulk insert 100 nodes: 5-20ms** (in transaction)
- **Total memory: ~100MB** (64MB cache + 10-50MB DB + WAL)

**At 100K nodes / 300K edges** (sparse, degree ~3) — realistic Texere at enterprise scale:
- **Node lookup: sub-millisecond** (unchanged — indexed, constant time)
- **FTS5 search: 5-20ms** (scales well to 100K docs)
- **Graph traversal 2 hops: 1-10ms**
- **Graph traversal 3 hops: 10-50ms** (sweet spot for interactive)
- **Graph traversal 5 hops: 50-200ms** (deep exploration, acceptable)
- **texere_about (FTS→CTE compound): <100ms**
- **texere_store_node: <5ms** (single insert + FTS trigger)
- **texere_create_edge (DEPRECATED_BY): <10ms** (INSERT + UPDATE in transaction)

**Performance targets for Texere tools:**

| Tool | Target Latency | Rationale |
|------|---------------|-----------|
| `texere_get_node` | <1ms | Single indexed lookup |
| `texere_search` | <20ms | Must feel instant to LLM agent |
| `texere_traverse` depth=2 | <50ms | Common neighborhood query |
| `texere_traverse` depth=3 | <200ms | Extended context |
| `texere_traverse` depth=5 | <1s | Deep exploration, agent can wait |
| `texere_about` | <100ms | Most complex compound query |
| `texere_store_node` | <5ms | Insert + FTS trigger |
| `texere_create_edge` | <10ms | INSERT + UPDATE in txn |

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

## Design Decisions (Session 2 — Feb 13 2026)

### Terminology: Nodes/Edges Everywhere
- **Schema**: `nodes`, `edges`, `node_tags` (graph-correct internals)
- **MCP tools**: `texere_store_node`, `texere_create_edge`, etc.
- **Agent prompts**: "node", "edge" consistently
- No "facts", "memories", or "relationships" — one vocabulary everywhere

### Database Location: Per-Repo
- **Path**: `.texere/texere.db` inside each repository
- **Implication**: No `project_path` column needed — DB is inherently scoped to one repo
- **File paths**: Always relative to repo root (e.g., `src/auth/jwt.ts`)
- **Trade-off**: No cross-project queries. Each repo is isolated. Acceptable for V1.

### Context: Dropped Entirely
- **No `context_json` column** on nodes table
- All context expressed through the graph structure:
  - File links → ANCHORED_TO edges to file_context/file nodes
  - Languages/frameworks → RELATED_TO edges to technology nodes
  - Git info → in node content if important
- Schema is maximally simple: no JSON blobs to query into

### MCP Tool Set (REVISED Session 3 — 9 tools)

> **Session 3 changes**: Dropped `texere_update_node` (immutable nodes) and `texere_delete_node` (eternal nodes). Added `texere_invalidate_node`. DEPRECATED_BY edge auto-invalidates source node.

| # | Tool | Purpose | Notes |
|---|------|---------|-------|
| 1 | `texere_store_node` | Create immutable node | Auto-creates ANCHORED_TO edges for `anchor_to: string[]` param. |
| 2 | `texere_get_node` | Read node by ID | Optionally includes edges with `include_edges: true` |
| 3 | `texere_invalidate_node` | Retract a node (Datomic `:db/retract`) | Sets `invalidated_at=now`. "Just wrong, no replacement." |
| 4 | `texere_create_edge` | Link two nodes | DEPRECATED_BY type auto-sets `invalidated_at` on source node. |
| 5 | `texere_invalidate_edge` | Soft-invalidate edge | Sets `invalidated_at=now`. Never deletes row. |
| 6 | `texere_search` | FTS5 search + filters | BM25 ranking. Type/tag/importance filters. |
| 7 | `texere_traverse` | Graph walk from node | Recursive CTE. Direction: outgoing/incoming/both. Max depth 5. |
| 8 | `texere_about` | Compound: search + traverse | "Tell me everything about X." FTS5 finds seed nodes, traverses neighbors. |
| 9 | `texere_stats` | Node/edge counts by type | Quick health check |

**Two invalidation paths:**
1. "Just wrong, no replacement": `texere_invalidate_node(id)` — sets `invalidated_at`
2. "Replaced": `texere_store_node(new)` + `texere_create_edge(DEPRECATED_BY)` — auto-sets `invalidated_at` on old node

- **No `texere_update_node`**: Nodes are immutable. To "update", create new node + DEPRECATED_BY edge.
- **No `texere_delete_node`**: Nodes are eternal. Garbage cleanup is DB admin, not MCP.
- **Type discovery**: Baked into skill file (LLM Quick Reference Guide). No `list_types` tool.
- **Auto-anchor**: `texere_store_node` accepts optional `anchor_to: string[]` (file paths).

### Tag Sync: SQLite Triggers
- `node_tags` table synced via INSERT/DELETE triggers on `nodes` table (no UPDATE — immutable nodes)
- Same pattern as FTS5 sync triggers
- No application code needed for tag management

### Embedding Column: In V1 Schema
- `embedding BLOB` column exists in V1 DDL but is NULL/unpopulated
- Ready for V1.5 sqlite-vec without schema migration

### Two Knowledge Layers (CRITICAL DESIGN)

**Layer 1: Structural Code Graph (Automatic, No LLM)**
- Code indexer parses repos → extracts symbols, definitions, references, imports, hierarchy
- Produces: `file` nodes, `symbol` nodes, and structural edges
- 100% deterministic, language-specific parsing (Tree-sitter based)
- No LLM involvement

**Layer 2: Semantic Knowledge Graph (LLM-assisted, Human-driven)**
- Orchestrator agent captures: decisions, research, constraints, problems, solutions
- Human and agents create: meaning, rationale, links between concepts
- LLM chooses node types and edge types using the Quick Reference Guide

**Connection**: Semantic layer links TO structural layer via ANCHORED_TO edges.
```
decision("14 edge types") --ANCHORED_TO--> symbol(RelationshipType enum)
                                                |
                                                ↓ DEFINED_IN (auto)
                                            file(models.py)
                                                |
                                                ↓ IMPORTS (auto)
                                            file(sqlite_database.py)
```
Agent querying "what do I know about RelationshipType?" gets BOTH:
- Structural: where defined, where used, its members (automatic)
- Semantic: why we simplified from 35 to 14, the rationale, the constraints (human-entered)

### Node Types (REVISED Session 3)

> **V1: 17 semantic types only.** Structural types (file, symbol, module) deferred to V2 with code indexer.

**Semantic (LLM/human-created) — V1:**
task, code_pattern, problem, solution, project, technology, error, fix, command, file_context, workflow, general, conversation, decision, requirement, constraint, research

Note: `file_context` (semantic) is a human description of a file's purpose, created by agents. Structural `file` type (indexer-created) deferred to V2.

**Structural (deferred to V2 — code indexer):**
| Type | What It Represents | Created By |
|------|-------------------|------------|
| `file` | A source code file | Code indexer |
| `symbol` | A function, class, enum, type, variable, method, field | Code indexer |
| `module` | A logical grouping (package, namespace, directory) | Code indexer |

### Edge Types (REVISED Session 3)

> **V1: Semantic types only.** SUPERSEDES renamed to DEPRECATED_BY. Structural edges deferred to V2.
> **Count: TBD** — see Open Questions (13 or 14 depending on whether SUPERSEDES→DEPRECATED_BY is a rename or a change).

**Semantic (LLM/human-created) — V1:**
RELATED_TO, CAUSES, SOLVES, REQUIRES, CONTRADICTS, BUILDS_ON, **DEPRECATED_BY** *(was SUPERSEDES)*, PREVENTS, VALIDATES, ALTERNATIVE_TO, MOTIVATED_BY, IMPLEMENTS, CONSTRAINS, ANCHORED_TO

**Structural (deferred to V2 — code indexer):**
| Edge | Meaning | Created By |
|------|---------|------------|
| `DEFINED_IN` | Symbol → File where defined | Indexer |
| `REFERENCED_IN` | Symbol → File where used | Indexer |
| `IMPORTS` | File → File (import relationship) | Indexer |
| `EXTENDS` | Symbol → Symbol (inheritance) | Indexer |
| `HAS_MEMBER` | Symbol → Symbol (enum members, class methods/fields) | Indexer |
| `CALLS` | Symbol → Symbol (function call graph) | Indexer |

### Monorepo Architecture (SUPERSEDED by Session 3 — see below)

> **⚠️ This section shows the Session 2 full-vision layout. Session 3 simplified V1 significantly.**
> **See "Session 3 Decisions → Architecture (FINAL)" for the authoritative V1 structure.**

**Session 2 full-vision layout** (V1+V2+V3 combined):
```
texere/
├── packages/
│   ├── graph/              — V1: SQLite storage, CRUD, FTS5, search, schema, types
│   ├── ingest-*/           — V2: file/doc ingestion
├── apps/
│   ├── mcp/                — V1: MCP server, tool handlers, CLI entry point
│   └── plugin/             — V3: opencode plugin + hooks
├── agents/
│   └── texere.md           — V3: Orchestrator agent
├── skills/
│   └── texere.md           — V1: Skill file (LLM Quick Reference Guide)
├── package.json, pnpm-workspace.yaml, turbo.json
```

**V1 ships ONLY**: `packages/graph/` + `apps/mcp/` + `skills/texere.md`

### Code Indexer Design (DEFERRED TO V2)

**Core contract** (`@texere/ingest-core`):
```typescript
interface LanguageIndexer {
  language: string;
  extensions: string[];
  extractSymbols(filePath: string, content: string): SymbolDef[];
  extractStructure(filePath: string, content: string): StructuralEdge[];
  extractImports(filePath: string, content: string): ImportEdge[];
}
```

**What Tree-sitter V1 gets automatically (no semantic analysis):**
- ✅ DEFINED_IN (symbol → file where defined)
- ✅ HAS_MEMBER (enum → members, class → methods/fields)
- ✅ EXTENDS (class → parent class, from syntax `class X extends Y`)
- ✅ IMPORTS (file → file, from import/require statements)
- ❌ REFERENCED_IN (needs semantic analysis — V1.5 with TS Language Service)
- ❌ CALLS (needs type resolution — V1.5 with TS Language Service)

**V1.5 adds**: TypeScript Language Service for REFERENCED_IN + CALLS (TS/JS only).
**V2 adds**: SCIP indexers for multi-language semantic analysis.

### Revised Schema (SUPERSEDED — see Temporal Model section for authoritative V1 schema)

> **⚠️ This was the Session 2 schema. Session 3 made nodes immutable and dropped `summary`, `updated_at`, `archived_at`.**
> **See "Nodes (REVISED Session 3)" in the Temporal Model section for the authoritative DDL.**

Key Session 3 changes to node schema:
- Dropped `summary` (nodes are small — title + content enough)
- Dropped `updated_at` (immutable nodes)
- Renamed `archived_at` → `invalidated_at`
- 17 semantic types in V1 (structural deferred to V2)

Note: Structural metadata (symbol_kind, file_path, start_line, etc.) deferred to V2 with code indexer. V1 nodes encode location in title + content + tags if needed.

### Plugin Architecture (DEFERRED TO V3)

> **⚠️ Session 3 moved plugin to V3.** V1 is MCP-only. Plugin + hooks come in V3 at `apps/plugin/`.

**V3 vision**: Texere is BOTH a plugin AND an MCP server, sharing the same graph library.

**Inside opencode** (V3): Plugin registers tools + lifecycle hooks → uses `@texere/graph` directly (in-process)
**Outside opencode** (V1): MCP server exposes tools via stdio → uses `@texere/graph` directly (MCP protocol)

**Monorepo packages:**
```
packages/
├── graph/              — SQLite storage, CRUD, FTS5, search (LIBRARY)
├── plugin/             — opencode plugin: hooks + tool registration (PRIMARY)
├── mcp/                — MCP server for non-opencode clients (SECONDARY)
├── ingest-core/        — Indexer interface, Tree-sitter utils, file discovery
└── ingest-typescript/  — TS/JS indexer (V1)
```

**Dependency graph:**
```
ingest-typescript → ingest-core → graph
                                    ↑
                        plugin ─────┤
                        mcp ────────┘
```

**Plugin hooks Texere uses:**

| Hook | What It Does | Texere Use Case | V1? |
|------|-------------|----------------|-----|
| `tool` (registration) | Register custom tools | All Texere tools as native opencode tools (no MCP overhead) | ✅ V1 |
| `tool.execute.before` | Before ANY tool runs | Agent reads file → inject anchored knowledge | V1.5 |
| `tool.execute.after` | After tool returns | Capture research from explore/librarian agents | V1.5 |
| `experimental.chat.system.transform` | Modify system prompt | Inject project constraints + active decisions | V1.5 |
| `experimental.session.compacting` | Add context to compaction | Ensure critical knowledge survives compaction | V1.5 |
| `chat.message` | On user message | Search KG for topic-relevant context | V2 |
| `event` | All system events | Track file edits, branch switches | V2 |

**V1 plugin scope**: Tool registration only (same tools available via plugin OR MCP). Hook-based push deferred to V1.5.
**Why**: Tool registration is simple and proven. Hook-based push requires careful design to avoid context bloat and performance issues. Ship tools first, add smart push after we have real usage data.

**Plugin registration** (in opencode.json):
```json
{
  "plugin": ["@texere/plugin"]
}
```

**Sources:**
- opencode plugin API: `@opencode-ai/plugin` v1.1.65
- Plugin loading: opencode/src/plugin/index.ts (trigger function iterates all hooks)
- Hook signatures: @opencode-ai/plugin/dist/index.d.ts
- Tool registration: @opencode-ai/plugin/dist/tool.d.ts
- Sub-agent interception confirmed: tool.execute.before fires for "task" tool

## V1 Scope (REVISED Session 3 — Feb 13 2026)

### IN — V1
- **Monorepo**: pnpm + turborepo — `packages/graph/` + `apps/mcp/` + `skills/texere.md`
- **Graph storage** + CRUD: immutable eternal nodes, edges with invalidation
- **17 semantic node types** in flat enum (structural deferred to V2)
- **Semantic edge types** in flat enum (DEPRECATED_BY replaces SUPERSEDES; structural deferred to V2)
- **9 MCP tools**: store_node, get_node, invalidate_node, create_edge, invalidate_edge, search, traverse, about, stats
- **Datomic-inspired node lifecycle**: immutable + eternal, `invalidated_at` column for fast filter, DEPRECATED_BY edges for replacement
- **FTS5 search** (full-text on title + content + tags, BM25 ranking, 3 columns — no summary)
- **Denormalized tags** (node_tags table, trigger-synced — INSERT/DELETE only, no UPDATE)
- **Recursive CTE graph traversal** (max depth 5, UNION ALL + DISTINCT recommended)
- **Per-repo database** at `.texere/texere.db`
- **Embedding column** in schema (unpopulated, ready for V1.5)
- **Skill file** with LLM Quick Reference Guide for node/edge type selection
- **Doc ingest via agents** — any agent reads docs, extracts nodes/edges, stores via MCP tools. The LLM IS the intelligence.
- **TDD**: Red → Green → Refactor, always. Framework: vitest.

### OUT — Deferred
| Version | What's Deferred |
|---------|----------------|
| **V2** | `packages/ingest-*/` — file/doc ingestion (broader than code). Structural types (file, symbol, module + 6 structural edges). |
| **V3** | `apps/plugin/` (opencode plugin + hooks) + `agents/texere.md` (orchestrator agent). Automatic push/injection. |
| **V1.5** | Embedding population + sqlite-vec vector search. |
| **Future** | Community detection / GraphRAG, advanced analytics, export/import, migration tools. |

## Plugin Packaging Research (Feb 13 2026)

### Sources
- `/home/dan/conduit-ai/libs/provider-registry/vendor/opencode/packages/opencode/src/plugin/index.ts` — Plugin loading mechanism
- `/home/dan/conduit-ai/libs/provider-registry/vendor/opencode/packages/opencode/src/config/config.ts` — Config schema
- `/home/dan/conduit-ai/libs/provider-registry/vendor/opencode/packages/plugin/src/index.ts` — Plugin API types
- `/home/dan/conduit-ai/libs/provider-registry/vendor/opencode/packages/plugin/src/tool.ts` — Tool helper
- `/home/dan/conduit-ai/libs/provider-registry/vendor/opencode/packages/plugin/src/example.ts` — Example plugin
- `/home/dan/conduit-ai/reference_repos/opencode-anthropic-auth-master/` — Real published plugin example

### How OpenCode Discovers and Loads Plugins

1. Reads `opencode.json` / `opencode.jsonc` from project root or `.opencode/`
2. Merges plugins from config layers (global → project → inline), deduplicates by canonical name
3. For each plugin specifier:
   - **`file://` URL**: Direct dynamic `import()`
   - **npm package** (e.g., `@texere/plugin@1.0.0`): Install to `~/.opencode/cache/node_modules/` via `BunProc.install()`, then import
4. Executes all exported functions matching `Plugin` type, collects returned `Hooks`

**Key loading code:**
```typescript
// From plugin/index.ts lines 51-90
for (let plugin of plugins) {
  if (!plugin.startsWith("file://")) {
    const lastAtIndex = plugin.lastIndexOf("@")
    const pkg = lastAtIndex > 0 ? plugin.substring(0, lastAtIndex) : plugin
    const version = lastAtIndex > 0 ? plugin.substring(lastAtIndex + 1) : "latest"
    plugin = await BunProc.install(pkg, version)
  }
  const mod = await import(plugin)
  for (const [_name, fn] of Object.entries<PluginInstance>(mod)) {
    const init = await fn(input)
    hooks.push(init)
  }
}
```

### Plugin Config Schema

```typescript
// From config.ts line 886
plugin: z.string().array().optional()
```

**Supported formats:**

| Format | Example | How Resolved |
|--------|---------|-------------|
| npm package | `@texere/plugin` | Installs latest from npm |
| npm + version | `@texere/plugin@1.0.0` | Installs exact version |
| file:// URL | `file:///path/to/plugin.js` | Direct import |
| Relative path | `./plugins/my-plugin.js` | Resolved via `import.meta.resolve` |

### What Plugins Must Export

```typescript
type Plugin = (input: PluginInput) => Promise<Hooks>

type PluginInput = {
  client: ReturnType<typeof createOpencodeClient>
  project: Project
  directory: string
  worktree: string
  serverUrl: URL
  $: BunShell
}
```

- Export one or more **named functions** matching `Plugin` type (all will be executed)
- Return `Hooks` object with any subset of available hooks
- Can use `tool()` helper from `@opencode-ai/plugin` for Zod-validated tool definitions

### Real Example: opencode-anthropic-auth (published npm plugin)

**Structure:**
```
opencode-anthropic-auth/
├── package.json
├── index.mjs        ← entry point (ESM, no build step!)
├── bun.lock
└── .github/workflows/publish.yml
```

**package.json:**
```json
{
  "name": "opencode-anthropic-auth",
  "version": "0.0.9",
  "main": "./index.mjs",
  "devDependencies": { "@opencode-ai/plugin": "^0.4.45" },
  "dependencies": { "@openauthjs/openauth": "^0.4.3" }
}
```

**Key observations:**
- Ships `.mjs` directly (no build step, no TypeScript compilation)
- `@opencode-ai/plugin` in devDependencies (types only at dev time)
- Can have external dependencies
- Named export (not default)

### How BunProc.install Works

1. Location: `~/.opencode/cache/node_modules/{package-name}`
2. Checks if already cached with same version
3. Uses `bun add --force --exact --cwd ~/.opencode/cache pkg@version`
4. File lock ensures single concurrent install
5. Returns absolute path to installed module

### Native Dependencies (e.g., better-sqlite3)

**Status: Supported.** Bun handles native module compilation. Plugins CAN have native deps.

**Considerations:**
- Bun compiles native addons automatically
- better-sqlite3 ships prebuilt binaries for common platforms
- Installation may be slower (compilation if no prebuilt available)
- Must test on target platforms

### DECISION: @texere/plugin Package Structure

```
packages/plugin/
├── src/
│   └── index.ts          ← Plugin entry, registers tools + hooks
├── dist/                  ← Compiled output (tsc)
├── package.json
└── tsconfig.json
```

**package.json:**
```json
{
  "name": "@texere/plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "files": ["dist"],
  "scripts": { "build": "tsc", "typecheck": "tsc --noEmit" },
  "dependencies": {
    "@opencode-ai/plugin": "^1.1.65",
    "@texere/graph": "workspace:*"
  },
  "devDependencies": {
    "@tsconfig/node22": "^22.0.0",
    "typescript": "^5.8.0"
  }
}
```

**tsconfig.json:**
```json
{
  "extends": "@tsconfig/node22/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "module": "preserve",
    "declaration": true,
    "moduleResolution": "bundler"
  },
  "include": ["src"]
}
```

**src/index.ts (skeleton):**
```typescript
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

export const TexerePlugin: Plugin = async ({ directory }) => {
  // Initialize @texere/graph with database at {directory}/.texere/texere.db
  return {
    tool: {
      texere_store_node: tool({ /* ... */ }),
      texere_search: tool({ /* ... */ }),
      texere_traverse: tool({ /* ... */ }),
      // ... all 10 tools
    },
    // V1.5: Add hooks
    // "tool.execute.before": async (input, output) => { ... },
    // "experimental.chat.system.transform": async (input, output) => { ... },
  }
}
```

### User Installation (end-user experience)

**For opencode users:**
```jsonc
// opencode.json or opencode.jsonc
{
  "plugin": ["@texere/plugin@1.0.0"]
}
```
That's it. OpenCode auto-installs via Bun, caches in `~/.opencode/cache/`.

**For local development:**
```jsonc
{
  "plugin": ["file:///path/to/texere/packages/plugin/dist/index.js"]
}
```

### Key Implications for Monorepo

1. **@texere/plugin depends on @texere/graph** (`workspace:*` in monorepo, resolved version when published)
2. **@texere/graph bundles better-sqlite3** as dependency → native dep flows through to plugin
3. **When published to npm**: Must publish @texere/graph FIRST, then @texere/plugin with resolved version
4. **When used locally**: `file://` URL works directly, pnpm workspace resolves @texere/graph
5. **@texere/mcp** is separate — standalone MCP server binary, not a plugin. For non-opencode clients.

## Session 3 Decisions (Feb 13 2026)

### Version Boundaries (FINAL)

| Version | What Ships |
|---------|-----------|
| **V1** | `packages/graph/` + `apps/mcp/` + `skills/texere.md`. TDD. Any agent uses via MCP. |
| **V2** | `packages/ingest-*/` — file/doc ingestion (broader than code). |
| **V3** | `apps/plugin/` (opencode plugin + hooks) + `agents/texere.md` (orchestrator agent). |

### Architecture (FINAL)
- **Monorepo from V1**: pnpm workspaces + turborepo
- **packages/ = libraries, apps/ = applications**
- V1 structure:
  ```
  texere/
  ├── packages/graph/       ← Library: types, schema, CRUD, FTS5, search
  ├── apps/mcp/             ← App: MCP server, tool handlers, CLI
  ├── skills/texere.md      ← Skill file (LLM Quick Reference Guide)
  ├── package.json, pnpm-workspace.yaml, turbo.json
  ```

### V1 Types (FINAL)
- **17 semantic node types** in V1: task, code_pattern, problem, solution, project, technology, error, fix, command, file_context, workflow, general, conversation, decision, requirement, constraint, research
- **Semantic edge types** in V1: RELATED_TO, CAUSES, SOLVES, REQUIRES, CONTRADICTS, BUILDS_ON, **DEPRECATED_BY** *(was SUPERSEDES)*, PREVENTS, VALIDATES, ALTERNATIVE_TO, MOTIVATED_BY, IMPLEMENTS, CONSTRAINS, ANCHORED_TO
- **Structural types DEFERRED to V2**: file, symbol, module nodes + DEFINED_IN, REFERENCED_IN, IMPORTS, EXTENDS, HAS_MEMBER, CALLS edges

### Test Strategy (FINAL)
- **TDD**: Red → Green → Refactor, always
- **Framework**: vitest

### Knowledge Capture & Doc Ingest (V1)
- Any agent can use Texere MCP tools for knowledge capture
- **Doc ingest is V1** — agent reads a doc, extracts nodes/edges, stores via MCP tools
- Same pattern as memory-graph today — no special ingest tool, no parser, the LLM IS the intelligence
- Skill file teaches agents the ingestion workflow (read → identify atomic facts → store nodes → create edges)
- No dedicated orchestrator agent (V3)
- No opencode plugin (V3)

### Plugin is an App, not a Package (CONFIRMED)
- `apps/plugin/` not `packages/plugin/`
- Same for MCP server: `apps/mcp/`

### Code Ingest Discussion (DEFERRED to V2 planning)
- Files can be more than just code — docs, markdown, whatever
- Prefers full `referenced_in` — Tree-sitter alone may not be sufficient
- Needs further discussion during V2 planning

## Bun vs Node.js Research (Feb 13 2026, Session 3)

### Finding: Bun is Runtime, Not Required Build Tool

**OpenCode architecture:**
- `bin/opencode` = Node.js launcher script
- Launches a **compiled Bun standalone binary** (`Bun.build({ compile: true })`)
- Plugins are `import()`'d inside the Bun process → execute in Bun runtime

**Plugin loading flow** (plugin/index.ts:79):
```typescript
const mod = await import(plugin)  // Standard ESM import, inside Bun runtime
```

**Key evidence:**
- Plugin SDK (`@opencode-ai/plugin`) builds with `tsc`, tsconfig extends `@tsconfig/node22`
- `tool()` helper is 100% standard zod + TypeScript (no Bun APIs)
- `$: BunShell` is passed to plugins but optional to use
- `BunProc.install()` uses `bun add` to install npm packages (opencode's side, not plugin's)

### DECISION: Build with tsc, run in Bun

- **Plugin package** (`@texere/plugin`): Build with `tsc` → standard ESM output (matches opencode plugin SDK pattern)
- **MCP server** (`@texere/mcp`): Build with `tsup` → bundled for standalone use
- **Graph library** (`@texere/graph`): Build with `tsc` → consumed by both plugin and mcp
- **No Bun-specific APIs in plugin code** — use standard Node.js APIs for portability
- **better-sqlite3 works in Bun** — native addon support confirmed
- **ESM mandatory** — `"type": "module"` everywhere
