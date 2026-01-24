---
type: SPEC
status: active
stability: stable
created: 2026-01-09
last_updated: 2026-01-09
area: tooling
feature: typescript-project-references
summary_short: >-
  Strict TypeScript configuration with project references for incremental builds and safe module
  boundaries.
summary_long: >-
  Specifies strict TypeScript settings (ES2023, NodeNext module resolution, safety flags) and
  project references across all packages for incremental builds and type safety at scale. Defines
  per-package tsconfig structure for libraries and apps, with required `tsconfig.lib.json` and
  `tsconfig.spec.json` references and build scripts that use `tsc -b`.
keywords:
  - typescript
  - strict
  - project-references
related:
  - SPEC-tooling-eslint-oxlint-hybrid-linting
  - SPEC-tooling-nx-composite-projects
index:
  sections:
    - title: 'TLDR'
      lines: [86, 99]
      summary:
        'Strict TypeScript config plus project references enable incremental builds and safe module
        boundaries across the monorepo.'
      token_est: 64
    - title: 'Scope'
      lines: [101, 119]
      summary:
        'Covers TypeScript compiler configuration and project references; excludes lint rules and
        runtime build tooling details.'
      token_est: 81
    - title: 'Specification'
      lines: [121, 182]
      summary:
        'Use strict compiler options, NodeNext module resolution, and project references for all
        packages.'
      token_est: 260
    - title: 'Workflow'
      lines: [184, 193]
      summary: 'Type checking runs via `tsc -b` with project references.'
      token_est: 60
    - title: 'Rationale'
      lines: [195, 203]
      summary: 'Strict mode and project references keep the monorepo safe and scalable.'
      token_est: 55
    - title: 'Alternatives Considered'
      lines: [205, 213]
      summary: 'We rejected looser compiler settings and ad hoc module aliases.'
      token_est: 60
    - title: 'Consequences'
      lines: [215, 230]
      summary: 'More upfront type discipline, fewer runtime errors.'
      token_est: 60
    - title: 'Verification Approach'
      lines: [232, 239]
      summary: 'Type checking is enforced in CI with project references.'
      token_est: 39
    - title: 'Design Decisions'
      lines: [241, 251]
      summary: 'Strict mode plus project references across all packages.'
      token_est: 75
    - title: 'Blockers'
      lines: [253, 261]
      summary: 'None.'
      token_est: 43
    - title: 'Assumptions'
      lines: [263, 272]
      summary: 'Assumes NodeNext and strict flags remain compatible with repo tooling.'
      token_est: 91
    - title: 'Unknowns'
      lines: [274, 280]
      summary: 'Future tooling changes may require adjustments to compiler settings.'
      token_est: 72
---

# SPEC-tooling-typescript-strict-project-references

---

## TLDR

Summary: Strict TypeScript config plus project references enable incremental builds and safe module
boundaries across the monorepo.

**What:** Strict TS configuration with project references

**Why:** Catch type errors early and enable fast incremental builds

**How:** Root `tsconfig.base.json` with strict flags and per-package `tsconfig.*.json` references

**Status:** Active

---

## Scope

Summary: Covers TypeScript compiler configuration and project references; excludes lint rules and
runtime build tooling details.

**Includes:**

- Root `tsconfig.base.json` compiler options
- Strict mode and safety flags
- Project references for packages
- Library/app tsconfig structure
- Required package.json script hooks for `tsc -b`

**Excludes:**

- Lint rules and formatting
- Nx task configuration (covered in build-system spec)

---

## Specification

Summary: Use strict compiler options, NodeNext module resolution, and project references for all
packages.

### Root TypeScript Configuration

- `target: "ES2023"`, `lib: ["ES2023"]`
- `module: "NodeNext"`, `moduleResolution: "NodeNext"`
- `moduleDetection: "force"`
- **No `baseUrl` or `paths`**: module boundaries are defined by package `exports`

### Strict Mode and Safety Flags

- `strict: true`
- `exactOptionalPropertyTypes: true`
- `noPropertyAccessFromIndexSignature: true`
- `noUncheckedIndexedAccess: true`
- `useUnknownInCatchVariables: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

### Module Resolution and Package Maps

- `resolvePackageJsonExports: true`
- `resolvePackageJsonImports: true`
- `customConditions: ["@repo/source"]`
- `verbatimModuleSyntax: true`

### Build and Incremental

- `incremental: true`
- `noEmitOnError: true`
- `sourceMap: true`
- `skipLibCheck: true`
- `isolatedModules: true`
- `importHelpers: true`

### Per-Package Configuration

Libraries must provide:

- `tsconfig.json` (solution file): `files: []`, references `tsconfig.lib.json` and
  `tsconfig.spec.json`
- `tsconfig.lib.json`: `composite: true`, `rootDir: "src"`, `outDir: "dist"`, `declaration: true`
- `tsconfig.spec.json`: `composite: true`, test-only types, references `tsconfig.lib.json`

Applications use Nx/Next defaults but must reference both app and spec configs for `tsc -b`.

### Package.json Requirements

Each package defines:

- `type: "module"`
- `exports` map for public API
- `check-types: "tsc -b tsconfig.json"`
- `build: "tsc -b tsconfig.lib.json"`
- Workspace dependencies via `workspace:^` or `workspace:*`

---

## Workflow

Summary: Type checking runs via `tsc -b` with project references.

| Command          | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `pnpm typecheck` | Full workspace type check via `tsc -b`        |
| `pnpm build`     | Build packages via `tsc -b tsconfig.lib.json` |

---

## Rationale

Summary: Strict mode and project references keep the monorepo safe and scalable.

- Strict flags catch subtle type errors before runtime.
- NodeNext module resolution aligns with modern ESM usage.
- Project references enable incremental builds and faster CI.

---

## Alternatives Considered

Summary: We rejected looser compiler settings and ad hoc module aliases.

- Non-strict TypeScript: faster to start but prone to runtime errors
- `baseUrl`/`paths`: hides module boundaries and breaks package export contracts
- Single tsconfig for all sources: slower and less modular

---

## Consequences

Summary: More upfront type discipline, fewer runtime errors.

**Positive:**

- Strong type safety across packages
- Incremental builds and type checks
- Clear module boundaries enforced by package exports

**Negative:**

- More configuration files per package
- Requires explicit typing for some patterns

---

## Verification Approach

Summary: Type checking is enforced in CI with project references.

- `pnpm typecheck` must pass in CI
- `tsc -b` ensures references are valid and ordered

---

## Design Decisions

Summary: Strict mode plus project references across all packages.

| Field      | Decision 001: Strict TS + project references         |
| ---------- | ---------------------------------------------------- |
| **Title**  | Type safety at scale                                 |
| **Chosen** | Strict flags and project references                  |
| **Why**    | Prevent runtime errors and enable incremental builds |

---

## Blockers

Summary: None.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | n/a    | n/a           | Low    |

---

## Assumptions

Summary: Assumes NodeNext and strict flags remain compatible with repo tooling.

| Assumption                                   | Validation Method    | Confidence | Impact if Wrong        |
| -------------------------------------------- | -------------------- | ---------- | ---------------------- |
| NodeNext resolution works for all packages   | Build/typecheck runs | High       | Adjust module settings |
| Strict flags stay practical for contributors | Code review feedback | Medium     | Might relax rules      |

---

## Unknowns

Summary: Future tooling changes may require adjustments to compiler settings.

| Question                                                     | Impact | Resolution Criteria              | Owner | ETA |
| ------------------------------------------------------------ | ------ | -------------------------------- | ----- | --- |
| Will custom conditions need expansion beyond `@repo/source`? | Medium | New consumer requirements appear | Team  | TBD |
