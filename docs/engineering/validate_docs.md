# validate-docs.mjs — Modernization & Extensibility Plan

## Context

This document captures a complete set of recommended fixes and modernization steps for
`script/validate-docs.mjs` (aka `validate-docs.mjs`) so it:

- follows current Node/JS tooling practices,
- becomes easier to extend and reason about,
- produces deterministic outputs,
- avoids pre-commit workflow footguns.

Scope includes:

- validation (frontmatter, naming, links)
- auto-fixes (last_updated)
- generation (DOCUMENT-REGISTRY + folder READMEs)
- developer workflow integration (pre-commit + CI)

Non-goals:

- changing the documentation taxonomy itself (IDEATION/REQ/SPEC/IMPL-PLAN/META)
- redesigning templates/content of docs beyond what is required for reliable automation

---

## Current Behavior (as implemented)

### Inputs / discovery

- Root docs directory: `docs/engineering/`
- Folder mapping:
  - `00-ideation` (type key `ideation`)
  - `01-requirements` (`requirements`)
  - `02-specifications` (`specifications`)
  - `03-implementation-plans` (`plans`)
  - `meta` (`meta`)
- Reads `*.md` in each folder, excluding `README.md`.
- Parses YAML frontmatter using a line-based parser:
  - only supports `key: value` lines
  - supports a minimal list format when values are `[a, b, c]`

### Staged file detection

- Uses: `git diff --cached --name-only --diff-filter=ACMR docs/engineering/`
- Filters to `*.md` excluding `README.md` and `DOCUMENT-REGISTRY.md`.

### Auto-fixes

- If a staged doc matches an on-disk doc, it rewrites `last_updated: YYYY-MM-DD` to today.
- Runs `prettier --write` on those modified doc paths.

### Validation

- Required frontmatter fields:
  - `type`, `status`, `stability`, `created`, `last_updated`, `area`, `feature`, `summary_short`,
    `summary_long`
- Validates `frontmatter.type` matches the folder’s expected type label.
- Enforces filename prefix by folder type (except for `meta`).
- Extracts markdown inline links using regex and checks _some_ local path patterns.

### Generation

- If (and only if) there are no validation errors:
  - rewrites `docs/engineering/DOCUMENT-REGISTRY.md` (preserving existing frontmatter if present)
  - rewrites each folder README content inside “Active” and “Archived” sections using regex
    replacement

---

## Critical Problems / Risks

### P0 — Pre-commit mutates files but does not guarantee they are committed

Symptoms:

- The script rewrites docs (last_updated), and potentially rewrites `DOCUMENT-REGISTRY.md` and
  folder `README.md`.
- In a standard pre-commit hook, those modifications are NOT necessarily included in the commit
  unless re-staged.

Impact:

- commits can pass validation while silently omitting the generated updates
- working tree ends up dirty after the commit

### P0 — Registry/README generation uses stale doc data

The script re-reads documents after updating `last_updated` to validate them, but then generates:

- `DOCUMENT-REGISTRY.md` using the _original_ `allDocs` array (stale content/frontmatter)
- folder `README.md` lists also using _original_ `allDocs`

Impact:

- registry and README output can be inconsistent with the actual on-disk docs
- last_updated changes may not be reflected in generated artifacts

### P0 — Frontmatter parsing is fragile

The custom parser does not correctly handle common YAML features:

- quoted values containing colons
- multiline scalars (`|` / `>`)
- arrays with quoting/escaping
- YAML typing (booleans/dates/numbers)

Impact:

- false validation failures
- subtle data corruption / misinterpretation

### P1 — Link validation is unreliable (false positives + false negatives)

Current link checking:

- only checks some patterns (URLs starting with `.`, `/`, or having an anchor with a path containing
  `/`)
- treats most other links as automatically valid
- regex extraction will pick up links in code blocks
- ignores reference-style links

Impact:

- broken links slip through
- developers stop trusting the checker (noise + misses)

### P1 — README update logic is brittle

README updates depend on regex matching exact headings and structure:

- `## Active …` followed by any content followed by `## Archived …`
- archived section replacement assumes a `---` separator is present

Impact:

- small README edits can break auto-generation
- failures may be silent or create malformed output

### P2 — Tooling/observability gaps

- Prettier failures are swallowed; no actionable output.
- Git failures return empty change set; can mask workflow errors.
- Output order is not explicitly sorted → diff churn.

---

## Recommended Target State

### 1) Separate “validate” vs “fix” (explicit modes)

Provide explicit CLI modes:

- `validate-docs --check`
  - read-only; no file writes
  - used in CI
- `validate-docs --fix`
  - updates `last_updated` for staged/targeted docs
  - regenerates registry and folder READMEs
  - formats generated outputs

Rule: **never do silent mutations in `--check`.**

### 2) Adopt standard parsers: frontmatter + markdown AST

- Frontmatter: use a dedicated frontmatter parser (gray-matter-class tooling)
- Markdown parsing: use an AST-based approach (remark/unified-class tooling)

Benefits:

- correct parsing across real-world markdown/yaml
- robust link extraction (excluding code blocks)
- easier extensibility via plugin/rule pipelines

### 3) Implement a rule pipeline (extensible by design)

Replace monolithic “validate everything” with composable rules:

- `Rule` interface: `id`, `check(ctx) -> issues[]`, optional `fix(ctx, issues)`
- `Issue`: structured objects with severity, code, message, and file reference
- `Context`: file graph + computed metadata (doc type, frontmatter, resolved paths)

This makes it straightforward to add new rules:

- schema validation of frontmatter
- forbidden fields
- link anchor validation
- “created <= last_updated” checks
- doc relationship checks (REQ must reference SPEC etc.)

### 4) Deterministic outputs

- Always sort docs before generating registry/readmes.
- Define a stable sort order:
  1. folder/type order (ideation → requirements → specifications → plans → meta)
  2. `area`
  3. `feature`
  4. document ID (filename without `.md`)

### 5) README generation via explicit markers (no fragile regex)

Replace regex section matching with markers in README:

- `<!-- AUTO-GEN:ACTIVE:START -->` / `<!-- AUTO-GEN:ACTIVE:END -->`
- `<!-- AUTO-GEN:ARCHIVED:START -->` / `<!-- AUTO-GEN:ARCHIVED:END -->`

The generator replaces only marker-bounded text.

### 6) Fix staged-file workflow properly

Pick ONE supported strategy and enforce it:

- Strategy A (recommended): integrate with staged-file tooling that re-stages changes
- Strategy B: script re-stages files it modifies (`git add ...`)
- Strategy C: script refuses to proceed if it made changes and requires re-run after staging

Do not keep “mutate but don’t stage” behavior.

---

## Immediate Patch Set (Minimal diffs, high payoff)

### Patch 0 — Fix stale data generation (registry/readmes)

Change generation to use the same post-fix document snapshot:

- After `updateLastUpdated()` runs, re-read docs and use that list for:
  - validation
  - registry generation
  - README generation

Concrete change:

- Replace `updateRegistry(allDocs)` with `updateRegistry(updatedDocs)`
- Replace `updateFolderReadme(type, allDocs)` with `updateFolderReadme(type, updatedDocs)`

### Patch 1 — Make pre-commit workflow consistent

Choose one:

- re-stage modified docs + generated files, OR
- fail the commit if modifications occurred and print “re-stage and retry”.

At minimum, include:

- staged docs whose `last_updated` was changed
- `docs/engineering/DOCUMENT-REGISTRY.md`
- any updated folder `README.md`

### Patch 2 — Make linkExists actually check local relative files

Extend local link checks:

- for `foo.md` (no `./` prefix): resolve against `docDir`
- for `images/x.png`: resolve against `docDir`
- for `foo.md#anchor`: check `foo.md` exists

Also:

- treat unknown schemes (`mailto:`, `tel:`) as valid by policy (explicit allowlist)

### Patch 3 — Stop swallowing Prettier errors

- If Prettier fails, print stderr and return non-zero in `--fix` mode.
- In `--check` mode, do not run Prettier at all.

### Patch 4 — Sort docs before generation

- Sort doc list before building the registry table and README lists.

---

## Full Modernization (Preferred Refactor)

### Proposed module layout

- `scripts/validate-docs/cli.ts`
- `scripts/validate-docs/fs.ts` (file discovery, IO helpers)
- `scripts/validate-docs/frontmatter.ts` (parse + stringify)
- `scripts/validate-docs/markdown.ts` (AST parse + utilities)
- `scripts/validate-docs/rules/` (one file per rule)
- `scripts/validate-docs/generators/` (registry generator, readme generator)
- `scripts/validate-docs/types.ts`

### Proposed rule set (baseline)

#### R001 Frontmatter present + required fields

- Missing frontmatter: error
- Missing required keys: error

#### R002 Frontmatter type matches folder

- Enforce `IDEATION/REQ/SPEC/IMPL-PLAN/META` mapping

#### R003 Filename prefix matches type

- Enforce `IDEATION-`, `REQ-`, `SPEC-`, `IMPL-PLAN-` for non-meta

#### R004 last_updated policy

- In `--fix` mode: set to today on staged docs
- In `--check` mode: enforce `last_updated >= created`

#### R005 Links: local existence

- Validate relative links and root links against repo filesystem
- Exclude code blocks
- Support reference-style links

### Generation improvements

#### DOCUMENT-REGISTRY.md

- Preserve registry frontmatter
- Ensure registry content is deterministic
- If desired, include additional derived columns later (e.g., tags)

#### Folder README.md

- Require marker blocks for generated sections
- Generate sections deterministically

---

## Workflow Integration

### Pre-commit

Recommendation:

- Use a staged-file runner so formatting/fixes apply only to staged files and re-staging is handled
  consistently.

### CI

- Run `validate-docs --check` on PRs.
- Optionally run a “generation drift” check:
  - run `--fix` in CI and fail if `git diff` is non-empty (forces devs to run fix locally)

---

## Migration Plan (Low risk)

### Phase 1 (1–2 small PRs)

- Implement Patch 0–4 (stale data, staging discipline, better linkExists, sorted output, no
  swallowed errors)
- Add `--check` vs `--fix` split (even if internally they call shared code)

### Phase 2

- Replace frontmatter parser with a standard frontmatter library
- Replace link extraction with markdown AST parsing

### Phase 3

- Introduce rule pipeline and move current validations into rules
- Introduce marker-based README generation

---

## Acceptance Criteria

### Correctness

- If the script auto-fixes any file, the resulting commit contains those changes (or the commit is
  blocked with a clear instruction).
- `DOCUMENT-REGISTRY.md` and folder READMEs are generated from the same doc snapshot that validation
  checked.
- Link validation correctly flags broken relative links and does not flag links inside code blocks.

### Determinism

- Running `--fix` twice without doc changes produces no diff.

### Extensibility

- Adding a new validation rule does not require modifying a central monolithic function beyond
  registering the rule.

---

## Sources (non-cited reference list)

- Prettier documentation: “Pre-commit hook” guidance
- lint-staged official repository documentation
- Eleventy documentation indicating gray-matter usage for frontmatter parsing
- remark/unified documentation for markdown AST + plugin architecture
- Node.js release schedule / previous releases page (Active LTS status)
