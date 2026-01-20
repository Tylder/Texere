---
doc_type: adr
status: accepted
version: 1.0
decision_date: 2026-01-09
last_updated: 2026-01-09
effective_date: 2026-01-09
author: @agent
---

# ADR: Testing Strategy — Testing Trophy Model

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR with status Superseded on this
one.

**Summary:** We adopt the testing trophy model (not the pyramid) as our testing philosophy.
Integration tests form the largest portion (60–70%), supported by unit tests (20–30%), E2E tests
(5–10%), and static analysis (TypeScript + ESLint). This distribution maximizes confidence while
keeping test suites maintainable and execution fast.

---

## Quick Navigation

| Section                                                 | Purpose                   | Read if...                                |
| ------------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [References](#references)                               | Related documents         | You need related documents                |
| [Statement](#statement)                                 | The actual decision       | You need the complete decision framing    |
| [Context](#context)                                     | Why we decided            | You're unfamiliar with the domain         |
| [Decision](#decision)                                   | What we chose             | You're implementing or understanding this |
| [Rationale](#rationale)                                 | Why this is better        | You need the full reasoning               |
| [Alternatives Considered](#alternatives-considered)     | Options we rejected       | You disagree with the choice              |
| [Consequences](#consequences)                           | Positive/negative impacts | You're assessing cost/benefit             |
| [What Counts as Each Level](#what-counts-as-each-level) | What Counts as Each Level | You need this information                 |
| [Commands](#commands)                                   | Commands                  | You need this information                 |
| [Notes](#notes)                                         | Additional context        | You need this information                 |
| [Changelog](#changelog)                                 | Version history           | You want version history                  |

---

## References

**Driven by:** Test effectiveness, maintainability, CI/CD speed, developer experience  
**Related:**

- [ADR: Testing Implementation](./ADR-testing-implementation-specification.md) (implementation
  details)
- [ADR: ESLint/Oxlint Hybrid Linting](./ADR-eslint-oxlint-hybrid-linting.md) (static analysis)
- [ADR: TypeScript Strict](./ADR-typescript-strict-project-references.md) (TypeScript strict mode)  
  **Implemented by (current):** Test files across packages, vitest.config.ts, Playwright E2E suites

---

## Statement

In the context of a complex TypeScript platform with critical workflows (orchestration, content
generation, user interactions), facing the need to maximize test effectiveness while keeping test
suite execution fast and maintainable, we decided to adopt the **testing trophy model: a large
foundation of integration tests (60–70%), supported by unit tests (20–30%), E2E tests (5–10%), and
static analysis** to achieve high confidence in code behavior while avoiding brittle,
high-maintenance unit tests and keeping CI feedback loops fast.

---

## Context

- **Complex domain logic:** orchestrator workflows, content generation, composition logic
- **User-facing features:** operator workflows, media viewers, workspace interactions
- **Critical paths:** generation checkpoints, content publication, character management
- **Team velocity:** developers need fast local feedback; slow test suites block iteration
- **Maintenance burden:** 100% unit test coverage leads to unmaintainable test suites

---

## Decision

### The Testing Trophy Model

```
┌─────────────────────────────────┐
│   E2E Tests (Playwright)        │ ← Full app flows, user journeys
│         (Few, Slow)             │ → Highest confidence; real browser
├─────────────────────────────────┤
│  Integration Tests (Vitest)     │ ← Components + interactions
│      (Many, Medium speed)       │ → **LARGEST SECTION (60-70%)**
├─────────────────────────────────┤
│   Unit Tests (Vitest)           │ ← Pure functions, utils
│      (Some, Very fast)          │ → Lowest confidence
├─────────────────────────────────┤
│   Static Tests (TypeScript)     │ ← Type checking, linting
│        (Very fast)              │ → Prevents broad categories of errors
└─────────────────────────────────┘
```

### Distribution Targets (§2.2)

| Level       | Percentage | Count   | Speed     | Confidence | Tool               |
| ----------- | ---------- | ------- | --------- | ---------- | ------------------ |
| Static      | N/A        | Instant | Instant   | Low        | TypeScript, ESLint |
| Unit        | 20–30%     | Some    | Very fast | Low        | Vitest             |
| Integration | 60–70%     | Many    | Medium    | High       | Vitest + RTL       |
| E2E         | 5–10%      | Few     | Slow      | Highest    | Playwright         |

### Tool Responsibilities

| Tool                      | Purpose                       | Environment      | Speed   | Confidence |
| ------------------------- | ----------------------------- | ---------------- | ------- | ---------- |
| **TypeScript**            | Static type checking          | No runtime       | Instant | Low        |
| **ESLint**                | Code standards enforcement    | No runtime       | Instant | Low        |
| **Vitest**                | Unit & integration testing    | Node.js or jsdom | Fast    | Medium     |
| **React Testing Library** | Component interaction testing | Browser or jsdom | Medium  | High       |
| **Playwright**            | End-to-end testing            | Real browser     | Slow    | Highest    |

### What to Test by Level

#### Static Tests (TypeScript + ESLint)

- Type safety (strict mode catches nullability, optional properties, unsafe operations)
- Unused variables and parameters
- Import cycles and dead code
- Code style and naming conventions

#### Unit Tests (Vitest)

- Pure functions in isolation
- Utility functions, helpers, business logic
- Edge cases and error handling for isolated units
- Avoid testing third-party behavior
- Avoid testing private implementation details

#### Integration Tests (Vitest + React Testing Library)

- **LARGEST SECTION — Focus effort here**
- User interactions (clicks, form inputs, keyboard navigation)
- Component state changes and side effects
- Parent/child component integration
- Error states and recovery flows
- Accessibility requirements (ARIA, keyboard navigation)
- API mocking (MSW for realistic scenarios)

#### E2E Tests (Playwright)

- **Critical user journeys only**
- Multi-page navigation and workflow completion
- Real API calls (or MSW-mocked with realistic data)
- User authentication and authorization flows
- Critical business paths (content generation, publishing, checkpoints)

### Why Not the Pyramid?

The classic testing pyramid (many unit, fewer integration, few E2E) is outdated:

**Unit tests are brittle:** Testing private implementation details makes code inflexible; tests
break on refactoring even when behavior is correct.

**Integration tests have highest confidence:** Testing actual component interactions and user
workflows catches more real bugs than isolated unit tests.

**Modern tooling makes integration fast:** React Testing Library and Vitest make integration tests
nearly as fast as unit tests while providing much higher confidence.

**Result:** The trophy shape is more accurate: large integration section (highest confidence,
maintainable), smaller unit section (fast isolation tests), small E2E (real browser validation).

---

## Rationale

### Integration Tests as Foundation

- They test actual user behavior, not implementation details
- Refactoring code doesn't break integration tests (behavior-based, not implementation-based)
- They catch interactions between components (where real bugs live)
- React Testing Library's API encourages user-centric testing

### Unit Tests for Isolation

- Pure functions and utilities benefit from unit tests
- Edge cases in isolated logic are worth testing separately
- Fast feedback for developers iterating on utility code
- But not every function needs a unit test (especially not getters/setters)

### E2E Tests for Critical Paths

- User authentication, payment processing, critical workflows
- Multi-page navigation and state persistence
- Real browser validation (DOM rendering, CSS, JavaScript edge cases)
- Kept small to maintain CI speed

### Static Analysis as Foundation

- TypeScript strict mode catches ~20% of bugs before runtime
- ESLint catches another ~10% (unused variables, import cycles, naming violations)
- Free; runs instantly; no maintenance burden

### Coverage Targets (70–80%)

- 100% coverage is a liability (developers write bad tests to hit numbers)
- 70–80% is realistic and maintainable
- Focus on critical paths at 100%; less critical code at 70%+

---

## Alternatives Considered

- **Testing pyramid (many unit, few integration):** brittle, maintenance-heavy, lower confidence
- **No testing strategy (ad-hoc tests):** inconsistent quality, unpredictable coverage
- **100% unit test coverage requirement:** unmaintainable, false confidence, slows development
- **E2E tests only:** slow CI, brittle (UI changes), high maintenance
- **TDD (always test-first):** valuable discipline, but requires team buy-in; not mandated here

---

## Consequences

### Positive

- **High confidence:** integration tests + E2E catch real bugs
- **Fast CI:** integration tests nearly as fast as unit tests, E2E minimal
- **Maintainable:** behavior-based tests survive refactoring
- **Developer velocity:** developers write fewer tests for higher coverage
- **Realistic:** tests reflect actual usage, not implementation details
- **Learning curve:** integration testing is more intuitive than mocking internals

### Negative

- **Vitest/jsdom setup complexity:** integration tests require proper environment setup
- **Test isolation:** integration tests can have side effects; cleanup required
- **Debugging difficulty:** integration test failures are harder to debug than unit test failures
- **Slower feedback than unit tests:** integration tests are ~5–10x slower than unit tests
- **MSW/mocking complexity:** realistic integration tests require good mocking strategy

### Requires

- **Testing implementation spec:** see
  [ADR: Testing Implementation](./ADR-testing-implementation-specification.md) (vitest config,
  colocated patterns, coverage targets)
- **CI/CD gate:** `pnpm test:coverage` must pass before merging
- **Code review discipline:** ensure integration tests test behavior, not implementation
- **Developer education:** training on React Testing Library, accessibility testing, MSW mocking
- **Performance monitoring:** watch for slow test suites; refactor if `pnpm test` exceeds 5–10
  minutes

---

## What Counts as Each Level

### Unit Test Example

```typescript
// Pure function: test in isolation
describe('calculateMediaGenerationCost', () => {
  it('multiplies GPU hours by rate', () => {
    const cost = calculateMediaGenerationCost(2, 0.5); // 2 GPU hours @ $0.50/hr
    expect(cost).toBe(1.0);
  });
});
```

### Integration Test Example

```typescript
// Component + interactions: test behavior
describe('GenerationRequestForm (testing_strategy §4.3)', () => {
  it('submits workflow request when user clicks submit', async () => {
    const onSubmit = vi.fn();
    render(<GenerationRequestForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ /* expected shape */ }));
  });
});
```

### E2E Test Example

```typescript
// User journey: test in real browser
test('operator generates media, reviews, and saves checkpoint', async ({ page }) => {
  await page.goto('/workspace/char-123');
  await page.click('button:has-text("New Generation Request")');
  await page.fill('input[name="workflow"]', 'fast-variations');
  await page.click('button:has-text("Submit")');

  await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
  await page.waitForURL(/.*\/checkpoint\/*/);
});
```

---

## Commands

| Command                 | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `pnpm test`             | Run all unit + integration tests (Vitest)                 |
| `pnpm test:coverage`    | Run tests with coverage aggregation across monorepo       |
| `pnpm e2e`              | Run E2E tests (Playwright) in CI mode                     |
| `pnpm post:report:fast` | Quick loop: lint:fix + typecheck + test:coverage          |
| `pnpm post:report`      | Full validation: format + lint + typecheck + test + build |

---

## Notes

- **Coverage targets:** 70–80% overall, 100% for critical paths (see
  [ADR: Testing Implementation](./ADR-testing-implementation-specification.md) §6)
- **Test placement:** Colocated with source (`*.test.tsx` in same directory as source)
- **CI/CD gate:** `pnpm test:coverage` must pass; coverage must meet targets
- **Playwright:** run in CI only (too slow for local feedback); local testing uses Vitest
- **MSW (Mock Service Worker):** use for realistic API mocking in integration tests
- **Accessibility testing:** integrate a11y tests into integration suite (React Testing Library)

---

## Changelog

| Version | Date       | Status   | Notes                                                                                                                     |
| ------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-09 | Accepted | **Latest & Effective.** Testing trophy model: 60–70% integration, 20–30% unit, 5–10% E2E. High confidence, fast feedback. |
