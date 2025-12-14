# TypeScript Configuration & Type Safety

**Status:** Active  
**Last Updated:** 2025-12-08  
**Related Specs:** high_level_system_spec.md §3.6, eslint_code_quality.md, type_safety_strategy.md,
packages_contracts.md, testing_strategy.md

---

## ⚠️ CRITICAL RULE (2025-11-23)

**Setup (monorepo split):**

- **Shared strict base**: `tsconfig.base.json` (NodeNext, strict, exports/imports-aware, no
  `paths`).
- **Preset configs in `@repo/typescript-config`:**
  - `node-library.json` (new, 2025-12-08): publishable non-web packages (ES2023, NodeNext,
    declarations on, incremental on).
  - `react-library.json`: React libs (inherits base + JSX + DOM libs).
  - `nextjs.json`: Next.js apps (Bundler resolution, JSX preserve, no emit).
- **Per-package layout (Nx-aligned):** `tsconfig.json` (references only) → `tsconfig.lib.json` (src
  build/typecheck) → `tsconfig.spec.json` (tests).
- **Root typecheck** runs per-package via Nx, so each package/app owns its tsconfig; workspace
  `tsconfig.json` is a lightweight no-emit shim.

**This ensures:** Tests are fully type-checked; IDE and CLI use identical strictness; build output
excludes tests; declaration artifacts match NodeNext consumers; Next.js keeps Bundler resolution
without leaking to Node packages.

---

## § 0. Architecture Overview

PersonaCore uses **TypeScript 5.9** with two separate compilation strategies:

1. **Type-checking (`pnpm typecheck`):** Delegated to each package/app via Turbo
   (`turbo run typecheck`), so Next uses bundler resolution while backend uses NodeNext.
2. **Building (`pnpm build`):** Per-package via Turbo; backend/packages emit declarations using
   `tsconfig.lib.json` (NodeNext), while the Next app relies on Next’s own build.

This ensures:

- ✅ All code (src + tests) must pass strict type checking
- ✅ IDE and CLI use same strictness level
- ✅ Build artifacts only contain src code (clean dist/)
- ✅ Fast incremental builds via `tsc --build` with project references
- ✅ Monorepo boundaries enforced (path aliases, no relative imports across packages)

**Key Principle:** Separate concerns—type-checking is isolated from building.

---

## § 1. Overview & Principles

**Node.js Target:** 22 LTS  
**TypeScript Version:** 5.9.3  
**Target ES:** ES2023 (native support in Node 22)  
**Module System:** ESM via `nodenext`

**Requirements:**

- `pnpm typecheck` – Checks **all code** (src + tests) with full strictness, **no build output**
- `pnpm build` – Builds **src only**, excludes tests, emits `.d.ts` declarations
- **Same strictness in IDE and CLI** – No surprises between development and CI

**Non-negotiable:** All strict type options must remain `true` in base config.

---

## § 2. Directory Structure

```
<monorepo>/
├── tsconfig.json              ← Type-checking (tsc, no --build)
├── tsconfig.base.json         ← Shared strict settings
├── packages/
│   ├── <library-1>/
│   │   ├── tsconfig.json
│   │   ├── tsconfig.lib.json
│   │   └── tsconfig.spec.json
│   ├── <library-2>/
│   │   ├── tsconfig.json
│   │   └── tsconfig.build.json
│   └── <library-N>/
│       ├── tsconfig.json
│       ├── tsconfig.lib.json
│       └── tsconfig.spec.json
└── apps/
    ├── <app-1>/
    │   ├── tsconfig.json
    │   ├── tsconfig.app.json
    │   └── tsconfig.spec.json
    └── <app-N>/
        ├── tsconfig.json
        ├── tsconfig.app.json
        └── tsconfig.spec.json

*Nx alignment (Dec 2025): standardize on lib/spec (and app/spec for Next). `tsconfig.build.json`
is deprecated and should not be created for new packages.*
```

---

## § 3. Root Configuration

### 3.1 `/tsconfig.json` (Workspace Type-Checking)

Used by `pnpm check-types` / `pnpm typecheck` (Nx orchestrated). **References-only** for fast
graph + IDE perf; no glob includes.

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "moduleDetection": "force"
  },
  "files": [],
  "references": [
    { "path": "packages/other-package" }
    // add each package/app here
  ]
}
```

**Key rules:** Use `references`; keep file minimal; `noEmit: true`.

### 3.1a Package.json `check-types` Script (Per-Package)

Each package must use **`tsc --build`** to validate the project graph (lib + spec configs):

```json
{
  "scripts": {
    "check-types": "tsc --build tsconfig.json --noEmit"
  }
}
```

**Why `--build` instead of `--noEmit -p tsconfig.json`:**

- ✅ Validates both `tsconfig.lib.json` (composite, in references) and `tsconfig.spec.json`
  (type-checked alongside lib)
- ✅ TypeScript official pattern (see
  [Project References handbook](https://www.typescriptlang.org/docs/handbook/project-references.html))
- ✅ Incremental builds with `.tsbuildinfo` caching
- ✅ Catches type errors in test files that plain `--noEmit` would miss
- ✅ `--noEmit` is compatible with `--build` since TypeScript 4.0+

**Incorrect (old pattern—validates only primary config, ignores spec files):**

```json
{ "check-types": "tsc --noEmit -p tsconfig.json" } // ❌ Misses .spec.json
```

**Example:** The old command silently passes while `--build` catches test file errors:

```bash
# Old (incorrect): passes silently, misses test file type errors
tsc --noEmit -p tsconfig.json  # ✗ no errors reported

# New (correct): validates all references, catches test file errors
tsc --build tsconfig.json --noEmit
# error TS2532: Object is possibly 'undefined' in .spec.json
# error TS4111: Property must be accessed with ['key'] in .spec.json
```

Ref: TypeScript Project References
(<https://www.typescriptlang.org/docs/handbook/project-references.html>), Nx TypeScript project
linking (<https://nx.dev/docs/concepts/typescript-project-linking>).

**After adding a project:** run `nx sync` (or update references manually) so project references stay
in sync.

### 3.2 `/tsconfig.build.json` (Deprecated)

Do not add new `tsconfig.build.json` files. Use `tsconfig.lib.json` / `tsconfig.spec.json` (or
`tsconfig.app.json` for Next) instead. Legacy references should be removed when encountered.

_Nx quirk (v22.1): if @nx/js still hashes `tsconfig.build.json`, keep a temporary stub extending
`tsconfig.lib.json` only until the plugin is upgraded, then delete it._

### 3.3 `/tsconfig.base.json` (Shared Settings)

All strict compiler options (see below for full config). Extended by all other configs.

**Module Resolution Strategy** (Updated Dec 2025):

Per **Node.js spec** and **TypeScript team guidance**, module boundaries are defined via
`package.json` `exports` fields—**no tsconfig `paths`**. Publishable libraries MUST use NodeNext;
Bundler resolution is reserved for Next.js apps only (never mix bundler resolution in Node
libraries). (Refs: TypeScript moduleResolution docs
<https://www.typescriptlang.org/tsconfig/moduleResolution.html>.)

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "lib": ["ES2023"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "NodeNext",
    "moduleDetection": "force",
    "resolveJsonModule": true,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "isolatedModules": true,
    "incremental": true,
    "noEmitOnError": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "customConditions": ["monorepo_template"]
  },
  "include": [],
  "exclude": ["node_modules", "dist", "coverage", ".turbo"]
}
```

**Key Changes (Dec 2025):**

- ✅ Added `moduleDetection: "force"` for consistent ESM detection in editors and Nx graph builds
- ✅ Explicit `customConditions: ["monorepo_template"]` for conditional exports parity
- ✅ Reaffirmed NodeNext-only for publishable libs; Bundler kept for Next.js only

---

## § 4. Package Templates (Nx-aligned)

### 4.1 Node Library (non-web, publishable)

- Extend `@repo/typescript-config/node-library.json`.
- File layout per package:
  - `tsconfig.base.json`: extends the shared preset (Node/React/Next); holds compiler options.
  - `tsconfig.json`: references only (`./tsconfig.lib.json`); spec is not referenced as a project
    (Nx guidance: spec configs are "leaves" and don't need to be in the project graph).
  - `tsconfig.lib.json`: src build + typecheck (`rootDir: src`, `outDir: dist`,
    `noEmitOnError: true`), extends `tsconfig.base.json`.
  - `tsconfig.spec.json`: tests (`types: ["vitest/globals", "node"]`, includes test globs), extends
    `tsconfig.base.json`.
- Compiler defaults (from preset): ES2023, NodeNext module/resolution, `composite`, `declaration`,
  `declarationMap`, `sourceMap`, `incremental`, `verbatimModuleSyntax`, `moduleDetection: "force"`,
  `resolvePackageJsonExports`/`Imports`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
  `customConditions: ["monorepo_template"]`.
- `package.json` requirements: `"type": "module"`; `exports` map at least
  `{ "types": "./dist/index.d.ts", "import": "./dist/index.js" }`; add subpath exports as needed.
  Tests are excluded from dist via `tsconfig.lib.json` and build script.

**Why lib/spec split is the default (Dec 2025 best practice):**

- `tsconfig.json` stays tiny → faster Nx project graph hashing/parsing and cleaner IDE startup.
- `tsconfig.base.json` holds compiler options (extends shared preset) so other configs don’t inherit
  references.
- `tsconfig.lib.json` is **composite** and included in `tsconfig.json` references, allowing
  `tsc --build` to incrementally track library outputs via `.tsbuildinfo`. Isolates emit settings
  (`rootDir`, `outDir`, `noEmitOnError`, NodeNext resolution) so declaration output matches runtime
  without test-only globals; extends `tsconfig.base.json`.
- `tsconfig.spec.json` is a **leaf config** (not referenced as a project, not composite). Carries
  test-only types (e.g., `vitest/globals`) without leaking into the published surface, reducing
  false positives and keeping d.ts clean; extends `tsconfig.base.json`. Per Nx project linking
  guidance: "The project's `tsconfig.spec.json` does not need to reference project dependencies."
  (Ref:
  [Nx TypeScript Project Linking](https://nx.dev/concepts/typescript-project-linking#individual-project-typescript-configuration))
- Aligns with Nx generators/migrations (`@nx/js` + Vitest) which expect a lib/spec split; avoids
  future migration churn.
- Clear separation of concerns: build ≠ tests; only lib emits; spec files are type-checked by
  `tsc --build` but remain part of the development-only lifecycle.

**Test placement & examples:** tests must be colocated (`*.test.ts[x]`) and include spec references
in describe blocks (e.g., `describe('Button (testing_specification §3.6.1)', ...)`). Ensure new
packages follow this convention.

- References: Nx TypeScript project linking/lib-spec pattern
  (<https://nx.dev/concepts/typescript-project-linking>), Nx recipes on workspaces TS configs
  (<https://nx.dev/recipes/other/switch-to-workspaces-project-references>), TypeScript NodeNext
  module resolution (<https://www.typescriptlang.org/tsconfig/moduleResolution.html>).

**Coverage guidance (Vitest):** set `coverage.provider: 'v8'` with `coverage.thresholds` and
explicit `coverage.include`/`exclude` globs to avoid zeroed reports. (Align with testing_strategy
§2.2 targets.)

**Package.json guidance:** add `"sideEffects": false` for publishable libraries to enable tree
shaking in modern bundlers.

**Exports guidance:** prefer explicit subpath exports (e.g.,
`"./*": { "types": "./dist/*.d.ts", "import": "./dist/*.js" }`) so NodeNext + editors resolve types
cleanly.

**Dual-format note:** Default is ESM-only (NodeNext). If a package requires dual ESM/CJS, add
explicit `exports.require` pointing to CJS output; otherwise keep the default ESM surface.

### 4.2 React Library

- Extend `@repo/typescript-config/react-library.json` (adds JSX + DOM libs). Same file layout as
  Node Library; keep `module: NodeNext` for publishable React libs consumed in ESM tooling.

### 4.3 Next.js App

- Extend `@repo/typescript-config/nextjs.json`. Use `tsconfig.json` + Next-generated
  `tsconfig.app.json`/`tsconfig.spec.json` if present. Resolution is `Bundler`; do **not** reuse for
  libraries.

**Module Boundary Definition** (per Node.js spec):

Each workspace package defines its **public API** via `package.json` `exports`. TypeScript
automatically resolves `@personacore/<library>` and subpaths via this field (no hardcoded tsconfig
paths needed).

Example from `packages/backend/package.json`:

```json
{
  "name": "@personacore/backend",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./config": {
      "types": "./dist/config/index.d.ts",
      "import": "./dist/config/index.js"
    },
    "./config/*": {
      "types": "./dist/config/*.d.ts",
      "import": "./dist/config/*.js"
    },
    "./domain": { ... },
    "./domain/*": { ... },
    "./domain/dm/*": { ... },
    "./db": { ... },
    "./db/*": { ... },
    "./queues": { ... },
    "./queues/*": { ... },
    "./server": { ... },
    "./server/*": { ... },
    "./*": {
      "types": "./dist/*/index.d.ts",
      "import": "./dist/*/index.js"
    },
    "./package.json": "./package.json"
  }
}
```
