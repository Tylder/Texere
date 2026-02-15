# Batch Store-and-Link API: Design Options

> **Context**: Texere ingestion benchmark (2026-02-15) identified manual ID bookkeeping as the #1
> ergonomic pain point. Agents creating 92 interconnected nodes made hundreds of tool calls, manually
> tracking generated IDs across calls to wire up edges. This document explores solutions.

---

## Design Constraint: Per-Type Tools as Agent Guidance

Texere deliberately uses 5 separate store tools (`texere_store_knowledge`, `texere_store_issue`,
`texere_store_action`, `texere_store_artifact`, `texere_store_source`) rather than one generic
`texere_store_node`. This is an intentional DX decision:

1. **Schema-level role constraints**: Each tool's Zod schema restricts the `role` enum to only the
   roles valid for that type. `texere_store_knowledge` shows `decision | finding | constraint |
   pitfall | principle | requirement`. The agent literally cannot see `error` or `code_pattern` as
   options — the schema prevents it.

2. **Type-specific content guidance**: Each tool's description explains what "good content" means
   for its type. Knowledge nodes need rationale and trade-offs. Issue nodes need symptoms and
   impact. Artifact nodes need implementation details.

3. **Reduced cognitive load**: An agent choosing between 6 roles is easier than choosing between 20.
   The type decision narrows the role decision.

4. **MCP schema limitation**: Texere's anti-pattern rules forbid `anyOf`/`oneOf`/`allOf` in MCP
   schemas. This means a unified tool's JSON Schema **cannot structurally encode** the type-role
   validity matrix. Validation would be server-side only — the agent gets no schema-level feedback
   about invalid combinations.

**Implication for batch API design**: Any batch tool with a flat `nodes[]` array accepting all 5
types loses this guidance. Solutions must either (a) preserve type-grouped structure, (b) accept
the guidance regression for power-user scenarios, or (c) find a hybrid approach.

This constraint is analyzed per-option below.

---

## Option 0: Status Quo (No Changes)

### How It Works Today

Agents use 5 per-type store tools (`texere_store_knowledge`, `texere_store_issue`,
`texere_store_action`, `texere_store_artifact`, `texere_store_source`) plus `texere_create_edge`.
Each store tool accepts a batch of nodes (max 50) of the **same type** and returns generated IDs.
Edges are created in a separate call referencing those IDs.

### Workflow

```
1. texere_store_knowledge({nodes: [{role: "decision", ...}, {role: "finding", ...}]})
   → { nodes: [{ id: "abc" }, { id: "def" }] }

2. texere_store_artifact({nodes: [{role: "concept", ...}]})
   → { nodes: [{ id: "ghi" }] }

3. texere_create_edge({edges: [
     { source_id: "abc", target_id: "def", type: "BASED_ON" },
     { source_id: "ghi", target_id: "abc", type: "EXAMPLE_OF" }
   ]})
```

### What Works

- Type safety enforced per tool (knowledge roles only in knowledge tool, etc.)
- Batch within same type (up to 50 nodes per call)
- Auto-provenance: `sources` and `anchor_to` fields auto-create source nodes + edges
- Atomic within each call (each store call is transactional)

### Pain Points (from benchmark)

- **Manual ID bookkeeping**: Agent must remember `abc`, `def`, `ghi` across calls to create edges
- **No cross-type batching**: Can't create a decision + a concept + an edge in one call
- **No atomicity across calls**: If call 3 fails, calls 1 and 2 already committed
- **High call volume**: 5 nodes across 3 types + edges = minimum 4 tool calls
- **Auto-provenance invisible**: `sources` auto-creates nodes/edges but response doesn't show them

### Implementation Effort

None (current state).

---

## Option 1: Existing Tools + Temp IDs + Inline Edges

### Concept

Enhance the existing per-type store tools to accept an **`edges` array alongside `nodes`**, where
edges can reference `temp_id` strings from nodes in the same call. Temp IDs are **scoped to the
single call** — they don't persist across calls and require no server-side state.

**No new tools.** Same 5 store tools + `texere_create_edge`. The store tools gain two capabilities:
`temp_id` on nodes and an optional `edges` array. `texere_create_edge` stays as-is for cross-type
edges.

### Workflow

```
1. texere_store_knowledge({
     nodes: [
       { temp_id: "d1", role: "decision", title: "Use Hono", ... },
       { temp_id: "f1", role: "finding",  title: "Hono is fast", ... }
     ],
     edges: [
       { source_id: "d1", target_id: "f1", type: "BASED_ON" }
     ]
   })
   → {
     nodes: [{ id: "abc", temp_id: "d1" }, { id: "def", temp_id: "f1" }],
     edges: [{ id: "edge-1", source_id: "abc", target_id: "def" }]
   }

2. texere_store_artifact({
     nodes: [
       { temp_id: "c1", role: "concept", title: "Middleware pipeline", ... }
     ],
     edges: [
       { source_id: "c1", target_id: "abc", type: "EXAMPLE_OF" }
     ]
   })
   → {
     nodes: [{ id: "ghi", temp_id: "c1" }],
     edges: [{ id: "edge-2", source_id: "ghi", target_id: "abc" }]
   }
```

### How Temp ID Resolution Works

Within a single store call, edge `source_id` and `target_id` can reference:

1. **A temp_id from this call's nodes** → resolved to the generated real ID
2. **An existing real ID in the database** → passed through as-is (verified to exist)

Temp IDs are **call-scoped only**. They don't leak between calls, don't persist server-side, and
can't reference nodes from other calls. This keeps the design fully stateless.

### Edge Reference Examples

```typescript
// Edge between two NEW nodes in this call (both temp_ids)
{ source_id: "d1", target_id: "f1", type: "BASED_ON" }

// Edge from a NEW node to an EXISTING node (temp_id + real ID)
{ source_id: "c1", target_id: "abc123-existing", type: "EXAMPLE_OF" }

// Edge between two EXISTING nodes (both real IDs — same as texere_create_edge)
{ source_id: "abc123", target_id: "def456", type: "RELATED_TO" }
```

### API Changes

**Input** (per-type store tools — all 5):

```typescript
{
  nodes: Array<{
    temp_id?: string;          // NEW: client-assigned, scoped to this call
    role: /* type-specific roles */,
    title: string;
    content: string;
    importance: number;
    confidence: number;
    tags?: string[];
    sources?: string[];
    anchor_to?: string[];
  }>;  // max 50

  edges?: Array<{              // NEW: optional edges array
    source_id: string;         // temp_id from this call's nodes OR existing real ID
    target_id: string;         // temp_id from this call's nodes OR existing real ID
    type: EdgeType;
  }>;  // max 50

  minimal?: boolean;
}
```

**Output**:

```typescript
{
  nodes: Array<{ id: string; temp_id?: string }>;     // temp_id echoed back
  edges?: Array<{ id: string; source_id: string; target_id: string; type: EdgeType }>;
  // edges show resolved real IDs
}
```

### Implementation

```typescript
function storeWithEdges(input: StoreInput): StoreResult {
  return db.transaction(() => {
    const tempToReal = new Map<string, string>();

    // 1. Store all nodes (existing logic + temp_id tracking)
    const storedNodes = input.nodes.map(node => {
      const result = storeNode(db, toStoreNodeInput(node));
      if (node.temp_id) tempToReal.set(node.temp_id, result.id);
      return { ...result, temp_id: node.temp_id };
    });

    // 2. Resolve temp_ids in edges and create them
    const storedEdges = (input.edges ?? []).map(edge => {
      const resolved = {
        source_id: tempToReal.get(edge.source_id) ?? edge.source_id,
        target_id: tempToReal.get(edge.target_id) ?? edge.target_id,
        type: edge.type,
      };
      // Verify resolved IDs exist (temp_id → real ID, or real ID in DB)
      return createEdge(db, resolved);
    });

    return { nodes: storedNodes, edges: storedEdges };
  }).immediate();
}
```

### What This Solves

- **Eliminates within-type ID bookkeeping**: Nodes and edges for the same type created in one call
- **Atomicity within type**: If any node or edge fails, the entire call rolls back
- **Cross-type edge creation**: Edges in call 2 can reference real IDs from call 1's response
- **Temp ID correlation**: Meaningful names (not positional indices) correlate inputs to outputs
- **Fully stateless**: No server-side state, no sessions, no cleanup

### What This Doesn't Solve

- **Cross-type atomicity**: If store_knowledge succeeds but store_artifact fails, the knowledge
  nodes are already committed. No rollback across calls.
- **No preview**: Agent commits per call. Can't preview the full multi-type graph before writing.
- **Cross-type edges still need real IDs**: Edges linking a knowledge node to an artifact node
  require the knowledge call's real IDs in the artifact call's edges. (But temp_id echo makes this
  ID collection much cleaner.)

### Typical Multi-Type Workflow

```
# Call 1: Create knowledge nodes + intra-knowledge edges
texere_store_knowledge({
  nodes: [
    { temp_id: "d1", role: "decision", ... },
    { temp_id: "f1", role: "finding", ... },
    { temp_id: "f2", role: "finding", ... }
  ],
  edges: [
    { source_id: "d1", target_id: "f1", type: "BASED_ON" },
    { source_id: "d1", target_id: "f2", type: "BASED_ON" }
  ]
}) → { nodes: [{id:"abc",temp_id:"d1"}, {id:"def",temp_id:"f1"}, {id:"ghi",temp_id:"f2"}], edges: [...] }

# Call 2: Create artifact nodes + edges linking to knowledge nodes (via real IDs from call 1)
texere_store_artifact({
  nodes: [
    { temp_id: "c1", role: "concept", ... },
    { temp_id: "e1", role: "example", ... }
  ],
  edges: [
    { source_id: "c1", target_id: "abc", type: "PART_OF" },   # c1 → real ID from call 1
    { source_id: "e1", target_id: "c1", type: "EXAMPLE_OF" }  # e1 → c1, both in this call
  ]
}) → { nodes: [...], edges: [...] }
```

**Result**: 5 nodes + 4 edges in 2 tool calls (vs 6+ calls today). Agent only manually tracks
IDs across calls, not within them. Temp_id echo makes cross-call tracking clean.

### Implementation Effort

**~6-10 hours.** Moderate change to all 5 store tools + core library support for temp_id resolution
within `storeNode` transaction + edge creation in same transaction. Tests for temp_id resolution,
cross-reference validation, error cases.

### Changes Required

| Layer | File | Change |
|-------|------|--------|
| Core library | `packages/graph/src/nodes.ts` | Extend `storeNode` to accept edges + resolve temp_ids |
| Core library | `packages/graph/src/types.ts` | `StoreNodeInput` gains `temp_id`; new `StoreWithEdgesInput` |
| MCP tools | `apps/mcp/src/tools/store-*.ts` (all 5) | Add `temp_id` to node schema, add `edges` array |
| MCP tools | `apps/mcp/src/tools/store-*.ts` (all 5) | Response mapping with temp_id echo + edges |
| Tests | `packages/graph/src/nodes.test.ts` | Temp_id + edge resolution unit tests |
| Tests | `apps/mcp/src/tools.test.ts` | Integration tests for all 5 store tools with edges |
| Skill doc | `.opencode/skills/texere/SKILL.md` | Document temp_id + edges in each store tool |

### Agent Guidance Impact

**Fully preserved.** Each per-type tool still constrains roles to its own type. The `temp_id` and
`edges` fields are purely additive. An agent that doesn't use them sees no difference. The
`edges` array uses the same EdgeType enum across all tools — it doesn't introduce type-specific
edge constraints (nor should it, since edges are type-agnostic).

### Risks

- **Schema size increase**: Each store tool's schema grows with the edges array. Agents see more
  parameters, but they're optional and clearly documented.
- **Edge validation complexity**: Must verify that edge source_id/target_id resolve to either a
  temp_id in this call OR an existing node in the DB. Invalid references cause the entire call to
  fail (atomic).
- **Backwards compatibility**: Fully backwards compatible. Existing calls without temp_id or edges
  work identically to today.

---

## Option 2: Single Batch Tool — `texere_ingest` *(Rejected: loses per-type guidance)*

### Concept

One new MCP tool that accepts **mixed-type** nodes and edges in a single call. Nodes carry `temp_id`
strings. Edges reference those temp_ids (or existing real IDs). Server resolves temp_ids to real IDs,
wraps everything in a single database transaction, returns the full ID mapping.

### Workflow

```
1. texere_ingest({
     nodes: [
       { temp_id: "d1", type: "knowledge", role: "decision", title: "Use Hono", ... },
       { temp_id: "f1", type: "knowledge", role: "finding",  title: "Hono is fast", ... },
       { temp_id: "c1", type: "artifact",  role: "concept",  title: "Middleware pipeline", ... }
     ],
     edges: [
       { source_id: "d1", target_id: "f1", type: "BASED_ON" },
       { source_id: "c1", target_id: "d1", type: "EXAMPLE_OF" }
     ]
   })
   → {
     nodes: [
       { id: "abc", temp_id: "d1" },
       { id: "def", temp_id: "f1" },
       { id: "ghi", temp_id: "c1" }
     ],
     edges: [
       { id: "edge-1", source_id: "abc", target_id: "def", type: "BASED_ON" },
       { id: "edge-2", source_id: "ghi", target_id: "abc", type: "EXAMPLE_OF" }
     ]
   }
```

### API Shape

```typescript
// Input
{
  nodes: Array<{
    temp_id?: string;            // Client-assigned, for edge cross-references
    type: NodeType;              // "knowledge" | "issue" | "action" | "artifact" | "source"
    role: NodeRole;              // Validated against type (e.g., knowledge → decision)
    title: string;
    content: string;
    importance: number;          // 0-1
    confidence: number;          // 0-1
    tags?: string[];
    sources?: string[];          // Auto-creates Source nodes + BASED_ON edges
    anchor_to?: string[];        // Auto-creates ANCHORED_TO edges
  }>;  // max 50

  edges?: Array<{
    source_id: string;           // temp_id from this batch OR existing real ID
    target_id: string;           // temp_id from this batch OR existing real ID
    type: EdgeType;              // "RESOLVES" | "DEPENDS_ON" | "BASED_ON" | etc.
  }>;  // max 50

  minimal?: boolean;             // true = return only IDs, false = full objects
}

// Output (minimal: true)
{
  nodes: Array<{ id: string; temp_id?: string }>;
  edges: Array<{ id: string }>;
}

// Output (minimal: false)
{
  nodes: Array<Node & { temp_id?: string }>;
  edges: Array<Edge>;
}
```

### Implementation

Server-side logic (pseudocode):

```typescript
function ingest(input: IngestInput): IngestResult {
  // 1. Pre-flight validation
  validateTypeRoleMatrix(input.nodes);
  validateTempIdUniqueness(input.nodes);
  validateEdgeReferences(input.nodes, input.edges, db);  // temp_ids + real IDs

  // 2. Atomic transaction
  return db.transaction(() => {
    const tempToReal = new Map<string, string>();

    // 3. Store all nodes (respects sources/anchor_to auto-provenance)
    const storedNodes = input.nodes.map(node => {
      const result = storeNode(db, toStoreNodeInput(node));
      if (node.temp_id) tempToReal.set(node.temp_id, result.id);
      return { ...result, temp_id: node.temp_id };
    });

    // 4. Resolve temp_ids in edges and create them
    const storedEdges = (input.edges ?? []).map(edge => {
      const resolved = {
        source_id: tempToReal.get(edge.source_id) ?? edge.source_id,
        target_id: tempToReal.get(edge.target_id) ?? edge.target_id,
        type: edge.type,
      };
      return createEdge(db, resolved);
    });

    return { nodes: storedNodes, edges: storedEdges };
  }).immediate();
}
```

### What This Solves

- **Eliminates ID bookkeeping entirely**: Agent assigns meaningful temp_ids, references them in
  edges, server resolves everything
- **Single tool call**: One call creates the entire subgraph
- **Cross-type batching**: Mix knowledge, artifact, issue nodes in one call
- **Full atomicity**: If any node or edge fails, nothing is written
- **Preserves auto-provenance**: `sources` and `anchor_to` work exactly as today

### What This Doesn't Solve

- **No preview**: Agent commits blind. If the graph has issues, must invalidate and retry.
- **50-node batch limit**: Large ingestions still need multiple calls (but each call is self-contained)
- **Auto-provenance still invisible**: Response shows created nodes/edges but not auto-provenance
  (though this could be addressed separately)

### Implementation Effort

**~8-12 hours.** New MCP tool + core library helper + tests + SKILL.md update.

### Changes Required

| Layer | File | Change |
|-------|------|--------|
| Core library | `packages/graph/src/ingest.ts` (new) | Batch ingest function with temp_id resolution |
| Core library | `packages/graph/src/index.ts` | Add `ingest()` method to Texere class |
| MCP tool | `apps/mcp/src/tools/ingest.ts` (new) | New `texere_ingest` tool definition |
| MCP tool | `apps/mcp/src/tools/index.ts` | Register new tool |
| Types | `packages/graph/src/types.ts` | `IngestInput`, `IngestResult` types |
| Tests | `packages/graph/src/ingest.test.ts` (new) | Unit tests for ingest logic |
| Tests | `apps/mcp/src/tools.test.ts` | Integration tests for MCP tool |
| Skill doc | `.opencode/skills/texere/SKILL.md` | Document new tool |

### Agent Guidance Impact

**Significant regression.** A flat `nodes[]` array with all 5 types and 20 roles in a single schema
means the agent loses schema-level guidance about which roles are valid for which type. The JSON
Schema shows `role: "constraint" | "decision" | ... | "error" | "problem" | ... | "code_pattern" |
...` — all 20 values regardless of the `type` field.

**Mitigations:**
- Server-side validation catches invalid type-role combinations (agent gets error, retries)
- SKILL.md documents the type-role matrix (agent must consult docs, not schema)
- Tool description can include a condensed type-role reference

**Variant — Type-Grouped Input:** Instead of flat `nodes[]`, structure input by type:

```typescript
{
  knowledge?: Array<{ temp_id?, role: "decision" | "finding" | ..., ... }>;  // max 50 total
  issues?:    Array<{ temp_id?, role: "error" | "problem", ... }>;
  actions?:   Array<{ temp_id?, role: "command" | "solution" | ..., ... }>;
  artifacts?: Array<{ temp_id?, role: "code_pattern" | "concept" | ..., ... }>;
  sources?:   Array<{ temp_id?, role: "web_url" | "file_path" | ..., ... }>;
  edges?:     Array<{ source_id, target_id, type }>;
}
```

This preserves per-type role constraints in the schema — each group only shows valid roles. Edges
reference temp_ids across all groups. Trade-off: more complex schema, harder to construct for
agents, but structurally correct.

### Risks

- **Guidance regression** (flat variant): Agent sees all 20 roles with no structural constraint.
  See mitigations above.
- **Schema complexity** (grouped variant): Nested type-grouped structure is more complex to construct
  but preserves per-type role guidance.
- **MCP schema limitation**: Flat variant has `anyOf`-like behavior. Grouped variant avoids this
  by using separate properties per type.
- **50+50 limit**: 50 nodes + 50 edges may not be enough for very large ingestions. Acceptable for
  now; agents can call multiple times.

---

## Option 3: Validate + Commit Cycle *(Rejected: same guidance regression as Option 2)*

### Concept

Two stateless tools that work together. `texere_validate` is enhanced to return a rich preview
(generated IDs, statistics, warnings). A new `texere_commit` tool accepts the same schema and
writes atomically. Agent calls validate to preview, adjusts if needed, then commits.

**Both tools accept the same schema as Option 2's `texere_ingest`.** The difference is that
validate is a dry run.

### Workflow

```
1. texere_validate({
     nodes: [
       { temp_id: "d1", type: "knowledge", role: "decision", ... },
       { temp_id: "f1", type: "knowledge", role: "finding", ... }
     ],
     edges: [
       { source_id: "d1", target_id: "f1", type: "BASED_ON" }
     ]
   })
   → {
     valid: true,
     issues: [],
     preview: {
       nodes: [
         { temp_id: "d1", type: "knowledge", role: "decision", title: "Use Hono" },
         { temp_id: "f1", type: "knowledge", role: "finding", title: "Hono is fast" }
       ],
       edges: [
         { source_id: "d1", target_id: "f1", type: "BASED_ON" }
       ],
       stats: { nodes: 2, edges: 1, by_type: { knowledge: 2 } },
       auto_provenance: {
         source_nodes: ["source:web:https://hono.dev"],
         anchored_to: []
       }
     }
   }

2. Agent reviews preview, adjusts if needed, then:

3. texere_commit({
     nodes: [...same as above...],
     edges: [...same as above...]
   })
   → {
     nodes: [
       { id: "abc", temp_id: "d1" },
       { id: "def", temp_id: "f1" }
     ],
     edges: [
       { id: "edge-1", source_id: "abc", target_id: "def", type: "BASED_ON" }
     ]
   }
```

### API Shape

**`texere_validate`** (enhanced — same input as Option 2, richer output):

```typescript
// Input: Same schema as texere_ingest (nodes[] + edges[] + temp_ids)

// Output (enhanced):
{
  valid: boolean;
  issues: Array<{
    severity: "error" | "warning";
    item: "node" | "edge";
    index: number;
    message: string;
    temp_id?: string;               // NEW: reference back to agent's temp_id
  }>;
  preview: {                        // NEW: full preview of what would be created
    nodes: Array<{ temp_id, type, role, title }>;
    edges: Array<{ source_id, target_id, type }>;  // still using temp_ids
    stats: {
      nodes: number;
      edges: number;
      by_type: Record<NodeType, number>;
      by_role: Record<NodeRole, number>;
    };
    auto_provenance: {              // NEW: shows what sources/anchor_to will create
      source_nodes: string[];       // deterministic IDs that will be created
      anchored_to: string[];
    };
  };
}
```

**`texere_commit`** (new tool — same input as validate, same output as ingest):

```typescript
// Input: Same schema as texere_ingest / texere_validate
// Output: Same as Option 2's texere_ingest response
```

### What This Solves

- **Everything Option 2 solves** (ID bookkeeping, cross-type batching, atomicity)
- **Preview before commit**: Agent sees validation issues, statistics, and auto-provenance
  before writing anything
- **Provenance visibility**: Preview shows what `sources`/`anchor_to` will auto-create (fixes
  friction point from benchmark)
- **Stateless**: No server-side state. Both tools are pure functions.

### What This Doesn't Solve

- **Duplicate payload**: Agent sends the same nodes/edges twice (validate, then commit). For large
  batches this is redundant but not practically problematic (50 nodes is small).
- **No incremental building**: Agent must hold the full graph in context. Can't stage a few nodes,
  search the DB, then stage more based on results.
- **No server-side persistence between calls**: If agent's context is lost between validate and
  commit, the graph is gone.

### Implementation Effort

**~10-15 hours.** Enhance validate tool + new commit tool + preview response + tests + docs.

### Changes Required

| Layer | File | Change |
|-------|------|--------|
| Core library | `packages/graph/src/ingest.ts` (new) | Same as Option 2 (shared with commit) |
| Core library | `packages/graph/src/index.ts` | Add `ingest()` method |
| MCP tool | `apps/mcp/src/tools/validate.ts` | Enhance with preview response |
| MCP tool | `apps/mcp/src/tools/commit.ts` (new) | New `texere_commit` tool |
| MCP tool | `apps/mcp/src/tools/index.ts` | Register new tool |
| Types | `packages/graph/src/types.ts` | Shared input/output types |
| Tests | `packages/graph/src/ingest.test.ts` (new) | Unit tests |
| Tests | `apps/mcp/src/tools.test.ts` | Integration tests for both tools |
| Skill doc | `.opencode/skills/texere/SKILL.md` | Document both tools |

### Agent Guidance Impact

**Same as Option 2** — validate and commit share the same input schema. The type-grouped variant
applies equally here. If Option 2 uses grouped input, Option 3 inherits it.

One additional consideration: the validate tool already exists and currently accepts a flat
`nodes[]` with `type` + `role` fields (no per-type grouping). Changing to a grouped structure
would be a breaking change to the existing validate API. Keeping flat maintains backwards
compatibility but accepts the guidance regression.

### Risks

Same as Option 2 plus: risk that agents skip validate and call commit directly (acceptable — commit
still validates internally before writing).

---

## Option 4: Staged Transaction (tx_id on Existing Tools)

### Concept

Add an optional `tx_id` parameter to the **existing** per-type store tools and `texere_create_edge`.
When `tx_id` is present, nodes and edges are **staged** (not committed) into a server-side
transaction buffer. Only 3 new tools are needed: `texere_tx_begin`, `texere_tx_preview`, and
`texere_tx_commit`.

**Key design**: Option 1 and Option 4 share the same tool schema. The `tx_id` field is what
switches behavior:

- **Without `tx_id`** → Option 1 behavior. Temp IDs are call-scoped. Commits immediately.
- **With `tx_id`** → Option 4 behavior. Temp IDs are **transaction-scoped** (accumulated across
  calls). Nothing commits until `texere_tx_commit`.

This means Option 1 is a direct prerequisite for Option 4. Implementing Option 1 first lays the
foundation; adding `tx_id` support later is an incremental enhancement to the same tools.

### Workflow

```
1. texere_tx_begin()
   → { tx_id: "tx_a1b2c3", expires_at: 1708001800000 }

2. texere_store_knowledge({
     tx_id: "tx_a1b2c3",        ← transaction mode
     nodes: [
       { temp_id: "d1", role: "decision", title: "Use Hono", ... },
       { temp_id: "f1", role: "finding",  title: "Hono is fast", ... }
     ],
     edges: [
       { source_id: "d1", target_id: "f1", type: "BASED_ON" }
     ]
   })
   → { staged: { nodes: 2, edges: 1, total_nodes: 2, total_edges: 1 } }

3. // Agent searches the real DB for related nodes (between staging calls)
   texere_search({ query: "web framework" })
   → { results: [{ id: "existing-123", title: "Express.js concept", ... }] }

4. texere_store_artifact({
     tx_id: "tx_a1b2c3",        ← same transaction
     nodes: [
       { temp_id: "c1", role: "concept", title: "Middleware pipeline", ... }
     ],
     edges: [
       { source_id: "c1", target_id: "d1", type: "PART_OF" },        ← cross-type: temp_id from call 2
       { source_id: "c1", target_id: "existing-123", type: "RELATED_TO" }  ← real ID from search
     ]
   })
   → { staged: { nodes: 1, edges: 2, total_nodes: 3, total_edges: 3 } }

5. texere_tx_preview({ tx_id: "tx_a1b2c3" })
   → {
     nodes: [
       { temp_id: "d1", type: "knowledge", role: "decision", title: "Use Hono" },
       { temp_id: "f1", type: "knowledge", role: "finding", title: "Hono is fast" },
       { temp_id: "c1", type: "artifact",  role: "concept",  title: "Middleware pipeline" }
     ],
     edges: [
       { source_id: "d1", target_id: "f1", type: "BASED_ON" },
       { source_id: "c1", target_id: "d1", type: "PART_OF" },
       { source_id: "c1", target_id: "existing-123", type: "RELATED_TO" }
     ],
     stats: { nodes: 3, edges: 3, by_type: { knowledge: 2, artifact: 1 } },
     valid: true,
     issues: []
   }

6. texere_tx_commit({ tx_id: "tx_a1b2c3" })
   → {
     nodes: [
       { id: "abc", temp_id: "d1" },
       { id: "def", temp_id: "f1" },
       { id: "ghi", temp_id: "c1" }
     ],
     edges: [{ id: "edge-1" }, { id: "edge-2" }, { id: "edge-3" }]
   }

   OR: texere_tx_discard({ tx_id: "tx_a1b2c3" })
   → { discarded: true }
```

### Temp ID Scoping: Call vs Transaction

| Scenario | Temp ID Scope | Behavior |
|----------|--------------|----------|
| `texere_store_knowledge({ nodes, edges })` | **Call-scoped** | Temp IDs valid within this call only. Commits immediately. (Option 1) |
| `texere_store_knowledge({ tx_id, nodes, edges })` | **Transaction-scoped** | Temp IDs valid across ALL calls in this transaction. Staged, not committed. (Option 4) |

When `tx_id` is present, edges can reference:
1. **Temp IDs from THIS call** → resolved within the staging call
2. **Temp IDs from ANY PRIOR call in the same transaction** → resolved from transaction buffer
3. **Existing real IDs in the database** → passed through, verified to exist

### API Shape

**Existing tools gain `tx_id`** (all 5 store tools + `texere_create_edge`):

```typescript
// SAME schema as Option 1, plus one optional field:
{
  tx_id?: string;            // NEW: if present, stage instead of commit

  nodes: Array<{
    temp_id?: string;
    role: /* type-specific roles */,
    title: string;
    content: string;
    importance: number;
    confidence: number;
    tags?: string[];
    sources?: string[];
    anchor_to?: string[];
  }>;

  edges?: Array<{
    source_id: string;       // temp_id (call or tx scoped) OR real ID
    target_id: string;
    type: EdgeType;
  }>;
}

// Output WITHOUT tx_id (Option 1 — immediate commit):
{
  nodes: Array<{ id: string; temp_id?: string }>;
  edges?: Array<{ id: string; source_id: string; target_id: string; type: EdgeType }>;
}

// Output WITH tx_id (Option 4 — staged):
{
  staged: {
    nodes: number;
    edges: number;
    total_nodes: number;
    total_edges: number;
  };
  issues: ValidationIssue[];   // immediate validation feedback
}
```

**3 new tools**:

**`texere_tx_begin`** — Create a new transaction:

```typescript
// Input
{ }

// Output
{
  tx_id: string;
  expires_at: number;     // Unix timestamp
}
```

**`texere_tx_preview`** — View the full staged graph:

```typescript
// Input
{ tx_id: string }

// Output
{
  nodes: Array<{ temp_id, type, role, title, content }>;
  edges: Array<{ source_id, target_id, type }>;  // still using temp_ids
  stats: {
    nodes: number;
    edges: number;
    by_type: Record<NodeType, number>;
    by_role: Record<NodeRole, number>;
  };
  valid: boolean;
  issues: ValidationIssue[];
  auto_provenance: {
    source_nodes: string[];
    anchored_to: string[];
  };
}
```

**`texere_tx_commit`** — Atomically write everything (or discard):

```typescript
// Input
{
  tx_id: string;
  action: "commit" | "discard";   // explicit choice
}

// Output (commit)
{
  nodes: Array<{ id: string; temp_id?: string }>;
  edges: Array<{ id: string }>;
}

// Output (discard)
{ discarded: true }
```

### Server-Side State Management

```typescript
interface StagedTransaction {
  id: string;
  nodes: StagedNode[];
  edges: StagedEdge[];
  createdAt: number;
  lastAccessedAt: number;
}

// In-memory storage (per MCP server instance)
const transactions = new Map<string, StagedTransaction>();

// Cleanup: periodic interval
const IDLE_TIMEOUT = 5 * 60 * 1000;    // 5 minutes of inactivity
const MAX_LIFETIME = 30 * 60 * 1000;   // 30 minutes hard limit
const CLEANUP_INTERVAL = 60 * 1000;    // Check every minute

setInterval(() => {
  const now = Date.now();
  for (const [id, tx] of transactions) {
    if (now - tx.lastAccessedAt > IDLE_TIMEOUT || now - tx.createdAt > MAX_LIFETIME) {
      transactions.delete(id);
    }
  }
}, CLEANUP_INTERVAL);
```

### What This Solves

- **Everything Option 1 solves** (temp_ids, inline edges, per-type guidance)
- **Cross-type atomicity**: Entire graph (all types, all edges) committed in one transaction
- **Transaction-scoped temp_ids**: Temp IDs from call 2 referencing call 4's nodes — all resolved
  at commit time
- **Incremental building with inline edges**: Each staging call creates nodes AND their edges
  together, just like Option 1 — but staged instead of committed
- **Interleaved search**: Agent can search the real DB between staging calls to find existing nodes,
  then stage edges linking to those real IDs
- **Preview before commit**: Agent reviews the full accumulated graph before writing anything
- **Discard capability**: If preview reveals issues, agent discards the entire transaction

### What This Doesn't Solve

- **Server-side state complexity**: Memory management, abandoned transactions, cleanup
- **No session isolation in MCP**: MCP protocol has no client identity. If two agents use the same
  Texere server, transactions could collide. Mitigated by UUID tx_ids, but no true isolation.
- **Lost state on restart**: In-memory transactions are lost if MCP server restarts
- **Agent must track tx_id**: Agent must remember and pass `tx_id` in every call (though this is
  one ID vs dozens)

### Implementation Effort

**~15-20 hours** (builds on Option 1 as prerequisite). 3 new tools + staging buffer + tx_id
branching in existing store tools + cleanup logic + tests + docs.

This is significantly less than the original Option 4 estimate (25-35h) because:
- No new per-type staging tools needed (existing tools gain `tx_id`)
- Inline edge support already implemented in Option 1
- Only 3 new tools (begin, preview, commit) vs 6

### Changes Required (incremental from Option 1)

| Layer | File | Change |
|-------|------|--------|
| MCP app | `apps/mcp/src/staging.ts` (new) | StagedTransaction class + Map + cleanup |
| MCP app | `apps/mcp/src/server.ts` | Add staging buffer to ToolContext |
| MCP tools | `apps/mcp/src/tools/store-*.ts` (all 5) | Add `tx_id` branching: if present → stage, else → commit (Option 1) |
| MCP tools | `apps/mcp/src/tools/create-edge.ts` | Add `tx_id` branching |
| MCP tool | `apps/mcp/src/tools/tx-begin.ts` (new) | Create transaction |
| MCP tool | `apps/mcp/src/tools/tx-preview.ts` (new) | Preview staged graph |
| MCP tool | `apps/mcp/src/tools/tx-commit.ts` (new) | Commit or discard |
| MCP tool | `apps/mcp/src/tools/index.ts` | Register 3 new tools |
| MCP tool | `apps/mcp/src/tools/types.ts` | Extend ToolContext with staging |
| Core library | `packages/graph/src/ingest.ts` (new) | Batch commit function (takes accumulated staged nodes + edges) |
| Tests | Multiple files | Staging, preview, commit, cleanup, temp_id scoping |
| Skill doc | `.opencode/skills/texere/SKILL.md` | Document tx_id workflow |

### Risks

- **Memory leaks**: Abandoned transactions accumulate. Mitigated by cleanup interval (5min idle,
  30min hard limit), but requires monitoring.
- **Concurrency**: Two agents using same server have independent transactions (OK via UUID tx_ids)
  but no resource locking.
- **Moderate tool count increase**: Goes from 15 to 18 tools (not 21). More manageable.
- **Complexity budget**: ~2x effort of Option 1 for preview/discard/cross-type-atomicity. Justified
  if agents frequently need these capabilities.
- **Lost on restart**: In-memory state doesn't survive server restarts.

### Agent Guidance Impact

**Fully preserved.** This is the defining advantage of the tx_id-on-existing-tools design. The
agent uses `texere_store_knowledge`, `texere_store_artifact`, etc. — the same tools with the same
per-type role constraints. The only addition is `tx_id` (one optional string field) and `edges`
(from Option 1). No new type-agnostic tools that expose all 20 roles.

```
texere_store_knowledge({ tx_id: "tx_abc", nodes: [...], edges: [...] })  // guided + staged
texere_store_artifact({ tx_id: "tx_abc", nodes: [...], edges: [...] })   // guided + staged
texere_tx_preview({ tx_id: "tx_abc" })                                   // review everything
texere_tx_commit({ tx_id: "tx_abc", action: "commit" })                  // atomic write
```

The agent never encounters a tool where `role` is an unconstrained 20-value enum.

---

## Comparison Matrix

| | Option 0 | Option 1 | Option 2 | Option 3 | Option 4 |
|---|---|---|---|---|---|
| | Status Quo | + Temp IDs + Edges | Ingest Tool | Validate+Commit | Transaction |
| **Tool calls (5 nodes, 3 types)** | 4-6 | 2-3 | 1 | 2 | 3-8 |
| **Within-type ID bookkeeping** | Manual | Eliminated | Eliminated | Eliminated | Eliminated |
| **Cross-type ID bookkeeping** | Manual | Reduced (temp_id echo) | Eliminated | Eliminated | Eliminated |
| **Cross-type batching** | No | No (but edges can ref other types) | Yes | Yes | Yes |
| **Atomicity within type** | Yes | Yes | Yes | Yes | Yes |
| **Atomicity across types** | No | No | Yes | Yes | Yes |
| **Preview before commit** | No | No | No | Yes | Yes |
| **Incremental building** | N/A | N/A | No | No | Yes |
| **Interleaved search** | Yes (between calls) | Yes (between calls) | No | No | Yes |
| **Edit before commit** | N/A | N/A | No | Resend | Unstage |
| **Server statefulness** | None | None | None | None | In-memory |
| **Agent guidance preserved** | Full | Full | Regressed / Partial | Same as Opt 2 | Full (tx_id variant) |
| **New tools** | 0 | 0 | 1 | 1-2 | 3 (tx_id) or 5-6 |
| **Total tools** | 15 | 15 | 16 | 16-17 | 18 or 20-21 |
| **Effort** | 0h | 6-10h | 8-12h | 10-15h | 15-20h (tx_id) or 25-35h |
| **Risk** | None | Low | Low | Low | Medium |
| **Backwards compatible** | N/A | Yes | Yes | Yes | Yes |

---

## Composability

These options are not mutually exclusive. They can be layered:

- **Option 1 + Option 2**: Add temp_id echoing to existing tools AND add a new ingest tool. Agents
  choose their preferred workflow per task.
- **Option 2 + Option 3**: `texere_ingest` for quick one-shot, `texere_validate`+`texere_commit`
  for when preview matters. Both use the same core `ingest()` function.
- **Option 3 now, Option 4 later**: Ship validate+commit (stateless). If agents demonstrate a need
  for incremental staging (e.g., very large or exploratory ingestions), add transactions as a
  separate capability.

---

## Recommendation Considerations

### The Guidance Dimension

The per-type tool design is a deliberate pedagogical choice. Any solution that collapses 5 tools
into 1 unified schema sacrifices schema-level agent guidance. This isn't just a minor DX detail —
it's a core design principle that makes Texere approachable for agents that haven't deeply studied
the type system.

Two design philosophies emerge:

**"Preserve guidance, add transactions"** (Options 1 and 4-tx_id variant):
Keep per-type tools as the primary interface. Enhance them with `temp_id` (Option 1) or
`tx_id` (Option 4 variant). Agent uses the same tools it already knows. The guidance stays intact.
Transaction capabilities are layered on top, not replacing existing tools.

**"Add a power tool for bulk operations"** (Options 2 and 3):
Accept that bulk ingestion is a different workflow than exploratory node creation. The per-type
tools remain for normal use; the ingest/commit tool is for batch operations where the agent has
already decided what to create. Guidance regression is acceptable because the agent is in "bulk
mode" and has already committed to its decisions.

### When Option 1 is the sweet spot
Option 1 is now substantially more powerful than a simple temp_id echo. With inline edges that
resolve call-scoped temp_ids, agents can create entire same-type subgraphs atomically in one call,
then link across types using real IDs from prior responses. The benchmark's 92-node ingestion would
go from hundreds of calls to ~10-15 (one per type-batch + a few cross-type edge calls). Within-type
ID bookkeeping is fully eliminated. Cross-type bookkeeping is reduced to clean temp_id-correlated
ID collection.

**Preserves all guidance. Low risk. Moderate effort. Natural extension of existing tools.**

### When Option 2 is the sweet spot
If the primary workflow is "prepare a graph fragment and push it" — which describes most
documentation ingestion — a single atomic tool that handles mixed types + edges + temp_ids solves
the problem cleanly with minimal complexity. **Accepts guidance regression as a trade-off for
batch ergonomics.**

### When Option 3 adds real value
If agents frequently create graphs that turn out to have issues (wrong edges, duplicate nodes,
missing connections), the ability to validate and preview before committing prevents wasted
invalidation/replacement cycles. Also surfaces auto-provenance visibility. **Same guidance
trade-off as Option 2.**

### When Option 4 (tx_id variant) is the right architecture
If agents need to interleave graph building with search (e.g., "store concept A, search for related
concepts, create edges to what I find, store concept B that depends on search results"), AND you
want to preserve per-type tool guidance, the `tx_id` variant is the cleanest design. Existing tools
gain an optional `tx_id` parameter. Only 3 new tools (begin, preview, commit). Agent uses familiar
tools in a new mode. **Full guidance preserved. Moderate complexity.**

### Composability Note
Option 1 is a prerequisite for Option 4's tx_id variant — the per-type tools need temp_id + edges
support to enable cross-type edge references within a transaction. So Option 1 is always a good
first step, regardless of where we go next. Its implementation directly feeds into Option 4 if
transactional staging is later needed.
