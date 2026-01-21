---
type: META
status: active
stability: stable
created: 2026-01-21
last_updated: 2026-01-21T12:55:31.051Z
area: documentation
feature: system
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Complete specification of the 5-type documentation system: IDEATION, REQ, SPEC, IMPL-PLAN, META'
summary_long:
  'Defines all document types, required frontmatter fields, mandatory sections (Relationships, TLDR,
  Scope, etc.), naming conventions, linking rules, and automation system. Includes examples for each
  doc type, design decision rationale, and instructions for humans and LLMs.'
index:
  sections:
    - id: critical_keeping_indices_in_sync
      title: 'Critical: Keeping Indices in Sync'
      lines: [223, 249]
      token_est: 198
    - id: overview
      title: 'Overview'
      lines: [250, 272]
      token_est: 192
    - id: document_format_yaml_frontmatter_structured_sections
      title: 'Document Format: YAML Frontmatter + Structured Sections'
      lines: [273, 316]
      token_est: 254
    - id: document_relationships
      title: 'Document Relationships'
      lines: [317, 341]
      token_est: 65
    - id: tldr
      title: 'TLDR'
      lines: [342, 366]
      token_est: 110
    - id: scope
      title: 'Scope'
      lines: [367, 398]
      token_est: 123
    - id: design_decisions
      title: 'Design Decisions'
      lines: [399, 418]
      token_est: 175
    - id: document_metadata
      title: 'Document Metadata'
      lines: [419, 431]
      token_est: 30
    - id: when_to_write_each
      title: 'When to Write Each'
      lines: [432, 493]
      token_est: 227
    - id: manytomany_relationships
      title: 'Many-to-Many Relationships'
      lines: [494, 502]
      token_est: 34
    - id: folder_structure
      title: 'Folder Structure'
      lines: [503, 539]
      token_est: 58
    - id: file_naming
      title: 'File Naming'
      lines: [540, 575]
      token_est: 42
    - id: crosslinking_rules
      title: 'Cross-Linking Rules'
      lines: [576, 594]
      token_est: 112
    - id: key_principles
      title: 'Key Principles'
      lines: [595, 621]
      token_est: 160
    - id: getting_started
      title: 'Getting Started'
      lines: [622, 644]
      token_est: 181
    - id: for_llms_and_agents
      title: 'For LLMs and Agents'
      lines: [645, 670]
      token_est: 112
    - id: section_indexing_structure_for_llm_parsing
      title: 'Section Indexing: Structure for LLM Parsing'
      lines: [671, 687]
      token_est: 114
    - id: scope
      title: 'Scope'
      lines: [688, 758]
      summary: 'API covers offset/limit pagination; excludes cursor-based and export pagination.'
      token_est: 297
    - id: automation_keeping_indices_in_sync
      title: 'Automation: Keeping Indices in Sync'
      lines: [759, 818]
      token_est: 289
---

# System Documentation Guide

A simple documentation system for moving from idea to implementation in as few steps as possible,
optimized for both human and LLM readers.

---

## Critical: Keeping Indices in Sync

This system relies on indices (folder READMEs and DOCUMENT-REGISTRY) staying current. **Without
this, the system falls apart.**

**How indices work:**

- Folder READMEs (e.g., `/02-specifications/README.md`) list all documents in that folder with
  status
- Global `DOCUMENT-REGISTRY.md` (in `/docs/engineering`) lists all documents with queryable metadata
- **When you create a new document, you MUST update:**
  - The relevant folder README (add to the list)
  - The global DOCUMENT-REGISTRY.md (add entry)

**Who is responsible:** The person creating the document is responsible for updating indices
immediately (as part of the same commit/PR).

**When to update:**

- Creating a new doc → update folder README + DOCUMENT-REGISTRY.md
- Archiving a doc → move it from "Active" to "Archived" in README + update registry status
- Deprecating a doc → mark as deprecated in status field + update registry

This is not optional. Make it part of your PR checklist.

---

## Overview

This guide defines **four document types** that cover the full lifecycle: discovery through
execution.

| Document Type           | Required    | Purpose                                                     | Lifecycle                               |
| ----------------------- | ----------- | ----------------------------------------------------------- | --------------------------------------- |
| **Ideation**            | No          | Capture brainstorms, problems, personas, journeys, unknowns | Disposable; converges into Requirements |
| **Requirements**        | Recommended | Define what MUST be true                                    | Durable; testable obligations           |
| **Specification**       | Yes         | Define the build/test contract                              | Durable; evolves via git                |
| **Implementation Plan** | Yes         | Define execution roadmap                                    | Operational; evolves via git            |

**Canonical sequence:** Ideation → Requirements → Specification → Implementation Plan

**Important:** The system is many-to-many, not one-to-one:

- One Requirement can drive multiple Specifications
- One Specification can implement multiple Requirements
- One Implementation Plan can coordinate multiple Specs and Requirements
- See the "[Many-to-Many Relationships](#many-to-many-relationships)" section for examples

---

## Document Format: YAML Frontmatter + Structured Sections

Every document uses a standardized format optimized for LLM parsing while remaining human-readable.

### YAML Frontmatter (Required)

Every document MUST begin with YAML metadata:

```yaml
---
type: SPEC # or REQ, IMPL-PLAN, IDEATION-problems, IDEATION-experience, IDEATION-unknowns, META
status: active # draft, active, approved, deprecated, archived, on-hold, completed
stability: stable # experimental, beta, stable
created: 2025-01-21
last_updated: 2025-01-21
area: pagination
feature: search-results
---
```

**Fields:**

- `type`: Document type (required for querying)
- `status`: Workflow status (required)
- `stability`: How likely to change (helps LLMs understand confidence)
- `created`, `last_updated`: Dates for tracking document lifecycle
- `area`, `feature`: Tags for querying/grouping (optional but recommended)

### Mandatory Sections

Every document has these sections in order:

1. **Document Relationships** – Where this doc fits in the system
2. **TLDR** – Executive summary for fast parsing
3. **Scope** – What's included/excluded
4. **Main Content** – The meat of the document
5. **Design Decisions** – Alternatives considered (structured format)
6. **Blockers** – What's blocking this, what it blocks, unblocking criteria
7. **Assumptions & Unknowns** – Explicit lists with closure criteria
8. **Document Metadata** – Auto-generated section for querying

### 1. Document Relationships

```markdown
## Document Relationships

**Upstream (this doc depends on):**

- REQ-pagination-system.md

**Downstream (documents that depend on this):**

- IMPL-PLAN-pagination-system.md

**Siblings (related docs at same level):**

- SPEC-user-list-pagination.md
- SPEC-timeline-pagination.md

**Related (cross-cutting links):**

- DOCUMENT-REGISTRY.md (where this doc is indexed)
```

LLMs use this to traverse the graph.

### 2. TLDR

```markdown
## TLDR

**What:** Pagination API for search results via offset/limit

**Why:** Users need to browse large result sets efficiently without timeouts

**How:**

- Shared pagination library (used by 3 Specs)
- Search endpoint integration (this Spec)
- Response includes metadata (total, offset, limit)

**Status:** Active (Milestone 2 in progress)

**Critical path:** Database indexing (done) → Shared lib (in progress) → Search integration (this
month)

**Risk:** Performance doesn't meet <100ms target
```

Lets LLMs summarize and understand intent at a glance.

### 3. Scope

```markdown
## Scope

**Includes:**

- API endpoint contract (GET /search?offset=0&limit=20)
- Response schema with pagination metadata
- Error codes for invalid parameters
- Performance constraints (<100ms response time)

**Excludes:**

- Frontend UI/UX for pagination controls (see SPEC-search-results-ui.md)
- Cursor-based pagination (see REQ-pagination-system.md for rationale)
- Export pagination (separate feature)

**In separate docs:**

- User-facing experience: IDEATION-pagination-experience.md
- Business requirements: REQ-pagination-system.md
```

Makes scope crystal clear for agents.

### 4. Main Content

Standard sections for each doc type (Interfaces, Data Models, Error Semantics, etc.).

### 5. Design Decisions

Structured decision records instead of prose Q&A:

```markdown
## Design Decisions

| Field         | Decision 001                                     | Decision 002                           |
| ------------- | ------------------------------------------------ | -------------------------------------- |
| **Title**     | Pagination Approach                              | Maximum Page Size                      |
| **Options**   | A) Offset/limit (chosen) B) Cursor-based C) Both | A) No limit B) Hard limit 100 (chosen) |
| **Chosen**    | Option A: Offset/limit                           | Option B: Hard limit 100               |
| **Rationale** | Familiar, 95% of use cases, fastest              | Protects server memory                 |
| **Tradeoffs** | Simpler but doesn't work real-time               | Less flexible but simpler              |
| **Blocked**   | None                                             | None                                   |
| **Expires**   | When result sets >10M OR demand                  | If >5% requests hit limit              |
```

### 6. Blockers & 7. Assumptions & Unknowns

Use structured tables (see templates for examples).

### 8. Document Metadata

```yaml
## Document Metadata

id: SPEC-search-results-pagination
type: SPEC
implements: [REQ-pagination-system#REQ-001, REQ-pagination-system#REQ-002]
implemented_by: [IMPL-PLAN-pagination-system]
depends_on: [SPEC-shared-pagination-lib]
blocks: [IMPL-PLAN-pagination-system]
keywords: [pagination, search, api, performance]
```

---

## When to Write Each

### Ideation

**Use when:**

- Still discovering what you need
- Brainstorming options, unknowns, tradeoffs
- Understanding is shifting day-to-day

**Ideation consists of three document types:**

1. IDEATION-<feature>-problems.md
2. IDEATION-<feature>-experience.md
3. IDEATION-<feature>-unknowns.md

See templates for details.

### Requirements

**Use when:**

- Ready to define testable obligations
- Multiple implementations must align
- Want clear traceability from discovery to implementation

**Structure:** One REQ-<feature>.md per feature with numbered requirements (REQ-001, REQ-002, etc.)

### Specification

**Use when:**

- Something needs to be built
- Interfaces, behavior, invariants must be precise
- Want a testable contract

**Important:** One Spec can implement multiple Requirements. One Requirement can be implemented by
multiple Specs.

### Implementation Plan

**Use when:**

- Specifications are ready to implement
- Work spans multiple milestones
- Want clear execution roadmap

**Important:** One IMPL-PLAN can coordinate multiple Specs and Requirements.

### Meta

**Use when:**

- Documenting system-level concerns (how documentation works, build system, architecture,
  conventions)
- Creating reference material for developers/LLMs
- Establishing project-wide standards

**Structure:** One META-<topic>.md per system concern

---

## Many-to-Many Relationships

One Requirement (REQ-pagination-system) implemented by three Specs (search, users, timeline),
coordinated by one Plan (IMPL-PLAN-pagination-system).

See pagination example in templates for details.

---

## Folder Structure

```
/docs
  /engineering
    README.md                                    # entrypoint
    DOCUMENT-REGISTRY.md                         # queryable index of all docs
    /_templates
      IDEATION-template-problems.md
      IDEATION-template-experience.md
      IDEATION-template-unknowns.md
      REQ-template.md
      SPEC-template.md
      IMPL-PLAN-template.md
      META-template.md
      README.md
    /00-ideation
      README.md
      IDEATION-<feature>-problems.md
      IDEATION-<feature>-experience.md
      IDEATION-<feature>-unknowns.md
    /01-requirements
      README.md
      REQ-<feature>.md
    /02-specifications
      README.md
      SPEC-<area>-<topic>.md
    /03-implementation-plans
      README.md
      IMPL-PLAN-<area>-<topic>.md
    /meta
      README.md
      META-<topic>.md
```

---

## File Naming

### Ideation

```
IDEATION-<feature>-problems.md
IDEATION-<feature>-experience.md
IDEATION-<feature>-unknowns.md
```

### Requirements

```
REQ-<feature>.md
```

### Specification

```
SPEC-<area>-<topic>.md
```

### Implementation Plan

```
IMPL-PLAN-<area>-<topic>.md
```

### Meta

```
META-<topic>.md
```

---

## Cross-Linking Rules

**Hard rules:**

- Link explicitly using relative paths
- Do not duplicate truth across document types
- Each key fact has exactly one canonical home
- Use YAML frontmatter metadata for machine-readable relationships

**Link directions (upward only):**

- **Ideation** → links to nothing; captures raw thinking
- **Requirements** → link up to Ideation
- **Specification** → link up to Requirements and optionally Ideation
- **Implementation Plan** → link up to Specifications and Requirements only
- **Meta** → links to system/project level concerns

---

## Key Principles

1. **Ideation is disposable.** Archive when Requirements are finalized.

2. **Requirements are the contract.** Define obligations independent of implementation. Reuse across
   multiple Specs when appropriate.

3. **Specifications implement Requirements.** Show exactly what gets built and tested.

4. **Implementation Plan coordinates delivery.** Span multiple Specs and Requirements. Order work
   and verify completion.

5. **Meta documents are reference material.** Guide developers and LLMs in understanding system
   conventions and constraints.

6. **Design Decisions are structured, not prose.** Use decision tables so LLMs parse alternatives
   reliably.

7. **Every document is LLM-parseable.** YAML frontmatter, structured sections, metadata tables.

8. **Documents evolve via git.** No `-v1`, `-v2` suffixes in filenames.

9. **Indices must stay in sync.** Automation regenerates folder READMEs and DOCUMENT-REGISTRY.md on
   every commit.

---

## Getting Started

1. Start with Ideation (Problems, Experience, Unknowns) or skip straight to Requirements if clear.
2. Write a Requirements doc once discovery is stable.
3. Write Specifications for each piece that needs to be built.
4. Write an Implementation Plan to coordinate delivery.
5. Write Meta docs for system-level concerns that affect multiple other docs.
6. **Commit.** Automation updates indices immediately.

**Checklist for new documents:**

- [ ] YAML frontmatter present (type, status, stability, dates, area, feature)
- [ ] Document Relationships section
- [ ] TLDR section
- [ ] Scope section
- [ ] Main content written
- [ ] Design Decisions in structured table format (or N/A)
- [ ] Blockers section (or "None")
- [ ] Assumptions & Unknowns in table format (or N/A)
- [ ] Document Metadata section with YAML

---

## For LLMs and Agents

This system is designed to be machine-readable first, human-readable second.

**Query by metadata:** "Show me all active Specs in area:pagination"

- Parse DOCUMENT-REGISTRY.md
- Filter by type, status, area

**Traverse relationships:** "What implements this Requirement?"

- Use YAML `implements` field in Spec
- Use Document Relationships section

**Understand blockers:** "What's blocking this?"

- Read Blockers section with structured table
- Check status and ETA

**Extract decisions:** "What were the alternatives?"

- Read Design Decisions section (structured tables)
- Extract Options/Chosen/Rationale

---

## Section Indexing: Structure for LLM Parsing

Every document is automatically indexed by section to allow LLMs to read only relevant parts without
parsing the whole document.

### How Section Indexing Works

Sections are defined by **Markdown heading hierarchy**:

- **H2 headings** (`## Title`) = top-level sections
- **H3 headings** (`### Title`) = subsections of the parent H2
- **H4 and deeper** = content within sections (not indexed)

Each section that is indexed **must have a summary** on the very first non-empty line after the
heading:

```markdown
## Scope

Summary: API covers offset/limit pagination; excludes cursor-based and export pagination.

**Includes:**

- GET /search parameters
- Response metadata
- Error handling
```

### Summary Format

Summaries are **content nuggets**, not descriptors:

- ✅ GOOD: "API covers offset/limit pagination; excludes cursor-based and export"
- ❌ BAD: "This section describes what the Spec includes and excludes"

Summaries answer: **What are the key facts in this section that an LLM should know?**

### Generated Index Files

When you commit a document, the indexer automatically generates a sidecar file:

```
docs/engineering/02-specifications/SPEC-search-results-pagination.md
docs/engineering/02-specifications/SPEC-search-results-pagination.llm-index.yaml
```

The index contains:

```yaml
index:
  generated_at: 2026-01-21T12:42:11Z
  generator: script/validate-docs.mjs
  sections:
    - id: scope
      title: Scope
      level: 2
      start_line: 45
      end_line: 78
      summary: API covers offset/limit pagination; excludes cursor-based and export pagination.
      token_est: 420
      subsections:
        - id: includes
          title: Includes
          level: 3
          start_line: 47
          end_line: 56
          summary: null
          token_est: 180
```

### What LLMs Do With This Index

An LLM can:

1. **Read the index** to understand document structure at a glance
2. **Select relevant sections** based on task (e.g., "show me the Scope section")
3. **Read only those line ranges** from the document (lines 45-78)
4. **Skip unrelated sections** entirely (saves tokens)

Example: An LLM needs to know what this Spec covers:

- Reads index
- Finds section `scope` with summary
- Reads only lines 45-78
- Gets the answer without reading the full 500-line document

---

## Automation: Keeping Indices in Sync

To eliminate manual bookkeeping and ensure indices never drift, this system includes **automated
validation and index updating.**

### What Gets Automated

When you commit documentation changes:

1. ✅ **DOCUMENT-REGISTRY.md is regenerated** from document YAML frontmatter
2. ✅ **Folder README lists are updated** (Active/Archived sections)
3. ✅ **YAML frontmatter is validated** (all required fields present)
4. ✅ **Naming conventions are verified** (SPEC-, REQ-, META-, etc.)
5. ✅ **Cross-references are checked** (links point to real documents)

If validation fails, the commit is blocked with clear error messages.

### How to Use

**Automatic (on every commit):**

Simply commit your documentation changes normally. The pre-commit hook runs automatically:

```bash
git add docs/engineering/meta/META-my-system.md
git commit -m "Add meta doc for my system"

# Output:
# ✨ AUTO-FIXES APPLIED:
#   ✅ Updated DOCUMENT-REGISTRY.md
#   ✅ Updated all folder READMEs
# ✅ Documentation validation passed!
```

**Manual check (anytime):**

```bash
pnpm check:docs
```

### Setup

The automation uses **lint-staged** + **husky** pre-commit hooks. If not already set up:

```bash
# Install husky
pnpm install husky --save-dev
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "pnpm lint-staged"
```

For complete setup instructions, see the comments in `script/validate-docs.mjs`.

### Result

**You never manually update DOCUMENT-REGISTRY.md or index README sections again.** The system
handles it automatically. Focus on content; the automation handles bookkeeping.
