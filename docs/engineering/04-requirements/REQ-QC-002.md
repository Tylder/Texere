# REQ-QC-002: Error interception

**Status:** Proposed

---

## Statement (MUST form)

When quality-control step identifies errors, the system MUST present them to the user and agent
before proceeding. Errors MUST NOT be noted and ignored; they MUST block or alter the execution
path.

---

## Driven by

- **PROB-024**: No composable quality-control layer to intercept and challenge outputs

**Rationale:** If errors are logged but ignored, the QC layer is useless. Errors must have teeth:
they block or redirect.

---

## Measurable fit criteria

- Errors identified by QC are surfaced to user
- User is given option: proceed (override), fix, or abort
- If critical error: proceed requires explicit approval
- Errors are logged for future learning

---

## Verification method

- **Surfacing test**: Identify error → verify user sees it
- **Blocking test**: Critical error → verify proceed requires approval
- **Logging test**: Error is recorded for analysis

---

## See also

[REQ-QC-001](REQ-QC-001.md)
