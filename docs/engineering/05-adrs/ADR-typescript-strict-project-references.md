---
doc_type: adr
domain: virtual_influencer_code_quality
reference_prefix: ADR-VI-TECH
adr_id: ADR-VI-TECH-4
status: accepted
version: 1.0
decision_date: 2026-01-09
last_updated: 2026-01-09
effective_date: 2026-01-09
author: @agent
---

# ADR-VI-TECH-4: TypeScript Strict Mode & Project References

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR with status Superseded on this
one.

**Summary:** We adopt strict TypeScript configuration (ES2023 target, NodeNext module resolution,
comprehensive safety flags) and TypeScript project references across all packages to enable
incremental type checking, catch errors before runtime, and maintain type safety at scale. All
packages type-check against each other via `tsc --build`.

---

## Quick Navigation

| Section                                             | Purpose                   | Read if...                                |
| --------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [References](#references)                           | Related documents         | You need related documents                |
| [Statement](#statement)                             | The actual decision       | You need the complete decision framing    |
| [Context](#context)                                 | Why we decided            | You're unfamiliar with the domain         |
| [Decision](#decision)                               | What we chose             | You're implementing or understanding this |
| [Rationale](#rationale)                             | Why this is better        | You need the full reasoning               |
| [Contributor Workflow](#contributor-workflow)       | Contributor Workflow      | You need this information                 |
| [Alternatives Considered](#alternatives-considered) | Options we rejected       | You disagree with the choice              |
| [Consequences](#consequences)                       | Positive/negative impacts | You're assessing cost/benefit             |
| [Workflow](#workflow)                               | Workflow                  | You need this information                 |
| [Notes](#notes)                                     | Additional context        | You need this information                 |
| [Changelog](#changelog)                             | Version history           | You want version history                  |

---

## References

**Driven by:** Type safety at scale, incremental builds, monorepo scalability  
**Specified by:**
[typescript_configuration.md](../../specs/engineering/typescript_configuration.md)  
**Related:**

- [ADR-VI-TECH-3](./ADR-VI-TECH-3-eslint-oxlint-hybrid-linting.md) (ESLint type-aware rules)
- [ADR-VI-TECH-1](./ADR-VI-TECH-1-frontend-tech-stack.md) (tech stack)  
  **Implemented by (current):** Root `tsconfig.base.json`, per-package configs (lib/spec split)

---

## Statement

In the context of a large TypeScript monorepo with complex data flows (workflows, checkpoints,
generation requests), facing the risk of runtime type errors and slow type-checking cycles, we
decided to adopt **strict TypeScript configuration (ES2023, NodeNext, safety flags) with project
references** (`tsc --build` for incremental type checking) to achieve type safety at scale, enable
cache-efficient builds, prevent cross-package type errors, and maintain "if it compiles, it works"
confidence.

---

## Context

- **Complex data structures:** orchestrator workflows and checkpoints have intricate types that
  require strict checking
- **Large monorepo:** multiple packages must type-check consistently without full rebuilds
- **Team velocity:** developers need fast type-checking feedback (incremental, not from-scratch)
- **Correctness:** type errors caught at compile time are cheaper than runtime errors in production

---

## Decision

### Root Configuration (`tsconfig.base.json`)

**Target & Module:**

- `target: "ES2023"`, `lib: ["ES2023"]` — modern JavaScript features, no transpilation needed
- `module: "NodeNext"` — Node.js ESM semantics for libraries
- `moduleResolution: "NodeNext"` — resolves via `package.json` `exports` maps
- `moduleDetection: "force"` — treat all files as modules

**Critical Principle: No `paths` or `baseUrl`**

- **Do NOT set:** `baseUrl` or `paths` in any tsconfig
- **Module boundaries:** defined by each package's `exports` map in package.json
- **Editors and `tsc`:** resolve through package.json, not aliased paths

**Strict Mode & Safety:**

- `strict: true` — all strict flags enabled
- Additional safety flags:
  - `exactOptionalPropertyTypes: true` — optional properties !== undefined
  - `noPropertyAccessFromIndexSignature: true` — disallow implicit index access
  - `noUncheckedIndexedAccess: true` — index access returns T | undefined
  - `useUnknownInCatchVariables: true` — catch (e) is unknown, not any
  - `noUnusedLocals: true` — error on unused variables
  - `noUnusedParameters: true` — error on unused parameters
  - `noImplicitReturns: true` — all code paths must return
  - `noFallthroughCasesInSwitch: true` — switch cases must break/return

**Module Resolution & Package Maps:**

- `resolvePackageJsonExports: true` — respect `exports` maps in package.json
- `resolvePackageJsonImports: true` — respect `imports` maps
- `customConditions: ["@repo/source"]` — custom export condition for development (points to src/,
  not dist/)
- `verbatimModuleSyntax: true` — preserve import/export syntax (don't drop types incorrectly)

**Build & Incremental:**

- `incremental: true` — cache build info for incremental builds
- `noEmitOnError: true` — don't output files if type check fails
- `sourceMap: true` — generate source maps for debugging
- `skipLibCheck: true` — skip type checking of @types packages (performance optimization)

**Module Boundaries:**

- `isolatedModules: true` — each file is a valid module (helps with build tools)
- `importHelpers: true` — use tslib for helpers (reduces bundle size)

### Per-Package Configuration Structure

#### Libraries (Node or React)

Each library has three TypeScript configs:

**`tsconfig.base.json`**

- Extends `@repo/typescript-config/node-library.json` or `react-library.json`
- Holds compiler options only
- Not used directly; reference via solution configs

**`tsconfig.json` (solution file)**

- **REQUIRED: `files: []`** (no source files, only references)
- `references: ["./tsconfig.lib.json", "./tsconfig.spec.json"]`
- Used by `tsc --build` and IDEs to understand project structure
- No `include` or `exclude` globs

**`tsconfig.lib.json` (runtime compilation)**

- `composite: true` — emits `.tsbuildinfo` for incremental builds
- `rootDir: "src"`
- `outDir: "dist"`
- `declaration: true` — emit `.d.ts` files
- `declarationMap: true` — map declarations back to source
- `sourceMap: true`
- `noEmitOnError: true`
- `references` list the package's workspace dependencies (e.g.,
  `[{"path": "../core/tsconfig.json"}]`)

**`tsconfig.spec.json` (test compilation)**

- `composite: true`
- Test-only types: `types: ["vitest/globals", "node"]`
- `include: ["src/**/*.test.ts", "src/**/*.spec.tsx"]` (or similar pattern per package)
- `references: [{"path": "./tsconfig.lib.json"}]` — tests depend on lib being compiled
- **No emit** (handled by Vitest directly)

#### Applications (Next.js)

**`tsconfig.json` (generated by Nx/Next)**

- Generated by Nx/Next plugin
- `moduleResolution: "Bundler"` (app-specific, not for libraries)
- Must include both `tsconfig.app.json` and `tsconfig.spec.json` as references for `tsc -b` to
  validate both

**`tsconfig.app.json`**

- App-specific compiler options

**`tsconfig.spec.json`**

- Test-specific compiler options

### Package.json Requirements

Every package must declare:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "sideEffects": false,
  "dependencies": {
    "@repo/core": "workspace:^"
  },
  "scripts": {
    "check-types": "tsc -b tsconfig.json",
    "build": "tsc -b tsconfig.lib.json"
  }
}
```

**Key Fields:**

- `"type": "module"` — enables ES modules
- `"exports"` — defines public API and type location for consumers
- `"sideEffects": false` — for publishable libraries (enables tree-shaking)
- `workspace:^` or `workspace:*` — internal deps (pnpm workspace protocol)
- `check-types: "tsc -b tsconfig.json"` — incremental type checking via project references
- `build: "tsc -b tsconfig.lib.json"` — compile runtime code to dist/

### Workspace Linking via pnpm

- Internal dependencies use `workspace:*` or `workspace:^`
- pnpm workspace protocol keeps versions in sync
- `nx sync` regenerates root `tsconfig.json` references after adding/moving projects

---

## Rationale

### ES2023 + NodeNext

- **Modern target:** ES2023 supports latest JavaScript features (no transpilation overhead)
- **NodeNext module resolution:** ensures libraries work correctly with Node.js ESM consumers
- **Correct semantics:** declaration output compatible with downstream consumers

### Strict Mode

- **Type safety at scale:** catches common errors (null/undefined misuse, unintended any types)
- **Confidence:** "if it compiles, it works" applies across the monorepo
- **Refactoring safety:** strict types catch breaking changes immediately
- **Long-term savings:** fewer runtime errors in production

### Safety Flags

- `exactOptionalPropertyTypes`: prevents subtle bugs where optional properties are treated as
  undefined
- `noUncheckedIndexedAccess`: index access can return undefined; prevents crashes
- `useUnknownInCatchVariables`: caught values are unknown, not any (forces explicit handling)
- `noUnusedLocals/Parameters`: catch dead code and accidental breakage

### Project References

- **Incremental builds:** only re-type-check packages that changed
- **Isolated type-checking:** each package's types are validated against its dependencies
- **Cache efficiency:** Nx can cache type-check results per package
- **IDE support:** editors can leverage project references for faster type information

### Split lib/spec Configs

- **Build clarity:** `tsc -b tsconfig.lib.json` compiles runtime code to dist/
- **Test isolation:** test files use separate `tsconfig.spec.json` with test-only types
- **No emit for tests:** tests run via Vitest, not compiled to dist/
- **Correct project references:** test config references lib config, ensuring lib is valid before
  tests run

### pnpm workspace: Protocol

- **Single source of truth:** internal dependencies versioned once in root package.json
- **No duplicate versions:** pnpm symlinks, avoiding duplication
- **Nx graph accuracy:** workspace dependencies clearly declared

---

## Contributor Workflow

### Adding or Moving a Project

1. **Generate with Nx:** `nx generate @nx/node:library --name=my-lib`
2. **Run `nx sync`:** updates root `tsconfig.json` with new project references
   - **What it does:** regenerates project configuration so Nx, TypeScript, and IDEs share the same
     graph
   - **When to run:** after adding, renaming, or moving a project; after changing tags/implicit deps
3. **Set up TypeScript configs:**
   - Extend `@repo/typescript-config/node-library.json` or `react-library.json` in
     `tsconfig.base.json`
   - Create `tsconfig.json` (solution file), `tsconfig.lib.json` (build), `tsconfig.spec.json`
     (tests) following the lib/spec pattern (§4.1)
4. **Update package.json:**
   - Add `"type": "module"`, `"exports"`, `"sideEffects": false` (if publishable)
   - Add `check-types` and `build` scripts
   - Add internal deps with `workspace:^`/`workspace:*`
5. **Verify:** `pnpm typecheck` should pass

### Commands

| Command                 | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `pnpm typecheck`        | `tsc --build` across all projects (incremental)               |
| `pnpm check:fast`       | Oxlint + typecheck (fast feedback loop)                       |
| `pnpm post:report:fast` | lint:fix + typecheck + test:coverage (local iteration)        |
| `nx sync`               | Regenerate `tsconfig.json` references (after adding projects) |

---

## Alternatives Considered

- **Relaxed TypeScript:** faster compilation, but misses errors; technical debt accumulates
- **Gradual strictness (allowJs, skipLibCheck):** inconsistent type safety; errors slip through
- **Per-package TypeScript versions:** divergence in type checking behavior; maintenance nightmare
- **No project references:** faster initial setup, but slower incremental builds; Nx caching less
  effective

---

## Consequences

### Positive

- **Type safety:** catches errors before runtime; "if it compiles, it works"
- **Incremental builds:** project references enable cache-efficient type checking
- **Refactoring confidence:** strict types prevent unintended breaking changes
- **Monorepo clarity:** each package's dependencies are explicit
- **IDE support:** faster type information, better autocomplete
- **Library compatibility:** declaration output works with Node.js ESM consumers

### Negative

- **Learning curve:** strict mode catches patterns that relaxed mode allows (e.g., optional types)
- **Project references complexity:** requires understanding of lib/spec split and `nx sync`
- **Mandatory `nx sync`:** after adding/moving projects, must run `nx sync` or type-checking breaks
- **Type-checking time:** ~1–2s per package (faster than Babel transpilation, but adds overhead)
- **strictNullChecks burden:** requires explicit handling of null/undefined everywhere

### Requires

- **Developer education:** strict mode, project references, `nx sync` workflow
- **CI gate:** `pnpm typecheck` before merging
- **Nx generators:** should scaffold projects with correct tsconfig structure
- **Contributing guide:** must document `nx sync` and TypeScript setup

---

## Workflow

| Command                 | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `pnpm typecheck`        | `tsc --build` across all projects (incremental)                          |
| `pnpm check:fast`       | Oxlint + typecheck (fast feedback loop)                                  |
| `pnpm post:report:fast` | lint:fix + typecheck + test:coverage                                     |
| `nx sync`               | Regenerate `tsconfig.json` references (run after adding/moving projects) |

### After Adding a New Project

1. Create package with Nx: `nx generate @nx/node:library --name=my-lib`
2. Run `nx sync`: updates root `tsconfig.json` to include new project references
3. Verify: `pnpm typecheck` should pass

---

## Notes

- **Version lock:** TypeScript 5.9.3 (locked at major.minor for reproducibility)
- **Shared configs:** `@repo/typescript-config` provides `node-library.json` and
  `react-library.json`
- **Custom conditions:** `@repo/source` condition in package.json exports allows development
  environment to import src/ directly (faster iteration, no build required)
- **skipLibCheck:** trades some type safety for faster type-checking (acceptable because
  node_modules should be pre-built)
- **Parallel type-checking:** ESLint type checking (via projectService) happens during lint;
  separate `tsc --build` at CI time ensures full validation
- **Root tsconfig.json:** auto-generated by `nx sync`, do not edit manually

---

## Changelog

| Version | Date       | Status   | Notes                                                                                                                                     |
| ------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-09 | Accepted | **Latest & Effective.** Strict TypeScript (ES2023, safety flags) with project references for incremental builds and type safety at scale. |
