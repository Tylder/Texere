# Testing Specification

**Document Version:** 1.2  
**Last Updated:** December 2, 2025  
**Status:** Active  
**Relationship:** Implementation spec; pairs with [testing_strategy.md](./testing_strategy.md)
(philosophy)

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Overview & Framework Assignment](#2-overview--framework-assignment)
- [3. Unit & Component Testing](#3-unit--component-testing)
- [4. E2E Testing](#4-e2e-testing)
- [5. Feature-Based Testing Strategy](#5-feature-based-testing-strategy)
- [6. Commands & Workflows](#6-commands--workflows)
- [7. Coverage & Quality Gates](#7-coverage--quality-gates)
- [8. Anti-Patterns & Forbidden Practices](#8-anti-patterns--forbidden-practices)
- [9. Spec Discipline](#9-spec-discipline)
- [10. Dependencies & References](#10-dependencies--references)
- [11. Changelog](#11-changelog)

---

## 1. Scope

**This is the implementation specification; for testing philosophy, see
[testing_strategy.md](./testing_strategy.md).**

**In Scope:**

- Unit testing setup (Vitest + React Testing Library)
- Component testing (colocated `.test.tsx` pattern)
- E2E testing (Playwright browser automation)
- Integration testing (multi-component scenarios)
- Test organization (folder structure, naming conventions)
- Configuration details (per-project vitest.config.ts, playwright.config.ts)
- Coverage targets (lines, functions, branches, statements)
- CI/CD quality gates (lint, typecheck, test, build)
- Nx monorepo test orchestration
- Next.js app and client component testing
- Mock Service Worker (MSW) for API mocking
- Code examples and patterns for each test type

**Out of Scope:**

- Testing philosophy and "why" (covered in [testing_strategy.md](./testing_strategy.md))
- Storybook component documentation (separate workflow)
- Performance profiling tools (covered in [perf_accessibility.md](../system/perf_accessibility.md))
- Server-side testing frameworks beyond Next.js routes
- Load testing or stress testing infrastructure
- Mobile app testing (web-only scope)

---

## 2. Overview & Framework Assignment

**For testing philosophy and the testing trophy distribution, see
[testing_strategy.md § 2](./testing_strategy.md#2-overview-the-testing-trophy).**

This specification focuses on implementation details. Key targets from strategy:

- **Unit Tests:** 60-75% of test suite (§ testing_strategy.md §2.2)
- **Integration Tests:** 15-25% of test suite (§ testing_strategy.md §2.2)
- **E2E Tests:** 5-10% of test suite (§ testing_strategy.md §2.2)
- **Overall Coverage:** 70-80% lines/functions (§7.1 below)

### 2.1 Test Framework Assignment (Why Each Tool)

| Framework                 | Purpose                       | Environment                            | Cite As |
| ------------------------- | ----------------------------- | -------------------------------------- | ------- |
| **TypeScript**            | Static type checking          | No runtime                             | §2.1.1  |
| **ESLint**                | Code standards enforcement    | No runtime                             | §2.1.2  |
| **Vitest**                | Unit & integration tests      | jsdom or Browser                       | §2.1.3  |
| **React Testing Library** | Component interaction testing | jsdom or Browser                       | §2.1.4  |
| **Playwright**            | End-to-end testing            | Real browser (Chrome, Firefox, Safari) | §2.1.5  |

**For tool responsibilities and why we chose them, see
[testing_strategy.md § 3.1](./testing_strategy.md#31-testing-tools--their-purposes).**

---

## 3. Unit & Component Testing

### 3.1 Test File Organization (Colocated Pattern)

<!-- IMPROVED: Made citability explicit with section numbers -->

**DECISION: Colocated test files (NOT `__tests__` folders)**

**Pattern:** `source.tsx` + `source.test.tsx` in same directory (§3.1.1)

#### 3.1.1 Folder Structure Example

```
packages/ui/src/
├── Button/
│   ├── Button.tsx
│   ├── Button.test.tsx          ← Colocated
│   └── index.ts
├── Input/
│   ├── Input.tsx
│   ├── Input.test.tsx
│   └── index.ts
└── index.ts (exports)
```

#### 3.1.2 Rationale for Colocated Tests

**Advantages:**

- **Modern Framework Standard** (§3.1.2.1): Angular, Next.js, React ecosystem default to colocated
- **Developer Experience** (§3.1.2.2): Opening component surfaces test immediately; single refactor
  renames both files
- **Monorepo Advantages** (§3.1.2.3): Nx discovers `*.test.ts(x)` automatically; clear ownership
- **Scalability** (§3.1.2.4): No mirror directory maintenance; Nx inferred tasks work seamlessly
- **Testing Culture** (§3.1.2.5): Tests visible by default; reinforces "tests are code" mindset

**Why NOT `__tests__` folders:**

- IDE navigation becomes cluttered (same hierarchy level confusion)
- Refactoring requires manual folder sync
- Vitest's testMatch defaults to glob-based (colocated) as primary pattern
- Less clear signal for exclusion from distribution

### 3.2 Per-Project vitest.config.ts (Self-Contained)

<!-- IMPROVED: Added citability to configuration sections -->

**DECISION: Each workspace project owns its own vitest.config.ts — NO root inheritance (§3.2.1)**

#### 3.2.1 Generic React Package Example (packages/ui)

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
    // Colocated pattern: **/*.test.tsx in same directory as source (§3.1.1)
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

#### 3.2.2 Next.js App Example (apps/web)

```typescript
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(appDir, './vitest.setup.ts')],
    // Colocated pattern (§3.1.1)
    include: [
      'app/**/*.{test,spec}.{ts,tsx}',
      'components/**/*.{test,spec}.{ts,tsx}',
      'hooks/**/*.{test,spec}.{ts,tsx}',
      'lib/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/e2e/**', '**/node_modules/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/*.{test,spec}.{ts,tsx}',
        '**/index.ts',
        '**/index.tsx',
        '**/.next/**',
      ],
      lines: 70,
      functions: 70,
      branches: 65,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@repo/ui': path.resolve(appDir, '../../packages/ui/src'),
      '@': path.resolve(appDir),
    },
  },
});
```

#### 3.2.3 Source-first resolution for Vitest (Nx “testing without building dependencies”)

- **Problem:** Vitest runs in SSR mode and will prefer `import`/`module` conditions, so packages
  with `exports` that only emit `dist` will fail in a clean repo if tests run before `pnpm build`.
- **Decision:** Add `resolve.conditions` **and** `ssr.resolve.conditions` to include the workspace
  custom condition first, then keep Node/Vite defaults:
  - `resolve.conditions: ['@repo/source', 'import', 'module', 'default']`
  - `ssr.resolve.conditions: ['@repo/source', 'node', 'import', 'module', 'default']`
- **Exports map:** Each package should expose a source condition
  (`\"@repo/source\": \"./src/index.ts\"`) and keep the compiled target for `import/default`.
- **References:** Nx guide “Testing Without Building Dependencies”
  (nx.dev/docs/technologies/test-tools/vitest/guides/testing-without-building-dependencies) and Vite
  SSR resolution docs (vite.dev/config/ssr-options#ssr-resolve-conditions).

### 3.3 vitest.setup.ts (Per-Project)

#### 3.3.1 Generic Package (packages/ui)

```typescript
import { afterEach } from 'vitest';

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Cleanup DOM after each test (§3.3)
afterEach(() => cleanup());
```

#### 3.3.2 Next.js App (apps/web)

```typescript
import { afterEach, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// Next.js app-specific mocks (§3.3.2)
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));
```

### 3.4 Root-Level Test Scripts (Nx Orchestration)

<!-- IMPROVED: Added section numbers for citability -->

```json
{
  "scripts": {
    "test": "nx run-many --target=test --all --parallel",
    "test:watch": "nx run-many --target=test --all --watch",
    "test:coverage": "nx run-many --target=test:coverage --all --parallel && node scripts/aggregate-coverage.mjs",
    "test:affected": "nx affected -t test"
  }
}
```

**Cite as:** §3.4

### 3.5 Per-Project Test Scripts (Individual Targets)

Each project's `package.json` exports targets recognized by Nx:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  }
}
```

**Cite as:** §3.5

### 3.6 Test File Structure

#### 3.6.1 Example: Button Component Test

```typescript
// Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**Cite as:** §3.6.1

### 3.7 React Testing Library Best Practices

#### 3.7.1 Query Priority (in order of preference)

1. `getByRole()` — most semantic, accessibility-first
2. `getByLabelText()` — for form inputs
3. `getByPlaceholderText()` — fallback for inputs
4. `getByText()` — for text content
5. `getByTestId()` — last resort only

**Cite as:** §3.7.1

#### 3.7.2 User Interactions

```typescript
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(element);
await user.type(inputElement, 'text');
await user.selectOptions(selectElement, ['option1', 'option2']);
```

**Cite as:** §3.7.2

#### 3.7.3 Async Operations

```typescript
// Use findBy* for async content
const element = await screen.findByText('Loaded Content');

// Or use waitFor for complex async scenarios
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

**Cite as:** §3.7.3

#### 3.7.4 What to Test

| Category                | Pattern                     | Example                                          | Cite As  |
| ----------------------- | --------------------------- | ------------------------------------------------ | -------- |
| **Props validation**    | Render with different props | `<Button size="lg" variant="primary" />`         | §3.7.4.1 |
| **User interactions**   | Click, type, select         | `await user.click(button)`                       | §3.7.4.2 |
| **Conditional render**  | Props control output        | `disabled={true}` hides button                   | §3.7.4.3 |
| **Error states**        | Invalid input handling      | `error="Email required"` shows message           | §3.7.4.4 |
| **Accessibility**       | ARIA attributes             | `role="button"` present                          | §3.7.4.5 |
| **Custom hooks**        | `renderHook()` in isolation | `const { result } = renderHook(() => useCart())` | §3.7.4.6 |
| **Utilities/functions** | Direct calls                | `expect(formatPrice(100)).toBe('$100')`          | §3.7.4.7 |

---

## 4. E2E Testing

### 4.1 Playwright Setup

#### 4.1.1 Installation

```bash
npm install -D @playwright/test
```

**Cite as:** §4.1.1

#### 4.1.2 playwright.config.ts (Complete Example)

```typescript
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  // Test files
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/*.setup.ts',

  // Execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // Reporting
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [] : [['list']]),
  ],

  // Global settings
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },

  // Global setup (login once for all tests)
  globalSetup: require.resolve('./tests/auth.setup.ts'),

  // Web server
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },

  // Browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Optional: mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

**Cite as:** §4.1.2

### 4.2 Per-Feature E2E Project Structure

```
apps/main-app-cart-e2e/
├── playwright.config.ts
├── tests/
│   ├── auth.setup.ts                 ← Shared login setup
│   ├── cart-add-item.spec.ts
│   ├── cart-checkout.spec.ts
│   └── fixtures/
│       └── test-data.ts
├── package.json
└── tsconfig.json
```

**Cite as:** §4.2

### 4.3 Global Auth Setup (Reusable)

```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

const authFile = 'test-results/.auth.json';

setup('authenticate user', async ({ page, context }) => {
  // Navigate to login
  await page.goto('/login');

  // Fill credentials
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard');

  // Save auth state
  await context.storageState({ path: authFile });
});
```

**Cite as:** §4.3

### 4.4 Playwright Best Practices

| Aspect        | Do (✓)                        | Don't (✗)                     | Cite As |
| ------------- | ----------------------------- | ----------------------------- | ------- |
| **Locators**  | Use `getByRole()`             | Avoid hardcoded CSS selectors | §4.4.1  |
| **Waits**     | Let Playwright auto-wait      | Don't use `setTimeout()`      | §4.4.2  |
| **Auth**      | Use `globalSetup` for auth    | Don't login in each test      | §4.4.3  |
| **Data**      | Use test fixtures & factories | Don't create data in UI tests | §4.4.4  |
| **Isolation** | Each test independent         | Don't depend on test order    | §4.4.5  |
| **Debugging** | Use `--debug` or `--headed`   | Don't use `console.log()`     | §4.4.6  |

---

## 5. Feature-Based Testing Strategy

### 5.1 Organization by Feature

Tests for a feature (e.g., "Shopping Cart") live together:

```
features/cart/
├── components/
│   ├── CartItem/
│   │   ├── CartItem.tsx
│   │   └── CartItem.test.tsx
│   ├── CartSummary/
│   │   ├── CartSummary.tsx
│   │   └── CartSummary.test.tsx
├── hooks/
│   ├── useCart.ts
│   └── useCart.test.ts
├── __tests__/
│   └── cart.integration.test.tsx  ← Multi-component
└── e2e/
    ├── add-to-cart.spec.ts
    ├── checkout.spec.ts
    └── fixtures/
        └── cart-data.ts
```

**Cite as:** §5.1

### 5.2 E2E Project per Major Feature (Optional)

```
apps/cart-e2e/
├── playwright.config.ts
├── tests/
│   ├── auth.setup.ts
│   ├── add-item.spec.ts
│   ├── checkout-flow.spec.ts
│   └── fixtures/
│       └── product-data.ts
├── package.json
└── tsconfig.json
```

**Cite as:** §5.2

---

## 6. Commands & Workflows

### 6.1 Running Tests

| Command              | Purpose                                     | Cite As |
| -------------------- | ------------------------------------------- | ------- |
| `pnpm test`          | Run all unit & integration tests (parallel) | §6.1.1  |
| `pnpm test:watch`    | Watch mode; rerun on file change            | §6.1.2  |
| `pnpm test:coverage` | Generate coverage report; check thresholds  | §6.1.3  |
| `pnpm test:affected` | Run tests for changed packages (Nx)         | §6.1.4  |
| `pnpm e2e`           | Run all Playwright E2E tests                | §6.1.5  |
| `pnpm e2e:headed`    | Run E2E tests with visible browser window   | §6.1.6  |
| `pnpm e2e:debug`     | Run E2E with step-by-step debugger          | §6.1.7  |

---

## 7. Coverage & Quality Gates

### 7.1 Coverage Targets (Mandatory)

| Metric     | Minimum | Target | Excluded From Coverage                 | Cite As |
| ---------- | ------- | ------ | -------------------------------------- | ------- |
| Lines      | 65%     | 75-80% | \*.test.ts(x), index.ts, dist/, .next/ | §7.1.1  |
| Functions  | 65%     | 75-80% | (same)                                 | §7.1.2  |
| Branches   | 60%     | 70%    | (same)                                 | §7.1.3  |
| Statements | 65%     | 75-80% | (same)                                 | §7.1.4  |

**For philosophy on coverage goals, see
[testing_strategy.md § 12](./testing_strategy.md#12-coverage-goals).**

### 7.2 Quality Gates (All MUST pass before merge)

| Gate             | Command              | Threshold                | Cite As |
| ---------------- | -------------------- | ------------------------ | ------- |
| **Format Check** | `pnpm format:check`  | 0 format violations      | §7.2.1  |
| **Lint**         | `nx lint`            | 0 errors (warnings ok)   | §7.2.2  |
| **Typecheck**    | `nx typecheck`       | 0 errors                 | §7.2.3  |
| **Unit Tests**   | `nx test --coverage` | ≥65% lines, ≥70% overall | §7.2.4  |
| **E2E Tests**    | `nx affected -t e2e` | 0 failures               | §7.2.5  |
| **Build**        | `nx build`           | 0 errors                 | §7.2.6  |

**Enforcement:** All gates block PR merge. CI must pass before hand-off to QA.

---

## 8. Anti-Patterns & Forbidden Practices

**For the complete anti-patterns list and rationale, see
[testing_strategy.md § 11](./testing_strategy.md#11-anti-patterns-what-not-to-test).**

Key forbidden practices enforced in this spec:

- Test implementation details (state, private methods) — Brittle; breaks on refactor
- 100% coverage obsession — Diminishing returns; target 70-80%
- Snapshot tests — Hard to review in PRs
- Flaky E2E tests (timeouts, no waits) — Use Playwright auto-wait
- Shared test state between tests — Each test must be independent
- `__tests__` folders instead of colocated — Use `.test.tsx` colocated pattern per §3.1

**Cite as:** §8

---

## 9. Spec Discipline

**This spec is binding and definitive.** All code must follow these rules:

### 9.1 Mandatory Requirements

- **Test file placement** (§3.1): Always colocated `.test.tsx` in same directory
- **Test framework** (§2.3): Vitest for unit/integration, Playwright for E2E
- **Naming** (§3.1): `filename.test.tsx` (not `__tests__/filename.tsx`)
- **Coverage targets** (§7.1): Minimum 65-70%, target 75-80%
- **Organization** (§5): Feature-scoped E2E projects, colocated unit tests
- **Quality gates** (§7.2): All gates must pass before merge

**Deviation Requires:** Explicit spec update + team consensus.

**Cite as:** §9.1

---

## 10. Dependencies & References

### Related Specifications

- **High-level spec:** [../../README.md § Engineering Specs](../README.md)
- **Testing Strategy (Philosophy & Principles):** [testing_strategy.md](./testing_strategy.md) —
  Covers why we test, testing trophy distribution, tools rationale, anti-patterns philosophy. Read
  this first for context.
- **Performance & Accessibility:**
  [../system/perf_accessibility.md § 4 (Validation)](../system/perf_accessibility.md#4-validation--quality-gates)

### External Resources

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro)
- [Playwright Documentation](https://playwright.dev)
- [Nx Testing Guide](https://nx.dev/docs/guides/testing)
- [Next.js Testing Guide](https://nextjs.org/docs/app/guides/testing)
- [Feature-Based Testing Strategy](https://nx.dev/docs/guides/tips-n-tricks/feature-based-testing)

**Cite as:** §10

---

## 11. Changelog

| Date       | Version | Editor | Summary                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-02 | 1.2     | @agent | Removed duplication with testing_strategy.md: Consolidated testing pyramid to reference strategy §2, removed duplicate tools table, eliminated anti-patterns table (reference strategy §11), added coverage philosophy ref to strategy §12; clarified scope boundary (implementation only); added cross-references throughout |
| 2025-12-02 | 1.1     | @agent | Upgraded from "Definitive" to "Active" status; added § numbering for citability; quantified coverage thresholds; expanded scope & out-of-scope; added cross-refs to testing_strategy.md & perf_accessibility.md; converted tables to numbered format; added mandatory spec discipline section                                 |
| 2025-12-02 | 1.0     | legacy | Initial version (status: Definitive)                                                                                                                                                                                                                                                                                          |

---

## Summary of Improvements

- Added formal document metadata (Version 1.1, Last Updated Dec 2 2025, Status: Active)
- Added Quick Navigation with anchor links for easy citation
- Added explicit "In Scope" and "Out of Scope" sections
- **Numbered all major sections (§1–§11)** for full citability
- **Numbered all subsections** (§2.1, §2.2, §3.1, etc.) with table-based organization
- Converted coverage targets to numbered table with minimum/target thresholds
- Made quality gates explicit and numbered (§7.2) with command/threshold pairs
- Added Anti-Patterns section with forbidden practices numbered and citable
- Added Dependencies & References section with cross-refs to related specs (testing_strategy.md,
  perf_accessibility.md)
- Added Spec Discipline section (§9) to make requirements binding
- Formatted changelog as proper table with actionable summary (old was inline text)
- Status upgraded from "Definitive (No Optionals)" to "Active" (all sections complete, all
  requirements citable, changelog present)
- Bumped version from 1.0 → 1.1
