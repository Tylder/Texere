# Node Modeling Test: Converting Documentation to Knowledge Graph

**Date**: 2026-02-14  
**Test Subject**: `docs/search-comparison-llm-ux.md`  
**Purpose**: Discover gaps, friction points, and best practices by actually using Texere to model
real content

---

## Test Objectives

1. **Find node type gaps** - What content doesn't fit existing 17 types?
2. **Find edge type gaps** - What relationships can't be expressed with 14 edge types?
3. **Prove need for batch operations** - Quantify the pain of 40+ individual store calls
4. **Discover title/content best practices** - How to write effective node titles?
5. **Develop tagging strategy** - What should be tags vs types vs content?
6. **Test importance/confidence scoring** - How to consistently score nodes?
7. **Explore hierarchical modeling** - How to represent document structure in flat graph?
8. **Identify workflow gaps** - What tooling is missing?
9. **Validate query patterns** - Can we answer natural questions about the content?
10. **Find anchor_to limitations** - What can/can't be anchored?

---

## Predicted Findings

### 1. Node Type Gaps

| Content in Doc                | Closest Type    | Fit Quality | Issue                                        |
| ----------------------------- | --------------- | ----------- | -------------------------------------------- |
| "Use JSON output"             | `decision`      | ✅ Perfect  | Clear choice + rationale                     |
| "LLMs need structured output" | `requirement`   | ✅ Perfect  | Must-have need                               |
| "Don't add edge context"      | `constraint`    | ✅ Perfect  | Must-not restriction                         |
| "Markdown wastes 22% tokens"  | `research`?     | ⚠️ Unclear  | Finding from analysis, not external research |
| "JSON-First principle"        | ???             | ❌ No fit   | Not decision/requirement/constraint          |
| "Texere vs Memory-Graph"      | ???             | ❌ No fit   | Comparative analysis                         |
| "Add match quality in v2"     | `task`?         | ⚠️ Unclear  | Future work (requirement or task?)           |
| "BM25 ranking is critical"    | `general`?      | ⚠️ Unclear  | Assertion/claim                              |
| Code example (JSON snippet)   | `code_pattern`? | ⚠️ Unclear  | Not really a reusable pattern                |
| "Tool-by-Tool Comparison"     | ???             | ❌ No fit   | Section header                               |

**Hypothesis**: We'll need at least 3 new types:

- `principle` - Design principles (JSON-First, Token-Efficient, Immutable-by-Default)
- `finding` - Analysis results (not external research)
- `assertion` or `claim` - Statements that need evidence

**Alternative hypothesis**: Maybe `general` is fine for these, and we're over-categorizing.

---

### 2. Edge Type Gaps

| Relationship                | Closest Type             | Fit Quality | Issue                                      |
| --------------------------- | ------------------------ | ----------- | ------------------------------------------ |
| Research finding → Decision | `VALIDATES`              | ⚠️ Weak     | VALIDATES is for confirming, not informing |
| Evidence → Claim            | ???                      | ❌ No fit   | Need SUPPORTS or EVIDENCES                 |
| Code example → Pattern      | ???                      | ❌ No fit   | Need EXEMPLIFIES or ILLUSTRATES            |
| Principle → Decision        | `MOTIVATED_BY` (reverse) | ⚠️ Awkward  | Direction feels wrong                      |
| Finding → Conclusion        | ???                      | ❌ No fit   | Need LEADS_TO or IMPLIES                   |
| Anti-pattern → Good pattern | `ALTERNATIVE_TO`         | ⚠️ Weak     | Not alternatives, one is wrong             |
| Section → Subsection        | ???                      | ❌ No fit   | Need CONTAINS or PARENT_OF                 |
| Recommendation → Decision   | `IMPLEMENTS`?            | ⚠️ Weak     | Future work, not implementation            |

**Hypothesis**: We'll need at least 4 new edge types:

- `SUPPORTS` - Evidence → claim (directional)
- `EXEMPLIFIES` - Example → abstract concept
- `CONTRADICTS_IN_PRACTICE` - Better name for anti-pattern relationship
- `SUPERSEDES` - Recommendation → current state

**Alternative hypothesis**: We can model everything with `RELATED_TO` + context in node content.

---

### 3. Batch Operation Pain Points

**Content to model**:

- Design Principles section: ~7 principles
- Tool-by-Tool Comparison: ~11 comparisons
- Anti-patterns: ~5 items
- Good patterns: ~3 items
- v2 Recommendations: ~10 items
- Phase sections: ~3 phases

**Total**: ~40 nodes + ~30 edges

**Without batch operations**:

```typescript
// 40 individual store_node calls
const node1 = await texere_store_node({...})
const node2 = await texere_store_node({...})
// ... 38 more times

// 30 individual create_edge calls
await texere_create_edge({source_id: node1.id, target_id: node2.id, ...})
await texere_create_edge({source_id: node2.id, target_id: node3.id, ...})
// ... 28 more times
```

**Pain points we'll feel**:

1. **ID tracking hell** - Need to store IDs in variables or copy-paste from output
2. **No rollback** - If we mess up node 35, we've polluted the graph with 34 nodes
3. **Slow** - 40 round-trips to MCP server
4. **Error-prone** - Easy to typo an ID when creating edges
5. **No progress tracking** - Can't see "25/40 nodes created"

**Evidence needed**: Time how long it takes to create 10 nodes manually.

---

### 4. Title vs Content Ambiguity

**Dilemma**: How much detail in title vs content?

**Example 1: Decision node**

**Option A - Title as summary**:

```json
{
  "type": "decision",
  "title": "Use JSON output instead of markdown for LLM tools",
  "content": "Memory-Graph uses markdown formatting which wastes 22% more tokens compared to JSON. LLMs parse JSON natively, whereas markdown requires regex extraction. For agent-to-agent communication, JSON is more efficient and composable."
}
```

**Option B - Title as label**:

```json
{
  "type": "decision",
  "title": "Output format",
  "content": "Texere should use JSON output instead of markdown. Memory-Graph uses markdown formatting which wastes 22% more tokens..."
}
```

**Option C - Title as imperative**:

```json
{
  "type": "decision",
  "title": "Output format: JSON",
  "content": "Use JSON instead of markdown for all tool responses. Rationale: Memory-Graph uses markdown..."
}
```

**Hypothesis**: We'll try all three and find Option A works best for search (title is searchable
summary).

**Test**: Create same decision in all three formats, then search for "markdown" and see which is
easier to find.

---

### 5. Tag Strategy

**What should be tags?**

**Option A - Topical tags**:

```json
{
  "tags": ["search", "llm-ux", "comparison", "output-format"]
}
```

**Option B - System names**:

```json
{
  "tags": ["texere", "memory-graph"]
}
```

**Option C - Categorization**:

```json
{
  "tags": ["v2", "roadmap", "critical"]
}
```

**Option D - All of the above**:

```json
{
  "tags": ["search", "llm-ux", "texere", "memory-graph", "v2", "critical"]
}
```

**Dilemma**: Option D has 6 tags. Will search be too broad? Or is this good?

**Another question**: Should we use tags for priority, or use `importance` field?

- `tags: ["critical"]` + `importance: 0.5`? (inconsistent)
- `tags: ["search", "llm-ux"]` + `importance: 0.9`? (consistent)

**Hypothesis**: We'll find that tags are for **topics/categories**, importance is for **priority**.

---

### 6. Importance/Confidence Scoring

**How to consistently score?**

**Example 1 - Critical decision**:

```json
{
  "title": "Don't add edge context field",
  "importance": 0.9, // High - affects API design
  "confidence": 0.95 // Very confident after analysis
}
```

**Example 2 - Nice-to-have**:

```json
{
  "title": "Add fuzzy search",
  "importance": 0.5, // Medium - optional feature
  "confidence": 0.7 // Reasonably confident it's useful
}
```

**Example 3 - Research finding**:

```json
{
  "title": "Markdown wastes 22% more tokens",
  "importance": 0.8, // High - informs critical decision
  "confidence": 0.85 // Confident in measurement
}
```

**Questions**:

1. Is importance relative to the whole graph, or within a type?
2. Does a low-importance constraint (0.3) make sense? (It's still a hard constraint)
3. Should confidence be about the content, or about the node categorization?

**Hypothesis**: We'll discover we need a scoring rubric document.

---

### 7. Hierarchical Relationships

**Document structure**:

```
Conclusion
  ├─ Texere's design is correct
  │   ├─ JSON output (not markdown)
  │   ├─ Structured responses (not prose)
  │   └─ BM25 ranking (not insertion order)
  └─ Texere should borrow concepts
      ├─ Match quality (but structured)
      └─ Fuzzy search (but opt-in)
```

**How to model in flat graph?**

**Option A - BUILDS_ON chains**:

```
conclusion --[BUILDS_ON]--> principle1 --[BUILDS_ON]--> decision1
```

**Option B - MOTIVATED_BY chains**:

```
decision1 --[MOTIVATED_BY]--> principle1 --[MOTIVATED_BY]--> conclusion
```

**Option C - Create section nodes**:

```
section:conclusion --[CONTAINS]--> principle1
principle1 --[CONTAINS]--> decision1
```

**Dilemma**: Option C requires a `CONTAINS` edge type. Option A/B feel backwards.

**Hypothesis**: We'll find that hierarchical structure is better represented by tags or by search,
not by edges.

---

### 8. Anchor Points

**Should we anchor to the doc?**

**Attempt 1 - Line numbers**:

```json
{
  "title": "Use JSON output",
  "anchor_to": ["docs/search-comparison-llm-ux.md:729"]
}
```

**Problem**: `anchor_to` expects file paths, not `file:line` format.

**Attempt 2 - File only**:

```json
{
  "title": "Use JSON output",
  "anchor_to": ["docs/search-comparison-llm-ux.md"]
}
```

**Problem**: 40 nodes all anchor to same file. Not useful.

**Attempt 3 - Section headers as files**:

```json
{
  "title": "Use JSON output",
  "anchor_to": ["docs/search-comparison-llm-ux.md#conclusion"]
}
```

**Problem**: `anchor_to` creates `file_context` pseudo-nodes. Is `file_context:docs/...#conclusion`
useful?

**Hypothesis**: Anchoring documentation nodes to the source doc is not that useful. Better to use
`source_url` in content field.

---

### 9. Duplicate Detection Workflow

**Scenario**: Creating "Use JSON output" decision

**Step 1 - Check if exists**:

```typescript
const existing = await texere_search({
  query: 'JSON output',
  type: NodeType.Decision,
});
```

**Problem**: Returns 0 results (we haven't created it yet). But also returns 0 if we typo the query.

**Step 2 - Create node**:

```typescript
const node = await texere_store_node({
  type: NodeType.Decision,
  title: 'Use JSON output instead of markdown',
});
```

**Step 3 - Later, create similar node** (accidental duplicate):

```typescript
const duplicate = await texere_store_node({
  type: NodeType.Decision,
  title: 'Output format should be JSON, not markdown', // Different wording, same idea
});
```

**Problem**: No warning. Now we have duplicates.

**Missing features**:

1. No "fuzzy duplicate detection" on title
2. No "similar nodes" suggestion during creation
3. No `--dry-run` flag to preview before commit

**Hypothesis**: We'll create at least one accidental duplicate and only find it when querying.

---

### 10. Workflow Friction Points

**Pain points we expect**:

1. **No editor integration**
   - Can't highlight text in doc and click "Extract to node"
   - Must manually copy-paste content

2. **No bulk import**
   - Can't write nodes in YAML and import
   - Can't parse markdown sections automatically

3. **Manual ID tracking**
   - After creating 10 nodes, hard to remember IDs
   - Must copy-paste IDs from terminal output
   - No clipboard history of recent IDs

4. **No templates**
   - Repeating same structure for similar nodes
   - No "Create decision node" template with prompts

5. **No validation preview**
   - Won't know if tags are inconsistent until query time
   - Can't see "You have 3 variants of the 'llm-ux' tag: llm-ux, llmux, LLM-UX"

6. **No transaction support**
   - If we mess up on node 35/40, can't rollback
   - Polluted graph with partial data

7. **No progress tracking**
   - Can't see "25/40 nodes created (62%)"
   - Can't resume after error

8. **No visualization**
   - Can't see the graph we're building in real-time
   - Must query to understand structure

**Evidence needed**: Count how many times we copy-paste IDs, how many typos we make.

---

## Test Methodology

### Phase 1: Sample Nodes (5 nodes)

**Pick diverse content**:

1. ✅ Clear `decision` - "Use JSON output"
2. ⚠️ Ambiguous type - "JSON-First principle"
3. ⚠️ Research finding - "Markdown wastes 22% tokens"
4. ⚠️ Future work - "Add match quality scores"
5. ⚠️ Code example - JSON output snippet

**For each node**:

- Try 3 different title formats (A/B/C)
- Try different tag strategies
- Score importance/confidence
- Document time taken
- Note friction points

**Goal**: Surface node type ambiguities.

---

### Phase 2: Create Edges (5 edges)

**Connect the 5 nodes**:

1. Finding → Decision
2. Principle → Decision
3. Recommendation → Requirement
4. Example → Pattern
5. Decision → Anti-pattern

**For each edge**:

- Try different edge types
- Document which fits best
- Note if any relationship can't be expressed

**Goal**: Find edge type gaps.

---

### Phase 3: Batch Creation (10 more nodes)

**Create 10 design principles**:

- JSON-First
- Token-Efficient
- Structured Metadata
- Composable
- Ranked by Default
- Type-Safe
- Immutable by Default

**Approach A - Individual calls**:

- Time how long it takes
- Count copy-paste operations
- Document frustration level

**Approach B - Shell script workaround**:

```bash
for principle in "JSON-First" "Token-Efficient" ...; do
  texere_store_node "{...}"
done
```

**Approach C - Give up**:

- Document the pain
- Propose `store_nodes` batch API

**Goal**: Quantify batch operation pain.

---

### Phase 4: Query Testing (5 queries)

**Questions to answer**:

1. "What decisions were made?" - Search by type
2. "What supports the JSON-First principle?" - Graph traversal
3. "What are all the v2 recommendations?" - Tag search
4. "Why shouldn't we add edge context?" - Find reasoning chain
5. "What are the critical decisions?" - Filter by importance

**For each query**:

- Document the query used
- Note if it returned expected results
- Note if we had to retry with different terms

**Goal**: Validate that node/edge design enables natural queries.

---

### Phase 5: Complete Section (Conclusion section)

**Model the entire "Conclusion" section**:

- 5 bullet points under "Texere's design is correct"
- 4 bullet points under "Memory-Graph's mistake"
- 4 bullet points under "Texere should borrow"
- 1 summary statement

**Total**: ~14 nodes + edges

**Goal**: Test hierarchical modeling, anchor points, and full workflow.

---

## Success Criteria

**The test is successful if we produce**:

1. ✅ **Node type gap catalog** - List of content that doesn't fit existing types
2. ✅ **Edge type gap catalog** - List of relationships that can't be expressed
3. ✅ **Batch operation pain metrics** - Time taken, operations counted
4. ✅ **Title/content best practices** - Recommended format
5. ✅ **Tagging strategy** - What to tag vs what to type
6. ✅ **Scoring rubric** - How to assign importance/confidence
7. ✅ **Hierarchical modeling pattern** - How to represent document structure
8. ✅ **Workflow friction catalog** - Missing tooling identified
9. ✅ **Query validation** - Proof that graph answers natural questions
10. ✅ **Recommendations for v2** - Specific features to add

---

## Tracking Template

**Node Creation Log**:

| #   | Type     | Title                | Time | Friction      | Notes                                |
| --- | -------- | -------------------- | ---- | ------------- | ------------------------------------ |
| 1   | decision | Use JSON output      | 2m   | Copy-paste ID | Tried 3 title formats, A worked best |
| 2   | ???      | JSON-First principle | 5m   | No type fits  | Used `general`, feels wrong          |
| ... | ...      | ...                  | ...  | ...           | ...                                  |

**Edge Creation Log**:

| #   | Source | Target | Type Tried | Fit? | Final Type            |
| --- | ------ | ------ | ---------- | ---- | --------------------- |
| 1   | Node 1 | Node 3 | VALIDATES  | ⚠️   | MOTIVATED_BY          |
| 2   | Node 2 | Node 1 | ???        | ❌   | RELATED_TO (fallback) |
| ... | ...    | ...    | ...        | ...  | ...                   |

**Pain Points Log**:

| Category    | Issue                 | Frequency | Workaround   | Proposed Fix                     |
| ----------- | --------------------- | --------- | ------------ | -------------------------------- |
| ID tracking | Copy-paste node ID    | 15x       | Keep notes   | Return minimal `{id}` by default |
| Batch       | Individual calls slow | 1x        | Shell script | Add `store_nodes` API            |
| ...         | ...                   | ...       | ...          | ...                              |

---

## Open Questions

1. **Scope**: Sample (15 nodes) or full doc (40 nodes)?
2. **Persistence**: Actual DB or theoretical design?
3. **On-the-fly fixes**: Implement `store_nodes` during test, or just document need?
4. **Node type extensions**: Propose new types, or force-fit to existing?
5. **Tracking method**: Spreadsheet, markdown table, or dedicated doc?

---

## Next Steps

1. **Review this plan** - Adjust scope, methodology
2. **Set up tracking** - Create logs
3. **Phase 1** - Create 5 diverse nodes
4. **Analyze Phase 1** - Did we find what we expected?
5. **Continue through phases** - Iterate and refine
6. **Synthesize findings** - Write recommendations doc
