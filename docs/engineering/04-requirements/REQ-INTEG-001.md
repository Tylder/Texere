# REQ-INTEG-001: Code alignment

**Status:** Proposed

---

## Statement (MUST form)

Generated code MUST align with repo standards: naming conventions, style, architecture patterns.
Code MUST NOT require reformatting or rework to integrate. Misalignment MUST be flagged before
suggestion.

---

## Driven by

- **PROB-007**: Integration between the agent's suggestions and the repo's requirements is loose

**Rationale:** Code that doesn't align with repo style wastes time and introduces inconsistency.

---

## Measurable fit criteria

- Code follows repo naming conventions
- Code follows repo style (linting passes)
- Code follows repo architecture patterns
- Code is ready to commit without reformatting

---

## Verification method

- **Style check**: Generated code passes linter without changes
- **Pattern check**: Generated code uses repo patterns
- **Integration test**: Code integrates without modification

---

## See also

[REQ-INTEG-002](REQ-INTEG-002.md)
