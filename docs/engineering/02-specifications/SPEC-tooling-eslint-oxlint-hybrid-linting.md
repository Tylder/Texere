---
type: SPEC
status: active
stability: stable
created: 2026-01-09
last_updated: 2026-01-09
area: tooling
feature: hybrid-linting
summary_short: >-
  Hybrid linting with Oxlint for fast baseline checks and ESLint for type-aware validation and
  import ordering.
summary_long: >-
  Specifies the linting system for the monorepo: Oxlint runs first for near-instant baseline
  correctness checks, followed by ESLint for comprehensive type-aware rules, import ordering, and
  module boundary enforcement. This spec defines rule ownership, configuration structure, and the
  standard lint workflow used locally and in CI.
keywords:
  - linting
  - oxlint
  - eslint
related:
  - SPEC-tooling-prettier-formatting-centralized
  - SPEC-tooling-typescript-strict-project-references
index:
  sections:
    - title: 'TLDR'
      lines: [84, 97]
      summary:
        'Oxlint provides fast baseline checks; ESLint provides deep type-aware validation and owns
        import ordering.'
      token_est: 60
    - title: 'Scope'
      lines: [99, 115]
      summary:
        'Covers linting tools, rule ownership, and command workflow; excludes formatting (Prettier).'
      token_est: 71
    - title: 'Specification'
      lines: [117, 155]
      summary:
        'Oxlint runs first for fast correctness checks; ESLint runs next for deep, type-aware rules.'
      token_est: 184
    - title: 'Workflow'
      lines: [157, 167]
      summary: 'Use fast linting for feedback and full linting for CI gates.'
      token_est: 73
    - title: 'Rationale'
      lines: [169, 177]
      summary: 'Combines speed and depth without sacrificing rule coverage.'
      token_est: 51
    - title: 'Alternatives Considered'
      lines: [179, 187]
      summary: 'Single-tool approaches either lack depth or are too slow.'
      token_est: 54
    - title: 'Consequences'
      lines: [189, 204]
      summary: 'Faster feedback with slightly more tooling complexity.'
      token_est: 60
    - title: 'Verification Approach'
      lines: [206, 213]
      summary: 'CI requires full linting; developers can run fast linting locally.'
      token_est: 36
    - title: 'Design Decisions'
      lines: [215, 225]
      summary: 'Hybrid linting with ESLint owning import ordering.'
      token_est: 73
    - title: 'Blockers'
      lines: [227, 235]
      summary: 'None.'
      token_est: 43
    - title: 'Assumptions'
      lines: [237, 246]
      summary: 'Assumes rule ownership remains stable and the two-tool workflow is accepted.'
      token_est: 101
    - title: 'Unknowns'
      lines: [248, 254]
      summary: 'Future scaling may require lint performance tuning.'
      token_est: 69
---

# SPEC-tooling-eslint-oxlint-hybrid-linting

---

## TLDR

Summary: Oxlint provides fast baseline checks; ESLint provides deep type-aware validation and owns
import ordering.

**What:** Two-stage linting pipeline (Oxlint then ESLint)

**Why:** Fast feedback without losing comprehensive correctness checks

**How:** `pnpm lint:fast` for Oxlint, `pnpm lint` for Oxlint + ESLint

**Status:** Active

---

## Scope

Summary: Covers linting tools, rule ownership, and command workflow; excludes formatting (Prettier).

**Includes:**

- Oxlint baseline checks
- ESLint type-aware rules and module boundary enforcement
- Import ordering rules and resolver configuration
- Lint command workflow

**Excludes:**

- Formatting rules (handled by Prettier)
- TypeScript compiler configuration (handled by TypeScript spec)

---

## Specification

Summary: Oxlint runs first for fast correctness checks; ESLint runs next for deep, type-aware rules.

### Oxlint (fast baseline)

- Runs in ~100ms for the monorepo
- Catches obvious correctness issues and suspicious patterns
- No custom configuration required
- Command: `pnpm lint:fast`

### ESLint (comprehensive validation)

- Runs after Oxlint, includes type-aware rules
- Rule categories include:
  - Type safety: `no-explicit-any`, `no-unsafe-*`, `explicit-function-return-type`
  - Async safety: `no-floating-promises`, `no-misused-promises`
  - Dead code: `no-unused-vars`, `no-unused-parameters`
  - Import organization: `import/order`, `consistent-type-imports`
  - Monorepo discipline: `no-restricted-imports` for cross-package boundaries
  - Module boundaries: `@nx/enforce-module-boundaries`

### Import Ordering (ESLint owns this)

1. Node builtins (`node:fs`)
2. External packages
3. Scoped packages
4. Workspace imports (`@repo/*`)
5. Absolute aliases (`@/*`)
6. Parent imports (`../config`)
7. Sibling imports (`./helper`)

### Configuration Structure

- Root config: `eslint.config.mjs` (flat config)
- Shared base: `packages/eslint-config/base.js`
- Resolver: `eslint-import-resolver-typescript`

---

## Workflow

Summary: Use fast linting for feedback and full linting for CI gates.

| Command          | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `pnpm lint:fast` | Oxlint only, fast baseline checks        |
| `pnpm lint`      | Oxlint + ESLint full validation          |
| `pnpm lint:fix`  | Auto-fixable rules via Oxlint and ESLint |

---

## Rationale

Summary: Combines speed and depth without sacrificing rule coverage.

- Oxlint keeps feedback loops tight for developers.
- ESLint enforces type-aware rules and monorepo discipline.
- ESLint owns import ordering to prevent tool conflicts with Prettier.

---

## Alternatives Considered

Summary: Single-tool approaches either lack depth or are too slow.

- ESLint only: comprehensive but slow for tight loops
- Oxlint only: fast but lacks type-aware rules
- Prettier + ESLint import sorting: conflicts with lint ownership

---

## Consequences

Summary: Faster feedback with slightly more tooling complexity.

**Positive:**

- Fast baseline checks for local iteration
- Strong type-aware enforcement in CI
- Clear rule ownership between tools

**Negative:**

- Two tools to maintain and understand
- ESLint performance cost for full runs

---

## Verification Approach

Summary: CI requires full linting; developers can run fast linting locally.

- CI gate uses `pnpm lint`
- Local iteration uses `pnpm lint:fast`

---

## Design Decisions

Summary: Hybrid linting with ESLint owning import ordering.

| Field      | Decision 001: Oxlint + ESLint hybrid             |
| ---------- | ------------------------------------------------ |
| **Title**  | Hybrid linting pipeline                          |
| **Chosen** | Oxlint for baseline; ESLint for type-aware rules |
| **Why**    | Speed for dev loops, depth for correctness       |

---

## Blockers

Summary: None.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | n/a    | n/a           | Low    |

---

## Assumptions

Summary: Assumes rule ownership remains stable and the two-tool workflow is accepted.

| Assumption                                        | Validation Method   | Confidence | Impact if Wrong              |
| ------------------------------------------------- | ------------------- | ---------- | ---------------------------- |
| ESLint can remain the source of truth for imports | Lint rule audits    | High       | Would require tooling change |
| Oxlint coverage remains adequate for baseline     | Lint results review | Medium     | Might add custom rules       |

---

## Unknowns

Summary: Future scaling may require lint performance tuning.

| Question                                  | Impact | Resolution Criteria      | Owner | ETA |
| ----------------------------------------- | ------ | ------------------------ | ----- | --- |
| Will ESLint performance degrade at scale? | Medium | Measure lint times in CI | Team  | TBD |
