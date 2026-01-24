# @repo/graph-projection

Projection runner implementations and CurrentCommittedTruth for the Texere graph system.

## Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TEXERE GRAPH SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              Data Flow                                      │
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │   Source    │     │   Source    │     │   Source    │                  │
│   │  (GitHub)   │     │   (Web)     │     │  (Forum)    │                  │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                  │
│          │                   │                   │                          │
│          ▼                   ▼                   ▼                          │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    @repo/graph-ingest                           │      │
│   │              (Orchestration + Connector Interface)              │      │
│   └─────────────────────────────┬───────────────────────────────────┘      │
│                                 │                                           │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                     @repo/graph-store                           │      │
│   │                (InMemoryGraphStore + Interface)                 │      │
│   └─────────────────────────────┬───────────────────────────────────┘      │
│                                 │                                           │
│                                 │ store.listNodes() / store.listEdges()     │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                 │      │
│   │   ★ @repo/graph-projection ★  <── YOU ARE HERE                 │      │
│   │                                                                 │      │
│   │   ┌───────────────────────────────────────────────────────┐    │      │
│   │   │        ProjectionRunner Interface                      │    │      │
│   │   │  • run(store): ProjectionEnvelope                      │    │      │
│   │   │  • explainability?: string[]                           │    │      │
│   │   └───────────────────────────────────────────────────────┘    │      │
│   │                          │                                      │      │
│   │                          │ implemented by                       │      │
│   │                          ▼                                      │      │
│   │   ┌───────────────────────────────────────────────────────┐    │      │
│   │   │      CurrentCommittedTruth Projection (v0.1)          │    │      │
│   │   │  • Computes nodes & edges from graph data             │    │      │
│   │   │  • Applies policy filters                             │    │      │
│   │   │  • Returns deterministic projection envelope           │    │      │
│   │   └───────────────────────────────────────────────────────┘    │      │
│   │                                                                 │      │
│   │   Future projection runners:                                    │      │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │      │
│   │   │  SymbolUse  │  │  Impact      │  │   Custom    │           │      │
│   │   │ Projection  │  │ Projection   │  │ Projections │           │      │
│   │   └─────────────┘  └─────────────┘  └─────────────┘           │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │              Consumer (LLM, IDE, Visualization)                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## This Package's Role

`@repo/graph-projection` is the **computation layer** that transforms raw graph data into actionable
views:

- **ProjectionRunner interface** - Contract for all projection implementations
- **CurrentCommittedTruth** - Reference implementation (v0.1)
- **Explainability metadata** - How decisions were made during projection

```
┌─────────────────────────────────────────────────────────────────┐
│              ProjectionRunner Pattern                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Input:                 Processing:        Output:             │
│   ┌──────────────┐       ┌──────────┐       ┌─────────────┐    │
│   │  GraphStore  │──────▶│ Projection│──────▶│ Projection  │    │
│   │  (all nodes  │       │ Runner   │       │ Envelope    │    │
│   │   & edges)   │       └──────────┘       │ (computed   │    │
│   └──────────────┘                         │  view)      │    │
│                                             └─────────────┘    │
│   Characteristics:                                              │
│   • Reads from store (no writes)                                │
│   • Deterministic output                                        │
│   • Explains its reasoning                                      │
│   • Policy-aware filtering                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Running a Projection

```typescript
import { CurrentCommittedTruth } from '@repo/graph-projection';
import { InMemoryGraphStore } from '@repo/graph-store';

const store = new InMemoryGraphStore();
// ... populate store with nodes and edges ...

const runner = new CurrentCommittedTruth();
const envelope = await runner.run(store);

console.log(envelope);
// {
//   projection_name: 'CurrentCommittedTruth',
//   schema_version: 'v0.1',
//   nodes: [...],
//   edges: [...],
//   explainability?: [
//     "Filtered 5 policies based on scope",
//     "Applied supersession to 2 policy groups",
//     ...
//   ]
// }
```

### Custom Projections

To implement your own projection:

```typescript
import type { ProjectionRunner, ProjectionEnvelope } from '@repo/graph-projection';
import type { GraphStore } from '@repo/graph-store';

export class CustomProjection implements ProjectionRunner {
  async run(store: GraphStore): Promise<ProjectionEnvelope> {
    // 1. Read nodes and edges from store
    // 2. Apply custom filtering/transformation logic
    // 3. Return projection envelope
    return {
      projection_name: 'CustomProjection',
      schema_version: 'v0.1',
      nodes: [...],
      edges: [...],
      explainability: ['Custom logic applied', ...],
    };
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
@repo/graph-projection (this package)
```

## Related Documentation

- [REQ-graph-projection](../../docs/engineering/01-requirements/REQ-graph-projection.md)
- [REQ-graph-system-graph-projection-current-truth](../../docs/engineering/01-requirements/REQ-graph-system-graph-projection-current-truth.md)
- [SPEC-graph-system-vertical-slice-v0-1](../../docs/engineering/02-specifications/SPEC-graph-system-vertical-slice-v0-1.md)
