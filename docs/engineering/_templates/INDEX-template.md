# Index Template: Scannable Navigation

Add this right after the summary/status block to help agents cherry-pick sections.

## For ADRs

```markdown
**Status:** Accepted

**Immutable:** This ADR is append-only. To revise, create a new ADR with status Superseded on this
one.

**Quick Summary:** [One sentence: the decision]

---

## Quick Navigation

| Section                                             | Purpose                    | Read if...                             |
| --------------------------------------------------- | -------------------------- | -------------------------------------- |
| [Statement](#statement)                             | Decision in Y-format       | You need the complete decision framing |
| [Context](#context)                                 | Why we decided             | You're unfamiliar with the domain      |
| [Decision](#decision)                               | What we chose + key config | You're implementing this               |
| [Alternatives Considered](#alternatives-considered) | Other options we rejected  | You disagree with the choice           |
| [Rationale](#rationale)                             | Why this is better         | You need to understand tradeoffs       |
| [Consequences](#consequences)                       | Positive/negative impacts  | You're assessing cost/benefit          |
| [Troubleshooting](#troubleshooting)                 | Common issues & solutions  | You're debugging                       |

---

[Rest of ADR...]
```

## For Specs

```markdown
**Version:** 1.0  
**Status:** Active  
**Last Updated:** YYYY-MM-DD

**One-line summary:** [What this spec covers]

---

## Quick Navigation

| Section                                   | Size           | Read if...                              |
| ----------------------------------------- | -------------- | --------------------------------------- |
| [§1. Scope](#1-scope)                     | 5 lines        | You need to know what's in/out of scope |
| [§2. Overview](#2-overview)               | 15 lines       | You're new to this topic                |
| [§3. Key Concepts](#3-key-concepts)       | 30 lines       | You need to understand the model        |
| [§4. Implementation](#4-implementation)   | 40 lines       | You're building/configuring this        |
| [§5. Examples](#5-examples)               | 20 lines       | You want concrete walkthroughs          |
| [§6. Troubleshooting](#6-troubleshooting) | 10 lines       | Something isn't working                 |
| [§7. References](#7-references)           | External links | You need deeper dives                   |

---

[Rest of spec...]
```

## Guidelines

1. **Size column shows approximate line count** – helps agents estimate context cost
2. **"Read if" column is decision logic** – agents know when they actually need each section
3. **Table comes right after summary** – scannable before commitment
4. **Links to section anchors** – agents can jump directly
5. **Consistent structure across all docs** – agents learn the pattern once

## Why This Works

- **Agents see the outline first** – they can decide what matters for their task
- **No skimming required** – each row tells them what's inside
- **Context efficient** – they read 30 lines instead of 400 to understand structure
- **Deterministic** – not ambiguous what each section contains
