---
type: REQ
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24T12:35:45.837Z
area: knowledge-graph
feature: graph-knowledge-system
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Graph-based project memory with lifecycle-traceable, queryable nodes and deterministic
  current/as-of views'
summary_long:
  'Defines normative Requirements for a graph-based knowledge system with lifecycle traceability,
  append-only immutability, provenance, time lens semantics, ingestion parity for code and external
  sources, deterministic projections, and validation invariants for auditable decision history.'
index:
  sections:
    - title: 'TLDR'
      lines: [304, 325]
      summary:
        'Lifecycle-traceable graph memory with append-only canonical nodes, deterministic truth
        selection, provenance, time lenses, and ingest-to-graph parity for code and external
        sources.'
      token_est: 140
    - title: 'Scope'
      lines: [327, 352]
      summary:
        'Lifecycle traceability, graph model, provenance, ingestion parity, time-lens queries,
        projections, and validation invariants. Excludes document-genre ontology, legal advice, full
        PM suite, and valid-time semantics.'
      token_est: 151
    - title: '1. Purpose'
      lines: [354, 362]
      token_est: 91
    - title: '2. Non-goals'
      lines: [364, 374]
      token_est: 81
    - title: '3. Key Definitions (Actionable)'
      lines: [376, 652]
      token_est: 1479
      subsections:
        - title: '3.1 Node Category'
          lines: [382, 393]
          token_est: 85
        - title: '3.1a Project (workspace / tenant)'
          lines: [395, 420]
          token_est: 136
        - title: '3.2 Subject (canonical thing)'
          lines: [422, 454]
          token_est: 175
        - title: '3.3 Artifact (verifiable source material)'
          lines: [456, 536]
          token_est: 388
        - title: '3.4 Assertion (lifecycle statement)'
          lines: [538, 563]
          token_est: 141
        - title: '3.5 Epistemic Type'
          lines: [565, 574]
          token_est: 64
        - title: '3.6 Evidence (as an Assertion)'
          lines: [576, 598]
          token_est: 129
        - title: '3.7 Agent'
          lines: [600, 610]
          token_est: 62
        - title: '3.8 Activity'
          lines: [612, 622]
          token_est: 67
        - title: '3.9 Supersession'
          lines: [624, 631]
          token_est: 41
        - title: '3.10 Transaction-time “as-of” lens'
          lines: [633, 638]
          token_est: 32
        - title: '3.11 Projection (non-canonical)'
          lines: [640, 652]
          token_est: 101
    - title: '4. Design Principles (Normative)'
      lines: [654, 670]
      token_est: 164
    - title: '5. Node Categories and Minimum Properties (Normative)'
      lines: [672, 700]
      token_est: 163
    - title: '6. Core Relationships (Normative)'
      lines: [702, 786]
      token_est: 640
      subsections:
        - title: 'REQ-REL-001 — Supersession'
          lines: [704, 715]
          token_est: 59
        - title: 'REQ-REL-002 — Evidence as anchor + interpretation'
          lines: [717, 728]
          token_est: 78
        - title: 'REQ-REL-003 — Lifecycle trace spine'
          lines: [730, 741]
          token_est: 77
        - title: 'REQ-REL-004 — Relationship vocabulary (minimum)'
          lines: [743, 786]
          token_est: 420
    - title: '7. Invariants and Validation (Normative)'
      lines: [788, 856]
      token_est: 340
      subsections:
        - title: 'REQ-INV-001 — Decision completeness'
          lines: [790, 800]
          token_est: 72
        - title: 'REQ-INV-002 — Requirement derivation'
          lines: [802, 811]
          token_est: 46
        - title: 'REQ-INV-003 — SpecClause refinement'
          lines: [813, 821]
          token_est: 34
        - title: 'REQ-INV-004 — PlanStep grounding and dependencies'
          lines: [823, 834]
          token_est: 68
        - title: 'REQ-INV-005 — Verification linkage'
          lines: [836, 845]
          token_est: 50
        - title: 'REQ-INV-006 — Deterministic current truth selection'
          lines: [847, 856]
          token_est: 64
    - title: '8. Time Lens and Query Contract (Normative)'
      lines: [858, 899]
      token_est: 189
    - title: '9. Projections (Derived Views) (Normative)'
      lines: [901, 958]
      token_est: 332
      subsections:
        - title: 'REQ-PROJ-001 — Projection registry'
          lines: [903, 913]
          token_est: 59
        - title: 'REQ-PROJ-001a — Projection explainability'
          lines: [915, 927]
          token_est: 90
        - title: 'REQ-PROJ-002 — Who computes projections'
          lines: [929, 939]
          token_est: 62
        - title: 'REQ-PROJ-003 — Minimum projections (v1)'
          lines: [941, 958]
          token_est: 115
    - title: '10. Ingestion (Web + Code) to Graph (Normative)'
      lines: [960, 1117]
      token_est: 965
      subsections:
        - title: 'REQ-ING-001 — Ingest-to-graph parity'
          lines: [962, 974]
          token_est: 89
        - title: 'REQ-ING-001a — Ingestion depth configuration'
          lines: [976, 993]
          token_est: 110
        - title: 'REQ-ING-002 — External source decomposition'
          lines: [995, 1004]
          token_est: 49
        - title: 'REQ-ING-003 — Two-tier ingestion and evidence promotion'
          lines: [1006, 1031]
          token_est: 184
        - title: 'REQ-ING-004 — Retention policy as queryable facts'
          lines: [1033, 1053]
          token_est: 155
        - title: 'REQ-ING-005 — Code ingestion decomposition'
          lines: [1055, 1071]
          token_est: 112
        - title: 'REQ-ING-006 — External sources: forums/issues/threaded discussions'
          lines: [1073, 1101]
          token_est: 164
        - title: 'REQ-ING-007 — Promotion triggers (Tier 2)'
          lines: [1103, 1117]
          token_est: 94
    - title: '11. Graph Scale and “Active vs Historical” (Normative)'
      lines: [1119, 1176]
      token_est: 348
      subsections:
        - title: 'REQ-SCALE-001 — Active vs historical separation'
          lines: [1121, 1140]
          token_est: 149
        - title: 'REQ-SCALE-001a — Archival/retirement semantics'
          lines: [1142, 1151]
          token_est: 50
        - title: 'REQ-SCALE-002 — Write-hot state via projections'
          lines: [1153, 1163]
          token_est: 62
        - title: 'REQ-SCALE-002a — Deterministic ActiveWork rules'
          lines: [1165, 1176]
          token_est: 77
    - title: '12. Required Query Capabilities (Normative)'
      lines: [1178, 1216]
      token_est: 228
    - title: '13. Notes on Database Choice (Informational)'
      lines: [1218, 1224]
      token_est: 63
    - title: '14. Traceability to Former Problem Areas (Informational)'
      lines: [1226, 1238]
      token_est: 91
    - title: '15. Normative Schemas and Contracts (Normative)'
      lines: [1240, 1398]
      token_est: 624
      subsections:
        - title: 'REQ-SCHEMA-001 — Assertion schema registry'
          lines: [1245, 1255]
          token_est: 67
        - title: 'REQ-SCHEMA-002 — Minimum required fields per Assertion kind (v1)'
          lines: [1257, 1382]
          token_est: 437
        - title: 'REQ-SCHEMA-003 — Normalization rules'
          lines: [1384, 1398]
          token_est: 93
    - title: '16. Conflict Model and Contradiction Handling (Normative)'
      lines: [1400, 1455]
      token_est: 272
    - title: '17. Plans and Work Execution Model (Normative)'
      lines: [1457, 1533]
      token_est: 375
      subsections:
        - title: 'REQ-PLAN-001 — Plan identity and versioning'
          lines: [1459, 1470]
          token_est: 86
        - title: 'REQ-PLAN-003 — PlanStep membership'
          lines: [1472, 1482]
          token_est: 52
        - title: 'REQ-PLAN-002 — PlanStep ordering'
          lines: [1484, 1498]
          token_est: 59
        - title: 'REQ-WORK-001 — Progress and status via WorkEvents'
          lines: [1500, 1511]
          token_est: 63
        - title: 'REQ-WORK-002 — Blocking semantics'
          lines: [1513, 1522]
          token_est: 54
        - title: 'REQ-ARCH-001 — Archival/retirement representation'
          lines: [1524, 1533]
          token_est: 52
    - title: '18. Evidence Strength Model (Normative)'
      lines: [1535, 1569]
      token_est: 153
    - title: '19. Retention Boundaries and Raw-Input Prohibition (Normative)'
      lines: [1571, 1619]
      token_est: 258
    - title: '20. Subject Equivalence and Merge Workflow (Normative)'
      lines: [1621, 1655]
      token_est: 154
    - title: '21. Ingestion Idempotency and Deduplication (Normative)'
      lines: [1657, 1694]
      token_est: 179
    - title: '22. Locator Specification (Normative)'
      lines: [1696, 1724]
      token_est: 104
    - title: '23. Projection Output Envelope (Normative)'
      lines: [1726, 1757]
      token_est: 127
    - title: '24. Validation Enforcement, Staging, and Waivers (Normative)'
      lines: [1759, 1802]
      token_est: 202
    - title: '25. Project Scoping and Multi-Project Operation (Normative)'
      lines: [1804, 1816]
      token_est: 65
    - title: '26. Supersession Semantics and Visibility (Normative)'
      lines: [1818, 1852]
      token_est: 202
    - title: '27. Scope Model (Normative)'
      lines: [1854, 1884]
      token_est: 128
    - title: '28. Deterministic Canonicalization and Idempotency (Normative)'
      lines: [1886, 1937]
      token_est: 232
    - title: '29. Waivers and Exceptional Paths (Normative)'
      lines: [1939, 1957]
      token_est: 85
    - title: '30. Projections, Explanations, and GraphHealth (Normative)'
      lines: [1959, 2010]
      token_est: 236
    - title: '31. External Source Rights and Metadata (Normative)'
      lines: [2012, 2029]
      token_est: 68
    - title: '32. Locator Mapping Across Versions (Normative)'
      lines: [2031, 2042]
      token_est: 67
    - title: '33. Activity Atomicity and Transactions (Normative)'
      lines: [2044, 2055]
      token_est: 63
    - title: '34. Additional Tightening (Normative)'
      lines: [2057, 2109]
      token_est: 232
    - title: '35. Open Questions (Remaining)'
      lines: [2111, 2124]
      token_est: 114
    - title: 'Related Requirements'
      lines: [2126, 2132]
      summary: 'No explicit cross-document requirements listed in this document.'
      token_est: 21
    - title: 'Design Decisions'
      lines: [2134, 2147]
      token_est: 85
    - title: 'Blockers'
      lines: [2149, 2153]
      token_est: 39
---

# REQ-graph-knowledge-system

---

## TLDR

Summary: Lifecycle-traceable graph memory with append-only canonical nodes, deterministic truth
selection, provenance, time lenses, and ingest-to-graph parity for code and external sources.

**What:** A graph-based project memory that encodes lifecycle assertions, evidence, and artifacts as
queryable nodes

**Why:** Decisions and requirements must be traceable to evidence and artifacts over time, with
deterministic current/as-of views

**How:** Immutable canonical nodes + explicit supersession + provenance + deterministic projections
and validation invariants

**Status:** Draft

**Critical path:** Define the normative model and invariants → implement ingestion + projection
registry → enforce validation and time lens semantics

**Risk:** If requirements shift, invariants and projection logic will need coordinated updates

---

## Scope

Summary: Lifecycle traceability, graph model, provenance, ingestion parity, time-lens queries,
projections, and validation invariants. Excludes document-genre ontology, legal advice, full PM
suite, and valid-time semantics.

**Includes:**

- Lifecycle-traceable graph memory across ideation → maintenance
- Node categories, assertion kinds, epistemic typing, provenance, time lens, invariants
- Ingestion of code + external sources into addressable, queryable nodes
- Deterministic projections and explainability
- Validation enforcement and waivers

**Excludes:**

- Document-genre ontology (RFC/ADR/spec as first-class dimension)
- Legal advice (only makes retention/licensing constraints queryable)
- Full project management suite in v1 (plan representation must still be queryable)
- Valid-time semantics (effective dates / retroactive truth); v1 is transaction-time only

**In separate docs:**

- None specified

---

## 1. Purpose

Build a graph-based project memory where a project can be fully documented as linked, queryable
nodes across the full lifecycle (ideation → exploration → decisions → requirements → specifications
→ plans → implementation → verification → maintenance). Every decision must be traceable to evidence
and artifacts (internal code and external sources), and the system must support deterministic
“current” and “as-of” views under an append-only immutability contract.

---

## 2. Non-goals

- Reintroducing document genres as ontology (`doc_type` such as RFC/ADR/spec) as a first-class
  dimension.
- Providing legal advice. The system only makes retention and licensing constraints explicit and
  queryable.
- Building a full project management suite in v1 (however, plan representation must be operationally
  queryable).
- Modeling valid-time semantics (effective dates / retroactive truth). v1 is transaction-time only.

---

## 3. Key Definitions (Actionable)

This section defines every primary type used in this document in operational terms: when it is
created, what it must link to, and how it is used in queries. These are definitions of _graph
concepts_ and _behavioural contracts_, not UI labels and not document types.

### 3.1 Node Category

**Definition:** A stable conceptual class used to keep queries and invariants stable. Categories
exist to prevent semantic collapse (e.g., confusing “source text” with “claims about source text”).

**Creation rule:** A category is used when an object participates repeatedly in queries and must be
referencable and linkable over time.

**Pitfall:** Introducing categories to mirror document genres (RFC/ADR/spec) rather than lifecycle
semantics.

---

### 3.1a Project (workspace / tenant)

**Definition:** A stable boundary that scopes all Subjects, Artifacts, Assertions, and derived views
for a single initiative (or tenant). A Project prevents cross-project contamination and makes
queries and retention policies unambiguous.

**When to create:** One per independent effort that should have separate “current truth,” separate
plans, and separate provenance.

**Minimum required properties:**

- `project_id` (stable)
- `project_name`
- `created_at`
- `ASSERTED_BY → Agent` and `GENERATED_IN → Activity`

**Minimum required links:**

- Canonical nodes MUST link to a Project via `BELONGS_TO`.

**Query usage:**

- Mandatory filter for all queries and projections.
- Enables multi-project operation without graph mixing.

---

### 3.2 Subject (canonical thing)

**Definition:** A stable, canonical “thing” the project talks about across time. Subjects are the
anchors for identity and deduplication. They are not “documents” and do not encode stance.

**When to create:** Create a Subject when the thing will be referenced across multiple Assertions or
Artifacts, or when alias/dedup stability matters.

**Examples:** Prisma, ORM, Persistence, PostgreSQL, "Todo List Feature", "Storage Layer".

**Minimum required links:**

- MAY link to equivalence/merge relationships to other Subjects (see Relationship Vocabulary).

**Minimum required properties:**

- `subject_id` (stable)
- `canonical_name`
- `aliases[]`
- `created_at`
- `generated_in(Activity)` and `asserted_by(Agent)`

**Query usage:**

- Starting point for lifecycle traces (“show everything about Subject X”).
- Normalization anchor for “active vs historical” views.

**Pitfalls and mitigations:**

- Duplicate Subjects: MUST be linkable via explicit equivalence/merge mechanisms and resolved
  deterministically.

---

### 3.3 Artifact (verifiable source material)

Artifacts represent sources and their immutable versions. Artifacts are the _anchors_ for Evidence
and for traceability to internal code and external sources.

#### 3.3.1 ArtifactRoot

**Definition:** The stable identity of a source corpus, repository, or logical source container.

**When to create:** Once per source identity (e.g., a repo, documentation site, forum thread
identity), independent of versions.

**Examples:** "Prisma Docs", "Prisma GitHub Repo", "StackOverflow Question 12345", "Project Repo".

**Minimum required properties:**

- `artifact_root_id`
- `source_kind` (e.g., repo/docs/forum/blog)
- `canonical_ref` (URL, repo URL, source identifier)
- `labels/tags` (optional)

**Minimum required links:**

- MUST have one or more ArtifactStates.

#### 3.3.2 ArtifactState

**Definition:** An immutable snapshot/version of an ArtifactRoot captured at a specific
transaction-time.

**When to create:**

- For code: per commit/tag (or other chosen snapshot policy).
- For web: per retrieval (retrieved_at + hash).

**Minimum required properties:**

- `artifact_state_id`
- `root_id`
- `version_ref` (commit/tag/retrieved_at)
- `content_hash`
- `retrieved_at`

**Minimum required links:**

- MUST belong to exactly one ArtifactRoot.
- MUST have zero or more ArtifactParts.

**Query usage:**

- “As-of” correctness (which version was used).
- Reproducibility and staleness detection.

#### 3.3.3 ArtifactPart

**Definition:** An addressable fragment of an ArtifactState. This is the unit that Evidence anchors
to and that impact analysis can start from.

**When to create:** During ingestion/decomposition, for both web and code, at a configured
granularity.

**Examples (web):** doc section, paragraph, forum post/comment, snippet. **Examples (code):** file,
module, symbol, code span, signature, docstring.

**Minimum required properties:**

- `artifact_part_id`
- `state_id`
- `locator` (path, URL-fragment, heading chain, span coordinates)
- `text_excerpt` (optional; see retention modes)
- `part_hash` (optional)

**Minimum required links:**

- MUST belong to exactly one ArtifactState.
- SHOULD link to relevant Subjects via `ABOUT_SUBJECT`.

**Pitfall:** Anchoring Evidence to entire pages or entire repos rather than parts; this makes
evidence unusable.

---

### 3.4 Assertion (lifecycle statement)

**Definition:** A graph-native unit of lifecycle meaning: intent, uncertainty, option, decision,
requirement, specification clause, plan step, verification evidence, etc.

**When to create:** When the system needs something to be queryable, referencable, and traceable as
part of the lifecycle spine. Assertions are the system’s replacement for RFC/ADR/spec content,
without introducing document genres.

**Minimum required properties (all Assertions):**

- `assertion_id`
- `kind` (enum)
- `epistemic_type` (enum)
- `content` (structured fields and/or text)
- `created_at`
- `generated_in(Activity)` and `asserted_by(Agent)`

**Minimum required links (most Assertions):**

- SHOULD link to one or more Subjects via `ABOUT_SUBJECT`.

**Key rule:** Artifacts are “what exists”; Assertions are “what is
claimed/decided/required/planned/validated.”

---

### 3.5 Epistemic Type

**Definition:** The posture/strength of an Assertion (proposal vs uncertain vs committed vs
superseded). Epistemic type is mandatory on Assertions because Assertions are inherently
stance-bearing.

**Key rule:** Epistemic type is not a replacement for provenance or evidence strength. Evidence
strength may require separate confidence fields.

---

### 3.6 Evidence (as an Assertion)

**Definition:** An Evidence Assertion is a claim or interpretation derived from an ArtifactPart
anchor, linked to the anchor, and linked into the lifecycle spine as “supports/contradicts/relates
to.”

**When to create:**

- Tier 2 ingestion (promotion) or when a source is relied upon in an
  Option/Decision/Requirement/Spec.

**Minimum required links:**

- MUST link to an ArtifactPart via `ANCHORS`.
- MUST link to at least one Subject via `ABOUT_SUBJECT`.
- SHOULD link to a target via `SUPPORTS` or `CONTRADICTS` (Option/Decision/Requirement/SpecClause).

**Minimum required properties (recommended):**

- `stance` (supports/contradicts/neutral)
- `confidence` (bounded scale, separate from epistemic type)

---

### 3.7 Agent

**Definition:** The actor responsible for generating or asserting graph content.

**When to create:** One per distinct actor identity (user, system services, named agent roles).

**Examples:** Human user, Controller agent, Researcher agent, Ingestion service.

**Requirement:** Every created node MUST be attributable to an Agent.

---

### 3.8 Activity

**Definition:** A run/session context in which graph writes were produced (ingestion run, indexing
run, research run, planning run, validation run).

**When to create:** Once per run/session that produces canonical writes.

**Why it matters:** Debugging and traceability require understanding what was produced together,
with what inputs and assumptions.

---

### 3.9 Supersession

**Definition:** Explicit replacement history under immutability. Supersession creates a chain from
older to newer versions.

**Rule:** “Current committed truth” is computed from the latest non-superseded committed Assertions.

---

### 3.10 Transaction-time “as-of” lens

**Definition:** “As-of T” means “recorded/committed at or before T.” This is transaction-time only
(no valid-time semantics in v1).

---

### 3.11 Projection (non-canonical)

**Definition:** A derived view computed from canonical nodes to provide stable usability at scale
(e.g., current truth, active work, lifecycle view, impact view, graph health). Projections are not
truth and are recomputable.

**Key rule:** Projection membership rules MUST be deterministic system code. LLMs may
request/parameterize/explain, but not define membership at runtime.

**Explainability requirement:** Each projection item MUST be explainable (“why is this included?”)
via links to canonical nodes and declared rule versions.

---

## 4. Design Principles (Normative)

1. **Append-only canonical graph**: Canonical nodes are immutable; updates create new nodes and
   explicit supersession links.
2. **Deterministic truth selection**: “Current committed truth” and “as-of” views must be computed
   mechanically, not by ad hoc reasoning.
3. **Provenance is first-class**: Every canonical write is attributable to an Agent and Activity.
4. **Internal and external parity**: External sources are ingested into structured, addressable
   nodes comparable to code ingestion.
5. **No raw-page storage**: Raw inputs (web pages, repo states) are transient; durable knowledge is
   stored as structured nodes and short assertions.
6. **Evidence is two-part**: (a) ArtifactPart anchor, (b) Evidence Assertion interpretation linked
   to the anchor.
7. **Queryability first**: The model is driven by lifecycle queries and invariant validation, not by
   taxonomy aesthetics.

---

## 5. Node Categories and Minimum Properties (Normative)

### REQ-MODEL-001 — Node categories

**Statement (MUST):** The system SHALL represent all durable knowledge using the following node
categories: Project, Subject, Artifact (Root/State/Part), Assertion, Agent, Activity, and Projection
(non-canonical).

**Acceptance criteria:**

- Queries can filter assertions by epistemic posture.
- “Current committed truth” excludes superseded/rejected items by deterministic rules.

---

### REQ-MODEL-006a — Epistemic type misuse prevention

**Statement (MUST):** The epistemic_type value `supported` SHALL be treated as deprecated. If
retained for backwards compatibility, it MUST be valid only for `Evidence` Assertions. All other
Assertion kinds MUST NOT use `supported`.

**Rationale:** Evidence strength belongs to Evidence confidence + stance + provenance, not to the
epistemic posture of commitments.

**Acceptance criteria:**

- Validator rejects non-Evidence Assertions with `epistemic_type=supported`.

---

## 6. Core Relationships (Normative)

### REQ-REL-001 — Supersession

**Statement (MUST):** The system SHALL support explicit supersession between nodes of the same
semantic role (e.g., Decision superseding Decision, PlanStep superseding PlanStep) under
immutability.

**Acceptance criteria:**

- Supersession chains are queryable.
- Cycles are detectable and treated as invariant violations.

---

### REQ-REL-002 — Evidence as anchor + interpretation

**Statement (MUST):** The system SHALL represent evidence as (a) an ArtifactPart anchor and (b) an
Evidence Assertion interpretation that references the anchor.

**Acceptance criteria:**

- Evidence Assertions always include a link to an ArtifactPart.
- The system can query “which artifacts support decision X?” and “which decisions cite artifact part
  Y?”

---

### REQ-REL-003 — Lifecycle trace spine

**Statement (MUST):** The system SHALL support an end-to-end trace path:

`Desire → Problem → Uncertainty → Option → Decision → Requirement → SpecClause → PlanStep → ArtifactPart(code) → VerificationEvidence`

**Acceptance criteria:**

- The system can produce a lifecycle view for a feature/subject that traverses this path.
- Gaps are detectable and reportable.

---

### REQ-REL-004 — Relationship vocabulary (minimum)

**Statement (MUST):** The system SHALL standardise a minimum relationship vocabulary with clear
semantics and directionality so agents and validators do not drift.

**Minimum vocabulary (v1) and intent:**

- `BELONGS_TO` (Any canonical node → Project): tenant/project scope.
- `SUPERSEDES` (Assertion → Assertion): explicit supersession link between nodes of the same
  semantic role within a Project (used by current/as-of truth selection; see Section 26 /
  REQ-SUP-\*).
- `ABOUT_SUBJECT` (Any → Subject): node is about / scoped to a Subject.
- `HAS_STATE` (ArtifactRoot → ArtifactState): root has immutable versions.
- `HAS_PART` (ArtifactState → ArtifactPart): state decomposes into addressable parts.
- `ANCHORS` (Evidence → ArtifactPart): evidence interpretation is anchored to a specific part.
- `SUPPORTS` / `CONTRADICTS` (Evidence → {Option, Decision, Requirement, SpecClause}): stance of
  evidence.
- `RESOLVES` (Decision → Uncertainty): decision resolves uncertainty.
- `CHOOSES` (Decision → Option): decision chooses option.
- `REJECTS` (Decision → Option): decision rejects option.
- `DERIVED_FROM` (Requirement → {Desire, Problem, Decision}): requirement origin.
- `REFINES` (SpecClause → Requirement): spec refines requirement.
- `IMPLEMENTS` (PlanStep → {Decision, Requirement, SpecClause}): plan step implements commitment.
- `DEPENDS_ON` (PlanStep → PlanStep): plan dependency (acyclic per plan version).
- `PART_OF_PLAN` (PlanStep → Plan): associates a step with a plan.
- `HAS_STEP` (Plan → PlanStep): inverse relationship (optional if PART_OF_PLAN exists).
- `APPLIES_TO` (WorkEvent → PlanStep): WorkEvent targets a plan step.
- `WAIVES` (Waiver → {Decision, Requirement, SpecClause, PlanStep, VerificationEvidence}): waiver
  target.
- `IMPLEMENTED_BY` ({SpecClause, Requirement} → ArtifactPart): linkage to code parts.
- `VALIDATES` (VerificationEvidence → {Requirement, SpecClause}): verification target.
- `RUN_AGAINST` (VerificationEvidence → ArtifactState): version tested/validated.
- `ASSERTED_BY` (Any canonical node → Agent): provenance.
- `GENERATED_IN` (Any canonical node → Activity): provenance.
- `EQUIVALENT_TO` (Subject ↔ Subject): alias/equivalence link for dedup (resolution rules apply).
- `EQUIVALENT_PART` (ArtifactPart ↔ ArtifactPart): optional mapping of “same logical entity” across
  ArtifactStates.

**Acceptance criteria:**

- Agents use only standard relationships for v1 writes.
- Validators can flag unknown relationship types or missing required relationships.

---

## 7. Invariants and Validation (Normative)

### REQ-INV-001 — Decision completeness

**Statement (MUST):** Every committed Decision SHALL either (a) resolve at least one Uncertainty and
choose at least one Option, and be supported by at least one Evidence Assertion, or (b) carry an
explicit waiver object that is queryable.

**Acceptance criteria:**

- Validator flags decisions missing resolve/choose/support links unless waived.

---

### REQ-INV-002 — Requirement derivation

**Statement (MUST):** Every Requirement SHALL link to its origin via `DERIVED_FROM` to at least one
of: Desire, Problem, or Decision.

**Acceptance criteria:**

- Validator flags requirements without derivation links.

---

### REQ-INV-003 — SpecClause refinement

**Statement (MUST):** Every SpecClause SHALL refine at least one Requirement.

**Acceptance criteria:**

- Validator flags spec clauses without `REFINES` links.

---

### REQ-INV-004 — PlanStep grounding and dependencies

**Statement (MUST):** Every PlanStep SHALL (a) implement at least one
Decision/Requirement/SpecClause and (b) may declare dependencies on other PlanSteps. Dependencies
SHALL be acyclic within a plan version.

**Acceptance criteria:**

- Validator flags PlanSteps that do not implement a commitment.
- Validator detects dependency cycles.

---

### REQ-INV-005 — Verification linkage

**Statement (MUST):** VerificationEvidence SHALL validate at least one Requirement or SpecClause and
SHOULD reference the ArtifactState it was run against when applicable.

**Acceptance criteria:**

- Validator flags verification evidence without validation target.

---

### REQ-INV-006 — Deterministic current truth selection

**Statement (MUST):** The system SHALL determine “current committed truth” mechanically as the
latest non-superseded Assertions with `epistemic_type=committed`, subject to conflict rules.

**Acceptance criteria:**

- Two executions of the same query against the same graph state return the same current truth set.

---

## 8. Time Lens and Query Contract (Normative)

### REQ-TIME-001 — Transaction-time as-of

**Statement (MUST):** The system SHALL support transaction-time queries where “as-of T” means
“recorded/committed at or before T.”

**Acceptance criteria:**

- “As-of” queries return only nodes with `created_at <= T` and respect supersession visibility
  rules.

---

### REQ-TIME-002 — As-of scope

**Statement (MUST):** The as-of lens SHALL apply at minimum to:

- Commitments: Decision, Requirement, SpecClause, Plan, PlanStep
- ArtifactStates referenced by Evidence

**Acceptance criteria:**

- As-of query results include commitment versions and referenced artifact state versions consistent
  with T.

---

### REQ-TIME-003 — Mandatory lens metadata

**Statement (MUST):** Every query response SHALL include lens metadata:

- lens type (`current` or `as-of`)
- timestamp (if as-of)
- truth selection rule version
- selected version set summary (commitments + relevant artifact states)

**Acceptance criteria:**

- No query result is returned without lens metadata.

---

## 9. Projections (Derived Views) (Normative)

### REQ-PROJ-001 — Projection registry

**Statement (MUST):** The system SHALL maintain a registry of projection definitions. Projections
SHALL be deterministic functions of canonical data and MUST be marked non-canonical.

**Acceptance criteria:**

- Each projection declares: name, parameters, rule version, lens handling, and explainability
  contract.

---

### REQ-PROJ-001a — Projection explainability

**Statement (MUST):** Every projection SHALL provide per-item explainability: users and agents SHALL
be able to ask “why is this item included?” and receive a deterministic explanation referencing
canonical nodes and the projection rule version.

**Acceptance criteria:**

- Projection outputs include an ExplanationPath (see Section 30 / REQ-EXPL-001) or references to the
  canonical inputs used.
- Explanations include lens metadata and selection rule version.

---

### REQ-PROJ-002 — Who computes projections

**Statement (MUST):** Projections SHALL be computed by deterministic system code
(queries/functions). LLM agents MAY request, parameterize, and explain projections, but SHALL NOT
define projection membership rules at runtime.

**Acceptance criteria:**

- Projection outputs are reproducible for the same graph state.

---

### REQ-PROJ-003 — Minimum projections (v1)

**Statement (MUST):** The system SHALL provide the following minimum projections:

1. **CurrentCommittedTruth**: latest non-superseded committed Decisions/Requirements/SpecClauses
   (and optionally Plans).
2. **ActiveWork**: actionable PlanSteps based on dependencies and current commitments.
3. **LifecycleView**: trace narrative for a Subject/feature across the spine.
4. **ImpactView**: what commitments/specs/plans/verification are impacted by changing an
   ArtifactPart (e.g., code symbol/span) or Subject.
5. **GraphHealth (see Section 30 / REQ-HEALTH-001)**: invariant violations and ambiguity
   (duplicates, conflicts, supersession cycles).

**Acceptance criteria:**

- Each projection is queryable by parameter (e.g., Subject, lens).

---

## 10. Ingestion (Web + Code) to Graph (Normative)

### REQ-ING-001 — Ingest-to-graph parity

**Statement (MUST):** Ingesting an external source (website/docs/forum/issues) and ingesting a code
repository SHALL both produce fully linked, queryable graph outputs. Raw inputs are transient.

**Acceptance criteria:**

- No durable storage of raw pages as first-class objects.
- Durable outputs are Subjects + ArtifactRoot/State/Parts + Assertions and standard relationships.
- Ingestion produces addressable units sufficient for later queries without rereading raw source
  text.

---

### REQ-ING-001a — Ingestion depth configuration

**Statement (MUST):** The system SHALL support configurable ingestion depth per ArtifactRoot (and
optionally globally) to control granularity and cost.

**Configuration (minimum):**

- Part granularity level (page/section/paragraph/comment/snippet for web; file/symbol/span for code)
- Subject tagging level (none/minimal/strong)
- Evidence extraction level (Tier 1 only vs Tier 2 promotion rules)
- Retention mode (link-only, excerpt-backed, hashed-only)

**Acceptance criteria:**

- Two sources can be ingested with different depth profiles.
- Projection and query behaviour can surface the depth profile used.

---

### REQ-ING-002 — External source decomposition

**Statement (MUST):** External sources SHALL be decomposed into addressable ArtifactParts
(sections/paragraphs/comments/snippets) with stable locators and optional conservative excerpts.

**Acceptance criteria:**

- Evidence anchors can target specific parts, not whole pages.

---

### REQ-ING-003 — Two-tier ingestion and evidence promotion

**Statement (MUST):** The system SHALL support a two-tier ingestion policy to control cost while
preserving queryability.

**Tier 1 (baseline, MUST):** For every ingested ArtifactState, the system MUST produce:

- ArtifactRoot/State/Parts at the configured granularity
- Stable locators for parts
- Basic Subject tagging (`ABOUT_SUBJECT`) when feasible
- Retention policy facts per ArtifactState/Part

**Tier 2 (promotion to evidence, MUST when referenced):** When an ArtifactPart (or its
ArtifactState/Root) is used to justify an Option, Decision, Requirement, or SpecClause, the system
MUST create:

- One or more Evidence Assertions anchored to specific ArtifactParts
- Stance links (`SUPPORTS`/`CONTRADICTS`) to the relevant target Assertions
- Epistemic typing and recommended confidence fields

**Acceptance criteria:**

- Sources not relied upon do not force maximal evidence extraction.
- Once a source is relied upon, evidence is explicit, anchored, and queryable.

---

### REQ-ING-004 — Retention policy as queryable facts

**Statement (MUST):** The system SHALL represent retention policy outcomes as queryable facts for
each ArtifactState/Part (e.g., link-only, excerpt-backed, hashed-only), and SHALL surface “weak
provenance” where retention prevents verification.

**Retention modes (minimum) and implications:**

- **Link-only:** store canonical_ref + locator + hashes; no excerpt. Evidence is verifiable only by
  re-fetching; mark as weak provenance.
- **Excerpt-backed:** store conservative excerpts for parts (bounded length) + hashes; evidence can
  be inspected without re-fetch.
- **Hashed-only:** store only hashes and locators (no excerpts); strongest privacy/lowest storage,
  but weakest inspectability; always weak provenance.

**Acceptance criteria:**

- Queries can filter decisions supported only by weak provenance.
- Lens metadata can include retention strength for cited evidence.

---

### REQ-ING-005 — Code ingestion decomposition

**Statement (MUST):** Ingesting a code repository SHALL decompose the chosen ArtifactState
(commit/tag snapshot) into addressable ArtifactParts sufficient for trace and impact queries.

**Minimum decomposition outputs (v1):**

- File-level parts with stable path locators (commit-scoped)
- Symbol-level parts (functions/classes/types/modules) with stable locators (language-dependent)
- Optional span-level parts for fine-grained anchors (start/end offsets or line/column)

**Acceptance criteria:**

- A SpecClause can link to a code ArtifactPart via `IMPLEMENTED_BY`.
- Impact queries can start from a code ArtifactPart and traverse to commitments.

---

### REQ-ING-006 — External sources: forums/issues/threaded discussions

**Statement (MUST):** For threaded discussions (forums, issues, Q&A), ingestion SHALL preserve
thread structure as addressable ArtifactParts such that Evidence can anchor to specific
posts/comments and their context.

**Minimum decomposition outputs (v1):**

- Thread-level ArtifactRoot (stable thread identity)
- Retrieval-level ArtifactState per capture (retrieved_at + hash)
- ArtifactParts for:
  - original post
  - each reply/comment
  - optional “quote blocks” and code blocks as sub-parts

**Locator requirements (minimum):**

- `thread_ref` (canonical URL or platform ID)
- `post_id` / `comment_id`
- `author_handle` (if available)
- `posted_at` (if available)
- stable ordering index within the thread

**Acceptance criteria:**

- Evidence anchors can target a specific post/comment, not the whole thread.
- The system can query “evidence from this thread supporting Decision X.”

---

### REQ-ING-007 — Promotion triggers (Tier 2)

**Statement (MUST):** The system SHALL define deterministic triggers for Tier 2 promotion when
external material is relied upon.

**Minimum triggers (v1):**

- A Decision/Requirement/SpecClause references an ArtifactRoot/State/Part
- An Option under consideration is linked to an ArtifactPart as justification
- A human explicitly marks a source as “decision-relevant”

**Acceptance criteria:**

- Tier 2 promotion is repeatable and does not create duplicate Evidence Assertions (see
  REQ-ING-IDEM-003).

## 11. Graph Scale and “Active vs Historical” (Normative)

### REQ-SCALE-001 — Active vs historical separation

**Statement (MUST):** The system SHALL provide a first-class mechanism to separate active work/truth
from historical/superseded nodes in user-facing queries and projections.

**Operational definitions (minimum):**

- **Historical:** any node that is superseded, rejected, or otherwise no longer part of current
  committed truth.
- **Active (work):** plan steps that are not superseded, implement current commitments, are not
  blocked by unmet dependencies, and are not archived/retired.
- **Archived/retired:** explicitly de-prioritised or out-of-scope items that should not appear in
  default “active” views but remain queryable via history/lens.

**Acceptance criteria:**

- Default views do not swamp users with superseded history.
- Historical context remains accessible via explicit lens or history views.

---

### REQ-SCALE-001a — Archival/retirement semantics

**Statement (MUST):** The system SHALL support explicit archival/retirement semantics for Assertions
(especially Uncertainty, Option, PlanStep) without deleting history.

**Acceptance criteria:**

- Archived/retired nodes are excluded from default ActiveWork projections but remain queryable.

---

### REQ-SCALE-002 — Write-hot state via projections

**Statement (MUST):** Write-hot, rapidly changing state (e.g., “what is active next”) SHALL be
represented via projections or explicit append-only events, not mutable canonical properties.

**Acceptance criteria:**

- The canonical graph remains append-only.
- “Next steps” can be computed deterministically.

---

### REQ-SCALE-002a — Deterministic ActiveWork rules

**Statement (MUST):** The ActiveWork projection SHALL define deterministic inclusion rules based on
commitments, supersession, dependency readiness, and archival status.

**Acceptance criteria:**

- Given the same canonical graph state, ActiveWork returns the same ordered set.
- For each returned PlanStep, the system can explain which rule included it and which dependencies
  are satisfied/unsatisfied.

---

## 12. Required Query Capabilities (Normative)

### REQ-QUERY-001 — Why / rationale

**Statement (MUST):** The system SHALL answer: “Why did we choose X?” by returning the current/as-of
Decision(s), the Uncertainty(ies) they resolve, the Option(s) chosen/rejected, and the Evidence
Assertions anchored to ArtifactParts.

---

### REQ-QUERY-002 — What is current committed truth

**Statement (MUST):** The system SHALL answer: “What is the current committed truth for
feature/subject Y?” using deterministic selection, with lens metadata.

---

### REQ-QUERY-003 — What is next / blockers

**Statement (MUST):** The system SHALL answer: “What should we do next?” by returning ActiveWork
PlanSteps filtered by dependency readiness and linkage to commitments.

---

### REQ-QUERY-004 — Impact analysis

**Statement (MUST):** The system SHALL answer: “What is impacted if we change code
symbol/file/subject Z?” by traversing from ArtifactPart(code) and Subjects to SpecClauses,
Requirements, Decisions, Plans, and VerificationEvidence.

---

### REQ-QUERY-005 — Health / gaps

**Statement (MUST):** The system SHALL answer: “Where is the graph incomplete or inconsistent?” by
returning GraphHealth violations and dangling nodes (unlinked decisions, unverified requirements,
orphan plan steps, ambiguous supersession).

---

## 13. Notes on Database Choice (Informational)

This requirements document is database-agnostic. A graph database is a natural fit for the canonical
model, but equivalent semantics may be implemented in other stores provided all requirements above
(immutability, supersession, provenance, time lens, invariants, and query capabilities) are met.

---

## 14. Traceability to Former Problem Areas (Informational)

The requirements above address:

- Epistemic drift and decision loss → REQ-MODEL-006, REQ-INV-001, REQ-TIME-003
- Graph bloat and immutability scale → REQ-SCALE-001/002, REQ-PROJ-003
- External vs internal parity + ingest-to-graph → REQ-ING-001/002/003, REQ-MODEL-003
- Plans and dependencies → REQ-INV-004, REQ-QUERY-003
- Weak invariants → REQ-INV-\* and REQ-PROJ-003(5)
- Time lens correctness → REQ-TIME-\*
- Query usability without doc-types → REQ-PROJ-003, REQ-QUERY-\*

---

## 15. Normative Schemas and Contracts (Normative)

This section tightens “content” into required, machine-validatable schemas so nodes do not become
free-form documents.

### REQ-SCHEMA-001 — Assertion schema registry

**Statement (MUST):** The system SHALL maintain a schema registry for Assertion `kind` values. Each
schema MUST define required fields, optional fields, field types, and normalization rules.

**Acceptance criteria:**

- Validators can reject malformed Assertions.
- Schema versions are tracked and included in lens metadata.

---

### REQ-SCHEMA-002 — Minimum required fields per Assertion kind (v1)

**Statement (MUST):** The following minimum fields SHALL be required per kind. All kinds MAY
additionally include `notes` and `links` fields.

**Desire (Intent):**

- `goal`
- `success_criteria[]` (measurable where possible)
- `scope_subjects[]`

**Problem:**

- `problem_statement`
- `impact`
- `scope_subjects[]`

**Constraint:**

- `constraint_statement`
- `scope_subjects[]`

**Uncertainty:**

- `question`
- `unknowns[]`
- `risk_if_wrong`
- `scope_subjects[]`

**Option:**

- `proposal`
- `assumptions[]`
- `risks[]`
- `scope_subjects[]`

**Tradeoff:**

- `dimension` (e.g., cost/latency/complexity)
- `upside`
- `downside`
- `applies_to[]` (Option/Decision IDs)

**Decision:**

- `decision_statement`
- `rationale`
- `resolves_uncertainties[]`
- `chooses_options[]`
- `rejects_options[]` (optional)
- `tradeoffs[]` (optional)
- `waiver` (optional; see Section 29 / REQ-WAIVE-001 and Section 24 / REQ-VAL-002–003)

**Requirement:**

- `shall_statement`
- `acceptance_criteria[]`
- `priority` (bounded enum)
- `derived_from[]` (Desire/Problem/Decision)
- `scope_subjects[]`

**SpecClause:**

- `normative_text` (MUST/SHALL language)
- `refines_requirements[]`
- `acceptance_tests[]` (or references to VerificationEvidence targets)

**Plan:**

- `plan_statement`
- `plan_key` (stable identifier within a Project)
- `implements[]` (Decisions/Requirements/SpecClauses)
- `scope_subjects[]`
- `scope` (see REQ-SCOPE-001)

**PlanStep:**

- `step_statement`
- `implements[]`
- `definition_of_done`
- `depends_on[]` (optional)
- `order_hint` (optional)
- `priority` (optional bounded enum)
- `effort_estimate` (optional, e.g., S/M/L or points)
- `risk_level` (optional bounded enum)
- `scope` (see REQ-SCOPE-001)
- `inputs` (optional)
- `outputs` (optional)

**Validator note:** PlanSteps MUST link to a Plan via `PART_OF_PLAN` (see REQ-PLAN-003).

**WorkEvent:**

- `event_type` (started/blocked/unblocked/completed/cancelled/archived)
- `applies_to_plan_step_id` (optional denormalization; canonical target is `APPLIES_TO` edge)
- `event_reason` (optional)
- `event_payload` (optional structured details)

**Canonical rule:** `APPLIES_TO(WorkEvent → PlanStep)` is the source of truth. If
`applies_to_plan_step_id` exists it MUST match the edge.

**Evidence:**

- `claim`
- `stance` (supports/contradicts/neutral)
- `confidence` (see REQ-EVID-001)
- `anchors[]` (optional denormalization; canonical anchor is `ANCHORS` edge)

**Canonical rule:** `ANCHORS(Evidence → ArtifactPart)` is the source of truth. If `anchors[]` exists
it MUST match the edges.

**VerificationEvidence:**

- `method`
- `result` (pass/fail/partial + details)
- `validates[]` (Requirement/SpecClause IDs)
- `run_against[]` (ArtifactState IDs, when applicable)
- `execution_ref` (optional; CI run ID/URL)
- `environment` (optional; minimal reproducibility context)
- `artifacts[]` (optional; logs/outputs hashes or ArtifactParts)

**Acceptance criteria:**

- A validator can mechanically confirm required fields exist.

---

### REQ-SCHEMA-003 — Normalization rules

**Statement (MUST):** Schemas SHALL define normalization rules so agents do not drift.

**Minimum normalization rules (v1):**

- Subject references MUST use Subject IDs (aliases resolved at write time).
- Commitment links MUST use standard relationship vocabulary.
- Any free-text fields intended for display MUST be bounded in size.

**Acceptance criteria:**

- The system can reject writes that reference Subjects by raw strings when IDs exist.

---

## 16. Conflict Model and Contradiction Handling (Normative)

This section defines deterministic behaviour when commitments overlap or contradict.

### REQ-CONF-001 — Conflict keys

**Statement (MUST):** Decisions, Requirements, and SpecClauses SHALL carry a deterministic
`conflict_key` used to detect competing commitments.

**Minimum conflict_key derivation (v1):**

- `kind` + canonical `scope_subjects[]` + kind-specific key:
  - Requirement: normalized `shall_statement` key (or explicit `requirement_key`)
  - SpecClause: normalized `refines_requirements[]` + clause key
  - Decision: normalized `resolves_uncertainties[]` + decision key

**Acceptance criteria:**

- The same semantic commitment produces the same conflict_key across runs.

---

### REQ-CONF-002 — Contradiction detection

**Statement (MUST):** The system SHALL detect contradictions among committed Assertions sharing a
conflict_key and surface them in GraphHealth.

**Acceptance criteria:**

- GraphHealth marks contradictions as ERROR unless explicitly resolved.

---

### REQ-CONF-003 — Resolution policy

**Statement (MUST):** Contradictions SHALL NOT be silently resolved by “latest wins.” A resolving
Decision (or explicit waiver) MUST exist to select among competing commitments.

**Acceptance criteria:**

- “CurrentCommittedTruth” excludes contradictory commitments unless resolution exists.
- Projection explainability identifies the resolver.

---

### REQ-CONF-004 — Scoped coexistence

**Statement (SHOULD):** The system SHOULD support scoped commitments (e.g.,
environment/platform/version) such that non-overlapping scopes do not conflict.

**Acceptance criteria:**

- Two committed Requirements with the same base conflict_key but disjoint scopes do not trigger
  contradiction.

---

## 17. Plans and Work Execution Model (Normative)

### REQ-PLAN-001 — Plan identity and versioning

**Statement (MUST):** A Plan SHALL be represented as an immutable `Plan` Assertion with a stable
`plan_key` within a Project. Plan revisions SHALL be represented by superseding Plan Assertions that
reuse the same `plan_key`.

**Acceptance criteria:**

- A plan can be referenced stably over time while its steps evolve.
- The current Plan version is mechanically derivable via supersession.

---

### REQ-PLAN-003 — PlanStep membership

**Statement (MUST):** Every PlanStep SHALL belong to exactly one Plan via
`PART_OF_PLAN(PlanStep → Plan)`.

**Acceptance criteria:**

- Validator rejects PlanSteps missing PART_OF_PLAN.
- ActiveWork and plan-level queries can scope steps to a plan deterministically.

---

### REQ-PLAN-002 — PlanStep ordering

**Statement (MUST):** PlanStep ordering SHALL be deterministic.

**Rule (v1):**

1. topological order by `DEPENDS_ON`, then
2. ascending `order_hint` (optional), then
3. stable tiebreaker (created_at, then ID).

**Acceptance criteria:**

- Two runs produce identical ordering for the same plan version.

---

### REQ-WORK-001 — Progress and status via WorkEvents

**Statement (MUST):** Progress/state changes for PlanSteps SHALL be represented via append-only
WorkEvent Assertions, not mutable properties on PlanSteps.

**Minimum event types (v1):** started, blocked, unblocked, completed, cancelled, archived.

**Acceptance criteria:**

- ActiveWork uses WorkEvents to compute readiness and status.

---

### REQ-WORK-002 — Blocking semantics

**Statement (MUST):** A PlanStep is considered blocked if it has an unresolved `blocked` WorkEvent
more recent than any `unblocked` or `completed` WorkEvent.

**Acceptance criteria:**

- The system can explain exactly why a step is blocked.

---

### REQ-ARCH-001 — Archival/retirement representation

**Statement (MUST):** Archival/retirement SHALL be represented explicitly (via WorkEvent `archived`
or superseding Assertions) and MUST include a reason.

**Acceptance criteria:**

- Archived items are excluded from default active views and remain discoverable via history/lens.

---

## 18. Evidence Strength Model (Normative)

### REQ-EVID-001 — Confidence scale

**Statement (MUST):** Evidence Assertions SHALL use a fixed confidence enum:

- `very_low`, `low`, `medium`, `high`, `very_high`

**Acceptance criteria:**

- Agents cannot emit arbitrary numeric confidence values.

---

### REQ-EVID-002 — Retention strength integration

**Statement (MUST):** Projections and query responses SHALL surface both evidence confidence and
retention strength (link-only/excerpt-backed/hashed-only) for cited Evidence.

**Acceptance criteria:**

- “Why” answers expose weak provenance.

---

### REQ-EVID-003 — Minimum evidence quality for committed Decisions

**Statement (SHOULD):** A committed Decision SHOULD have at least one Evidence Assertion with
confidence ≥ `medium` and non-weak provenance, or carry an explicit waiver.

**Acceptance criteria:**

- GraphHealth flags committed Decisions lacking adequate evidence unless waived.

---

## 19. Retention Boundaries and Raw-Input Prohibition (Normative)

### REQ-RET-001 — Excerpt bounds

**Statement (MUST):** Stored excerpts MUST be bounded to avoid turning the graph into a raw content
archive.

**Minimum bounds (v1):**

- `text_excerpt` per ArtifactPart MUST be ≤ 2,000 characters by default (configurable per source
  with an upper cap).
- total stored excerpts per ArtifactState SHOULD be bounded (e.g., ≤ 200,000 characters) unless
  explicitly approved.

**Acceptance criteria:**

- GraphHealth flags “raw-like retention” when bounds are exceeded.

---

### REQ-RET-002 — Hash requirements

**Statement (MUST):** ArtifactState MUST store `content_hash`. If excerpts are stored, ArtifactPart
SHOULD store `part_hash`.

**Acceptance criteria:**

- Re-ingestion can detect duplicates and verify stability.

---

### REQ-RET-003 — Raw-like retention detection

**Statement (MUST):** The system SHALL detect attempts to store “raw pages” by chunking content into
many excerpts.

**Minimum detection rule (v1):**

- If multiple ArtifactParts share the same page/document locator root (e.g., same URL without
  fragment, or same file path) AND the summed excerpt length exceeds a configurable threshold OR the
  estimated coverage exceeds a threshold, GraphHealth MUST flag the ArtifactState as raw-like
  retention.

**Acceptance criteria:**

- Raw-like retention is detectable and queryable.
- Retention violations are reported with severity (see REQ-VAL-001).

---

## 20. Subject Equivalence and Merge Workflow (Normative)

### REQ-SUBJ-001 — Equivalence assertion protocol

**Statement (MUST):** Subject equivalence (`EQUIVALENT_TO`) MUST include a reason and provenance,
and SHOULD include confidence.

**Acceptance criteria:**

- Equivalence links are auditable.

---

### REQ-SUBJ-002 — Deterministic resolution rules

**Statement (MUST):** Projections SHALL resolve equivalence deterministically. If equivalence is
ambiguous (multiple competing canonicals), GraphHealth MUST flag it and projections MUST NOT
silently choose.

**Acceptance criteria:**

- Ambiguity results in an explicit error/warning outcome.

---

### REQ-SUBJ-003 — Merge decision

**Statement (SHOULD):** The system SHOULD support an explicit merge decision mechanism to select a
canonical Subject and record the rationale.

**Acceptance criteria:**

- A merge decision results in stable canonical identity for future writes.

---

## 21. Ingestion Idempotency and Deduplication (Normative)

### REQ-ING-IDEM-001 — ArtifactState idempotency

**Statement (MUST):** Ingestion SHALL be idempotent for the same (ArtifactRoot, version_ref,
content_hash).

**Acceptance criteria:**

- Re-ingesting the same content does not create duplicate ArtifactStates.

---

### REQ-ING-IDEM-002 — Duplicate detection

**Statement (MUST):** If a retrieval produces an identical content_hash to an existing ArtifactState
for the same ArtifactRoot, the system MUST reuse or alias the existing ArtifactState rather than
creating a duplicate.

**Acceptance criteria:**

- Duplicate states are prevented or explicitly aliased.

---

### REQ-ING-IDEM-003 — Tier 2 promotion idempotency

**Statement (MUST):** Tier 2 promotion MUST be repeatable without creating duplicate Evidence
Assertions.

**Rule (v1):** Evidence Assertions SHOULD be keyed deterministically by (anchor ArtifactPart IDs +
target Assertion ID + stance + normalized claim hash).

**Acceptance criteria:**

- Retrying promotion produces the same Evidence nodes/links.

---

## 22. Locator Specification (Normative)

### REQ-LOC-001 — Locator schema by source_kind

**Statement (MUST):** ArtifactPart locators MUST conform to a source_kind-specific schema.

**Code locator (minimum):**

- `repo_root_id`
- `commit` (or tag)
- `path`
- `language`
- optional `symbol_id`
- optional `span` (start/end line/column or offsets)

**Web locator (minimum):**

- `url`
- `retrieved_at` (or version)
- optional `heading_path[]`
- optional `fragment_id`

**Threaded locator (minimum):** as per REQ-ING-006.

**Acceptance criteria:**

- Validators reject ArtifactParts missing mandatory locator fields for their source_kind.

---

## 23. Projection Output Envelope (Normative)

### REQ-PROJ-OUT-001 — Uniform projection envelope

**Statement (MUST):** All projections SHALL return a uniform envelope schema.

**Minimum envelope fields (v1):**

- `projection_name`
- `projection_rule_version`
- `lens` (current/as-of + timestamp)
- `schema_version`
- `items[]` (each with stable `item_id` and `item_type`)
- `explanations[]` or `explain(item_id)` endpoint/field
- `ordering` metadata
- pagination (`limit`, `cursor` or equivalent)

**Acceptance criteria:**

- Clients can consume projections without per-projection bespoke parsing.

---

### REQ-PROJ-OUT-002 — Stable ordering rules

**Statement (MUST):** Each projection SHALL declare deterministic ordering rules.

**Acceptance criteria:**

- Identical graph states yield identical item order.

---

## 24. Validation Enforcement, Staging, and Waivers (Normative)

### REQ-VAL-001 — Severity levels

**Statement (MUST):** Validators SHALL assign severity levels: `ERROR`, `WARN`, `INFO`.

**Acceptance criteria:**

- GraphHealth surfaces violations with severity.

---

### REQ-VAL-002 — Enforcement rules

**Statement (MUST):** Canonical writes with `epistemic_type=committed` MUST NOT be accepted if they
trigger `ERROR` validations, unless accompanied by an explicit waiver.

**Acceptance criteria:**

- The system can enforce or simulate enforcement deterministically.

---

### REQ-VAL-003 — Waiver representation

**Statement (MUST):** Waivers SHALL be represented as first-class, queryable `Waiver` Assertions
with provenance, reason, and optional expiry/review fields (see Section 29 / REQ-WAIVE-001).

**Acceptance criteria:**

- Queries can list all waivers and what they waive.

---

### REQ-VAL-004 — Staging area (optional but recommended)

**Statement (SHOULD):** The system SHOULD support a staging area for agent outputs prior to
committing them into canonical history.

**Acceptance criteria:**

- Staged content is queryable for review but does not affect CurrentCommittedTruth until committed.

---

## 25. Project Scoping and Multi-Project Operation (Normative)

### REQ-PROJECT-001 — Project partitioning

**Statement (MUST):** Every canonical node (Subject, ArtifactRoot/State/Part, Assertion, Agent,
Activity) MUST link to exactly one Project via `BELONGS_TO`.

**Acceptance criteria:**

- Validators reject canonical nodes without Project membership.
- All projections require an explicit Project parameter.

---

## 26. Supersession Semantics and Visibility (Normative)

### REQ-SUP-001 — Supersession meaning and transitivity

**Statement (MUST):** `SUPERSEDES(A → B)` (see Section 6 / REQ-REL-004) means A replaces B for the
same semantic role within the same Project. Supersession MUST be treated as transitive for “current
truth” selection.

**Acceptance criteria:**

- The system can compute the latest non-superseded node for any supersession chain.

---

### REQ-SUP-002 — Branching supersession

**Statement (MUST):** If a node is superseded by multiple successors (branching), GraphHealth MUST
flag ambiguity unless a resolving Decision/Waiver selects a single active branch.

**Acceptance criteria:**

- Ambiguous branches are surfaced and do not silently affect CurrentCommittedTruth.

---

### REQ-SUP-003 — As-of visibility rule

**Statement (MUST):** For an as-of timestamp T, a node B is considered superseded only if there
exists a successor A such that `created_at(A) <= T` and A supersedes B (directly or transitively).

**Acceptance criteria:**

- As-of queries return the correct “then-current” version.

---

## 27. Scope Model (Normative)

### REQ-SCOPE-001 — Unified scope object

**Statement (MUST):** Commitments and execution objects (Decision, Requirement, SpecClause, Plan,
PlanStep) SHALL include a unified `scope` object.

**Minimum scope fields (v1):**

- `environment` (e.g., dev/prod/all)
- `platform` (e.g., web/mobile/backend/all)
- `component_subject_id` (optional)
- `version_range` (optional)

**Acceptance criteria:**

- Conflicts/contradictions use scope overlap rules.
- Default scope is explicit (e.g., `all`) rather than implicit.

---

### REQ-SCOPE-002 — Scope overlap predicate

**Statement (MUST):** The system SHALL define deterministic scope overlap rules so conflict
detection is mechanical.

**Acceptance criteria:**

- Two commitments with disjoint scopes do not conflict.

---

## 28. Deterministic Canonicalization and Idempotency (Normative)

### REQ-CONF-001a — conflict_key canonicalization

**Statement (MUST):** conflict_key derivation SHALL use a deterministic canonicalization and hashing
process.

**Minimum canonicalization (v1):**

- lower-case
- trim
- collapse whitespace
- remove a fixed punctuation set
- stable tokenization

**Hash rule (v1):**

- `conflict_key = sha256("v1" + kind + sorted(scope_subject_ids) + scope + canonical_text_or_keys)`

**Acceptance criteria:**

- Independent implementations produce identical conflict keys.

---

### REQ-IDEM-SUBJ-001 — Subject idempotency

**Statement (SHOULD):** Subject creation SHOULD be idempotent within a Project using deterministic
keys (canonical_name + normalized alias set), to reduce duplication.

**Acceptance criteria:**

- Repeated creation attempts yield one canonical Subject or a deterministic equivalence suggestion.

---

### REQ-IDEM-ASSERT-001 — Assertion idempotency (non-Artifact)

**Statement (SHOULD):** For common Assertion kinds, the system SHOULD support deterministic
idempotency keys to prevent duplicate nodes from repeated agent runs.

**Minimum idempotency key strategy (v1):**

- For commitments: use `conflict_key` + schema version.
- For Evidence: use REQ-ING-IDEM-003.
- For Uncertainty/Option: use (kind + scope_subjects + canonicalized question/proposal hash).

**Acceptance criteria:**

- Retrying an Activity does not explode node counts.

---

## 29. Waivers and Exceptional Paths (Normative)

### REQ-WAIVE-001 — Waiver as a first-class Assertion

**Statement (MUST):** Waivers SHALL be represented as a `Waiver` Assertion kind (not an unstructured
object) and linked via `WAIVES`.

**Minimum Waiver schema (v1):**

- `waives[]` (validation IDs or target node IDs)
- `reason`
- `scope` (optional)
- `expires_at` (optional)

**Acceptance criteria:**

- Validators and projections can discover waivers mechanically.

---

## 30. Projections, Explanations, and GraphHealth (Normative)

### REQ-EXPL-001 — ExplanationPath schema

**Statement (MUST):** The system SHALL provide a standard ExplanationPath schema used by projections
and query responses.

**Minimum fields (v1):**

- `lens` metadata
- `rule_version`
- `path_nodes[]` (IDs + types)
- `path_edges[]` (types + direction)
- `top_evidence[]` (Evidence IDs + anchors + confidence + retention strength)

**Acceptance criteria:**

- “Why” and “Impact” answers can return an explainable traversal path.

---

### REQ-HEALTH-001 — Mandatory GraphHealth checks

**Statement (MUST):** GraphHealth SHALL include, at minimum, the following checks with severities:

- unknown relationship types
- missing mandatory links per kind (e.g., PART_OF_PLAN, ABOUT_SUBJECT for commitments)
- supersession cycles
- branching supersession ambiguity
- contradiction conflicts
- orphan PlanSteps
- Evidence missing anchors
- ambiguous Subject equivalence
- retention violations (raw-like retention, missing hashes)
- locator schema violations

**Acceptance criteria:**

- GraphHealth output is deterministic and complete for these checks.

---

### REQ-ACTIVE-001 — ActiveWork prioritization (optional but standard)

**Statement (SHOULD):** ActiveWork SHOULD provide deterministic ordering that can incorporate
optional PlanStep priority/effort/risk fields.

**Acceptance criteria:**

- Ordering rules are declared and stable.

---

## 31. External Source Rights and Metadata (Normative)

### REQ-LIC-001 — License/rights metadata

**Statement (SHOULD):** ArtifactRoots and ArtifactStates SHOULD record basic license/rights metadata
to enforce retention mode constraints.

**Minimum fields (recommended):**

- `license_type` (unknown/oss/proprietary/etc.)
- `attribution_required` (boolean)
- `allowed_retention_modes[]`

**Acceptance criteria:**

- GraphHealth warns when license is unknown for excerpt-backed retention.

---

## 32. Locator Mapping Across Versions (Normative)

### REQ-LOC-002 — Cross-version mapping (optional)

**Statement (SHOULD):** The system SHOULD support mapping “equivalent” code/web parts across
ArtifactStates via `EQUIVALENT_PART` edges or a deterministic mapping projection.

**Acceptance criteria:**

- Impact and history views can follow a logical entity across refactors when mapping exists.

---

## 33. Activity Atomicity and Transactions (Normative)

### REQ-TX-001 — Activity atomic commit

**Statement (MUST):** Canonical writes generated in an Activity SHALL be committed atomically, or
the Activity MUST be explicitly marked partial/failed with recovery semantics.

**Acceptance criteria:**

- Queries can distinguish complete Activities from partial ones.

---

## 34. Additional Tightening (Normative)

### REQ-ART-ABOUT-001 — ArtifactRoot subject linkage

**Statement (SHOULD):** ArtifactRoots SHOULD link to relevant Subjects via `ABOUT_SUBJECT` (not only
parts), enabling cheap “list all sources for Subject X” queries.

**Acceptance criteria:**

- The system can enumerate sources for a Subject without scanning all parts.

---

### REQ-ABOUT-001 — ABOUT_SUBJECT enforcement for commitments

**Statement (MUST):** Decision, Requirement, SpecClause, Plan, and PlanStep MUST have at least one
`ABOUT_SUBJECT` link.

**Acceptance criteria:**

- Validator rejects committed items without Subject linkage.

---

### REQ-VER-REPRO-001 — Verification reproducibility linkage

**Statement (SHOULD):** VerificationEvidence SHOULD reference an execution context (Activity and/or
execution_ref) and retain enough metadata to reproduce or audit the result.

**Acceptance criteria:**

- GraphHealth warns when VerificationEvidence lacks reproducibility context.

---

### REQ-SUM-001 — Derived summaries (optional)

**Statement (SHOULD):** The system SHOULD support an optional `Summary` (or `DerivedSummary`)
Assertion kind for durable, human-readable summaries that are explicitly derived from canonical
nodes.

**Minimum fields (recommended):**

- `summary_text` (bounded)
- `derived_from[]` (node IDs)
- `summary_scope_subjects[]`

**Acceptance criteria:**

- Summaries are clearly non-authoritative unless explicitly committed, and remain traceable to
  sources.

---

## 35. Open Questions (Remaining)

1. Should the scope object be mandatory for _all_ Assertion kinds (not just commitments), to
   simplify uniform filtering?
2. Should cross-version locator mapping (REQ-LOC-002) be implemented as an explicit edge creation
   workflow, as a projection-only feature, or both?
3. What are the default ingestion depth presets (profiles) and the governance model for changing
   them (who/when/approval)?
4. Should ActiveWork incorporate capacity constraints (e.g., WIP limits) in addition to
   priority/effort/risk?
5. Should Summary assertions be permitted to influence CurrentCommittedTruth, or remain strictly
   informational/derived?

---

## Related Requirements

Summary: No explicit cross-document requirements listed in this document.

- None specified

---

## Design Decisions

| Field                  | Decision 001  |
| ---------------------- | ------------- |
| **Title**              | Not specified |
| **Options Considered** | Not specified |
| **Chosen**             | Not specified |
| **Rationale**          | Not specified |
| **Tradeoffs**          | Not specified |
| **Blocked**            | Not specified |
| **Expires**            | Not specified |
| **Decision Date**      | Not specified |

---

## Blockers

| Blocker | Status | Unblocks When | Impact |
| ------- | ------ | ------------- | ------ |
| None    | N/A    | N/A           | N/A    |
