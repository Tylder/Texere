# 03-Experience RFC

**Purpose:** Define the end-to-end experience for a persona (operator, user, system actor).

Experience RFCs focus on usage and prevent building the wrong thing correctly.

## File naming

```
XRFC-<area>-<short-description>.md
```

Examples:

- `XRFC-orchestration-execution-monitoring.md`
- `XRFC-provider-registry-search.md`

## Rules

- Persona-focused
- No MUST/SHOULD/MAY (use REQs for obligations)
- Links to DRFCs for vocabulary and to PROBDEF for drivers
- Status lifecycle: **Draft** → **Accepted** → **Superseded**

## Minimum required content

- Persona
- 1–3 primary journeys (happy path)
- Experience invariants (always/never)
- Failure and recovery expectations
- Success signals (time, clarity, error visibility)
- Outputs: candidate REQs to be created (or links once created)

## What belongs here

- Persona definition
- Primary journeys (happy path)
- Experience invariants (always/never)
- Failure and recovery expectations
- Success signals (time, clarity, error visibility)

## What does NOT belong here

- Normative requirements (no MUST/SHOULD/MAY)
- Architecture or storage choices

## Status

Currently no experience RFCs.
