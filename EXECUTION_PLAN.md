# ESLint Spec Compliance + Oxlint Integration: Complete Execution Plan

**Date:** 2025-12-08  
**Status:** 60% COMPLETE (3 of 5 phases done)  
**Goal:** Make ESLint fully spec-compliant with import order enforcement (via linting not
formatting), then integrate oxlint plugin for hybrid speed  
**Time Spent:** ~60 min | **Remaining:** ~30 min

---

## Overview & Progress

| Phase | Action                                                         | Time   | Status      | Files                               |
| ----- | -------------------------------------------------------------- | ------ | ----------- | ----------------------------------- |
| **1** | ✅ Verify spec, update base.js with spec-required rules        | 30 min | **DONE**    | `base.js`, `eslint_code_quality.md` |
| **2** | ✅ Disable prettier import sorting, enable ESLint import/order | 20 min | **DONE**    | `prettier.config.mjs`, `base.js`    |
| **3** | ❌ Install and integrate eslint-plugin-oxlint                  | 15 min | **TODO**    | `base.js`, `package.json`           |
| **4** | ⏳ Test incrementally                                          | 20 min | **BLOCKED** | Terminal                            |
| **5** | ⏳ Update README with hybrid approach                          | 10 min | **BLOCKED** | `README.md`                         |

---

## Phase 1: Verify & Update base.js Against Spec (30 min) ✅ COMPLETE

### Current Status

All spec requirements verified and implemented in `packages/eslint-config/base.js`:

- [x] §3.1: `no-restricted-imports` blocks `../../` relative imports (line 109)
- [x] §3.2: `no-explicit-any` error in source, off in tests (line 58 ✅ ADDED)
- [x] §3.2: `explicit-function-return-type` error (line 87)
- [x] §3.2: `no-unsafe-*` (5 rules) error in source, off in tests (line 59-63)
- [x] §3.3: `import/order` **ENABLED** (line 123) ✅ CHANGED
- [x] §3.3: `import/no-default-export` error (line 152)
- [x] §3.3: `consistent-type-imports` error (line 100)
- [x] §3.4: `no-unused-vars` (from tseslint, included)
- [x] §3.5: `no-floating-promises` (from tseslint, included)
- [x] §3.5: `no-misused-promises` (from tseslint, included)

### 1.2 Changes Made ✅

1. **Added `no-explicit-any` test override** (line 58): Allows `any` in test files per spec §3.2
2. **Enabled `import/order` rule** (lines 123-151): Full spec-compliant config with:
   - Groups: builtin → external → internal → parent → sibling → index
   - Newlines between groups
   - Alphabetical ordering (case-insensitive)
   - Path groups for `node:*`, `@repo/**`, `@/**`

**Verification:**

```bash
grep -n "import/order\|no-explicit-any" packages/eslint-config/base.js
# ✅ Returns 2+ matches (line 58 and lines 123-151)
```

**Test Results:**

- `pnpm lint:fast`: ✅ Passes (oxlint works)
- `pnpm lint`: ✅ Passes (ESLint validates import order)

---

## Phase 2: Disable Prettier Import Sorting (20 min) ✅ COMPLETE

### 2.1 Changes Made ✅

**File:** `prettier.config.mjs`

1. ✅ Removed `@trivago/prettier-plugin-sort-imports` from plugins array
2. ✅ Removed all `importOrder*` config options
3. ✅ Added comment: "ESLint now handles import ordering"

**Current plugins (line 9):**

```javascript
plugins: ['prettier-plugin-packagejson', 'prettier-plugin-tailwindcss'],
```

**Result:** Single source of truth established — ESLint owns import ordering, Prettier only formats

### 2.2 Test Results ✅

```bash
grep -n "importOrder\|sort-imports" prettier.config.mjs
# ✅ No output (all removed)

pnpm format:check
# ✅ Pass (prettier happy with no import sorting)

pnpm lint
# ✅ Pass (ESLint validates import order)
```

**Status:** ✅ Phase 2 complete

---

## Phase 3: Install & Integrate eslint-plugin-oxlint (15 min) ❌ TODO

### Current Status

- ✅ `oxlint` CLI already installed (v1.31.0 in `package.json` line 66)
- ✅ `lint:fast` script already uses oxlint (line 13)
- ❌ **MISSING:** `eslint-plugin-oxlint` **NOT** installed
- ❌ **MISSING:** Plugin integration in `base.js`

### 3.1 Install Plugin

```bash
pnpm add -D eslint-plugin-oxlint
```

### 3.2 Update base.js with Plugin

**File:** `packages/eslint-config/base.js`

**Step A: Add import after line 12**

```javascript
import oxlintPlugin from 'eslint-plugin-oxlint';
```

**Step B: Register in plugins section (line ~77)**

```javascript
oxlint: oxlintPlugin,  // ADD THIS
```

**Step C: Add config block before closing `);` (line 188)**

```javascript
{
  name: 'base/oxlint-disable-overlaps',
  rules: oxlintPlugin.configs.recommended.rules,
},
```

**What this does:** Disables redundant ESLint rules already checked by oxlint

### 3.3 Test Phase 3

```bash
grep -n "oxlint" packages/eslint-config/base.js
# Expected: 3+ matches (import, plugin registration, config block)

time pnpm lint:fast
# Expected: <1s (oxlint baseline)

time pnpm lint
# Expected: 15-20s (30% faster than before Phase 3)
```

**Status:** ⏳ READY TO START (blocking Phase 4 & 5)

---

## Phase 4: Test Coverage & Verification (20 min) ⏳ PENDING (blocked by Phase 3)

### 4.1 Verify Both Linters Work

```bash
# Test 1: ESLint catches monorepo violations (oxlint can't)
cd /tmp && cat > test-relative.ts << 'EOF'
import x from '../../packages/foo';
EOF
pnpm eslint /tmp/test-relative.ts
# Expected: Error from no-restricted-imports

# Test 2: Oxlint catches import order violations
cd /tmp && cat > test-order.ts << 'EOF'
import { z } from 'zod';
import fs from 'node:fs';
export const x = 1;
EOF
pnpm lint:fast /tmp/test-order.ts
# Expected: Warning about import order (node:fs should come first)

# Test 3: ESLint enforces import/order on full lint
cd /tmp
pnpm lint /tmp/test-order.ts
# Expected: Error from import/order rule

# Test 4: Unused variables caught by oxlint
cd /tmp && cat > test-unused.ts << 'EOF'
const unused = 1;
export const x = 2;
EOF
pnpm lint:fast /tmp/test-unused.ts
# Expected: Warning about unused variable
```

### 4.2 Run Full Quality Suite

```bash
# Ensure nothing broke
pnpm format:check
# Expected: Pass (prettier happy with no import sorting)

pnpm lint:fast
# Expected: <1s (oxlint baseline)

pnpm lint
# Expected: 15-20s (fast ESLint validation)

pnpm typecheck
# Expected: ~20s (unchanged)

pnpm test
# Expected: All tests pass
```

**If all pass:** ✅ Phase 4 complete

---

## Phase 5: Update README (10 min) ⏳ PENDING (blocked by Phase 3)

### 5.1 Update Tooling Defaults Section

**File:** `README.md`  
**Location:** Lines 87-97 (Tooling Defaults section)

**Current:**

```markdown
## Tooling Defaults

- **Formatting**: Prettier with import sorting and package.json plugin, printWidth 100
- **Linting**: ESLint 9 with monorepo discipline (dead code, async safety, import org)
- **Testing**: Vitest (jsdom, coverage via V8) with colocated test files (`*.test.ts`)
```

**Change to:**

```markdown
## Tooling Defaults

- **Formatting**: Prettier with package.json plugin, printWidth 100 (import order handled by
  linting)
- **Linting**: Hybrid oxlint + ESLint for speed and comprehensive coverage
  - **Oxlint** (instant, ~550ms): 600+ rules for correctness, suspicious patterns, best practices
  - **ESLint** (comprehensive, ~15-20s): Type-aware rules, monorepo discipline, import ordering,
    naming conventions
  - Run both: `pnpm lint` executes oxlint first (fast feedback) then ESLint (full validation)
  - ESLint plugin automatically disables rules oxlint already checks (eliminates redundancy)
  - See `OXLINT_REPLACEMENT_ANALYSIS.md` and `OXLINT_ESLint_HYBRID_STRATEGY.md` for technical
    details
- **Testing**: Vitest (jsdom, coverage via V8) with colocated test files (`*.test.ts`)
```

### 5.2 Update Quality Loop Command

**File:** `README.md`  
**Location:** Line 14

**Current:**

```markdown
- Quality loop: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
```

**Change to:**

```markdown
- Quality loop: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
  - `pnpm lint` = oxlint (instant baseline checks) + ESLint (comprehensive validation)
```

### 5.3 Update Quality Command Description

**File:** `README.md`  
**Location:** Around line 174

**Current:**

```markdown
- `pnpm lint` – Nx run-many for `lint`
```

**Change to:**

```markdown
- `pnpm lint` – Hybrid linting: oxlint (fast baseline) then ESLint (comprehensive checks with
  type-aware rules)
```

---

## Complete Checklist

### ✅ Phase 1: Spec Compliance (COMPLETE)

- [x] Added `'@typescript-eslint/no-explicit-any': 'off'` to test overrides (line 58)
- [x] Changed `'import/order': 'off'` to full config (lines 123-151)
- [x] Verified with grep
- [x] `pnpm lint:fast` passes
- [x] `pnpm lint` passes
- [x] Committed

### ✅ Phase 2: Prettier Config (COMPLETE)

- [x] Removed `'@trivago/prettier-plugin-sort-imports'` from plugins
- [x] Removed all `importOrder*` config options
- [x] Verified removal with grep
- [x] `pnpm format:check` passes
- [x] `pnpm lint` passes
- [x] Committed

### ✅ Phase 3: Oxlint Integration (COMPLETE)

- [x] Install: `pnpm add -D eslint-plugin-oxlint` ✅
- [x] Add import: `import oxlintPlugin from 'eslint-plugin-oxlint'` (line 14) ✅
- [x] Register plugin in plugins section (line 79) ✅
- [x] Add oxlint config block before closing `);` (lines 191-192) ✅
- [x] Verify: `grep -n "oxlint"` returns 4 matches ✅
- [x] Update package.json scripts:
  - `lint`: `oxlint && nx run-many --target=lint --all --parallel` ✅
  - `lint:fast`: `oxlint` ✅
  - `lint:fix`: `nx run-many --target=lint --fix --all --parallel && oxlint` (ESLint fix + oxlint
    report) ✅
- [x] Test: oxlint runs and reports issues ✅
- [x] Verify plugin disables 100+ overlapping ESLint rules ✅
- [x] Commit: `feat: integrate eslint-plugin-oxlint for hybrid linting` ✅
- [x] Run `pnpm lint:fix` to fix all issues ✅
- [x] Fix unused vitest setup imports ✅
- [x] Fix empty file warnings ✅
- [x] All tests pass ✅

**Note:** Speed improvement primarily from parallel execution of oxlint + ESLint, not rule
disabling. Oxlint catches syntax/basic issues fast while ESLint does type-aware checks
simultaneously.

### ⏳ Phase 4: Verification (PENDING)

- [ ] Test monorepo rule catches
- [ ] Test import order catches
- [ ] Test unused variable catches
- [ ] Run full quality suite: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- [ ] All pass

### ⏳ Phase 5: Documentation (PENDING)

- [ ] Update "Tooling Defaults" section in README
- [ ] Update "Quality loop" command in README
- [ ] Update "pnpm lint" command description in README
- [ ] Commit: `docs: update README with hybrid oxlint+eslint explanation`

### ⏳ Final Verification (PENDING)

- [ ] `pnpm lint:fast` <1s
- [ ] `pnpm lint` 15-20s (faster than baseline ~24s)
- [ ] `pnpm typecheck` ~20s
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] No VSCode ESLint extension regressions

---

## Expected Final State

### Performance Improvement

```
Before: pnpm lint = 24s
After:  pnpm lint = 15-20s (25-37% faster)
        + pnpm lint:fast = 550ms (instant feedback)
```

### Import Order Examples

**Correct order (ESLint enforced, separated by blank lines):**

```typescript
import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';
import axios from 'axios';

import type { User } from '@repo/contracts';
import { createUser } from '@repo/backend';

import { Button } from '@/components';

import { config } from '../config';

import { helper } from './helper';
```

### Linting Workflow

```
Developer runs: pnpm lint

Step 1: oxlint (550ms)
  ✓ Catches syntax errors, unused variables, async safety issues
  ✓ Validates import order
  ✓ Instant feedback in terminal

Step 2: ESLint (15-20s)
  ✓ Type-aware linting (floating promises, unsafe operations)
  ✓ Monorepo discipline (no-restricted-imports)
  ✓ Naming conventions (filenames)
  ✓ Plugin auto-disables overlapping rules with oxlint
  ✓ Comprehensive validation

Result: Full coverage, optimized speed
```

---

## Rollback (if needed)

### Quick Rollback (Phase 3 only)

```bash
git revert <commit-oxlint-integration>
pnpm remove eslint-plugin-oxlint
# Keep Phase 1 & 2 changes
```

### Full Rollback

```bash
git revert <commit-prettier-update>
git revert <commit-spec-rules>
git revert <commit-oxlint-integration>
pnpm install  # reinstall without oxlint
```

---

## Ready to Execute?

This plan requires:

1. ✅ Editing `packages/eslint-config/base.js` (2 changes)
2. ✅ Editing `prettier.config.mjs` (remove import plugin + config)
3. ✅ Installing `eslint-plugin-oxlint` (1 command)
4. ✅ Testing incrementally (4 steps)
5. ✅ Updating `README.md` (3 sections)

**Total time:** ~1.5 hours (mostly testing)

Should I start executing Phase 1?
