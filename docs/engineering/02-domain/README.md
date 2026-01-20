# 02-Domain / Concept RFC

**Purpose:** Define the conceptual model of the system or major subsystem.

A Domain RFC clarifies what entities exist, what they fundamentally contain, their invariants, and
lifecycle. It establishes shared vocabulary and mental models.

## File naming

```
DRFC-<topic>.md
```

Examples:

- `DRFC-Character.md`
- `DRFC-Canon.md`

## Rules

- One domain concept per file
- Rarely changed once stabilized
- Referenced by XRFCs and RFCs
- Status lifecycle: **Draft** → **Stable** → **Superseded** (if replaced)

## Minimum required content

- Purpose and boundaries (what the concept is and is not)
- Definitions/vocabulary
- Concept model (conceptual facets and relationships)
- Invariants (conceptual, non-normative)
- Lifecycle overview (conceptual)
- Open questions (if any)

## What belongs here

- Definitions (e.g., what a Character is)
- Conceptual fields and groupings (not storage schemas)
- Invariants (always true rules)
- Lifecycle stages
- High-level relationships between concepts

## What does NOT belong here

- MUST/SHOULD/MAY obligations
- Implementation details
- APIs, databases, UI components

## Status

Currently no domain RFCs.
