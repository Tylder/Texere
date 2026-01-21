---
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: grounding-and-freshness
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Research becomes stale without cheap upkeep; hallucination and assumption drift are not
  mechanically prevented; decisions lack auditable history and traceability'
summary_long:
  'Identifies 3 critical problems: research ages without validation, leading to silent failures when
  reality changes; assumptions accumulate and become facts without explicit tracking; and decision
  provenance is lost, making it impossible to recover why something exists. Without grounding
  mechanisms and traceability, the system drifts silently from reality.'
related_ideation: [IDEATION-PROBLEMS-state-and-visibility, IDEATION-PROBLEMS-session-continuity]
drives: []
index:
  sections:
    - title: 'Document Relationships'
      lines: [85, 111]
      summary:
        'Grounding and freshness enable accurate decisions and prevent silent failures; validation
        must be cheap and automated, provenance must be tracked.'
      token_est: 103
    - title: 'TLDR'
      lines: [113, 138]
      summary:
        'The system silently operates on outdated information, treats unvalidated assumptions as
        facts, and forgets why decisions were made. Stale research, hallucination, and lost
        provenance compound over time.'
      token_est: 208
    - title: 'Scope'
      lines: [140, 165]
      summary:
        'Staleness detection, assumption tracking, auditable provenance, and epistemic
        discipline—not specific validation engines, external API monitoring, or deep analysis.'
      token_est: 147
    - title: 'Overview'
      lines: [167, 178]
      token_est: 103
    - title: 'Problems'
      lines: [180, 353]
      token_est: 1455
      subsections:
        - title: 'Problem 1: PROB-002 — Research becomes stale with no cheap upkeep mechanism'
          lines: [182, 237]
          summary:
            'Research about repo, dependencies, standards, or APIs goes out of date; workflows treat
            it as static or rely on manual re-checking, causing silent correctness failures.'
          token_est: 465
        - title:
            'Problem 2: PROB-008 — Hallucination and assumption drift are not mechanically prevented'
          lines: [239, 296]
          summary:
            'Agent workflows reward forward progress even on invalid baselines; assumptions made
            silently and become invisible facts without validation or explicit tracking.'
          token_est: 496
        - title: 'Problem 3: PROB-009 — Lack of auditable history and decision traceability'
          lines: [298, 353]
          summary:
            'System needs to explain "why" something is the way it is, not just "what"; without
            traceability, decisions cannot be revisited and constraints cannot be understood.'
          token_est: 493
    - title: 'Success Signals (System Level)'
      lines: [355, 366]
      token_est: 103
    - title: 'Assumptions'
      lines: [368, 379]
      token_est: 91
    - title: 'Unknowns'
      lines: [381, 391]
      token_est: 82
    - title: 'Related Problems'
      lines: [393, 403]
      token_est: 68
    - title: 'Document Metadata'
      lines: [405, 435]
      token_est: 65
---

## Document Relationships

Summary: Grounding and freshness enable accurate decisions and prevent silent failures; validation
must be cheap and automated, provenance must be tracked.

**Upstream (context):**

- IDEATION-PROBLEMS-state-and-visibility.md (requires visible epistemic state)
- IDEATION-PROBLEMS-session-continuity.md (requires durable knowledge)

**Downstream (informs):**

- Requirement specifications for research validation and knowledge refresh
- Execution engine design (test/build feedback incorporation)

**Siblings:**

- IDEATION-PROBLEMS-integration-and-execution.md (execution validates grounding)
- IDEATION-PROBLEMS-orchestration-and-governance.md (orchestration discipline prevents assumption
  drift)

**Related:**

- Quality control systems
- Evidence and traceability infrastructure

---

## TLDR

Summary: The system silently operates on outdated information, treats unvalidated assumptions as
facts, and forgets why decisions were made. Stale research, hallucination, and lost provenance
compound over time.

**What:** Implement mechanisms to detect when knowledge is stale, prevent assumptions from silently
becoming facts, and maintain durable provenance for all claims and decisions.

**Why:** Silent staleness and assumption drift are invisible until late discovery causes expensive
rework. Lost provenance makes it impossible to revisit decisions or debug the system's reasoning.

**How:** Design validation triggers (when facts should be re-checked), epistemic discipline
(explicit assumption → hypothesis → fact transitions), and traceability infrastructure (link claims
to evidence).

**Status:** Discovery phase; staleness and hallucination are recurring failures in long-running
work.

**Critical questions:**

- Which types of research need periodic re-validation (repo facts, library APIs, external docs)?
- When should an assumption be flagged for validation before becoming a decision?
- How can we attach provenance to claims without adding excessive overhead?

---

## Scope

Summary: Staleness detection, assumption tracking, auditable provenance, and epistemic
discipline—not specific validation engines, external API monitoring, or deep analysis.

**Includes:**

- Detecting and managing stale research (repo structure, dependencies, API behavior, external docs)
- Preventing assumptions from silently becoming facts
- Maintaining auditable provenance and decision rationale
- Distinguishing confirmed facts from inferred or unvalidated claims
- Recovery of "why" for past decisions and constraints

**Excludes:**

- Specific validation engines or continuous monitoring systems
- External API contracts or vendor-specific change detection
- Deep source code analysis or AST-based introspection

**In separate docs:**

- Epistemic state structure: IDEATION-PROBLEMS-state-and-visibility.md
- Execution feedback incorporation: IDEATION-PROBLEMS-integration-and-execution.md
- Orchestration discipline to prevent drift: IDEATION-PROBLEMS-orchestration-and-governance.md

---

## Overview

Research, assumptions, and decisions accumulate during development. Without mechanisms to validate
that research remains correct, assumptions become invisible facts, and provenance is lost. The
system appears confident while operating on increasingly stale or hallucinated baselines.

This document identifies 3 core grounding and freshness problems: research aging without cheap
upkeep, hallucination/assumption drift occurring without mechanical prevention, and lost decision
provenance. These problems interact: stale research enables hallucination, invisible assumptions
prevent validation, and lost provenance makes recovery impossible.

---

## Problems

### Problem 1: PROB-002 — Research becomes stale with no cheap upkeep mechanism

Summary: Research about repo, dependencies, standards, or APIs goes out of date; workflows treat it
as static or rely on manual re-checking, causing silent correctness failures.

**Tags:** [Freshness] [Traceability] [Cost]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius:
Multi-repo

**Problem Statement**

Research (about repo, dependencies, standards, APIs, or external docs) quickly goes out of date, but
most workflows treat it as static or rely on manual re-checking.

**Failure Modes**

- Advice based on outdated docs or earlier repo state.
- Decisions made on assumptions that were true weeks ago.
- "We already researched that" is asserted without re-validation.
- Silent correctness failures when reality changes.
- The system continues to recommend deprecated APIs or removed features.

**Scenarios / Examples**

- A library upgrades a major version. The agent continues to recommend APIs that no longer exist,
  because earlier research is reused without recognising the change.
- A repo is refactored; the entry point for a service moves. Prior sessions identified the old entry
  point; new sessions use the old information without detecting the change.
- A team constraint ("Always use async/await, never callbacks") changes; the agent still enforces
  the old constraint without noticing.
- External documentation is updated; the agent's recommendations become incorrect but it continues
  to cite the outdated doc version.

**Resolution Indicators**

- The system can reliably recognise when previously collected research is likely outdated and must
  not be treated as current.
- When research is used, the agent can state whether it is current, uncertain, or stale enough to
  re-check.
- The system can connect changed conditions (repo changes, dependency changes, upstream
  documentation changes) to the risk of invalidated conclusions.
- Re-validation of stale research is cheap and does not require full re-ingestion.

**Impact**

- High: Silent correctness failures; increasing divergence from reality.
- Affects: All downstream recommendations and implementations.
- Frequency: Every week in an active project; compounds with time.

**Non-goals / Boundaries**

- Not a promise of continuous monitoring of the entire internet; the problem is inability to
  recognise and manage staleness risk.

---

### Problem 2: PROB-008 — Hallucination and assumption drift are not mechanically prevented

Summary: Agent workflows reward forward progress even on invalid baselines; assumptions made
silently and become invisible facts without validation or explicit tracking.

**Tags:** [Epistemic] [Freshness] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Agent workflows tend to reward forward progress, even when operating on invalid or ambiguous
baselines. Assumptions are made silently, never validated, and gradually become "facts" without
anyone noticing.

**Failure Modes**

- The agent invents constraints or capabilities.
- The agent proceeds while uncertainty remains implicit.
- The agent "patches" prior conclusions in place, losing history.
- Assumptions accumulate, each one making the next more likely.
- Work progresses on a hypothesis that contradicts repo evidence, but the contradiction is never
  raised.

**Scenarios / Examples**

- A failing test indicates a wrong assumption about an API, but the agent continues to build on the
  assumption and patches code around symptoms instead of fixing the root.
- The agent infers "this service only has read access" from reading one file, then designs around
  that assumption for three days before discovering the assumption is wrong.
- A constraint is tentatively proposed ("We must support Node 12"); it is neither validated nor
  rejected, but it guides all subsequent architecture decisions.
- The agent assumes a field exists in a data structure based on an old schema version; it builds
  code around that field, which doesn't actually exist in the current version.

**Resolution Indicators**

- Ambiguity becomes explicit: the system reliably surfaces uncertainties rather than silently
  resolving them.
- When a baseline is invalidated, work does not continue as if nothing happened; the system raises
  the contradiction.
- Changes in beliefs (facts, assumptions, decisions) are explicit rather than silently overwriting
  prior conclusions.
- Assumptions are flagged as such and are not treated as facts until validated.
- The system refuses to build on unresolved unknowns (or explicitly calls them out as risks).

**Impact**

- High: Requirements and implementations become untrustworthy; late-phase reversals.
- Affects: All downstream work; compounding rework.
- Frequency: Every ambiguous or rapidly-changing codebase; increases over time.

**Non-goals / Boundaries**

- Not "never make assumptions"; the problem is that assumptions are made silently and then treated
  as facts.

---

### Problem 3: PROB-009 — Lack of auditable history and decision traceability

Summary: System needs to explain "why" something is the way it is, not just "what"; without
traceability, decisions cannot be revisited and constraints cannot be understood.

**Tags:** [Traceability] [Continuity] [Epistemic]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

A long-running system needs to explain "why" something is the way it is, not just "what" it is.
Without traceability, decisions cannot be revisited, constraints cannot be understood, and the
system cannot justify its behavior.

**Failure Modes**

- No record of why an approach was chosen.
- Unclear provenance of facts and research.
- Inability to identify when/why a belief changed.
- Previous decisions are lost or overwritten without explanation.
- When a decision is challenged, the system cannot cite the evidence or rationale.

**Scenarios / Examples**

- Two months later, a user asks why a constraint exists. The agent cannot link it to a prior
  decision or evidence, so it either re-invents rationale or drops the constraint.
- A refactoring is proposed. The user asks "Are we sure we can change this?" No history exists; the
  system must re-analyze instead of referring to prior decisions.
- An API choice was made weeks ago; the user wants to revisit it. The system cannot recover what was
  evaluated and why the current choice won.
- A risk was identified and mitigated; weeks later, work re-introduces the same risk because there
  is no record of the mitigation.

**Resolution Indicators**

- The system can explain why key decisions exist and what evidence/rationale supported them at the
  time.
- Claims about the repo or external facts can be tied back to some form of evidence (repo
  inspection, tool output, referenced documentation, user instruction).
- The system can identify meaningful deltas since a prior checkpoint without redoing all work.
- When a decision is revisited, the prior evidence and alternatives are retrievable.

**Impact**

- Medium/High: System becomes fragile and non-repeatable; debugging the assistant is harder than
  debugging the code.
- Affects: Decision continuity, revisit cost, user confidence.
- Frequency: Recurring in every multi-week project.

**Non-goals / Boundaries**

- Not a requirement for formal governance documents; the problem is practical inability to recover
  rationale and provenance.

---

## Success Signals (System Level)

What does "solved" look like?

- Research is validated against current reality before being used for recommendations.
- Assumptions are never silently converted into facts; all assumptions are explicitly flagged and
  tracked.
- Every claim can be traced back to evidence (repo inspection, API check, user instruction, etc.).
- Stale research is detected early, not discovered through late-phase failures.
- The system can explain why a decision was made and cite supporting evidence.

---

## Assumptions

Facts we are assuming but have not validated:

- Most research staleness is detectable through lightweight checks (dependency version changes, file
  modification times, git history).
- Users will tolerate occasional re-validation of research if it prevents silent failures.
- Assumption tracking will not significantly increase system complexity if integrated into state
  management.
- Evidence and provenance can be attached to claims without doubling storage or token costs.

---

## Unknowns

Questions needing answers:

- What research categories should be re-validated, and how often (daily, weekly, per-use)?
- How cheap can staleness detection be while remaining reliable?
- What evidence metadata is sufficient for traceability without becoming bloat?
- Should provenance be user-visible, or only used internally for debugging?
- How should conflicting evidence (from different sources) be surfaced and reconciled?

---

## Related Problems

Other problems that interact with grounding:

- **PROB-003** (Epistemic state): Cannot track assumptions without visible state.
- **PROB-013** (Execution results): Build/test failures should invalidate assumptions automatically.
- **PROB-024** (Quality control): Critics must flag stale research and unvalidated assumptions.
- **PROB-031** (Orchestration diagnosability): Cannot debug assumptions without visible
  traceability.

---

## Document Metadata

```yaml
id: IDEATION-PROBLEMS-grounding-and-freshness
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: grounding-and-freshness
problems_count: 3
related_ideation:
  [
    IDEATION-PROBLEMS-state-and-visibility,
    IDEATION-PROBLEMS-session-continuity,
    IDEATION-PROBLEMS-integration-and-execution,
  ]
drives_to: [] # To be filled after Requirements are created
keywords:
  [
    freshness,
    staleness,
    research-validation,
    hallucination,
    assumption-drift,
    provenance,
    traceability,
    auditable-history,
  ]
```
