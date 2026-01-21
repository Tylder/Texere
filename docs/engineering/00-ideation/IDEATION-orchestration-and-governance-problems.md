```yaml
---
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: orchestration-and-governance
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short: 'Orchestration is opaque and unreliable; phase discipline blurs; multi-agent coordination fails; quality control is missing or ineffective; scope boundaries are ambiguous; self-improvement is ungrounded'
summary_long: 'Identifies 10 critical orchestration and governance problems: phase boundaries blur, multi-agent conflicts corrupt state, quality control cannot intercept outputs, scope/autonomy expectations diverge, operational healthiness is untestable, system reliability depends on fragile agent compliance, multi-agent coordination is blind, critical review is weak, orchestration decisions are unobservable, and self-improvement lacks evidence backing. Orchestration is the connective tissue; failures here affect all other systems.'
related_ideation: [IDEATION-state-and-visibility-problems, IDEATION-integration-and-execution-problems]
drives: []
---
```

## Document Relationships

**Upstream (context):**

- IDEATION-state-and-visibility-problems.md (orchestration requires visible state to enforce)
- IDEATION-integration-and-execution-problems.md (orchestration directs execution)

**Downstream (informs):**

- Multi-agent orchestration architecture
- Quality control framework design
- Governance policy and phase models
- Observability and metrics infrastructure

**Siblings:**

- IDEATION-tooling-models-and-infrastructure-problems.md (orchestration uses tools and models)
- IDEATION-user-trust-and-feedback-problems.md (orchestration affects user trust)

**Related:**

- System health and reliability monitoring
- Self-improvement and diagnostic systems

---

## TLDR

**Summary:** Orchestration is opaque, multi-agent conflicts are invisible, phases blur together, quality control is missing or overridable, scope boundaries are ambiguous, and the system cannot diagnose or improve itself.

**What:** Design orchestration as a visible, disciplined, multi-layered system where phases are enforced, agents are coordinated, quality control is mandatory, scope is explicit, and failures are observable and improveable.

**Why:** Without orchestration discipline, all other improvements fail. Agents skip steps, conflicts accumulate silently, phase boundaries collapse, bad outputs reach users, and the system cannot learn.

**How:** Make orchestration explicit and checkpointed; enforce phase boundaries; make agent coordination visible; inject mandatory quality control; make scope explicit; provide observability for diagnosis and improvement.

**Status:** Discovery phase; orchestration is the foundation for reliability.

**Critical questions:**

- How can phase boundaries (discovery, requirements, implementation) be enforced without removing flexibility?
- What minimal quality control layer would catch obvious errors before user-visible output?
- How should scope and autonomy boundaries be communicated and enforced?
- What observability is minimal but sufficient for diagnosis and improvement?

---

## Scope

**Includes:**

- Phase discipline and boundary enforcement (discovery, requirements, implementation, validation)
- Multi-agent coordination (conflict detection, state merging, responsibility tracking)
- Quality control layer (critics, checkers, interceptors)
- Scope clarity and autonomy boundaries
- Operational health testing and observable behavioral standards
- Agent compliance with policies and tool usage discipline
- System reliability mechanisms (not fragile compliance)
- Multi-agent conflict resolution and redundancy prevention
- Weakness hunting and critical review
- Orchestration observability and diagnosability
- Evidence-backed self-improvement mechanisms
- Resilience under quotas, timeouts, outages, and tool flakiness

**Excludes:**

- Specific multi-agent frameworks or consensus algorithms
- Detailed quality control rule engines
- Performance optimization (orthogonal concern)

**In separate docs:**

- State management to support orchestration: IDEATION-state-and-visibility-problems.md
- Execution of orchestrated tasks: IDEATION-integration-and-execution-problems.md
- Trust calibration for orchestration outputs: IDEATION-user-trust-and-feedback-problems.md

---

## Overview

Orchestration is not a feature; it is the connective tissue that prevents individual agents from drifting, ensures work progresses through necessary phases, catches obvious failures before they reach users, keeps agents coordinated and non-redundant, and allows the system to learn from its mistakes.

This document identifies 10 core orchestration and governance problems: phase confusion, weak quality control, scope misalignment, unreliable multi-agent coordination, opaque behavior, fragile compliance-based reliability, weak critical review, invisible conflicts, untestable health, and ungrounded self-improvement. These problems compound: unclear phases lead to premature implementation, weak quality control lets bad work reach users, scope misalignment creates unmet expectations, and inability to observe/diagnose prevents improvement.

---

## Problems

### Problem 1: PROB-011 — Discovery, requirements, and implementation blur together

**Tags:** [Governance] [Epistemic] [Traceability]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Medium · Blast radius: Module

**Problem Statement**

Agents frequently blur discovery, requirements, architecture, and implementation. This leads to premature solutioning and unstable scopes.

**Failure Modes**

- Implementation starts while unknowns remain unresolved.
- Requirements are written while the intent is still ambiguous.
- Research recommendations silently become commitments.
- Decisions are made in design review phase without adequate discovery.

**Scenarios / Examples**

- The agent reads partial docs and starts implementing a feature before clarifying constraints, producing code that must be discarded.
- An API choice is made based on insufficient research; half-way through implementation, the preferred API is discovered.
- Requirements are written before unknowns are resolved, leading to rework when reality doesn't match assumptions.

**Resolution Indicators**

- The system can reliably tell which phase it is in and what information is still missing to proceed safely.
- Research can inform next steps without being misinterpreted as a decision.
- The system prevents "momentum" from overriding unresolved ambiguity.
- Phase transitions are explicit and gated by information closure.

**Impact**

- Medium/High: The system builds the wrong thing quickly, then reworks it.
- Affects: Rework cost, decision quality, implementation waste.
- Frequency: Every non-trivial task without explicit phase gatekeeping.

**Non-goals / Boundaries**

- Not a commitment to a particular process framework; the problem is phase confusion causing premature commitment.

---

### Problem 2: PROB-014 — Poor support for weakness hunting and critical review

**Tags:** [Governance] [Epistemic] [Traceability]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

A valuable system should proactively surface weaknesses, ambiguity, and risk. Most assistants instead optimise for helpfulness and forward momentum.

**Failure Modes**

- Inadequate skepticism about requirements and constraints.
- Missing failure modes and edge cases.
- Inability to stress-test decisions.
- Risks are noted but not escalated.

**Scenarios / Examples**

- The agent proposes an architecture change but fails to flag migration risks, operational complexity, or contradictions with existing constraints.
- A requirement is accepted without questioning if it is achievable or if it creates new risks.
- Edge cases are not enumerated; code is generated without considering failure modes.

**Resolution Indicators**

- The system consistently identifies ambiguous terms, hidden assumptions, and untested risks.
- Weaknesses remain visible over time until explicitly addressed (they do not disappear because a session ended).
- The system can explain why a plan is risky, not merely that it is risky.

**Impact**

- High: The assistant reinforces bad plans; failures appear later, when changes are expensive.
- Affects: Plan quality, risk awareness, downstream cost.
- Frequency: Every planning and decision task.

**Non-goals / Boundaries**

- Not "be negative by default"; the problem is inability to reliably surface risk and ambiguity.

---

### Problem 3: PROB-015 — Scope confusion and autonomy expectations derail usefulness

**Tags:** [Governance] [Traceability] [Evaluation]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

Users and agents often diverge on what the system is supposed to do (assist vs autonomously decide/ship). When scope boundaries are unclear, the system either overreaches or underdelivers.

**Failure Modes**

- The system behaves as if it can "ship without review" when the user expects advisory support.
- The system produces architecture/vendor commitments without explicit decision closure.
- The system takes authority on high-impact decisions without being asked, creating trust failures.

**Scenarios / Examples**

- The user asks for options; the agent returns a single chosen plan and writes code as if the decision is final, forcing the user to unwind implicit commitments.
- The agent selects a major dependency and implements around it, when the user expected multiple options to be evaluated.
- The system makes a breaking change without checking whether it is a user decision or a system recommendation.

**Resolution Indicators**

- The system's role and boundaries remain stable across sessions and models.
- The system does not silently convert suggestions into commitments.
- High-impact decisions are explicitly framed as decisions with visible rationale and open alternatives.

**Impact**

- High: Persistent misalignment and rework; trust degradation due to overreach.
- Affects: User experience, decision control, trust.
- Frequency: Every significant decision task.

**Non-goals / Boundaries**

- Not a requirement to block autonomy entirely; the problem is mismatch between expectations and system behavior.

---

### Problem 4: PROB-016 — No operationally testable definition of "healthy" behavior

**Tags:** [Evaluation] [Governance] [Continuity]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Even if individual problems are listed, the system often lacks a stable, testable notion of what "good" looks like end-to-end. Without that, it is difficult to debug regressions, measure progress, or detect drift.

**Failure Modes**

- The system seems better in one session and worse in another with no clear explanation.
- Improvements are anecdotal and cannot be validated.
- Users cannot quickly tell whether the system is operating in a grounded, low-drift mode.

**Scenarios / Examples**

- A change "improves" tool use but unexpectedly worsens continuity. Without operational checks, the regression is only noticed after several failed tasks.
- The system's behavior changes after a model update; no way to tell if it improved or degraded without manual testing.

**Resolution Indicators**

- It is possible to evaluate whether the system is operating well using observable behaviors (session re-entry quality, epistemic clarity, freshness of grounding, traceability, reliable tool usage, model portability, integration quality).
- Regressions are detectable without relying on subjective "it feels worse" judgments.

**Impact**

- Medium/High: Iteration becomes random and slow; drift and regressions go unnoticed until late.
- Affects: System reliability, improvement velocity, regression detection.
- Frequency: Recurring; affects long-term evolution.

**Non-goals / Boundaries**

- Not a requirement for one perfect metric; the problem is absence of stable, observable ways to detect regressions.

---

### Problem 5: PROB-017 — System reliability depends on agent compliance (tools, policies, phase discipline)

**Tags:** [Governance] [Tools] [Epistemic] [Continuity] [Orchestration]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Correctness, safety, cost control, and workflow integrity are brittle because they depend on the agent _remembering to comply_ with expectations (using the right tools, following policies, respecting phase boundaries, and maintaining epistemic discipline) rather than the system consistently maintaining and enforcing those expectations.

**Failure Modes**

- The agent "forgets" to use a tool and guesses instead.
- The agent uses the wrong tool or misuses a tool without detection.
- Phase boundaries degrade (research vs decision vs implementation), causing premature commitment.
- Unknowns turn into implicit assumptions, and assumptions turn into "facts" over time.
- Safety/cost policies are applied inconsistently depending on model behavior.

**Scenarios / Examples**

- A repo-search tool is available and the workflow expects it to be used before edits. After several turns, the agent stops invoking the tool, guesses file locations and requirements from memory, and proceeds while unresolved unknowns quietly become assumptions.
- The agent is instructed to flag high-risk changes; it does for a few turns, then stops, treating them as normal.
- Cost control limits are set in prompt instructions; when the model changes, the instructions are ignored.

**Resolution Indicators**

- Violations of expected discipline (tool usage, phase boundaries, epistemic separation) become visible rather than silently passing.
- The user experiences consistent behavior even when model choice or session length changes.
- Work products do not depend on the agent "remembering" critical steps to remain correct.

**Impact**

- High: The system becomes increasingly unreliable over time; user must manually police the workflow.
- Affects: Reliability, cost control, quality consistency.
- Frequency: Chronic problem; worsens over longer sessions.

**Non-goals / Boundaries**

- Not "agents must be perfect"; the problem is that core correctness depends on fragile agent self-discipline instead of being robust under normal forgetfulness and model variance.

---

### Problem 6: PROB-020 — Multi-agent coordination failures create inconsistency and redundancy

**Tags:** [Orchestration] [Epistemic] [Cost]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem Statement**

When multiple agents (research/planning/execution/testing) run in parallel or in sequence, they often produce inconsistent beliefs, duplicate work, or deadlocks because shared state and conflict resolution are weak.

**Failure Modes**

- Two agents reach conflicting conclusions and the system merges them silently.
- Agents re-do each other's research because they cannot trust shared outputs.
- The workflow oscillates (agent A undoes agent B) without convergence.
- Redundant work is done because agents cannot see what others have done.

**Scenarios / Examples**

- A research agent concludes "API X is required." An execution agent implements using API Y from a different assumption. The system proceeds without detecting the conflict.
- Two agents both research the same dependency; neither trusts the other's research, so both re-do the work.
- An architecture agent designs for stateless deployment; an execution agent discovers state management and re-designs locally.

**Resolution Indicators**

- Inconsistencies between agents become explicit rather than silently merged.
- Duplicate work is reduced because agent outputs can be reused with understood provenance and confidence.
- Multi-step workflows converge more often than they thrash.

**Impact**

- High: Cost escalates quickly; quality decreases due to inconsistent baselines.
- Affects: Cost, convergence, consistency.
- Frequency: Recurring in complex multi-agent scenarios.

**Non-goals / Boundaries**

- Not a requirement for parallelism; the problem exists even with sequential agents when shared state is unreliable.

---

### Problem 7: PROB-024 — No composable quality-control layer to intercept and challenge outputs

**Tags:** [Evaluation] [Epistemic] [Orchestration] [Governance]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Agent outputs (plans, explanations, patches, tool actions) frequently reach the user or trigger actions without being subjected to independent scrutiny. Without a reliable way to insert critics/checkers, hallucinations and obvious mistakes propagate downstream.

**Failure Modes**

- Outputs are presented directly to the user without any independent challenge step.
- Review steps (when present) are applied inconsistently across tasks, sessions, or models.
- "Critics" are non-independent (they restate the primary output) and fail to catch basic errors.
- Detected issues do not reliably prevent downstream actions (errors are noted but execution continues anyway).

**Scenarios / Examples**

- A planning agent proposes an API migration based on an incorrect assumption. The plan is shown to the user and implementation begins before any independent check highlights that the target API is unavailable in the current dependency versions.
- A code generation agent produces code with a critical bug; a critic flags it, but the code is still shown to the user for review without highlighting the issue.

**Resolution Indicators**

- High-risk outputs routinely face a distinct, independent challenge step before they are presented or executed.
- Obvious inconsistencies (with known facts, constraints, or repo evidence) are caught earlier rather than after implementation work has started.
- When errors are surfaced, downstream actions do not proceed as if the output were correct.

**Impact**

- High: Hallucinations and preventable mistakes reach users and code; increased rework.
- Affects: Quality, trust, rework cost.
- Frequency: Every high-risk output (plans, architecture decisions, code generation).

**Non-goals / Boundaries**

- Not a promise of perfect correctness; the problem is lack of a low-friction, reliable way to add independent scrutiny so that obvious errors do not routinely escape.

---

### Problem 8: PROB-031 — Orchestration is a black box (insufficient observability for diagnosis)

**Tags:** [Orchestration] [Evaluation] [Traceability] [UXClarity]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

When outcomes are poor (hallucinations, tool misuse, thrash, cost spikes, low-quality diffs), the user and system cannot reliably determine what actually happened inside orchestration. Agent execution order, evidence usage, tool invocations or omissions, model choices, and boundary violations are largely implicit and non-inspectable.

**Failure Modes**

- The user cannot tell which agent produced which conclusion or action.
- Tool omissions or misuse are only discovered after damage is done.
- Model choice and its consequences are opaque and hard to reason about.
- Multi-agent conflicts appear as contradictions with no traceable source.
- Phase or policy violations are not visible until downstream failure.

**Scenarios / Examples**

- A task produces an incorrect patch. The user cannot determine whether the failure came from missing repo evidence, a skipped tool call, a critic being bypassed, a model mismatch, or conflicting agent conclusions.
- Tool use drops off mysteriously; the user cannot tell if the agent decided it was unnecessary or if a framework change broke it.

**Resolution Indicators**

- For significant outputs, the system can explain the chain of responsibility: which agents ran, in what order, using what evidence and tools.
- Orchestration-related failure causes can be differentiated (tool omission vs misuse vs stale evidence vs model mismatch vs agent conflict).
- Divergence between evidence, constraints, and outputs becomes observable before large amounts of work accumulate.

**Impact**

- High: Orchestration changes devolve into guesswork; regressions are expensive to debug; trust degrades.
- Affects: Diagnosability, improvement velocity, system trustworthiness.
- Frequency: Recurring when diagnosing failures.

**Non-goals / Boundaries**

- Not a demand for exposing raw prompts or provider internals; the problem is lack of inspectable orchestration behavior sufficient for diagnosis.

---

### Problem 9: PROB-032 — No evidence-backed self-improvement loop for orchestration configuration

**Tags:** [Orchestration] [Evaluation] [Governance] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: High · Blast radius: Multi-repo

**Problem Statement**

The system cannot reliably diagnose weaknesses in its own orchestration and recommend researched, testable changes to how orchestration functions (agents, tools, critics, model allocation, policies). Improvements are ad-hoc and cannot be validated against observed outcomes.

**Failure Modes**

- Recommendations default to generic best practices without tying to observed failures.
- Orchestration grows by accretion (more agents, more critics) with unclear benefit.
- The system cannot propose alternatives with explicit trade-offs (cost, latency, correctness).
- Regressions caused by orchestration changes are not detected.
- The system cannot distinguish task difficulty from orchestration defects.

**Scenarios / Examples**

- After repeated hallucinations, the system suggests adding critics and changing models, but cannot link these changes to specific failure modes or demonstrate that prior changes improved outcomes.
- An orchestration change is made; it seems better anecdotally, but there is no data to confirm it.
- The system has accumulated 5 critics; it is unclear if they all still provide value or if some are redundant.

**Resolution Indicators**

- Orchestration change recommendations are explicitly grounded in observed patterns (failure modes, costs, convergence behavior, user intervention frequency).
- Proposed changes include clear expected effects and trade-offs.
- The system can determine whether changes improved or worsened outcomes over time.

**Impact**

- High: Orchestration becomes bloated, expensive, brittle; improvement stalls because root causes are unclear.
- Affects: Cost, performance, improvement velocity.
- Frequency: Recurring as system evolves.

**Non-goals / Boundaries**

- Not a requirement for autonomous self-modifying code; the problem is lack of credible, evidence-backed diagnosis and improvement recommendations.

---

### Problem 10: PROB-036 — Unbounded retries and unpredictable degradation under quotas/timeouts/outages

**Tags:** [Budgeting] [Tools] [Execution] [Cost] [Orchestration]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: High · Blast radius: Multi-repo

**Problem Statement**

Under external constraints (rate limits, timeouts, quotas, provider outages, tool flakiness), the system degrades unpredictably. It may thrash, retry excessively, silently proceed with weaker substitutes, or guess without evidence, producing cost spikes and correctness regressions.

**Failure Modes**

- Retry storms on failing tools or providers, burning budget and time.
- Silent fallback behavior (weaker models, skipped checks) without making the degradation explicit.
- Partial failures are ignored and work continues as if evidence was obtained.
- The system proceeds by guessing when tool access is constrained.

**Scenarios / Examples**

- A repo search tool starts returning timeouts. The system retries repeatedly, consumes budget, and then continues by guessing file locations, leading to incorrect changes.
- A model becomes unavailable; the system falls back to a weaker model without surfacing the change or adjusting expectations.
- An API rate limit is hit; requests are retried blindly without backing off, wasting quota.

**Resolution Indicators**

- Degradation conditions are detected and made explicit before downstream work proceeds.
- Retry behavior is bounded and does not spiral cost or latency.
- When evidence cannot be obtained due to constraints, the system does not silently convert unknowns into assumptions.

**Impact**

- High: Unpredictable cost and latency; increased hallucination during outages; operational brittleness.
- Affects: Cost, reliability, predictability.
- Frequency: Recurring during outages or resource constraints.

**Non-goals / Boundaries**

- Not a promise of provider uptime or perfect tool reliability; the problem is unmanaged degradation that causes thrash and silent correctness loss.

---

## Success Signals (System Level)

What does "solved" look like?

- Phase boundaries are enforced; work does not proceed through unstable discovery, requirements, or decisions.
- Quality control layer catches obvious errors before user-visible output.
- Scope and autonomy are explicit; no silent conversions from suggestions to commitments.
- System health is testable; regressions are detectable without manual inspection.
- Reliability does not depend on agent compliance; discipline is enforced by mechanisms, not hoped-for.
- Multi-agent work is coordinated and non-redundant.
- Orchestration behavior is visible and traceable.
- Self-improvement is grounded in observed evidence, not guesswork.
- Degradation under constraints is explicit and managed.

---

## Assumptions

Facts we are assuming but have not validated:

- Phase boundaries can be enforced without removing flexibility (e.g., loop-back for discovery updates).
- Quality control can be cheap enough to be mandatory on all outputs.
- Users will accept explicit scope/autonomy discussions as a prerequisite to work.
- Observable health metrics can be defined and measured reliably.
- Self-improvement can work without full system introspection.

---

## Unknowns

Questions needing answers:

- What are the minimal phase gates (decision points that must be passed before proceeding)?
- What constitutes "independent" quality control (how do we prevent critic groupthink)?
- How should scope/autonomy be negotiated and enforced in real-time?
- What observable metrics best indicate "healthy" orchestration behavior?
- How much observability can be added without slowing execution unacceptably?
- What failure patterns are most amenable to self-improvement?

---

## Related Problems

Other problems that interact with orchestration:

- **PROB-003, 010, 025, 026, 027, 030**: State visibility is required to enforce orchestration discipline.
- **PROB-013**: Execution results must update state; orchestration must direct this.
- **PROB-035**: Uncertainty communication is a form of orchestration output.
- **PROB-037**: Prompt brittleness makes orchestration compliance fragile.

---

## Document Metadata

```yaml
id: IDEATION-orchestration-and-governance-problems
type: IDEATION-problems
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: orchestration-and-governance
problems_count: 10
related_ideation: [IDEATION-state-and-visibility-problems, IDEATION-integration-and-execution-problems, IDEATION-user-trust-and-feedback-problems]
drives_to: [] # To be filled after Requirements are created
keywords: [orchestration, governance, phase-discipline, quality-control, scope-clarity, multi-agent-coordination, observability, self-improvement, reliability, degradation-handling]
```
