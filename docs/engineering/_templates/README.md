# \_templates

Template files for each document type. Use these as starting points when creating new documents.

## Quick Start

1. **Copy the template** for your document type
2. **Update frontmatter** with required fields (see "Frontmatter Structure" below)
3. **Replace placeholders** (`YYYY-MM-DD`, `feature-name`, `area`) with your actual values
4. **Fill in document sections** using the examples as guides
5. **Delete sections that don't apply** to your specific document
6. **Include Q&A sections** where decisions were made with alternatives

**Important:** Do NOT include a "Document Metadata" section at the bottom. All metadata belongs in
the YAML frontmatter at the top. The script auto-updates `last_updated` on every commit.

## Frontmatter Structure

Every template frontmatter has three sections:

### REQUIRED FIELDS (must always be present)

```yaml
type: # Document type (META, REQ, SPEC, IMPL-PLAN, IDEATION-PROBLEMS/EXPERIENCE/UNKNOWNS)
status: # draft, active, stable, deprecated, completed, on-hold
stability: # experimental, beta, stable
created: # ISO date (YYYY-MM-DD) when document was created
last_updated: # ISO datetime—AUTO-UPDATED by script on commit; don't manually change
area: # System area (e.g., api, database, auth, search, core-api)
feature: # Feature/initiative name (e.g., pagination-system, auth-v2)
summary_short: # 1-2 sentence summary (used in registry tables)
summary_long: # 3-5 sentence summary for LLM relevance filtering
```

### OPTIONAL FIELDS (use as needed)

```yaml
keywords: # Array of search keywords for discoverability
  - keyword1
  - keyword2
```

### DOCUMENT RELATIONSHIPS (link to related docs)

Varies by document type:

- **IDEATION docs** have `related_ideation` (other ideation docs) and `drives` (Requirements)
- **REQ docs** have `implements` (ideation docs), `implemented_by` (Specs), `related`
- **SPEC docs** have `implements` (Requirements), `depends_on`, `blocks`, `related`
- **IMPL-PLAN docs** have `coordinates` (Specs), `covers` (Requirements), `depends_on`, `blocks`,
  `related`
- **META docs** have `related` for cross-cutting links

**Note:** Only list document filenames without `.md` extension (e.g., `SPEC-my-feature` not
`SPEC-my-feature.md`).

## Auto-Generated Fields

The script `script/validate-docs.mjs` automatically manages:

- **`last_updated`**: Updated to current ISO datetime on every commit (via lint-staged pre-commit
  hook)

The script `script/generate-indices.mjs` automatically generates:

- **`index`**: Section hierarchy (H2/H3 headings) with line numbers and token estimates. Embedded in
  frontmatter after formatting.

You should NOT manually edit these fields.

## Templates Available

### Ideation Templates

- **`IDEATION-PROBLEMS-template.md`** – Problems, failure modes, scenarios, resolution indicators
- **`IDEATION-EXPERIENCE-template.md`** – Personas, journeys, invariants, failure & recovery
- **`IDEATION-UNKNOWNS-template.md`** – Open questions, blockers, closure criteria

Use all three for a complete ideation. You can skip Problems or Unknowns for small features, but
Experience is usually useful.

### Requirements Template

- **`REQ-template.md`** – Contains multiple numbered requirements (REQ-001, REQ-002, etc.)

Create one per feature. Include as many requirements as needed.

### Specification Template

- **`SPEC-template.md`** – Interfaces, data models, invariants, error handling, Q&A

Create one per piece that needs to be built. Multiple Specs can implement the same Requirement.

### Implementation Plan Template

- **`IMPL-PLAN-template.md`** – Milestones, work breakdown, risks, verification, rollout

Create when Specifications are ready. One Plan can coordinate multiple Specs and Requirements.

### Initiative Index Template

- **`INIT-template.md`** – Links to all related docs + status + tracking

Create one per feature/initiative. Update regularly.

---

## Tips

- **Examples are real**: Each template contains realistic pagination examples to show what good
  looks like. Adapt them to your feature.
- **Frontmatter with comments**: Each template frontmatter includes inline comments explaining what
  each field means and what values to use.
- **Optional content**: Delete sections that don't apply to your document. Not every document needs
  Q&A, Design Decisions, Assumptions, or Unknowns sections.
- **Focus matters**: If a section feels large or disconnected, it might belong in a separate
  document. Keep documents narrow in scope.
- **Linking is important**: Fill in the "Document Relationships" section early. This helps the
  documentation system track dependencies and impacts.
- **Keywords improve discovery**: Always include 3-5 keywords. These are used by search and LLM
  systems to find relevant documents.

## Document Lifecycle

1. **Draft** → Create IDEATION docs (Problems, Experience, Unknowns) to explore the space
2. **Requirements** → Write REQ-\* docs driven by ideation; mark status as `draft`
3. **Specification** → Write SPEC-\* docs that implement Requirements; mark status as `draft`
4. **Planning** → Write IMPL-PLAN docs coordinating Specs; mark status as `draft`
5. **Active** → Once approved and in use, change `status: active`
6. **Stable** → After significant time in production, change `status: stable`
7. **Deprecated** → When replaced, change `status: deprecated` and link to successor
8. **Completed** → For IMPL-PLAN docs that finish, use `status: completed`

## Questions?

See `../documentation_guide.md` for full details on document types, linking rules, and lifecycle.
See `../meta/META-documentation-system.md` for design rationale and conventions.
