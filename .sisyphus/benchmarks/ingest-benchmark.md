# Texere Ingestion Benchmark

## Purpose

Find shortcomings, friction, and gaps in Texere's DX by having an agent ingest documentation into
the knowledge graph.

## Setup

1. Wipe the graph: `rm /home/dan/Texere/.texere/knowledge-graph.db`
2. Start fresh

## Track 1: External Docs (Hono)

Ingest content from these Hono documentation pages. Create nodes and edges representing the
concepts, relationships, and knowledge you find:

1. https://hono.dev/docs/
2. https://hono.dev/docs/getting-started/basic
3. https://hono.dev/docs/api/routing
4. https://hono.dev/docs/guides/middleware
5. https://hono.dev/docs/guides/validation
6. https://hono.dev/docs/guides/best-practices

**Task**: Read each page. Create nodes and edges that capture the documentation's concepts,
patterns, constraints, and relationships.

**Tool to Use**: Use `webfetch` (NOT playwright) to fetch page content in markdown format.

**Note friction**: Where did Texere's type system, workflow, or tools feel awkward or insufficient?

---

## Track 2: Internal Docs (Controlled)

Ingest these two Texere project documents:

- `docs/search-comparison-llm-ux.md`
- `docs/sqlite-benchmark-research.md`

**Task**: Create nodes and edges representing the decisions, problems, requirements, constraints,
research findings, and technologies discussed. Build a graph that captures what these documents
teach about Texere's architecture and design.

**Tool to Use**: Use `Read` tool to read the local files.

**Note friction**: Same as Track 1.

---

## What to Observe

After both tracks, run `texere_stats` and note:

- How many nodes/edges created
- Which node types you used most
- Which edge types you wished existed but didn't
- What workflow steps felt clunky
- Where SKILL.md guidance was unclear or missing
- Any type ambiguities you struggled with

Report findings in `.sisyphus/benchmarks/run-YYYY-MM-DD.md`

---

## Tools Specification

### For External Web Pages (Track 1)

- **webfetch**: Use `mcp_webfetch` with `format="markdown"` to fetch Hono documentation pages
- **NOT playwright**: Playwright is for browser automation/testing, not simple page fetching

### For Local Files (Track 2)

- **Read**: Use `mcp_read` to read local markdown files

### For Knowledge Graph Operations

- **texere_search**: Search before creating any node (MANDATORY)
- **texere_store_node**: Create nodes
- **texere_create_edge**: Create edges
- **texere_stats**: Get final statistics
- See `.opencode/skills/texere/SKILL.md` for complete tool documentation
