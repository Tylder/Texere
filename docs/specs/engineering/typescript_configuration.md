# TypeScript Configuration & Type Safety

**Status:** Active  
**Last Updated:** 2025-11-23  
**Related Specs:** high_level_system_spec.md §3.6, eslint_code_quality.md, type_safety_strategy.md,
packages_contracts.md, testing_strategy.md

---

## ⚠️ CRITICAL RULE (2025-11-23)

**Setup (monorepo split):**

- **Shared strict base**: `tsconfig.base.json` (NodeNext, strict, no paths, exports-based).
- **App/package configs extend base and override only what they need.**
  - **Next.js app (`apps/web/tsconfig.json`)**: `module: "esnext"`, `moduleResolution: "bundler"`,
    `jsx: "preserve"`, Next/React types, includes `.next/types/**/*.ts`.
  - **Backend/Node packages**: inherit base defaults (`module/moduleResolution: "nodenext"`).
- **Root typecheck** runs per-package via Turbo (`turbo run typecheck`), so each package/app uses
  its own config; root `tsconfig.json` is a lightweight checker for packages only.

**This ensures:** Tests are fully type-checked. IDE and CLI use identical strictness. Build output
excludes test code.

---

## § 0. Architecture Overview

PersonaCore uses **TypeScript 5.9** with two separate compilation strategies:

1. **Type-checking (`pnpm typecheck`):** Delegated to each package/app via Turbo
   (`turbo run typecheck`), so Next uses bundler resolution while backend uses NodeNext.
2. **Building (`pnpm build`):** Per-package via Turbo; backend/packages can emit declarations with
   their `tsconfig.build.json`, while the Next app relies on Next’s own build.

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
├── tsconfig.build.json        ← Building (tsc --build, project refs)
├── tsconfig.base.json         ← Shared strict settings
├── packages/
│   ├── <library-1>/
│   │   ├── tsconfig.json
│   │   └── tsconfig.build.json
│   ├── <library-2>/
│   │   ├── tsconfig.json
│   │   └── tsconfig.build.json
│   └── <library-N>/
│       ├── tsconfig.json
│       └── tsconfig.build.json
└── apps/
    ├── <app-1>/
    │   ├── tsconfig.json
    │   └── tsconfig.build.json
    └── <app-N>/
        ├── tsconfig.json
        └── tsconfig.build.json
```

---

## § 3. Root Configuration

### 3.1 `/tsconfig.json` (Type-Checking)

Used by `pnpm typecheck`.

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "preserve",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "allowImportingTsExtensions": true
  },
  "include": [
    "packages/*/src/**/*",
    "packages/*/tests/**/*",
    "apps/*/app/**/*",
    "apps/**/*.ts",
    "apps/**/*.tsx"
  ]
}
```

**Key rules:** No `references`, no `--build` flag, glob patterns, `noEmit: true`, includes tests.

### 3.2 `/tsconfig.build.json` (Legacy, not used by build)

**Status:** Exists in repo but **not used** by current build process (Turbo orchestrates instead).

Previously used by `tsc --build tsconfig.build.json`. Now `pnpm build` delegates to
`turbo run build`, which orchestrates package builds via `turbo.json` and each package's `build`
script.

Can be safely deleted or archived. If kept for reference:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "tsBuildInfoFile": ".buildinfo/root.tsbuildinfo"
  },
  "files": [],
  "references": [
    { "path": "packages/<library-1>/tsconfig.build.json" },
    { "path": "packages/<library-N>/tsconfig.build.json" },
    { "path": "apps/<app-1>/tsconfig.build.json" },
    { "path": "apps/<app-N>/tsconfig.build.json" }
  ]
}
```

### 3.3 `/tsconfig.base.json` (Shared Settings)

All strict compiler options (see below for full config). Extended by all other configs.

**Module Resolution Strategy** (Updated Nov 2025):

Per **Node.js spec** (official recommendation) and **TypeScript/Turbo teams** (June 2024), module
boundaries are now defined via `package.json` `exports` fields, **not** hardcoded `tsconfig.json`
`paths`.

**Why:** Single source of truth, avoids duplication, follows modern Node.js standards.

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
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
    "moduleResolution": "nodenext",
    "resolveJsonModule": true,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "isolatedModules": true,
    "incremental": true,
    "noEmitOnError": true,
    "sourceMap": true,
    "removeComments": false,
    "skipLibCheck": true,
    "baseUrl": "."
  },
  "include": [],
  "exclude": ["node_modules", "dist", "coverage", ".turbo"]
}
```

**Key Changes (Nov 2025):**

- ✅ Removed hardcoded `paths` (54+ entries) – now replaced with `package.json` `exports` (per
  Node.js spec)
- ✅ Enabled `resolvePackageJsonExports: true` – TypeScript consults package.json `exports` field
- ✅ Enabled `resolvePackageJsonImports: true` – Enables `#` imports in package.json
- ✅ Added `verbatimModuleSyntax: true` – Explicit `import type` enforcement (TS 5.0+)
- ✅ Removed redundant strict flags – Already enabled by `strict: true`

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
