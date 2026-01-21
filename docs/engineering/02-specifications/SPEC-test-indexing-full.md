---
type: SPEC
status: draft
stability: experimental
created: 2026-01-21
last_updated: 2026-01-21
area: testing
feature: indexing
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: Test specification for LLM-first section indexing
summary_long:
  Demonstrates header-based section indexing with summaries. Includes document relationships, scope,
  interfaces, and design decisions. Used to validate the indexer generates correct .llm-index.yaml
  files.
index:
  generated_at: '2026-01-21T12:24:01.674Z'
  generator: script/validate-docs.mjs
  sections:
    - id: document_relationships
      title: 'Document Relationships'
      level: 2
      start_line: 15
      end_line: 28
      summary:
        'Test doc for indexing; depends on llm_first_static_markdown_indexing_spec; no downstream.'
      token_est: 38
      subsections: []
    - id: tldr
      title: 'TLDR'
      level: 2
      start_line: 29
      end_line: 42
      summary:
        'Validate that headers, summaries, and token estimation work correctly in generated index.'
      token_est: 67
      subsections: []
    - id: scope
      title: 'Scope'
      level: 2
      start_line: 43
      end_line: 61
      summary: 'Tests H2 and H3 extraction, summary parsing, token estimation, and YAML generation.'
      token_est: 78
      subsections: []
    - id: interfaces
      title: 'Interfaces'
      level: 2
      start_line: 62
      end_line: 97
      summary: 'Simple JSON API returning paginated results with metadata.'
      token_est: 82
      subsections:
        - id: get_testitems
          title: 'GET /test/items'
          level: 3
          start_line: 66
          end_line: 97
          summary: null
          token_est: 68
    - id: design_decisions
      title: 'Design Decisions'
      level: 2
      start_line: 98
      end_line: 108
      summary: 'Chose offset/limit over cursor pagination for simplicity; hard 100-item limit.'
      token_est: 47
      subsections: []
    - id: assumptions
      title: 'Assumptions'
      level: 2
      start_line: 109
      end_line: 118
      summary: 'Assumes typical result sets <10k items; offset pagination sufficient.'
      token_est: 45
      subsections: []
    - id: document_metadata
      title: 'Document Metadata'
      level: 2
      start_line: 119
      end_line: 129
      summary: null
      token_est: 23
      subsections: []
index:
  generated_at: "2026-01-21T12:36:53.612Z"
  generator: script/validate-docs.mjs
  sections:
    - id: document_relationships
      title: "Document Relationships"
      level: 2
      start_line: 87
      end_line: 100
      summary: "Test doc for indexing; depends on llm_first_static_markdown_indexing_spec; no downstream."
      token_est: 38
      subsections: []
    - id: tldr
      title: "TLDR"
      level: 2
      start_line: 101
      end_line: 114
      summary: "Validate that headers, summaries, and token estimation work correctly in generated index."
      token_est: 67
      subsections: []
    - id: scope
      title: "Scope"
      level: 2
      start_line: 115
      end_line: 133
      summary: "Tests H2 and H3 extraction, summary parsing, token estimation, and YAML generation."
      token_est: 78
      subsections: []
    - id: interfaces
      title: "Interfaces"
      level: 2
      start_line: 134
      end_line: 169
      summary: "Simple JSON API returning paginated results with metadata."
      token_est: 82
      subsections:
        - id: get_testitems
          title: "GET /test/items"
          level: 3
          start_line: 138
          end_line: 169
          summary: null
          token_est: 68
    - id: design_decisions
      title: "Design Decisions"
      level: 2
      start_line: 170
      end_line: 180
      summary: "Chose offset/limit over cursor pagination for simplicity; hard 100-item limit."
      token_est: 47
      subsections: []
    - id: assumptions
      title: "Assumptions"
      level: 2
      start_line: 181
      end_line: 190
      summary: "Assumes typical result sets <10k items; offset pagination sufficient."
      token_est: 45
      subsections: []
    - id: document_metadata
      title: "Document Metadata"
      level: 2
      start_line: 191
      end_line: 201
      summary: null
      token_est: 23
      subsections: []
index:
  generated_at: "2026-01-21T12:37:07.692Z"
  generator: script/validate-docs.mjs
  sections:
    - id: document_relationships
      title: "Document Relationships"
      level: 2
      start_line: 154
      end_line: 167
      summary: "Test doc for indexing; depends on llm_first_static_markdown_indexing_spec; no downstream."
      token_est: 38
      subsections: []
    - id: tldr
      title: "TLDR"
      level: 2
      start_line: 168
      end_line: 181
      summary: "Validate that headers, summaries, and token estimation work correctly in generated index."
      token_est: 67
      subsections: []
    - id: scope
      title: "Scope"
      level: 2
      start_line: 182
      end_line: 200
      summary: "Tests H2 and H3 extraction, summary parsing, token estimation, and YAML generation."
      token_est: 78
      subsections: []
    - id: interfaces
      title: "Interfaces"
      level: 2
      start_line: 201
      end_line: 236
      summary: "Simple JSON API returning paginated results with metadata."
      token_est: 82
      subsections:
        - id: get_testitems
          title: "GET /test/items"
          level: 3
          start_line: 205
          end_line: 236
          summary: null
          token_est: 68
    - id: design_decisions
      title: "Design Decisions"
      level: 2
      start_line: 237
      end_line: 247
      summary: "Chose offset/limit over cursor pagination for simplicity; hard 100-item limit."
      token_est: 47
      subsections: []
    - id: assumptions
      title: "Assumptions"
      level: 2
      start_line: 248
      end_line: 257
      summary: "Assumes typical result sets <10k items; offset pagination sufficient."
      token_est: 45
      subsections: []
    - id: document_metadata
      title: "Document Metadata"
      level: 2
      start_line: 258
      end_line: 268
      summary: null
      token_est: 23
      subsections: []
index:
  generated_at: "2026-01-21T12:37:34.666Z"
  generator: script/validate-docs.mjs
  sections:
    - id: document_relationships
      title: "Document Relationships"
      level: 2
      start_line: 223
      end_line: 236
      summary: "Test doc for indexing; depends on llm_first_static_markdown_indexing_spec; no downstream."
      token_est: 38
      subsections: []
    - id: tldr
      title: "TLDR"
      level: 2
      start_line: 237
      end_line: 250
      summary: "Validate that headers, summaries, and token estimation work correctly in generated index."
      token_est: 67
      subsections: []
    - id: scope
      title: "Scope"
      level: 2
      start_line: 251
      end_line: 269
      summary: "Tests H2 and H3 extraction, summary parsing, token estimation, and YAML generation."
      token_est: 78
      subsections: []
    - id: interfaces
      title: "Interfaces"
      level: 2
      start_line: 270
      end_line: 305
      summary: "Simple JSON API returning paginated results with metadata."
      token_est: 82
      subsections:
        - id: get_testitems
          title: "GET /test/items"
          level: 3
          start_line: 274
          end_line: 305
          summary: null
          token_est: 68
    - id: design_decisions
      title: "Design Decisions"
      level: 2
      start_line: 306
      end_line: 316
      summary: "Chose offset/limit over cursor pagination for simplicity; hard 100-item limit."
      token_est: 47
      subsections: []
    - id: assumptions
      title: "Assumptions"
      level: 2
      start_line: 317
      end_line: 326
      summary: "Assumes typical result sets <10k items; offset pagination sufficient."
      token_est: 45
      subsections: []
    - id: document_metadata
      title: "Document Metadata"
      level: 2
      start_line: 327
      end_line: 337
      summary: null
      token_est: 23
      subsections: []
---

# SPEC-test-indexing-full

## Document Relationships

Summary: Test doc for indexing; depends on llm_first_static_markdown_indexing_spec; no downstream.

**Upstream (depends on):**

- llm_first_static_markdown_indexing_spec.md (the spec we're testing)

**Downstream (depends on this):**

- None

---

## TLDR

Summary: Validate that headers, summaries, and token estimation work correctly in generated index.

**What:** Test specification to validate LLM-first section indexing

**Why:** Verify the indexer correctly extracts sections and generates .llm-index.yaml

**How:** Create document with H2 and H3 sections, each with summaries; run indexer; inspect output

**Status:** Testing

---

## Scope

Summary: Tests H2 and H3 extraction, summary parsing, token estimation, and YAML generation.

**Includes:**

- H2 section (Document Relationships)
- H2 section (TLDR)
- H2 section (Scope) with H3 subsections
- H2 section (Interfaces)
- Proper summary on each heading

**Excludes:**

- H4 and deeper headings (should not be indexed)
- Sections without summaries (testing skip mode)

---

## Interfaces

Summary: Simple JSON API returning paginated results with metadata.

### GET /test/items

**Request:**

```json
{
  "offset": 0,
  "limit": 20
}
```

**Response:**

```json
{
  "items": [...],
  "offset": 0,
  "limit": 20,
  "total": 100
}
```

#### Response Metadata

This subsection is H4 and should NOT appear in the index.

- `offset`: current position
- `limit`: page size
- `total`: total items

---

## Design Decisions

Summary: Chose offset/limit over cursor pagination for simplicity; hard 100-item limit.

| Field      | Decision            |
| ---------- | ------------------- |
| **Title**  | Pagination Approach |
| **Chosen** | Offset/limit        |

---

## Assumptions

Summary: Assumes typical result sets <10k items; offset pagination sufficient.

- Most queries return <10k items
- Clients handle pagination metadata in response
- API can recompute total on each request

---

## Document Metadata

```yaml
id: SPEC-test-indexing-full
type: SPEC
status: draft
stability: experimental
created: 2026-01-21
last_updated: 2026-01-21
```
