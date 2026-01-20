# 06-Requirements

**Purpose:** Define normative obligations—what MUST be true regardless of implementation.

Requirements are the contract. They are testable, durable, and independent of how they are
implemented.

## File naming

```
REQ-<domain>-<id>.md
```

Examples:

- `REQ-ORCH-RESUME-1.1.md`
- `REQ-VI-PUBAPI-2.3.md`

## Rules

- One requirement per file
- IDs are immutable: create a new ID if intent changes (do not rewrite)
- Must trace to PROBDEF
- Referenced by specs and tests
- Status lifecycle: **Proposed** → **Approved** → **Deprecated** (new ID if intent changes)

## Minimum required content

- Statement using MUST/SHOULD/MAY (one obligation)
- Measurable fit criteria
- Verification method
- Traceability (must link upward to PROBDEF and at least one of: DRFC/XRFC/RFC)

## What belongs here

- MUST/SHOULD/MAY statements
- Measurable fit criteria
- Verification method
- Traceability

## What does NOT belong here

- Design decisions (those go in ADRs)
- Exploration (those go in EXPLOGs)
- UI or API details (those go in Specs)

## Index

See `INDEX.md` for a searchable, human-maintained registry of all requirements (metadata lives
there, not inside each REQ file).

## Status

Currently no requirements defined. See `INDEX.md` for metadata and status.
