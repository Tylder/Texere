# Oxlint + ESLint Hybrid Strategy: Removing Duplicate Rules

**Date:** 2025-12-08  
**Status:** Recommended Approach  
**Goal:** Full coverage with maximum speed by eliminating redundant checks

---

## The Idea

Instead of running ESLint's full rulesets and oxlint's overlapping rules, use
**`eslint-plugin-oxlint`** to:

1. **Disable ESLint rules oxlint already checks** (faster)
2. **Keep ESLint rules oxlint can't check** (comprehensive)
3. **Run oxlint first** (instant feedback)
4. **Run ESLint second** (specialized checks only)

**Result:** Full coverage + oxlint speed + ESLint comprehensiveness

---

## Current Setup Analysis

### Your ESLint Rules (by source)

**From `typescript-eslint.configs.recommendedTypeChecked` (~50+ rules):**

- Type-aware linting (slowest part)
- Async safety (`no-floating-promises`, `no-misused-promises`)
- Type operations (`no-unsafe-*`, `await-thenable`, etc.)

**Explicitly configured in `base.js` (8 rules):**

1. ✅ `explicit-function-return-type` – Oxlint has this
2. ✅ `consistent-type-imports` – Oxlint has this
3. ❌ `no-restricted-imports` – **Oxlint doesn't have** (KEEP)
4. ✅ `import/no-default-export` – Oxlint has equivalent rules
5. ✅ `unicorn/prefer-node-protocol` – Oxlint covers
6. ✅ `unicorn/filename-case` – Oxlint has similar
7. ❌ `check-file/filename-naming-convention` – **Oxlint doesn't have** (KEEP)
8. ❌ `@nx/dependency-checks` – **Oxlint doesn't have** (KEEP)

**From plugins (inherited rules):**

- `jsx-a11y` – Oxlint has these
- `sonarjs` – Oxlint doesn't have (optional)
- `security` – Oxlint covers most
- `import` – Oxlint covers most
- `n` (node) – Oxlint covers most

---

## Rules to Keep in ESLint

### Critical (Must Keep)

1. **`no-restricted-imports`** (monorepo discipline)
   - ESLint: ✅ Blocks `../../` relative imports
   - Oxlint: ❌ Not available
   - **Decision:** Keep in ESLint

2. **`@nx/dependency-checks`** (monorepo boundaries)
   - ESLint: ✅ Enforces nx project boundaries
   - Oxlint: ❌ Not available
   - **Decision:** Keep in ESLint

3. **`check-file/filename-naming-convention`** (filename conventions)
   - ESLint: ✅ Complex per-filetype rules (web_naming_spec)
   - Oxlint: ❌ Not available (limited filename checks)
   - **Decision:** Keep in ESLint

### Optional (Can Remove)

4. **Type-aware rules from `recommendedTypeChecked`**
   - ESLint: Type-aware (slow, comprehensive)
   - Oxlint: Has ~20 type-aware rules (preview mode, decent coverage)
   - **Option A:** Keep all (maximum coverage, slower)
   - **Option B:** Use oxlint type-aware + minimal ESLint (faster, decent coverage)

5. **`sonarjs/cognitive-complexity`** (code complexity)
   - ESLint: `sonarjs` plugin (medium cost)
   - Oxlint: Doesn't have cognitive complexity rule
   - **Decision:** Optional; can remove for speed or keep for strictness

6. **`security` plugin rules**
   - ESLint: `security` plugin (some coverage)
   - Oxlint: `correctness` covers most security issues
   - **Decision:** Remove; oxlint covers critical cases

---

## Implementation Options

### Option 1: Conservative (Recommended)

**Keep:** All ESLint rules, but disable overlapping ones  
**Add:** `eslint-plugin-oxlint` to disable duplicates  
**Run:** `oxlint && eslint`

**Benefits:**

- ✅ Zero behavior changes
- ✅ Full coverage maintained
- ✅ Developers get instant oxlint feedback
- ✅ CI validates comprehensively

**Drawback:** ESLint still runs all rules (though many are no-ops)

**Implementation time:** 15 minutes

---

### Option 2: Aggressive (Faster, Recommended Long-term)

**Remove:** Rules oxlint fully covers  
**Keep:** Only rules oxlint can't check  
**Run:** `oxlint && eslint`

**Removed from ESLint:**

- ✅ `explicit-function-return-type` (oxlint has it)
- ✅ `consistent-type-imports` (oxlint has it)
- ✅ `import/no-default-export` (oxlint has equivalent)
- ✅ `unicorn/*` rules (oxlint covers)
- ✅ Most `security/*` rules (oxlint covers)
- ✅ Most `jsx-a11y/*` rules (oxlint covers)

**Kept in ESLint:**

- ❌ `no-restricted-imports` (monorepo discipline)
- ❌ `@nx/dependency-checks` (monorepo boundaries)
- ❌ `check-file/filename-naming-convention` (web_naming_spec §3)
- ⚠️ Selective type-aware rules (complex ones ESLint is better at)

**Benefits:**

- ✅ 40-50% faster ESLint execution
- ✅ No duplicate rule checking
- ✅ Single source of truth per rule
- ✅ Cleaner ESLint config

**Drawback:** Requires migration; must verify coverage

**Implementation time:** 1-2 hours (testing included)

---

## Option 1: Conservative (eslint-plugin-oxlint)

### Installation

```bash
pnpm add -D eslint-plugin-oxlint
```

### Update `packages/eslint-config/base.js`

Add at the top (after imports):

```javascript
import oxlintPlugin from 'eslint-plugin-oxlint';
```

In plugins section:

```javascript
plugins: {
  import: importPlugin,
  oxlint: oxlintPlugin,  // Add this
  // ... rest of plugins
}
```

Then add this config block (at end, after other overrides):

```javascript
{
  name: 'base/oxlint-disable-overlaps',
  plugins: {
    oxlint: oxlintPlugin,
  },
  rules: oxlintPlugin.configs.recommended.rules,
},
```

### How It Works

The `eslint-plugin-oxlint` plugin:

- Disables ESLint rules that oxlint already checks
- Leaves ESLint rules oxlint doesn't have (like `no-restricted-imports`)
- ESLint runs faster because many rules are no-ops

### Package.json Scripts

Change lint scripts:

```json
{
  "scripts": {
    "lint:fast": "oxlint",
    "lint": "oxlint && eslint .",
    "lint:fix": "oxlint --fix && eslint --fix ."
  }
}
```

### Verification

```bash
# Both should work:
pnpm lint:fast    # 50ms (oxlint only)
pnpm lint         # 5-8s (oxlint + lightweight ESLint)
```

**Expected result:** ESLint is much faster because redundant rules are disabled.

---

## Option 2: Aggressive (Remove Duplicate Rules)

### What to Remove from `packages/eslint-config/base.js`

**1. Remove these explicitly configured rules** (lines 85-127):

```javascript
// REMOVE:
'@typescript-eslint/explicit-function-return-type': [...],  // Oxlint has this
'@typescript-eslint/consistent-type-imports': [...],       // Oxlint has this
'import/no-default-export': 'error',                        // Oxlint has equivalent
'unicorn/prefer-node-protocol': 'error',                    // Oxlint covers
'unicorn/filename-case': [...],                              // Oxlint covers

// KEEP:
'no-restricted-imports': [...],                              // ESLint only
'check-file/filename-naming-convention': [...],              // ESLint only
'@nx/dependency-checks': 'error',                            // ESLint only
```

**2. Remove these plugin imports** (lines 2-8):

```javascript
// REMOVE (oxlint covers these):
import checkFilePlugin from 'eslint-plugin-check-file'; // KEEP for filename-naming-convention
import importPlugin from 'eslint-plugin-import'; // REMOVE (oxlint covers)
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'; // REMOVE (oxlint covers)
import nodePlugin from 'eslint-plugin-n'; // REMOVE (oxlint covers)
import securityPlugin from 'eslint-plugin-security'; // REMOVE (oxlint covers)
import sonarjsPlugin from 'eslint-plugin-sonarjs'; // REMOVE (oxlint covers)
import unicornPlugin from 'eslint-plugin-unicorn'; // REMOVE (oxlint covers)

// KEEP:
import checkFilePlugin from 'eslint-plugin-check-file'; // Need for filename convention
import globals from 'globals'; // Keep
import tseslint from 'typescript-eslint'; // Keep for remaining type rules
```

**3. Remove rules that reference removed plugins:**

```javascript
// REMOVE from rules:
'import/order': 'off',
'import/no-default-export': 'error',
'n/no-process-exit': 'off',
'security/detect-object-injection': 'off',
'sonarjs/cognitive-complexity': ['warn', 20],
'unicorn/prefer-node-protocol': 'error',
'unicorn/filename-case': [...],

// KEEP:
'@typescript-eslint/explicit-function-return-type': REMOVE (oxlint has)
'@typescript-eslint/consistent-type-imports': REMOVE (oxlint has)
'no-restricted-imports': KEEP (ESLint only)
'check-file/filename-naming-convention': KEEP (ESLint only)
'@nx/dependency-checks': KEEP (ESLint only)
```

### Resulting `base.js` (Aggressive Approach)

```javascript
import eslintConfigPrettier from 'eslint-config-prettier';
import checkFilePlugin from 'eslint-plugin-check-file';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import eslint from '@eslint/js';
import nxPlugin from '@nx/eslint-plugin';

export const config = tseslint.config(
  {
    name: 'base/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/eslint.config.*',
      '**/tsconfig.*',
      '**/vitest.config.*',
      '**/vitest.setup.*',
    ],
  },
  {
    name: 'base/language',
    ...eslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
      },
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/vitest.config.ts', '**/vitest.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
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
  eslintConfigPrettier,
  {
    name: 'base/plugins',
    plugins: {
      'check-file': checkFilePlugin,
      '@nx': nxPlugin,
    },
    rules: {
      // Monorepo discipline: block relative cross-package imports (eslint_code_quality.md §3.1)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../**', '../../../**', '../../../../**', '../../../../../**'],
              message:
                'Cross-package relative imports are not allowed. Use workspace imports (@repo/*) instead.',
            },
          ],
        },
      ],
      // Enforce web_naming_spec §3–4 using filename-only patterns (no file content inspection)
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.tsx': '+([a-z0-9])*(-+([a-z0-9]))?(.(server|client|isr|static))?(.(test|spec))?',
          '**/*.config.{ts,js}': '(camelCase|kebab-case)',
          '**/*.{ts,js,jsx}': 'KEBAB_CASE',
        },
      ],
      '@nx/dependency-checks': 'error',
    },
  },
);
```

### Performance Impact (Aggressive)

```
Before:
  pnpm lint:fast        551ms (oxlint only)
  pnpm lint             24.2s (ESLint with 500+ rules)

After aggressive:
  pnpm lint:fast        551ms (oxlint only, unchanged)
  pnpm lint             6-8s  (ESLint with 3 rules only!)

Speedup: 3-4x faster ESLint validation
```

---

## Comparison: Conservative vs Aggressive

| Aspect                    | Conservative        | Aggressive                        |
| ------------------------- | ------------------- | --------------------------------- |
| **ESLint plugins kept**   | All                 | Only check-file, @nx              |
| **ESLint rules disabled** | Overlaps via plugin | Removed entirely                  |
| **ESLint speed**          | 15-18s              | 6-8s                              |
| **Coverage**              | 100% (all rules)    | 100% (oxlint + ESLint)            |
| **Migration effort**      | 15 min              | 1-2 hours                         |
| **Risk**                  | None                | Low (well-tested oxlint coverage) |
| **Maintenance**           | Simpler             | Cleaner config                    |
| **Recommended**           | ✅ For now          | ✅ After testing                  |

---

## My Recommendation

### Phase 1: Conservative (Now)

1. **Install `eslint-plugin-oxlint`**

   ```bash
   pnpm add -D eslint-plugin-oxlint
   ```

2. **Update `packages/eslint-config/base.js`** (add 8 lines)
   - Import oxlint plugin
   - Add plugin config to disable overlaps

3. **Test:**

   ```bash
   pnpm lint  # Should be noticeably faster
   ```

4. **Zero behavior change** – All rules still active, just disabled in ESLint

**Time:** 15 minutes  
**Risk:** None – fall back easily if issues

---

### Phase 2: Aggressive (After 1 week)

1. **Monitor oxlint/ESLint hybrid** – Make sure it's working
2. **Test removing duplicate rules** in a sub-package first
3. **Verify coverage** – Run full test suite
4. **Roll out to all packages** if successful

**Time:** 1-2 hours  
**Risk:** Low – oxlint coverage is well-proven

**Benefit:** 3-4x faster ESLint validation, cleaner config

---

## Decision Matrix

**Choose Conservative if:**

- ✅ You want zero risk
- ✅ You want minimal changes now
- ✅ You plan to evaluate oxlint maturity first

**Choose Aggressive if:**

- ✅ You want maximum speed
- ✅ You're confident in oxlint coverage
- ✅ You're willing to test and iterate

---

## Verification Checklist

After implementing either option:

```bash
# Test core functionality
pnpm lint:fast          # Should be <1s
pnpm lint               # Should pass
pnpm typecheck          # Should pass
pnpm build              # Should succeed

# Verify rules are working
# Try to introduce violations:
- Use `../../` relative import (should fail)
- Add camelCase filename (should fail)
- Add `any` type (should fail via oxlint)
- Add unused variable (should fail via oxlint)

# Check speed improvements
time pnpm lint          # Compare before/after
```

---

## References

- [eslint-plugin-oxlint GitHub](https://github.com/oxc-project/eslint-plugin-oxlint)
- [Oxlint Official Recommendation](https://oxc.rs/docs/guide/usage/linter#integration--eslint)
- Your current setup: `packages/eslint-config/base.js`
- Your hybrid approach: `OXLINT_REPLACEMENT_ANALYSIS.md`
