# 05-ADRs (Architecture Decision Records)

**Purpose:** Record decisions permanently and immutably.

ADRs are the system's memory of why choices were made. They exist for decisions that are costly or
hard to reverse.

## File naming

```
ADR-<NNN>-<short-title>.md
or
ADR-<DOMAIN>-<NNN>-<short-title>.md
```

Examples:

- `ADR-001-monorepo-structure.md`
- `ADR-VI-TECH-001-typescript-strict-mode.md`

## Rules

- Sequential numbering (within domain if using prefixes)
- Append-only: do not edit after acceptance
- Never rewrite history; supersede with a new ADR
- Status: **Accepted** → **Superseded** (with link to successor)

## Minimum required content

- Status
- Context (including links to drivers: PROBDEF/REQ/RFC)
- Decision (specific)
- Alternatives considered (at least the most plausible)
- Consequences (positive and negative)

## Lightweight decisions

For small, low-risk decisions (1–5 lines each) that do not warrant a full ADR, use `DECISIONS.md`.

## Current ADRs

- `ADR-VI-TECH-testing-strategy-trophy.md` – Testing strategy (testing pyramid)
- `ADR-VI-TECH-nx-build-system-composite-projects.md` – Nx build system for composite projects
- `ADR-VI-TECH-prettier-formatting-centralized.md` – Prettier for centralized code formatting
- `ADR-VI-TECH-typescript-strict-project-references.md` – TypeScript with strict project references
- `ADR-VI-TECH-testing-implementation-specification.md` – Testing implementation specification
- `ADR-VI-TECH-eslint-oxlint-hybrid-linting.md` – Hybrid ESLint/Oxlint linting approach
