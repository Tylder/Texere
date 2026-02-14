# Texere Ingestion Benchmark - Learnings

This notepad tracks conventions, patterns, and insights discovered during the benchmark.

---

## [2026-02-14 13:48] Track 1: Hono Documentation

### [Category: Learning]

- In this environment, reliable Texere automation works best by running the local MCP server over
  stdio and calling `texere_*` tools through an MCP client, rather than relying on skill MCP
  discovery.
- Exact-title ingestion is sensitive to FTS syntax; wrapping full title queries in quotes improves
  deterministic duplicate checks.
- Even with schema drift, meaningful ingestion quality is preserved by mapping intent semantically:
  concept -> `knowledge/finding`, practice -> `artifact/code_pattern`, limitation ->
  `knowledge/constraint`.

---

## [2026-02-14 13:44] Track 1: Hono Documentation

### [Category: Learning]

- For this Texere version, robust ingestion should treat "type" and "role" as separate modeling
  axes; role carries most semantic specificity.
- Quoting full-text search queries is important for hyphenated terms to avoid FTS syntax/column
  parsing errors.
- Best semantic backbone for Hono docs is: routing model -> middleware lifecycle -> validation flow,
  with best-practice patterns extending that chain.
- Constraint nodes add high practical value when they encode "failure modes" from docs (version
  mismatches, missing content-type, header case sensitivity).
- A compact but connected graph (fewer, richer nodes with explicit links) is better for retrieval
  than many granular isolated notes.

---
