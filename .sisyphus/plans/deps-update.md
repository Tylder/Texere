# Update All Dependencies to Latest Stable

## TL;DR

> **Quick Summary**: Update every dependency across the Texere monorepo to its latest stable
> version, staying on ESLint 9.x due to ecosystem incompatibility with ESLint 10. Includes Vitest
> 3→4 migration and pnpm version bump.
>
> **Deliverables**:
>
> - All 5 workspace `package.json` files updated with latest stable versions
> - Root `packageManager` field bumped to pnpm 10.29.3
> - `vitest.workspace.ts` migrated for Vitest 4 compatibility
> - Lockfile regenerated
> - Full quality gate passing (format, lint, typecheck, test, build)
>
> **Estimated Effort**: Short **Parallel Execution**: NO — sequential (each step depends on
> previous) **Critical Path**: Edit package.json → Install → Migrate vitest workspace → Fix breakage
> → Quality gate

---

## Context

### Original Request

Update ALL dependencies to latest stable versions across the monorepo.

### Interview Summary

**Key Discussions**:

- **ESLint 10**: Stay on ESLint 9.x (9.39.2) because `typescript-eslint`, `eslint-plugin-import`
  don't support ESLint 10 yet
- **Upgrade strategy**: All at once, fix breakage after — confirmed by user for this small codebase

**Research Findings**:

- 6 `package.json` files total (5 in workspace, 1 in `.opencode/` outside workspace)
- Several major version bumps: Vitest 3→4, `@types/node` 22→25, `eslint-plugin-unicorn` 59→63,
  `globals` 16→17, `oxlint` 1.1→1.47
- `vitest.workspace.ts` must be migrated — Vitest 4 renamed `workspace` to `projects`
- `eslint-plugin-oxlint` 1.46 may have changed its `configs.recommended` API shape
- `prettier-plugin-packagejson` v3 is safe — codebase already explicitly loads plugin
- `globals` 17 is safe — codebase only uses `globals.node`

### Metis Review

**Identified Gaps** (addressed):

- **Vitest workspace migration**: Added as explicit task (Task 3)
- **eslint-plugin-oxlint API verification**: Added as verification step in Task 4
- **Turbo cache invalidation**: Added cache clear before quality gate (Task 4)
- **Build verification**: Added `pnpm build` to acceptance criteria
- **Integration tests**: Added to quality gate
- **Cross-package version consistency**: Added explicit consistency table

---

## Work Objectives

### Core Objective

Bring every dependency in the monorepo to its latest stable version while maintaining a fully
passing quality gate.

### Concrete Deliverables

- Updated `package.json` files: root, `packages/graph`, `apps/mcp`, `tooling/eslint-config`
- Updated `packageManager` field to `pnpm@10.29.3`
- Regenerated `pnpm-lock.yaml`
- Migrated `vitest.workspace.ts` for Vitest 4 compatibility
- Any config/source fixes required by breaking changes

### Definition of Done

- [x] `pnpm install --frozen-lockfile` exits 0
- [x] `pnpm build` exits 0
- [x] `pnpm quality` exits 0 (format + lint + typecheck + test:unit)
- [x] `pnpm test:integration` exits 0
- [x] No ESLint 10.x in dependency tree

### Must Have

- All deps at latest stable versions (within ESLint 9.x constraint)
- Cross-package version consistency (same dep = same version everywhere)
- Existing version pinning strategy preserved (exact in root/tooling, caret for production deps)
- `oxlint` and `eslint-plugin-oxlint` versions kept in sync

### Must NOT Have (Guardrails)

- ESLint 10.x or `@eslint/js` 10.x anywhere
- Changes to `.opencode/package.json` (outside pnpm workspace, managed separately)
- Source code changes beyond what's required to fix breakage
- New ESLint rules enabled from updated plugins
- Vitest coverage configuration added (codebase doesn't use it)
- Node engine constraint changes
- `tsdown` update (already at latest 0.20.3)

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after — run existing tests to verify nothing broke)
- **Framework**: vitest (3→4 migration)

### Agent-Executed QA Scenarios (MANDATORY)

```
Scenario: Full quality gate passes after dependency update
  Tool: Bash
  Preconditions: All package.json files updated, pnpm install completed, caches cleared
  Steps:
    1. rm -rf .turbo node_modules/.cache
    2. pnpm build
    3. Assert: exit code 0
    4. pnpm quality
    5. Assert: exit code 0
    6. pnpm test:integration
    7. Assert: exit code 0
  Expected Result: All commands succeed with exit code 0
  Failure Indicators: Any non-zero exit code, compilation errors, test failures
  Evidence: Terminal output captured

Scenario: No ESLint 10 in dependency tree
  Tool: Bash
  Preconditions: pnpm install completed
  Steps:
    1. pnpm ls eslint --depth 0 2>/dev/null | grep -E 'eslint [0-9]'
    2. Assert: output shows 9.39.x, NOT 10.x
  Expected Result: ESLint stays at 9.39.2
  Evidence: Terminal output captured

Scenario: Lockfile integrity verified
  Tool: Bash
  Preconditions: All edits complete
  Steps:
    1. pnpm install --frozen-lockfile
    2. Assert: exit code 0
  Expected Result: Lockfile matches package.json files exactly
  Evidence: Terminal output captured

Scenario: Build artifacts exist
  Tool: Bash
  Preconditions: pnpm build completed
  Steps:
    1. ls packages/graph/dist/index.js apps/mcp/dist/index.js
    2. Assert: both files exist
  Expected Result: Both build outputs present
  Evidence: Terminal output captured

Scenario: pnpm version updated in packageManager field
  Tool: Bash
  Steps:
    1. grep -o '"pnpm@[^"]*"' package.json
    2. Assert: output is "pnpm@10.29.3"
  Expected Result: packageManager field shows 10.29.3
  Evidence: Terminal output captured
```

---

## Execution Strategy

### Sequential Execution (no parallelism)

Each task depends on the previous completing successfully. This is a dependency chain.

```
Task 1: Update all package.json files
    ↓
Task 2: pnpm install (regenerate lockfile)
    ↓
Task 3: Migrate vitest.workspace.ts for Vitest 4
    ↓
Task 4: Clear caches, run full quality gate, fix any breakage
    ↓
Task 5: Final verification + commit
```

### Dependency Matrix

| Task | Depends On | Blocks |
| ---- | ---------- | ------ |
| 1    | None       | 2      |
| 2    | 1          | 3      |
| 3    | 2          | 4      |
| 4    | 3          | 5      |
| 5    | 4          | None   |

---

## Version Target Reference

### Cross-Package Consistency Table

These deps appear in multiple `package.json` files and MUST be the same version everywhere:

| Dependency             | Target Version | Files                           |
| ---------------------- | -------------- | ------------------------------- |
| `typescript`           | `5.9.3`        | root, graph, mcp, eslint-config |
| `eslint`               | `9.39.2`       | root, graph, mcp                |
| `vitest`               | `4.0.18`       | root, graph, mcp                |
| `@types/node`          | `25.2.3`       | root, graph, mcp                |
| `eslint-plugin-oxlint` | `1.46.0`       | root, eslint-config             |
| `typescript-eslint`    | `8.55.0`       | root, eslint-config             |

### Full Version Map

**Root `package.json`** (devDependencies, exact pins): | Package | Current | Target |
|---------|---------|--------| | `@types/node` | `22.15.29` | `25.2.3` | | `eslint` | `9.28.0` |
`9.39.2` | | `eslint-plugin-oxlint` | `1.1.0` | `1.46.0` | | `oxlint` | `1.1.0` | `1.47.0` | |
`prettier` | `3.5.3` | `3.8.1` | | `prettier-plugin-packagejson` | `2.5.10` | `3.0.0` | | `turbo` |
`2.5.4` | `2.8.8` | | `typescript` | `5.8.3` | `5.9.3` | | `typescript-eslint` | `8.33.0` | `8.55.0`
| | `vitest` | `3.2.3` | `4.0.18` | | `packageManager` | `pnpm@10.23.0` | `pnpm@10.29.3` |

**`packages/graph/package.json`**: | Package | Current | Target | Notes |
|---------|---------|--------|-------| | `better-sqlite3` | `^12.4.1` | `^12.6.2` | prod dep, caret
| | `nanoid` | `^5.1.6` | `^5.1.6` | already latest | | `@types/better-sqlite3` | `^7.6.13` |
`^7.6.13` | already latest | | `@types/node` | `22.15.29` | `25.2.3` | exact pin | | `eslint` |
`9.28.0` | `9.39.2` | exact pin | | `typescript` | `5.8.3` | `5.9.3` | exact pin | | `vitest` |
`3.2.3` | `4.0.18` | exact pin |

**`apps/mcp/package.json`**: | Package | Current | Target | Notes |
|---------|---------|--------|-------| | `@modelcontextprotocol/sdk` | `^1.26.0` | `^1.26.0` |
already latest | | `zod` | `^4.3.6` | `^4.3.6` | already latest | | `@types/node` | `22.15.29` |
`25.2.3` | exact pin | | `eslint` | `9.28.0` | `9.39.2` | exact pin | | `tsdown` | `0.20.3` |
`0.20.3` | already latest | | `typescript` | `5.8.3` | `5.9.3` | exact pin | | `vitest` | `3.2.3` |
`4.0.18` | exact pin |

**`tooling/eslint-config/package.json`**: | Package | Current | Target | Notes |
|---------|---------|--------|-------| | `@eslint/js` | `9.28.0` | `9.39.2` | exact pin (NOT 10.x) |
| `eslint-config-prettier` | `10.1.5` | `10.1.8` | exact pin | | `eslint-import-resolver-typescript`
| `4.4.3` | `4.4.4` | exact pin | | `eslint-plugin-check-file` | `3.3.1` | `3.3.1` | already latest
| | `eslint-plugin-import` | `2.31.0` | `2.32.0` | exact pin | | `eslint-plugin-n` | `17.18.0` |
`17.23.2` | exact pin | | `eslint-plugin-oxlint` | `1.1.0` | `1.46.0` | exact pin | |
`eslint-plugin-security` | `3.0.1` | `3.0.1` | already latest | | `eslint-plugin-unicorn` | `59.0.1`
| `63.0.0` | exact pin | | `globals` | `16.1.0` | `17.3.0` | exact pin | | `typescript` | `5.8.3` |
`5.9.3` | exact pin | | `typescript-eslint` | `8.33.0` | `8.55.0` | exact pin |

---

## TODOs

- [x] 1. Update all package.json files with target versions

  **What to do**:
  - Update root `package.json` devDependencies per version map above
  - Update root `packageManager` field from `pnpm@10.23.0` to `pnpm@10.29.3`
  - Update `packages/graph/package.json` per version map above
  - Update `apps/mcp/package.json` per version map above
  - Update `tooling/eslint-config/package.json` per version map above
  - Cross-check: every shared dep has the SAME version across all files (use consistency table)
  - Preserve pinning strategy: exact versions in root + tooling, caret (`^`) for production deps in
    packages/apps

  **Must NOT do**:
  - Do NOT update `.opencode/package.json` (outside workspace)
  - Do NOT update `tsdown` (already at latest)
  - Do NOT use ESLint 10.x or `@eslint/js` 10.x
  - Do NOT change anything other than version numbers
  - Do NOT add or remove dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - No special skills needed — straightforward text edits

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `package.json` (root) — lines 15-28: devDependencies section with exact pin pattern
  - `packages/graph/package.json` — lines 30-33: production deps with `^` prefix pattern
  - `tooling/eslint-config/package.json` — lines 11-25: exact pin pattern for all deps

  **Version Map References**:
  - Full version map in "Version Target Reference" section above — use this as the single source of
    truth
  - Cross-package consistency table — verify after edits

  **Acceptance Criteria**:
  - [ ] All 4 workspace package.json files updated with correct versions
  - [ ] `packageManager` field reads `pnpm@10.29.3`
  - [ ] No ESLint 10.x or `@eslint/js` 10.x anywhere:
        `grep -r '"@eslint/js": "10' packages/ apps/ tooling/ package.json` returns nothing
  - [ ] Version consistency check:
        `grep '"typescript":' package.json packages/graph/package.json apps/mcp/package.json tooling/eslint-config/package.json`
        shows `5.9.3` in all 4
  - [ ] Pinning preserved: production deps in graph/mcp still use `^`, devDeps use exact

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All version targets applied correctly
    Tool: Bash
    Steps:
      1. grep '"typescript":' package.json packages/graph/package.json apps/mcp/package.json tooling/eslint-config/package.json
      2. Assert: all show "5.9.3"
      3. grep '"vitest":' package.json packages/graph/package.json apps/mcp/package.json
      4. Assert: all show "4.0.18"
      5. grep '"eslint":' package.json packages/graph/package.json apps/mcp/package.json
      6. Assert: all show "9.39.2"
      7. grep '"@types/node":' package.json packages/graph/package.json apps/mcp/package.json
      8. Assert: all show "25.2.3"
      9. grep '"eslint-plugin-oxlint":' package.json tooling/eslint-config/package.json
      10. Assert: all show "1.46.0"
      11. grep '"typescript-eslint":' package.json tooling/eslint-config/package.json
      12. Assert: all show "8.55.0"
    Expected Result: All versions consistent across all files
    Evidence: grep output captured

  Scenario: No ESLint 10 present
    Tool: Bash
    Steps:
      1. grep -r '"@eslint/js": "10' . --include="package.json" || echo "NONE"
      2. grep -r '"eslint": "10' . --include="package.json" || echo "NONE"
      3. Assert: both return "NONE"
    Expected Result: ESLint 10 not referenced anywhere
    Evidence: Terminal output captured

  Scenario: Pinning strategy preserved
    Tool: Bash
    Steps:
      1. grep '"better-sqlite3":' packages/graph/package.json
      2. Assert: starts with "^"
      3. grep '"nanoid":' packages/graph/package.json
      4. Assert: starts with "^"
      5. grep '"@modelcontextprotocol/sdk":' apps/mcp/package.json
      6. Assert: starts with "^"
      7. grep '"typescript":' package.json
      8. Assert: no "^" prefix (exact pin)
    Expected Result: Caret for prod deps, exact for dev deps
    Evidence: Terminal output captured
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 2. Regenerate lockfile with pnpm install

  **What to do**:
  - Run `pnpm install` from the repo root to regenerate `pnpm-lock.yaml`
  - Verify installation succeeds (exit code 0)
  - Verify `better-sqlite3` native addon compiles successfully (it's a C++ addon)
  - If install fails, diagnose and fix — most likely cause is peer dependency conflicts

  **Must NOT do**:
  - Do NOT run `pnpm install --force` unless standard install fails
  - Do NOT manually edit `pnpm-lock.yaml`
  - Do NOT delete `node_modules` unless install fails (wastes time)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `pnpm-workspace.yaml` — workspace definition (packages/_, apps/_, tooling/\*)

  **Acceptance Criteria**:
  - [ ] `pnpm install` exits 0
  - [ ] No peer dependency warnings for ESLint plugins
  - [ ] `pnpm-lock.yaml` updated

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: pnpm install succeeds
    Tool: Bash
    Steps:
      1. pnpm install
      2. Assert: exit code 0
      3. Assert: no "ERR_PNPM" in output
    Expected Result: Clean install with updated lockfile
    Evidence: Terminal output captured

  Scenario: Native addon builds
    Tool: Bash
    Steps:
      1. Check pnpm install output for better-sqlite3
      2. Assert: no compilation errors for better-sqlite3
    Expected Result: better-sqlite3 native module compiled
    Evidence: Terminal output captured
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 3. Migrate vitest.workspace.ts for Vitest 4

  **What to do**:
  - Vitest 4 renamed `workspace` to `projects`. The file `vitest.workspace.ts` is deprecated.
  - **Option A (preferred)**: Delete `vitest.workspace.ts`. The monorepo uses Turbo to run tests
    per-package (`turbo run test:unit`), so each package's own `vitest.config.ts` is the entry
    point. The workspace file may not even be needed.
  - **Option B (fallback)**: If deleting breaks test discovery, convert to a root `vitest.config.ts`
    with `test: { projects: ['**/vitest.config.{mjs,js,ts,mts}'] }`.
  - Verify by running `pnpm test:unit` — if tests run and pass, the migration worked.

  **Must NOT do**:
  - Do NOT change per-package vitest configs (`packages/graph/vitest.config.ts`,
    `apps/mcp/vitest.config.ts`, etc.) unless they break
  - Do NOT add vitest coverage configuration
  - Do NOT restructure the test setup beyond what's needed for Vitest 4

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `vitest.workspace.ts` (root) — current workspace file, 1 line:
    `export default ['**/vitest.config.{mjs,js,ts,mts}']`
  - `packages/graph/vitest.config.ts` — per-package config with resolve conditions and test config
  - `packages/graph/vitest.unit.config.ts` — unit config extending base with `mergeConfig`
  - `apps/mcp/vitest.config.ts` — per-package config (same pattern as graph)
  - `turbo.json` — `test:unit` task runs per-package via turbo, meaning each package's
    vitest.config.ts is independently invoked

  **External References**:
  - Vitest 4 migration: workspace renamed to projects

  **Acceptance Criteria**:
  - [ ] `vitest.workspace.ts` deleted (or converted)
  - [ ] `pnpm test:unit` runs and discovers tests in both `packages/graph` and `apps/mcp`
  - [ ] Per-package vitest configs unchanged (unless breakage required fix)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Tests still discovered after workspace migration
    Tool: Bash
    Steps:
      1. pnpm test:unit 2>&1
      2. Assert: exit code 0
      3. Assert: output mentions tests from both packages/graph and apps/mcp
    Expected Result: All unit tests run and pass
    Evidence: Terminal output captured

  Scenario: vitest.workspace.ts removed
    Tool: Bash
    Steps:
      1. test -f vitest.workspace.ts && echo "EXISTS" || echo "DELETED"
      2. Assert: output is "DELETED"
    Expected Result: Deprecated file removed
    Evidence: Terminal output captured
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 4. Clear caches, run full quality gate, fix any breakage

  **What to do**:
  - Clear all caches first: `rm -rf .turbo node_modules/.cache`
  - Clear prettier cache: `rm -rf node_modules/.cache/prettier`
  - Run the quality gate in order, fixing breakage as you go:
    1. `pnpm build` — verify TypeScript compilation and tsdown bundling
    2. `pnpm format:check` — if formatting changed due to prettier 3.8, run `pnpm format` to fix
    3. `pnpm lint` — if ESLint/oxlint rules changed, fix config or code
    4. `pnpm typecheck` — fix any type errors (likely from `@types/node` 25)
    5. `pnpm test:unit` — fix any test breakage
    6. `pnpm test:integration` — fix any integration test breakage

  **Known areas likely to need fixes**:
  - **`eslint-plugin-oxlint`**: Line 185 of `tooling/eslint-config/base.js` uses
    `oxlintPlugin.configs.recommended.rules`. At v1.46.0, this API may have changed to
    `oxlint.configs['flat/recommended']`. If lint fails with a property access error, update this
    line.
  - **Prettier formatting**: Prettier 3.8 may format differently than 3.5. If `format:check` fails,
    just run `pnpm format` to auto-fix.
  - **TypeScript 5.9**: May introduce new strictness. Fix any new type errors.
  - **`@types/node` 25**: May have removed/changed Node.js API type definitions. Fix as needed.

  **Fix order** (critical):
  1. Fix build/typecheck errors FIRST (everything else depends on compilation)
  2. Fix lint errors SECOND
  3. Fix test failures LAST

  **Must NOT do**:
  - Do NOT enable new ESLint rules that didn't exist before
  - Do NOT "improve" code while fixing breakage — minimal changes only
  - Do NOT skip any step in the quality gate
  - Do NOT add vitest coverage config

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - This task requires iterative debugging and may touch multiple files. No special skills needed
      but high effort.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `tooling/eslint-config/base.js:185` — `oxlintPlugin.configs.recommended.rules` — likely needs
    update for oxlint 1.46
  - `prettier.config.mjs` — prettier config with `prettier-plugin-packagejson` plugin explicitly
    loaded
  - `turbo.json` — task definitions for build/typecheck/lint/test

  **Acceptance Criteria**:
  - [ ] `pnpm build` exits 0
  - [ ] `pnpm format:check` exits 0
  - [ ] `pnpm lint` exits 0
  - [ ] `pnpm typecheck` exits 0
  - [ ] `pnpm test:unit` exits 0
  - [ ] `pnpm test:integration` exits 0
  - [ ] `pnpm quality` exits 0 (superset verification)
  - [ ] Build artifacts exist: `packages/graph/dist/index.js` and `apps/mcp/dist/index.js`
  - [ ] No ESLint 10.x in dependency tree

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full quality gate passes
    Tool: Bash
    Steps:
      1. rm -rf .turbo node_modules/.cache
      2. pnpm build
      3. Assert: exit code 0
      4. pnpm quality
      5. Assert: exit code 0
      6. pnpm test:integration
      7. Assert: exit code 0
    Expected Result: All commands exit 0 — zero errors
    Evidence: Terminal output captured

  Scenario: Build artifacts produced correctly
    Tool: Bash
    Steps:
      1. ls -la packages/graph/dist/index.js
      2. Assert: file exists
      3. ls -la apps/mcp/dist/index.js
      4. Assert: file exists
      5. head -1 apps/mcp/dist/index.js
      6. Assert: contains "#!/usr/bin/env node"
    Expected Result: Both packages produce valid build output
    Evidence: Terminal output captured

  Scenario: No ESLint 10 in resolved dependency tree
    Tool: Bash
    Steps:
      1. pnpm ls eslint --depth 0 2>/dev/null
      2. Assert: shows eslint 9.39.2
      3. Assert: does NOT show eslint 10.x
    Expected Result: ESLint stays at 9.x
    Evidence: Terminal output captured
  ```

  **Commit**: NO (groups with Task 5)

---

- [x] 5. Final verification and commit

  **What to do**:
  - Run `pnpm install --frozen-lockfile` to verify lockfile integrity
  - Run `pnpm quality` one final time to confirm everything passes
  - Run `pnpm test:integration` to confirm integration tests pass
  - Verify `packageManager` field in root `package.json` reads `pnpm@10.29.3`
  - Stage all changes and commit

  **Must NOT do**:
  - Do NOT make any code changes in this task — verification only
  - If something fails, go back to Task 4 to fix

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]
    - `git-master`: Needed for creating the atomic commit with proper message

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:
  - Root `package.json` line 29: `packageManager` field

  **Acceptance Criteria**:
  - [ ] `pnpm install --frozen-lockfile` exits 0
  - [ ] `pnpm quality` exits 0
  - [ ] `pnpm test:integration` exits 0
  - [ ] Git commit created with all changes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Lockfile integrity verified
    Tool: Bash
    Steps:
      1. pnpm install --frozen-lockfile
      2. Assert: exit code 0
    Expected Result: Lockfile is complete and consistent with package.json files
    Evidence: Terminal output captured

  Scenario: Final full verification
    Tool: Bash
    Steps:
      1. pnpm quality
      2. Assert: exit code 0
      3. pnpm test:integration
      4. Assert: exit code 0
    Expected Result: Everything passes
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `chore(deps): update all dependencies to latest stable`
  - Files: `package.json`, `pnpm-lock.yaml`, `packages/graph/package.json`, `apps/mcp/package.json`,
    `tooling/eslint-config/package.json`, `vitest.workspace.ts` (deleted), plus any breakage fixes
  - Pre-commit: `pnpm quality && pnpm test:integration`

---

## Commit Strategy

| After Task | Message                                                 | Files             | Verification                            |
| ---------- | ------------------------------------------------------- | ----------------- | --------------------------------------- |
| 5 (all)    | `chore(deps): update all dependencies to latest stable` | All changed files | `pnpm quality && pnpm test:integration` |

---

## Success Criteria

### Verification Commands

```bash
pnpm install --frozen-lockfile  # Expected: exit 0
pnpm build                      # Expected: exit 0
pnpm quality                    # Expected: exit 0 (format + lint + typecheck + test:unit)
pnpm test:integration           # Expected: exit 0
pnpm ls eslint --depth 0        # Expected: shows 9.39.2
grep '"pnpm@' package.json      # Expected: pnpm@10.29.3
```

### Final Checklist

- [x] All "Must Have" present (latest versions, consistency, pinning preserved)
- [x] All "Must NOT Have" absent (no ESLint 10, no .opencode changes, no unnecessary code changes)
- [x] All tests pass (unit + integration)
- [x] Build succeeds (graph + mcp)
- [x] Lockfile is clean and complete
