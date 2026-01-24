---
type: SPEC
status: active
stability: stable
created: 2026-01-09
last_updated: 2026-01-09
area: tooling
feature: nx-composite-projects
summary_short: >-
  Nx orchestrates builds for TypeScript composite projects using dependency graphs from tsconfig
  references and package.json.
summary_long: >-
  Specifies the build system for the monorepo using Nx to orchestrate tasks and TypeScript composite
  project references for correct build ordering. Dependencies are declared in both
  `tsconfig.lib.json` references and `package.json` workspace deps, allowing Nx to infer task
  ordering, parallelize safely, and cache build results.
keywords:
  - nx
  - build-system
  - composite
related:
  - SPEC-tooling-typescript-strict-project-references
  - SPEC-tooling-testing-implementation-specification
index:
  sections:
    - title: 'TLDR'
      lines: [84, 97]
      summary:
        'Nx orchestrates builds based on TypeScript project references and pnpm workspace
        dependencies.'
      token_est: 62
    - title: 'Scope'
      lines: [99, 116]
      summary:
        'Covers Nx task orchestration and dependency declarations; excludes linting and testing
        rules.'
      token_est: 73
    - title: 'Specification'
      lines: [118, 175]
      summary: 'Nx uses TypeScript references and pnpm dependencies as the shared source of truth.'
      token_est: 189
    - title: 'Workflow'
      lines: [177, 186]
      summary: 'Contributors use Nx or package scripts to build with correct ordering.'
      token_est: 63
    - title: 'Rationale'
      lines: [188, 196]
      summary: 'Nx plus project references scales better than manual build sequencing.'
      token_est: 55
    - title: 'Alternatives Considered'
      lines: [198, 206]
      summary: 'Manual build scripts and custom orchestration are brittle at scale.'
      token_est: 58
    - title: 'Consequences'
      lines: [208, 223]
      summary: 'Faster builds and safer ordering with extra configuration in project.json.'
      token_est: 64
    - title: 'Verification Approach'
      lines: [225, 232]
      summary: 'CI validates builds through Nx and TypeScript.'
      token_est: 37
    - title: 'Design Decisions'
      lines: [234, 244]
      summary: 'Use Nx with TypeScript composite projects.'
      token_est: 67
    - title: 'Blockers'
      lines: [246, 254]
      summary: 'None.'
      token_est: 43
    - title: 'Assumptions'
      lines: [256, 265]
      summary: 'Assumes Nx continues to infer dependencies correctly.'
      token_est: 89
    - title: 'Unknowns'
      lines: [267, 273]
      summary: 'Future scale may require more granular build targets.'
      token_est: 72
---

# SPEC-tooling-nx-composite-projects

---

## TLDR

Summary: Nx orchestrates builds based on TypeScript project references and pnpm workspace
dependencies.

**What:** Nx task orchestration for composite TypeScript projects

**Why:** Ensure correct build order, parallelization, and caching at scale

**How:** Declare dependencies in `tsconfig.lib.json` and `package.json`, and use Nx targets

**Status:** Active

---

## Scope

Summary: Covers Nx task orchestration and dependency declarations; excludes linting and testing
rules.

**Includes:**

- Nx build target configuration
- Dependency graph derived from TypeScript and pnpm
- Build output paths and caching
- Contributor workflow for running builds

**Excludes:**

- TypeScript compiler flags (see TypeScript spec)
- Testing policy (see testing specs)

---

## Specification

Summary: Nx uses TypeScript references and pnpm dependencies as the shared source of truth.

### Dependency Graph Sources

**TypeScript (per package):** `tsconfig.lib.json` references define build ordering.

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

**pnpm (per package):** workspace dependencies define runtime links.

```json
{
  "dependencies": {
    "@repo/core": "workspace:^"
  }
}
```

Nx reads both sources to infer a complete dependency graph.

### Nx Build Target

Each package defines a `build` target that depends on upstream builds.

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

### Build Semantics

- `dependsOn: ["^build"]` ensures dependency builds run first
- Cacheable outputs enable Nx to skip unchanged builds
- Build scripts use `tsc -b tsconfig.lib.json`

---

## Workflow

Summary: Contributors use Nx or package scripts to build with correct ordering.

| Command              | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `pnpm build`         | Build all packages via `tsc -b`          |
| `nx build <project>` | Build a single package with dependencies |

---

## Rationale

Summary: Nx plus project references scales better than manual build sequencing.

- Nx provides task orchestration, parallelization, and caching.
- TypeScript references enforce correct build order at compile time.
- pnpm workspace deps keep package versions aligned and linked.

---

## Alternatives Considered

Summary: Manual build scripts and custom orchestration are brittle at scale.

- Manual build order scripting: error-prone as packages grow
- Non-Nx task runners: less integrated with the monorepo graph
- Single-package build scripts without references: risk of order mismatches

---

## Consequences

Summary: Faster builds and safer ordering with extra configuration in project.json.

**Positive:**

- Correct build ordering without manual steps
- Parallel execution and caching improve CI times
- Clear dependency graph for tooling

**Negative:**

- Requires maintaining `project.json` targets
- Build configuration knowledge needed for contributors

---

## Verification Approach

Summary: CI validates builds through Nx and TypeScript.

- `pnpm build` must pass in CI
- `nx build <project>` must succeed for targeted builds

---

## Design Decisions

Summary: Use Nx with TypeScript composite projects.

| Field      | Decision 001: Nx + TS composite projects |
| ---------- | ---------------------------------------- |
| **Title**  | Build orchestration strategy             |
| **Chosen** | Nx orchestration with TS references      |
| **Why**    | Safe ordering, parallelization, caching  |

---

## Blockers

Summary: None.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | n/a    | n/a           | Low    |

---

## Assumptions

Summary: Assumes Nx continues to infer dependencies correctly.

| Assumption                                  | Validation Method     | Confidence | Impact if Wrong     |
| ------------------------------------------- | --------------------- | ---------- | ------------------- |
| Nx dependency inference remains accurate    | CI build graph review | High       | Build order issues  |
| Package refs stay consistent with pnpm deps | Code review checks    | Medium     | Inconsistent builds |

---

## Unknowns

Summary: Future scale may require more granular build targets.

| Question                                      | Impact | Resolution Criteria           | Owner | ETA |
| --------------------------------------------- | ------ | ----------------------------- | ----- | --- |
| Will we need per-package custom build inputs? | Medium | Build times degrade or errors | Team  | TBD |
