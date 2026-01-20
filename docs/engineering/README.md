# System Documentation Guide

Welcome to the engineering documentation system. This folder contains the durable, decision-making,
and execution records for the Texere system.

## Quick navigation

Use this table to find the document type you need:

| What you need                        | Folder                                                         | Status                              |
| ------------------------------------ | -------------------------------------------------------------- | ----------------------------------- |
| To capture brainstorms/raw thinking  | [00-Exploration](./00-exploration/README.md)                   | **Disposable**                      |
| To define what is broken/needed      | [01-Problem Definitions](./01-problem-definitions/README.md)   | **Draft/Accepted**                  |
| To clarify what a core concept is    | [02-Domain RFCs](./02-domain/README.md)                        | **Draft/Stable**                    |
| To clarify how something is used     | [03-Experience RFCs](./03-experience/README.md)                | **Draft/Accepted**                  |
| To explore options/trade-offs        | [04-RFCs](./04-rfcs/README.md)                                 | **Draft/In review/Accepted/Closed** |
| To record decisions made             | [05-ADRs](./05-adrs/README.md)                                 | **Accepted/Superseded**             |
| To define what must be true          | [06-Requirements](./06-requirements/README.md)                 | **Proposed/Approved/Deprecated**    |
| To define exact build/test contracts | [07-Specifications](./07-specifications/README.md)             | **Draft/Active/Revised**            |
| To define execution roadmaps         | [08-Implementation Plans](./08-implementation-plans/README.md) | **Draft/Active/Revised**            |
| To group related docs for a feature  | [09-Initiatives](./09-initiatives/README.md)                   | Navigation/Index                    |

## How to use this system

### I'm discovering what we need to build

1. Start in [00-Exploration](./00-exploration/README.md) to capture brainstorms
2. Converge into [01-Problem Definitions](./01-problem-definitions/README.md) to define what needs
   fixing
3. Use [03-Experience RFCs](./03-experience/README.md) if user/operator experience matters
4. Reference the [02-Domain RFCs](./02-domain/README.md) for vocabulary

### I'm making a decision

1. Explore options in [04-RFCs](./04-rfcs/README.md)
2. Record the decision in [05-ADRs](./05-adrs/README.md) (append-only, never edited)

### I'm defining obligations

1. Create [06-Requirements](./06-requirements/README.md) that trace back to PROBDEF/DRFC/XRFC/RFC
2. Use the [06-Requirements/INDEX.md](./06-requirements/INDEX.md) to maintain the registry

### I'm implementing something

1. Write a [07-Specification](./07-specifications/README.md) that references REQs and ADRs
2. Create an [08-Implementation Plan](./08-implementation-plans/README.md) to sequence the work
3. Link everything from [09-Initiatives](./09-initiatives/README.md) for navigation

## Key principles

- **Exploration is disposable; intent, decisions, and contracts are durable**
- **Problem Definitions are the first durable convergence artifact**
- **Decisions are recorded when made, not later**
- **Requirements never contain design**
- **Specs never justify decisions**
- **Plans do not create decisions**

## Document lifecycle at a glance

```
EXPLOG (brainstorm)
  ↓
PROBDEF (what's wrong) ← DRFC (what is it?) ← XRFC (how is it used?)
  ↓
RFC (what options?)
  ↓
ADR (we decided...)
  ↓
REQ (what must be true)
  ↓
SPEC (exact behavior)
  ↓
IMPL-PLAN (how to deliver)
```

## File naming conventions

All filenames encode **identity**, not version. Document status and git history track changes.

| Document Type       | Naming Pattern                                            | Example                                                  |
| ------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Exploration Log     | `EXPLOG-YYYY-MM-DD-<topic>.md`                            | `EXPLOG-2025-01-20-error-handling.md`                    |
| Problem Definition  | `PROBDEF-<area>-<topic>.md`                               | `PROBDEF-orchestration-state.md`                         |
| Domain RFC          | `DRFC-<topic>.md`                                         | `DRFC-Character.md`                                      |
| Experience RFC      | `XRFC-<area>-<description>.md`                            | `XRFC-operator-monitoring.md`                            |
| RFC                 | `RFC-<area>-<topic>.md`                                   | `RFC-storage-strategy.md`                                |
| ADR                 | `ADR-<NNN>-<title>.md` or `ADR-<DOMAIN>-<NNN>-<title>.md` | `ADR-001-monorepo.md` or `ADR-VI-TECH-001-typescript.md` |
| Requirement         | `REQ-<domain>-<id>.md`                                    | `REQ-ORCH-RESUME-1.1.md`                                 |
| Specification       | `SPEC-<area>-<topic>.md`                                  | `SPEC-workflow-resumption.md`                            |
| Implementation Plan | `IMPL-PLAN-<area>-<topic>.md`                             | `IMPL-PLAN-orchestration.md`                             |
| Initiative Index    | `INIT-<area>-<topic>.md`                                  | `INIT-orchestration-resumability.md`                     |

## Cross-linking rules

- Link explicitly using relative paths
- Do not duplicate canonical truth across document types
- Use stable identifiers: `ADR-NNN`, `REQ-domain-id`

### Allowed link directions

- EXPLOGs: may link to anything, but nothing treats them as canonical truth
- PROBDEF: links downstream only
- DRFC: links downstream only
- XRFC: links to DRFC and PROBDEF; once created, link to REQs
- RFC: links to DRFC, XRFC, and PROBDEF; after closure, links to ADRs
- ADR: links to drivers (PROBDEF/RFC/REQ)
- REQ: links to drivers (PROBDEF plus DRFC/XRFC/RFC)
- SPEC: links to REQs (Implements) and ADRs (Decision basis)
- IMPL-PLAN: links to SPECs and REQs; may reference ADRs

## Current status

### Active documents

- [05-ADRs](./05-adrs/README.md): 6 technical decisions recorded
  - Testing strategy (trophy/pyramid)
  - Nx build system for composite projects
  - Centralized Prettier formatting
  - TypeScript with strict project references
  - Testing implementation specification
  - Hybrid ESLint/Oxlint linting

### Empty folders (ready for content)

- 00-Exploration
- 01-Problem Definitions
- 02-Domain RFCs
- 03-Experience RFCs
- 04-RFCs
- 06-Requirements
- 07-Specifications
- 08-Implementation Plans
- 09-Initiatives

## Templates

Templates are available in `_templates/`:

- [EXPLOG Template](./_templates/EXPLOG-template.md) — Exploration logs
- [PROBDEF Template](./_templates/PROBDEF-template.md) — Problem definitions
- [DRFC Template](./_templates/DRFC-template.md) — Domain RFCs
- [XRFC Template](./_templates/XRFC-template.md) — Experience RFCs
- [RFC Template](./_templates/RFC-template.md) — Proposals/RFCs
- [ADR Template](./_templates/ADR-template.md) — Architecture decisions
- [REQ Template](./_templates/REQ-template.md) — Requirements
- [SPEC Template](./_templates/SPEC-template.md) — Specifications
- [IMPL-PLAN Template](./_templates/IMPL-PLAN-template.md) — Implementation plans
- [INIT Template](./_templates/INIT-template.md) — Initiative indexes

## Getting started

1. Read [the full documentation guide](./documentation_guide.md) for complete detail
2. Choose your document type using the quick navigation table above
3. Pick a template from `_templates/`
4. Check the relevant folder's README for naming and rules
5. Link from related documents (use the cross-linking rules above)

---

**Note:** This is the canonical source for how engineering decisions, requirements, and
specifications are documented. Updates to this structure require consensus and should be captured in
an ADR.
