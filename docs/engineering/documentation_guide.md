# System Documentation Guide

This document defines **what types of documents exist**, **when to create each**, and **what
information belongs where**. It is the authoritative guide for structuring thinking, decisions, and
execution across the system.

The goal is to:

- avoid mixing exploration, obligations, decisions, and implementation
- keep durable knowledge durable, and disposable work disposable
- ensure every document has a clear purpose and lifecycle

---

## High-level flow (canonical order)

**Lifecycle principle:**

- **Domain RFC / XRFC / RFC** are primarily _exploratory_ and may evolve until they are closed.
- **ADR / REQ** are _durable records_ (append-only or immutable-by-ID).
- **Specs** are _versioned contracts_ that may evolve while remaining consistent with REQs and ADRs.

1. **Domain / Concept RFC** – define what the system _is_
2. **Experience RFC (XRFC)** – define how the system is _used_
3. **RFC (Proposal / Design Discussion)** – explore options and trade-offs
4. **ADR (Architecture Decision Record)** – record decisions when they are made
5. **Requirements (REQ)** – define what MUST be true
6. **Specifications (Spec)** – define the contract that is built and tested

## 1. Domain / Concept RFC

### Purpose

Define the **conceptual model** of the system or a major subsystem.

This is where you put things you "know from the start":

- what entities exist (e.g. Character)
- what they fundamentally contain
- invariants and lifecycle
- vocabulary and mental model

### Use when

- Introducing a new core concept (e.g. Character, Canon, Job, Workflow)
- You need shared understanding before discussing solutions

### Minimum content (required)

- Purpose and boundaries (what the concept is and is not)
- Definitions/vocabulary
- Concept model (conceptual facets and relationships)
- Invariants (conceptual, non-normative)
- Lifecycle overview (conceptual)
- Open questions (if any)

### Lifecycle / status

- **Draft** → iterated freely
- **Stable** → changes are rare; treat updates as deliberate refactors
- If a Domain RFC is replaced, mark the older one as **Superseded** and link to the successor

### What belongs here

- Definitions (e.g. what a Character is)
- Conceptual fields and groupings (not storage schemas)
- Invariants (always true rules)
- Lifecycle stages
- High-level relationships between concepts

### What does NOT belong here

- MUST/SHOULD/MAY obligations
- Implementation details
- APIs, databases, UI components

### Output

- Shared vocabulary
- Input to XRFCs and RFCs

### Template

See [`_templates/DRFC-template.md`](_templates/DRFC-template.md)

---

## 2. Experience RFC (XRFC)

### Purpose

Define the **end-to-end experience** for a persona (operator, user, system actor).

Focus on usage, not internals.

### Use when

- Operator or user experience matters
- You want to prevent building the wrong thing correctly

### Minimum content (required)

- Persona
- 1–3 primary journeys (happy path)
- Experience invariants (always / never)
- Failure and recovery expectations
- Success signals (time, clarity, error visibility)
- Outputs: candidate REQs to be created (or links once created)

### Lifecycle / status

- **Draft** → iterated during exploration
- **Accepted** → experience intent is agreed; use as a stable input to REQs
- **Superseded** → replaced by a newer XRFC

### What belongs here

- Persona definition
- Primary journeys (happy path)
- Experience invariants (always / never)
- Failure and recovery expectations
- Success signals (time, clarity, error visibility)

### What does NOT belong here

- Normative requirements (no MUST/SHOULD/MAY)
- Architecture or storage choices

### Output

- Candidate requirements
- Input to technical RFCs

### Template

See [`_templates/XRFC-template.md`](_templates/XRFC-template.md)

---

## 3. RFC (Proposal / Discussion)

### Purpose

Explore **options and trade-offs** before committing.

This is where thinking happens.

### Use when

- Multiple viable approaches exist
- The change is cross-cutting, risky, or expensive to reverse

### Minimum content (required)

- Problem statement
- Goals and non-goals
- Constraints
- Options considered (at least 2 where realistic)
- Trade-offs (explicit)
- Recommendation
- Open questions

### Lifecycle / status

- **Draft** → discussion and iteration
- **In review** → converging on a recommendation
- **Accepted** → the proposal is approved _as direction_
- **Closed** → once the resulting ADR(s) exist and the RFC is no longer the active debate surface
- **Rejected** → explicitly not proceeding

### What belongs here

- Problem statement
- Constraints
- Options considered
- Trade-offs
- Recommendation
- Open questions

### What does NOT belong here

- Binding obligations
- Final decisions without recording them as ADRs

### Output

- Decision points
- Trigger for ADR creation

### Template

See [`_templates/RFC-template.md`](_templates/RFC-template.md)

---

## 4. ADR (Architecture Decision Record)

### Purpose

Record a **decision that has been made** and should not be re-litigated.

This is the system’s memory.

### Use when

- A decision is costly or hard to reverse
- Future readers will ask "why did we do this?"

### Minimum content (required)

- Status
- Context (including links to drivers: REQs/RFCs)
- Decision (specific)
- Alternatives considered (at least the most plausible)
- Consequences (positive and negative)

### Lifecycle / status

- **Accepted** → canonical record
- **Superseded** → replaced by a newer ADR (link to successor)

### Rules

- Append-only: do not rewrite; supersede
- One decision per ADR
- Supersede with a new ADR; never rewrite

### Output

- Immutable rationale referenced by specs and code

### Template

See [`_templates/ADR-template.md`](_templates/ADR-template.md)

---

## 5. Requirements (REQ)

### Purpose

Define **normative obligations**: what MUST be true regardless of implementation.

This is the contract.

### Use when

- You need testable, durable obligations
- Multiple implementations or teams must align

### Minimum content (required)

- Statement using MUST/SHOULD/MAY (one obligation)
- Measurable fit criteria
- Verification method
- Traceability (at least upward to a driver: DRFC/XRFC/RFC)

### Lifecycle / status

- **Proposed** → candidate obligation
- **Approved** → accepted contract
- **Deprecated** → replaced by a new REQ ID when intent changes

### What belongs here

- MUST / SHOULD / MAY statements
- Measurable fit criteria
- Verification method
- Traceability

### What does NOT belong here

- Design decisions
- Exploration
- UI or API details

### Rules

- One obligation per requirement
- Immutable by ID (deprecate and create a new ID when intent changes)

### Output

- Input to specs and tests

### Template

See [`_templates/REQ-template.md`](_templates/REQ-template.md)

---

## 6. Specifications (Spec)

### Purpose

Define the **build/test contract**.

This is what engineers implement and test against.

### Use when

- Something needs to be built
- Interfaces, behavior, or invariants must be precise

### Minimum content (required)

- Scope and non-scope
- Interfaces / observable behavior
- Invariants and state transitions (if applicable)
- Error semantics and failure modes
- Validation approach (how conformance is proven)
- References: Implements REQs; cites ADRs as decision basis

### Lifecycle / status

- **Draft** → under design
- **Active** → used for implementation and testing
- **Revised** → evolves via version control history

### What belongs here

- Data models
- Interfaces (APIs, events, UI behavior)
- State machines and invariants
- Error semantics
- Performance constraints (if required)

### What does NOT belong here

- Exploration or options
- Justification (that lives in ADRs)

### Output

- Code
- Tests

### Template

See [`_templates/SPEC-template.md`](_templates/SPEC-template.md)

---

## Decision rules (how to know what to write)

- Still debating what to do → **RFC**
- Clarifying how something is used → **XRFC**
- Defining what a thing fundamentally is → **Domain RFC**
- A decision has been made → **ADR**
- Defining what must be true → **REQ**
- Defining exact behavior or interfaces → **Spec**

---

## Key principles

- Exploration is disposable; decisions and contracts are durable
- Decisions are recorded when made, not later
- Requirements never contain design
- Specs never justify decisions

### Document of record (single source of truth)

Use this mapping to prevent duplicated truth and drift:

- **Conceptual meaning and vocabulary** → Domain RFC
- **User/operator experience intent** → XRFC
- **Options and trade-offs** → RFC
- **Why we chose a solution** → ADR
- **What must be true** → REQ
- **What gets built and tested (contracts/behavior)** → Spec

**Rule:** if the same fact must stay true over time, it should have exactly one canonical home.

### ADR noise control (keep ADRs high-signal)

- Use ADRs only for **high-impact / costly-to-reverse** decisions.
- For smaller decisions, use a lightweight **Decision Log** (see folder structure) to avoid ADR
  spam.

If a document feels hard to write, it is often the wrong document type.

---

## Folder structure and file naming

This section defines the **canonical on-disk structure** and **file naming conventions** for all
documentation. The goal is predictability, grep-ability, and stable references over time.

### Root structure (recommended)

```
/docs
  /engineering
    README.md
    /00-domain
      README.md
    /01-experience
      README.md
    /02-rfcs
      README.md
    /03-adrs
      README.md
      DECISIONS.md
    /04-requirements
      README.md
      INDEX.md
    /05-specifications
      README.md
```

Numbers enforce reading order and prevent bikeshedding.

**Indexing rules**

- `/docs/engineering/README.md` is the entrypoint.
- Each folder `README.md` lists documents in that folder and highlights the active ones.
- `/04-requirements/INDEX.md` is the searchable, human-maintained registry of requirements (metadata
  lives here, not inside each REQ).

**Decision Log**

- `/03-adrs/DECISIONS.md` is for small, low-risk decisions (1–5 lines each) that are not worth a
  full ADR.
- If a decision later becomes high-impact, promote it to an ADR and link back.

---

## 00-domain (Domain / Concept RFCs)

**Purpose:** define what core concepts are.

**Naming:**

```
DRFC-<topic>.md
```

**Examples:**

- `DRFC-CHAR-character-system.md`
- `DRFC-canon-model.md`

**Rules:**

- One domain concept per file
- Rarely changed once stabilized
- Referenced by XRFCs and RFCs

---

## 01-experience (Experience RFCs)

**Purpose:** define how the system is used.

**Naming:**

```
XRFC-<area>-<short-description>.md
```

**Examples:**

- `XRFC-ops-character-editing.md`
- `XRFC-ops-publishing-flow.md`

**Rules:**

- Persona-focused
- No MUST/SHOULD/MAY
- Links to domain RFCs for vocabulary

---

## 02-rfcs (Proposals / discussions)

**Purpose:** explore options and trade-offs.

**Naming:**

```
RFC-<area>-<topic>.md
```

**Examples:**

- `RFC-pub-readiness-evaluation.md`
- `RFC-canon-storage-options.md`

**Rules:**

- Disposable after decisions are made
- Must link to resulting ADRs

---

## 03-adrs (Architecture Decision Records)

**Purpose:** record decisions permanently.

**Naming:**

```
ADR-<NNN>-<short-title>.md
or
ADR-<DOMAIN>-<NNN>-<short-title>.md  (for multi-domain systems)
```

**Examples:**

- `ADR-014-persist-publish-readiness.md` (sequential)
- `ADR-VI-CONTENT-1-seven-condition-publishability-gate.md` (domain-prefixed)

**Rules:**

- Sequential numbering (within domain if using prefixes)
- Append-only
- Never edited after acceptance
- See `DECISIONS.md` for lightweight decisions (1–5 lines) that don't require full ADR treatment

---

## 04-requirements (Normative requirements)

**Purpose:** define what must be true.

**Naming:**

```
REQ-<domain>-<id>.md
```

**Examples:**

- `REQ-VI-PUB-1.1.md`
- `REQ-VI-CHAR-2.3.md`

**Rules:**

- One requirement per file (recommended)
- IDs are immutable
- Referenced by specs and tests

---

## 05-specs (Specifications)

**Purpose:** define build/test contracts.

**Naming:**

```
SPEC-<area>-<topic>.md
```

**Examples:**

- `SPEC-publish-readiness.md`
- `SPEC-character-profile.md`

**Rules:**

- Must reference REQs and ADRs
- Versioned via git history

---

## Cross-linking rules

### Hard rules

- Link explicitly using relative paths; do not rely on directory position as meaning.
- Do not duplicate canonical truth across document types.
- Prefer stable identifiers where available:
  - ADR IDs (e.g., `ADR-014`) in ADRs/specs
  - REQ IDs (e.g., `REQ-VI-PUB-1.1`) in requirements/specs

### Allowed link directions (default)

- Domain RFCs are linked _downstream_ only
- XRFCs link to Domain RFCs and (once created) REQs
- RFCs link to Domain RFCs and XRFCs; after closure they link to resulting ADRs
- ADRs link to their driving RFCs and REQs
- Specs link to REQs (Implements) and ADRs (Decision basis)

### Reference style (recommended)

- In Specs, include explicit lists:
  - `Implements: REQ-…`
  - `Decision basis: ADR-…`

- In ADRs, link to the driver documents rather than restating them.

No document should rely on directory position alone for meaning; always link explicitly.
