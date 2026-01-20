# REQ-UI-UNCERTAINTY-002: Pre-action verification clarity

**Status:** Proposed

---

## Statement (MUST form)

High-impact actions (code deletion, refactoring, API changes, architectural decisions) MUST include
explicit clarity about what must be verified before proceeding. Verification requirements MUST be
checkable by the user.

---

## Driven by

- **PROB-035**: Uncertainty and confidence are not communicated in a decision-usable way
- **PROB-040**: No systematic trust calibration for agent outputs

**Rationale:** Users make mistakes by trusting suggestions that should be verified. Explicit
verification requirements guide safe action.

---

## Constrained by

- **ADR-ui-react-webapp**: UI must prominently display verification checklist

---

## Measurable fit criteria

- Verification requirements are listed explicitly (not implicit)
- User can check off requirements as they verify them
- Action is not allowed until requirements are checked
- Requirements are specific and testable (not vague)

---

## Verification method

- **Clarity test**: Sample high-impact actions; verify requirements are explicit and testable
- **Checklist test**: User can work through checklist without guessing
- **Enforcement test**: Attempt action without completing checklist; verify action blocks
- **Requirement quality**: Requirements are specific and testable (e.g., "run tests" not "verify it
  works")

---

## See also

[REQ-UI-UNCERTAINTY-001](REQ-UI-UNCERTAINTY-001.md), [REQ-QC-001](REQ-QC-001.md)
