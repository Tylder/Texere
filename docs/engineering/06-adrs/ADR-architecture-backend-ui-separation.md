# ADR-architecture-backend-ui-separation: Separate backend and UI with API boundary

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR and supersede this one.

**Quick Summary:** We will separate the backend orchestration/logic from the React UI via an API
boundary. Communication uses a hybrid model: REST for queries and mutations, WebSocket for real-time
state streams. The backend and UI are logically separate but deployed together initially, allowing
independent evolution and future multi-client support without operational overhead today.

---

## Quick Navigation

| Section                                             | Purpose                   | Read if...                                |
| --------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [Context](#context)                                 | Why we needed to decide   | You're designing the system boundary      |
| [Decision](#decision)                               | What we chose             | You're implementing or understanding this |
| [Alternatives Considered](#alternatives-considered) | What we rejected          | You disagree or want trade-offs           |
| [Rationale](#rationale)                             | Why this is better        | You need the full reasoning               |
| [Consequences](#consequences)                       | Positive/negative impacts | You're assessing cost/benefit             |

---

## References

**Driven by:**

- PROBDEF-ai-coding-system: PROB-031 (Orchestration observability), PROB-025 (State visibility),
  PROB-026 (Canonical understanding baseline)
- User intent: Support multiple future clients (CLI, VSCode, web) without reimplementing logic; keep
  concerns separate; enable parallel development

**Implemented by:** (TBD: SPEC-api-design, SPEC-backend-orchestration)

---

## Context

The system has two distinct responsibilities:

1. **Backend:** Orchestration logic (LangGraph), state management (epistemic state, checkpoints),
   agent coordination, tool execution
2. **Frontend:** Visualization, user interaction, real-time display of state changes

These should not be entangled because:

- **UI can change independently:** Redesign React components without touching orchestration logic
- **Backend can scale independently:** In the future, multiple clients (CLI, IDE extensions, web)
  could use the same backend without duplication
- **Safety:** UI cannot corrupt backend state or bypass constraints
- **Testability:** Backend can be tested without frontend; frontend can be tested without backend
  (via mocks)

Additionally, real-time state visibility (PROB-025, PROB-030) requires the UI to receive continuous
updates from the backend as orchestration progresses. A synchronous request/response pattern (pure
REST) is insufficient.

We needed to decide:

- How much separation? (co-deployed vs. truly separate services)
- How to communicate? (API style and transport)

---

## Decision

**Separate backend and UI via an API boundary, with hybrid REST + WebSocket communication.**

Specifics:

1. **Logical separation:** Backend and UI are distinct modules/services with a clean API contract
2. **Co-deployment (initially):** Both are deployed as a single artifact or script (e.g.,
   `npm start` runs both), but they can be separated operationally later
3. **Communication model:**
   - **REST API** for queries (fetch state) and mutations (trigger actions)
   - **WebSocket** for real-time streams (e.g., "as orchestration runs, send state deltas to the
     UI")
   - Query language: JSON/REST (simple, well-understood)
4. **State location:** All stateful orchestration lives in the backend (LangGraph, checkpoints,
   epistemic state). UI maintains only presentation state (scroll position, filter selections, etc.)
5. **Backend API:** Exposes endpoints like:
   - `GET /api/state/current` – fetch current epistemic state
   - `POST /api/task/start` – start a new task
   - `WS /api/stream/task/{id}` – stream task execution updates
   - Similar patterns for decisions, unknowns, execution results, etc.

---

## Alternatives Considered

### A) No separation; monolithic app

- **Pro:** Simpler initially; no API contract to maintain; fewer coordination issues
- **Con:** UI and orchestration logic are entangled; difficult to change one without affecting the
  other; cannot support multiple clients later; makes PROB-031 (observability) harder because state
  is implicit
- **Why not:** Violates separation of concerns; reduces future flexibility

### B) True service separation (different machines, independent deployment)

- **Pro:** Maximum flexibility; scales independently; can deploy on different infrastructure; API is
  the only contract
- **Con:** Operational overhead: two services to run, monitor, and deploy; networking latency
  between them; more complex development setup; overkill for current needs
- **Why not:** Too much infrastructure complexity for a solo developer or small team. Can adopt
  later if needed without re-architecting; our hybrid approach (logical separation, co-deployment)
  provides the flexibility benefit without today's overhead.

### C) GraphQL instead of REST + WebSocket

- **Pro:** Strongly typed, efficient queries, subscription support (GraphQL subscriptions)
- **Con:** More complex to implement; slower initial build; learning curve; not a clear win over
  REST + WebSocket for our use case
- **Why not:** REST is simpler and sufficient for our query patterns; WebSocket is the right tool
  for real-time streams

### D) gRPC for communication

- **Pro:** High performance, strongly typed, good for streaming
- **Con:** Not web-friendly (requires grpc-web proxy or similar); ecosystem smaller; overkill for
  initial MVP
- **Why not:** REST + WebSocket is simpler and sufficient

### E) Server-Sent Events (SSE) instead of WebSocket

- **Pro:** Simpler than WebSocket (unidirectional), good HTTP semantics
- **Con:** Unidirectional only; backend can send updates to frontend, but frontend cannot easily
  send real-time commands. Would need REST for commands + SSE for updates.
- **Why not:** Hybrid REST + WebSocket is cleaner; WebSocket supports bidirectional communication if
  needed later

---

## Rationale

This decision solves several problems simultaneously:

1. **Separation of concerns (PROB-031 observability):** Backend logic is isolated from UI. When
   debugging orchestration failures, we can inspect backend state independently of frontend
   rendering.

2. **State visibility (PROB-025, PROB-026, PROB-030):** Real-time WebSocket stream means the UI
   always reflects the current state. No polling; no stale UI.

3. **Multiple clients:** The backend API becomes the contract. In the future, a CLI tool can consume
   the same API without reimplementing orchestration logic.

4. **Testability:** Backend can be tested in isolation; frontend can be tested against mocks of the
   API.

5. **Practical deployment:** Co-deployment avoids operational overhead today, but the logical
   separation means we can move to true service separation later without architectural rework.

6. **REST + WebSocket is pragmatic:**
   - REST handles the "give me state" and "do this action" patterns simply
   - WebSocket handles "stream updates to me" efficiently without polling
   - Both are well-understood; easy to debug with browser devtools

---

## Consequences

### Positive

- **Clean boundaries:** UI and orchestration logic are separate; changes to one don't break the
  other
- **Testability:** Both can be tested independently
- **Multi-client ready:** CLI, VSCode, web, mobile can all consume the same backend API
- **Real-time UX:** WebSocket delivers updates instantly (solves PROB-025, PROB-030)
- **Debuggability:** Backend state is inspectable via API (helps with PROB-031)
- **Simple deployment:** Co-deployment means no complex Kubernetes or multiple deployments initially

### Negative

- **Two codebases (loosely):** Backend and UI must be kept in sync via API contract; changes to one
  often require changes to the other
- **API contract maintenance:** The REST/WebSocket API must be versioned and documented; breaking
  changes require migration logic
- **Latency:** Network calls between UI and backend add latency (mitigated by local deployment;
  significant if truly separated)
- **Debugging:** Bugs at the boundary (malformed requests, missing fields) require understanding
  both sides
- **State synchronization:** UI must handle backend disconnection, reconnection, and out-of-order
  updates from WebSocket

### Requires

- **SPEC-api-design:** Define REST endpoints, request/response schemas, WebSocket message format,
  error handling
- **SPEC-backend-orchestration:** Define how LangGraph state is exposed via the API
- **SPEC-frontend-state-management:** Define how React manages backend state and handles
  disconnection
- **Error handling & resilience:** What happens if WebSocket disconnects? (reconnection strategy,
  queued operations, etc.)

---

## Known Issues / Open Questions

1. **WebSocket reconnection:** How many retries? What's the backoff strategy? What state is
   preserved during disconnection?
2. **Operation idempotency:** If the network fails after a command is sent but before response
   arrives, can the frontend safely retry? (Requires idempotent operations)
3. **Versioning:** How do we version the API without breaking old clients? (TBD in SPEC)
4. **Scaling later:** If we need true service separation, what changes are required? (Answer:
   minimal; the API contract remains, just move to separate processes)

---

## Troubleshooting

**Q: The UI and backend get out of sync**

- A: Implement idempotent operations; ensure WebSocket delivers all updates; add a "refresh state"
  button as a safety valve

**Q: Network latency is a problem**

- A: Keep them co-deployed; move to separate services only if scaling demands it

**Q: We want a CLI client**

- A: Build a CLI that makes REST calls to the same backend API; no reimplementation needed
