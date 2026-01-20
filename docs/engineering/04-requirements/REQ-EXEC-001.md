# REQ-EXEC-001: Execution result incorporation

**Status:** Proposed

---

## Statement (MUST form)

Execution results (test passes/failures, build outcomes, runtime errors, tool output) MUST be
consistently parsed, interpreted, and incorporated into orchestration state. Failures MUST update
what the system believes about the code.

---

## Driven by

- **PROB-013**: Execution results are not reliably incorporated

**Rationale:** If execution results are ignored or misinterpreted, the system builds on incorrect
assumptions. Code quality stagnates and confidence becomes ungrounded.

---

## Measurable fit criteria

- Test failures are parsed and linked to specific code locations
- Build errors are interpreted (type errors, missing imports, etc.)
- Results are stored in epistemic state (facts about code state)
- System does not proceed as if tests passed when they failed

---

## Verification method

- **Parse test**: Run tests; verify failures are captured and linked to code
- **Update test**: Verify epistemic state reflects test results
- **Consistency test**: Verify system treats failed tests as obstacles, not ignored warnings

---

## See also

[REQ-EXEC-002](REQ-EXEC-002.md), [REQ-EXEC-003](REQ-EXEC-003.md), [REQ-TEST-002](REQ-TEST-002.md)
