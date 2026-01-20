# REQ-UI-STATE-002: Canonical understanding baseline

**Status:** Proposed

---

## Statement (MUST form)

A single, authoritative, user-visible "current understanding" baseline MUST exist that represents
what the system believes at this moment. The user MUST be able to inspect it, validate it, and
correct it.

---

## Driven by

- **PROB-026**: No canonical, user-visible "current understanding" baseline

**Rationale:** Without a single baseline, user and system operate on different implicit
understandings. Disagreement surfaces late, after work is done. An explicit, validatable baseline
prevents misalignment.

---

## Constrained by

- **ADR-ui-react-webapp**: React UI must display this baseline prominently

---

## Measurable fit criteria

- Baseline exists and is singular (not multiple conflicting versions)
- Baseline includes: facts, assumptions, constraints, decisions, unknowns
- Baseline is user-visible and highlighted
- User can submit corrections/additions
- Baseline is updated when corrections are made

---

## Verification method

- **Singularity test**: Query system for "current understanding"; verify one canonical answer
- **Completeness test**: Baseline includes all epistemic categories
- **UI test**: User can find and read baseline in < 30 seconds
- **Correction test**: User corrects baseline; verify system uses corrected version in subsequent
  work

---

## See also

[REQ-UI-STATE-001](REQ-UI-STATE-001.md), [REQ-ORCH-EPISTEMIC-001](REQ-ORCH-EPISTEMIC-001.md),
[REQ-API-001](REQ-API-001.md)
