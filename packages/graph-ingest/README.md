# @repo/graph-ingest

Ingestion orchestration, connector interface, and JSON dump utilities for the Texere graph system.

## Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TEXERE GRAPH SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   External Sources                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │   GitHub    │     │   Web Page  │     │   Forum     │                  │
│   │   Repos     │     │   (future)  │     │  (future)   │                  │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                  │
│          │                   │                   │                          │
│          └───────────────────┼───────────────────┘                          │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                 │      │
│   │   ★ @repo/graph-ingest ★  <── YOU ARE HERE                     │      │
│   │                                                                 │      │
│   │   ┌───────────────────────────────────────────────────────┐    │      │
│   │   │           IngestionConnector Interface                 │    │      │
│   │   │                                                        │    │      │
│   │   │   interface IngestionConnector {                       │    │      │
│   │   │     canHandle(sourceKind: string): boolean;            │    │      │
│   │   │     ingest(input, store): Promise<IngestResult>;       │    │      │
│   │   │   }                                                    │    │      │
│   │   │                                                        │    │      │
│   │   └───────────────────────────────────────────────────────┘    │      │
│   │                              │                                  │      │
│   │                              │ implemented by                   │      │
│   │          ┌───────────────────┼───────────────────┐             │      │
│   │          ▼                   ▼                   ▼             │      │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │      │
│   │   │  SCIP-TS    │    │    Web      │    │   Forum     │       │      │
│   │   │ Connector   │    │ Connector   │    │ Connector   │       │      │
│   │   │ (separate   │    │  (future)   │    │  (future)   │       │      │
│   │   │  package)   │    │             │    │             │       │      │
│   │   └─────────────┘    └─────────────┘    └─────────────┘       │      │
│   │                                                                 │      │
│   │   ┌───────────────────────────────────────────────────────┐    │      │
│   │   │              Orchestration Functions                   │    │      │
│   │   │                                                        │    │      │
│   │   │   ingestRepo(input, store, connector)                  │    │      │
│   │   │   writeJsonDumps({ store, projection?, outputDir? })   │    │      │
│   │   │                                                        │    │      │
│   │   └───────────────────────────────────────────────────────┘    │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                              │                                              │
│                              │ writes to                                    │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                     @repo/graph-store                           │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                              │                                              │
│                              │ outputs                                      │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                      JSON Dump Files                            │      │
│   │   ./tmp/graph-dump/                                             │      │
│   │   ├── artifacts.json      (all artifact nodes)                  │      │
│   │   ├── policies.json       (all policy nodes)                    │      │
│   │   ├── projection.json     (projection output, if provided)      │      │
│   │   └── graph_dump_summary.json (counts and metadata)             │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## This Package's Role

`@repo/graph-ingest` is the **orchestration layer** that:

1. **Defines the connector interface** - Contract for all source-specific connectors
2. **Orchestrates ingestion** - Validates and invokes connectors
3. **Outputs JSON dumps** - Human/LLM-readable inspection files

```
┌─────────────────────────────────────────────────────────────────┐
│         Ingestion Orchestration Pipeline                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Input:           Validation:        Execution:                │
│   ┌─────────────┐  ┌────────────┐    ┌──────────────┐           │
│   │  Source     │─▶│  Input     │───▶│   Invoke     │           │
│   │  Reference  │  │  Validation│    │   Connector  │           │
│   │  (path/url) │  └────────────┘    │              │           │
│   └─────────────┘                    │ store.put*() │           │
│                                      │              │           │
│                                      └──────┬───────┘           │
│                                             │                   │
│                                             ▼                   │
│                                      ┌──────────────┐           │
│                                      │   Return     │           │
│                                      │  IngestResult│           │
│                                      └──────────────┘           │
│                                                                  │
│   Characteristics:                                              │
│   • Agnostic to source type (delegates to connector)            │
│   • Validates input before processing                           │
│   • Passes store instance to connector                          │
│   • Captures result metadata                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## The Connector Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    How Connectors Work                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. graph-ingest defines the interface                         │
│   2. Separate packages implement specific connectors             │
│   3. User instantiates connector and passes to ingestRepo()      │
│                                                                  │
│   ┌──────────────────┐     ┌──────────────────┐                 │
│   │  graph-ingest    │     │  connector-      │                 │
│   │  (interface)     │◄────│  scip-ts         │                 │
│   │                  │     │  (implementation)│                 │
│   └──────────────────┘     └──────────────────┘                 │
│                                                                  │
│   // Usage:                                                      │
│   import { ingestRepo } from '@repo/graph-ingest';              │
│   import { ScipTsConnector } from '@repo/graph-ingest-connector-ts';│
│                                                                  │
│   const connector = new ScipTsConnector();                      │
│   await ingestRepo(input, store, connector);                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Ingesting a Repository

```typescript
import { ingestRepo } from '@repo/graph-ingest';
import { ScipTsIngestionConnector } from '@repo/graph-ingest-connector-ts';
import { InMemoryGraphStore } from '@repo/graph-store';

const store = new InMemoryGraphStore();
const connector = new ScipTsIngestionConnector();

const result = await ingestRepo(
  {
    repoPath: './tmp/Texere/graph-ingest/my-repo',
    repoUrl: 'https://github.com/user/my-repo',
    commit: 'abc123def456',
    projectId: 'project-1',
  },
  store,
  connector,
);

console.log(result);
// {
//   artifact_root_id: '...',
//   artifact_state_id: '...',
//   node_count: 150,
//   edge_count: 200
// }
```

### Writing JSON Dumps

```typescript
import { writeJsonDumps } from '@repo/graph-ingest';

// Basic dump (artifacts + policies + summary)
await writeJsonDumps({ store });

// With custom output directory
await writeJsonDumps({
  store,
  outputDir: './my-output',
});

// With projection output
await writeJsonDumps({
  store,
  projection: projectionEnvelope,
  outputDir: './my-output',
});
```

### Output Files

```
./tmp/graph-dump/
├── artifacts.json           # All non-policy nodes
│   {
│     "nodes": [
│       { "id": "...", "kind": "ArtifactRoot", ... },
│       { "id": "...", "kind": "ArtifactState", ... },
│       { "id": "...", "kind": "ArtifactPart", ... }
│     ]
│   }
│
├── policies.json            # All policy nodes
│   {
│     "policies": [
│       { "id": "...", "kind": "Policy", "policy_kind": "IngestionPolicy", ... }
│     ]
│   }
│
├── projection.json          # (Optional) Projection output
│   {
│     "projection_name": "CurrentCommittedTruth",
│     "schema_version": "v0.1",
│     "nodes": [...],
│     "edges": [...]
│   }
│
└── graph_dump_summary.json  # Counts and metadata
    {
      "node_count": 150,
      "policy_count": 2,
      "projection": "CurrentCommittedTruth"
    }
```

## Implementing a New Connector

To add support for a new source type:

```typescript
// packages/graph-ingest-connector-web/src/index.ts
import type { IngestionConnector, IngestResult } from '@repo/graph-ingest';
import type { GraphStore } from '@repo/graph-store';

export class WebIngestionConnector implements IngestionConnector {
  canHandle(sourceKind: string): boolean {
    return sourceKind === 'web';
  }

  async ingest(input: WebIngestInput, store: GraphStore): Promise<IngestResult> {
    // 1. Fetch the web page
    // 2. Parse content into sections
    // 3. Create ArtifactRoot, ArtifactState, ArtifactPart nodes
    // 4. Write to store
    // 5. Return result
  }
}
```

## Dependencies

```
@repo/graph-core ◄─────┐
       │               │
       ▼               │
@repo/graph-store      │
       │               │
       ▼               │
@repo/graph-ingest ────┘ (this package)
       │
       │ interface implemented by
       ▼
@repo/graph-ingest-connector-ts
```

## Exports

| Export               | Type      | Description                    |
| -------------------- | --------- | ------------------------------ |
| `IngestionConnector` | interface | Contract for source connectors |
| `RepoIngestInput`    | type      | Input for repo-based ingestion |
| `IngestResult`       | type      | Result of ingestion operation  |
| `ingestRepo()`       | function  | Orchestrates repo ingestion    |
| `writeJsonDumps()`   | function  | Writes inspection JSON files   |

## Related Documentation

- [REQ-graph-ingestion](../../docs/engineering/01-requirements/REQ-graph-ingestion.md)
- [REQ-graph-system-graph-ingestion-repo-scip-ts](../../docs/engineering/01-requirements/REQ-graph-system-graph-ingestion-repo-scip-ts.md)
- [SPEC-graph-system-vertical-slice-v0-1](../../docs/engineering/02-specifications/SPEC-graph-system-vertical-slice-v0-1.md)
