---
type: SPEC
status: active
stability: stable
created: 2026-01-09
last_updated: 2026-01-09
area: tooling
feature: prettier-formatting
summary_short: >-
  Centralized Prettier config at the repo root; Prettier handles formatting only; ESLint owns import
  ordering.
summary_long: >-
  Specifies a single Prettier configuration at the repository root that applies to all packages.
  Prettier is limited to formatting concerns (whitespace, quotes, line breaks, trailing commas),
  while import ordering is enforced by ESLint to avoid tool conflicts. This spec defines the core
  config values, required plugins, file-based overrides, and formatting workflow used in CI and
  local development.
keywords:
  - prettier
  - formatting
  - code-quality
related:
  - SPEC-tooling-eslint-oxlint-hybrid-linting
index:
  sections:
    - title: 'TLDR'
      lines: [87, 100]
      summary:
        'One root Prettier config applies to all packages; Prettier formats code only; ESLint
        handles import ordering.'
      token_est: 67
    - title: 'Scope'
      lines: [102, 120]
      summary:
        'Covers Prettier configuration, plugins, and formatting workflow; excludes lint rules and
        import ordering.'
      token_est: 69
    - title: 'Specification'
      lines: [122, 152]
      summary:
        'A single Prettier config governs formatting across the repo with limited, centralized
        overrides.'
      token_est: 129
    - title: 'Workflow'
      lines: [154, 164]
      summary:
        'Formatting uses Prettier commands for write and check modes, plus staged formatting.'
      token_est: 71
    - title: 'Rationale'
      lines: [166, 174]
      summary: 'Centralized formatting prevents drift and reduces maintenance overhead.'
      token_est: 52
    - title: 'Alternatives Considered'
      lines: [176, 185]
      summary: 'Per-package configs or import-sorting plugins add complexity or create conflicts.'
      token_est: 72
    - title: 'Consequences'
      lines: [187, 202]
      summary: 'Improves consistency with minor inflexibility for edge cases.'
      token_est: 67
    - title: 'Verification Approach'
      lines: [204, 211]
      summary: 'Formatting is enforced by CI and pre-commit checks.'
      token_est: 42
    - title: 'Design Decisions'
      lines: [213, 223]
      summary: 'Single configuration with ESLint handling import ordering.'
      token_est: 78
    - title: 'Blockers'
      lines: [225, 233]
      summary: 'None.'
      token_est: 43
    - title: 'Assumptions'
      lines: [235, 244]
      summary: 'Assumes one config fits the repo and overrides are sufficient.'
      token_est: 93
    - title: 'Unknowns'
      lines: [246, 252]
      summary: 'Future formatting needs may require additional overrides.'
      token_est: 72
---

# SPEC-tooling-prettier-formatting-centralized

---

## TLDR

Summary: One root Prettier config applies to all packages; Prettier formats code only; ESLint
handles import ordering.

**What:** Centralized Prettier formatting rules at the repo root

**Why:** Keep formatting consistent across the monorepo and avoid tool conflicts

**How:** Use `prettier.config.mjs` with required plugins and file-based overrides

**Status:** Active

---

## Scope

Summary: Covers Prettier configuration, plugins, and formatting workflow; excludes lint rules and
import ordering.

**Includes:**

- Root `prettier.config.mjs` configuration
- Required Prettier plugins
- File-based overrides (Markdown, JSX)
- Formatting workflow commands

**Excludes:**

- Import ordering rules (owned by ESLint)
- Linting and type checking rules
- Per-package Prettier configs

---

## Specification

Summary: A single Prettier config governs formatting across the repo with limited, centralized
overrides.

### Configuration

- **Location:** `prettier.config.mjs` at repository root
- **Core values:**
  - `printWidth: 100`
  - `semi: true`
  - `singleQuote: true`
  - `trailingComma: "all"`
  - `endOfLine: "lf"`

### Plugins (required)

- `prettier-plugin-packagejson` for consistent `package.json` formatting
- `prettier-plugin-tailwindcss` for Tailwind utility class ordering

### Overrides (file-based only)

- Markdown: `proseWrap: "always"`
- JSX in apps: `jsxSingleQuote: false`, `bracketSameLine: false`

### Import Ordering

- Import organization is enforced by ESLint (`import/order`), not by Prettier
- Prettier import-sorting plugins are not used to avoid conflicts

---

## Workflow

Summary: Formatting uses Prettier commands for write and check modes, plus staged formatting.

| Command              | Purpose                            |
| -------------------- | ---------------------------------- |
| `pnpm format`        | Auto-format all code with Prettier |
| `pnpm format:check`  | Check formatting without changes   |
| `pnpm format:staged` | Format staged files (pre-commit)   |

---

## Rationale

Summary: Centralized formatting prevents drift and reduces maintenance overhead.

- One config keeps formatting consistent across packages and teams.
- Centralized overrides are discoverable and avoid config sprawl.
- ESLint owns import ordering, preventing conflicting tooling behavior.

---

## Alternatives Considered

Summary: Per-package configs or import-sorting plugins add complexity or create conflicts.

- Per-package Prettier configs: more flexibility, but style drift and higher maintenance
- No Prettier (ESLint only): slower and less focused on formatting
- Multiple formatters: increased cognitive load for contributors
- Prettier import-sorting plugins: conflicts with ESLint ordering rules

---

## Consequences

Summary: Improves consistency with minor inflexibility for edge cases.

**Positive:**

- Consistent formatting across the monorepo
- Simple maintenance with a single config file
- Clear ownership: Prettier formats, ESLint validates imports

**Negative:**

- Less flexibility for niche package-specific formatting
- Tailwind plugin is assumed (inert where unused)

---

## Verification Approach

Summary: Formatting is enforced by CI and pre-commit checks.

- CI uses `pnpm format:check` to fail on formatting drift
- Pre-commit uses `pnpm format:staged` for quick local fixes

---

## Design Decisions

Summary: Single configuration with ESLint handling import ordering.

| Field      | Decision 001: Centralized Prettier config               |
| ---------- | ------------------------------------------------------- |
| **Title**  | Single root config + ESLint import order                |
| **Chosen** | Adopt root Prettier config; ESLint owns import ordering |
| **Why**    | Prevent style drift and avoid tool conflicts            |

---

## Blockers

Summary: None.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | n/a    | n/a           | Low    |

---

## Assumptions

Summary: Assumes one config fits the repo and overrides are sufficient.

| Assumption                                 | Validation Method    | Confidence | Impact if Wrong                  |
| ------------------------------------------ | -------------------- | ---------- | -------------------------------- |
| One root config fits all packages          | Contributor feedback | Medium     | May require additional overrides |
| ESLint import ordering stays conflict-free | Lint rule monitoring | High       | Would require rule adjustments   |

---

## Unknowns

Summary: Future formatting needs may require additional overrides.

| Question                                    | Impact | Resolution Criteria                    | Owner | ETA |
| ------------------------------------------- | ------ | -------------------------------------- | ----- | --- |
| Do we need more file-based overrides later? | Medium | New formatting needs appear in reviews | Team  | TBD |
