# LLM-First Static Markdown Indexing Specification

## 1. Purpose

This specification defines a **tool-free, LLM-first indexing system for Markdown documents**. The
goal is to allow a large language model (LLM) to deterministically read **only the relevant parts of
a document** without relying on custom parsers, AST tooling, or runtime helpers.

The index is **auto-generated** by a JavaScript script (typically run as a pre-commit hook) and
stored as a sidecar YAML file. The LLM consumes the index as a static symbol table and uses explicit
`start:end` coordinates to bound its reading.

This system deliberately shifts all structural intelligence to the **indexer**, not the LLM.

---

## 2. Core Design Principles

1. **No special LLM tools** are assumed.
2. The LLM must be able to operate using only plain-text reading and numeric boundaries.
3. All `start:end` coordinates are **explicitly encoded** in the index.
4. The index is **machine-generated**, never hand-edited.
5. Section structure is **derived from Markdown headings**, not special markers.

---

## 3. Responsibility Split

| Actor                   | Responsibility                                                |
| ----------------------- | ------------------------------------------------------------- |
| Document Author         | Writes Markdown with clear heading hierarchy (H2, H3, etc.)   |
| JS Indexer (pre-commit) | Extracts sections from headings, computes ranges, emits index |
| LLM                     | Reads index, then reads only the declared ranges              |

The LLM does **not** infer structure.

---

## 4. Authoring Conventions

### 4.1 Section Structure from Headings

Sections are defined by Markdown heading hierarchy. Only **H2 and H3 headings** create index
entries:

- **H2** = top-level section
- **H3** = subsection of parent H2
- **H4+** = content within section (not indexed separately)

#### 4.1.1 Section Boundaries

A section includes:

1. The heading line
2. All content until the next heading of same or higher level
3. All subsections (H3) under this H2

Example:

```markdown
## Scope

Content of Scope section.

### Includes

Content of Includes subsection.

### Excludes

Content of Excludes subsection.

## Main Content

(This starts a new top-level section, ending "Scope" and all its subsections)
```

#### 4.1.2 Optional: Summary Lines

A section **may** include a summary line. If present, it must appear as the first non-empty line
after the heading:

```markdown
## Scope

Summary: Defines what this document covers and what it excludes.

Content of Scope section...
```

Summary behavior is configurable:

- **skip** (default): If summary missing, index has `summary: null`
- **error**: If summary missing, validation fails and requires author to add one

---

## 5. Index Location

Index is stored as a **sidecar file**:

```
docs/engineering/02-specifications/SPEC-my-feature.md
docs/engineering/02-specifications/SPEC-my-feature.llm-index.yaml
```

The index is **never embedded** in the document.

---

## 6. Index Schema (Canonical)

```yaml
llm_index:
  schema: llm-header-index/v1
  generated_at: 2026-01-21T12:42:11Z
  generator: script/validate-docs.mjs@1.0.0
  document_path: docs/engineering/02-specifications/SPEC-my-feature.md

  sections:
    - id: scope
      title: Scope
      level: 2
      start_line: 45
      end_line: 78
      summary: Defines what this document covers and what it excludes.
      token_est: 420
      subsections:
        - id: includes
          title: Includes
          level: 3
          start_line: 47
          end_line: 56
          summary: null
          token_est: 180
        - id: excludes
          title: Excludes
          level: 3
          start_line: 58
          end_line: 78
          summary: null
          token_est: 240

    - id: main_content
      title: Main Content
      level: 2
      start_line: 80
      end_line: 140
      summary: null
      token_est: 1320
      subsections: []
```

### 6.1 Required Fields

Per section:

- `id` – slugified title (e.g., "scope" from "## Scope")
- `title` – copied verbatim from heading
- `level` – heading level (2 or 3)
- `start_line`, `end_line` – inclusive, 1-based
- `summary` – extracted summary line (or null)
- `token_est` – approximate token count in section
- `subsections` – array of H3 subsections (empty if none)

Per index:

- `schema`
- `generated_at`
- `generator`
- `document_path`

---

## 7. Indexer Algorithm (JS, Deterministic)

The indexer must execute:

1. Read file as UTF-8
2. Normalize line endings to `\n`
3. Split into lines (preserve line numbers, 1-based)
4. Scan for Markdown headings (H2 and H3 only)
5. For each H2 heading:
   - Extract title and line number
   - Check next non-empty line for summary (configurable: skip or error)
   - Find end line: next H2 or EOF
   - Collect all H3 subsections
6. For each H3 heading (within H2):
   - Extract title and line number
   - Check next non-empty line for summary
   - Find end line: next H3 or H2
7. Compute token estimates (word count × 1.3)
8. Emit YAML sidecar file
9. Fail if:
   - Heading level is malformed (h2h2h4 pattern, skip h3)
   - Section ID is duplicated
   - Summary extraction fails and `summary_mode: error` is set

---

## 8. ID Generation

Section IDs are **auto-generated from heading titles** using slugification:

- Convert to lowercase
- Replace spaces with underscores
- Remove punctuation and special chars
- Examples:
  - "## Scope" → `scope`
  - "### Edge Cases" → `edge_cases`
  - "## REQ-001: Pagination" → `req_001_pagination`

---

## 9. LLM Consumption Model (Tool-Free)

The LLM follows this deterministic procedure:

1. Read index only (`.llm-index.yaml`)
2. Select sections based on task relevance
3. Read only `start_line → end_line` for selected sections
4. Breadcrumb path available: "Scope/Includes" for nested section

The LLM does not parse Markdown and does not infer structure.

---

## 10. Configuration

Indexer accepts configuration flags:

```yaml
# In validate-docs.mjs config
indexing:
  summary_mode: skip # or 'error'
  min_level: 2 # Only H2+ (always 2 or 3, never goes deeper)
  max_level: 3 # Only up to H3
```

---

## 11. Invariants

- Line numbers are authoritative
- Index is generated, not edited
- Heading hierarchy is the source of truth
- Only H2 and H3 create index entries
- Section IDs are stable and deterministic
- No special markers required in document

This system is intentionally boring. Boring is correct.
