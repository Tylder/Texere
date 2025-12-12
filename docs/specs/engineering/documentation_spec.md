# Documentation Specification

**Document Version:** 0.1  
**Last Updated:** December 12, 2025  
**Status:** Draft  
**Backlink:** [High-Level Spec](../README.md)

## Quick Navigation

- [1. Scope](#1-scope)
- [2. Audience](#2-audience)
- [3. Principles](#3-principles)
- [4. Document Types & Required Content](#4-document-types--required-content)
- [5. Style & Voice](#5-style--voice)
- [6. Templates](#6-templates)
- [7. Docstrings & Comments](#7-docstrings--comments)
- [8. Maintenance & Governance](#8-maintenance--governance)
- [9. Quality Gates](#9-quality-gates)
- [10. Checklists](#10-checklists)
- [11. References](#11-references)
- [12. Changelog](#12-changelog)

## 1. Scope

- Define required documentation artifacts in the monorepo: root README, package/app README,
  feature/system specs, engineering/meta docs, inline docstrings, and code comments.
- Provide minimum content, style rules, and maintenance expectations for each artifact.
- Out of scope: SRE runbooks, marketing copy, and release notes (covered elsewhere when added).

## 2. Audience

- Engineers (TS + Python), spec authors, reviewers, and LLM agents that consume repo docs.

## 3. Principles

1. **Single source of truth:** Each concern has exactly one canonical document; higher-level docs
   link down, lower-level docs link back up (§5 cross-refs).
2. **Spec-first:** Update relevant specs before code changes (`meta/spec_writing.md §2`).
3. **Citable requirements:** Numbered sections and tables enable `spec_name §x.y` citations in
   code/tests.
4. **Scannability:** Readers should find answers in ≤30 seconds via headings, quick nav, and tables.
5. **Minimal duplication:** Prefer links over copy-paste; reuse shared sections via references.

## 4. Document Types & Required Content

### 4.1 Root README (`/README.md`)

- Purpose statement (1–2 sentences), install prerequisites, quickstart commands, validation
  commands.
- Repo map (apps, packages, tooling roots) with links to deeper specs.
- Pointers to active watchers (`pnpm dev:log`, `pnpm typecheck:watch:log`) and `logs/*.log`
  contract.
- Ownership/contact for escalation.

### 4.2 Package/App README (co-located)

- Purpose and scope of the package/app.
- Public API surface or primary CLI entry points with short examples.
- Inputs/outputs and env vars (reference `.env.example` when relevant).
- Validation commands filtered via Nx (`pnpm --filter <pkg> test`, etc.).
- Dependency graph pointer (`nx graph` or `nx show project <pkg>`), owners.

### 4.3 Feature/System Specs (`docs/specs/{system|feature}/`)

- Follow `meta/spec_writing.md` structure: title block, scope in/out, behavior/requirements,
  non-functional targets, edge cases, dependencies/cross-refs, testing guidance, changelog.
- Every spec links back to `docs/specs/README.md` and related sibling specs.

### 4.4 Engineering/Meta Docs (`docs/specs/engineering/`, `docs/specs/meta/`)

- Capture cross-cutting quality/process rules (testing, linting, formatting, agent workflow).
- Must include adoption status (Active/Draft/Deprecated) and versioned changelog.

### 4.5 ADRs (when added)

- One decision per file; include context, options, decision, consequences, and date/version.

## 5. Style & Voice

- Headings use sentence case; apply hierarchical levels in order (no level skipping) to aid scanning
  and accessibility (see References #2).
- Write in active voice, imperative mood for instructions (References #3).
- Define acronyms on first use; avoid unexplained jargon (References #4).
- Prefer tables for lookups (routes, config keys, acceptance criteria) to cut scan time.
- Keep paragraphs short; front-load key information in first sentence.
- Link instead of duplicating content; cite governing section when reinforcing behavior.

## 6. Templates

- **Root README template (§4.1):** Intro, install/prereqs, quickstart, validation commands, repo
  map, links to specs, support/ownership.
- **Package README template (§4.2):** Purpose, API/usage, env vars, validation commands, dependency
  graph pointer, owners.
- **Spec template (§4.3):** Title block, quick nav, scope (in/out), numbered requirements,
  non-functional targets, edge cases/errors, dependencies/cross-refs, testing guidance (with spec
  citations), changelog.

## 7. Docstrings & Comments

1. **TypeScript:** Use TSDoc/JSDoc blocks above exported symbols. First line is a concise summary
   ending with a period; include `@param`, `@returns`, `@throws` only when not obvious from types.
2. **Python:** Follow PEP 257 — triple double quotes, first-line summary sentence, blank line before
   details, closing quotes on their own line for multi-line docstrings (References #1).
3. **Public API coverage:** Modules/classes/functions exposed outside their file/package require
   docstrings; private helpers rely on clear naming unless complexity warrants a brief docstring.
4. **Inline comments:** Explain “why” or non-obvious intent, not restating code. Co-locate with the
   logic they clarify; delete or update if code changes.
5. **Imperative mood:** Start summaries with commands (e.g., “Return the sum.”) to align with PEP
   257 guidance (References #5).

## 8. Maintenance & Governance

- Each doc lists owner(s) and review cadence (default: quarterly); ownership may be a team handle.
- Meaningful edits require version bump + dated changelog row.
- Behavioral changes: update governing spec before code; code reviewers block merges when specs lag.
- Broken links or stale sections are treated as defects; open follow-up issues if not fixed
  in-place.

## 9. Quality Gates

- Docs live with code; run `pnpm post:report:fast` after doc changes to keep format/lint/typecheck
  healthy.
- Optional (TBD): add markdown lint/link check to CI; until then reviewers enforce heading order and
  link validity.

## 10. Checklists

**Author**

- Scope stated; headings follow hierarchy; citations present where requirements are reinforced.
- Links verified; ownership + review cadence noted.
- Changelog updated with date/version; acronyms expanded on first use.
- Duplicated content replaced with links to source-of-truth.

**Reviewer**

- Requirements are testable and traceable to numbered sections.
- Doc aligns with current code/spec behavior; no contradictions.
- Comments/docstrings explain intent; no stale sections.
- Quality gates executed or not applicable is justified.

## 11. References

1. PEP 257 – Docstring Conventions: summary line on first line, blank line before details, closing
   quotes on their own line for multi-line docstrings. (<https://peps.python.org/pep-0257/>)
2. Google Developer Documentation Style Guide – use sentence case for all headings; keep heading
   hierarchy without skipping levels. (<https://developers.google.com/style/headings>)
3. Ruff / pydocstyle rule D212 – summary line on the first line of multi-line docstrings per
   PEP 257. (<https://docs.astral.sh/ruff/rules/multi-line-summary-first-line/>)
4. GSA Web Style Guide – sentence case headings and logical heading order for accessibility.
   (<https://www.gsa.gov/reference/gsa-web-style-guide/written-style>)
5. Style Manual – sentence case improves readability; avoid punctuation at end of headings.
   (<https://www.stylemanual.gov.au/structuring-content/headings>)

## 12. Changelog

- 2025-12-12 | 0.1 | Draft | Initial repo-wide documentation specification (pending adoption).
