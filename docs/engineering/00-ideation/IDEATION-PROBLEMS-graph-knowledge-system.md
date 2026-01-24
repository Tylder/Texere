---
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: project-memory
feature: graph-knowledge-system
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Decisions decay, graphs become unqueryable dumps, external sources lack first-class status,
  multi-step plans remain untraced. Without explicit lifecycle linkage, documentation recreates
  document sprawl.'
summary_long:
  'Identifies 12 core problems that a graph-based project memory system must solve: epistemic drift,
  graph bloat, external source parity, plan representation, lifecycle fragmentation, specification
  ambiguity, verification gaps, and query usability. Includes failure modes, real scenarios,
  resolution indicators, and open questions. Drives Requirements once validated.'
related_ideation:
  [IDEATION-EXPERIENCE-graph-knowledge-system, IDEATION-UNKNOWNS-graph-knowledge-system]
drives: []
index:
  sections:
    - title: 'Document Relationships'
      lines: [140, 163]
      summary:
        'Discovery phase; identifies problems that drive Requirements; paired with Experience and
        Unknowns docs.'
      token_est: 65
    - title: 'TLDR'
      lines: [165, 188]
      summary:
        'Decisions and rationale decay or become untraceable. Graphs bloat with duplicates and
        noise. External sources are second-class citizens. Multi-step plans lack dependency tracking
        and completion semantics. Full lifecycle trace (intent → commitments → execution) is
        fragmented across genres.'
      token_est: 177
    - title: 'Scope'
      lines: [190, 220]
      summary: 'Real failure modes and user frustrations; not solutions or design details.'
      token_est: 198
    - title: 'Overview'
      lines: [222, 258]
      summary:
        'A project should be fully documented across the full lifecycle (ideation → problems →
        exploration → decisions → requirements → specifications → multi-step implementation plans →
        implementation → verification), where every decision and commitment is stored, traceable to
        evidence and artifacts (including external sources and code), and remains queryable over
        time as the project evolves.'
      token_est: 397
    - title: 'Running Example: Todo List Feature (Lifecycle Trace)'
      lines: [260, 284]
      token_est: 253
    - title: 'Problems'
      lines: [286, 862]
      token_est: 5298
      subsections:
        - title: 'Problem 1: Epistemic Drift and Decision Loss'
          lines: [290, 341]
          summary:
            'Decisions, rationale, and open uncertainties decay over time because they are not
            consistently captured, linked, and updated as the project changes.'
          token_est: 504
        - title: 'Problem 2: Graph Becomes an Unqueryable Dump (Bloat, Duplication, Noise)'
          lines: [343, 405]
          summary:
            'If nodes for desires/uncertainties/options/evidence are created freely (and are
            immutable), the graph can grow without bound and become too large and inconsistent to
            query, causing the same decay as document sprawl.'
          token_est: 598
        - title: 'Problem 3: External Sources vs Internal Code Are Not First-Class Equals'
          lines: [407, 475]
          summary:
            'Traditional systems treat code as "real" and external research as "notes," making it
            impossible to query decisions across both uniformly. This includes ingestion asymmetry:
            repos become structured graphs, while websites become blobs, forcing repeated rereading
            and reinterpretation.'
          token_est: 637
        - title:
            'Problem 4: Multi-Step Plans Lack Dependencies, Granularity, and Completion Tracking'
          lines: [477, 539]
          summary:
            'Even if decisions are recorded, implementation plans are fragmented, unclear on
            dependencies, and lack meaningful completion semantics; this causes rework, missed
            dependencies, and wrong prioritization.'
          token_est: 606
        - title: 'Problem 5: External Ingestion Asymmetry and Source Staleness'
          lines: [541, 600]
          summary:
            'Websites, documentation, and external code repos are ingested as raw blobs instead of
            structured, versioned artifacts with queryable parts. This forces repeated
            reinterpretation and hides staleness.'
          token_est: 541
        - title:
            'Problem 6: Lifecycle Fragmentation (Intent → Commitments → Execution Trace is Broken)'
          lines: [602, 671]
          summary:
            'Even if decisions, evidence, and code exist separately, the system fails if it cannot
            preserve continuity across the full lifecycle of intent → commitment → execution.
            Document genres (ideation/RFC/ADR/spec) recreate siloed knowledge.'
          token_est: 706
        - title: 'Problem 7: Specification Drift, Ambiguity, and Under-Specification'
          lines: [673, 734]
          summary:
            'Requirements and decisions are insufficient to prevent rework and divergence unless
            specification-level commitments (interfaces, invariants, edge cases) are captured in a
            queryable, maintainable way.'
          token_est: 535
        - title: 'Problem 8: Verification and Acceptance Evidence Is Missing or Unlinked'
          lines: [736, 793]
          summary:
            'Without explicit verification/acceptance evidence linked to requirements/spec clauses,
            the graph cannot prove that commitments are satisfied, and "done" becomes narrative.'
          token_est: 493
        - title: 'Problem 9: Query Usability, Explainability, and Stable Views Without Doc-Types'
          lines: [795, 862]
          summary:
            'A graph can be theoretically queryable but practically unusable if users cannot
            reliably ask, interpret, and trust the answers—especially when replacing familiar
            document genres with graph-native views.'
          token_est: 663
    - title: 'Success Signals (System Level)'
      lines: [864, 889]
      token_est: 305
    - title: 'Assumptions'
      lines: [891, 909]
      token_est: 189
    - title: 'Unknowns'
      lines: [911, 945]
      token_est: 393
    - title: 'Related Problems'
      lines: [947, 956]
      token_est: 64
    - title: 'Document Metadata'
      lines: [958, 985]
      token_est: 50
---

## Document Relationships

Summary: Discovery phase; identifies problems that drive Requirements; paired with Experience and
Unknowns docs.

**Upstream (context):**

- (None; ideation is discovery)

**Downstream (informs):**

- Requirements (drives REQ creation)
- INIT-graph-knowledge-system.md

**Siblings (other ideation docs):**

- IDEATION-EXPERIENCE-graph-knowledge-system.md (usage patterns)
- IDEATION-UNKNOWNS-graph-knowledge-system.md (open questions)

**Related:**

- (None yet)

---

## TLDR

Summary: Decisions and rationale decay or become untraceable. Graphs bloat with duplicates and
noise. External sources are second-class citizens. Multi-step plans lack dependency tracking and
completion semantics. Full lifecycle trace (intent → commitments → execution) is fragmented across
genres.

**What:** Identify and document the core problems that a graph-based project memory must solve.

**Why:** Without a precise problem map, the system will either become an unqueryable dump or become
an over-typed, brittle schema that cannot evolve.

**How:** Capture failure modes, concrete scenarios, and success signals—no solution design.

**Status:** Draft (discovery in progress)

**Critical questions to answer:**

- What must be queryable at any time (and at what granularity)?
- What invariants must hold to prevent drift (decisions without rationale, plans without
  dependencies)?
- What is the minimum schema that prevents ambiguity and decay?

---

## Scope

Summary: Real failure modes and user frustrations; not solutions or design details.

**Includes:**

- Problems and failure modes in capturing projects as nodes
  (desires/uncertainties/options/decisions/etc.)
- Traceability gaps between decisions, evidence, external sources, and code
- Plan representation problems (multi-step plans, dependencies, partial completion, revisions)
- Graph bloat / duplication / inconsistency problems that destroy queryability
- Lifecycle fragmentation across ideation, exploration, decisions, requirements, specs, plans, and
  code
- Specification and verification gaps that prevent correctness assurance
- Query usability and stable views without reinventing document genres
- Success signals (what "good" looks like)

**Excludes:**

- Final schema / node types / edge types (belongs in Requirements/Specs)
- UI workflows (belongs in Experience doc)
- Implementation details (database choice, indexer tech, etc.)
- Technology choices (Neo4j vs Postgres, etc.)

**In separate docs:**

- How users will work with the system: IDEATION-EXPERIENCE-graph-knowledge-system.md
- Open questions: IDEATION-UNKNOWNS-graph-knowledge-system.md
- Requirements: REQ-graph-knowledge-system.md (after validation)

---

## Overview

Summary: A project should be fully documented across the full lifecycle (ideation → problems →
exploration → decisions → requirements → specifications → multi-step implementation plans →
implementation → verification), where every decision and commitment is stored, traceable to evidence
and artifacts (including external sources and code), and remains queryable over time as the project
evolves.

The core challenge: enabling this without making the graph noisy, inconsistent, schema-brittle, or
fragmented across lifecycle stages. The system must support the "expansion" workflow (e.g., a Todo
List feature uncovers uncertainties like persistence needs, then options like ORM/database choices,
then decisions and implementation steps).

**Node Categories (Justification, Not Schema):**

This project requires a small, stable set of node categories to keep the graph queryable and prevent
semantic drift. These are conceptual classes; concrete schema details are deferred to Requirements:

- **Subject (canonical thing):** The stable "thing" the project talks about across time (e.g.,
  Persistence, ORM, Prisma, Todo List Feature). Anchors lifecycle trace across internal and external
  information, preventing synonym/duplicate fragmentation.
- **Artifact (verifiable source material):** Internal or external material in a versioned state
  (repo snapshot, docs snapshot, file, symbol/span, doc section, issue/thread). Enables evidence and
  decisions to cite stable references; makes internal code and external sources first-class equals.
- **Assertion (lifecycle statement):** Intent, uncertainty, evaluation, commitment, plan, and
  validation units (desire/problem/option/decision/requirement/spec/plan-step/verification).
  Represents the lifecycle trace spine without reintroducing document genres.
- **Agent (actor):** The human or automated writer responsible for producing assertions and
  artifacts. First-class so multi-writer drift can be debugged.
- **Activity (run/session):** The run context in which assertions/artifacts were generated (research
  run, planning run, indexing run, etc.). Supports reproducible provenance.

Evidence is modeled as two parts: (1) an **ArtifactPart anchor** (what was observed), and (2) an
**Evidence Assertion** (the interpretation/claim about that anchor). This prevents raw sources from
being confused with claims about them.

---

## Running Example: Todo List Feature (Lifecycle Trace)

This document uses a simple Todo List application as a running example to illustrate lifecycle trace
completeness without document genres:

- **Ideation / intent:** "Build a fast, simple Todo List UI."
- **Problem framing:** "Users lose todos if the page reloads." (or "multi-device sync later.")
- **Uncertainties:** "Do we need persistence now?" "Local-only or multi-device?" "Offline-first?"
- **Options:** "LocalStorage," "SQLite," "PostgreSQL," "IndexedDB," "sync provider."
- **Decisions:** "Persist locally now; postpone multi-device sync." "Use Postgres when multi-user is
  added."
- **Requirements:** "Todos persist across reload." "Edits are not lost on crash."
- **Specifications:** "Storage API contract," "migration rules," "edge cases (conflicts, partial
  writes)."
- **Implementation plan:** steps with dependencies (schema → repository layer → UI integration →
  tests → migration path).
- **Implementation:** code symbols/spans linked to spec clauses and requirements.
- **Verification:** tests/checks/manual validations linked back to the commitments they validate.
- **Maintenance / refactor:** later changes must preserve trace (why decisions changed, what was
  superseded, what code was impacted).

The core problem: without an explicit trace spine, the project cannot answer "why does this exist?"
or "what must remain true?" across time and change.

---

## Problems

List each problem discovered. Include failure modes, scenarios, and success signals.

### Problem 1: Epistemic Drift and Decision Loss

Summary: Decisions, rationale, and open uncertainties decay over time because they are not
consistently captured, linked, and updated as the project changes.

**Problem Statement:**

In typical workflows, decisions and their reasoning are scattered across chats, PR comments, docs,
and code history. Over time, the team (or a single user + agent) cannot reliably answer why
something exists, what tradeoffs were considered, what is still unknown, and what is current truth.

**Failure Modes:**

- Decisions exist but have no linked rationale or supporting evidence
- Uncertainties/questions are asked but never recorded or never "closed"
- Requirements are implied in discussion but are not captured as explicit, queryable objects
- Later changes invalidate old decisions but the graph does not reflect this (stale truth)
- Users cannot determine what is "committed" vs "hypothesis" vs "proposal"
- Evidence is vague or incomplete (e.g., "per Slack discussion" with no reference)

**Scenarios / Examples:**

- While building a Todo List app, "persistence" is mentioned casually; weeks later, the project
  cannot explain whether persistence was required, optional, or out of scope.
- A decision to use an ORM is made, but later the code diverges; no one can see that the decision
  was superseded.
- An agent proposes multiple options (Prisma/Knex/Drizzle), but the final choice is not recorded or
  is recorded without linkages to the resolved uncertainty.
- A requirement is stated ("users must see changes immediately"), but 6 months later, code violates
  it without anyone knowing a commitment was broken.

**Resolution Indicators:**

- At any time, users can query: "What decisions are committed, and what uncertainties do they
  resolve?"
- Every committed decision has traceable support (evidence/artifacts) or an explicit waiver
- Superseded decisions are clearly marked and queryable as history
- Users can distinguish current truth vs outdated proposals without reading entire logs
- The system surfaces stale commitments when code or dependencies change

**Impact:**

- High: Causes rework, inconsistent implementations, and loss of trust in documentation
- Affects: Anyone returning to the project after days/weeks; agents that need stable context
- Frequency: Chronic; increases with project duration and complexity

**Non-goals / Boundaries:**

- Not attempting to make all ambiguity disappear; only to make ambiguity explicit and traceable
- Not enforcing a single "right" decision process; only capturing what happened and why

---

### Problem 2: Graph Becomes an Unqueryable Dump (Bloat, Duplication, Noise)

Summary: If nodes for desires/uncertainties/options/evidence are created freely (and are immutable),
the graph can grow without bound and become too large and inconsistent to query, causing the same
decay as document sprawl.

**Problem Statement:**

A system that encourages surfacing uncertainties and research can easily over-produce nodes. Under
an append-only immutability contract, the graph will also accumulate historical versions. Without
strict identity, scoping, retirement semantics, and a first-class concept of "active vs historical,"
users cannot find the signal, and the graph stops functioning as a trusted "project memory."

This problem is not only about raw volume; it is also about semantic collapse: confusing Subjects
with Artifacts, confusing Artifacts with Evidence Assertions, and confusing claims with sources.
When these distinctions blur, duplication increases and query results become unexplainable.

**Failure Modes:**

- Multiple nodes represent the same concept (e.g., "Postgres", "PostgreSQL", "postgres db")
- Redundant uncertainties/options accumulate; none are closed or tiered
- Evidence nodes pile up without clear relevance; "supports" edges become meaningless
- Nodes become "dead" (no longer relevant) but remain indistinguishable from active work
- Historical versions (superseded nodes) swamp "current" results because "active vs historical" is
  not first-class
- Evidence anchors (artifact parts) and evidence assertions (interpretations) are conflated, causing
  noisy or misleading support trails
- Subjects (canonical things) are duplicated or fragmented, making all downstream traceability
  brittle
- Queries return huge, low-quality result sets; users stop using the system

**Scenarios / Examples:**

- Research phase creates separate nodes for every blog, forum thread, and docs page; the project
  cannot tell which evidence actually influenced the decision.
- The system repeatedly creates the same "Do we need persistence?" uncertainty across sessions
  because identity resolution is weak.
- The graph contains many unranked ORM options (Prisma, Knex, Drizzle, Sequelize, TypeORM); users
  cannot tell which ones are viable and which were rejected.
- A user queries "what are we building with Postgres?" and gets 50 results: decisions, options,
  rejected approaches, historical notes, duplicates, and noise.

**Resolution Indicators:**

- Users can query "active uncertainties blocking progress" and get a small, relevant list
- Users can query "canonical concept for Prisma" and see linked aliases/duplicates
- The graph supports retirement/archival semantics without losing history
- Queries can cleanly separate "current active truth" from "historical/superseded" nodes
- Evidence trails remain explainable because anchors and interpretations are not conflated
- Query results remain stable and useful as the graph scales

**Impact:**

- High: If not solved, the system becomes unusable and untrusted
- Affects: All workflows; especially research-heavy projects
- Frequency: Likely inevitable without deliberate controls

**Non-goals / Boundaries:**

- Not eliminating all duplicates automatically; only ensuring they do not break queryability
- Not forcing strict ontologies for all domains; minimize schema sprawl

---

### Problem 3: External Sources vs Internal Code Are Not First-Class Equals

Summary: Traditional systems treat code as "real" and external research as "notes," making it
impossible to query decisions across both uniformly. This includes ingestion asymmetry: repos become
structured graphs, while websites become blobs, forcing repeated rereading and reinterpretation.

**Problem Statement:**

For many engineering decisions (e.g., persistence/ORM/database choices), the rationale lives in
external sources (docs, repos, issues, blogs, StackOverflow). If these sources are not captured and
referenced as first-class, versioned artifacts, decision provenance becomes fragile and
non-auditable.

A critical failure mode is ingestion asymmetry. Code ingestion typically produces a rich, queryable
structure (repo → snapshot → file → symbol/span). External ingestion often produces raw pages,
blobs, or links. This forces agents to repeatedly reread and reinterpret the same external material
at query time, increasing cost, inconsistency, and drift.

**Failure Modes:**

- External sources are stored as raw pages/blobs/links instead of structured, addressable
  ArtifactParts
- Agents must reread and reinterpret the same source repeatedly across queries and sessions
- Different agents derive different conclusions from the same source because interpretation was
  never captured as an Assertion
- Decisions cite vague sources ("Prisma docs") without stable references (URL/version/snapshot)
- Evidence cannot be traced back to specific text, version, or code location
- Evidence references whole pages ("see docs") rather than anchored parts
  (section/paragraph/comment/snippet)
- External sources cannot be queried uniformly as part of lifecycle traces ("show all evidence about
  Prisma migrations")
- Source staleness is invisible; outdated claims persist as if current

**Scenarios / Examples:**

- A decision depends on a feature that existed in a blog post but was later removed/changed; the
  project does not detect staleness.
- The system links to a GitHub repo but not to specific files/issues/releases relevant to the
  decision.
- A user asks "Why did we reject MongoDB?" and the graph cannot show the evidence trail because
  evidence is only "Slack conversation" without specific quotes or references.
- An external docs page gets reorganized; old evidence references point to wrong sections or
  return 404.

**Resolution Indicators:**

- Ingesting an external site yields structured graph outputs analogous to code ingestion (Artifact
  root/state/parts + Subject links + Assertions)
- Raw pages are transient; durable storage is addressable, typed graph nodes rather than "pages"
- Evidence is captured as explicit Evidence Assertions with epistemic typing, anchored to specific
  ArtifactParts
- External artifacts participate uniformly in lifecycle traces and impact analysis (decision →
  evidence → artifact, requirement/spec → code)
- Stale evidence can be detected (source versioning is queryable)

**Impact:**

- High: External sources are critical for justifying architectural decisions; without parity, the
  graph is incomplete
- Affects: Research-heavy projects, teams that cite external patterns/libraries/standards
- Frequency: Very high; external sources are ubiquitous in real projects

**Non-goals / Boundaries:**

- Not building a full web archiver in v1; only ensuring external artifacts are first-class graph
  citizens
- Not solving staleness automatically; only ensuring it is queryable and visible

---

### Problem 4: Multi-Step Plans Lack Dependencies, Granularity, and Completion Tracking

Summary: Even if decisions are recorded, implementation plans are fragmented, unclear on
dependencies, and lack meaningful completion semantics; this causes rework, missed dependencies, and
wrong prioritization.

**Problem Statement:**

Implementation plans bridge decisions and code. Without explicit, queryable representation of plan
steps, their dependencies, and completion status, the team cannot understand the full scope of work,
detect blocked dependencies, sequence execution correctly, or track progress toward commitments.

This is distinct from project management tooling (like Jira); the problem is that plans must be
traceable to the decisions/requirements they implement and must be queryable as part of the
lifecycle.

**Failure Modes:**

- Plans exist as text descriptions without explicit dependency structure
- Team does not know which steps are blocked by upstream work
- Steps reference decisions/requirements vaguely or not at all ("fix database layer" without linking
  to requirement)
- Partial completion is not captured; "done" becomes narrative rather than queryable state
- Plan steps are not linked to the code artifacts they produce (commits, PRs, symbols)
- Rework occurs because dependencies were missed or not enforced
- "Next step" is unclear because the plan is not structured
- Changes to requirements do not flow through to plan; steps become orphaned

**Scenarios / Examples:**

- A plan to build persistence has steps: "schema design", "repository layer", "UI integration",
  "migration path", "tests". Without dependency markup, a developer starts "UI integration" before
  "repository layer" exists.
- A decision is made ("use Postgres"), but the plan does not link steps to that decision; later, the
  decision is challenged because impact is not visible.
- A plan step is "implemented" (code exists), but no link to spec clauses it satisfies; incomplete
  implementation goes unnoticed.
- A requirements change ("now support multi-user"); the plan does not reflect impact, and old steps
  are done but now insufficient.

**Resolution Indicators:**

- Plan steps are explicit, addressable nodes with dependency annotations
- Users can query "what is blocking progress?" and get blocked steps + their dependencies
- Steps are linked to the decisions/requirements/spec clauses they implement
- Partial completion is representable (in progress, blocked, done, verified)
- Step completion can be linked to code artifacts (commits, PRs, code symbols)
- Plan can be traversed in dependency order; "next step" is queryable
- Changes to requirements/decisions flow through to plan; impact is visible

**Impact:**

- High: Plans are the bridge from decisions to execution; gaps here break the entire trace
- Affects: Any project with >1 step of work; especially complex features
- Frequency: Chronic on any project with coordination requirements

**Non-goals / Boundaries:**

- Not building full project management (scheduling, resource allocation, Gantt charts); only
  ensuring plans are queryable and linked
- Not enforcing specific project methodologies; focus is on traceability and dependency awareness

---

### Problem 5: External Ingestion Asymmetry and Source Staleness

Summary: Websites, documentation, and external code repos are ingested as raw blobs instead of
structured, versioned artifacts with queryable parts. This forces repeated reinterpretation and
hides staleness.

**Problem Statement:**

When external sources (blog posts, documentation, GitHub repos, libraries) are ingested, they are
typically stored as links, blobs, or raw pages rather than structured artifacts with identifiable
parts. This means:

1. Agents must reread the entire source to answer specific questions (e.g., "what did the Prisma
   docs say about migrations in v2.5?")
2. Different sessions may derive different interpretations because interpretation is query-time, not
   captured
3. Source updates and staleness are invisible; old citations persist as if current
4. External and internal artifacts cannot be queried uniformly

**Failure Modes:**

- External sources are stored as links or raw text blobs without stable, versioned structure
- Query-time agents must parse and interpret raw external content repeatedly
- Same source cited in different contexts; inconsistent interpretation across evidence
- Snapshot staleness is invisible (no version/timestamp on external artifacts)
- Cannot query "all evidence from Prisma docs v2.5" or "why did we cite this blog post?"
- Ingestion is asymmetric: code ingestion produces rich structure (repo → commit → file → span); web
  ingestion produces blobs

**Scenarios / Examples:**

- A decision cites "Prisma docs" for a feature, but the docs change in v3.0; decision is now based
  on outdated info and nobody knows.
- An agent reads a blog post and derives 5 conclusions; a different agent reads the same post later
  and derives different conclusions; evidence trail is inconsistent.
- A user asks "What evidence do we have about MongoDB reliability?" and the system returns raw blog
  post blobs with no clear search/anchor points.

**Resolution Indicators:**

- External artifact ingestion mirrors code ingestion: versioned root → snapshot → addressable parts
  (sections, quotes, code samples)
- Interpretations (Evidence Assertions) are captured once; they reference specific artifact parts,
  not raw blobs
- Source versions and timestamps are first-class; staleness is visible in queries
- Users can query "evidence from source X version Y" or "all evidence citing this artifact part"

**Impact:**

- High: External sources justify decisions; without parity, provenance is fragile
- Affects: Research-driven projects; any project that depends on external
  libraries/patterns/standards
- Frequency: Very high; external citations are ubiquitous

**Non-goals / Boundaries:**

- Not archiving entire websites; only ensuring ingested parts are versioned and queryable
- Not solving staleness detection automatically; only ensuring it is visible and queryable

---

### Problem 6: Lifecycle Fragmentation (Intent → Commitments → Execution Trace is Broken)

Summary: Even if decisions, evidence, and code exist separately, the system fails if it cannot
preserve continuity across the full lifecycle of intent → commitment → execution. Document genres
(ideation/RFC/ADR/spec) recreate siloed knowledge.

**Problem Statement:**

Traditional workflows split lifecycle knowledge into different document genres (ideation notes,
problem statements, RFC/XRFC exploration, ADRs, requirements, specs, implementation plans). If the
graph does not explicitly model equivalent lifecycle units and their linkages, the project will
recreate document sprawl inside the graph: ideation becomes disconnected from decisions,
requirements detach from rationale, specifications drift from requirements, plans drift from specs,
and code loses its "why."

This problem is distinct from "decision loss" or "plan representation" alone: it is about the
completeness of the trace spine that connects early intent to final code and verification.

**Failure Modes:**

- Ideation/desires exist but do not drive explicit problems, requirements, or decisions
- Decisions exist but do not flow into requirements/spec clauses and therefore cannot be implemented
  consistently
- Requirements exist but are not refined into spec-level commitments (interfaces, invariants, edge
  cases)
- Specifications exist but are not grounded in requirements; spec and code diverge
- Plan steps exist but are not grounded in requirements/spec/decisions; they become floating tasks
- Code artifacts exist but are not linked to the spec/requirements they implement; "why does this
  exist?" cannot be answered
- Verification/acceptance evidence (tests, checks, manual validation) is absent or not linked back
  to the commitments it validates
- Users cannot reconstruct the lifecycle story without re-reading large amounts of text content
- Refactoring breaks requirements because the link to spec/requirement is unknown

**Scenarios / Examples:**

- A Todo List app begins with an ideation desire ("simple local-first UX"), but later decisions and
  requirements do not preserve it; implementation optimizes the wrong target.
- A persistence decision is recorded, but no requirement/spec clause captures acceptance criteria
  (e.g., "todos persist across reloads"), so implementation and tests diverge.
- A multi-step plan is created, but steps do not reference the spec clauses they are meant to
  satisfy; execution becomes sequence-following rather than correctness-following.
- A refactor changes storage behavior; no one can see that it violates the original requirement
  because requirement and code are not linked.

**Resolution Indicators:**

- The graph supports an end-to-end trace query: Desire → Problem → Uncertainty → Option → Decision →
  Requirement → SpecClause → PlanStep → CodeSpan/Symbol → Verification Evidence
- Users can answer "what are we trying to achieve?" and "what did we build?" and see the link
  between them without manual reconstruction
- Lifecycle views can be generated without introducing `doc_type` as an ontology dimension
- Gaps in the trace spine are detectable (missing links are queryable as violations or warnings)
- Refactor impact can be evaluated against lifecycle trace ("what requirements does this code
  satisfy?")

**Impact:**

- Very High: Lifecycle fragmentation recreates the same failure modes as documents, but harder to
  notice
- Affects: All stages, especially iterative projects with refactors and changing priorities
- Frequency: Inevitable unless explicitly addressed as a first-class problem

**Non-goals / Boundaries:**

- Not recreating RFC/ADR/spec documents as types; only preserving the information and linkages as
  nodes
- Not forcing a single methodology; only enforcing minimal trace continuity

---

### Problem 7: Specification Drift, Ambiguity, and Under-Specification

Summary: Requirements and decisions are insufficient to prevent rework and divergence unless
specification-level commitments (interfaces, invariants, edge cases) are captured in a queryable,
maintainable way.

**Problem Statement:**

Projects frequently fail between "requirements" and "implementation" because the spec layer is
either missing, too implicit, or overwritten by code reality. Even if requirements and decisions are
recorded, the system cannot ensure consistent implementation or safe refactoring if it cannot
represent precise behavior, contracts, invariants, and edge cases.

This is distinct from plan representation: a plan can be dependency-correct yet still implement the
wrong or incomplete behavior if the spec layer is ambiguous.

**Failure Modes:**

- Requirements exist but are not refined into concrete behavioral commitments (inputs/outputs,
  invariants, error modes)
- "Spec" content is stored as free text without stable, addressable clauses; cannot be linked to
  code spans or tests
- Spec clauses drift silently during implementation; code becomes the de facto spec without
  traceability
- Invariants and edge cases are discovered late (or in production) because they were never made
  explicit
- Refactors change externally observable behavior because spec obligations were not queryable
- Spec is written but implementation diverges; no one notices the gap

**Scenarios / Examples:**

- Todo persistence is a requirement, but the spec never defines conflict handling or partial-write
  behavior; later changes introduce data loss without detection.
- A storage abstraction is implemented, but its contract is unclear; multiple parts of the codebase
  use it inconsistently.
- Performance constraints are intended ("fast UI"), but no spec-level commitments exist to prevent
  regressions.
- A refactor optimizes one code path but breaks a hidden spec assumption that only the original
  author knew.

**Resolution Indicators:**

- Specification-level commitments are representable as addressable units that can be linked to
  requirements, plan steps, code, and verification
- Users can query "which code spans implement spec clause X?" and "which spec clauses are
  unimplemented or unverified?"
- Refactor impact can be evaluated against explicit spec obligations
- Spec and code divergence is detectable (coverage gaps)

**Impact:**

- High: Specs are where correctness, interoperability, and refactor safety are preserved
- Affects: Any non-trivial system, especially with evolving APIs and data schemas
- Frequency: Common; often the main reason requirements do not translate into correct
  implementations

**Non-goals / Boundaries:**

- Not forcing formal methods in v1; only ensuring spec obligations are explicit and linkable
- Not mandating a particular spec writing style; focus is queryability and trace continuity

---

### Problem 8: Verification and Acceptance Evidence Is Missing or Unlinked

Summary: Without explicit verification/acceptance evidence linked to requirements/spec clauses, the
graph cannot prove that commitments are satisfied, and "done" becomes narrative.

**Problem Statement:**

Engineering work is validated via tests, checks, manual validations, performance benchmarks, and
production observations. If these are not represented as first-class, linkable objects, the system
cannot answer whether a requirement/spec clause is satisfied, when it was last validated, and what
evidence supports that claim.

This problem is distinct from external provenance: it concerns internal proof of correctness
relative to commitments.

**Failure Modes:**

- Requirements/spec clauses exist, but there is no linked proof (tests/checks/manual validations)
- Tests exist, but are not mapped to the commitments they validate (hard to know coverage)
- Verification becomes stale (tests removed, behavior changes), but the graph still implies
  satisfaction
- "Acceptance" is recorded informally (chat/notes) and cannot be audited
- Performance and non-functional commitments are not verifiable (no benchmarks, no regression
  signals)
- When a requirement changes, old verification evidence is not invalidated; stale proof persists

**Scenarios / Examples:**

- Requirement: "Todos persist across reload." Implementation exists, but no test proves it; later
  refactor breaks it.
- Spec clause: "Migration must be backward compatible." No check exists, so a migration breaks
  existing users.
- Performance intent exists, but there is no measurable evidence; regressions go unnoticed.
- A requirement is superseded (new requirement is more strict), but old tests still pass; team
  thinks the commitment is satisfied.

**Resolution Indicators:**

- Users can query "what evidence validates requirement/spec clause X?" and "what commitments lack
  evidence?"
- Verification can be time-scoped ("as-of truth"): when was this last validated and against which
  source state?
- The system can surface stale verification (e.g., evidence older than current committed truth)
- Verification evidence (test code/checks) is linked to the specific commitments it validates
- Coverage gaps are queryable ("which spec clauses have no linked tests?")

**Impact:**

- Very High: Verification gaps destroy trust and make the graph's commitments non-actionable
- Affects: Delivery, maintenance, refactoring safety, and confidence in decision correctness
- Frequency: High; appears immediately in real projects

**Non-goals / Boundaries:**

- Not enforcing a specific testing framework; only making validation explicit and queryable
- Not guaranteeing complete proof; only ensuring gaps are visible

---

### Problem 9: Query Usability, Explainability, and Stable Views Without Doc-Types

Summary: A graph can be theoretically queryable but practically unusable if users cannot reliably
ask, interpret, and trust the answers—especially when replacing familiar document genres with
graph-native views.

**Problem Statement:**

The system's success depends on users repeatedly retrieving lifecycle context (why, what, how,
what's next) without rereading large text bodies. If the system relies on query-time rereading and
reinterpretation to determine relevance, it becomes a "document store with extra steps," and cost
and inconsistency scale with corpus size.

To be operational, the graph must answer most lifecycle questions by deterministic traversal over
structured nodes. This requires "ingest to graph" discipline: raw inputs (web/code) are transient;
durable knowledge is stored as linked, typed, addressable nodes and short assertions (including
Evidence Assertions with epistemic typing) rather than raw pages.

If query interfaces and view generation are weak, the graph becomes a dumping ground: information
exists but cannot be operationalized. This problem is amplified by the deliberate removal of
doc-types (RFC/ADR/spec), which users traditionally rely on for navigation.

**Failure Modes:**

- Users cannot express common lifecycle questions without complex graph knowledge
- Query results are too large, ambiguous, or missing explanations ("why did this result appear?")
- Query-time agents must reread long text bodies to answer common questions (relevance is recomputed
  each time)
- Different runs yield different answers because interpretation is recomputed rather than traversed
- The system cannot generate stable lifecycle views (ideation summary, decision record, spec
  obligations, plan readiness) without reintroducing doc-types implicitly
- Saved queries/views break as the graph evolves (schema drift, naming drift)
- Users lose trust due to inconsistent answers across time (e.g., current vs as-of truth confusion)

**Scenarios / Examples:**

- A user asks "What is the current plan for persistence?" and gets a noisy mix of options,
  superseded decisions, and partial steps without clear sorting.
- A user asks "Why are we using Prisma?" and receives evidence without prioritization, context, or
  the resolved uncertainty they answer.
- A refactor happens; the user cannot query what requirements/spec clauses are at risk without
  complex manual analysis.
- A new team member asks "What have we already tried for caching?" and the system returns 100 nodes
  with no clear "current" vs "historical" distinction.

**Resolution Indicators:**

- Common lifecycle queries are easy to run and return explainable results
- The system can generate stable, document-like views (as outputs) without `doc_type` as an ontology
  dimension
- Users can filter by epistemic posture (proposal vs committed), time-scope (as-of), and provenance
  strength
- Results include provenance metadata (who, when, why included)
- Query results are deterministic and consistent across time

**Impact:**

- Very High: Without usable queries and views, the system fails adoption regardless of data
  completeness
- Affects: All stages, especially maintenance and onboarding back into a project
- Frequency: Inevitable; becomes the limiting factor once the graph grows

**Non-goals / Boundaries:**

- Not designing UI in this document; only identifying the failure mode
- Not requiring a particular query language; focus is that the system must remain usable

---

## Success Signals (System Level)

What does "solved" look like from the user's perspective?

- Ingesting a website or a code repository both result in fully linked, queryable graph structures
- Raw inputs are transient; durable knowledge exists only as graph nodes and relationships
- Agents do not need to reread source text to answer common lifecycle questions
- Decisions, requirements, and specs reference explicit Evidence Assertions, not raw pages
- The cost of answering "why" or "what is impacted" does not grow with corpus size

- Users can answer "why does this exist?" for code and decisions via graph queries
- Decisions and their rationale remain correct as the project evolves (history preserved)
- External sources and internal code are equally queryable and traceable
- Implementation plans are actionable and dependency-aware; "next steps" is queryable
- The graph scales without collapsing into noise; active work remains distinguishable
- Users (and agents) can query deterministic "current committed truth" and time-scoped "as-of" truth
  for high-value nodes
- Provenance remains auditable under conservative retention constraints (weak provenance is explicit
  and queryable)
- Multi-writer conflicts (duplicates, contradictions, supersession ambiguity) are detectable and do
  not silently corrupt "current truth"
- Users can traverse an end-to-end lifecycle trace (intent → commitments → plan → code →
  verification) without relying on document genres
- Every query answer includes explicit lens metadata and the selected version set (current vs as-of)

---

## Assumptions

Facts we're assuming but haven't validated.

- Single-user + agent workflows can achieve correctness with minimal invariants and validation
- Users will tolerate creating/maintaining some links if the system provides strong automation
- Representing external sources as artifacts is feasible without full web archiving in v1
- Code can be indexed to a granularity sufficient for "decision-to-code" traceability
- **RESOLVED:** Transaction-time "as-of" semantics for "current vs as-of" truth are required for
  high-value nodes (decisions/requirements/plans). Valid-time (full bitemporal) semantics are out of
  scope for v1.
- Conservative external content retention (minimal excerpts + stable references + hashes) is
  sufficient to preserve audit intent in most cases
- Multiple agents can write to the graph across sessions without manual cleanup being the dominant
  maintenance activity
- **RESOLVED:** All nodes are immutable (append-only). Updates are represented as new nodes linked
  via supersession; overwrites are forbidden.

---

## Unknowns

Questions that need answering before building.

- What is the minimum set of node types and invariants that prevents drift without taxonomy sprawl?
- How should "value tiers" / importance levels be represented and used (visibility, retention,
  required links)?
- What level of snapshotting is required for external sources (URL + version vs conservative
  excerpt/hashes vs full content capture)?
- How will deduplication identity work across concepts and sources (aliases, same-as,
  canonicalization)?
- What plan-step granularity is necessary for usefulness without becoming project-management
  overhead?
- **RESOLVED (2026-01-22):** Transaction-time "as-of" lens for commitments + source states
  referenced by evidence; no valid-time semantics in v1. Remaining: define the canonical selection
  rules for current vs as-of, and conflict behavior under divergent supersession chains.
- How should retention policy be represented as queryable facts (e.g., reference-only vs
  excerpt-backed vs full-copy provenance) without turning policy into implicit doc-types?
- What are the minimum conflict types to detect for multi-writer concurrency (duplicate identity,
  contradictory commitments, supersession ambiguity, partial writes)?
- What is the minimum end-to-end trace spine that must exist to claim lifecycle coverage (which
  links are mandatory vs best-effort)?
- How should "specification-level" commitments be represented without introducing doc-types (e.g.,
  SpecClause facet vs dedicated node type), while staying queryable and comparable?
- What counts as "verification evidence" in v1 (tests, checks, manual validations), and how should
  it link back to requirements/spec clauses?
- What are the core lifecycle query categories the system must support
  (ideation→decision→requirements→spec→plan→code→maintenance), and what constitutes an acceptable
  user experience for those queries?
- With global node immutability, what is the minimal representation for "state changes" (e.g., plan
  step status, acceptance) that stays queryable and avoids event/chain explosion?
- What is the mandatory lens metadata envelope returned by queries (fields, IDs, version selection
  summary), and how is it enforced across agent outputs?

---

## Related Problems

Other problems that interact with these.

- Search and retrieval UX (separate ideation doc)
- Indexing + incremental updates across repos and external sources
- Agent reliability (agents forgetting how to use the system)
- Access control / privacy for captured external and internal artifacts

---

## Document Metadata

```yaml
id: IDEATION-PROBLEMS-graph-knowledge-system
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: project-memory
feature: graph-knowledge-system
problems_count: 9
related_ideation:
  [IDEATION-EXPERIENCE-graph-knowledge-system, IDEATION-UNKNOWNS-graph-knowledge-system]
drives_to: REQ-graph-knowledge-system
keywords:
  [
    project-memory,
    graph,
    knowledge-system,
    decisions,
    traceability,
    lifecycle,
    specifications,
    verification,
    external-sources,
  ]
```
