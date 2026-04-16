# @texere/graph

`@texere/graph` is Texere's core graph database library.

It provides an immutable, typed knowledge graph built on SQLite with full-text search, vector
embeddings, hybrid retrieval, and graph traversal.

## Why use `@texere/graph`

- local SQLite-backed graph storage with explicit structure
- immutable node replacement instead of in-place mutation
- typed node, role, and edge validation to reduce drift
- keyword, semantic, and hybrid retrieval in one API
- traversal and pagination for connected retrieval workflows

**Current status:** this package is publish-ready from the monorepo, but it is not available through
npm until the first release is published.

## What it is

Use this package if you want to create, query, traverse, and evolve a Texere graph directly from
TypeScript.

It handles:

- node and edge storage
- type-role validation
- immutable replacement semantics
- keyword, semantic, and hybrid retrieval
- recursive traversal with pagination
- embedding lifecycle management

The MCP server in [`apps/mcp`](../../apps/mcp/README.md) is built on top of this package.

## What you can do

The primary entry point is the `Texere` class exported from [`src/index.ts`](./src/index.ts).

| API                                               | Purpose                                               | Sync/async |
| ------------------------------------------------- | ----------------------------------------------------- | ---------- |
| `storeNode()`                                     | Create one or many nodes                              | sync       |
| `storeNodesWithEdges()`                           | Create nodes and edges atomically in one transaction  | sync       |
| `getNode()` / `getNodes()`                        | Fetch one or many nodes                               | sync       |
| `replaceNode()`                                   | Create a new node version and link it with `REPLACES` | sync       |
| `invalidateNode()` / `invalidateNodes()`          | Soft-invalidate nodes without hard delete             | sync       |
| `createEdge()` / `deleteEdge()` / `deleteEdges()` | Manage graph links                                    | sync       |
| `search()`                                        | Run keyword, semantic, hybrid, or auto-mode retrieval | async      |
| `traverse()`                                      | Walk the graph from a starting node                   | sync       |
| `searchGraph()`                                   | Search first, then traverse matching neighborhoods    | async      |
| `stats()`                                         | Get graph counts and metadata                         | sync       |

The package also exports the core modeling enums and related TypeScript types, including `NodeType`,
`NodeRole`, and `EdgeType`.

## Quick start

```typescript
import { EdgeType, NodeRole, NodeType, Texere } from '@texere/graph';

const main = async (): Promise<void> => {
  const db = new Texere('./texere.db');

  const decision = db.storeNode({
    type: NodeType.Knowledge,
    role: NodeRole.Decision,
    title: 'Use SQLite with WAL mode',
    content: 'Chosen for local-first durability and simple deployment.',
    tags: ['database', 'architecture'],
    importance: 0.9,
    confidence: 0.95,
  });

  const finding = db.storeNode({
    type: NodeType.Knowledge,
    role: NodeRole.Finding,
    title: 'WAL mode improves concurrent local access',
    content: 'Observed better write behavior for local-first workloads.',
    tags: ['database'],
    importance: 0.7,
    confidence: 0.9,
  });

  db.createEdge({
    source_id: decision.id,
    target_id: finding.id,
    type: EdgeType.BasedOn,
  });

  const results = await db.search({
    query: 'database architecture decisions',
    mode: 'hybrid',
    limit: 10,
  });

  const replacement = db.replaceNode({
    old_id: decision.id,
    type: NodeType.Knowledge,
    role: NodeRole.Decision,
    title: 'Use SQLite with WAL and immutable history',
    content: 'Refined after retrieval and traversal experiments.',
    tags: ['database', 'architecture', 'history'],
    importance: 0.95,
    confidence: 0.95,
  });

  console.log(results.results.length, replacement.id);
  db.close();
};

void main();
```

## Search model

Texere supports multiple retrieval paths because different queries need different behavior:

- **keyword** for exact terms and code-like lookups
- **semantic** for natural-language intent matching
- **hybrid** for fused ranking across both methods
- **auto** for query-shape-based mode selection

Search responses include cursor metadata so callers can page safely through large result sets.

## Traversal model

Traversal uses recursive CTEs over the graph and supports:

- outgoing, incoming, or bidirectional traversal
- depth limits
- edge-type filtering
- cursor pagination

`searchGraph()` combines search and traversal so you can retrieve relevant seeds and then expand
their neighborhood in one call.

## Immutability and replacement

Texere is intentionally immutable at the node level.

- Nodes are not updated in place.
- Replacements create a new node and a `REPLACES` edge.
- Replaced nodes are soft-invalidated instead of hard-deleted.

This keeps graph history explicit and makes changes easier to reason about in agent workflows.

## Local usage

From the repo root:

```bash
pnpm install
pnpm build
```

The package currently ships from this monorepo and is consumed locally through workspace wiring and
the built `dist/` output.

## Quality signals

- unit and integration tests live alongside the source
- real SQLite is used in tests instead of mocks
- strict TypeScript, linting, and formatting are part of the default workflow

That is the current supported public consumption path.
