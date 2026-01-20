# REQ-ORCH-HISTORY-002: Rationale preservation

**Status:** Proposed

---

## Statement (MUST form)

Decision rationale (why we chose option A over B and C) MUST be preserved in durable form, linked to
the decision, and remain retrievable for the lifetime of the project.

---

## Driven by

- **PROB-004**: The agent cannot behave like it has deep, accurate historical knowledge
- **PROB-009**: Lack of auditable history and decision traceability

**Rationale:** A decision without rationale is unmaintainable. Months later, users and agents alike
will ask "why did we choose this?" The rationale explains context, trade-offs, and assumptions.
Without it, decisions appear arbitrary and are re-litigated.

---

## Constrained by

- **ADR-orchestration-langgraph-ts**: Decision schema must include rationale field

---

## Measurable fit criteria

- Rationale is captured when decision is made (not retrofitted)
- Rationale includes: alternatives considered, trade-offs, constraints, evidence
- Rationale is linked to the decision durably (cannot be lost without explicit deletion)
- Rationale is human-readable (not abbreviated or encoded)

---

## Verification method

- **Capture test**: Make decision; verify rationale is recorded
- **Retrieval test**: Query old decision; verify rationale appears
- **Completeness audit**: Sample decisions; verify each has adequate rationale
- **Link test**: Verify rationale cannot be separated from decision

---

## See also

[REQ-ORCH-HISTORY-001](REQ-ORCH-HISTORY-001.md), [REQ-OBS-001](REQ-OBS-001.md)
