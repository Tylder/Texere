# REQ-API-001: REST endpoints

**Status:** Proposed

---

## Statement (MUST form)

Backend MUST expose REST endpoints for state queries (GET) and mutations (POST/PUT) that allow the
UI to read state and trigger actions. Endpoints MUST be discoverable, documented, and versioned.

---

## Driven by

- **PROB-025**: Current system state is not externally visible or inspectable
- **PROB-026**: No canonical, user-visible "current understanding" baseline

**Rationale:** REST is the standard interface between backend and UI. Clear endpoints enable UI
development and support multiple clients.

---

## Constrained by

- **ADR-architecture-backend-ui-separation**: Backend and UI communicate via REST + WebSocket

---

## Measurable fit criteria

- GET endpoints exist for state queries (facts, decisions, unknowns, etc.)
- POST endpoints exist for actions (start task, make decision, dismiss item, etc.)
- Endpoints return JSON with consistent schema
- Endpoints are documented (OpenAPI/Swagger preferred)
- Rate limiting and authentication are specified

---

## Verification method

- **Endpoint test**: Call each endpoint; verify response matches specification
- **Documentation test**: All endpoints documented with examples
- **Schema test**: Verify JSON responses have consistent, documented schema
- **Error handling**: Verify error responses are clear

---

## See also

[REQ-API-002](REQ-API-002.md), [REQ-API-003](REQ-API-003.md)
