# @repo/indexer-workers

> Background job handlers for indexing: BullMQ job definitions and worker orchestration (optional
> v1.0).

**Tags**: `domain:indexer`, `layer:workers`

## Purpose

This library defines **background indexing jobs** and job handlers. Enables:

- Asynchronous snapshot indexing (triggered by API, webhooks, schedule)
- Retries and error recovery
- Job queue management (via BullMQ)
- Concurrent indexing of multiple repositories/branches

**Note**: This is **optional for v1.0**. If not shipped, indexing is triggered synchronously via
admin CLI or API.

## Exports

```typescript
import {
  // Job registration
  registerIndexerWorkers,

  // Job definitions (if v1 includes workers)
  indexSnapshotJob,
  rebuildSimilaritiesJob,

  // Types
  IndexSnapshotJobPayload,
  IndexSnapshotJobResult,
} from '@repo/indexer-workers';
```

## Allowed Dependencies

- `@repo/indexer-ingest` ✓
- `@repo/indexer-core` ✓
- `@repo/indexer-types` ✓
- External: `bullmq`, `redis`, etc.

**Cannot depend on**: indexer-query, agents

## Specification References

- **Worker configuration**:
  [configuration_and_server_setup.md §7](../../docs/specs/feature/indexer/configuration_and_server_setup.md)
- **Layout & worker responsibility**:
  [layout_spec.md §2.5](../../docs/specs/feature/indexer/layout_spec.md#25-packagesfeaturesindexerworkers-optional)
- **Ingest orchestration**: [ingest_spec.md §6](../../docs/specs/feature/indexer/ingest_spec.md)

## Implementation Plan

| Slice | Task                                  | Status  |
| ----- | ------------------------------------- | ------- |
| 0     | Scaffolding & type definitions        | ✓ (now) |
| 7     | Worker implementation (optional v1.0) | TODO    |

## Development

### Directory Structure

```
src/
  index.ts                      # Main exports, job registration
  jobs/
    index-snapshot.job.ts       # Main indexing job (slice 7)
    rebuild-similarities.job.ts # Optional: rebuild Qdrant embeddings (slice 7+)
  handlers/
    index-snapshot.handler.ts   # Job handler logic (slice 7)
```

### Job: indexSnapshotJob

**Payload**:

```typescript
interface IndexSnapshotJobPayload {
  codebaseId: string;
  branch: string;
  force?: boolean; // Force re-index even if unchanged
}
```

**Result**:

```typescript
interface IndexSnapshotJobResult {
  codebaseId: string;
  commitHash: string;
  nodeCount: number;
  edgeCount: number;
  duration: number; // ms
  status: 'success' | 'partial' | 'failed';
}
```

**Handler logic** (Slice 7):

```typescript
export async function handleIndexSnapshotJob(
  job: Job<IndexSnapshotJobPayload>,
): Promise<IndexSnapshotJobResult> {
  // 1. Load config from core layer
  // 2. Call indexSnapshot() from ingest layer
  // 3. Monitor progress, update job.progress()
  // 4. On error: throw to trigger retry (BullMQ auto-retries per config)
  // 5. Return result
}
```

### Testing

**Unit Tests** (mocked):

```typescript
describe('indexSnapshotJob handler', () => {
  it('should enqueue and process indexing job', async () => {
    // Create mock job queue
    // Enqueue indexSnapshotJob({ codebaseId: 'test', branch: 'main' })
    // Wait for completion
    // Assert: result.nodeCount > 0
  });

  it('should retry on transient failure', async () => {
    // Mock ingest layer to fail once, then succeed
    // Assert: job retries and eventually succeeds
  });
});
```

**Integration Tests** (real BullMQ + Redis):

```typescript
describe('Worker integration', () => {
  it('should process indexing jobs from queue', async () => {
    // Start worker
    // Enqueue multiple jobs
    // Wait for completion
    // Verify all indexed
  });
});
```

## Design Principles

1. **Declarative**: Jobs defined as data (payload) with type safety
2. **Resilient**: Built-in retry logic, error handling, progress reporting
3. **Observable**: Job progress and results tracked for monitoring
4. **Scalable**: BullMQ enables horizontal scaling (multiple worker instances)
5. **Non-blocking**: Jobs run asynchronously; caller gets job ID immediately

## Optional Considerations (v1.0+)

- **Scheduling**: Cron jobs to index watched branches daily
- **Webhooks**: GitHub/GitLab webhooks trigger indexing on push
- **Priority**: High-priority branches (e.g., `main`) index faster
- **Cascading**: One job triggers related jobs (e.g., rebuild similarities after index)

## Quality & Build

- **Lint**: `pnpm nx run indexer-workers:lint`
- **Typecheck**: `pnpm nx run indexer-workers:check-types`
- **Build**: `pnpm nx run indexer-workers:build`
- **Test**: `pnpm nx run indexer-workers:test`
- **Fast validation**: `pnpm post:report:fast`

## See Also

- [layout_spec.md §2.5](../../docs/specs/feature/indexer/layout_spec.md#25-packagesfeaturesindexerworkers-optional)
  — Library design
- [implementation/plan.md §Slice 7](../../docs/specs/feature/indexer/implementation/plan.md#slice-7--workers--scheduling-optional-v10)
  — Worker implementation plan
- [configuration_and_server_setup.md §7](../../docs/specs/feature/indexer/configuration_and_server_setup.md)
  — Worker configuration
