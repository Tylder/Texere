# IDEATION-PROBLEMS: Graph-based Knowledge System

## TLDR

Summary: Today, decisions and rationale decay or become untraceable because information is
fragmented across documents, chats, and code. A graph approach can fix this only if it avoids
taxonomy sprawl, enforces epistemic lineage, keeps external sources structurally similar to internal
code, and represents multi-step implementation plans with dependencies and provenance.

**What:** Identify and document the core problems that a graph-based project memory must solve.

**Why:** Without a precise problem map, the system will either (a) become an unqueryable dump, or
(b) become an over-typed, brittle schema that cannot evolve.

**How:** Capture failure modes, concrete scenarios, and success signals—no solution design.

**Status:** Draft (discovery in progress)

**Critical questions to answer:**

- What must be queryable at any time (and at what granularity)?
- What invariants must hold to prevent drift (decisions without rationale, plans without
  dependencies, etc.)?
- What is the minimum schema that still prevents ambiguity and decay?

---

## Scope

Summary: Real failure modes and user frustrations; not solutions or design details.

**Includes:**

- Problems and failure modes in capturing projects as nodes
  (desires/uncertainties/options/decisions/etc.)
- Traceability gaps between decisions, evidence, external sources, and code
- Plan representation problems (multi-step plans, dependencies, partial completion, revisions)
- Graph bloat / duplication / inconsistency problems that destroy queryability
- Success signals (what “good” looks like)

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

### Node Categories (Justification, Not Schema)

This project will inevitably require a small, stable set of node categories to keep the graph
queryable and to prevent semantic drift. These categories are not “document types.” They exist to
ensure that queries, invariants, and provenance are stable as the graph grows.

The categories below are treated as conceptual classes; concrete schema details
(labels/enums/required edges) are deferred to Requirements.

- **Subject (canonical thing):** The stable “thing” the project talks about across time (e.g.,
  Persistence, ORM, Prisma, Todo List Feature). Needed to avoid synonym/duplicate fragmentation and
  to anchor lifecycle trace across internal and external information.
- **Artifact (verifiable source material):** Internal or external material in a versioned state
  (repo snapshot, docs snapshot, file, symbol/span, doc section, issue/thread). Needed so evidence
  and decisions can cite stable references and so internal code and external sources are first-class
  equals.
- **Assertion (lifecycle statement):** Intent, uncertainty, evaluation, commitment, plan, and
  validation units (desire/problem/option/decision/requirement/spec/plan-step/verification). Needed
  to represent the lifecycle trace spine without reintroducing document genres.
- **Agent (actor):** The human or automated writer responsible for producing assertions and
  artifacts.
- **Activity (run/session):** The run context in which assertions/artifacts were generated (research
  run, planning run, indexing run, etc.). Needed to debug multi-writer drift under immutability and
  to support reproducible provenance.

Evidence is modeled as two parts: (1) an **ArtifactPart anchor** (what was observed), and (2) an
**Evidence Assertion** (the interpretation/claim about that anchor). This prevents raw sources from
being confused with claims about them.

### System Goal

A project should be fully documented as Nodes across the full lifecycle (ideation → problems →
exploration → decisions → requirements → specifications → multi-step implementation plans →
implementation → verification), where every decision and commitment is stored, can be traced to
evidence and artifacts (including external sources and code), and remains queryable over time as the
project evolves.

The system must support the “expansion” workflow (e.g., a Todo List feature causes the system to
surface uncertainties like persistence needs, then research options like ORM/database choices, then
record decisions and implementation steps). The design challenge is enabling this without making the
graph noisy, inconsistent, schema-brittle, or fragmented across lifecycle stages.

---

## Resolved Decisions and Constraints

This document is primarily a problem definition. However, several foundational decisions are already
locked because they are required for traceability, debugging, and stable querying. These are
included here to avoid contradictions and to inform later Requirements.

### High-level principles

- Lifecycle coverage is required (ideation → problems → exploration → decisions → requirements →
  specifications → plans → implementation → verification → maintenance).
- Internal code and external sources must be first-class equals for provenance and querying.
- The graph must remain usable at scale via active vs historical distinction and stable views
  (without doc-types).

### Time lens, immutability, and provenance

- **All nodes are immutable (append-only).** Updates create new nodes; history remains queryable.
- **Supersession is explicit.** “Current truth” is the latest non-superseded committed version;
  ambiguity breaks determinism.
- **Transaction-time as-of lens.** “As-of T” means “recorded/committed at or before T.” No
  valid-time semantics in v1.
- **As-of scope.** At minimum: commitments (decisions/requirements/spec clauses/plans/plan steps)
  plus artifact/source states referenced by evidence.
- **Lens metadata is mandatory.** Every query answer must disclose the lens (current/as-of),
  timestamp (if as-of), selection rule, and selected versions.
- **Provenance is explicit.** Agents and Activities are first-class so multi-writer drift and
  partial context failures can be debugged.

### Projections (for usability under immutability)

- Canonical nodes remain immutable; **derived projections/views may be mutable or recomputable** and
  are explicitly marked as non-truth. This prevents query cost explosion and avoids forcing
  write-hot “state” into version chains.

---

## Running Example: Todo List Feature (Lifecycle Trace)

This document uses a simple Todo List application as a running example to illustrate lifecycle trace
completeness without document genres.

- **Ideation / intent:** “Build a fast, simple Todo List UI.”
- **Problem framing:** “Users lose todos if the page reloads.” (or “multi-device sync later.”)
- **Uncertainties:** “Do we need persistence now?” “Local-only or multi-device?” “Offline-first?”
- **Options:** “LocalStorage,” “SQLite,” “PostgreSQL,” “IndexedDB,” “sync provider.”
- **Decisions:** “Persist locally now; postpone multi-device sync.” “Use Postgres when multi-user is
  added.”
- **Requirements:** “Todos persist across reload.” “Edits are not lost on crash.”
- **Specifications:** “Storage API contract,” “migration rules,” “edge cases (conflicts, partial
  writes).”
- **Implementation plan:** steps with dependencies (schema → repository layer → UI integration →
  tests → migration path).
- **Implementation:** code symbols/spans linked to spec clauses and requirements.
- **Verification:** tests/checks/manual validations linked back to the commitments they validate.
- **Maintenance / refactor:** later changes must preserve trace (why decisions changed, what was
  superseded, what code was impacted).

The core problem: without an explicit trace spine, the project cannot answer “why does this exist?”
or “what must remain true?” across time and change.

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
- Uncertainties/questions are asked but never recorded or never “closed”
- Requirements are implied in discussion but are not captured as explicit, queryable objects
- Later changes invalidate old decisions but the graph does not reflect this (stale truth)
- Users cannot determine what is “committed” vs “hypothesis” vs “proposal”

**Scenarios / Examples:**

- While building a Todo List app, “persistence” is mentioned casually; weeks later, the project
  cannot explain whether persistence was required, optional, or out of scope.
- A decision to use an ORM is made, but later the code diverges; no one can see that the decision
  was superseded.
- An agent proposes multiple options (Prisma/Knex/Drizzle), but the final choice is not recorded or
  is recorded without linkages.

**Resolution Indicators:**

- At any time, users can query: “What decisions are committed, and what uncertainties do they
  resolve?”
- Every committed decision has traceable support (evidence/artifacts) or an explicit waiver
- Superseded decisions are clearly marked and queryable as history
- Users can distinguish current truth vs outdated proposals without reading entire logs

**Impact:**

- High: Causes rework, inconsistent implementations, and loss of trust in documentation
- Affects: Anyone returning to the project after days/weeks; agents that need stable context
- Frequency: Chronic; increases with project duration and complexity

**Non-goals / Boundaries:**

- Not attempting to make all ambiguity disappear; only to make ambiguity explicit and traceable
- Not enforcing a single “right” decision process; only capturing what happened and why

---

### Problem 2: Graph Becomes an Unqueryable Dump (Bloat, Duplication, Noise)

Summary: If nodes for desires/uncertainties/options/evidence are created freely (and are immutable),
the graph can grow without bound and become too large and inconsistent to query, causing the same
decay as document sprawl.

**Problem Statement:**

A system that encourages surfacing uncertainties and research can easily over-produce nodes. Under
an append-only immutability contract, the graph will also accumulate historical versions. Without
strict identity, scoping, retirement semantics, and a first-class concept of “active vs historical,”
users cannot find the signal, and the graph stops functioning as a trusted “project memory.”

This problem is not only about raw volume; it is also about semantic collapse: confusing Subjects
with Artifacts, confusing Artifacts with Evidence Assertions, and confusing claims with sources.
When these distinctions blur, duplication increases and query results become unexplainable.

**Failure Modes:**

- Multiple nodes represent the same concept (e.g., “Postgres”, “PostgreSQL”, “postgres db”)
- Redundant uncertainties/options accumulate; none are closed or tiered
- Evidence nodes pile up without clear relevance; “supports” edges become meaningless
- Nodes become “dead” (no longer relevant) but remain indistinguishable from active work
- Historical versions (superseded nodes) swamp “current” results because “active vs historical” is
  not first-class
- Evidence anchors (artifact parts) and evidence assertions (interpretations) are conflated, causing
  noisy or misleading support trails
- Subjects (canonical things) are duplicated or fragmented, making all downstream traceability
  brittle
- Queries return huge, low-quality result sets; users stop using the system

**Scenarios / Examples:**

- Research phase creates separate nodes for every blog, forum thread, and docs page; the project
  cannot tell which evidence actually influenced the decision.
- The system repeatedly creates the same “Do we need persistence?” uncertainty across sessions
  because identity resolution is weak.
- The graph contains many unranked ORM options; users cannot tell which ones are viable and which
  were rejected.

**Resolution Indicators:**

- Users can query “active uncertainties blocking progress” and get a small, relevant list
- Users can query “canonical concept for Prisma” and see linked aliases/duplicates
- The graph supports retirement/archival semantics without losing history
- Queries can cleanly separate “current active truth” from “historical/superseded” nodes
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

Summary: Traditional systems treat code as “real” and external research as “notes,” making it
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

For this system, “ingest to graph” must mean the same thing for external sources as it does for code
repositories: raw input is transient; durable output is a structured, addressable set of graph nodes
(Subjects, Artifact roots/states/parts, and Assertions). Interpretations of sources must be captured
once as Evidence Assertions with epistemic typing, anchored to specific ArtifactParts, and linked
into the lifecycle trace spine.

**Failure Modes:**

- External sources are stored as raw pages/blobs/links instead of structured, addressable
  ArtifactParts
- Agents must reread and reinterpret the same source repeatedly across queries and sessions
- Different agents derive different conclusions from the same source because interpretation was
  never captured as an Assertion
- Decisions cite vague sources (“Prisma docs”) without stable references (URL/version/snapshot)
- Evidence cannot be traced back to specific text, version, or code location
- Evidence references whole pages (“see docs”) rather than anchored parts
  (section/paragraph/comment/snippet)
- External sources cannot be queried uniformly as part of lifecycle traces (“show all evidence about
  Prisma migrations”)
- Source staleness is invisible; outdated claims persist as if current

**Scenarios / Examples:**

- A decision depends on a feature that existed in a blog post but was later removed/changed; the
  project does not detect staleness.
- The system links to a GitHub repo but not to specific files/issues/releases relevant to the
  decision.
- A user asks “Why did we reject MongoDB?” and the graph cannot show the evidence trail.

**Resolution Indicators:**

- Ingesting an external site yields structured graph outputs analogous to code ingestion (Artifact
  root/state/parts + Subject links + Assertions)
- Raw pages are transient; durable storage is addressable, typed graph nodes rather than “pages”
- Evidence is captured as explicit Evidence Assertions with epistemic typing, anchored to specific
  ArtifactParts
- External artifacts participate uniformly in lifecycle traces and impact analysis (decision →
  evidence → artifact, requirement/spec → code)
- Evidence items can be traced to a stable reference (URL + version, commit hash, snapshot)
- Users can query “decisions influenced by source X” and “sources influencing decision Y”
- Staleness signals exist (retrieved date/version, optional re-validation status)

**Impact:**

- High: Without this, the system cannot meet the “trace every decision” goal
- Affects: Any feature requiring research and technology selection
- Frequency: Common in most non-trivial engineering projects

**Non-goals / Boundaries:**

- Not guaranteeing external sources remain available forever; only capturing enough to preserve
  provenance
- Not building a web archiver in v1; just ensuring stable references and optional snapshots

---

### Problem 4: Implementation Plans Are Hard to Represent as Executable, Queryable Graph Objects

Summary: Multi-step implementation plans require dependencies, sequencing, partial completion, and
revision history; document-based plans become stale and cannot be reliably queried.

**Problem Statement:**

Implementation plans often contain multiple steps, each with prerequisites, references (to
requirements/decisions/code), and completion status. In practice, plans evolve: steps split,
reorder, merge, or become obsolete. Without a first-class plan representation, “what to do next” and
“why this step exists” are not queryable.

**Failure Modes:**

- Plan steps exist only as text; dependencies are implicit and therefore unqueryable
- Completed work cannot be reconciled against the plan (plan drift)
- Plan steps cannot be traced back to the decisions/requirements they implement
- Users cannot determine critical path, blockers, or readiness conditions
- Revisions overwrite history; earlier intent is lost

**Scenarios / Examples:**

- A plan says “Add persistence,” but does not break down schema, migrations, repository layer,
  tests; dependencies are unclear.
- A later refactor changes the approach (e.g., switch ORM), but existing plan steps remain and
  confuse execution.
- The user asks “What steps depend on the Prisma decision?” and cannot answer.

**Resolution Indicators:**

- Plans and steps can be queried: dependencies, blockers, readiness, critical path
- Each plan step can reference requirements/decisions/evidence and relevant artifacts
- Plan revisions preserve history via supersession, not overwrite
- Users can query “next actionable steps” filtered by prerequisites satisfied

**Impact:**

- High: Execution becomes inconsistent; planning becomes performative rather than operational
- Affects: Any non-trivial feature implementation
- Frequency: Common as soon as plans exceed \~5–10 steps

**Non-goals / Boundaries:**

- Not building a full project-management suite in v1
- Not solving team coordination; focus on single-user + agent correctness first

---

### Problem 5: Weak Invariants Allow Inconsistent Graph States

Summary: Without enforceable invariants, the graph will contain broken lineage (e.g., decisions that
resolve nothing), making “traceability” claims false.

**Problem Statement:**

The system intends to store everything as nodes, but that only works if certain relationships are
consistently present and validated (e.g., decisions must resolve uncertainties; requirements must
derive from desires/decisions; plan steps must depend on something explicit). Otherwise, the graph
becomes internally inconsistent.

**Failure Modes:**

- Decision nodes exist without stating what uncertainty/problem they resolve
- Evidence exists but is not connected to the claims it supports
- Requirements exist without derivation links; their origin is unclear
- Plan steps exist without dependencies or references; they are “floating tasks”
- Supersession history is missing or cycles; current truth cannot be determined

**Scenarios / Examples:**

- A “Use Prisma” decision is recorded, but no one knows whether it was chosen for migrations,
  type-safety, performance, or ecosystem.
- A requirement “offline-first” appears but is not linked to any desire or user statement.
- A plan step “Add caching” exists but is not tied to a problem, requirement, or evidence.

**Resolution Indicators:**

- The system can validate a project graph and report invariant violations
- Users can query for “dangling decisions/requirements/plan steps” and get zero or an explicit list
- “Current truth” can be determined mechanically (latest non-superseded committed nodes)

**Impact:**

- High: Invariants are the difference between an auditable system and a narrative illusion
- Affects: All queries, trust, and automation
- Frequency: Will happen often if agents are responsible for correctness without guardrails

**Non-goals / Boundaries:**

- Not enforcing a single methodology; invariants should be minimal but essential
- Not blocking progress on every missing link; allow explicit waivers but make them queryable

---

### Problem 6: Temporal Validity and “As-Of” Truth

Summary: Even with preserved history, the system becomes misleading if it cannot distinguish what
was believed when a decision was made versus what is believed now.

**Problem Statement:**

A project graph will accumulate superseded decisions, revised requirements, and changing external
research. Users and agents will repeatedly ask time-scoped questions (“What did we believe on the
day we committed to X?” “What is the current committed truth?”). Without explicit time-lens
semantics, the graph can return correct-looking but time-wrong answers.

This project has explicitly chosen a **transaction-time** lens for v1: “as-of T” means “what was
recorded/committed at or before T,” not “what was intended to be true starting at T.” If queries do
not apply this lens consistently (and do not disclose it in results), the system will produce
misleading answers even if history exists.

**Failure Modes:**

- Users cannot answer “as-of” questions without manually reconstructing timelines
- Superseded nodes remain discoverable but are indistinguishable from current truth in common
  queries
- External research changes, but historical decisions continue to appear justified by evidence that
  no longer applies
- Code changes invalidate earlier assumptions, but prior requirements/decisions still look active
- Agents use stale committed nodes because “current truth” selection logic is ambiguous
- Query answers omit explicit lens metadata; users and agents misinterpret results (current vs
  as-of)
- Different agents compute “current truth” differently (query drift), producing inconsistent answers
- Updates are recorded without explicit supersession (or via overwrites), preventing deterministic
  truth selection under the immutability contract

**Scenarios / Examples:**

- A persistence decision is made based on an ORM feature that existed at the time; months later, the
  feature changes, but the graph still presents the decision as supported without clarifying “as-of”
  context.
- A plan step is marked complete, but later refactors negate it; without time-scoping, the graph
  cannot cleanly answer “what was done vs what is still true.”
- A user asks “Why did we choose Prisma then?” and the system cannot cleanly separate “then-true
  evidence” from current evaluation.

**Resolution Indicators:**

- Users can query “current committed truth” deterministically
- Users can query “as-of <T> committed truth” for decisions/requirements and get a consistent view
- The time lens is explicit: transaction-time “as-of” semantics apply consistently (no hidden
  valid-time interpretation)
- Query results include explicit lens metadata (current vs as-of, timestamp, selection rule,
  selected versions)
- As-of selection applies at minimum to commitments and to source states referenced by evidence
- The system can surface staleness risks (“this evidence is old relative to current state”)
- Agents can operate with an explicit “as-of” context to avoid accidental drift

**Impact:**

- High: Without time semantics, traceability becomes selectively true and operationally misleading
- Affects: Long-running projects, external research-heavy work, and any iterative refactor/rewrite
- Frequency: Increases with time; becomes inevitable once multiple revisions exist

**Non-goals / Boundaries:**

- Not attempting to fully solve historical reconstruction of every artifact in v1
- Not requiring perfect archival of all sources; only explicit time-scoping semantics for truth
- Not modeling valid-time semantics (effective dates / retroactive timelines) in v1
- Not requiring strict “as-of” semantics for every low-tier exploratory node in v1; prioritize
  commitments + provenance anchors

---

### Problem 7: Legal/IP Constraints and Retention Limits Undermine Provenance

Summary: A traceable graph needs durable provenance, but retaining external content can create
legal/IP risk. Conservative retention reduces risk but can reduce auditability if not explicitly
modeled.

**Problem Statement:**

External sources (docs, blogs, forums, issues) often contain the rationale for decisions. However,
storing full-text snapshots may conflict with licensing/copyright or create unwanted redistribution
risk. If the system retains only links, provenance becomes brittle (links rot, content changes). The
project needs a way to preserve provenance while respecting conservative retention constraints.

**Failure Modes:**

- Provenance relies on URL-only references; evidence becomes unverifiable as pages change or
  disappear
- Attempts to snapshot content create legal/IP uncertainty, preventing the system from being used or
  shared
- Evidence is captured as long quotes or copied text that is not safe to store or reuse
- Source terms change; the system cannot express retention policy decisions and exceptions as
  traceable facts
- Users cannot distinguish “official docs” versus “community blog” in a way that drives trust and
  retention behavior

**Scenarios / Examples:**

- A StackOverflow answer strongly influences an implementation detail, but later the page edits or
  disappears; the graph cannot preserve the reasoning trail.
- A vendor docs page changes and invalidates a previous constraint; the system cannot prove what was
  read at the time.
- A project wants to share or publish parts of its graph, but embedded external content creates
  distribution concerns.

**Resolution Indicators:**

- The graph can record provenance under conservative retention constraints (e.g., minimal excerpts +
  stable references + hashes) without losing audit intent
- Users can query which decisions are supported by sources that are link-only vs excerpt-backed
- Retention policy constraints are explicit and queryable (what was retained, what was deliberately
  not)
- The system can flag “weak provenance” areas caused by retention limits

**Impact:**

- High: Provenance is core to the system’s value, but legal/IP uncertainty can block adoption
- Affects: Research ingestion, evidence capture, sharing/export, and long-term auditability
- Frequency: Common; arises immediately when ingesting web sources

**Non-goals / Boundaries:**

- Not providing legal advice; only making retention constraints explicit and operationally visible
- Not building a full web archiver in v1

---

### Problem 8: Multi-Writer Concurrency Causes Conflicts and Divergent Truth

Summary: With multiple agents writing (controller, researcher, planner, executor) across sessions,
the graph will diverge unless conflict and concurrency are treated as first-class problems.

**Problem Statement:**

Even for a single human user, a multi-agent workflow creates multiple independent writers. They will
create duplicate entities, parallel uncertainties, conflicting decisions, and inconsistent
supersession chains—especially when operating concurrently or in partial context windows. Without
explicit handling, the system cannot maintain a coherent “current truth.”

**Failure Modes:**

- Duplicate nodes for the same real-world concept appear (identity conflicts)
- Two decisions resolve the same uncertainty in incompatible ways without explicit contradiction
  capture
- Supersession chains split or cycle; determining “latest committed” becomes ambiguous
- Agents continue referencing superseded nodes because they were created mid-run
- Partially written plan steps or evidence links exist, leaving the graph in inconsistent states

**Scenarios / Examples:**

- Researcher agent creates “Postgres” entity while planner creates “PostgreSQL”; later decisions
  link to both, fragmenting provenance.
- Executor marks a plan step complete while planner supersedes the plan; completion now refers to an
  obsolete step.
- Two runs of the controller create parallel uncertainties (“Do we need persistence?”) with
  different downstream decisions.

**Resolution Indicators:**

- The system can detect and report conflicts (identity, contradiction, supersession ambiguity)
- Users can query for divergent truth states (“multiple committed decisions for same question”)
- Agents can operate safely with clear write-scoping so partially-written states are visible and
  recoverable
- The graph can remain coherent across concurrent sessions without manual cleanup becoming the norm

**Impact:**

- High: Concurrency issues directly destroy trust and query reliability
- Affects: Any workflow with research/planning/execution agents writing in parallel
- Frequency: Likely; grows with system usage and automation

**Non-goals / Boundaries:**

- Not aiming for full distributed-systems correctness in v1
- Not requiring perfect real-time coordination; only making conflicts explicit and manageable

---

### Problem 9: Lifecycle Coverage Fragmentation (Ideation → Decisions → Requirements → Spec → Plan → Code)

Summary: Even if the graph handles decisions, evidence, and code, the system fails if it cannot
preserve continuity across the full lifecycle of intent → commitment → execution.

**Problem Statement:**

Traditional workflows split lifecycle knowledge into different document genres (ideation notes,
problem statements, RFC/XRFC exploration, ADRs, requirements, specs, implementation plans). If the
graph does not explicitly model equivalent lifecycle units and their linkages, the project will
recreate document sprawl inside the graph: ideation becomes disconnected from decisions,
requirements detach from rationale, specifications drift from requirements, plans drift from specs,
and code loses its “why.”

This problem is distinct from “decision loss” or “plan representation” alone: it is about the
completeness of the trace spine that connects early intent to final code and verification.

**Failure Modes:**

- Ideation/desires exist but do not drive explicit problems, requirements, or decisions
- Decisions exist but do not flow into requirements/spec clauses and therefore cannot be implemented
  consistently
- Requirements exist but are not refined into spec-level commitments (interfaces, invariants, edge
  cases)
- Plan steps exist but are not grounded in requirements/spec/decisions; they become floating tasks
- Code artifacts exist but are not linked to the spec/requirements they implement; “why does this
  exist?” cannot be answered
- Verification/acceptance evidence (tests, checks, manual validation) is absent or not linked back
  to the commitments it validates
- Users cannot reconstruct the lifecycle story without re-reading large amounts of text content

**Scenarios / Examples:**

- A Todo List app begins with an ideation desire (“simple local-first UX”), but later decisions and
  requirements do not preserve it; implementation optimizes the wrong target.
- A persistence decision is recorded, but no requirement/spec clause captures acceptance criteria
  (e.g., "todos persist across reloads"), so implementation and tests diverge.
- A multi-step plan is created, but steps do not reference the spec clauses they are meant to
  satisfy; execution becomes sequence-following rather than correctness-following.

**Resolution Indicators:**

- The graph supports an end-to-end trace query: Desire → Problem → Uncertainty → Option → Decision →
  Requirement → SpecClause → PlanStep → CodeSpan/Symbol → Verification Evidence
- Users can answer “what are we trying to achieve?” and “what did we build?” and see the link
  between them without manual reconstruction
- Lifecycle views can be generated without introducing `doc_type` as an ontology dimension
- Gaps in the trace spine are detectable (missing links are queryable as violations or warnings)

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

### Problem 10: Specification Drift, Ambiguity, and Under-Specification

Summary: Requirements and decisions are insufficient to prevent rework and divergence unless
specification-level commitments (interfaces, invariants, edge cases) are captured in a queryable,
maintainable way.

**Problem Statement:**

Projects frequently fail between “requirements” and “implementation” because the spec layer is
either missing, too implicit, or overwritten by code reality. Even if requirements and decisions are
recorded, the system cannot ensure consistent implementation or safe refactoring if it cannot
represent precise behavior, contracts, invariants, and edge cases.

This is distinct from plan representation: a plan can be dependency-correct yet still implement the
wrong or incomplete behavior if the spec layer is ambiguous.

**Failure Modes:**

- Requirements exist but are not refined into concrete behavioral commitments (inputs/outputs,
  invariants, error modes)
- “Spec” content is stored as free text without stable, addressable clauses; cannot be linked to
  code spans or tests
- Spec clauses drift silently during implementation; code becomes the de facto spec without
  traceability
- Invariants and edge cases are discovered late (or in production) because they were never made
  explicit
- Refactors change externally observable behavior because spec obligations were not queryable

**Scenarios / Examples:**

- Todo persistence is a requirement, but the spec never defines conflict handling or partial-write
  behavior; later changes introduce data loss without detection.
- A storage abstraction is implemented, but its contract is unclear; multiple parts of the codebase
  use it inconsistently.
- Performance constraints are intended (“fast UI”), but no spec-level commitments exist to prevent
  regressions.

**Resolution Indicators:**

- Specification-level commitments are representable as addressable units that can be linked to
  requirements, plan steps, code, and verification
- Users can query “which code spans implement spec clause X?” and “which spec clauses are
  unimplemented or unverified?”
- Refactor impact can be evaluated against explicit spec obligations

**Impact:**

- High: Specs are where correctness, interoperability, and refactor safety are preserved
- Affects: Any non-trivial system, especially with evolving APIs and data schemas
- Frequency: Common; often the main reason requirements do not translate into correct
  implementations

**Non-goals / Boundaries:**

- Not forcing formal methods in v1; only ensuring spec obligations are explicit and linkable
- Not mandating a particular spec writing style; focus is queryability and trace continuity

---

### Problem 11: Verification and Acceptance Evidence Is Missing or Unlinked

Summary: Without explicit verification/acceptance evidence linked to requirements/spec clauses, the
graph cannot prove that commitments are satisfied, and “done” becomes narrative.

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
- “Acceptance” is recorded informally (chat/notes) and cannot be audited
- Performance and non-functional commitments are not verifiable (no benchmarks, no regression
  signals)

**Scenarios / Examples:**

- Requirement: “Todos persist across reload.” Implementation exists, but no test proves it; later
  refactor breaks it.
- Spec clause: “Migration must be backward compatible.” No check exists, so a migration breaks
  existing users.
- Performance intent exists, but there is no measurable evidence; regressions go unnoticed.

**Resolution Indicators:**

- Users can query “what evidence validates requirement/spec clause X?” and “what commitments lack
  evidence?”
- Verification can be time-scoped (“as-of truth”): when was this last validated and against which
  source state?
- The system can surface stale verification (e.g., evidence older than current committed truth)

**Impact:**

- Very High: Verification gaps destroy trust and make the graph’s commitments non-actionable
- Affects: Delivery, maintenance, refactoring safety, and confidence in decision correctness
- Frequency: High; appears immediately in real projects

**Non-goals / Boundaries:**

- Not enforcing a specific testing framework; only making validation explicit and queryable
- Not guaranteeing complete proof; only ensuring gaps are visible

---

### Problem 12: Query Usability, Explainability, and Stable Views Without Doc-Types

Summary: A graph can be theoretically queryable but practically unusable if users cannot reliably
ask, interpret, and trust the answers—especially when replacing familiar document genres with
graph-native views.

**Problem Statement:**

The system’s success depends on users repeatedly retrieving lifecycle context (why, what, how,
what’s next) without rereading large text bodies. If the system relies on query-time rereading and
reinterpretation to determine relevance, it becomes a “document store with extra steps,” and cost
and inconsistency scale with corpus size.

To be operational, the graph must answer most lifecycle questions by deterministic traversal over
structured nodes. This requires “ingest to graph” discipline: raw inputs (web/code) are transient;
durable knowledge is stored as linked, typed, addressable nodes and short assertions (including
Evidence Assertions with epistemic typing) rather than raw pages. If query interfaces and view
generation are weak, the graph becomes a dumping ground: information exists but cannot be
operationalized. This problem is amplified by the deliberate removal of doc-types (RFC/ADR/spec),
which users traditionally rely on for navigation.

**Failure Modes:**

- Users cannot express common lifecycle questions without complex graph knowledge
- Query results are too large, ambiguous, or missing explanations (“why did this result appear?”)
- Query-time agents must reread long text bodies to answer common questions (relevance is recomputed
  each time)
- Different runs yield different answers because interpretation is recomputed rather than traversed
- The system cannot generate stable lifecycle views (ideation summary, decision record, spec
  obligations, plan readiness) without reintroducing doc-types implicitly
- Saved queries/views break as the graph evolves (schema drift, naming drift)
- Users lose trust due to inconsistent answers across time (e.g., current vs as-of truth confusion)

**Scenarios / Examples:**

- A user asks “What is the current plan for persistence?” and gets a noisy mix of options,
  superseded decisions, and partial steps.
- A user asks “Why are we using Prisma?” and receives evidence without prioritization or without the
  resolved uncertainty.
- A refactor happens; the user cannot query what requirements/spec clauses are at risk.

**Resolution Indicators:**

- Common lifecycle queries are easy to run and return explainable results
- The system can generate stable, document-like views (as outputs) without `doc_type` as an ontology
  dimension
- Users can filter by epistemic posture (proposal vs committed), time-scope (as-of), and provenance
  strength

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

- Users can answer “why does this exist?” for code and decisions via graph queries
- Decisions and their rationale remain correct as the project evolves (history preserved)
- External sources and internal code are equally queryable and traceable
- Implementation plans are actionable and dependency-aware; “next steps” is queryable
- The graph scales without collapsing into noise; active work remains distinguishable
- Users (and agents) can query deterministic “current committed truth” and time-scoped “as-of” truth
  for high-value nodes
- Provenance remains auditable under conservative retention constraints (weak provenance is explicit
  and queryable)
- Multi-writer conflicts (duplicates, contradictions, supersession ambiguity) are detectable and do
  not silently corrupt “current truth”
- Users can traverse an end-to-end lifecycle trace (intent → commitments → plan → code →
  verification) without relying on document genres
- Every query answer includes explicit lens metadata and the selected version set (current vs as-of)

---

## Assumptions

Facts we're assuming but haven't validated.

Note: Some earlier assumptions have now been explicitly decided (time lens + immutability). Items
marked **RESOLVED** are retained here for continuity, but are no longer open assumptions.

- Single-user + agent workflows can achieve correctness with minimal invariants and validation
- Users will tolerate creating/maintaining some links if the system provides strong automation
- Representing external sources as artifacts is feasible without full web archiving in v1
- Code can be indexed to a granularity sufficient for “decision-to-code” traceability
- **RESOLVED:** Transaction-time “as-of” semantics for “current vs as-of” truth are required for
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
- How should “value tiers” / importance levels be represented and used (visibility, retention,
  required links)?
- What level of snapshotting is required for external sources (URL + version vs conservative
  excerpt/hashes vs full content capture)?
- How will deduplication identity work across concepts and sources (aliases, same-as,
  canonicalization)?
- What plan-step granularity is necessary for usefulness without becoming project-management
  overhead?
- **RESOLVED (2026-01-22):** Transaction-time “as-of” lens for commitments + source states
  referenced by evidence; no valid-time semantics in v1. Remaining: define the canonical selection
  rules for current vs as-of, and conflict behavior under divergent supersession chains.
- How should retention policy be represented as queryable facts (e.g., reference-only vs
  excerpt-backed vs full-copy provenance) without turning policy into implicit doc-types?
- What are the minimum conflict types to detect for multi-writer concurrency (duplicate identity,
  contradictory commitments, supersession ambiguity, partial writes)?
- What is the minimum end-to-end trace spine that must exist to claim lifecycle coverage (which
  links are mandatory vs best-effort)?
- How should “specification-level” commitments be represented without introducing doc-types (e.g.,
  SpecClause facet vs dedicated node type), while staying queryable and comparable?
- What counts as “verification evidence” in v1 (tests, checks, manual validations), and how should
  it link back to requirements/spec clauses?
- What are the core lifecycle query categories the system must support
  (ideation→decision→requirements→spec→plan→code→maintenance), and what constitutes an acceptable
  user experience for those queries?
- With global node immutability, what is the minimal representation for “state changes” (e.g., plan
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
