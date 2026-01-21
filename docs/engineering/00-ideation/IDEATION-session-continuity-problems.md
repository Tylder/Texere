```yaml
---
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: session-continuity
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: 'Session resets force repeated repo research; historical knowledge and constraints are lost; task state cannot be resumed; schema evolution breaks interpretation'
summary_long: 'Identifies 4 critical continuity problems: new sessions behave as though they have never seen the repo, causing costly re-discovery; long-term decisions and constraints cannot be reliably recovered; tasks cannot be paused and resumed without losing intermediate findings; and knowledge schema evolution breaks interpretation of older stored knowledge. Continuity is blocked by lack of durable state infrastructure (see IDEATION-state-and-visibility-problems).'
related_ideation: [IDEATION-state-and-visibility-problems, IDEATION-grounding-and-freshness-problems]
drives: []
---
```

## Document Relationships

**Upstream (context):**

- IDEATION-state-and-visibility-problems.md (state structure must be in place first)

**Downstream (informs):**

- Requirements for durable session storage
- INIT-<feature>.md documents

**Siblings (other ideation docs):**

- IDEATION-state-and-visibility-problems.md (what to persist)
- IDEATION-grounding-and-freshness-problems.md (keeping persisted knowledge fresh)

**Related:**

- Session management architecture
- Knowledge storage and retrieval systems

---

## TLDR

**Summary:** Every new session forces the agent to rediscover repo facts, forget decisions, lose task context, and reinterpret knowledge from a moving schema. This wastes time and creates inconsistency.

**What:** Enable the system to retain and accurately use knowledge across session boundaries without requiring expensive re-ingestion or re-research.

**Why:** Session resets destroy continuity, force rework, create inconsistency, and make long-running projects impractical. Cost and time waste are significant.

**How:** Design durable storage for epistemic state, decision rationale, task progress, and schema versioning that survives sessions reliably.

**Status:** Discovery phase; continuity is critical for multi-day and multi-week projects.

**Critical questions to answer:**

- What knowledge must survive session resets, and what is safe to re-discover?
- How do we handle schema evolution without corrupting old knowledge?
- How should task interruption be managed (checkpoints, state snapshots, resumable context)?

---

## Scope

**Includes:**

- Session re-entry without forcing full repo re-discovery
- Accurate recovery of prior decisions and constraints
- Task interruption and resumability (ability to pause and resume without losing progress)
- Knowledge schema evolution and backward compatibility
- Consistency of beliefs across sessions

**Excludes:**

- Specific storage mechanisms or databases
- Cache invalidation strategies (belongs in freshness docs)
- Full conversation history preservation (belongs in traceability docs)

**In separate docs:**

- What state structure to persist: IDEATION-state-and-visibility-problems.md
- Keeping knowledge fresh over time: IDEATION-grounding-and-freshness-problems.md
- Environmental and dependency consistency: IDEATION-integration-and-execution-problems.md

---

## Overview

An agent-assisted coding system must survive session boundaries. Work that begins in one session must resume in the next without forced re-discovery, knowledge loss, or inconsistency. Without reliable continuity, projects longer than a few hours become impractical.

This document identifies 4 core continuity problems: session resets, loss of historical knowledge, unresumable task state, and schema evolution failures. These problems compound: each new session loses decisions, each decision loss forces rework, and inconsistent knowledge creates bugs.

---

## Problems

### Problem 1: PROB-001 — Session resets force repo research from scratch

**Tags:** [Continuity] [Cost] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem Statement**

A new session behaves as though the system has never been seen before. The agent must re-establish repo facts, patterns, invariants, and prior investigations repeatedly.

**Failure Modes**

- Re-reading large parts of the codebase to answer routine questions.
- Inconsistent answers across sessions about the same code.
- Repeated discovery of the same key files, flows, and constraints.
- Tokens and time wasted on redundant exploration.

**Scenarios / Examples**

- A user asks "Where is auth enforced?" in week 2. The agent re-scans the repo, finds different entry points than last session, and gives a new answer without acknowledging the prior investigation.
- The agent investigates how dependency injection works in the codebase in session 1; in session 2, it re-investigates the same patterns from scratch.
- Key architectural invariants (e.g., "all services must be registered in this file") are rediscovered each session instead of being retained.

**Resolution Indicators**

- Routine repo questions can be answered accurately at session start without re-ingesting large volumes of source text.
- The agent can reference prior investigations (what was checked, what was found, what remains unknown) without redoing them.
- The system consistently distinguishes **confirmed repo facts** from **inferred** or **unknown** items.
- Cost of re-entry (tokens, latency) is bounded and minimal.

**Impact**

- High: Persistent cost/time waste; scales poorly with repo size.
- Affects: All users doing multi-session work.
- Frequency: Every new session; compounded over weeks of work.

**Non-goals / Boundaries**

- Not a requirement to "store the whole repo forever" or mandate a specific indexing approach; the problem is repeated re-discovery and inconsistent re-entry.

---

### Problem 2: PROB-004 — The agent cannot behave like it has deep, accurate historical knowledge

**Tags:** [Continuity] [Traceability] [Epistemic]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

A productive long-running coding assistant must appear to "remember" prior decisions and context, but more importantly, it must **operate correctly** on that history.

**Failure Modes**

- The agent repeats previously rejected ideas.
- The agent ignores established constraints and rationale.
- The agent cannot explain why the current plan exists.
- The agent misses known weaknesses that were previously identified.
- Decisions are re-litigated as if they were never made.

**Scenarios / Examples**

- A week after choosing a database approach, the agent recommends replacing it, not because of new evidence, but because it cannot recover the decision rationale.
- An architectural constraint ("Must support horizontal scaling") was established in week 1; by week 3, the agent proposes a solution incompatible with this constraint, having forgotten it exists.
- A rejected approach ("Don't use Redux, use Context API") is suggested again in week 2 as if never tried.

**Resolution Indicators**

- The agent can accurately restate prior decisions, constraints, and rationale, and identify what remains open.
- The agent consistently detects drift (contradictions, reversals, missing rationale) relative to previously accepted baselines.
- Recommendations explicitly incorporate known constraints and decision history, rather than re-litigating settled items.
- The system flags when a suggestion contradicts a prior decision and explains the discrepancy.

**Impact**

- High: Loss of decisional continuity; rework and flip-flopping.
- Affects: Architecture stability, user trust, project coherence.
- Frequency: Every multi-week project; compounds with time.

**Non-goals / Boundaries**

- Not "perfect memory of every conversation"; the problem is inability to reliably act on key prior decisions and constraints.

---

### Problem 3: PROB-022 — Knowledge schema evolution breaks long-lived continuity

**Tags:** [Continuity] [Traceability] [Epistemic]

**Classification:** Frequency: Medium · Impact: Medium · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Any durable knowledge (facts, decisions, research) accumulates over time. When the way this knowledge is structured changes, older knowledge becomes hard to interpret, causing continuity breaks and subtle corruption.

**Failure Modes**

- Old decisions cannot be interpreted under the current structure.
- The system silently drops fields or meaning during transitions.
- Long-lived projects become increasingly inconsistent as "eras" of knowledge diverge.
- Migrations between schema versions lose or corrupt data.
- Different sessions use different schema versions, leading to inconsistency.

**Scenarios / Examples**

- Earlier sessions tracked constraints informally in a "notes" field; later sessions track them explicitly in a "constraints" array. When revisiting, the system fails to reconcile the two and misses constraints.
- A decision record structure changes to include new fields (e.g., "risk_level"). Old decisions lack these fields; the system cannot use the new fields for old decisions, causing inconsistency.
- The "current plan" moves from a long narrative text to a structured outline; old plans cannot be parsed into the new structure.

**Resolution Indicators**

- Older knowledge remains usable and correctly interpreted over time.
- Structural changes do not silently corrupt meaning or erase provenance.
- Schema migrations include adaptation logic that handles legacy data correctly.
- The system can work with knowledge from multiple schema eras without inconsistency.

**Impact**

- Medium/High: Long-running projects degrade; users lose trust in stored knowledge.
- Affects: Multi-month projects, archived decisions.
- Frequency: Occurs whenever schema is revised.

**Non-goals / Boundaries**

- Not a requirement for one immutable schema forever; the problem is unmanaged evolution that breaks interpretation.

---

### Problem 4: PROB-034 — Task interruption and resumability failures cause repeated work

**Tags:** [Continuity] [Execution] [Traceability] [UXClarity]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: High · Blast radius: Module

**Problem Statement**

Long-running or multi-step tasks cannot be paused and resumed without losing intermediate progress, findings, and execution context. Resumption often requires re-reading history, re-running commands, and re-establishing intent, leading to duplicated effort and drift.

**Failure Modes**

- Intermediate outcomes (what was tried, what failed, what remains) are lost or ambiguous.
- The user cannot tell what the next safe step is after returning.
- Execution context (last command outcomes, environment assumptions, partial migrations) is missing, causing rework.
- Tests that were run are run again; explorations are re-explored.
- The task loses focus; the user and agent disagree on what was completed.

**Scenarios / Examples**

- A user pauses a migration after partial implementation and failing tests. The next day, neither the user nor the agent can reconstruct the exact failure context and planned next steps without redoing large portions of the investigation.
- A long code review is started; the user pauses after commenting on 30% of the changes. When resuming, the system has no checkpoint; the user must re-read the entire diff to remember what was done.
- A refactoring is partially complete; some tests pass, some fail. The user pauses. When resuming, the failing tests are run again from scratch instead of continuing from the last checkpoint.

**Resolution Indicators**

- A task can be resumed with minimal re-orientation, including clear next actions and known blockers.
- The system preserves enough intermediate context to prevent repeating the same investigations and mistakes.
- The system can distinguish "paused," "blocked," and "complete" states without relying on chat narrative.
- Execution results from the prior session are available and not re-run unnecessarily.

**Impact**

- Medium/High: Repeated work across sessions; drift and inconsistency.
- Affects: Multi-day and multi-week projects; throughput on any task that cannot be completed in one sitting.
- Frequency: Every task longer than a single focused session.

**Non-goals / Boundaries**

- Not a requirement for background execution while the user is away; the problem is loss of resumable task state and intermediate findings.

---

## Success Signals (System Level)

What does "solved" look like?

- Users can work across multiple sessions without seeing expensive re-discovery or re-research.
- Prior decisions and constraints are accurate and accessible without rework.
- Knowledge from old sessions is reliably interpreted under current schema.
- Long-running tasks can be paused and resumed without losing intermediate findings or forcing rework.
- The system can explain "what changed since we last paused" clearly and concisely.

---

## Assumptions

Facts we are assuming but have not validated:

- Users need task-level checkpointing, not just conversation-level persistence.
- Schema evolution is inevitable; systems must handle it gracefully.
- Most repo facts are stable over weeks (do not need constant re-validation).
- Users will accept a "current checkpoint" view as an alternative to reading full history.

---

## Unknowns

Questions needing answers:

- What is the minimal checkpoint structure needed for task resumability?
- How often should cached repo facts be re-validated (weekly, per-session, on-demand)?
- How should breaking schema changes be managed (version negotiation, migration, dual-support)?
- Should old decisions be immutable or editable?
- How much intermediate execution context must be retained (logs, test results, partial changes)?

---

## Related Problems

Other problems that interact with continuity:

- **PROB-001** & **PROB-004**: Core continuity failures that block all long-running work.
- **PROB-002** (Freshness): Stored knowledge goes stale; needs validation mechanisms.
- **PROB-003** (Epistemic state): Cannot maintain continuity without durable epistemic state.
- **PROB-010** (Current baseline): Cannot resume safely without clear baseline separation.
- **PROB-034** (Resumability): Cannot pause/resume without checkpointing task state.

---

## Document Metadata

```yaml
id: IDEATION-session-continuity-problems
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: session-continuity
problems_count: 4
related_ideation: [IDEATION-state-and-visibility-problems, IDEATION-grounding-and-freshness-problems]
drives_to: [] # To be filled after Requirements are created
keywords: [continuity, session, re-entry, historical-knowledge, decision-rationale, schema-evolution, resumability, checkpointing]
```
