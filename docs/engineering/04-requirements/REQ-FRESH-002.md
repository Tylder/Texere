# REQ-FRESH-002: Research revalidation

**Status:** Proposed

---

## Statement (MUST form)

When stale content is detected, the system MUST offer or require revalidation of prior research
findings. Revalidation MUST check if prior conclusions still hold or have been invalidated.

---

## Driven by

- **PROB-002**: Staleness; research is quickly invalidated

**Rationale:** If the repo changed, research conclusions may be wrong. Revalidation ensures they're
still correct.

---

## Measurable fit criteria

- Revalidation process is triggered when staleness detected
- Prior conclusions are checked against updated content
- Invalidated conclusions are flagged
- Research is not re-done from scratch unless necessary

---

## Verification method

- **Revalidation test**: Stale content detected → revalidation offered
- **Conclusion check**: Prior conclusions validated against updated content
- **Invalidation flagging**: Invalid conclusions are clearly marked

---

## See also

[REQ-FRESH-001](REQ-FRESH-001.md)
