# Documentation Guide

This directory contains both Texere's recommended public documentation path and deeper historical or
research-heavy material.

## Start here

If you are new to the project, use this reading order:

1. [`../README.md`](../README.md) — project overview, quick start, release flow, and package map
2. [`../packages/graph/README.md`](../packages/graph/README.md) — core graph library API and model
3. [`../apps/mcp/README.md`](../apps/mcp/README.md) — MCP server usage and tool surface
4. [`v4-type-system.md`](./v4-type-system.md) — current type system and stable modeling rules

## Stable reference and operational docs

These documents are useful but are not the first path through the repo:

- [`three-branch-workflow.md`](./three-branch-workflow.md) — branch workflow for keeping the public
  branch clean while using an internal branch; treat the branch names in that doc as workflow roles
  and map them to the repo's current branch names
- [`pagination-implementation-plan.md`](./pagination-implementation-plan.md) — implementation record
  for cursor pagination work

## Archive and research-heavy material

These documents are kept for historical context, design exploration, or deeper implementation
background. They are useful, but they should be treated as supporting material rather than the
primary public entry path.

### Research directories

- [`research/`](./research/) — longer-form research, comparisons, and exploratory design work

### Design exploration and historical notes

- [`kg-redesign.md`](./kg-redesign.md)
- [`memory-graph-audit.md`](./memory-graph-audit.md)
- [`memorygraph.md`](./memorygraph.md)
- [`search-comparison-llm-ux.md`](./search-comparison-llm-ux.md)
- [`sqlite-benchmark-research.md`](./sqlite-benchmark-research.md)
- [`batch-api-design-options.md`](./batch-api-design-options.md)
- [`Knowledge-DB-for-LLMs-2026-03-18.md`](./Knowledge-DB-for-LLMs-2026-03-18.md)

### Drafts, brainstorming, and test-planning records

- [`v4-ideas.md`](./v4-ideas.md)
- [`v1.1-node-schema-draft.md`](./v1.1-node-schema-draft.md)
- [`node-modeling-test-plan.md`](./node-modeling-test-plan.md)
- [`node-modeling-test-findings.md`](./node-modeling-test-findings.md)

## How to use this directory

- Use the root README and package READMEs for the main public product story.
- Use `docs/` when you need deeper design context or implementation history.
- Prefer stable reference docs over archival material when they disagree.
