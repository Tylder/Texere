---
type: SPEC
status: draft
stability: experimental
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
area: api
feature: pagination-system
summary_short: 'GET /search endpoint with offset/limit pagination, metadata, and error handling'
summary_long:
  'Specifies API contract for paginated search results including request parameters (query, offset,
  limit, filters), response schema with pagination metadata (total, offset, limit, remaining,
  has_next, has_prev), error codes, and <100ms performance constraint. Implements
  REQ-pagination-system via shared pagination library.'
implements:
  [REQ-pagination-system#REQ-001, REQ-pagination-system#REQ-002, REQ-pagination-system#REQ-003]
depends_on: [SPEC-shared-pagination-lib]
blocks: [IMPL-PLAN-pagination-system]
---

# SPEC-<area>-<topic>

## Document Relationships

Summary: Implements REQ-pagination-system; depends on SPEC-shared-pagination-lib; drives
IMPL-PLAN-pagination-system.

**Upstream (depends on):**

- REQ-pagination-system.md (Requirements this implements)
- SPEC-shared-pagination-lib.md (shared code dependency)
- IDEATION-pagination-experience.md (user context)

**Downstream (depends on this):**

- IMPL-PLAN-pagination-system.md (implements this Spec)

**Siblings (related Specs at same level):**

- SPEC-user-list-pagination.md (same Requirement, different domain)
- SPEC-timeline-pagination.md (same Requirement, different domain)

**Related (cross-cutting):**

- INIT-pagination.md

---

## TLDR

Summary: GET /search endpoint with offset/limit pagination; metadata in response; <100ms performance
target; shared lib in progress.

**What:** Pagination API for search results via offset/limit with metadata

**Why:** Implement REQ-pagination-system for search endpoint; serve as reference pattern for other
endpoints

**How:**

- Use shared pagination library (from SPEC-shared-pagination-lib)
- Add offset/limit parameters to search endpoint
- Return metadata in response (total, offset, limit)
- Handle edge cases (negative offset, limit >100, etc.)

**Status:** Draft (design in progress)

**Critical path:** Shared lib → this Spec → implementation → IMPL-PLAN starts

**Risk:** Performance doesn't meet <100ms target; database indexes may not be ready

---

## Scope

Summary: Covers offset/limit API contract and error handling; excludes cursor-based pagination,
frontend UI, export pagination, and result ranking.

**Includes:**

- GET /search API endpoint contract
- Request parameters (query, offset, limit, filters)
- Response schema with pagination metadata
- Error codes for invalid parameters
- Edge case handling (empty results, offset beyond data, invalid types)
- Performance targets (<100ms typical query)

**Excludes:**

- Cursor-based pagination (see DECISION-001)
- Frontend UI/UX for pagination controls (see SPEC-search-results-ui.md)
- Export pagination (separate feature)
- Query result ranking (see other Specs)

**In separate docs:**

- Requirements: REQ-pagination-system.md
- Shared library: SPEC-shared-pagination-lib.md
- User experience: IDEATION-pagination-experience.md
- Execution plan: IMPL-PLAN-pagination-system.md

---

## Implements

Summary: Fulfills REQ-001 (offset/limit pagination), REQ-002 (metadata), REQ-003 (error handling).
One of three Specs implementing REQ-pagination-system.

- REQ-pagination-system.md#REQ-001 (Pagination via offset/limit)
- REQ-pagination-system.md#REQ-002 (Metadata in response)
- REQ-pagination-system.md#REQ-003 (Error handling for invalid parameters)

---

## Interfaces & Observable Behavior

Summary: GET /search accepts offset/limit; returns results array + pagination metadata (total,
offset, limit, remaining, has_next, has_prev); error responses for invalid params.

### API Endpoint: GET /search

**Request:**

```json
{
  "query": "string (required)",
  "offset": "integer (optional, default 0, min 0)",
  "limit": "integer (optional, default 20, min 1, max 100)",
  "filters": { "date_range": "...", "author": "..." }
}
```

**Response (Success, 200):**

```json
{
  "results": [
    { "id": "...", "title": "...", "snippet": "..." },
    ...
  ],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 1500,
    "remaining": 1480,
    "has_next": true,
    "has_prev": false
  }
}
```

**Response (Error, 400):**

```json
{
  "error_code": "INVALID_LIMIT",
  "message": "Limit must be between 1 and 100",
  "received": 150
}
```

---

## Data Models

### SearchResult

```
{
  id: UUID
  title: string
  snippet: string (first 200 chars of result)
  url: string
  relevance_score: float (0-1)
}
```

### PaginationMetadata

```
{
  offset: integer (current page start position)
  limit: integer (results per page)
  total: integer (total results matching query)
  remaining: integer (total - offset - limit)
  has_next: boolean (remaining > 0)
  has_prev: boolean (offset > 0)
}
```

---

## Invariants

Rules that must always be true:

- Response length <= limit (never return more results than requested)
- offset is never negative (validated in request handling)
- total is immutable for a given query during pagination
- If offset >= total, return empty results (not error)
- Pagination metadata is always present

---

## Error Semantics

Explicit error handling and failure modes.

| Error Code     | HTTP Status | Meaning                            | User Action                    | Retryable |
| -------------- | ----------- | ---------------------------------- | ------------------------------ | --------- |
| INVALID_LIMIT  | 400         | Limit outside valid range (1-100)  | Adjust limit parameter         | No        |
| INVALID_OFFSET | 400         | Offset is negative                 | Use offset >= 0                | No        |
| INVALID_QUERY  | 400         | Query string is empty or malformed | Fix query syntax               | No        |
| RATE_LIMIT     | 429         | Too many requests                  | Wait and retry                 | Yes       |
| INTERNAL_ERROR | 500         | Server error during query          | Retry with exponential backoff | Yes       |

---

## Design Decisions

| Field                  | Decision 001                                                      | Decision 002                                                        |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Title**              | Pagination Approach                                               | Response Format for Metadata                                        |
| **Options Considered** | A) Offset/limit (chosen) B) Cursor-based C) Both                  | A) Flat metadata (chosen) B) Nested object C) Headers only          |
| **Chosen**             | Option A: Offset/limit                                            | Option A: Nested object in response                                 |
| **Rationale**          | Familiar pattern; works for search results; simplest to implement | Keeps response structured; metadata grouped together; easy to parse |
| **Tradeoffs**          | Can't handle real-time data well; offset drifts with insertions   | Slightly larger response payload but clearer contract               |
| **Blocked**            | None                                                              | None                                                                |
| **Expires**            | When result sets >10M rows OR real-time requirements              | If API consumers prefer headers (feedback loop)                     |
| **Decision Date**      | 2025-01-21                                                        | 2025-01-21                                                          |

---

## Verification Approach

How conformance is verified (testing strategy).

**Unit Tests:**

- Pagination math: offset/limit calculations correct
- Parameter validation: rejects invalid offset/limit
- Metadata generation: total/remaining/has_next calculated correctly

**Integration Tests:**

- Full query pipeline with pagination
- Edge cases: empty results, offset beyond end, boundary values
- Concurrent requests don't interfere

**Performance Tests:**

- Typical query (1000 results, offset=0, limit=20): <50ms
- Large offset (10k results, offset=5000): <100ms
- Slow query without pagination baseline: no degradation

**E2E Tests:**

- User can page through results using offset/limit
- Metadata guides client to next/prev pages correctly

---

## Performance Constraints

- Response time < 100ms for typical queries (1000 results)
- Response time < 200ms for large result sets (100k+ results)
- Pagination metadata generation < 5% of total query time
- No additional database queries per page (pagination done in query layer)

---

## Blockers

| Blocker                                                | Status                      | Unblocks When                       | Impact                                             |
| ------------------------------------------------------ | --------------------------- | ----------------------------------- | -------------------------------------------------- |
| Database indexing on search tables                     | In progress, ETA 2025-02-01 | Indexes deployed + perf validated   | Blocks this Spec; blocks IMPL-PLAN; blocks testing |
| Shared pagination library (SPEC-shared-pagination-lib) | Draft                       | Library approved and code available | Blocks implementation                              |
| API documentation templates                            | Not started                 | Design review 2025-01-24            | Blocks final approval                              |

**Blocked By:**

- REQ-pagination-system.md (waiting for approved REQ) → **Resolved 2025-01-21**

**Blocks:**

- IMPL-PLAN-pagination-system.md (can't start implementation until Spec approved)

---

## Assumptions

| Assumption                                           | Validation Method               | Confidence | Impact if Wrong                                          |
| ---------------------------------------------------- | ------------------------------- | ---------- | -------------------------------------------------------- |
| Database queries are fast enough without new indexes | Perf testing on staging         | Medium     | May need indexes; delays timeline 1 week                 |
| Most searches return <10k results                    | Production query analysis       | High       | Offset pagination becomes problematic; need cursor-based |
| Clients can handle pagination metadata in response   | User survey/compatibility check | Medium     | May need headers-only fallback                           |

---

## Unknowns

| Question                                                           | Impact                        | Resolution Criteria                                           | Owner        | ETA        |
| ------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------- | ------------ | ---------- |
| Should we support `sort_by` parameter with pagination?             | Scope, complexity             | Product decision on sort feature priority                     | Product      | 2025-02-01 |
| What happens if search results change between pagination requests? | Correctness, user expectation | Decide on "best effort" vs. "snapshot" semantics              | Product Lead | 2025-01-24 |
| Do we need cursor-based pagination for this endpoint?              | Architecture, performance     | Monitor production usage; decide if offset limitation appears | Product      | 2025-06-01 |

---

## Document Metadata

```yaml
id: SPEC-search-results-pagination
type: SPEC
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: search
feature: pagination-system
implements:
  [REQ-pagination-system#REQ-001, REQ-pagination-system#REQ-002, REQ-pagination-system#REQ-003]
implemented_by: [IMPL-PLAN-pagination-system]
depends_on: [SPEC-shared-pagination-lib, REQ-pagination-system]
blocks: [IMPL-PLAN-pagination-system]
related: [SPEC-user-list-pagination, SPEC-timeline-pagination, INIT-pagination]
keywords: [pagination, search, api, offset, limit, performance]
```
