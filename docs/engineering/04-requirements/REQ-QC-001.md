# REQ-QC-001: Independent output challenge

**Status:** Proposed

---

## Statement (MUST form)

High-risk outputs (plans, patches, architectural decisions, API changes) MUST face an independent
challenge step before execution. The challenge MUST be distinct from the primary output generation
and capable of identifying obvious errors.

---

## Driven by

- **PROB-024**: No composable quality-control layer to intercept and challenge outputs
- **PROB-008**: Hallucination and assumption drift are not mechanically prevented

**Rationale:** Without independent challenge, hallucinations and preventable mistakes reach code. A
critic/reviewer catches obvious errors early.

---

## Measurable fit criteria

- Challenge step runs independently (not by same agent that produced output)
- Challenge captures: inconsistency with facts, missing edge cases, assumption violations
- Errors caught are documented with rationale
- Outputs are not executed if challenge finds critical errors

---

## Verification method

- **Challenge test**: Generate high-risk output; verify challenge step runs
- **Error detection**: Intentionally introduce errors; verify challenge catches them
- **Independence**: Verify challenge and generation are separate systems
- **Block test**: Verify critical errors prevent execution

---

## See also

[REQ-QC-002](REQ-QC-002.md), [REQ-UI-UNCERTAINTY-002](REQ-UI-UNCERTAINTY-002.md)
