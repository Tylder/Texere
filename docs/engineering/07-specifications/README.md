# 07-Specifications

**Purpose:** Define the build/test contract.

Specifications are what engineers implement and test against. They are precise, measurable, and
versioned via git history.

## File naming

```
SPEC-<area>-<topic>.md
```

Examples:

- `SPEC-orchestration-workflow-resumption.md`
- `SPEC-provider-registry-api.md`

## Rules

- Must reference REQs (Implements: REQ-…)
- Must cite ADRs as decision basis
- Versioned via git history
- Status lifecycle: **Draft** → **Active** → **Revised** (updates tracked via git)

## Minimum required content

- Scope and non-scope
- Interfaces / observable behavior
- Invariants and state transitions (if applicable)
- Error semantics and failure modes
- Validation approach (how conformance is proven)
- References:
  - `Implements: REQ-…` (which requirements this spec addresses)
  - Decision basis: ADR-… (which ADRs support this design)

## What belongs here

- Data models
- Interfaces (APIs, events, UI behavior)
- State machines and invariants
- Error semantics
- Performance constraints (if required)

## What does NOT belong here

- Exploration or options (those go in RFCs)
- Justification (that lives in ADRs)

## Status

Currently no specifications.
