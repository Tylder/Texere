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
3. Create node: `texere_store_node` only after reviewing search results
4. Create edges immediately: Link new node to related nodes from step 2

Graph value = connections. Searching first prevents duplicates, identifies deprecation
opportunities, discovers edge candidates.

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

### texere_search_batch

Run multiple searches in one call. Results indexed by query position.

| arg     | type                   | required | default | notes                   |
| ------- | ---------------------- | -------- | ------- | ----------------------- |
| queries | SearchOptions[] (1-50) | yes      | —       | Array of search queries |

Returns: `{ results: SearchResult[][] }` (array of result arrays, one per query)

Example:
`texere_search_batch({ queries: [{ query: "auth", mode: "keyword" }, { query: "timeout", type: "issue" }] })`

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

### texere_store_node

Create a single immutable node with optional anchors.

| arg        | type         | required | default   | notes                                         |
| ---------- | ------------ | -------- | --------- | --------------------------------------------- |
| type       | NodeType     | yes      | —         | Node type (7 values)                          |
| role       | NodeRole     | yes      | —         | Node role (26 values)                         |
| title      | string       | yes      | —         | Short descriptive title                       |
| content    | string       | yes      | —         | Detailed content                              |
| tags       | string[]     | no       | —         | Tags for categorization                       |
| importance | number (0-1) | no       | 0.5       | Importance score                              |
| confidence | number (0-1) | no       | 0.8       | Confidence score                              |
| status     | NodeStatus   | no       | "active"  | proposed/active/deprecated/invalidated        |
| scope      | NodeScope    | no       | "project" | project/module/file/session                   |
| anchor_to  | string[]     | no       | —         | File paths (auto-creates ANCHORED_TO edges)   |
| sources    | string[]     | no       | —         | Source node IDs (auto-creates BASED_ON edges) |
| minimal    | boolean      | no       | false     | Return only `{ id }` if true                  |

Returns: `{ node: Node }` or `{ node: { id: string } }` if minimal

Example:
`texere_store_node({ type: "knowledge", role: "decision", title: "Use SQLite with WAL", content: "...", tags: ["db"], importance: 0.9, anchor_to: ["src/db/connection.ts"] })`

### texere_store_nodes

Create multiple immutable nodes atomically (max 50).

| arg     | type                    | required | default | notes                                                   |
| ------- | ----------------------- | -------- | ------- | ------------------------------------------------------- |
| nodes   | StoreNodeInput[] (1-50) | yes      | —       | Array of node inputs (same schema as texere_store_node) |
| minimal | boolean                 | no       | false   | Return only `{ id }` per node if true                   |

Returns: `{ nodes: Node[] }` or `{ nodes: Array<{ id: string }> }` if minimal

Example:
`texere_store_nodes({ nodes: [{ type: "knowledge", role: "principle", title: "...", content: "..." }, { type: "artifact", role: "technology", title: "...", content: "..." }] })`

### texere_create_edge

Create a single edge between two nodes.

| arg        | type         | required | default | notes                        |
| ---------- | ------------ | -------- | ------- | ---------------------------- |
| source_id  | string       | yes      | —       | Source node ID               |
| target_id  | string       | yes      | —       | Target node ID               |
| type       | EdgeType     | yes      | —       | Edge type (16 values)        |
| strength   | number (0-1) | no       | 0.5     | Edge strength                |
| confidence | number (0-1) | no       | 0.8     | Edge confidence              |
| minimal    | boolean      | no       | false   | Return only `{ id }` if true |

Returns: `{ edge: Edge }` or `{ edge: { id: string } }` if minimal

Example:
`texere_create_edge({ source_id: "sol789", target_id: "prob456", type: "RESOLVES", strength: 0.9 })`

### texere_create_edges

Create multiple edges atomically (max 50).

| arg     | type                     | required | default | notes                                                    |
| ------- | ------------------------ | -------- | ------- | -------------------------------------------------------- |
| edges   | CreateEdgeInput[] (1-50) | yes      | —       | Array of edge inputs (same schema as texere_create_edge) |
| minimal | boolean                  | no       | false   | Return only `{ id }` per edge if true                    |

Returns: `{ edges: Edge[] }` or `{ edges: Array<{ id: string }> }` if minimal

Example:
`texere_create_edges({ edges: [{ source_id: "src_123", target_id: "concept_456", type: "ABOUT" }, { source_id: "find_789", target_id: "src_123", type: "BASED_ON" }] })`

### texere_replace_node

Atomically replace a node: store new node, create REPLACES edge, invalidate old node.

| arg        | type         | required | default   | notes                                       |
| ---------- | ------------ | -------- | --------- | ------------------------------------------- |
| old_id     | string       | yes      | —         | ID of node to replace                       |
| type       | NodeType     | yes      | —         | Node type (7 values)                        |
| role       | NodeRole     | yes      | —         | Node role (26 values)                       |
| title      | string       | yes      | —         | Short descriptive title                     |
| content    | string       | yes      | —         | Detailed content                            |
| tags       | string[]     | no       | —         | Tags for categorization                     |
| importance | number (0-1) | no       | 0.5       | Importance score                            |
| confidence | number (0-1) | no       | 0.8       | Confidence score                            |
| status     | NodeStatus   | no       | "active"  | proposed/active/deprecated/invalidated      |
| scope      | NodeScope    | no       | "project" | project/module/file/session                 |
| anchor_to  | string[]     | no       | —         | File paths (auto-creates ANCHORED_TO edges) |
| minimal    | boolean      | no       | false     | Return only `{ id }` if true                |

Returns: `{ node: Node }` or `{ node: { id: string } }` if minimal

Example:
`texere_replace_node({ old_id: "old_decision_123", type: "knowledge", role: "decision", title: "Use GraphQL", content: "...", tags: ["api"], importance: 0.9 })`

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

### NodeType (7 values)

- `knowledge`: Decisions, constraints, principles, findings, requirements, research, pitfalls
- `issue`: Problems, errors
- `action`: Tasks, solutions, fixes, workflows, commands
- `artifact`: Code patterns, concepts, examples, file contexts, projects, technologies
- `source`: Web URLs, file paths, repositories, API docs
- `context`: Conversations
- `meta`: System metadata

### NodeRole (26 values)

**knowledge** (7): constraint, decision, finding, pitfall, principle, requirement, research
**issue** (2): error, problem **action** (5): command, fix, solution, task, workflow **artifact**
(6): code_pattern, concept, example, file_context, project, technology **source** (4): web_url,
file_path, repository, api_doc **context** (1): conversation **meta** (1): system

### Type-Role Decision Tree

Storing knowledge? → type=knowledge Restrictive "cannot do Y"? → role=constraint Choice with
rationale? → role=decision Observation/measurement? → role=finding "Avoid X" warning? → role=pitfall
Aspirational "should do X"? → role=principle Non-negotiable spec? → role=requirement External source
material? → role=research Storing problem/error? → type=issue Specific error instance? → role=error
General problem to solve? → role=problem Storing action? → type=action Shell/build command? →
role=command Bug fix? → role=fix Problem solution? → role=solution Work item? → role=task
Process/pipeline? → role=workflow Storing artifact? → type=artifact Reusable pattern? →
role=code_pattern Abstract category? → role=concept Concrete one-off instance? → role=example
File-specific context? → role=file_context Project metadata? → role=project Library/tool? →
role=technology Storing external source? → type=source Web documentation? → role=web_url Local file
reference? → role=file_path Git repository? → role=repository API documentation? → role=api_doc
Storing conversation? → type=context, role=conversation Storing system metadata? → type=meta,
role=system

### EdgeType (16 values)

- `ABOUT`: X describes/documents Y
- `ALTERNATIVE_TO`: X and Y are options (bidirectional)
- `ANCHORED_TO`: X is relevant to code file Y
- `BASED_ON`: X derived from Y
- `CAUSES`: X leads to Y
- `CONSTRAINS`: X limits Y
- `CONTRADICTS`: X conflicts with Y (bidirectional)
- `DEPENDS_ON`: X requires Y
- `EXAMPLE_OF`: X demonstrates Y
- `EXTENDS`: X builds on Y
- `IS_A`: X is instance/subtype of Y
- `PART_OF`: X is component of Y
- `RELATED_TO`: X and Y are related (use specific type first)
- `REPLACES`: X replaces Y (auto-invalidates Y)
- `RESOLVES`: X fixes/solves Y
- `SUPPORTS`: X helps Y (weaker than RESOLVES)

### Edge Selection Decision Tree

Does X fix/solve Y? → RESOLVES Does X depend on/require Y? → DEPENDS_ON Does X build upon/extend Y?
→ EXTENDS Does X limit/restrict Y? → CONSTRAINS Does X conflict with Y? → CONTRADICTS Was X derived
from/informed by Y? → BASED_ON Does X support/help Y (weaker than fixes)? → SUPPORTS Does X replace
Y? → REPLACES (auto-invalidates Y) Is X an example/demo of Y? → EXAMPLE_OF Is X a subtype/instance
of Y? → IS_A Is X a component/part of Y? → PART_OF Is X linked to code file Y? → ANCHORED_TO
(auto-created via anchor_to param) Are X and Y alternatives? → ALTERNATIVE_TO Does X cause/lead to
Y? → CAUSES Does X describe/document Y AND nothing above fits? → ABOUT Weak/unclear association? →
RELATED_TO (last resort)

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

- Batch nodes: max 50
- Batch edges: max 50
- Search limit: max 100
- Traverse depth: max 5
- About depth: max 5
