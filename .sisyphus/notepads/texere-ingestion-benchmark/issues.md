# Texere Ingestion Benchmark - Issues & Friction

This notepad tracks problems, friction points, and DX issues encountered during ingestion.

---

## [2026-02-14 13:48] Track 1: Hono Documentation

### [Category: Issue]

- MCP schema friction: `listTools` failed with zod compatibility validation (`inputSchema.type`
  expected `"object"`), so tool enumeration was unusable and direct known-name calls were needed.
- Search parser friction: unquoted `texere_search` queries triggered SQL/FTS parse errors
  (`no such column: hono`), forcing query quoting even for plain multi-word titles.
- Contract drift friction: benchmark prompt and skill docs describe 17 legacy node types / 14 legacy
  edges, while live server exposes 6 `type` buckets + `role` and a different edge set.

---

## [2026-02-14 13:44] Track 1: Hono Documentation

### [Category: Issue]

- Node type system mismatch: task asked for `technology/code_pattern/constraint/requirement/general`
  as top-level types, but MCP enforces `type + role` model (`artifact/knowledge` + role). Mapping
  step was required and not obvious from prompt.
- Edge type mismatch: requested edges (`REQUIRES`, `BUILDS_ON`, `RELATED_TO`) are not available in
  current MCP (`DEPENDS_ON`, `EXTENDS`, `SUPPORTS`). Semantics had to be approximated.
- Tool discoverability friction: `texere_*` tools were unavailable through skill MCP direct
  invocation in this environment, requiring explicit local MCP client scripting.
- Workflow friction: strict "search before every node" combined with FTS parser behavior made
  hyphenated titles fail (`no such column: standards`) unless quoted.
- Notepad instruction/tool mismatch: task required `Write` append semantics, but this runtime
  exposes file update tooling without a dedicated append API, requiring patch-based append flow.

---
