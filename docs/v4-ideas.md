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

Ordered by oracle consensus and retrieval lane impact:

| Priority | Idea                                   | Reason                                                                         |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| 1        | **#4 Code symbol nodes** (child table) | Highest leverage; unlocks deterministic code anchor retrieval                  |
| 2        | **#5 `is_current` flag**               | Critical performance gap; affects every retrieval query                        |
| 3        | **#6 Structural search mode**          | Closes code anchor lane; FTS5 tokenization breaks file paths                   |
| 4        | **#7 Recency filter / sort**           | Lane 5 (freshness) is currently broken without this                            |
| 5        | **#8 Multi-edge-type traversal**       | Lane 3 gap; currently requires N calls with broken depth accounting            |
| 6        | **#3 Edge confidence**                 | Enables weighted traversal; simple schema addition                             |
| 7        | **#1 Authority / review state**        | Real need, but design needs to resolve provenance vs. review-state split first |
| 8        | **#10 Gap / orphan queries**           | "Open questions" capability; pure SQL, no agent logic                          |
| 9        | **#11 Corpus field**                   | Prevents external knowledge pollution; low effort                              |
| 10       | **#12 Contradiction tool**             | Useful; may be orchestration-layer pattern rather than new tool                |
| —        | **#2 Validity windows**                | Drop — redundant with existing schema                                          |
| —        | **#9 Authority filter**                | Follows from #1; add together or use tags                                      |
| —        | **#3b Derivation mode**                | Defer — resolve overlap with #1 first                                          |
| —        | **#13 Edge quality in traversal**      | Defer — depends on #3                                                          |
| —        | **#14 Richer stats**                   | Nice-to-have, add last                                                         |

---

## Open Cross-Cutting Questions

1. **Authority design** — Single `review_state` field, or two fields (`review_state` +
   `provenance`)? Resolve before implementing Idea #1 or #3b.

2. **Code symbol type** — New `code_symbol` role under `Source`, or a new sixth node type? Affects
   type-role validation matrix.

3. **Schema migration** — v4 adds columns to `nodes` and `edges`, plus the `code_anchors` child
   table. What's the migration path for existing databases? SQLite `ALTER TABLE ADD COLUMN` is safe
   for additive changes; `code_anchors` table requires a new `CREATE TABLE`.

4. **`is_current` backfill** — When adding the flag to existing databases, all current head nodes
   need to be identified and flagged correctly. Requires a one-time migration query traversing all
   REPLACES edges.
