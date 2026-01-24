# @repo/graph-core

Canonical graph types, deterministic IDs, and policy schemas for the Texere graph system.

## Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TEXERE GRAPH SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │   Source    │     │   Source    │     │   Source    │                    │
│  │  (GitHub)   │     │   (Web)     │     │  (Forum)    │                    │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                    │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    @repo/graph-ingest                           │        │
│  │              (Orchestration + Connector Interface)              │        │
│  └─────────────────────────────┬───────────────────────────────────┘        │
│                                │                                            │
│         ┌──────────────────────┼──────────────────────┐                     │
│         ▼                      ▼                      ▼                     │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐                │
│  │  scip-ts    │       │    web      │       │   forum     │                │
│  │ connector   │       │ connector   │       │ connector   │                │
│  └──────┬──────┘       └─────────────┘       └─────────────┘                │
│         │                 (future)              (future)                    │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                     @repo/graph-store                           │        │
│  │                (InMemoryGraphStore + Interface)                 │        │
│  └─────────────────────────────┬───────────────────────────────────┘        │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                   @repo/graph-projection                        │        │
│  │              (CurrentCommittedTruth + Runners)                  │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                                                                 │        │
│  │   ★ @repo/graph-core ★  <── YOU ARE HERE                       │        │
│  │                                                                 │        │
│  │   Foundation layer providing:                                   │        │
│  │   • Node/Edge type definitions (ArtifactRoot, ArtifactState,    │        │
│  │     ArtifactPart, Policy)                                       │        │
│  │   • Deterministic ID generation (createDeterministicId)         │        │
│  │   • Schema versioning (SchemaVersion)                           │        │
│  │   • Policy types and selection interfaces                       │        │
│  │                                                                 │        │
│  │   Used by ALL other graph packages                              │        │
│  │                                                                 │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## This Package's Role

`@repo/graph-core` is the **foundation layer** that all other graph packages depend on. It defines:

- **What nodes and edges look like** (type definitions)
- **How IDs are generated** (deterministic hashing)
- **How policies are structured** (policy kinds and selection)

```
                    ┌───────────────────┐
                    │  @repo/graph-core │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ graph-store │    │graph-ingest │    │  graph-     │
   │             │    │             │    │ projection  │
   └─────────────┘    └─────────────┘    └─────────────┘
```

## Exports

### Node Types

```typescript
import type {
  GraphNode,
  ArtifactRootNode,
  ArtifactStateNode,
  ArtifactPartNode,
  PolicyNode,
} from '@repo/graph-core';
```

| Type                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `ArtifactRootNode`  | Canonical reference to a source (repo URL, web page) |
| `ArtifactStateNode` | Point-in-time snapshot (commit, crawl timestamp)     |
| `ArtifactPartNode`  | Addressable unit (file, symbol, section)             |
| `PolicyNode`        | Ingestion or projection policy                       |

### Edge Types

```typescript
import type { GraphEdge, EdgeKind } from '@repo/graph-core';
```

| Edge Kind  | From → To                    | Description                 |
| ---------- | ---------------------------- | --------------------------- |
| `HasState` | ArtifactRoot → ArtifactState | Links root to its snapshots |
| `HasPart`  | ArtifactState → ArtifactPart | Links snapshot to its parts |

### Deterministic IDs

```typescript
import { createDeterministicId } from '@repo/graph-core';

// Always produces the same hash for the same input
const id = createDeterministicId('https://github.com/user/repo:abc123');
```

### Policy Selection

```typescript
import type { PolicySelection, PolicyKind } from '@repo/graph-core';

const selection: PolicySelection = {
  policy_kind: 'IngestionPolicy',
  scope: 'repo',
};
```

## Schema Versioning

All nodes and edges include a `schema_version` field:

```typescript
const node: ArtifactRootNode = {
  id: '...',
  kind: 'ArtifactRoot',
  schema_version: 'v0.1', // <-- Required
  source_kind: 'repo',
  canonical_ref: 'https://github.com/user/repo',
};
```

## Related Documentation

- [REQ-graph-system-graph-knowledge-system](../../docs/engineering/01-requirements/REQ-graph-system-graph-knowledge-system.md)
- [SPEC-graph-system-vertical-slice-v0-1](../../docs/engineering/02-specifications/SPEC-graph-system-vertical-slice-v0-1.md)
