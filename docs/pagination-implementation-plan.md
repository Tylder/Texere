# Pagination Implementation Plan

**Date**: 2026-03-13  
**Status**: Implemented; retained as design record  
**Scope**: Cursor pagination for multi-result query endpoints in Texere

---

## Executive Summary

Before implementation, Texere supported partial result limiting, but not real pagination.

- `texere_search` supports `limit`, capped at `100`
- `texere_search_graph` supports `limit`, capped at `100`
- `texere_traverse` supports `max_depth`, but no result `limit`
- `texere_get_nodes` is batch-by-id retrieval, not a list/query endpoint
- No endpoint supported `cursor`, `next_cursor`, or `has_more`

This plan adds cursor pagination to all multi-result query endpoints:

- `texere_search`
- `texere_traverse`
- `texere_search_graph`

It does **not** add pagination to:

- `texere_get_nodes`
- write tools (`store_*`, `create_edge`)
- `validate`

Recommended limits:

- MCP-visible max limit: `250`
- Graph/internal hard cap: `500`

---

## Problem Statement

The original API had two gaps:

1. Large result sets cannot be fetched incrementally
2. Existing sort orders are not fully stable for cursor pagination in `search`

Before implementation:

- `search()` uses `LIMIT`, but has no cursor support
- `traverse()` returns all reachable rows up to `maxDepth`
- `searchGraph()` limits seed search only, not the final expanded result set
- `search()` ordering lacks deterministic tie-breakers for keyword, semantic, and hybrid modes

Without stable ordering, cursor pagination can skip or duplicate rows across page boundaries.

---

## Scope

### In Scope

- Cursor pagination for `search`
- Cursor pagination for `traverse`
- Cursor pagination for `search_graph`
- Raising MCP max limits
- Adding graph-layer hard caps
- Adding deterministic tie-breakers where missing
- Adding graph and MCP tests for pagination correctness

### Out of Scope

- Pagination for `get_nodes`
- Pagination for write/validation tools
- Backward pagination
- Cursor versioning
- Snapshot isolation across page turns
- Response projection/minimal-field pagination

---

## Why `get_nodes` Stays Non-Paginated

`texere_get_nodes` is not a list endpoint. It is batch retrieval by explicit `ids` with two
important semantics:

- preserves input order
- preserves null alignment for missing ids

Adding cursor pagination there would make the API more confusing without solving a real query
problem.

---

## Pre-Implementation Behavior Summary

### `search`

Current files:

- `packages/graph/src/search.ts`
- `apps/mcp/src/tools/search.ts`

Current ordering:

- keyword: `ORDER BY rank ASC`
- semantic: `ORDER BY vm.distance ASC`
- hybrid: in-memory sort by `match_quality DESC`
- filter-only search: `ORDER BY n.created_at DESC`

Current issues:

- no cursor
- no stable `id` tie-breaker
- hybrid ranking is fused in memory
- semantic `match_quality` depends on current result window

### `traverse`

Current files:

- `packages/graph/src/traverse.ts`
- `apps/mcp/src/tools/traverse.ts`

Current ordering:

- `ORDER BY depth ASC, n.created_at ASC`

Current issues:

- no result `limit`
- no cursor
- no final `id` tie-breaker

### `search_graph`

Current files:

- `packages/graph/src/traverse.ts`
- `apps/mcp/src/tools/search-graph.ts`

Current behavior:

- searches for seed nodes
- traverses from each seed
- deduplicates nodes in memory
- sorts final rows by `depth ASC`, then `created_at ASC`

Current issues:

- no cursor
- `limit` applies to seed search, not the final returned set
- no final `id` tie-breaker

---

## Proposed API Contract

### Request Shape

Add to all three graph-level option types and MCP tool inputs:

```typescript
{
  limit?: number;
  cursor?: string;
}
```

`traverse` currently lacks `limit`; this plan adds it.

### Response Shape

Return page metadata alongside results:

```typescript
{
  results: T[];
  page: {
    next_cursor: string | null;
    has_more: boolean;
    returned: number;
    limit: number;
    order: string;
    mode?: string;
  };
}
```

Why use `page` instead of top-level metadata:

- keeps pagination metadata grouped
- leaves room for future pagination-related fields
- stays consistent across all three endpoints

---

## Cursor Design

### Cursor Shape

Cursor payload stays opaque to clients and is encoded as base64url JSON.

```typescript
{
  scope: string;
  last: { ...sortKeys };
}
```

No version field and no separate `kind` field are needed.

### Why `scope` Exists

`scope` prevents reusing a cursor with a different request shape.

It should include:

- endpoint identity
- query-specific inputs
- filter values
- traversal settings
- mode where applicable

If the current request produces a different `scope`, the cursor is invalid.

### Recommended `scope` Contents

#### Search

- endpoint: `search`
- `query`
- `mode`
- `type`
- `role`
- `tags`
- `tag_mode`
- `min_importance`

#### Traverse

- endpoint: `traverse`
- `start_id`
- `direction`
- `max_depth`
- `edge_type`

#### Search Graph

- endpoint: `search_graph`
- `query`
- `mode`
- `type`
- `role`
- `tags`
- `tag_mode`
- `min_importance`
- `direction`
- `max_depth`
- `edge_type`

### `last` Payload by Endpoint

#### Search keyword

```typescript
{
  rank: number;
  id: string;
}
```

#### Search semantic

```typescript
{
  distance: number;
  id: string;
}
```

#### Search hybrid

```typescript
{
  score: number;
  id: string;
}
```

#### Traverse and search_graph

```typescript
{
  depth: number;
  created_at: number;
  id: string;
}
```

---

## Ordering Requirements

Cursor pagination only works safely if ordering is deterministic.

### Search

#### Keyword

Change ordering from:

```sql
ORDER BY rank ASC
```

to:

```sql
ORDER BY rank ASC, n.id ASC
```

#### Semantic

Change ordering from:

```sql
ORDER BY vm.distance ASC
```

to:

```sql
ORDER BY vm.distance ASC, n.id ASC
```

#### Hybrid

Change in-memory ordering from score-only to:

- `score DESC`
- `id ASC`

This makes hybrid pagination deterministic even when multiple rows have the same fused score.

#### Filter-only path

Current ordering is already creation-based:

```sql
ORDER BY n.created_at DESC
```

Make it explicit and deterministic:

```sql
ORDER BY n.created_at DESC, n.id ASC
```

### Traverse

Change ordering from:

```sql
ORDER BY depth ASC, n.created_at ASC
```

to:

```sql
ORDER BY depth ASC, n.created_at ASC, n.id ASC
```

### About

Change final in-memory sort from:

- `depth ASC`
- `created_at ASC`

to:

- `depth ASC`
- `created_at ASC`
- `id ASC`

---

## Keyset Pagination Strategy

Use keyset pagination, not offset pagination.

Why:

- stable under larger result sets
- avoids growing scan cost from offsets
- matches deterministic ordering design

All three endpoints should fetch `limit + 1` rows internally.

Rules:

- if more than `limit` rows are fetched, return `has_more = true`
- emit `next_cursor` from the last returned row
- if `limit` or fewer rows are fetched, return `has_more = false` and `next_cursor = null`

---

## Endpoint-by-Endpoint Design

### 1. `search`

#### Files

- `packages/graph/src/types.ts`
- `packages/graph/src/search.ts`
- `packages/graph/src/index.ts`
- `apps/mcp/src/tools/search.ts`

#### Request Changes

- keep `limit`
- add `cursor`
- raise MCP max from `100` to `250`

#### Graph Return Type

Introduce a paginated response wrapper instead of returning bare arrays.

Suggested shape:

```typescript
interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
  returned: number;
  limit: number;
  order: string;
  mode?: string;
}

interface PaginatedResult<T> {
  results: T[];
  page: PageInfo;
}
```

#### Cursor Predicates

Keyword:

```sql
WHERE (
  rank > @cursorRank
  OR (rank = @cursorRank AND n.id > @cursorId)
)
```

Semantic:

```sql
WHERE (
  vm.distance > @cursorDistance
  OR (vm.distance = @cursorDistance AND n.id > @cursorId)
)
```

Filter-only path:

```sql
WHERE (
  n.created_at < @cursorCreatedAt
  OR (n.created_at = @cursorCreatedAt AND n.id > @cursorId)
)
```

#### Hybrid Notes

Hybrid search is the trickiest endpoint because:

- keyword results are ranked in SQL
- semantic results are ranked in SQL
- fusion and dedup happen in memory

Recommended approach:

1. fetch a larger internal candidate window from keyword and semantic paths
2. fuse and deduplicate candidates
3. sort by `score DESC, id ASC`
4. apply cursor against the fused order
5. return `limit + 1`

This avoids page drift caused by slicing too early.

#### Semantic `match_quality` Fix

Current semantic `match_quality` is normalized against the current result window. That should be
changed before pagination, because page boundaries change the score interpretation.

Recommended fix:

- use a stable monotonic transform from raw distance, such as `1 / (1 + distance)`

This keeps `match_quality` consistent across pages.

### 2. `traverse`

#### Files

- `packages/graph/src/types.ts`
- `packages/graph/src/traverse.ts`
- `packages/graph/src/index.ts`
- `apps/mcp/src/tools/traverse.ts`

#### Request Changes

- add `limit`
- add `cursor`
- keep `max_depth`
- raise new MCP limit max to `250`

#### Ordering

Final order must be:

```sql
ORDER BY depth ASC, n.created_at ASC, n.id ASC
```

#### Cursor Predicate

```sql
WHERE (
  depth > @cursorDepth
  OR (depth = @cursorDepth AND n.created_at > @cursorCreatedAt)
  OR (depth = @cursorDepth AND n.created_at = @cursorCreatedAt AND n.id > @cursorId)
)
```

#### Important Note

Traversal currently deduplicates by grouping and `MIN(depth)` in SQL. Pagination must happen after
that shortest-path result set is established.

### 3. `search_graph`

#### Files

- `packages/graph/src/types.ts`
- `packages/graph/src/traverse.ts`
- `packages/graph/src/index.ts`
- `apps/mcp/src/tools/search-graph.ts`

#### Request Changes

- keep `limit`
- add `cursor`
- raise MCP max from `100` to `250`

#### Important Semantics Decision

Today `search_graph.limit` limits seed search only.

Recommended change:

- redefine `limit` to mean final returned page size

Why:

- that is what clients actually care about
- it aligns `search_graph` with `search` and `traverse`
- it avoids surprising page sizes after graph expansion

#### Ordering

Final deduped rows should be sorted by:

- `depth ASC`
- `created_at ASC`
- `id ASC`

#### Dedup Rule

Current behavior keeps the minimum depth for a node. Keep that.

For same-node, same-depth ties, make the preference explicit:

1. better seed rank
2. lower `created_at`
3. lower `id`

Pagination should happen only after the final deduped and sorted result set is established.

---

## Type Changes

### Graph Types

Update:

- `SearchOptions`
- `TraverseOptions`
- `SearchGraphOptions`

Add:

- shared paginated result type(s)
- page metadata type

### MCP Tool Inputs

Update schemas in:

- `apps/mcp/src/tools/search.ts`
- `apps/mcp/src/tools/traverse.ts`
- `apps/mcp/src/tools/search-graph.ts`

Changes:

- add `cursor: z.string().min(1).optional()`
- set `limit` max to `250`
- add `limit` to `traverse`

---

## Validation Rules

Invalid cursor cases should return structured invalid input errors:

- malformed base64url
- malformed JSON
- missing `scope`
- missing `last`
- `scope` mismatch with current request
- missing required sort keys for the target endpoint/mode

---

## Test Plan

### Graph Tests: `packages/graph/src/search.test.ts`

Add tests for:

- first page returns `page.hasMore = true` when more rows exist
- second page from `nextCursor` has no duplicates and no gaps
- final page returns `hasMore = false` and `nextCursor = null`
- keyword pagination is stable when multiple rows share the same BM25 score
- semantic pagination is stable when multiple rows share the same distance
- hybrid pagination is stable after fusion and dedup
- invalid cursor is rejected
- scope mismatch is rejected
- semantic `match_quality` is stable across page boundaries

### Graph Tests: `packages/graph/src/traverse.test.ts`

Add tests for `traverse`:

- first page / second page behavior
- ordering remains `depth ASC, created_at ASC, id ASC`
- no duplicate or missing nodes across pages
- pagination respects `maxDepth`
- pagination respects `edgeType`

Add tests for `search_graph`:

- paginates final deduped rows, not just seeds
- maintains min-depth dedup behavior
- no duplicate nodes across pages
- seed nodes at depth `0` stay ahead of neighbors on later pages
- same-node tie behavior is deterministic

### MCP Tests: `apps/mcp/src/tools.test.ts`

Add tests for:

- `texere_search` accepts `cursor` and returns `page`
- `texere_traverse` accepts `limit` and `cursor` and returns `page`
- `texere_search_graph` accepts `cursor` and returns `page`
- MCP schema cap raised from `100` to `250`
- cursor round-trip through MCP layer
- invalid cursor returns structured `INVALID_INPUT`

### MCP Integration Tests: `apps/mcp/src/server.int.test.ts`

Add assertions that:

- tool schemas expose the new fields
- response shape includes pagination metadata

---

## Rollout Order

Recommended implementation order:

1. add shared pagination types and cursor helpers
2. implement paginated `search`
3. implement paginated `traverse`
4. implement paginated `search_graph`
5. update MCP tool schemas and response shapes
6. add tests
7. run diagnostics, typecheck, tests, and build

Why this order:

- `search` is the hardest case and establishes the reusable cursor pattern
- `traverse` and `search_graph` can then reuse the same pagination approach
- MCP changes are thin wrappers over graph behavior

---

## Risks and Edge Cases

### Hybrid Search Candidate Starvation

If internal candidate windows are too small, later hybrid pages may miss results after dedup and
fusion.

Mitigation:

- fetch a larger internal candidate window than the public page size

### Concurrent Writes Between Pages

New rows or invalidations between page requests can still shift visible results.

This plan does **not** solve snapshot consistency.

If strict consistency is needed later, add an `as_of` fence separately.

### `search_graph.limit` Behavior Change

Changing `search_graph.limit` from seed-limit to final-page-size is a semantic change.

Mitigation:

- document it clearly in the tool description and release notes

---

## Open Questions

These do not block implementation, but should be decided explicitly:

1. Should `search_graph` expose a separate `seed_limit`, or just repurpose `limit` as page size?
2. Should internal graph hard caps be enforced per endpoint or through a shared helper?
3. Should cursor helpers live in a new `packages/graph/src/pagination.ts` module?
4. Should MCP responses include `page.returned` and `page.order`, or only `has_more` and
   `next_cursor`?

Recommended answers:

1. repurpose `limit` as final page size
2. enforce through a shared helper
3. yes, add a shared pagination helper module
4. include full `page` metadata now for consistency

---

## Final Recommendation

Implement cursor pagination only for the three query endpoints that genuinely return large query
result sets:

- `search`
- `traverse`
- `search_graph`

Use:

- opaque base64url cursor
- payload shape `{ scope, last }`
- deterministic ordering with `id` as final tie-breaker
- `limit + 1` fetch strategy
- public max `250`, internal hard cap `500`

Do not paginate `get_nodes`.

This gives Texere a consistent pagination model without overcomplicating batch-by-id APIs or write
operations.
