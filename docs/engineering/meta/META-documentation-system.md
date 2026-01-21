---
type: META
status: active
stability: stable
created: 2026-01-21
last_updated: 2026-01-21T14:21:27.433Z
area: documentation
feature: system
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Complete specification of the 5-type documentation system: IDEATION, REQ, SPEC, IMPL-PLAN, META'
summary_long: |
  Defines all document types, required frontmatter fields, mandatory sections (Relationships, TLDR,
  Scope, etc.), naming conventions, linking rules, and automation system. Includes examples for each
  doc type, design decision rationale, and instructions for humans and LLMs.
index:
  sections:
    - title: 'Document Relationships'
      lines: [119, 142]
      summary:
        'Places this meta doc within the documentation indices and template references that other
        docs rely on.'
      token_est: 120
    - title: 'TLDR'
      lines: [144, 161]
      summary:
        'Establishes the five-document lifecycle plus the formatting, linking, and automation rules
        that make it predictable and LLM-friendly.'
      token_est: 133
    - title: 'Scope'
      lines: [413, 457]
      summary:
        'Covers the documentation lifecycle conventions, metadata expectations, linking rules, and
        the automation that keeps indices current.'
      token_est: 159
    - title: 'Main Content'
      lines: [190, 412]
      summary:
        'Covers the critical workflows, formatting rules, automation, and agent guidance that make
        this system cohesive.'
      token_est: 1467
      subsections:
        - title: 'Critical: Keeping Indices in Sync'
          lines: [195, 220]
          summary:
            'Every document creation or status change must immediately touch the folder README and
            the document registry, because downstream tooling and LLMs read those indices.'
          token_est: 220
        - title: 'Overview'
          lines: [222, 246]
          summary:
            'Defines the five document types and the many-to-many relationships across the
            lifecycle.'
          token_est: 244
        - title: 'Document Format: YAML Frontmatter + Structured Sections'
          lines: [248, 285]
          summary:
            'Every document is structured for LLM readability via strict frontmatter and section
            expectations.'
          token_est: 246
        - title: 'Lifecycle Roles'
          lines: [287, 305]
          summary:
            'Explains when to write each doc type and how Meta documents tie the system together.'
          token_est: 145
        - title: 'Naming, Linking & Key Principles'
          lines: [307, 373]
          summary:
            'Provides the folder/file naming, cross-linking rules, and core principles that keep
            documents consistent and machine-readable.'
          token_est: 292
        - title: 'Getting Started'
          lines: [375, 398]
          summary: 'Lists the author flow and checklist for creating a compliant document.'
          token_est: 218
        - title: 'Section Indexing: Structure for LLM Parsing'
          lines: [400, 412]
          summary: 'Section-first summaries let LLMs read just what they need.'
          token_est: 81
    - title: 'Scope'
      lines: [413, 457]
      summary:
        'API covers offset/limit pagination; excludes cursor-based and export pagination. ```'
      token_est: 322
      subsections:
        - title: 'For LLMs and Agents'
          lines: [423, 435]
          summary: 'Instructions on how automated agents should interpret the documentation system.'
          token_est: 112
        - title: 'Automation: Keeping Indices in Sync'
          lines: [437, 457]
          summary: 'Automation re-generates indices and validates metadata on every commit.'
          token_est: 159
    - title: 'Blockers'
      lines: [459, 467]
      summary:
        'No active blockers; automation/human workflow currently handles indexing and validation.'
      token_est: 56
    - title: 'Design Decisions'
      lines: [469, 481]
      token_est: 198
    - title: 'Assumptions & Unknowns'
      lines: [483, 492]
      summary: 'Tracks open questions about the documentation system.'
      token_est: 120
    - title: 'Document Metadata'
      lines: [494, 512]
      summary:
        'Mirrors the frontmatter for machine consumption so downstream tools can confirm metadata.'
      token_est: 98
---

# META-documentation-system

This meta document codifies how the documentation lifecycle works, how indices stay accurate, and
how automation keeps everything in sync for both humans and LLM agents.

## Document Relationships

Summary: Places this meta doc within the documentation indices and template references that other
docs rely on.

**Upstream (this doc depends on):**

- docs/engineering/meta/README.md (central index for meta documentation topics)

**Downstream (documents that depend on this):**

- docs/engineering/DOCUMENT-REGISTRY.md (indexes this document and enforces metadata consistency)
- docs/engineering/\_templates/META-template.md (template that mirrors this system definition)

**Siblings (related meta docs):**

- None yet—this is the primary META doc beyond the meta README today.

**Related (cross-cutting links):**

- docs/engineering/\_templates/REQ-template.md (for requirements that trigger this system)
- docs/engineering/DOCUMENT-REGISTRY.md (machine-readable index and query surface)

---

## TLDR

Summary: Establishes the five-document lifecycle plus the formatting, linking, and automation rules
that make it predictable and LLM-friendly.

**What:** Defines IDEATION, REQ, SPEC, IMPL-PLAN, and META documents, the required frontmatter, and
the structured sections that every doc must include.

**Why:** Keeps discovery, design, implementation, and system-level references consistent so teams
and LLMs can trust metadata and follow references without chasing conflicting facts.

**How:** Enforce YAML frontmatter with explicit fields, structured sections (Relationships, TLDR,
Scope, and more), automated index updates, and shared conventions for naming and linking.

**Status:** Active (rules enforced via `script/validate-docs.mjs` and pre-commit hooks; see the
automation section).

---

## Scope

Summary: Covers the documentation lifecycle conventions, metadata expectations, linking rules, and
the automation that keeps indices current.

**Includes:**

- Our five document types plus the meta-documents that describe system conventions
- Required frontmatter fields, section structure, and relationship/linking rules
- Indexing requirements (folder READMEs, DOCUMENT-REGISTRY.md) and automation that enforces them
- Guidance for writing, naming, and cross-linking documents, including how LLMs should consume this
  info

**Excludes:**

- Product-specific implementation details that belong in SPEC or IMPL-PLAN docs
- Feature-level decision logs outside the structured Design Decisions tables described below
- Non-documentation projects outside `/docs/engineering`

**In separate docs:**

- docs/engineering/\_templates/META-template.md (template this doc follows)
- docs/engineering/\_templates/REQ-template.md, SPEC-template.md, etc., for each doc type
- docs/engineering/DOCUMENT-REGISTRY.md (machine index rebuilt on every commit)

---

## Main Content

Summary: Covers the critical workflows, formatting rules, automation, and agent guidance that make
this system cohesive.

### Critical: Keeping Indices in Sync

Summary: Every document creation or status change must immediately touch the folder README and the
document registry, because downstream tooling and LLMs read those indices.

This system relies on indices (folder READMEs and DOCUMENT-REGISTRY.md) staying current. Without
this, relationship graphs break and automation reports stale metadata.

**How indices work:**

- Folder READMEs (e.g., `/02-specifications/README.md`) list every document in that folder with
  status
- Global `docs/engineering/DOCUMENT-REGISTRY.md` lists all documents with structured metadata from
  their frontmatter
- When you create or update a document, you **must** update the relevant folder README and the
  document registry as part of the same change

**Responsibility:** Document authors own the index updates at commit time.

**When to update:**

- Creating or approving a doc → add it to the READMEs and registry with the correct status
- Archiving or deprecating a doc → move it to the archive list and change its status/metadata
- Renaming a doc → update references, reads, and registry entries to avoid broken links

---

### Overview

Summary: Defines the five document types and the many-to-many relationships across the lifecycle.

This guide defines the five document types that cover the full lifecycle: discovery through
deployment.

| Document Type           | Required    | Purpose                                                     | Lifecycle                               |
| ----------------------- | ----------- | ----------------------------------------------------------- | --------------------------------------- |
| **Ideation**            | No          | Capture brainstorms, problems, personas, journeys, unknowns | Disposable; converges into Requirements |
| **Requirements**        | Recommended | Define what MUST be true and measurable                     | Durable; testable obligations           |
| **Specification**       | Yes         | Define the build/test contract                              | Durable; evolves via git                |
| **Implementation Plan** | Yes         | Define execution roadmap                                    | Operational; evolves via git            |
| **Meta**                | Yes         | Document system-level conventions, tooling, and decisions   | Reference material for the org          |

**Canonical sequence:** Ideation → Requirements → Specification → Implementation Plan → Meta

**Important:** The system is many-to-many, not one-to-one:

- One Requirement can drive multiple Specifications
- One Specification can implement multiple Requirements
- One Implementation Plan can coordinate multiple Specs and Requirements
- Meta docs (like this one) can inform every other doc type

---

### Document Format: YAML Frontmatter + Structured Sections

Summary: Every document is structured for LLM readability via strict frontmatter and section
expectations.

Every document must begin with YAML metadata followed by structured sections such as Document
Relationships, TLDR, Scope, Main Content, Design Decisions, etc.

```yaml
---
type: SPEC # or REQ, IMPL-PLAN, IDEATION-problems, IDEATION-experience, IDEATION-unknowns, META
status: active # draft, active, approved, deprecated, archived, on-hold, completed
stability: stable # experimental, beta, stable
created: 2025-01-21
last_updated: 2025-01-21
area: pagination
feature: search-results
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: '(Brief 1-2 sentence summary)'
summary_long: '(Longer 3-5 sentence summary)'
---
```

**Fields explained:**

- `type`: The document family (IDEATION, REQ, SPEC, IMPL-PLAN, META)
- `status`: Workflow status captured in the registry
- `stability`: How likely the content is to change
- `created` / `last_updated`: ISO dates (the automation updates `last_updated` on commit)
- `area` / `feature`: For filtering and grouping in DOCUMENT-REGISTRY.md
- `summary_*`: Short and long descriptions for LLM ranking
- Automation fields: `frontmatter_auto_updated_by` records the validation script that touches the
  file

Every document should follow sections similar to this meta template so LLMs know how to parse them.

---

### Lifecycle Roles

Summary: Explains when to write each doc type and how Meta documents tie the system together.

**When to write each:**

- **Ideation:** Use when still discovering unknowns, personas, journeys, and tradeoffs.
- **Requirements:** Write once discovery is stable and obligations must be testable.
- **Specification:** Create when interfaces, data, and behavior must be precise enough for
  implementation.
- **Implementation Plan:** Build when execution needs coordination across specs, teams, or
  milestones.
- **Meta:** Document system-level concerns (conventions, tooling, architecture) that span multiple
  doc types.

Each doc type includes structured sections (Relationships, TLDR, Scope, etc.) so LLMs can traverse
the graph of ideas, requirements, specs, plans, and meta knowledge.

---

### Naming, Linking & Key Principles

Summary: Provides the folder/file naming, cross-linking rules, and core principles that keep
documents consistent and machine-readable.

**Folder structure:**

```
/docs
  /engineering
    README.md
    DOCUMENT-REGISTRY.md
    /_templates
      IDEATION-template-*.md
      REQ-template.md
      SPEC-template.md
      IMPL-PLAN-template.md
      META-template.md
      README.md
    /00-ideation
      README.md
      IDEATION-<feature>-*.md
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

**File naming:**

- Ideation: `IDEATION-<feature>-problems.md`, `-experience.md`, `-unknowns.md`
- Requirements: `REQ-<feature>.md`
- Specifications: `SPEC-<area>-<topic>.md`
- Implementation Plans: `IMPL-PLAN-<area>-<topic>.md`
- Meta: `META-<topic>.md`

**Cross-linking rules:**

- Always link via relative paths, not duplicate content, and rely on frontmatter metadata for
  machine-readable relationships.
- Ideation documents stand alone (no upstream links).
- Requirements link up to Ideation.
- Specifications link up to Requirements (and optionally Ideation).
- Implementation Plans link up to Specifications and Requirements.
- Meta documents describe system-level conventions and link to tooling or index docs.

**Key principles:**

1. Ideation is disposable once Requirements stabilize.
2. Requirements are the contract and must be reuseable across specs.
3. Specifications implement Requirements with precise contracts.
4. Implementation Plans coordinate work across specs, teams, and milestones.
5. Meta documents explain system conventions and tooling.
6. Design Decisions use structured tables so LLMs parse alternatives reliably.
7. All documents must be LLM-parseable via YAML + structured sections.
8. No `-v1`/`-v2` suffixes; rely on git history for evolution.
9. Indices and registry entries must remain synchronized via automation.

---

### Getting Started

Summary: Lists the author flow and checklist for creating a compliant document.

1. Start with Ideation (Problems/Experience/Unknowns) if the problem space is still fuzzy.
2. Lock down Requirements when obligations are well-understood.
3. Write one or more Specifications for concrete interfaces and data models.
4. Draft an Implementation Plan to coordinate delivery and milestones.
5. Create Meta documents when system-level guidance or tooling behavior needs to be shared.
6. Commit; automation updates READMEs and registry entries automatically.

**Checklist for new documents:**

- [ ] YAML frontmatter with type, status, stability, dates, area, and feature
- [ ] Document Relationships section
- [ ] TLDR section
- [ ] Scope section with includes/excludes
- [ ] Main content section describing the meat of the doc
- [ ] Design Decisions table (or clearly note N/A)
- [ ] Blockers section (table or “None” statement)
- [ ] Assumptions & Unknowns table (or “None yet” row)
- [ ] Document Metadata section with YAML summary/keywords

---

### Section Indexing: Structure for LLM Parsing

Summary: Section-first summaries let LLMs read just what they need.

Sections are defined by Markdown heading hierarchy:

- **H2** = top-level sections (Document Relationships, TLDR, Scope, etc.)
- **H3** = subsections (e.g., Includes, Excludes)
- **H4+** = content within sections (not separately indexed)

Each indexed section must start with a summary line, for example:

```
## Scope

Summary: API covers offset/limit pagination; excludes cursor-based and export pagination.
```

The pre-commit automation uses these summaries to build `.llm-index.yaml` sidecars, which store line
ranges and token estimates so LLMs can fetch only the relevant slices.

---

### For LLMs and Agents

Summary: Instructions on how automated agents should interpret the documentation system.

- **Query by metadata:** Filter `DOCUMENT-REGISTRY.md` for type/status/area to find relevant docs.
- **Traverse relationships:** Use the Relationships section plus frontmatter fields (`implements`,
  `depends_on`, etc.) to follow links upstream and downstream.
- **Understand blockers:** Read the Blockers table (or note “None”) and evaluate status/ETA.
- **Extract decisions:** Read the Design Decisions table for Options/Chosen/Rationale columns.
- **Respect indices:** Confirm documentation updates maintain folder README entries and the global
  registry.

---

### Automation: Keeping Indices in Sync

Summary: Automation re-generates indices and validates metadata on every commit.

When you commit documentation changes:

1. ✅ `DOCUMENT-REGISTRY.md` is regenerated from all document frontmatter
2. ✅ Folder README lists are updated (Active/Archived sections)
3. ✅ YAML frontmatter is validated for required fields
4. ✅ Naming conventions are verified (IDEATION-, REQ-, SPEC-, IMPL-PLAN-, META-)
5. ✅ Cross-references are checked for valid targets
6. ✅ The frontmatter index—the LLM-facing query surface built from each document’s metadata—is
   refreshed so agents can filter by type/area/status and the registry automation stays accurate

If validation fails, the commit is blocked with explicit errors from
`script/validate-docs.mjs`/lint-staged.

Use the automation via `pnpm check:docs` or trust the pre-commit hook; setup instructions live in
`script/validate-docs.mjs`.

---

## Blockers

Summary: No active blockers; automation/human workflow currently handles indexing and validation.

| Blocker       | Impact | Owner              | ETA |
| ------------- | ------ | ------------------ | --- |
| None reported | Low    | Documentation team | n/a |

---

## Design Decisions

| Field         | Decision 001: Structured document format                                                     | Decision 002: Automated index sync                                            |
| ------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Title**     | Enforce YAML frontmatter + structured sections                                               | Keep indices in sync via automation                                           |
| **Options**   | A) Freeform Markdown B) YAML + sections (chosen) C) Hybrid                                   | A) Manual updates B) Pre-commit hooks (chosen) C) nightly audit               |
| **Chosen**    | Option B                                                                                     | Option B                                                                      |
| **Rationale** | Structured metadata makes LLM parsing deterministic and avoids multiple conflicting versions | Automation relieves authors of manual bookkeeping while guaranteeing accuracy |
| **Tradeoffs** | Slightly more ceremony for authors who prefer prose                                          | Additional CI latency/tight coupling to lint-staged hooks                     |
| **Blocked**   | None                                                                                         | None                                                                          |
| **Expires**   | When richer tooling exposes a better schema                                                  | If hooks break or must be re-architected for a new workflow                   |

---

## Assumptions & Unknowns

Summary: Tracks open questions about the documentation system.

| Question                                                        | Impact | Resolution Criteria                                              | Owner              | ETA     |
| --------------------------------------------------------------- | ------ | ---------------------------------------------------------------- | ------------------ | ------- |
| Will the automation keep up as new doc types emerge?            | High   | Pre-commit validation passes for new templates and index entries | Documentation team | Q2 2026 |
| Are the naming/linking conventions obvious to new contributors? | Medium | Onboarding materials + README updates mention them               | Docs maintainers   | Q1 2026 |

---

## Document Metadata

Summary: Mirrors the frontmatter for machine consumption so downstream tools can confirm metadata.

```yaml
id: META-documentation-system
type: META
status: active
stability: stable
created: 2026-01-21
last_updated: 2026-01-21T13:03:26.425Z
area: documentation
feature: system
summary_short: 'Complete specification of the 5-type documentation system and automation around it.'
summary_long: >-
  Defines document types, required metadata, naming conventions, linking rules, and the index
  automation so humans and LLMs can navigate the lifecycle.
keywords: [documentation, lifecycle, automation, metadata, meta]
```
