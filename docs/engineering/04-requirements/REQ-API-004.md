# REQ-API-004: API versioning

**Status:** Proposed

---

## Statement (MUST form)

API MUST be versioned and support backwards-compatibility or have an explicit migration strategy for
clients. Breaking changes MUST not silently cause client failures.

---

## Driven by

- None explicit; cross-cutting infrastructure requirement

**Rationale:** As backend evolves, clients (UI, CLI, IDEs) must not break. Versioning provides a
contract.

---

## Constrained by

- **ADR-architecture-backend-ui-separation**: Backend API is the contract

---

## Measurable fit criteria

- API version is specified in all responses (header or payload)
- Breaking changes result in version bump
- Old API version is maintained for at least one release
- Client can explicitly request API version
- Migration guide is provided for breaking changes

---

## Verification method

- **Version test**: Request API → verify version is returned
- **Compatibility test**: Use old client with new API → verify either works or clear error
- **Migration guide**: Verify documentation for breaking changes

---

## See also

[REQ-API-001](REQ-API-001.md)
