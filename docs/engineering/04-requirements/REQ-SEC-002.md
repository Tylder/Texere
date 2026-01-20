# REQ-SEC-002: Prompt injection prevention

**Status:** Proposed

---

## Statement (MUST form)

Untrusted content (repo text, documentation, issue descriptions, external data) MUST NOT override
system intent or bypass orchestration policies. Content from repos and external sources MUST be
treated as data, not instructions.

---

## Driven by

- **PROB-019**: Environment, security, and isolation are not managed coherently

**Rationale:** If repo content can trick the system into ignoring policies, security is broken.

---

## Measurable fit criteria

- Repo content is clearly separated from system instructions
- No content from repos can override workflows, tools, or phase boundaries
- Malicious repo content cannot cause execution of unintended actions

---

## Verification method

- **Injection test**: Attempt to inject malicious instructions via repo content → verify blocked
- **Data/instruction separation**: Verify clear boundary between data and instructions

---

## See also

[REQ-SEC-001](REQ-SEC-001.md)
