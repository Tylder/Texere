# REQ-TEST-001: Pre-suggestion validation

**Status:** Proposed

---

## Statement (MUST form)

Code changes (patches, refactorings, new implementations) MUST pass tests before being suggested to
the user. Suggested code MUST be tested in the repo's test suite.

---

## Driven by

- **PROB-007**: Integration between the agent's suggestions and the repo's requirements is loose

**Rationale:** Suggesting broken code wastes user time. Tests are the contract; code must meet it.

---

## Measurable fit criteria

- Code is tested before suggestion
- Tests must pass for code to be suggested
- Test results are logged and attributed
- Failed suggestions are not presented

---

## Verification method

- **Test execution**: Verify tests are run before suggestion
- **Pass requirement**: Suggested code passes all tests
- **Failure handling**: Verify failed code is not suggested

---

## See also

[REQ-TEST-002](REQ-TEST-002.md), [REQ-EXEC-001](REQ-EXEC-001.md)
