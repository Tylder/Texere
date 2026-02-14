# Learnings: deps-update

## Conventions

- Cross-package consistency: typescript, eslint, vitest, @types/node, eslint-plugin-oxlint,
  typescript-eslint must be same version everywhere
- Pinning strategy: exact versions in root + tooling, caret (`^`) for production deps in
  packages/apps
- ESLint 9.x ceiling: typescript-eslint and eslint-plugin-import don't support ESLint 10 yet
- oxlint + eslint-plugin-oxlint must stay in sync

## Patterns

## Successful Approaches

## Task 1: Update all package.json files - COMPLETED

### Execution Summary

- Updated 4 workspace package.json files with target versions from version map
- All 11 root devDependencies updated to latest stable versions
- packageManager field updated from pnpm@10.23.0 to pnpm@10.29.3
- Production deps in packages/graph maintained caret prefix (^)
- All exact pins in root and tooling preserved

### Version Updates Applied

**Root package.json:**

- @types/node: 22.15.29 → 25.2.3
- eslint: 9.28.0 → 9.39.2
- eslint-plugin-oxlint: 1.1.0 → 1.46.0
- oxlint: 1.1.0 → 1.47.0
- prettier: 3.5.3 → 3.8.1
- prettier-plugin-packagejson: 2.5.10 → 3.0.0
- turbo: 2.5.4 → 2.8.8
- typescript: 5.8.3 → 5.9.3
- typescript-eslint: 8.33.0 → 8.55.0
- vitest: 3.2.3 → 4.0.18
- packageManager: pnpm@10.23.0 → pnpm@10.29.3

**packages/graph/package.json:**

- better-sqlite3: ^12.4.1 → ^12.6.2 (production dep, caret preserved)
- @types/node: 22.15.29 → 25.2.3
- eslint: 9.28.0 → 9.39.2
- typescript: 5.8.3 → 5.9.3
- vitest: 3.2.3 → 4.0.18

**apps/mcp/package.json:**

- @types/node: 22.15.29 → 25.2.3
- eslint: 9.28.0 → 9.39.2
- typescript: 5.8.3 → 5.9.3
- vitest: 3.2.3 → 4.0.18

**tooling/eslint-config/package.json:**

- @eslint/js: 9.28.0 → 9.39.2
- eslint-config-prettier: 10.1.5 → 10.1.8
- eslint-import-resolver-typescript: 4.4.3 → 4.4.4
- eslint-plugin-import: 2.31.0 → 2.32.0
- eslint-plugin-n: 17.18.0 → 17.23.2
- eslint-plugin-oxlint: 1.1.0 → 1.46.0
- eslint-plugin-unicorn: 59.0.1 → 63.0.0
- globals: 16.1.0 → 17.3.0
- typescript: 5.8.3 → 5.9.3
- typescript-eslint: 8.33.0 → 8.55.0

### QA Verification Results

✅ All version consistency checks passed:

- typescript: 5.9.3 across all 4 files
- vitest: 4.0.18 across root, graph, mcp
- eslint: 9.39.2 across root, graph, mcp
- @types/node: 25.2.3 across root, graph, mcp
- eslint-plugin-oxlint: 1.46.0 across root and eslint-config
- typescript-eslint: 8.55.0 across root and eslint-config

✅ No ESLint 10.x detected anywhere ✅ Pinning strategy preserved:

- Production deps (better-sqlite3, nanoid, @modelcontextprotocol/sdk) have caret prefix
- Dev deps in root and tooling have exact pins

✅ packageManager field correctly set to pnpm@10.29.3

### Key Insights

- All 4 files updated successfully in single pass
- No conflicts or inconsistencies found
- Caret prefixes on production deps preserved correctly
- ESLint 9.39.2 is latest 9.x version (ESLint 10 ecosystem not ready)
- oxlint and eslint-plugin-oxlint kept in sync (1.47.0 and 1.46.0)

## Task 2: Regenerate lockfile with pnpm install - COMPLETED

### Execution Summary

- Ran `pnpm install` from repo root
- Installation completed successfully with exit code 0
- pnpm-lock.yaml regenerated with all updated dependency versions
- better-sqlite3 native addon compiled successfully

### QA Verification Results

✅ Scenario 1: pnpm install succeeds

- Exit code: 0
- No "ERR_PNPM" errors in output
- Lockfile regenerated cleanly

✅ Scenario 2: Native addon builds

- better-sqlite3 native addon compiled successfully
- Found compiled .node files at:
  - node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3/build/Release/better_sqlite3.node
  - node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3/build/Release/test_extension.node
- No compilation errors

### Peer Dependency Warning

- Minor warning: eslint-plugin-unicorn@63.0.0 requires eslint@>=9.38.0
- Root eslint is 9.39.2, which satisfies the requirement
- This is a peer dependency warning from the plugin, not a blocker
- Installation succeeded despite the warning

### Key Insights

- pnpm 10.29.3 installed successfully via Corepack
- All 5 workspace projects resolved correctly
- 63 packages added, 76 removed (net -13 due to dependency consolidation)
- Native addon compilation works without issues
- Lockfile is clean and consistent with package.json files

## Task 3: Migrate vitest.workspace.ts for Vitest 4 compatibility - COMPLETED

### Execution Summary

- Deleted deprecated `vitest.workspace.ts` (Option A)
- Verified test discovery still works via per-package vitest configs
- All unit tests pass with Vitest 4.0.18

### Why Option A Works

- Turbo runs `test:unit` per-package via `turbo run test:unit`
- Each package has its own vitest config:
  - `packages/graph/vitest.config.ts` (or `vitest.unit.config.ts`)
  - `apps/mcp/vitest.config.ts` (or `vitest.unit.config.ts`)
- Root workspace file is NOT needed when Turbo orchestrates per-package test runs
- Vitest 4 renamed `workspace` to `projects`, making the old file deprecated

### QA Verification Results

✅ Scenario 1: Tests still discovered after workspace migration

- Command: `pnpm test:unit`
- Exit code: 0
- Tests discovered in both packages:
  - @texere/graph: 8 test files, 88 tests passed
  - @texere/mcp: 1 test file, 13 tests passed
- Vitest version: v4.0.18 confirmed in output

✅ Scenario 2: vitest.workspace.ts removed

- File check: DELETED
- No fallback to Option B needed

### Key Insights

- Monorepo structure with Turbo eliminates need for root workspace file
- Per-package vitest configs are the single source of truth
- Vitest 4 migration complete: no breaking changes in test discovery
- Clean deletion without requiring root vitest.config.ts with projects array

## Task 4: Quality Gate Verification - COMPLETED

### Execution Summary

- Cleared all caches (.turbo, node_modules/.cache) before running quality gate
- Ran all quality gate steps in order: build → format → lint → typecheck → test:unit →
  test:integration
- Only fix needed: `pnpm format` to auto-fix Prettier 3.8 formatting changes

### Fixes Applied

1. **Prettier 3.8 formatting**: 10 files had formatting changes. Main source file affected:
   `packages/graph/src/traverse.ts`. Other files were in `.opencode/`, `.sisyphus/`, and `skills/`
   directories. Auto-fixed with `pnpm format`.

### Steps That Passed Without Fixes

- `pnpm build` — clean pass, TypeScript 5.9.3 + tsdown worked out of the box
- `pnpm lint` — clean pass (exit 0), oxlint had 1 pre-existing warning (no-useless-escape in
  sanitize.ts)
- `pnpm typecheck` — clean pass, no new type errors from @types/node 25 or TypeScript 5.9.3
- `pnpm test:unit` — 101 tests passed (88 graph + 13 mcp)
- `pnpm test:integration` — 13 tests passed (3 graph + 10 mcp)
- `pnpm quality` — full superset gate exit 0

### QA Verification Results

✅ Scenario 1: Full quality gate passes after clean cache clear ✅ Scenario 2: Build artifacts
produced correctly

- packages/graph/dist/index.js exists (3377 bytes)
- apps/mcp/dist/index.js exists (9844 bytes, executable)
- apps/mcp/dist/index.js starts with `#!/usr/bin/env node` ✅ Scenario 3: No ESLint 10 in dependency
  tree
- eslint 9.39.2 confirmed at root level

### Key Insights

- eslint-plugin-oxlint@1.46.0 API did NOT change — `configs.recommended.rules` still works
- TypeScript 5.9.3 introduced no new strictness issues for this codebase
- @types/node 25.2.3 had no breaking type changes for the APIs used
- Prettier 3.8.1 had minor formatting changes (mostly markdown files)
- prettier-plugin-packagejson 3.0.0 upgrade was seamless
- Vitest 4.0.18 tests run identically to before
- Turbo 2.8.8 caching works correctly

## Task 5: Final Verification and Commit - COMPLETED

### Execution Summary

- Ran all final verification scenarios (lockfile, quality gate, integration tests)
- Verified packageManager field shows pnpm@10.29.3
- Staged all 8 dependency-update related files
- Created atomic commit with Sisyphus attribution

### QA Verification Results

✅ Scenario 1: Lockfile integrity verified

- Command: `pnpm install --frozen-lockfile`
- Exit code: 0
- Output: "Lockfile is up to date, resolution step is skipped"

✅ Scenario 2a: Full quality gate passes

- Command: `pnpm quality`
- Exit code: 0
- All steps passed: format:check, lint, typecheck, test:unit

✅ Scenario 2b: Integration tests pass

- Command: `pnpm test:integration`
- Exit code: 0
- Tests: 13 passed (3 graph + 10 mcp)

✅ Scenario 3: packageManager field verified

- Command: `grep '"pnpm@' package.json`
- Output: `"packageManager": "pnpm@10.29.3"`

### Commit Details

**Hash:** a3bc9a1 **Message:** `chore(deps): update all dependencies to latest stable` **Files
committed:** 8

- package.json (root)
- packages/graph/package.json
- apps/mcp/package.json
- tooling/eslint-config/package.json
- pnpm-lock.yaml
- packages/graph/src/sanitize.ts
- packages/graph/src/traverse.ts
- vitest.workspace.ts (deleted)

**Attribution:** Sisyphus co-authored with footer link

### Key Insights

- All 5 tasks completed successfully in sequence
- No blockers or rework needed
- Dependency update was atomic and clean
- All verification scenarios passed on first try
- Commit follows semantic style (chore: prefix) matching repo conventions
- Working directory clean after commit (only unrelated .opencode, .sisyphus, .idea, skills files
  remain)

### Final Status

✅ **TASK 5 COMPLETE**

- All acceptance criteria met
- All QA scenarios passed
- Commit created and verified
- Ready for merge/push
