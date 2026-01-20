---
doc_type: adr
domain: virtual_influencer_code_quality
reference_prefix: ADR-VI-TECH
adr_id: ADR-VI-TECH-2
status: accepted
version: 1.0
decision_date: 2026-01-09
last_updated: 2026-01-09
effective_date: 2026-01-09
author: @agent
---

# ADR-VI-TECH-2: Prettier Formatting — Centralized, Single Root Config

**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR with status Superseded on this
one.

**Summary:** We adopt a single, centralized Prettier configuration at the repository root that
applies to all packages. Prettier owns code formatting only (whitespace, quotes, line breaks);
import ordering is delegated to ESLint. This ensures consistency across the monorepo with minimal
configuration overhead.

---

## Quick Navigation

| Section                                             | Purpose                   | Read if...                                |
| --------------------------------------------------- | ------------------------- | ----------------------------------------- |
| [References](#references)                           | Related documents         | You need related documents                |
| [Statement](#statement)                             | The actual decision       | You need the complete decision framing    |
| [Context](#context)                                 | Why we decided            | You're unfamiliar with the domain         |
| [Decision](#decision)                               | What we chose             | You're implementing or understanding this |
| [Rationale](#rationale)                             | Why this is better        | You need the full reasoning               |
| [Alternatives Considered](#alternatives-considered) | Options we rejected       | You disagree with the choice              |
| [Consequences](#consequences)                       | Positive/negative impacts | You're assessing cost/benefit             |
| [Workflow](#workflow)                               | Workflow                  | You need this information                 |
| [Notes](#notes)                                     | Additional context        | You need this information                 |
| [Changelog](#changelog)                             | Version history           | You want version history                  |

---

## References

**Driven by:** Consistency across monorepo, single source of truth for formatting, minimal cognitive
load  
**Specified by:** [prettier_formatting.md](../../specs/engineering/prettier_formatting.md)  
**Related:**

- [ADR-VI-TECH-3](./ADR-VI-TECH-3-eslint-oxlint-hybrid-linting.md) (linting owns import ordering)
- [ADR-VI-TECH-1](./ADR-VI-TECH-1-frontend-tech-stack.md) (tech stack includes Prettier)  
  **Implemented by (current):** Root `prettier.config.mjs`, plugins, file-based overrides

---

## Statement

In the context of a monorepo with multiple packages and teams, facing the risk of formatting drift
and style inconsistency, we decided to adopt a **single, centralized Prettier configuration at the
repository root** (no per-package overrides) that handles only formatting concerns (whitespace,
quotes, line breaks, trailing commas), and delegate import ordering to ESLint, to achieve
monorepo-wide consistency, reduce maintenance burden, and prevent tool conflicts.

---

## Context

- **Multiple packages:** multiple teams may contribute to different parts of the codebase
- **No reason for style drift:** there's no valid reason different packages should have different
  line widths or quote styles
- **Reduced maintenance:** one root config is simpler than managing per-package configs
- **Tool conflicts:** import sorting plugins in Prettier conflict with ESLint rules; need single
  source of truth

---

## Decision

### Single Root Configuration

**File:** `prettier.config.mjs` at repository root

**Configuration:**

```javascript
{
  printWidth: 100,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  plugins: [
    'prettier-plugin-packagejson',
    'prettier-plugin-tailwindcss'
  ],
  overrides: [
    {
      files: '*.md',
      options: { proseWrap: 'always' }
    },
    {
      files: ['apps/**/*.{tsx,jsx}'],
      options: {
        jsxSingleQuote: false,
        bracketSameLine: false
      }
    }
  ]
}
```

### No Per-Package Overrides

- All packages inherit the root config
- File-based overrides (`overrides` array) allowed for special cases (markdown, JSX)
- No package-level `prettier.config.js` files

### Plugins

**Required:**

| Plugin                        | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `prettier-plugin-packagejson` | Format `package.json` consistently      |
| `prettier-plugin-tailwindcss` | Sort Tailwind utility classes (for v3+) |

### Import Sorting: Not Prettier's Job

- ESLint's `import/order` rule handles import organization (see ADR-VI-TECH-3)
- Prettier's import-sorting plugins disabled to avoid conflicts
- Single source of truth: ESLint

---

## Rationale

### Centralized Config

- **Consistency:** identical formatting across all packages
- **Simplicity:** one file to update, understand, and maintain
- **Scalability:** as monorepo grows, no config sprawl

### File-Based Overrides (not package-based)

- **Rare exceptions:** markdown has different prose rules (wrap lines for git diffs)
- **JSX special case:** `bracketSameLine: false` prevents Prettier from collapsing JSX onto one line
- **Discoverable:** overrides live in one place (root config), not scattered across packages

### Import Sorting Delegated to ESLint

- Prettier plugins for import sorting (`@ianvs/prettier-plugin-sort-imports`) conflict with ESLint
- ESLint's `import/order` rule is auto-fixable and comprehensive
- See [ADR-VI-TECH-3](./ADR-VI-TECH-3-eslint-oxlint-hybrid-linting.md) for details

---

## Alternatives Considered

- **Per-package Prettier configs:** more flexibility, introduces style drift; harder to maintain
- **No Prettier (rely on ESLint only):** ESLint is slower and less focused on formatting
- **Different formatters per package:** cognitive load, harder to onboard contributors
- **Prettier import sorting plugins:** conflicts with ESLint; creates multiple sources of truth

---

## Consequences

### Positive

- **Consistency:** all code formatted identically across monorepo
- **Simple maintenance:** one config file to update
- **Clear ownership:** Prettier = formatting, ESLint = logic and imports
- **Tool alignment:** Prettier and ESLint don't conflict (single source of truth per concern)

### Negative

- **Inflexibility:** rare packages that need different formatting must use file-based overrides
  (less discoverable than dedicated config)
- **Tailwind dependency:** plugin assumes Tailwind exists; inert if not installed in a package
- **Package.json plugin overhead:** minimal but adds one dependency

### Requires

- **ESLint to own import ordering:** see ADR-VI-TECH-3
- **CI gate:** `pnpm format:check` in CI to enforce formatting

---

## Workflow

| Command              | Purpose                               |
| -------------------- | ------------------------------------- |
| `pnpm format`        | Auto-format all code with Prettier    |
| `pnpm format:check`  | Check formatting without modifying    |
| `pnpm format:staged` | Format staged files only (pre-commit) |

---

## Notes

- **Version lock:** Prettier 3.7.4 (locked at major.minor for reproducibility)
- **Plugin versions:** `prettier-plugin-packagejson` 2.5.20, `prettier-plugin-tailwindcss` 0.7.2
- **Caching:** Prettier supports `--cache` flag; Nx disables caching for format target (cache =
  false)
- **Override discovery:** developers should read `prettier.config.mjs` to discover file-based
  overrides (not self-evident)

---

## Changelog

| Version | Date       | Status   | Notes                                                                                            |
| ------- | ---------- | -------- | ------------------------------------------------------------------------------------------------ |
| 1.0     | 2026-01-09 | Accepted | **Latest & Effective.** Single centralized Prettier config. Import ordering delegated to ESLint. |
