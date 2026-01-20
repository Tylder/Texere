# ADR-ui-react-webapp: Use React web app for user interface

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR and supersede this one.

**Quick Summary:** We chose a React web app for the UI because the user experience requires
real-time visibility into complex orchestration state, task status, and epistemic baselines. CLI and
TUI alternatives cannot adequately display or track large amounts of data, and prior experience with
LLM coding tools confirms a browser-based UI is necessary for usability (PROB-025, PROB-026,
PROB-027, PROB-035).

---

## Quick Navigation

| Section                                             | Purpose                   | Read if...                                |
| --------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [Context](#context)                                 | Why we needed to decide   | You're considering alternative UIs        |
| [Decision](#decision)                               | What we chose             | You're implementing or understanding this |
| [Alternatives Considered](#alternatives-considered) | What we rejected          | You disagree or want trade-offs           |
| [Rationale](#rationale)                             | Why this is better        | You need the full reasoning               |
| [Consequences](#consequences)                       | Positive/negative impacts | You're assessing cost/benefit             |

---

## References

**Driven by:**

- PROBDEF-ai-coding-system: PROB-025 (Current system state not visible), PROB-026 (No canonical
  understanding baseline), PROB-027 (Open work not continuously visible), PROB-030 (State changes
  across sessions not surfaced), PROB-035 (Uncertainty not communicated usably)
- User experience requirement: Real-time display of large amounts of data (decisions, assumptions,
  unknowns, execution status) must be discoverable and trackable
- Empirical evidence: Prior use of CLI/TUI for LLM coding found them insufficient for this type of
  visibility

**Implemented by:** (TBD: SPEC for React UI architecture)

---

## Context

The user experience requires:

1. **Real-time state visibility (PROB-025, PROB-030):** The user must see what the system currently
   believes and what changed since last session, continuously
2. **Epistemic baseline (PROB-026):** A canonical, readable view of facts, assumptions, unknowns,
   and decisions that can be inspected and validated
3. **Open item tracking (PROB-027):** Risks, pending decisions, and unresolved unknowns must remain
   visible until closed
4. **Data volume:** The system tracks decisions, traces, execution history, and uncertainty markers.
   This is too much data for CLI/TUI to present effectively
5. **Discoverability:** Users must be able to navigate and search this state without memorizing
   command syntax

Prior experience:

- CLI-only tools for LLM coding lack visual hierarchy and force users to memorize state
- TUI tools are improvement but still limited for displaying rich, interconnected data
- React web apps provide component-based UI, real-time updates, and visual design flexibility

---

## Decision

**We will build a React web app as the primary UI.**

Specifics:

- React (hooks-based, modern pattern) for component architecture
- TypeScript for type safety (consistent with backend)
- Real-time connection to backend (via WebSocket or Server-Sent Events)
- Responsive design suitable for desktop and tablet
- Focus on clarity of epistemic state and decision history

---

## Alternatives Considered

### A) CLI-only

- **Pro:** Faster to build, zero UI framework needed, developers feel at home
- **Con:** Cannot visually display large amounts of data; users cannot easily track multiple open
  items; state is opaque unless explicitly printed; not suitable for the "continuous visibility"
  requirement
- **Why not:** Empirically insufficient from prior LLM coding experience; fails PROB-025, PROB-026,
  PROB-027

### B) Terminal UI (TUI; e.g., using Ink, Blessed)

- **Pro:** Keeps users in terminal; faster for keyboard-native workflows
- **Con:** Still limited for displaying complex, interconnected state; real-time streaming is
  awkward; visual hierarchy is poor; difficult to show rich data structures
- **Why not:** Incremental improvement over CLI but still inadequate for the data volume and
  visualization needs

### C) VSCode extension

- **Pro:** Integrated into developer's IDE; no context switch; good IDE affordances
- **Con:** Requires learning VSCode extension APIs; complex to build; UI/UX constraints imposed by
  IDE; harder to do rich real-time visualizations; locks users into VSCode
- **Why not:** Viable for power users but increases friction for others; separate web app is more
  accessible

### D) Native desktop app (Electron, Tauri)

- **Pro:** Native-like experience, offline capable
- **Con:** Requires platform-specific tooling; larger bundle; distribution complexity; no advantage
  over web app for this use case
- **Why not:** Web app is simpler to build and deploy

---

## Rationale

React web app solves the core UX problems:

1. **State visibility (PROB-025, PROB-026):** React component composition lets you build a coherent,
   scannable view of "what is the system doing right now?" Facts, assumptions, and unknowns can be
   color-coded, grouped, and highlighted.

2. **Data volume:** Rich visualizations (tables, timelines, decision trees, logs) are practical in
   React. ASCII tables in CLI or TUI would be unreadable at scale.

3. **Real-time updates (PROB-030):** React's state management and WebSocket connection enable the UI
   to update instantly as orchestration progresses, without polling.

4. **Discoverability (PROB-027):** Open items (risks, unknowns, decisions) can be displayed as
   persistent, filterable components. No CLI command to remember.

5. **Team velocity:** React is familiar to most modern web developers; large ecosystem for UI
   patterns, accessible design, testing.

6. **Language alignment:** TypeScript + React + Node.js backend = cohesive tech stack.

---

## Consequences

### Positive

- **Rich visualization:** Can display complex state clearly; users see what's happening
- **Real-time updates:** Frontend instantly reflects backend changes
- **Accessibility:** No learning curve for developers; web browser is universal
- **Mobile-friendly:** Can extend to tablet/mobile-like responsive design later
- **Debugging:** Browser devtools are excellent for troubleshooting UI state
- **Community:** Mature ecosystem for React patterns, libraries, and tooling

### Negative

- **Infrastructure:** Requires Node.js server (or similar) for frontend + separate backend
- **Deployment complexity:** Two services to deploy (frontend + API)
- **Browser dependence:** UI only works in modern browsers; no offline capability
- **State synchronization:** Frontend state must stay in sync with backend; potential for divergence
- **Bundle size:** React + dependencies adds client-side code; may affect initial load time
  (mitigated by code splitting)

### Requires

- **ADR-X (frontend-backend communication):** Decides whether to use REST + WebSocket, Server-Sent
  Events, or GraphQL subscriptions (we chose REST + WebSocket hybrid; see
  ADR-architecture-backend-ui-separation)
- **SPEC-ui-architecture:** Define React component structure, state management (Redux, Zustand,
  Context), styling approach
- **SPEC-ui-component-library:** Decide on component library (Material-UI, Shadcn, custom) for
  consistency

---

## Known Issues / Open Questions

1. **Offline experience:** Should the UI work offline? (Current decision: no; backend is always
   required)
2. **Performance:** What is acceptable latency for real-time updates? (TBD in SPEC)
3. **Accessibility:** WCAG compliance level? (TBD in SPEC)

---

## Troubleshooting

**Q: The frontend is out of sync with backend state**

- A: Implement explicit refresh/reload on connection loss; consider server-sent events for
  guaranteed delivery

**Q: Frontend is slow or large**

- A: Implement code splitting by feature; lazy-load heavy components; profile with React Profiler

**Q: We want a CLI after all**

- A: Build a separate CLI client that calls the same backend API; both can coexist
