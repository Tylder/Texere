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

## Workflow: Search Before Creating

ALWAYS search before creating nodes. Creating without searching = duplicates, missed connections,
graph degradation.

1. Search first: `texere_search` or `texere_about` with terms from intended node title/tags
2. Review results: Check for (a) duplicates → use existing, (b) outdated versions → use
   `texere_replace_node`, (c) related nodes → note IDs for edges
3. Create node: Use the appropriate per-type store tool only after reviewing search results
4. Create edges immediately: Link new node to related nodes from step 2

Graph value = connections. Searching first prevents duplicates, identifies deprecation
opportunities, discovers edge candidates.

## Content Quality: The Recall Test

**Every node must pass the Recall Test:** An agent finding this node 6 months later can act on it
without needing the original source material.

### BAD Node (Fails Recall Test)

```json
{
  "role": "decision",
  "title": "Use SQLite",
  "content": "We decided to use SQLite for the database.",
  "importance": 0.5,
  "confidence": 0.5
}
```

Why it fails: No rationale, no alternatives considered, no constraints. An agent finding this later
has no idea WHY SQLite was chosen or when it would be wrong.

### GOOD Node (Passes Recall Test)

```json
{
  "role": "decision",
  "title": "Use SQLite with WAL mode for single-server knowledge graph",
  "content": "Chose SQLite over PostgreSQL for the Texere knowledge graph because: (1) single-server deployment eliminates network latency for graph traversals, (2) WAL mode provides concurrent reads during writes, (3) FTS5 extension handles full-text search without external service, (4) embedded DB means zero operational overhead. Trade-off: no horizontal scaling — acceptable for single-agent knowledge graphs under 10GB. Revisit if multi-server deployment needed.",
  "importance": 0.9,
  "confidence": 0.95
}
```

Why it passes: Rationale, alternatives, trade-offs, boundary conditions, when to revisit.

### The Split Test

If a node's content covers multiple distinct topics, split it into atomic nodes linked by edges.

**BAD:** One node titled "Authentication system" covering JWT creation, token refresh, session
management, and OAuth provider setup.

**GOOD:** Four separate nodes (one per concern) linked with PART_OF edges to a parent
"Authentication system" concept node.

## READ (Search & Retrieve)

### texere_search

FTS5 search with BM25 ranking, type/role/tag/importance filters. Supports keyword, semantic, and
hybrid search modes.

| arg            | type                                          | required | default | notes                        |
| -------------- | --------------------------------------------- | -------- | ------- | ---------------------------- |
| query          | string                                        | yes      | —       | FTS5 or semantic query       |
| type           | NodeType \| NodeType[]                        | no       | —       | Filter by node type(s)       |
| role           | NodeRole                                      | no       | —       | Filter by node role          |
| tags           | string[]                                      | no       | —       | Filter by tags               |
| tag_mode       | "all" \| "any"                                | no       | "all"   | AND vs OR for tags           |
| min_importance | number (0-1)                                  | no       | —       | Minimum importance threshold |
| limit          | number (1-100)                                | no       | 20      | Max results                  |
| mode           | "auto" \| "keyword" \| "semantic" \| "hybrid" | no       | "auto"  | Search strategy              |

Returns: `{ results: SearchResult[] }` where SearchResult includes
`{ id, type, role, title, content, tags, importance, rank, match_quality, match_fields, relationships: { incoming: Edge[], outgoing: Edge[] } }`

Example: `texere_search({ query: "timeout", type: "issue", role: "error", limit: 5 })`

### texere_about

Search for seeds with optional semantic/hybrid modes, then traverse their neighborhood.

| arg            | type                                          | required | default | notes                        |
| -------------- | --------------------------------------------- | -------- | ------- | ---------------------------- |
| query          | string                                        | yes      | —       | FTS5 or semantic query       |
| type           | NodeType \| NodeType[]                        | no       | —       | Filter by node type(s)       |
| role           | NodeRole                                      | no       | —       | Filter by node role          |
| tags           | string[]                                      | no       | —       | Filter by tags               |
| tag_mode       | "all" \| "any"                                | no       | "all"   | AND vs OR for tags           |
| min_importance | number (0-1)                                  | no       | —       | Minimum importance threshold |
| limit          | number (1-100)                                | no       | 20      | Max seed results             |
| direction      | "outgoing" \| "incoming" \| "both"            | no       | "both"  | Traversal direction          |
| max_depth      | number (0-5)                                  | no       | 1       | Traversal depth              |
| edge_type      | EdgeType                                      | no       | —       | Filter by edge type          |
| mode           | "auto" \| "keyword" \| "semantic" \| "hybrid" | no       | "auto"  | Search strategy              |

Returns:
`{ results: Array<{ seed: Node, neighbors: Array<{ node: Node, edge: Edge, depth: number }> }> }`

Example: `texere_about({ query: "concurrency", max_depth: 2, limit: 10 })`

### texere_get_node

Read node by ID with optional edges.

| arg           | type    | required | default | notes                           |
| ------------- | ------- | -------- | ------- | ------------------------------- |
| id            | string  | yes      | —       | Node ID                         |
| include_edges | boolean | no       | false   | Include incoming/outgoing edges |

Returns: `{ node: Node & { edges?: { incoming: Edge[], outgoing: Edge[] } } }`

Example: `texere_get_node({ id: "abc123", include_edges: true })`

### texere_traverse

Traverse graph from start node with recursive CTE.

| arg       | type                               | required | default    | notes               |
| --------- | ---------------------------------- | -------- | ---------- | ------------------- |
| start_id  | string                             | yes      | —          | Starting node ID    |
| direction | "outgoing" \| "incoming" \| "both" | no       | "outgoing" | Traversal direction |
| max_depth | number (0-5)                       | no       | 3          | Max recursion depth |
| edge_type | EdgeType                           | no       | —          | Filter by edge type |

Returns: `{ results: Array<{ node: Node, edge: Edge, depth: number }> }`

Example: `texere_traverse({ start_id: "decision_123", direction: "outgoing", max_depth: 2 })`

### texere_stats

Get node and edge counts by type.

| arg    | type | required | default | notes             |
| ------ | ---- | -------- | ------- | ----------------- |
| (none) | —    | —        | —       | Empty object `{}` |

Returns:
`{ stats: { nodes: { total: number, current: number, by_type: Record<NodeType, number>, by_role: Record<NodeRole, number> }, edges: { total: number, by_type: Record<EdgeType, number> } } }`

Example: `texere_stats({})`

## WRITE (Store & Modify) — skip this section if you only need to read

### Per-Type Store Tools

Nodes are stored via **5 per-type tools**. Each tool constrains roles to only those valid for its
type and requires `importance` and `confidence` (no defaults — you must assess these).

All store tools accept an array of nodes (1-50) and default to `minimal: true` (returns only
`{ id }` per node). Set `minimal: false` to get full node objects back.

#### texere_store_knowledge

Store decisions, findings, principles, constraints, pitfalls, requirements. Content must pass the
Recall Test: include rationale for decisions, evidence for findings, reasoning for principles,
mechanisms for constraints, traps+fixes for pitfalls.

| arg     | type              | required | default | notes                                                                     |
| ------- | ----------------- | -------- | ------- | ------------------------------------------------------------------------- |
| nodes   | KnowledgeNode[]   | yes      | —       | Array of knowledge nodes (1-50)                                           |
| minimal | boolean           | no       | true    | Return only `{ id }` per node if true                                     |

**KnowledgeNode fields:**

| field      | type         | required | notes                                                            |
| ---------- | ------------ | -------- | ---------------------------------------------------------------- |
| role       | enum         | yes      | "constraint" \| "decision" \| "finding" \| "pitfall" \| "principle" \| "requirement" |
| title      | string       | yes      | Short descriptive title                                          |
| content    | string       | yes      | Detailed content (must pass Recall Test)                         |
| tags       | string[]     | no       | Tags for categorization                                          |
| importance | number (0-1) | yes      | How critical is this knowledge                                   |
| confidence | number (0-1) | yes      | How certain are you                                              |
| anchor_to  | string[]     | no       | File paths (auto-creates ANCHORED_TO edges)                      |
| sources    | string[]     | no       | URLs/file paths (auto-creates provenance Source nodes + edges)   |

Example:
`texere_store_knowledge({ nodes: [{ role: "decision", title: "Use SQLite with WAL", content: "Chose SQLite over PostgreSQL because...", importance: 0.9, confidence: 0.95, tags: ["db"], anchor_to: ["src/db.ts"] }] })`

#### texere_store_issue

Store problems and errors.

| field      | type         | required | notes                          |
| ---------- | ------------ | -------- | ------------------------------ |
| role       | enum         | yes      | "error" \| "problem"           |
| title      | string       | yes      | Short descriptive title        |
| content    | string       | yes      | Include symptoms, impact, context |
| tags       | string[]     | no       | Tags for categorization        |
| importance | number (0-1) | yes      | Severity of the issue          |
| confidence | number (0-1) | yes      | How certain is this an issue   |
| anchor_to  | string[]     | no       | File paths                     |
| sources    | string[]     | no       | URLs/file paths                |

Example:
`texere_store_issue({ nodes: [{ role: "problem", title: "Auth timeout under load", content: "Users experience 30s timeouts during peak hours (>100 concurrent logins). Root cause: connection pool exhaustion.", importance: 0.8, confidence: 0.9, tags: ["auth", "performance"] }] })`

#### texere_store_action

Store tasks, solutions, commands, workflows.

| field      | type         | required | notes                                     |
| ---------- | ------------ | -------- | ----------------------------------------- |
| role       | enum         | yes      | "command" \| "solution" \| "task" \| "workflow" |
| title      | string       | yes      | Short descriptive title                   |
| content    | string       | yes      | Steps, rationale, expected outcomes       |
| tags       | string[]     | no       | Tags for categorization                   |
| importance | number (0-1) | yes      | Priority/criticality                      |
| confidence | number (0-1) | yes      | Likelihood of success                     |
| anchor_to  | string[]     | no       | File paths                                |
| sources    | string[]     | no       | URLs/file paths                           |

Example:
`texere_store_action({ nodes: [{ role: "solution", title: "Increase connection pool to 20", content: "Scale auth DB pool from 5 to 20 connections. Verified via load test: p99 latency drops from 30s to 200ms.", importance: 0.85, confidence: 0.9, tags: ["auth", "database"] }] })`

#### texere_store_artifact

Store code patterns, concepts, examples, technologies.

| field      | type         | required | notes                                              |
| ---------- | ------------ | -------- | -------------------------------------------------- |
| role       | enum         | yes      | "code_pattern" \| "concept" \| "example" \| "technology" |
| title      | string       | yes      | Short descriptive title                            |
| content    | string       | yes      | Implementation details, usage patterns             |
| tags       | string[]     | no       | Tags for categorization                            |
| importance | number (0-1) | yes      | Reusability/relevance                              |
| confidence | number (0-1) | yes      | How proven is this pattern                         |
| anchor_to  | string[]     | no       | File paths                                         |
| sources    | string[]     | no       | URLs/file paths                                    |

Example:
`texere_store_artifact({ nodes: [{ role: "code_pattern", title: "WeakMap statement cache", content: "Use WeakMap<Database, Statements> to cache prepared statements. WeakMap allows GC when db is closed. Pattern used in nodes.ts, edges.ts, search.ts.", importance: 0.7, confidence: 0.95, anchor_to: ["packages/graph/src/nodes.ts"] }] })`

#### texere_store_source

Store web URLs, file paths, repositories, API docs.

| field      | type         | required | notes                                           |
| ---------- | ------------ | -------- | ----------------------------------------------- |
| role       | enum         | yes      | "web_url" \| "file_path" \| "repository" \| "api_doc" |
| title      | string       | yes      | Short descriptive title                         |
| content    | string       | yes      | URL, path, or description of the source         |
| tags       | string[]     | no       | Tags for categorization                         |
| importance | number (0-1) | yes      | Authority/relevance of source                   |
| confidence | number (0-1) | yes      | How trustworthy is this source                  |
| anchor_to  | string[]     | no       | File paths                                      |
| sources    | string[]     | no       | URLs/file paths                                 |

Example:
`texere_store_source({ nodes: [{ role: "web_url", title: "SQLite WAL documentation", content: "https://www.sqlite.org/wal.html — Official SQLite WAL mode documentation covering journal modes, checkpointing, and concurrency semantics.", importance: 0.8, confidence: 1.0, tags: ["sqlite", "docs"] }] })`

### texere_create_edge

Link nodes with typed edges. Accepts an array of edges (1-50).

| arg     | type         | required | default | notes                        |
| ------- | ------------ | -------- | ------- | ---------------------------- |
| edges   | EdgeInput[]  | yes      | —       | Array of edges (1-50)        |
| minimal | boolean      | no       | true    | Return only `{ id }` if true |

**EdgeInput fields:**

| field     | type     | required | notes                 |
| --------- | -------- | -------- | --------------------- |
| source_id | string   | yes      | Source node ID        |
| target_id | string   | yes      | Target node ID        |
| type      | EdgeType | yes      | Edge type (11 values) |

Returns: `{ edges: Edge[] }` or `{ edges: Array<{ id: string }> }` if minimal

Example:
`texere_create_edge({ edges: [{ source_id: "sol789", target_id: "prob456", type: "RESOLVES" }] })`

### texere_replace_node

Atomically replace a node: store new node, create REPLACES edge, invalidate old node.

| arg        | type         | required | default | notes                                       |
| ---------- | ------------ | -------- | ------- | ------------------------------------------- |
| old_id     | string       | yes      | —       | ID of node to replace                       |
| type       | NodeType     | yes      | —       | Node type (5 values)                        |
| role       | NodeRole     | yes      | —       | Node role (20 values)                       |
| title      | string       | yes      | —       | Short descriptive title                     |
| content    | string       | yes      | —       | Detailed content                            |
| tags       | string[]     | no       | —       | Tags for categorization                     |
| importance | number (0-1) | yes      | —       | Importance score                            |
| confidence | number (0-1) | yes      | —       | Confidence score                            |
| anchor_to  | string[]     | no       | —       | File paths (auto-creates ANCHORED_TO edges) |
| minimal    | boolean      | no       | true    | Return only `{ id }` if true                |

Returns: `{ node: Node }` or `{ node: { id: string } }` if minimal

Example:
`texere_replace_node({ old_id: "old_decision_123", type: "knowledge", role: "decision", title: "Use GraphQL", content: "...", importance: 0.9, confidence: 0.85 })`

### texere_invalidate_node

Invalidate a node by setting invalidated_at.

| arg | type   | required | default | notes                 |
| --- | ------ | -------- | ------- | --------------------- |
| id  | string | yes      | —       | Node ID to invalidate |

Returns: `{ node: Node }` (with invalidated_at timestamp)

Example: `texere_invalidate_node({ id: "abc123" })`

### texere_delete_edge

Hard-delete an edge by ID.

| arg | type   | required | default | notes             |
| --- | ------ | -------- | ------- | ----------------- |
| id  | string | yes      | —       | Edge ID to delete |

Returns: `{ deleted: boolean }`

Example: `texere_delete_edge({ id: "edge_xyz" })`

### texere_validate

Validate proposed nodes and edges without writing to database. Returns validation issues.

| arg   | type                | required | default | notes                            |
| ----- | ------------------- | -------- | ------- | -------------------------------- |
| nodes | ValidateNodeInput[] | no       | []      | Array of node inputs to validate |
| edges | ValidateEdgeInput[] | no       | []      | Array of edge inputs to validate |

Returns:
`{ valid: boolean, issues: Array<{ severity: "error" \| "warning", item: "node" \| "edge", index: number, message: string }> }`

Example:
`texere_validate({ nodes: [{ type: "knowledge", role: "decision", title: "...", content: "..." }], edges: [{ source_id: "temp_1", target_id: "existing_123", type: "RESOLVES" }] })`

## Type System Reference

### NodeType (5 values)

- `knowledge`: Decisions, constraints, principles, findings, requirements, pitfalls
- `issue`: Problems, errors
- `action`: Tasks, solutions, commands, workflows
- `artifact`: Code patterns, concepts, examples, technologies
- `source`: Web URLs, file paths, repositories, API docs

### NodeRole (20 values)

**knowledge** (6): constraint, decision, finding, pitfall, principle, requirement
**issue** (2): error, problem
**action** (4): command, solution, task, workflow
**artifact** (4): code_pattern, concept, example, technology
**source** (4): web_url, file_path, repository, api_doc

### Type-Role Decision Tree

Storing knowledge? → type=knowledge
  Restrictive "cannot do Y"? → role=constraint
  Choice with rationale? → role=decision
  Observation/measurement? → role=finding
  "Avoid X" warning? → role=pitfall
  Aspirational "should do X"? → role=principle
  Non-negotiable spec? → role=requirement
Storing problem/error? → type=issue
  Specific error instance? → role=error
  General problem to solve? → role=problem
Storing action? → type=action
  Shell/build command? → role=command
  Problem solution? → role=solution
  Work item? → role=task
  Process/pipeline? → role=workflow
Storing artifact? → type=artifact
  Reusable pattern? → role=code_pattern
  Abstract category? → role=concept
  Concrete one-off instance? → role=example
  Library/tool? → role=technology
Storing external source? → type=source
  Web documentation? → role=web_url
  Local file reference? → role=file_path
  Git repository? → role=repository
  API documentation? → role=api_doc

### EdgeType (11 values)

- `ALTERNATIVE_TO`: X and Y are options (bidirectional)
- `ANCHORED_TO`: X is relevant to code file Y
- `BASED_ON`: X derived from Y
- `CAUSES`: X leads to Y
- `CONTRADICTS`: X conflicts with Y (bidirectional)
- `DEPENDS_ON`: X requires Y
- `EXAMPLE_OF`: X demonstrates Y
- `PART_OF`: X is component of Y
- `RELATED_TO`: X and Y are related (use specific type first — last resort)
- `REPLACES`: X replaces Y (auto-invalidates Y)
- `RESOLVES`: X fixes/solves Y

### Edge Selection Decision Tree

Does X fix/solve Y? → RESOLVES
Does X depend on/require Y? → DEPENDS_ON
Was X derived from/informed by Y? → BASED_ON
Does X conflict with Y? → CONTRADICTS
Does X replace Y? → REPLACES (auto-invalidates Y)
Is X an example/demo of Y? → EXAMPLE_OF
Is X a component/part of Y? → PART_OF
Is X linked to code file Y? → ANCHORED_TO (auto-created via anchor_to param)
Are X and Y alternatives? → ALTERNATIVE_TO
Does X cause/lead to Y? → CAUSES
Weak/unclear association? → RELATED_TO (last resort)

## Search Tips

**Keyword search (mode: 'keyword'):** Works with simple words, quoted phrases (`"exact phrase"`),
boolean `OR`, tag-based filtering. Dots, hyphens, colons, slashes may cause syntax errors.

**Semantic search (mode: 'auto' or 'semantic'):** Finds conceptually related content even with
vocabulary mismatches. Use for exploratory queries like "session management" to find JWT, OAuth,
authentication patterns.

**Recovery:** When keyword search fails, try semantic mode or tag-based search (`query: ""` with
`tags` filter).

**Examples:**

- Keyword: `{ "query": "database locked", "mode": "keyword" }`
- Semantic: `{ "query": "session management", "mode": "semantic" }` → finds JWT, OAuth, auth
  patterns
- Tag search: `{ "query": "", "tags": ["hono", "request"] }`

## Limits

- Batch nodes: max 50 per store call
- Batch edges: max 50 per create call
- Search limit: max 100
- Traverse depth: max 5
- About depth: max 5
