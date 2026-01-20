# REQ-UI-UNCERTAINTY-001: Grounding indicators

**Status:** Proposed

---

## Statement (MUST form)

Claims presented to the user MUST be marked with grounding indicators: evidence-grounded (linked to
repo/tool output), inferred (hypothesis/assumption), or unknown (needs verification).

---

## Driven by

- **PROB-035**: Uncertainty and confidence are not communicated in a decision-usable way
- **PROB-040**: No systematic trust calibration for agent outputs

**Rationale:** Users need to calibrate trust. High-risk suggestions should signal uncertainty.
Grounding indicators let users decide when to verify and when to trust.

---

## Constrained by

- **ADR-ui-react-webapp**: React UI must render grounding indicators visually

---

## Measurable fit criteria

- Each claim has a grounding indicator: grounded, inferred, or unknown
- Indicators are visually distinct (color, icon, or text)
- User can click indicator to see evidence or rationale
- High-risk claims (code changes, architectural decisions) always have indicators

---

## Verification method

- **Indicator test**: Generate claims; verify each has indicator
- **Visual test**: User can distinguish grounding at a glance
- **Evidence linkage**: Click indicator → see evidence or rationale
- **Risk audit**: Sample high-risk claims; verify none lack indicators

---

## See also

[REQ-UI-UNCERTAINTY-002](REQ-UI-UNCERTAINTY-002.md), [REQ-TRUST-001](REQ-TRUST-001.md)
