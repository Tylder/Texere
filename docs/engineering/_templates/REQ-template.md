# REQ-<feature>

**Status:** Draft | Approved | Deprecated

**Date Started:** YYYY-MM-DD

---

## Overview

Brief description of what this Requirements document covers.

Example: "All obligations for the pagination system across search, user lists, and timelines."

---

## REQ-001: <Title>

**Statement:**

One normative obligation (MUST/SHOULD/MAY).

Example: "The system MUST support paginated results via offset and limit parameters on all list
endpoints."

**Rationale:**

Why is this required? What problem does it solve? Link to Ideation if applicable.

Example: "Users need to browse large result sets efficiently. Offset/limit is the most familiar
pagination pattern (from user research in IDEATION-pagination-experience.md). This applies to search
results, user lists, and activity timelines."

**Measurable Fit Criteria:**

How do we know this requirement is met?

- [ ] GET /search?offset=0&limit=20 returns exactly 20 results (or fewer if at end)
- [ ] All list endpoints support offset and limit parameters
- [ ] Documentation lists the valid range for limit (e.g., 1-100)

**Verification Method:**

How will we prove conformance?

- Automated test: pagination endpoint returns correct subset
- Behavior test: offset=0 returns first items, offset=20 returns next 20
- Edge case: offset beyond end of results returns empty array
- Load test: pagination endpoints handle concurrent requests

---

## REQ-002: <Title>

**Statement:**

Example: "Pagination responses MUST include total count, current offset, and per-page limit in
metadata."

**Rationale:**

Helps clients calculate remaining pages and show progress.

**Measurable Fit Criteria:**

- [ ] Response includes `total`, `offset`, `limit` in metadata
- [ ] `total` reflects true count even if results are filtered
- [ ] Client can calculate `remaining_pages = ceil((total - offset) / limit)`

**Verification Method:**

- Automated test: verify metadata fields present and accurate
- Manual test: use pagination to browse complete result set, count matches total

---

## REQ-003: <Title>

[Repeat structure above]

---

## Related Requirements

Other requirements that interact with these.

- REQ-performance (response times must be < 100ms)
- REQ-error-handling (invalid offset/limit must return clear errors)

---

## Q&A

**Q: Should we support cursor-based pagination instead of offset/limit?**

- Offset/limit pagination: simpler, familiar, but doesn't work well with frequently-changing
  datasets
- Cursor-based pagination: stable for real-time data, but more complex
- Both: support both approaches (future-proof, but significant complexity)

A: Start with offset/limit. It covers 95% of use cases and is easier for API consumers. Cursor-based
is blocked until we need to handle real-time data streaming or massive result sets (>10M rows).

**Q: What's the maximum page size we should allow?**

- No limit: let clients request 1M rows at once (flexible, but memory risk)
- Hard limit (e.g., max 1000): protects server, but might be limiting
- Configurable per endpoint: different limits for different data types (best, but complex)

A: Hard limit of 100 per endpoint for now. Document as a limitation. Move to per-endpoint config if
we see real user demand for larger pages.

**Q: Should pagination be consistent across internal and public APIs?**

- Same pagination for both: consistent, easier to maintain
- Different approaches: optimize each for its audience

A: Same pagination approach for both. Consistency matters more than optimization at this stage.
