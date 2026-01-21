```yaml
---
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: state-and-visibility
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: 'System lacks durable epistemic state, canonical baselines, and visibility into current understanding; state is hidden in chat narratives'
summary_long: 'Identifies 6 critical state-management problems: no durable separation between facts/assumptions/unknowns, no safe separation of current baseline from history, no canonical user-visible understanding, invisible open work and decisions, opaque context selection, and no session-to-session delta visibility. Without good state infrastructure, all other system improvements are compromised.'
related_ideation: [IDEATION-session-continuity-problems, IDEATION-orchestration-and-governance-problems, IDEATION-user-trust-and-feedback-problems]
drives: []
---
```

## Document Relationships

**Upstream (context):**

- None; state visibility is foundational infrastructure

**Downstream (informs):**

- Session continuity (requires durable state to survive sessions)
- Orchestration & governance (requires inspectable state for discipline enforcement)
- User trust & feedback (requires visible state for calibration)
- All other IDEATION documents (all depend on good state management)

**Siblings (other ideation docs):**

- IDEATION-session-continuity-problems.md (how state persists across sessions)
- IDEATION-orchestration-and-governance-problems.md (how state discipline is enforced)

**Related:**

- Requirements docs (once state requirements are clarified)

---

## TLDR

**Summary:** The system cannot tell the user (or itself) what it currently believes to be true, what is uncertain, what is still open, or why. State is buried in chat narratives, making it invisible, non-inspectable, and vulnerable to drift.

**What:** Establish durable, inspectable, externally visible state management as the foundation for agent-assisted coding.

**Why:** Without visible state, the user and system operate on different implicit understandings, decisions are not durable across sessions, unknowns become silent assumptions, and orchestration cannot enforce discipline.

**How:** Design a state structure that separates facts from assumptions from decisions, makes it canonical and user-inspectable, tracks open items, and persists reliably across sessions.

**Status:** Problem discovery phase; state management is blocking progress on all downstream systems.

**Critical questions to answer:**

- What minimal structure would make state visible to users without being overwhelming?
- How should we separate current baseline from historical evolution?
- How can state changes be tracked and communicated without constant noise?

---

## Scope

**Includes:**

- Current state visibility (what is the system thinking right now?)
- Epistemic clarity (facts vs assumptions vs unknowns)
- Current baseline vs historical record (coherent "current" view)
- Open work and decisions (what still needs attention?)
- Session-to-session state deltas (what changed?)
- State durability (survives session resets and model changes)

**Excludes:**

- Specific storage engines or database technology
- User interface design details
- Architectural patterns for persistence
- Full history audit trails (belongs in traceability docs)

**In separate docs:**

- How state persists across sessions: IDEATION-session-continuity-problems.md
- How state discipline is enforced: IDEATION-orchestration-and-governance-problems.md
- How state is used for trust calibration: IDEATION-user-trust-and-feedback-problems.md

---

## Overview

The agent-assisted coding system must maintain a coherent, durable, and externally visible representation of what it currently understands to be true, what is assumed, what is uncertain, what is being decided, and what work remains. Without this, the user and system drift apart, decisions are lost across sessions, unknowns become silent hypotheses, and quality control fails.

This document identifies 6 core state-visibility problems that affect all downstream systems. State infrastructure is not a feature; it is the foundation upon which continuity, orchestration, and user trust depend.

---

## Problems

### Problem 1: PROB-003 — No durable epistemic state (facts, hypotheses, unknowns)

**Tags:** [Epistemic] [Continuity] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Agent sessions typically maintain an undifferentiated narrative. They do not reliably separate:

- Confirmed facts
- Hypotheses/interpretations
- Assumptions
- Unknowns requiring closure
- Constraints
- Decisions and rationale

**Failure Modes**

- Hypotheses stated as facts.
- Unknowns silently turned into requirements.
- Constraints "laundered" into preferences or vice versa.
- The agent forgets what it is uncertain about.
- Assumptions accumulated without being tracked or validated.

**Scenarios / Examples**

- The agent reads one file and infers "this is the only service layer." Next session, that inference is treated as fact, causing missed integration points.
- A constraint discovered during investigation is mentioned once, then treated as design decision without explicit acknowledgment.
- The agent responds to ambiguity by guessing, and the guess becomes the assumed baseline for future work.

**Resolution Indicators**

- The system maintains a durable separation between **facts**, **assumptions**, **hypotheses**, and **unknowns**, and that separation survives session resets.
- The agent can consistently answer: "What do we know, what are we guessing, and what is unresolved?" without contradiction.
- Previously unvalidated assumptions do not silently become "background truth" in later sessions.
- Changes in beliefs are explicitly marked (moved from unknown→assumption→fact) with rationale.

**Impact**

- High: Hallucination becomes indistinguishable from knowledge.
- Affects: All downstream decisions, requirements, and implementations.
- Frequency: Every session where ambiguity is encountered.

**Non-goals / Boundaries**

- Not a demand for philosophical completeness; the problem is practical: confusion between facts and guesses leads to wrong code.

---

### Problem 2: PROB-010 — No safe separation between "current baseline" and historical record

**Tags:** [Continuity] [Traceability] [Epistemic]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Developers need a coherent view of the latest state, but losing or corrupting history destroys correctness and accountability. Many systems either:

- keep only summaries (truth loss), or
- keep everything but cannot produce a coherent "current" view.

**Failure Modes**

- "Current plan" is a chat narrative and drifts.
- History exists but is too costly to rehydrate.
- The agent cherry-picks old context, mixing outdated and current beliefs.
- Decisions are overwritten without recording why they changed.
- Users cannot tell what is "decided now" vs "was true last week".

**Scenarios / Examples**

- A summarised "current plan" omits a rejected alternative and its rationale. Later work repeats the rejected approach because the history is inaccessible.
- After a decision is revisited, the old decision statement is deleted, losing the evidence for why it was originally chosen.
- The agent maintains both an "old view" and "new view" of architecture without explicit reconciliation, causing contradictions.

**Resolution Indicators**

- A coherent "current baseline" exists that does not require re-reading full history to use safely.
- Historical records are not silently overwritten to keep the current view convenient.
- The system can distinguish what is current vs what is historical vs what is derived/inferred.
- Users can ask "what changed since we last paused?" and get a precise answer without re-reading logs.

**Impact**

- High: Drift becomes inevitable without clear baseline.
- Affects: Decision continuity, trust, rework avoidance.
- Frequency: Every time a user returns to work and needs to re-orient.

**Non-goals / Boundaries**

- Not a demand for a specific storage model; the problem is unsafe collapse of "current" and "history" into an unreliable narrative.

---

### Problem 3: PROB-025 — Current system state is not externally visible or inspectable

**Tags:** [StateVisibility] [UXClarity] [Governance]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

The user cannot reliably see what the system believes the current state is (what is true, what is in progress, what is blocked, and why). State is implicit in chat flow rather than explicit and inspectable.

**Failure Modes**

- The user cannot tell whether the system is researching, planning, implementing, or blocked.
- The user infers state from narrative tone instead of explicit signals.
- The agent appears confident even when operating on an invalid or partial baseline.
- State changes are buried in long chat history, requiring re-reading to understand.
- Multiple sessions show contradictory understandings with no way to detect the divergence.

**Scenarios / Examples**

- After several turns, the user is unsure whether the agent is waiting on input, proceeding autonomously, or stuck, and issues redundant instructions that further confuse state.
- The user reads an old assumption and assumes it is still current; the system has since learned new constraints but never surfaced the change.
- A blocker is identified but then buried in chat; work proceeds as if it is unresolved.

**Resolution Indicators**

- The current state of work is visible without reading the full conversation.
- The user can quickly understand what the system thinks is happening right now.
- State changes are surfaced explicitly, not buried in narrative.
- Users can inspect the canonical "current understanding" at any time.

**Impact**

- High: Misalignment between user intent and system action.
- Affects: User experience, decision-making, trust.
- Frequency: Every session interaction.

**Non-goals / Boundaries**

- Not a requirement for a specific UI layout; the problem is lack of externally visible state.

---

### Problem 4: PROB-026 — No canonical, user-visible "current understanding" baseline

**Tags:** [StateVisibility] [Epistemic] [UXClarity]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

There is no single, authoritative, user-visible representation of what the system currently believes to be true, assumed, constrained, and decided.

**Failure Modes**

- The user and system operate on different implicit understandings.
- Assumptions and decisions are scattered across chat history.
- The user cannot easily validate or correct the system's understanding.
- When conflict arises, it is unclear which "version" of understanding is current.
- The user cannot point to a canonical baseline to resolve disputes.

**Scenarios / Examples**

- The user believes a constraint was agreed upon earlier. The agent does not apply it because it exists only implicitly in prior conversation turns.
- The user corrects an assumption in one turn; the agent uses the old assumption in the next turn because there is no canonical record of what was updated.
- Two different problem statements are sketched in separate turns; no way to see which is "the current one".

**Resolution Indicators**

- A single "current understanding" can be inspected and validated by the user.
- Divergence between user belief and system belief becomes immediately visible.
- Users can point to a specific baseline to clarify what they mean.
- When a fact or assumption changes, the change is recorded and visible.

**Impact**

- High: Persistent misunderstanding and rework.
- Affects: User-system alignment, decision quality, trust.
- Frequency: Recurring problem in every multi-turn task.

**Non-goals / Boundaries**

- Not a demand for a perfect summary; the problem is absence of an authoritative, inspectable baseline.

**Overlap note:**

- Internal epistemic separation and durability issues are covered in PROB-003.

---

### Problem 5: PROB-027 — Open work (todos, unknowns, decisions) is not continuously visible

**Tags:** [StateVisibility] [UXClarity] [Governance]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

Items that are still open (unknowns, pending decisions, risks, planned actions) are not persistently visible and are easily forgotten by both user and system.

**Failure Modes**

- Unresolved questions disappear from attention after a few turns.
- Risks raised earlier are silently dropped.
- Work resumes without closing known gaps.
- A decision is flagged as pending but then neither explicitly resolved nor tracked.
- Users have to manually re-surface open items to maintain visibility.

**Scenarios / Examples**

- A critic flags a missing edge case. Several turns later, implementation continues as if the issue was resolved, even though it was never addressed.
- An unknown ("Does the API support pagination?") is raised; work proceeds as if the answer is "yes" without confirming.
- A risk ("This refactoring might break migrations") is noted; the same risk is re-raised verbatim in a later session because it was never closed.

**Resolution Indicators**

- Open items remain visible until explicitly resolved or dismissed.
- The user can see at a glance what still needs attention.
- Open items persist across session boundaries.
- When an item is addressed, the closure is explicit and recorded.

**Impact**

- Medium/High: Important gaps are missed; quality degrades.
- Affects: Task completion, attention management, risk awareness.
- Frequency: Every longer task with multiple unknowns.

**Non-goals / Boundaries**

- Not a requirement for a separate task manager; the problem is loss of situational awareness within the current task.

---

### Problem 6: PROB-030 — State changes across sessions are not clearly surfaced to the user

**Tags:** [SessionDelta] [StateVisibility] [Continuity]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

When a user returns after time away, changes in understanding, decisions, risks, and open items are not clearly summarised, forcing re-orientation from scratch.

**Failure Modes**

- The user rereads long history to understand what changed.
- Important deltas are missed.
- The user unknowingly revisits already resolved topics.
- Work from the previous session is not clearly distinguished from new work.
- The user cannot tell if state is stale or current.

**Scenarios / Examples**

- After a day away, the user asks a question that was already answered and closed, because the change was never surfaced.
- New context was gathered in the last session; the user spends an hour re-researching the same facts.
- A decision was made but not recorded; the user assumes it is still open and revisits it.

**Resolution Indicators**

- The user can quickly see what changed since their last interaction.
- Re-orientation time is minimal.
- Delta summaries are explicit and machine-generated (not narrative).
- The user knows which parts of the state are fresh vs stale.

**Impact**

- Medium: Inefficient collaboration and wasted time.
- Affects: Multi-session productivity, usability for long-running work.
- Frequency: Every time a user resumes work after a break.

**Non-goals / Boundaries**

- Not a requirement for a full audit UI; the problem is lack of clear session-to-session deltas.

---

## Success Signals (System Level)

What does "solved" look like from the user and system perspective?

- Users see a clear, canonical representation of the current understanding at any time.
- Assumptions and facts are never confused; unknowns are never silently resolved.
- The system can explain what it believes, what changed, and why, without requiring the user to re-read history.
- Open work and decisions remain visible until resolved.
- Sessions do not corrupt state; users can resume work with clear next steps.
- The system refuses to proceed when critical unknowns remain unresolved.

---

## Assumptions

Facts we are assuming but have not fully validated:

- Users need to see state as structured data, not narrative summaries.
- State visibility will reduce hallucination and assumption drift more than any other single intervention.
- A canonical state representation is feasible without requiring complex versioning systems.
- Most users will accept a consistent, machine-generated state format over free-form chat summaries.

---

## Unknowns

Questions that need answering before requirements or implementation:

- What is the minimum viable state structure (facts, assumptions, unknowns, decisions, constraints)?
- How should state be displayed to users (structured UI, special formatting, separate view, embedded in chat)?
- How much state history should be retained (full vs recent vs snapshots)?
- Should state be editable by users, or only by the system (with user confirmation)?
- How should state conflicts (between user intent and system belief) be detected and surfaced?

---

## Related Problems

Other problems that interact with state visibility:

- **PROB-001** (Session resets): Cannot recover state across sessions without durable storage.
- **PROB-008** (Hallucination): Invisible state enables assumptions to become facts silently.
- **PROB-017** (Reliability on compliance): State discipline is impossible without visible checkpoints.
- **PROB-031** (Orchestration opacity): Cannot diagnose orchestration issues without visible state at each step.
- **PROB-035** (Uncertainty communication): Cannot calibrate trust without visible confidence metadata.

---

## Document Metadata

```yaml
id: IDEATION-state-and-visibility-problems
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: state-and-visibility
problems_count: 6
related_ideation: [IDEATION-session-continuity-problems, IDEATION-orchestration-and-governance-problems, IDEATION-user-trust-and-feedback-problems]
drives_to: [] # To be filled after Requirements are created
keywords: [state, visibility, epistemic, baseline, canonical, open-work, session-delta, facts, assumptions, unknowns]
```
