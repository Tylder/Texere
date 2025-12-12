# Texere Indexer – Nx Layout & Project Structure

This document specifies how to lay out the Texere Indexer and related components in a single Nx
monorepo, using domain-based grouping and direct library calls for agents.

---

## 1. High-Level Monorepo Structure

The indexer lives in the **same Nx workspace** as the agent / code-writing system. We group by
**domain** under `packages/features`.

```text
root/
  apps/
    agent-orchestrator/         # LangGraph/Mastra agents
    indexer-runner/ (optional)  # Nx alias to run-once/daemon script (non-server)
    indexer-worker/ (optional)  # Background worker process for indexing (post-v1)
    indexer-orchestrator/ (optional)  # Work orchestrator (HTTP + queue) shell (post-v1, not required)

  scripts/
    indexer-run-once.ts         # Required run-once CLI (non-server, no queue)

  packages/
    features/
      indexer/
        types/                  # Shared types & JSON schemas
        core/                   # DB/infra access (graph + vector)
        ingest/                 # Git + parsing + writing to graph
        query/                  # Agent-facing query API
        workers/                # BullMQ job handlers (optional)

  tools/                        # Nx generators, custom scripts (optional)
  nx.json
  package.json
  tsconfig.base.json
  pnpm-lock.yaml (or yarn.lock)
```

- **Domain root**: `packages/features/indexer` is the **indexer domain**.
- Each subfolder (`types`, `core`, `ingest`, `query`, `workers`) is an Nx **library**.
- Apps depend on these libraries according to strict dependency rules.

---

## 2. Nx Libraries in the Indexer Domain

### 2.1 `packages/features/indexer/types`

**Purpose**: Shared type system for the indexer.

**Responsibility**:

- Node and edge type definitions (Codebase, Snapshot, Module, File, Symbol, Feature, Boundary,
  etc.).
- Query bundle types: `FeatureContextBundle`, `BoundaryPatternExample`, `IncidentSliceBundle`.
- JSON Schema definitions or Zod schemas (optional) for the bundles.

**Example structure**:

```text
packages/features/indexer/types/
  src/
    index.ts
    nodes.ts
    edges.ts
    bundles.ts
    schemas/
      feature-context.schema.json
      endpoint-pattern.schema.json
      incident-slice.schema.json
  project.json
```

**Tags**:

- `domain:indexer`
- `layer:types`

---

### 2.2 `packages/features/indexer/core`

**Purpose**: Low-level infra access and persistence.

**Responsibility**:

- Neo4j client and graph schema helpers.
- Qdrant client and vector operations.
- Common configuration (env loading, connection management).
- Generic graph persistence APIs:
  - `upsertCodebase(...)`
  - `upsertSnapshot(...)`
  - `upsertFileSymbols(...)`
  - `linkCalls(...)`
  - `searchSimilarSymbols(...)`

**Example structure**:

```text
packages/features/indexer/core/
  src/
    index.ts
    graph/
      neo4j-client.ts
      graph-schema.ts
      graph-writes.ts
      graph-reads.ts
    vector/
      qdrant-client.ts
      symbol-embeddings.ts
    config/
      indexer-config.ts
  project.json
```

**Key Responsibility: Constraint Enforcement**

The `graph-writes.ts` module must enforce the **IN_SNAPSHOT cardinality invariant** for all
snapshot-scoped node creation:

```typescript
// packages/features/indexer/core/src/graph/graph-writes.ts

export async function upsertSymbol(symbol: Symbol, snapshotId: string): Promise<Symbol> {
  // Always wrap creation + edge in same transaction
  return await neo4jTransaction(async (tx) => {
    // 1. Verify snapshot exists (foreign key)
    const snapshot = await tx.run('MATCH (snap:Snapshot {id: $snapshotId}) RETURN snap', {
      snapshotId,
    });
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

    // 2. Create/upsert symbol + edge atomically
    const result = await tx.run(
      `
      MATCH (snap:Snapshot {id: $snapshotId})
      MERGE (sym:Symbol {id: $symbolId})
      SET sym += $props
      MERGE (sym)-[:IN_SNAPSHOT]->(snap)
      RETURN sym
    `,
      {
        snapshotId,
        symbolId: symbol.id,
        props: {
          name: symbol.name,
          filePath: symbol.filePath,
          kind: symbol.kind,
          startLine: symbol.startLine,
          startCol: symbol.startCol,
          endLine: symbol.endLine,
          endCol: symbol.endCol,
          createdAt: Date.now(),
        },
      },
    );

    return result;
  });
  // If constraint violated, transaction rolls back
  // If snapshot not found, error thrown before write
}

// Similar pattern for: Module, File, Boundary, TestCase, DataContract, SpecDoc
```

**Dependencies**:

- Depends on: `indexer/types`.
- No dependency on ingest/query.

**Tags**:

- `domain:indexer`
- `layer:core`

**Note**: See
[graph_schema_spec.md §4.1B](../graph_schema_spec.md#41b-priority-1b-cardinality--existence-constraints-critical)
and [ingest_spec.md §6.3](../ingest_spec.md#63-node-edge-creation--cardinality-enforcement) for full
constraint details.

---

### 2.3 `packages/features/indexer/ingest`

**Purpose**: Indexing pipeline and writing to the graph.

**Responsibility**:

- Git access and diff computation for Snapshots.
- Per-language indexers (TS, Python, etc.) implementing a common interface.
- Extraction of:
  - Symbols, calls, references.
  - Boundaries, SchemaEntities, TestCases.
  - Feature mappings (from `features.yaml` + LLM assistance).
- Conversion of `FileIndexResult` → graph nodes/edges via `indexer/core`.

**Example structure**:

```text
packages/features/indexer/ingest/
  src/
    index.ts
    index-snapshot.ts           # orchestrates indexing for a Snapshot
    git/
      git-diff.ts
      git-files.ts
    languages/
      language-indexer.ts       # interface
      ts-indexer.ts             # TS implementation
      py-indexer.ts             # Python implementation (via sidecar)
    extractors/
      endpoints.ts
      schema-entities.ts
      testcases.ts
      features.ts
  project.json
```

**Dependencies**:

- Depends on: `indexer/core`, `indexer/types`.
- Must not be depended upon by agents directly.

**Tags**:

- `domain:indexer`
- `layer:ingest`

---

### 2.4 `packages/features/indexer/query`

**Purpose**: Agent-facing query API (read-only), used via direct library calls.

**Responsibility**:

- Implement the v1 Query API from the Texere Indexer spec:
  - `getFeatureContext(featureName: string, options?: ...)`
  - `getBoundaryPatternExamples(options?: ...)`
  - `getIncidentSlice(incidentId: string, options?: ...)`
- Compose data from Neo4j + Qdrant via `indexer/core`.
- Return strictly typed bundles (`FeatureContextBundle`, etc.).

**Example structure**:

```text
packages/features/indexer/query/
  src/
    index.ts
    get-feature-context.ts
    get-endpoint-pattern-examples.ts
    get-incident-slice.ts
    helpers/
      callgraph-slice.ts
      docs-and-styleguides.ts
      tests-and-incidents.ts
  project.json
```

**Dependencies**:

- Depends on: `indexer/core`, `indexer/types`.
- Used by: agent apps and tools.

**Tags**:

- `domain:indexer`
- `layer:query`

---

### 2.5 `packages/features/indexer/workers` (optional)

**Purpose**: BullMQ job handlers for background indexing.

**Responsibility**:

- Job definitions and handlers:
  - `indexSnapshotJob({ codebaseId, commitHash })`.
  - Optional follow-up jobs (rebuild similarity, recompute features, etc.).
- Orchestration logic to call `indexer/ingest` in response to queue events.

**Example structure**:

```text
packages/features/indexer/workers/
  src/
    index.ts
    jobs/
      index-snapshot.job.ts
      rebuild-similarities.job.ts
  project.json
```

**Dependencies**:

- Depends on: `indexer/ingest`, `indexer/core`, `indexer/types`.
- Used by: `apps/indexer-worker`.

**Tags**:

- `domain:indexer`
- `layer:workers`

---

## 3. Apps and Their Dependencies

### 3.1 `scripts/indexer-run-once.ts` (required non-server entrypoint)

**Purpose**: Non-server, no-queue CLI wrapper around the programmatic ingest API. Runs once and
exits with status codes for cron/CI.

**Responsibilities**:

- Parse flags (`--repo`, `--branch?`, `--force`, `--fetch/--no-fetch`, `--dry-run`, `--log-format`,
  `--config <path>`), merge config (runtime > per-repo optional > app/global > defaults).
- Call `runSnapshot` / `runTrackedBranches` from `@repo/features/indexer/ingest`.
- Support dry-run (plan JSON, no writes) and exit codes: 0 success; 1 config/validation; 2 git/IO; 3
  DB; 4 external/LLM.

**Placement**: `scripts/indexer-run-once.ts` (tsx). Provide an Nx target alias
`indexer-runner:run-once` for convenience.

---

### 3.2 `apps/indexer-runner` (optional Nx wrapper)

**Purpose**: Optional Nx app that forwards to the same run-once/daemon script for teams that prefer
Nx targets. Shares all behavior with the script; no additional runtime logic.

---

### 3.3 `apps/indexer-worker` (post-v1 optional)

**Purpose**: Long-running worker that processes indexing jobs (only if queue/server is adopted after
v1).

**Responsibilities**:

- Start BullMQ worker(s).
- Bind job names to handlers from `indexer/workers`.

**Dependencies**:

- Depends on: `indexer/workers` (and transitively on ingest/core/types).

**Example imports**:

```ts
import { registerIndexSnapshotWorker } from '@repo/features/indexer/workers';
```

---

### 3.4 `apps/indexer-orchestrator` (post-v1 optional)

**Purpose**: Work orchestrator façade that may expose HTTP and/or queue integration around
ingest/query; not required for v1. Only implemented if remote triggering or multi-host scheduling is
needed.

**Responsibilities**:

- Expose API aligned with `configuration_and_server_setup.md` and `api_gateway_spec.md` when those
  are activated.
- Enqueue jobs to `indexer-worker` or call `runSnapshot` directly in-process when queue is absent.

**Dependencies**:

- Depends on: `indexer/workers` (if queue), `indexer/query`, `indexer/ingest`.

---

### 3.5 `apps/agent-orchestrator`

**Purpose**: Agent / LangGraph / Mastra orchestrator that uses the index.

**Responsibilities**:

- Agent graphs and tools that call `indexer/query` functions.

**Dependencies**:

- Depends on: `indexer/query`, `indexer/types`.
- Must **not** depend on: `indexer/ingest`, `indexer/core` directly.

**Example imports**:

```ts
import { getFeatureContext } from '@repo/features/indexer/query';
```

---

## 4. Nx Tags and Dependency Constraints

In `project.json` for each library/app, add tags. Example:

```jsonc
// packages/features/indexer/core/project.json
{
  "name": "features-indexer-core",
  "sourceRoot": "packages/features/indexer/core/src",
  "projectType": "library",
  "tags": ["domain:indexer", "layer:core"],
}
```

```jsonc
// packages/features/indexer/query/project.json
{
  "name": "features-indexer-query",
  "sourceRoot": "packages/features/indexer/query/src",
  "projectType": "library",
  "tags": ["domain:indexer", "layer:query"],
}
```

In `nx.json`, define constraints (conceptual example):

```jsonc
{
  "generators": {},
  "targetDefaults": {},
  "namedInputs": {},
  "pluginsConfig": {},
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "packages",
  },
  "extends": "some-preset-if-any",
  "implicitDependencies": {},
  "nxCloudAccessToken": "...",
  "affected": {},
  "defaultProject": "agent-orchestrator",
  "plugins": [],
  "targetDefaults": {},
  "projects": {},
  "cli": {},
  "tasksRunnerOptions": {},
  "targetDefaults": {},
  "parallel": 3,
  "generators": {},
  "defaultBase": "main",
  "moduleBoundaryRules": [
    {
      "sourceTag": "layer:query",
      "onlyDependOnLibsWithTags": ["layer:core", "layer:types"],
    },
    {
      "sourceTag": "layer:ingest",
      "onlyDependOnLibsWithTags": ["layer:core", "layer:types"],
    },
    {
      "sourceTag": "layer:workers",
      "onlyDependOnLibsWithTags": ["layer:ingest", "layer:core", "layer:types"],
    },
    {
      "sourceTag": "domain:agents",
      "onlyDependOnLibsWithTags": ["layer:query", "layer:types"],
    },
  ],
}
```

(Adjust the actual `nx.json` fields to match your current workspace; the key idea is the
`moduleBoundaryRules` with `sourceTag`/`onlyDependOnLibsWithTags`.)

---

## 5. Usage Summary

- The **indexing pipeline** lives in `indexer/ingest` and is executed by `apps/indexer-worker` via
  `indexer/workers`.
- The **graph/vector access** lives in `indexer/core`.
- The **public, agent-facing API** lives in `indexer/query` and is used via direct library imports
  by `apps/agent-orchestrator`.
- All shared types live in `indexer/types`.
- Nx enforces boundaries using `domain:` and `layer:` tags.

This layout cleanly separates indexing from querying, keeps all indexer concerns inside a single
domain, and allows your agents to use the index via direct function calls with strict TypeScript
types.
