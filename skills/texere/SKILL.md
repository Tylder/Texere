---
name: texere
description:
  Persistent knowledge graph for LLM agents - store typed nodes (type+role pairs like
  knowledge/decision) with semantic edges (RESOLVES, DEPENDS_ON, ANCHORED_TO). Use for cross-session
  memory, linking solutions to problems, anchoring to code, deprecation tracking.
license: MIT
compatibility: opencode
metadata:
  author: dan
  category: knowledge-management
---

# Texere: LLM Quick Reference Guide

## What is Texere?

Texere is a **persistent knowledge graph for LLM coding agents**, designed to store and retrieve
structured knowledge across sessions. Unlike conversation memory (ephemeral, session-bound) or file
systems (unstructured, no semantic relationships), Texere provides immutable, semantically-typed
nodes connected by meaningful edges. Use Texere when you need to: (1) preserve decisions,
requirements, or constraints across sessions, (2) link solutions to problems they solve, (3) anchor
knowledge to specific code locations, (4) track what's been deprecated or replaced, or (5) build a
queryable web of project knowledge that survives beyond a single conversation.

---

## Required Workflow: Search Before Creating

**You MUST search the graph before creating any node.** Creating nodes without first understanding
existing state leads to duplicates, missed connections, and graph degradation.

**Mandatory workflow for every node creation:**

1. **Search first** using `texere_search` or `texere_about` with terms from your intended node's
   title and tags
2. **Review results** for three critical questions:
   - **Duplicates**: Does an equivalent node already exist? → Use it, don't duplicate
   - **Deprecation**: Does an outdated version exist? → Use `texere_replace_node` to atomically
     replace it, or create new node + `REPLACES` edge to invalidate the old one
   - **Connections**: Are there related nodes this should connect to? → Note their IDs for edge
     creation
3. **Create the node** with `texere_store_node` only after reviewing search results
4. **Create edges immediately** to link the new node to related nodes identified in step 2

**Why this matters**: The graph's value comes from connections, not isolated nodes. Searching first
ensures you see the existing graph structure, avoid duplicates, identify deprecation opportunities,
and discover edge candidates. Skipping this step produces a fragmented collection of notes instead
of a connected knowledge web.

**Example**:

```json
// 1. Search first
texere_search({ "query": "SQLite storage concurrency", "type": "knowledge", "role": "decision", "limit": 10 })

// 2. Review: Found "Use SQLite with WAL mode" (decision_abc) and "Handle database locking" (problem_xyz)

// 3. Create node
texere_store_node({
  "type": "action",
  "role": "solution",
  "title": "Add connection pooling for concurrent writes",
  "content": "Implemented connection pool with max 5 connections...",
  "tags": ["sqlite", "concurrency", "performance"]
})
// Returns: { node: { id: "solution_123", type: "action", role: "solution", ... } }

// 4. Create edges to nodes found in search
texere_create_edge({ "edges": { "source_id": "solution_123", "target_id": "problem_xyz", "type": "RESOLVES" } })
texere_create_edge({ "edges": { "source_id": "solution_123", "target_id": "decision_abc", "type": "EXTENDS" } })
```

---

## Node Type & Role System

Texere uses a **type + role** system with 6 core types and 20 roles. Each type constrains which
roles are valid.

**Decision Tree:**

```
Is it KNOWLEDGE? → type: knowledge, role: decision | requirement | constraint | principle | finding | research
Is it a PROBLEM? → type: issue, role: problem | error
Is it an ACTION? → type: action, role: task | solution | fix | workflow | command
Is it an ARTIFACT? → type: artifact, role: example | code_pattern | technology | project | file_context
Is it CONVERSATION? → type: context, role: conversation
Is it SYSTEM? → type: meta, role: system
```

**Type-Role Constraint Matrix:**

| Type (`NodeType`) | Valid Roles (`NodeRole`)                                                    | Use When                                    |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `knowledge`       | `decision`, `requirement`, `constraint`, `principle`, `finding`, `research` | Storing decisions, requirements, principles |
| `issue`           | `problem`, `error`                                                          | Recording problems or errors                |
| `action`          | `task`, `solution`, `fix`, `workflow`, `command`                            | Tracking tasks, solutions, workflows        |
| `artifact`        | `example`, `code_pattern`, `technology`, `project`, `file_context`          | Documenting code, tools, projects           |
| `context`         | `conversation`                                                              | Session-specific context                    |
| `meta`            | `system`                                                                    | System-level metadata                       |

**Role Examples:**

| Type + Role                 | Example                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `knowledge` + `decision`    | "Use SQLite over PostgreSQL for simplicity and portability"    |
| `knowledge` + `requirement` | "System must support full-text search with BM25 ranking"       |
| `knowledge` + `constraint`  | "Cannot use cloud APIs — must be fully local-first"            |
| `knowledge` + `principle`   | "Always validate type-role pairs before insertion"             |
| `knowledge` + `finding`     | "BM25 ranking improves search relevance by 40%"                |
| `knowledge` + `research`    | "sqlite-vec has 6,891 stars, works with better-sqlite3"        |
| `issue` + `problem`         | "Need to handle concurrent writes to SQLite"                   |
| `issue` + `error`           | "TypeError: Cannot read property 'id' of undefined at line 42" |
| `action` + `task`           | "Implement texere_traverse with recursive CTE"                 |
| `action` + `solution`       | "Use WAL mode + IMMEDIATE transactions for concurrency"        |
| `action` + `fix`            | "Added null check before accessing node.id"                    |
| `action` + `workflow`       | "Deploy flow: test → build → push → tag"                       |
| `action` + `command`        | "pnpm turbo build --filter=@texere/server"                     |
| `artifact` + `example`      | "Example of FTS5 phrase search with fallback"                  |
| `artifact` + `code_pattern` | "Use dependency injection for database access"                 |
| `artifact` + `technology`   | "better-sqlite3: Synchronous SQLite bindings for Node.js"      |
| `artifact` + `project`      | "Texere: Knowledge graph MCP server for LLM agents"            |
| `artifact` + `file_context` | "src/db/schema.ts contains all table definitions"              |
| `context` + `conversation`  | "User prefers functional style over classes"                   |
| `meta` + `system`           | "Graph initialized on 2026-02-14"                              |

---

## Edge Type Reference

Texere v1.1 has **12 edge types** (reduced from 14). Removed: `RELATED_TO`, `MOTIVATED_BY`.

| Type             | Direction | Use When                          | Example                                                                              | Old Type Mapping      |
| ---------------- | --------- | --------------------------------- | ------------------------------------------------------------------------------------ | --------------------- |
| `RESOLVES`       | →         | X fixes/solves Y                  | `(solution: "Use WAL mode") → (problem: "Database locked errors")`                   | `SOLVES`, `VALIDATES` |
| `CAUSES`         | →         | X leads to Y                      | `(problem: "Missing API key") → (error: "AuthenticationError")`                      | `CAUSES`              |
| `DEPENDS_ON`     | →         | X requires Y                      | `(task: "Deploy to prod") → (task: "Pass all tests")`                                | `REQUIRES`            |
| `EXTENDS`        | →         | X builds on Y                     | `(solution: "Add connection pooling") → (solution: "Use WAL mode")`                  | `BUILDS_ON`           |
| `CONSTRAINS`     | →         | X limits Y                        | `(constraint: "Node.js 18+") → (technology: "better-sqlite3")`                       | `CONSTRAINS`          |
| `CONTRADICTS`    | ↔         | X conflicts with Y                | `(research: "SQLite faster") ↔ (research: "PostgreSQL faster")`                      | `CONTRADICTS`         |
| `REPLACES`       | →         | X replaces Y (auto-invalidates Y) | `(decision: "Use GraphQL") → (decision: "Use REST")` — auto-invalidates old decision | `DEPRECATED_BY`       |
| `ANCHORED_TO`    | →         | X is relevant to code Y           | `(decision: "Use nanoid for IDs") → (file_context: "src/db/schema.ts")`              | `ANCHORED_TO`         |
| `ALTERNATIVE_TO` | ↔         | X and Y are options               | `(decision: "Use JWT") ↔ (decision: "Use sessions")`                                 | `ALTERNATIVE_TO`      |
| `EXAMPLE_OF`     | →         | X demonstrates Y                  | `(example: "FTS5 phrase search") → (code_pattern: "Full-text search patterns")`      | New in v1.1           |
| `SUPPORTS`       | →         | X helps Y (weaker than RESOLVES)  | `(finding: "WAL improves concurrency") → (decision: "Use WAL mode")`                 | New in v1.1           |
| `PART_OF`        | →         | X is component of Y               | `(file_context: "src/db/nodes.ts") → (project: "Texere")`                            | New in v1.1           |

**Migration Notes:**

- `SOLVES` + `VALIDATES` → `RESOLVES` (both express "X fixes/confirms Y")
- `MOTIVATED_BY` → Use `SUPPORTS` or `CAUSES` depending on relationship strength
- `RELATED_TO` → Use specific edge type (`EXTENDS`, `SUPPORTS`, `PART_OF`, etc.)
- `DEPRECATED_BY` → `REPLACES` (same auto-invalidation behavior, clearer name)

---

## Tool Usage Examples

### 1. texere_store_node

Create immutable node(s). Supports batch input (max 50), minimal mode, and auto-creates ANCHORED_TO
edges.

**Store a single decision:**

```json
{
  "type": "knowledge",
  "role": "decision",
  "title": "Use SQLite with WAL mode for graph storage",
  "content": "After evaluating PostgreSQL vs SQLite, chose SQLite because: (1) simpler deployment (single file), (2) sufficient performance for expected scale (<100k nodes), (3) better-sqlite3 provides synchronous API. WAL mode enables concurrent reads.",
  "tags": ["database", "architecture", "sqlite"],
  "importance": 0.9,
  "confidence": 0.85,
  "source": "internal",
  "status": "active",
  "scope": "project",
  "anchor_to": ["src/db/connection.ts", "src/db/schema.ts"]
}
```

Returns:
`{ node: { id: "abc123xyz", type: "knowledge", role: "decision", created_at: 1707868800000, ... } }`

**Store an error:**

```json
{
  "type": "issue",
  "role": "error",
  "title": "TypeError: Cannot read property 'id' of undefined",
  "content": "Stack trace: at storeNode (src/tools/store-node.ts:42:18). Occurred when node parameter was null due to failed validation.",
  "tags": ["bug", "validation", "typescript"],
  "importance": 0.7
}
```

Returns: `{ node: { id: "err456", type: "issue", role: "error", ... } }`

**Batch create (max 50 nodes, atomic):**

```json
[
  {
    "type": "action",
    "role": "task",
    "title": "Implement search",
    "content": "Add FTS5 search with BM25 ranking"
  },
  {
    "type": "action",
    "role": "task",
    "title": "Add tests",
    "content": "Write unit tests for search"
  }
]
```

Returns: `{ nodes: [{ id: "task1", ... }, { id: "task2", ... }] }`

**Minimal mode (returns only ID):**

```json
{
  "type": "knowledge",
  "role": "finding",
  "title": "BM25 improves relevance",
  "content": "Search quality increased by 40%",
  "minimal": true
}
```

Returns: `{ node: { id: "find789" } }`

**Optional facet fields:**

- `source`: `"internal"` (default) | `"external"` — Origin of knowledge
- `status`: `"active"` (default) | `"proposed"` | `"deprecated"` | `"invalidated"` — Lifecycle state
- `scope`: `"project"` (default) | `"module"` | `"file"` | `"session"` — Visibility boundary

---

### 2. texere_get_node

Read node by ID. Optionally include edges.

```json
{ "id": "abc123xyz", "include_edges": true }
```

Returns:

```json
{
  "node": {
    "id": "abc123xyz",
    "type": "knowledge",
    "role": "decision",
    "title": "Use SQLite with WAL mode for graph storage",
    "content": "After evaluating PostgreSQL vs SQLite...",
    "tags": ["database", "architecture", "sqlite"],
    "importance": 0.9,
    "confidence": 0.85,
    "source": "internal",
    "status": "active",
    "scope": "project",
    "created_at": 1707868800000,
    "invalidated_at": null,
    "edges": {
      "outgoing": [
        {
          "id": "edge001",
          "type": "SUPPORTS",
          "target_id": "req456",
          "target_title": "Must work offline"
        }
      ],
      "incoming": []
    }
  }
}
```

---

### 3. texere_invalidate_node

Mark node as invalidated (soft delete). Use when knowledge is wrong with no replacement.

```json
{ "id": "abc123xyz" }
```

---

### 3a. texere_replace_node

**NEW in v1.1**: Atomically replace a node in one operation. Creates new node, links with `REPLACES`
edge, and invalidates old node.

**Replace outdated decision:**

```json
{
  "old_id": "old_decision_123",
  "type": "knowledge",
  "role": "decision",
  "title": "Use GraphQL API instead of REST",
  "content": "Switching from REST to GraphQL because: (1) clients need flexible queries, (2) reduces over-fetching, (3) better TypeScript integration.",
  "tags": ["api", "graphql", "architecture"],
  "importance": 0.9
}
```

Returns: `{ node: { id: "new_decision_456", ... } }`

**What it does:**

1. Creates new node with provided data
2. Creates `REPLACES` edge: `new_decision_456 → old_decision_123`
3. Invalidates `old_decision_123` (sets `invalidated_at`)

**Minimal mode:**

```json
{
  "old_id": "old_node",
  "type": "knowledge",
  "role": "finding",
  "title": "Updated finding",
  "content": "New data...",
  "minimal": true
}
```

Returns: `{ node: { id: "new_node_id" } }`

**Use instead of manual workflow:**

- ❌ Old: `storeNode()` → `createEdge(REPLACES)` → `invalidateNode()`
- ✅ New: `replaceNode()` — atomic, single operation

---

### 4. texere_create_edge

Link two nodes. Supports batch input (max 50, atomic). `REPLACES` auto-invalidates source node.

**Link solution to problem:**

```json
{ "edges": { "source_id": "sol789", "target_id": "prob456", "type": "RESOLVES", "strength": 0.9 } }
```

Returns:
`{ edge: { id: "edge123", source_id: "sol789", target_id: "prob456", type: "RESOLVES", ... } }`

**Replace old decision (auto-invalidates):**

```json
{
  "edges": { "source_id": "old_decision_123", "target_id": "new_decision_456", "type": "REPLACES" }
}
```

Note: Automatically sets `invalidated_at` on `old_decision_123`.

**Batch create (max 50 edges, atomic):**

```json
{
  "edges": [
    { "source_id": "sol1", "target_id": "prob1", "type": "RESOLVES" },
    { "source_id": "sol1", "target_id": "sol2", "type": "EXTENDS" }
  ]
}
```

Returns: `{ edges: [{ id: "edge1", ... }, { id: "edge2", ... }] }`

**Minimal mode (returns only ID):**

```json
{ "edges": { "source_id": "a", "target_id": "b", "type": "DEPENDS_ON" }, "minimal": true }
```

Returns: `{ edge: { id: "edge456" } }`

---

### 5. texere_delete_edge

Hard-delete edge (when relationship was wrong).

```json
{ "id": "edge_xyz" }
```

---

### 6. texere_search

Full-text search with BM25 ranking, match quality scoring, and relationship context. Supports FTS5
advanced syntax (phrases, boolean operators).

**Search for timeout-related errors:**

```json
{ "query": "timeout", "type": "issue", "role": "error", "limit": 5 }
```

**Search high-importance decisions about database:**

```json
{ "query": "database", "type": "knowledge", "role": "decision", "min_importance": 0.8, "limit": 10 }
```

**Multi-type search:**

```json
{ "query": "concurrency", "type": ["knowledge", "action"], "limit": 10 }
```

**Tag search with AND logic (all tags required):**

```json
{ "query": "", "tags": ["architecture", "database"], "tag_mode": "all", "limit": 20 }
```

**Tag search with OR logic (any tag matches):**

```json
{ "query": "performance", "tags": ["sqlite", "postgres"], "tag_mode": "any", "limit": 10 }
```

**FTS5 phrase search (exact match):**

```json
{ "query": "\"database locked\"", "type": "issue", "limit": 5 }
```

**FTS5 boolean operators:**

```json
{ "query": "sqlite OR postgres", "type": "knowledge", "limit": 10 }
```

**Tag-only search (no query text):**

```json
{ "tags": ["bug", "critical"], "tag_mode": "all", "limit": 20 }
```

Returns:

```json
{
  "results": [
    {
      "id": "abc123",
      "type": "knowledge",
      "role": "decision",
      "title": "Use SQLite with WAL mode for graph storage",
      "content": "After evaluating PostgreSQL vs SQLite...",
      "tags": ["database", "architecture", "sqlite"],
      "importance": 0.9,
      "rank": -2.45,
      "match_quality": 0.71,
      "match_fields": ["title", "tags"],
      "relationships": {
        "incoming": [{ "id": "edge1", "type": "SUPPORTS", "source_id": "find123", ... }],
        "outgoing": [{ "id": "edge2", "type": "ANCHORED_TO", "target_id": "file456", ... }]
      }
    }
  ]
}
```

**New search parameters:**

- `type`: `NodeType | NodeType[]` — Filter by single or multiple types
- `role`: `NodeRole` — Filter by specific role
- `tag_mode`: `"all"` (default, AND) | `"any"` (OR) — Tag matching logic
- `tags`: `string[]` — Filter by tags

**New return fields:**

- `rank`: Raw BM25 score (more negative = better match)
- `match_quality`: Normalized 0-1 score via `1 / (1 + Math.abs(rank))`
- `match_fields`: Array of fields where query matched (`["title", "content", "tags", "role"]`)
- `relationships`: Incoming and outgoing edges for context

**FTS5 advanced syntax:**

- Phrase search: `"exact phrase"` — Matches exact word sequence
- Boolean OR: `term1 OR term2` — Matches either term
- Boolean AND: `term1 AND term2` — Matches both terms (default behavior)
- Grouping: `(term1 OR term2) AND term3`
- Fallback: Invalid syntax automatically falls back to literal search

---

### 7. texere_traverse

Recursive graph traversal from starting node. Max depth 5.

**Find outgoing edges (what this affects):**

```json
{ "start_id": "decision_123", "direction": "outgoing", "max_depth": 2 }
```

**Find incoming edges (what affects this):**

```json
{ "start_id": "problem_456", "direction": "incoming", "max_depth": 3 }
```

**Filter by edge types:**

```json
{
  "start_id": "solution_789",
  "direction": "both",
  "max_depth": 2,
  "edge_types": ["RESOLVES", "DEPENDS_ON"]
}
```

---

### 8. texere_about

Compound query: FTS5 search finds seeds, then traverse neighbors.

```json
{ "query": "concurrency", "max_depth": 2, "limit": 10 }
```

---

### 9. texere_stats

Get node/edge counts by type and role. Quick health check.

```json
{}
```

Returns:

```json
{
  "stats": {
    "nodes": {
      "total": 142,
      "current": 138,
      "by_type": { "knowledge": 38, "issue": 20, "action": 45, "artifact": 30, "context": 5, "meta": 0 },
      "by_role": { "decision": 23, "requirement": 15, "problem": 18, "solution": 20, "task": 15, ... }
    },
    "edges": {
      "total": 256,
      "by_type": { "RESOLVES": 45, "DEPENDS_ON": 38, "SUPPORTS": 32, "ANCHORED_TO": 50, "REPLACES": 12, ... }
    }
  }
}
```

---

## Common Patterns

### Pattern 1: Store Decision and Anchor to Code

```json
// 1. Store with anchor_to
texere_store_node({
  "type": "knowledge",
  "role": "decision",
  "title": "Use dependency injection for database access",
  "content": "All database operations go through a Repository interface injected via constructor. Enables testing with mock repositories.",
  "tags": ["architecture", "di", "testing"],
  "importance": 0.85,
  "anchor_to": ["src/repos/node-repository.ts", "src/repos/edge-repository.ts"]
})
// Returns: { node: { id: "decision_abc", ... } }

// 2. Link to supporting requirement
texere_create_edge({
  "edges": {
    "source_id": "decision_abc",
    "target_id": "requirement_xyz",
    "type": "SUPPORTS",
    "strength": 0.9
  }
})
```

---

### Pattern 2: Record Bug Fix (Error → Fix → RESOLVES)

```json
// 1. Store error
texere_store_node({
  "type": "issue",
  "role": "error",
  "title": "Database locked error during concurrent writes",
  "content": "Error: SQLITE_BUSY: database is locked. Occurred when multiple tools tried to write simultaneously.",
  "tags": ["sqlite", "concurrency", "bug"],
  "importance": 0.8,
  "anchor_to": ["src/db/connection.ts"]
})
// Returns: { node: { id: "error_abc", ... } }

// 2. Store fix
texere_store_node({
  "type": "action",
  "role": "fix",
  "title": "Enable WAL mode and use IMMEDIATE transactions",
  "content": "Changed db.pragma('journal_mode = WAL') and wrapped all writes in db.transaction(() => {...}, { immediate: true }).",
  "tags": ["sqlite", "concurrency", "wal"],
  "importance": 0.8,
  "anchor_to": ["src/db/connection.ts"]
})
// Returns: { node: { id: "fix_xyz", ... } }

// 3. Link fix to error
texere_create_edge({
  "edges": {
    "source_id": "fix_xyz",
    "target_id": "error_abc",
    "type": "RESOLVES",
    "strength": 1.0
  }
})
```

---

### Pattern 3: Replace Outdated Knowledge (REPLACES)

**Option A: Use texere_replace_node (recommended, atomic):**

```json
// 1. Find old decision
texere_search({ "query": "REST API", "type": "knowledge", "role": "decision", "limit": 5 })
// Returns: { results: [{ id: "old_decision_456", ... }] }

// 2. Replace in one atomic operation
texere_replace_node({
  "old_id": "old_decision_456",
  "type": "knowledge",
  "role": "decision",
  "title": "Use GraphQL API instead of REST",
  "content": "Switching from REST to GraphQL because: (1) clients need flexible queries, (2) reduces over-fetching, (3) better TypeScript integration.",
  "tags": ["api", "graphql", "architecture"],
  "importance": 0.9
})
// Returns: { node: { id: "new_decision_123", ... } }
// Automatically: creates new node, creates REPLACES edge, invalidates old node
```

**Option B: Manual workflow (if you need more control):**

```json
// 1. Store new decision
texere_store_node({
  "type": "knowledge",
  "role": "decision",
  "title": "Use GraphQL API instead of REST",
  "content": "Switching from REST to GraphQL because: (1) clients need flexible queries, (2) reduces over-fetching, (3) better TypeScript integration.",
  "tags": ["api", "graphql", "architecture"],
  "importance": 0.9
})
// Returns: { node: { id: "new_decision_123", ... } }

// 2. Find old decision
texere_search({ "query": "REST API", "type": "knowledge", "role": "decision", "limit": 5 })
// Returns: { results: [{ id: "old_decision_456", ... }] }

// 3. Create REPLACES edge (auto-invalidates old node)
texere_create_edge({
  "edges": {
    "source_id": "new_decision_123",
    "target_id": "old_decision_456",
    "type": "REPLACES"
  }
})
// Automatically invalidates old_decision_456
```

---

### Pattern 4: Link Research to Decision

```json
// 1. Store research
texere_store_node({
  "type": "knowledge",
  "role": "research",
  "title": "SQLite vs PostgreSQL performance comparison",
  "content": "Benchmarked both for expected workload. SQLite with WAL: 1200 reads/sec, 800 writes/sec. PostgreSQL: 1500 reads/sec, 1000 writes/sec. For our scale, SQLite is sufficient.",
  "tags": ["benchmark", "database", "performance"],
  "importance": 0.7,
  "source": "external"
})
// Returns: { node: { id: "research_789", ... } }

// 2. Store decision
texere_store_node({
  "type": "knowledge",
  "role": "decision",
  "title": "Use SQLite for graph storage",
  "content": "Chose SQLite over PostgreSQL. Performance is sufficient for expected scale, and deployment is simpler.",
  "tags": ["database", "architecture"],
  "importance": 0.9
})
// Returns: { node: { id: "decision_101", ... } }

// 3. Link decision to research (research supports decision)
texere_create_edge({
  "edges": {
    "source_id": "research_789",
    "target_id": "decision_101",
    "type": "SUPPORTS",
    "strength": 0.9
  }
})
```

---

## Anti-Patterns

### Anti-Pattern 1: Storing Transient Information

**DON'T:**

```json
texere_store_node({
  "type": "context",
  "role": "conversation",
  "title": "Current temperature is 72°F",
  "content": "The temperature right now is 72 degrees Fahrenheit."
})
```

**WHY:** Texere is for **persistent, reusable knowledge**. Transient facts (current time, temporary
state, session-specific data) belong in conversation memory, not the knowledge graph.

**DO:** Use conversation memory for ephemeral context. Only store knowledge that's useful across
sessions.

---

### Anti-Pattern 2: Creating Nodes Without Searching First

**DON'T:** Call `texere_store_node` without first searching for existing nodes.

**WHY:** Creates duplicates, misses deprecation opportunities, and results in isolated nodes with no
edges. The graph becomes a fragmented note collection instead of a connected knowledge web.

**DO:** Follow the required workflow (see "Required Workflow: Search Before Creating" section
above):

```json
// 1. Search
texere_search({ "query": "SQLite storage", "type": "knowledge", "role": "decision", "limit": 5 })

// 2. Review results: duplicate? deprecation candidate? edge opportunities?
// 3. If found equivalent, use existing node ID
// 4. If found outdated version, use texere_replace_node or create new + REPLACES edge
// 5. If not found, store new node
// 6. Create edges to related nodes discovered in search
```

---

### Anti-Pattern 3: Using Wrong Edge Types

**DON'T:**

```json
texere_create_edge({
  "edges": {
    "source_id": "task_deploy",
    "target_id": "task_test",
    "type": "RESOLVES"  // ❌ Wrong! RESOLVES is for fixing problems
  }
})
```

**DO:**

```json
texere_create_edge({
  "edges": {
    "source_id": "task_deploy",
    "target_id": "task_test",
    "type": "DEPENDS_ON"  // ✅ Correct! Deploy depends on tests
  }
})
```

---

### Anti-Pattern 4: Storing Code Instead of Knowledge

**DON'T:** Store code snippets.

**DO:** Store the pattern/principle and anchor to file:

```json
texere_store_node({
  "type": "artifact",
  "role": "code_pattern",
  "title": "Use prepared statements for all database queries",
  "content": "All SQLite queries use db.prepare() for performance and SQL injection prevention.",
  "tags": ["database", "security", "performance"],
  "anchor_to": ["src/db/queries.ts"]
})
```

---

## Schema Quick Reference

### Node Fields

| Field        | Type         | Required | Default      | Description                                                |
| ------------ | ------------ | -------- | ------------ | ---------------------------------------------------------- |
| `type`       | `NodeType`   | ✅       | —            | One of 6 node types (knowledge, issue, action, etc.)       |
| `role`       | `NodeRole`   | ✅       | —            | One of 20 roles (decision, problem, task, etc.)            |
| `title`      | string       | ✅       | —            | Short descriptive title                                    |
| `content`    | string       | ✅       | —            | Detailed content                                           |
| `tags`       | string[]     | No       | `[]`         | Array of tag strings                                       |
| `importance` | number       | No       | `0.5`        | 0.0–1.0 (how critical)                                     |
| `confidence` | number       | No       | `0.8`        | 0.0–1.0 (how certain)                                      |
| `source`     | `NodeSource` | No       | `"internal"` | Origin: `"internal"` or `"external"`                       |
| `status`     | `NodeStatus` | No       | `"active"`   | Lifecycle: `"proposed"`, `"active"`, `"deprecated"`, etc.  |
| `scope`      | `NodeScope`  | No       | `"project"`  | Visibility: `"project"`, `"module"`, `"file"`, `"session"` |
| `anchor_to`  | string[]     | No       | —            | File paths (creates ANCHORED_TO edges)                     |
| `minimal`    | boolean      | No       | `false`      | Return only `{ id }` instead of full node                  |

### Edge Fields

| Field        | Type       | Required | Default | Description                          |
| ------------ | ---------- | -------- | ------- | ------------------------------------ |
| `source_id`  | string     | ✅       | —       | Source node ID                       |
| `target_id`  | string     | ✅       | —       | Target node ID                       |
| `type`       | `EdgeType` | ✅       | —       | One of 12 edge types                 |
| `strength`   | number     | No       | `0.5`   | 0.0–1.0 (how strong)                 |
| `confidence` | number     | No       | `0.8`   | 0.0–1.0 (how certain)                |
| `minimal`    | boolean    | No       | `false` | Return only `{ id }` instead of edge |

### Node Types (6)

`knowledge`, `issue`, `action`, `artifact`, `context`, `meta`

### Node Roles (20)

**Knowledge** (6): `decision`, `requirement`, `constraint`, `principle`, `finding`, `research`  
**Issue** (2): `problem`, `error`  
**Action** (5): `task`, `solution`, `fix`, `workflow`, `command`  
**Artifact** (5): `example`, `code_pattern`, `technology`, `project`, `file_context`  
**Context** (1): `conversation`  
**Meta** (1): `system`

### Edge Types (12)

`RESOLVES`, `CAUSES`, `DEPENDS_ON`, `EXTENDS`, `CONSTRAINS`, `CONTRADICTS`, `REPLACES`,
`ANCHORED_TO`, `ALTERNATIVE_TO`, `EXAMPLE_OF`, `SUPPORTS`, `PART_OF`

**Removed in v1.1**: `RELATED_TO`, `MOTIVATED_BY`, `SOLVES`, `VALIDATES`, `REQUIRES`, `BUILDS_ON`,
`DEPRECATED_BY`, `PREVENTS`, `IMPLEMENTS`

---

## Tips for Effective Use

1. **ALWAYS search before creating** — Required workflow (see above): find duplicates, identify
   deprecation candidates, discover edge opportunities
2. **Use specific type+role pairs** — Choose the most precise combination from the constraint matrix
3. **Validate type-role compatibility** — Only use valid role values for each type (see matrix
   above)
4. **Anchor to code** — Use `anchor_to` or `ANCHORED_TO` edges to link knowledge to files
5. **Link related knowledge** — Build a web of connections (edges are what make Texere valuable)
6. **Use importance/confidence** — Higher values = more critical/certain
7. **Tag consistently** — Lowercase, hyphenated (e.g., `database`, `error-handling`)
8. **Write for future you** — Clear enough to understand months later
9. **Replace, don't delete** — Use `texere_replace_node` or `REPLACES` edge instead of invalidating
10. **Traverse to discover** — Use `texere_traverse` or `texere_about` to explore relationships
11. **Check stats** — Use `texere_stats` to understand graph structure
12. **Use batch operations** — Create multiple nodes/edges atomically (max 50 per batch)
13. **Use minimal mode** — When you only need IDs, use `minimal: true` to reduce payload
14. **Leverage FTS5 syntax** — Use phrase search (`"exact phrase"`), boolean operators (`OR`, `AND`)
15. **Filter by role** — Narrow search results with `role` parameter for precision
