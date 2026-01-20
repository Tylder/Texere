---
doc_type: adr
domain: virtual_influencer_testing
reference_prefix: ADR-VI-TECH
adr_id: ADR-VI-TECH-7
status: accepted
version: 1.0
decision_date: 2026-01-09
last_updated: 2026-01-09
effective_date: 2026-01-09
author: @agent
---

# ADR-VI-TECH-7: Testing Implementation & Specification

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR with status Superseded on this
one.

**Summary:** We adopt a standardized testing implementation across the monorepo: Vitest for unit and
integration tests with jsdom environment, React Testing Library for component interaction testing,
and Playwright for E2E scenarios. Tests are colocated (`.test.tsx` in same directory as source),
each package has its own `vitest.config.ts`, and coverage targets are enforced at 70–80% overall
with 100% for critical paths.

---

## Quick Navigation

| Section                                             | Purpose                   | Read if...                                |
| --------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [References](#references)                           | Related documents         | You need related documents                |
| [Statement](#statement)                             | The actual decision       | You need the complete decision framing    |
| [Context](#context)                                 | Why we decided            | You're unfamiliar with the domain         |
| [Decision](#decision)                               | What we chose             | You're implementing or understanding this |
| [Rationale](#rationale)                             | Why this is better        | You need the full reasoning               |
| [Alternatives Considered](#alternatives-considered) | Options we rejected       | You disagree with the choice              |
| [Consequences](#consequences)                       | Positive/negative impacts | You're assessing cost/benefit             |
| [Contributor Workflow](#contributor-workflow)       | Contributor Workflow      | You need this information                 |
| [Troubleshooting](#troubleshooting)                 | Troubleshooting           | You need this information                 |
| [Notes](#notes)                                     | Additional context        | You need this information                 |
| [Changelog](#changelog)                             | Version history           | You want version history                  |

---

## References

**Driven by:** Consistency, test maintainability, framework integration with Nx  
**Related:**

- [ADR-VI-TECH-6](./ADR-VI-TECH-6-testing-strategy-trophy.md) (testing strategy/philosophy)
- [ADR-VI-TECH-5](./ADR-VI-TECH-5-nx-build-system-composite-projects.md) (Nx test orchestration)
- [ADR-VI-TECH-1](./ADR-VI-TECH-1-frontend-tech-stack.md) (tech stack: Vitest, RTL, Playwright)  
  **Implemented by (current):** Per-package `vitest.config.ts`, `vitest.setup.ts`, `.test.tsx`
  files, Playwright tests

---

## Statement

In the context of a monorepo with multiple packages requiring unit, integration, and E2E tests,
facing the challenge of consistent setup and test discovery, we decided to adopt **Vitest with jsdom
as the test runner for unit/integration tests (per-package config, colocated test files), React
Testing Library for component interactions, and Playwright for E2E scenarios**, to achieve uniform
test structure across packages, easy test discovery (colocation), and fast feedback loops while
supporting the testing trophy distribution.

---

## Context

- **Multiple packages:** each with own source, dependencies, and test requirements
- **Consistent test discovery:** developers should know where tests live (same directory as source)
- **Framework integration:** tests must work with Nx's orchestration, coverage aggregation, and
  caching
- **CI/CD gates:** test results must be measurable and enforced

---

## Decision

### Test File Organization (Colocated Pattern)

**Decision:** Test files live in the same directory as source code (NOT in `__tests__/` folders)

**Pattern:**

```
packages/ui/src/
├── Button/
│   ├── button.tsx          ← source
│   ├── button.test.tsx     ← test (same directory)
│   ├── button.stories.tsx  ← storybook (optional)
│   └── index.ts            ← export
├── Card/
│   ├── card.tsx
│   ├── card.test.tsx
│   └── index.ts
└── __tests__/              ← NO: don't use this pattern
```

**Benefits:**

- Easy to find tests (right next to source)
- Clear test coverage (one test file per source file)
- Refactoring is simpler (move source + test together)
- Developers don't forget to update tests

### Per-Package `vitest.config.ts` (Self-Contained)

**Decision:** Each workspace project owns its own `vitest.config.ts` — no root inheritance

**Generic Package Example:**

```typescript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(packageDir, './vitest.setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      exclude: ['**/node_modules/**', '**/*.{test,spec}.{ts,tsx}', '**/index.ts', '**/index.tsx'],
      lines: 70,
      functions: 70,
      branches: 65,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@repo/ui': path.resolve(packageDir, 'src'),
    },
  },
});
```

**Key settings:**

- `globals: true` — enables `describe`, `it`, `expect` without imports
- `environment: 'jsdom'` — browser-like environment for component testing
- `setupFiles` — runs before each test suite (setup/cleanup)
- `include` — finds all `.test.ts` / `.spec.tsx` files in src/
- `coverage.provider: 'v8'` — fast coverage reporting
- `coverage` thresholds — enforces minimum coverage per package

### Setup File: `vitest.setup.ts`

Each package should have a setup file:

```typescript
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Clean up DOM after each test
afterEach(() => cleanup());
```

**Purpose:**

- Imports React Testing Library matchers (`.toBeInTheDocument()`, etc.)
- Cleans up rendered components after each test
- Shared setup without duplication

### Coverage Targets & Quality Gates

**Target distribution (aligns with testing trophy):**

| Metric         | Target | Strategy                                         |
| -------------- | ------ | ------------------------------------------------ |
| Overall        | 70–80% | Focus on integration tests (§ADR-VI-TECH-6 §2.2) |
| Critical paths | 100%   | Auth, payment, domain-specific workflows         |
| 100% goal      | Avoid  | Bad tests at 100% worse than no tests            |

**Coverage command:**

```bash
pnpm test:coverage
# Runs vitest with coverage aggregation across monorepo
# Reports in coverage/ per package and aggregated
```

### Test Frameworks & Scopes

#### Vitest (Unit & Integration)

Used for unit tests and integration tests:

```typescript
// Unit test: pure function in isolation
describe('calculateCost', () => {
  it('multiplies hours by rate', () => {
    expect(calculateCost(2, 0.5)).toBe(1.0);
  });
});

// Integration test: component + user interactions
describe('MediaGenerationForm', () => {
  it('submits form with workflow parameters', async () => {
    const { getByRole } = render(<MediaGenerationForm onSubmit={vi.fn()} />);

    await userEvent.click(getByRole('button', { name: /submit/i }));
    // assertions follow
  });
});
```

#### React Testing Library

Used for component interaction testing (within Vitest):

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button (testing_specification §3)', () => {
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<button onClick={onClick}>Click me</button>);

    await userEvent.click(screen.getByRole('button', { name: /click me/i }));

    expect(onClick).toHaveBeenCalled();
  });
});
```

**Key principles:**

- Query by role, label, or text (user perspective)
- Avoid querying by data-testid unless necessary
- Test user behavior, not implementation details
- Use `userEvent` (simulates real user input) not `fireEvent` (direct DOM mutations)

#### Playwright (End-to-End)

Used for critical user journeys in real browser:

```typescript
import { test, expect } from '@playwright/test';

test('operator generates media and saves checkpoint', async ({ page }) => {
  await page.goto('/workspace/char-123');

  // Trigger generation
  await page.click('button:has-text("New Generation")');
  await page.fill('input[name="workflow"]', 'fast-variations');
  await page.click('button:has-text("Submit")');

  // Wait for result
  await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
  await page.waitForURL(/.*\/checkpoint\/.*/);

  // Verify checkpoint saved
  await expect(page.locator('text=Checkpoint saved')).toBeVisible();
});
```

**Location:** `src/e2e/` or `tests/e2e/` (not in main test suite)

**Commands:**

- `pnpm e2e` — run E2E tests in CI mode (headless)
- `pnpm e2e:debug` — run with visible browser for local debugging

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "e2e": "playwright test"
  }
}
```

### Nx Task Configuration

Each package's `project.json`:

```json
{
  "targets": {
    "vitest:test": {
      "executor": "nx:run-script",
      "options": { "script": "test" },
      "outputs": ["{projectRoot}/coverage"],
      "cache": true
    },
    "test:coverage": {
      "executor": "nx:run-script",
      "options": { "script": "test:coverage" },
      "outputs": ["{projectRoot}/coverage"],
      "cache": true
    },
    "e2e": {
      "executor": "nx:run-script",
      "options": { "script": "e2e" },
      "cache": false
    }
  }
}
```

### Monorepo-Level Commands

| Command                 | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `pnpm test`             | Run all tests (Vitest) in all packages                    |
| `pnpm test:coverage`    | Run tests with coverage aggregation                       |
| `pnpm e2e`              | Run E2E tests (Playwright) in CI mode                     |
| `pnpm post:report:fast` | Quick loop: lint:fix + typecheck + test:coverage          |
| `pnpm post:report`      | Full validation: format + lint + typecheck + test + build |

### Coverage Aggregation

Root script aggregates coverage from all packages:

```bash
node scripts/aggregate-coverage.mjs
```

Produces:

- Combined `coverage/` directory at root
- Per-package coverage reports
- Summary table showing monorepo coverage

### Test File Requirements

**All tests must cite governing spec sections:**

```typescript
describe('MediaGenerationRequest (testing_specification §3)', () => {
  // Signals that this test is governed by testing_specification §3 (colocated pattern)
});

describe('GenerationForm (ADR-VI-TECH-6 §4.3 - Integration Tests)', () => {
  // Signals that this integration test follows testing strategy §4.3
});
```

---

## Rationale

### Colocated Pattern

- **Discoverability:** tests live next to code, never lost or forgotten
- **Refactoring:** move file, tests move with it
- **Context:** test and source in one place makes intent clear
- **Maintenance:** developers see test failures immediately in editor

### Per-Package Config

- **Self-contained:** each package can customize coverage targets and setup
- **Scalability:** adding packages doesn't require root config changes
- **Flexibility:** monorepo libraries can have different rules than apps

### Vitest + jsdom

- **Speed:** jsdom is fast; suitable for unit and integration tests
- **Simplicity:** single test runner; no context switching
- **Nx integration:** Vitest plays well with Nx caching and task orchestration
- **React support:** out-of-the-box React and TypeScript support

### React Testing Library

- **User perspective:** queries by role/label/text (what users interact with)
- **Robust:** tests survive refactoring (behavior-based, not implementation-based)
- **Accessibility:** encourages testing keyboard navigation and ARIA attributes
- **Maintainability:** less brittle than snapshot or enzyme-based tests

### Playwright for E2E

- **Real browser:** tests actual rendering, CSS, JavaScript edge cases
- **Multi-browser:** can test Chrome, Firefox, Safari
- **Practical:** good balance of speed and realism
- **Debugging:** excellent debugging tools and failure screenshots

### 70–80% Coverage Target

- **Realistic:** 100% coverage is unmaintainable (bad tests written just to hit numbers)
- **Risk-focused:** ensure critical paths are covered (100%), less critical code at 70%+
- **Developer productivity:** developers spend less time testing non-critical code
- **Maintenance:** fewer tests to break during refactoring

---

## Alternatives Considered

- **`__tests__/` folders:** less discoverable, requires searching; colocated is better
- **Root vitest.config.ts:** less flexible; some packages have different needs
- **Jest instead of Vitest:** slower, more boilerplate, less TypeScript-native
- **Testing Library without Vitest:** need to add separate test runner; Vitest is cleaner
- **Cypress instead of Playwright:** heavier, slower, less community momentum
- **100% coverage requirement:** bad tests, developer frustration, diminishing returns

---

## Consequences

### Positive

- **Consistent test structure:** all packages follow same pattern
- **Easy test discovery:** `.test.tsx` right next to source
- **Fast feedback:** Vitest is ~100x faster than Jest for unit tests
- **High confidence:** React Testing Library tests catch real bugs
- **Maintainable:** colocated tests make refactoring easier
- **CI/CD integration:** Nx aggregates coverage, enforces thresholds
- **Realistic targets:** 70–80% is achievable without sacrificing quality

### Negative

- **jsdom limitations:** some browser APIs not available (animations, WebGL, etc.); use Playwright
  for those
- **Test setup complexity:** each package needs vitest.config.ts + vitest.setup.ts
- **Coverage overhead:** per-package coverage config can diverge; discipline required
- **Debugging difficulty:** failures in integration tests harder to isolate than unit tests
- **E2E test flakiness:** Playwright tests can be flaky if async handling isn't perfect
- **Monorepo coverage:** aggregation script is custom and requires maintenance

### Requires

- **Testing strategy clarity:** see ADR-VI-TECH-6 (philosophy)
- **Developer training:** React Testing Library best practices, accessibility testing
- **CI gate:** `pnpm test:coverage` must pass with minimum thresholds
- **Code review:** ensure tests follow testing trophy distribution
- **Maintenance:** keep vitest and dependencies up-to-date
- **Performance monitoring:** watch for test suite slowdown; refactor if needed

---

## Contributor Workflow

### Adding Tests to a Package

1. Create `package.name.test.tsx` in same directory as source
2. Import `{ describe, it, expect, vi }` and test frameworks
3. Reference governing spec section in test description (e.g., `testing_specification §3`)
4. Use React Testing Library queries (by role, label, text)
5. Reference spec/ADR sections that the test validates

### Creating a New Package with Tests

1. Run `nx generate @nx/node:library --name=my-lib`
2. Create `vitest.config.ts` from template (see Decision section)
3. Create `vitest.setup.ts` with cleanup imports
4. Add test scripts to `package.json`
5. Add vitest:test and test:coverage targets to `project.json`
6. Run `pnpm test --filter=@repo/my-lib` to validate setup

### Running Tests Locally

```bash
# Watch mode (fast feedback)
pnpm test:watch

# Single run
pnpm test

# With coverage
pnpm test:coverage

# Specific package
pnpm test --filter=@repo/ui

# Debug failing test
pnpm test --reporter=verbose
```

---

## Troubleshooting

| Issue                                  | Solution                                           |
| -------------------------------------- | -------------------------------------------------- |
| Tests not found                        | Check vitest.config.ts `include` pattern           |
| DOM methods unavailable                | Ensure environment: 'jsdom' in config              |
| React Testing Library matchers missing | Import `@testing-library/jest-dom/vitest` in setup |
| Coverage report missing                | Check outputs in project.json                      |
| E2E tests fail locally but pass in CI  | Clear `.playwright` cache; use `--no-cache`        |
| Component doesn't render in test       | Check setup file is run; validate imports          |

---

## Notes

- **Vitest version:** 4.0.15 (locked at major.minor)
- **React Testing Library:** 16.3.0
- **Playwright:** 1.57.0
- **Coverage provider:** V8 (fast, built-in)
- **Test data:** use factories/fixtures for realistic data
- **Mocking:** use MSW for API mocking; vi.mock() for module mocking
- **Accessibility:** test keyboard navigation and ARIA attributes
- **Performance:** profile tests with `--reporter=verbose`; refactor if > 5–10 minutes total

---

## Changelog

| Version | Date       | Status   | Notes                                                                                                                    |
| ------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2026-01-09 | Accepted | **Latest & Effective.** Vitest + RTL for unit/integration, Playwright for E2E. Colocated tests. Coverage targets 70–80%. |
