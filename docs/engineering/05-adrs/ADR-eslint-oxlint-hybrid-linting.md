---
doc_type: adr
domain: virtual_influencer_code_quality
reference_prefix: ADR-VI-TECH
adr_id: ADR-VI-TECH-3
status: accepted
version: 1.0
decision_date: 2026-01-09
last_updated: 2026-01-09
effective_date: 2026-01-09
author: @agent
---

# ADR-VI-TECH-3: Hybrid Linting — Oxlint + ESLint for Speed & Depth

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR with status Superseded on this
one.

**Summary:** We adopt a hybrid linting strategy combining Oxlint (fast baseline checks, ~100ms) and
ESLint (comprehensive type-aware rules, ~5–10s). Oxlint runs first for rapid feedback; ESLint
provides deeper validation. Together they enforce code quality, type safety, import organization,
module boundaries, and async safety across the monorepo.

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
| [Workflow](#workflow)                               | Workflow                  | You need this information                 |
| [Notes](#notes)                                     | Additional context        | You need this information                 |
| [Changelog](#changelog)                             | Version history           | You want version history                  |

---

## References

**Driven by:** Fast feedback loops, comprehensive type-aware validation, monorepo scalability  
**Specified by:** [eslint_code_quality.md](../../specs/engineering/eslint_code_quality.md)  
**Related:**

- [ADR-VI-TECH-2](./ADR-VI-TECH-2-prettier-formatting-centralized.md) (Prettier owns formatting)
- [ADR-VI-TECH-4](./ADR-VI-TECH-4-typescript-strict-project-references.md) (TypeScript strict mode)
- [ADR-VI-TECH-1](./ADR-VI-TECH-1-frontend-tech-stack.md) (tech stack)  
  **Implemented by (current):** Root `eslint.config.mjs`, `packages/eslint-config/base.js`,
  per-package configs

---

## Statement

In the context of a large TypeScript monorepo requiring fast local feedback and comprehensive
validation, facing the trade-off between speed and depth, we decided to adopt a **hybrid approach:
Oxlint (instant baseline checks) followed by ESLint (type-aware comprehensive rules)**, with ESLint
owning import ordering to prevent tool conflicts. This enables rapid iteration (`pnpm lint:fast`)
while maintaining high code quality standards via type-aware rules and module boundary enforcement.

---

## Context

- **Fast feedback needed:** developers iterate frequently; 5–10s ESLint wait is too long for every
  change
- **Type-aware rules required:** monorepo has complex data flows that need static type validation
- **Import consistency required:** monorepo discipline requires enforcing workspace imports and
  proper module boundaries
- **Async safety critical:** orchestrator workflows have extensive Promise/async chains; runtime
  failures from unhandled promises are expensive
- **Current setup proven:** Oxlint + ESLint hybrid already in use in production

---

## Decision

### Oxlint: Fast Baseline Checks

**Runs:** Synchronously, ~100ms for monorepo

**Detects:**

- Correctness issues (dead code, obvious errors)
- Suspicious patterns (unreachable code, infinite loops)
- Best practices (const/let, equality checks)

**Configuration:** None required; works out of the box via `eslint-plugin-oxlint`

**Command:** `pnpm lint:fast` (oxlint only)

### ESLint: Comprehensive Type-Aware Validation

**Runs:** After Oxlint, ~5–10s depending on monorepo size (includes type checking)

**Core Rules by Category:**

| Category                | Rules                                                                       | Details                                                                 |
| ----------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Type Safety**         | `no-explicit-any`, `no-unsafe-*` (5 rules), `explicit-function-return-type` | All functions must have return types; no `any` in source (off in tests) |
| **Async Safety**        | `no-floating-promises`, `no-misused-promises`                               | Promises must be awaited; prevent Promise in array methods              |
| **Dead Code**           | `no-unused-vars`, `no-unused-parameters`                                    | Catch unused code; prefix with `_` to ignore                            |
| **Import Organization** | `import/order`, `import/no-default-export`, `consistent-type-imports`       | Enforced import order; type-only imports use `import type`              |
| **Monorepo Discipline** | `no-restricted-imports` (block relative cross-package imports)              | Force `@repo/*` for cross-package imports; prevent `../../../`          |
| **Module Boundaries**   | `@nx/enforce-module-boundaries` (tag-based dep constraints)                 | Prevents runtime:web importing runtime:server, etc.                     |

### Import Ordering (ESLint owns this)

**ESLint Rule:** `import/order` (via `eslint-plugin-import`)

**Order (enforced, auto-fixable):**

1. Node.js builtins: `node:fs`, `node:path`
2. External packages: `zod`, `axios`, `vitest`
3. Scoped packages: `@babel/core`, `@testing-library/react`
4. Workspace imports: `@repo/*`
5. Absolute aliases: `@/*`
6. Parent imports: `../config`
7. Sibling imports: `./helper`

**Why ESLint:**

- Single source of truth (not Prettier)
- Type-aware resolver: `eslint-import-resolver-typescript`
- Auto-fixable: `eslint --fix` reorders consistently

### Configuration Structure

**Root:** `eslint.config.mjs` (ESLint flat config)

**Shared Base:** `packages/eslint-config/base.js`

- Contains all shared rules, plugins, type-checking setup
- Distributed to all packages via export

**Per-Package Configs** (if needed):

- Can extend base and add package-specific rules
- Examples: Next.js apps (allow default exports), backend packages (relax certain rules)
- Provided at `packages/eslint-config/next.js`, `packages/eslint-config/react-internal.js`

### Type Checking via ProjectService

**Enabled for:** Source files (src/_, lib/_, app/\*)

```javascript
{
  languageOptions: {
    parserOptions: {
      projectService: true,  // Infer tsconfig.json per-file
    }
  }
}
```

**Disabled for:**

- Test files (`*.test.ts`, `*.spec.tsx`) — separate tsconfig.spec.json not in project references
- Config files (`vitest.config.ts`, `*.config.js`)
- Files outside project graph

### Per-File Rule Relaxations

**Test files:**

- Type checking disabled (`projectService: false`)
- Unsafe type rules disabled (`@typescript-eslint/no-unsafe-*` off)
- Rationale: test mocks and utilities often require `any` types

**Config files:**

- Filename naming convention check disabled
- Rationale: configs have standardized names like `vitest.config.ts`

**Next.js apps:**

- `import/no-default-export: off`
- Rationale: Next.js requires default exports for pages and API routes

### Module Boundary Enforcement

**Rule:** `@nx/enforce-module-boundaries`

**Tag-Based Constraints:**

```
runtime:web     → can depend on runtime:web, runtime:shared
runtime:edge    → can depend on runtime:edge, runtime:shared
runtime:server  → can depend on runtime:server, runtime:shared
runtime:shared  → can depend on runtime:shared only
```

**Prevents:** Accidental cross-layer imports (e.g., web importing server logic)

---

## Rationale

### Oxlint First

- **100ms feedback:** sub-second feedback enables tight iteration loops
- **Catches 80% of issues:** obvious errors, dead code, suspicious patterns
- **No configuration:** works out of the box
- **Complements ESLint:** ESLint handles the remaining 20% (type-aware, module boundaries)

### ESLint for Depth

- **Type-aware rules:** catches type errors (no-unsafe-any, unsafe-return)
- **Async safety:** catches unhandled promises, misused Promise in array methods
- **Import organization:** single source of truth for import order
- **Module boundaries:** enforces architecture decisions
- **Extensible:** ecosystem of plugins (`@nx/`, `import/`, `sonarjs/`, etc.)

### Hybrid Workflow

- **Fast iteration:** `pnpm lint:fast` for rapid feedback during development
- **Full validation:** `pnpm lint` before pushing (oxlint + ESLint)
- **Pre-commit gate:** Husky runs `pnpm quality` (lint, typecheck, test, build)

### Import Ordering in ESLint (not Prettier)

- **Single source of truth:** import/order rule, not scattered across tools
- **Resolver-aware:** knows about TypeScript paths and monorepo workspaces
- **Auto-fixable:** `eslint --fix` handles reordering
- **No conflicts:** avoids duplication with Prettier import plugins

### Tag-Based Module Boundaries

- **Declarative:** boundaries defined once in project tags
- **Enforced at lint time:** catches violations immediately
- **Scales:** no manual discipline required as monorepo grows
- **Example:** prevents web package from accidentally importing server logic

---

## Alternatives Considered

- **ESLint only (no Oxlint):** slower feedback (5–10s), developers iterate slower
- **Oxlint only (no ESLint):** insufficient depth, no type-aware rules, no module boundaries
- **Biome (all-in-one):** newer, smaller ecosystem; Oxlint + ESLint proven in production
- **Prettier for import sorting:** conflicts with ESLint, creates multiple sources of truth
- **No module boundaries:** architecture violations caught only in review

---

## Consequences

### Positive

- **Fast local feedback:** Oxlint (100ms) enables rapid iteration
- **Comprehensive validation:** ESLint catches 20% of issues Oxlint misses (types, async,
  boundaries)
- **Type safety:** type-aware rules prevent unsafe code patterns
- **Architecture enforcement:** module boundaries prevent cross-layer imports
- **Single source of truth:** import ordering owned by one rule
- **Extensible:** plugin ecosystem for domain-specific rules

### Negative

- **ESLint slowness:** ~5–10s for full validation (mitigated by `pnpm lint:fast` for fast iteration)
- **Type checking overhead:** type-aware rules require parsing tsconfig and type checking per-file
- **Oxlint + ESLint duplication:** some rules checked by both (minor overhead)
- **Configuration complexity:** multiple files (`eslint.config.mjs`, `packages/eslint-config/`,
  per-package configs)
- **Learning curve:** developers need to understand which tool owns which concerns

### Requires

- **Prettier integration:** see ADR-VI-TECH-2 (no import-sorting in Prettier)
- **TypeScript strict mode:** see ADR-VI-TECH-4 (needed for type-aware ESLint rules)
- **Nx tagging:** projects must be tagged with runtime constraints (`runtime:web`, `runtime:server`,
  etc.)
- **CI gate:** `pnpm lint` in CI before merging

---

## Workflow

| Command              | Duration | Purpose                                     |
| -------------------- | -------- | ------------------------------------------- |
| `pnpm lint:fast`     | ~100ms   | Oxlint only (rapid iteration)               |
| `pnpm lint`          | ~5–10s   | Oxlint + ESLint (full validation)           |
| `pnpm lint:fix`      | ~5–10s   | ESLint + Oxlint with `--fix` (auto-correct) |
| `pnpm lint:fix:fast` | ~100ms   | Oxlint `--fix` only                         |

---

## Notes

- **Version locking:** Oxlint 1.31.0, ESLint 9.39.1 (locked at major.minor for reproducibility)
- **Plugin versions:** `eslint-plugin-import` 2.32.0, `@nx/eslint-plugin` 22.1.3,
  `eslint-plugin-typescript-eslint` 8.48.1
- **Caching:** Nx caches lint target; inputs include src/ and eslint config
- **pnpm overrides:** None specific to linting
- **Pre-commit hook:** Husky runs `pnpm quality` (includes `pnpm lint`)
- **CI strategy:** `pnpm lint` (full validation); could potentially run `pnpm lint:fast` on every
  commit for faster feedback, then `pnpm lint` in CI

---

## Changelog

| Version | Date       | Status   | Notes                                                                                                                                         |
| ------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-09 | Accepted | **Latest & Effective.** Hybrid Oxlint (100ms) + ESLint (5–10s) for fast + deep validation. ESLint owns import ordering and module boundaries. |
