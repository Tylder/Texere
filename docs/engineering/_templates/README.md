# Documentation Templates

Minimal, concise templates for each document type. Based on modern best practices: Michael Nygard's
lightweight ADRs, MADR (Markdown Any Decision Records), ISO 29148 requirements standards, and
practices from Uber, AWS, and Azure.

## When to use each type

| Type          | Purpose                      | Use when                                                                   |
| ------------- | ---------------------------- | -------------------------------------------------------------------------- |
| **EXPLOG**    | Capture raw discovery        | Brainstorming, exploring unknowns, raw thinking                            |
| **PROBDEF**   | Converge on what's wrong     | Starting a new initiative, clarifying failure modes and resolution signals |
| **DRFC**      | Define what a concept IS     | Introducing core ideas (Character, Canon, Job, etc.)                       |
| **XRFC**      | Define how it's USED         | Defining operator/user experience and workflows                            |
| **RFC**       | Explore OPTIONS & TRADE-OFFS | Debating approaches before committing                                      |
| **ADR**       | Record DECISIONS MADE        | A decision is costly or hard to reverse                                    |
| **REQ**       | Define what MUST be true     | Specifying testable, binding obligations (singular per file)               |
| **SPEC**      | Define exact BEHAVIOR        | Implementing a requirement with detailed contracts                         |
| **IMPL-PLAN** | Define execution roadmap     | Sequencing delivery work and setting verification checkpoints              |
| **INIT**      | Group related docs           | Creating a navigation index for an initiative or feature                   |

## Templates

- [EXPLOG-template.md](EXPLOG-template.md) — Exploration logs (raw discovery, brainstorms)
- [PROBDEF-template.md](PROBDEF-template.md) — Problem definitions (what is broken/needed)
- [DRFC-template.md](DRFC-template.md) — Domain/concept definitions
- [XRFC-template.md](XRFC-template.md) — Experience/user journeys
- [RFC-template.md](RFC-template.md) — Proposal with options side-by-side comparison
- [ADR-template.md](ADR-template.md) — Architecture decision record (append-only)
- [REQ-template.md](REQ-template.md) — Normative requirement (singular, immutable ID)
- [SPEC-template.md](SPEC-template.md) — Implementation specification (contracts, behavior, tests)
- [IMPL-PLAN-template.md](IMPL-PLAN-template.md) — Implementation plan (execution roadmap)
- [INIT-template.md](INIT-template.md) — Initiative index (document navigation)

## Key principles

- **Minimal core, detailed as needed:** use essential sections; add domain-specific sections
  (models, workflows, UI areas) as applicable
- **Singular**: ADRs capture ONE decision; REQs express ONE obligation
- **Testable**: REQs and SPECs must have measurable fit criteria and acceptance tests
- **Immutable IDs**: ADR numbers, REQ IDs never change; supersede instead of rewrite
- **Status tracking**: Every doc shows lifecycle stage (Draft, Accepted, Superseded, etc.)
- **Linkable**: Explicit References section at top shows dependencies
- **Traceable**: Every doc shows what drives it and what it drives

## Template philosophy for XRFCs

XRFCs can be **comprehensive**. Unlike minimal templates, experience definitions benefit from:

- **Detailed domain models**: separate subsections for key entities/concepts
- **Multiple workflows**: step-by-step operator journeys, not vague descriptions
- **UX Principles**: guardrails that guide implementation choices
- **UI Areas**: what the operator actually sees (important for feasibility check)
- **Success Signals**: measurable outcomes, not hand-wavy goals

See
[XRFC-CHAR-character-workspace-builder.md](../01-experience/XRFC-CHAR-character-workspace-builder.md)
for a working example of comprehensive XRFC structure.
