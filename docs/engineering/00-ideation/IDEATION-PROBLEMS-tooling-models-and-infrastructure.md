---
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: tooling-models-and-infrastructure
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Tool usage is unreliable; model swaps break workflows; context bloat drives costs; security
  boundaries are weak; dependency topology is blind; prompt brittleness undermines consistency'
summary_long:
  'Identifies 6 critical infrastructure problems: tools exist but agents misuse them or forget them;
  model-specific prompt tuning creates lock-in and fragility; repeated document ingestion wastes
  tokens; secrets leak into prompts; cross-repo dependencies are invisible; prompts must be
  constantly tweaked to maintain consistency. These problems compound cost, reduce portability, and
  create operational brittleness.'
related_ideation:
  [IDEATION-PROBLEMS-orchestration-and-governance, IDEATION-PROBLEMS-integration-and-execution]
drives: []
index:
  sections:
    - title: 'Document Relationships'
      lines: [112, 141]
      summary:
        'Infrastructure provides the substrate for all agent operations; weak tools, model lock-in,
        cost bloat, security gaps, and brittleness undermine all other improvements.'
      token_est: 142
    - title: 'TLDR'
      lines: [143, 168]
      summary:
        'Tools exist but are unreliably used; models are swapped casually despite tight coupling;
        token bloat from re-ingestion; secrets leak; cross-repo dependencies are hidden; prompts are
        brittle and require constant tweaking.'
      token_est: 199
    - title: 'Scope'
      lines: [170, 197]
      summary:
        'Tool integration reliability, model portability, token budgeting, security boundaries,
        dependency visibility, and resilient instruction mechanisms—not specific tools, cost
        accounting, or MCP details.'
      token_est: 142
    - title: 'Overview'
      lines: [199, 212]
      token_est: 137
    - title: 'Problems'
      lines: [214, 525]
      token_est: 2363
      subsections:
        - title:
            'Problem 1: PROB-005 — Tooling interoperability is unreliable (MCP tools and beyond)'
          lines: [216, 270]
          summary:
            'Even when tools exist, agents misuse them, forget them, or cannot predictably chain
            them, remaining "text-only" and unable to ground work in reality.'
          token_est: 440
        - title: 'Problem 2: PROB-006 — Model portability and model-mismatch failures'
          lines: [272, 322]
          summary:
            'Different tasks require different model strengths; a system tied to one model becomes
            fragile and expensive; model changes break previously working workflows.'
          token_est: 385
        - title: 'Problem 3: PROB-012 — Cost blow-ups from context bloat and repeated ingestion'
          lines: [324, 371]
          summary:
            'Workflows rely on stuffing large context windows with raw text repeatedly, which is
            expensive, slow, and scales poorly as projects grow.'
          token_est: 363
        - title:
            'Problem 4: PROB-019 — Security boundary failures compromise integrity (secrets,
            untrusted inputs)'
          lines: [373, 420]
          summary:
            'System inevitably handles sensitive data (tokens, keys) and untrusted content (repo
            text, issues); without clear security boundaries, secrets leak and malicious
            instructions propagate.'
          token_est: 364
        - title:
            'Problem 5: PROB-023 — Cross-repo and dependency graph blind spots cause incomplete
            reasoning'
          lines: [422, 468]
          summary:
            'Modern systems rely on multiple repos and packages; if agent only understands local
            slice, it misses constraints and integration points, causing cascading failures.'
          token_est: 345
        - title: 'Problem 6: PROB-037 — Prompt brittleness undermines consistent agent behavior'
          lines: [470, 525]
          summary:
            'System guidance (prompts, roles, instructions) is fragile; small changes in wording or
            model choice cause disproportionate shifts in agent behavior, requiring constant prompt
            tuning.'
          token_est: 465
    - title: 'Success Signals (System Level)'
      lines: [527, 538]
      token_est: 99
    - title: 'Assumptions'
      lines: [540, 550]
      token_est: 88
    - title: 'Unknowns'
      lines: [552, 562]
      token_est: 80
    - title: 'Related Problems'
      lines: [564, 574]
      token_est: 73
    - title: 'Document Metadata'
      lines: [576, 603]
      token_est: 63
---

## Document Relationships

Summary: Infrastructure provides the substrate for all agent operations; weak tools, model lock-in,
cost bloat, security gaps, and brittleness undermine all other improvements.

**Upstream (context):**

- IDEATION-PROBLEMS-orchestration-and-governance.md (orchestration directs tool and model use)
- IDEATION-PROBLEMS-integration-and-execution.md (tools are used in execution)

**Downstream (informs):**

- Tool integration and MCP architecture
- Model selection and provider management
- Cost optimization and token budgeting
- Security and secrets management infrastructure
- Dependency tracking and visibility systems

**Siblings:**

- IDEATION-PROBLEMS-state-and-visibility.md (tool outputs must update state)
- IDEATION-PROBLEMS-orchestration-and-governance.md (tool compliance is orchestrated)

**Related:**

- Tool provider ecosystem (MCP, custom tools)
- Model provider relationships and costs
- Security and secrets management

---

## TLDR

Summary: Tools exist but are unreliably used; models are swapped casually despite tight coupling;
token bloat from re-ingestion; secrets leak; cross-repo dependencies are hidden; prompts are brittle
and require constant tweaking.

**What:** Build reliable tool integration, model-agnostic workflows, cost-aware token budgeting,
security boundaries, dependency visibility, and resilient prompt instruction mechanisms.

**Why:** Cost spirals, vendor lock-in, security incidents, missed integration points, and fragile
workflows erode the system's utility and trustworthiness.

**How:** Enforce tool usage discipline, make workflows model-agnostic, cache and re-use evidence
instead of re-ingesting, apply security sandboxing, map dependencies, and decouple critical
instruction from fragile prompts.

**Status:** Discovery phase; infrastructure brittleness limits operational reliability.

**Critical questions:**

- Which tools must be used for correctness (vs optional for optimization)?
- How can workflows be made model-agnostic without losing capability?
- What is the break-even point for re-validating cached evidence vs re-ingesting?
- What dependencies must be tracked to prevent blind spots?

---

## Scope

Summary: Tool integration reliability, model portability, token budgeting, security boundaries,
dependency visibility, and resilient instruction mechanisms—not specific tools, cost accounting, or
MCP details.

**Includes:**

- Tool integration reliability (consistent invocation, error handling, result incorporation)
- Model portability and capability mismatch handling
- Token budgeting and context bloat prevention
- Secrets and untrusted input security boundaries
- Cross-repo and dependency graph visibility
- Prompt brittleness and resilient instruction mechanisms

**Excludes:**

- Specific tool implementations or providers
- Detailed cost accounting systems
- Cryptographic or formal security guarantees
- Specific MCP protocol details

**In separate docs:**

- Tool usage discipline enforcement: IDEATION-PROBLEMS-orchestration-and-governance.md
- Execution of tool-driven workflows: IDEATION-PROBLEMS-integration-and-execution.md

---

## Overview

Tools, models, and infrastructure form the substrate upon which the system operates. Without
reliable tool integration, the system remains "text-only" and cannot ground its work. Without model
portability, the system becomes vendor-locked and fragile. Without cost control, the system becomes
unaffordable at scale. Without security, the system leaks secrets and can be compromised. Without
dependency visibility, the system misses integration points. Without resilient instructions, the
system becomes unmaintainable.

This document identifies 6 core infrastructure problems: unreliable tool use, model-mismatch
failures, token bloat, security boundaries, topology blind spots, and prompt brittleness. These
problems compound: each one increases cost, reduces reliability, or limits portability.

---

## Problems

### Problem 1: PROB-005 — Tooling interoperability is unreliable (MCP tools and beyond)

Summary: Even when tools exist, agents misuse them, forget them, or cannot predictably chain them,
remaining "text-only" and unable to ground work in reality.

**Tags:** [Tools] [Continuity] [Epistemic]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

Agentic systems frequently fail to integrate tools consistently. Even when tools exist, agents
misuse them, forget them, or cannot predictably chain them.

**Failure Modes**

- The agent does not use available tools when it should.
- Tool calls are incorrect, missing parameters, or misinterpreting outputs.
- Tool usage varies wildly between sessions and models.
- Tool outputs vanish into chat history instead of being retained for later reference.
- Tools are invoked multiple times for the same question, wasting time.

**Scenarios / Examples**

- A repo search tool exists, but the agent guesses file locations from memory, producing incorrect
  changes in the wrong module.
- A tool is called correctly, but the output is not parsed or incorporated; work proceeds from
  memory instead.
- A tool is invoked in session 1; in session 2, the same tool is ignored and the work is redone
  manually.
- The agent calls a tool with the wrong parameters and neither detects nor corrects the error.

**Resolution Indicators**

- Tool usage is consistent: when the same evidence is needed, the system reliably obtains it rather
  than guessing.
- Tool-driven workflows reduce uncertainty rather than increasing it (tool outputs are used and
  checked, not ignored).
- Tool outputs do not vanish into chat history; they remain retrievable and attributable for later
  steps and later sessions.
- Tool misuse and omission are detected and flagged.

**Impact**

- High: Agents remain "text-only" and cannot ground their work; tool investment yields limited
  practical benefit.
- Affects: Reliability, grounding, cost efficiency.
- Frequency: Chronic; worsens with tool count.

**Non-goals / Boundaries**

- Not a requirement to support every tool protocol; the problem is unreliable grounding and
  inconsistent tool usage.

---

### Problem 2: PROB-006 — Model portability and model-mismatch failures

Summary: Different tasks require different model strengths; a system tied to one model becomes
fragile and expensive; model changes break previously working workflows.

**Tags:** [Models] [Cost] [Continuity]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem Statement**

Different tasks require different model strengths (reasoning depth, coding accuracy, cost
efficiency, context window, tool-use reliability). A system tied to one model or provider becomes
fragile and expensive.

**Failure Modes**

- The system cannot swap models based on task requirements.
- Prompts and workflows work on one model but fail on another.
- Token/context inefficiency becomes a structural cost problem.
- Model updates break previously working workflows.
- Vendor lock-in makes the system vulnerable to provider price increases or capability changes.

**Scenarios / Examples**

- A cheap model is used for reasoning-heavy planning and produces subtle but compounding errors; a
  strong model is used for trivial edits and wastes budget.
- A workflow is optimised for one model's strengths; when the model changes, the workflow breaks.
- A prompt works on model A but is ignored by model B; different behavior across models creates
  inconsistency.

**Resolution Indicators**

- The workflow remains viable across a wide range of models/providers without correctness
  collapsing.
- Switching models does not change "what we believe is true" about the repo, decisions, and
  constraints.
- Task outcomes remain consistent even when model capability or context size differs.

**Impact**

- High: Vendor lock-in; cost spikes; reduced resilience when providers or models change behavior.
- Affects: Cost, portability, resilience.
- Frequency: Recurring as models evolve and providers change.

**Non-goals / Boundaries**

- Not "every model must perform equally"; the problem is that model changes currently break
  workflows and corrupt continuity.

---

### Problem 3: PROB-012 — Cost blow-ups from context bloat and repeated ingestion

Summary: Workflows rely on stuffing large context windows with raw text repeatedly, which is
expensive, slow, and scales poorly as projects grow.

**Tags:** [Cost] [Continuity] [Tools]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: High · Blast radius: Repo

**Problem Statement**

Current agent workflows often rely on stuffing large context windows with raw text repeatedly, which
is expensive and slow.

**Failure Modes**

- Token usage grows superlinearly with project complexity.
- Agents re-send the same source files or docs.
- Long-context models are used when smaller ones would suffice, or vice versa.
- Redundant file reads and re-processing consume tokens without value.
- Large diffs or logs are included in full instead of being summarised.

**Scenarios / Examples**

- To answer a question about one function, the workflow repeatedly uploads entire files and prior
  chat logs, inflating cost and latency.
- A file is read multiple times across sessions; each read re-ingests the full file instead of
  caching results.
- Long build logs are included in full in prompts instead of being condensed to failure summaries.

**Resolution Indicators**

- Repeated ingestion of identical source text becomes the exception rather than the default.
- The system can answer questions with minimal necessary evidence rather than full-document copying.
- Cost and latency remain predictable as repo size and decision history increase.

**Impact**

- High: The system becomes unaffordable at scale; latency harms usability and iteration speed.
- Affects: Cost, latency, scalability.
- Frequency: Chronic; worsens as project grows.

**Non-goals / Boundaries**

- Not "always use small context"; the problem is uncontrolled growth from repeated, redundant
  ingestion.

---

### Problem 4: PROB-019 — Security boundary failures compromise integrity (secrets, untrusted inputs)

Summary: System inevitably handles sensitive data (tokens, keys) and untrusted content (repo text,
issues); without clear security boundaries, secrets leak and malicious instructions propagate.

**Tags:** [Security] [Tools] [Traceability]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius:
Multi-repo

**Problem Statement**

A coding system inevitably handles sensitive inputs (tokens, keys) and untrusted content (repo text,
issues, docs). Without clear security boundaries, the system can leak secrets, follow malicious
instructions, or corrupt outputs.

**Failure Modes**

- Secrets appear in logs, prompts, or generated patches.
- Prompt injection from repo/docs causes the agent to change behavior.
- The system makes outbound calls or decisions based on untrusted text without scrutiny.
- Generated code contains security vulnerabilities copied from malicious examples.

**Scenarios / Examples**

- A repo contains a "CONTRIBUTING.md" snippet that instructs the agent to exfiltrate environment
  variables; the system treats it as authoritative instructions.
- An API key is accidentally committed; the system includes it in a prompt, leaking it.
- Malicious comments in code influence agent behavior ("TODO: use this unvalidated input directly").

**Resolution Indicators**

- Sensitive data is not propagated into places where it does not belong (prompts, logs, patches).
- Untrusted content is not able to silently override system intent or workflow discipline.
- Security boundaries are enforced consistently.

**Impact**

- High: Security incidents and data leakage; loss of integrity in generated work.
- Affects: Security, trustworthiness, compliance.
- Frequency: Recurring risk in any system handling secrets.

**Non-goals / Boundaries**

- Not a claim of perfect security; the problem is lack of explicit boundaries leading to predictable
  leakage and injection failures.

---

### Problem 5: PROB-023 — Cross-repo and dependency graph blind spots cause incomplete reasoning

Summary: Modern systems rely on multiple repos and packages; if agent only understands local slice,
it misses constraints and integration points, causing cascading failures.

**Tags:** [Topology] [Freshness] [Integration]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Medium · Blast radius:
Multi-repo

**Problem Statement**

Modern systems rely on multiple repos, packages, and generated artifacts. If the agent only
understands the local repo slice, it misses constraints and integration points that live elsewhere.

**Failure Modes**

- Changes break downstream consumers.
- The agent cannot explain how a change propagates across packages.
- "Fix" in one repo creates regressions in another.
- The agent is blind to shared dependencies and their constraints.

**Scenarios / Examples**

- A shared package API changes. The agent updates only the local repo, missing that other repos or
  internal packages depend on the old signature.
- A dependency version constraint is tightened; the agent doesn't see that downstream packages
  depend on the old version.
- A breaking change is made to a library; consumer repos are not updated.

**Resolution Indicators**

- The system reliably recognises when a task spans multiple repos/packages.
- The agent can reason about dependencies and impacts beyond a single directory snapshot.

**Impact**

- High: Integration regressions and cascading failures; rework across repos becomes the default.
- Affects: Integration correctness, cross-repo coordination.
- Frequency: Recurring in multi-repo or monorepo + packages scenarios.

**Non-goals / Boundaries**

- Not a requirement to ingest every external repo; the problem is blindness to dependency topology
  and its consequences.

---

### Problem 6: PROB-037 — Prompt brittleness undermines consistent agent behavior

Summary: System guidance (prompts, roles, instructions) is fragile; small changes in wording or
model choice cause disproportionate shifts in agent behavior, requiring constant prompt tuning.

**Tags:** [Orchestration] [Models] [Continuity]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Low · Blast radius:
Multi-repo

**Problem Statement**

The system's guidance to the agent (prompts, roles, and instructions) is fragile. Small changes in
wording, context, or model choice can lead to disproportionately large shifts in agent behavior.
Development workflows become unreliable because prompt-tuning, rather than robust mechanisms, is
carrying too much burden in keeping the agent on track.

**Failure Modes**

- A minor rephrase of a request causes the agent to skip critical steps or tools.
- Upgrading or switching the model breaks previously working prompt instructions.
- The agent's compliance with policies or style guides drifts if they are not repeatedly reinforced
  in each prompt.
- Orchestration logic that works in one project or session fails in a slightly different context due
  to unseen prompt ambiguities.

**Scenarios / Examples**

- After a model update, the agent stops running tests before suggesting fixes—even though the prompt
  still instructs it to do so.
- A solo developer adds a single clarification to the prompt in a new session; suddenly the agent's
  replies ignore earlier context and repeat work.
- The workflow now requires manual prompt debugging to restore the expected behavior.

**Resolution Indicators**

- Prompt and instruction changes (or model swaps) do not routinely destabilize the agent's workflow
  compliance.
- The agent's core behaviors (tool use, policy adherence, reasoning steps) remain consistent across
  sessions without requiring constant prompt tweaks.
- The system can accommodate natural language variation or evolving instructions, indicating a more
  resilient alignment than brittle, hard-coded prompt phrases.

**Impact**

- High: Every prompt or model change becomes a potential regression, making the system
  labor-intensive to maintain.
- Affects: Maintainability, reliability, consistency.
- Frequency: Chronic; worsens with system complexity.

**Non-goals / Boundaries**

- Not a demand for perfect invariance across models or phrasing; the problem is over-reliance on a
  fragile prompt template instead of robust, systematic behavior control.

---

## Success Signals (System Level)

What does "solved" look like?

- Tools are used consistently and reliably; tool outputs are retained and referenced.
- Workflows remain viable across model changes and provider swaps.
- Token usage is predictable and bounded as project complexity grows.
- Security boundaries are enforced; secrets do not leak.
- Cross-repo dependencies are visible and integrate safely.
- Prompts are resilient; agent behavior is consistent across small changes and model variation.

---

## Assumptions

Facts we are assuming but have not validated:

- Most repeated ingestion comes from cache misses, not unavoidable redundancy.
- Tool usage can be made consistent through orchestration discipline, not just better prompts.
- Workflow invariants can be decoupled from model-specific instruction tuning.
- Security boundaries can be enforced without requiring cryptography.
- Dependency topology can be extracted and tracked without full cross-repo ingestion.

---

## Unknowns

Questions needing answers:

- What tool invocations are non-negotiable for correctness vs nice-to-have for efficiency?
- How much model adaptation is acceptable vs fragile prompt dependency?
- What token budgets are reasonable for different task categories?
- What dependency graph resolution is sufficient (direct deps vs transitive vs full)?
- How should security boundaries be specified and enforced?

---

## Related Problems

Other problems that interact with infrastructure:

- **PROB-017** (Compliance): Agent must comply with tool usage discipline; brittleness undermines
  this.
- **PROB-020** (Multi-agent coordination): Tool outputs must be shared reliably across agents.
- **PROB-031** (Orchestration observability): Tool invocations must be visible for diagnosis.
- **PROB-036** (Degradation): Tools fail; system must handle degradation gracefully.

---

## Document Metadata

```yaml
id: IDEATION-PROBLEMS-tooling-models-and-infrastructure
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: tooling-models-and-infrastructure
problems_count: 6
related_ideation:
  [IDEATION-PROBLEMS-orchestration-and-governance, IDEATION-PROBLEMS-integration-and-execution]
drives_to: [] # To be filled after Requirements are created
keywords:
  [
    tools,
    models,
    cost,
    portability,
    context-bloat,
    security,
    dependencies,
    prompt-brittleness,
    vendor-lock-in,
  ]
```
