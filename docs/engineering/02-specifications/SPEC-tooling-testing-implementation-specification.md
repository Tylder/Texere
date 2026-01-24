---
type: SPEC
status: active
stability: stable
created: 2026-01-09
last_updated: 2026-01-09
area: tooling
feature: testing-implementation-specification
summary_short: >-
  Standardized testing implementation with Vitest, RTL, and Playwright, plus colocated tests and
  coverage targets.
summary_long: >-
  Specifies the testing implementation for the monorepo: Vitest for unit and integration tests,
  React Testing Library for component interactions, and Playwright for E2E. Tests are colocated next
  to source files, each package has its own Vitest config, and coverage targets are enforced via CI
  and local workflows.
keywords:
  - testing
  - vitest
  - playwright
related:
  - SPEC-tooling-testing-trophy-strategy
  - SPEC-tooling-nx-composite-projects
index:
  sections:
    - title: 'TLDR'
      lines: [84, 97]
      summary:
        'Use Vitest + RTL for unit/integration tests, Playwright for E2E, with colocated test files
        and enforced coverage targets.'
      token_est: 64
    - title: 'Scope'
      lines: [99, 116]
      summary:
        'Defines testing tools, configuration expectations, test placement, and coverage targets.'
      token_est: 72
    - title: 'Specification'
      lines: [118, 139]
      summary: 'Standardize tooling and file placement to keep tests consistent across packages.'
      token_est: 106
    - title: 'Workflow'
      lines: [141, 152]
      summary: 'Use Vitest for local iteration and Playwright for targeted E2E validation.'
      token_est: 76
    - title: 'Rationale'
      lines: [154, 162]
      summary:
        'Consistent tooling and colocation reduce discovery friction and keep suites reliable.'
      token_est: 56
    - title: 'Alternatives Considered'
      lines: [164, 172]
      summary: 'Centralized test folders and mixed tooling reduce consistency.'
      token_est: 54
    - title: 'Consequences'
      lines: [174, 189]
      summary: 'Higher consistency with a need for consistent config upkeep per package.'
      token_est: 62
    - title: 'Verification Approach'
      lines: [191, 198]
      summary: 'CI enforces coverage and test runs across packages.'
      token_est: 38
    - title: 'Design Decisions'
      lines: [200, 210]
      summary: 'Vitest + RTL + Playwright with colocated tests.'
      token_est: 69
    - title: 'Blockers'
      lines: [212, 220]
      summary: 'None.'
      token_est: 43
    - title: 'Assumptions'
      lines: [222, 231]
      summary: 'Assumes coverage targets remain realistic for teams.'
      token_est: 82
    - title: 'Unknowns'
      lines: [233, 239]
      summary: 'E2E scope may evolve as product grows.'
      token_est: 69
---

# SPEC-tooling-testing-implementation-specification

---

## TLDR

Summary: Use Vitest + RTL for unit/integration tests, Playwright for E2E, with colocated test files
and enforced coverage targets.

**What:** Standard testing toolchain and structure

**Why:** Consistent test discovery, predictable tooling, and enforceable coverage goals

**How:** Per-package `vitest.config.ts`, colocated `.test.ts/tsx` files, Playwright for E2E

**Status:** Active

---

## Scope

Summary: Defines testing tools, configuration expectations, test placement, and coverage targets.

**Includes:**

- Vitest for unit/integration tests
- React Testing Library for component interactions
- Playwright for E2E scenarios
- Colocated test file conventions
- Coverage targets and enforcement

**Excludes:**

- Strategic test distribution (see testing trophy spec)
- Product-specific test cases

---

## Specification

Summary: Standardize tooling and file placement to keep tests consistent across packages.

### Tools and Environments

- **Vitest:** unit and integration tests, jsdom for UI tests
- **React Testing Library:** user-centric component interactions
- **Playwright:** end-to-end browser flows

### Test Colocation

- Tests live next to source files
- Naming: `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`
- Each package includes its own `vitest.config.ts` and optional `vitest.setup.ts`

### Coverage Targets

- Overall coverage target: 70-80%
- Critical paths require 100% coverage

---

## Workflow

Summary: Use Vitest for local iteration and Playwright for targeted E2E validation.

| Command              | Purpose                        |
| -------------------- | ------------------------------ |
| `pnpm test`          | Run Vitest once                |
| `pnpm test:watch`    | Watch mode for Vitest          |
| `pnpm test:coverage` | Coverage gate                  |
| `pnpm test:e2e`      | Run Playwright (if configured) |

---

## Rationale

Summary: Consistent tooling and colocation reduce discovery friction and keep suites reliable.

- Colocation makes tests easy to find and maintain.
- Vitest provides fast feedback with a familiar Jest-like API.
- Playwright covers end-to-end flows with real browser automation.

---

## Alternatives Considered

Summary: Centralized test folders and mixed tooling reduce consistency.

- Centralized `tests/` folders: harder to keep tests aligned with code
- Multiple test runners: inconsistent patterns and setup overhead
- E2E-only strategy: slow and brittle for CI

---

## Consequences

Summary: Higher consistency with a need for consistent config upkeep per package.

**Positive:**

- Predictable test structure across packages
- Faster onboarding for contributors
- Clear coverage enforcement

**Negative:**

- Requires per-package Vitest config maintenance
- Colocation can increase file counts in source folders

---

## Verification Approach

Summary: CI enforces coverage and test runs across packages.

- `pnpm test` and `pnpm test:coverage` must pass in CI
- Coverage thresholds validated per package

---

## Design Decisions

Summary: Vitest + RTL + Playwright with colocated tests.

| Field      | Decision 001: Standard testing stack |
| ---------- | ------------------------------------ |
| **Title**  | Testing implementation tooling       |
| **Chosen** | Vitest + RTL + Playwright            |
| **Why**    | Fast feedback and strong UI coverage |

---

## Blockers

Summary: None.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | n/a    | n/a           | Low    |

---

## Assumptions

Summary: Assumes coverage targets remain realistic for teams.

| Assumption                                 | Validation Method   | Confidence | Impact if Wrong   |
| ------------------------------------------ | ------------------- | ---------- | ----------------- |
| Coverage targets are achievable            | CI coverage reports | Medium     | Adjust thresholds |
| Colocated tests stay manageable in modules | Team feedback       | Medium     | Revisit structure |

---

## Unknowns

Summary: E2E scope may evolve as product grows.

| Question                                    | Impact | Resolution Criteria  | Owner | ETA |
| ------------------------------------------- | ------ | -------------------- | ----- | --- |
| How many E2E suites are required long term? | Medium | CI runtime tradeoffs | Team  | TBD |
