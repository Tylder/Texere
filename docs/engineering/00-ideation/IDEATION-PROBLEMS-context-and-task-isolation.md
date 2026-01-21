---
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: context-and-task-isolation
frontmatter_auto_updated_by: script/validate-docs.mjs
frontmatter_auto_updated_on_every: git commit (pre-commit hook)
summary_short:
  'Context selection is opaque; users cannot anchor stable references; context spills across task
  boundaries, contaminating unrelated work'
summary_long:
  'Identifies 3 critical context and task isolation problems: users cannot see or control what
  information the agent is conditioning on; users lack stable ways to reference specific items
  (decisions, assumptions, files); and knowledge and context from one task leak into another without
  clear intent, causing irrelevant suggestions and confusion. Without clear context boundaries,
  users must constantly manage scope manually.'
related_ideation:
  [IDEATION-PROBLEMS-state-and-visibility, IDEATION-PROBLEMS-user-trust-and-feedback]
drives: []
index:
  sections:
    - title: 'Document Relationships'
      lines: [69, 92]
      token_est: 81
    - title: 'TLDR'
      lines: [94, 119]
      token_est: 193
    - title: 'Scope'
      lines: [121, 142]
      token_est: 120
    - title: 'Overview'
      lines: [144, 155]
      token_est: 107
    - title: 'Problems'
      lines: [157, 308]
      token_est: 1146
      subsections:
        - title: 'Problem 1: PROB-028 — Context selection is implicit and opaque to the user'
          lines: [159, 203]
          token_est: 311
        - title:
            'Problem 2: PROB-029 — Users cannot reliably anchor references when communicating with
            agents'
          lines: [205, 248]
          token_est: 296
        - title: 'Problem 3: PROB-039 — Context spillage across tasks leads to cross-contamination'
          lines: [250, 308]
          token_est: 537
    - title: 'Success Signals (System Level)'
      lines: [310, 321]
      token_est: 99
    - title: 'Assumptions'
      lines: [323, 332]
      token_est: 72
    - title: 'Unknowns'
      lines: [334, 348]
      token_est: 95
    - title: 'Related Problems'
      lines: [350, 359]
      token_est: 67
    - title: 'Document Metadata'
      lines: [361, 391]
      token_est: 65
---

## Document Relationships

**Upstream (context):**

- IDEATION-PROBLEMS-state-and-visibility.md (requires visible state to show context)
- IDEATION-PROBLEMS-orchestration-and-governance.md (orchestration manages context scope)

**Downstream (informs):**

- Context management and scoping mechanisms
- Reference and anchoring systems
- Multi-task and multi-project management

**Siblings:**

- IDEATION-PROBLEMS-user-trust-and-feedback.md (context affects trust calibration)
- IDEATION-PROBLEMS-orchestration-and-governance.md (context scope is governed)

**Related:**

- Session and task boundary management
- Reference resolution systems

---

## TLDR

**Summary:** Users cannot see what context the agent is using; cannot point precisely to items they
mean; and context bleeds across tasks, causing cross-contamination.

**What:** Make context selection visible; enable stable anchoring and precise references; enforce
clear task and project boundaries.

**Why:** Without visibility, users misunderstand what the agent is considering. Without stable
references, miscommunication is frequent. Without boundaries, tasks interfere with each other,
causing wasted time and confusion.

**How:** Display active context explicitly; assign stable IDs to decisions/assumptions/items;
enforce strict context isolation per task; allow intentional context bridging when needed.

**Status:** Discovery phase; context management directly affects communication friction and task
isolation.

**Critical questions:**

- What minimal context information should be visible to users (sources, freshness, scope)?
- How should stable references be anchored (semantic IDs, file paths, line numbers, structured
  names)?
- What boundaries define a "task" vs a "project" vs a "session"?

---

## Scope

**Includes:**

- Visibility of active context (what information is the agent currently conditioning on)
- Stable references and anchoring mechanisms (how users point to specific items)
- Context isolation per task/project (preventing unintended spillage)
- Intentional context bridging (when users explicitly link tasks)
- Context freshness and validation

**Excludes:**

- Specific data structure designs for context representation
- Search or recommendation algorithms for relevant context
- Full conversation history management (belongs in traceability docs)

**In separate docs:**

- Context representation and state visibility: IDEATION-PROBLEMS-state-and-visibility.md
- Multi-agent context coordination: IDEATION-PROBLEMS-orchestration-and-governance.md

---

## Overview

When users work with agents, they need to know: "What is the agent currently thinking about?" and
"How do I point precisely to what I mean?" Without these capabilities, miscommunication is constant,
and context leakage between parallel tasks creates confusion.

This document identifies 3 core context and task isolation problems: opaque context selection,
missing stable references, and context spillage across task boundaries. These problems compound:
opaque context creates ambiguity, lack of references forces workarounds, and spillage corrupts
unrelated work.

---

## Problems

### Problem 1: PROB-028 — Context selection is implicit and opaque to the user

**Tags:** [UserControl] [UXClarity] [Epistemic]

**Classification:** Frequency: High · Impact: High · Cost sensitivity: Medium · Blast radius: Repo

**Problem Statement**

The user cannot see or control what information the agent is actively conditioning on, leading to
misunderstandings and incorrect references.

**Failure Modes**

- The agent ignores relevant information the user assumes is in context.
- The agent relies on outdated or unintended context.
- Users repeat information unnecessarily.
- The agent references the "wrong" prior decision because it misunderstood which decision was
  intended.

**Scenarios / Examples**

- The user refers to "the earlier decision," assuming it is known. The agent interprets a different
  decision from a previous session.
- The user expects the agent to remember context from a prior feature discussion; the agent treats
  the current feature in isolation.
- The agent mentions a constraint from a different task as if it applies to the current one.

**Resolution Indicators**

- The user can understand what information is currently active for the agent.
- Context-related misunderstandings decrease.
- Users can see what files, decisions, constraints, and prior work are currently "in scope."

**Impact**

- High: Frequent miscommunication; misaligned work.
- Affects: Communication clarity, reduced rework.
- Frequency: Every multi-turn task; compounds with task complexity.

**Non-goals / Boundaries**

- Not a requirement to expose raw prompts; the problem is opaque context selection that causes
  misunderstanding.

---

### Problem 2: PROB-029 — Users cannot reliably anchor references when communicating with agents

**Tags:** [Referencing] [UXClarity] [Continuity]

**Classification:** Frequency: High · Impact: Medium · Cost sensitivity: Low · Blast radius: Repo

**Problem Statement**

Users lack stable ways to reference specific decisions, assumptions, files, or open items, causing
ambiguity when communicating with the system.

**Failure Modes**

- "This" and "that" are misinterpreted.
- The agent references the wrong item from history.
- Users re-explain instead of referencing.
- Line numbers or file paths are ambiguous (which version? before or after edits?).

**Scenarios / Examples**

- The user says "use the previous assumption," and the agent applies a different assumption with a
  similar name.
- The user points to "line 42," but the file has been edited; is it the old line 42 or the current
  line 42?
- A decision is referred to by nickname ("the React decision"); the agent doesn't know which
  decision is meant.

**Resolution Indicators**

- References are unambiguous and consistently interpreted.
- Communication becomes shorter and more precise.
- Users can cite specific items (decisions, assumptions, files) without re-explanation.

**Impact**

- Medium/High: Persistent misunderstanding; high cognitive load for users.
- Affects: Communication efficiency, clarity.
- Frequency: Every task with more than a few decision points.

**Non-goals / Boundaries**

- Not a demand for natural-language perfection; the problem is lack of stable anchors.

---

### Problem 3: PROB-039 — Context spillage across tasks leads to cross-contamination

**Tags:** [Continuity] [Governance] [StateVisibility]

**Classification:** Frequency: Medium · Impact: High · Cost sensitivity: Low · Blast radius:
Multi-repo

**Problem Statement**

The system lacks strict context isolation for different tasks or projects. Knowledge and assumptions
bleed from one thread of work into another without clear intent, causing the agent to mix contexts.
A solo developer often juggles multiple features or even separate repositories, but the assistant
may treat them as one giant context.

**Failure Modes**

- While working on task B, the agent references a requirement or code from task A that isn't
  actually relevant to B.
- The assistant uses information from an old project when assisting with a new project, confusing
  names or leaking details.
- After a context switch (like checking out a different git branch or repository), the agent
  continues with outdated assumptions from the previous context.
- Parallel conversations or sessions influence each other unintentionally, creating tangled state.

**Scenarios / Examples**

- A developer has an open issue to refactor the authentication module and another to update the
  payment service. While focusing on the payment service, the agent suddenly brings up token
  expiration logic from the authentication module as if it is relevant.
- In another case, the user works on a personal project after a work project; the agent suggests
  using a proprietary library from the work project in the personal project code, an inappropriate
  cross-context suggestion.

**Resolution Indicators**

- The assistant cleanly segregates knowledge by task or project unless explicitly instructed to
  cross-reference.
- It "stays in its lane" for a given thread of work.
- When the user switches context (new feature, new repo, new session), the system either resets
  relevant state or transparently re-aligns to the new scope, without unprompted carryover from the
  old scope.
- The user can run concurrent tasks or swap between projects without the agent confusing the
  contexts.
- The system provides some visibility or confirmation of the active context to reassure the user
  that past unrelated info is not influencing current answers.

**Impact**

- Medium/High: Context-inappropriate suggestions; mistakes and wasted time.
- Affects: Multi-tasking efficiency, suggestion relevance, potential security issues.
- Frequency: Every time a user juggles multiple features or projects.

**Non-goals / Boundaries**

- Not a requirement to never reuse knowledge (the user may intentionally bring context from one task
  to another); the problem is the unintentional and unmanaged leakage of context that should remain
  separate.

---

## Success Signals (System Level)

What does "solved" look like?

- Users see what context is active and can quickly assess whether it includes necessary information.
- References are unambiguous; users can point precisely to items without re-explanation.
- Tasks and projects are cleanly isolated; context does not bleed unintentionally.
- Users can intentionally bridge tasks when needed (e.g., "use this constraint from the related
  task").
- Multi-tasking becomes practical because contexts are managed clearly.

---

## Assumptions

Facts we are assuming but have not validated:

- Users will tolerate an explicit context indicator if it reduces miscommunication.
- Stable references can be generated and maintained without excessive overhead.
- Task boundaries can be detected (or set explicitly) reliably.
- Most context spillage is unintentional and preventable with clear scoping.

---

## Unknowns

Questions needing answers:

- What constitutes a meaningful "context indicator" (list of files, decisions, constraints,
  assumptions)?
- How should stable references be generated (auto-IDs, semantic names, file+line, structured
  anchors)?
- How should task boundaries be defined (user-explicit, detected from git branch/repo, inferred from
  conversation flow)?
- When should context be automatically reset vs manually cleared?
- How should intentional context bridging be specified by users (explicit command, natural language,
  UI)?

---

## Related Problems

Other problems that interact with context:

- **PROB-025, 026** (State visibility): Context visibility is part of overall state visibility.
- **PROB-015** (Scope clarity): Context boundaries define task scope.
- **PROB-017** (Compliance): Agents must comply with context boundaries.
- **PROB-031** (Observability): Context selection should be observable for diagnosis.

---

## Document Metadata

```yaml
id: IDEATION-PROBLEMS-context-and-task-isolation
type: IDEATION-PROBLEMS
status: draft
stability: experimental
created: 2025-01-21
last_updated: 2025-01-21
area: ai-coding-system
feature: context-and-task-isolation
problems_count: 3
related_ideation:
  [
    IDEATION-PROBLEMS-state-and-visibility,
    IDEATION-PROBLEMS-orchestration-and-governance,
    IDEATION-PROBLEMS-user-trust-and-feedback,
  ]
drives_to: [] # To be filled after Requirements are created
keywords:
  [
    context,
    context-isolation,
    references,
    anchoring,
    task-boundaries,
    context-spillage,
    multi-tasking,
    scope-clarity,
  ]
```
