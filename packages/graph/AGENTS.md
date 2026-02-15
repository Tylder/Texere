# GRAPH PACKAGE (@texere/graph)

**Core graph database library** — SQLite + FTS5 + vector embeddings

## OVERVIEW

Public API facade (`Texere` class) over immutable node/edge graph with multi-mode search
(keyword/semantic/hybrid). 11 source files, 12 test files.

## STRUCTURE

```
src/
├── index.ts              # Public API (Texere class)
├── types.ts              # Enums, interfaces
├── db.ts                 # Database initialization
├── schema.ts             # DDL with FTS5 + vec tables
├── nodes.ts              # Node CRUD (storeNode, getNode, invalidateNode)
├── edges.ts              # Edge CRUD (createEdge, deleteEdge)
├── search.ts             # Multi-mode search (keyword/semantic/hybrid)
├── traverse.ts           # Graph traversal (recursive CTE)
├── embedder.ts           # Async embedding pipeline
├── replace-node.ts       # Transactional node replacement
├── sanitize.ts           # FTS5 query sanitization
└── *.test.ts             # 12 test files (unit + integration)
```

## WHERE TO LOOK

| Task                | File        | Key Function                         |
| ------------------- | ----------- | ------------------------------------ |
| Add node/edge types | `types.ts`  | Update enums + `VALID_ROLES_BY_TYPE` |
| Modify schema       | `schema.ts` | DDL constants                        |
| Add search mode     | `search.ts` | Update `detectSearchMode()`          |
| Optimize queries    | `*.ts`      | Check prepared statements cache      |
| Add validation      | `types.ts`  | Update `isValidTypeRole()`           |

## CONVENTIONS (Module-Specific)

### Internal Module Pattern

- Each module exports **single primary function** (e.g., `storeNode`, `search`)
- First param always `db: Database.Database`
- Texere class wraps functions, manages state (embedder, connection)
- No circular dependencies

### Prepared Statement Caching

```typescript
const statementsByDb = new WeakMap<Database.Database, Statements>();
```

- Statements prepared once per db instance
- WeakMap enables GC when db closed

### Batch Operations

- Single function handles both single + batch via overloads
- Max 50 items per batch (enforced)
- Atomic transactions: all-or-nothing

### Atomic Node+Edge Creation

- `storeNodesWithEdges()` creates nodes and edges in a single transaction
- temp_ids resolve within the call (call-scoped, not persisted)
- Delegates to existing `createEdge()` for edges (reuses REPLACES auto-invalidation)
- Composes with `insertNodeWithAnchors()` — auto-provenance + inline edges in same transaction

### Auto-Invalidation Pattern

```typescript
if (edge.type === EdgeType.Replaces) {
  statements.invalidateNode.run(now, edge.source_id);
}
```

- `REPLACES` edge auto-sets `invalidated_at` on source node
- Enforced in `edges.ts` at edge creation time

## UNIQUE PATTERNS

### Type-Role Constraint Matrix

```typescript
export const VALID_ROLES_BY_TYPE: Record<NodeType, readonly NodeRole[]>;
```

- Not just enums — validated at insertion
- Prevents invalid combinations (e.g., Issue + CodePattern)
- Checked before transaction opens

### Debounced Embedding Pipeline

- `schedulePending()`: Debounces multiple inserts → single batch
- `flushPending()`: Immediate before semantic search
- Batch via HuggingFace transformers (384-dim vectors)

### Search Mode Auto-Detection

```typescript
export const detectSearchMode = (query: string): ResolvedSearchMode
```

- Single token / ALL_CAPS → keyword
- Question prefix (how/why/what) → semantic
- 1-3 tokens with caps → keyword
- Otherwise → hybrid

### Hybrid Search (RRF)

- Reciprocal Rank Fusion: `1 / (60 + rank)`
- Merges keyword (FTS5 BM25) + semantic (vector)
- Deduplicates by ID, re-ranks

## ANTI-PATTERNS (Package-Specific)

- ❌ **Import internal modules directly** → Use Texere class
- ❌ **Mutate nodes** → Immutable; use `replaceNode()`
- ❌ **Batch >50 items** → Enforced limit
- ❌ **Skip embedding flush before semantic search** → Results incomplete
- ❌ **Hard-delete nodes** → Use `invalidateNode()` (soft-delete)

## CRITICAL PATTERNS FOR DEVELOPERS

### Always Use Texere Class

```typescript
// ✅ Correct
const texere = new Texere(':memory:');
const node = texere.storeNode({ ... });

// ❌ Wrong
import { storeNode } from '@texere/graph/src/nodes';
```

### Flush Embeddings Before Semantic Search

```typescript
// Embedder.flushPending() called automatically in search()
const results = await texere.search({ mode: 'semantic' });
```

### Batch for Performance

```typescript
// ✅ Single transaction
texere.storeNode([input1, input2, ...]);  // Up to 50

// ❌ 50 separate transactions
for (const input of inputs) texere.storeNode(input);
```

### Atomic Nodes + Edges

```typescript
// Atomic nodes + edges
const result = texere.storeNodesWithEdges(
  [
    {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      temp_id: 'd1',
      title: '...',
      content: '...',
    },
    {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      temp_id: 'f1',
      title: '...',
      content: '...',
    },
  ],
  [{ source_id: 'd1', target_id: 'f1', type: EdgeType.BasedOn }],
);
// result.nodes[0].temp_id === 'd1', result.edges[0].source_id === result.nodes[0].id
```

### Use Type-Role Validation

```typescript
if (isValidTypeRole(NodeType.Issue, NodeRole.Error)) {
  // Safe to create
}
```

## DATABASE SCHEMA HIGHLIGHTS

**Tables**: `nodes`, `edges`, `node_tags`, `nodes_fts` (FTS5), `nodes_vec` (vector)

**Indexes**: All filtered on `invalidated_at IS NULL`

- `idx_nodes_type`, `idx_nodes_role`, `idx_edges_source`, `idx_edges_target`

**Triggers**:

- `nodes_fts_ai`: Auto-insert into FTS5
- `nodes_vec_invalidate`: Auto-delete embedding when node invalidated

**Pragmas** (Required):

```sql
pragma journal_mode = WAL;
pragma synchronous = NORMAL;
pragma foreign_keys = ON;
```

## TESTING

- **12 test files** co-located next to source
- No mocking: Real SQLite (`:memory:`)
- Expensive setup: `beforeAll/afterAll` for embedding tests (30s timeout)

## NOTES

- **Large files (>500 lines)**: Only 5 total
- **Dependency graph**: Linear, no circular refs
- **Custom condition**: `@texere/source` for test source resolution
- **Export**: Dual (CJS + ESM) via `exports` field in package.json
