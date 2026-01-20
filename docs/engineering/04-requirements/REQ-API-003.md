# REQ-API-003: Backend state ownership

**Status:** Proposed

---

## Statement (MUST form)

All stateful orchestration (epistemic state, checkpoints, decision history) MUST reside in the
backend. UI MUST maintain only presentation state (scroll position, filter selections, etc.).
Backend state MUST be the single source of truth.

---

## Driven by

- **PROB-031**: Orchestration is a black box (insufficient observability for diagnosis)
- **PROB-033**: Repo mutation and workspace state are not managed safely

**Rationale:** If state is duplicated across frontend and backend, they diverge. Single backend
source of truth prevents this.

---

## Constrained by

- **ADR-architecture-backend-ui-separation**: Backend and UI are logically separate

---

## Measurable fit criteria

- UI does not persist orchestration state locally
- UI queries backend for all state
- UI maintains only presentation state
- State changes flow only from backend to UI (not bidirectional)

---

## Verification method

- **State audit**: Verify no orchestration state in UI local storage
- **Source test**: UI requests state → backend is the source
- **Sync test**: Multiple UIs show same state (no divergence)

---

## See also

[REQ-API-001](REQ-API-001.md), [REQ-API-002](REQ-API-002.md)
