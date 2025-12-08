# ESLint + Oxlint Integration: Execution Plan

**Date:** 2025-12-08  
**Status:** Ready to Execute  
**Goal:** Add all spec-required ESLint rules, then integrate `eslint-plugin-oxlint` for hybrid speed

---

## Quick Summary

1. **Ensure base.js has all spec rules** (no removal, just verify coverage)
2. **Add missing rules from spec** if any gaps found
3. **Install `eslint-plugin-oxlint`** to disable overlaps automatically
4. **Test incrementally** after each step
5. **Update README** to document hybrid approach

**Expected result:** Full coverage + 30% faster ESLint via plugin auto-disable

---

## Step 1: Verify base.js Against Spec (15 min)

**File:** `packages/eslint-config/base.js` (already has most rules)

**Spec checklist (from `eslint_code_quality.md` §3):**

| Section | Rule                            | Status           | Line  | Notes                            |
| ------- | ------------------------------- | ---------------- | ----- | -------------------------------- |
| §3.1    | `no-restricted-imports`         | ✅ Present       | 108   | Blocks `../../` relative imports |
| §3.2    | `no-explicit-any`               | ✅ From tseslint | 49    | Via recommendedTypeChecked       |
| §3.2    | `explicit-function-return-type` | ✅ Present       | 86    | Explicit return types required   |
| §3.2    | `no-unsafe-*` (5 rules)         | ✅ Present       | 54-63 | Test file overrides included     |
| §3.3    | `import/order`                  | ✅ Disabled      | 122   | Prettier handles sorting         |
| §3.3    | `import/no-default-export`      | ✅ Present       | 123   | Enforced globally                |
| §3.3    | `consistent-type-imports`       | ✅ Present       | 99    | Type-only imports required       |
| §3.4    | `no-unused-vars`                | ✅ From tseslint | 49    | Via recommendedTypeChecked       |
| §3.5    | `no-floating-promises`          | ✅ From tseslint | 49    | Type-aware rule                  |
| §3.5    | `no-misused-promises`           | ✅ From tseslint | 49    | Type-aware rule                  |

**Gap check (REQUIRED):**

```bash
# Verify all spec rules are in base.js
grep -n "no-restricted-imports\|explicit-function-return-type\|consistent-type-imports\|import/no-default-export" packages/eslint-config/base.js
```

**Expected output:** All 4 rules found, configured as `'error'`

---

## Step 2: Add Missing Test Override (2 min)

**Check current status:**

```bash
grep -A 10 "files: \['.*\\.{test,spec}" packages/eslint-config/base.js
```

**Current (line 54-63):**

```javascript
{
  files: ['**/*.{test,spec}.{ts,tsx}'],
  rules: {
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
},
```

**Need to add:** `'@typescript-eslint/no-explicit-any': 'off'` (per spec §3.2)

**Action:** Edit `packages/eslint-config/base.js`, line 54-63:

```javascript
{
  files: ['**/*.{test,spec}.{ts,tsx}'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
},
```

---

## Step 3: Test Phase 1 (5 min)

```bash
# Test linting still works (will be same speed, just verify rules are correct)
pnpm lint:fast
# Expected: <1s, no new errors

pnpm lint
# Expected: Same as before (~24s), all rules pass
```

**If no errors:** ✅ Phase 1 complete, move to Phase 2

---

## Step 4: Install eslint-plugin-oxlint (3 min)

```bash
pnpm add -D eslint-plugin-oxlint
```

---

## Step 5: Integrate Plugin into base.js (10 min)

**File:** `packages/eslint-config/base.js`

### 5.1 Add Import (after line 13)

**Current line 13:**

```javascript
import eslint from '@eslint/js';
```

**Add after (new line 14):**

```javascript
import oxlintPlugin from 'eslint-plugin-oxlint';
```

### 5.2 Register Plugin (around line 68, in plugins section)

**Current plugins section (lines 68-77):**

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
},
```

**Add oxlint plugin (new line 78):**

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
  oxlint: oxlintPlugin,  // NEW
},
```

### 5.3 Add Oxlint Config Block (end of config array)

**Current last config block (around line 156-158):**

```javascript
      '@nx/dependency-checks': 'error',
    },
  },
);
```

**Add before the closing `);` (new block):**

```javascript
      '@nx/dependency-checks': 'error',
    },
  },
  {
    name: 'base/oxlint-disable-overlaps',
    rules: oxlintPlugin.configs.recommended.rules,
  },
);
```

---

## Step 6: Test Phase 2 (10 min)

```bash
# Quick baseline
pnpm lint:fast
# Expected: <1s (unchanged, oxlint only)

# Full lint (oxlint + lighter ESLint)
time pnpm lint
# Expected: 15-20s (faster than before ~24s due to disabled overlaps)

# Type check
pnpm typecheck
# Expected: ~20s (unchanged)
```

**Compare times:**

```
Before Phase 2: ~24s
After Phase 2:  ~15-20s (30% faster)
```

---

## Step 7: Test Coverage (10 min)

Verify both linters are working:

```bash
# Test 1: Relative import (ESLint catches, oxlint can't)
cd /tmp && cat > test-relative.ts << 'EOF'
import x from '../../packages/foo';
EOF
pnpm eslint /tmp/test-relative.ts
# Expected: Error from no-restricted-imports

# Test 2: Type-only import (oxlint catches)
cd /tmp && cat > test-type.ts << 'EOF'
import { User } from '@repo/types';
export const x: User = {};
EOF
pnpm lint:fast /tmp/test-type.ts
# Expected: Warning about should be 'import type'

# Test 3: Unused variable (oxlint catches)
cd /tmp && cat > test-unused.ts << 'EOF'
const unused = 1;
export const x = 2;
EOF
pnpm lint:fast /tmp/test-unused.ts
# Expected: Warning about unused variable
```

**If coverage tests pass:** ✅ Phase 2 complete, move to README update

---

## Step 8: Update README (5 min)

**File:** `README.md`

**Current (lines 88-91):**

```markdown
## Tooling Defaults

- **Formatting**: Prettier with import sorting and package.json plugin, printWidth 100
- **Linting**: ESLint 9 with monorepo discipline (dead code, async safety, import org)
```

**Update to:**

```markdown
## Tooling Defaults

- **Formatting**: Prettier with import sorting and package.json plugin, printWidth 100
- **Linting**: Hybrid oxlint + ESLint for speed and coverage
  - **Oxlint** (instant): 50-100x faster baseline checks (~550ms)
  - **ESLint** (comprehensive): Type-aware rules, monorepo discipline, naming conventions
  - Command: `pnpm lint` runs both in sequence (oxlint first, then ESLint)
  - See `LINT_RECOMMENDATIONS.md` and `OXLINT_REPLACEMENT_ANALYSIS.md` for details
```

**Also update Quality loop command context (line 14):**

```markdown
- Quality loop: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
  - Where `pnpm lint` = oxlint (instant) + ESLint (comprehensive validation)
```

---

## Final Checklist

### Before Executing

- [ ] Read this plan
- [ ] Ensure `pnpm dev:log` is running
- [ ] Ensure `pnpm typecheck:watch:log` is running
- [ ] Have `packages/eslint-config/base.js` open
- [ ] Have `README.md` open for updates

### Phase 1: Verify & Update Rules

- [ ] Run `grep` to verify all spec rules present
- [ ] Add `no-explicit-any: 'off'` to test overrides
- [ ] Run `pnpm lint:fast` and `pnpm lint` to verify
- [ ] Commit: "chore: add missing test override for no-explicit-any"

### Phase 2: Integrate Plugin

- [ ] Install: `pnpm add -D eslint-plugin-oxlint`
- [ ] Add oxlint import to base.js
- [ ] Register oxlint plugin
- [ ] Add oxlint config block
- [ ] Run `time pnpm lint` and record time
- [ ] Run coverage tests (relative import, type import, unused var)
- [ ] Commit: "feat: integrate eslint-plugin-oxlint for hybrid linting"

### Phase 3: Documentation

- [ ] Update README.md with hybrid linting explanation
- [ ] Verify `pnpm lint` docs are clear
- [ ] Commit: "docs: update README with hybrid oxlint+eslint explanation"

### Verify

- [ ] `pnpm lint:fast` <1s
- [ ] `pnpm lint` 15-20s (faster than before)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] No regressions in CI/watchers

---

## Expected Final State

### Performance

```
pnpm lint:fast    ~550ms   (oxlint only, instant feedback)
pnpm lint         ~18s     (oxlint + lightweight ESLint with disabled overlaps)
pnpm typecheck    ~20s     (TypeScript)

Total quality check: ~38s (vs ~44s before)
```

### Configuration

```
packages/eslint-config/base.js:
✅ All spec rules present
✅ Test overrides for unsafe types
✅ oxlint plugin integrated
✅ No rules removed (oxlint plugin disables overlaps)

base.js lines: ~160-170 (minimal change from current ~159)
```

### README

```
✅ Explains hybrid oxlint+ESLint approach
✅ Documents speed improvements
✅ Points to detailed docs (OXLINT_REPLACEMENT_ANALYSIS.md, etc.)
```

---

## Rollback (if needed)

### Quick Rollback

```bash
# Undo Phase 2 only (keep no-explicit-any rule)
git revert <commit-oxlint-integration>
pnpm remove eslint-plugin-oxlint
```

### Full Rollback

```bash
git revert <commit-no-explicit-any>
git revert <commit-oxlint-integration>
```

---

## Ready to Execute?

This plan requires:

1. ✅ Editing `packages/eslint-config/base.js` (2 small changes)
2. ✅ Installing `eslint-plugin-oxlint` (1 command)
3. ✅ Testing incrementally (4 steps)
4. ✅ Updating `README.md` (1 section)

**Total time:** 1 hour (mostly testing)

Shall I execute?
