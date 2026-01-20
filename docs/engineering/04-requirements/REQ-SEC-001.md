# REQ-SEC-001: Secret protection

**Status:** Proposed

---

## Statement (MUST form)

Secrets (API keys, credentials, tokens, passwords) MUST NOT appear in logs, prompts to models,
generated code, or patches. Secrets MUST be handled exclusively through secure mechanisms
(environment variables, secret stores).

---

## Driven by

- **PROB-019**: Environment, security, and isolation are not managed coherently

**Rationale:** Leaking secrets compromises security. This is non-negotiable.

---

## Measurable fit criteria

- Secrets are redacted from logs
- Secrets are not passed to language models
- Secrets are not included in code suggestions
- All secrets are sourced from secure stores (not repo/environment)

---

## Verification method

- **Redaction test**: Log output contains no secrets
- **Model test**: Prompts to models contain no secrets
- **Audit test**: Code review checks for secret leaks
- **Static analysis**: Tooling detects potential secret leaks

---

## See also

[REQ-SEC-002](REQ-SEC-002.md)
