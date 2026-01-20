# REQ-FRESH-001: Staleness detection

**Status:** Proposed

---

## Statement (MUST form)

The system MUST detect when ingested content (repo files, docs, external data) may be stale and flag
it for revalidation. Staleness detection MUST be automatic or triggered by user action.

---

## Driven by

- **PROB-002**: Staleness; research is quickly invalidated

**Rationale:** Without staleness detection, system proceeds on outdated information. Users need to
know when source may have changed.

---

## Measurable fit criteria

- Staleness is flagged when content is older than a threshold (configurable)
- User is alerted when stale content is used
- User can trigger revalidation

---

## Verification method

- **Detection test**: Mock time passage → verify staleness is flagged
- **Alert test**: Verify user sees alert for stale content
- **Revalidation**: Verify user can trigger update

---

## See also

[REQ-FRESH-002](REQ-FRESH-002.md), [REQ-COST-001](REQ-COST-001.md)
