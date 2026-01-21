# System Documentation Guide

A simple documentation system for moving from idea to implementation in as few steps as possible,
while remaining functional for humans and LLMs.

## Overview

This guide defines **four document types** that cover the full lifecycle: discovery through
execution.

| Document Type           | Required    | Purpose                                                     | Lifecycle                               |
| ----------------------- | ----------- | ----------------------------------------------------------- | --------------------------------------- |
| **Ideation**            | No          | Capture brainstorms, problems, personas, journeys, unknowns | Disposable; converges into Requirements |
| **Requirements**        | Recommended | Define what MUST be true                                    | Durable; testable obligations           |
| **Specification**       | Yes         | Define the build/test contract                              | Durable; evolves via git                |
| **Implementation Plan** | Yes         | Define execution roadmap                                    | Operational; evolves via git            |

**Canonical sequence:** Ideation → Requirements → Specification → Implementation Plan

---

## When to Write Each

### Ideation

**Use when:**

- You are still discovering what you need
- You are brainstorming options, unknowns, and tradeoffs
- Your understanding is shifting day-to-day

**Ideation consists of three document types, each with its own template:**

1. **IDEATION-<feature>-problems.md**
   - Problems and failure modes (what's broken or insufficient)
   - Raw ideas and alternative framings
   - Scenarios and examples
   - Success signals (what does "better" look like?)
   - Non-goals (what is explicitly not being solved)
   - See template: `_templates/IDEATION-template-problems.md`

2. **IDEATION-<feature>-experience.md**
   - Personas (who will use this?)
   - Primary journeys (1–3 happy-path workflows per persona)
   - Experience invariants (always / never statements)
   - Failure & recovery (what happens when things go wrong?)
   - Success signals (time, clarity, error visibility)
   - See template: `_templates/IDEATION-template-experience.md`

3. **IDEATION-<feature>-unknowns.md**
   - Open questions and uncertainties
   - Assumptions that need validation
   - Constraints or dependencies not yet resolved
   - Closure criteria (what answers these questions?)
   - See template: `_templates/IDEATION-template-unknowns.md`

**What does NOT belong in Ideation:**

- Finalized obligations using MUST/SHOULD/MAY (those go in Requirements)
- Implementation details that will become commitments
- Binding decisions (those go in Specification)
- Architecture or technology choices

**Output:** Converges into Requirements and Specification

---

### Requirements

**Use when:**

- You are ready to define testable obligations
- Multiple implementations or teams must align
- You want clear traceability from discovery to implementation

**What belongs here:**

- MUST/SHOULD/MAY statements (one per requirement)
- Measurable fit criteria and verification method
- Why this is needed (traceability to Ideation or problems)
- Failure modes and edge cases
- Non-goals (what is explicitly not required)

**What does NOT belong here:**

- Design or architecture choices (those go in Specification)
- Exploration or options (those go in Ideation)
- Implementation details

**Lifecycle:**

- Draft → development
- Approved → accepted contract; use as reference in Spec
- Deprecated → replaced by new requirement (do not rewrite; create new ID)

**Output:** Feeds Specification and tests

---

### Specification

**Use when:**

- Something needs to be built
- Interfaces, behavior, or invariants must be precise
- You want a testable contract

**What belongs here:**

- Scope and non-scope (what is in/out of this spec)
- Interfaces and observable behavior (APIs, state, UI interactions)
- Invariants and state transitions
- Error semantics and failure handling
- Data models or schemas
- Performance constraints (if required)
- How conformance is verified (testing approach)
- References: which Requirements are implemented, why design choices were made
- Q&A: decisions made during exploration

**What does NOT belong here:**

- Exploration or options (that was Ideation)
- Justification for design choices beyond "implements REQ-X" (keep it factual, not defensive)

**Lifecycle:**

- Draft → under design
- Active → used for implementation and testing
- Evolves via git history; no versioning in filename

**Output:** Code and tests

---

### Implementation Plan

**Use when:**

- A Specification is ready to implement
- Work spans multiple milestones or needs staged rollout
- You want a clear roadmap for execution

**What belongs here:**

- Preconditions (what must already be true)
- Milestones (deliverable-oriented, with clear completion criteria)
- Work breakdown (sequenced steps; include dependencies)
- Verification plan (how each milestone proves conformance to Spec)
- Risk register (key risks and mitigations)
- Rollout, migration, or reversibility plan (if applicable)

**What does NOT belong here:**

- New decisions (if the plan requires a costly-to-reverse choice, create a new Specification first)
- Restatement of the Spec (this references the Spec; focus on sequencing)

**Lifecycle:**

- Draft → during planning
- Active → used during execution
- Updated as sequencing changes (versioned via git)

**Output:** A stable roadmap for humans and agents

---

## Q&A Sections

Q&A sections capture design thinking and problem-solving from exploration sessions (with humans or
LLMs).

**How to use:**

1. During ideation or design, capture questions and answers as they emerge
2. Extract individual questions and place them where they inform decisions:
   - Q about user workflow → embed in Requirements or Specification
   - Q about tradeoffs → embed in Specification
   - Q about unknowns → embed in Ideation or Requirements
3. Embed as a `## Q&A` section at the **end of the document** (after primary content)
4. No metadata tracking (no "answered on date X"); just Q and A
5. **Show alternatives considered**, not just the final answer—this preserves why other options were
   rejected

**Format:**

```markdown
## Q&A

**Q: Should the API support pagination?**

- Offset/limit pagination: simpler, familiar, but poor for distributed data
- Cursor-based pagination: better for large datasets, but more complex
- No pagination: simplest, but will timeout on large results

A: Start with offset/limit. It's familiar to clients and sufficient for phase 1. Document as a
limitation. Cursor-based is blocked until we need to scale beyond 10k records.

**Q: How do we handle concurrent edits?**

- Lock-based (pessimistic): prevents conflicts, but degrades UX if contention is high
- Last-write-wins (optimistic): simple, but loses data silently
- Operational transformation: preserves all changes, but complex

A: Last-write-wins initially. Document as a limitation in error semantics section above. Move to OT
only if audit trail becomes a hard requirement.
```

---

## Folder Structure

```
/docs
  /engineering
    README.md                                    # entrypoint
    documentation_guide.md                       # this file
    /_templates
      IDEATION-template-problems.md
      IDEATION-template-experience.md
      IDEATION-template-unknowns.md
      REQ-template.md
      SPEC-template.md
      IMPL-PLAN-template.md
      INIT-template.md
    /00-ideation
      README.md
      IDEATION-<feature>-problems.md
      IDEATION-<feature>-experience.md
      IDEATION-<feature>-unknowns.md
    /01-requirements
      README.md
      REQ-<domain>-<id>.md
    /02-specifications
      README.md
      SPEC-<area>-<topic>.md
    /03-implementation-plans
      README.md
      IMPL-PLAN-<area>-<topic>.md
    /04-initiatives
      README.md
      INIT-<area>-<topic>.md
```

---

## File Naming

### Ideation

Ideation documents are named by type:

```
IDEATION-<feature>-problems.md
IDEATION-<feature>-experience.md
IDEATION-<feature>-unknowns.md

Examples:
  IDEATION-auth-session-problems.md
  IDEATION-auth-session-experience.md
  IDEATION-auth-session-unknowns.md
```

### Requirements

```
REQ-<domain>-<id>.md

Examples:
  REQ-API-001.md
  REQ-UI-STATE-002.md
```

### Specification

```
SPEC-<area>-<topic>.md

Examples:
  SPEC-auth-session-handler.md
  SPEC-cache-invalidation-system.md
```

### Implementation Plan

```
IMPL-PLAN-<area>-<topic>.md

Examples:
  IMPL-PLAN-auth-session-handler.md
  IMPL-PLAN-cache-invalidation-system.md
```

### Initiative Index

```
INIT-<area>-<topic>.md

Examples:
  INIT-auth-system.md
  INIT-caching-strategy.md
```

One initiative index per feature/major theme. Groups related Ideation, Requirements, Specification,
and Implementation Plan docs.

**Initiative index contents:**

- Link to the current Ideation doc (if exists)
- Links to all active Requirements
- Link to the controlling Specification
- Link to the current Implementation Plan
- Brief status/notes

---

## Cross-Linking Rules

**Hard rules:**

- Link explicitly using relative paths
- Do not duplicate truth across document types
- Each key fact should have exactly one canonical home

**Link directions:**

- **Ideation** → links down to nothing yet; captures raw thinking
- **Requirements** → link up to Ideation (what problem/discovery drove this?)
- **Specification** → link up to Requirements (which REQs are implemented?) and optionally to
  Ideation (context)
- **Implementation Plan** → link up to Specification and Requirements

**Reference style:**

In Requirements, link upward:

```
Driven by: ../00-ideation/IDEATION-foo.md
```

In Specification, link upward:

```
Implements:
- ../01-requirements/REQ-UI-001.md
- ../01-requirements/REQ-UI-002.md
```

In Implementation Plan, link upward:

```
Specification: ../02-specifications/SPEC-foo.md
Covers Requirements:
- ../01-requirements/REQ-UI-001.md
- ../01-requirements/REQ-UI-002.md
```

---

## Key Principles

1. **Ideation is disposable.** It converges into Requirements/Specification; you can delete old
   Ideation docs.

2. **Requirements are the contract.** They define obligations independent of how they're built. They
   drive verification.

3. **Specification implements Requirements.** It shows exactly what gets built and tested. It
   includes design decisions (the "why") but not exploration.

4. **Implementation Plan focuses on sequencing.** It does not introduce new decisions; it orders
   work and verifies completion.

5. **One doc per type per feature.** For most features, one Ideation doc per sub-type (Problems,
   Experience, Unknowns) + one Requirements + one Specification + one Implementation Plan.
   - If a feature is small, you might skip Problems or Unknowns (but Experience is usually useful).
   - If requirements are obvious, keep them lightweight.
   - Specs and Plans are always needed before building.

6. **Q&A captures thinking.** Extract useful Q&A from design sessions and embed it in the document
   it informs. Keeps reasoning visible.

7. **Documents evolve via git, not versioning in filenames.** No `-v1`, `-v2` suffixes. History
   lives in commits and pull requests.

---

## README Files in Each Folder

Each numbered folder contains a `README.md` that:

- Lists documents in that folder
- Highlights active vs. archived docs
- Provides brief context on the folder's purpose

Example structure:

```markdown
# 02-Specifications

Specifications define the build/test contract. Each Spec implements one or more Requirements and is
ready for implementation and testing.

## Active Specifications

- [SPEC-auth-session-handler](SPEC-auth-session-handler.md)
- [SPEC-cache-invalidation-system](SPEC-cache-invalidation-system.md)

## Archived

- [SPEC-legacy-auth-flow](SPEC-legacy-auth-flow.md) (superseded by SPEC-auth-session-handler)
```

---

## Example: How It Flows

**Day 1: Ideation**

- Write `IDEATION-export-problems.md`: why users need exports, what's broken, success signals
- Write `IDEATION-export-experience.md`: personas (data analysts, engineers), their workflows, pain
  points
- Write `IDEATION-export-unknowns.md`: async vs sync, format priorities, storage constraints
- Q&A: "Should we support async export?" → captured in unknowns

**Day 2: Requirements**

- Write `REQ-EXPORT-001.md`, `REQ-EXPORT-002.md`, etc.
- Link back to Ideation docs for traceability (which problems/experience drove this?)
- Define: export formats supported, performance limits, error handling
- Q&A: "Which formats take priority?" → captured with decision

**Day 3: Specification**

- Write `SPEC-user-export-service.md`
- Implement the Requirements
- Define: API endpoints, response schemas, rate limits, error codes
- Include: Q&A about tradeoffs made
- Link to Requirements

**Day 4: Implementation Plan**

- Write `IMPL-PLAN-user-export-service.md`
- Break into milestones: API scaffolding → format handlers → testing → deployment
- Include: verification checkpoints, risks, rollout plan

**Ongoing:**

- Update `INIT-export-feature.md` to link all ideation docs, requirements, spec, and plan
- Use as a single entry point for understanding the feature

---

## Lifecycle Rules

- **Ideation:** Disposable. Delete or archive when Requirements are finalized.
- **Requirements:** Immutable by ID. If intent changes, deprecate and create a new REQ ID, not a new
  version.
- **Specification:** Evolves as implementation refines understanding. Versioning lives in git
  history. No filename changes.
- **Implementation Plan:** Updated as execution reveals sequencing changes. Versioned via git.

Never move documents into version-suffixed folders (e.g., `v1`, `v2`). Use git history and clear
status fields.

---

## For LLMs and Agents

This system is designed to be machine-readable:

1. **File structure is predictable.** Type-based folders make queries fast.
2. **Cross-links are explicit.** All relationships are stated, not implied.
3. **Q&A is plaintext and conversational.** LLMs can parse and reason about design decisions
   naturally.
4. **One document per type per feature.** No ambiguity about which Spec to read; there's one.
5. **Each document is self-contained enough to read alone**, yet links to upstream docs for context.

---

## Getting Started

1. Create a feature and start with Ideation or Requirements (skip Ideation if clear).
2. Write a Specification once Requirements are stable.
3. Write an Implementation Plan before starting work.
4. Create an Initiative index in `04-initiatives` to link everything together.
5. Update folder READMEs as you add documents.

If a document feels hard to write, you might be mixing concerns. Review the "What belongs here"
section for that doc type.
