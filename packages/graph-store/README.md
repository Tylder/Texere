# @repo/graph-store

GraphStore interface and in-memory adapter for the Texere graph system.

## Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TEXERE GRAPH SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              Data Flow                                      │
│                                                                             │
│   ┌─────────────┐                                                          │
│   │   Source    │                                                          │
│   │  (GitHub)   │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    @repo/graph-ingest                           │      │
│   │              (Orchestration + Connector Interface)              │      │
│   └─────────────────────────────┬───────────────────────────────────┘      │
│                                 │                                           │
│                                 │ passes store instance                     │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │  @repo/graph-ingest-connector-scip-ts                           │      │
│   │  (Writes nodes/edges to store)                                  │      │
│   └─────────────────────────────┬───────────────────────────────────┘      │
│                                 │                                           │
│                                 │ store.putNode() / store.putEdge()         │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                 │      │
│   │   ★ @repo/graph-store ★  <── YOU ARE HERE                      │      │
│   │                                                                 │      │
│   │   ┌───────────────────────────────────────────────────────┐    │      │
│   │   │              GraphStore Interface                      │    │      │
│   │   │  • putNode(node)      • listNodes()                   │    │      │
│   │   │  • putEdge(edge)      • listEdges()                   │    │      │
│   │   │  • getNode(id)        • queryPolicy(selection)        │    │      │
│   │   └───────────────────────────────────────────────────────┘    │      │
│   │                          │                                      │      │
│   │                          │ implements                           │      │
│   │                          ▼                                      │      │
│   │   ┌───────────────────────────────────────────────────────┐    │      │
│   │   │           InMemoryGraphStore (v0.1)                   │    │      │
│   │   │  • Map-based storage                                  │    │      │
│   │   │  • Deterministic ordering                             │    │      │
│   │   │  • Policy supersession queries                        │    │      │
│   │   └───────────────────────────────────────────────────────┘    │      │
│   │                                                                 │      │
│   │   Future adapters:                                              │      │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │      │
│   │   │  SQLite     │  │ PostgreSQL  │  │   Neo4j     │           │      │
│   │   │  Adapter    │  │  Adapter    │  │  Adapter    │           │      │
│   │   └─────────────┘  └─────────────┘  └─────────────┘           │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                 │                                           │
│                                 │ store.listNodes() / store.queryPolicy()   │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                   @repo/graph-projection                        │      │
│   │              (Reads from store, computes projections)           │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## This Package's Role

`@repo/graph-store` is the **persistence layer** that stores and retrieves graph data. It provides:

- **GraphStore interface** - Contract that all storage adapters must implement
- **InMemoryGraphStore** - Reference implementation for v0.1
- **Policy queries** - Find applicable policies with supersession handling

```
┌─────────────────────────────────────────────────────────────────┐
│                        GraphStore                                │
│                        (Interface)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Write Operations:           Read Operations:                    │
│  ┌──────────────────┐       ┌──────────────────┐                │
│  │ putNode(node)    │       │ getNode(id)      │                │
│  │ putEdge(edge)    │       │ listNodes()      │                │
│  └──────────────────┘       │ listEdges(query?)│                │
│                             │ queryPolicy()    │                │
│                             └──────────────────┘                │
│                                                                  │
│  Guarantees:                                                     │
│  • Deterministic ordering (sorted by ID)                         │
│  • Policy supersession (newer policies override older)           │
│  • Idempotent writes (same node/edge = same result)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│         GraphStore Adapter Pattern                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────┐      │
│   │           GraphStore Interface (v0.1)                │      │
│   │      (All adapters implement this contract)          │      │
│   └─────────────────┬──────────────────────────────────┘      │
│                     │                                           │
│         ┌───────────┼───────────┬─────────────────┐             │
│         ▼           ▼           ▼                 ▼             │
│   ┌──────────┐ ┌─────────┐ ┌──────────┐    ┌─────────────┐     │
│   │ InMemory │ │ SQLite  │ │PostgreSQL│    │   Neo4j     │     │
│   │ Adapter  │ │ Adapter │ │ Adapter  │    │  Adapter    │     │
│   │ (v0.1)   │ │(future) │ │(future)  │    │ (future)    │     │
│   └──────────┘ └─────────┘ └──────────┘    └─────────────┘     │
│       ▲                                                          │
│       │                                                          │
│   Storage Backend:                                              │
│   • Map<string, GraphNode>                                      │
│   • Map<string, GraphEdge>                                      │
│   • Sorted iteration for determinism                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Operations

```typescript
import { InMemoryGraphStore } from '@repo/graph-store';
import { createDeterministicId, type ArtifactRootNode } from '@repo/graph-core';

const store = new InMemoryGraphStore();

// Write a node
const node: ArtifactRootNode = {
  id: createDeterministicId('https://github.com/user/repo'),
  kind: 'ArtifactRoot',
  schema_version: 'v0.1',
  source_kind: 'repo',
  canonical_ref: 'https://github.com/user/repo',
};
store.putNode(node);

// Read nodes
const allNodes = store.listNodes(); // Sorted by ID
const singleNode = store.getNode(node.id);
```

### Policy Queries

```typescript
import type { PolicyNode, PolicySelection } from '@repo/graph-core';

// Store a policy
const policy: PolicyNode = {
  id: createDeterministicId('policy-1'),
  kind: 'Policy',
  schema_version: 'v0.1',
  policy_kind: 'IngestionPolicy',
  scope: 'repo',
};
store.putNode(policy);

// Query for applicable policy
const selection: PolicySelection = {
  policy_kind: 'IngestionPolicy',
  scope: 'repo',
};
const matchedPolicy = store.queryPolicy(selection);
```

### Edge Filtering

```typescript
import type { GraphEdge } from '@repo/graph-core';

// List all edges
const allEdges = store.listEdges();

// Filter edges by kind
const hasStateEdges = store.listEdges({ kind: 'HasState' });

// Filter edges by source node
const edgesFromRoot = store.listEdges({ from: rootNode.id });
```

## Deterministic Ordering

The store guarantees deterministic ordering for reproducible outputs:

```typescript
// Nodes are always returned sorted by ID
const nodes = store.listNodes();
// nodes[0].id < nodes[1].id < nodes[2].id ...

// Edges are always returned sorted by ID
const edges = store.listEdges();
// edges[0].id < edges[1].id < edges[2].id ...
```

## Policy Supersession

When multiple policies match a selection, the store returns the most recently added one:

```typescript
// Add initial policy
store.putNode({ ...policy, id: 'policy-v1' });

// Add superseding policy
store.putNode({ ...policy, id: 'policy-v2', supersedes: 'policy-v1' });

// Query returns the superseding policy
const result = store.queryPolicy(selection);
// result.id === 'policy-v2'
```

## Dependencies

```
@repo/graph-core
       │
       ▼
@repo/graph-store (this package)
```

## Related Documentation

- [REQ-graph-system-graph-store-inmemory](../../docs/engineering/01-requirements/REQ-graph-system-graph-store-inmemory.md)
- [SPEC-graph-system-vertical-slice-v0-1](../../docs/engineering/02-specifications/SPEC-graph-system-vertical-slice-v0-1.md)
