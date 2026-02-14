# Texere Ingestion Benchmark - Decisions

This notepad tracks architectural choices and modeling decisions made during ingestion.

---

## [2026-02-14 13:48] Track 1: Hono Documentation

### [Category: Decision]

- Used live MCP tool contract as source of truth (`texere_store_node` with mandatory `type` +
  `role`, `texere_create_edge` with nested `edges` payload) despite prompt/schema mismatch.
- Enforced search-before-create by running quoted exact-title searches before each node and reusing
  exact-title matches when found; otherwise created new nodes.
- Captured Hono architecture as a connected chain: framework -> routing -> middleware -> validation
  -> best-practice patterns, with constraints attached directly to affected validation/middleware
  nodes.

---

## [2026-02-14 13:44] Track 1: Hono Documentation

### [Category: Decision]

- Modeled Hono as `type=artifact, role=technology` and mapped conceptual content to
  `knowledge/finding`, reusable guidance to `artifact/code_pattern`, and limitations to
  `knowledge/constraint`.
- Used edge mapping: `REQUIRES -> DEPENDS_ON`, `BUILDS_ON -> EXTENDS`, `RELATED_TO -> SUPPORTS`, and
  `CONSTRAINS -> CONSTRAINS` to preserve intent under current edge enum.
- Prioritized architecture-level nodes over snippet-level nodes to keep graph density meaningful (16
  nodes, 33 edges) while covering all six source pages.
- Connected every non-root node immediately to avoid isolated nodes and to enforce architecture
  semantics (routing -> middleware -> validation progression).

---
