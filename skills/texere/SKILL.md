---
name: texere
description:
  Persistent knowledge graph for LLM agents - store typed nodes (type+role pairs like
  knowledge/decision) with semantic edges (RESOLVES, DEPENDS_ON, ANCHORED_TO). Use for cross-session
  memory, linking solutions to problems, anchoring to code, deprecation tracking.
compatibility: opencode
---

# Texere: LLM Agent Knowledge Graph

Persistent, immutable knowledge graph with typed nodes and semantic edges. Survives sessions. Use
when: (1) preserve decisions/requirements across sessions, (2) link solutions to problems, (3)
anchor knowledge to code, (4) track deprecation, (5) build queryable project knowledge.

## Mandatory Workflow: Search Before Creating

**ALWAYS search before creating nodes.** Creating without searching = duplicates, missed
connections, graph degradation.

**Required steps:**

1. **Search first**: `texere_search` or `texere_about` with terms from intended node title/tags
2. **Review results**: Check for (a) duplicates → use existing, (b) outdated versions → use
   `texere_replace_node`, (c) related nodes → note IDs for edges
3. **Create node**: `texere_store_node` only after reviewing search results
4. **Create edges immediately**: Link new node to related nodes from step 2

**Why**: Graph value = connections. Searching first prevents duplicates, identifies deprecation
opportunities, discovers edge candidates.

## Type + Role Decision Tree

6 types, 23 roles. Each type constrains valid roles.

**Decision tree:**

```
KNOWLEDGE? → type: knowledge, role: constraint | decision | finding | pitfall | principle | requirement | research
PROBLEM? → type: issue, role: problem | error
ACTION? → type: action, role: task | solution | fix | workflow | command
ARTIFACT? → type: artifact, role: example | code_pattern | technology | project | file_context | concept | source
CONVERSATION? → type: context, role: conversation
SYSTEM? → type: meta, role: system
```

**Type-role matrix:**

| Type      | Valid Roles (23 total)                                                        |
| --------- | ----------------------------------------------------------------------------- |
| knowledge | constraint, decision, finding, pitfall, principle, requirement, research (7)  |
| issue     | error, problem (2)                                                            |
| action    | command, fix, solution, task, workflow (5)                                    |
| artifact  | code_pattern, concept, example, file_context, project, source, technology (7) |
| context   | conversation (1)                                                              |
| meta      | system (1)                                                                    |

**Role examples:** knowledge/decision = "Use SQLite", knowledge/requirement = "Must support FTS",
knowledge/constraint = "No cloud APIs", knowledge/principle = "Validate type-role pairs",
knowledge/finding = "BM25 improves relevance 40%", knowledge/research = "sqlite-vec benchmarks",
knowledge/pitfall = "Avoid LIKE for FTS", issue/problem = "Handle concurrent writes", issue/error =
"TypeError at line 42", action/task = "Implement traverse", action/solution = "Use WAL mode",
action/fix = "Added null check", action/workflow = "test → build → deploy", action/command = "pnpm
turbo build", artifact/example = "FTS5 phrase search", artifact/code_pattern = "Use dependency
injection", artifact/technology = "better-sqlite3 bindings", artifact/project = "Texere knowledge
graph", artifact/file_context = "schema.ts definitions", artifact/concept = "BM25 ranking
algorithm", artifact/source = "Okapi BM25 paper", context/conversation = "User prefers functional
style", meta/system = "Graph initialized 2026-02-14"

## Edge Selection Guide

16 edge types. Choose most specific type.

| Type           | Direction | Semantics                                     | Example                                                       |
| -------------- | --------- | --------------------------------------------- | ------------------------------------------------------------- |
| RESOLVES       | →         | X fixes/solves Y                              | (solution: "Use WAL") → (problem: "Database locked")          |
| CAUSES         | →         | X leads to Y                                  | (problem: "Missing API key") → (error: "AuthError")           |
| DEPENDS_ON     | →         | X requires Y                                  | (task: "Deploy") → (task: "Pass tests")                       |
| EXTENDS        | →         | X builds on Y                                 | (solution: "Add pooling") → (solution: "Use WAL")             |
| CONSTRAINS     | →         | X limits Y                                    | (constraint: "Node.js 18+") → (tech: "better-sqlite3")        |
| CONTRADICTS    | ↔         | X conflicts with Y                            | (research: "SQLite faster") ↔ (research: "Postgres faster")   |
| REPLACES       | →         | X replaces Y (auto-invalidates Y)             | (decision: "Use GraphQL") → (decision: "Use REST")            |
| ANCHORED_TO    | →         | X is relevant to code Y                       | (decision: "Use nanoid") → (file_context: "schema.ts")        |
| ALTERNATIVE_TO | ↔         | X and Y are options                           | (decision: "Use JWT") ↔ (decision: "Use sessions")            |
| EXAMPLE_OF     | →         | X demonstrates Y                              | (example: "FTS5 phrase") → (code_pattern: "FTS patterns")     |
| SUPPORTS       | →         | X helps Y (weaker than RESOLVES)              | (finding: "WAL improves concurrency") → (decision: "Use WAL") |
| PART_OF        | →         | X is component of Y                           | (file_context: "nodes.ts") → (project: "Texere")              |
| ABOUT          | →         | X describes/documents Y                       | (research: "BM25 paper") → (concept: "BM25 ranking")          |
| BASED_ON       | →         | X derived from Y                              | (decision: "Use SQLite") → (research: "DB comparison")        |
| IS_A           | →         | X is instance/subtype of Y                    | (tech: "better-sqlite3") → (concept: "SQLite bindings")       |
| RELATED_TO     | ↔         | X and Y are related (use specific type first) | (tech: "SQLite") ↔ (tech: "PostgreSQL")                       |

**Compound semantics:**

- `RESOLVES` = fixes problem OR confirms solution works
- `REPLACES` = auto-invalidates target node (sets `invalidated_at`)
- `ANCHORED_TO` = links knowledge to file paths (auto-created via `anchor_to` param)

## Tool Reference

### 1. texere_store_node

Create immutable node(s). Supports batch (max 50), minimal mode, auto-creates ANCHORED_TO edges.

**Arguments:**

- `type`: NodeType (required) — One of: knowledge, issue, action, artifact, context, meta
- `role`: NodeRole (required) — One of 23 roles (see matrix above)
- `title`: string (required) — Short descriptive title
- `content`: string (required) — Detailed content
- `tags`: string[] (optional) — Array of tag strings
- `importance`: number (optional, default: 0.5) — 0.0–1.0, how critical
- `confidence`: number (optional, default: 0.8) — 0.0–1.0, how certain
- `source`: NodeSource (optional, default: "internal") — "internal" | "external" (deprecated, use
  artifact/source instead)
- `status`: NodeStatus (optional, default: "active") — "proposed" | "active" | "deprecated" |
  "invalidated"
- `scope`: NodeScope (optional, default: "project") — "project" | "module" | "file" | "session"
- `anchor_to`: string[] (optional) — File paths (creates ANCHORED_TO edges)
- `minimal`: boolean (optional, default: false) — Return only `{ id }` instead of full node

**Batch input:** Array of node objects (max 50, atomic). Omit `minimal` for batch.

**Returns:** `{ node: { id, type, role, ... } }` or `{ nodes: [...] }` for batch or
`{ node: { id } }` for minimal.

**Example:**

```json
{
  "type": "knowledge",
  "role": "decision",
  "title": "Use SQLite with WAL",
  "content": "...",
  "tags": ["db"],
  "importance": 0.9,
  "anchor_to": ["src/db/connection.ts"]
}
```

---

### 2. texere_get_node

Read node by ID with optional edges.

**Arguments:**

- `id`: string (required) — Node ID
- `include_edges`: boolean (optional, default: false) — Include incoming/outgoing edges

**Returns:** `{ node: { id, type, role, ..., edges?: { incoming: [...], outgoing: [...] } } }`

**Example:**

```json
{ "id": "abc123", "include_edges": true }
```

---

### 3. texere_invalidate_node

Mark node as invalidated (soft delete). Use when knowledge is wrong with no replacement.

**Arguments:**

- `id`: string (required) — Node ID to invalidate

**Returns:** `{ node: { id, ..., invalidated_at: <timestamp> } }`

**Example:**

```json
{ "id": "abc123" }
```

---

### 4. texere_replace_node

Atomically replace node: create new node, create REPLACES edge, invalidate old node.

**Arguments:**

- `old_id`: string (required) — ID of node to replace
- `type`: NodeType (required) — One of: knowledge, issue, action, artifact, context, meta
- `role`: NodeRole (required) — One of 23 roles
- `title`: string (required) — Short descriptive title
- `content`: string (required) — Detailed content
- `tags`: string[] (optional) — Array of tag strings
- `importance`: number (optional, default: 0.5) — 0.0–1.0
- `confidence`: number (optional, default: 0.8) — 0.0–1.0
- `source`: NodeSource (optional, default: "internal") — "internal" | "external"
- `status`: NodeStatus (optional, default: "active") — "proposed" | "active" | "deprecated" |
  "invalidated"
- `scope`: NodeScope (optional, default: "project") — "project" | "module" | "file" | "session"
- `anchor_to`: string[] (optional) — File paths
- `minimal`: boolean (optional, default: false) — Return only `{ id }`

**Returns:** `{ node: { id, ... } }` or `{ node: { id } }` for minimal

**Example:**

```json
{
  "old_id": "old_decision_123",
  "type": "knowledge",
  "role": "decision",
  "title": "Use GraphQL",
  "content": "...",
  "tags": ["api"],
  "importance": 0.9
}
```

---

### 5. texere_create_edge

Create edge(s) between nodes. Supports batch (max 50, atomic). REPLACES auto-invalidates source.

**Arguments:**

- `edges`: EdgeInput | EdgeInput[] (required) — Single edge or array (max 50)
  - `source_id`: string (required) — Source node ID
  - `target_id`: string (required) — Target node ID
  - `type`: EdgeType (required) — One of 16 edge types (see table above)
  - `strength`: number (optional, default: 0.5) — 0.0–1.0
  - `confidence`: number (optional, default: 0.8) — 0.0–1.0
- `minimal`: boolean (optional, default: false) — Return only `{ id }`

**Returns:** `{ edge: { id, ... } }` or `{ edges: [...] }` for batch or `{ edge: { id } }` for
minimal

**Example:**

```json
{ "edges": { "source_id": "sol789", "target_id": "prob456", "type": "RESOLVES", "strength": 0.9 } }
```

**Batch example:**

```json
{
  "edges": [
    { "source_id": "a", "target_id": "b", "type": "DEPENDS_ON" },
    { "source_id": "c", "target_id": "d", "type": "EXTENDS" }
  ]
}
```

---

### 6. texere_delete_edge

Hard-delete edge by ID.

**Arguments:**

- `id`: string (required) — Edge ID

**Returns:** `{ deleted: true }`

**Example:**

```json
{ "id": "edge_xyz" }
```

---

### 7. texere_search

FTS5 full-text search with BM25 ranking, type/role/tag/importance filters. Returns match quality and
relationships.

**Arguments:**

- `query`: string (required) — Search query (supports FTS5 syntax: phrases `"exact"`, boolean
  `OR`/`AND`)
- `type`: NodeType | NodeType[] (optional) — Filter by single or multiple types
- `role`: NodeRole (optional) — Filter by specific role
- `tags`: string[] (optional) — Filter by tags
- `tag_mode`: "all" | "any" (optional, default: "all") — Tag matching logic (AND vs OR)
- `min_importance`: number (optional) — Minimum importance threshold (0.0–1.0)
- `limit`: number (optional, default: 20, max: 100) — Max results

**Returns:**
`{ results: [{ id, type, role, title, content, tags, importance, rank, match_quality, match_fields, relationships: { incoming: [...], outgoing: [...] } }] }`

**Example:**

```json
{ "query": "timeout", "type": "issue", "role": "error", "limit": 5 }
```

**Tag search (AND):**

```json
{ "query": "", "tags": ["architecture", "database"], "tag_mode": "all", "limit": 20 }
```

**Tag search (OR):**

```json
{ "query": "performance", "tags": ["sqlite", "postgres"], "tag_mode": "any", "limit": 10 }
```

**FTS5 phrase search:**

```json
{ "query": "\"database locked\"", "type": "issue", "limit": 5 }
```

---

### 8. texere_traverse

Recursive graph traversal from start node. Max depth 5.

**Arguments:**

- `start_id`: string (required) — Starting node ID
- `direction`: "outgoing" | "incoming" | "both" (optional, default: "outgoing") — Traversal
  direction
- `max_depth`: number (optional, default: 3, max: 5) — Maximum traversal depth
- `edge_type`: EdgeType (optional) — Filter by specific edge type

**Returns:** `{ results: [{ node: {...}, edge: {...}, depth: number }] }`

**Example (outgoing):**

```json
{ "start_id": "decision_123", "direction": "outgoing", "max_depth": 2 }
```

**Example (filter by edge type):**

```json
{ "start_id": "solution_789", "direction": "both", "max_depth": 2, "edge_type": "RESOLVES" }
```

---

### 9. texere_about

Compound query: FTS5 search finds seeds, then traverse their neighborhood.

**Arguments:**

- `query`: string (required) — Search query
- `type`: NodeType | NodeType[] (optional) — Filter by type(s)
- `role`: NodeRole (optional) — Filter by role
- `tags`: string[] (optional) — Filter by tags
- `tag_mode`: "all" | "any" (optional, default: "all") — Tag matching logic
- `min_importance`: number (optional) — Minimum importance
- `limit`: number (optional, default: 20, max: 100) — Max seed results
- `direction`: "outgoing" | "incoming" | "both" (optional, default: "both") — Traversal direction
- `max_depth`: number (optional, default: 1, max: 5) — Traversal depth
- `edge_type`: EdgeType (optional) — Filter by edge type

**Returns:** `{ results: [{ seed: {...}, neighbors: [...] }] }`

**Example:**

```json
{ "query": "concurrency", "max_depth": 2, "limit": 10 }
```

---

### 10. texere_stats

Get node/edge counts by type and role. Quick health check.

**Arguments:** None (empty object `{}`)

**Returns:**
`{ stats: { nodes: { total, current, by_type: {...}, by_role: {...} }, edges: { total, by_type: {...} } } }`

**Example:**

```json
{}
```

## Source Provenance Workflow

Track external sources: (1) Create `artifact/source` node, (2) Create derived knowledge node, (3)
Link with `BASED_ON` edge.

## Concept Hierarchy Workflow

Build taxonomies: (1) Create parent `artifact/concept` node, (2) Create child nodes, (3) Link with
`IS_A` (subtype) or `PART_OF` (component). Use `ABOUT` edge to link documentation to concepts.

---

## Anti-Patterns

### 1. Storing Transient Information

❌ **DON'T:** Store ephemeral facts (current time, temporary state, session data) ✅ **DO:** Use
conversation memory for transient context. Texere = persistent, reusable knowledge.

### 2. Creating Nodes Without Searching

❌ **DON'T:** Call `texere_store_node` without searching first ✅ **DO:** Follow mandatory workflow
(search → review → create → link)

### 3. Using Wrong Edge Types

❌ **DON'T:** `{ "source_id": "task_deploy", "target_id": "task_test", "type": "RESOLVES" }`
(RESOLVES = fixes problems) ✅ **DO:**
`{ "source_id": "task_deploy", "target_id": "task_test", "type": "DEPENDS_ON" }` (deploy depends on
tests)

### 4. Storing Code Instead of Knowledge

❌ **DON'T:** Store code snippets in content ✅ **DO:** Store pattern/principle + anchor to file:

```json
{
  "type": "artifact",
  "role": "code_pattern",
  "title": "Use prepared statements",
  "content": "All queries use db.prepare() for performance and security",
  "tags": ["database", "security"],
  "anchor_to": ["src/db/queries.ts"]
}
```

### 5. Missing Edges After Creation

❌ **DON'T:** Create node and stop (isolated node = low value) ✅ **DO:** Create edges immediately
to related nodes from search results

### 6. Using RELATED_TO Instead of Specific Type

❌ **DON'T:** Default to `RELATED_TO` for all relationships ✅ **DO:** Choose most specific edge
type (RESOLVES, DEPENDS_ON, EXTENDS, etc.)

## Quick Reference

**Node Types (6):** knowledge, issue, action, artifact, context, meta

**Node Roles (23):**

- Knowledge (7): constraint, decision, finding, pitfall, principle, requirement, research
- Issue (2): error, problem
- Action (5): command, fix, solution, task, workflow
- Artifact (7): code_pattern, concept, example, file_context, project, source, technology
- Context (1): conversation
- Meta (1): system

**Edge Types (16):** ABOUT, ALTERNATIVE_TO, ANCHORED_TO, BASED_ON, CAUSES, CONSTRAINS, CONTRADICTS,
DEPENDS_ON, EXAMPLE_OF, EXTENDS, IS_A, PART_OF, RELATED_TO, REPLACES, RESOLVES, SUPPORTS

**Node Status (4):** proposed, active, deprecated, invalidated

**Node Scope (4):** project, module, file, session

**Node Source (2, deprecated):** internal, external

**Tag Modes (2):** all (AND), any (OR)

**Traversal Directions (3):** outgoing, incoming, both

**Field Defaults:**

- importance: 0.5
- confidence: 0.8
- status: "active"
- scope: "project"
- source: "internal"
- tag_mode: "all"
- direction: "outgoing" (traverse), "both" (about)
- max_depth: 3 (traverse), 1 (about)
- limit: 20 (search/about)
- minimal: false

**Limits:**

- Batch nodes: max 50
- Batch edges: max 50
- Search limit: max 100
- Traverse depth: max 5
- About depth: max 5
