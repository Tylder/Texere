# 08-Implementation Plans

**Purpose:** Define the execution roadmap that turns a Spec into a delivered outcome.

Implementation Plans are operational. They sequence work, identify dependencies, set verification
checkpoints, and define what "done" looks like.

## File naming

```
IMPL-PLAN-<area>-<topic>.md
```

Examples:

- `IMPL-PLAN-orchestration-resumability.md`
- `IMPL-PLAN-provider-registry-extraction.md`

## Rules

- Must not introduce new decisions (if a decision is needed, create an ADR first)
- Must not restate the Spec; instead reference it and focus on sequencing
- Versioned via git history
- Status lifecycle: **Draft** → **Active** → **Revised** (updates tracked via git)

## Minimum required content

- References:
  - The Spec(s) being implemented
  - The REQs being addressed
- Preconditions (what must already be true)
- Milestones (deliverable-oriented)
- Work breakdown (sequenced steps; include dependencies)
- Verification plan (how each milestone proves conformance)
- Risk register (key risks and mitigations)
- Rollout / migration / reversibility (if applicable)

## What belongs here

- Sequencing and execution roadmap
- Dependencies between tasks
- Verification checkpoints
- Risk mitigations

## What does NOT belong here

- Design decisions (those go in ADRs)
- Specification details (those go in SPECs)

## Status

Currently no implementation plans.
