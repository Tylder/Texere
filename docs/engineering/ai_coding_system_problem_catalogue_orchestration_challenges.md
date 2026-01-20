# AI Coding System — Problem Catalogue (Orchestration Challenges)

## 0) Scope

This document defines the **problems** an AI-assisted coding system must solve (or materially
reduce) to be useful for sustained, multi-session software development.

It intentionally focuses on:

- **Failure modes** observed in current agentic coding workflows
- The **gaps** that force rework, drift, hallucination, or loss of continuity
- **Resolution indicators** for each problem (what would be observably different if the problem is
  addressed), without prescribing mechanisms

It does **not** prescribe architecture, vendor choices, storage engines, or specific tools. Those
belong in later requirements/spec work.

## 1) Background pain pattern

Modern coding agents fail in predictable ways when development spans:

- Multiple sessions (context resets)
- Multiple codebases or rapidly changing repos
- Non-trivial decision histories (trade-offs, rejected options, constraints)
- “Research-first” tasks (framework behavior, library details, APIs, standards)

The result is repeated effort and accumulating inconsistency:

- The agent repeatedly re-reads or re-discovers the same repo facts.
- “What we decided last time” becomes ambiguous or contradicted.
- Research goes stale quickly and is rarely re-validated.
- Agents appear confident while relying on implicit assumptions.

A recurrent meta-problem appears across most failures:

- **System responsibility vs agent behavior is blurred.** The user experiences failures as “the
  agent did X,” but the underlying cause is often that the system did not reliably maintain state,
  enforce boundaries, or ground claims.

## 1.5) How to use this catalogue

This catalogue is intended to be **consumed by later requirements and implementation work** without
becoming a list of preferred features.

- Treat each **PROB** as a **durable constraint**: the system design is only acceptable if it
  demonstrably reduces the problem.
- Use the **Resolution indicators** as the basis for **requirements acceptance criteria** and later
  **regression checks**.
- When a proposed mechanism claims to address a PROB, require it to state:
  - Which **failure modes** it reduces
  - Which **resolution indicators** it improves
  - Which **trade-offs** it introduces (cost, latency, complexity, new risks)
- Expect **overlap**: one mechanism may mitigate multiple PROBs, and one PROB may require multiple
  mechanisms. Avoid duplicating requirements by explicitly mapping design elements to PROBs.

Operational rule of thumb:

- If a proposed change cannot be linked to at least one PROB’s resolution indicators, it is likely
  premature solutioning.

## 2) Index (quick navigation)

### Continuity and long-term understanding

- **PROB-001** Session resets force repo research from scratch
- **PROB-003** No durable epistemic state (facts, hypotheses, unknowns)
- **PROB-004** The agent cannot behave like it has deep, accurate historical knowledge
- **PROB-010** No safe separation between “current baseline” and historical record
- **PROB-022** Knowledge schema evolution breaks long-lived continuity
- **PROB-034** Task interruption and resumability failures cause repeated work

### Freshness and grounding

- **PROB-002** Research becomes stale with no cheap upkeep mechanism
- **PROB-008** Hallucination and assumption drift are not mechanically prevented
- **PROB-009** Lack of auditable history and decision traceability

### Tooling, models, and cost

- **PROB-005** Tooling interoperability is unreliable (MCP tools and beyond)
- **PROB-006** Model portability and model-mismatch failures
- **PROB-012** Cost blow-ups from context bloat and repeated ingestion
- **PROB-037** Prompt brittleness undermines consistent agent behavior
- **PROB-036** Unbounded retries and unpredictable degradation under quotas/timeouts/outages

### Integration and execution

- **PROB-007** Code writing is slow, error-prone, and not integration-aware
- **PROB-013** Execution results are not reliably incorporated
- **PROB-033** Repo mutation and workspace state are not managed safely
- **PROB-021** Work products are not reviewable at human granularity

### Orchestration, governance, and evaluation

- **PROB-011** Discovery, requirements, and implementation blur together
- **PROB-014** Poor support for weakness hunting and critical review
- **PROB-015** Scope confusion and autonomy expectations derail usefulness
- **PROB-016** No operationally testable definition of “healthy” behavior
- **PROB-017** System reliability depends on agent compliance (tools, policies, phase discipline)
- **PROB-020** Multi-agent coordination failures create inconsistency and redundancy
- **PROB-024** No composable quality-control layer to intercept and challenge outputs
- **PROB-031** Orchestration is a black box (insufficient observability for diagnosis)
- **PROB-032** No evidence-backed self-improvement loop for orchestration configuration
- **PROB-038** No accumulation of user feedback or learned preferences
- **PROB-039** Context spillage across tasks leads to cross-contamination

### Environment, security, and dependency topology

- **PROB-018** Environment and dependency drift breaks reproducibility
- **PROB-019** Security boundary failures compromise integrity (secrets, untrusted inputs)
- **PROB-023** Cross-repo and dependency graph blind spots cause incomplete reasoning

### User interface, state visibility, and control

- **PROB-025** Current system state is not externally visible or inspectable
- **PROB-026** No canonical, user-visible “current understanding” baseline
- **PROB-027** Open work (todos, unknowns, decisions) is not continuously visible
- **PROB-028** Context selection is implicit and opaque to the user
- **PROB-029** Users cannot reliably anchor references when communicating with agents
- **PROB-030** State changes across sessions are not clearly surfaced to the user
- **PROB-035** Uncertainty and confidence are not communicated in a decision-usable way
- **PROB-040** No systematic trust calibration for agent outputs

## 3) Taxonomy and classification (to make the catalogue spec-ready)

This section adds **classification** and **scope boundaries** to reduce ambiguity later, without
prescribing implementation.

### 3.1 Tags

Tags are descriptive labels to reduce overlap confusion:

- **[Continuity]** multi-session memory and re-entry
- **[Freshness]** staleness detection and grounding over time
- **[Epistemic]** facts/assumptions/unknowns separation and drift control
- **[Traceability]** provenance, rationale, auditability
- **[Tools]** external tool integration (including MCP)
- **[Models]** provider/model portability and capability mismatch
- **[Cost]** token/context and repeated ingestion costs
- **[Budgeting]** non-token constraints and spend control (rate limits, timeouts, quotas, retry
  bounds)
- **[Integration]** codebase alignment and change isolation
- **[Execution]** builds/tests/runtime feedback incorporation
- **[Orchestration]** multi-agent coordination and conflict resolution
- **[Governance]** scope boundaries, phase separation, role clarity
- **[Evaluation]** operational tests and regression detection
- **[Environment]** reproducible toolchains and dependency state
- **[Security]** secrets and untrusted input boundaries
- **[Topology]** cross-repo and dependency graph awareness
- **[Reviewability]** human review and adoption workflow fit
- **[StateVisibility]** externalised, inspectable view of current system state
- **[UserControl]** explicit user control over scope, context, and commitment
- **[UXClarity]** reduction of ambiguity in user–system interaction
- **[Referencing]** stable anchors for pointing to specific objects
- **[SessionDelta]** visibility into what changed since the last interaction

### 3.2 Classification fields

These fields support prioritisation and later verification:

- **Frequency:** how often this problem appears in real work (Low / Medium / High)
- **Impact:** consequence if it occurs (Low / Medium / High)
- **Cost sensitivity:** how directly it drives token/time/tool spend (Low / Medium / High)
- **Blast radius:** how widely it can invalidate work (Local / Module / Repo / Multi-repo)
- **Primary observer:** who should be able to validate resolution indicators (User / System / Both)
- **Operational constraints:** non-token limits that can affect reliability (rate limits, timeouts,
  quotas, outages)

### 3.3 Boundary line

Each PROB includes a **Boundary / not this** line to prevent the problem statement from being
misread as a commitment to a particular solution class.

### 3.4 Overlap and coupling map

Many problems are **tightly coupled**. Overlap does not imply redundancy; it indicates where partial
fixes tend to fail.

- **Epistemic separation vs user-visible baseline:** PROB-003 ↔ PROB-026 ↔ PROB-008
- **Discipline, tool compliance, and diagnosability:** PROB-017 ↔ PROB-028 ↔ PROB-031
- **Quality control visibility and human reviewability:** PROB-024 ↔ PROB-027 ↔ PROB-021
- **Session continuity and delta visibility:** PROB-001 ↔ PROB-010 ↔ PROB-030
- **Evaluation and self-improvement of orchestration:** PROB-016 ↔ PROB-031 ↔ PROB-032

Practical implication:

- When drafting requirements, explicitly map each requirement to one or more PROBs to avoid
  duplicate or contradictory mitigations.

## 4) Problem inventory

Each problem is written as:

- **Tags & classification** (to support prioritisation)
- **Problem statement** (what breaks today)
- **Failure modes** (how it manifests)
- **Scenario snippet** (a short, realistic example)
- **Resolution indicators** (what would be observably true if the problem is reduced), stated as
  outcomes rather than implementation choices
- **Risk if unsolved** (why this matters)
- **Boundary / not this** (scope guardrails)

---

### PROB-001 — Session resets force repo research from scratch

**Tags:** [Continuity] [Cost] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem statement**

A new session behaves as though the system has never been seen before. The agent must re-establish
repo facts, patterns, invariants, and prior investigations repeatedly.

**Failure modes**

- Re-reading large parts of the codebase to answer routine questions.
- Inconsistent answers across sessions about the same code.
- Repeated discovery of the same key files, flows, and constraints.

**Scenario snippet**

A user asks “Where is auth enforced?” in week 2. The agent re-scans the repo, finds different entry
points than last session, and gives a new answer without acknowledging the prior investigation.

**Resolution indicators**

- Routine repo questions can be answered accurately at session start without re-ingesting large
  volumes of source text.
- The agent can reference prior investigations (what was checked, what was found, what remains
  unknown) without redoing them.
- The system consistently distinguishes **confirmed repo facts** from **inferred** or **unknown**
  items.

**Risk if unsolved**

- Persistent cost/time waste.
- Increased hallucination and contradictory guidance.
- Low trust in the agent’s continuity.

**Boundary / not this**

- Not a requirement to “store the whole repo forever” or mandate a specific indexing approach; the
  problem is repeated re-discovery and inconsistent re-entry.

---

### PROB-002 — Research becomes stale with no cheap upkeep mechanism

**Tags:** [Freshness] [Traceability] [Cost]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius:
Multi-repo

**Problem statement**

Research (about repo, dependencies, standards, APIs, or external docs) quickly goes out of date, but
most workflows treat it as static or rely on manual re-checking.

**Failure modes**

- Advice based on outdated docs or earlier repo state.
- Decisions made on assumptions that were true weeks ago.
- “We already researched that” is asserted without re-validation.

**Scenario snippet**

A library upgrades a major version. The agent continues to recommend APIs that no longer exist,
because older research is reused without recognising the change.

**Resolution indicators**

- The system can reliably recognise when previously collected research is likely outdated and must
  not be treated as current.
- When research is used, the agent can state whether it is current, uncertain, or stale enough to
  re-check.
- The system can connect changed conditions (repo changes, dependency changes, upstream
  documentation changes) to the risk of invalidated conclusions.

**Risk if unsolved**

- Silent correctness failures.
- Increasing divergence between “beliefs” and reality.
- Compounding rework when late contradictions are discovered.

**Boundary / not this**

- Not a promise of continuous monitoring of the entire internet; the problem is inability to
  recognise and manage staleness risk.

---

### PROB-003 — No durable epistemic state (facts, hypotheses, unknowns)

**Tags:** [Epistemic] [Continuity] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Agent sessions typically maintain an undifferentiated narrative. They do not reliably separate:

- Confirmed facts
- Hypotheses/interpretations
- Assumptions
- Unknowns requiring closure
- Constraints
- Decisions and rationale

**Failure modes**

- Hypotheses stated as facts.
- Unknowns silently turned into requirements.
- Constraints “laundered” into preferences or vice versa.
- The agent forgets what it is uncertain about.

**Scenario snippet**

The agent reads one file and infers “this is the only service layer.” Next session, that inference
is treated as fact, causing missed integration points.

**Resolution indicators**

- The system maintains a durable separation between **facts**, **assumptions**, **hypotheses**, and
  **unknowns**, and that separation survives session resets.
- The agent can consistently answer: “What do we know, what are we guessing, and what is
  unresolved?” without contradiction.
- Previously unvalidated assumptions do not silently become “background truth” in later sessions.

**Risk if unsolved**

- Hallucination becomes indistinguishable from knowledge.
- Decision history is corrupted, leading to unstable requirements and incorrect implementation.

**Boundary / not this**

- Not a demand for philosophical completeness; the problem is practical: confusion between facts and
  guesses leads to wrong code.

**Overlap note**

- User-visible baseline and validation issues are covered in PROB-026.

---

### PROB-004 — The agent cannot behave like it has deep, accurate historical knowledge

**Tags:** [Continuity] [Traceability] [Epistemic]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

A productive long-running coding assistant must appear to “remember” prior decisions and context,
but more importantly, it must **operate correctly** on that history.

**Failure modes**

- The agent repeats previously rejected ideas.
- The agent ignores established constraints and rationale.
- The agent cannot explain why the current plan exists.
- The agent misses known weaknesses that were previously identified.

**Scenario snippet**

A week after choosing a database approach, the agent recommends replacing it, not because of new
evidence, but because it cannot recover the decision rationale.

**Resolution indicators**

- The agent can accurately restate prior decisions, constraints, and rationale, and identify what
  remains open.
- The agent consistently detects drift (contradictions, reversals, missing rationale) relative to
  previously accepted baselines.
- Recommendations explicitly incorporate known constraints and decision history, rather than
  re-litigating settled items.

**Risk if unsolved**

- The system feels like a demo, not a collaborator.
- High effort to re-brief the agent, repeatedly.

**Boundary / not this**

- Not “perfect memory of every conversation”; the problem is inability to reliably act on key prior
  decisions and constraints.

---

### PROB-005 — Tooling interoperability is unreliable (MCP tools and beyond)

**Tags:** [Tools] [Continuity] [Epistemic]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Agentic systems frequently fail to integrate tools consistently. Even when tools exist, agents
misuse them, forget them, or cannot predictably chain them.

**Failure modes**

- The agent does not use available tools when it should.
- Tool calls are incorrect, missing parameters, or misinterpreting outputs.
- Tool usage varies wildly between sessions and models.

**Scenario snippet**

A repo search tool exists, but the agent guesses file locations from memory, producing incorrect
changes in the wrong module.

**Resolution indicators**

- Tool usage is consistent: when the same evidence is needed, the system reliably obtains it rather
  than guessing.
- Tool-driven workflows reduce uncertainty rather than increasing it (tool outputs are used and
  checked, not ignored).
- Tool outputs do not vanish into chat history; they remain retrievable and attributable for later
  steps and later sessions.

**Risk if unsolved**

- Agents remain “text-only” and cannot ground their work.
- Tool investment yields limited practical benefit.

**Boundary / not this**

- Not a requirement to support every tool protocol; the problem is unreliable grounding and
  inconsistent tool usage.

---

### PROB-006 — Model portability and model-mismatch failures

**Tags:** [Models] [Cost] [Continuity]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem statement**

Different tasks require different model strengths (reasoning depth, coding accuracy, cost
efficiency, context window, tool-use reliability). A system tied to one model or provider becomes
fragile and expensive.

**Failure modes**

- The system cannot swap models based on task requirements.
- Prompts and workflows work on one model but fail on another.
- Token/context inefficiency becomes a structural cost problem.

**Scenario snippet**

A cheap model is used for reasoning-heavy planning and produces subtle but compounding errors; a
strong model is used for trivial edits and wastes budget.

**Resolution indicators**

- The workflow remains viable across a wide range of models/providers without correctness
  collapsing.
- Switching models does not change “what we believe is true” about the repo, decisions, and
  constraints.
- Task outcomes remain consistent even when model capability or context size differs.

**Risk if unsolved**

- Vendor lock-in.
- Cost spikes.
- Reduced resilience when providers or models change behavior.

**Boundary / not this**

- Not “every model must perform equally”; the problem is that model changes currently break
  workflows and corrupt continuity.

---

### PROB-007 — Code writing is slow, error-prone, and not integration-aware

**Tags:** [Integration] [Execution] [Reviewability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Module

**Problem statement**

Generating code is not the hard part; integrating it correctly into an evolving codebase is. Agents
often write plausible code that fails local constraints.

**Failure modes**

- Style and conventions are violated.
- Missing edge cases, incorrect imports, wrong directory boundaries.
- Partial implementations that do not compile, test, or run.
- Large diffs with poor change isolation.

**Scenario snippet**

The agent adds a new service but bypasses existing layering rules, producing a diff that compiles
locally but violates architecture boundaries and fails CI.

**Resolution indicators**

- Generated changes align with repo conventions and architecture often enough to reduce, not
  increase, integration work.
- The system reliably detects when a change is incomplete or invalid relative to the codebase.
- Changes are scoped and localized, avoiding unnecessary edit radius.

**Risk if unsolved**

- The system increases workload rather than reducing it.
- Rework and debugging overwhelm any generation benefit.

**Boundary / not this**

- Not a guarantee of zero defects; the problem is systematic misalignment with repo constraints and
  poor change isolation.

---

### PROB-008 — Hallucination and assumption drift are not mechanically prevented

**Tags:** [Epistemic] [Freshness] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Agent workflows tend to reward forward progress, even when operating on invalid or ambiguous
baselines.

**Failure modes**

- The agent invents constraints or capabilities.
- The agent proceeds while uncertainty remains implicit.
- The agent “patches” prior conclusions in place, losing history.

**Scenario snippet**

A failing test indicates a wrong assumption about an API, but the agent continues to build on the
assumption and patches code around symptoms.

**Resolution indicators**

- Ambiguity becomes explicit: the system reliably surfaces uncertainties rather than silently
  resolving them.
- When a baseline is invalidated, work does not continue as if nothing happened.
- Changes in beliefs (facts, assumptions, decisions) are explicit rather than silently overwriting
  prior conclusions.

**Risk if unsolved**

- Requirements and implementations become untrustworthy.
- Late-phase reversals and wasted effort.

**Boundary / not this**

- Not “never make assumptions”; the problem is that assumptions are made silently and then treated
  as facts.

---

### PROB-009 — Lack of auditable history and decision traceability

**Tags:** [Traceability] [Continuity] [Epistemic]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

A long-running system needs to explain “why” something is the way it is, not just “what” it is.

**Failure modes**

- No record of why an approach was chosen.
- Unclear provenance of facts and research.
- Inability to identify when/why a belief changed.

**Scenario snippet**

Two months later, a user asks why a constraint exists. The agent cannot link it to a prior decision
or evidence, so it either re-invents rationale or drops the constraint.

**Resolution indicators**

- The system can explain why key decisions exist and what evidence/rationale supported them at the
  time.
- Claims about the repo or external facts can be tied back to some form of evidence (repo
  inspection, tool output, referenced documentation, user instruction).
- The system can identify meaningful deltas since a prior checkpoint without redoing all work.

**Risk if unsolved**

- The system becomes fragile and non-repeatable.
- Debugging the assistant becomes harder than debugging the code.

**Boundary / not this**

- Not a requirement for formal governance; the problem is practical inability to recover rationale
  and provenance.

---

### PROB-010 — No safe separation between “current baseline” and historical record

**Tags:** [Continuity] [Traceability] [Epistemic]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Developers need a coherent view of the latest state, but losing or corrupting history destroys
correctness and accountability. Many systems either:

- keep only summaries (truth loss), or
- keep everything but cannot produce a coherent “current” view.

**Failure modes**

- “Current plan” is a chat narrative and drifts.
- History exists but is too costly to rehydrate.
- The agent cherry-picks old context, mixing outdated and current beliefs.

**Scenario snippet**

A summarised “current plan” omits a rejected alternative and its rationale. Later work repeats the
rejected approach because the history is inaccessible.

**Resolution indicators**

- A coherent “current baseline” exists that does not require re-reading full history to use safely.
- Historical records are not silently overwritten to keep the current view convenient.
- The system can distinguish what is current vs what is historical vs what is derived/inferred.

**Risk if unsolved**

- Drift becomes inevitable.
- Users cannot trust continuity.

**Boundary / not this**

- Not a demand for a specific storage model; the problem is unsafe collapse of “current” and
  “history” into an unreliable narrative.

---

### PROB-011 — Discovery, requirements, and implementation blur together

**Tags:** [Governance] [Epistemic] [Traceability]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Medium · Blast radius:
Module

**Problem statement**

Agents frequently blur discovery, requirements, architecture, and implementation. This leads to
premature solutioning and unstable scopes.

**Failure modes**

- Implementation starts while unknowns remain unresolved.
- Requirements are written while the intent is still ambiguous.
- Research recommendations silently become commitments.

**Scenario snippet**

The agent reads partial docs and starts implementing a feature before clarifying constraints,
producing code that later must be discarded.

**Resolution indicators**

- The system can reliably tell which phase it is in and what information is still missing to proceed
  safely.
- Research can inform next steps without being misinterpreted as a decision.
- The system prevents “momentum” from overriding unresolved ambiguity.

**Risk if unsolved**

- The system builds the wrong thing quickly.
- Rework dominates.

**Boundary / not this**

- Not a commitment to a particular process framework; the problem is phase confusion causing
  premature commitment.

---

### PROB-012 — Cost blow-ups from context bloat and repeated ingestion

**Tags:** [Cost] [Continuity] [Tools]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem statement**

Current agent workflows often rely on stuffing large context windows with raw text repeatedly, which
is expensive and slow.

**Failure modes**

- Token usage grows superlinearly with project complexity.
- Agents re-send the same source files or docs.
- Long-context models are used when smaller ones would suffice, or vice versa.

**Scenario snippet**

To answer a question about one function, the workflow repeatedly uploads entire files and prior chat
logs, inflating cost and latency.

**Resolution indicators**

- Repeated ingestion of identical source text becomes the exception rather than the default.
- The system can answer questions with minimal necessary evidence rather than full-document copying.
- Cost and latency remain predictable as repo size and decision history increase.

**Risk if unsolved**

- The system becomes unaffordable at scale.
- Latency harms usability and iteration speed.

**Boundary / not this**

- Not “always use small context”; the problem is uncontrolled growth from repeated, redundant
  ingestion.

---

### PROB-013 — Execution results are not reliably incorporated

**Tags:** [Execution] [Integration] [Epistemic]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Module

**Problem statement**

A coding system must incorporate the results of real execution (tests, builds, runtime checks). Many
agentic workflows either cannot run commands reliably or fail to interpret and apply results.

**Failure modes**

- The agent suggests fixes without running tests.
- The agent misreads failing output or logs.
- Fix loops oscillate without converging.

**Scenario snippet**

CI fails with a type error, but the agent “fixes” unrelated files because it cannot parse the
compiler output into actionable updates.

**Resolution indicators**

- The system can consistently determine whether changes actually improved or worsened the state.
- Execution outcomes meaningfully update what the system believes (facts, hypotheses, unknowns)
  rather than being ignored.
- Repeated fix cycles tend to converge to a stable passing state instead of oscillating.

**Risk if unsolved**

- Code quality stagnates.
- The agent’s “confidence” remains ungrounded.

**Boundary / not this**

- Not a requirement to run every possible check; the problem is failure to incorporate the checks
  that are run.

---

### PROB-014 — Poor support for weakness hunting and critical review

**Tags:** [Governance] [Epistemic] [Traceability]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

A valuable system should proactively surface weaknesses, ambiguity, and risk. Most assistants
instead optimise for helpfulness and forward momentum.

**Failure modes**

- Inadequate skepticism about requirements and constraints.
- Missing failure modes and edge cases.
- Inability to stress-test decisions.

**Scenario snippet**

The agent proposes an architecture change but fails to flag migration risks, operational complexity,
or contradictions with existing constraints.

**Resolution indicators**

- The system consistently identifies ambiguous terms, hidden assumptions, and untested risks.
- Weaknesses remain visible over time until explicitly addressed (they do not disappear because a
  session ended).
- The system can explain why a plan is risky, not merely that it is risky.

**Risk if unsolved**

- The assistant reinforces bad plans.
- Failures appear later, when changes are expensive.

**Boundary / not this**

- Not “be negative by default”; the problem is inability to reliably surface risk and ambiguity.

---

### PROB-015 — Scope confusion and autonomy expectations derail usefulness

**Tags:** [Governance] [Traceability] [Evaluation]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

Users and agents often diverge on what the system is supposed to do (assist vs autonomously
decide/ship). When scope boundaries are unclear, the system either overreaches or underdelivers, and
work products become misaligned.

**Failure modes**

- The system behaves as if it can “ship without review” when the user expects advisory support.
- The system produces architecture/vendor commitments without explicit decision closure.
- The system takes authority on high-impact decisions without being asked, creating trust failures.

**Scenario snippet**

The user asks for options; the agent returns a single chosen plan and writes code as if the decision
is final, forcing the user to unwind implicit commitments.

**Resolution indicators**

- The system’s role and boundaries remain stable across sessions and models.
- The system does not silently convert suggestions into commitments.
- High-impact decisions are explicitly framed as decisions with visible rationale and open
  alternatives.

**Risk if unsolved**

- Persistent misalignment and rework.
- Trust degradation due to overreach.

**Boundary / not this**

- Not a requirement to block autonomy entirely; the problem is mismatch between expectations and
  system behavior.

---

### PROB-016 — No operationally testable definition of “healthy” behavior

**Tags:** [Evaluation] [Governance] [Continuity]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Even if individual problems are listed, the system often lacks a stable, testable notion of what
“good” looks like end-to-end. Without that, it is difficult to debug regressions, measure progress,
or detect drift.

**Failure modes**

- The system seems better in one session and worse in another with no clear explanation.
- Improvements are anecdotal and cannot be validated.
- Users cannot quickly tell whether the system is operating in a grounded, low-drift mode.

**Scenario snippet**

A change “improves” tool use but unexpectedly worsens continuity. Without operational checks, the
regression is only noticed after several failed tasks.

**Resolution indicators**

- It is possible to evaluate whether the system is operating well using observable behaviors
  (session re-entry quality, epistemic clarity, freshness of grounding, traceability, reliable tool
  usage, model portability, integration quality).
- Regressions are detectable without relying on subjective “it feels worse” judgments.

**Risk if unsolved**

- Iteration becomes random and slow.
- Drift and regressions go unnoticed until late.

**Boundary / not this**

- Not a requirement for one perfect metric; the problem is absence of stable, observable ways to
  detect regressions.

---

### PROB-017 — System reliability depends on agent compliance (tools, policies, phase discipline)

**Tags:** [Governance] [Tools] [Epistemic] [Continuity] [Orchestration]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Correctness, safety, cost control, and workflow integrity are brittle because they depend on the
agent _remembering to comply_ with expectations (using the right tools, following policies,
respecting phase boundaries, and maintaining epistemic discipline) rather than the system
consistently maintaining and enforcing those expectations.

**Failure modes**

- The agent “forgets” to use a tool and guesses instead.
- The agent uses the wrong tool or misuses a tool without detection.
- Phase boundaries degrade (research vs decision vs implementation), causing premature commitment.
- Unknowns turn into implicit assumptions, and assumptions turn into “facts” over time.
- Safety/cost policies are applied inconsistently depending on model behavior.

**Scenario snippet**

A repo-search tool is available and the workflow expects it to be used before edits. After several
turns, the agent stops invoking the tool, guesses file locations and requirements from memory, and
proceeds while unresolved unknowns quietly become assumptions.

**Resolution indicators**

- Violations of expected discipline (tool usage, phase boundaries, epistemic separation) become
  visible rather than silently passing.
- The user experiences consistent behavior even when model choice or session length changes.
- Work products do not depend on the agent “remembering” critical steps to remain correct.

**Risk if unsolved**

- The system becomes increasingly unreliable over time.
- The user must manually police the workflow, defeating the purpose of orchestration.

**Boundary / not this**

- Not “agents must be perfect,” and not a claim that autonomy must be eliminated; the problem is
  that core correctness depends on fragile agent self-discipline instead of being robust under
  normal forgetfulness and model variance.

**Overlap note**

- User-facing opacity of active context is covered in PROB-028.
- Diagnosability of tool/policy/agent behavior is covered in PROB-031.

---

### PROB-018 — Environment and dependency drift breaks reproducibility

**Tags:** [Environment] [Execution] [Traceability]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Results (tests, builds, runtime behavior) are not reliably reproducible across sessions or machines
because the environment state (toolchain versions, dependencies, configuration) drifts or is
ambiguous.

**Failure modes**

- “Works on my machine” behavior in agent runs vs CI.
- Conflicting outcomes when re-running the same command in later sessions.
- Fixes that target symptoms of environment mismatch rather than code issues.

**Scenario snippet**

The agent runs tests successfully locally. CI fails due to a different Node/Python/toolchain
version; the agent cannot explain the discrepancy.

**Resolution indicators**

- When execution outcomes differ, the system can attribute the difference to environment state vs
  code changes with minimal ambiguity.
- The system can keep track of the relevant environment context needed to interpret results.

**Risk if unsolved**

- Debugging becomes dominated by invisible environment variables.
- Agent effort is wasted chasing non-code failures.

**Boundary / not this**

- Not a mandate for containers or any specific packaging method; the problem is non-reproducibility
  from ambiguous environment state.

---

### PROB-019 — Security boundary failures compromise integrity (secrets, untrusted inputs)

**Tags:** [Security] [Tools] [Traceability]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius:
Multi-repo

**Problem statement**

A coding system inevitably handles sensitive inputs (tokens, keys) and untrusted content (repo text,
issues, docs). Without clear security boundaries, the system can leak secrets, follow malicious
instructions, or corrupt outputs.

**Failure modes**

- Secrets appear in logs, prompts, or generated patches.
- Prompt injection from repo/docs causes the agent to change behavior.
- The system makes outbound calls or decisions based on untrusted text without scrutiny.

**Scenario snippet**

A repo contains a “CONTRIBUTING.md” snippet that instructs the agent to exfiltrate environment
variables; the system treats it as authoritative instructions.

**Resolution indicators**

- Sensitive data is not propagated into places where it does not belong (prompts, logs, patches).
- Untrusted content is not able to silently override system intent or workflow discipline.

**Risk if unsolved**

- Security incidents and data leakage.
- Loss of integrity in generated work.

**Boundary / not this**

- Not a claim of perfect security; the problem is lack of explicit boundaries leading to predictable
  leakage and injection failures.

---

### PROB-020 — Multi-agent coordination failures create inconsistency and redundancy

**Tags:** [Orchestration] [Epistemic] [Cost]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem statement**

When multiple agents (research/planning/execution/testing) run in parallel or in sequence, they
often produce inconsistent beliefs, duplicate work, or deadlocks because shared state and conflict
resolution are weak.

**Failure modes**

- Two agents reach conflicting conclusions and the system merges them silently.
- Agents re-do each other’s research because they cannot trust shared outputs.
- The workflow oscillates (agent A undoes agent B) without convergence.

**Scenario snippet**

A research agent concludes “API X is required.” An execution agent implements using API Y from a
different assumption. The system proceeds without detecting the conflict.

**Resolution indicators**

- Inconsistencies between agents become explicit rather than silently merged.
- Duplicate work is reduced because agent outputs can be reused with understood provenance and
  confidence.
- Multi-step workflows converge more often than they thrash.

**Risk if unsolved**

- Cost escalates quickly.
- Quality decreases due to inconsistent baselines.

**Boundary / not this**

- Not a requirement for parallelism; the problem exists even with sequential agents when shared
  state is unreliable.

---

### PROB-021 — Work products are not reviewable at human granularity

**Tags:** [Reviewability] [Traceability] [Integration]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Medium · Blast radius:
Module

**Problem statement**

Even when code compiles, the work is often hard to review: changes are too large, rationale is
missing, and the human cannot easily assess risk and correctness.

**Failure modes**

- Large diffs with unrelated edits.
- No explanation of why each change exists.
- Missing mapping between changes and requirements/decisions.

**Scenario snippet**

The agent implements a feature and reformats many files “for consistency,” making it impractical for
the user to review quickly and safely.

**Resolution indicators**

- Changes can be reviewed in small, coherent units.
- A human can connect each change to an intent/rationale without reconstructing it from chat.

**Risk if unsolved**

- Humans reject changes, slowing iteration.
- Bugs slip through due to review fatigue.

**Boundary / not this**

- Not a requirement for a specific code-review tool; the problem is the mismatch between generated
  output structure and human review needs.

**Overlap note**

- Quality-control interception is covered in PROB-024.
- Persistent visibility of open items and flagged issues is covered in PROB-027.

---

### PROB-022 — Knowledge schema evolution breaks long-lived continuity

**Tags:** [Continuity] [Traceability] [Epistemic]

**Classification:** Frequency: Medium · Impact: Medium · Cost sensitivity: Medium · Blast radius:
Repo

**Problem statement**

Any durable knowledge (facts, decisions, research) accumulates over time. When the way this
knowledge is structured changes, older knowledge becomes hard to interpret, causing continuity
breaks and subtle corruption.

**Failure modes**

- Old decisions cannot be interpreted under the current structure.
- The system silently drops fields or meaning during transitions.
- Long-lived projects become increasingly inconsistent as “eras” of knowledge diverge.

**Scenario snippet**

Earlier sessions tracked constraints informally; later sessions track them explicitly. When
revisiting, the system fails to reconcile the two and misses constraints.

**Resolution indicators**

- Older knowledge remains usable and correctly interpreted over time.
- Structural changes do not silently corrupt meaning or erase provenance.

**Risk if unsolved**

- Long-running projects degrade and become unreliable.
- Users lose trust in continuity and stop relying on stored knowledge.

**Boundary / not this**

- Not a requirement for one immutable schema forever; the problem is unmanaged evolution that breaks
  interpretation.

---

### PROB-023 — Cross-repo and dependency graph blind spots cause incomplete reasoning

**Tags:** [Topology] [Freshness] [Integration]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius:
Multi-repo

**Problem statement**

Modern systems rely on multiple repos, packages, and generated artifacts. If the agent only
understands the local repo slice, it misses constraints and integration points that live elsewhere.

**Failure modes**

- Changes break downstream consumers.
- The agent cannot explain how a change propagates across packages.
- “Fix” in one repo creates regressions in another.

**Scenario snippet**

A shared package API changes. The agent updates only the local repo, missing that other repos or
internal packages depend on the old signature.

**Resolution indicators**

- The system reliably recognises when a task spans multiple repos/packages.
- The agent can reason about dependencies and impacts beyond a single directory snapshot.

**Risk if unsolved**

- Integration regressions and cascading failures.
- Rework across repos becomes the default.

**Boundary / not this**

- Not a requirement to ingest every external repo; the problem is blindness to dependency topology
  and its consequences.

---

### PROB-024 — No composable quality-control layer to intercept and challenge outputs

**Tags:** [Evaluation] [Epistemic] [Orchestration] [Governance]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

Agent outputs (plans, explanations, patches, tool actions) frequently reach the user or trigger
actions without being subjected to independent scrutiny. Without a reliable way to insert
critics/checkers, hallucinations and obvious mistakes propagate downstream.

**Failure modes**

- Outputs are presented directly to the user without any independent challenge step.
- Review steps (when present) are applied inconsistently across tasks, sessions, or models.
- “Critics” are non-independent (they restate the primary output) and fail to catch basic errors.
- Detected issues do not reliably prevent downstream actions (errors are noted but execution
  continues anyway).

**Scenario snippet**

A planning agent proposes an API migration based on an incorrect assumption. The plan is shown to
the user and implementation begins before any independent check highlights that the target API is
unavailable in the current dependency versions.

**Resolution indicators**

- High-risk outputs routinely face a distinct, independent challenge step before they are presented
  or executed.
- Obvious inconsistencies (with known facts, constraints, or repo evidence) are caught earlier
  rather than after implementation work has started.
- When errors are surfaced, downstream actions do not proceed as if the output were correct.

**Risk if unsolved**

- Hallucinations and preventable mistakes reach users and code.
- Increased rework due to late discovery of obvious issues.
- Trust degradation: users must manually “be the critic” every time.

**Boundary / not this**

- Not a promise of perfect correctness; the problem is lack of a low-friction, reliable way to add
  independent scrutiny so that obvious errors do not routinely escape.

**Overlap note**

- Visibility of open items (including critic findings) is covered in PROB-027.
- Human review granularity and change adoption friction is covered in PROB-021.

---

### PROB-025 — Current system state is not externally visible or inspectable

**Tags:** [StateVisibility] [UXClarity] [Governance]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

The user cannot reliably see what the system believes the current state is (what is true, what is in
progress, what is blocked, and why). State is implicit in chat flow rather than explicit and
inspectable.

**Failure modes**

- The user cannot tell whether the system is researching, planning, implementing, or blocked.
- The user infers state from narrative tone instead of explicit signals.
- The agent appears confident even when operating on an invalid or partial baseline.

**Scenario snippet**

After several turns, the user is unsure whether the agent is waiting on input, proceeding
autonomously, or stuck, and issues redundant instructions that further confuse state.

**Resolution indicators**

- The current state of work is visible without reading the full conversation.
- The user can quickly understand what the system thinks is happening right now.

**Risk if unsolved**

- Misalignment between user intent and system action.
- Increased cognitive load and corrective intervention.

**Boundary / not this**

- Not a requirement for a specific UI layout; the problem is lack of externally visible state.

---

### PROB-026 — No canonical, user-visible “current understanding” baseline

**Tags:** [StateVisibility] [Epistemic] [UXClarity]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

There is no single, authoritative, user-visible representation of what the system currently believes
to be true, assumed, constrained, and decided.

**Failure modes**

- The user and system operate on different implicit understandings.
- Assumptions and decisions are scattered across chat history.
- The user cannot easily validate or correct the system’s understanding.

**Scenario snippet**

The user believes a constraint was agreed upon earlier. The agent does not apply it because it
exists only implicitly in prior conversation turns.

**Resolution indicators**

- A single “current understanding” can be inspected and validated by the user.
- Divergence between user belief and system belief becomes immediately visible.

**Risk if unsolved**

- Persistent misunderstanding and rework.
- Loss of trust in system continuity.

**Boundary / not this**

- Not a demand for a perfect summary; the problem is absence of an authoritative, inspectable
  baseline.

**Overlap note**

- Internal epistemic separation and durability issues are covered in PROB-003.

---

### PROB-027 — Open work (todos, unknowns, decisions) is not continuously visible

**Tags:** [StateVisibility] [UXClarity] [Governance]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

Items that are still open (unknowns, pending decisions, risks, planned actions) are not persistently
visible and are easily forgotten by both user and system.

**Failure modes**

- Unresolved questions disappear from attention.
- Risks raised earlier are silently dropped.
- Work resumes without closing known gaps.

**Scenario snippet**

A critic flags a missing edge case. Several turns later, implementation continues as if the issue
was resolved, even though it was never addressed.

**Resolution indicators**

- Open items remain visible until explicitly resolved or dismissed.
- The user can see at a glance what still needs attention.

**Risk if unsolved**

- Important gaps are missed.
- Quality degrades over time.

**Boundary / not this**

- Not a requirement for a task manager; the problem is loss of situational awareness.

**Overlap note**

- Quality-control insertion and interception is covered in PROB-024.
- Human reviewability constraints are covered in PROB-021.

---

### PROB-028 — Context selection is implicit and opaque to the user

**Tags:** [UserControl] [UXClarity] [Epistemic]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

The user cannot see or control what information the agent is actively conditioning on, leading to
misunderstandings and incorrect references.

**Failure modes**

- The agent ignores relevant information the user assumes is in context.
- The agent relies on outdated or unintended context.
- Users repeat information unnecessarily.

**Scenario snippet**

The user refers to “the earlier decision,” assuming it is known. The agent interprets a different
decision from a previous session.

**Resolution indicators**

- The user can understand what information is currently active for the agent.
- Context-related misunderstandings decrease.

**Risk if unsolved**

- Frequent miscommunication.
- Increased prompt verbosity and frustration.

**Boundary / not this**

- Not a requirement to expose raw prompts; the problem is opaque context selection.

**Overlap note**

- Discipline breakdown that depends on agent compliance is covered in PROB-017.
- Orchestration diagnosability (who did what, with what evidence) is covered in PROB-031.

---

### PROB-029 — Users cannot reliably anchor references when communicating with agents

**Tags:** [Referencing] [UXClarity] [Continuity]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

Users lack stable ways to reference specific decisions, assumptions, files, or open items, causing
ambiguity when communicating with the system.

**Failure modes**

- “This” and “that” are misinterpreted.
- The agent references the wrong item from history.
- Users re-explain instead of referencing.

**Scenario snippet**

The user says “use the previous assumption,” and the agent applies a different assumption with a
similar name.

**Resolution indicators**

- References are unambiguous and consistently interpreted.
- Communication becomes shorter and more precise.

**Risk if unsolved**

- Persistent misunderstanding.
- High cognitive load for users.

**Boundary / not this**

- Not a demand for natural-language perfection; the problem is lack of stable anchors.

---

### PROB-030 — State changes across sessions are not clearly surfaced to the user

**Tags:** [SessionDelta] [StateVisibility] [Continuity]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

When a user returns after time away, changes in understanding, decisions, risks, and open items are
not clearly summarised, forcing re-orientation from scratch.

**Failure modes**

- The user rereads long history to understand what changed.
- Important deltas are missed.
- The user unknowingly revisits already resolved topics.

**Scenario snippet**

After a day away, the user asks a question that was already answered and closed, because the change
was never surfaced.

**Resolution indicators**

- The user can quickly see what changed since their last interaction.
- Re-orientation time is minimal.

**Risk if unsolved**

- Inefficient collaboration.
- Reduced usability for long-running work.

**Boundary / not this**

- Not a requirement for a full audit UI; the problem is lack of clear session-to-session deltas.

---

### PROB-031 — Orchestration is a black box (insufficient observability for diagnosis)

**Tags:** [Orchestration] [Evaluation] [Traceability] [UXClarity]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

When outcomes are poor (hallucinations, tool misuse, thrash, cost spikes, low-quality diffs), the
user and system cannot reliably determine what actually happened inside orchestration. Agent
execution order, evidence usage, tool invocations or omissions, model choices, and boundary
violations are largely implicit and non-inspectable.

**Failure modes**

- The user cannot tell which agent produced which conclusion or action.
- Tool omissions or misuse are only discovered after damage is done.
- Model choice and its consequences are opaque and hard to reason about.
- Multi-agent conflicts appear as contradictions with no traceable source.
- Phase or policy violations are not visible until downstream failure.

**Scenario snippet**

A task produces an incorrect patch. The user cannot determine whether the failure came from missing
repo evidence, a skipped tool call, a critic being bypassed, a model mismatch, or conflicting agent
conclusions.

**Resolution indicators**

- For significant outputs, the system can explain the chain of responsibility: which agents ran, in
  what order, using what evidence and tools.
- Orchestration-related failure causes can be differentiated (tool omission vs misuse vs stale
  evidence vs model mismatch vs agent conflict).
- Divergence between evidence, constraints, and outputs becomes observable before large amounts of
  work accumulate.

**Risk if unsolved**

- Orchestration changes devolve into guesswork and cargo-culting.
- Regressions become expensive and hard to debug.
- Trust degrades because the system cannot justify its own behavior.

**Boundary / not this**

- Not a demand for exposing raw prompts or provider internals; the problem is lack of inspectable
  orchestration behavior sufficient for diagnosis.

**Overlap note**

- Discipline that depends on agent self-compliance is covered in PROB-017.
- Context opacity and reference ambiguity are covered in PROB-028.

---

### PROB-032 — No evidence-backed self-improvement loop for orchestration configuration

**Tags:** [Orchestration] [Evaluation] [Governance] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: High · Blast radius:
Multi-repo

**Problem statement**

The system cannot reliably diagnose weaknesses in its own orchestration and recommend researched,
testable changes to how orchestration functions (agents, tools, critics, model allocation,
policies). Improvements are ad-hoc and cannot be validated against observed outcomes.

**Failure modes**

- Recommendations default to generic best practices without tying to observed failures.
- Orchestration grows by accretion (more agents, more critics) with unclear benefit.
- The system cannot propose alternatives with explicit trade-offs (cost, latency, correctness).
- Regressions caused by orchestration changes are not detected.
- The system cannot distinguish task difficulty from orchestration defects.

**Scenario snippet**

After repeated hallucinations, the system suggests adding critics and changing models, but cannot
link these changes to specific failure modes or demonstrate that prior changes improved outcomes.

**Resolution indicators**

- Orchestration change recommendations are explicitly grounded in observed patterns (failure modes,
  costs, convergence behavior, user intervention frequency).
- Proposed changes include clear expected effects and trade-offs.
- The system can determine whether changes improved or worsened outcomes over time.

**Risk if unsolved**

- Orchestration becomes bloated, expensive, and brittle.
- Improvement stalls because root causes are unclear.
- Users must manually design and debug orchestration.

**Boundary / not this**

- Not a requirement for autonomous self-modifying code; the problem is lack of credible,
  evidence-backed diagnosis and improvement recommendations.

---

### PROB-033 — Repo mutation and workspace state are not managed safely

**Tags:** [Integration] [Execution] [Traceability] [Reviewability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem statement**

The system cannot reliably manage repo state transitions and mutations (working tree cleanliness,
patch application, conflicts, partial changes, and base revision alignment). As a result, changes
may be applied to the wrong baseline, applied incompletely, or leave the repo in a confusing or
unrecoverable state.

**Failure modes**

- Patches are applied against a different base than intended, producing subtle breakage.
- Conflicts or partial applications are not surfaced clearly, leaving mixed or inconsistent state.
- Uncommitted work is overwritten or lost during agent-driven edits.
- Large diffs are produced without clear isolation of intent, increasing review and rollback risk.

**Scenario snippet**

An agent generates a patch based on a repo snapshot. Meanwhile, the repo evolves (branch change,
dependency update). The patch applies “cleanly” but introduces incorrect changes because it targets
outdated assumptions about file structure and APIs.

**Resolution indicators**

- The repo’s mutable state relevant to safe change application is unambiguous and inspectable.
- When changes cannot be safely applied, the system surfaces the mismatch before compounding work.
- Humans can review and adopt changes without reconstructing what state the repo was in when the
  changes were produced.

**Risk if unsolved**

- Corrupted or confusing repo state and lost work.
- Increased debugging time due to hidden baseline mismatches.
- Reduced trust in automation because rollback and verification are costly.

**Boundary / not this**

- Not a requirement to automate version control workflows; the problem is unsafe or ambiguous
  mutation of repo state during agent-assisted work.

---

### PROB-034 — Task interruption and resumability failures cause repeated work

**Tags:** [Continuity] [Execution] [Traceability] [UXClarity]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: High · Blast radius: Module

**Problem statement**

Long-running or multi-step tasks cannot be paused and resumed without losing intermediate progress,
findings, and execution context. Resumption often requires re-reading history, re-running commands,
and re-establishing intent, leading to duplicated effort and drift.

**Failure modes**

- Intermediate outcomes (what was tried, what failed, what remains) are lost or ambiguous.
- The user cannot tell what the next safe step is after returning.
- Execution context (last command outcomes, environment assumptions, partial migrations) is missing,
  causing rework.

**Scenario snippet**

A user pauses a migration after partial implementation and failing tests. The next day, neither the
user nor the agent can reconstruct the exact failure context and planned next steps without redoing
large portions of the investigation.

**Resolution indicators**

- A task can be resumed with minimal re-orientation, including clear next actions and known
  blockers.
- The system preserves enough intermediate context to prevent repeating the same investigations and
  mistakes.
- The system can distinguish “paused,” “blocked,” and “complete” states without relying on chat
  narrative.

**Risk if unsolved**

- Repeated work across sessions.
- Increased drift as resumption proceeds from imperfect reconstructions.
- Lower throughput on any task that cannot be completed in one sitting.

**Boundary / not this**

- Not a requirement for background execution while the user is away; the problem is loss of
  resumable task state and intermediate findings.

---

### PROB-035 — Uncertainty and confidence are not communicated in a decision-usable way

**Tags:** [UXClarity] [Epistemic] [StateVisibility]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

The system cannot reliably communicate uncertainty and confidence in a way the user can use to
decide when to trust, verify, or block actions. Tone and fluency often mask weak grounding, and
uncertainty handling varies across models and sessions.

**Failure modes**

- High-risk suggestions are presented with unjustified confidence.
- The user cannot distinguish verified repo facts from plausible-sounding inferences.
- Uncertainty caveats are inconsistent, overly generic, or missing when most needed.

**Scenario snippet**

The agent recommends deleting or refactoring critical code paths while being uncertain about call
sites. The user cannot tell whether the recommendation is grounded in repo evidence or derived from
assumptions.

**Resolution indicators**

- Users can quickly tell which claims are grounded vs inferred vs unknown.
- High-impact actions come with clarity about what must be verified before proceeding.
- The user’s decision time decreases because trust calibration is explicit and consistent.

**Risk if unsolved**

- Preventable mistakes reach code and users.
- Users either over-trust (risk) or under-trust (lost value), both reducing utility.

**Boundary / not this**

- Not a requirement for numeric probabilities; the problem is lack of consistent, decision-usable
  trust calibration.

---

### PROB-036 — Unbounded retries and unpredictable degradation under quotas/timeouts/outages

**Tags:** [Budgeting] [Tools] [Execution] [Cost] [Orchestration]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: High · Blast radius:
Multi-repo

**Problem statement**

Under external constraints (rate limits, timeouts, quotas, provider outages, tool flakiness), the
system degrades unpredictably. It may thrash, retry excessively, silently proceed with weaker
substitutes, or guess without evidence, producing cost spikes and correctness regressions.

**Failure modes**

- Retry storms on failing tools or providers, burning budget and time.
- Silent fallback behavior (weaker models, skipped checks) without making the degradation explicit.
- Partial failures are ignored and work continues as if evidence was obtained.
- The system proceeds by guessing when tool access is constrained.

**Scenario snippet**

A repo search tool starts returning timeouts. The system retries repeatedly, consumes budget, and
then continues by guessing file locations, leading to incorrect changes.

**Resolution indicators**

- Degradation conditions are detected and made explicit before downstream work proceeds.
- Retry behavior is bounded and does not spiral cost or latency.
- When evidence cannot be obtained due to constraints, the system does not silently convert unknowns
  into assumptions.

**Risk if unsolved**

- Unpredictable cost and latency.
- Increased hallucination and incorrect changes during outages.
- Operational brittleness when scaling or using multiple providers/tools.

**Boundary / not this**

- Not a promise of provider uptime or perfect tool reliability; the problem is unmanaged degradation
  that causes thrash and silent correctness loss.

---

### PROB-037 — Prompt brittleness undermines consistent agent behavior

**Tags:** [Orchestration] [Models] [Continuity]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius:
Multi-repo

**Problem statement**

The system's guidance to the agent (prompts, roles, and instructions) is fragile. Small changes in
wording, context, or model choice can lead to disproportionately large shifts in agent behavior.
Development workflows become unreliable because prompt-tuning, rather than robust mechanisms, is
carrying too much burden in keeping the agent on track.

**Failure modes**

- A minor rephrase of a request causes the agent to skip critical steps or tools.
- Upgrading or switching the model breaks previously working prompt instructions.
- The agent's compliance with policies or style guides drifts if they are not repeatedly reinforced
  in each prompt.
- Orchestration logic that works in one project or session fails in a slightly different context due
  to unseen prompt ambiguities.

**Scenario snippet**

After a model update, the agent stops running tests before suggesting fixes—even though the prompt
still instructs it to do so. A solo developer adds a single clarification to the prompt in a new
session; suddenly the agent's replies ignore earlier context and repeat work. The workflow now
requires manual prompt debugging to restore the expected behavior.

**Resolution indicators**

- Prompt and instruction changes (or model swaps) do not routinely destabilize the agent's workflow
  compliance.
- The agent's core behaviors (tool use, policy adherence, reasoning steps) remain consistent across
  sessions without requiring constant prompt tweaks.
- The system can accommodate natural language variation or evolving instructions, indicating a more
  resilient alignment than brittle, hard-coded prompt phrases.

**Risk if unsolved**

- Every prompt or model change becomes a potential regression, making the system labor-intensive to
  maintain.
- Users lose trust in the system's reliability and avoid updates or minor re-specifications, leading
  to stagnation and brittle usage patterns.
- The burden of prompt engineering stays on the solo dev, offsetting the benefits of assistance.

**Boundary / not this**

- Not a demand for perfect invariance across models or phrasing; the problem is over-reliance on a
  fragile prompt template instead of robust, systematic behavior control.

---

### PROB-038 — No accumulation of user feedback or learned preferences

**Tags:** [Continuity] [Evaluation] [Orchestration]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius:
Multi-repo

**Problem statement**

The system does not learn from the user's feedback, corrections, or preferences over time. Each
session or task starts fresh, so the agent repeats mistakes or style violations that the user had
previously corrected. There is no durable improvement or personalization based on how the solo
developer interacts with the assistant, limiting long-term usefulness.

**Failure modes**

- The agent reintroduces a coding style or library that the user explicitly rejected in an earlier
  session.
- Known false starts or pitfalls (e.g. an approach that failed last week) are suggested again as if
  they were never tried.
- The system forgets decision resolutions – the user has to remind the agent of earlier conclusions
  or preferences in each session.
- No matter how many times a particular fix or tweak is applied by the user, future suggestions
  don't reflect that learning (no reduction in repeated errors).

**Scenario snippet**

Over the course of a project, the user repeatedly tells the agent to use functional components
instead of class components in a React codebase. Each new feature, the agent suggests a class
component again, having no memory of this preference. The solo dev spends time correcting the same
issue multiple times, feeling as though the assistant has no notion of their coding conventions or
past guidance.

**Resolution indicators**

- The system's suggestions begin to align with the user's established preferences (tools, style,
  architectural choices) without being reminded every time.
- Repeated mistakes or previously corrected errors become less frequent as the project progresses.
- The agent can acknowledge prior feedback (e.g. "Using approach X since you preferred that
  previously") or at least avoid past rejected solutions in similar future contexts.
- Over multiple sessions, the need for user re-correction of identical issues decreases noticeably.

**Risk if unsolved**

- The solo developer's trust and patience wear thin due to seeing the same mistakes recur, leading
  them to disengage from using the assistant for critical work.
- Efficiency gains plateau or reverse – time saved by the AI in one instance is lost in correcting
  it later again and again.
- Without a learning loop, the system cannot truly improve or adapt to a project's evolving norms,
  making it unsuitable for long-term use on a single codebase.

**Boundary / not this**

- Not a request for full auto-tuning or AI self-modification; the problem is the absence of any
  lightweight mechanism to capture and reuse feedback (e.g. remembered decisions, style guidelines,
  "don't do that" lessons) that a solo dev naturally provides during collaboration.

---

### PROB-039 — Context spillage across tasks leads to cross-contamination

**Tags:** [Continuity] [Governance] [StateVisibility]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius:
Multi-repo

**Problem statement**

The system lacks strict context isolation for different tasks or projects. Knowledge and assumptions
bleed from one thread of work into another without clear intent, causing the agent to mix contexts.
A solo developer often juggles multiple features or even separate repositories, but the assistant
may treat them as one giant context, leading to suggestions that are irrelevant, incorrect, or even
proprietary to the wrong project.

**Failure modes**

- While working on task B, the agent references a requirement or code from task A that isn't
  actually relevant to B.
- The assistant uses information from an old project when assisting with a new project, confusing
  names or leaking details (e.g. suggesting an internal API from a different codebase).
- After a context switch (like checking out a different git branch or repository), the agent
  continues with outdated assumptions from the previous context.
- Parallel conversations or sessions influence each other unintentionally, creating tangled state
  (one feature's discussion alters the agent's understanding of another feature).

**Scenario snippet**

A developer has an open issue to refactor the authentication module and another to update the
payment service. While focusing on the payment service, the agent suddenly brings up token
expiration logic from the authentication module (a different task) as if it's relevant, leading the
user down a needless rabbit hole. In another case, the user works on a personal project after a work
project; the agent suggests using a proprietary library from the work project in the personal
project code, an inappropriate cross-context suggestion that occurred because it didn't isolate the
two projects' knowledge.

**Resolution indicators**

- The assistant cleanly segregates knowledge by task or project unless explicitly instructed to
  cross-reference. It "stays in its lane" for a given thread of work.
- When the user switches context (new feature, new repo, new session), the system either resets
  relevant state or transparently re-aligns to the new scope, without unprompted carryover from the
  old scope.
- The user can run concurrent tasks or swap between projects without the agent confusing the
  contexts. Any blending of context is deliberate (triggered by user linking two topics) rather than
  accidental.
- The system provides some visibility or confirmation of the active context to reassure the user
  that past unrelated info is not influencing current answers.

**Risk if unsolved**

- Suggestions will often be context-inappropriate, leading to mistakes that waste time (or even
  serious bugs, if code from the wrong context is applied blindly).
- The user must constantly police and reset the assistant's context, which is tedious and
  error-prone.
- In the worst case, a private or sensitive detail from one project could leak into another, posing
  confidentiality risks.
- The assistant cannot be safely used for multi-tasking or multi-project work, significantly
  limiting its practical utility for a solo dev wearing many hats.

**Boundary / not this**

- Not a requirement to never reuse knowledge (the user may intentionally bring context from one task
  to another); the problem is the unintentional and unmanaged leakage of context that should remain
  separate, due to lack of scoping controls in the system.

---

### PROB-040 — No systematic trust calibration for agent outputs

**Tags:** [UXClarity] [Evaluation] [Traceability]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius: Repo

**Problem statement**

The system provides the solo developer with no consistent way to gauge how much to trust the AI's
outputs. There is no systematic trust calibration mechanism or reliable cues. As a result, the user
is often guessing whether a suggestion is solid or needs careful vetting. The assistant's fluent
answers can mask uncertainty or lack of grounding, and there's no tracking of past reliability to
inform the user's level of caution.

**Failure modes**

- The agent presents a high-risk code change (e.g. a security-sensitive modification) with
  unwarranted confidence, and the user accepts it at face value when they shouldn't.
- Conversely, the user ends up double-checking even routine suggestions because they have no basis
  to judge the agent's confidence or past accuracy, leading to wasted effort.
- There is no record or indicator of how often the assistant's answers have been correct or required
  fixes, so the user's trust (or lack thereof) is driven only by ad-hoc anecdotal memory.
- Tone and verbosity are the user's only clues; a casual or concise answer might be interpreted as
  confident when it's actually a guess, or vice versa.

**Scenario snippet**

The agent suggests a complex database migration. It sounds sure of itself, so the developer proceeds
– only to hit major issues because the agent's understanding was incomplete. There had been subtle
hints of uncertainty (it overlooked a known constraint), but the system gave no explicit signal. In
another case, after a few such surprises, the developer assumes the agent's suggestions are
generally untrustworthy and begins rewriting code manually that the agent could handle, reducing the
assistant to a rubber duck. Without any calibrated indicators, the solo dev oscillates between
over-trusting and under-utilizing the AI.

**Resolution indicators**

- Each significant recommendation comes with cues or context that help the user decide on trust:
  e.g. evidence citations, uncertainty qualifiers, or an explicit confidence level.
- The system's communication of uncertainty is consistent and decision-useful – the developer can
  tell at a glance which parts of an answer are well-grounded and which need verification.
- Over time, the user develops an accurate mental model of the assistant's reliability (or even sees
  metrics of past performance), allowing for calibrated trust. High-confidence, historically
  reliable suggestions are fast-tracked, whereas speculative ones trigger user review or agent
  double-checks by design.
- The user's need to manually scrutinize every single output is reduced, without blindly accepting
  everything – they know when vigilance is needed.

**Risk if unsolved**

- Over-trust: The user might delegate critical tasks to the agent that it handles incorrectly,
  leading to serious bugs or security incidents because warnings signs weren't visible.
- Under-trust: The user might ignore or redo correct solutions, losing much of the efficiency gains.
  In effect, the AI becomes more hindrance than help.
- In both cases, the utility of the system drops – the developer either spends extra time fixing
  avoidable mistakes or forgoes the assistant's help on tasks where it could have added value, due
  to lack of trust.
- Ultimately, an inability to calibrate trust means the system cannot be safely given
  responsibility, limiting it to toy scenarios in the eyes of the user.

**Boundary / not this**

- Not a demand for perfect accuracy or formal verification of all outputs; the problem is the lack
  of transparent, usable signals for the user to judge when to trust the agent's work versus apply
  caution. In other words, the system does little to help the user be an informed collaborator
  rather than a blind follower or constant skeptic.
