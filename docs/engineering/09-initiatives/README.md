# 09-Initiative Indexes

**Purpose:** Provide human- and agent-friendly navigation that groups related documents for a given
initiative/feature.

Initiative indexes curate links to related documents without breaking canonical type-based storage.
Each index groups the PROBDEF, DRFC(s), XRFC(s), RFC(s), ADR(s), REQ(s), SPEC(s), and IMPL-PLAN(s)
that together represent a single feature or initiative.

## File naming

```
INIT-<area>-<topic>.md
```

Examples:

- `INIT-orchestration-workflow-resumability.md`
- `INIT-provider-registry-extraction.md`

## Rules

- One initiative per file
- The index should link to:
  - Current PROBDEF (if any)
  - Relevant DRFC(s)
  - Relevant XRFC(s)
  - Any active/closed RFC(s)
  - Applicable ADR(s)
  - All active REQ(s)
  - Controlling SPEC(s)
  - Current IMPL-PLAN(s)
- Must not become a second spec; it is purely a curated link map plus status

## Minimum required content

- Initiative name and purpose
- Status (active/paused/completed)
- Links to all related documents
- Brief summary of current state (optional)

## Benefits

- Preserves stable, type-based document storage
- Provides clear navigation for a given feature
- Maintains stable links when documents are superseded
- Prevents scattered feature folders

## Status

Currently no initiative indexes.
