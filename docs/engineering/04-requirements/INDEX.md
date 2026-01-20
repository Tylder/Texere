# REQ Index (Full Catalog)

**Purpose:** Complete reference of all 47 Requirements with full titles, statements, and
traceability.

Each requirement is listed with its full name, shortened MUST statement, problems it addresses, and
constraining decisions.

---

## Legend

- **Full Name**: REQ ID with title (e.g., "REQ-ORCH-SESSION-001: Session state persistence")
- **Statement (short)**: Shortened MUST clause for quick reference
- **Problem(s)**: PROBDEF problems this REQ addresses
- **ADR(s)**: Architecture decisions that constrain how this REQ is satisfied
- **Status**: Proposed (candidate) → Approved (locked in) → Deprecated (replaced)

---

## Orchestration & State Management (ORCH)

| REQ ID: Full Name                                      | Statement (short)                                                                                                                                | Problem(s)                   | ADR(s)                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------ |
| **REQ-ORCH-SESSION-001: Session state persistence**    | Session state including epistemic state MUST persist across sessions and support task resumption without context loss                            | PROB-001, PROB-034, PROB-010 | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-SESSION-002: Checkpoint completeness**      | Checkpoints MUST capture complete epistemic state: facts, hypotheses, assumptions, unknowns, constraints, decisions, and rationale               | PROB-001, PROB-003           | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-SESSION-003: Resumption clarity**           | When resumed, system MUST communicate next safe action clearly, including what was completed, what remains, and what verification is needed      | PROB-034, PROB-027           | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-EPISTEMIC-001: Epistemic state separation** | System MUST maintain durable separation between facts, hypotheses, assumptions, unknowns, and constraints; categories MUST NOT blur              | PROB-003, PROB-008           | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-EPISTEMIC-002: Epistemic state durability** | Changes in epistemic state MUST be recorded when they occur with timestamp and rationale for the change                                          | PROB-003, PROB-004           | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-EPISTEMIC-003: Assumption validation**      | Previously unvalidated assumptions MUST NOT silently become facts in later sessions; they MUST be re-validated or marked uncertain               | PROB-003, PROB-008           | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-HISTORY-001: Decision history retrieval**   | Prior decisions and their rationale MUST be retrievable and used to guide current work, preventing repetition of rejected ideas                  | PROB-004, PROB-009           | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-HISTORY-002: Rationale preservation**       | Decision rationale (why we chose option A over B and C) MUST be preserved in durable form and remain retrievable for the lifetime of the project | PROB-004, PROB-009           | ADR-orchestration-langgraph-ts |
| **REQ-ORCH-DRIFT-001: Drift detection**                | System MUST detect and surface belief drift: contradictions between current and prior work, reversals without explanation, or constraint changes | PROB-004, PROB-008           | ADR-orchestration-langgraph-ts |

---

## User Interface & State Visibility (UI)

| REQ ID: Full Name                                           | Statement (short)                                                                                                                             | Problem(s)         | ADR(s)              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------- |
| **REQ-UI-STATE-001: Current state visibility**              | Current system state (beliefs, decisions, open items, status) MUST be externally visible and inspectable without reading conversation history | PROB-025, PROB-026 | ADR-ui-react-webapp |
| **REQ-UI-STATE-002: Canonical understanding baseline**      | A single, authoritative, user-visible "current understanding" baseline MUST exist that represents what the system believes at this moment     | PROB-026           | ADR-ui-react-webapp |
| **REQ-UI-STATE-003: Open items visibility**                 | Open work items (unknowns, decisions, risks, issues) MUST remain continuously visible and persist until explicitly resolved or dismissed      | PROB-027           | ADR-ui-react-webapp |
| **REQ-UI-STATE-004: Session delta surfacing**               | State changes across sessions MUST be clearly summarized so users can quickly re-orient, including what changed, when, and why                | PROB-030, PROB-027 | ADR-ui-react-webapp |
| **REQ-UI-UNCERTAINTY-001: Grounding indicators**            | Claims presented to user MUST be marked with grounding indicators: evidence-grounded (high confidence), inferred (hypothesis), or unknown     | PROB-035, PROB-040 | ADR-ui-react-webapp |
| **REQ-UI-UNCERTAINTY-002: Pre-action verification clarity** | High-impact actions MUST include explicit clarity about what must be verified before proceeding; verification MUST be checkable by user       | PROB-035, PROB-040 | ADR-ui-react-webapp |

---

## Execution & Feedback (EXEC)

| REQ ID: Full Name                                | Statement (short)                                                                                                                                    | Problem(s)         | ADR(s) |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| **REQ-EXEC-001: Execution result incorporation** | Execution results (test passes/failures, build outcomes, errors) MUST be consistently parsed, interpreted, and incorporated into orchestration state | PROB-013           | —      |
| **REQ-EXEC-002: Fix loop convergence**           | Fix loops MUST converge to stable passing state; oscillation (repeating same mistake or reverting prior fix) MUST be detected and surfaced           | PROB-013           | —      |
| **REQ-EXEC-003: Belief update on failure**       | Failed executions MUST update system beliefs about code state, assumptions, and next steps; failures are data about what is wrong                    | PROB-013, PROB-008 | —      |

---

## Quality Control (QC)

| REQ ID: Full Name                            | Statement (short)                                                                                                                                                         | Problem(s)         | ADR(s) |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| **REQ-QC-001: Independent output challenge** | High-risk outputs (plans, patches, decisions) MUST face independent challenge step before execution; challenge MUST be distinct and capable of identifying obvious errors | PROB-024, PROB-008 | —      |
| **REQ-QC-002: Error interception**           | When quality-control step identifies errors, system MUST present them to user/agent before proceeding; critical errors MUST block or alter execution path                 | PROB-024           | —      |

---

## Tool Reliability & Agent Discipline (TOOLS/AGENT)

| REQ ID: Full Name                             | Statement (short)                                                                                                                                      | Problem(s)         | ADR(s)                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------ |
| **REQ-TOOLS-001: Tool usage consistency**     | When a tool can provide evidence for a decision, it MUST be used consistently across sessions and model changes (not dependent on agent memory)        | PROB-017, PROB-005 | ADR-orchestration-langgraph-ts |
| **REQ-TOOLS-002: Tool output attribution**    | Tool outputs MUST remain retrievable and attributed for later steps and sessions; tool outputs MUST NOT vanish into chat history                       | PROB-005, PROB-009 | —                              |
| **REQ-AGENT-001: Phase boundary enforcement** | Phase boundaries (discovery → requirements → implementation) MUST be enforced by system, not by agent memory; system MUST prevent premature commitment | PROB-017, PROB-011 | —                              |
| **REQ-AGENT-002: Compliance assurance**       | Core correctness (tool use, phase discipline, epistemic separation) MUST be guaranteed by system architecture, not by agent compliance                 | PROB-017           | —                              |

---

## API & Communication (API)

| REQ ID: Full Name                        | Statement (short)                                                                                                                                       | Problem(s)         | ADR(s)                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------- |
| **REQ-API-001: REST endpoints**          | Backend MUST expose REST endpoints for state queries (GET) and mutations (POST/PUT) that allow UI to read state and trigger actions                     | PROB-025, PROB-026 | ADR-architecture-backend-ui-separation |
| **REQ-API-002: WebSocket streaming**     | Backend MUST stream state deltas to frontend via WebSocket in real-time (< 2 sec latency); no updates skipped; graceful reconnection required           | PROB-025, PROB-030 | ADR-architecture-backend-ui-separation |
| **REQ-API-003: Backend state ownership** | All stateful orchestration MUST reside in backend; UI MUST maintain only presentation state; backend state MUST be single source of truth               | PROB-031, PROB-033 | ADR-architecture-backend-ui-separation |
| **REQ-API-004: API versioning**          | API MUST be versioned and support backwards-compatibility or have explicit migration strategy; breaking changes MUST not silently cause client failures | —                  | ADR-architecture-backend-ui-separation |

---

## Observability & Debugging (OBS)

| REQ ID: Full Name                        | Statement (short)                                                                                                                                                  | Problem(s)         | ADR(s)                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------ |
| **REQ-OBS-001: Chain of responsibility** | For any output or decision, chain of responsibility MUST be clear: which agents ran, in what order, using what evidence and tools; MUST be auditable and queryable | PROB-031, PROB-016 | ADR-orchestration-langgraph-ts |
| **REQ-OBS-002: Failure mode diagnosis**  | When orchestration fails, system MUST provide diagnostics: what failed, why (if known), where in graph, and what evidence is available                             | PROB-031, PROB-016 | ADR-orchestration-langgraph-ts |
| **REQ-OBS-003: Divergence visibility**   | When evidence, constraints, and outputs diverge, divergence MUST be visible before large work accumulates; system MUST surface and require resolution              | PROB-031, PROB-014 | —                              |
| **REQ-OBS-004: Graph introspection**     | LangGraph orchestration MUST be introspectable: graph structure, execution path, and node states MUST be visible for debugging and analysis                        | PROB-031, PROB-016 | ADR-orchestration-langgraph-ts |

---

## Security & Data Protection (SEC)

| REQ ID: Full Name                            | Statement (short)                                                                                                                                          | Problem(s) | ADR(s) |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| **REQ-SEC-001: Secret protection**           | Secrets (API keys, credentials, tokens, passwords) MUST NOT appear in logs, prompts to models, generated code, or patches                                  | PROB-019   | —      |
| **REQ-SEC-002: Prompt injection prevention** | Untrusted content (repo text, documentation, issues) MUST NOT override system intent or bypass policies; content MUST be treated as data, not instructions | PROB-019   | —      |

---

## Testing & Validation (TEST)

| REQ ID: Full Name                           | Statement (short)                                                                                               | Problem(s)         | ADR(s) |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| **REQ-TEST-001: Pre-suggestion validation** | Code changes MUST pass tests before being suggested to user; suggested code MUST be tested in repo's test suite | PROB-007           | —      |
| **REQ-TEST-002: Result-driven fixes**       | Test failures MUST drive next steps in fixing code; system MUST NOT ignore, skip, or work around test failures  | PROB-007, PROB-013 | —      |

---

## Cost & Efficiency (COST)

| REQ ID: Full Name                            | Statement (short)                                                                                                             | Problem(s)         | ADR(s) |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| **REQ-COST-001: Ingestion deduplication**    | When same source text is ingested repeatedly, it MUST be detected and reused; re-ingestion MUST become exception, not default | PROB-012           | —      |
| **REQ-COST-002: Predictable resource usage** | Context and latency MUST remain predictable as repo size increases; system MUST NOT degrade linearly with repo size           | PROB-012, PROB-036 | —      |

---

## Freshness & Grounding (FRESH)

| REQ ID: Full Name                        | Statement (short)                                                                                                                           | Problem(s) | ADR(s) |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| **REQ-FRESH-001: Staleness detection**   | System MUST detect when ingested content may be stale and flag it for revalidation; staleness detection MUST be automatic or user-triggered | PROB-002   | —      |
| **REQ-FRESH-002: Research revalidation** | When stale content detected, system MUST offer or require revalidation of prior research findings; check if prior conclusions still hold    | PROB-002   | —      |

---

## Integration & Change Safety (INTEG)

| REQ ID: Full Name                       | Statement (short)                                                                                                                                          | Problem(s) | ADR(s) |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| **REQ-INTEG-001: Code alignment**       | Generated code MUST align with repo standards: naming conventions, style, architecture patterns; MUST NOT require reformatting to integrate                | PROB-007   | —      |
| **REQ-INTEG-002: Repo mutation safety** | Code changes MUST be applied safely: MUST NOT corrupt state, MUST respect concurrent modifications, MUST be reversible; unsafe mutations MUST be prevented | PROB-033   | —      |

---

## Trust & Confidence Calibration (TRUST)

| REQ ID: Full Name                        | Statement (short)                                                                                                                                                             | Problem(s)         | ADR(s)              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------- |
| **REQ-TRUST-001: Confidence indicators** | System outputs MUST be accompanied by explicit confidence indicators; user MUST distinguish high-confidence (grounded, tested) from low-confidence (hypothetical, unverified) | PROB-040, PROB-035 | ADR-ui-react-webapp |

---

## Summary

- **Total REQs**: 47
- **Categories**: 13 functional groups
- **Problems addressed**: All major high-impact problems from PROBDEF
- **ADRs with constraints**: 3 (LangGraph, React, API separation)

---

## Next Steps

1. Review this index for completeness and correctness
2. Adjust groupings, titles, or problem mappings if needed
3. Once approved, create individual REQ files (one per row)
4. Update PROBDEF and ADRs with bidirectional "See also" links

---

## Notes

- **ADR(s) column**: Empty ("—") means this REQ is not directly constrained by an already-decided
  ADR, but may be constrained by future ADRs (e.g., REQ-QC-001 will be constrained by an eventual
  ADR about critic architecture)
- **Grouping rationale**: Categories reflect functional areas rather than strict problem taxonomy.
  For example, PROB-004 (historical knowledge) appears under ORCH-HISTORY because solution involves
  history/decision tracking in orchestration, not UI
- **Linking strategy**: See `../LINKING-STRATEGY.md` for detailed explanation of how bidirectional
  tracing works
