# REQ-API-002: WebSocket streaming

**Status:** Proposed

---

## Statement (MUST form)

Backend MUST stream state deltas to frontend via WebSocket in real-time as orchestration progresses.
State updates MUST arrive within 2 seconds of state change. UI MUST receive all updates (no skips)
and handle reconnection gracefully.

---

## Driven by

- **PROB-025**: Current system state is not externally visible or inspectable
- **PROB-030**: State changes across sessions are not clearly surfaced to the user

**Rationale:** Real-time updates keep UI in sync without polling. Users see what's happening as it
happens.

---

## Constrained by

- **ADR-architecture-backend-ui-separation**: Hybrid REST + WebSocket communication

---

## Measurable fit criteria

- WebSocket connection established on UI load
- State deltas sent as JSON messages
- Latency: < 2 seconds from state change to UI update
- No update skips (all changes delivered)
- Reconnection: drops are detected, client reconnects, missed updates are synced
- Message format is documented and versioned

---

## Verification method

- **Connection test**: UI connects; WebSocket opens
- **Update test**: Change state → verify update arrives in < 2s
- **Completeness test**: Make rapid state changes → verify none are skipped
- **Reconnection test**: Drop connection → verify automatic reconnection and sync
- **Message format**: Verify message schema is documented

---

## See also

[REQ-API-001](REQ-API-001.md), [REQ-UI-STATE-001](REQ-UI-STATE-001.md)
