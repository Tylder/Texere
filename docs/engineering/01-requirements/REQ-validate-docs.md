---
type: REQ
status: active
stability: stable
created: 2026-01-21
last_updated: 2026-01-21
area: documentation
feature: validation-system
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Validate documentation structure, metadata, naming, and links; auto-update registries and folder
  READMEs on every commit'
summary_long: |
  Defines normative requirements for the documentation validation system that ensures every engineering document has
  correct frontmatter fields, follows naming conventions, contains valid links, and maintains synchronized indices
  (DOCUMENT-REGISTRY.md and folder READMEs). The validation runs as a pre-commit hook via lint-staged.
index:
  sections:
    - title: 'Document Relationships'
      lines: [110, 133]
      summary:
        'Driven by META-documentation-system; implements the validation layer of the documentation
        lifecycle.'
      token_est: 91
    - title: 'TLDR'
      lines: [135, 154]
      summary:
        'Every document must have valid frontmatter, correct naming, valid links, and indices must
        stay synchronized.'
      token_est: 134
    - title: 'Scope'
      lines: [156, 187]
      summary:
        'Covers frontmatter validation, naming conventions, link checking, and index generation/sync
        for all documents in docs/engineering.'
      token_est: 189
    - title: 'REQ-001: Frontmatter Validation'
      lines: [189, 220]
      summary:
        'Every document MUST have YAML frontmatter with nine required fields: type, status,
        stability, created, last_updated, area, feature, summary_short, summary_long.'
      token_est: 244
    - title: 'REQ-002: Type and Folder Consistency'
      lines: [222, 255]
      summary:
        'Document type in frontmatter MUST match the folder it resides in; ideation docs MUST have
        IDEATION-(PROBLEMS|EXPERIENCE|UNKNOWNS) type.'
      token_est: 238
    - title: 'REQ-003: Naming Convention Enforcement'
      lines: [257, 290]
      summary:
        'Files MUST follow naming patterns: IDEATION-(PROBLEMS|EXPERIENCE|UNKNOWNS)-_, REQ-_,
        SPEC-_, IMPL-PLAN-_, META-\*.'
      token_est: 201
    - title: 'REQ-004: Link Validation'
      lines: [292, 333]
      summary:
        'All markdown links in document content MUST be validated; broken links MUST be reported
        with file path and link text.'
      token_est: 341
    - title: 'REQ-005: Auto-Update Last Updated Timestamp'
      lines: [335, 370]
      summary:
        'Documents staged for commit MUST have last_updated field automatically updated to current
        ISO datetime.'
      token_est: 275
    - title: 'REQ-006: Generate and Sync DOCUMENT-REGISTRY.md'
      lines: [372, 411]
      summary:
        'DOCUMENT-REGISTRY.md MUST be regenerated from all document frontmatter, sorted
        deterministically, with table showing ID, Type, Status, Stability, Area, Feature, Summary.'
      token_est: 333
    - title: 'REQ-007: Update Folder READMEs'
      lines: [413, 451]
      summary:
        'Each folder README MUST maintain active and archived/deprecated lists of documents, sorted
        deterministically.'
      token_est: 290
    - title: 'REQ-008: Code Formatting'
      lines: [453, 485]
      summary:
        'All modified documentation files (registry, folder READMEs, updated docs) MUST be formatted
        with Prettier before re-staging.'
      token_est: 218
    - title: 'REQ-009: Re-stage Modified Files'
      lines: [487, 522]
      summary:
        'Files modified by validation/auto-update steps MUST be re-staged via git add so they are
        included in the commit.'
      token_est: 250
    - title: 'Design Decisions'
      lines: [524, 537]
      token_est: 245
    - title: 'Blockers'
      lines: [539, 547]
      summary:
        'No active blockers; script is production-deployed via pre-commit hooks and lint-staged.'
      token_est: 56
    - title: 'Assumptions & Unknowns'
      lines: [549, 563]
      token_est: 251
    - title: 'Document Metadata'
      lines: [565, 581]
      token_est: 47
---

# REQ-validate-docs

## Document Relationships

Summary: Driven by META-documentation-system; implements the validation layer of the documentation
lifecycle.

**Upstream (depends on):**

- docs/engineering/meta/META-documentation-system.md (defines the system this validates)

**Downstream (depends on this):**

- script/validate-docs.mjs (implements this requirement)
- DOCUMENT-REGISTRY.md (generated and kept in sync by this requirement)
- docs/engineering/\*/README.md (folder READMEs kept in sync)

**Siblings (related Requirements):**

- REQ-generate-doc-indices.md (generates section indices; runs independently)

**Related (cross-cutting):**

- docs/engineering/meta/META-documentation-system.md (defines what this validates)

---

## TLDR

Summary: Every document must have valid frontmatter, correct naming, valid links, and indices must
stay synchronized.

**What:** Validation rules for documentation structure, metadata, naming, and links; auto-generation
of indices on every commit.

**Why:** Ensures consistency across all engineering docs; prevents metadata drift; keeps LLMs and
tooling reliable; catches errors early.

**How:** Pre-commit hook runs validate-docs.mjs to validate, auto-update timestamps, regenerate
DOCUMENT-REGISTRY.md and folder READMEs, and re-stage modified files.

**Status:** Active (enforced via lint-staged pre-commit hook)

**Critical path:** Document created/modified → validation detects issues → script auto-fixes what it
can (timestamps, registry, READMEs) → human fixes validation errors → commit succeeds.

---

## Scope

Summary: Covers frontmatter validation, naming conventions, link checking, and index generation/sync
for all documents in docs/engineering.

**Includes:**

- Validation of nine required frontmatter fields (type, status, stability, created, last_updated,
  area, feature, summary_short, summary_long)
- Type-to-folder consistency (REQ in 01-requirements, SPEC in 02-specifications, etc.)
- Naming convention enforcement (IDEATION-PROBLEMS-_, REQ-_, SPEC-\*, etc.)
- Link existence checks (relative, absolute, and fragment links)
- Auto-update of last_updated timestamps for modified documents
- Regeneration of DOCUMENT-REGISTRY.md from all document frontmatter
- Update of folder READMEs with active/archived document lists
- Prettier formatting of modified files
- Re-staging of auto-modified files for inclusion in commit

**Excludes:**

- Section content validation (that is REQ-generate-doc-indices responsibility)
- Non-documentation files
- Files outside docs/engineering
- External link validation (only local file links validated)

**In separate docs:**

- Section/content indexing logic: REQ-generate-doc-indices.md
- System-level documentation conventions: docs/engineering/meta/META-documentation-system.md
- Implementation details: script/validate-docs.mjs

---

## REQ-001: Frontmatter Validation

Summary: Every document MUST have YAML frontmatter with nine required fields: type, status,
stability, created, last_updated, area, feature, summary_short, summary_long.

**Statement:**

Every markdown document in docs/engineering MUST begin with YAML frontmatter (delimited by `---`)
containing all nine required fields. Validation MUST reject documents with missing fields.

**Rationale:**

Frontmatter is the machine-readable source of truth for document metadata. DOCUMENT-REGISTRY.md and
folder READMEs are generated from frontmatter. LLMs rely on frontmatter for filtering and
understanding document status. Missing fields break downstream automation and create inconsistent
records.

**Measurable Fit Criteria:**

- [ ] Validation rejects documents missing any required field
- [ ] Error message clearly names the missing field and file path
- [ ] All nine fields (type, status, stability, created, last_updated, area, feature, summary_short,
      summary_long) are checked
- [ ] Validation passes only if all fields present (non-empty values)

**Verification Method:**

- Automated test: create doc without one field, run validator, expect error with field name
- Automated test: create doc with all nine fields, run validator, expect pass
- Manual test: attempt commit with incomplete frontmatter, verify pre-commit hook catches it

---

## REQ-002: Type and Folder Consistency

Summary: Document type in frontmatter MUST match the folder it resides in; ideation docs MUST have
IDEATION-(PROBLEMS|EXPERIENCE|UNKNOWNS) type.

**Statement:**

The `type` field in frontmatter MUST match the document's folder:

- Documents in `00-ideation/` MUST have type = `IDEATION-PROBLEMS`, `IDEATION-EXPERIENCE`, or
  `IDEATION-UNKNOWNS`
- Documents in `01-requirements/` MUST have type = `REQ`
- Documents in `02-specifications/` MUST have type = `SPEC`
- Documents in `03-implementation-plans/` MUST have type = `IMPL-PLAN`
- Documents in `meta/` MUST have type = `META`

**Rationale:**

Folder structure is the primary organizational principle. Type mismatch creates confusion and breaks
category-based queries (e.g., "find all REQs"). Validation catches human error early.

**Measurable Fit Criteria:**

- [ ] Validation checks type against folder name
- [ ] Error message shows expected type and actual type
- [ ] Ideation subtypes are validated strictly (no typos like IDEATION-PROBLEMS-typo)

**Verification Method:**

- Automated test: place a file with type=REQ in 00-ideation/, expect error
- Automated test: place a file with type=IDEATION-PROBLEMS in 01-requirements/, expect error
- Manual test: attempt commit with type mismatch, verify pre-commit hook catches it

---

## REQ-003: Naming Convention Enforcement

Summary: Files MUST follow naming patterns: IDEATION-(PROBLEMS|EXPERIENCE|UNKNOWNS)-_, REQ-_,
SPEC-_, IMPL-PLAN-_, META-\*.

**Statement:**

Every markdown document file (except README.md and DOCUMENT-REGISTRY.md) MUST follow the naming
convention for its document type:

- Ideation: `IDEATION-(PROBLEMS|EXPERIENCE|UNKNOWNS)-<feature>.md`
- Requirements: `REQ-<feature>.md`
- Specifications: `SPEC-<area>-<topic>.md`
- Implementation Plans: `IMPL-PLAN-<area>-<topic>.md`
- Meta: `META-<topic>.md`

**Rationale:**

Consistent naming makes documents discoverable and signals intent. Combined with folder structure
and frontmatter type, naming provides three signals for validation and prevents silent errors.

**Measurable Fit Criteria:**

- [ ] Validation rejects filenames that don't start with correct prefix
- [ ] Error message shows expected prefix and actual filename
- [ ] Ideation subtype is validated against filename (PROBLEMS, EXPERIENCE, UNKNOWNS)

**Verification Method:**

- Automated test: create file `req-foo.md` in 01-requirements/ (lowercase prefix), expect error
- Automated test: create file `UNKNOWN-foo.md` in 00-ideation/ (wrong subtype), expect error
- Manual test: attempt commit with misnamed file, verify pre-commit hook catches it

---

## REQ-004: Link Validation

Summary: All markdown links in document content MUST be validated; broken links MUST be reported
with file path and link text.

**Statement:**

Validation MUST extract all markdown links (`\[text\]\(url\)`) from document content and verify
that:

- External links (http://, https://) are accepted as valid
- Relative local links (e.g., `../foo.md`, `./bar.md`) are checked for file existence
- Root-relative links (e.g., `/docs/foo.md`) are checked for file existence
- Anchor-only links (e.g., `#section`) are accepted as valid
- Fragment links (e.g., `foo.md#section`) check file existence
- Protocol links (e.g., `mailto:`, `tel:`) are accepted as valid

If a link target does not exist, validation MUST report an error with the document path, link text,
and URL.

**Rationale:**

Broken links create frustration and dead references in documentation. Users (humans and LLMs) expect
links to be reachable. Validation catches link rot early and prevents it from propagating.

**Measurable Fit Criteria:**

- [ ] External links (http/https) are accepted without checking
- [ ] Local relative links are validated for file existence
- [ ] Root-relative links are validated for file existence
- [ ] Error messages show file path, link text, and target URL
- [ ] Anchor-only links (#section) are accepted (can't validate reliably)
- [ ] mailto: and tel: links are accepted

**Verification Method:**

- Automated test: add link to non-existent file, run validator, expect error
- Automated test: add valid relative link, run validator, expect pass
- Automated test: add external link, run validator, expect pass
- Manual test: attempt commit with broken link, verify pre-commit hook catches it

---

## REQ-005: Auto-Update Last Updated Timestamp

Summary: Documents staged for commit MUST have last_updated field automatically updated to current
ISO datetime.

**Statement:**

When validate-docs.mjs runs (via pre-commit hook), for every document that appears in
`git diff --cached --name-only` (i.e., staged for commit):

- Automatically update the `last_updated` field in frontmatter to the current ISO 8601 datetime
  (e.g., `2026-01-21T14:21:27.433Z`)
- If the field already exists, replace it; if missing, add it during validation error recovery
- The update happens before registry/README generation so indices reflect the new timestamp

**Rationale:**

Tracking update timestamps helps readers understand document freshness. Automatic updates remove the
burden of manual timestamp management and guarantee accuracy. Pre-commit timing ensures every commit
captures the exact time of change.

**Measurable Fit Criteria:**

- [ ] last_updated is automatically updated to current ISO datetime
- [ ] Format is ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ)
- [ ] Update happens only for staged files
- [ ] Updated files are then included in the commit

**Verification Method:**

- Automated test: modify and stage a document, run validator, check last_updated is updated
- Manual test: stage a document, inspect the file after pre-commit hook runs, confirm timestamp
  updated
- Manual test: commit the change, inspect git log or file history to confirm timestamp is preserved

---

## REQ-006: Generate and Sync DOCUMENT-REGISTRY.md

Summary: DOCUMENT-REGISTRY.md MUST be regenerated from all document frontmatter, sorted
deterministically, with table showing ID, Type, Status, Stability, Area, Feature, Summary.

**Statement:**

DOCUMENT-REGISTRY.md MUST be regenerated on every validation run with the following structure:

1. YAML frontmatter (auto-generated, do-not-edit-manually: true)
2. A markdown table with columns: ID, Type, Status, Stability, Area, Feature, Summary
3. One row per document (all documents across all folders)
4. Documents sorted deterministically by: folder order (ideation → requirements → specifications →
   plans → meta), then area, then feature, then filename
5. ID is the filename without `.md`

**Rationale:**

DOCUMENT-REGISTRY.md is the machine-readable query surface for downstream tooling and LLMs.
Deterministic sorting prevents spurious git diffs. Single source of truth (frontmatter) prevents
manual index maintenance errors.

**Measurable Fit Criteria:**

- [ ] Registry table includes all documents (except README.md and registry itself)
- [ ] Sorting order is consistent (folder → area → feature → filename)
- [ ] Table columns are: ID, Type, Status, Stability, Area, Feature, Summary
- [ ] Summary column pulls from frontmatter summary_short
- [ ] Registry is regenerated on every run (not incremental)
- [ ] Frontmatter includes auto_generated_by and last_updated fields

**Verification Method:**

- Automated test: create 5 test documents with different areas/features, run validator, check
  sorting order
- Automated test: modify one document's frontmatter, run validator, check registry updates
- Manual test: inspect DOCUMENT-REGISTRY.md, verify all documents present and correctly sorted
- Manual test: commit two document changes in different order, verify registry sort order is stable

---

## REQ-007: Update Folder READMEs

Summary: Each folder README MUST maintain active and archived/deprecated lists of documents, sorted
deterministically.

**Statement:**

For each folder (00-ideation, 01-requirements, 02-specifications, 03-implementation-plans, meta):

- Maintain a section "## Active [Ideation|Requirements|Specifications|Plans|Meta Documents]" with
  links to all active documents in that folder
- Maintain a section "## Archived / Deprecated / Completed" with links to all non-active documents
  (status != active)
- List format: `` `- [\`filename\`]\(filename\) (feature-name)` `` for active;
  `` `- [\`filename\`]\(filename\) (status) - feature-name` `` for archived
- Sort documents within each list deterministically: area, feature, filename
- Update lists on every validation run

**Rationale:**

Folder READMEs are entry points for browsing documentation. Keeping them in sync prevents stale
listings. Separate active/archived sections make navigation clear.

**Measurable Fit Criteria:**

- [ ] Active section lists all documents with status=active
- [ ] Archived section lists all documents with status != active
- [ ] Lists are sorted deterministically (area → feature → filename)
- [ ] Links are relative paths to document files
- [ ] README updates happen on every validation run

**Verification Method:**

- Automated test: create documents with different statuses, run validator, check README lists
- Automated test: change document status to "archived", run validator, check document moves to
  archived list
- Manual test: browse folder README, verify it matches actual folder contents

---

## REQ-008: Code Formatting

Summary: All modified documentation files (registry, folder READMEs, updated docs) MUST be formatted
with Prettier before re-staging.

**Statement:**

After auto-updating timestamps, regenerating DOCUMENT-REGISTRY.md, and updating folder READMEs:

- Run Prettier on all modified files (DOCUMENT-REGISTRY.md, all folder READMEs, all auto-updated
  documents)
- Format with `npx prettier --write` before re-staging
- If Prettier fails, propagate the error (do not silently ignore)

**Rationale:**

Consistent formatting prevents spurious diffs due to whitespace/formatting variations. Prettier is
the project's standard formatter. Pre-formatting ensures files meet style standards before commit.

**Measurable Fit Criteria:**

- [ ] Prettier is invoked on all modified files
- [ ] Files are formatted in-place (--write flag)
- [ ] Prettier errors are reported and block the commit
- [ ] No silent failures

**Verification Method:**

- Automated test: run validator on document with bad formatting, check Prettier is applied
- Manual test: format a file badly, run validator, verify Prettier corrects it
- Manual test: simulate Prettier failure, verify error is reported

---

## REQ-009: Re-stage Modified Files

Summary: Files modified by validation/auto-update steps MUST be re-staged via git add so they are
included in the commit.

**Statement:**

After all auto-fixes are applied (timestamp updates, registry generation, README updates, Prettier
formatting), all modified files MUST be re-staged via `git add`. This ensures:

- Auto-updated documents are included in the commit
- Modified DOCUMENT-REGISTRY.md is included
- Modified folder READMEs are included

Re-staging happens after formatting and before the script exits.

**Rationale:**

Pre-commit hooks run after `git add` but before `git commit`. Modifications made by the hook are not
automatically included in the commit. Re-staging ensures auto-fixes are part of the commit, not left
as unstaged changes.

**Measurable Fit Criteria:**

- [ ] git add is invoked on all modified files
- [ ] Re-staging happens after formatting
- [ ] Re-staging errors are reported
- [ ] User can view staged changes in subsequent commands

**Verification Method:**

- Automated test: run validator, check modified files appear in `git diff --cached`
- Manual test: run pre-commit hook, then `git status`, verify modified files are staged
- Manual test: attempt commit, verify staged changes are included

---

## Design Decisions

| Field                  | Decision 001: Validation Timing             | Decision 002: Custom YAML Parser              | Decision 003: Index Generation Strategy       |
| ---------------------- | ------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| **Title**              | Pre-commit vs. Post-commit                  | Simple custom parser vs. full YAML library    | Generate on every run vs. incremental updates |
| **Options Considered** | A) Pre-commit (chosen) B) Post-commit C) CI | A) Custom simple parser (chosen) B) js-yaml   | A) Full generation (chosen) B) Incremental    |
| **Chosen**             | Option A: Pre-commit                        | Option A: Custom parser                       | Option A: Full generation each run            |
| **Rationale**          | Fail fast before commit; immediate feedback | Avoid heavy dependencies; handle common cases | Simpler, deterministic, no state management   |
| **Tradeoffs**          | May slow down git workflow slightly         | Doesn't support full YAML spec                | Regenerates entire registry each time         |
| **Blocked**            | None                                        | None                                          | None                                          |
| **Expires**            | If validation becomes too slow              | If YAML parsing becomes inadequate            | If registry performance becomes an issue      |
| **Decision Date**      | 2026-01-21                                  | 2026-01-21                                    | 2026-01-21                                    |

---

## Blockers

Summary: No active blockers; script is production-deployed via pre-commit hooks and lint-staged.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | -      | -             | -      |

---

## Assumptions & Unknowns

| Assumption                                            | Validation Method                          | Confidence | Impact if Wrong                                |
| ----------------------------------------------------- | ------------------------------------------ | ---------- | ---------------------------------------------- |
| lint-staged is configured to invoke validate-docs.mjs | Review .lintstagedrc or lint-staged config | High       | Validation won't run; docs won't be synced     |
| Prettier is installed and available via npx           | Run `npx prettier --version`               | High       | Formatting will fail; block commits            |
| Git is available in the commit environment            | Check git is in PATH                       | High       | Script can't read staged files; won't work     |
| Developers have write access to docs/engineering      | Review git permissions                     | High       | Re-staging will fail; documentation won't sync |

| Unknown                                     | Impact                                | Resolution Criteria                         | Owner              | ETA     |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------- | ------------------ | ------- |
| Should validation support external schemas? | Extensibility and future integration  | Stakeholder request for schema validation   | Documentation team | 2026-Q2 |
| Performance on very large doc sets (1000+)  | Validation latency in pre-commit hook | Benchmark on 1000+ docs; optimize if >5 sec | Documentation team | 2026-Q2 |

---

## Document Metadata

```yaml
id: REQ-validate-docs
type: REQ
status: active
stability: stable
created: 2026-01-21
last_updated: 2026-01-21
area: documentation
feature: validation-system
driven_by: [docs/engineering/meta/META-documentation-system.md]
implemented_by: [script/validate-docs.mjs]
blocks: []
related: [REQ-generate-doc-indices.md]
keywords: [validation, automation, pre-commit, frontmatter, registry, formatting]
```
