# Texere v4 — Ideas Under Consideration

**Status:** Brainstorm only. Nothing here is decided.  
**Context:** Informed by
[`Knowledge-DB-for-LLMs-2026-03-18.md`](./Knowledge-DB-for-LLMs-2026-03-18.md), architecture review,
and Oracle review (2026-03-18).  
**Scope reminder:** Texere is a data store + retrieval primitives. Agent orchestration lives
outside.

---

## Immutability Rule (Established by Oracle Review)

**"Content is immutable. Quality annotations are not."**

The immutable design exists to preserve the history of knowledge _claims_. Fields that describe what
was believed should never be overwritten — they should trigger a `REPLACES` chain.

Fields that annotate _quality or status_ of a node (`authority`, `valid_from`, `valid_to`) are
external annotations on the node, not the claim itself. Changing them does not require a REPLACES
chain. Use `REPLACES` only when the knowledge claim changes.

This rule keeps the design principled without making metadata management unworkable.

---

## Type System — Decided

See **[`v4-type-system.md`](./v4-type-system.md)** — canonical reference with full usage guidance,
how/when to use each role and edge, and rationale for every cut.

**Summary:** 10 roles (from 20), 9 edges (from 11) — `VERIFIED_BY` added for test coverage queries.

---

## Schema Changes — Decided

### Remove `importance` field

**Decision:** Remove `importance REAL` from the `nodes` table.

**Why:** An LLM storing a node has no calibrated reference frame for a 0–1 relevance float. In
practice the field either saturates near 1.0 (everything feels important at write time) or is
assigned arbitrarily. `min_importance` in search becomes a filter with no reliable calibration.

**What replaces it:**

- **Tags** — categorical, explicit, searchable. `tags: ["adr", "architecture"]` is more reliable
  than `importance: 0.85` for surfacing architectural decisions.
- **Graph structure** — a node with many connections is structurally significant. Computable, not
  guessed.
- **Recency** — `created_at` already exists. Recent nodes naturally surface for current work.
- **Semantic search ranking** — BM25 and vector similarity already handle relevance at query time.

**`confidence` is kept.** It is epistemics ("how certain is this claim"), not relevance. An LLM can
reason about certainty clearly. `confidence: 0.4` on an LLM-inferred edge means something specific;
`importance: 0.4` on a node means nothing consistent.

**Cascading removals:**

- `min_importance` filter from `texere_search` and `texere_search_graph`
- `importance` parameter from all store tool schemas
- Any importance-based sorting or ranking

---

## Data Model Ideas

### 1. Node Authority / Review State

**Idea:** Add a field to nodes indicating how trustworthy or officially accepted the knowledge is.

**Why:** An orchestration layer needs to distinguish an approved ADR from a rough PR comment.
Currently all nodes are equally trusted. The retrieval layer has no way to filter "only show me
approved/accepted knowledge."

**⚠️ Design problem (Oracle review):** The original enum
(`approved | proposed | discussion | inferred`) conflates two orthogonal dimensions into one field:

- **Review state** — has a human blessed this? (`pending | approved | deprecated`)
- **Provenance** — how was this derived? (`stated | llm_inferred | parser_derived | human_verified`)

Jamming both into one enum means you can't represent "LLM-inferred but now approved after review."
The four values will need a 5th and 6th within months.

Additionally, `inferred` is redundant — that's what a low `confidence` score already communicates.

**Options to resolve:**

- Two separate fields: `review_state` + `provenance`
- Single `review_state` field only (drop provenance — let `confidence` handle epistemic trust)
- Keep one enum but explicitly model only review state (`pending | approved | deprecated`)

**Mutability:** Per the immutability rule above, `authority`/`review_state` is a quality annotation
— it can be mutated directly without a REPLACES chain.

**Schema note (Oracle):** Will need a partial index for performance:
`CREATE INDEX idx_nodes_authority ON nodes(authority) WHERE invalidated_at IS NULL`

---

### 2. Validity Windows on Nodes ~~(Bi-Temporal)~~

**⛔ Likely redundant — drop unless retroactive dating is required.**

**Original idea:** Add `valid_from` / `valid_to` timestamps for point-in-time queries.

**Oracle finding:** The current schema already implements validity windows implicitly:

- `created_at` = `valid_from`
- `invalidated_at` = `valid_to`

Point-in-time queries are already expressible:

```sql
WHERE created_at <= :ts AND (invalidated_at IS NULL OR invalidated_at > :ts)
```

The only legitimate case for _separate_ validity windows is **retroactive recording** — e.g.,
recording that an API was deprecated in 2024, but you're ingesting that fact in 2026. If that use
case doesn't exist, these fields add a second clock that must be kept in sync without adding any
expressive power.

**Verdict:** Skip unless a concrete retroactive dating requirement emerges.

---

### 3. Edge Confidence

**Idea:** Add `confidence` (0–1) to edges.

**Why:** Weighted graph traversal is a core orchestration primitive. Nodes already have
`confidence`; edges lacking it creates an asymmetry. Not all edges are equally trustworthy —
"function X implements requirement Y" has very different trust depending on how it was created.

**Oracle rating: Essential** for edge confidence alone.

**Migration:** `ALTER TABLE edges ADD COLUMN confidence REAL DEFAULT 1.0` — safe, backward-
compatible, existing edges get full confidence.

**Mutability:** Edges are already mutable (hard-delete + recreate). Adding confidence doesn't
interact with the immutability design at all.

---

### 3b. Edge Derivation Mode

**Idea:** Add `derivation_mode` to edges: `stated | llm_inferred | parser_derived | human_verified`

**⚠️ Questionable — likely defer.**

**Oracle finding:** `derivation_mode` overlaps heavily with whatever provenance solution is chosen
for nodes (Idea #1). If both go in, the orchestration layer has three trust signals to combine: node
confidence, node authority/provenance, and edge derivation mode. That's model sprawl.

`parser_derived` is also a use-case-specific value being baked into the core schema — it presupposes
a code parsing pipeline that doesn't exist yet in Texere.

If added, keep abstract: `stated | inferred | verified` (not pipeline-specific).

**Verdict:** Defer until Idea #1's provenance design is settled. Resolve overlap first.

---

### 4. Code Symbol Nodes ⭐ Highest Priority

**Idea:** First-class support for code symbols — linking knowledge to specific functions, classes,
files, and constants with structural metadata.

**Why:** The orchestration layer's most critical retrieval lane is finding code anchors
deterministically. Currently a `Source/file_path` node stores `auth/session.ts` as an opaque string.
You cannot ask "what calls `shouldExpireSession`?" or "what knowledge is anchored to line 12 of
`auth/session.ts`?" without full-text scanning content fields.

**Oracle rating: Essential (all three Oracles agree).** Oracle 3 calls this the single
highest-leverage v4 change: "Adding code symbol nodes with callers/callees/imports turns Texere from
a knowledge annotation layer into a genuine code-aware graph."

**⚠️ Implementation: do NOT add nullable columns to the nodes table.**

Sparse nullable columns on the core nodes table is a schema smell where 90% of nodes have NULLs
across 5 columns. Oracle 1 recommendation — a child table:

```sql
CREATE TABLE code_anchors (
  node_id  TEXT PRIMARY KEY REFERENCES nodes(id),
  file_path   TEXT NOT NULL,
  symbol_name TEXT,
  line_start  INTEGER,
  line_end    INTEGER,
  symbol_kind TEXT,  -- function | class | constant | type | module
  language    TEXT
);
```

Query via JOIN. Only populated for `code_symbol` role. Keeps the nodes table clean and
index-friendly.

**New role:** `code_symbol` under the `Source` type (or a new type — TBD).

**Note on invalidation:** `invalidated_at` soft-deletes the node but does NOT cascade to the child
table (SQLite `ON DELETE CASCADE` only fires on hard DELETE). The child row persists correctly for
historical symbol records. No action needed.

**Open questions:**

- New role inside `Source` type, or a new sixth type entirely?
- How much structure — just `file_path + symbol_name`, or full span?
- Should callers/callees be stored as edges or as metadata on the anchor?

---

### 5. `is_current` Flag ⭐ Critical Gap (Oracle 1)

**Idea:** Add a denormalized boolean `is_current` (default `TRUE`) to nodes, set to `FALSE`
transactionally when a `REPLACES` edge is created pointing to this node.

**Why:** Checking whether a node is the current head of a REPLACES chain currently requires an
anti-join:

```sql
WHERE id NOT IN (SELECT target_id FROM edges WHERE type = 'REPLACES')
```

That's an unindexed scan on the edges table. Every retrieval that filters to "current" nodes runs
this — which is nearly every retrieval. With a flag:

```sql
WHERE is_current = TRUE AND invalidated_at IS NULL
```

One indexed column, no subquery.

**Migration:** `ALTER TABLE nodes ADD COLUMN is_current INTEGER DEFAULT 1 NOT NULL` — safe and
backward-compatible. The `replaceNode()` transaction in the graph library must be updated to set
`is_current = 0` on the old node atomically.

**Note:** `is_current = FALSE` and `invalidated_at IS NOT NULL` are related but not identical:

- `is_current = FALSE` means "superseded by a newer version"
- `invalidated_at IS NOT NULL` means "soft-deleted" Both can be true independently.

---

## Retrieval Primitive Ideas

### 6. Structural / Exact Search Mode

**Idea:** Add a `structural` search mode that does case-insensitive exact or substring matching on
specific fields (title, content, tags) rather than FTS5 tokenization or vector similarity.

**Why (Oracle 2 finding):** FTS5 tokenizes on non-word characters. File paths like
`src/auth/session.ts` are split on `/` and `.`, making exact path lookup unreliable. Symbol names
work only if stored verbatim in indexed content. There is no field-scoped exact match today.

**This closes the code anchor retrieval lane gap** — the most critical deterministic retrieval
pattern — without touching embeddings.

**Example:**

```json
{ "mode": "structural", "field": "title", "value": "shouldExpireSession" }
{ "mode": "structural", "field": "content", "substring": "src/auth/session.ts" }
```

**Implementation:** `LIKE '%value%'` or a normalized indexed column on file_path/symbol_name (if
code_anchor child table is added, the `file_path` and `symbol_name` columns are already indexable
directly).

---

### 7. Recency Filter / Sort

**Idea:** Add `created_after` filter and `sort_by=recency` option to `texere_search`.

**Why:** Lane 5 (contradiction/freshness check) is currently broken without this. "Find decisions
about auth from the last 30 days" is impossible — results are always relevance-sorted. The
`created_at` timestamp exists in the DB but is not exposed as a search parameter.

**Example:**

```json
{ "query": "session decisions", "created_after": "2026-01-01T00:00:00Z", "sort_by": "recency" }
```

**Implementation:** Simple `WHERE created_at >= :ts` addition to existing search queries. Low
effort, high retrieval value.

---

### 8. Multi-Edge-Type Traversal

**Idea:** Allow `traverse` to accept an array of `edge_type` values instead of a single one.

**Why (Oracle 2 finding):** Lane 3 (graph expansion) often needs to follow multiple edge types in
one hop. "Expand from node X via DEPENDS_ON or ANCHORED_TO edges" currently requires two separate
`traverse` calls with client-side merge that loses depth accounting.

**Example:**

```json
{ "startId": "node-123", "direction": "outgoing", "edgeTypes": ["DEPENDS_ON", "ANCHORED_TO"] }
```

**Implementation:** Change `WHERE type = ?` to `WHERE type IN (?, ?)` in the recursive CTE. Small
change, meaningful ergonomic improvement.

---

### 9. Filter by Authority

**Idea:** Add `authority` / `review_state` as a filter in `texere_search` and `texere_search_graph`.

**Depends on:** Idea #1 (authority field on nodes).

**⚠️ Questionable as a dedicated field (Oracle 2):** Tags already express status (`"approved"`,
`"draft"`). A first-class field only pays off if authority drives search _ranking_, not just
filtering — or if it needs to be enforced/validated at insert time (which tags cannot do).

**If Idea #1 is added as a first-class field**, the filter naturally follows. If the decision is
"use tags," this idea is dropped.

**Example:**

```json
{ "query": "session timeout", "authority": "approved" }
```

---

### 10. Gap / Orphan Queries

**Idea:** A tool that finds nodes _lacking_ a specific relationship — e.g., requirements with no
implementation link, decisions with no RESOLVES edge.

**Why (Oracle 3):** The doc's "open questions" section of a task pack requires surfacing unresolved
gaps. Currently impossible — Texere can traverse what exists but cannot query the _absence_ of a
relationship. None of the original 10 ideas addressed this.

**Example tool:** `texere_find_gaps(role="requirement", missing_edge_type="ANCHORED_TO")` → returns
all current requirement nodes with no outgoing ANCHORED_TO edge.

**Implementation:** `NOT EXISTS` subquery — entirely within scope, no agent logic required.

```sql
SELECT n.* FROM nodes n
WHERE n.role = 'requirement'
  AND n.invalidated_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM edges e
    WHERE e.source_id = n.id AND e.type = 'ANCHORED_TO'
  )
```

---

### 11. Corpus / Namespace (Within-DB)

**Idea:** Add a lightweight `corpus` field to nodes to partition knowledge by domain within a single
database.

**Narrowed by Oracle review:** The original idea conflated two different problems:

- **Within-DB organization** — separating "project memory" from "team decisions" from "imported API
  knowledge" in one DB. A `corpus` tag or field handles this.
- **Versioned external domain packs** (e.g., `freecad/1.0`) — Oracle 3 finding: this is **already
  solved**. The MCP server accepts `--db-path`. Run separate Texere instances pointing at separate
  DB files. No schema change needed for this use case.

**Remaining scope:** A `corpus` field (or enforced tag) for within-DB separation. Useful before bulk
external knowledge ingestion pollutes project retrieval lanes.

**Example:**

```json
{ "query": "session requirements", "corpus": "project" }
```

**Questions:**

- First-class field or an enforced tag convention?
- Should cross-corpus edges be allowed?

---

### 12. Contradiction Discovery Tool

**Idea:** A tool that finds `CONTRADICTS` relationships — given a node ID or query, return all known
contradictions.

**Why:** Lane 5 (contradiction check) is awkward today: you must search for related nodes, then
traverse each one for CONTRADICTS edges, then merge. A tool combining search + CONTRADICTS traversal
would expose this as a first-class operation.

**⚠️ Scope constraint (Oracle 3):** This tool must operate strictly on _stored_ CONTRADICTS edges.
It must **not** infer contradictions from content similarity — that would be agent logic.

**Implementation:** Effectively a preset `search_graph` with `edge_type=CONTRADICTS`. May not need a
new tool — could be an orchestration layer pattern. Promote to a dedicated tool only if the pattern
proves common.

**Should it also surface `ALTERNATIVE_TO`?** (Competing valid options alongside outright conflicts)

---

### 13. Edge Quality Filters in Traversal

**Idea:** Filter edges during traversal by `confidence` minimum.

**Depends on:** Idea #3 (edge confidence).

**Why:** Following only high-confidence links during graph expansion produces tighter, more reliable
subgraphs than following all edges indiscriminately.

**Example:**

```json
{ "startId": "node-123", "direction": "outgoing", "min_edge_confidence": 0.8 }
```

**Defer until edge confidence is implemented.**

---

### 14. Richer `texere_stats`

**Idea:** Expand stats to be useful for graph health monitoring and agent routing decisions.

**Current:** Just node/edge counts by type.

**Oracle 3 specific recommendations:**

- Node coverage by type/role (distribution, not just totals)
- Edge density per node (avg outgoing edges — spot over/under-connected nodes)
- Nodes with no outgoing edges (orphans — candidates for gap queries)
- Contradiction edge count (unresolved conflicts in graph)
- Embeddings coverage (% of nodes with embeddings — indicates semantic search quality)

**Lower priority** — no retrieval lane depends on this. Useful for observability.

---

## Known `search_graph` Limitations (Oracle 2)

The current `texere_search_graph` tool has structural weaknesses relevant to v4 design:

1. **Opaque seed quality** — you can't inspect which seed nodes were found before expansion runs. If
   seed relevance is poor, results are noisy with no diagnostic path.

2. **Uniform traversal config** — all seeds use the same `depth`/`direction`/`edge_type`. In
   practice, a `file_path` seed should expand via `ANCHORED_TO` while a `requirement` seed should
   expand via `DEPENDS_ON`. Impossible in one call.

3. **Rank collapse** — results are ordered by seed index then depth, discarding the original seed
   relevance score. Orchestration layer ranking (by authority, recency, etc.) needs raw relevance
   scores.

**Implication for orchestration layer design:** Sophisticated orchestration will compose `search` +
`traverse` manually for most retrieval lanes rather than using `search_graph`. Keep `search_graph`
as a convenience shortcut for simple patterns — don't build the orchestration layer around it.

---

## Performance Roadmap (Oracle 2)

| Component                | Current Risk | Threshold                                                  | Action                                        |
| ------------------------ | ------------ | ---------------------------------------------------------- | --------------------------------------------- |
| FTS5 keyword search      | None         | Handles millions of rows                                   | —                                             |
| Vector / semantic search | **High**     | Linear full-scan. Noticeable ~20k nodes, blocking ~100k    | Add ANN index (HNSW) before 20k nodes         |
| Recursive CTE traversal  | Medium       | Depth 5 × avg degree 10 = 100k paths. Dense subgraphs slow | Recommend depth ≤ 3 in orchestration layer    |
| `search_graph`           | High         | Multiplies traversal by seed_limit                         | Enforce seed_limit ≤ 5, depth ≤ 2 as defaults |

**ANN vector index** is the only hard scalability wall. Plan for it before bulk node ingestion.

---

## Tool / API Surface Ideas

**Design principle:** Texere just needs good tools. Being smart is the caller's job. Every tool idea
here is judged by one test: _does this return enough information that the caller can decide what to
do next without another tool call?_

---

### T1. Multi-edge-type filter in `texere_traverse`

**Idea:** Accept an array of edge types instead of a single value.

**Why:** Expanding a node's neighbourhood often requires following multiple relationship types.
"Give me everything connected to this requirement via RESOLVES or DEPENDS_ON" currently requires two
separate traverse calls, with the caller merging results and losing correct depth accounting.

**Example:**

```json
{ "startId": "req-001", "edgeTypes": ["RESOLVES", "DEPENDS_ON"], "direction": "incoming" }
```

**Effort:** Small — change `WHERE type = ?` to `WHERE type IN (?, ?)` in the recursive CTE.

---

### T2. Expose `mode_used` in `texere_search` response

**Idea:** Include which search mode actually fired in the response metadata.

**Why:** The `auto` mode picks between keyword, semantic, and hybrid based on query shape. When
results are thin or surprising, the caller cannot know whether to retry with a different mode
without making another call. Returning `"mode_used": "keyword"` costs nothing and tells the caller
exactly what happened.

**Example response addition:**

```json
{ "nodes": [...], "meta": { "mode_used": "keyword", "total": 3 } }
```

---

### T3. Expose seed nodes in `texere_search_graph` response ⚠️ Required

**Idea:** Return seed nodes (with their relevance scores) as a separate field before the expanded
results.

**This is a correctness fix, not an enhancement.** Without it, `search_graph` returns an
undifferentiated blob — the caller cannot distinguish which nodes were found by search vs retrieved
by traversal expansion. When results are poor, the caller cannot tell whether the seed search failed
or the traversal expanded to noise, without making a separate `texere_search` call to check. That
defeats the purpose of having a combined tool.

**Example response:**

```json
{
  "seeds": [{ "id": "...", "title": "...", "relevance": 0.91 }],
  "nodes": [...]
}
```

---

### T4. Batch `start_ids[]` on `texere_traverse`

**Idea:** Accept an array of start node IDs instead of a single ID, traversing from all seeds in one
call and returning a deduped result set.

**Why:** After `search` returns 6 relevant nodes, the caller wants the neighbourhood of all of them
to assess context. Today that's 6 separate `traverse` calls with 6 result sets to merge client-side,
losing correct depth accounting across seeds. A single `traverse(start_ids=[...])` does this in one
call, one round trip.

Note: a dedicated `get_neighbours` tool would just be `traverse(start_ids=[id], max_depth=1)` — the
same capability without a new tool. Extending `traverse` is cleaner.

**Example:**

```json
{
  "startIds": ["req-001", "req-002", "dec-007"],
  "direction": "both",
  "maxDepth": 1
}
```

Returns: deduped nodes from all three seeds with their depth from the nearest seed.

---

### T5. `texere_find_gaps` — absence-of-relationship queries

**Idea:** A dedicated tool that finds nodes missing a specific relationship.

**Why:** "Which requirements have no decision implementing them?" is the core quality check for the
REQ → ADR → code chain. Currently impossible without fetching all requirements and filtering
client-side. A single `NOT EXISTS` subquery in SQL answers it instantly.

**Example:**

```json
{ "role": "requirement", "missing_edge": "RESOLVES", "direction": "incoming" }
```

Returns all `requirement` nodes with no incoming `RESOLVES` edge — unimplemented requirements. Same
pattern covers: decisions with no `ANCHORED_TO` (unlinked to code), examples with no `EXAMPLE_OF`
(orphaned artifacts).

**Effort:** Single SQL query with `NOT EXISTS`. No schema changes.

---

### T6. `created_after` filter and `sort_by` in `texere_search`

**Idea:** Add `created_after` timestamp filter and `sort_by=recency` option to `texere_search`.

**Why:** "Find decisions about auth from the last 30 days" is currently impossible — results are
always relevance-sorted. The `created_at` column exists but is not exposed as a search parameter.
Filtering at the DB level (not client-side) is the only token-efficient path.

**Example:**

```json
{ "query": "session auth", "created_after": "2026-01-01T00:00:00Z", "sort_by": "recency" }
```

**Effort:** `WHERE created_at >= :ts` addition to existing search queries. Trivial.

---

### T7. Structural / exact search mode in `texere_search`

**Idea:** Add a `structural` mode that does exact or substring matching on `title` and content
fields rather than FTS5 tokenization or vector similarity.

**Why:** FTS5 tokenizes on non-word characters. `src/auth/session.ts` splits into `src`, `auth`,
`session`, `ts` — a file path search returns wrong results. Symbol names like `shouldExpireSession`
work, but paths don't. Structural mode does a `LIKE '%value%'` or indexed exact match, bypassing
FTS5 entirely.

**Example:**

```json
{ "mode": "structural", "query": "src/auth/session.ts" }
```

**Effort:** Add a `LIKE`-based query path alongside the existing FTS5 path.

---

### T8. Atomic bulk node + edge creation

**Idea:** A single tool call that accepts an array of nodes and their edges, creating everything
transactionally.

**Why:** The current `storeNodesWithEdges` helper exists but is limited. A code pipeline importing
symbols from a parsed file wants to create 50–200 nodes with their relationships atomically — one
call, one transaction, all-or-nothing. An LLM benefits too (related nodes created together stay
consistent). Doing this as N individual `store_*` calls is slow, non-atomic, and expensive in tokens
and round trips.

**Input shape:**

```json
{
  "nodes": [
    { "temp_id": "sym-1", "type": "source", "role": "file_path", "title": "auth/session.ts", ... },
    { "temp_id": "sym-2", "type": "knowledge", "role": "requirement", "title": "Session expiry", ... }
  ],
  "edges": [
    { "source": "sym-2", "target": "sym-1", "type": "ANCHORED_TO" }
  ]
}
```

`temp_id` values are local references resolved within the batch — callers don't need real IDs
upfront.

**Both callers benefit differently:**

- Code pipeline: import a whole file's symbols in one atomic operation
- LLM: create a cluster of related nodes (requirement + decision + source) without managing IDs
  across multiple calls

**`on_conflict` parameter:** Code pipelines re-importing an edited file will create duplicates
without upsert semantics. Add `on_conflict: "skip" | "replace"` to the batch call. `skip` = do not
create if a node with the same title + role already exists. `replace` = create new + REPLACES edge
automatically.

**Effort:** Medium — transaction wrapping existing node/edge logic. `temp_id` resolution and
`on_conflict` handling are the main new pieces.

---

### T10. Remove `texere_store_issue` tool

**Idea:** Remove the tool entirely. The Issue type (error, problem) was cut from the type system.

**Why:** The tool has no valid roles to accept. Keeping it creates confusion — callers see it in the
tool list and wonder if they should use it. Dead surface should be removed, not left as a stub.

**Effort:** Delete the tool file, remove from index.

---

### T11. Cut singular tool variants

**Idea:** Remove `texere_delete_edge`, `texere_invalidate_node`, and `texere_get_node` — absorbed by
their plural counterparts which already accept single-element arrays.

**Why:** Three tools that add surface area without capability. Every caller that would use the
singular can use the plural with a one-element array. Fewer tools = less cognitive overhead for LLM
callers choosing between them. The singular/plural split is a pattern left over from early API
design that no longer earns its place.

- `delete_edge(id)` → `delete_edges([id])`
- `invalidate_node(id)` → `invalidate_nodes([id])`
- `get_node(id)` → `get_nodes([id])`

**Effort:** Remove 3 tool files, remove from index, update any references.

---

### T12. `texere_get_edges` — edge list for a node

**Idea:** Return all edges for a given node ID — type, direction, and connected node ID for each.

**Why:** `getEdgesForNode()` already exists in the graph library but has no MCP wrapper. Currently
the only way to inspect what a node connects to is via `traverse`, which returns full neighbour
nodes. A lightweight `get_edges` returns just the edge metadata (type, target id, direction) — much
cheaper when the caller only needs to know what relationships exist, not the full node content.

Both callers need this:

- LLM agent: "what does this node connect to and how?" before deciding which edges to traverse
- Code pipeline: check for duplicate edges before calling `create_edge`

**Example:**

```json
{ "id": "req-001" }
```

Returns:

```json
[
  { "id": "edge-1", "type": "RESOLVES", "direction": "incoming", "nodeId": "dec-007" },
  { "id": "edge-2", "type": "ANCHORED_TO", "direction": "outgoing", "nodeId": "src-003" }
]
```

**Effort:** Trivial — MCP wrapper around existing `getEdgesForNode()`.

---

### T13. Richer `texere_stats`

**Idea:** Expand stats to include graph health signals useful for deciding what to do next.

**Current:** Node and edge counts by type only.

**Add:**

- Nodes with no outgoing edges (orphans — likely missing relationships)
- Requirements with no incoming `RESOLVES` (unimplemented)
- `CONTRADICTS` edge count (known conflicts)
- Embedding coverage % (how much of the graph is searchable semantically)
- Breakdown by role, not just type

**Why:** The caller uses stats to understand the state of the graph before querying it. Richer stats
reduce exploratory queries.

---

## Non-Ideas (Out of Scope for Texere)

Things discussed but explicitly not Texere's job:

- **Task pack assembly** — orchestration layer does this using Texere's retrieval primitives
- **Retrieval planning** — orchestration layer decides what to query
- **Ingest pipelines** — extracting nodes from source docs/code is external
- **Evidence ranking** — orchestration layer ranks, Texere returns raw results
- **Agent behavior** — Texere has no agents, only tools
- **Contradiction inference** — finding contradictions from content similarity is agent logic;
  Texere only surfaces stored `CONTRADICTS` edges
- **Execution harnesses** — validating generated code against runtimes is not Texere's concern
- **Versioned domain pack management** — use separate DB files via `--db-path`, not Texere schema

---

## Priority Summary

Type system pruning ships **before** any additions. Decided — see
[`v4-type-system.md`](./v4-type-system.md).

### Phase 0 — Type System (decided)

10 roles, 8 edges. Full reference: [`v4-type-system.md`](./v4-type-system.md)

### Phase 1 — High Priority

| #   | Idea                                                                                           | Reason                                      |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | **Remove `importance` field** (schema)                                                         | Decided — see Schema Changes section        |
| 2   | **`is_current` flag** (schema)                                                                 | Critical gap; affects every retrieval query |
| 3   | **Add `VERIFIED_BY` edge** (type system)                                                       | Test coverage query impossible without it   |
| 4   | **Remove dead tools** — `store_issue`, `delete_edge`, `invalidate_node`, `get_node` (T10, T11) | Dead surface; cut now                       |
| 5   | **T3: Seeds in `search_graph`**                                                                | Correctness fix — tool is broken without it |
| 6   | **T7: Structural search mode**                                                                 | Correctness fix — file paths broken in FTS5 |
| 7   | **T12: `get_edges` MCP wrapper**                                                               | Already in graph API; trivial to expose     |
| 8   | **T1 + T4: Multi-edge-type + batch `start_ids[]` on `traverse`**                               | Collapse N calls to 1                       |
| 9   | **T5: `texere_find_gaps`**                                                                     | Unimplemented requirements — pure SQL       |
| 10  | **T8: Atomic bulk creation + `on_conflict`**                                                   | Transactional batch for both callers        |

### Phase 2 — Medium Priority

| #   | Idea                                   | Reason                                                      |
| --- | -------------------------------------- | ----------------------------------------------------------- |
| 11  | **T6: Recency filter / `sort_by`**     | Freshness queries currently impossible                      |
| 12  | **T2: `mode_used` in search response** | Caller can diagnose and retry                               |
| 13  | **Code symbol nodes** (child table)    | Unlocks deterministic code anchor retrieval                 |
| 14  | **Authority / review state** (schema)  | Design must resolve provenance vs. review-state split first |
| 15  | **Edge confidence** (schema)           | Enables weighted traversal; simple addition                 |

### Phase 3 — Lower Priority / Defer

| #   | Idea                           | Reason                                              |
| --- | ------------------------------ | --------------------------------------------------- |
| 16  | **T13: Richer `texere_stats`** | Useful; add last                                    |
| 17  | **Corpus field**               | Prevents external knowledge pollution; low effort   |
| —   | **Validity windows**           | Drop — redundant with existing schema               |
| —   | **Authority filter in search** | Follows from authority field; add together          |
| —   | **Edge derivation mode**       | Defer — resolve overlap with authority design first |
| —   | **Edge quality in traversal**  | Defer — depends on edge confidence                  |

---

## Open Cross-Cutting Questions

1. **Authority design** — Single `review_state` field, or two fields (`review_state` +
   `provenance`)? Resolve before implementing the authority idea or edge derivation mode.

2. **Code symbol type** — New `code_symbol` role under `Source`, or a new sixth node type? Affects
   the type-role validation matrix.

3. **Schema migration** — v4 adds columns to `nodes` and `edges`, plus the `code_anchors` child
   table. `ALTER TABLE ADD COLUMN` is safe for additive changes; `code_anchors` requires a new
   `CREATE TABLE`. What's the migration strategy for existing databases?

4. **`is_current` backfill** — Adding the flag to existing databases requires identifying all
   current head nodes by traversing REPLACES edges. Needs a one-time migration query.
