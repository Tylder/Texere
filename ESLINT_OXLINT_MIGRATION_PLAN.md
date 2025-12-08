# ESLint → Spec-Compliant → ESLint-Plugin-Oxlint Integration Plan

**Date:** 2025-12-08  
**Status:** Ready to Execute  
**Goal:** Make ESLint fully spec-compliant, then optimize with `eslint-plugin-oxlint`

---

## Phase Overview

| Phase       | Duration  | Goal                                | Deliverable                         |
| ----------- | --------- | ----------------------------------- | ----------------------------------- |
| **Phase 1** | 1-2 hours | Audit & setup spec-compliant ESLint | Fully spec-aligned `base.js`        |
| **Phase 2** | 30 min    | Integrate oxlint plugin             | Faster ESLint without coverage loss |
| **Phase 3** | 30 min    | Verify & test                       | Working hybrid setup                |
| **Phase 4** | Ongoing   | Monitor & optimize                  | Performance metrics                 |

---

## Phase 1: Make ESLint Spec-Compliant (1-2 hours)

### 1.1 Audit Current Config (15 min)

**File:** `packages/eslint-config/base.js`

**What's already correct:**

- ✅ Line 108-119: `no-restricted-imports` (monorepo discipline §3.1)
- ✅ Line 86-96: `explicit-function-return-type` (type safety §3.2)
- ✅ Line 99-105: `consistent-type-imports` (import org §3.3)
- ✅ Line 54-63: Test file overrides for `no-unsafe-*` (type safety §3.2)
- ✅ Line 50: `tseslint.configs.recommendedTypeChecked` (covers async rules §3.5)
- ✅ Line 145-155: `check-file/filename-naming-convention` (naming convention)

**What needs verification:**

- Line 123: `import/no-default-export` – Should be `error` (per §3.3)
  - Currently: `'error'` ✅
  - Spec says: error except Next.js (need per-package override)

**What to check:**

- [ ] All §3 rules from spec actually configured
- [ ] Test file overrides complete (§3.2)
- [ ] Next.js override for default exports (§3.3)

### 1.2 Verify Rule Coverage (30 min)

**Checklist: §3.1 Monorepo Discipline**

- [x] `no-restricted-imports` enforces workspace imports
  - File: `base.js` line 108
  - Status: ✅ Correct

**Checklist: §3.2 Type Safety**

- [x] `no-explicit-any` – error (source), off (tests)
  - From: `tseslint.configs.recommendedTypeChecked`
  - Status: ✅ Included, test override needed
  - [ ] **ACTION:** Add test override for `no-explicit-any` (line 56)

- [x] `explicit-function-return-type` – error
  - File: `base.js` line 86
  - Status: ✅ Correct

- [x] `no-unsafe-*` (5 rules) – error (source), off (tests)
  - Rules: `no-unsafe-argument`, `no-unsafe-assignment`, `no-unsafe-call`,
    `no-unsafe-member-access`, `no-unsafe-return`
  - File: `base.js` line 54-63
  - Status: ✅ Correct

**Checklist: §3.3 Import Organization**

- [x] `import/order` – disabled
  - File: `base.js` line 122
  - Status: ✅ Correct (Prettier handles it)

- [x] `import/no-default-export` – error (except Next.js)
  - File: `base.js` line 123
  - Status: ⚠️ Currently `'error'` globally
  - [ ] **ACTION:** Add Next.js override in `apps/admin-ui/eslint.config.mjs` or
        `apps/web/eslint.config.mjs`

- [x] `consistent-type-imports` – error
  - File: `base.js` line 99
  - Status: ✅ Correct

**Checklist: §3.4 Dead Code**

- [x] `no-unused-vars` – error
  - From: `tseslint.configs.recommendedTypeChecked`
  - Status: ✅ Included

**Checklist: §3.5 Async Safety**

- [x] `no-floating-promises` – error
  - From: `tseslint.configs.recommendedTypeChecked`
  - Status: ✅ Included

- [x] `no-misused-promises` – error
  - From: `tseslint.configs.recommendedTypeChecked`
  - Status: ✅ Included

### 1.3 Make Required Changes (45 min)

#### Change 1: Add Missing Test Override

**File:** `packages/eslint-config/base.js`

**Location:** Around line 56 (test file overrides)

**Add:**

```javascript
{
  // Test files: relax unsafe type rules as per spec (eslint_code_quality.md §3.2)
  files: ['**/*.{test,spec}.{ts,tsx}'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',  // ADD THIS
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
},
```

#### Change 2: Add Next.js Override for Default Exports

**File:** Check if `apps/admin-ui/eslint.config.mjs` or `apps/web/eslint.config.mjs` exist

**If they exist:** Add this override

```javascript
{
  // Next.js requires default exports in app/page.tsx (spec exception §3.3)
  files: ['app/**/*.tsx'],
  rules: {
    'import/no-default-export': 'off',
  },
},
```

**If they don't exist:** Create minimal override file or document that it's not needed

#### Change 3: Verify No Additional Spec Divergences

Run after changes:

```bash
grep -n "no-explicit-any\|explicit-function-return-type\|consistent-type-imports\|no-restricted-imports" packages/eslint-config/base.js
```

Expected output: All 4 rules present and configured correctly

### 1.4 Test Phase 1 (15 min)

```bash
# Run linting (will be slow due to full ESLint)
time pnpm lint

# Expected: ~24-30s (no speed change, just full validation)
# Expected: No new errors introduced
# Expected: Same behavior as before (we only added missing overrides)
```

---

## Phase 2: Integrate eslint-plugin-oxlint (30 min)

### 2.1 Install Plugin

```bash
pnpm add -D eslint-plugin-oxlint
```

### 2.2 Update `packages/eslint-config/base.js`

#### Step 1: Add Import (after line 13)

```javascript
import oxlintPlugin from 'eslint-plugin-oxlint';
```

#### Step 2: Add Plugin Registration (in plugins section, around line 76)

```javascript
plugins: {
  import: importPlugin,
  'jsx-a11y': jsxA11yPlugin,
  n: nodePlugin,
  security: securityPlugin,
  sonarjs: sonarjsPlugin,
  unicorn: unicornPlugin,
  'check-file': checkFilePlugin,
  '@nx': nxPlugin,
  oxlint: oxlintPlugin,  // ADD THIS
}
```

#### Step 3: Add Oxlint Config Block (at end of config array, after other configs)

```javascript
{
  name: 'base/oxlint-disable-overlaps',
  rules: oxlintPlugin.configs.recommended.rules,
},
```

### 2.3 What This Does

The `eslint-plugin-oxlint` plugin:

- **Disables** ESLint rules that oxlint already checks
- **Keeps** ESLint rules oxlint doesn't have
- ESLint runs faster because many rules are no-ops
- Coverage remains 100% (oxlint checks the no-op rules)

### 2.4 Verify Plugin Works

```bash
# Check plugin is loaded
grep -n "oxlint" packages/eslint-config/base.js

# Should show plugin import and config
```

---

## Phase 3: Verify & Test (30 min)

### 3.1 Run Full Lint Cycle

```bash
# Step 1: Fast oxlint baseline (should be ~550ms)
time pnpm lint:fast
# Expected: <1s, finds issues like unused imports

# Step 2: Full validation (should be faster than before)
time pnpm lint
# Expected: ~15-20s (instead of 24s), with oxlint + lighter ESLint

# Step 3: Type checking (unchanged)
time pnpm typecheck
# Expected: ~20s
```

### 3.2 Verify Coverage (5 min)

Test that both linters catch issues they should:

```bash
# Create test violations in a scratch file:

# 1. Relative cross-package import
echo "import x from '../../packages/foo';" > /tmp/test.ts
pnpm eslint /tmp/test.ts
# Expected: eslint catches it (oxlint can't check this)

# 2. Unused variable
echo "const unused = 1;" > /tmp/test.ts
pnpm lint:fast  # oxlint
# Expected: oxlint catches it

# 3. Type-only import syntax
echo "import { User } from '@repo/types';" > /tmp/test.ts
pnpm lint:fast  # oxlint
# Expected: oxlint catches the violation (should be `import type`)

# 4. Default export (outside Next.js)
echo "export default function Foo() {}" > /tmp/packages/foo/src/test.ts
pnpm lint:fast  # oxlint
# Expected: oxlint catches it

# Clean up
rm /tmp/test.ts
```

### 3.3 Compare Performance

**Before Phase 2 (with full ESLint):**

```
pnpm lint:fast    551ms
pnpm lint         24.2s
```

**After Phase 2 (with oxlint plugin):**

```
pnpm lint:fast    551ms (unchanged)
pnpm lint         15-18s (faster! ~30% speedup)
```

### 3.4 Run Full Test Suite

```bash
# Ensure nothing broke
pnpm build
pnpm test
pnpm typecheck
```

---

## Phase 4: Monitor & Optimize (Ongoing)

### 4.1 Document Changes

Update `LINT_RECOMMENDATIONS.md`:

```markdown
## Phase 2 Complete: Oxlint Plugin Integration

**Changes made:**

- Added `eslint-plugin-oxlint` to disable overlapping rules
- Phase 1 verified spec compliance
- ESLint now 30% faster (~18s instead of 24s)
- Coverage remains 100%

**Lint times:**

- `pnpm lint:fast`: 551ms (oxlint only, instant feedback)
- `pnpm lint`: 18s (oxlint + lightweight ESLint)
- `pnpm typecheck`: 20s (TypeScript only)

**Next steps:**

- Monitor oxlint stability
- Consider Phase 3 (remove duplicate rules) in 1 month
```

### 4.2 Set Baseline Metrics

Record in `post-report.log` or CI metrics:

- ESLint execution time: 18s
- Oxlint execution time: 551ms
- Rules checked: ~100 (ESLint) + 600 (oxlint, disabled duplicates)

### 4.3 Future Optimization (Phase 3, Optional)

In 1 month, if stable, consider removing ESLint rules/plugins that oxlint fully covers:

- Remove plugin imports: `import`, `unicorn`, `security`, `sonarjs`, `jsx-a11y`, `n`
- Remove rule configs for those plugins
- Update base.js to only have: `check-file`, `@nx`, type-aware rules
- Expected result: ESLint runs in 6-8s instead of 18s

---

## Implementation Checklist

### Before Starting

- [ ] Read this plan
- [ ] Read `eslint_code_quality.md` (your spec)
- [ ] Have `packages/eslint-config/base.js` open
- [ ] Ensure watchers are running: `pnpm dev:log` and `pnpm typecheck:watch:log`

### Phase 1: Spec Compliance

- [ ] Add `@typescript-eslint/no-explicit-any: 'off'` to test overrides (line 56)
- [ ] Check if Next.js apps have eslint config; add default export override if needed
- [ ] Run `pnpm lint` to verify no new errors
- [ ] Record before-Phase-2 lint time

### Phase 2: Oxlint Integration

- [ ] Install: `pnpm add -D eslint-plugin-oxlint`
- [ ] Add import: `import oxlintPlugin from 'eslint-plugin-oxlint'`
- [ ] Register plugin in plugins section
- [ ] Add oxlint config block at end
- [ ] Run `pnpm lint` again
- [ ] Record after-Phase-2 lint time

### Phase 3: Verification

- [ ] Run lint cycle (lint:fast, lint, typecheck)
- [ ] Test coverage with violation examples
- [ ] Run build and tests
- [ ] Verify no regressions in CI

### Phase 4: Documentation

- [ ] Update `LINT_RECOMMENDATIONS.md` with new approach
- [ ] Update AGENTS.md if workflow changed
- [ ] Commit changes with message describing hybrid approach

---

## Expected Final State

### Lint Times

```
Local development:
  pnpm lint:fast    <1s     (instant feedback, oxlint only)
  pnpm lint         15-18s  (full validation, oxlint + lighter ESLint)
  pnpm typecheck    ~20s    (TypeScript compilation)

CI/CD:
  Same as local (no changes to scripts)
```

### Rule Coverage

```
Oxlint checks:
- 600+ rules (correctness, suspicious, restriction categories)
- ~80% of typical linting needs

ESLint checks:
- Monorepo discipline (no-restricted-imports)
- Nx boundaries (@nx/dependency-checks)
- Type safety (type-aware rules)
- Naming conventions (check-file)
- ~15-20% specialized rules

Total coverage: 100% (no gaps)
```

### Configuration

```
packages/eslint-config/base.js:
- Fully spec-compliant (all §3 rules from eslint_code_quality.md)
- Uses eslint-plugin-oxlint to disable redundant checks
- Lean config (minimal duplicates)

apps/*/eslint.config.mjs:
- May have Next.js override for default exports (if added)
- Otherwise unchanged
```

---

## Rollback Plan

If anything breaks:

### Quick Rollback (5 min)

```bash
# Undo Phase 2 only (keep Phase 1 spec compliance)
git revert <commit-with-oxlint-changes>

# Or manually remove:
# - oxlintPlugin import
# - oxlint from plugins section
# - oxlint config block
# - pnpm remove eslint-plugin-oxlint
```

### Full Rollback (if Phase 1 changes caused issues)

```bash
git revert <commit-with-phase1-changes>
# Back to original state (but slower linting)
```

---

## Questions to Confirm Before Executing

1. **Next.js apps:** Do `apps/admin-ui/` and `apps/web/` have their own `eslint.config.mjs`? (I need
   to check if default export override is needed)

2. **Test file locations:** Besides `**/*.test.ts` and `**/*.spec.ts`, are there other test patterns
   I should add overrides for? (e.g., `.setup.ts` files)

3. **Timing tolerance:** Is 15-18s lint time acceptable for Phase 2, or should I plan Phase 3
   (removal) sooner?

4. **CI/CD:** Should CI use `pnpm lint:fast && pnpm lint` in sequence, or combined in one step?

5. **Documentation:** Should I update any of these files:
   - AGENTS.md (development workflow)?
   - README.md (lint instructions)?
   - Or just LINT_RECOMMENDATIONS.md?

Once you confirm these, I can execute the full plan with code changes.
