# Texere: Knowledge Persistence for LLM Coding Agents

## TL;DR

> **Quick Summary**: Rewrite the kg-mcp project as "Texere" — a TypeScript MCP server that stores small atomic facts in a SQLite knowledge graph. Agents query it to never forget requirements, decisions, or constraints. The storage layer is a simplified TypeScript port of memory-graph's essential core (~1,500-2,500 LOC). Includes an oh-my-opencode orchestrator agent for conversational knowledge capture.
> 
> **Deliverables**:
> - SQLite property graph with FTS5 search (schema + database layer)
> - CRUD + search + relationship operations
> - MCP server exposing ~10 tools
> - oh-my-opencode orchestrator agent (`.opencode/agent/texere.md`)
> - Skill file teaching agents when/how to use Texere
> 
> **Estimated Effort**: Large (8-12 days)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 6 → Task 7 → Task 8

---

## Context

### Original Request
The user's core problem: as projects grow past a certain size, LLM coding agents lose the ability to understand them. They forget requirements, decisions made based on research, and constraints. Productivity dies.

Texere fixes this by providing a persistent knowledge graph that agents can query. Small atomic facts, heavily linked, query-optimized. The orchestrator agent helps users capture knowledge through conversation.

### Interview Summary
**Key Discussions**:
- **Knowledge types**: Small atomic facts (not documents). Decisions, constraints, requirements, findings, domain concepts.
- **Ingestion model**: Conversational via orchestrator agent (Scenario B — Active Knowledge Building). The orchestrator researches the codebase, asks intelligent questions, captures answers as linked facts.
- **Storage**: Rewrite memory-graph's essential core in TypeScript. SQLite only. FTS5 for search. SQL CTEs for graph traversal. No NetworkX.
- **Architecture**: Texere = this repo renamed. NOT an MCP wrapper around Python. Single TypeScript project.
- **Code indexing**: DROPPED. LSP does it better. Texere stores human knowledge, not code structure.
- **Agent integration**: Orchestrator is a primary oh-my-opencode agent (Tab-cycleable). Coding agents consume KG via MCP tools.

**Research Findings**:
- memory-graph (Python, 22K LOC) has a 5,123 LOC essential core → ~1,550-2,500 TypeScript lines
- 33 SQL query patterns identified and inventoried
- NetworkX is unnecessary (only used for init/counts, all traversal is SQL)
- FTS5 table exists in memory-graph but is UNUSED — we build it right from start
- oh-my-opencode agents are markdown files with YAML frontmatter (`.opencode/agent/*.md`)
- Current kg-mcp already has: better-sqlite3, MCP SDK, zod, vitest, tsup

### Metis Review
**Identified Gaps** (addressed):
- **memory-graph reference**: Available at `/tmp/memory-graph`. Builder can reference SQL queries and models.
- **Data model undefined**: Resolved — use memory-graph's 13 memory types + add decision/constraint/requirement. Use all 35 relationship types.
- **Orchestrator distribution**: v1 = documented manual copy of `.opencode/agent/texere.md`. CLI `texere init` deferred to v2.
- **Schema migration = data loss**: v1 = drop-and-recreate with version flag. Proper migrations deferred until schema stabilizes.
- **Bi-temporal scope**: v1 = relationships only. Facts get simple `created_at`/`updated_at`.
- **Fact size enforcement**: Add CHECK constraint (content max 8KB).

---

## Work Objectives

### Core Objective
Build Texere — a TypeScript MCP server that stores small atomic facts in a SQLite knowledge graph, with an oh-my-opencode orchestrator agent for conversational knowledge capture.

### Concrete Deliverables
- `src/db/schema.ts` — SQLite schema with nodes, relationships, FTS5, indexes
- `src/db/database.ts` — Database connection, initialization, migrations
- `src/db/facts.ts` — Fact CRUD operations
- `src/db/relationships.ts` — Relationship CRUD + graph traversal
- `src/db/search.ts` — FTS5 search + filtering
- `src/types.ts` — TypeScript types, Zod schemas, enums
- `src/server/server.ts` — MCP server setup
- `src/server/tools.ts` — Tool registration + handlers
- `src/cli.ts` — CLI entry point (adapted)
- `.opencode/agent/texere.md` — Orchestrator agent
- `.opencode/skills/texere.md` — Skill file for coding agents

### Definition of Done
- [ ] `pnpm build` succeeds with zero errors
- [ ] `pnpm typecheck` succeeds with zero errors
- [ ] `pnpm lint` succeeds with zero errors
- [ ] `pnpm test` succeeds with >70% coverage
- [ ] MCP server starts and lists tools via stdio protocol
- [ ] Store → search → retrieve round-trip works via MCP
- [ ] Graph traversal returns linked facts with depth control
- [ ] FTS5 search returns ranked results
- [ ] Orchestrator agent file has valid YAML frontmatter with `mode: primary`
- [ ] Skill file documents all tools with examples

### Must Have
- SQLite property graph (nodes + relationships tables)
- FTS5 full-text search with triggers for sync
- 10 MCP tools: store_fact, get_fact, update_fact, delete_fact, search_facts, create_relationship, get_related_facts, get_relationship_types, get_fact_types, get_stats
- Graph traversal via recursive CTEs with depth limit and cycle detection
- Fact types: task, code_pattern, problem, solution, project, technology, error, fix, command, file_context, workflow, general, conversation, decision, constraint, requirement
- 35 relationship types across 7 categories
- Orchestrator agent for oh-my-opencode
- Skill file for coding agents

### Must NOT Have (Guardrails)
- NO code indexing, TypeScript parsing, AST analysis, convention discovery
- NO multi-backend support (SQLite only)
- NO multi-tenancy (tenant_id, team_id, visibility)
- NO NetworkX, graphology, or any JS graph library
- NO cloud sync or remote backends
- NO migration tools or import/export
- NO advanced analytics (clustering, centrality, bridge detection)
- NO repository pattern, Unit of Work, or query builder abstractions
- NO generic types (`FactStore<T>`, `GenericRepository<Entity>`)
- NO plugin system for fact types or relationship types
- NO custom error classes or error catalogs
- NO over-documentation (JSDoc on every function, per-module READMEs)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (vitest already configured)
- **Automated tests**: YES (tests after implementation)
- **Framework**: vitest (already in devDependencies)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Database schema | Bash (vitest) | Run tests, verify table creation |
| CRUD operations | Bash (vitest) | Run tests, verify round-trip |
| MCP server | Bash (stdio protocol) | Send JSON-RPC, verify response |
| Search | Bash (vitest) | Run tests, verify FTS5 results |
| Agent file | Bash (grep/node) | Parse YAML frontmatter |
| Build | Bash (pnpm) | `pnpm build && pnpm typecheck && pnpm lint` |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Gut repo + rename to Texere
├── Task 2: Schema + types + database layer (depends: 1)
└── Task 5: Orchestrator agent + skill file (no code deps)

Wave 2 (After Task 2):
├── Task 3: Fact CRUD + relationship operations (depends: 2)
├── Task 4: FTS5 search + graph traversal (depends: 2)

Wave 3 (After Tasks 3, 4):
├── Task 6: MCP server + tool handlers (depends: 3, 4)

Wave 4 (After Task 6):
├── Task 7: Integration tests + QA (depends: 6)
└── Task 8: Final build verification (depends: 7)

Critical Path: 1 → 2 → 3 → 6 → 7 → 8
Parallel Speedup: Task 5 runs alongside 1-4
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 6 | 5 |
| 2 | 1 | 3, 4, 6 | 5 |
| 3 | 2 | 6 | 4, 5 |
| 4 | 2 | 6 | 3, 5 |
| 5 | None | None | 1, 2, 3, 4 |
| 6 | 3, 4 | 7 | None |
| 7 | 6, 5 | 8 | None |
| 8 | 7 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 5 | task(category="quick") for 1; task(category="deep") for 2; task(category="writing") for 5 |
| 2 | 3, 4 | task(category="deep") for both, parallel |
| 3 | 6 | task(category="deep") |
| 4 | 7, 8 | task(category="unspecified-high") for 7; task(category="quick") for 8 |

---

## TODOs

- [ ] 1. Gut repo and rename to Texere

  **What to do**:
  - Delete ALL files in `src/` except preserve the MCP server pattern from `src/server/server.ts` (lines 15-34) and `src/server/tools.ts` (lines 40-123) as reference
  - Delete all test files in `src/`
  - Update `package.json`: name → `@texere/mcp`, description → "Knowledge graph MCP server for LLM coding agents"
  - Remove unused dependencies: `ignore`, `typescript` (keep as devDep only)
  - Keep all devDependencies and build config files unchanged
  - Create new `src/` directory structure:
    ```
    src/
    ├── cli.ts           (adapt from existing)
    ├── types.ts          (new)
    ├── db/
    │   ├── database.ts   (new)
    │   ├── schema.ts     (new)
    │   ├── facts.ts      (new)
    │   ├── relationships.ts (new)
    │   └── search.ts     (new)
    └── server/
        ├── server.ts     (new, based on existing pattern)
        └── tools.ts      (new, based on existing pattern)
    ```
  - Update `.opencode/skills/kg-mcp.md` filename to `texere.md` (content updated in Task 5)
  - Verify: `pnpm build` and `pnpm typecheck` pass (with empty/stub source files)

  **Must NOT do**:
  - Do NOT preserve any existing database schema, types, or query code
  - Do NOT keep any ingestion, convention, connector, or watcher code
  - Do NOT change build tooling config (tsup, vitest, eslint, prettier)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletion and package.json edits — straightforward, no complex logic
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit after cleanup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 5)
  - **Blocks**: Tasks 2, 3, 4, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/server/server.ts:15-34` — MCP server creation pattern to preserve conceptually (createServer, StdioServerTransport)
  - `src/server/tools.ts:40-123` — Tool registration pattern to preserve conceptually (ListToolsRequestSchema, CallToolRequestSchema, zodToJsonSchema)
  - `src/cli.ts:1-64` — CLI entry point pattern to adapt

  **API/Type References**:
  - `package.json:1-60` — Current dependencies and scripts to modify

  **Acceptance Criteria**:
  - [ ] All `src/ingest/`, `src/conventions/`, `src/connectors/`, `src/sources/`, `src/remote/`, `src/tools/` directories deleted
  - [ ] `package.json` name is `@texere/mcp`
  - [ ] New `src/` directory structure created with stub files (empty exports)
  - [ ] `pnpm typecheck` passes (stubs compile)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Repo is clean and buildable
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: ls src/ — verify only cli.ts, types.ts, db/, server/ exist
      2. Run: ls src/db/ — verify database.ts, schema.ts, facts.ts, relationships.ts, search.ts
      3. Run: ls src/server/ — verify server.ts, tools.ts
      4. Run: grep -q "@texere/mcp" package.json
      5. Run: pnpm typecheck
    Expected Result: All checks pass, no old files remain
    Evidence: Terminal output captured

  Scenario: No old code remains
    Tool: Bash
    Preconditions: Task complete
    Steps:
      1. Run: find src -name "*.ts" | xargs grep -l "ingest\|convention\|connector\|watcher\|symbol\|module_deps" || echo "clean"
      2. Assert: output is "clean"
    Expected Result: Zero references to old domain concepts
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `refactor: gut kg-mcp codebase, rename to Texere`
  - Files: `src/`, `package.json`, `.opencode/skills/`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 2. Schema + types + database layer

  **What to do**:
  - Create `src/types.ts` with:
    - `FactType` Zod enum: task, code_pattern, problem, solution, project, technology, error, fix, command, file_context, workflow, general, conversation, decision, constraint, requirement (16 types)
    - `RelationshipType` Zod enum: all 35 types across 7 categories (causal, solution, context, learning, similarity, workflow, quality)
    - `Fact` interface: id, type, title, content (max 8KB), summary?, tags[], context? (project_path?, files_involved?[], languages?[], frameworks?[], git_commit?, git_branch?), importance (0-1), confidence (0-1), created_at, updated_at
    - `Relationship` interface: id, from_fact_id, to_fact_id, type, strength (0-1), confidence (0-1), context?, created_at, valid_from, valid_until?, recorded_at, invalidated_by?
    - `SearchQuery` interface: query?, types?[], tags?[], project_path_prefix?, file_path_prefix?, min_importance?, limit, offset
    - Zod schemas for all MCP tool inputs
  - Create `src/db/schema.ts` with:
    - `nodes` table: id TEXT PK, label TEXT, properties TEXT (JSON), created_at INTEGER, updated_at INTEGER
    - `relationships` table: id TEXT PK, from_id TEXT FK, to_id TEXT FK, rel_type TEXT, properties TEXT (JSON), created_at INTEGER, valid_from INTEGER, valid_until INTEGER?, recorded_at INTEGER, invalidated_by TEXT?
    - `nodes_fts` FTS5 virtual table: id UNINDEXED, title, content, summary, tags
    - FTS5 sync triggers: AFTER INSERT, AFTER DELETE, AFTER UPDATE on nodes
    - Indexes: idx_nodes_label, idx_rel_from, idx_rel_to, idx_rel_type, idx_nodes_type (json_extract), idx_nodes_project_path (json_extract)
    - CHECK constraint on content size (8KB max)
    - SCHEMA_VERSION constant
  - Create `src/db/database.ts` with:
    - `createDatabase(dbPath)` → better-sqlite3 Database (WAL mode, foreign keys ON)
    - Schema creation and version check (drop-and-recreate on mismatch — acceptable for v1)
    - `closeDatabase(db)` for clean shutdown
  - Write tests in `src/db/__tests__/schema.test.ts`:
    - Schema creates all tables correctly
    - FTS5 virtual table exists
    - Indexes exist
    - Schema version is set
    - Re-creation on version mismatch works
    - CHECK constraint on content size works

  **Must NOT do**:
  - Do NOT add multi-tenant fields (tenant_id, team_id, visibility)
  - Do NOT add bi-temporal fields to facts (only relationships have them)
  - Do NOT create abstract database interfaces or repository patterns
  - Do NOT use an ORM or query builder — raw prepared statements only

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core schema design with FTS5, triggers, and indexes requires careful SQL craftsmanship
  - **Skills**: [`kg-mcp`]
    - `kg-mcp`: Context about the project's database patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Parallel Group**: Wave 1 (sequential after Task 1)
  - **Blocks**: Tasks 3, 4, 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `/tmp/memory-graph/src/memorygraph/backends/sqlite_fallback.py:156-228` — SQLite schema with nodes, relationships, FTS5 stub, indexes. Copy the table structure but fix the FTS5 (add triggers, fix content_rowid)
  - `/tmp/memory-graph/src/memorygraph/models.py:14-82` — MemoryType and RelationshipType enums. Port these as Zod enums in TypeScript
  - `/tmp/memory-graph/src/memorygraph/models.py:209-266` — Memory model fields. Port essential fields as TypeScript interface
  - `/tmp/memory-graph/src/memorygraph/models.py:295-368` — Relationship + RelationshipProperties. Port with bi-temporal fields
  - `/tmp/memory-graph/src/memorygraph/models.py:447-491` — SearchQuery model. Port and add prefix query fields
  - `src/db/database.ts` (old, for reference only) — The `createDatabase()` pattern with WAL + foreign_keys + version check

  **External References**:
  - SQLite FTS5: https://www.sqlite.org/fts5.html — External content tables, triggers, MATCH syntax
  - SQLite JSON: https://www.sqlite.org/json1.html — json_extract, json_each for property queries

  **Acceptance Criteria**:
  - [ ] `pnpm typecheck` passes with all types defined
  - [ ] Schema test creates database with all tables: nodes, relationships, nodes_fts
  - [ ] FTS5 trigger test: INSERT node → searchable via `SELECT * FROM nodes_fts WHERE nodes_fts MATCH 'test'`
  - [ ] FTS5 trigger test: DELETE node → no longer in FTS5 results
  - [ ] FTS5 trigger test: UPDATE node → FTS5 reflects new content
  - [ ] CHECK constraint test: INSERT with content > 8KB → fails
  - [ ] Schema version test: wrong version → tables recreated
  - [ ] `pnpm test -- src/db/__tests__/schema.test.ts` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Schema creates all tables with correct structure
    Tool: Bash (vitest)
    Preconditions: Task 1 complete
    Steps:
      1. Run: pnpm test -- src/db/__tests__/schema.test.ts
      2. Assert: all tests pass
      3. Assert: test output mentions "nodes", "relationships", "nodes_fts"
    Expected Result: All schema tests pass
    Evidence: Terminal output captured

  Scenario: FTS5 triggers keep search index in sync
    Tool: Bash (vitest)
    Preconditions: Schema tests pass
    Steps:
      1. Run: pnpm test -- --grep "fts5"
      2. Assert: INSERT/UPDATE/DELETE sync tests all pass
    Expected Result: FTS5 index always reflects current node state
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(db): add SQLite schema with property graph, FTS5, and type definitions`
  - Files: `src/types.ts`, `src/db/schema.ts`, `src/db/database.ts`, `src/db/__tests__/schema.test.ts`
  - Pre-commit: `pnpm test -- src/db/__tests__/schema.test.ts`

---

- [ ] 3. Fact CRUD + relationship operations

  **What to do**:
  - Create `src/db/facts.ts` with:
    - `storeFact(db, fact: Omit<Fact, 'id' | 'created_at' | 'updated_at'>)` → Fact (generates UUID, sets timestamps, serializes to JSON properties, inserts into nodes)
    - `getFact(db, id: string)` → Fact | null (deserializes JSON properties)
    - `updateFact(db, id: string, updates: Partial<Pick<Fact, 'title' | 'content' | 'summary' | 'tags' | 'importance' | 'confidence' | 'context'>>)` → Fact (merges, updates timestamp)
    - `deleteFact(db, id: string)` → boolean (cascade deletes relationships first)
    - `getFactsByType(db, type: FactType, limit?: number)` → Fact[]
    - `getFactsByTag(db, tag: string, limit?: number)` → Fact[]
  - Create `src/db/relationships.ts` with:
    - `createRelationship(db, from_id, to_id, type, props?)` → Relationship (validates both facts exist, checks for cycles if needed, generates UUID, sets bi-temporal fields)
    - `getRelatedFacts(db, fact_id, opts?: { types?: RelationshipType[], depth?: number })` → Fact[] (recursive CTE with depth limit and cycle detection via path array)
    - `invalidateRelationship(db, id, invalidated_by?)` → boolean (sets valid_until)
    - `getRelationshipHistory(db, fact_id)` → Relationship[] (includes invalidated)
  - Write tests:
    - `src/db/__tests__/facts.test.ts` — CRUD round-trip, type filtering, tag filtering, content size limit
    - `src/db/__tests__/relationships.test.ts` — Create, get related (depth 1, 2, 3), cycle detection, invalidation, history

  **Must NOT do**:
  - Do NOT add repository pattern abstraction — functions take `db: Database.Database` directly
  - Do NOT add batch operations — single-fact operations only for v1
  - Do NOT add import/export functionality
  - Do NOT use generic types (`store<T>(db, entity)`)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Graph traversal CTEs and cycle detection require careful SQL and thorough testing
  - **Skills**: [`kg-mcp`]
    - `kg-mcp`: Context about the project

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:193-258` — store_memory implementation (check existence, INSERT/UPDATE, JSON serialization)
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:260-293` — get_memory implementation (SELECT by ID, JSON deserialization)
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:844-900` — update_memory implementation (fetch, merge, save)
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:903-950` — delete_memory implementation (cascade delete relationships first)
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:952-1088` — create_relationship (validate existence, cycle check, INSERT with bi-temporal)
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:1089-1208` — get_related_memories (JOIN with CASE for direction, temporal filter, strength ordering)
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:1210-1260` — invalidate_relationship (SET valid_until)

  **External References**:
  - SQLite recursive CTEs: https://www.sqlite.org/lang_with.html — WITH RECURSIVE for graph traversal

  **WHY Each Reference Matters**:
  - sqlite_database.py:193-258 — Shows the exact JSON serialization pattern for storing node properties
  - sqlite_database.py:952-1088 — Shows cycle detection logic and bi-temporal field initialization
  - sqlite_database.py:1089-1208 — Shows the CASE-based bidirectional relationship query (critical for get_related_facts)

  **Acceptance Criteria**:
  - [ ] Store → get round-trip: stored fact matches retrieved fact (all fields)
  - [ ] Update: changes title/content/tags, updated_at changes, created_at unchanged
  - [ ] Delete: fact gone, relationships cascade deleted
  - [ ] getFactsByType returns only matching type
  - [ ] getFactsByTag returns only matching tag
  - [ ] createRelationship: both facts must exist (error if not)
  - [ ] getRelatedFacts depth=1: returns direct neighbors only
  - [ ] getRelatedFacts depth=3: returns 3-hop neighbors
  - [ ] getRelatedFacts with cycle: does NOT infinite-loop (returns within 1s)
  - [ ] invalidateRelationship sets valid_until
  - [ ] `pnpm test -- src/db/__tests__/facts.test.ts src/db/__tests__/relationships.test.ts` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Fact CRUD round-trip works correctly
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test -- src/db/__tests__/facts.test.ts
      2. Assert: all tests pass
    Expected Result: Store/get/update/delete all work
    Evidence: Terminal output captured

  Scenario: Graph traversal handles cycles safely
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test -- --grep "cycle"
      2. Assert: test passes within 5 seconds (no hang)
    Expected Result: Cycle detection prevents infinite recursion
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(db): add fact CRUD and relationship operations with graph traversal`
  - Files: `src/db/facts.ts`, `src/db/relationships.ts`, `src/db/__tests__/facts.test.ts`, `src/db/__tests__/relationships.test.ts`
  - Pre-commit: `pnpm test -- src/db/__tests__/`

---

- [ ] 4. FTS5 search + prefix queries

  **What to do**:
  - Create `src/db/search.ts` with:
    - `searchFacts(db, query: SearchQuery)` → Fact[] (builds dynamic WHERE clause)
      - FTS5 MATCH for text search (with relevance ranking via `rank`)
      - Type filtering via `json_extract(properties, '$.type') IN (?)`
      - Tag filtering via `json_extract(properties, '$.tags') LIKE ?`
      - Project path PREFIX matching via `json_extract(properties, '$.context.project_path') LIKE ?`
      - File path PREFIX matching via `EXISTS (SELECT 1 FROM json_each(json_extract(properties, '$.context.files_involved')) WHERE value LIKE ?)`
      - Importance filter via `CAST(json_extract(properties, '$.importance') AS REAL) >= ?`
      - Ordered by importance DESC, then FTS5 rank
      - Limit + offset pagination
    - `searchFactsByFile(db, pathPrefix: string)` → Fact[] (shortcut for common query)
    - `getStats(db)` → { totalFacts, byType, totalRelationships, avgImportance }
  - Write tests in `src/db/__tests__/search.test.ts`:
    - FTS5 search returns matching facts
    - FTS5 phrase search works
    - FTS5 prefix search works (e.g., "auth*")
    - Type filter works
    - Tag filter works
    - Project path prefix works (e.g., "src/auth/" matches "src/auth/jwt.ts")
    - File path prefix works
    - Importance filter works
    - Combined filters work (type + tag + text)
    - Pagination works (limit, offset)
    - Empty results return empty array

  **Must NOT do**:
  - Do NOT implement fuzzy stemming in TypeScript — FTS5 handles this
  - Do NOT add vector/embedding search
  - Do NOT add analytics queries (avg, distributions, etc.) beyond basic stats

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: FTS5 query building and json_each for array searching require careful SQL
  - **Skills**: [`kg-mcp`]
    - `kg-mcp`: Context about the project

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:295-515` — search_memories implementation (dynamic WHERE builder, fuzzy patterns, type/tag/project_path filters, ordering, pagination). This is the MOST IMPORTANT reference — port the query building logic but replace LIKE with FTS5 MATCH
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:424-426` — Current project_path exact match (change to LIKE prefix)
  - `/tmp/memory-graph/src/memorygraph/sqlite_database.py:1666-1735` — get_memory_statistics (COUNT, GROUP BY, AVG queries)

  **External References**:
  - SQLite FTS5 MATCH syntax: https://www.sqlite.org/fts5.html#full_text_query_syntax
  - SQLite json_each: https://www.sqlite.org/json1.html#jeach — For array searching in files_involved

  **Acceptance Criteria**:
  - [ ] FTS5 search: query "authentication" finds fact with title "Auth tokens expire in 15 minutes"
  - [ ] FTS5 prefix: query "auth*" finds facts starting with "auth"
  - [ ] Type filter: `types: ['decision']` returns only decisions
  - [ ] Tag filter: `tags: ['security']` returns only security-tagged facts
  - [ ] Path prefix: `project_path_prefix: 'src/auth'` finds facts about `src/auth/jwt.ts`
  - [ ] Combined: text + type + tag returns intersection
  - [ ] Stats: returns correct totals
  - [ ] `pnpm test -- src/db/__tests__/search.test.ts` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: FTS5 search finds relevant facts
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test -- src/db/__tests__/search.test.ts
      2. Assert: all tests pass
    Expected Result: Search by text, type, tag, path all work
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(db): add FTS5 search with prefix queries and filtering`
  - Files: `src/db/search.ts`, `src/db/__tests__/search.test.ts`
  - Pre-commit: `pnpm test -- src/db/__tests__/search.test.ts`

---

- [ ] 5. Orchestrator agent + skill file

  **What to do**:
  - Create `.opencode/agent/texere.md` with:
    - YAML frontmatter: `mode: primary`, `color: "#8B5CF6"`, tools configuration
    - System prompt that teaches the agent to:
      1. Research the codebase first (delegate to explore/librarian subagents)
      2. Ask intelligent questions based on findings
      3. Capture answers as small atomic facts via MCP tools
      4. Link facts to each other and to code files
      5. Never store large documents — only small atomic facts
      6. Always confirm with the user before storing
    - Include: when to use each fact type, relationship type selection guide, example conversation flows
  - Create `.opencode/skills/texere.md` with:
    - YAML frontmatter for skill metadata
    - Decision table: KG vs LSP (when to use which)
    - All MCP tool descriptions with input/output schemas
    - Example queries for common scenarios
    - "When NOT to use Texere" section
    - Workflow examples: refactoring safety, new feature context, domain understanding
  - Delete old `.opencode/skills/kg-mcp.md`

  **Must NOT do**:
  - Do NOT create a TypeScript agent factory function — use markdown file format
  - Do NOT add complex agent logic — the prompt IS the logic
  - Do NOT make the orchestrator dependent on Texere code being built (it's a markdown file)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: System prompt design is creative writing with technical constraints
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (independent of code tasks)
  - **Blocks**: Task 7 (integration testing)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `.opencode/skills/kg-mcp.md` (current, 260 lines) — Existing skill file format. Follow same structure: decision table, tool descriptions, workflows, anti-patterns
  - `/tmp/oh-my-opencode/AGENTS.md` — How agents are documented, what metadata they expose
  - The Prometheus system prompt in this session — Example of a well-structured agent prompt with interview mode, research delegation, structured output

  **Documentation References**:
  - opencode agent docs: `.opencode/agent/*.md` format with YAML frontmatter (mode, color, tools)

  **WHY Each Reference Matters**:
  - kg-mcp.md — The EXACT format we need to follow for the skill file (it works, just needs content update)
  - AGENTS.md — Shows what metadata other agents expose (description, triggers, cost) — the orchestrator needs similar

  **Acceptance Criteria**:
  - [ ] `.opencode/agent/texere.md` exists with valid YAML frontmatter
  - [ ] Frontmatter contains `mode: primary`
  - [ ] Prompt is >200 lines (comprehensive enough for orchestration)
  - [ ] `.opencode/skills/texere.md` exists with tool descriptions for all 10 tools
  - [ ] Skill file includes "When NOT to use" section
  - [ ] Old `kg-mcp.md` skill file is deleted

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Agent file has valid YAML frontmatter
    Tool: Bash
    Steps:
      1. Run: head -5 .opencode/agent/texere.md
      2. Assert: starts with "---"
      3. Run: grep -q "mode: primary" .opencode/agent/texere.md
      4. Assert: exit code 0
    Expected Result: Valid primary agent definition
    Evidence: Terminal output captured

  Scenario: Skill file covers all tools
    Tool: Bash
    Steps:
      1. Run: grep -c "store_fact\|get_fact\|search_facts\|create_relationship\|get_related" .opencode/skills/texere.md
      2. Assert: count >= 5
    Expected Result: All major tools documented
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat: add Texere orchestrator agent and skill file`
  - Files: `.opencode/agent/texere.md`, `.opencode/skills/texere.md`
  - Pre-commit: none

---

- [ ] 6. MCP server + tool handlers

  **What to do**:
  - Create `src/server/server.ts` with:
    - `createServer(projectPath)` → Server + Database (existing pattern)
    - StdioServerTransport setup
    - Database path: `{projectPath}/.texere/knowledge.db`
    - No background ingestion (unlike old kg-mcp — Texere is write-on-demand)
  - Create `src/server/tools.ts` with 10 tools:
    1. `texere_store_fact` — Store a new fact (type, title, content, tags?, context?, importance?)
    2. `texere_get_fact` — Get fact by ID (include relationships?)
    3. `texere_update_fact` — Update fact fields
    4. `texere_delete_fact` — Delete fact and cascade relationships
    5. `texere_search_facts` — FTS5 search with filters (query, types, tags, path_prefix, importance)
    6. `texere_create_relationship` — Link two facts (type, strength?, context?)
    7. `texere_get_related_facts` — Get facts linked to a fact (types?, depth?)
    8. `texere_get_relationship_types` — List all 35 relationship types with categories
    9. `texere_get_fact_types` — List all 16 fact types
    10. `texere_get_stats` — Database statistics (total facts, by type, total relationships)
  - Each tool: Zod input schema, handler function, text response with JSON payload
  - Update `src/cli.ts` to use new server
  - Write integration test in `src/server/__tests__/protocol.test.ts`:
    - Server starts and lists all 10 tools
    - store_fact → get_fact round-trip via MCP protocol
    - search_facts returns results via MCP protocol
    - create_relationship → get_related_facts via MCP protocol

  **Must NOT do**:
  - Do NOT expose internal database operations as tools (no raw SQL tools)
  - Do NOT add more than 10 tools for v1
  - Do NOT add authentication or rate limiting
  - Do NOT add background processes or file watching

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: MCP protocol integration with multiple tools, Zod schemas, and handler dispatch
  - **Skills**: [`kg-mcp`]
    - `kg-mcp`: Context about the project's MCP patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 3 and 4)
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 4

  **References**:

  **Pattern References**:
  - `src/server/server.ts` (old, preserved as reference in Task 1) — createServer pattern, StdioServerTransport, registerTools call
  - `src/server/tools.ts` (old, preserved as reference in Task 1) — ListToolsRequestSchema, CallToolRequestSchema, zodToJsonSchema, switch dispatch
  - `/tmp/memory-graph/src/memorygraph/server.py:1-721` — Tool definitions with descriptions and input schemas. Port the 12 tool definitions but adapt to our 10-tool set
  - `/tmp/memory-graph/src/memorygraph/tools/memory_tools.py:26-254` — CRUD handler pattern (validate input, call DB, format response)
  - `/tmp/memory-graph/src/memorygraph/tools/search_tools.py:25-315` — Search handler pattern (build SearchQuery, call DB, format with metadata)
  - `/tmp/memory-graph/src/memorygraph/tools/relationship_tools.py:24-125` — Relationship handler pattern

  **API/Type References**:
  - `@modelcontextprotocol/sdk` — Server, StdioServerTransport, CallToolRequestSchema, ListToolsRequestSchema
  - `zod-to-json-schema` — zodToJsonSchema for tool input schemas

  **Acceptance Criteria**:
  - [ ] `pnpm build` succeeds
  - [ ] MCP server lists 10 tools when queried with `tools/list`
  - [ ] store_fact creates fact, returns fact with ID
  - [ ] get_fact retrieves stored fact
  - [ ] search_facts finds fact by text query
  - [ ] create_relationship links two facts
  - [ ] get_related_facts returns linked facts
  - [ ] `pnpm test -- src/server/__tests__/protocol.test.ts` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: MCP server starts and lists tools
    Tool: Bash
    Preconditions: pnpm build succeeds
    Steps:
      1. Run: echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 5 node dist/cli.js --project /tmp/texere-test 2>/dev/null
      2. Assert: response contains "texere_store_fact"
      3. Assert: response contains "texere_search_facts"
      4. Assert: response contains 10 tool definitions
    Expected Result: All 10 tools listed
    Evidence: Response JSON captured

  Scenario: Full round-trip via MCP protocol
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test -- src/server/__tests__/protocol.test.ts
      2. Assert: all tests pass
    Expected Result: Store → search → get → relate → get_related all work via MCP
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(server): add MCP server with 10 knowledge graph tools`
  - Files: `src/server/server.ts`, `src/server/tools.ts`, `src/cli.ts`, `src/server/__tests__/protocol.test.ts`
  - Pre-commit: `pnpm test`

---

- [ ] 7. Integration tests + full QA

  **What to do**:
  - Run full test suite: `pnpm test`
  - Run full build: `pnpm build && pnpm typecheck && pnpm lint`
  - Write integration test `src/__tests__/integration.test.ts` that exercises the full workflow:
    1. Create database
    2. Store 5+ facts of different types
    3. Create relationships between them
    4. Search by text, type, tag, path prefix
    5. Get related facts with depth traversal
    6. Delete a fact, verify cascade
    7. Verify stats are correct
  - Fix any failing tests or lint errors
  - Verify coverage >70%

  **Must NOT do**:
  - Do NOT add new features — only test and fix
  - Do NOT refactor working code for style
  - Do NOT add performance benchmarks (v2)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration testing across all components requires broad understanding
  - **Skills**: [`kg-mcp`]
    - `kg-mcp`: Context about the project

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 6, 5

  **References**:

  **Pattern References**:
  - `src/__tests__/integration.test.ts` (old, for format reference) — Integration test pattern

  **Acceptance Criteria**:
  - [ ] `pnpm test` passes with >70% coverage
  - [ ] `pnpm build` succeeds
  - [ ] `pnpm typecheck` succeeds
  - [ ] `pnpm lint` succeeds
  - [ ] Integration test exercises full workflow (store → relate → search → traverse → delete)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. Run: pnpm test -- --coverage
      2. Assert: all tests pass
      3. Assert: coverage > 70%
      4. Run: pnpm build
      5. Assert: exit code 0
      6. Run: pnpm typecheck
      7. Assert: exit code 0
      8. Run: pnpm lint
      9. Assert: exit code 0
    Expected Result: All quality gates pass
    Evidence: Terminal output with coverage report captured
  ```

  **Commit**: YES
  - Message: `test: add integration tests, verify full QA`
  - Files: `src/__tests__/integration.test.ts`, any fixes
  - Pre-commit: `pnpm test && pnpm build && pnpm typecheck && pnpm lint`

---

- [ ] 8. Final build verification

  **What to do**:
  - Clean build: `rm -rf dist && pnpm build`
  - Verify CLI works: `node dist/cli.js --help`
  - Verify MCP server starts: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/cli.js --project /tmp/texere-verify`
  - Update README.md with new project name, description, tool list
  - Update AGENTS.md to reference Texere tools instead of kg-mcp tools

  **Must NOT do**:
  - Do NOT add new features
  - Do NOT change any source code
  - Do NOT add CI/CD configuration (v2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification and documentation updates only
  - **Skills**: [`git-master`]
    - `git-master`: Final commit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential after Task 7)
  - **Blocks**: None
  - **Blocked By**: Task 7

  **References**:

  **Documentation References**:
  - `README.md` — Current README to update
  - `AGENTS.md` — Current AGENTS.md to update

  **Acceptance Criteria**:
  - [ ] `rm -rf dist && pnpm build` succeeds
  - [ ] `node dist/cli.js --help` prints usage
  - [ ] MCP server responds to tools/list with 10 tools
  - [ ] README.md references "Texere" not "kg-mcp"
  - [ ] AGENTS.md references Texere tools

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Production build works end-to-end
    Tool: Bash
    Steps:
      1. Run: rm -rf dist && pnpm build
      2. Assert: exit code 0
      3. Run: echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 5 node dist/cli.js --project /tmp/texere-final 2>/dev/null
      4. Assert: response contains "texere_store_fact"
      5. Assert: response contains 10 tools
    Expected Result: Built binary serves MCP correctly
    Evidence: Response JSON captured
  ```

  **Commit**: YES
  - Message: `docs: update README and AGENTS.md for Texere`
  - Files: `README.md`, `AGENTS.md`
  - Pre-commit: `pnpm build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor: gut kg-mcp codebase, rename to Texere` | src/, package.json | pnpm typecheck |
| 2 | `feat(db): add SQLite schema with property graph, FTS5, and type definitions` | src/types.ts, src/db/ | pnpm test |
| 3 | `feat(db): add fact CRUD and relationship operations with graph traversal` | src/db/facts.ts, src/db/relationships.ts | pnpm test |
| 4 | `feat(db): add FTS5 search with prefix queries and filtering` | src/db/search.ts | pnpm test |
| 5 | `feat: add Texere orchestrator agent and skill file` | .opencode/agent/, .opencode/skills/ | — |
| 6 | `feat(server): add MCP server with 10 knowledge graph tools` | src/server/, src/cli.ts | pnpm test |
| 7 | `test: add integration tests, verify full QA` | src/__tests__/ | pnpm test + build + lint |
| 8 | `docs: update README and AGENTS.md for Texere` | README.md, AGENTS.md | pnpm build |

---

## Success Criteria

### Verification Commands
```bash
pnpm build        # Expected: dist/ created, zero errors
pnpm typecheck    # Expected: zero type errors
pnpm lint         # Expected: zero lint errors
pnpm test         # Expected: all tests pass, >70% coverage

# MCP server verification
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/cli.js --project /tmp/test
# Expected: JSON response with 10 tools
```

### Final Checklist
- [ ] All "Must Have" features present (10 tools, FTS5, graph traversal, orchestrator, skill file)
- [ ] All "Must NOT Have" absent (no code indexing, no multi-backend, no analytics)
- [ ] All tests pass with >70% coverage
- [ ] Build succeeds
- [ ] Lint passes
- [ ] Type check passes
- [ ] MCP server starts and responds
- [ ] Orchestrator agent has valid frontmatter
- [ ] Skill file documents all tools
