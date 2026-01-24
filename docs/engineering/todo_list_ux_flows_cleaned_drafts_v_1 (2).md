# UX / UI Requirements for a Graph-Backed AI Coding System

## Purpose

This document defines the **UI and UX elements required** for a user to efficiently work with a
system backed by a large, append-only, provenance-rich knowledge graph.

The guiding principles are:

- The system is always doing _something non-trivial_ in the background (reasoning, planning,
  executing, reconciling).
- The user must **always be able to understand what is going on**, even if not all data is shown at
  once.
- **All data must be accessible**, but not all data must be visible at all times.
- Chat is not the system of record; the knowledge graph is.

---

## Core Assumptions

- A significant graph-based knowledge system exists behind the scenes.
- All decisions, plans, evidence, assumptions, and executions are stored as immutable nodes with
  explicit supersession and provenance.
- “Current truth” is a derived projection, not a mutable state.
- The UI is a set of _projections over graph state_, not a parallel memory system.

---

## Fundamental UX Principle

> **Every system turn produces a change in the graph.**
>
> The UI’s job is to expose _projections of that change_ at appropriate levels of detail.

Chat messages, side panels, expandable views, and timelines are all different _views of the same
underlying deltas_.

---

## Information Visibility Levels

Information is not classified by importance alone, but by **user intent** and **interaction cost**.

### Level 0 — Approval Gates

**User intent:** “Am I authorising this?”

- Architecture choices
- Scope commitments
- Provider selections
- Acceptance of plans or changes

**UX requirements:**

- Must be explicit
- Must block progress until resolved
- Must be acknowledged by the user

**Primary surface:** Chat

---

### Level 1 — Rationale & Attribution

**User intent:** “Why is the system doing this?”

- Reasoning behind proposals or actions
- Attribution to global / project / feature preferences
- Trade-offs and constraints

**UX requirements:**

- Available at the moment of action
- Concise by default
- Expandable for detail

**Primary surface:** Chat (inline explanation) **Secondary surface:** Expandable details

---

### Level 2 — Execution Evidence

**User intent:** “What actually changed?”

- Files created or modified
- Migrations
- Routes, APIs, configs
- Tests and verification results
- External artifacts produced or referenced

**UX requirements:**

- Structured, scannable
- Filterable and inspectable
- Never hidden inside chat text

**Primary surface:** Dedicated UI windows

---

### Level 3 — System Memory

**User intent:** “What does the system know, believe, or remember?”

- Decisions and their rationale
- Superseded vs current commitments
- Assumptions
- Open uncertainties
- Historical context

**UX requirements:**

- Always accessible
- Never interrupt the main flow
- Clearly time-scoped (current vs as-of)

**Primary surface:** Dedicated UI windows

---

## Fixed UI Windows (Persistent Projections)

**Time lens requirement:** Every window must respect and clearly display the active time lens
(current vs as-of). Results must disclose the lens and selection rule used to determine “current
truth” or “as-of truth,” so users can distinguish committed truth from historical or superseded
states.

These windows reflect the _current aggregated graph state_, not individual messages.

### 1. Decisions & Commitments

Shows:

- Current decisions
- Requirements and spec-level commitments
- Accepted plan steps

Answers:

- “What is currently true?”
- “What must remain true?”

---

### 2. Proposals & Open Questions

Shows:

- Pending decisions
- Unresolved uncertainties
- Missing evidence

Answers:

- “What is blocking progress?”
- “What still needs input?”

---

### 3. Plan & Execution State

Shows:

- Active plan steps
- Dependencies and blockers
- Completion and verification status

Answers:

- “What is the system doing now?”
- “What happens next?”

---

### 4. Changes & Evidence

Shows:

- Recent execution deltas
- Code and config changes
- External evidence and artifacts

Answers:

- “What changed as a result of recent actions?”
- “What evidence supports current decisions?”

---

### 5. Knowledge & Assumptions

Shows:

- Active assumptions
- Inferred constraints
- Preference layers in effect (global / project / feature)

Answers:

- “What does the system currently believe?”
- “At what scope and confidence?”

---

## Parallel Chats and Explicit Scope

Complex projects require concurrent threads of work and inquiry. The UI must support **multiple chat
tabs running at the same time**, where each tab is a _scoped reasoning session over the same
underlying knowledge graph_.

This is fundamental for throughput: while the orchestrator is executing or researching in one chat,
the user must be able to work in other chats concurrently. Each chat proceeds independently under
its own context.

### Chat tabs are first-class, independent sessions

A chat tab is a **first-class session** over the same underlying knowledge graph. All chat tabs are
equal; there are no special-purpose chat types.

Each chat tab is independent and defined entirely by its **context**, not by its role:

- **Scope:** which project(s) and optionally which feature(s) the tab is operating on
- **Work type:** what kind of work is being performed (see below)
- **Time lens (optional):** current truth vs as-of historical view

Chats do not own memory or truth. The authoritative system of record remains the graph; the chat is
a narrative and control surface.

### Chat Context Bar (always visible)

The chat UI must present an always-visible **Context Bar** (or equivalent always-on area) that
groups the tab’s context in one place:

- **Scope:** selected project(s) and optionally feature(s)
- **Work type:** Read-only / Research / Planning / Commit / Execution
- **Time lens (optional):** current truth vs as-of historical view

**Requirements:**

- Context is visible at all times and is not hidden behind menus.
- Context changes are explicit and traceable.
- Context changes that increase risk require HITL confirmation before taking effect.

### Scope must be visible and easy to change

The chat UI must expose the **current scope at all times**. At minimum, users must be able to set
**project scope** per chat tab using an explicit control (for example: a selector, checkbox group,
or scoped “pill” tokens). Scope must not be implicit or hidden.

**Requirements:**

- Scope is always visible in the chat header (or equivalent always-on area).
- Scope is changeable with minimal friction.
- Scope changes are explicit and traceable (recorded as part of the session context).

### Context changes require HITL confirmation

Changes to a chat’s **context** that increase risk must require explicit human-in-the-loop (HITL)
confirmation.

This includes:

- Scope widening (e.g. single project → multi-project)
- Escalation to higher-risk work types (e.g. Research → Commit, Commit → Execution)
- Scope widening combined with work type escalation (stronger confirmation)

Context changes that reduce risk (e.g. Execution → Research, Commit → Read-only, scope narrowing)
must not require confirmation.

Context changes may be initiated via UI controls or via natural-language requests in chat, but must
never take effect implicitly.

### Work types (per chat tab)

Each chat tab operates in exactly one **work type** at a time. Work types describe _how the user
intends to work_ and imply what kinds of graph writes and operations are allowed. They are not
workflows and do not impose ordering.

Supported work types:

- **Read-only:** inspect, explain, audit, and query without any graph writes
- **Research (Exploratory):** ingest sources, structure artifacts, create evidence, options, and
  hypotheses without creating or superseding commitments. Research outputs must be explicitly marked
  as **exploratory posture** and must never affect “current committed truth.” UI projections must
  clearly distinguish exploratory outputs from committed decisions/requirements/specs.
- **Planning (Draft):** create draft plans and proposed decisions without committing them
- **Commit:** create or supersede committed decisions, requirements, and specifications; promote
  drafts to committed truth. Promotion from draft/proposed to committed must be an explicit,
  traceable act (a visible delta), not an implicit consequence of conversation.
- **Execution:** modify code/config, run tooling, and attach verification evidence linked to
  commitments

All work types are available in all chats. Any chat may switch from any work type to any other at
any time.

**Clarification:** all transitions are available; transitions that increase risk require HITL
confirmation before taking effect (see Context changes require HITL confirmation).

### Cross-scope questions must be explicit

Because multiple chats can operate concurrently, the system must never silently widen scope. Queries
like “If we removed X what would break?” must always require an explicit scope selection in the
active chat context (feature-only vs project vs multi-project).

---

## Chat as a Control and Narrative Surface

The system may **recommend switching work type** when it detects a mismatch between the user’s
request and the current chat context (for example, requesting execution while in Research mode).

Such recommendations must:

- Be explicit and explain _why_ the switch is suggested
- Require HITL confirmation before the context changes
- Never auto-switch work type or scope

**Typical triggers (examples):**

- Requesting code/config changes, running tooling, or producing artifacts while not in **Execution**
- Requesting a committed decision/requirement/spec change while not in **Commit**
- Requesting a draft implementation plan while not in **Planning**
- Requesting ingestion, structuring, indexing, or evidence capture while not in **Research
  (Exploratory)**
- Requesting historical “as-of” answers while the tab is not using an appropriate **time lens**

Chat is **not** a storage mechanism.

Chat is used to:

- Ask questions
- Propose decisions
- Request confirmation
- Announce completion or state changes

**Rule:**

> Anything that matters must exist outside chat.

Chat must remain usable for the current step even if side panels are closed, but authoritative
details and durable context live in the graph-derived UI panels.

---

## Per-Message Expandable Detail (Delta Views)

Each system message may expose expandable sections derived from _that turn’s graph delta only_:

- **WHY** — rationale assertions added this turn
- **WHAT CHANGED** — execution artifacts created this turn
- **WHAT I LEARNED** — new knowledge or assumptions recorded
- **WHAT REMAINS UNKNOWN** — explicitly unresolved uncertainties

These are **diff views**, not full state views.

### Turn artifacts and inspectability

To make the expandable detail reliable, it must be generated from **structured turn artifacts**, not
reconstructed from chat text.

Each assistant/system message corresponds to a **turn**: a unit of orchestration work, graph
mutation, and user-visible output. For every turn, the system must produce two linked artifacts:

- **Turn Delta (graph mutation):** the authoritative summary of what changed in the knowledge graph
  during the turn.
- **Turn Trace (execution provenance):** the record of what happened operationally (agents/nodes
  invoked, tool calls, retries, errors, timing) in a normalised form suitable for inspection.

The Per-Message Expandable Detail must be rendered primarily from the **Turn Delta**, with optional
access to the **Turn Trace** for deeper debugging.

### Message-to-turn linkage (required)

Every assistant/system message must carry a stable reference to its underlying turn artifacts:

- **turn_id:** stable identifier for the turn
- **delta_ref:** reference to the Turn Delta object(s)
- **trace_ref:** reference to the Turn Trace object (or trace segments)
- **context_snapshot:** the chat context at the time the message was produced (scope + work type +
  time lens)

This linkage is required so that users can inspect what happened per message without rereading prior
history, and so that projections remain correct under concurrency (multiple chats running in
parallel).

### On-demand expansion

Expandable sections should be loaded on demand (rather than embedded in the chat text) to avoid
noise and to keep the chat stream lightweight.

**Requirements:**

- Expanding a message retrieves the associated Turn Delta (and optionally Turn Trace).
- Expandables must include deep links to authoritative graph objects created or referenced in the
  turn.
- Expandables must disclose epistemic posture where relevant (exploratory/draft/committed).

### Guardrails for “WHY”

The **WHY** view must not become a dumping ground for raw internal reasoning. It must contain:

- structured rationale assertions
- explicit trade-offs (where applicable)
- evidence/provenance links

If a full operational trace is needed, it must be accessed via the Turn Trace view rather than
expanding the narrative text.

### Context-sensitive inspection

Inspection views must respect the active chat context:

- **Scope** determines which objects are in-view vs out-of-scope.
- **Time lens** determines whether “current truth” or “as-of truth” is being shown.
- **Work type** influences what actions are available from inspection (read-only vs propose vs
  commit-capable vs execution actions).

---

## Accessibility and Discoverability Requirements

### Minimum access affordances

To make “all data accessible” operational rather than aspirational, the UI must provide at minimum:

- **Deep links** from chat items to authoritative graph objects (decision, plan step, evidence,
  artifact)
- **Global search** across graph entities (scoped by the active chat context when desired)
- **Filtering** in each window by scope, time lens, and epistemic posture
  (exploratory/draft/committed)
- **Drill-down** paths from any summary item to underlying provenance (artifacts, evidence
  assertions, supersession chain)
- **Open in new chat**: ability to open an object (or query) in a new chat tab with an explicit,
  visible context (scope + work type + time lens)

- Every item shown in chat must link to its authoritative representation in the graph-derived UI.
- Every UI window must support drill-down to underlying evidence and provenance.
- Users must be able to answer, at any time:
  - “Why does this exist?”
  - “What changed recently?”
  - “What is still uncertain?”
  - “What is the system doing next?”

---

## Success Criteria

The UX is successful if:

- Users never need to reread chat history to understand the system state.
- All important information is accessible without interrupting the main flow.
- The system feels inspectable, not opaque.
- The UI scales with project complexity without becoming noisy.
