# @repo/graph-ingest-connector-scip-ts

SCIP-TS repository ingestion connector for the Texere graph system.

## Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TEXERE GRAPH SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   External Sources                                                          │
│   ┌──────────────────────────────────┐                                      │
│   │   GitHub Repository (TypeScript)  │                                      │
│   │   • Files                         │                                      │
│   │   • Symbols (classes, functions)  │                                      │
│   └──────────────────┬────────────────┘                                      │
│                      │                                                       │
│                      │ scip index via tree-sitter                            │
│                      ▼                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    @repo/graph-ingest                           │       │
│   │              (Orchestration + Connector Interface)              │       │
│   └─────────────────────────────┬───────────────────────────────────┘       │
│                                 │                                            │
│                                 │ passes store instance                      │
│                                 ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                                                                 │       │
│   │   ★ @repo/graph-ingest-connector-scip-ts ★  <── YOU ARE HERE   │       │
│   │                                                                 │       │
│   │   ┌───────────────────────────────────────────────────────┐    │       │
│   │   │           ScipTsIngestionConnector                     │    │       │
│   │   │  implements IngestionConnector {                       │    │       │
│   │   │    canHandle(sourceKind: string): boolean              │    │       │
│   │   │    ingest(input, store): Promise<IngestResult>         │    │       │
│   │   │  }                                                     │    │       │
│   │   └───────────────────────────────────────────────────────┘    │       │
│   │                          │                                      │       │
│   │                          │ processing pipeline                  │       │
│   │          ┌───────────────┼───────────────┐                     │       │
│   │          ▼               ▼               ▼                     │       │
│   │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │       │
│   │   │   Indexing   │ │  File/Symbol │ │ ArtifactPart │            │       │
│   │   │   (SCIP)     │ │  Mapping     │ │ Creation     │            │       │
│   │   └──────────────┘ └──────────────┘ └──────────────┘            │       │
│   │                                                                 │       │
│   │   store.putNode() / store.putEdge()                             │       │
│   │                                                                 │       │
│   └─────────────────────────────┬───────────────────────────────────┘       │
│                                 │                                            │
│                                 ▼                                            │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                     @repo/graph-store                           │       │
│   │                (InMemoryGraphStore + Interface)                 │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## This Package's Role

`@repo/graph-ingest-connector-scip-ts` is the **source-specific connector** that extracts TypeScript
repository structure and ingests it into the graph:

- **ScipTsIngestionConnector** - Implements the IngestionConnector interface
- **SCIP indexing** - Uses tree-sitter to understand TypeScript structure
- **Symbol mapping** - Transforms files and symbols into ArtifactPart nodes

```
┌─────────────────────────────────────────────────────────────────┐
│            SCIP-TS Connector Processing                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Input:                                                         │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  RepoIngestInput:                                    │      │
│   │  • repoPath: local directory                         │      │
│   │  • repoUrl: canonical GitHub URL                     │      │
│   │  • commit: commit hash                               │      │
│   │  • projectId: project identifier                     │      │
│   └──────────────────────────────────────────────────────┘      │
│                      │                                           │
│                      ▼                                           │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  1. Create ArtifactRoot                              │      │
│   │     (canonical_ref = repoUrl)                        │      │
│   └──────────────────────────────────────────────────────┘      │
│                      │                                           │
│                      ▼                                           │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  2. Create ArtifactState                             │      │
│   │     (commit, crawl timestamp)                        │      │
│   │     Connect via HasState edge                        │      │
│   └──────────────────────────────────────────────────────┘      │
│                      │                                           │
│                      ▼                                           │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  3. Scan repo with SCIP index                        │      │
│   │     • Find TypeScript files                          │      │
│   │     • Extract symbols and their locations            │      │
│   └──────────────────────────────────────────────────────┘      │
│                      │                                           │
│                      ▼                                           │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  4. Create ArtifactPart nodes for each:              │      │
│   │     • File (e.g., src/index.ts)                      │      │
│   │     • Symbol (e.g., export function foo)             │      │
│   │     Connect via HasPart edges                        │      │
│   └──────────────────────────────────────────────────────┘      │
│                      │                                           │
│                      ▼                                           │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  Output:                                             │      │
│   │  IngestResult {                                      │      │
│   │    artifact_root_id: '...',                          │      │
│   │    artifact_state_id: '...',                         │      │
│   │    node_count: N,    // ArtifactPart nodes created   │      │
│   │    edge_count: M     // HasPart/HasState edges       │      │
│   │  }                                                   │      │
│   └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Ingestion

```typescript
import { ingestRepo } from '@repo/graph-ingest';
import { ScipTsIngestionConnector } from '@repo/graph-ingest-connector-scip-ts';
import { InMemoryGraphStore } from '@repo/graph-store';

const store = new InMemoryGraphStore();
const connector = new ScipTsIngestionConnector();

const result = await ingestRepo(
  {
    repoPath: './my-repo',
    repoUrl: 'https://github.com/user/my-repo',
    commit: 'abc123def456',
    projectId: 'project-1',
  },
  store,
  connector,
);

console.log(result);
// {
//   artifact_root_id: 'root-id-hash',
//   artifact_state_id: 'state-id-hash',
//   node_count: 250,     // Files + symbols
//   edge_count: 260      // HasPart + HasState edges
// }
```

### Connector Features

```typescript
const connector = new ScipTsIngestionConnector();

// Supports TypeScript/JavaScript repositories
console.log(connector.canHandle('repo')); // true

// Check support for other source types
console.log(connector.canHandle('web')); // false
console.log(connector.canHandle('forum')); // false
```

## Node Types Created

The connector creates these node types in the graph:

| Node Type     | Description                                  |
| ------------- | -------------------------------------------- |
| ArtifactRoot  | Canonical reference to the GitHub repository |
| ArtifactState | Point-in-time snapshot (specific commit)     |
| ArtifactPart  | Individual files and symbols within the repo |

## Edge Types Created

| Edge Type | From → To                    | Description                   |
| --------- | ---------------------------- | ----------------------------- |
| HasState  | ArtifactRoot → ArtifactState | Links repo to its commit      |
| HasPart   | ArtifactState → ArtifactPart | Links commit to files/symbols |

## Dependencies

```
@repo/graph-core ◄─────────────┐
       │                       │
       ▼                       │
@repo/graph-store              │
       │                       │
       ▼                       │
@repo/graph-ingest             │
       │                       │
       ▼                       │
@repo/graph-ingest-connector-scip-ts (this package)
       │
       └─ Uses: tree-sitter (TS parsing)
```

## Related Documentation

- [REQ-graph-system-graph-ingestion-repo-scip-ts](../../docs/engineering/01-requirements/REQ-graph-system-graph-ingestion-repo-scip-ts.md)
- [REQ-graph-ingestion](../../docs/engineering/01-requirements/REQ-graph-ingestion.md)
- [SPEC-graph-system-vertical-slice-v0-1](../../docs/engineering/02-specifications/SPEC-graph-system-vertical-slice-v0-1.md)
