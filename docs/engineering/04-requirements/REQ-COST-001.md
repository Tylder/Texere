# REQ-COST-001: Ingestion deduplication

**Status:** Proposed

---

## Statement (MUST form)

When the same source text (repo files, documentation, etc.) is ingested repeatedly across sessions,
it MUST be detected and reused. Re-ingestion MUST become an exception (for staleness checks), not
the default.

---

## Driven by

- **PROB-012**: Model capacity is spent re-reading identical source material

**Rationale:** Token budgets are limited. Reusing ingested content saves tokens and latency.

---

## Measurable fit criteria

- Identical source text is not re-ingested
- Ingested content is cached with hash/checksum
- Cache is used for 95%+ of repeated ingests
- Staleness checks explicitly re-ingest when needed

---

## Verification method

- **Deduplication test**: Same file ingested twice → verify second uses cache
- **Cache hit rate**: Track % of ingests that use cache (goal: 95%+)
- **Staleness handling**: Stale content is re-ingested when flagged

---

## See also

[REQ-COST-002](REQ-COST-002.md), [REQ-FRESH-001](REQ-FRESH-001.md)
