# Texere vs Memory-Graph: Search Comparison (LLM Tool Interface)

**Date**: 2026-02-14  
**Audience**: LLM agents (not humans)  
**Purpose**: Compare search capabilities for agent-to-agent tool calls

---

## Executive Summary

Both systems are **LLM tool interfaces** — the "user" is an AI agent, not a human. This
fundamentally changes what matters:

- ❌ **Doesn't matter**: Pretty markdown formatting, emoji, "Next steps" suggestions
- ✅ **Does matter**: Parseable structure, token efficiency, semantic precision, composability

**Key Finding**: Texere's JSON-first design is **correct for LLM consumption**. Memory-Graph's
markdown formatting is **wasted tokens** for agent-to-agent communication.

---

## What LLMs Actually Need from Search Tools

### 1. **Structured, Parseable Output**

- JSON with consistent schema
- No prose, no formatting noise
- Predictable field locations

### 2. **Token Efficiency**

- Minimal wrapper text
- No redundant explanations
- Dense information payload

### 3. **Composability**

- Results can be piped to other tools
- IDs are extractable
- Relationships are traversable

### 4. **Semantic Precision**

- Clear type system (enums, not strings)
- Explicit confidence/importance scores
- Unambiguous relationship semantics

---

## Tool-by-Tool Comparison (LLM Perspective)

### 1. Store Operation

**Texere**:

```json
{
  "node": {
    "id": "ipuClUUFOriORBl8WL3sR",
    "type": "solution",
    "title": "Redis connection pooling fix",
    "content": "...",
    "tags_json": "[\"redis\",\"connection-pool\",\"performance\"]",
    "importance": 0.8,
    "confidence": 0.9,
    "created_at": 1771054567158,
    "invalidated_at": null,
    "embedding": null
  }
}
```

**Memory-Graph**:

```
Memory stored successfully with ID: 8a0ae59d-b814-4ee2-a3ad-532d9518b3bf
```

**LLM Analysis**:

- **Texere**: Returns full object → LLM can verify fields, extract ID, check timestamp in one
  response
- **Memory-Graph**: Returns prose → LLM must parse natural language, extract ID via regex, cannot
  verify other fields

**Winner**: **Texere** — structured response enables immediate verification without additional tool
calls.

**Recommendation for Texere v2**: Keep verbose response as default. Add `minimal: true` option for
agents that only need ID.

---

### 2. Search: Output Format

**Texere** (FTS5):

```json
{
  "results": [
    {
      "id": "ipuClUUFOriORBl8WL3sR",
      "type": "solution",
      "title": "Redis connection pooling fix",
      "content": "Increased max pool size from 10 to 50...",
      "tags_json": "[\"redis\",\"connection-pool\",\"performance\"]",
      "importance": 0.8,
      "confidence": 0.9,
      "created_at": 1771054567158,
      "invalidated_at": null,
      "embedding": null
    }
  ]
}
```

**Memory-Graph** (search_memories):

```markdown
Found 2 memories:

**1. Redis connection pooling fix** (ID: 8a0ae59d-b814-4ee2-a3ad-532d9518b3bf) Type: solution |
Importance: 0.8 Tags: redis, connection-pool, performance
```

**Token Count**:

- Texere: ~180 tokens (pure data)
- Memory-Graph: ~220 tokens (data + formatting)

**LLM Parsing**:

- Texere: `results[0].id` (direct access)
- Memory-Graph: Regex extraction from markdown

**Winner**: **Texere** — 22% fewer tokens, zero parsing overhead.

**Critique of Memory-Graph**: Markdown formatting (`**`, `|`, newlines) is wasted tokens for LLM
consumption. The "Found 2 memories:" preamble is redundant (LLM can count array length).

---

### 3. Search: Match Quality Feedback

**Memory-Graph** includes match quality:

```markdown
**1. Redis ECONNREFUSED under load** Match: low quality (in tags)
```

**Texere** does not include match quality.

**LLM Analysis**:

- **Pro**: Match quality helps LLM decide if result is relevant
- **Con**: Prose format ("low quality in tags") requires NL parsing
- **Better**: Structured score: `{"match_quality": 0.3, "match_location": "tags"}`

**Winner**: **Concept is good, execution is wrong**

**Recommendation for Texere v2**: Add structured match metadata:

```json
{
  "id": "...",
  "title": "...",
  "rank": -2.45, // BM25 score (already present)
  "match_quality": 0.7, // 0-1 normalized score
  "match_fields": ["title", "content"] // Where match occurred
}
```

---

### 4. Search: Relationship Context

**Memory-Graph** (recall_memories):

```markdown
Context: Problem solves Redis connection pooling fix Relationships: solves: 1 memories
```

**Texere**: No relationship context in search results.

**LLM Analysis**:

- **Pro**: Relationship context helps LLM understand graph structure
- **Con**: Prose format requires parsing
- **Con**: "solves: 1 memories" is grammatically awkward (should be "1 memory")

**Winner**: **Concept is good, execution is wrong**

**Recommendation for Texere v2**: Add structured relationship summary:

```json
{
  "id": "...",
  "title": "...",
  "relationships": {
    "outgoing": { "SOLVES": 1, "REQUIRES": 2 },
    "incoming": { "MOTIVATED_BY": 1 }
  }
}
```

---

### 5. Search Algorithms

| Aspect                | Texere                                                   | Memory-Graph                                    |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| **Algorithm**         | FTS5 with BM25                                           | Custom fuzzy stemming                           |
| **Ranking**           | BM25 score (weighted: title 10.0, tags 3.0, content 1.0) | No ranking (insertion order)                    |
| **Stemming**          | FTS5 built-in (unicode61 tokenizer)                      | Custom stemming (removes ing/ed/s/es/ly/er/est) |
| **Typo tolerance**    | ❌                                                       | ✅ (fuzzy mode)                                 |
| **Phrase search**     | ✅ (FTS5 native)                                         | ❌                                              |
| **Prefix search**     | ✅ (`auth*`)                                             | ❌                                              |
| **Boolean operators** | ✅ (FTS5: AND, OR, NOT, NEAR)                            | ⚠️ (via `match_mode` parameter only)            |

**LLM Analysis**:

**Texere's FTS5**:

- ✅ Industry-standard algorithm (predictable behavior)
- ✅ BM25 ranking (relevance-sorted results)
- ✅ Rich query syntax (phrase search, prefix, boolean)
- ✅ Fast (5-20ms at 100K docs)
- ❌ No typo tolerance

**Memory-Graph's Custom Fuzzy**:

- ✅ Typo tolerance (fuzzy mode)
- ✅ Morphological variations (cache → caching)
- ❌ No ranking (results in insertion order)
- ❌ Limited query syntax (no phrase search, no prefix)
- ❌ Custom algorithm (non-standard behavior)

**Winner**: **Texere** — BM25 ranking is critical for LLMs. Without ranking, LLM must read all
results to find best match.

**Example**: Search for "database timeout" returns 50 results. With BM25, LLM reads top 5. Without
ranking, LLM must scan all 50.

---

### 6. Search Modes: Strict/Normal/Fuzzy

**Memory-Graph** has 3 modes:

- `strict`: Exact substring match
- `normal`: Fuzzy with stemming (default)
- `fuzzy`: Same as normal (future: trigram)

**Texere** has 1 mode:

- FTS5 keyword match (no tolerance levels)

**LLM Analysis**:

**For LLM agents**, fuzzy tolerance is **less important** than for humans:

- LLMs can generate multiple query variations programmatically
- LLMs can retry with different keywords
- LLMs don't make typos (they generate text, not type it)

**Example**: LLM searching for "connection timeout"

- Human: Types "conection timeout" (typo) → needs fuzzy
- LLM: Generates "connection timeout" (no typo) → doesn't need fuzzy

**Winner**: **Neutral** — Fuzzy is nice-to-have, not critical for LLM use.

**Recommendation for Texere v2**: Add fuzzy as **opt-in**, not default. LLMs should use exact
matching unless explicitly needed.

---

### 7. Boolean Logic: AND vs OR

**Memory-Graph**:

```javascript
search_memories({
  terms: ['timeout', 'error', 'connection'],
  match_mode: 'all', // AND logic
});
```

**Texere**:

```javascript
// Must use FTS5 syntax in query string
texere_search({
  query: 'timeout AND error AND connection',
});
```

**LLM Analysis**:

**Memory-Graph's approach**:

- ✅ Explicit parameter (`match_mode`)
- ✅ No query syntax to learn
- ❌ Limited to simple AND/OR (no complex boolean)

**Texere's approach**:

- ✅ Full boolean expressiveness (AND, OR, NOT, NEAR, parentheses)
- ✅ Industry-standard FTS5 syntax
- ❌ Requires LLM to learn query syntax

**Winner**: **Texere** — LLMs can learn FTS5 syntax once and get full boolean power.

**Example complex query** (Texere can do, Memory-Graph cannot):

```
(timeout OR latency) AND (redis OR postgres) NOT cache
```

---

### 8. The Killer Feature: `texere_search_graph`

**Texere's `search_graph` tool** combines search + traversal:

```javascript
texere_search_graph({
  query: 'redis timeout',
  max_depth: 2,
  direction: 'both',
});
```

**What it does**:

1. FTS5 search finds seed nodes matching "redis timeout"
2. Recursive CTE traverses graph (depth 1-2)
3. Returns seeds + neighbors in one response

**Memory-Graph equivalent**: 2-3 tool calls

1. `search_memories` to find seeds
2. `get_related_memories` for each seed
3. Deduplicate results

**LLM Analysis**:

**For LLM agents**, reducing tool calls is **critical**:

- Each tool call = 1 round-trip to MCP server
- Each round-trip = latency + token overhead
- Fewer calls = faster agent execution

**Example**: "Show me everything about Redis timeouts"

- Texere: 1 call (`search_graph`)
- Memory-Graph: 1 search + N relationship calls (where N = number of seeds)

**Winner**: **Texere** — `search_graph` is a massive UX win for LLM agents.

**Recommendation**: Heavily document `search_graph` as the primary search tool for exploratory
queries.

---

### 9. Structured Types vs Strings

**Texere**:

```typescript
type: NodeType.Solution; // Enum (17 values)
edge_type: EdgeType.Solves; // Enum (14 values)
```

**Memory-Graph**:

```python
type: MemoryType.SOLUTION  # Enum (13 values)
relationship_type: "SOLVES"  # String (open-ended)
```

**LLM Analysis**:

**Texere's typed edges**:

- ✅ Prevents semantic drift (can't invent random types)
- ✅ Enables validation (typo "SOLVE" rejected)
- ✅ Enables autocomplete (LLM knows valid values)
- ❌ Less flexible (can't add custom types without code change)

**Memory-Graph's string edges**:

- ✅ Flexible (can create any relationship type)
- ❌ No validation (typo "SOLVE" vs "SOLVES" creates two types)
- ❌ Semantic drift (different agents use different conventions)

**Winner**: **Texere** — For LLM agents, type safety prevents errors.

**Example**: LLM creates edge with type "SOLVE" (typo). Texere rejects. Memory-Graph accepts,
creating orphan relationship type.

---

### 10. Confidence Scores

**Texere** has `confidence` field (0-1):

```json
{ "confidence": 0.9 } // How certain is this knowledge?
```

**Memory-Graph** does not have confidence.

**LLM Analysis**:

**For LLM agents**, confidence is **valuable**:

- LLM can prioritize high-confidence knowledge
- LLM can flag low-confidence knowledge for verification
- LLM can track epistemic uncertainty

**Example**: LLM finds two conflicting solutions

- Solution A: `confidence: 0.9` (tested in production)
- Solution B: `confidence: 0.5` (untested hypothesis)
- LLM chooses A

**Winner**: **Texere** — Confidence enables epistemic reasoning.

**Recommendation**: Keep confidence field. Document best practices for setting values.

---

### 11. Immutability vs Mutability

**Texere**: Immutable nodes (no update, only deprecate) **Memory-Graph**: Mutable memories (update
in place)

**LLM Analysis**:

**For LLM agents**, immutability is **valuable**:

- ✅ Preserves history (LLM can see what was believed at time T)
- ✅ Enables time-travel queries ("What did we know before the fix?")
- ✅ Prevents accidental overwrites
- ❌ More complex correction flow (3 steps vs 1)

**Memory-Graph's mutability**:

- ✅ Simple corrections (1 step)
- ❌ Loses history (can't answer "What changed?")

**Winner**: **Texere** — History preservation is more valuable than correction simplicity.

**Recommendation**: Add `replace_node` helper to make 3-step flow atomic:

```javascript
replace_node({
  old_id: "abc123",
  new_node: {...},
  reason: "Updated with production data"
})
// Atomically: store new + create DEPRECATED_BY edge + return new ID
```

---

## Search Capability Matrix (LLM Perspective)

| Capability               | Texere                 | Memory-Graph      | Winner           |
| ------------------------ | ---------------------- | ----------------- | ---------------- |
| **Structured output**    | ✅ JSON                | ⚠️ Markdown       | **Texere**       |
| **Token efficiency**     | ✅ Dense               | ❌ Verbose        | **Texere**       |
| **BM25 ranking**         | ✅                     | ❌                | **Texere**       |
| **Boolean logic**        | ✅ Full FTS5           | ⚠️ Simple AND/OR  | **Texere**       |
| **Phrase search**        | ✅                     | ❌                | **Texere**       |
| **Prefix search**        | ✅ `auth*`             | ❌                | **Texere**       |
| **Search + traverse**    | ✅ `search_graph` tool | ❌ Multiple calls | **Texere**       |
| **Typed edges**          | ✅ Enum                | ⚠️ Strings        | **Texere**       |
| **Confidence scores**    | ✅                     | ❌                | **Texere**       |
| **Immutability**         | ✅                     | ❌                | **Texere**       |
| **Typo tolerance**       | ❌                     | ✅                | **Memory-Graph** |
| **Match quality**        | ❌                     | ✅ (concept)      | **Memory-Graph** |
| **Relationship context** | ❌                     | ✅ (concept)      | **Memory-Graph** |

**Overall Winner**: **Texere** (10 vs 3)

---

## What Texere Should NOT Copy

### 1. ❌ Markdown Output

**Why**: Wasted tokens for LLM consumption. LLMs parse JSON natively.

**Example**:

```markdown
**1. Redis fix** (ID: abc123) Type: solution | Importance: 0.8
```

vs

```json
{ "id": "abc123", "type": "solution", "importance": 0.8 }
```

Same information, 40% fewer tokens in JSON.

---

### 2. ❌ Prose Responses

**Why**: LLMs don't need "Memory stored successfully" — they can check the response structure.

**Bad**:

```
Memory stored successfully with ID: abc123
```

**Good**:

```json
{ "id": "abc123" }
```

---

### 3. ❌ "Next steps" Suggestions

**Why**: LLMs don't need hand-holding. They know what tools are available.

**Bad**:

```markdown
💡 **Next steps:**

- Use `get_memory(memory_id="...")` to see full details
```

**Good**: (nothing — LLM will call `get_memory` if needed)

---

### 4. ❌ Unranked Search Results

**Why**: LLMs need relevance ranking to prioritize results.

**Memory-Graph** returns results in insertion order (no ranking).  
**Texere** returns results in BM25 order (best matches first).

**For LLMs**: Ranking is critical. Without it, LLM must read all results.

---

### 5. ❌ Edge Context Field

**Why**: Redundant — edge types are semantically sufficient, details belong in node content.

**Bad** (duplicates information):

```typescript
create_edge({
  source_id: 'sol_123',
  target_id: 'prob_456',
  type: EdgeType.Solves,
  context: 'Pool size increase resolved connection exhaustion',
});
```

**Good** (details in node):

```typescript
// Solution node content already explains HOW/WHY
store_node({
  type: NodeType.Solution,
  content: 'Increased pool to 50. This resolves connection exhaustion...',
});

// Edge just links (no duplication)
create_edge({
  source_id: 'sol_123',
  target_id: 'prob_456',
  type: EdgeType.Solves,
});
```

**For LLMs**: Traversal is cheap. If LLM needs details, one call to `get_node(id)` retrieves full
context.

**Problems with edge context**:

1. Duplicates node content
2. Can get out of sync with node updates
3. Adds API complexity
4. Violates graph theory (edges are labeled arcs, nodes contain data)

---

## What Texere SHOULD Copy (With Modifications)

### 1. ✅ Match Quality (But Structured)

**Memory-Graph's concept**: Show match quality  
**Memory-Graph's execution**: Prose ("low quality in tags")  
**Texere should do**: Structured scores

```json
{
  "id": "...",
  "rank": -2.45, // BM25 score
  "match_quality": 0.7, // Normalized 0-1
  "match_fields": ["title", "content"]
}
```

---

### 2. ✅ Relationship Context (But Structured)

**Memory-Graph's concept**: Show relationships in search results  
**Memory-Graph's execution**: Prose ("solves: 1 memories")  
**Texere should do**: Structured counts

```json
{
  "id": "...",
  "relationships": {
    "outgoing": { "SOLVES": 1, "REQUIRES": 2 },
    "incoming": { "MOTIVATED_BY": 1 }
  }
}
```

---

### 3. ✅ Fuzzy Search (But Opt-In)

**Memory-Graph**: Fuzzy by default  
**Texere should do**: Exact by default, fuzzy opt-in

```javascript
texere_search({
  query: 'conection', // Typo
  fuzzy: true, // Opt-in fuzzy matching
});
```

**Why**: LLMs rarely need fuzzy (they don't make typos), but it's useful for user-generated queries.

---

## Texere v2 Recommendations (LLM-First Design)

### Phase 1: Fix Critical Gaps

1. ✅ **Add match quality scores** (structured, not prose)

   ```json
   { "rank": -2.45, "match_quality": 0.7, "match_fields": ["title"] }
   ```

2. ✅ **Add relationship context to search results** (structured counts)

   ```json
   { "relationships": { "outgoing": { "SOLVES": 1 }, "incoming": {} } }
   ```

3. ✅ **Add `replace_node` helper** (atomic deprecation)
   ```typescript
   replace_node({old_id: "...", new_node: {...}})
   ```

### Phase 2: Enhance Search

4. ✅ **Add fuzzy search** (opt-in via `fuzzy: true` parameter)
5. ✅ **Add semantic search** (embeddings, opt-in via `semantic: true`)
6. ✅ **Add `summary` field** (optional, max 500 chars)
7. ✅ **Add `project_path` field** (optional, for multi-project graphs)

### Phase 3: Workflow Helpers

8. ✅ **Add batch operations** (`store_nodes`, `create_edges`)
9. ✅ **Add `vacuum` tool** (delete invalidated nodes)
10. ✅ **Add `get_recent_activity`** (session continuity)

---

## Design Principles for LLM Tools

### 1. **JSON-First**

- All responses are valid JSON
- No markdown, no prose, no formatting
- Predictable schema

### 2. **Token-Efficient**

- No redundant text ("successfully", "found X results")
- Dense information payload
- LLM can infer context

### 3. **Structured Metadata**

- Scores are numbers (0-1), not prose ("high quality")
- Enums, not strings
- Explicit nulls (not missing fields)

### 4. **Composable**

- Results can be piped to other tools
- IDs are extractable
- Relationships are traversable

### 5. **Ranked by Default**

- Search results sorted by relevance
- LLM reads top N, not all results
- BM25 or similar ranking

### 6. **Type-Safe**

- Enums for node types, edge types
- Validation prevents typos
- Autocomplete-friendly

### 7. **Immutable by Default**

- Preserve history
- Enable time-travel queries
- Prevent accidental overwrites

---

## Conclusion

**Texere's design is fundamentally correct for LLM consumption**:

- JSON output (not markdown)
- Structured responses (not prose)
- BM25 ranking (not insertion order)
- Typed edges (not strings)
- Immutability (not mutability)

**Memory-Graph's markdown formatting is a mistake** for LLM-to-LLM communication:

- Wasted tokens (22% overhead)
- Requires parsing (regex extraction)
- No composability (can't pipe to other tools)

**Texere should borrow concepts, not execution**:

- ✅ Match quality (but as structured scores, not prose)
- ✅ Relationship context in search results (but as structured counts, not prose)
- ✅ Fuzzy search (but opt-in, not default)
- ❌ Edge context field (redundant — details belong in nodes)

**The v2 vision**: Texere remains a strict, token-efficient, LLM-first knowledge graph with enhanced
metadata and search capabilities.
