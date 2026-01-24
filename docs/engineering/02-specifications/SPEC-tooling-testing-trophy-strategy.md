---
type: SPEC
status: active
stability: stable
created: 2026-01-09
last_updated: 2026-01-09
area: tooling
feature: testing-trophy-strategy
summary_short: >-
  Testing strategy follows the testing trophy model with integration tests as the largest share.
summary_long: >-
  Specifies the testing strategy for the monorepo using the testing trophy model. Integration tests
  (Vitest + RTL) are the largest share, supported by unit tests, E2E tests, and static analysis
  (TypeScript + ESLint). Defines target distribution, tool responsibilities, and command workflow.
keywords:
  - testing
  - strategy
  - trophy
related:
  - SPEC-tooling-testing-implementation-specification
  - SPEC-tooling-eslint-oxlint-hybrid-linting
  - SPEC-tooling-typescript-strict-project-references
index:
  sections:
    - title: 'TLDR'
      lines: [85, 97]
      summary:
        'Use the testing trophy model with integration tests as the largest portion of the suite.'
      token_est: 65
    - title: 'Scope'
      lines: [99, 116]
      summary:
        'Defines test distribution and tool responsibilities; excludes specific test framework
        configuration details.'
      token_est: 71
    - title: 'Specification'
      lines: [118, 150]
      summary:
        'Integration tests dominate the suite; unit and E2E are smaller slices, with static analysis
        as the base.'
      token_est: 206
    - title: 'Workflow'
      lines: [152, 162]
      summary:
        'Developers run fast unit/integration tests locally and keep E2E for targeted scenarios.'
      token_est: 72
    - title: 'Rationale'
      lines: [164, 172]
      summary: 'The testing trophy balances confidence and cost better than a unit-heavy pyramid.'
      token_est: 60
    - title: 'Alternatives Considered'
      lines: [174, 182]
      summary: 'Unit-heavy pyramids and E2E-heavy strategies are costly and brittle.'
      token_est: 46
    - title: 'Consequences'
      lines: [184, 199]
      summary: 'More integration tests and fewer fragile unit tests.'
      token_est: 67
    - title: 'Verification Approach'
      lines: [201, 209]
      summary: 'Coverage targets reinforce the strategy.'
      token_est: 36
    - title: 'Design Decisions'
      lines: [211, 221]
      summary: 'Adopt the testing trophy model with integration tests as the primary investment.'
      token_est: 68
    - title: 'Blockers'
      lines: [223, 231]
      summary: 'None.'
      token_est: 43
    - title: 'Assumptions'
      lines: [233, 242]
      summary: 'Assumes integration tests remain practical at scale.'
      token_est: 86
    - title: 'Unknowns'
      lines: [244, 250]
      summary: 'Real-world usage may require adjusting distribution targets.'
      token_est: 73
---

# SPEC-tooling-testing-trophy-strategy

---

## TLDR

Summary: Use the testing trophy model with integration tests as the largest portion of the suite.

**What:** Testing trophy distribution across test levels

**Why:** Maximize confidence while keeping tests maintainable and fast

**How:** Emphasize integration tests (60-70%), keep unit tests smaller, and run E2E sparingly

**Status:** Active

---

## Scope

Summary: Defines test distribution and tool responsibilities; excludes specific test framework
configuration details.

**Includes:**

- Testing trophy distribution targets
- Definition of what belongs in each test layer
- Tool responsibilities by layer
- Command overview for running tests

**Excludes:**

- Framework configuration (see testing implementation spec)
- CI pipeline details

---

## Specification

Summary: Integration tests dominate the suite; unit and E2E are smaller slices, with static analysis
as the base.

### Testing Trophy Distribution

| Level       | Target % | Primary Tools      | Notes                       |
| ----------- | -------- | ------------------ | --------------------------- |
| Static      | N/A      | TypeScript, ESLint | Instant feedback            |
| Unit        | 20-30%   | Vitest             | Pure functions, utilities   |
| Integration | 60-70%   | Vitest + RTL       | Components and interactions |
| E2E         | 5-10%    | Playwright         | End-to-end user flows       |

### Tool Responsibilities

- **TypeScript:** static type checking
- **ESLint:** code standards and correctness checks
- **Vitest:** unit and integration tests
- **React Testing Library:** interaction-focused component tests
- **Playwright:** browser-driven E2E scenarios

### What to Test

**Static:** type safety, unused code, unsafe patterns

**Unit:** pure logic, helpers, edge cases in isolation

**Integration:** component interactions, workflows, data flow across modules

**E2E:** critical user journeys and cross-system integration

---

## Workflow

Summary: Developers run fast unit/integration tests locally and keep E2E for targeted scenarios.

| Command              | Purpose                        |
| -------------------- | ------------------------------ |
| `pnpm test`          | Run unit and integration tests |
| `pnpm test:watch`    | Watch mode for local iteration |
| `pnpm test:coverage` | Coverage run (CI gate)         |

---

## Rationale

Summary: The testing trophy balances confidence and cost better than a unit-heavy pyramid.

- Integration tests provide higher confidence for complex workflows.
- Unit tests remain valuable for small, isolated logic.
- E2E tests are expensive and should be limited to critical flows.

---

## Alternatives Considered

Summary: Unit-heavy pyramids and E2E-heavy strategies are costly and brittle.

- Unit-test pyramid: too many low-confidence tests
- E2E-heavy suites: slow and brittle
- No defined distribution: leads to uneven coverage

---

## Consequences

Summary: More integration tests and fewer fragile unit tests.

**Positive:**

- Higher confidence in user workflows
- Better alignment with product risk areas
- More maintainable test suites

**Negative:**

- Integration tests take longer to write and run than pure units
- Requires discipline to keep E2E limited

---

## Verification Approach

Summary: Coverage targets reinforce the strategy.

- Overall coverage target: 70-80%
- Critical paths require 100% coverage
- Coverage enforcement via `pnpm test:coverage`

---

## Design Decisions

Summary: Adopt the testing trophy model with integration tests as the primary investment.

| Field      | Decision 001: Testing trophy model |
| ---------- | ---------------------------------- |
| **Title**  | Test distribution strategy         |
| **Chosen** | Integration-heavy trophy model     |
| **Why**    | Best confidence-to-cost ratio      |

---

## Blockers

Summary: None.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | n/a    | n/a           | Low    |

---

## Assumptions

Summary: Assumes integration tests remain practical at scale.

| Assumption                            | Validation Method   | Confidence | Impact if Wrong    |
| ------------------------------------- | ------------------- | ---------- | ------------------ |
| Integration tests stay maintainable   | Test suite reviews  | Medium     | Rebalance test mix |
| E2E remains limited to critical flows | CI runtime tracking | High       | Reduce E2E scope   |

---

## Unknowns

Summary: Real-world usage may require adjusting distribution targets.

| Question                                    | Impact | Resolution Criteria         | Owner | ETA |
| ------------------------------------------- | ------ | --------------------------- | ----- | --- |
| Do we need to adjust test ratios over time? | Medium | CI time vs confidence trade | Team  | TBD |
