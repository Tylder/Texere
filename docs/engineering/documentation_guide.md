# System Documentation Guide

A simple documentation system for moving from idea to implementation in as few steps as possible,
optimized for both human and LLM readers.

---

## Critical: Keeping Indices in Sync

This system relies on indices (Initiative files and folder READMEs) staying current. **Without this,
the system falls apart.**

**How indices work:**

- Each feature has one `INIT-<area>-<topic>.md` that maps to all related Ideation, Requirements,
  Specs, and Plans
- Folder READMEs (e.g., `/02-specifications/README.md`) list all documents in that folder
- A global `DOCUMENT-REGISTRY.md` (in `/docs/engineering`) lists all documents with queryable
  metadata
- **When you create a new document, you MUST update:**
  - The relevant folder README (add to the list)
  - The relevant INIT file (add the link)
  - The global DOCUMENT-REGISTRY.md (add entry)

**Who is responsible:** The person creating the document is responsible for updating indices
immediately (as part of the same commit/PR).

**When to update:**

- Creating a new doc → update folder README + INIT file + DOCUMENT-REGISTRY.md
- Archiving a doc → move it from "Active" to "Archived" in README + update INIT + update registry
  status
- Deprecating a doc → mark as deprecated in status field + update INIT to point to successor +
  update registry

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

## Document Format: YAML Frontmatter + Structured Sections

Every document uses a standardized format optimized for LLM parsing while remaining human-readable.

### YAML Frontmatter (Required)

Every document MUST begin with YAML metadata:

```yaml
---
type: SPEC # or REQ, IMPL-PLAN, IDEATION-problems, IDEATION-experience, IDEATION-unknowns, INIT
status: active # draft, active, approved, deprecated, archived, on-hold, completed
stability: stable # experimental, beta, stable
created: 2025-01-21
last_updated: 2025-01-21
next_review: 2025-02-21
area: pagination
feature: search-results
---
```

**Fields:**

- `type`: Document type (required for querying)
- `status`: Workflow status (required; see below)
- `stability`: How likely to change (helps LLMs understand confidence)
- `created`, `last_updated`, `next_review`: Dates (helps track staleness)
- `area`, `feature`: Tags for querying/grouping (optional but recommended)

### Mandatory Sections

Every document has these sections in order:

1. **Document Relationships** – Where this doc fits in the system
2. **TLDR** – Executive summary for fast parsing
3. **Scope** – What's included/excluded
4. **Main Content** – The meat of the document
5. **Design Decisions** – Alternatives considered (structured format)
6. **Blockers** – What's blocking this, what it blocks, unblocking criteria
7. **Assumptions & Unknowns** – Explicit lists with closure criteria
8. **Document Metadata** – Auto-generated section for querying

### 1. Document Relationships

```markdown
## Document Relationships

**Upstream (this doc depends on):**

- REQ-pagination-system.md

**Downstream (documents that depend on this):**

- IMPL-PLAN-pagination-system.md

**Siblings (related docs at same level):**

- SPEC-user-list-pagination.md
- SPEC-timeline-pagination.md

**Related (cross-cutting links):**

- INIT-pagination.md
```

LLMs use this to traverse the graph. Helps agents understand "if this changes, what else needs to
update?"

### 2. TLDR

```markdown
## TLDR

**What:** Pagination API for search results via offset/limit

**Why:** Users need to browse large result sets efficiently without timeouts

**How:**

- Shared pagination library (used by 3 Specs)
- Search endpoint integration (this Spec)
- Response includes metadata (total, offset, limit)

**Status:** Active (Milestone 2 in progress)

**Critical path:** Database indexing (done) → Shared lib (in progress) → Search integration (this
month)

**Risk:** Performance doesn't meet <100ms target
```

Lets LLMs summarize and understand intent at a glance.

### 3. Scope

```markdown
## Scope

**Includes:**

- API endpoint contract (GET /search?offset=0&limit=20)
- Response schema with pagination metadata
- Error codes for invalid parameters
- Performance constraints (<100ms response time)

**Excludes:**

- Frontend UI/UX for pagination controls (see SPEC-search-results-ui.md)
- Cursor-based pagination (see REQ-pagination-system.md for rationale)
- Export pagination (separate feature)

**In separate docs:**

- User-facing experience: IDEATION-pagination-experience.md
- Business requirements: REQ-pagination-system.md
```

Makes scope crystal clear for agents. Prevents them asking questions answered elsewhere.

### 4. Main Content

Standard sections for each doc type (Interfaces, Data Models, Error Semantics, etc.).

Include prose explanations, code examples, state machines, whatever is needed.

### 5. Design Decisions

Replaces the old "Q&A" format with explicit decision records:

```markdown
## Design Decisions

**DECISION-001: Pagination Strategy**

| Field                  | Value                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Options Considered** | A) Offset/limit (chosen) B) Cursor-based C) No pagination                                               |
| **Chosen**             | Option A: Offset/limit                                                                                  |
| **Rationale**          | Familiar to API consumers, 95% of use cases, fastest to implement                                       |
| **Tradeoffs**          | Simpler than cursor but doesn't work for real-time data; can't handle offset beyond data size elegantly |
| **Blocked**            | None                                                                                                    |
| **Expires**            | When result sets >10M rows OR user demand for cursor-based appears                                      |
| **Decision Date**      | 2025-01-21                                                                                              |

**DECISION-002: Maximum Page Size**

| Field                  | Value                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **Options Considered** | A) No limit B) Hard limit 100 (chosen) C) Per-endpoint config D) User configurable |
| **Chosen**             | Option B: Hard limit 100                                                           |
| **Rationale**          | Protects server memory; 100 is sufficient for typical use; documented limitation   |
| **Tradeoffs**          | Less flexible but simpler; users can adjust limit in client logic                  |
| **Blocked**            | None                                                                               |
| **Expires**            | If monitoring shows >5% of requests hit limit                                      |
| **Decision Date**      | 2025-01-21                                                                         |
```

Machines can parse this reliably. Humans can read it too.

### 6. Blockers

```markdown
## Blockers

| Blocker                            | Status                      | Unblocks When                            | Impact                             |
| ---------------------------------- | --------------------------- | ---------------------------------------- | ---------------------------------- |
| Database indexing on search tables | In progress, ETA 2025-02-01 | Indexes deployed + performance validated | Blocks this Spec; blocks IMPL-PLAN |
| ORM query optimization             | Not started                 | PR merged + perf test passes             | Blocks performance target <100ms   |
| API documentation review           | Pending                     | Design review scheduled 2025-01-24       | Blocks approval                    |

| Blocks                      | Document                                         | Impact                                   |
| --------------------------- | ------------------------------------------------ | ---------------------------------------- |
| IMPL-PLAN-pagination-system | Can't start milestones until this Spec approved  | Delays timeline by 1 week per dependency |
| SPEC-user-list-pagination   | Same Requirement, waits for patterns from search | Reference implementation                 |
```

LLMs can immediately see: "I can't build this yet. I'll know I can when X happens."

### 7. Assumptions & Unknowns

```markdown
## Assumptions

| Assumption                            | Validation Method                         | Confidence | Impact if Wrong                                  |
| ------------------------------------- | ----------------------------------------- | ---------- | ------------------------------------------------ |
| Most queries return <10k results      | Monitor query metrics; flag if >1% exceed | High       | Offset pagination breaks down; need cursor-based |
| Offset pagination doesn't hurt SEO    | Analytics team review                     | Medium     | May need URL rewriting                           |
| API consumers accept 100-result limit | User survey                               | Medium     | Scope creep on configurability                   |

## Unknowns

| Question                                   | Impact                          | Resolution Criteria                                    | Owner        | ETA        |
| ------------------------------------------ | ------------------------------- | ------------------------------------------------------ | ------------ | ---------- |
| Should we support cursor-based pagination? | Architecture choice, dev effort | User demand reaches 10% of requests OR result sets >1M | Product      | 2025-06-01 |
| What's the acceptable response time?       | Blocks acceptance criteria      | Stakeholder sign-off on <100ms target                  | Product Lead | 2025-01-24 |
| Do we need export pagination?              | Scope, dev effort               | Business decision on export feature priority           | Product      | 2025-02-01 |
```

Structured so LLMs can track resolution progress.

### 8. Document Metadata

````markdown
## Document Metadata

(Auto-generated by the system; helps with querying and versioning)

```yaml
id: SPEC-search-results-pagination
type: SPEC
area: search
feature: pagination-system
status: active
stability: stable
created: 2025-01-21
last_updated: 2025-01-21
implements:
  [REQ-pagination-system#REQ-001, REQ-pagination-system#REQ-002, REQ-pagination-system#REQ-003]
implemented_by: [IMPL-PLAN-pagination-system]
depends_on: [SPEC-shared-pagination-lib]
blocks: [IMPL-PLAN-pagination-system]
related: [SPEC-user-list-pagination, SPEC-timeline-pagination, INIT-pagination]
keywords: [pagination, offset, limit, search, api, performance]
```
````

LLMs can query the registry: "Show me all Specs implementing REQ-pagination-system" → immediately
returns list with status/links.

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

**Important:** One Specification can implement multiple Requirements. One Requirement can be
implemented by multiple Specifications.

**What belongs here:**

- Scope and non-scope (what is in/out of this spec)
- Interfaces and observable behavior (APIs, state, UI interactions)
- Invariants and state transitions
- Error semantics and failure handling
- Data models or schemas
- Performance constraints (if required)
- How conformance is verified (testing approach)
- Design decisions (alternatives considered, rationale, blockers, expiry)
- Assumptions and unknowns

**What does NOT belong here:**

- Exploration or options (that was Ideation; now it's Design Decisions with structured format)
- Justification for design choices beyond "implements REQ-X" (covered in Design Decisions)

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
- Design decisions (if any choices needed for execution)
- Blockers and dependencies
- Assumptions and unknowns

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

## Many-to-Many Relationships

The system supports flexible many-to-many relationships. Here's a concrete example with pagination:

### Scenario: Pagination is a cross-cutting requirement

**REQ-pagination-system.md** (one canonical requirement):

```yaml
---
type: REQ
status: approved
stability: stable
---

## REQ-001: Pagination API
System MUST support paginated results via offset/limit.
Applies to: search results, user lists, activity timelines, and any list endpoint.
```

This one Requirement is implemented by **three separate Specs**:

1. **SPEC-search-results-pagination.md** → Implements REQ-pagination-system
   - Scope: search endpoint pagination
   - Design Decision: "Should search results include total count?" (specific to search)

2. **SPEC-user-list-pagination.md** → Implements REQ-pagination-system
   - Scope: /users endpoint pagination
   - Design Decision: "Should we support filtering during pagination?" (specific to users)

3. **SPEC-timeline-pagination.md** → Implements REQ-pagination-system
   - Scope: activity timeline pagination
   - Design Decision: "How do we handle timeline ordering with pagination?" (specific to timeline)

All three Specs implement the **same Requirement**, but each handles it differently for their
domain.

### Coordinating with IMPL-PLAN

**IMPL-PLAN-pagination-system.md** coordinates all three:

```yaml
---
type: IMPL-PLAN
status: active
implements: [REQ-pagination-system]
coordinates: [SPEC-search-results-pagination, SPEC-user-list-pagination, SPEC-timeline-pagination]
---

## Overview
Implement pagination across search, user lists, and timeline.

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

This way, anyone (human or LLM) reading any document can see: "Pagination is implemented across
three features, all driven by one Requirement, coordinated by one Plan."

---

## Folder Structure

```
/docs
  /engineering
    README.md                                    # entrypoint
    documentation_guide.md                       # this file
    DOCUMENT-REGISTRY.md                         # queryable index of all docs
    /_templates
      IDEATION-template-problems.md
      IDEATION-template-experience.md
      IDEATION-template-unknowns.md
      REQ-template.md
      SPEC-template.md
      IMPL-PLAN-template.md
      INIT-template.md
      README.md
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

---

## Cross-Linking Rules

**Hard rules:**

- Link explicitly using relative paths
- Do not duplicate truth across document types
- Each key fact should have exactly one canonical home
- Use YAML frontmatter metadata for machine-readable relationships

**Link directions (upward only):**

- **Ideation** → links down to nothing yet; captures raw thinking
- **Requirements** → link up to Ideation (what problem/discovery drove this?)
- **Specification** → link up to Requirements (which REQs are implemented?) and optionally to
  Ideation (context)
- **Implementation Plan** → link up to Specifications and Requirements only (not Ideation)

**Reference style:**

In Requirements, link upward:

```yaml
---
type: REQ
driven_by: [IDEATION-foo-problems.md, IDEATION-foo-experience.md]
---
```

In Specification, link upward:

```yaml
---
type: SPEC
implements: [REQ-foo.md#REQ-001, REQ-foo.md#REQ-002]
depends_on: [SPEC-shared-lib.md]
```

In Implementation Plan, link upward:

```yaml
---
type: IMPL-PLAN
coordinates: [SPEC-search-pagination.md, SPEC-user-list-pagination.md]
covers: [REQ-pagination-system.md#REQ-001, REQ-pagination-system.md#REQ-002]
```

---

## Key Principles

1. **Ideation is disposable.** Archive (don't delete) when Requirements are finalized. Archiving
   preserves history while keeping active docs clean.

2. **Requirements are the contract.** They define obligations independent of how they're built. They
   drive verification. Reuse them across multiple Specs when appropriate.

3. **Specifications implement Requirements.** One Spec can implement one or more Requirements; one
   Requirement can be implemented by multiple Specs. It shows exactly what gets built and tested.

4. **Implementation Plan coordinates delivery.** It can span multiple Specs and Requirements. It
   orders work and verifies completion.

5. **One Requirements doc per feature.** Inside it, number individual requirements (REQ-001,
   REQ-002, etc.). Multiple Specs can implement the same Requirements doc.

6. **Design Decisions are structured, not prose.** Use the Decision table format so LLMs can parse
   alternatives and rationale reliably.

7. **Every document is LLM-parseable.** YAML frontmatter, structured sections, metadata
   tables—machines should understand your docs as easily as humans.

8. **Documents evolve via git, not versioning in filenames.** No `-v1`, `-v2` suffixes. History
   lives in commits and pull requests.

9. **Indices must stay in sync.** Every new document requires updating folder README, INIT file, and
   DOCUMENT-REGISTRY.md. Make this part of your PR checklist.

---

## For LLMs and Agents

This system is designed to be machine-readable first, human-readable second.

### How LLMs should use this system

1. **Query by metadata:** "Show me all SPEC documents with status:active and area:pagination"
   - Read the DOCUMENT-REGISTRY.md to find candidates
   - Parse YAML frontmatter to filter/sort

2. **Traverse relationships:** "What does this Spec implement? What implements this Spec?"
   - Use the `implements` and `implemented_by` fields in frontmatter
   - Use "Document Relationships" section for context

3. **Understand blockers:** "Can we start building this? What are we waiting on?"
   - Read the "Blockers" section with structured table
   - Check each blocker's status and ETA

4. **Extract decisions:** "What were the alternatives considered? Why did we choose this?"
   - Read "Design Decisions" section (structured table format)
   - Extract "Options Considered", "Chosen", "Rationale", "Expires"

5. **Check scope:** "Does this document cover X?"
   - Read "Scope" section (Includes/Excludes/In separate docs)
   - Ask clarifying questions if needed

6. **Validate assumptions:** "What are we assuming? How will we know if it's wrong?"
   - Read "Assumptions" section (table format with validation method)
   - Read "Unknowns" section (table format with resolution criteria)

### Structured data helps agents

- **Decision tables** → Easy to parse alternatives and pick the best option
- **Metadata tables** → Easy to summarize status and dependencies at a glance
- **YAML frontmatter** → Enable querying and filtering across all documents
- **Explicit blockers** → Agents know what's blocking them and when they'll unblock
- **Scope section** → Prevents agents asking questions answered in other docs

---

## README Files in Each Folder

Each numbered folder contains a `README.md` that:

- Lists documents in that folder (Active/Archived)
- Highlights status of each
- Provides brief context on the folder's purpose
- Reminds contributors to keep the index updated

Example structure:

```markdown
# 02-Specifications

Specifications define the build/test contract. Each Spec implements one or more Requirements and is
ready for implementation and testing.

**Key:** One Specification can implement multiple Requirements. One Requirement can be implemented
by multiple Specifications.

## Active Specifications

| Document                                                            | Status | Stability | Implements                 | Blocks               |
| ------------------------------------------------------------------- | ------ | --------- | -------------------------- | -------------------- |
| [SPEC-search-results-pagination](SPEC-search-results-pagination.md) | active | stable    | REQ-pagination#001,002,003 | IMPL-PLAN-pagination |
| [SPEC-user-list-pagination](SPEC-user-list-pagination.md)           | active | beta      | REQ-pagination#001,002,003 | IMPL-PLAN-pagination |

## Archived

- [SPEC-legacy-auth-flow](SPEC-legacy-auth-flow.md) (superseded by SPEC-auth-session-handler,
  archived 2025-01-15)
```

**Responsibility:** The person creating a new Spec updates this README immediately (as part of the
PR).

---

## Global Document Registry

Create one `DOCUMENT-REGISTRY.md` in `/docs/engineering` that lists all documents with queryable
metadata.

LLMs use this to find documents without scanning every file.

```markdown
# Document Registry

Machine-readable index of all documentation.

## Query examples

- Show me all Specs with status:active → grep `| SPEC | active`
- Show me all docs in area:pagination → grep `pagination`
- Show me all Specs implementing REQ-pagination-system → grep `REQ-pagination-system`

| ID                             | Type      | Status   | Stability | Area     | Feature    | Implements                                      | Implements Count | Blocks                                            | Modified   |
| ------------------------------ | --------- | -------- | --------- | -------- | ---------- | ----------------------------------------------- | ---------------- | ------------------------------------------------- | ---------- |
| REQ-pagination-system          | REQ       | approved | stable    | core-api | pagination | -                                               | -                | SPEC-search-pagination, SPEC-user-list-pagination | 2025-01-21 |
| SPEC-search-results-pagination | SPEC      | active   | stable    | search   | pagination | REQ-pagination-system#REQ-001,#REQ-002,#REQ-003 | 3                | IMPL-PLAN-pagination-system                       | 2025-01-21 |
| SPEC-user-list-pagination      | SPEC      | active   | beta      | users    | pagination | REQ-pagination-system#REQ-001,#REQ-002,#REQ-003 | 3                | IMPL-PLAN-pagination-system                       | 2025-01-20 |
| IMPL-PLAN-pagination-system    | IMPL-PLAN | active   | stable    | core-api | pagination | -                                               | -                | -                                                 | 2025-01-21 |
```

---

## Getting Started

1. Create an INIT file for your feature/initiative.
2. Start with Ideation (Problems, Experience, Unknowns) or skip straight to Requirements if clear.
3. Write a Requirements doc once discovery is stable.
4. Write Specifications for each piece that needs to be built.
5. Write an Implementation Plan to coordinate delivery.
6. **Update indices immediately:** folder READMEs + INIT file + DOCUMENT-REGISTRY.md.

**Checklist for new documents:**

- [ ] YAML frontmatter present (type, status, stability, dates, area, feature)
- [ ] Document Relationships section (upstream, downstream, siblings, related)
- [ ] TLDR section (What/Why/How/Status/Critical path)
- [ ] Scope section (Includes/Excludes/In separate docs)
- [ ] Main content written
- [ ] Design Decisions in structured table format (or N/A)
- [ ] Blockers section completed (or "None")
- [ ] Assumptions & Unknowns in table format (or N/A)
- [ ] Document Metadata section with auto-generated YAML
- [ ] Folder README updated
- [ ] INIT file updated
- [ ] DOCUMENT-REGISTRY.md updated

If a document feels hard to write, you might be mixing concerns. Review the "What belongs here"
section for that doc type.
