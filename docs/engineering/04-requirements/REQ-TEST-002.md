# REQ-TEST-002: Result-driven fixes

**Status:** Proposed

---

## Statement (MUST form)

Test failures MUST drive the next steps in fixing code. System MUST NOT ignore, skip, or work around
test failures. Each failure MUST be addressed and understood before moving forward.

---

## Driven by

- **PROB-007**: Integration between the agent's suggestions and the repo's requirements is loose
- **PROB-013**: Execution results are not reliably incorporated

**Rationale:** If tests are optional, code quality degrades. Tests are the truth.

---

## Measurable fit criteria

- Failed test is analyzed (error message, stack trace)
- Analysis informs next fix attempt
- System does not commit code with failing tests
- Test results are included in decision rationale

---

## Verification method

- **Analysis test**: Failing test → system analyzes failure
- **Next step**: System generates fix attempt based on analysis
- **No bypass**: Verify system cannot skip failing tests
- **Logging**: Verify failures are logged and linked to fixes

---

## See also

[REQ-TEST-001](REQ-TEST-001.md), [REQ-EXEC-002](REQ-EXEC-002.md)
