# Texere: What We Took from memory-graph (and What We Didn't)

## Context

Texere's storage layer is a TypeScript rewrite of memory-graph's essential core. This document
audits exactly what was adopted, what was dropped, and why — plus a comparison with Graphiti (Zep)
and notes on scale considerations at 20K+ facts.

---

## What We Took from memory-graph

### 1. Data Model: Property Graph with JSON Properties

**memory-graph**: `nodes(id, label, properties JSON)` +
`relationships(id, from_id, to_id, rel_type, properties JSON)`

**We took this exactly.** Nodes with a JSON properties blob is the right pattern for flexible schema
— different fact types need different fields without schema explosion. This is the core of the
design.

### 2. The 13 Memory Types

**memory-graph**: task, code_pattern, problem, solution, project, technology, error, fix, command,
file_context, workflow, general, conversation

**We took all 13, added 3 more**: decision, constraint, requirement. These were the types identified
as the most painful to lose — research decisions and project constraints that agents forget.

### 3. All 35 Relationship Types Across 7 Categories

**memory-graph**: Causal (caused_by, leads_to, triggers...), Solution (solves, implements,
fixes...), Context (related_to, part_of, depends_on...), Learning (learned_from, inspired_by...),
Similarity (similar_to, alternative_to...), Workflow (precedes, follows, blocks...), Quality
(improves, degrades, validates...)

**We took the full set unchanged.** The taxonomy is well-thought-out and covers the relationship
semantics we need. No reason to reinvent this.

### 4. Node Fields

**memory-graph**: type, title, content, summary, tags[], importance (0-1), confidence (0-1), context
(project_path, files_involved[], languages[], frameworks[], git_commit, git_branch)

**We took essentially all of these.** The context sub-object is particularly valuable — it's how
facts get anchored to code locations. The importance/confidence scores enable prioritized retrieval
at 20K scale.

### 5. Bi-Temporal Tracking on Relationships

**memory-graph**: valid_from, valid_until, recorded_at, invalidated_by

**We took this for relationships only.** This is the mechanism for "this decision was superseded by
a later decision" — you invalidate the old relationship without deleting it, preserving history.

### 6. SearchQuery Model

**memory-graph**: query text, type filter, tag filter, project_path filter, importance filter,
limit, offset

**We took the structure** but changed the search implementation entirely (see "didn't take" below).

### 7. CRUD Patterns

**memory-graph**: store (check existence, INSERT, serialize JSON), get (SELECT, deserialize), update
(fetch, merge, save), delete (cascade relationships first, then node)

**We took the patterns** — especially cascade delete (delete fact → delete its relationships first)
and the merge-on-update approach.

### 8. Relationship Validation

**memory-graph**: Before creating a relationship, validate both source and target facts exist.

**Took this.** Simple but important guard.

### 9. Relationship Invalidation (vs Deletion)

**memory-graph**: `invalidateRelationship` sets `valid_until` rather than deleting. Old
relationships are preserved but marked as no longer current.

**Took this.** Critical for temporal knowledge — "we used to depend on Redis, now we use Valkey"
keeps both facts linked to their era.

---

## What We Didn't Take, and Why

### 1. NetworkX Graph Library

**memory-graph uses it for**: Graph initialization, node/edge counts, and theoretically traversal.

**Why dropped**: Research revealed NetworkX is barely used. It's loaded on startup, counts
nodes/edges, and that's it. All actual traversal queries go through SQL. We replace the node/edge
counting with simple `SELECT COUNT(*)` queries. **Zero capability lost.**

### 2. Fuzzy Search Engine (~220 lines of Python)

**memory-graph**: `sqlite_database.py:295-515` — builds LIKE queries with typo tolerance,
plural/tense normalization, stemming. All done in Python string manipulation. Most complex code in
the project.

**Why dropped**: This is the wrong approach. memory-graph has an FTS5 virtual table _defined in its
schema_ but **never queries it**. All search goes through hand-built LIKE patterns. FTS5 MATCH gives
you tokenization, stemming, BM25 ranking, and prefix search out of the box — it replaces the entire
220-line fuzzy engine with one SQL clause. **Capability improved, not lost.**

### 3. Multi-Backend Support (7 backends)

**memory-graph supports**: SQLite, PostgreSQL, Redis, MongoDB, DynamoDB, Firestore, CosmosDB

**Why dropped**: We only need SQLite. Single-file embedded database for a single-developer tool. The
backend abstraction layer adds complexity (abstract interfaces, adapter patterns, connection
pooling) with zero benefit for our use case. **This was ~70% of the code we're not porting.**

### 4. Multi-Tenancy (tenant_id, team_id, visibility)

**memory-graph**: Every query includes tenant filtering, visibility checks, team-scoped access.

**Why dropped**: Texere runs on one developer's machine for their projects. There are no teams, no
tenants, no visibility rules. Adding these fields would pollute every query for no reason. **Not
applicable to our use case.**

### 5. Advanced Graph Analytics

**memory-graph**: Cluster detection, bridge memory detection, centrality scoring, path finding
between arbitrary nodes, graph metrics/statistics.

**Why dropped**: These serve analytics/visualization use cases, not agent knowledge retrieval. An
agent needs "find facts related to auth" and "what did we decide about caching?" — not "which fact
is the most central node in the graph." We explicitly excluded analytics. **Could add later if
needed, but not v1.**

### 6. Migration Tools / Import-Export

**memory-graph**: Schema versioning with migration path, data export/import.

**Why dropped**: We're in schema-unstable v1. Drop-and-recreate is acceptable. Proper migrations are
premature — the schema will change as we learn what works. Import/export is a v2 feature.
**Deferred, not rejected.**

### 7. Batch Operations

**memory-graph**: Bulk store, bulk relationship creation.

**Why dropped**: Agents write one fact at a time through MCP tool calls. There's no batch ingestion
path in our design — the orchestrator agent stores facts individually through conversation. Batch
operations add API surface for a use case that doesn't exist yet. **Could add if needed.**

### 8. The Intelligence/Proactive Layer

**memory-graph**: Proactive suggestions ("you might also want to link this to..."), automatic
relationship inference, memory consolidation.

**Why dropped**: These features use LLM calls in the storage layer. We explicitly decided: **no LLM
in the write/read path**. The agent is intelligent — it decides what to store and how to link it.
The database is dumb storage. **Philosophical decision: smart agent, dumb store.**

### 9. Session Management

**memory-graph**: Session tracking (session_id on facts), session-scoped queries.

**Why dropped**: Our facts don't belong to sessions — they're project-level knowledge that persists
across all sessions. A decision made on Tuesday is equally valid on Friday. Session-scoping would
fragment knowledge. **Wrong model for our use case.**

### 10. Pagination (cursor-based)

**memory-graph**: Cursor-based pagination for large result sets.

**Why dropped for now**: We have simple limit/offset. At 20K facts with good search ranking, the top
20-50 results should be sufficient per query. Cursor pagination adds complexity for marginal
benefit. **Could add if search result sets prove too large.**

---

## Graphiti (Zep) Comparison

Graphiti is a research-backed temporal knowledge graph engine (22.7K GitHub stars, arXiv paper).
Different philosophy: LLM-heavy, server-based, enterprise-scale.

### Key Architecture Differences

| Aspect                | **Graphiti**                                                                                                                                                             | **Texere**                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Language**          | Python                                                                                                                                                                   | TypeScript                                                                  |
| **Database**          | Neo4j / FalkorDB / Kuzu / Neptune                                                                                                                                        | SQLite (better-sqlite3)                                                     |
| **Graph model**       | True graph DB with Cypher queries                                                                                                                                        | Property graph emulated in SQL tables                                       |
| **LLM dependency**    | **REQUIRED for writes** — entity extraction, entity resolution, fact extraction, temporal extraction, community summarization, contradiction detection ALL use LLM calls | **Zero LLM calls** — agent writes facts manually via MCP tools              |
| **Search**            | Hybrid: cosine similarity (embeddings) + BM25 + breadth-first graph traversal + cross-encoder reranking                                                                  | FTS5 MATCH + type/tag/path filters + recursive CTEs                         |
| **Embeddings**        | Required (1024-dim vectors for entity/fact similarity)                                                                                                                   | None (v1)                                                                   |
| **Ingestion**         | Automatic: feed it text/messages, LLM extracts entities & facts                                                                                                          | Manual: agent explicitly calls `store_fact` and `create_relationship`       |
| **Temporal**          | Bi-temporal on edges with LLM-driven contradiction invalidation                                                                                                          | Bi-temporal on relationships only (simpler, no LLM contradiction detection) |
| **Entity resolution** | LLM-powered deduplication ("John" = "Mr. Smith")                                                                                                                         | None — agent is responsible for consistency                                 |
| **Communities**       | Auto-generated clusters with LLM summaries                                                                                                                               | None                                                                        |
| **Scale target**      | Enterprise (115K token conversations, benchmarked)                                                                                                                       | Single developer (~20K facts)                                               |
| **Infrastructure**    | Neo4j + OpenAI API key + Python + Docker                                                                                                                                 | `node dist/cli.js` (zero external deps)                                     |

### Core Philosophical Difference

- **Graphiti**: "Feed me raw conversations, I'll figure out what's important using LLMs"
- **Texere**: "The agent knows what's important — it stores exactly what matters"

Graphiti is built for **conversational memory** (chat history → knowledge). Texere is built for
**intentional knowledge capture** (agent deliberately records decisions, requirements, constraints).

### What Graphiti Has That We Don't (and Assessment)

| Graphiti Feature                 | What It Does                                         | Our Status         | Should We Reconsider?                                                                |
| -------------------------------- | ---------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| **Entity resolution**            | "Kendra" = "Kendra Smith" auto-dedup                 | Not planned        | Maybe later — at 20K facts, duplicate entities are a real risk                       |
| **Contradiction detection**      | LLM detects "fact A invalidates fact B"              | Not planned        | No — requires LLM in write path, violates "dumb store" principle                     |
| **Embeddings + semantic search** | Cosine similarity on fact content                    | Not planned for v1 | **Probably should plan for this** — at 20K facts, keyword matching may not be enough |
| **Communities**                  | Auto-clustered groups with summaries                 | Not planned        | Not for v1 — analytics feature                                                       |
| **Episodic layer**               | Raw conversation preserved alongside extracted facts | Not planned        | Interesting but heavy — our agents store curated facts, not raw conversations        |

### Where Texere Wins Over Graphiti

1. **Zero LLM dependency for storage** — Graphiti makes 5+ LLM calls per ingested message.
   Expensive, slow, hallucination risk in storage layer.
2. **Zero infrastructure** — No Neo4j, no Docker, no OpenAI API key, no Python.
3. **Single language** — TypeScript project stays TypeScript.
4. **Deterministic storage** — What you store is exactly what you get back. No LLM in write path.
5. **Agent-controlled precision** — Agent stores exactly what matters, not what an LLM thinks it
   extracted.
6. **Speed** — SQLite FTS5 is sub-millisecond. Graphiti's write path takes seconds.
7. **Cost** — Zero API costs for storage operations.

---

## Embedded Graph DB Landscape (February 2026)

We evaluated whether to use a proper graph database with Cypher instead of SQLite + CTEs.

| Project           | Language         | Cypher?     | Embedded?   | Node.js?         | Status                       |
| ----------------- | ---------------- | ----------- | ----------- | ---------------- | ---------------------------- |
| **Kuzu**          | C++              | Full Cypher | In-process  | npm              | **Archived Oct 2025 — DEAD** |
| **FalkorDB**      | C (Redis module) | Subset      | Needs Redis | Via Redis client | Active                       |
| **Neo4j**         | Java             | Full Cypher | Server only | Via driver       | Active (heavy)               |
| **tiny-graph-db** | JavaScript       | No          | Yes         | Yes              | Toy (7 stars)                |
| **SQLite + CTEs** | C                | SQL only    | In-process  | better-sqlite3   | Eternal                      |

**Verdict**: There is no alive, maintained, embedded graph DB with Cypher and Node.js bindings. Kuzu
was the only candidate and it died in October 2025. SQLite with recursive CTEs is the pragmatic
choice.

---

## Scale Considerations at 20K Facts

### What's Fine at 20K

- **SQLite storage**: Handles millions of rows. 20K is trivial.
- **FTS5 search**: Designed for millions of documents. Sub-millisecond at 20K.
- **Indexed lookups** (type, tag, path): Sub-millisecond.
- **Single-hop traversals**: Sub-millisecond with index on from_id/to_id.
- **Write throughput**: WAL mode handles thousands of inserts/second.

### What Needs Attention at 20K

- **Multi-hop traversals at depth 3**: ~5 relationships/node → ~125 nodes explored. Fast with
  indexes and cycle detection. Gets slower at depth 5+.
- **Search ranking quality**: At 20K, the difference between result #3 and #47 matters. FTS5 BM25 is
  good for keywords but can't do semantic matching.
- **Duplicate facts**: Without entity resolution, 20K facts accumulate duplicates over time. Agent
  discipline is the only guard.

### The Embedding Gap (Biggest Risk)

At 20K facts, FTS5 keyword search may be insufficient:

- FTS5: "authentication" → finds facts containing that word
- Embedding search: "authentication" → also finds "JWT tokens", "session management", "OAuth flow"

This is the single biggest capability gap vs Graphiti. Not a v1 blocker, but likely the first v2
priority.

**Options**:

- **v1**: Pure FTS5, iterate based on real usage
- **v2**: Add embeddings column + `sqlite-vec` or in-memory cosine similarity index

---

## Decision: TypeScript Rewrite vs Using memory-graph Directly

### Why Rewrite (Confirmed)

1. **memory-graph is 77% code we don't need** (multi-backend, multi-tenant, migrations, NetworkX,
   analytics)
2. **The essential core is ~1,550 TypeScript lines** — genuinely small
3. **Single language** — no Python dependency management
4. **FTS5 done right** — memory-graph defines FTS5 but never uses it; we build search correctly from
   day 1
5. **Zero infrastructure** — no Python subprocess, no separate MCP server
6. **Reuse existing deps** — better-sqlite3, MCP SDK, zod, vitest all already in package.json

### The Tradeoff

~8-10 days effort vs ~2-3 days to wrap Python memory-graph. The 3x multiplier buys: single language,
no external deps, query-first design, full control over ~33 SQL queries, simpler deployment.

### memory-graph Reference Files

- `/tmp/memory-graph/src/memorygraph/sqlite_database.py` — 1,861 lines, 33 SQL queries (PRIMARY
  reference)
- `/tmp/memory-graph/src/memorygraph/backends/sqlite_fallback.py` — SQLite schema, 480 lines
- `/tmp/memory-graph/src/memorygraph/models.py` — Memory, Relationship, SearchQuery models, 699
  lines
- `/tmp/memory-graph/src/memorygraph/server.py` — MCP tool definitions, 721 lines
- `/tmp/memory-graph/src/memorygraph/relationships.py` — 35 relationship types, 668 lines
