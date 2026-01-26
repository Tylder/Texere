---
type: REFERENCE
status: draft
stability: experimental
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
area: your-area
feature: your-reference-name
summary_short: >-
  Brief 1-2 sentence summary of what this reference document covers
summary_long: >-
  Longer 3-5 sentence summary explaining what this reference covers, why it matters, and how
  other documents should use it. Used by LLM systems to determine relevance.
keywords:
  - keyword1
  - keyword2
  - keyword3
---

<!-- FRONTMATTER INSTRUCTIONS FOR WRITERS (delete this comment block after filling in values)
✏️ REQUIRED FIELDS — DO NOT REMOVE ANY OF THESE:
  - type: Always "REFERENCE" for this document type
  - status: draft | active | stable | deprecated
  - stability: experimental | beta | stable
  - created: ISO date (YYYY-MM-DD). Set once, never change.
  - last_updated: AUTO-UPDATED on commit. DO NOT manually edit.
  - area: System area (e.g., knowledge-graph, documentation, tooling)
  - feature: Reference name (e.g., agent-knowledge-requirements)
  - summary_short: 1-2 sentences for document registry tables
  - summary_long: 3-5 sentences: what this covers, why it matters, how other docs use it

✏️ OPTIONAL FIELDS — safe to omit:
  - keywords: Search keywords (3+ recommended). Omit field if not needed.
-->

# REFERENCE-<topic>

---

## Purpose

Why does this reference document exist? What foundational knowledge does it define?

---

## Scope

**What this covers:**

- Core concept or framework
- Questions or patterns it addresses

**What this doesn't cover:**

- Out-of-scope topics
- Where to find that information instead

---

## Content

### Section 1

Content here. This might be a framework, question set, design driver, analysis, or knowledge base.

### Section 2

More content.

---

## How to Use This Reference

Which documents should reference this? How should they link to it?

Example: "REQ and SPEC docs for the graph-knowledge-system should include `related_reference: [REFERENCE-agent-knowledge-requirements]` in their frontmatter."

---

## Links

**Related references:**
- (List other REFERENCE docs)

**Documents that use this reference:**
- (Listed automatically in DOCUMENT-REGISTRY.md)
