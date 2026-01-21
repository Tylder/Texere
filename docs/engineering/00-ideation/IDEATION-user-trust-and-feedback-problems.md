```yaml
---
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: user-trust-and-feedback
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: 'Uncertainty and confidence are not communicated transparently; user feedback and preferences are not accumulated; agent outputs cannot be calibrated for trust'
summary_long: 'Identifies 3 critical user-facing problems: users cannot tell when to trust the agent because confidence signals are missing or masked by fluency; user feedback and learned preferences vanish at session end, forcing re-education; and no systematic mechanism to calibrate trust based on past reliability. Without these, users either blindly follow bad advice or reject good advice, reducing utility.'
related_ideation: [IDEATION-state-and-visibility-problems, IDEATION-orchestration-and-governance-problems]
drives: []
---
```

## Document Relationships

**Upstream (context):**

- IDEATION-state-and-visibility-problems.md (requires visible state for feedback tracking)
- IDEATION-orchestration-and-governance-problems.md (quality control affects user trust)

**Downstream (informs):**

- User interface and feedback mechanisms
- System observability for trust calibration
- Preference learning and adaptation systems

**Siblings:**

- IDEATION-context-and-task-isolation-problems.md (context affects trust calibration)
- IDEATION-grounding-and-freshness-problems.md (grounding affects confidence)

**Related:**

- User feedback collection systems
- Historical reliability tracking
- Uncertainty quantification mechanisms

---

## TLDR

**Summary:** Users cannot tell when to trust the agent; feedback vanishes; no learning from past mistakes or preferences. Users oscillate between blind trust (leading to bugs) and blanket distrust (defeating the purpose).

**What:** Communicate confidence and uncertainty explicitly; accumulate user feedback and preferences across sessions; track and display past reliability to enable calibrated trust.

**Why:** Without trust calibration, the system is either dangerous (over-trusted) or useless (under-trusted). Users oscillate between extremes, neither of which is efficient.

**How:** Make uncertainty quantifiable and visible; store and reference user feedback; track prediction outcomes; allow users to see and adjust confidence thresholds.

**Status:** Discovery phase; trust is essential for adoption and safe autonomy.

**Critical questions:**

- What signals (in addition to tone and fluency) can communicate confidence without being overwhelming?
- How should user feedback be represented durably (preferences, corrections, style guides)?
- What past-performance metrics would be decision-useful to users?

---

## Scope

**Includes:**

- Uncertainty and confidence communication in a decision-usable way
- User feedback accumulation and preference learning
- Systematic trust calibration based on historical reliability
- Tracking of past mistakes and corrections
- Confidence thresholds and risk flags

**Excludes:**

- Specific machine learning algorithms for preference learning
- Formal uncertainty quantification (Bayesian, probabilistic, etc.)
- User interface design details

**In separate docs:**

- Grounding mechanisms that enable accurate confidence: IDEATION-grounding-and-freshness-problems.md
- Quality control that catches errors before trust is violated: IDEATION-orchestration-and-governance-problems.md
- State visibility for tracking feedback: IDEATION-state-and-visibility-problems.md

---

## Overview

Users must make decisions about when to trust the agent's output. Without explicit signals, tone and fluency mask uncertainty, leading to either blind acceptance (bugs) or blanket rejection (wasted potential). Furthermore, user feedback and preferences are lost at session end, requiring re-education. And there is no way to track whether the agent is actually improving or just getting better at sounding confident.

This document identifies 3 core trust and feedback problems: missing confidence signals, lost user feedback, and no systematic trust calibration. These problems compound: weak signals lead to mis-trust, lost feedback prevents learning, and lack of calibration prevents user confidence from forming.

---

## Problems

### Problem 1: PROB-035 — Uncertainty and confidence are not communicated in a decision-usable way

**Tags:** [UXClarity] [Epistemic] [StateVisibility]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

The system cannot reliably communicate uncertainty and confidence in a way the user can use to decide when to trust, verify, or block actions. Tone and fluency often mask weak grounding, and uncertainty handling varies across models and sessions.

**Failure Modes**

- High-risk suggestions are presented with unjustified confidence.
- The user cannot distinguish verified repo facts from plausible-sounding inferences.
- Uncertainty caveats are inconsistent, overly generic, or missing when most needed.
- A casual or concise answer might be interpreted as confident when it is actually a guess, or vice versa.

**Scenarios / Examples**

- The agent recommends deleting or refactoring critical code paths while being uncertain about call sites. The user cannot tell whether the recommendation is grounded in repo evidence or derived from assumptions.
- The system describes a migration plan in confident language; the user proceeds, only to find critical gaps that should have been flagged as risks.
- Two similar recommendations come with different verbal hedges; the user cannot tell which is actually more reliable.

**Resolution Indicators**

- Users can quickly tell which claims are grounded vs inferred vs unknown.
- High-impact actions come with clarity about what must be verified before proceeding.
- The user's decision time decreases because trust calibration is explicit and consistent.
- Uncertainty qualifiers are tied to specific types of uncertainty (fact gap, model limitation, assumption, etc.).

**Impact**

- High: Preventable mistakes reach code and users; users either over-trust or under-trust.
- Affects: Decision quality, safety, utility.
- Frequency: Every significant recommendation; compounds over time.

**Non-goals / Boundaries**

- Not a requirement for numeric probabilities; the problem is lack of consistent, decision-usable trust calibration.

---

### Problem 2: PROB-038 — No accumulation of user feedback or learned preferences

**Tags:** [Continuity] [Evaluation] [Orchestration]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius: Multi-repo

**Problem Statement**

The system does not learn from the user's feedback, corrections, or preferences over time. Each session or task starts fresh, so the agent repeats mistakes or style violations that the user had previously corrected. There is no durable improvement or personalization based on how the solo developer interacts with the assistant.

**Failure Modes**

- The agent reintroduces a coding style or library that the user explicitly rejected in an earlier session.
- Known false starts or pitfalls (e.g. an approach that failed last week) are suggested again as if they were never tried.
- The system forgets decision resolutions – the user has to remind the agent of earlier conclusions or preferences in each session.
- No matter how many times a particular fix or tweak is applied by the user, future suggestions don't reflect that learning.

**Scenarios / Examples**

- Over the course of a project, the user repeatedly tells the agent to use functional components instead of class components in a React codebase. Each new feature, the agent suggests a class component again, having no memory of this preference.
- The solo dev spends time correcting the same issue multiple times, feeling as though the assistant has no notion of their coding conventions or past guidance.
- A rejected API choice comes up again weeks later; the user must re-explain why it was not suitable.

**Resolution Indicators**

- The system's suggestions begin to align with the user's established preferences (tools, style, architectural choices) without being reminded every time.
- Repeated mistakes or previously corrected errors become less frequent as the project progresses.
- The agent can acknowledge prior feedback (e.g. "Using approach X since you preferred that previously") or at least avoid past rejected solutions in similar future contexts.
- Over multiple sessions, the need for user re-correction of identical issues decreases noticeably.

**Impact**

- High: User trust and patience wear thin; efficiency gains plateau or reverse.
- Affects: System utility, user satisfaction, learning curve.
- Frequency: Chronic; every repeated scenario.

**Non-goals / Boundaries**

- Not a request for full auto-tuning or AI self-modification; the problem is absence of any lightweight mechanism to capture and reuse feedback (e.g. remembered decisions, style guidelines, "don't do that" lessons) that a solo dev naturally provides.

---

### Problem 3: PROB-040 — No systematic trust calibration for agent outputs

**Tags:** [UXClarity] [Evaluation] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

The system provides the solo developer with no consistent way to gauge how much to trust the AI's outputs. There is no systematic trust calibration mechanism or reliable cues. As a result, the user is often guessing whether a suggestion is solid or needs careful vetting.

**Failure Modes**

- The agent presents a high-risk code change (e.g. a security-sensitive modification) with unwarranted confidence, and the user accepts it at face value when they shouldn't.
- Conversely, the user ends up double-checking even routine suggestions because they have no basis to judge the agent's confidence or past accuracy.
- There is no record or indicator of how often the assistant's answers have been correct or required fixes.
- Tone and verbosity are the user's only clues; a casual or concise answer might be interpreted as confident when it is actually a guess, or vice versa.

**Scenarios / Examples**

- The agent suggests a complex database migration. It sounds sure of itself, so the developer proceeds – only to hit major issues because the agent's understanding was incomplete. There had been subtle hints of uncertainty, but the system gave no explicit signal.
- In another case, after a few such surprises, the developer assumes the agent's suggestions are generally untrustworthy and begins rewriting code manually that the agent could handle, reducing the assistant to a rubber duck.
- Without any calibrated indicators, the solo dev oscillates between over-trusting and under-utilizing the AI.

**Resolution Indicators**

- Each significant recommendation comes with cues or context that help the user decide on trust: e.g. evidence citations, uncertainty qualifiers, or an explicit confidence level.
- The system's communication of uncertainty is consistent and decision-useful – the developer can tell at a glance which parts of an answer are well-grounded and which need verification.
- Over time, the user develops an accurate mental model of the assistant's reliability (or even sees metrics of past performance), allowing for calibrated trust.
- High-confidence, historically reliable suggestions are fast-tracked, whereas speculative ones trigger user review or agent double-checks by design.
- The user's need to manually scrutinize every single output is reduced, without blindly accepting everything – they know when vigilance is needed.

**Impact**

- High: Over-trust leads to serious bugs; under-trust reduces utility to near-zero.
- Affects: Safety, utility, efficiency.
- Frequency: Every recommendation; cumulative effect worsens over time.

**Non-goals / Boundaries**

- Not a demand for perfect accuracy or formal verification of all outputs; the problem is lack of transparent, usable signals for the user to judge when to trust vs apply caution.

---

## Success Signals (System Level)

What does "solved" look like?

- Users can quickly tell which parts of a recommendation are well-grounded and which are speculative.
- User feedback and preferences are remembered across sessions and applied without re-prompting.
- The system's past reliability informs future trust decisions.
- Users develop accurate mental models of the agent's strengths and weaknesses.
- Over-trust and under-trust both decrease; users collaborate with appropriate caution levels.

---

## Assumptions

Facts we are assuming but have not validated:

- Users will accept explicit confidence labels if they are consistently accurate.
- User feedback can be captured in structured form (style rules, rejected approaches, preferred tools) without being intrusive.
- Historical reliability metrics (success rate, error frequency, revision rate) would be decision-useful.
- Trust calibration will increase the system's utility more than making perfect changes would.

---

## Unknowns

Questions needing answers:

- What granularity of feedback should be captured (line-level, feature-level, session-level, preference-level)?
- How should confidence levels be computed (from evidence coverage, model certainty, past success rate)?
- Should feedback be mutable (user can change their preference) or immutable (historical record)?
- What historical metrics (accuracy, revision rate, success rate, user override rate) would be most useful?
- How should user feedback be weighted (recent vs aggregate, explicit vs inferred from behavior)?

---

## Related Problems

Other problems that interact with trust:

- **PROB-003** (Epistemic state): Cannot track confidence without visible state.
- **PROB-008** (Hallucination): Undetected hallucinations destroy trust calibration.
- **PROB-024** (Quality control): Critics can improve trust by catching obvious errors.
- **PROB-031** (Observability): Traceability helps users understand where confidence should be high vs low.

---

## Document Metadata

```yaml
id: IDEATION-user-trust-and-feedback-problems
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: user-trust-and-feedback
problems_count: 3
related_ideation: [IDEATION-state-and-visibility-problems, IDEATION-orchestration-and-governance-problems, IDEATION-context-and-task-isolation-problems]
drives_to: [] # To be filled after Requirements are created
keywords: [trust, confidence, uncertainty, user-feedback, preferences, learned-preferences, calibration, over-trust, under-trust]
```
