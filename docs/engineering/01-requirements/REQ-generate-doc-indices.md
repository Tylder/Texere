---
type: REQ
status: active
stability: stable
created: 2026-01-21
last_updated: 2026-01-21
area: documentation
feature: section-indexing
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: >-
  Extract section hierarchy (H2/H3) from documents and embed structured index in frontmatter for LLM
  parsing
summary_long: |
  Defines normative requirements for the section indexing system that extracts markdown headings from documents,
  collects section summaries, estimates token counts, and embeds a structured index in document frontmatter. This enables
  LLMs to quickly identify relevant sections without reading entire documents.
index:
  sections:
    - title: 'TLDR'
      lines: [93, 112]
      summary:
        'Extract H2/H3 heading hierarchy with summaries and token estimates; embed in frontmatter as
        machine-readable index.'
      token_est: 150
    - title: 'Scope'
      lines: [114, 144]
      summary:
        'Covers heading extraction, summary collection, token estimation, subsection inclusion
        logic, and frontmatter embedding.'
      token_est: 185
    - title: 'REQ-001: Extract H2 and H3 Headings'
      lines: [146, 181]
      summary:
        'Extract all H2 and H3 headings from document content (after frontmatter); build hierarchy
        with H3 as subsections of H2.'
      token_est: 272
    - title: 'REQ-002: Collect Section Summaries'
      lines: [183, 221]
      summary:
        'Immediately after each heading, extract the "Summary: ..." line; if missing and
        summary_mode=error, report error.'
      token_est: 294
    - title: 'REQ-003: Token Estimation'
      lines: [223, 256]
      summary:
        'Estimate tokens for each section as word_count \* 1.3 multiplier; use for subsection
        inclusion filtering.'
      token_est: 228
    - title: 'REQ-004: Subsection Filtering'
      lines: [258, 291]
      summary:
        'Only include H3 subsections in index if parent H2 section has ≥300 tokens; skip smaller
        sections to avoid clutter.'
      token_est: 263
    - title: 'REQ-005: Embed Index in Frontmatter'
      lines: [293, 342]
      summary:
        'Add index field to document frontmatter with sections array; each section includes title,
        lines, summary, token_est, subsections.'
      token_est: 303
    - title: 'REQ-006: Determine Accurate Line Numbers'
      lines: [344, 383]
      summary:
        'Generate dummy index, format with Prettier, then replace line numbers with real 1-based
        line positions from formatted content.'
      token_est: 315
    - title: 'REQ-007: Format Document with Prettier'
      lines: [385, 419]
      summary:
        'Format documents with Prettier after embedding dummy index and before extracting real line
        numbers.'
      token_est: 242
    - title: 'Design Decisions'
      lines: [421, 434]
      token_est: 245
    - title: 'Blockers'
      lines: [436, 444]
      summary: 'No active blockers; script runs independently and modifies documents in-place.'
      token_est: 55
    - title: 'Assumptions & Unknowns'
      lines: [446, 461]
      token_est: 292
    - title: 'Document Metadata'
      lines: [463, 479]
      token_est: 47
---

# REQ-generate-doc-indices

---

## TLDR

Summary: Extract H2/H3 heading hierarchy with summaries and token estimates; embed in frontmatter as
machine-readable index.

**What:** Scan markdown documents for heading hierarchy, summaries, and estimate section token
counts; embed structured index in frontmatter.

**Why:** LLMs and tooling need to quickly locate relevant sections without reading entire documents.
Index enables token-aware section fetching and improves context efficiency.

**How:** Extract H2/H3 headings with summaries, estimate tokens, build hierarchy, use two-pass
approach (dummy index → format → real line numbers) to ensure accurate line references.

**Status:** Active (embedded in all documents)

**Critical path:** Document written with sections → generate-indices extracts structure →
frontmatter index updated → LLMs use index to fetch only relevant sections.

---

## Scope

Summary: Covers heading extraction, summary collection, token estimation, subsection inclusion
logic, and frontmatter embedding.

**Includes:**

- Extraction of H2 and H3 markdown headings from document body (after frontmatter)
- Collection of "Summary: ..." lines immediately following headings
- Token estimation per section (word count × 1.3 multiplier)
- Building heading hierarchy (H3 nested under H2)
- Filtering subsections (only include if parent section ≥ 300 tokens)
- Embedding structured index in document frontmatter
- Determining accurate line numbers (1-based, in formatted content)
- Formatting documents with Prettier before extracting real line numbers

**Excludes:**

- H1 or H4+ headings (only H2/H3)
- Sections outside docs/engineering
- Frontmatter parsing/validation (that is REQ-validate-docs)
- Registry generation (that is REQ-validate-docs)
- Section content validation (only structure is indexed)

**In separate docs:**

- Frontmatter validation: REQ-validate-docs.md
- Registry generation: REQ-validate-docs.md
- System-level conventions: docs/engineering/meta/META-documentation-system.md

---

## REQ-001: Extract H2 and H3 Headings

Summary: Extract all H2 and H3 headings from document content (after frontmatter); build hierarchy
with H3 as subsections of H2.

**Statement:**

The indexing script MUST:

1. Extract all H2 headings (`##`) and H3 headings (`###`) from the document body (after frontmatter)
2. Skip H1, H4, and other heading levels
3. Build a hierarchy where H3 headings are nested as subsections of their parent H2
4. Preserve heading title exactly as written (no transformation)

**Rationale:**

H2/H3 represents the document structure defined in META-documentation-system (Relationships, TLDR,
Scope, Main Content, etc.). Hierarchical structure allows LLMs to understand section nesting and
select relevant subsections.

**Measurable Fit Criteria:**

- [ ] All H2 headings are extracted
- [ ] All H3 headings under H2 are extracted as subsections
- [ ] H1, H4+ headings are not included in index
- [ ] H3 headings are correctly nested under their parent H2
- [ ] Heading titles preserve original casing and text

**Verification Method:**

- Automated test: document with 3 H2, 5 H3, 2 H4; index contains only 3+5 headings, H3 nested
  correctly
- Automated test: heading title with special chars (quotes, symbols); title preserved exactly
- Manual test: inspect generated index, verify hierarchy matches document structure

---

## REQ-002: Collect Section Summaries

Summary: Immediately after each heading, extract the "Summary: ..." line; if missing and
summary_mode=error, report error.

**Statement:**

For each extracted heading (H2 or H3):

1. Look at the next non-empty line in the document
2. If it matches the pattern `^Summary:`, extract the summary text (remainder of line and
   continuation)
3. If no "Summary:" line exists:
   - If `summary_mode: error` in INDEXING_CONFIG, report an error with file path, heading, and line
     number
   - If `summary_mode: skip`, skip the section (don't include in index)
4. Summaries may span multiple lines (until next heading or end of section)

**Rationale:**

Summaries enable LLMs to understand section purpose without reading full content. They are mandatory
according to META-documentation-system. Collection during indexing catches missing summaries early.

**Measurable Fit Criteria:**

- [ ] Single-line summaries (e.g., "Summary: Foobar") are extracted
- [ ] Multi-line summaries are collected (joined with spaces)
- [ ] Missing summaries trigger error (if summary_mode=error) with location info
- [ ] Missing summaries are skipped (if summary_mode=skip)
- [ ] Extracted summary text is trimmed and normalized

**Verification Method:**

- Automated test: heading with "Summary: foo" extracts "foo"
- Automated test: heading with multiline summary extracts full text
- Automated test: heading without summary, summary_mode=error, expect error with line number
- Automated test: heading without summary, summary_mode=skip, expect section not in index

---

## REQ-003: Token Estimation

Summary: Estimate tokens for each section as word_count \* 1.3 multiplier; use for subsection
inclusion filtering.

**Statement:**

For each extracted section (H2 or H3):

1. Count the words in the section body (from heading line to end of section)
2. Calculate tokens as: `ceil(word_count × 1.3)`
3. Store token estimate in index
4. Use token estimate for subsection filtering (see REQ-004)

**Rationale:**

Token estimates help LLMs decide whether to fetch a section (if token budget is limited). The 1.3
multiplier is a conservative estimate (typical: 0.75-1.5 words/token). Token estimation is simple
and provides useful signal without deep NLP.

**Measurable Fit Criteria:**

- [ ] Token count = ceil(word_count × 1.3)
- [ ] Word count includes heading and summary
- [ ] Token estimate is stored for each section
- [ ] Estimate is used for subsection filtering logic

**Verification Method:**

- Automated test: 100-word section estimates to ~130 tokens
- Automated test: 1-word section estimates to 2 tokens (ceil)
- Manual test: inspect generated index, token_est values are reasonable

---

## REQ-004: Subsection Filtering

Summary: Only include H3 subsections in index if parent H2 section has ≥300 tokens; skip smaller
sections to avoid clutter.

**Statement:**

When building the index:

1. For each H2 section, calculate total tokens (including all H3 subsections below it)
2. If H2 token count ≥ 300:
   - Include all H3 subsections in the index under that H2
3. If H2 token count < 300:
   - Include only the H2 in the index (omit all H3 subsections)

**Rationale:**

Small sections don't benefit from subsection granularity; omitting them reduces clutter and keeps
indices readable. The 300-token threshold balances detail with usability (roughly 200-300 words).

**Measurable Fit Criteria:**

- [ ] H2 sections with ≥ 300 tokens include subsections in index
- [ ] H2 sections with < 300 tokens omit subsections
- [ ] Token threshold is 300 (configurable in INDEXING_CONFIG)
- [ ] Parent H2 is always included (even if <300 tokens)

**Verification Method:**

- Automated test: H2 with 250 tokens (3 H3 subsections); index shows H2 only (no subsections)
- Automated test: H2 with 350 tokens (3 H3 subsections); index shows H2 and all 3 H3
- Automated test: adjust threshold to 500, verify filtering behavior changes

---

## REQ-005: Embed Index in Frontmatter

Summary: Add index field to document frontmatter with sections array; each section includes title,
lines, summary, token_est, subsections.

**Statement:**

The script MUST add an `index` field to the document frontmatter (between `---` delimiters) with the
following structure:

```yaml
index:
  sections:
    - title: 'H2 Title'
      lines: [start_line, end_line]
      summary: 'Summary text'
      token_est: 250
      subsections:
        - title: 'H3 Title'
          lines: [start_line, end_line]
          summary: 'Summary text'
          token_est: 120
```

- `title`: Exact heading text
- `lines`: [1-based start line, 1-based end line] in the formatted document
- `summary`: Extracted summary text (or null if not present)
- `token_est`: Estimated tokens for section
- `subsections`: Array of H3 subsections (only if parent ≥ 300 tokens)

**Rationale:**

Embedded index is machine-readable without external parsing. YAML nesting preserves hierarchy. Line
numbers enable precise section fetching. Index is part of document metadata, not separate file.

**Measurable Fit Criteria:**

- [ ] index field exists in frontmatter
- [ ] index.sections is an array with all H2 sections
- [ ] Each section has title, lines, summary, token_est
- [ ] Subsections included only when parent ≥ 300 tokens
- [ ] Line numbers are 1-based and accurate

**Verification Method:**

- Automated test: document with 2 H2, 3 H3; inspect frontmatter, verify structure
- Automated test: line numbers are accurate (manual verification on formatted content)
- Manual test: parse frontmatter YAML, verify it's valid

---

## REQ-006: Determine Accurate Line Numbers

Summary: Generate dummy index, format with Prettier, then replace line numbers with real 1-based
line positions from formatted content.

**Statement:**

To ensure line numbers are accurate in the formatted document:

1. Create a dummy index with lines: [0, 0] for all sections
2. Write document with dummy index to disk
3. Run Prettier to format the document
4. Read the formatted document from disk
5. Scan formatted content for heading lines, determine accurate [start_line, end_line] (1-based)
6. Rebuild index with real line numbers
7. Write final document to disk with real index
8. Run Prettier again to ensure final formatting is consistent

**Rationale:**

Prettier reformats YAML frontmatter and markdown content, shifting line numbers. The two-pass
approach ensures line numbers match the final formatted output. This is necessary because heading
positions change after formatting.

**Measurable Fit Criteria:**

- [ ] Line numbers are [1-based] after formatting
- [ ] Dummy index is created initially
- [ ] Prettier is run before extracting real line numbers
- [ ] Final document is re-formatted after real line numbers are embedded
- [ ] Line numbers are accurate (verified manually on formatted content)

**Verification Method:**

- Automated test: unformatted document → generate index with dummy → format → extract real lines →
  verify accuracy
- Manual test: generate index, inspect frontmatter, count lines in editor, verify match
- Manual test: modify document content, regenerate index, verify line numbers update

---

## REQ-007: Format Document with Prettier

Summary: Format documents with Prettier after embedding dummy index and before extracting real line
numbers.

**Statement:**

The script MUST:

1. After embedding dummy index, run Prettier on the document file: `npx prettier --write <file>`
2. Before extracting real line numbers, format again (this ensures final output matches real line
   numbers)
3. If Prettier fails or reports an error, suppress the error silently (document may not have
   formatting issues, or may already be well-formatted)

**Rationale:**

Prettier ensures consistent formatting across all documents. Two formatting passes (dummy → real,
then again after real) guarantee final output is properly formatted. Silent error suppression
prevents Prettier issues from blocking documentation generation.

**Measurable Fit Criteria:**

- [ ] Prettier is invoked via npx prettier --write
- [ ] Document is formatted after dummy index
- [ ] Document is formatted after real index
- [ ] Formatting errors are suppressed (stderr/stdout hidden)

**Verification Method:**

- Automated test: unformatted document → generate index → verify Prettier runs and formats
- Manual test: generate index on document with manual formatting → check file is consistently
  formatted

---

## Design Decisions

| Field                  | Decision 001: Two-Pass Approach                 | Decision 002: Token Threshold                 | Decision 003: Token Estimation Strategy       |
| ---------------------- | ----------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| **Title**              | Dummy then real line numbers                    | Subsection inclusion threshold                | Word count × multiplier vs. NLP-based         |
| **Options Considered** | A) Two-pass (chosen) B) Single-pass heuristics  | A) 300 (chosen) B) 500 C) 200 D) Configurable | A) Simple multiplier (chosen) B) Full NLP     |
| **Chosen**             | Option A: Two-pass                              | Option A: 300 tokens                          | Option A: word_count × 1.3                    |
| **Rationale**          | Accurate line numbers in final formatted output | Balances granularity with clutter; ~250 words | Fast, deterministic, no model dependencies    |
| **Tradeoffs**          | Slower (two formatting passes)                  | May include/exclude some subsections at edge  | Less precise than NLP; assumes standard ratio |
| **Blocked**            | None                                            | None                                          | None                                          |
| **Expires**            | If Prettier performance becomes problematic     | If feedback suggests threshold too high/low   | If token counting becomes a bottleneck        |
| **Decision Date**      | 2026-01-21                                      | 2026-01-21                                    | 2026-01-21                                    |

---

## Blockers

Summary: No active blockers; script runs independently and modifies documents in-place.

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | -      | -             | -      |

---

## Assumptions & Unknowns

| Assumption                                    | Validation Method                           | Confidence | Impact if Wrong                                               |
| --------------------------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------- |
| Prettier is installed and available via npx   | Run `npx prettier --version`                | High       | Document formatting will fail; line numbers may be inaccurate |
| Documents follow H2/H3 heading structure      | Review sample documents in docs/engineering | High       | Index may miss sections or include unwanted levels            |
| "Summary: ..." lines exist after all headings | Review sample documents, check coverage     | Medium     | Some sections missing summaries; may trigger errors           |
| Markdown content is valid UTF-8               | Standard for markdown files                 | High       | Parsing edge cases; potential corruption                      |

| Unknown                                                  | Impact                                             | Resolution Criteria                           | Owner              | ETA     |
| -------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------ | ------- |
| Should H4+ headings be included if explicitly requested? | Extend granularity; may clutter indices            | Feature request + stakeholder review          | Documentation team | 2026-Q2 |
| Are 1.3× multiplier and 300-token threshold optimal?     | Token estimation accuracy and subsection filtering | User feedback on LLM context efficiency       | Documentation team | 2026-Q2 |
| Performance on large documents (10k+ lines)?             | Indexing latency                                   | Benchmark on largest docs; optimize if >5 sec | Documentation team | 2026-Q2 |

---

## Document Metadata

```yaml
id: REQ-generate-doc-indices
type: REQ
status: active
stability: stable
created: 2026-01-21
last_updated: 2026-01-21
area: documentation
feature: section-indexing
driven_by: [docs/engineering/meta/META-documentation-system.md]
implemented_by: [script/generate-indices.mjs]
blocks: []
related: [REQ-validate-docs.md]
keywords: [indexing, sections, summaries, tokens, hierarchy, frontmatter]
```
