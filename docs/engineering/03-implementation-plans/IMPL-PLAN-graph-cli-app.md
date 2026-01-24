---
type: IMPL-PLAN
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-cli-app
summary_short: >-
  Phase-based implementation of graph testing app: Phase 1 (v0.1 core + 5 scenarios), Phase 2 (v1.0
  lifecycle), Phase 3 (v2.0+ external sources)
summary_long: >-
  Coordinates implementation across three phases aligned with graph versions. Phase 1 delivers core
  app infrastructure (GraphApp, Fixtures, Inspectors) and v0.1 scenarios. Phase 2 adds lifecycle
  assertion scenarios and GraphHealth validation. Phase 3 adds external ingestion and verification
  scenarios. Non-throwaway design guarantees backward compatibility.
keywords:
  - implementation
  - planning
  - testing
coordinates:
  - SPEC-graph-cli-app
covers:
  - SPEC-graph-cli-app
depends_on:
  - SPEC-graph-system-vertical-slice-v0-1
related:
  - REQ-graph-system-graph-system-architecture
index:
  sections:
    - title: 'TLDR'
      lines: [110, 134]
      summary: 'Implement graph testing app in three phases aligned with system versions.'
      token_est: 130
    - title: 'Scope'
      lines: [136, 153]
      summary: 'Implement app in phases aligned with graph versions (v0.1, v1.0, v2.0+).'
      token_est: 101
    - title: 'Preconditions'
      lines: [155, 164]
      token_est: 67
    - title: 'Milestones'
      lines: [166, 436]
      token_est: 1112
      subsections:
        - title: 'Phase 1: v0.1 App Infrastructure (Now)'
          lines: [168, 329]
          token_est: 804
        - title: 'Phase 2: v1.0 Lifecycle Scenarios (Future)'
          lines: [331, 404]
          token_est: 238
        - title: 'Phase 3: v2.0+ Features (Future)'
          lines: [406, 436]
          token_est: 68
    - title: 'Risk Register'
      lines: [438, 448]
      token_est: 173
    - title: 'Verification Plan'
      lines: [450, 475]
      token_est: 162
    - title: 'Exit Criteria'
      lines: [477, 496]
      token_est: 153
    - title: 'Assumptions'
      lines: [498, 508]
      token_est: 179
    - title: 'Unknowns'
      lines: [510, 519]
      token_est: 134
    - title: 'CLI Technology Stack'
      lines: [521, 558]
      token_est: 257
    - title: 'Implementation Notes'
      lines: [560, 630]
      token_est: 268
    - title: 'Success Metrics'
      lines: [632, 654]
      token_est: 123
    - title: 'Known Gaps'
      lines: [656, 841]
      summary:
        'Issues and incompleteness in this plan that must be addressed before or during Phase 1
        implementation.'
      token_est: 1445
      subsections:
        - title: 'Critical Gaps (Must Fix Before Starting Phase 1)'
          lines: [661, 693]
          token_est: 249
        - title: 'High Priority Gaps'
          lines: [695, 725]
          token_est: 201
        - title: 'Medium Priority Gaps'
          lines: [727, 810]
          token_est: 717
        - title: 'Low Priority Gaps'
          lines: [812, 841]
          token_est: 254
    - title: 'Gap Summary Table'
      lines: [843, 866]
      token_est: 332
    - title: 'Related Documents'
      lines: [868, 872]
      token_est: 16
---

# IMPL-PLAN-graph-cli-app

---

## TLDR

Summary: Implement graph testing app in three phases aligned with system versions.

**Phase 1 (v0.1):** Core app infrastructure + v0.1 scenarios

**Phase 2 (v1.0):** Lifecycle scenarios + GraphHealth validation

**Phase 3 (v2.0+):** External ingestion + verification scenarios

**What:** Scenario-driven testing app

**Why:** Provide single, extensible harness for validating all graph features

**How:** Implement in phases; each phase adds version-specific scenarios; core app architecture
remains stable

**Status:** Draft

**Critical path:** M1 (app structure) → M2 (fixtures) → M3 (v0.1 scenarios) → M4+ (future)

**Risk:** Scenario interface too rigid for v1.0 features; mitigate via careful design of Scenario
composition

---

## Scope

Summary: Implement app in phases aligned with graph versions (v0.1, v1.0, v2.0+).

**Includes:**

- Phase 1: GraphApp orchestrator, Fixtures, v0.1 Scenarios, Unit/Integration tests, E2E tests
- Phase 2: Lifecycle Scenarios, GraphHealth Validator, v1.0 Fixtures, Supersession scenarios
- Phase 3: External ingestion scenarios, Verification scenarios

**Excludes:**

- Library package implementations (graph-core, graph-store, graph-lifecycle, etc.)
- Detailed ingestion connector logic (covered by SPEC-graph-ingestion-repo-scip-ts)
- Production database optimization (v3.0+)
- Interactive CLI REPL (optional, can be deferred)

---

## Preconditions

- [ ] Graph v0.1 packages fully implemented: graph-core, graph-store, graph-ingest,
      graph-projection, graph-ingest-connector-scip-ts
- [ ] All v0.1 library tests passing
- [ ] Package structure follows REQ-graph-system-architecture
- [ ] Nx workspace configured for new apps/ package
- [ ] Vitest configured and working in graph packages

---

## Milestones

### Phase 1: v0.1 App Infrastructure (Now)

**Milestone 1: App Package Scaffolding**

**Goal:** Create basic app structure and core abstractions

**Deliverables:**

- `apps/graph-app/` directory with standard Nx structure
- `package.json` with dependencies on graph library packages
- Tsconfig, vitest.config, eslint.config for app
- Entry points: src/index.ts, src/app.ts

**Verification:**

- [ ] App compiles without errors
- [ ] App package is recognized by Nx (nx graph shows it)
- [ ] Can import from library packages

**Effort estimate:** 2 hours

---

**Milestone 2: Core Interfaces and GraphApp Orchestrator**

**Goal:** Implement Scenario contract and GraphApp class

**Deliverables:**

- `src/graph/types.ts` — Scenario, ScenarioResult, GraphSnapshot types
- `src/app.ts` — GraphApp class with core methods:
  - `withPolicy()`, `withDefaultPolicies()`
  - `ingestRepo()`
  - `createAssertion()` (stub for v1.0)
  - `runProjection()`
  - `queryNodes()`, `queryEdges()`, `getNode()`
  - `dump()`, `trace()`, `diff()`, `explain()`
  - `validate()`, `checkInvariants()` (stubs for v1.0)
- `src/graph/context.ts` — GraphApp helper methods
- `src/inspectors/dumper.ts` — Pretty-printer

**Verification:**

- [ ] GraphApp compiles
- [ ] Can create GraphApp instance with store
- [ ] Can add policies via withPolicy()
- [ ] Can call dump() and get output
- [ ] Inspectors compile

**Effort estimate:** 6 hours

---

**Milestone 3: Fixture Factories**

**Goal:** Implement deterministic fixture builders for policies and artifacts

**Deliverables:**

- `src/fixtures/policies.ts` — defaultIngestionPolicy, defaultProjectionPolicy
- `src/fixtures/artifacts.ts` — repoFixture, artifactStateFixture, artifactPartFixture
- `src/fixtures/index.ts` — Export all fixtures
- Tests: `unit/fixtures.test.ts` — Verify deterministic IDs

**Verification:**

- [ ] All fixtures return valid nodes with deterministic IDs
- [ ] Same inputs → same IDs (idempotency)
- [ ] Fixtures pass schema validation
- [ ] Unit tests pass

**Effort estimate:** 4 hours

---

**Milestone 4: v0.1 Scenario Implementations**

**Goal:** Implement all v0.1 scenarios

**Deliverables:**

- `src/scenarios/v0-1/repo-ingestion-base.ts`
- `src/scenarios/v0-1/repo-ingestion-determinism.ts`
- `src/scenarios/v0-1/json-dumps-format.ts`
- `src/scenarios/v0-1/projection-current-truth-basic.ts`
- `src/scenarios/v0-1/toolchain-provenance.ts`
- `src/scenarios/index.ts` — Registry with getScenariosByVersion(), getScenariosByTag()
- Tests: `unit/scenarios.test.ts` — Verify metadata and composition

**Verification:**

- [ ] All scenarios export Scenario interface
- [ ] Each scenario runs successfully (success: true)
- [ ] Scenarios composed in correct order
- [ ] Unit tests pass

**Effort estimate:** 8 hours

---

**Milestone 5: Unit and Integration Tests**

**Goal:** Test app infrastructure and v0.1 scenarios

**Deliverables:**

- `unit/fixtures.test.ts` — 5-10 tests for fixtures
- `unit/scenarios.test.ts` — 5-10 tests for scenario metadata and composition
- `unit/inspectors.test.ts` — 3-5 tests for dumper/tracer output
- `integration/workflows.test.ts` — Multi-step workflows (ingest → project → validate)
- Coverage report showing >80% coverage

**Verification:**

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage >80%

**Effort estimate:** 6 hours

---

**Milestone 6: E2E Tests (sindresorhus/ky)**

**Goal:** Validate full v0.1 workflow on real repository

**Deliverables:**

- `e2e/v0-1/sindresorhus-ky.test.ts` — Real repo e2e tests:
  - Determinism test (ingest twice, compare outputs)
  - Artifact structure test (file count, symbol count, locator format)
  - Projection test (CurrentCommittedTruth includes all artifacts)
  - Provenance test (toolchain versions recorded)
  - JSON dumps test (schema valid, counts correct)
- `e2e/v0-1/snapshots/` — Expected outputs (node counts, content hash, etc.)
- Documentation: `e2e/README.md` — How to run E2E tests

**Verification:**

- [ ] All E2E tests pass
- [ ] sindresorhus/ky ingestion deterministic (same results on repeated runs)
- [ ] JSON dumps match expected schema
- [ ] Projection includes all artifacts
- [ ] Snapshots committed and stable

**Effort estimate:** 8 hours

---

**Phase 1 Exit Gate:**

All of the following must pass:

- [ ] `pnpm -C apps/graph-app test` — All unit/integration tests pass
- [ ] `pnpm -C apps/graph-app test:e2e` — E2E tests pass (sindresorhus/ky determinism verified)
- [ ] `pnpm -C apps/graph-app run-scenarios v0.1/*` — All v0.1 scenarios pass
- [ ] Coverage >80%
- [ ] App package can be built: `nx build graph-app`

**Phase 1 Effort Estimate:** 34 hours (5-6 days)

---

### Phase 2: v1.0 Lifecycle Scenarios (Future)

**Milestone 4: Lifecycle Assertion Fixtures**

**Goal:** Add factories for Decision, Requirement, SpecClause

**Deliverables:**

- `src/fixtures/assertions.ts` — decisionFixture, requirementFixture, specClauseFixture
- Tests: `unit/fixtures.test.ts` extended

**Effort estimate:** 3 hours

---

**Milestone 5: Lifecycle Scenarios**

**Goal:** Implement v1.0 scenario suite

**Deliverables:**

- `src/scenarios/v1-0/lifecycle-decision-to-requirement.ts`
- `src/scenarios/v1-0/supersession-chains.ts`
- `src/scenarios/v1-0/conflict-detection-scope-overlap.ts`
- `src/scenarios/v1-0/evidence-anchoring-to-artifact.ts`
- `src/scenarios/v1-0/evidence-promotion-to-requirement.ts`
- `src/scenarios/v1-0/plan-execution-to-activework.ts` (if Plan implemented)
- `src/scenarios/v1-0/validation-invariants-breach.ts`
- `src/scenarios/v1-0/graphhealth-full-checks.ts`

**Effort estimate:** 12 hours

---

**Milestone 6: GraphHealth Validation**

**Goal:** Implement invariant checking

**Deliverables:**

- `src/validators/invariants.ts` — Implement all invariant checks from knowledge system
- Integrate into `GraphApp.checkInvariants()`
- Tests: `unit/validators.test.ts`

**Effort estimate:** 6 hours

---

**Milestone 7: v1.0 E2E Tests**

**Goal:** Validate lifecycle workflows

**Deliverables:**

- `e2e/v1-0/lifecycle-workflow.test.ts`
- `e2e/v1-0/conflict-detection.test.ts`
- `e2e/v1-0/projection-determinism.test.ts`
- `e2e/v1-0/scope-overlap.test.ts`
- `e2e/v1-0/validation-invariants.test.ts`

**Effort estimate:** 10 hours

---

**Phase 2 Exit Gate:**

- [ ] `pnpm -C apps/graph-app test` — All tests pass (unit + integration + v0.1 + v1.0)
- [ ] `pnpm -C apps/graph-app run-scenarios v1.0/*` — All v1.0 scenarios pass
- [ ] v0.1 scenarios still pass (backward compatibility)
- [ ] Coverage >80%

**Phase 2 Effort Estimate:** 31 hours (5 days)

---

### Phase 3: v2.0+ Features (Future)

**Milestone 8: External Ingestion Scenarios**

**Goal:** Test forum/issue ingestion

**Deliverables:**

- `src/scenarios/v2-0/external-source-ingestion.ts`
- `e2e/v2-0/forum-ingestion.test.ts`

**Effort estimate:** 8 hours

---

**Milestone 9: Verification Scenarios**

**Goal:** Test verification linking

**Deliverables:**

- `src/scenarios/v2-0/verification-linking.ts`
- `e2e/v2-0/verification-workflow.test.ts`

**Effort estimate:** 6 hours

---

**Phase 3 Effort Estimate:** 14 hours (2 days)

---

## Risk Register

| Risk                                        | Impact | Probability | Mitigation                                                                        |
| ------------------------------------------- | ------ | ----------- | --------------------------------------------------------------------------------- |
| Scenario interface too rigid for v1.0       | High   | Medium      | Design Scenario with composition in mind; test with mock v1.0 scenarios before M4 |
| Long-running E2E tests (10+ min)            | Medium | Medium      | Parallelize test execution; cache cloned repos; timeout enforcement               |
| Snapshot files drift over time              | Low    | Medium      | Use deterministic IDs; version snapshots; enforce exact matches in CI             |
| GraphApp API becomes large/hard to maintain | Medium | Low         | Group methods into logical blocks; keep API minimal; use composition              |
| Package size grows too large                | Low    | Low         | Split fixtures/scenarios into separate internal packages if >20KB                 |

---

## Verification Plan

How each milestone proves conformance to SPEC-graph-cli-app.

**Milestone 1:** App scaffolding compiles; Nx recognizes it; can import library packages

**Milestone 2:** GraphApp can be instantiated; all core methods implemented (stubs acceptable);
Inspectors compile

**Milestone 3:** All fixtures compile; unit tests show deterministic IDs (same inputs → same
outputs)

**Milestone 4:** All v0.1 scenarios run; success: true for each; composition works (one scenario
calls another)

**Milestone 5:** Unit tests >80% coverage; integration tests run multi-step workflows; all pass

**Milestone 6:** E2E tests on sindresorhus/ky pass determinism check; snapshots committed and
stable; projections include artifacts

**Phase 2:** v1.0 scenarios pass; v0.1 scenarios still pass (backward compatibility verified)

**Phase 3:** v2.0+ scenarios pass; all prior scenarios still pass; app serves as reference
implementation

---

## Exit Criteria

Phase 1 (v0.1) complete when:

- [ ] App structure is clean and Nx-aware
- [ ] GraphApp orchestrator implements all required methods
- [ ] Fixtures are deterministic and tested
- [ ] All v0.1 scenarios pass
- [ ] Unit tests: >80% coverage
- [ ] Integration tests validate multi-step workflows
- [ ] E2E tests validate:
  - [ ] sindresorhus/ky determinism (same inputs → identical outputs)
  - [ ] JSON dumps follow SPEC schema
  - [ ] Projection includes all artifacts
  - [ ] Provenance correctly recorded
- [ ] Snapshots committed and stable
- [ ] Code review passes
- [ ] Backward compatibility guaranteed (v0.1 tests never break)

---

## Assumptions

| Assumption                                    | Validation Method               | Confidence | Impact if Wrong                           |
| --------------------------------------------- | ------------------------------- | ---------- | ----------------------------------------- |
| Scenario interface design will work for v1.0  | Build mock v1.0 scenario in M3  | Medium     | May need redesign; delays 1 week          |
| GraphApp fluent API is maintainable           | Code review + complexity metric | Medium     | May need refactoring; impacts Phase 2     |
| Deterministic fixtures work in all test modes | Run in unit, integration, E2E   | High       | May need to inject randomness handling    |
| E2E tests can complete in <30s each           | Measure in M6                   | Medium     | May need parallelization; affects CI time |
| sindresorhus/ky stays at same commit          | Pin in lockfile                 | High       | If moved, update snapshot and re-validate |

---

## Unknowns

| Question                                       | Impact          | Resolution Criteria       | Owner       | ETA        |
| ---------------------------------------------- | --------------- | ------------------------- | ----------- | ---------- |
| Should Scenarios support conditional branches? | Design scope    | Decide before M4          | Design Lead | 2026-02-01 |
| Should inspector tools have interactive CLI?   | Nice-to-have    | Defer to Phase 2 or later | Product     | 2026-02-15 |
| How to parallelize long E2E tests?             | CI time         | Evaluate during M6        | DevOps      | 2026-02-08 |
| Should we version snapshot files?              | Maintainability | Decide in M3              | Tech Lead   | 2026-02-01 |

---

## CLI Technology Stack

**Libraries:**

- **Ink** (React for terminal): Terminal UI rendering with components (progress, boxes, text)
- **Pastel** (styling): Colors, bold, underline for Ink components
- **Commander.js** (CLI framework): Command parsing, subcommands, flags
- **Enquirer** (interactive prompts): For interactive mode input/validation (Mode 4)

**Structure:**

```
src/cli/
├── commands/
│   ├── run-scenario.ts       # Commander subcommand
│   ├── run-scenarios.ts
│   ├── test.ts
│   └── inspect.ts            # Interactive Ink TUI
├── components/               # Ink React components
│   ├── ScenarioBox.tsx       # Progress box for single scenario
│   ├── BatchBox.tsx          # Live progress for batch scenarios
│   ├── TestBox.tsx           # Test progress
│   ├── InspectorPrompt.tsx   # Ink prompt for interactive mode
│   └── GraphDumper.tsx       # Pretty graph visualization
└── index.ts                  # CLI entry point (Commander setup)
```

**Design:**

- Commander.js parses `run-scenario`, `run-scenarios`, `test:e2e`, `inspect` commands
- Flags: `--json` (JSON output, no UI), `--quiet` (no UI, files only), `--report` (batch summary)
- Ink components render terminal boxes with live updates during scenario execution
- Mode 4 (inspect) uses Enquirer for interactive prompt + Ink for output rendering
- Default: Beautiful Ink UI with Pastel styling
- With `--json`: No Ink, JSON to stdout
- With `--quiet`: No Ink, silent

---

## Implementation Notes

### Determinism Requirements

All scenarios MUST be deterministic. To ensure this:

- Use fixed timestamps in fixtures (e.g., '2026-01-24T00:00:00Z')
- Use deterministic ID generation (SHA-256 hash)
- Sort all query results by ID before returning
- Freeze external dependencies (lock file pinned)
- No Date.now() or random values in graph nodes

### Testing Isolation

Each scenario should be independent:

- Each test gets a fresh GraphApp instance
- Each test clones its own repo copy (or uses fixture)
- No shared state between tests
- Cleanup: remove temp directories after each test

### E2E Test Organization

```
e2e/
├── v0-1/
│   ├── snapshots/
│   │   ├── sindresorhus-ky.json
│   │   └── determinism-baseline.json
│   └── sindresorhus-ky.test.ts
├── v1-0/
│   ├── snapshots/
│   └── lifecycle.test.ts
└── v2-0/
    └── external-sources.test.ts
```

### Snapshot Strategy

For v0.1, commit expected outputs:

```json
// e2e/v0-1/snapshots/sindresorhus-ky.json
{
  "node_counts": {
    "ArtifactRoot": 1,
    "ArtifactState": 1,
    "ArtifactPart": 45,
    "Policy": 2
  },
  "edge_counts": {
    "HasState": 1,
    "HasPart": 45,
    "BELONGS_TO": 2
  },
  "content_hash": "abc123...",
  "symbol_count": 156,
  "file_count": 42
}
```

Tests verify actual outputs match snapshots exactly.

### Performance Targets

- Unit tests: <1s total
- Integration tests: <5s total
- E2E tests: <30s per scenario (allow 2 min timeout)
- Full test suite: <45s

---

## Success Metrics

**Phase 1:**

- ✓ Zero broken tests after each milestone
- ✓ 100% of v0.1 scenarios pass
- ✓ Determinism verified (identical outputs on repeated runs)
- ✓ Code coverage >80%
- ✓ New developer can run app and inspect graph state

**Phase 2:**

- ✓ All v1.0 scenarios pass
- ✓ v0.1 scenarios still pass (zero regressions)
- ✓ Invariant checks catch invalid graph states

**Phase 3:**

- ✓ v2.0 scenarios pass
- ✓ All prior scenarios still pass
- ✓ App serves as reference implementation for graph system

---

## Known Gaps

Summary: Issues and incompleteness in this plan that must be addressed before or during Phase 1
implementation.

### Critical Gaps (Must Fix Before Starting Phase 1)

**1. CLI Commands & Entry Points Not Defined**

- **Status:** Missing
- **Impact:** High - Developers won't know how to run the app
- **Current State:** Milestones describe internal app structure (GraphApp, Fixtures, Scenarios) but
  do NOT specify CLI commands
- **Fix Required:**
  - Add new milestone (M1.5 or in M2): "CLI Commands & Entry Points"
  - Define subcommands: `run-scenario <name>`, `run-scenarios <pattern>`, `test`, `inspect`
  - Specify Commander.js setup with command routing
  - Deliverables: `src/cli/index.ts`, `src/cli/commands/*.ts`
  - Effort: 2-3 hours

**2. Ink + Pastel Components Not in Milestones**

- **Status:** Missing
- **Impact:** High - SPEC promises beautiful Ink UI, but plan doesn't allocate effort/deliverables
  for it
- **Current State:** Ink rendering completely absent from milestone deliverables
- **Fix Required:**
  - Add to M2: Ink component deliverables
    - `ScenarioBox.tsx` — Progress box for single scenario
    - `BatchBox.tsx` — Live progress for batch scenarios
    - `TestBox.tsx` — Test results display
    - `InspectorPrompt.tsx` — Interactive input component
    - `GraphDumper.tsx` — Pretty graph visualization
  - Add test coverage for Ink components (snapshot tests)
  - Allocate effort: 2-3 hours (Ink learning curve)
  - Deliverables: `src/cli/components/*.tsx`

---

### High Priority Gaps

**3. Work Breakdown Table Missing**

- **Status:** Missing
- **Impact:** Medium - No task-level sequencing or dependency visibility
- **Current State:** Milestones have effort estimates but no task breakdown with dependencies
- **Fix Required:**
  - Add "Work Breakdown" section (per IMPL-PLAN template) with table:
    - Task name, owner, duration, dependencies
    - Example: "M1.1: Setup Nx app (2h, depends on nothing)"
    - Example: "M2.1: GraphApp class (6h, depends on M1)"
  - Effort to add: 1 hour

**4. Package Dependencies Not Explicit**

- **Status:** Vague
- **Impact:** Medium - Developers don't know what npm packages to install
- **Current State:** M1 mentions "package.json with dependencies" but lists none
- **Fix Required:**
  - Add explicit list to M1 or Preconditions:
    - `@repo/graph-core`, `@repo/graph-store`, `@repo/graph-ingest`,
      `@repo/graph-ingest-connector-scip-ts`, `@repo/graph-projection`
    - `ink`, `pastel` (CLI UI)
    - `commander` (CLI framework)
    - `enquirer` (interactive prompts)
    - `react` (for Ink)
    - `vitest` (testing)
  - Effort to add: 15 minutes

---

### Medium Priority Gaps

**5. Database Persistence (v2.0+) Not Planned**

- **Status:** Mentioned in SPEC, missing from IMPL-PLAN
- **Impact:** Medium - v2.0 database output (`--db-write` flag) has no implementation roadmap
- **Current State:** SPEC says "v2.0+ database write", Phase 3 has no database milestones
- **Fix Required:**
  - Add to Phase 3:
    - M10: Database adapter interface (PostgreSQL, Neo4j, etc.)
    - M11: Database write integration with scenarios
    - Deliverables: `src/adapters/database.ts`, env var handling for `GRAPH_DB_URL`
    - Flag handling: `--db-write`, fallback to JSON if not set
  - Effort: 2 hours to plan, 8-10 hours to implement

**6. Snapshot Management Strategy Vague**

- **Status:** Mentioned, not detailed
- **Impact:** Medium - E2E test maintenance unclear (how to update, where to store, CI behavior)
- **Current State:** M6 mentions "`e2e/v0-1/snapshots/`" and "snapshots committed" but no workflow
- **Fix Required:**
  - Add to M6 or Implementation Notes:
    - Snapshot file location: `e2e/v0-1/snapshots/sindresorhus-ky.json`
    - Snapshot format: `{ node_counts, edge_counts, symbol_count, content_hash, file_count }`
    - Update workflow: `pnpm -C apps/graph-app update-snapshots`
    - CI behavior: Snapshots committed to git, must match exactly in CI
  - Effort: 30 minutes

**7. Test Infrastructure Setup Assumed, Not Detailed**

- **Status:** Precondition, but app-level details missing
- **Impact:** Medium - M5 assumes vitest config is ready, but doesn't specify app-level setup
- **Current State:** Precondition says "Vitest configured", but app's vitest.config.ts not planned
- **Fix Required:**
  - Add M1.5: "Test Infrastructure & Vitest Setup"
  - Deliverables:
    - `apps/graph-app/vitest.config.ts` with coverage thresholds (80% minimum)
    - Test directory structure: `unit/`, `integration/`, `e2e/`
    - Watch mode configuration
    - Coverage reporter setup
  - Effort: 1 hour

**8. Interactive Mode (Inspect) Under-Specified**

- **Status:** Vague in plan
- **Impact:** Medium - Mode 4 is complex (Enquirer + Ink + state management) but no detailed
  milestone
- **Current State:** SPEC shows beautiful interactive Ink TUI, IMPL-PLAN just says "inspect mode"
- **Fix Required:**
  - Add milestone: "M5b: Interactive Inspector Mode (Ink TUI)"
  - Deliverables:
    - Enquirer prompt loop for command input
    - Command parsing: `ingest()`, `dump()`, `trace()`, `diff()`, `project()`
    - Ink component rendering for command outputs
    - State management: Keep graph in memory across commands
  - Effort: 4-6 hours (includes Enquirer + Ink learning curve)

**9. Backwards Compatibility Not Tested in Phase 2**

- **Status:** Philosophy stated, not verified in tests
- **Impact:** Medium - Risk: Phase 2 breaks Phase 1 without anyone noticing
- **Current State:** SPEC says "v0.1 scenarios still pass", but Phase 2 exit gate doesn't verify it
- **Fix Required:**
  - Add to Phase 2 exit gate:
    - `[ ] pnpm -C apps/graph-app test:v0.1` — All v0.1 scenarios still pass (regression check)
  - This ensures Phase 2 additions (lifecycle assertions, etc.) don't break ingestion scenarios
  - Effort: 30 minutes to add to plan

**10. Clone & Workspace Lifecycle Vague**

- **Status:** Vague
- **Impact:** Medium - E2E tests clone sindresorhus/ky, but no plan for cleanup, timeouts, failure
  modes
- **Current State:** M6 mentions "real repo e2e tests" but doesn't explain git clone lifecycle
- **Fix Required:**
  - Add to M6 verification section:
    - Clone location: `./tmp/Texere/graph-ingest` (from `GRAPH_INGEST_ROOT` env var)
    - Cleanup strategy: Delete after test or keep for inspection? (Recommend: delete, check size
      first)
    - Timeout policy: Allow 5 minutes for clone + dependencies + SCIP indexing
    - Network dependency: Mark E2E tests as flaky if offline
  - Effort: 30 minutes

---

### Low Priority Gaps

**11. Documentation Deliverables Not Planned**

- **Status:** Partially mentioned (E2E README), mostly missing
- **Impact:** Low - But important for developer onboarding
- **Current State:** Only E2E README mentioned in M6, no developer guides planned
- **Fix Required:**
  - Add to Phase 1:
    - `README.md` — Getting started, running scenarios, CLI commands
    - `SCENARIOS.md` — Describe each v0.1 scenario, how to write new scenarios
    - `ARCHITECTURE.md` — GraphApp design, Fixture patterns, Inspector concepts
  - Add to Phase 2:
    - `LIFECYCLE.md` — v1.0 scenario examples (Decision chains, supersession)
  - Effort: 2 hours to write docs

**12. Error Handling & Logging Strategy Not Defined**

- **Status:** Not mentioned
- **Impact:** Low - Affects developer debugging experience
- **Current State:** No mention of how app logs errors, displays failures, handles exceptions
- **Fix Required:**
  - Add to Implementation Notes section:
    - Logger setup: Use `console` for v0.1 (simple), upgrade to `pino` or `winston` in v1.0
    - Error categories: Ingestion errors, validation errors, scenario errors, Ink render errors
    - Ink error display: Red boxes with error message + optional stacktrace
    - Debug flag: `--debug` enables verbose logging and full stacktraces
  - Effort: 1 hour

---

## Gap Summary Table

| Gap                      | Priority    | Effort  | Recommendation                                               |
| ------------------------ | ----------- | ------- | ------------------------------------------------------------ |
| CLI Commands Not Defined | 🔴 CRITICAL | 2-3h    | Add M1.5: CLI Commands & Entry Points                        |
| Ink Components Missing   | 🔴 CRITICAL | 2-3h    | Add to M2: Ink component deliverables                        |
| Work Breakdown Missing   | 🟠 HIGH     | 1h      | Add Work Breakdown section with task table                   |
| Package Dependencies     | 🟠 HIGH     | 15m     | List all npm packages in M1                                  |
| Database v2.0            | 🟡 MEDIUM   | 2h plan | Add Phase 3 database milestones (M10-M11)                    |
| Snapshot Strategy        | 🟡 MEDIUM   | 30m     | Define snapshot location/update workflow in M6               |
| Test Infrastructure      | 🟡 MEDIUM   | 1h      | Add M1.5: Vitest config + coverage setup                     |
| Interactive Mode         | 🟡 MEDIUM   | 4-6h    | Add M5b: Enquirer + Ink TUI milestone                        |
| Backwards Compat         | 🟡 MEDIUM   | 30m     | Add regression check to Phase 2 exit gate                    |
| Clone Lifecycle          | 🟡 MEDIUM   | 30m     | Define E2E clone cleanup/timeouts in M6                      |
| Documentation            | 🟢 LOW      | 2h      | Add doc deliverables (README, SCENARIOS.md, ARCHITECTURE.md) |
| Error Handling           | 🟢 LOW      | 1h      | Add logging/error strategy to Implementation Notes           |

**Total Effort to Fix: ~16-20 hours**

**Recommendation:** Address 2 CRITICAL + 2 HIGH gaps before Phase 1 starts (~7-8 hours). Address
MEDIUM gaps incrementally during Phase 1 implementation. LOW gaps can be deferred to Phase 2 if
needed.

---

## Related Documents

- SPEC-graph-cli-app.md — Full specification
- REQ-graph-system-graph-system-architecture.md
- SPEC-graph-system-vertical-slice-v0-1.md
