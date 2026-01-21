# REQ-<domain>-<id>

**Status:** Draft | Approved | Deprecated

---

## Statement

One normative obligation (MUST/SHOULD/MAY).

Example: "The system MUST support exporting data in CSV format and complete within 30 seconds for
datasets up to 1M rows."

---

## Rationale

Why is this required? What problem does it solve? Link to Ideation if applicable.

Example: "Customers need fast, reliable exports for large datasets. CSV is the most commonly
requested format (from user research in IDEATION-export-experience.md). 30-second timeout aligns
with user expectations from competitor analysis."

---

## Measurable Fit Criteria

How do we know this requirement is met?

- [ ] Export endpoint returns CSV within 30 seconds for 1M row dataset
- [ ] System handles concurrent exports without queueing beyond initial submission
- [ ] CSV output is valid and can be opened in Excel without errors

---

## Verification Method

How will we prove conformance?

- Automated test: export 1M rows, assert response time < 30s
- Manual test: export data in Excel, verify no corruption
- Load test: 10 concurrent exports of 500k rows each

---

## Failure Modes

What can go wrong?

- Export times out (network, memory, or processing issue)
- CSV format is corrupted
- Export succeeds but file is incomplete

---

## Related Requirements

Other requirements that interact with this one.

- REQ-EXPORT-002 (error handling for export failures)
- REQ-EXPORT-003 (progress visibility for long-running exports)

---

## Q&A

**Q: Why not support async exports to avoid timeouts?**

- Async (queued, email results): decouples from timeout, but needs infrastructure (job queue, email
  service, storage)
- Sync (immediate response): simpler, but timeouts on large data
- Hybrid: best, but most complex

A: Start with sync for <500k rows. Async is blocked until we need to scale beyond 1M rows or user
demand justifies infrastructure cost.

**Q: Do we need to support incremental/streaming exports?**

- Full export: fetch all, then return (current approach; simpler)
- Streaming: send rows as they're processed (uses less memory; more complex)

A: Full export for now. Streaming is blocked until we see memory pressure on large exports.
