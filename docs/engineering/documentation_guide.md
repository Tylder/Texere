# System Documentation Guide

A simple documentation system for moving from idea to implementation in as few steps as possible,
while remaining functional for humans and LLMs.

---

## Critical: Keeping Indices in Sync

This system relies on indices (Initiative files and folder READMEs) staying current. **Without this,
the system falls apart.**

**How indices work:**

- Each feature has one `INIT-<area>-<topic>.md` that maps to all related Ideation, Requirements,
  Specs, and Plans
- Folder READMEs (e.g., `/02-specifications/README.md`) list all documents in that folder
- **When you create a new document, you MUST update:**
  - The relevant folder README (add to the list)
  - The relevant INIT file (add the link)

**Who is responsible:** The person creating the document is responsible for updating indices
immediately (as part of the same commit/PR).

**When to update:**

- Creating a new doc → update folder README + INIT file
- Archiving a doc → move it from "Active" to "Archived" in README + update INIT
- Deprecating a doc → mark as deprecated in status field + update INIT to point to successor

This is not optional. Make it part of your PR checklist.

---

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

**Important:** The system is many-to-many, not one-to-one:

- One Requirement can drive multiple Specifications
- One Specification can implement multiple Requirements
- One Implementation Plan can coordinate multiple Specs and Requirements
- See the "[Many-to-Many Relationships](#many-to-many-relationships)" section for examples

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

**Lifecycle:** Ideation docs should be archived (not deleted) once Requirements are finalized.
Archiving preserves history and prevents link rot.

---

### Requirements

**Use when:**

- You are ready to define testable obligations
- Multiple implementations or teams must align
- You want clear traceability from discovery to implementation

**Structure:** One Requirements document per feature (e.g., `REQ-export-feature.md`), containing
multiple numbered requirements.

**What belongs here:**

- MUST/SHOULD/MAY statements (numbered list: REQ-001, REQ-002, etc.)
- Measurable fit criteria and verification method per requirement
- Why each is needed (traceability to Ideation or problems)
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

**Output:** Feeds Specifications and tests

**Naming:**

```
REQ-<feature>.md

Examples:
  REQ-export-feature.md
  REQ-pagination-system.md
  REQ-auth-refresh-tokens.md
```

Inside each Requirements doc, individual requirements are numbered:

```
## REQ-001: CSV export format support
## REQ-002: Export performance within 30 seconds
## REQ-003: Export error messages are user-actionable
```

**Reusing Requirements:** Some requirements (like pagination) apply to multiple features. Create a
single, canonical `REQ-pagination-system.md` and link to it from multiple Specs and Plans. This is
not duplication—it's proper reuse.

---

### Specification

**Use when:**

- Something needs to be built
- Interfaces, behavior, or invariants must be precise
- You want a testable contract

**Important:** One Spec can implement multiple Requirements. One Requirement can be implemented by
multiple Specs.

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

- One or more Specifications are ready to implement
- Work spans multiple milestones or needs staged rollout
- You want a clear roadmap for execution

**Important:** One IMPL-PLAN can coordinate multiple Specs and Requirements.

**What belongs here:**

- Preconditions (what must already be true)
- Milestones (deliverable-oriented, with clear completion criteria)
- Work breakdown (sequenced steps; include dependencies)
- Verification plan (how each milestone proves conformance to involved Specs)
- Risk register (key risks and mitigations)
- Rollout, migration, or reversibility plan (if applicable)
- References: which Specs and Requirements this plan covers

**What does NOT belong here:**

- New decisions (if the plan requires a costly-to-reverse choice, create a new Specification first)
- Restatement of the Specs (this references them; focus on sequencing)
- Ideation rationale (readers follow links to Specs/Requirements for context)

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

## Many-to-Many Relationships

The system supports flexible many-to-many relationships. Here's a concrete example with pagination:

### Scenario: Pagination is a cross-cutting requirement

**REQ-pagination-system.md** (one canonical requirement):

```
## REQ-001: Pagination API
System MUST support paginated results via offset/limit.
Applies to: search results, user lists, activity timelines, and any list endpoint.
```

This one Requirement is implemented by **three separate Specs**:

1. **SPEC-search-results-pagination.md** → Implements REQ-pagination-system
   - Scope: search endpoint pagination
   - Q&A: "Should search results include total count?" (specific to search)

2. **SPEC-user-list-pagination.md** → Implements REQ-pagination-system
   - Scope: /users endpoint pagination
   - Q&A: "Should we support filtering during pagination?" (specific to users)

3. **SPEC-timeline-pagination.md** → Implements REQ-pagination-system
   - Scope: activity timeline pagination
   - Q&A: "How do we handle timeline ordering with pagination?" (specific to timeline)

All three Specs implement the **same Requirement**, but each handles it differently for their
domain.

### Coordinating with IMPL-PLAN

**IMPL-PLAN-pagination-system.md** coordinates all three:

```
## Overview
Implement pagination across search, user lists, and timeline.

## Covers
- REQ-pagination-system (all three implementations)

## Specs Implemented
- SPEC-search-results-pagination.md
- SPEC-user-list-pagination.md
- SPEC-timeline-pagination.md

## Milestones
1. Shared pagination library (used by all three Specs)
2. Search results integration
3. User list integration
4. Timeline integration
5. Testing and deployment
```

Each milestone verifies that each Spec's implementation conforms.

### Linking Structure

- **REQ-pagination-system.md** lists which Specs implement it (search, users, timeline)
- **SPEC-search-results-pagination.md** links to REQ-pagination-system
- **SPEC-user-list-pagination.md** links to REQ-pagination-system
- **SPEC-timeline-pagination.md** links to REQ-pagination-system
- **IMPL-PLAN-pagination-system.md** links to all three Specs
- **INIT-pagination.md** links to the REQ and IMPL-PLAN

This way, anyone reading any document can see: "Pagination is implemented across three features, all
driven by one Requirement, coordinated by one Plan."

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
      REQ-<feature>.md
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

One Requirements document per feature:

```
REQ-<feature>.md

Examples:
  REQ-export-feature.md
  REQ-pagination-system.md
  REQ-auth-refresh-tokens.md
```

Inside the document, individual requirements are numbered (REQ-001, REQ-002, etc.).

### Specification

```
SPEC-<area>-<topic>.md

Examples:
  SPEC-search-results-pagination.md
  SPEC-user-list-pagination.md
  SPEC-auth-session-handler.md
```

### Implementation Plan

```
IMPL-PLAN-<area>-<topic>.md

Examples:
  IMPL-PLAN-pagination-system.md
  IMPL-PLAN-auth-session-handler.md
  IMPL-PLAN-export-feature.md
```

### Initiative Index

```
INIT-<area>-<topic>.md

Examples:
  INIT-auth-system.md
  INIT-pagination.md
  INIT-export-feature.md
```

One initiative index per feature/major theme. Groups related Ideation, Requirements, Specs, and
Plans.

**Initiative index contents:**

- Links to all Ideation docs (Problems, Experience, Unknowns)
- Link to the Requirements doc
- Links to all related Specifications
- Links to all related Implementation Plans
- Brief status/notes

---

## Cross-Linking Rules

**Hard rules:**

- Link explicitly using relative paths
- Do not duplicate truth across document types
- Each key fact should have exactly one canonical home

**Link directions (upward only):**

- **Ideation** → links down to nothing yet; captures raw thinking
- **Requirements** → link up to Ideation (what problem/discovery drove this?)
- **Specification** → link up to Requirements (which REQs are implemented?) and optionally to
  Ideation (context)
- **Implementation Plan** → link up to Specifications and Requirements only (not Ideation)

**Reference style:**

In Requirements, link upward:

```
Driven by: ../00-ideation/IDEATION-foo-problems.md
Context: ../00-ideation/IDEATION-foo-experience.md
```

In Specification, link upward:

```
Implements:
- ../01-requirements/REQ-foo.md#REQ-001
- ../01-requirements/REQ-bar.md#REQ-002
```

In Implementation Plan, link upward:

```
Specs:
- ../02-specifications/SPEC-search-pagination.md
- ../02-specifications/SPEC-user-list-pagination.md

Covers Requirements:
- ../01-requirements/REQ-pagination.md#REQ-001
```

---

## Key Principles

1. **Ideation is disposable.** It converges into Requirements/Specification; archive old Ideation
   docs to preserve history without clutter.

2. **Requirements are the contract.** They define obligations independent of how they're built. They
   drive verification. Reuse them across multiple Specs when appropriate.

3. **Specifications implement Requirements.** One Spec can implement one or more Requirements; one
   Requirement can be implemented by multiple Specs. It shows exactly what gets built and tested.

4. **Implementation Plan coordinates delivery.** It can span multiple Specs and Requirements. It
   orders work and verifies completion.

5. **One Requirements doc per feature.** Inside it, number individual requirements (REQ-001,
   REQ-002, etc.). Multiple Specs can implement the same Requirements doc.
   - If Requirements are obvious, keep them lightweight.
   - If multiple features need the same Requirement (like pagination), create one canonical
     Requirements doc and reuse it.

6. **Q&A captures thinking.** Extract useful Q&A from design sessions and embed it in the document
   it informs. Keeps reasoning visible.

7. **Documents evolve via git, not versioning in filenames.** No `-v1`, `-v2` suffixes. History
   lives in commits and pull requests.

8. **Indices must stay in sync.** Every new document requires updating the relevant folder README
   and INIT file. Make this part of your PR checklist.

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

- [SPEC-search-results-pagination](SPEC-search-results-pagination.md)
- [SPEC-user-list-pagination](SPEC-user-list-pagination.md)
- [SPEC-auth-session-handler](SPEC-auth-session-handler.md)

## Archived

- [SPEC-legacy-auth-flow](SPEC-legacy-auth-flow.md) (superseded by SPEC-auth-session-handler)
```

**Responsibility:** The person creating a new Spec updates this README immediately (as part of the
PR).

---

## Example: How It Flows

### Scenario: Implementing pagination across the system

**Week 1: Ideation & Requirements**

- Write `IDEATION-pagination-problems.md`: why pagination is needed, failure modes, success signals
- Write `IDEATION-pagination-experience.md`: personas (data analysts, API consumers), their
  workflows
- Write `IDEATION-pagination-unknowns.md`: offset/limit vs. cursor, performance targets
- Write `REQ-pagination-system.md` with requirements:
  - REQ-001: Pagination via offset/limit
  - REQ-002: Performance: < 100ms response time
  - REQ-003: Error handling for invalid limits

**Week 2: Specifications**

- Write `SPEC-search-results-pagination.md`: Implements REQ-001, REQ-002, REQ-003 (search-specific)
- Write `SPEC-user-list-pagination.md`: Implements REQ-001, REQ-002, REQ-003 (user-list-specific)
- Write `SPEC-timeline-pagination.md`: Implements REQ-001, REQ-002, REQ-003 (timeline-specific)
- All three link back to `REQ-pagination-system.md`

**Week 3: Implementation Plan**

- Write `IMPL-PLAN-pagination-system.md`:
  - Covers all three Specs
  - References `REQ-pagination-system.md`
  - Milestones: shared library → search integration → user list → timeline → testing → deployment

**Ongoing:**

- Update `INIT-pagination.md` to link Ideation, REQ, all three Specs, and the IMPL-PLAN
- Update `/01-requirements/README.md` to list `REQ-pagination-system.md`
- Update `/02-specifications/README.md` to list all three Specs
- Update `/03-implementation-plans/README.md` to list the IMPL-PLAN
- Update `/04-initiatives/README.md` to list `INIT-pagination.md`

---

## Lifecycle Rules

- **Ideation:** Archive (don't delete) when Requirements are finalized. Archiving preserves history
  and prevents link rot.
- **Requirements:** Immutable by ID. If intent changes, deprecate and create a new REQ number (e.g.,
  REQ-001 deprecated → new REQ-004).
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
4. **Many-to-many relationships are explicit.** Links show which Specs implement which Requirements,
   which Plans coordinate which Specs.
5. **Each document is self-contained enough to read alone**, yet links to upstream docs for context.

---

## Getting Started

1. Create an INIT file for your feature/initiative.
2. Start with Ideation (Problems, Experience, Unknowns) or skip straight to Requirements if clear.
3. Write a Requirements doc once discovery is stable.
4. Write Specifications for each piece that needs to be built.
5. Write an Implementation Plan to coordinate delivery.
6. **Update indices immediately:** folder READMEs + INIT file.

**Checklist for new documents:**

- [ ] Document written with proper structure (use templates)
- [ ] Status field set (Draft, Active, Approved, etc.)
- [ ] Links to upstream docs (Ideation → REQ → Spec → Plan)
- [ ] Q&A section includes alternatives considered (if applicable)
- [ ] Folder README updated
- [ ] INIT file updated
- [ ] PR linked/referenced

If a document feels hard to write, you might be mixing concerns. Review the "What belongs here"
section for that doc type.
