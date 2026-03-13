# Loom Research Documents

## TL;DR

> **Quick Summary**: Write 6 comprehensive research documents to `/docs/research/coding_orchestrator/` plus a README, synthesizing 10+ interview rounds, 10 background research agents, and 200+ feature inventory into the foundational specification for building Loom — a custom multi-agent coding orchestrator.
> 
> **Deliverables**:
> - 6 research documents (00-overview through 05-implementation-roadmap)
> - 1 README.md summarizing the research
> - Reconciled Texere KG (stale decisions invalidated, missing decisions stored)
> - Cross-document consistency validation
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves (after sequential prerequisites)
> **Critical Path**: KG Reconciliation → Doc 00 → Doc 03 + Doc 04 (parallel) → Doc 01 → Doc 02 → Doc 05 → Validation

---

## Context

### Original Request
Write 6 research documents to `/docs/research/coding_orchestrator/` that serve as the foundation for building Loom. All research is complete — 10+ interview rounds, 10 background research agents, 200+ feature inventory, full architecture design. The documents synthesize everything into a permanent specification.

### Interview Summary
**Key Discussions (10+ rounds)**:
- Round 1-2: Problem statement, core pain points with OpenCode/OMO plugin boundary
- Round 3: Naming (Loom + Texere), prioritization (MVP-first), parallel agent strategy (hybrid)
- Round 4: 7 MVP agents, Localhost Web UI, Texere Expert agent, tool strategy
- Round 5: Event-sourced execution, new Loom monorepo, agent config research
- Round 6: Turborepo confirmed, three-layer agent config → simplified to pure TypeScript
- Round 7: Fastify (changed from Hono after Bun→Node switch), RxJS event bus, separate event tables
- Round 8: Node.js runtime (changed from Bun — native module compatibility risk)
- Round 9: Custom orchestration design (AgentRunner, TaskScheduler, task() tool, LoomEngine on Vercel AI SDK)
- Round 10: TDD, integration tests from day 1, FakeLLM, test audit step

**Research Findings (10 background agents)**:
- OpenCode: TypeScript/Bun, Hono, SQLite, Vercel AI SDK, 4 hardcoded agents, 50+ features
- OMO: 180+ features, 11 agents, 41 hooks, 24 tools — significant complexity hotspots (BackgroundManager 1646 lines, Context Window Recovery 2232 lines)
- Competitors: Cursor (8 parallel agents/worktrees), Claude Code (200K context isolation), Devin (Planner+Critic), Goose (MCP-native)
- Frameworks: LangGraph (best control), CrewAI (role-based YAML), Mastra (MCP-native TS) — user chose custom
- Turborepo vs NX: Turborepo wins for solo dev (7x faster, minimal config, stable Bun→Node support)
- Agent config patterns: OMO (TS+JSON), CrewAI (YAML), Mastra (code-first), AutoGen (Python) — user chose pure TypeScript

### Metis Review
**Identified Gaps (addressed in plan)**:
- KG is stale: 6 Loom decisions stored, but Hono→Fastify and Bun→Node.js changes not reflected. 9+ decisions missing entirely. **Resolution**: Task 1 reconciles KG before doc writing.
- Feature inventory (200+ features) only exists in draft file, not persisted. **Resolution**: Draft file referenced as primary source for doc 03; inventory persisted within the doc itself.
- Document ordering matters for consistency. **Resolution**: Dependency-ordered execution: 00 → 03+04 → 01 → 02 → 05.
- Cross-document terminology consistency risk. **Resolution**: Doc 00 establishes canonical glossary; validation task checks all docs.
- Edge cases not addressed (circular delegation, event replay with side effects, concurrent Texere writes). **Resolution**: Added to doc 01 and 02 scope.
- Per-document scope guardrails needed to prevent creep. **Resolution**: Each task has explicit "Must NOT" section.
- Max doc length: 1,500 lines per doc. **Resolution**: Added as guardrail.

---

## Work Objectives

### Core Objective
Synthesize all Loom research (interviews, agent findings, feature inventory, architecture decisions) into 6 permanent research documents that serve as the complete specification for building Loom.

### Concrete Deliverables
- `docs/research/coding_orchestrator/00-overview.md`
- `docs/research/coding_orchestrator/01-architecture.md`
- `docs/research/coding_orchestrator/02-agent-system.md`
- `docs/research/coding_orchestrator/03-opencode-omo-analysis.md`
- `docs/research/coding_orchestrator/04-tech-stack.md`
- `docs/research/coding_orchestrator/05-implementation-roadmap.md`
- `docs/research/coding_orchestrator/README.md`
- Texere KG reconciled (stale nodes invalidated, missing decisions stored)

### Definition of Done
- [ ] All 7 files exist in `docs/research/coding_orchestrator/`
- [ ] All 15+ decisions documented in doc 00
- [ ] All 7 MVP agents specified in doc 02
- [ ] Feature analysis covers top 50+ features with Replicate/Improve/Skip classification in doc 03
- [ ] All 9+ tech stack choices documented with rationale in doc 04
- [ ] Implementation phases defined with TDD strategy and test audit step in doc 05
- [ ] No mentions of "Hono" or "Bun" as current choices (only in historical/rejected context)
- [ ] Cross-document terminology is consistent
- [ ] No doc exceeds 1,500 lines
- [ ] Texere KG has corrected decision nodes (Fastify not Hono, Node.js not Bun)

### Must Have
- Every decision from interview rounds 1-10 documented with rationale
- Decision evolution story (Bun→Node.js, Hono→Fastify, three-layer→pure TS) in doc 00
- Concrete TypeScript interface for agent config schema in doc 02
- Feature parity table (top 50+ features) with classification in doc 03
- TDD strategy with FakeLLM, integration test patterns, and test audit step in doc 05
- Format consistent with `docs/research/omo/` pattern (structured markdown, tables, diagrams)

### Must NOT Have (Guardrails)
- No implementation code beyond TypeScript interfaces/types and short illustrative snippets
- No calendar dates or time estimates in roadmap (phases + ordering + dependencies only)
- No re-litigating decided tech choices (document the choice + rationale, don't re-compare)
- No editorializing in feature analysis ("X is bad") — factual: replicate/improve/skip with rationale
- No doc exceeding 1,500 lines — aim for information density
- No speculative features beyond what was discussed in interviews

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**

### Test Decision
- **Infrastructure exists**: YES (Texere uses Vitest)
- **Automated tests**: NO (documentation task, not code)
- **Framework**: N/A

### Agent-Executed QA Scenarios (MANDATORY)

Every task includes verification via bash commands (grep, wc, ls) to validate document content without human review.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: KG Reconciliation [no dependencies]

Wave 2 (After Wave 1):
└── Task 2: Doc 00 - Overview [depends: 1]

Wave 3 (After Wave 2):
├── Task 3: Doc 03 - OpenCode/OMO Analysis [depends: 2]
└── Task 4: Doc 04 - Tech Stack [depends: 2]

Wave 4 (After Wave 3):
└── Task 5: Doc 01 - Architecture [depends: 3, 4]

Wave 5 (After Wave 4):
└── Task 6: Doc 02 - Agent System [depends: 5]

Wave 6 (After Wave 5):
└── Task 7: Doc 05 - Implementation Roadmap [depends: 3, 4, 5, 6]

Wave 7 (After Wave 6):
├── Task 8: README [depends: 2-7]
└── Task 9: Cross-Document Validation & Quality Audit [depends: 2-8]

Critical Path: 1 → 2 → 3 → 5 → 6 → 7 → 9
Parallel Speedup: Tasks 3+4 run in parallel (~15% faster)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3, 4 | None |
| 3 | 2 | 5, 7 | 4 |
| 4 | 2 | 5, 7 | 3 |
| 5 | 3, 4 | 6 | None |
| 6 | 5 | 7 | None |
| 7 | 3, 4, 5, 6 | 8, 9 | None |
| 8 | 2-7 | 9 | None |
| 9 | 2-8 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|--------------------|
| 1 | 1 | task(category="quick", load_skills=["texere"]) |
| 2 | 2 | task(category="writing", load_skills=["texere"]) |
| 3 | 3, 4 | task(category="writing", load_skills=["texere"]) — parallel |
| 4 | 5 | task(category="writing", load_skills=["texere"]) |
| 5 | 6 | task(category="writing", load_skills=["texere"]) |
| 6 | 7 | task(category="writing", load_skills=["texere"]) |
| 7 | 8, 9 | task(category="quick") for README, task(category="unspecified-low") for validation |

---

## TODOs

- [ ] 1. Reconcile Texere Knowledge Graph

  **What to do**:
  - Search Texere for all Loom-related decision nodes
  - Invalidate stale node `nrwumgySTiMTVXsc0dcPD` (says "Hono server (TypeScript/Bun)" — now Fastify/Node.js)
  - Store corrected/missing decisions as new nodes:
    - Runtime: Node.js + pnpm (not Bun). Rationale: native module compatibility (better-sqlite3, onnxruntime-node, Playwright, MCP SDK)
    - Server: Fastify (not Hono). Rationale: native to Node.js, built-in Pino logging, mature WS plugin
    - Build: Turborepo. Rationale: familiar, stable, 7x faster than NX, minimal config
    - Event architecture: Event-sourced with RxJS. Rationale: full observability, parallel coordination, push-based
    - Event storage: Persistent append-only, separate tables from session messages
    - Agent config: Pure TypeScript (not JSON/YAML/Markdown). Rationale: max type safety
    - Orchestration: Custom on Vercel AI SDK (AgentRunner, TaskScheduler, task() tool, LoomEngine)
    - Context compaction: Hybrid (heuristic truncation → LLM summary if needed)
    - Write isolation: File locking (MVP), git worktrees (post-MVP)
    - Testing: TDD, integration tests from day 1, FakeLLM stub, test audit step, intent-not-implementation
    - Texere integration: Copy + restructure into Loom monorepo
  - Verify all 5 existing KG nodes are still accurate; invalidate any that are stale

  **Must NOT do**:
  - Do not delete any nodes (Texere uses soft-delete via invalidation)
  - Do not modify existing node content (nodes are immutable — use replaceNode)
  - Do not create duplicate nodes — search before storing

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward CRUD operations on Texere KG, no complex logic
  - **Skills**: [`texere`]
    - `texere`: Required for KG operations (search, store, invalidate, replace)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1)
  - **Blocks**: Task 2 (all docs depend on correct KG state)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/graph/src/index.ts` — Texere class API: storeNode(), replaceNode(), invalidateNode(), search()

  **Documentation References**:
  - `docs/kg-redesign.md` — Edge types, immutability rules, node type/role matrix
  - `docs/node-modeling-test-findings.md` — Anti-patterns (always search before store, no mutations)

  **Data References**:
  - `.sisyphus/drafts/coding-orchestrator.md` — All decisions (Rounds 1-10) with rationale, lines 1-240
  - Existing KG nodes to check/update:
    - `v8emyxmTewU8tL3pnrRES` — Two-tier memory architecture decision
    - `xB0SoP4nHilIsBRapNuDV` — Naming decision (Loom + Texere)
    - `nrwumgySTiMTVXsc0dcPD` — **STALE** — Says "Hono server (TypeScript/Bun)", must be invalidated
    - `GBk7-DB28CBHJGlD6SwVj` — MVP 7 agents decision
    - `Rqb6Fgyw05spOj156PmdQ` — Hybrid parallel agents decision

  **Acceptance Criteria**:

  - [ ] Node `nrwumgySTiMTVXsc0dcPD` is invalidated
  - [ ] New node exists for Fastify + Node.js server decision
  - [ ] New nodes exist for all 11 missing decisions listed above
  - [ ] `texere_search({ query: "Loom" })` returns only current (non-stale) decisions
  - [ ] No duplicate nodes (search for each title before storing)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Stale KG node invalidated
    Tool: Bash (texere MCP tools via the texere skill)
    Steps:
      1. texere_get_node({ id: "nrwumgySTiMTVXsc0dcPD" })
      2. Assert: node has invalidated_at timestamp (not null)
    Expected Result: Stale Hono/Bun node is soft-deleted

  Scenario: All Loom decisions searchable
    Tool: Bash (texere MCP tools)
    Steps:
      1. texere_search({ query: "Loom decision", mode: "keyword" })
      2. Assert: results include Fastify, Node.js, Turborepo, RxJS, TDD decisions
      3. Assert: results do NOT include stale Hono/Bun node
    Expected Result: KG reflects current architectural decisions
  ```

  **Commit**: YES
  - Message: `docs(research): reconcile texere KG with current Loom decisions`
  - Files: Texere database (internal)
  - Pre-commit: N/A (KG operations, not source code)

---

- [ ] 2. Write Doc 00 — Overview

  **What to do**:
  - Create `docs/research/coding_orchestrator/00-overview.md`
  - **Sections to include**:
    - Project Vision: What Loom is, why it exists, what problem it solves
    - Problem Statement: OpenCode plugin boundary limitations (11 core pain points from draft lines 3-23)
    - Canonical Terminology Glossary: Define ALL Loom-specific terms (agent names, component names, pattern names) — ALL other docs reference this
    - Decision Log: Every decision from rounds 1-10 with rationale. MUST include decision evolution (Bun→Node.js, Hono→Fastify, three-layer→pure TS, Ink TUI→Web UI)
    - Scope Boundaries: What's IN (multi-agent orchestration, web UI, Texere integration, MCP, multi-provider) and OUT (IDE extension, mobile, cloud hosting)
    - User Constraints (verbatim quotes): "feature equivalent to OMO as a minimum", "NEVER COMMIT CODE", "I HATE how it forgets things", etc.
    - Differentiation Strategy: What makes Loom unique vs. Cursor, Claude Code, Goose, Aider
  - **Source material**: Draft lines 1-240 (all decisions), Texere KG nodes (freshly reconciled)
  - **Format**: Follow `docs/research/omo/00-overview.md` pattern

  **Must NOT do**:
  - Do not include implementation details (how-to-build) — this doc is decisions + vision only
  - Do not exceed 1,500 lines
  - Do not re-litigate decisions — document the choice and why, including evolution story
  - Do not include UI wireframes or API specs

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Primary documentation authoring task requiring synthesis of multiple sources
  - **Skills**: [`texere`]
    - `texere`: Read reconciled KG decisions for accuracy

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2)
  - **Blocks**: Tasks 3, 4 (all docs reference doc 00's terminology and decisions)
  - **Blocked By**: Task 1 (KG must be reconciled first)

  **References**:

  **Pattern References**:
  - `docs/research/omo/00-overview.md` — Format template: structure, tone, level of detail (332 lines)

  **Data References**:
  - `.sisyphus/drafts/coding-orchestrator.md:1-240` — All decisions from rounds 1-10 with rationale
  - Texere KG — All Loom decision nodes (freshly reconciled in Task 1)

  **Context References**:
  - `.sisyphus/drafts/coding-orchestrator.md:43-68` — OpenCode analysis, framework evaluation, competitor landscape
  - `.sisyphus/drafts/coding-orchestrator.md:70-78` — Differentiation opportunities

  **Acceptance Criteria**:

  - [ ] File exists: `docs/research/coding_orchestrator/00-overview.md`
  - [ ] Contains >= 15 decisions documented (one per interview round minimum)
  - [ ] Contains decision evolution section (Bun→Node.js, Hono→Fastify, three-layer→pure TS)
  - [ ] Contains terminology glossary with all component names (LoomEngine, AgentRunner, TaskScheduler, etc.)
  - [ ] Contains scope boundaries (IN and OUT sections)
  - [ ] Contains verbatim user constraints
  - [ ] Does NOT mention Hono or Bun as current choices
  - [ ] Does NOT exceed 1,500 lines

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All decisions present
    Tool: Bash
    Steps:
      1. grep -c "Decision\|Rationale\|Chose\|Selected" docs/research/coding_orchestrator/00-overview.md
      2. Assert: count >= 15
    Expected Result: At least 15 decisions documented

  Scenario: Decision evolution documented
    Tool: Bash
    Steps:
      1. grep -c "Bun.*Node\|Hono.*Fastify\|three-layer.*TypeScript" docs/research/coding_orchestrator/00-overview.md
      2. Assert: count >= 2 (at least 2 evolution stories)
    Expected Result: Decision changes are documented, not just final state

  Scenario: No stale technology references
    Tool: Bash
    Steps:
      1. grep -n "Hono\|Bun" docs/research/coding_orchestrator/00-overview.md
      2. Assert: every match is in historical/rejected/evolution context, never as "current choice"
    Expected Result: Only Fastify and Node.js appear as current decisions

  Scenario: Terminology glossary exists
    Tool: Bash
    Steps:
      1. grep -c "LoomEngine\|AgentRunner\|TaskScheduler\|EventBus\|ToolRuntime" docs/research/coding_orchestrator/00-overview.md
      2. Assert: count >= 5
    Expected Result: All core components defined in glossary

  Scenario: Line count within limit
    Tool: Bash
    Steps:
      1. wc -l docs/research/coding_orchestrator/00-overview.md
      2. Assert: count <= 1500
    Expected Result: Document is within size guardrail
  ```

  **Commit**: YES
  - Message: `docs(research): add Loom overview — vision, decisions, terminology`
  - Files: `docs/research/coding_orchestrator/00-overview.md`
  - Pre-commit: Acceptance criteria checks above

---

- [ ] 3. Write Doc 03 — OpenCode/OMO Feature Analysis

  **What to do**:
  - Create `docs/research/coding_orchestrator/03-opencode-omo-analysis.md`
  - **Sections to include**:
    - Executive Summary: What OpenCode and OMO provide, why we're replacing them
    - OpenCode Core Features: Summarize 50+ features from OpenCode analysis
    - OMO Extended Features: Summarize 180+ features from OMO analysis
    - Feature Classification Table: Top 50+ critical features with columns: Feature | Source (OpenCode/OMO/Both) | Classification (Replicate/Improve/Skip) | Loom Priority (MVP/Post-MVP/Future) | Notes
    - OMO Complexity Hotspots: BackgroundManager (1646 lines), Context Window Recovery (2232 lines), Boulder (2061 lines), Ralph Loop (1687 lines), Claude Code Hooks (2110 lines) — what they do, why they're complex, how Loom simplifies
    - OMO Limitations (11 specific): Polling, advisory tool restrictions, no UI extensibility, etc.
    - What Loom Improves: Event-driven (not polling), enforced permissions (not advisory), config-driven agents (not hardcoded), first-class Texere (not MCP indirection)
    - Table-Stakes 2026: What every competitor has that Loom must match
    - Full Feature Inventory: Appendix with complete 200+ feature list from draft (categories A-F)
  - **Source material**: Draft lines 142-534 (feature inventory A-F), OMO research docs, OpenCode analysis

  **Must NOT do**:
  - Do not editorialize ("X is bad") — factual analysis with Replicate/Improve/Skip classification
  - Do not enumerate all 200+ features in the main body — summary table of top 50+, full list in appendix
  - Do not exceed 1,500 lines
  - Do not include Loom implementation details — this is analysis of what EXISTS, not what we'll build

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Large synthesis task — combining multiple research sources into structured analysis
  - **Skills**: [`texere`]
    - `texere`: Search for existing research findings stored in KG

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 4)
  - **Blocks**: Tasks 5, 7
  - **Blocked By**: Task 2 (references doc 00 terminology)

  **References**:

  **Pattern References**:
  - `docs/research/omo/00-overview.md` — OMO system overview, architecture summary (332 lines)
  - `docs/research/omo/01-agent-architecture.md` — 11 agents deep dive (754 lines)
  - `docs/research/omo/05-plugin-integration.md` — OpenCode SDK hooks, limitations (949 lines)

  **Data References**:
  - `.sisyphus/drafts/coding-orchestrator.md:142-534` — Complete 200+ feature inventory (categories A-F)
  - `.sisyphus/drafts/coding-orchestrator.md:3-23` — Core pain points and limitations
  - `docs/research/omo/README.md` — OMO research summary (381 lines)

  **Documentation References**:
  - `docs/research/omo/02-agent-communication.md` — Task delegation, sessions, concurrency (861 lines)
  - `docs/research/omo/03-prompt-system.md` — Dynamic prompt composition (662 lines)
  - `docs/research/omo/04-adding-agents.md` — Custom agent guide (791 lines)

  **Acceptance Criteria**:

  - [ ] File exists: `docs/research/coding_orchestrator/03-opencode-omo-analysis.md`
  - [ ] Feature classification table has >= 50 rows with Replicate/Improve/Skip classification
  - [ ] All 11 OMO limitations documented
  - [ ] OMO complexity hotspots section present (5 components with line counts)
  - [ ] Table-stakes 2026 section present
  - [ ] Full feature inventory in appendix (categories A-F)
  - [ ] Uses terminology from doc 00 glossary
  - [ ] Does NOT exceed 1,500 lines

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Feature classification table is substantial
    Tool: Bash
    Steps:
      1. grep -c "Replicate\|Improve\|Skip" docs/research/coding_orchestrator/03-opencode-omo-analysis.md
      2. Assert: count >= 50
    Expected Result: At least 50 features classified

  Scenario: All OMO limitations documented
    Tool: Bash
    Steps:
      1. grep -c "limitation\|Limitation\|polling\|advisory\|No UI\|hardcoded" docs/research/coding_orchestrator/03-opencode-omo-analysis.md
      2. Assert: count >= 8
    Expected Result: Core limitations are documented

  Scenario: Complexity hotspots present
    Tool: Bash
    Steps:
      1. grep -c "BackgroundManager\|Context.*Recovery\|Boulder\|Ralph.*Loop\|Claude.*Hooks" docs/research/coding_orchestrator/03-opencode-omo-analysis.md
      2. Assert: count >= 5
    Expected Result: All 5 complexity hotspots analyzed
  ```

  **Commit**: YES (groups with Task 4 if parallel)
  - Message: `docs(research): add OpenCode/OMO feature analysis with classification`
  - Files: `docs/research/coding_orchestrator/03-opencode-omo-analysis.md`

---

- [ ] 4. Write Doc 04 — Tech Stack

  **What to do**:
  - Create `docs/research/coding_orchestrator/04-tech-stack.md`
  - **Sections to include**:
    - Stack Overview: Table of all technology choices
    - Per-technology sections (each with: What it is | Why chosen | What was considered | Rationale for final choice):
      - Runtime: Node.js + pnpm (not Bun — compatibility analysis)
      - Build: Turborepo (not NX — comparison summary)
      - LLM: Vercel AI SDK + conduit-ai (not LangGraph/Mastra — framework comparison)
      - Server: Fastify (not Hono/Express — changed after Bun→Node switch)
      - UI: React + Vite on localhost (not Ink TUI — LLM fluency rationale)
      - Event Bus: RxJS (not mitt/custom — parallel agent coordination needs)
      - Database: SQLite + better-sqlite3 (proven with Texere)
      - Knowledge Graph: @texere/graph (copied into monorepo)
      - Testing: Vitest (consistent with Texere)
      - Agent Config: Pure TypeScript + Zod (not YAML/JSON)
    - Integration Points: How the stack components connect (dependency diagram)
    - Known Risks: Identified technical risks per technology
    - conduit-ai Gap Analysis: What it provides (OAuth) vs. what Loom must build (provider registry, model catalog, tool calling, etc.)

  **Must NOT do**:
  - Do not re-litigate decided choices — document the decision and rationale
  - Do not include full framework comparison tables (those live in the draft/research, not here)
  - Do not exceed 1,500 lines
  - Do not include implementation code beyond short illustrative snippets

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Technical documentation requiring synthesis of framework comparisons
  - **Skills**: [`texere`]
    - `texere`: Read tech-related decisions from KG

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 3)
  - **Blocks**: Tasks 5, 7
  - **Blocked By**: Task 2 (references doc 00 terminology)

  **References**:

  **Data References**:
  - `.sisyphus/drafts/coding-orchestrator.md:43-68` — Framework evaluation table, competitor landscape
  - `.sisyphus/drafts/coding-orchestrator.md:158-240` — All tech decisions (rounds 5-9) with rationale
  - `.sisyphus/drafts/coding-orchestrator.md:273-285` — Current tech stack summary
  - `.sisyphus/drafts/coding-orchestrator.md:400-431` — conduit-ai features and gaps

  **Acceptance Criteria**:

  - [ ] File exists: `docs/research/coding_orchestrator/04-tech-stack.md`
  - [ ] All 10+ tech choices documented with rationale
  - [ ] Each tech section has: What | Why | Alternatives Considered | Rationale
  - [ ] conduit-ai gap analysis section present
  - [ ] Integration/dependency diagram present
  - [ ] Uses terminology from doc 00 glossary
  - [ ] Does NOT exceed 1,500 lines

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All stack components present
    Tool: Bash
    Steps:
      1. grep -cE "(Node\.js|Fastify|React|Vite|RxJS|Vercel AI SDK|conduit-ai|Turborepo|better-sqlite3|Texere|Vitest)" docs/research/coding_orchestrator/04-tech-stack.md
      2. Assert: count >= 10
    Expected Result: All tech choices documented

  Scenario: Alternatives documented
    Tool: Bash
    Steps:
      1. grep -c "Considered\|Alternative\|Instead of\|Over\|Not chosen\|rejected" docs/research/coding_orchestrator/04-tech-stack.md
      2. Assert: count >= 5
    Expected Result: At least 5 alternative-considered sections
  ```

  **Commit**: YES (groups with Task 3 if parallel)
  - Message: `docs(research): add tech stack choices with rationale`
  - Files: `docs/research/coding_orchestrator/04-tech-stack.md`

---

- [ ] 5. Write Doc 01 — Architecture

  **What to do**:
  - Create `docs/research/coding_orchestrator/01-architecture.md`
  - **Sections to include**:
    - System Overview: Three-layer architecture (UI → Server → Engine) with ASCII diagram
    - Request Flow: How a user message flows through the system (step by step)
    - LoomEngine: Central coordinator — subsystems, wiring, main entry point
    - Custom Orchestration Layer: What Vercel AI SDK provides vs. what we build
      - AgentRunner: Wraps streamText(), emits events, enforces permissions
      - TaskScheduler: Parallel execution, queuing, concurrency limits, task lifecycle state machine
      - `task()` Tool: Delegation mechanism — agent/category resolution, sync/async modes
    - Event-Sourced Architecture:
      - LoomEvent types (session, agent, tool, task, memory, context categories)
      - RxJS event bus: Producers and consumers
      - Event persistence (append-only SQLite, separate from session messages)
      - Crash recovery via event replay + session messages
    - Context Window Management: Three thresholds (60/75/90%), hybrid compaction strategy
    - Error Handling & Resilience: Retry strategy, model fallback chains, infinite loop detection, cascading failures
    - Write Agent Isolation: File locking (MVP), git worktrees (post-MVP)
    - Session Management: CRUD, fork, compact, revert, parent-child relationships
    - Memory Architecture: Two-tier (ephemeral short-term + Texere KG long-term)
    - Edge Cases (from Metis review):
      - Event replay with side effects (state events vs. effect events)
      - Circular delegation prevention
      - Concurrent Texere writes from parallel agents (SQLite WAL + IMMEDIATE)
    - Monorepo Structure: 6 packages + 2 apps, dependency graph

  **Must NOT do**:
  - Do not include UI wireframes or API endpoint specs
  - Do not include full implementation code — TypeScript interfaces and short illustrative snippets only
  - Do not discuss CQRS, projections, event versioning, or snapshots (post-MVP concerns)
  - Do not exceed 1,500 lines

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Most complex document — requires deep technical synthesis
  - **Skills**: [`texere`]
    - `texere`: Read architecture decisions from KG

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 4)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 3, 4 (architecture references features and tech stack)

  **References**:

  **Pattern References**:
  - `docs/research/omo/01-agent-architecture.md` — OMO agent architecture format (754 lines)
  - `docs/research/omo/02-agent-communication.md` — Communication patterns format (861 lines)

  **Data References**:
  - `.sisyphus/drafts/coding-orchestrator.md:196-330` — Architecture summary, orchestration layer, context management, error handling, write isolation
  - `.sisyphus/drafts/coding-orchestrator.md:130-140` — Scope boundaries
  - `.sisyphus/drafts/coding-orchestrator.md:364-395` — Loom improvements (C1-C6)

  **Cross-References**:
  - `docs/research/coding_orchestrator/00-overview.md` — Terminology glossary, decision log
  - `docs/research/coding_orchestrator/03-opencode-omo-analysis.md` — Features that architecture must address
  - `docs/research/coding_orchestrator/04-tech-stack.md` — Technology constraints

  **Acceptance Criteria**:

  - [ ] File exists: `docs/research/coding_orchestrator/01-architecture.md`
  - [ ] Contains system overview ASCII diagram
  - [ ] All 4 core abstractions documented (LoomEngine, AgentRunner, TaskScheduler, task() tool)
  - [ ] Event types enumerated
  - [ ] Context compaction strategy documented (three thresholds, hybrid)
  - [ ] Error handling documented (retry, fallback, loop detection)
  - [ ] Write isolation documented (file locking MVP, worktrees post-MVP)
  - [ ] Edge cases addressed (event replay, circular delegation, concurrent Texere writes)
  - [ ] Does NOT exceed 1,500 lines

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Core abstractions present
    Tool: Bash
    Steps:
      1. grep -cE "(AgentRunner|TaskScheduler|LoomEngine|task\(\))" docs/research/coding_orchestrator/01-architecture.md
      2. Assert: count >= 8
    Expected Result: All 4 abstractions documented with sufficient detail

  Scenario: Event types documented
    Tool: Bash
    Steps:
      1. grep -c "agent:\|tool:\|task:\|session:\|context:\|memory:" docs/research/coding_orchestrator/01-architecture.md
      2. Assert: count >= 10
    Expected Result: Event categories enumerated

  Scenario: Edge cases addressed
    Tool: Bash
    Steps:
      1. grep -c "circular\|side effect\|concurrent.*Texere\|replay" docs/research/coding_orchestrator/01-architecture.md
      2. Assert: count >= 3
    Expected Result: Metis-identified edge cases are addressed
  ```

  **Commit**: YES
  - Message: `docs(research): add Loom system architecture — orchestration, events, resilience`
  - Files: `docs/research/coding_orchestrator/01-architecture.md`

---

- [ ] 6. Write Doc 02 — Agent System

  **What to do**:
  - Create `docs/research/coding_orchestrator/02-agent-system.md`
  - **Sections to include**:
    - Agent System Overview: Config-driven, pure TypeScript, 7 MVP agents
    - AgentConfig TypeScript Interface: Complete Zod schema / type definition including:
      - Identity: name, id, description
      - Model: primary + fallback chain, context limit
      - Instructions: system prompt (string or builder function)
      - Tools: allow/deny with glob patterns (e.g., `lsp_*`, `bash_*`)
      - Delegation: enabled, targets, triggers (domain/condition pairs)
      - Mode: primary | subagent | all
      - Category: budget | standard | premium (maps to model selection)
      - Metadata: cost tracking, color coding, max steps, max cost per task
    - 7 MVP Agent Specifications: For each agent:
      - Name, role, OMO equivalent (or NEW)
      - Model tier (budget/standard/premium)
      - Tool permissions (allow/deny)
      - Delegation rules (who it delegates to, when)
      - Mode (primary/subagent)
      - Key behaviors and constraints
    - Agent Comparison: Table comparing all 7 agents across dimensions
    - Dynamic Prompt Composition: How system prompts are built (builder functions, section injection, delegation tables)
    - Delegation Patterns: How orchestrator routes work, category-based selection, trigger matching
    - Agent-to-Agent Communication: Message format, session parent-child, result passing
    - Circular Delegation Prevention: How cycles are detected and blocked
    - Future Agents: Post-MVP agents (Multimodal Analyzer, Pre-Planning Analyst, Plan Validator, Category Executor) — brief descriptions only

  **Must NOT do**:
  - Do not define tool implementations (just reference tool names for permissions)
  - Do not include full prompt text for each agent — describe what the prompt covers, not the actual text
  - Do not exceed 1,500 lines
  - Do not design the runtime (AgentRunner, TaskScheduler) — that's doc 01

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Agent specification document requiring careful schema design
  - **Skills**: [`texere`]
    - `texere`: Read agent-related decisions from KG

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 5 (agent system references architecture)

  **References**:

  **Pattern References**:
  - `docs/research/omo/01-agent-architecture.md` — OMO 11-agent specs (754 lines) — format template
  - `docs/research/omo/04-adding-agents.md` — Custom agent guide, config structure (791 lines)
  - `docs/research/omo/03-prompt-system.md` — Dynamic prompt composition patterns (662 lines)

  **Data References**:
  - `.sisyphus/drafts/coding-orchestrator.md:109-134` — 7 MVP agents, Texere Expert, tool strategy
  - `.sisyphus/drafts/coding-orchestrator.md:269-327` — Agent orchestration features (B1-B10)
  - `.sisyphus/drafts/coding-orchestrator.md:386-398` — Config-driven agents improvement (C4)

  **Cross-References**:
  - `docs/research/coding_orchestrator/00-overview.md` — Terminology glossary
  - `docs/research/coding_orchestrator/01-architecture.md` — AgentRunner, TaskScheduler, delegation mechanics
  - `docs/research/coding_orchestrator/03-opencode-omo-analysis.md` — OMO agent equivalents

  **Acceptance Criteria**:

  - [ ] File exists: `docs/research/coding_orchestrator/02-agent-system.md`
  - [ ] Contains complete AgentConfig TypeScript interface (Zod schema or type definition)
  - [ ] All 7 MVP agents documented with: name, model tier, tools, delegation, mode
  - [ ] Agent comparison table present
  - [ ] Delegation patterns documented
  - [ ] Circular delegation prevention addressed
  - [ ] Each MVP agent maps to OMO equivalent (or marked NEW)
  - [ ] Does NOT exceed 1,500 lines

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All 7 MVP agents present
    Tool: Bash
    Steps:
      1. grep -cE "(Orchestrator|Explorer|Researcher|Consultant|Executor|Planner|Texere Expert)" docs/research/coding_orchestrator/02-agent-system.md
      2. Assert: count >= 14 (each appears at least twice — heading + detail)
    Expected Result: All 7 agents documented

  Scenario: TypeScript interface present
    Tool: Bash
    Steps:
      1. grep -c "interface\|type.*Agent\|z\.object\|z\.string\|z\.enum" docs/research/coding_orchestrator/02-agent-system.md
      2. Assert: count >= 5
    Expected Result: Concrete TypeScript schema defined

  Scenario: OMO equivalents mapped
    Tool: Bash
    Steps:
      1. grep -c "Sisyphus\|Oracle\|Librarian\|Prometheus\|Hephaestus\|Junior\|NEW" docs/research/coding_orchestrator/02-agent-system.md
      2. Assert: count >= 7
    Expected Result: Each agent mapped to OMO equivalent or marked NEW
  ```

  **Commit**: YES
  - Message: `docs(research): add agent system spec — 7 MVP agents, TypeScript schema, delegation`
  - Files: `docs/research/coding_orchestrator/02-agent-system.md`

---

- [ ] 7. Write Doc 05 — Implementation Roadmap

  **What to do**:
  - Create `docs/research/coding_orchestrator/05-implementation-roadmap.md`
  - **Sections to include**:
    - Phasing Strategy: MVP-first, iterate. No calendar dates — phases + ordering + dependencies only
    - Phase 0 — Project Setup: Monorepo (Turborepo), packages, configs, Texere copy + restructure, CI
    - Phase 1 — Core Engine: LoomEngine, EventBus (RxJS), SessionManager, EventStore, ProviderRegistry. FakeLLM for testing.
    - Phase 2 — Tool Framework + Tier 1 Tools: ToolRuntime, permission enforcement, bash, read, write, edit, glob, grep, task
    - Phase 3 — Agent System: AgentRunner, AgentRegistry, config loading, first 3 agents (Orchestrator, Explorer, Executor)
    - Phase 4 — Task Scheduler: Concurrency control, queuing, parallel execution, background tasks
    - Phase 5 — Server: Fastify HTTP + WebSocket, event bridge to UI
    - Phase 6 — React UI: Vite setup, WebSocket connection, chat interface, agent status, event stream display
    - Phase 7 — Remaining Agents: Researcher, Consultant, Planner, Texere Expert
    - Phase 8 — Tier 2/3 Tools: webfetch, websearch, question, todo, LSP, AST-grep, interactive_bash
    - Phase 9 — Polish: Context compaction, cost tracking dashboard, MCP integration, skill system
    - Cross-Phase: Testing Strategy
      - TDD (Red-Green-Refactor) for ALL phases
      - Integration tests from day 1 — real SQLite (:memory:), real tool execution, FakeLLM
      - Test INTENT not implementation
      - FakeLLM: Real implementation of provider interface with scripted deterministic responses
      - Vitest as test framework
      - Test anti-patterns (FORBIDDEN): implementation detail testing, excessive mocking, tautological tests, testing framework code
    - Test Audit Step: MANDATORY final step in every implementation plan
      - Review ALL tests written during implementation
      - Remove fluff: tests that add maintenance cost without catching bugs
      - Verify intent-based: "Would this test break if we refactored internals?" → If yes, rewrite or delete
      - Verify not testing libraries: "Is this testing Zod validates? RxJS emits? Vitest asserts?" → Delete
      - Verify behavior coverage: "Does this test verify user-observable behavior?" → If no, rewrite
    - Phase Dependencies: Dependency graph showing which phases must be sequential vs. can overlap
    - Risk Matrix: Technical risks per phase with mitigation strategies

  **Must NOT do**:
  - Do not include calendar dates or time estimates (phases + ordering only)
  - Do not expand testing into a full testing architecture doc — principles + patterns + anti-patterns
  - Do not design the test audit tool/process in detail — describe what it checks, not how it's automated
  - Do not exceed 1,500 lines

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Roadmap synthesis requiring understanding of all previous docs
  - **Skills**: [`texere`]
    - `texere`: Read all decisions for phase planning

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 6)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 3, 4, 5, 6 (roadmap references everything)

  **References**:

  **Data References**:
  - `.sisyphus/drafts/coding-orchestrator.md:130-134` — Tool strategy (tier-based rollout)
  - `.sisyphus/drafts/coding-orchestrator.md` (Round 10 decisions) — TDD, FakeLLM, test audit, integration tests

  **Cross-References**:
  - `docs/research/coding_orchestrator/00-overview.md` — All decisions (what to build)
  - `docs/research/coding_orchestrator/01-architecture.md` — System design (how it fits together)
  - `docs/research/coding_orchestrator/02-agent-system.md` — Agent specs (which agents in which phase)
  - `docs/research/coding_orchestrator/03-opencode-omo-analysis.md` — Feature parity targets
  - `docs/research/coding_orchestrator/04-tech-stack.md` — Technology constraints

  **Acceptance Criteria**:

  - [ ] File exists: `docs/research/coding_orchestrator/05-implementation-roadmap.md`
  - [ ] >= 5 phases defined with clear ordering
  - [ ] TDD strategy section present with Red-Green-Refactor
  - [ ] FakeLLM documented
  - [ ] Test anti-patterns listed (FORBIDDEN section)
  - [ ] Test audit step documented as mandatory final step
  - [ ] Phase dependency graph present
  - [ ] No calendar dates or time estimates
  - [ ] Does NOT exceed 1,500 lines

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Phases structured
    Tool: Bash
    Steps:
      1. grep -c "## Phase\|### Phase" docs/research/coding_orchestrator/05-implementation-roadmap.md
      2. Assert: count >= 5
    Expected Result: At least 5 implementation phases defined

  Scenario: TDD strategy present
    Tool: Bash
    Steps:
      1. grep -c "TDD\|Red.*Green.*Refactor\|FakeLLM\|test audit\|intent.*not.*implementation" docs/research/coding_orchestrator/05-implementation-roadmap.md
      2. Assert: count >= 5
    Expected Result: Testing strategy fully documented

  Scenario: No calendar dates
    Tool: Bash
    Steps:
      1. grep -cE "(January|February|March|April|May|June|July|August|September|October|November|December|Q[1-4]|2026|2027|week [0-9]|sprint)" docs/research/coding_orchestrator/05-implementation-roadmap.md
      2. Assert: count == 0
    Expected Result: No time-based estimates, only phase ordering
  ```

  **Commit**: YES
  - Message: `docs(research): add implementation roadmap — phases, TDD strategy, test audit`
  - Files: `docs/research/coding_orchestrator/05-implementation-roadmap.md`

---

- [ ] 8. Write README

  **What to do**:
  - Create `docs/research/coding_orchestrator/README.md`
  - **Sections**: Summary of all 6 documents, what Loom is, document index with one-line descriptions, reading order recommendation, key decisions quick-reference table
  - **Format**: Follow `docs/research/omo/README.md` pattern (381 lines)
  - Keep concise — this is an index, not a 7th document

  **Must NOT do**:
  - Do not duplicate content from the 6 docs — summarize and link
  - Do not exceed 400 lines

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Short summary document, straightforward synthesis
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 7)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2-7 (summarizes all docs)

  **References**:

  **Pattern References**:
  - `docs/research/omo/README.md` — Format template (381 lines)

  **Cross-References**:
  - All 6 docs in `docs/research/coding_orchestrator/`

  **Acceptance Criteria**:

  - [ ] File exists: `docs/research/coding_orchestrator/README.md`
  - [ ] References all 6 documents with one-line descriptions
  - [ ] Contains key decisions quick-reference table
  - [ ] Does NOT exceed 400 lines

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All docs referenced
    Tool: Bash
    Steps:
      1. grep -c "00-overview\|01-architecture\|02-agent-system\|03-opencode\|04-tech-stack\|05-implementation" docs/research/coding_orchestrator/README.md
      2. Assert: count >= 6
    Expected Result: All 6 documents referenced
  ```

  **Commit**: YES
  - Message: `docs(research): add coding orchestrator research README`
  - Files: `docs/research/coding_orchestrator/README.md`

---

- [ ] 9. Cross-Document Validation & Quality Audit

  **What to do**:
  - Run automated consistency checks across all 7 documents:
    - **Terminology consistency**: Verify all agent names, component names match doc 00 glossary
    - **No stale references**: Search all docs for "Hono" and "Bun" — must only appear in historical/rejected context
    - **Cross-reference integrity**: Every component in doc 01 appears in doc 05 roadmap. Every agent in doc 02 maps to OMO equivalent in doc 03.
    - **Line count**: No doc exceeds 1,500 lines (README: 400)
    - **File count**: All 7 files exist
  - Fix any issues found (edit files to correct inconsistencies)
  - Run all acceptance criteria from Tasks 2-8 as a final sweep
  - Generate a validation report showing all checks passed

  **Must NOT do**:
  - Do not rewrite entire documents — only fix specific inconsistencies
  - Do not add new content — only correct existing

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Automated validation + targeted fixes, not creative writing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final — Wave 7)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 2-8 (validates all docs)

  **References**:

  **Cross-References**:
  - All 7 files in `docs/research/coding_orchestrator/`
  - `docs/research/coding_orchestrator/00-overview.md` — Terminology glossary (source of truth)

  **Acceptance Criteria**:

  - [ ] All 7 files exist in `docs/research/coding_orchestrator/`
  - [ ] Zero mentions of "Hono" or "Bun" as current choices (only historical/rejected)
  - [ ] All component names consistent across docs
  - [ ] Every doc 01 component appears in doc 05 roadmap
  - [ ] Every doc 02 agent maps to doc 03 OMO equivalent
  - [ ] No doc exceeds line limit (1500 for docs, 400 for README)
  - [ ] All acceptance criteria from Tasks 2-8 pass

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All files exist
    Tool: Bash
    Steps:
      1. ls docs/research/coding_orchestrator/*.md | wc -l
      2. Assert: count == 7
    Expected Result: All 7 documents present

  Scenario: No stale technology references as current choices
    Tool: Bash
    Steps:
      1. grep -rn "Hono" docs/research/coding_orchestrator/*.md | grep -v "rejected\|instead of\|NOT\|replaced\|changed from\|evolution\|previously\|considered\|switched"
      2. Assert: count == 0 (or all matches are clearly historical context)
      3. Repeat for "Bun" with same exclusions
    Expected Result: Fastify and Node.js are the only current choices

  Scenario: Line counts within limits
    Tool: Bash
    Steps:
      1. wc -l docs/research/coding_orchestrator/*.md
      2. Assert: 00-05 docs <= 1500 lines each
      3. Assert: README <= 400 lines
    Expected Result: All docs within size guardrails

  Scenario: Cross-reference integrity
    Tool: Bash
    Steps:
      1. Extract component names from doc 01 (LoomEngine, AgentRunner, etc.)
      2. Verify each appears in doc 05
      3. Extract agent names from doc 02
      4. Verify each appears in doc 03 with OMO mapping
    Expected Result: No orphaned references
  ```

  **Commit**: YES
  - Message: `docs(research): validate cross-document consistency and fix issues`
  - Files: Any docs that needed fixes
  - Pre-commit: All validation checks pass

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 1 | `docs(research): reconcile texere KG with current Loom decisions` | Texere DB |
| 2 | `docs(research): add Loom overview — vision, decisions, terminology` | 00-overview.md |
| 3+4 | `docs(research): add feature analysis and tech stack` | 03-opencode-omo-analysis.md, 04-tech-stack.md |
| 5 | `docs(research): add Loom system architecture` | 01-architecture.md |
| 6 | `docs(research): add agent system spec` | 02-agent-system.md |
| 7 | `docs(research): add implementation roadmap with TDD strategy` | 05-implementation-roadmap.md |
| 8 | `docs(research): add coding orchestrator research README` | README.md |
| 9 | `docs(research): validate cross-document consistency` | Any fixed docs |

---

## Success Criteria

### Verification Commands
```bash
# All 7 docs exist
ls docs/research/coding_orchestrator/*.md | wc -l
# Expected: 7

# No stale references
grep -rl "Hono\|Bun" docs/research/coding_orchestrator/*.md | xargs grep -c "current\|chosen\|selected\|using" || echo "clean"
# Expected: 0 matches in non-historical context

# Feature coverage
grep -c "Replicate\|Improve\|Skip" docs/research/coding_orchestrator/03-opencode-omo-analysis.md
# Expected: >= 50

# All agents documented
grep -c "Orchestrator\|Explorer\|Researcher\|Consultant\|Executor\|Planner\|Texere Expert" docs/research/coding_orchestrator/02-agent-system.md
# Expected: >= 14

# TDD documented
grep -c "TDD\|Red.*Green\|FakeLLM\|test audit" docs/research/coding_orchestrator/05-implementation-roadmap.md
# Expected: >= 5

# Line counts
wc -l docs/research/coding_orchestrator/*.md
# Expected: each <= 1500, README <= 400
```

### Final Checklist
- [ ] All 7 files exist and are non-empty
- [ ] All 15+ decisions from interviews documented in doc 00
- [ ] Decision evolution story present (Bun→Node, Hono→Fastify, etc.)
- [ ] Canonical terminology glossary in doc 00, used consistently across all docs
- [ ] 200+ feature inventory preserved (appendix in doc 03)
- [ ] Top 50+ features classified (Replicate/Improve/Skip)
- [ ] All 10+ tech choices documented with rationale
- [ ] All 7 MVP agents specified with TypeScript schema
- [ ] Architecture documented with 4 core abstractions
- [ ] TDD strategy + test audit step in roadmap
- [ ] No doc exceeds size limit
- [ ] Cross-document consistency validated
- [ ] Texere KG reconciled (stale nodes invalidated, missing decisions stored)
