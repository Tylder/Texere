# REQ-TRUST-001: Confidence indicators

**Status:** Proposed

---

## Statement (MUST form)

System outputs MUST be accompanied by explicit confidence indicators. User MUST be able to
distinguish high-confidence (grounded, tested) from low-confidence (hypothetical, unverified)
outputs at a glance.

---

## Driven by

- **PROB-040**: No systematic trust calibration for agent outputs
- **PROB-035**: Uncertainty and confidence are not communicated in a decision-usable way

**Rationale:** Trust calibration requires visibility into confidence. Users can then decide when to
verify and when to trust.

---

## Constrained by

- **ADR-ui-react-webapp**: React UI must render confidence visually

---

## Measurable fit criteria

- Confidence indicators are visible (color, icon, text)
- User can distinguish high/medium/low confidence outputs
- Confidence is grounded in facts (grounded vs inferred vs unknown)
- High-risk outputs always have indicators

---

## Verification method

- **Indicator test**: Generate outputs; verify each has confidence indicator
- **Visual test**: User can scan and identify confidence at a glance
- **Grounding test**: Confidence aligns with grounding (grounded = high confidence, unknown = low)

---

## See also

[REQ-UI-UNCERTAINTY-001](REQ-UI-UNCERTAINTY-001.md),
[REQ-UI-UNCERTAINTY-002](REQ-UI-UNCERTAINTY-002.md)
