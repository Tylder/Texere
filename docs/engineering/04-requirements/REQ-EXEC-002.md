# REQ-EXEC-002: Fix loop convergence

**Status:** Proposed

---

## Statement (MUST form)

Fix loops (attempt fix → run tests → observe failure → modify → retry) MUST converge to a stable
passing state. Oscillation (repeatedly making the same mistakes or undoing prior fixes) MUST be
detected and surfaced.

---

## Driven by

- **PROB-013**: Execution results are not reliably incorporated

**Rationale:** If the system cannot converge on a fix, it wastes tokens and time. Oscillation
indicates a root misunderstanding that needs surfacing.

---

## Measurable fit criteria

- Most fix loops converge within 5 iterations
- Oscillation is detected (repeating same failure or reverting prior fix)
- Oscillation is surfaced to user/agent with proposed root cause
- User can break the loop with an override or direction

---

## Verification method

- **Convergence test**: Create failing test; run fix loop; verify it converges
- **Oscillation detection**: Manually create oscillation scenario; verify system detects it
- **Surfacing test**: Verify user is informed when oscillation detected
- **Override test**: Verify user can break loop and provide new direction

---

## See also

[REQ-EXEC-001](REQ-EXEC-001.md), [REQ-EXEC-003](REQ-EXEC-003.md)
