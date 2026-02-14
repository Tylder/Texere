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

## FTS5 Search Tips

**What works:** Simple words, quoted phrases (`"exact phrase"`), boolean `OR`, tag-based filtering.

**What breaks:** Dots (`c.req.param`), hyphens (`multi-runtime`), colons, slashes → cause
`fts5: syntax error`.

**Recovery:** When FTS fails, use tag-based search (`query: ""` with `tags` filter). Simplify query
by removing punctuation, using individual words. Use quoted phrases for multi-word matches.

**Example:**

- ❌ Fails: `{ "query": "c.req.param" }` → `fts5: syntax error`
- ✅ Works: `{ "query": "", "tags": ["hono", "request"] }` or `{ "query": "req param" }`

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

## Role Disambiguation Guide

**knowledge/principle vs knowledge/constraint:**

- Principle = aspirational "should do X" (e.g., "Validate type-role pairs before storage")
- Constraint = restrictive "cannot do Y" (e.g., "No cloud APIs", "Node.js 18+ required")

**knowledge/finding vs knowledge/research:**

- Finding = specific observation/measurement (e.g., "BM25 improves relevance 40%")
- Research = external source material (e.g., "sqlite-vec benchmarks", "Okapi BM25 paper")

**artifact/code_pattern vs artifact/example:**

- Pattern = reusable abstract convention (e.g., "Use dependency injection")
- Example = concrete one-off instance (e.g., "FTS5 phrase search snippet")

**knowledge/decision vs knowledge/requirement:**

- Decision = choice with rationale (e.g., "Use SQLite with WAL mode")
- Requirement = non-negotiable spec (e.g., "Must support FTS")

**artifact/concept vs artifact/technology:**

- Concept = abstract category (e.g., "BM25 ranking algorithm")
- Technology = concrete library/tool (e.g., "better-sqlite3 bindings")

**Other roles:** knowledge/pitfall = "Avoid LIKE for FTS", issue/problem = "Handle concurrent
writes", issue/error = "TypeError at line 42", action/task = "Implement traverse", action/solution =
"Use WAL mode", action/fix = "Added null check", action/workflow = "test → build → deploy",
action/command = "pnpm turbo build", artifact/project = "Texere knowledge graph",
artifact/file_context = "schema.ts definitions", artifact/source = "Okapi BM25 paper",
context/conversation = "User prefers functional style", meta/system = "Graph initialized 2026-02-14"

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

## Edge Decision Tree

Ask yourself these questions in order. Use first match:

1. Does X fix/solve Y? → **RESOLVES**
2. Does X depend on/require Y? → **DEPENDS_ON**
3. Does X build upon/extend Y? → **EXTENDS**
4. Does X limit/restrict Y? → **CONSTRAINS**
5. Does X conflict with Y? → **CONTRADICTS**
6. Was X derived from/informed by Y? → **BASED_ON**
7. Does X support/help Y (weaker than fixes)? → **SUPPORTS**
8. Does X replace Y? → **REPLACES** (auto-invalidates Y)
9. Is X an example/demo of Y? → **EXAMPLE_OF**
10. Is X a subtype/instance of Y? → **IS_A**
11. Is X a component/part of Y? → **PART_OF**
12. Is X linked to code file Y? → **ANCHORED_TO** (auto-created via `anchor_to` param)
13. Are X and Y alternatives? → **ALTERNATIVE_TO**
14. Does X cause/lead to Y? → **CAUSES**
15. Does X describe/document Y AND nothing above fits? → **ABOUT**
16. Weak/unclear association? → **RELATED_TO** (last resort)

**Key distinction:** Source node describing a concept → ABOUT. Knowledge derived from a source →
BASED_ON.

## Tool Reference

### 1. texere_store_node

Create single immutable node with optional anchors. Auto-creates ANCHORED_TO edges. For batch, use
`texere_store_nodes` (max 50 nodes, returns array of IDs).

**Args:** `type` (NodeType, required), `role` (NodeRole, required), `title` (string, required),
`content` (string, required), `tags` (string[], optional), `importance` (number, 0.0–1.0, default:
0.5), `confidence` (number, 0.0–1.0, default: 0.8), `status` (NodeStatus, default: "active"),
`scope` (NodeScope, default: "project"), `anchor_to` (string[], optional file paths), `minimal`
(boolean, default: false)

**Returns:** `{ node: { id, type, role, ... } }` or `{ node: { id } }` for minimal

**Example:**
`{ "type": "knowledge", "role": "decision", "title": "Use SQLite with WAL", "content": "...", "tags": ["db"], "importance": 0.9, "anchor_to": ["src/db/connection.ts"] }`

### 2. texere_get_node

Read node by ID with optional edges.

**Args:** `id` (string, required), `include_edges` (boolean, default: false)

**Returns:** `{ node: { id, type, role, ..., edges?: { incoming: [...], outgoing: [...] } } }`

**Example:** `{ "id": "abc123", "include_edges": true }`

### 3. texere_invalidate_node

Mark node as invalidated (soft delete). Use when knowledge is wrong with no replacement.

**Args:** `id` (string, required)

**Returns:** `{ node: { id, ..., invalidated_at: <timestamp> } }`

**Example:** `{ "id": "abc123" }`

### 4. texere_replace_node

Atomically replace node: create new node, create REPLACES edge, invalidate old node.

**Args:** `old_id` (string, required), `type` (NodeType, required), `role` (NodeRole, required),
`title` (string, required), `content` (string, required), `tags` (string[], optional), `importance`
(number, default: 0.5), `confidence` (number, default: 0.8), `status` (NodeStatus, default:
"active"), `scope` (NodeScope, default: "project"), `anchor_to` (string[], optional), `minimal`
(boolean, default: false)

**Returns:** `{ node: { id, ... } }` or `{ node: { id } }` for minimal

**Example:**
`{ "old_id": "old_decision_123", "type": "knowledge", "role": "decision", "title": "Use GraphQL", "content": "...", "tags": ["api"], "importance": 0.9 }`

### 5. texere_create_edge

Create single edge between two nodes. REPLACES auto-invalidates source. For batch, use
`texere_create_edges` (max 50 edges, returns array of IDs).

**Args:** `source_id` (string, required), `target_id` (string, required), `type` (EdgeType, required
— one of 16 types), `strength` (number, 0.0–1.0, default: 0.5), `confidence` (number, 0.0–1.0,
default: 0.8), `minimal` (boolean, default: false)

**Returns:** `{ edge: { id, ... } }` or `{ edge: { id } }` for minimal

**Example:**
`{ "source_id": "sol789", "target_id": "prob456", "type": "RESOLVES", "strength": 0.9 }`

### 6. texere_delete_edge

Hard-delete edge by ID.

**Args:** `id` (string, required)

**Returns:** `{ deleted: true }`

**Example:** `{ "id": "edge_xyz" }`

### 7. texere_search

FTS5 full-text search with BM25 ranking, type/role/tag/importance filters. Returns match quality and
relationships.

**Args:** `query` (string, required — supports FTS5 syntax: phrases `"exact"`, boolean `OR`/`AND`),
`type` (NodeType | NodeType[], optional), `role` (NodeRole, optional), `tags` (string[], optional),
`tag_mode` ("all" | "any", default: "all" — AND vs OR), `min_importance` (number, 0.0–1.0,
optional), `limit` (number, default: 20, max: 100)

**Returns:**
`{ results: [{ id, type, role, title, content, tags, importance, rank, match_quality, match_fields, relationships: { incoming: [...], outgoing: [...] } }] }`

**Examples:**

- Basic: `{ "query": "timeout", "type": "issue", "role": "error", "limit": 5 }`
- Tag search (AND): `{ "query": "", "tags": ["architecture", "database"], "tag_mode": "all" }`
- Phrase search: `{ "query": "\"database locked\"", "type": "issue" }`

### 8. texere_traverse

Recursive graph traversal from start node. Max depth 5.

**Args:** `start_id` (string, required), `direction` ("outgoing" | "incoming" | "both", default:
"outgoing"), `max_depth` (number, default: 3, max: 5), `edge_type` (EdgeType, optional)

**Returns:** `{ results: [{ node: {...}, edge: {...}, depth: number }] }`

**Examples:**

- Outgoing: `{ "start_id": "decision_123", "direction": "outgoing", "max_depth": 2 }`
- Filter by edge:
  `{ "start_id": "solution_789", "direction": "both", "max_depth": 2, "edge_type": "RESOLVES" }`

### 9. texere_about

Compound query: FTS5 search finds seeds, then traverse their neighborhood.

**Args:** `query` (string, required), `type` (NodeType | NodeType[], optional), `role` (NodeRole,
optional), `tags` (string[], optional), `tag_mode` ("all" | "any", default: "all"), `min_importance`
(number, optional), `limit` (number, default: 20, max: 100 — max seed results), `direction`
("outgoing" | "incoming" | "both", default: "both"), `max_depth` (number, default: 1, max: 5),
`edge_type` (EdgeType, optional)

**Returns:** `{ results: [{ seed: {...}, neighbors: [...] }] }`

**Example:** `{ "query": "concurrency", "max_depth": 2, "limit": 10 }`

### 10. texere_stats

Get node/edge counts by type and role. Quick health check.

**Args:** None (empty object `{}`)

**Returns:**
`{ stats: { nodes: { total, current, by_type: {...}, by_role: {...} }, edges: { total, by_type: {...} } } }`

**Example:** `{}`

**Limits:** Batch nodes: max 50. Batch edges: max 50. Search limit: max 100. Traverse depth: max 5.
About depth: max 5.

## Document Ingestion Pattern

Step-by-step workflow for ingesting external documentation:

1. **Create source node:** `artifact/source` with tags `["url:...", "kind:web_doc"]`
2. **Read document:** Identify facts: decisions, constraints, principles, findings, technologies,
   concepts
3. **Create knowledge nodes:** Use `texere_store_nodes` (batch). Use full-sentence titles.
4. **Create edges:** Source ABOUT each concept node. BASED_ON for derived knowledge. Then inter-link
   with specific edges (CONSTRAINS, SUPPORTS, RESOLVES, etc.)
5. **Verify growth:** `texere_stats` to confirm node/edge counts

**Batch tip:** Create all nodes first, collect IDs, then all edges with `texere_create_edges`.

**Example:**

```
1. texere_store_node({ type: "artifact", role: "source", title: "Hono Routing Docs", tags: ["url:https://...", "kind:web_doc"] })
2. texere_store_nodes({ nodes: [
     { type: "knowledge", role: "principle", title: "Use path parameters for dynamic routes", content: "..." },
     { type: "artifact", role: "technology", title: "Hono router", content: "..." }
   ]})
3. texere_create_edges({ edges: [
     { source_id: "source_id", target_id: "principle_id", type: "ABOUT" },
     { source_id: "principle_id", target_id: "tech_id", type: "BASED_ON" }
   ]})
```

## Source Provenance Workflow

Track external sources: (1) Create `artifact/source` node with `tags: ["url:https://..."]`, (2)
Create derived knowledge node, (3) Link with `BASED_ON` edge.

**Example:**

```
1. texere_store_node({ type: "artifact", role: "source", title: "Okapi BM25 paper", tags: ["url:https://..."] })
   → returns { node: { id: "src_123" } }
2. texere_store_node({ type: "knowledge", role: "finding", title: "BM25 improves relevance 40%", content: "..." })
   → returns { node: { id: "find_456" } }
3. texere_create_edge({ source_id: "find_456", target_id: "src_123", type: "BASED_ON" })
```

## Concept Hierarchy Workflow

Build taxonomies: (1) Create parent `artifact/concept` node, (2) Create child nodes, (3) Link with
`IS_A` (subtype) or `PART_OF` (component). Use `ABOUT` edge to link documentation to concepts.

**Example:**

```
1. texere_store_node({ type: "artifact", role: "concept", title: "SQLite bindings", content: "..." })
   → returns { node: { id: "concept_123" } }
2. texere_store_node({ type: "artifact", role: "technology", title: "better-sqlite3", content: "..." })
   → returns { node: { id: "tech_456" } }
3. texere_create_edge({ source_id: "tech_456", target_id: "concept_123", type: "IS_A" })
```

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
`{ "type": "artifact", "role": "code_pattern", "title": "Use prepared statements", "content": "All queries use db.prepare() for performance and security", "tags": ["database", "security"], "anchor_to": ["src/db/queries.ts"] }`

### 5. Missing Edges After Creation

❌ **DON'T:** Create node and stop (isolated node = low value) ✅ **DO:** Create edges immediately
to related nodes from search results

### 6. Using RELATED_TO Instead of Specific Type

❌ **DON'T:** Default to `RELATED_TO` for all relationships ✅ **DO:** Choose most specific edge
type (RESOLVES, DEPENDS_ON, EXTENDS, etc.)
