# Draft: Batch Store-and-Link API

## Problem Statement

Benchmark found that creating interconnected nodes requires manual ID bookkeeping across many tool calls. For a 92-node ingestion, agents made hundreds of calls tracking IDs by hand. The #1 ergonomic pain point.

## Requirements (confirmed)

- Agents need to create nodes of MIXED types + edges in fewer operations
- Temp IDs must resolve to real IDs server-side
- Must be atomic (all-or-nothing)
- Must preserve existing auto-provenance (sources, anchor_to)

## Design Axes

### Axis 1: One-Shot Batch vs Staged Transaction

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| **One-shot batch** | Single tool call: nodes[] + edges[] with temp_ids | Simple, stateless, atomic by nature | Agent can't preview/refine before commit |
| **Staged transaction** | Multi-call: begin → add nodes → add edges → preview → commit | Agent sees graph evolving, can course-correct | Server-side state, cleanup needed, MCP statefulness |

### Axis 2: New Tool vs Enhanced Existing

| Approach | Description |
|----------|-------------|
| **New `texere_ingest` tool** | Single new tool alongside existing 5 store tools |
| **Evolve `texere_validate` → `texere_commit`** | validate already has temp_id + mixed types + edges; add `commit: true` mode |
| **Multi-tool staging** | `texere_begin_batch`, `texere_stage_node`, `texere_stage_edge`, `texere_preview_batch`, `texere_commit_batch` |

## Research Findings

### From Codebase Exploration (Agent 1)
- `texere_validate` already accepts mixed-type nodes + edges with temp_id resolution
- `db.transaction(() => { ... }).immediate()` pattern exists for atomic operations
- `storeNode()` already supports batch arrays (max 50)
- `createEdge()` already supports batch arrays (max 50)
- Prepared statement caching via WeakMap pattern

### From Auto-Provenance Exploration (Agent 2)
- sources/anchor_to processing happens in core graph library (`insertNodeWithAnchors`)
- Auto-created nodes/edges are NOT visible in responses (confirmed friction point)
- Processing is already transactional within storeNode
- Deterministic IDs for source nodes (`source:web:URL`) enable idempotency

### From External Research (Agent 3)
- Neo4j uses UNWIND for batch, HTTP API for staged transactions
- JSON:API Atomic Operations uses `lid` (local ID) — very close to temp_id
- All-or-nothing recommended for graph consistency
- Batch limit of 50 items is industry standard
- Response should echo temp_id alongside real id for correlation

### From Staged Transaction Research (Agent 4)
- Neo4j HTTP API: explicit tx lifecycle (POST /tx → get txId → send statements → commit/rollback)
- Shopping cart pattern (WooCommerce): session-based accumulation with Cart-Token header
- Contentful CMS: draft → publish states with preview API
- Key finding: stateless batch + validation is simpler for MCP; transaction-based adds significant complexity
- Timeout strategy if stateful: 5min sliding window, 30min hard limit, periodic cleanup

### From Staging Feasibility Exploration (Agent 5)
- ToolContext is shared across all tool calls — CAN be extended with staging buffer
- MCP server is single long-lived instance — CAN hold in-memory state
- Embedder class already uses debounced in-memory staging (precedent exists!)
- BUT: no session isolation, no client identity in MCP protocol
- BUT: MCP doesn't provide session/client IDs — would need custom scheme
- Estimated effort: 20-30 hours for full staging vs ~8-12 hours for stateless batch

## Resolved Questions
- ✅ MCP server CAN hold state (via ToolContext extension) — but has no built-in session isolation
- ✅ Cleanup: periodic interval + timeout + hard max lifetime
- ✅ Staging feasible but 2-3x the effort of stateless batch
- ⏳ PENDING: Is the preview/refine capability worth the complexity?
