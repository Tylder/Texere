# Build System: Nx + TypeScript Composite Projects

**Status:** Active  
**Last Updated:** 2025-12-17  
**Audience:** Backend, Frontend, DevOps, Tooling  
**Related:** typescript_configuration.md, nx_lang_graph_feature_layout_spec.md

---

## 0. Purpose & Scope

Define the monorepo build system architecture: how Nx orchestrates parallel builds with TypeScript
composite projects, ensuring proper dependency ordering and efficient incremental compilation.
Covers:

- Nx task dependency graph and `dependsOn` configuration
- TypeScript composite project building with `tsc --build`
- Parallel execution strategy and ordering guarantees
- Build targets in `project.json` and nx.json
- Development workflow and CI/CD patterns

---

## 1. Authoritative References

- **Nx Task Orchestration:** https://nx.dev/concepts/nx-projects/nx-project-configuration
- **Nx Task Dependency Resolution:** https://nx.dev/concepts/how-execution-works
- **TypeScript Project References & `tsc --build`:**
  https://www.typescriptlang.org/docs/handbook/project-references.html
- **TypeScript Composite Projects:**
  https://www.typescriptlang.org/docs/handbook/project-references.html#tsc--build
- **Nx Best Practices for TypeScript:**
  https://nx.dev/technologies/typescript/recipes/switch-to-workspaces-project-references
- **pnpm Workspace Dependencies:** https://pnpm.io/dependencies-structure

---

## 2. Principles

1. **Composite builds drive ordering:** TypeScript's `composite` flag and `references` array define
   the authoritative dependency graph for build sequencing.

2. **Nx respects package.json dependencies:** When using `dependsOn: ["^build"]`, Nx reads
   package.json dependencies to infer which projects must build first, ensuring compliance with
   TypeScript's requirements.

3. **Parallel execution is safe:** Nx's dependency resolution prevents concurrent builds of projects
   with implicit ordering constraints; TypeScript composite semantics are preserved.

4. **One build command per project:** Each project has a single `build` script in package.json that
   runs `tsc -b tsconfig.lib.json` (respects composite references).

5. **Nx caching optimizes rebuilds:** Task caching and incremental compilation mean only changed
   projects and dependents rebuild.

6. **Development and CI workflows are identical:** Both use `pnpm build` (or `pnpm post:report:fast`
   during development), ensuring no "works on my machine" surprises. Full `pnpm post:report` now
   ends with `pnpm clean` to remove emitted artifacts after validation, while `check-types` tasks
   themselves run incremental `tsc -b` to keep feedback fast.

---

## 3. Dependency Graph: TypeScript + Nx

### 3.1 TypeScript Composite Structure

Each package declares dependencies in two ways:

**In `tsconfig.lib.json`:**

```json
{
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true
  },
  "references": [{ "path": "../types/tsconfig.lib.json" }]
}
```

This tells TypeScript: "Before building this project, ensure referenced projects are built first."

**In `package.json`:**

```json
{
  "dependencies": {
    "@repo/indexer-types": "workspace:^"
  }
}
```

This tells pnpm (and Nx) the same logical dependency.

### 3.2 Nx Task Dependency Graph

Nx reads both sources to build a task dependency graph. In each project's `project.json`:

```json
{
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{workspaceRoot}/dist/packages/foo"],
      "inputs": ["default", "{projectRoot}/tsconfig.lib.json", "{projectRoot}/src/**"],
      "dependsOn": ["^build"]
    }
  }
}
```

**Key:** `"dependsOn": ["^build"]` tells Nx: "This project's build task depends on the build tasks
of all its dependencies (inferred from package.json)."

The `^` prefix means "dependencies" in the Nx graph; Nx expands it based on the package.json
dependency list.

---

## 4. Build Targets Configuration

### 4.1 Library Projects (`packages/*/project.json`)

```json
{
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{workspaceRoot}/dist/packages/<name>"],
      "inputs": ["default", "{projectRoot}/tsconfig.lib.json", "{projectRoot}/src/**"],
      "dependsOn": ["^build"]
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
      ]
    },
    "test": {
      "executor": "nx:run-script",
      "options": { "script": "test" },
      "outputs": ["{projectRoot}/coverage"]
    },
    "test:coverage": {
      "executor": "nx:run-script",
      "options": { "script": "test:coverage" },
      "outputs": ["{projectRoot}/coverage"]
    },
    "lint": {
      "executor": "nx:run-script",
      "options": { "script": "lint" },
      "inputs": ["default", "{projectRoot}/src/**", "{projectRoot}/eslint.config.*"]
    }
  }
}
```

**Critical:** The `dependsOn: ["^build"]` field ensures Nx waits for dependencies before starting
this build.

### 4.2 Application Projects (`apps/*/project.json`)

```json
{
  "targets": {
    "build": {
      "executor": "nx:run-script",
      "options": { "script": "build" },
      "outputs": ["{workspaceRoot}/dist/apps/<name>"],
      "inputs": ["default", "{projectRoot}/tsconfig.lib.json", "{projectRoot}/src/**"],
      "dependsOn": ["^build"]
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

Applications also use `dependsOn: ["^build"]` to ensure all libraries are built first.

### 4.3 Workspace-Level Defaults (`nx.json`)

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
      "outputs": ["{projectRoot}/.next/**", "!{projectRoot}/.next/cache/**"],
      "cache": true
    }
  }
}
```

**Note:** Project-level configurations override defaults. Use targetDefaults for common patterns.

---

## 5. Build Scripts in `package.json`

Each project defines build scripts that Nx calls via `nx:run-script`:

### 5.1 Library Build Script

```json
{
  "scripts": {
    "build": "tsc -b tsconfig.lib.json",
    "check-types": "tsc -b tsconfig.json && tsc -b tsconfig.json --clean",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint . --cache"
  }
}
```

**Key:** `tsc -b` respects the composite project references defined in `tsconfig.lib.json`, building
all transitively referenced projects in the correct order (even if run in isolation).

### 5.2 Application Build Script

```json
{
  "scripts": {
    "build": "tsc -b tsconfig.lib.json",
    "dev": "tsc --noEmit && tsx watch src/main.ts",
    "start": "node dist/main.js"
  }
}
```

---

## 6. Monorepo-Level Build Commands

### 6.1 Parallel Build (Production & Development)

```bash
# package.json
pnpm build
# equivalent to:
# nx run-many --target=build --all --parallel
```

Nx determines the correct order automatically:

1. Reads each project's `dependsOn: ["^build"]`.
2. Expands `^build` using package.json dependencies.
3. Builds projects in parallel respecting this order.

Example execution (with 3 build workers):

```
Worker 1: indexer-types (no deps)
Worker 2: indexer-utils (no deps)
Worker 3: (waiting)
  ↓
Worker 1: indexer-core (depends on types)
Worker 2: indexer-ingest (depends on utils, core)
Worker 3: (waiting)
  ↓
Worker 1: indexer-query (depends on core)
Worker 2: indexer-workers (depends on ingest, core, query)
Worker 3: (waiting)
```

### 6.2 Type Checking

```bash
pnpm typecheck
# nx run-many --target=check-types --all --parallel && tsc -b tsconfig.json
```

Validates per-project spec configs (test-only types) and root configuration.

### 6.3 Testing

```bash
pnpm test
# nx run-many --target=test --all --parallel
```

### 6.4 Full Validation (CI & Pre-Commit)

```bash
pnpm post:report:fast
# Runs: format + lint:fix + check-types + test:coverage + build (all parallel)
```

Slower alternative for final validation:

```bash
pnpm post:report
# Like post:report:fast but also includes full linting and build
```

---

## 7. Parallel Execution Safety

### 7.1 Why Parallel Builds Don't Break TypeScript

**Without `dependsOn`:**

```bash
# UNSAFE: Projects run concurrently without coordination
nx run-many --target=build --all --parallel
# indexer-core might start before indexer-types finishes
# → TS6305 error: output files missing
```

**With `dependsOn: ["^build"]`:**

```bash
# SAFE: Nx respects dependency order
nx run-many --target=build --all --parallel
# Nx ensures indexer-types completes before indexer-core starts
# → TypeScript composite guarantees are preserved
```

### 7.2 Incremental Compilation

TypeScript's `--build` flag detects unchanged `.tsbuildinfo` files and skips recompilation:

```bash
pnpm build          # Full rebuild, creates .tsbuildinfo
pnpm build          # Runs instantly (all `.d.ts` up-to-date)
# Edit src/index.ts
pnpm build          # Only this package rebuilds, dependents rebuild incrementally
```

Nx caches task outputs (the `outputs` field in `project.json`), further optimizing repeated builds.

---

## 8. Contributor Workflow

### 8.1 Adding a New Package

1. **Generate with Nx:**

   ```bash
   pnpm dlx nx generate @nx/js:library packages/indexer/new --bundler=tsc --unitTestRunner=vitest
   ```

2. **Update `package.json`:**

   ```json
   {
     "type": "module",
     "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
     "dependencies": { "@repo/indexer-types": "workspace:^" },
     "scripts": {
       "build": "tsc -b tsconfig.lib.json",
       "check-types": "tsc -b tsconfig.json && tsc -b tsconfig.json --clean"
     }
   }
   ```

3. **Add `dependsOn` to `project.json`:**

   ```json
   {
     "targets": {
       "build": {
         "executor": "nx:run-script",
         "options": { "script": "build" },
         "outputs": ["{workspaceRoot}/dist/packages/indexer/new"],
         "inputs": ["default", "{projectRoot}/tsconfig.lib.json", "{projectRoot}/src/**"],
         "dependsOn": ["^build"]
       }
     }
   }
   ```

4. **Sync Nx and TypeScript graphs:**

   ```bash
   nx sync
   ```

5. **Validate:**
   ```bash
   pnpm post:report:fast
   ```

### 8.2 Local Development with Watchers

Run two watchers in separate terminals:

**Terminal 1: Runtime & Tests**

```bash
pnpm dev:log
# Watches src/**/*.ts, runs build + tests, logs to logs/dev.log
```

**Terminal 2: Type Checking**

```bash
pnpm typecheck:watch:log
# Watches tsconfig files, runs type checks, logs to logs/typecheck.log
```

Both use `--parallel`, respecting `dependsOn` order.

### 8.3 Pre-Commit & CI

```bash
# Pre-commit (via Husky)
pnpm format:staged
# Lints staged files

# Before pushing
pnpm post:report
# Full validation: format, lint, types, tests, build

# CI/CD
pnpm build && pnpm test:coverage
```

---

## 9. Common Issues & Solutions

### 9.1 TS6305 Errors During Parallel Build

**Symptom:**

```
error TS6305: Output file 'dist/index.js' has not been built from source
```

**Root Cause:** Dependent projects are building before their dependencies complete.

**Fix:**

1. Ensure `dependsOn: ["^build"]` is in the dependent's `project.json`.
2. Verify package.json dependency is declared (e.g., `"@repo/indexer-types": "workspace:^"`).
3. Clear caches: `rm -rf dist .nx && find . -name ".tsbuildinfo" -delete`
4. Rebuild: `pnpm build`

### 9.2 Build Succeeds but Nx Says it Failed

**Symptom:**

```
 NX   Running target build for 8 projects failed
```

**Root Cause:** A dependent script (linter, formatter) exited with non-zero code.

**Fix:**

1. Check the full log for actual errors (scroll up).
2. Run individual projects: `nx run indexer-core:build --verbose`
3. Ensure exit codes are correct in build scripts.

### 9.3 Incremental Builds Aren't Working

**Symptom:** Every run rebuilds everything, even with no changes.

**Root Cause:** Missing or incorrect `.tsbuildinfo` files, or Nx cache disabled.

**Fix:**

1. Check `cache: true` is set in `project.json` build target.
2. Verify `outputs` field matches actual TypeScript output.
3. Clear and retry: `rm -rf .nx && pnpm build`

### 9.4 IDE Shows Type Errors but Build Succeeds

**Symptom:** VSCode highlights errors, but `pnpm typecheck` passes.

**Root Cause:** IDE is using a stale TypeScript server or wrong tsconfig.

**Fix:**

1. Restart TypeScript server in IDE (Cmd+Shift+P → "TypeScript: Restart TS Server").
2. Verify IDE uses the correct tsconfig (should be root `/tsconfig.json`).
3. Ensure `nx sync` has been run recently.

---

## 10. Nx Configuration Reference

### 10.1 Key `nx.json` Fields for Builds

| Field            | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `plugins`        | Load Nx plugins (e.g., `@nx/js/typescript` for auto type-check targets) |
| `targetDefaults` | Define default task options across all projects                         |
| `defaultBase`    | Default Git branch for computing affected projects (often `main`)       |
| `namedInputs`    | Custom input patterns for cache invalidation                            |

### 10.2 Key `project.json` Fields for Builds

| Field       | Purpose                                                            |
| ----------- | ------------------------------------------------------------------ |
| `executor`  | Task runner (usually `nx:run-script` to call package.json scripts) |
| `options`   | Arguments passed to the executor (e.g., `{ "script": "build" }`)   |
| `outputs`   | Artifact paths created by this task (for caching and cleanup)      |
| `inputs`    | Source file patterns that trigger cache invalidation               |
| `dependsOn` | Task dependencies (e.g., `["^build"]` for upstream projects)       |
| `cache`     | Enable/disable Nx caching (default: true)                          |

---

## 11. Validation Checklist

- [ ] Each project has `"dependsOn": ["^build"]` in `project.json`.
- [ ] Each project declares dependencies in `package.json` with `workspace:*` or `workspace:^`.
- [ ] Build scripts use `tsc -b tsconfig.lib.json` (respects composite references).
- [ ] Check-types scripts use `tsc -b tsconfig.json && tsc -b tsconfig.json --clean`.
- [ ] Package.json has `"type": "module"` and `exports` field.
- [ ] Run `nx sync` after adding/moving projects.
- [ ] Run `pnpm build` (parallel) and verify it succeeds.
- [ ] Run `pnpm typecheck` and verify all projects pass.
- [ ] Inspect build logs: confirm projects build in dependency order.
- [ ] Incremental builds: touch a source file and rebuild; only affected projects should recompile.

---

## 12. Changelog

- **2025-12-16:** Initial version. Documented parallel build architecture, composite project
  ordering, `dependsOn` configuration, and troubleshooting.
