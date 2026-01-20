# 01-Problem Definitions

**Purpose:** Define the truth of what needs to be solved before any design commitment.

A Problem Definition is the first durable artifact for an initiative. It prevents building the wrong
thing correctly and stops silent assumptions from becoming requirements.

## File naming

```
PROBDEF-<area>-<topic>.md
```

Examples:

- `PROBDEF-orchestration-state-resumability.md`
- `PROBDEF-provider-registry-extraction.md`

## Rules

- One initiative per file; multiple numbered problems inside
- Must include resolution indicators and boundaries per problem
- Status lifecycle: **Draft** → **Accepted** → **Superseded**
- Never rewrite history; supersede with a new PROBDEF if intent changes materially

## Minimum required content

- Scope and non-scope
- Context (who, where, constraints)
- Problems list with:
  - Problem statement
  - Failure modes
  - Scenario(s)/example(s)
  - Resolution indicators
  - Boundary/non-goals
- Assumptions register
- Unknowns register (with closure criteria)
- Success signals

## Status

Currently no problem definitions.
