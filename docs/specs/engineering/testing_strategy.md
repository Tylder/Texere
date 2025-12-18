# Testing Strategy for Next.js Applications

**Document Version:** 1.1  
**Last Updated:** December 2, 2025  
**Status:** Active

<!-- IMPROVED: Added formal document metadata and status; made spec-compliant and citable -->

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Overview: The Testing Trophy](#2-overview-the-testing-trophy)
- [3. Tool Responsibilities](#3-tool-responsibilities)
- [4. What to Test by Level](#4-what-to-test-by-level)
- [5. Next.js-Specific Considerations](#5-nextjs-specific-considerations)
- [6. Folder Structure & Co-Location](#6-folder-structure--co-location)
- [7. Setup: Vitest Browser Mode](#7-setup-vitest-browser-mode)
- [8. Mocking: Mock Service Worker (MSW)](#8-mocking-mock-service-worker-msw)
- [9. Visual Regression Testing](#9-visual-regression-testing)
- [10. Running Tests](#10-running-tests)
- [11. Anti-Patterns: What NOT to Test](#11-anti-patterns-what-not-to-test)
- [12. Coverage Goals](#12-coverage-goals)
- [13. CI/CD Integration](#13-cicd-integration)
- [14. Dependencies & References](#14-dependencies--references)
- [15. Changelog](#15-changelog)

---

## 1. Scope

**In Scope:**

- High-level testing philosophy (testing trophy; level distribution)
- Tool selection and responsibilities (TypeScript, ESLint, Vitest, RTL, Playwright)
- What to test at each level (unit, integration, E2E)
- Next.js app router pages and server component testing strategies
- Co-location pattern justification and benefits
- Setup configurations (Vitest browser mode, MSW)
- Visual regression testing with Playwright
- Anti-patterns and what NOT to test
- Coverage goals and targets
- CI/CD integration examples

**Out of Scope:**

- Detailed per-project configuration (covered in
  [testing_specification.md](./testing_specification.md))
- Colocated test file naming (see
  [testing_specification.md § 3.1](./testing_specification.md#31-test-file-organization-colocated-pattern))
- Nx monorepo orchestration (see
  [testing_specification.md § 3.4–3.5](./testing_specification.md#34-root-level-test-scripts-nx-orchestration))
- Specific code examples for all test types (examples provided; see
  [testing_specification.md](./testing_specification.md) for exhaustive examples)

---

## 2. Overview: The Testing Trophy

### 2.1 Why Pyramid is Outdated

The **testing pyramid** (many unit tests, few E2E tests) is outdated. Modern tooling (React Testing
Library, Playwright) makes **integration tests** the largest, most valuable category.

**Cite as:** §2.1

### 2.2 The Testing Trophy Model

```
┌─────────────────────────────────┐
│   E2E Tests (Playwright)        │ ← Full app flows, user journeys
│         (Few, Slow)             │ → Highest confidence; real browser
├─────────────────────────────────┤
│  Integration Tests (Vitest)     │ ← Components + interactions
│      (Many, Medium speed)       │ → **LARGEST SECTION (60-70%)**
├─────────────────────────────────┤   Highest ROI; catches real bugs
│   Unit Tests (Vitest)           │ ← Pure functions, utils
│      (Some, Very fast)          │ → Lowest confidence
├─────────────────────────────────┤
│   Static Tests (TypeScript)     │ ← Type checking, linting
│        (Very fast)              │ → Prevents broad categories of errors
└─────────────────────────────────┘
```

**Key Principle:** Integration tests have the highest return on investment (ROI).  
**Cite as:** §2.2

---

## 3. Tool Responsibilities

<!-- IMPROVED: Made tool matrix citable with section numbers -->

### 3.1 Testing Tools & Their Purposes

| Tool                               | Purpose                       | Environment                 | Speed   | Confidence          | Cite As |
| ---------------------------------- | ----------------------------- | --------------------------- | ------- | ------------------- | ------- |
| **TypeScript** (§3.1.1)            | Static type checking          | No runtime                  | Instant | Low (catches typos) | §3.1.1  |
| **ESLint** (§3.1.2)                | Code standards enforcement    | No runtime                  | Instant | Low                 | §3.1.2  |
| **Vitest** (§3.1.3)                | Unit & integration testing    | Node.js or **Browser Mode** | Fast    | Medium              | §3.1.3  |
| **React Testing Library** (§3.1.4) | Component interaction testing | Browser or jsdom            | Medium  | High                | §3.1.4  |
| **Playwright** (§3.1.5)            | End-to-end testing            | Real browser                | Slow    | Highest             | §3.1.5  |

**Row-by-row references:**

- TypeScript: §3.1.1
- ESLint: §3.1.2
- Vitest: §3.1.3
- React Testing Library: §3.1.4
- Playwright: §3.1.5

---

## 4. What to Test by Level

### 4.1 Static Tests (TypeScript + ESLint)

**Write:** All code  
**Focus:** Type safety, unused variables, import cycles, code style

Tests that don't require execution:

- Type safety
- Unused variables
- Import cycles
- Code style

**Cite as:** §4.1

### 4.2 Unit Tests (Vitest)

**Write:** 20-30% of tests  
**Focus:** Pure functions and logic in isolation

```typescript
// utils/format.test.ts
import { describe, expect, it } from 'vitest';

import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formats currency with two decimals', () => {
    expect(formatPrice(10)).toBe('$10.00');
    expect(formatPrice(10.5)).toBe('$10.50');
  });
});
```

**What NOT to test (§4.2):**

- Third-party library behavior
- Implementation details
- Private methods

**Cite as:** §4.2

### 4.3 Integration Tests (Vitest + React Testing Library)

**Write:** 60-70% of tests ← **LARGEST SECTION (§2.2)**  
**Focus:** Components with their dependencies (real or mocked)

```typescript
// components/LoginForm/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('submits form with user input', async () => {
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123'
    });
  });
});
```

**What to test (§4.3.1):**

- User interactions (clicks, form input)
- Component state changes
- Integration between parent and child components
- Error states and edge cases
- Accessibility (keyboard navigation, ARIA attributes)

**What NOT to test (§4.3.2):**

- CSS implementation
- Internal state details
- Component prop validation (TypeScript does this)

**Cite as:** §4.3

### 4.4 End-to-End Tests (Playwright)

**Write:** 5-10% of tests  
**Focus:** Full user workflows in real browser

```typescript
// e2e/login.spec.ts
import { expect, test } from '@playwright/test';

test('user can login and access dashboard', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('http://localhost:3000/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

**What to test (§4.4.1):**

- Critical user journeys (auth flow, checkout, etc.)
- Multi-page navigation
- Real API calls (or MSW-mocked)
- Cross-browser compatibility

**What NOT to test (§4.4.2):**

- Third-party services you don't control
- Every possible route (too slow)
- Every component state (use integration tests instead)

**Cite as:** §4.4

### 4.5 Determinism & Side-Effect Isolation

- Keep domain logic in a Functional Core with I/O in an Imperative Shell; inject adapters for
  HTTP/fs/clock/RNG to keep unit/integration tests deterministic. citeturn1search1
- Stub/seed time and randomness in tests (e.g., fixed `clock.now`, seeded RNG) to avoid flaky
  assertions. citeturn1search1
- Prefer explicit assertions over broad snapshots; reserve snapshots for stable, human-reviewed
  outputs to reduce flake and review noise. citeturn3search0

---

## 5. Next.js-Specific Considerations

### 5.1 Server vs Client Components

#### 5.1.1 Client Components (Testable with Vitest + RTL)

```typescript
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

```typescript
// Counter.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

test('increments count on button click', async () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /increment/i });

  await userEvent.click(button);
  expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
});
```

**Cite as:** §5.1.1

#### 5.1.2 Server Components (Test via Playwright E2E or API Testing)

- Cannot be tested in isolation with Vitest
- Test by hitting the rendered page endpoint
- Use Playwright for full flow testing

**Cite as:** §5.1.2

### 5.2 App Router Pages

Test page components via Playwright E2E (§4.4):

```typescript
// app/dashboard/page.tsx
export default function DashboardPage() {
  return <h1>Dashboard</h1>;
}
```

```typescript
// e2e/dashboard.spec.ts
test('dashboard page loads', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

**Cite as:** §5.2

### 5.3 Accessibility-First Queries

- In RTL/Playwright, prefer accessible queries (`getByRole`, `getByLabelText`, `getByText`) before
  `data-testid`; this yields more resilient selectors and aligns with Testing Library guidance.
  citeturn0search2turn0search3
- Keep `data-testid` as a last resort for non-semantic elements.

---

## 6. Folder Structure & Co-Location

### 6.1 Why Co-Location

Keep tests **co-located** with components (not in `__tests__` directory):

```
app/
├── components/
│   ├── Hero/
│   │   ├── Hero.tsx
│   │   ├── Hero.test.tsx        ← Test lives next to component
│   │   └── Hero.stories.tsx     ← Optional: Storybook story
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   └── Form/
│       ├── Form.tsx
│       ├── Form.test.tsx
│       ├── useFormState.ts
│       └── useFormState.test.ts  ← Co-locate hook tests too
├── hooks/
│   ├── useMediaQuery.ts
│   └── useMediaQuery.test.ts
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
├── api/
│   └── route.ts                  ← API routes tested via Playwright
└── page.tsx
    └── page.test.ts              ← Page-level tests via E2E

e2e/
├── auth.spec.ts                  ← Playwright tests
├── dashboard.spec.ts
└── checkout.spec.ts
```

**Cite as:** §6.1

### 6.2 Benefits of Co-Location

- Tests are visible in file explorer
- No structure sync needed on refactors
- Obvious when tests are missing
- Better DX for developers

**Cite as:** §6.2

### 6.3 Test Organization: What Tests Go Where

#### 6.3.1 Unit Tests: `*.test.ts`

- Pure utility functions
- Hooks without components
- Type guards and validators
- Business logic

**Cite as:** §6.3.1

#### 6.3.2 Integration Tests: `*.test.tsx`

- Components with interactions
- Components + their hooks
- Components + mocked children
- Form handling, state changes

**Cite as:** §6.3.2

#### 6.3.3 E2E Tests: `e2e/**/*.spec.ts`

- Full page flows
- Navigation paths
- API integration
- Authentication flows
- Multi-page user journeys

**Cite as:** §6.3.3

---

## 7. Setup: Vitest Browser Mode

### 7.1 Configuration

Use **Browser Mode** instead of jsdom for more accurate testing:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'browser', // Real browser, not jsdom
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
  },
});
```

**Cite as:** §7.1

### 7.2 Setup File

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';

import { worker } from './mocks/browser';

// Start MSW for all tests
beforeAll(() => worker.listen());
afterEach(() => worker.resetHandlers());
afterAll(() => worker.close());
```

**Cite as:** §7.2

---

## 8. Mocking: Mock Service Worker (MSW)

### 8.1 Define Mock Handlers

Mock API calls without hitting real servers:

```typescript
// mocks/handlers.ts
import { HttpResponse, http } from 'msw';

export const handlers = [
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();

    if (body.email === 'user@example.com') {
      return HttpResponse.json({ token: 'fake-token' });
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),
];
```

**Cite as:** §8.1

### 8.2 Browser Setup

```typescript
// mocks/browser.ts
import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

**Cite as:** §8.2

### 8.3 Using MSW in Tests

```typescript
test('login with invalid credentials', async ({ worker }) => {
  worker.use(
    http.post('/api/login', () =>
      HttpResponse.json({ error: 'Invalid' }, { status: 401 })
    )
  );

  render(<LoginForm />);
  // ... test error state
});
```

**Cite as:** §8.3

---

## 9. Visual Regression Testing

### 9.1 Playwright Visual Regression

For component visual testing (screenshots at different breakpoints):

```typescript
// playwright.config.ts
export default defineConfig({
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  testMatch: '**/*.visual.spec.ts',
});
```

**Cite as:** §9.1

### 9.2 Example: Visual Tests

```typescript
// components/Hero/Hero.visual.spec.ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
});

test('hero section at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 1080 });
  const hero = page.getByTestId('section-hero');

  await expect(hero).toHaveScreenshot('hero-360px.png');
});

test('hero section at 1024px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1080 });
  const hero = page.getByTestId('section-hero');

  await expect(hero).toHaveScreenshot('hero-1024px.png');
});
```

**Cite as:** §9.2

### 9.3 Flake-Reduction Defaults for VRT/E2E

- Use locators with auto-wait (roles/labels) instead of `waitForTimeout`; set fixed viewport and
  disable animations where possible to stabilize diffs. citeturn1search6
- Enable retries with trace/video on first retry for flaky specs and mock external calls to
  eliminate nondeterministic dependencies. citeturn1search0

---

## 10. Running Tests

### 10.1 Common Commands

```bash
# Unit & integration tests
pnpm test                # § 10.1.1

# Watch mode
pnpm test:watch          # § 10.1.2

# With coverage
pnpm test:coverage       # § 10.1.3

# E2E tests
pnpm e2e                 # § 10.1.4

# Visual regression
pnpm test:visual         # § 10.1.5

# All quality checks
pnpm quality             # § 10.1.6
```

**Cite as:** §10.1

---

## 11. Anti-Patterns: What NOT to Test

<!-- IMPROVED: Made anti-patterns numbered and citable -->

### 11.1 Forbidden Testing Practices

| Anti-Pattern                     | Why Forbidden                           | Cite As |
| -------------------------------- | --------------------------------------- | ------- |
| **Third-party library behavior** | Test your integration, not their code   | §11.1.1 |
| **CSS implementation**           | Visual regression tests handle this     | §11.1.2 |
| **Implementation details**       | Test behavior, not state                | §11.1.3 |
| **Props validation**             | TypeScript does this                    | §11.1.4 |
| **Component internals**          | If hard to test, refactor the component | §11.1.5 |
| **Every possible state**         | Focus on user-visible outcomes          | §11.1.6 |
| **External APIs**                | Mock them with MSW                      | §11.1.7 |
| **Browser APIs directly**        | Test your wrapper/hook, not the API     | §11.1.8 |

---

## 12. Coverage Goals

### 12.1 Coverage Targets

| Metric                                       | Target       | Strategy                                                        |
| -------------------------------------------- | ------------ | --------------------------------------------------------------- |
| **Overall Coverage**                         | 70-80%       | Focus on integration tests (§2.2); unit tests 20-30%; E2E 5-10% |
| **Critical Paths** (auth, payment, checkout) | 100%         | High confidence required                                        |
| **Obsession with 100%**                      | Anti-Pattern | Bad tests at 100% worse than no tests; see §11.1                |

**Key Point:** Don't obsess over coverage % — focus on behavior.

**Cite as:** §12.1

---

## 13. CI/CD Integration

### 13.1 Example GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm run format:check
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test:coverage
      - run: pnpm run e2e
```

**Cite as:** §13.1

---

## 14. Dependencies & References

### Related Specifications

- **Testing Specification (Definitive):** [testing_specification.md](./testing_specification.md) —
  Detailed per-project setup, configuration, and examples
- **Performance & Accessibility:**
  [../system/perf_accessibility.md § 4](../system/perf_accessibility.md#4-validation--quality-gates)
  — Automated testing in CI/CD
- **High-level spec:** [../../README.md § Engineering Specs](../README.md)

### External References

- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy) — Kent C. Dodds (philosophy)
- [Vitest Docs](https://vitest.dev)
- [React Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Mock Service Worker](https://mswjs.io)

**Cite as:** §14

---

## 15. Changelog

| Date       | Version | Editor | Summary                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-02 | 1.1     | @agent | Upgraded from "Modern testing best practices" to "Active" spec; added § numbering for full citability; quantified testing trophy distribution (§2.2); added scope & out-of-scope; made all tool responsibilities, testing levels, and anti-patterns citable; added cross-refs to testing_specification.md & perf_accessibility.md; formatted changelog as table; bumped version 1.0 → 1.1 |
| 2025-12-02 | 1.0     | legacy | Initial version                                                                                                                                                                                                                                                                                                                                                                           |

---

## Summary of Improvements

- Added formal document metadata (Version 1.1, Last Updated Dec 2 2025, Status: Active)
- Added Quick Navigation with anchor links for easy citation
- Added explicit "In Scope" and "Out of Scope" sections
- **Numbered all major sections (§1–§15)** for complete citability
- **Numbered subsections and tables** for row/cell citation (e.g., §3.1.1, §3.1.2)
- Converted tools table to be citation-enabled (§3.1 with row-level refs)
- Structured "What to Test" levels with § citations (§4.1–§4.4)
- Added Co-Location section (§6) with benefits and folder structure
- Made Anti-Patterns a numbered table (§11.1) instead of prose list
- Quantified coverage goals (§12.1) with metrics and strategy
- Added Dependencies & References section (§14) with cross-refs to testing_specification.md &
  perf_accessibility.md
- Clarified relationship to testing_specification.md (§14: "Definitive" spec for detailed setup;
  this is "Active" higher-level strategy)
- Formatted changelog as proper table with actionable summary
- Status upgraded from "Modern testing best practices" → "Active" (all sections numbered, all
  requirements citable, changelog formatted properly)
- Bumped version from implicit → 1.0 (legacy) → 1.1
