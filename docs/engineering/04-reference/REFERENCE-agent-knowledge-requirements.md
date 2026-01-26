---
type: REFERENCE
status: active
stability: stable
created: 2026-01-26
last_updated: 2026-01-26
area: knowledge-graph
feature: agent-knowledge-requirements
summary_short: >-
  Questions that effective coding agents must be able to answer when modifying a repository
summary_long: >-
  Enumerates the questions that agents repeatedly need answered in order to make safe, grounded
  decisions when adding features to or modifying a codebase. Organized by knowledge category
  (repo-index-only, repo+graph-knowledge, external-library, documentation-only) to inform system
  design and identify gaps in knowledge infrastructure.
keywords:
  - agent-reasoning
  - knowledge-requirements
  - design-drivers
  - repository-queries
index:
  sections:
    - title: 'Purpose'
      lines: [56, 67]
      token_est: 106
    - title: 'Scope'
      lines: [69, 89]
      token_est: 95
    - title: 'How to Read This Document'
      lines: [91, 102]
      token_est: 98
    - title: 'Knowledge Categories'
      lines: [104, 163]
      token_est: 189
    - title: 'Category A — Repo‑Index‑Only Questions'
      lines: [165, 225]
      token_est: 277
    - title: 'Category B — Repo + Graph‑Knowledge‑System Questions'
      lines: [227, 287]
      token_est: 251
    - title: 'Category C — External Library (Indexed Code + Docs) Questions'
      lines: [289, 349]
      token_est: 258
    - title: 'Category D — Documentation‑Only Questions'
      lines: [351, 411]
      token_est: 237
    - title: 'How to Use This Reference'
      lines: [413, 417]
      token_est: 49
---

# REFERENCE-agent-knowledge-requirements

---

## Purpose

This document enumerates **questions that effective coding agents repeatedly need answered** when
adding features to or modifying a repository.

The purpose is **not** to instruct agents what to ask at runtime. The purpose is to make explicit
**what questions the system must be able to answer cheaply, reliably, and repeatedly**.

**Design rule:** if the system cannot answer a question in this document without rereading large
bodies of text or relying on agent guesswork, the system design is incomplete.

---

## Scope

**What this covers:**

- Four knowledge categories (repo-index-only, repo+graph-knowledge, external-library,
  documentation-only)
- 20 critical questions agents must be able to answer
- Why each question exists and what fails if unanswered

**What this doesn't cover:**

- How to implement answers (that's in Requirements and Specs)
- Agent prompting or runtime behavior
- Document ontology or specific schema design

**In separate docs:**

- Implementation requirements: `REQ-graph-system-graph-knowledge-system`
- Graph system design: `IDEATION-PROBLEMS-graph-knowledge-system`

---

## How to Read This Document

- Questions are written in **agent‑internal language** (how agents reason, not how systems are
  specified)
- Each question belongs to **exactly one knowledge category**
- Categories are based on **what knowledge must exist** for the question to be answerable
- Questions are **timeless** (not phase‑specific) and **descriptive** (they reflect reality, not
  ideal behavior)
- Many questions are intentionally **blocking or safety‑oriented**; their role is to prevent
  incorrect progress

---

## Knowledge Categories

### Category A — Repo‑index‑only

**Available knowledge:**

- Fully indexed target repository (symbols, references, call graph, configs, tests)

**System stress:**

- AST / symbol accuracy
- Cross‑file reasoning
- Architectural boundary discovery

---

### Category B — Repo + graph‑knowledge‑system

**Available knowledge:**

- Fully indexed target repository
- Prior decisions, constraints, requirements, plans, lifecycle state

**System stress:**

- Epistemic lineage
- Supersession and current truth
- Intent vs implementation traceability

---

### Category C — External library (indexed code + docs)

**Available knowledge:**

- Fully indexed external library repo(s)
- Library documentation
- Known version / commit

**System stress:**

- Cross‑repo symbol reasoning
- Dependency behavior guarantees
- Upgrade and impact analysis

---

### Category D — Documentation‑only

**Available knowledge:**

- Docs, blogs, forums, specs
- No indexed code

**System stress:**

- Structured external ingestion
- Evidence capture and staleness handling

---

## Category A — Repo‑Index‑Only Questions

### A1. Where does this responsibility _actually_ live in the codebase?

**Why this question exists:**

- Responsibilities are often split across layers in non‑obvious ways.

**If the system cannot answer this:**

- Changes are implemented in the wrong layer or duplicated elsewhere.

---

### A2. What are the real entry points that can trigger this behavior?

**Why this question exists:**

- Control flow is rarely linear or obvious from a single file.

**If the system cannot answer this:**

- The agent misses call paths, hooks, or indirect invocations.

---

### A3. What invariants does this code rely on that are not explicitly enforced?

**Why this question exists:**

- Many assumptions are implicit and enforced socially, not programmatically.

**If the system cannot answer this:**

- New code violates hidden assumptions and causes subtle regressions.

---

### A4. Which tests would fail if I broke this behavior?

**Why this question exists:**

- Tests encode de‑facto contracts.

**If the system cannot answer this:**

- Changes ship without coverage or invalidate existing guarantees.

---

### A5. What other code paths are tightly coupled to this logic?

**Why this question exists:**

- Coupling is rarely documented and often transitive.

**If the system cannot answer this:**

- Local changes cause non‑local breakage.

---

## Category B — Repo + Graph‑Knowledge‑System Questions

### B1. Why does this code exist in its current form?

**Why this question exists:**

- Code often reflects historical trade‑offs, not optimal design.

**If the system cannot answer this:**

- Agents repeat rejected ideas or undo intentional constraints.

---

### B2. What constraints or decisions does this code implement?

**Why this question exists:**

- Implementation is downstream of intent.

**If the system cannot answer this:**

- Changes silently violate prior commitments.

---

### B3. Is this behavior still considered correct, or merely legacy?

**Why this question exists:**

- Superseded intent often remains in code.

**If the system cannot answer this:**

- Agents preserve or extend behavior that should be removed.

---

### B4. What unresolved questions or risks were explicitly left open here?

**Why this question exists:**

- Open uncertainties tend to disappear over time.

**If the system cannot answer this:**

- Agents assume certainty where none exists.

---

### B5. What would invalidate this implementation if assumptions changed?

**Why this question exists:**

- Future change impact depends on original assumptions.

**If the system cannot answer this:**

- Refactors break core guarantees unintentionally.

---

## Category C — External Library (Indexed Code + Docs) Questions

### C1. What guarantees does this library actually provide in code, not just in docs?

**Why this question exists:**

- Documentation often overstates guarantees.

**If the system cannot answer this:**

- Agents rely on behavior that is not enforced.

---

### C2. What behavior does the library _not_ guarantee that we might be assuming?

**Why this question exists:**

- Most dependency bugs come from negative space.

**If the system cannot answer this:**

- Agents build unsafe assumptions into integrations.

---

### C3. Where in the library does the behavior we rely on actually live?

**Why this question exists:**

- Knowing the implementation location enables impact analysis.

**If the system cannot answer this:**

- Upgrades become blind and risky.

---

### C4. What breaks if we upgrade this dependency?

**Why this question exists:**

- Version changes invalidate assumptions.

**If the system cannot answer this:**

- Upgrades cause cascading failures.

---

### C5. Are we relying on undefined or incidental behavior?

**Why this question exists:**

- Many integrations depend on behavior that is not contractual.

**If the system cannot answer this:**

- The system accumulates technical debt invisibly.

---

## Category D — Documentation‑Only Questions

### D1. What problem does this library or approach claim to solve?

**Why this question exists:**

- Marketing and intent differ from reality.

**If the system cannot answer this:**

- The wrong tool is chosen early.

---

### D2. What limitations or caveats are documented but easy to miss?

**Why this question exists:**

- Important constraints are often buried.

**If the system cannot answer this:**

- Known limitations surprise implementation later.

---

### D3. What behaviors are disputed or unclear in community discussions?

**Why this question exists:**

- Docs rarely cover edge cases.

**If the system cannot answer this:**

- Agents rediscover folklore repeatedly.

---

### D4. How recent and trustworthy is this information?

**Why this question exists:**

- Stale knowledge is indistinguishable from truth without metadata.

**If the system cannot answer this:**

- Decisions rely on outdated facts.

---

### D5. What assumptions would still need validation in real code?

**Why this question exists:**

- Docs rarely guarantee runtime behavior.

**If the system cannot answer this:**

- Research conclusions are treated as facts prematurely.

---

## How to Use This Reference

Documents in the knowledge-graph system should reference this via
`related_reference: [REFERENCE-agent-knowledge-requirements]` in their frontmatter. This establishes
that the document is designed to make one or more of these critical questions answerable.
