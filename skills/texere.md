# Texere: LLM Quick Reference Guide

## What is Texere?

Texere is a **persistent knowledge graph for LLM coding agents**, designed to store and retrieve structured knowledge across sessions. Unlike conversation memory (ephemeral, session-bound) or file systems (unstructured, no semantic relationships), Texere provides immutable, semantically-typed nodes connected by meaningful edges. Use Texere when you need to: (1) preserve decisions, requirements, or constraints across sessions, (2) link solutions to problems they solve, (3) anchor knowledge to specific code locations, (4) track what's been deprecated or replaced, or (5) build a queryable web of project knowledge that survives beyond a single conversation.

---

## Node Type Chooser

**Decision Tree:**
```
Is it about CODE? → code_pattern (reusable pattern) | file_context (specific location)
Is it a PROBLEM? → problem (abstract) | error (concrete) | constraint (restriction)
Is it a SOLUTION? → solution (conceptual) | fix (concrete)
Is it WORK? → task
Is it a DECISION/REQUIREMENT? → decision (choice+rationale) | requirement (must-have) | constraint (must-not)
Is it ENVIRONMENTAL? → project | technology | workflow | command
Is it EXTERNAL? → research
Is it CONVERSATION? → conversation
Otherwise → general
```

**Quick Reference:**

| Type | Example |
|------|---------|
| `code_pattern` | "Use dependency injection for database access" |
| `file_context` | "src/db/schema.ts contains all table definitions" |
| `problem` | "Need to handle concurrent writes to SQLite" |
| `error` | "TypeError: Cannot read property 'id' of undefined at line 42" |
| `constraint` | "Cannot use cloud APIs — must be fully local-first" |
| `solution` | "Use WAL mode + IMMEDIATE transactions for concurrency" |
| `fix` | "Added null check before accessing node.id" |
| `task` | "Implement texere_traverse with recursive CTE" |
| `decision` | "Use SQLite over PostgreSQL for simplicity and portability" |
| `requirement` | "System must support full-text search with BM25 ranking" |
| `project` | "Texere: Knowledge graph MCP server for LLM agents" |
| `technology` | "better-sqlite3: Synchronous SQLite bindings for Node.js" |
| `workflow` | "Deploy flow: test → build → push → tag" |
| `command` | "pnpm turbo build --filter=@texere/server" |
| `research` | "sqlite-vec has 6,891 stars, works with better-sqlite3" |
| `conversation` | "User prefers functional style over classes" |
| `general` | "Project started on 2026-02-13" |

---

## Edge Type Chooser

| Type | Direction | Use When | Example |
|------|-----------|----------|---------|
| `RELATED_TO` | ↔ | General association | `(research: "SQLite benchmarks") ↔ (research: "PostgreSQL benchmarks")` |
| `CAUSES` | → | X leads to Y | `(problem: "Missing API key") → (error: "AuthenticationError")` |
| `SOLVES` | → | X resolves Y | `(solution: "Use WAL mode") → (problem: "Database locked errors")` |
| `REQUIRES` | → | X depends on Y | `(task: "Deploy to prod") → (task: "Pass all tests")` |
| `CONTRADICTS` | ↔ | X conflicts with Y | `(research: "SQLite faster") ↔ (research: "PostgreSQL faster")` |
| `BUILDS_ON` | → | X extends Y | `(solution: "Add connection pooling") → (solution: "Use WAL mode")` |
| `DEPRECATED_BY` | → | Y replaces X (auto-invalidates X) | `(decision: "Use REST") → (decision: "Use GraphQL")` |
| `PREVENTS` | → | X stops Y | `(constraint: "No network in tests") → (problem: "Flaky tests")` |
| `VALIDATES` | → | X confirms Y | `(research: "Benchmark shows 10x speedup") → (decision: "Use FTS5")` |
| `ALTERNATIVE_TO` | ↔ | X and Y are options | `(decision: "Use JWT") ↔ (decision: "Use sessions")` |
| `MOTIVATED_BY` | → | Y is reason for X | `(decision: "Use SQLite") → (requirement: "Must work offline")` |
| `IMPLEMENTS` | → | X realizes Y | `(file_context: "src/db/connection.ts") → (decision: "Use WAL mode")` |
| `CONSTRAINS` | → | X limits Y | `(constraint: "Node.js 18+") → (technology: "better-sqlite3")` |
| `ANCHORED_TO` | → | X is relevant to code Y | `(decision: "Use nanoid for IDs") → (file_context: "src/db/schema.ts")` |

---

## Tool Usage Examples

### 1. texere_store_node
Create immutable node. Optionally auto-create ANCHORED_TO edges.

**Store a decision:**
```json
{
  "type": "decision",
  "title": "Use SQLite with WAL mode for graph storage",
  "content": "After evaluating PostgreSQL vs SQLite, chose SQLite because: (1) simpler deployment (single file), (2) sufficient performance for expected scale (<100k nodes), (3) better-sqlite3 provides synchronous API. WAL mode enables concurrent reads.",
  "tags": ["database", "architecture", "sqlite"],
  "importance": 0.9,
  "confidence": 0.85,
  "anchor_to": ["src/db/connection.ts", "src/db/schema.ts"]
}
```
Returns: `{ id: "abc123xyz", created_at: 1707868800000 }`

**Store an error:**
```json
{
  "type": "error",
  "title": "TypeError: Cannot read property 'id' of undefined",
  "content": "Stack trace: at storeNode (src/tools/store-node.ts:42:18). Occurred when node parameter was null due to failed validation.",
  "tags": ["bug", "validation", "typescript"],
  "importance": 0.7
}
```

---

### 2. texere_get_node
Read node by ID. Optionally include edges.

```json
{ "id": "abc123xyz", "include_edges": true }
```

Returns:
```json
{
  "id": "abc123xyz",
  "type": "decision",
  "title": "Use SQLite with WAL mode for graph storage",
  "content": "After evaluating PostgreSQL vs SQLite...",
  "tags": ["database", "architecture", "sqlite"],
  "importance": 0.9,
  "created_at": 1707868800000,
  "invalidated_at": null,
  "edges": {
    "outgoing": [{ "id": "edge001", "type": "MOTIVATED_BY", "target_id": "req456", "target_title": "Must work offline" }],
    "incoming": []
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

### 4. texere_create_edge
Link two nodes. DEPRECATED_BY auto-invalidates source node.

**Link solution to problem:**
```json
{ "source_id": "sol789", "target_id": "prob456", "type": "SOLVES", "strength": 0.9 }
```

**Deprecate old decision:**
```json
{ "source_id": "old_decision_123", "target_id": "new_decision_456", "type": "DEPRECATED_BY" }
```
Note: Automatically sets `invalidated_at` on `old_decision_123`.

---

### 5. texere_delete_edge
Hard-delete edge (when relationship was wrong).

```json
{ "id": "edge_xyz" }
```

---

### 6. texere_search
Full-text search with BM25 ranking. Filter by type, tags, importance.

**Search for timeout-related errors:**
```json
{ "query": "timeout", "type": "error", "limit": 5 }
```

**Search high-importance decisions about database:**
```json
{ "query": "database", "type": "decision", "min_importance": 0.8, "limit": 10 }
```

**Search by tag:**
```json
{ "query": "", "tags": ["architecture", "database"], "limit": 20 }
```

Returns:
```json
{
  "results": [
    {
      "id": "abc123",
      "type": "decision",
      "title": "Use SQLite with WAL mode for graph storage",
      "tags": ["database", "architecture", "sqlite"],
      "importance": 0.9,
      "rank": 2.45
    }
  ]
}
```

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
{ "start_id": "solution_789", "direction": "both", "max_depth": 2, "edge_types": ["SOLVES", "REQUIRES"] }
```

---

### 8. texere_about
Compound query: FTS5 search finds seeds, then traverse neighbors.

```json
{ "query": "concurrency", "max_depth": 2, "limit": 10 }
```

---

### 9. texere_stats
Get node/edge counts by type. Quick health check.

```json
{}
```

Returns:
```json
{
  "nodes": {
    "total": 142,
    "current": 138,
    "by_type": { "decision": 23, "requirement": 15, "problem": 18, "solution": 20 }
  },
  "edges": {
    "total": 256,
    "by_type": { "SOLVES": 45, "REQUIRES": 38, "MOTIVATED_BY": 32, "ANCHORED_TO": 50 }
  }
}
```

---

## Common Patterns

### Pattern 1: Store Decision and Anchor to Code

```json
// 1. Store with anchor_to
texere_store_node({
  "type": "decision",
  "title": "Use dependency injection for database access",
  "content": "All database operations go through a Repository interface injected via constructor. Enables testing with mock repositories.",
  "tags": ["architecture", "di", "testing"],
  "importance": 0.85,
  "anchor_to": ["src/repos/node-repository.ts", "src/repos/edge-repository.ts"]
})

// 2. Link to motivating requirement
texere_create_edge({
  "source_id": "<decision_id>",
  "target_id": "<requirement_id>",
  "type": "MOTIVATED_BY",
  "strength": 0.9
})
```

---

### Pattern 2: Record Bug Fix (Error → Fix → SOLVES)

```json
// 1. Store error
texere_store_node({
  "type": "error",
  "title": "Database locked error during concurrent writes",
  "content": "Error: SQLITE_BUSY: database is locked. Occurred when multiple tools tried to write simultaneously.",
  "tags": ["sqlite", "concurrency", "bug"],
  "importance": 0.8,
  "anchor_to": ["src/db/connection.ts"]
})
// Returns: { id: "error_abc" }

// 2. Store fix
texere_store_node({
  "type": "fix",
  "title": "Enable WAL mode and use IMMEDIATE transactions",
  "content": "Changed db.pragma('journal_mode = WAL') and wrapped all writes in db.transaction(() => {...}, { immediate: true }).",
  "tags": ["sqlite", "concurrency", "wal"],
  "importance": 0.8,
  "anchor_to": ["src/db/connection.ts"]
})
// Returns: { id: "fix_xyz" }

// 3. Link fix to error
texere_create_edge({
  "source_id": "fix_xyz",
  "target_id": "error_abc",
  "type": "SOLVES",
  "strength": 1.0
})
```

---

### Pattern 3: Replace Outdated Knowledge (DEPRECATED_BY)

```json
// 1. Store new decision
texere_store_node({
  "type": "decision",
  "title": "Use GraphQL API instead of REST",
  "content": "Switching from REST to GraphQL because: (1) clients need flexible queries, (2) reduces over-fetching, (3) better TypeScript integration.",
  "tags": ["api", "graphql", "architecture"],
  "importance": 0.9
})
// Returns: { id: "new_decision_123" }

// 2. Find old decision
texere_search({ "query": "REST API", "type": "decision", "limit": 5 })
// Returns: { results: [{ id: "old_decision_456", ... }] }

// 3. Create DEPRECATED_BY edge
texere_create_edge({
  "source_id": "old_decision_456",
  "target_id": "new_decision_123",
  "type": "DEPRECATED_BY"
})
// Automatically invalidates old_decision_456
```

---

### Pattern 4: Link Research to Decision

```json
// 1. Store research
texere_store_node({
  "type": "research",
  "title": "SQLite vs PostgreSQL performance comparison",
  "content": "Benchmarked both for expected workload. SQLite with WAL: 1200 reads/sec, 800 writes/sec. PostgreSQL: 1500 reads/sec, 1000 writes/sec. For our scale, SQLite is sufficient.",
  "tags": ["benchmark", "database", "performance"],
  "importance": 0.7
})
// Returns: { id: "research_789" }

// 2. Store decision
texere_store_node({
  "type": "decision",
  "title": "Use SQLite for graph storage",
  "content": "Chose SQLite over PostgreSQL. Performance is sufficient for expected scale, and deployment is simpler.",
  "tags": ["database", "architecture"],
  "importance": 0.9
})
// Returns: { id: "decision_101" }

// 3. Link decision to research
texere_create_edge({
  "source_id": "decision_101",
  "target_id": "research_789",
  "type": "MOTIVATED_BY",
  "strength": 0.9
})
```

---

## Anti-Patterns

### Anti-Pattern 1: Storing Transient Information

**DON'T:**
```json
texere_store_node({
  "type": "general",
  "title": "Current temperature is 72°F",
  "content": "The temperature right now is 72 degrees Fahrenheit."
})
```

**WHY:** Texere is for **persistent, reusable knowledge**. Transient facts (current time, temporary state, session-specific data) belong in conversation memory, not the knowledge graph.

**DO:** Use conversation memory for ephemeral context. Only store knowledge that's useful across sessions.

---

### Anti-Pattern 2: Creating Duplicate Nodes

**DON'T:** Store without checking if node already exists.

**DO:** Always search first:
```json
// 1. Search
texere_search({ "query": "SQLite storage", "type": "decision", "limit": 5 })

// 2. If found, use existing node ID or update via DEPRECATED_BY
// 3. If not found, then store new node
```

---

### Anti-Pattern 3: Using Wrong Edge Types

**DON'T:**
```json
texere_create_edge({
  "source_id": "task_deploy",
  "target_id": "task_test",
  "type": "SOLVES"  // ❌ Wrong! SOLVES is for fixing problems
})
```

**DO:**
```json
texere_create_edge({
  "source_id": "task_deploy",
  "target_id": "task_test",
  "type": "REQUIRES"  // ✅ Correct! Deploy depends on tests
})
```

---

### Anti-Pattern 4: Storing Code Instead of Knowledge

**DON'T:** Store code snippets.

**DO:** Store the pattern/principle and anchor to file:
```json
texere_store_node({
  "type": "code_pattern",
  "title": "Use prepared statements for all database queries",
  "content": "All SQLite queries use db.prepare() for performance and SQL injection prevention.",
  "tags": ["database", "security", "performance"],
  "anchor_to": ["src/db/queries.ts"]
})
```

---

## Schema Quick Reference

### Node Fields
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | ✅ | — | One of 17 node types |
| `title` | string | ✅ | — | Short descriptive title |
| `content` | string | ✅ | — | Detailed content |
| `tags` | string[] | No | `[]` | Array of tag strings |
| `importance` | number | No | `0.5` | 0.0–1.0 (how critical) |
| `confidence` | number | No | `0.8` | 0.0–1.0 (how certain) |
| `anchor_to` | string[] | No | — | File paths (creates ANCHORED_TO edges) |

### Edge Fields
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `source_id` | string | ✅ | — | Source node ID |
| `target_id` | string | ✅ | — | Target node ID |
| `type` | string | ✅ | — | One of 14 edge types |
| `strength` | number | No | `0.5` | 0.0–1.0 (how strong) |
| `confidence` | number | No | `0.8` | 0.0–1.0 (how certain) |

### Node Types (17)
`task`, `code_pattern`, `problem`, `solution`, `project`, `technology`, `error`, `fix`, `command`, `file_context`, `workflow`, `general`, `conversation`, `decision`, `requirement`, `constraint`, `research`

### Edge Types (14)
`RELATED_TO`, `CAUSES`, `SOLVES`, `REQUIRES`, `CONTRADICTS`, `BUILDS_ON`, `DEPRECATED_BY`, `PREVENTS`, `VALIDATES`, `ALTERNATIVE_TO`, `MOTIVATED_BY`, `IMPLEMENTS`, `CONSTRAINS`, `ANCHORED_TO`

---

## Tips for Effective Use

1. **Search before storing** — Avoid duplicates
2. **Use specific node types** — Don't default to `general`
3. **Anchor to code** — Use `anchor_to` or `ANCHORED_TO` edges
4. **Link related knowledge** — Build a web of connections
5. **Use importance/confidence** — Higher values = more critical/certain
6. **Tag consistently** — Lowercase, hyphenated (e.g., `database`, `error-handling`)
7. **Write for future you** — Clear enough to understand months later
8. **Deprecate, don't delete** — Use `DEPRECATED_BY` instead of invalidating
9. **Traverse to discover** — Use `texere_traverse` or `texere_about`
10. **Check stats** — Use `texere_stats` to understand graph structure
