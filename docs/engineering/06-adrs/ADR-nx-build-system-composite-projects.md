---
doc_type: adr
domain: virtual_influencer_build_system
reference_prefix: ADR-VI-TECH
adr_id: ADR-VI-TECH-5
status: accepted
version: 1.0
decision_date: 2026-01-09
last_updated: 2026-01-09
effective_date: 2026-01-09
author: @agent
---

# ADR-VI-TECH-5: Nx Build System with TypeScript Composite Projects

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR with status Superseded on this
one.

**Summary:** We adopt Nx as the task orchestrator for a monorepo build system that respects
TypeScript composite project references. Each package declares dependencies in `tsconfig.lib.json`
(TypeScript) and `package.json` (pnpm), enabling Nx to infer correct build ordering, parallelize
safely, and cache incremental builds. All packages build via `tsc --build` with proper dependency
semantics.

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

**Driven by:** Monorepo scalability, incremental compilation, parallel build safety, cache
efficiency  
**Related:**

- [ADR-VI-TECH-4](./ADR-VI-TECH-4-typescript-strict-project-references.md) (TypeScript project
  references)
- [ADR-VI-TECH-1](./ADR-VI-TECH-1-frontend-tech-stack.md) (tech stack includes Nx)  
  **Implemented by (current):** Root `nx.json`, per-package `project.json`, root `tsconfig.json`
  (references)

---

## Statement

In the context of a large TypeScript monorepo with multiple interdependent packages, facing the need
to build packages in correct dependency order while enabling parallel execution and incremental
caching, we decided to adopt **Nx as the task orchestrator integrated with TypeScript composite
project references** such that dependency graphs are declared once (in `tsconfig.lib.json` and
`package.json`) and Nx respects them automatically, to achieve fast incremental builds, safe
parallel execution, and cache-driven efficiency without manual ordering boilerplate.

---

## Context

- **Multiple interdependent packages:** orchestration core, API layer, client applications
- **Type safety requires correct ordering:** TypeScript composite projects enforce build order via
  `references` array
- **Parallel execution needed:** teams iterate in parallel; sequential builds too slow
- **Cache efficiency critical:** rebuilds should only touch changed packages and dependents
- **Monorepo at scale:** as packages grow from 2 → 20+, manual build coordination becomes untenable

---

## Decision

### Dependency Graph: TypeScript + Nx + pnpm

**Single source of truth (declared in two places):**

**In `tsconfig.lib.json` (per package):**

```json
{
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true
  },
  "references": [{ "path": "../core/tsconfig.lib.json" }]
}
```

**In `package.json` (per package):**

```json
{
  "dependencies": {
    "@repo/core": "workspace:^"
  }
}
```

**Why both:**

- TypeScript uses `references` to enforce build order during compilation
- pnpm uses dependencies to manage versions and symlinks
- Nx reads both to infer complete dependency graph

### Nx Task Dependency Graph

**In each project's `project.json`:**

```json
{
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{workspaceRoot}/dist/packages/<name>"],
      "inputs": ["default", "{projectRoot}/tsconfig.lib.json", "{projectRoot}/src/**"],
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

**Key:** `"dependsOn": ["^build"]` tells Nx: "This build depends on all dependency packages' build
tasks."

### Build Targets Configuration

**Library Projects** (`packages/*/project.json`):

```json
{
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{workspaceRoot}/dist/packages/<name>"],
      "inputs": ["default", "{projectRoot}/tsconfig.lib.json", "{projectRoot}/src/**"],
      "dependsOn": ["^build"],
      "cache": true
    },
    "check-types": {
      "executor": "nx:run-script",
      "options": { "script": "check-types" },
      "inputs": [
        "default",
        "{projectRoot}/tsconfig.json",
        "{projectRoot}/tsconfig.lib.json",
        "{projectRoot}/src/**",
        "{projectRoot}/tests/**"
      ],
      "cache": true
    },
    "test": {
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
    "lint": {
      "executor": "nx:run-script",
      "options": { "script": "lint" },
      "inputs": ["default", "{projectRoot}/src/**", "{projectRoot}/eslint.config.*"],
      "cache": true
    }
  }
}
```

**Application Projects** (`apps/*/project.json`):

```json
{
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": [
        "{workspaceRoot}/dist/apps/<name>",
        "{projectRoot}/.cache/tsconfig.lib.tsbuildinfo"
      ],
      "inputs": ["default", "{projectRoot}/tsconfig.lib.json", "{projectRoot}/src/**"],
      "dependsOn": ["^build"],
      "cache": true
    },
    "dev": {
      "executor": "nx:run-script",
      "options": { "script": "dev" },
      "cache": false
    },
    "start": {
      "executor": "nx:run-script",
      "options": { "script": "start" }
    }
  }
}
```

### Workspace-Level Defaults (`nx.json`)

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": [
        "{projectRoot}/src/**",
        "{projectRoot}/package.json",
        "{projectRoot}/tsconfig.json",
        "{projectRoot}/vite.config.ts",
        "{projectRoot}/vite.config.js",
        "{projectRoot}/next.config.js",
        "{projectRoot}/.env*"
      ],
      "outputs": [
        "{workspaceRoot}/dist/{projectRoot}",
        "{projectRoot}/.cache/tsconfig.lib.tsbuildinfo",
        "{projectRoot}/.cache/tsconfig.spec.tsbuildinfo"
      ],
      "cache": true
    },
    "check-types": {
      "dependsOn": ["^check-types"],
      "inputs": [
        "{projectRoot}/src/**",
        "{projectRoot}/package.json",
        "{projectRoot}/tsconfig.json",
        "{projectRoot}/tsconfig*.json"
      ],
      "cache": true
    },
    "test": {
      "dependsOn": ["^test"],
      "inputs": [
        "{projectRoot}/src/**",
        "{projectRoot}/tests/**",
        "{projectRoot}/vitest.config.ts",
        "{projectRoot}/package.json"
      ],
      "outputs": ["{projectRoot}/.test/**"],
      "cache": true
    },
    "test:coverage": {
      "dependsOn": ["^test:coverage"],
      "inputs": [
        "{projectRoot}/src/**",
        "{projectRoot}/tests/**",
        "{projectRoot}/vitest.config.ts",
        "{projectRoot}/package.json"
      ],
      "outputs": ["{projectRoot}/coverage/**"],
      "cache": true
    },
    "lint": {
      "inputs": [
        "{projectRoot}/src/**",
        "{projectRoot}/tests/**",
        "{workspaceRoot}/eslint.config.mjs"
      ],
      "cache": true
    },
    "format": {
      "cache": false
    },
    "dev": {
      "cache": false
    }
  }
}
```

### Build Scripts in `package.json`

**Library:**

```json
{
  "scripts": {
    "build": "tsc -b tsconfig.lib.json",
    "check-types": "tsc -b tsconfig.json",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --cache"
  }
}
```

**Application:**

```json
{
  "scripts": {
    "build": "tsc -b tsconfig.lib.json",
    "dev": "tsc --noEmit && tsx watch src/main.ts",
    "start": "node dist/main.js"
  }
}
```

### Monorepo-Level Build Commands

| Command                 | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `pnpm build`            | Parallel build all packages in dependency order            |
| `pnpm typecheck`        | Type-check all packages (incremental)                      |
| `pnpm test`             | Test all packages in parallel                              |
| `pnpm test:coverage`    | Test all packages with coverage aggregation                |
| `pnpm lint`             | Lint all packages                                          |
| `pnpm post:report:fast` | Fast validation loop (lint + typecheck + test:coverage)    |
| `pnpm post:report`      | Full validation (format + lint + typecheck + test + build) |

---

## Rationale

### Composite Builds Drive Ordering

- TypeScript's `composite` flag and `references` array define the authoritative dependency graph
- `tsc --build` respects this ordering and enables incremental compilation
- Nx reads these declarations to infer task dependencies

### Nx Respects Package Dependencies

- When Nx sees `"dependsOn": ["^build"]`, it reads `package.json` dependencies
- This ensures compliance with TypeScript's requirements without manual configuration
- Single source of truth: declare once, both tools respect it

### Parallel Execution is Safe

- Nx's dependency resolution prevents concurrent builds of projects with implicit ordering
  constraints
- TypeScript composite semantics are preserved; no race conditions
- Caching ensures only changed packages rebuild

### One Build Command Per Project

- Each project has a single `build` script running `tsc -b tsconfig.lib.json`
- Nx calls this via `nx:run-script` (non-batch execution)
- Repeatable: works identically in CI and local development

### Nx Caching Optimizes Rebuilds

- Task caching and `.tsbuildinfo` files enable incremental builds
- Only changed projects and their dependents rebuild
- Massive speedup on large monorepos

### Development and CI Are Identical

- Both use `pnpm build` or `pnpm post:report:fast` during development
- CI uses same commands, ensuring no "works on my machine" surprises
- Full `pnpm post:report` ends with `pnpm clean` to remove artifacts after validation

---

## Alternatives Considered

- **Sequential builds (no Nx):** simpler initially, but slow for large monorepos; developers blocked
- **Manual ordering via shell scripts:** error-prone, hard to parallelize, no caching
- **Turbo instead of Nx:** solid for CI, but Nx provides more integrated tooling
- **No TypeScript composite projects:** lose incremental compilation and safety guarantees
- **Duplicate dependency declarations:** maintenance nightmare; easy to get out of sync

---

## Consequences

### Positive

- **Fast incremental builds:** only changed packages and dependents rebuild
- **Safe parallelization:** Nx enforces TypeScript dependency ordering automatically
- **Cache efficiency:** build artifacts cached per package
- **Single source of truth:** dependencies declared once, both TypeScript and Nx respect them
- **Developer experience:** `pnpm build` just works; no manual ordering needed
- **CI/CD efficiency:** same commands work locally and in CI

### Negative

- **Configuration complexity:** multiple `project.json` files and `nx.json` defaults to maintain
- **`.tsbuildinfo` overhead:** incremental build info files must be tracked and cleaned properly
- **IDE synchronization:** TypeScript server must be restarted after new projects added
- **Learning curve:** developers need to understand `dependsOn`, project references, and caching
- **Debugging difficulty:** if builds fail in wrong order, root cause can be hard to trace

### Requires

- **TypeScript project references:** see ADR-VI-TECH-4
- **Proper `nx.json` configuration:** must define target defaults and caching rules
- **`nx sync` after project changes:** must regenerate project references
- **CI gate:** `pnpm build` must pass before merging
- **Developer education:** documentation on `dependsOn`, TypeScript composite projects, `nx sync`

---

## Contributor Workflow

### Adding a New Package

1. Generate with Nx: `nx generate @nx/node:library --name=my-lib`
2. Create `project.json` with `build` target including `"dependsOn": ["^build"]`
3. Set up TypeScript configs with proper `references` array
4. Add build script to `package.json`: `"build": "tsc -b tsconfig.lib.json"`
5. Run `nx sync` to regenerate root `tsconfig.json` references
6. Validate: `pnpm build` should build your package in correct order

### Debugging Build Order

If `tsc` fails with "TS6305: Project X is not listed..." during parallel build:

- Check `package.json` dependencies are listed
- Check `tsconfig.lib.json` has correct `references`
- Verify `project.json` has `"dependsOn": ["^build"]`
- Run `nx sync` to ensure root references are up-to-date

---

## Troubleshooting

| Issue                                       | Solution                                                  |
| ------------------------------------------- | --------------------------------------------------------- |
| TS6305 during parallel build                | Check package.json deps + tsconfig references + dependsOn |
| Incremental builds not working              | Verify `.tsbuildinfo` outputs in nx.json                  |
| IDE shows errors but build passes           | Restart TypeScript server in IDE                          |
| pnpm build uses stale cache                 | Run `pnpm clean` to clear all caches                      |
| `nx sync` doesn't update root tsconfig.json | Verify nx.json is valid JSON                              |

---

## Notes

- **Nx version:** 22.3.1 (locked at major.minor)
- **Executor:** `nx:run-script` (non-batch; executes npm scripts in order)
- **Cache location:** `.nx/cache/` (gitignored)
- **Build artifacts:** `dist/` per package and `dist/packages/` root convention
- **TypeScript cache:** `.tsbuildinfo` files must be included in Nx outputs
- **pnpm version:** 10.23.0 (uses `workspace:^` protocol for deps)

---

## Changelog

| Version | Date       | Status   | Notes                                                                                                                                      |
| ------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2026-01-09 | Accepted | **Latest & Effective.** Nx orchestrates builds respecting TypeScript composite project dependencies. Safe parallel execution with caching. |
