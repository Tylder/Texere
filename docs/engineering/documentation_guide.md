# System Documentation Guide (Revised)

This document defines **what types of documents exist**, **when to create each**, and **what
information belongs where**. It is the authoritative guide for structuring thinking, decisions, and
execution across the system.

The goal is to:

- avoid mixing exploration, obligations, decisions, and implementation
- keep durable knowledge durable, and disposable work disposable
- ensure every document has a clear purpose and lifecycle
- ensure early brainstorming converges into stable, testable intent
- ensure every initiative ends with a **Spec** and an **Implementation Plan**

---

## High-level flow (canonical order)

**Lifecycle principle:**

- **Exploration logs** capture messy thinking and are intentionally disposable.
- **Problem Definitions** are the first durable convergence artifact.
- **Domain RFC / XRFC** establish vocabulary and usage before writing obligations.
- **Requirements (REQ)** drive the system; they define what must be true.
- **RFC / ADR** explore how to meet requirements and record decisions.
- **Specs** are versioned contracts that implement REQs and depend on ADRs.
- **Implementation Plans** are operational roadmaps that must not introduce new decisions.

### Canonical sequence

1. **Exploration Log (EXPLOG)** – capture brainstorms and raw thinking (disposable)
2. **Problem Definition (PROBDEF)** – converge on what is actually wrong/needed (durable)
3. **Domain / Concept RFC (DRFC)** – define what the system is (exploratory; establishes vocabulary)
4. **Experience RFC (XRFC)** – define how the system is used (exploratory; establishes usage intent)
5. **Requirements (REQ)** – define what MUST be true (durable; driven by PROBDEF resolution
   indicators)
6. **RFC (Proposal / Design Discussion)** – explore options and trade-offs to meet REQs
   (exploratory)
7. **ADR (Architecture Decision Record)** – record decisions when they are made (durable)
8. **Specifications (Spec)** – define the build/test contract (versioned; implements REQs, depends
   on ADRs)
9. **Implementation Plan (IMPL-PLAN)** – define sequencing and execution roadmap (operational)

### Rationale for requirements-first order

**Why REQ comes before RFC/ADR:**

Traditional requirements-first design is more robust than exploring options first:

- **Requirements drive exploration.** If you write RFC/ADR before REQ, you design solutions without
  a clear contract for what they must satisfy. Options look attractive in a vacuum but may miss
  obligations.
- **Requirements prevent scope creep.** Clarifying "what must be true" before designing focuses RFC
  work on solving real problems, not imagined ones.
- **Requirements are testable.** REQs have measurable fit criteria; RFCs then evaluate options
  against those criteria, not against vague goals.
- **Decisions become defensible.** An ADR that says "we chose X to satisfy REQ-Y" is more credible
  than "we chose X because it seemed good."

This does not mean REQs are written in isolation. They derive from PROBDEF resolution indicators
(the observable signals that problems are solved). The sequence ensures obligations are clear before
commitment.

### Mandatory gates

- No **REQ** is created unless it traces to one or more **PROBDEF** problems.
- No **RFC** is created without reference to the **REQ(s)** it is meant to satisfy.
- No **ADR** is accepted without reference to at least one **REQ** or **RFC** that justified the
  decision.
- No **Spec** is considered "ready" unless it lists the REQs it implements and the ADRs it depends
  on.
- No work is considered "ready to execute" unless there is a current **IMPL-PLAN**.

---

## 0. Exploration Log (EXPLOG)

### Purpose

Capture messy, high-entropy exploration: brainstorms, back-and-forth sessions, contradictory ideas,
partial workflows, and uncertainty.

This exists because early discovery often requires a conversational process to find the truth of
what should be built. EXPLOG lets you do that without contaminating contractual documents.

### Use when

- You are still discovering what you want/need
- You need to capture a brainstorming session for later synthesis
- You are iterating quickly and your understanding is shifting day-to-day

### Minimum content (required)

- Session header: date, participants (human/agent), topic
- Notes (freeform)
- End-of-session **Synthesis Delta**:
  - New facts discovered
  - New assumptions introduced
  - Unknowns created or closed
  - Candidate problems to add/update in PROBDEF
  - Candidate journeys to add/update in XRFC

### Lifecycle / status

- Always **Draft**
- Never treated as canonical truth
- May be superseded or archived freely

### What belongs here

- raw ideas
- alternative framings
- half-formed workflows
- unresolved contradictions
- “maybe” statements

### What does NOT belong here

- normative requirements (MUST/SHOULD/MAY)
- binding decisions
- implementation details that later become commitments

### Output

- Inputs for PROBDEF, DRFC, XRFC, RFC

---

## 1. Problem Definition (PROBDEF)

### Purpose

Define the **truth of what needs to be solved** before any design commitment.

A Problem Definition is the first durable artifact for an initiative. It exists to prevent building
the wrong thing correctly and to stop silent assumptions from becoming requirements.

### Use when

- You are starting a new initiative or major change
- You need clarity on what is broken/insufficient and what “better” means
- You have a workflow idea but the underlying need is still unstable

### Minimum content (required)

- Scope and non-scope
- Context / environment (who, where, constraints)
- **Problems list** (one initiative can contain many problems), where each problem includes:
  - Problem statement
  - Failure modes (how the problem manifests)
  - Scenario(s) / example(s)
  - Resolution indicators (observable signals that the problem is addressed)
  - Boundary / non-goals (explicitly what is not being solved)
- Assumptions register
- Unknowns register (with closure criteria)
- Success signals (system-level observable outcomes)

### Lifecycle / status

- **Draft** → iterated during discovery
- **Accepted** → stable intent baseline; downstream documents must respect it
- **Superseded** → replaced by a new PROBDEF when the initiative changes fundamentally

### Rules

- PROBDEF is authoritative for “what” and “why,” not “how.”
- PROBDEF may reference workflows (XRFC) but must stand alone without them.
- Problems may be refined for clarity, but do not rewrite history to match a favored solution.
- If intent changes materially, create a new problem entry or supersede the document.

### Output

- Stable drivers for REQs
- Stable baseline for XRFC/RFC debates
- Trace targets for later verification

---

## 2. Domain / Concept RFC (DRFC)

### Purpose

Define the **conceptual model** of the system or a major subsystem.

This is where you put things you "know from the start":

- what entities exist
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
- If a DRFC is replaced, mark the older one as **Superseded** and link to the successor

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

See `_templates/DRFC-template.md`

---

## 3. Experience RFC (XRFC)

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

See `_templates/XRFC-template.md`

---

## 4. Requirements (REQ)

### Purpose

Define **normative obligations**: what MUST be true regardless of implementation.

This is the contract that drives exploration and decisions. Requirements are derived from PROBDEF
resolution indicators and are used to evaluate options in RFCs and justify ADRs.

### Use when

- You need testable, durable obligations
- Multiple implementations or teams must align
- You want to ensure exploration (RFC) and decisions (ADR) are grounded in clear requirements

### Minimum content (required)

- Statement using MUST/SHOULD/MAY (one obligation)
- Measurable fit criteria
- Verification method
- Traceability (must link upward to PROBDEF; optionally to DRFC/XRFC if they inform the requirement)

### Lifecycle / status

- **Proposed** → candidate obligation
- **Approved** → accepted contract
- **Deprecated** → replaced by a new REQ ID when intent changes

### What belongs here

- MUST / SHOULD / MAY statements
- Measurable fit criteria
- Verification method
- Traceability back to problems

### What does NOT belong here

- Design decisions
- Exploration
- UI or API details
- Options or trade-offs (those belong in RFC)

### Rules

- One obligation per requirement
- Immutable by ID (deprecate and create a new ID when intent changes)
- REQs are the contract; they drive RFC exploration

### Output

- Input to RFCs (what must we satisfy?)
- Input to ADRs (what requirement justifies this decision?)
- Input to specs and tests

### Template

See `_templates/REQ-template.md`

---

## 5. RFC (Proposal / Discussion)

### Purpose

Explore **options and trade-offs** to meet requirements.

This is where thinking happens, informed by REQs.

### Use when

- Multiple viable approaches exist to satisfy one or more REQs
- The change is cross-cutting, risky, or expensive to reverse

### Minimum content (required)

- REQ(s) being addressed (what must we satisfy?)
- Goals and non-goals
- Constraints
- Options considered (at least 2 where realistic)
- Trade-offs (explicit; how each option satisfies REQs differently)
- Recommendation
- Open questions

### Lifecycle / status

- **Draft** → discussion and iteration
- **In review** → converging on a recommendation
- **Accepted** → the proposal is approved as direction
- **Closed** → once the resulting ADR(s) exist and the RFC is no longer the active debate surface
- **Rejected** → explicitly not proceeding

### What belongs here

- Constraints
- Options considered (evaluated against REQs)
- Trade-offs
- Recommendation
- Open questions

### What does NOT belong here

- Binding obligations (those are REQs)
- Final decisions without recording them as ADRs

### Output

- Decision points
- Trigger for ADR creation
- Informed evaluation of options against requirements

### Template

See `_templates/RFC-template.md`

---

## 6. ADR (Architecture Decision Record)

### Purpose

Record a **decision that has been made** and should not be re-litigated.

This is the system's memory. ADRs record which option was chosen (from RFC exploration) and why it
best satisfies the requirements.

### Use when

- A decision is costly or hard to reverse
- Future readers will ask "why did we do this?"
- An RFC has converged on a recommendation

### Minimum content (required)

- Status
- Context (including links to drivers: REQ(s)/RFC/PROBDEF)
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
- Must reference the REQ(s) or RFC that justified the decision

### Output

- Immutable rationale referenced by specs and code
- Dependency constraint for specs

### Template

See `_templates/ADR-template.md`

---

## 7. Specifications (Spec)

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

See `_templates/SPEC-template.md`

---

## 8. Implementation Plan (IMPL-PLAN)

### Purpose

Define the **execution roadmap** that turns a Spec into a delivered outcome.

An Implementation Plan is operational. It sequences work, identifies dependencies, sets verification
checkpoints, and defines what “done” looks like.

### Use when

- A Spec is ready to implement
- The work spans multiple milestones or needs staged rollout
- You want resumability across days/weeks/agents

### Minimum content (required)

- References: the Spec(s), and the REQs being implemented
- Preconditions (what must already be true)
- Milestones (deliverable-oriented)
- Work breakdown (sequenced steps; include dependencies)
- Verification plan (how each milestone proves conformance)
- Risk register (key risks and mitigations)
- Rollout / migration / reversibility (if applicable)

### Lifecycle / status

- **Draft** → during planning
- **Active** → used during execution
- **Revised** → updated as sequencing changes (versioned via git)

### Rules

- Must not introduce new decisions. If the plan requires a costly-to-reverse choice, create an ADR
  first.
- Must not restate the Spec; it references the Spec and focuses on sequencing.

### Output

- A stable roadmap usable by humans and agents

---

## Decision rules (how to know what to write)

- Still discovering what you actually want → **EXPLOG**
- Converging on what is wrong/needed and how to measure improvement → **PROBDEF**
- Clarifying what a thing fundamentally is → **DRFC**
- Clarifying how something is used → **XRFC**
- Defining what must be true (derived from PROBDEF resolution indicators) → **REQ**
- Still debating options and trade-offs to meet REQs → **RFC**
- A decision has been made (to satisfy REQ(s)) → **ADR**
- Defining exact behavior or interfaces (implementing REQs, depending on ADRs) → **Spec**
- Sequencing delivery work for execution → **IMPL-PLAN**

---

## Versioning, identity, and supersession

### Core rule

**File names encode identity, not version.**

Versioning is expressed through:

- git history (mechanical change tracking)
- document status fields (semantic authority)
- explicit supersession links (intent change)

Filename-based versioning (e.g. `-v1`, `-v2`, `latest.md`) is intentionally not used, because it
breaks stable references and obscures intent changes.

### Why versions are not in filenames

- Stable links matter more than visible version numbers.
- Different document types have different lifecycle semantics.
- Semantic change (intent) is handled via **new documents or new IDs**, not filename revisions.

### How versioning works by document type

| Document  | Change model                                              |
| --------- | --------------------------------------------------------- |
| EXPLOG    | Disposable; no versioning                                 |
| PROBDEF   | Clarified or superseded; new file if intent changes       |
| DRFC      | Rare refactor; supersede with new DRFC if meaning changes |
| XRFC      | Replaced when experience intent changes                   |
| REQ       | Immutable by ID; new ID for new intent                    |
| RFC       | Closed/rejected; not versioned                            |
| ADR       | Append-only; supersede with new ADR                       |
| SPEC      | Evolves via git history                                   |
| IMPL-PLAN | Evolves via git history                                   |

### When to create a new file instead of revising

Create a new document (do **not** add a version suffix) when:

- intent changes
- scope changes materially
- obligations change
- a decision is reversed

Mark the old document as `Status: Superseded` and link to the successor.

---

## Key principles

- Exploration is disposable; intent, decisions, and contracts are durable
- Problem Definitions are the first durable convergence artifact
- Decisions are recorded when made, not later
- Requirements never contain design
- Specs never justify decisions
- Plans do not create decisions

### Document of record (single source of truth)

Use this table to keep document purpose crisp and to prevent "epistemic mixing" (exploration,
decisions, obligations, and implementation bleeding into each other):

| Document  | Question it answers                          | Depends on          |
| --------- | -------------------------------------------- | ------------------- |
| PROBDEF   | What is wrong and how do we know it's fixed? | —                   |
| DRFC      | What _is_ this thing?                        | PROBDEF             |
| XRFC      | How is it used?                              | PROBDEF             |
| REQ       | What must be true?                           | PROBDEF, DRFC, XRFC |
| RFC       | What options satisfy these REQs?             | REQ, PROBDEF        |
| ADR       | What did we decide and why?                  | REQ, RFC            |
| SPEC      | What exactly do we build/test?               | REQ, ADR            |
| IMPL-PLAN | How do we execute?                           | SPEC, REQ           |

Use this mapping to prevent duplicated truth and drift:

- **Raw exploration and brainstorm notes** → EXPLOG
- **Problems, failure modes, resolution indicators** → PROBDEF
- **Conceptual meaning and vocabulary** → DRFC
- **User/operator experience intent** → XRFC
- **What must be true (driven by resolution indicators)** → REQ
- **Options and trade-offs to meet REQs** → RFC
- **Why we chose a solution (to satisfy REQ)** → ADR
- **What gets built and tested (contracts/behavior implementing REQ)** → Spec
- **How we will deliver it (sequencing)** → IMPL-PLAN

**Rule:** if the same fact must stay true over time, it should have exactly one canonical home.

### ADR noise control (keep ADRs high-signal)

- Use ADRs only for high-impact / costly-to-reverse decisions.
- For smaller decisions, use a lightweight **Decision Log** (see folder structure) to avoid ADR
  spam.
- If a decision later becomes high-impact, promote it to an ADR and link back.

If a document feels hard to write, it is often the wrong document type.

---

## Folder structure and file naming

This section defines the canonical on-disk structure and file naming conventions for all
documentation. The goal is predictability, grep-ability, and stable references over time.

### Organizing principle

**Primary organization is by document type, not by feature/initiative folders.**

Rationale:

- Document types have different lifecycles (disposable vs append-only vs immutable-by-ID). Mixing
  them inside feature folders leads to accidental drift and broken invariants.
- Many documents are cross-cutting (especially DRFCs, ADRs, and some REQs) and do not belong to a
  single feature.
- Type-based folders make global queries trivial (e.g., “show all active specs”, “list all ADRs”,
  “find all deprecated REQs”).

**Do not create a `feature-a/` folder as the canonical home for its docs.** Instead, use explicit
linking and an initiative index (see below).

### Grouping related documents (Feature A, Initiative X)

Use **initiative index documents** to group related docs without moving canonical files.

- Create one index file per initiative/feature/theme:
  - `INIT-<area>-<topic>.md`
- The index contains curated links to the PROBDEF, DRFC(s), XRFC(s), RFC(s), ADR(s), REQ(s),
  SPEC(s), and IMPL-PLAN(s) that together represent “Feature A”.

This provides the navigation benefits of feature folders without the lifecycle and supersession
problems.

### Superseded and historical documents

**Never move superseded documents into per-feature archives.**

Rules:

- A superseded document remains in its canonical **type folder**.
- Mark it clearly with:
  - `Status: Superseded`
  - `Superseded by: <relative link>`
- Update the relevant initiative index to point at the successor.

This preserves stable references, auditability, and avoids “history rewriting”.

### Root structure (recommended)

```
/docs
  /engineering
    README.md
    /00-exploration
      README.md
    /01-problem-definitions
      README.md
    /02-domain
      README.md
    /03-experience
      README.md
    /04-requirements
      README.md
      INDEX.md
    /05-rfcs
      README.md
    /06-adrs
      README.md
      DECISIONS.md
    /07-specifications
      README.md
    /08-implementation-plans
      README.md
    /09-initiatives
      README.md
```

Numbers enforce reading order (PROBDEF → REQ → RFC → ADR → SPEC) and prevent bikeshedding.

**Indexing rules**

- `/docs/engineering/README.md` is the entrypoint.
- Each folder `README.md` lists documents in that folder and highlights the active ones.
- `/04-requirements/INDEX.md` is the searchable, human-maintained registry of requirements (metadata
  lives here, not inside each REQ).
- `/09-initiatives/README.md` lists initiative index files and highlights the active initiatives.

**Decision Log**

- `/06-adrs/DECISIONS.md` is for small, low-risk decisions (1–5 lines each) that are not worth a
  full ADR treatment.

---

## 00-exploration (Exploration Logs)

**Purpose:** capture raw discovery and brainstorming sessions.

**Naming:**

```
EXPLOG-YYYY-MM-DD-<topic>.md
```

**Rules:**

- Disposable; never treated as canonical truth
- Must end with a Synthesis Delta section

---

## 01-problem-definitions (Problem Definitions)

**Purpose:** converge on what is wrong/needed and how to verify improvement.

**Naming:**

```
PROBDEF-<area>-<topic>.md
```

**Examples:**

- `PROBDEF-orchestration-state-and-resumability.md`
- `PROBDEF-provider-registry-extraction.md`

**Rules:**

- One initiative per file; multiple numbered problems inside
- Must include resolution indicators and boundaries per problem

---

## 02-domain (Domain / Concept RFCs)

**Purpose:** define what core concepts are.

**Naming:**

```
DRFC-<topic>.md
```

**Rules:**

- One domain concept per file
- Rarely changed once stabilized
- Referenced by XRFCs and RFCs

---

## 03-experience (Experience RFCs)

**Purpose:** define how the system is used.

**Naming:**

```
XRFC-<area>-<short-description>.md
```

**Rules:**

- Persona-focused
- No MUST/SHOULD/MAY
- Links to DRFCs for vocabulary and to PROBDEF for drivers

---

## 04-requirements (Normative requirements)

**Purpose:** define what must be true (driven by PROBDEF resolution indicators).

**Naming:**

```
REQ-<domain>-<id>.md
```

**Rules:**

- One requirement per file
- IDs are immutable
- Must trace to PROBDEF
- Referenced by RFCs (what must be satisfied?), ADRs (why did we choose this?), and specs (what do
  we implement?)

---

## 05-rfcs (Proposals / discussions)

**Purpose:** explore options and trade-offs to meet REQs.

**Naming:**

```
RFC-<area>-<topic>.md
```

**Rules:**

- Disposable after decisions are made
- Must link to the REQ(s) being addressed
- Must link to resulting ADRs
- Evaluated against requirements, not abstract goals

---

## 06-adrs (Architecture Decision Records)

**Purpose:** record decisions permanently (which option satisfies REQ).

**Naming:**

```
ADR-<NNN>-<short-title>.md
or
ADR-<DOMAIN>-<NNN>-<short-title>.md
```

**Rules:**

- Sequential numbering (within domain if using prefixes)
- Append-only
- Never edited after acceptance
- Must reference REQ(s) or RFC that justified the decision
- See `DECISIONS.md` for lightweight decisions

---

## 07-specifications (Specifications)

**Purpose:** define build/test contracts (implementing REQs via ADR-justified decisions).

**Naming:**

```
SPEC-<area>-<topic>.md
```

**Rules:**

- Must reference REQs it implements
- Must reference ADRs that justify design decisions
- Versioned via git history

---

## 08-implementation-plans (Implementation Plans)

**Purpose:** define sequencing and execution roadmap.

**Naming:**

```
IMPL-PLAN-<area>-<topic>.md
```

**Rules:**

- Must reference Spec(s) and REQ(s) being implemented
- Must not introduce new decisions; ADR first if needed
- May reference ADRs for constraints

---

## 09-initiatives (Initiative indexes)

**Purpose:** provide a human- and agent-friendly navigation layer that groups related documents for
a given initiative/feature without breaking canonical type-based storage.

**Naming:**

```
INIT-<area>-<topic>.md
```

**Rules:**

- One initiative per file.
- The index should link to: the current PROBDEF, relevant DRFC(s), XRFC(s), all active REQ(s), any
  active/closed RFC(s), applicable ADR(s), the controlling SPEC(s), and the current IMPL-PLAN(s).
- Link in order: PROBDEF → REQ → RFC → ADR → SPEC → IMPL-PLAN (the canonical sequence).
- The index must not become a second spec; it is a curated link map plus status.

---

## Cross-linking rules

### Hard rules

- Link explicitly using relative paths; do not rely on directory position as meaning.
- Do not duplicate canonical truth across document types.
- Prefer stable identifiers where available:
  - ADR IDs (e.g., `ADR-014`) in ADRs/specs
  - REQ IDs (e.g., `REQ-VI-PUB-1.1`) in requirements/specs

### Allowed link directions (default)

- EXPLOGs may link to anything, but nothing treats them as canonical truth.
- PROBDEF links downstream only (it may reference context, but does not depend on downstream
  documents).
- DRFCs link downstream only (referenced by REQs, RFCs, ADRs).
- XRFCs link to DRFCs and PROBDEF; may inform REQs.
- REQs link upward to PROBDEF and optionally to DRFC/XRFC that inform them.
- RFCs link upward to REQ(s) they aim to satisfy, to PROBDEF for context, to DRFC/XRFC for
  vocabulary.
- ADRs link upward to REQ(s) they satisfy and to RFC(s) that explored the decision.
- Specs link upward to REQ(s) they implement and to ADR(s) that justify design choices.
- IMPL-PLAN links upward to Spec(s) and REQ(s) being implemented; may reference ADRs for
  constraints.

### Reference style (recommended)

- In REQs, include explicit links:
  - `Driven by: PROBDEF-…` (required)
  - `Informed by: DRFC-…` or `XRFC-…` (optional)
- In RFCs, include explicit links:
  - `Addresses REQ: REQ-…` (required)
  - `Context: PROBDEF-…` (required)
- In ADRs, include explicit links:
  - `Satisfies REQ: REQ-…` (required)
  - `Explored in: RFC-…` (recommended)
  - `Context: PROBDEF-…` (optional)
- In Specs, include explicit lists:
  - `Implements: REQ-…` (required)
  - `Decision basis: ADR-…` (required)
- In IMPL-PLANs, include explicit lists:
  - `Implements: SPEC-…` (required)
  - `Covers: REQ-…` (required)
  - `Constraints: ADR-…` (optional)

No document should rely on directory position alone for meaning; always link explicitly.
