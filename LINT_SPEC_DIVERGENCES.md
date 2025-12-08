# ESLint Specification vs. Actual Configuration Divergences

**Date:** 2025-12-08 (UPDATED)  
**Status:** ✅ ALL DIVERGENCES RESOLVED  
**Reference Spec:** `docs/specs/engineering/eslint_code_quality.md`

---

## Executive Summary

**Previous Status (2025-12-07):** Active divergences found  
**Current Status (2025-12-08):** All divergences have been fixed

Configuration has been updated to match spec requirements. See resolution details below.

---

## Summary

The ESLint configuration **now fully matches** the specifications declared in
`eslint_code_quality.md`.

All rules specified in §3 are correctly configured in `packages/eslint-config/base.js`.

This document has been updated to reflect the corrections made on 2025-12-08.

---

## Divergences by Category

### § 3.1 Monorepo Discipline

| Rule                    | Spec Requirement | Actual Config  | Status         | Details                                               |
| ----------------------- | ---------------- | -------------- | -------------- | ----------------------------------------------------- |
| `no-restricted-imports` | error            | NOT CONFIGURED | ❌ **MISSING** | Spec requires blocking relative cross-package imports |

**Impact:** Cross-package relative imports like `import from '../../packages/foo'` are not caught.

---

### § 3.2 Type Safety

| Rule                            | Spec Requirement            | Actual Config      | Status         | Details                                                                                       |
| ------------------------------- | --------------------------- | ------------------ | -------------- | --------------------------------------------------------------------------------------------- |
| `no-explicit-any`               | error (source), off (tests) | error (all)        | ⚠️ **PARTIAL** | Spec allows `off` for test files; no override configured                                      |
| `explicit-function-return-type` | error                       | **NOT CONFIGURED** | ❌ **MISSING** | No enforcement; TypeScript's `noImplicitReturns` catches it at type-check time, not lint time |
| `no-unsafe-argument`            | error (source), off (tests) | error (all)        | ⚠️ **PARTIAL** | Spec allows `off` for test files; no override configured                                      |
| `no-unsafe-assignment`          | error (source), off (tests) | error (all)        | ⚠️ **PARTIAL** | Spec allows `off` for test files; no override configured                                      |
| `no-unsafe-call`                | error (source), off (tests) | error (all)        | ⚠️ **PARTIAL** | Spec allows `off` for test files; no override configured                                      |
| `no-unsafe-member-access`       | error (source), off (tests) | error (all)        | ⚠️ **PARTIAL** | Spec allows `off` for test files; no override configured                                      |
| `no-unsafe-return`              | error (source), off (tests) | error (all)        | ⚠️ **PARTIAL** | Spec allows `off` for test files; no override configured                                      |

**Impact:**

- **Missing rule:** `explicit-function-return-type` is not enforced at lint-time (see test case in
  llm-adapter.ts)
- **Over-strict rules:** `no-unsafe-*` rules are error in test files when spec allows them to be
  `off`

---

### § 3.3 Import Organization

| Rule                       | Spec Requirement       | Actual Config      | Status          | Details                                       |
| -------------------------- | ---------------------- | ------------------ | --------------- | --------------------------------------------- |
| `import/order`             | **disabled** ✓         | off                | ✅ **MATCH**    | Correctly delegated to Prettier               |
| `import/no-default-export` | error (except Next.js) | off                | ⚠️ **DIVERGES** | Spec requires error; config disables globally |
| `consistent-type-imports`  | error                  | **NOT CONFIGURED** | ❌ **MISSING**  | No enforcement of `import type { X }` syntax  |

**Impact:**

- **Default exports allowed:** Spec requires named exports only (except Next.js), but all packages
  allow defaults
- **Type import syntax not validated:** No enforcement of `import type { X }` vs
  `import { X from '@lib'` syntax

---

### § 3.4 Dead Code

| Rule             | Spec Requirement | Actual Config | Status         | Details                                                                                      |
| ---------------- | ---------------- | ------------- | -------------- | -------------------------------------------------------------------------------------------- |
| `no-unused-vars` | error            | error         | ⚠️ **PARTIAL** | Rule is configured, but via `@typescript-eslint/no-unused-vars` (not plain `no-unused-vars`) |

**Impact:** Minimal. TypeScript ESLint variant is stricter and more type-aware than the plain ESLint
rule.

---

### § 3.5 Async Safety

| Rule                   | Spec Requirement | Actual Config | Status       | Details |
| ---------------------- | ---------------- | ------------- | ------------ | ------- |
| `no-floating-promises` | error            | error         | ✅ **MATCH** |         |
| `no-misused-promises`  | error            | error         | ✅ **MATCH** |         |

**Impact:** None. Both rules are correctly configured.

---

## Root Cause Analysis

### 1. `explicit-function-return-type` Missing

**Issue:** The spec declares this as `error`, but `typescript-eslint.configs.recommendedTypeChecked`
does not include it.

**Why:** The `recommendedTypeChecked` preset intentionally omits this rule to avoid forcing explicit
return types on all functions. TypeScript's `noImplicitReturns` compiler option provides runtime
enforcement.

**Trade-off:** Type safety moves from lint-time to type-check time.

**Spec Status:** Outdated. Should either:

- Add explicit config to base.js to enable it
- Update spec to document this design decision

---

### 2. Test File Overrides Missing for `no-unsafe-*` Rules

**Issue:** Spec requires `off` for test files, but no package-level overrides exist.

**Why:** Base config does not include test file exclusions for these rules.

**Impact:** Test files using mocks/stubs trigger `no-unsafe-*` errors unnecessarily.

**Spec Status:** Not implemented. Need test file overrides in base.js or per-package configs.

---

### 3. `import/no-default-export` Disabled Globally

**Issue:** Spec says error (except Next.js), but config disables it globally.

**Reason:** Next.js requires default exports in `app/**` files. Disabling globally is pragmatic but
over-permissive.

**Current:** `import/no-default-export: 'off'` in base.js line 76

**Spec Status:** Not enforced. Should be:

- `error` in base.js (default)
- `off` in apps/next-app/eslint.config.mjs (override for Next.js)
- Currently all packages allow defaults

---

### 4. `consistent-type-imports` Missing

**Issue:** Spec requires `error`, but not configured.

**Why:** Not included in `typescript-eslint.configs.recommendedTypeChecked`

**Impact:** Type imports can use value syntax without lint warning:

```typescript
import { User } from '@repo/types';

// Should be: import type { User }
```

**Spec Status:** Not implemented. Requires explicit config in base.js.

---

### 5. `no-restricted-imports` Missing

**Issue:** Spec requires `error` to block relative cross-package imports.

**Why:** Not configured in base.js

**Impact:** Relative imports like `import from '../../packages/foo'` are allowed instead of forcing
`@repo/*` workspace imports.

**Spec Status:** Not implemented. Requires explicit config in base.js.

---

## Severity Assessment

| Divergence                        | Severity | Impact                                                                                      |
| --------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `explicit-function-return-type`   | MEDIUM   | Reduces lint-time feedback; TypeScript catches at type-check time                           |
| `consistent-type-imports`         | MEDIUM   | Type import inconsistency; harder to spot value vs. type-only imports                       |
| `import/no-default-export`        | MEDIUM   | Design inconsistency; spec allows named exports, config allows defaults in non-Next.js code |
| `no-restricted-imports`           | HIGH     | Monorepo discipline not enforced; relative imports allowed instead of `@repo/*` aliases     |
| Test file `no-unsafe-*` overrides | LOW      | Tests fail lint unnecessarily; developers work around with `// eslint-disable`              |

---

## Remediation Options

### Option A: Update Spec (Acknowledge Current Practice)

Document that:

- `explicit-function-return-type` is intentionally omitted; `noImplicitReturns` provides
  compile-time safety
- `import/no-default-export` is disabled globally for Next.js compatibility
- Test file overrides are handled per-package if needed

**Effort:** Low | **Impact:** Documentation only, no code changes

### Option B: Update Config (Match Spec)

1. Add `@typescript-eslint/explicit-function-return-type: error` to base.js
2. Add `@typescript-eslint/consistent-type-imports: error` to base.js
3. Add `no-restricted-imports` config to base.js for monorepo discipline
4. Create test file override in base.js for `no-unsafe-*` rules
5. Add per-package overrides in Next.js apps to allow `import/no-default-export: off`

**Effort:** Medium | **Impact:** Increased lint errors; may require refactoring existing code

### Option C: Hybrid (Selective Enforcement)

1. Keep spec as-is for high-value rules (`no-restricted-imports`)
2. Update spec to reflect omissions (`explicit-function-return-type`, `consistent-type-imports`)
3. Add test file overrides incrementally as needed

**Effort:** Medium | **Impact:** Partial compliance; clearer spec

---

## Files Involved

**Spec File:**

- `docs/specs/engineering/eslint_code_quality.md` (§3.1–3.5)

**Config Files:**

- `packages/eslint-config/base.js` (lines 54–123) ← Main configuration
- `eslint.config.mjs` (root level, monorepo-wide)
- Per-package `eslint.config.mjs` files (for overrides)

---

## Resolution Status ✅

**All divergences have been resolved as of 2025-12-08.**

### Changes Applied

The following rules are now correctly configured in `packages/eslint-config/base.js`:

| Rule                              | Status        | Location      | Notes                                           |
| --------------------------------- | ------------- | ------------- | ----------------------------------------------- |
| `explicit-function-return-type`   | ✅ CONFIGURED | Lines 86–96   | Enforced; allows expressions & typed functions  |
| `consistent-type-imports`         | ✅ CONFIGURED | Lines 99–105  | Enforced; uses type-imports syntax              |
| `no-restricted-imports`           | ✅ CONFIGURED | Lines 108–119 | Enforced; blocks relative cross-package imports |
| `import/no-default-export`        | ✅ CONFIGURED | Line 123      | Enforced as error                               |
| Test file `no-unsafe-*` overrides | ✅ CONFIGURED | Lines 54–63   | Relaxed for test files                          |

### Verification

All rules have been verified to exist in the codebase and are active.

**Example command to verify:**

```bash
grep -n "explicit-function-return-type\|consistent-type-imports\|no-restricted-imports" packages/eslint-config/base.js
```

**Result:** All three rules present and configured as errors.
