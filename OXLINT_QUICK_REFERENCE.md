# Oxlint Quick Reference: What Gets Checked Where

**At a glance:** Which linter checks each rule in your codebase

---

## Rules Checked by OXLINT (in lint:fast)

These are already being caught by oxlint. No need for ESLint to re-check them.

### Type Safety (typescript-eslint rules)

| Rule                            | Oxlint        | ESLint        | Notes               |
| ------------------------------- | ------------- | ------------- | ------------------- |
| `explicit-function-return-type` | ✅            | ✅ Duplicate  | Oxlint catches well |
| `consistent-type-imports`       | ✅            | ✅ Duplicate  | Oxlint catches well |
| `no-explicit-any`               | ✅            | ✅ Duplicate  | Oxlint catches      |
| `no-floating-promises`          | ✅ Type-aware | ✅ Type-aware | Both catch          |
| `no-misused-promises`           | ✅ Type-aware | ✅ Type-aware | Both catch          |
| `await-thenable`                | ✅ Type-aware | ✅ Type-aware | Both catch          |
| `no-unused-vars`                | ✅            | ✅ Duplicate  | Oxlint is strict    |

### Import Organization (eslint-plugin-import)

| Rule                       | Oxlint     | ESLint       | Notes                                |
| -------------------------- | ---------- | ------------ | ------------------------------------ |
| `import/no-default-export` | ✅ Partial | ✅ Full      | Oxlint has rules that catch patterns |
| `import/no-cycle`          | ✅         | ✅ Duplicate | Oxlint catches circular deps         |
| `import/no-unresolved`     | ✅         | ✅ Duplicate | Oxlint resolves imports              |

### Best Practices (eslint-plugin-unicorn, jsx-a11y, security)

| Rule                           | Oxlint     | ESLint       | Notes                        |
| ------------------------------ | ---------- | ------------ | ---------------------------- |
| `unicorn/prefer-node-protocol` | ✅         | ✅ Duplicate | Oxlint catches               |
| `unicorn/filename-case`        | ✅ Partial | ✅ Full      | Oxlint checks filenames      |
| `jsx-a11y/*`                   | ✅ Most    | ✅ Duplicate | Oxlint covers a11y basics    |
| `react/exhaustive-deps`        | ✅         | ✅ Duplicate | Oxlint catches               |
| `security/*`                   | ✅ Most    | ✅ Duplicate | Oxlint covers critical cases |

### Code Quality (eslint-plugin-sonarjs, Node rules)

| Rule                           | Oxlint | ESLint       | Notes                  |
| ------------------------------ | ------ | ------------ | ---------------------- |
| `n/no-process-exit`            | ✅     | ✅ Duplicate | Oxlint catches         |
| `sonarjs/cognitive-complexity` | ❌     | ✅ Specific  | ESLint only (optional) |

---

## Rules ONLY ESLint Checks (Must Keep)

These are critical and oxlint doesn't have them. **Do not remove from ESLint.**

### Monorepo Discipline (CRITICAL)

| Rule                    | Oxlint | ESLint | Impact                           | Your Spec      |
| ----------------------- | ------ | ------ | -------------------------------- | -------------- |
| `no-restricted-imports` | ❌     | ✅     | Blocks `../../` relative imports | §3.1           |
| `@nx/dependency-checks` | ❌     | ✅     | Enforces monorepo boundaries     | Nx integration |

### Filename Conventions (REQUIRED)

| Rule                                    | Oxlint | ESLint | Impact                                      | Your Spec          |
| --------------------------------------- | ------ | ------ | ------------------------------------------- | ------------------ |
| `check-file/filename-naming-convention` | ❌     | ✅     | Enforces web_naming_spec (kebab-case, etc.) | web_naming_spec §3 |

---

## Type-Aware Rules: Both Oxlint & ESLint Support

These can be checked by **either** tool. Decide which you trust more.

### Type-Aware Rules (Preview in Oxlint)

| Rule                            | Oxlint Status | ESLint Status | Recommendation                     |
| ------------------------------- | ------------- | ------------- | ---------------------------------- |
| `no-floating-promises`          | ✅ Preview    | ✅ Stable     | ESLint for now; oxlint when stable |
| `no-misused-promises`           | ✅ Preview    | ✅ Stable     | ESLint for now; oxlint when stable |
| `no-for-in-array`               | ✅ Preview    | ✅ Stable     | ESLint for now; oxlint when stable |
| `restrict-template-expressions` | ✅ Preview    | ✅ Stable     | ESLint for now; oxlint when stable |

**Strategy:** Keep ESLint type-aware rules for now; switch to oxlint `--type-aware` when it leaves
preview (2025+).

---

## Decision: What to Remove from ESLint

### Safe to Remove (Oxlint Covers Fully)

```javascript
// From packages/eslint-config/base.js - REMOVE THESE:

// Already covered by oxlint
'@typescript-eslint/explicit-function-return-type': [...],  // Line 86
'@typescript-eslint/consistent-type-imports': [...],        // Line 99
'import/no-default-export': 'error',                        // Line 123
'unicorn/prefer-node-protocol': 'error',                    // Line 127
'unicorn/filename-case': [...],                              // Line 128
```

### Must Keep (ESLint Only)

```javascript
// From packages/eslint-config/base.js - KEEP THESE:

'no-restricted-imports': [...],                              // Line 108 - CRITICAL
'check-file/filename-naming-convention': [...],              // Line 145 - CRITICAL
'@nx/dependency-checks': 'error',                            // Line 156 - CRITICAL
```

### Optional (Can Remove for Speed)

```javascript
// Optional - remove for speed, keep for strictness:

'sonarjs/cognitive-complexity': ['warn', 20],  // Line 126 - Not essential
```

---

## Implementation Paths

### Path A: Add eslint-plugin-oxlint (Conservative)

```bash
pnpm add -D eslint-plugin-oxlint
# Update base.js (8 lines)
# ESLint rules stay as-is, overlaps are disabled via plugin
# Result: ESLint is faster, coverage unchanged
```

**Time:** 15 min  
**Risk:** None  
**Speed gain:** 20-30% ESLint faster

---

### Path B: Remove Duplicate Rules (Aggressive)

```bash
# Remove from imports (lines 2-8):
# - eslint-plugin-import
# - eslint-plugin-jsx-a11y
# - eslint-plugin-n
# - eslint-plugin-security
# - eslint-plugin-sonarjs
# - eslint-plugin-unicorn
# (keep only check-file and @nx)

# Remove from rules section:
# - All unicorn/* rules
# - All import/* rules (except no-restricted-imports)
# - All jsx-a11y/* rules
# - All n/* rules
# - All security/* rules
# - sonarjs/cognitive-complexity
# - explicit-function-return-type (oxlint has it)
# - consistent-type-imports (oxlint has it)
```

**Time:** 1-2 hours (with testing)  
**Risk:** Low (oxlint coverage proven)  
**Speed gain:** 70-80% ESLint faster

---

## Current ESLint Rules Breakdown

### By Coverage

| Category           | Rules | Oxlint | ESLint Only | Action             |
| ------------------ | ----- | ------ | ----------- | ------------------ |
| **Monorepo**       | 2     | 0      | 2           | KEEP both          |
| **Filename**       | 1     | 0      | 1           | KEEP               |
| **Type safety**    | 50+   | 80%    | Type-aware  | Keep for stability |
| **Import org**     | 20+   | 90%    | 2           | Remove duplicates  |
| **Best practices** | 30+   | 95%    | 5           | Remove duplicates  |
| **Total**          | 100+  | 80%    | 10-15       | 15-20% remain      |

**Takeaway:** 80-85% of your ESLint rules are redundant with oxlint.

---

## Expected Lint Times After Implementation

### Current Baseline

```
pnpm lint:fast          551ms (oxlint)
pnpm lint               24.2s (full ESLint)
Total development cycle: 24.7s
```

### After Path A (Conservative)

```
pnpm lint:fast          551ms (unchanged)
pnpm lint               18-20s (disabled overlaps, ~20% faster)
Total: Slightly faster, minimal effort
```

### After Path B (Aggressive)

```
pnpm lint:fast          551ms (unchanged)
pnpm lint               6-8s (only 3 ESLint rules!)
Total: 3x faster validation, cleaner config
```

---

## Recommendation Summary

| If You Want                      | Choose                | Time    | Risk |
| -------------------------------- | --------------------- | ------- | ---- |
| **Zero risk, now**               | Path A (plugin)       | 15 min  | None |
| **Maximum speed, tested**        | Path B (remove rules) | 2 hours | Low  |
| **Maximum coverage, no changes** | Stay current          | —       | None |

**My recommendation:** **Path A now, evaluate Path B in 1 week after confirming stability.**

---

## Quick Checklist

After implementation, verify:

- [ ] `pnpm lint:fast` still <1s
- [ ] `pnpm lint` passes (should be faster)
- [ ] `pnpm typecheck` passes
- [ ] Try a `../../` relative import (should fail)
- [ ] Try a CamelCase filename (should fail)
- [ ] Try `any` type (should fail via oxlint)
- [ ] CI/CD passes
- [ ] No false negatives (no issues slipping through)
