---
type: SPEC
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-cli-app
summary_short: >-
  Scenario-driven testing app for graph system: reusable workflows, deterministic fixtures,
  inspectors for debugging, extensible for v0.1/v1.0/v2.0+
summary_long: >-
  Specifies a composable testing application as a consumer of 7 graph library packages. App
  organizes workflows into reusable Scenarios (versioned by v0.1/v1.0/v2.0+), uses deterministic
  Fixtures to build graph nodes, provides Inspectors for debugging, and serves as primary validation
  harness for graph features. Respects strict package boundaries; extensible without rewrite via
  composition model.
keywords:
  - testing
  - app
  - scenario
  - graph
implements:
  - REQ-graph-system-graph-system-architecture
  - REQ-graph-ingestion
  - REQ-graph-lifecycle
  - REQ-graph-projection
depends_on:
  - SPEC-graph-system-vertical-slice-v0-1
blocks:
  - IMPL-PLAN-graph-cli-app
related:
  - REQ-graph-system-graph-knowledge-system
  - REQ-graph-system-graph-policy-framework
  - REQ-graph-system-graph-ingestion-repo-scip-ts
  - REQ-graph-system-graph-projection-current-truth
index:
  sections:
    - title: 'TLDR'
      lines: [199, 220]
      summary:
        'Build a composable testing app organized around reusable Scenarios that validate graph
        features as they are developed; Scenarios compose Fixtures; Inspectors provide debugging;
        E2E tests validate real repos and complex workflows.'
      token_est: 158
    - title: 'Scope'
      lines: [222, 245]
      summary:
        'App architecture, Scenario design, Fixture patterns, Inspector tools, and E2E testing.'
      token_est: 138
    - title: 'Output Model'
      lines: [247, 291]
      summary:
        'JSON dumps are primary data output; Ink+Pastel renders beautiful terminal UI; database
        persistence deferred to v2.0+.'
      token_est: 292
    - title: 'Package Boundaries'
      lines: [293, 328]
      summary: 'App respects library package boundaries and depends on core graph packages only.'
      token_est: 207
    - title: 'Scenario Model'
      lines: [330, 434]
      summary:
        'Scenarios are reusable, composable workflows with name, version, tags, and execution
        contract.'
      token_est: 461
    - title: 'Fixture Model'
      lines: [436, 550]
      summary: 'Fixtures are factory functions that build deterministic nodes and policies.'
      token_est: 368
      subsections:
        - title: '1. Policy Fixtures'
          lines: [442, 470]
          token_est: 82
        - title: '2. Artifact Fixtures'
          lines: [472, 504]
          token_est: 107
        - title: '3. Assertion Fixtures (v1.0+)'
          lines: [506, 525]
          token_est: 68
        - title: '4. Evidence Fixtures (v1.0+)'
          lines: [527, 550]
          token_est: 91
    - title: 'GraphApp Orchestrator'
      lines: [552, 661]
      summary:
        'Main context and orchestrator providing fluent API for graph operations and introspection.'
      token_est: 393
      subsections:
        - title: '`withPolicy(kind, scope, fields)`'
          lines: [620, 622]
          token_est: 24
        - title: '`ingestRepo(options)`'
          lines: [624, 626]
          token_est: 13
        - title: '`createAssertion(kind, fields)`'
          lines: [628, 631]
          token_est: 26
        - title: '`runProjection(name, selection?)`'
          lines: [633, 636]
          token_est: 20
        - title: '`explain(node_id)`'
          lines: [638, 641]
          token_est: 24
        - title: '`trace(start_id, depth?)`'
          lines: [643, 646]
          token_est: 21
        - title: '`dump(options?)`'
          lines: [648, 650]
          token_est: 17
        - title: '`validate()`'
          lines: [652, 654]
          token_est: 15
        - title: '`checkInvariants()`'
          lines: [656, 661]
          token_est: 25
    - title: 'Scenario Registry and Organization'
      lines: [663, 786]
      summary: 'Scenarios organized by version (v0.1, v1.0, v2.0+) and functionality domain.'
      token_est: 615
      subsections:
        - title: 'v0.1 Scenarios (Ready Now)'
          lines: [667, 704]
          token_est: 219
        - title: 'v1.0 Scenarios (Future)'
          lines: [706, 748]
          token_est: 271
        - title: 'v2.0+ Scenarios'
          lines: [750, 786]
          token_est: 106
    - title: 'Inspector Tools'
      lines: [788, 888]
      summary: 'Debugging and visualization tools for graph state inspection and analysis.'
      token_est: 371
      subsections:
        - title: 'Dumper'
          lines: [815, 836]
          token_est: 91
        - title: 'Tracer'
          lines: [838, 849]
          token_est: 54
        - title: 'Differ'
          lines: [851, 864]
          token_est: 47
        - title: 'Explainer'
          lines: [866, 888]
          token_est: 84
    - title: 'Testing Strategy'
      lines: [890, 1103]
      summary: 'Unit, integration, and E2E testing modes aligned with scenario versions.'
      token_est: 808
      subsections:
        - title: 'Unit Tests (Fast, Isolated)'
          lines: [894, 952]
          token_est: 211
        - title: 'Integration Tests (Medium, Multi-Step)'
          lines: [954, 1004]
          token_est: 189
        - title: 'E2E Tests (Slow, Real Data)'
          lines: [1006, 1103]
          token_est: 390
    - title: 'Execution Modes'
      lines: [1105, 1275]
      summary: 'Single scenario, batch, E2E, and interactive modes for different use cases.'
      token_est: 887
      subsections:
        - title: 'Mode 1: Single Scenario (Local Development)'
          lines: [1109, 1159]
          token_est: 258
        - title: 'Mode 2: Batch Scenarios (CI/CD)'
          lines: [1161, 1199]
          token_est: 215
        - title: 'Mode 3: E2E Tests'
          lines: [1201, 1222]
          token_est: 114
        - title: 'Mode 4: Interactive Inspector (Ink TUI)'
          lines: [1224, 1275]
          token_est: 283
    - title: 'Extensibility Contract'
      lines: [1277, 1316]
      summary: 'New graph features add Scenarios and E2E tests; libraries remain unchanged.'
      token_est: 212
    - title: 'Non-Throwaway Guarantees'
      lines: [1318, 1350]
      summary: 'App designed to grow with system without architectural rewrites.'
      token_est: 199
    - title: 'Open Questions'
      lines: [1352, 1359]
      token_est: 55
    - title: 'Related Documents'
      lines: [1361, 1368]
      token_est: 20
---

# SPEC-graph-cli-app

---

## TLDR

Summary: Build a composable testing app organized around reusable Scenarios that validate graph
features as they are developed; Scenarios compose Fixtures; Inspectors provide debugging; E2E tests
validate real repos and complex workflows.

**What:** Scenario-driven testing and development application for the graph system

**Why:** Provide a single, extensible harness for validating all graph features (v0.1, v1.0, v2.0+)
without coupling to library packages

**How:** Scenarios are reusable workflows; Fixtures are factory functions; GraphApp provides
orchestration; Inspectors enable debugging; E2E tests validate determinism and invariants

**Status:** Draft specification

**Critical path:** Define Scenario contract → implement v0.1 Scenarios → write E2E tests for
sindresorhus/ky → validate extensibility for v1.0

**Risk:** If Scenario contract is too rigid, adding v1.0 features may require refactoring

---

## Scope

Summary: App architecture, Scenario design, Fixture patterns, Inspector tools, and E2E testing.

**Includes:**

- App package structure and dependencies
- Scenario contract and composition model
- Fixture factories for policies, artifacts, assertions
- GraphApp orchestrator interface
- Inspector tools (dumper, tracer, differ, explainer)
- E2E testing strategy (v0.1, v1.0, v2.0+)
- Execution modes (single, batch, interactive, CI/CD)
- Extensibility guarantees across versions

**Excludes:**

- Library package implementations (graph-core, graph-store, etc.)
- Specific ingestion connector details (those are in REQ-graph-ingestion-repo-scip-ts)
- Lifecycle assertion semantics (those are in REQ-graph-lifecycle-assertions)
- Projection algorithm details (those are in REQ-graph-projection-current-truth)
- Database choice and scaling (deferred to v3.0+)

---

## Output Model

Summary: JSON dumps are primary data output; Ink+Pastel renders beautiful terminal UI; database
persistence deferred to v2.0+.

**v0.1 Output:**

- JSON files (always): `./tmp/graph-dump/artifacts.json`, `policies.json`, `projection.json`,
  `graph_dump_summary.json`
- Terminal UI (always, unless --json or --quiet): Ink React components with Pastel styling for
  progress, results, graph inspection
- Optional: `--json` flag for JSON-only output (files + JSON report to stdout)
- Optional: `--quiet` flag to suppress UI (files only, silent)
- Tech Stack: Ink for React-in-terminal rendering, Pastel for styled text/colors, Commander for CLI
  scaffolding

**Future Output (v2.0+):**

- Database persistence: Scenarios can write directly to PostgreSQL/Neo4j/other graph DB
- Configuration via `.env`: `GRAPH_DB_URL`, `GRAPH_DB_TYPE`
- Backward compatible: v0.1 scenarios keep using in-memory store + JSON dumps + Terminal UI

**Usage Examples:**

```bash
# v0.1: JSON files + human console output
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base
# Creates: ./tmp/graph-dump/artifacts.json, policies.json, projection.json, summary.json
# Prints: Scenario progress to stdout

# v0.1: JSON output only (for CI/CD parsing)
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --json
# Output: JSON report to stdout, files to ./tmp/graph-dump/

# v0.1: Suppress console, keep files
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --quiet
# Output: Silent, files written to ./tmp/graph-dump/

# v2.0+: Output to database (in-memory store + database write)
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --db-write
# Requires: GRAPH_DB_URL set in .env
# Creates: In-memory store, JSON files, database records
```

---

## Package Boundaries

Summary: App respects library package boundaries and depends on core graph packages only.

**Dependency Model:**

```
apps/graph-app
  ├── depends on → @repo/graph-core
  ├── depends on → @repo/graph-store
  ├── depends on → @repo/graph-ingest
  ├── depends on → @repo/graph-ingest-connector-scip-ts
  ├── depends on → @repo/graph-projection
  │
  ├── v1.0 update: additionally depends on → @repo/graph-lifecycle
  ├── v1.0 update: additionally depends on → @repo/graph-validation (new package, future)
  │
  └── DOES NOT depend on:
      - app/graph-cli (app is the entire testing harness)
      - any test utilities outside of itself
```

**Rationale:**

- Graph library packages remain **pure libraries** with zero knowledge of the app
- App is a **consumer** that orchestrates libraries
- Adding new library features (v1.0 lifecycle assertions) → app adds dependencies + new Scenarios
- App never modifies libraries; libraries never reference app

**Enforcement:**

- Nx dependency graph validation (via `nx dep-graph`)
- ESLint import rules prevent violating boundaries
- All graph-package imports go through top-level exports only

---

## Scenario Model

Summary: Scenarios are reusable, composable workflows with name, version, tags, and execution
contract.

**Scenario Contract:**

```typescript
interface Scenario {
  // Metadata
  name: string;
  version: 'v0.1' | 'v1.0' | 'v2.0+';
  description: string;
  tags: string[]; // 'ingestion', 'lifecycle', 'projection', 'validation', 'conflict', etc.

  // Execution
  run(app: GraphApp): Promise<ScenarioResult>;

  // Optional: dependencies on other scenarios
  depends_on?: string[];

  // Optional: which library packages this scenario exercises
  exercises_packages?: string[];
}

interface ScenarioResult {
  success: boolean;
  duration_ms: number;

  // Graph state after scenario execution
  store: GraphStore;
  node_count: number;
  edge_count: number;
  nodes_by_kind: Record<string, number>; // {'ArtifactRoot': 1, 'ArtifactPart': 42, ...}

  // Projection output (if run)
  projection?: ProjectionEnvelope;

  // Assertions made and their results
  assertions_made: Assertion[];
  assertions_checked: { [id: string]: boolean };

  // Errors and diagnostics
  errors: string[];
  warnings: string[];

  // Execution trace
  steps_executed: string[];
  explain: {
    scenario_name: string;
    nodes_created: { kind: string; count: number }[];
    edges_created: { kind: string; count: number }[];
    invariants_checked: string[];
    policies_applied: { kind: string; scope: string }[];
  };
}
```

**Scenario Lifecycle:**

1. **Setup** — Initialize GraphApp with defaults (policies, project, store)
2. **Execute** — Run workflow steps (ingest, create assertions, project, validate)
3. **Introspect** — Inspect graph state (count nodes, trace relationships)
4. **Validate** — Check invariants and expected outcomes
5. **Report** — Return ScenarioResult with full trace

**Scenario Composition:**

Scenarios can invoke other scenarios and combine results:

```typescript
// Simple scenario
const repoIngestScenario = async (app: GraphApp): Promise<ScenarioResult> => {
  // ...setup, execute, validate
}

// Complex scenario = composition
const lifecycleWorkflowScenario = async (app: GraphApp): Promise<ScenarioResult> => {
  // Step 1: Execute repo ingestion scenario
  const ingestResult = await repoIngestScenario(app)

  // Step 2: Add lifecycle assertions
  const decision = app.createAssertion('Decision', { text: 'Use TypeScript', ... })

  // Step 3: Project
  const projection = app.runProjection('CurrentCommittedTruth')

  // Step 4: Validate invariants
  const health = app.checkInvariants()

  // Return combined result
  return { success: health.errors.length === 0, ... }
}
```

**Determinism Guarantee:**

All Scenarios MUST be deterministic:

- Same inputs (same repo commit, same seed data) → same outputs
- Node IDs are deterministic (SHA-256 hashes)
- Query results are ordered (by ID)
- Timestamps in nodes are reproducible (test fixtures use fixed times)

---

## Fixture Model

Summary: Fixtures are factory functions that build deterministic nodes and policies.

**Fixture Categories:**

### 1. Policy Fixtures

```typescript
// Factory function for default policies
export function defaultIngestionPolicy(scope: string): PolicyNode {
  return {
    id: createDeterministicId(`IngestionPolicy:${scope}:v0.1`),
    kind: 'Policy',
    schema_version: 'v0.1',
    policy_kind: 'IngestionPolicy',
    scope,
    retention_mode: 'link-only', // v0.1 default
    connector_kind: 'repo',
    supersedes: undefined,
  };
}

export function defaultProjectionPolicy(scope: string): PolicyNode {
  return {
    id: createDeterministicId(`ProjectionPolicy:${scope}:v0.1`),
    kind: 'Policy',
    schema_version: 'v0.1',
    policy_kind: 'ProjectionPolicy',
    scope,
    rule_version: 'v0.1',
    projections: ['CurrentCommittedTruth'],
  };
}
```

### 2. Artifact Fixtures

```typescript
export function repoFixture(options?: { url?: string; commit?: string; name?: string }): {
  root: ArtifactRootNode;
  state: ArtifactStateNode;
} {
  const url = options?.url ?? 'https://github.com/example/repo';
  const commit = options?.commit ?? 'abc123';

  const rootId = createDeterministicId(`${url}:${commit}`);
  const stateId = createDeterministicId(`${rootId}:${commit}`);

  return {
    root: {
      id: rootId,
      kind: 'ArtifactRoot',
      schema_version: 'v0.1',
      source_kind: 'repo',
      canonical_ref: url,
    },
    state: {
      id: stateId,
      kind: 'ArtifactState',
      schema_version: 'v0.1',
      artifact_root_id: rootId,
      version_ref: commit,
      content_hash: createDeterministicId(`${url}:${commit}:content`),
      retrieved_at: '2026-01-24T00:00:00Z', // Fixed for reproducibility
    },
  };
}
```

### 3. Assertion Fixtures (v1.0+)

```typescript
export function decisionFixture(text: string, options?: Partial<Decision>): Decision {
  const conflictKey = createDeterministicId(`Decision:${text}`);

  return {
    id: createDeterministicId(`Decision:${text}:v1`),
    kind: 'Decision',
    schema_version: 'v0.1',
    text,
    conflict_key: conflictKey,
    scope: options?.scope ?? { environment: 'all', platform: 'all' },
    options_considered: options?.options_considered ?? [],
    rationale: options?.rationale ?? '',
    created_at: '2026-01-24T00:00:00Z',
    ...options,
  };
}
```

### 4. Evidence Fixtures (v1.0+)

```typescript
export function evidenceFixture(locator: string, options?: Partial<Evidence>): Evidence {
  return {
    id: createDeterministicId(`Evidence:${locator}`),
    kind: 'Evidence',
    schema_version: 'v0.1',
    artifact_locator: locator,
    confidence: 0.9,
    retention_mode: 'link-only',
    ...options,
  };
}
```

**Fixture Properties:**

- **Deterministic**: Same inputs → same output (via SHA-256 IDs)
- **Composable**: Can be combined to build complex scenarios
- **Testable**: Fixture tests validate they produce valid nodes
- **Documented**: Each fixture documents expected usage

---

## GraphApp Orchestrator

Summary: Main context and orchestrator providing fluent API for graph operations and introspection.

**Core Interface:**

```typescript
class GraphApp {
  // Configuration
  store: InMemoryGraphStore;
  project_id: string;
  current_agent_id: string;
  current_activity_id: string;

  // Initialization
  constructor(options?: {
    store?: GraphStore;
    project_id?: string;
    with_default_policies?: boolean;
  });

  // Builder pattern: graph operations
  withPolicy(kind: PolicyKind, scope: string, fields?: Partial<PolicyNode>): this;
  withDefaultPolicies(): this;

  async ingestRepo(options: {
    url: string;
    commit: string;
    project_id?: string;
  }): Promise<IngestResult>;

  createAssertion<K extends AssertionKind>(
    kind: K,
    fields: Omit<AssertionOfKind[K], 'id' | 'schema_version' | 'created_at'>,
  ): AssertionOfKind[K];

  runProjection(name: string, selection?: PolicySelection): ProjectionEnvelope;

  // Graph queries
  queryNodes(filter?: { kind?: string; subject_id?: string; scope?: ScopeFilter }): GraphNode[];

  queryEdges(filter?: { kind?: string; from?: NodeId; to?: NodeId }): GraphEdge[];

  getNode(id: NodeId): GraphNode | undefined;

  // Introspection and debugging
  explain(node_id: NodeId): ExplanationPath;

  trace(start_id: NodeId, depth?: number): TraceResult;

  diff(before: GraphStore, after: GraphStore): Change[];

  dump(options?: { format?: 'text' | 'json' }): string;

  // Validation
  validate(): ValidationResult;

  checkInvariants(): GraphHealthReport;

  // Transaction control (delegates to store)
  beginTransaction(): void;
  commit(): void;
  rollback(): void;
}
```

**Method Details:**

### `withPolicy(kind, scope, fields)`

Adds a policy node to the store with deterministic ID. Returns `this` for chaining.

### `ingestRepo(options)`

Calls ScipTsIngestionConnector, stores artifacts, returns result with counts.

### `createAssertion(kind, fields)`

Builds deterministic node ID, stores in graph, returns typed assertion. Does NOT commit
automatically (caller manages transaction).

### `runProjection(name, selection?)`

Resolves ProjectionPolicy (if selection provided), calls appropriate ProjectionRunner, returns
ProjectionEnvelope with explainability.

### `explain(node_id)`

Walks graph backwards from node to find evidence/provenance chain. Returns ExplanationPath suitable
for projection explain fields.

### `trace(start_id, depth?)`

Breadth-first traversal from start_id showing all incoming/outgoing relationships. Used for
debugging complex linkage.

### `dump(options?)`

Pretty-prints all nodes and edges with relationships. Useful for terminal inspection.

### `validate()`

Runs all ValidationPolicy checks, returns summary (pass/fail per check).

### `checkInvariants()`

Executes all invariant checks from REQ-graph-knowledge-system (decision completeness, requirement
derivation, etc.). Returns report with violations list.

---

## Scenario Registry and Organization

Summary: Scenarios organized by version (v0.1, v1.0, v2.0+) and functionality domain.

### v0.1 Scenarios (Ready Now)

**Directory:** `src/scenarios/v0-1/`

1. **repo-ingestion-base.ts**
   - Name: "repo-ingestion-base"
   - Tags: ['ingestion', 'v0.1']
   - Workflow: Clone repo → Install → Run SCIP → Create artifacts
   - Validates: File count, symbol count, locator format (`path#scip_symbol`)
   - Returns: Artifact structure ready for projection

2. **repo-ingestion-determinism.ts**
   - Name: "repo-ingestion-determinism"
   - Tags: ['ingestion', 'determinism', 'v0.1']
   - Workflow: Run repo-ingestion-base twice on same commit
   - Validates: Identical node counts, identical content hash, identical edge structure
   - Returns: Determinism report (pass/fail)

3. **json-dumps-format.ts**
   - Name: "json-dumps-format"
   - Tags: ['ingestion', 'dumps', 'v0.1']
   - Workflow: Ingest repo, call writeJsonDumps(), inspect outputs
   - Validates: Schema version, generated_at timestamp, node counts match
   - Returns: Paths to generated JSON files

4. **projection-current-truth-basic.ts**
   - Name: "projection-current-truth-basic"
   - Tags: ['projection', 'v0.1']
   - Workflow: Ingest repo, run CurrentCommittedTruth projection
   - Validates: Projection includes all artifact nodes, ExplanationPath present
   - Returns: ProjectionEnvelope

5. **toolchain-provenance.ts**
   - Name: "toolchain-provenance"
   - Tags: ['ingestion', 'provenance', 'v0.1']
   - Workflow: Ingest repo, inspect ArtifactState node metadata
   - Validates: node_version, package_manager, scip_typescript_version recorded
   - Returns: Provenance record

### v1.0 Scenarios (Future)

**Directory:** `src/scenarios/v1-0/`

1. **lifecycle-decision-to-requirement.ts**
   - Tags: ['lifecycle', 'assertions', 'v1.0']
   - Workflow: Create Decision → Create Requirement derived from it
   - Validates: Links created, both in current-truth projection

2. **supersession-chains.ts**
   - Tags: ['lifecycle', 'supersession', 'v1.0']
   - Workflow: Create Decision v1 → v2 supersedes v1 → v3 supersedes v2
   - Validates: v1 and v2 excluded from projection, only v3 selected

3. **conflict-detection-scope-overlap.ts**
   - Tags: ['lifecycle', 'conflicts', 'v1.0']
   - Workflow: Create overlapping-scope Requirements
   - Validates: Conflict flagged in projection

4. **evidence-anchoring-to-artifact.ts**
   - Tags: ['evidence', 'anchoring', 'v1.0']
   - Workflow: Create Evidence linked to artifact part (symbol)
   - Validates: Locator format correct, edges created

5. **evidence-promotion-to-requirement.ts**
   - Tags: ['evidence', 'promotion', 'v1.0']
   - Workflow: Create Evidence → Trigger IngestionPolicy promotion → Requirement created
   - Validates: Evidence remains, Requirement created, links established

6. **plan-execution-to-activework.ts**
   - Tags: ['planning', 'activework', 'v1.0']
   - Workflow: Create Plan/PlanSteps → Mark as in-progress → Run ActiveWork projection
   - Validates: Projection includes active steps in priority order

7. **validation-invariants-breach.ts**
   - Tags: ['validation', 'invariants', 'v1.0']
   - Workflow: Create invalid Requirement (missing ABOUT_SUBJECT) → Run GraphHealth
   - Validates: "Missing mandatory link" error raised

8. **graphhealth-full-checks.ts**
   - Tags: ['validation', 'graphhealth', 'v1.0']
   - Workflow: Create valid + invalid assertions → Run GraphHealth
   - Validates: All checks executed, errors reported with correct severity

### v2.0+ Scenarios

**Directory:** `src/scenarios/v2-0/` (future)

1. **external-source-ingestion.ts**
2. **verification-linking.ts**
3. **waiver-system.ts**
4. **full-text-search.ts**

**Scenario Index:**

All scenarios registered in `src/scenarios/index.ts`:

```typescript
export const scenarios: Record<string, Scenario> = {
  'v0.1/repo-ingestion-base': repoIngestionBase,
  'v0.1/repo-ingestion-determinism': repoIngestionDeterminism,
  'v0.1/json-dumps-format': jsonDumpsFormat,
  'v0.1/projection-current-truth-basic': projectionCurrentTruthBasic,
  'v0.1/toolchain-provenance': toolchainProvenance,

  'v1.0/lifecycle-decision-to-requirement': lifecycleDecisionToRequirement,
  'v1.0/supersession-chains': supersessionChains,
  'v1.0/conflict-detection-scope-overlap': conflictDetectionScopeOverlap,
  // ... more v1.0 scenarios
};

export function getScenariosByVersion(version: 'v0.1' | 'v1.0' | 'v2.0+'): Scenario[] {
  return Object.values(scenarios).filter((s) => s.version === version);
}

export function getScenariosByTag(tag: string): Scenario[] {
  return Object.values(scenarios).filter((s) => s.tags.includes(tag));
}
```

---

## Inspector Tools

Summary: Debugging and visualization tools for graph state inspection and analysis.

**Inspector Interface:**

```typescript
class GraphInspector {
  constructor(private app: GraphApp) {}

  // Pretty-print graph state
  dump(options?: { format?: 'text' | 'json'; max_nodes?: number }): string;

  // Follow relationship chains
  trace(start_id: NodeId, depth?: number): TraceOutput;

  // Compare two graph snapshots
  diff(before_snapshot: GraphSnapshot, after_snapshot: GraphSnapshot): DiffReport;

  // Render ExplanationPath as human-readable text
  explainPath(path: ExplanationPath): string;

  // Summarize graph statistics
  summary(): GraphSummary;
}
```

### Dumper

```typescript
// Output: Human-readable tree of nodes and edges
dump():
  Nodes (47 total)
  ├── ArtifactRoot: 1
  │   └── uuid-123...
  │       text: "repo: https://github.com/sindresorhus/ky"
  ├── ArtifactState: 1
  │   └── uuid-456...
  │       version_ref: "51b0129"
  │       content_hash: "abcd..."
  ├── ArtifactPart (file): 28
  ├── ArtifactPart (symbol): 17
  └── Policy: 2

  Edges (52 total)
  ├── HasState: 1 (ArtifactRoot → ArtifactState)
  ├── HasPart: 45 (ArtifactState → ArtifactPart)
  └── HasPolicy: 2 (Project → Policy)
```

### Tracer

```typescript
// Output: Relationship chains from a node
trace(node_id):
  Start: ArtifactState (uuid-456)
  ├── HasPart → ArtifactPart (file: src/index.ts)
  │   └── HasPart (reverse) ← ArtifactState
  └── BELONGS_TO → Project (id: proj-1)
      ├── HasPolicy → IngestionPolicy
      └── HasPolicy → ProjectionPolicy
```

### Differ

```typescript
// Output: Changes between two snapshots
diff(before, after):
  +1 node: Policy (ProjectionPolicy)
  +2 edges: BELONGS_TO
  ~3 nodes: updated (e.g., supersession added)
  -0 nodes removed

  Details:
  + ArtifactPart(symbol: greet)
  + Edge(ArtifactState → ArtifactPart#greet)
```

### Explainer

```typescript
// Output: Human-readable explanation path
explainPath(path):
  Rule: CurrentCommittedTruth v0.1
  Selection: Latest non-superseded committed assertion

  Path:
  1. Source: ArtifactPart (file: src/index.ts)
     ↓ EVIDENCE_FOR
  2. Evidence (confidence: 0.9)
     ↓ ANCHORS_TO_ASSERTION
  3. Requirement (id: uuid-789)
     ✓ COMMITTED & NOT SUPERSEDED
  4. Projection item: Requirement in CurrentCommittedTruth

  Top Evidence:
  - ArtifactPart(src/index.ts#greet) - confidence: 0.95
  - Symbol definition in SCIP index - confidence: 0.9
```

---

## Testing Strategy

Summary: Unit, integration, and E2E testing modes aligned with scenario versions.

### Unit Tests (Fast, Isolated)

**File:** `unit/scenarios.test.ts`

```typescript
// Test scenario metadata
test('all scenarios have required metadata', () => {
  for (const scenario of Object.values(scenarios)) {
    expect(scenario.name).toBeDefined();
    expect(scenario.version).toMatch(/v0\.1|v1\.0|v2\.0\+/);
    expect(scenario.tags.length).toBeGreaterThan(0);
  }
});

// Test fixture generation
test('policy fixtures generate deterministic IDs', () => {
  const policy1 = defaultIngestionPolicy('*');
  const policy2 = defaultIngestionPolicy('*');
  expect(policy1.id).toBe(policy2.id);
});

// Test scenario composition
test('scenarios can be composed', async () => {
  const app = new GraphApp({ with_default_policies: true });
  const ingestResult = await repo_ingestion_base(app);
  expect(ingestResult.success).toBe(true);
  expect(ingestResult.node_count).toBeGreaterThan(0);
});
```

**File:** `unit/fixtures.test.ts`

```typescript
test('fixture artifacts are valid nodes', () => {
  const { root, state } = repoFixture();
  expect(root.kind).toBe('ArtifactRoot');
  expect(root.schema_version).toBe('v0.1');
  expect(state.artifact_root_id).toBe(root.id);
});

test('fixtures produce consistent IDs', () => {
  const f1 = repoFixture({ url: 'https://github.com/a/b', commit: 'abc' });
  const f2 = repoFixture({ url: 'https://github.com/a/b', commit: 'abc' });
  expect(f1.root.id).toBe(f2.root.id);
});
```

**File:** `unit/inspectors.test.ts`

```typescript
test('dumper formats graph correctly', async () => {
  const app = new GraphApp({ with_default_policies: true });
  await repo_ingestion_base(app);
  const output = app.dump();
  expect(output).toContain('Nodes');
  expect(output).toContain('Edges');
  expect(output).toContain('ArtifactRoot');
});
```

### Integration Tests (Medium, Multi-Step)

**File:** `integration/workflows.test.ts`

```typescript
test('ingest → project → validate workflow (v0.1)', async () => {
  const app = new GraphApp({ with_default_policies: true });

  // Ingest
  await app.ingestRepo({
    url: 'https://github.com/sindresorhus/ky',
    commit: '51b0129',
  });

  // Project
  const projection = app.runProjection('CurrentCommittedTruth');
  expect(projection.nodes.length).toBeGreaterThan(0);

  // Validate
  const validation = app.validate();
  expect(validation.errors).toHaveLength(0);
});

test('lifecycle workflow (v1.0+)', async () => {
  const app = new GraphApp({ with_default_policies: true });

  // Create decision
  const decision = app.createAssertion('Decision', {
    text: 'Use TypeScript for all new code',
    options_considered: ['TypeScript', 'Flow', 'JavaScript'],
  });

  // Create requirement from decision
  const requirement = app.createAssertion('Requirement', {
    text: 'All source files must be .ts',
    derived_from: decision.id,
  });

  // Create specification
  const spec = app.createAssertion('SpecClause', {
    text: 'Strict mode enabled in tsconfig',
    refines: requirement.id,
  });

  // Project and validate
  const projection = app.runProjection('CurrentCommittedTruth');
  expect(projection.nodes).toContainEqual(expect.objectContaining({ id: decision.id }));
  expect(projection.nodes).toContainEqual(expect.objectContaining({ id: requirement.id }));
  expect(projection.nodes).toContainEqual(expect.objectContaining({ id: spec.id }));
});
```

### E2E Tests (Slow, Real Data)

**File:** `e2e/v0-1/sindresorhus-ky.test.ts`

```typescript
describe('E2E: sindresorhus/ky v0.1 ingestion', () => {
  it('ingests deterministically', async () => {
    const run1 = await new GraphApp({ with_default_policies: true }).ingestRepo({
      url: 'https://github.com/sindresorhus/ky',
      commit: '51b0129',
    });

    const run2 = await new GraphApp({ with_default_policies: true }).ingestRepo({
      url: 'https://github.com/sindresorhus/ky',
      commit: '51b0129',
    });

    expect(run1.node_count).toBe(run2.node_count);
    expect(run1.edge_count).toBe(run2.edge_count);
    expect(run1.artifact_state.content_hash).toBe(run2.artifact_state.content_hash);
  });

  it('creates correct artifact structure', async () => {
    const app = new GraphApp({ with_default_policies: true });
    const result = await app.ingestRepo({
      url: 'https://github.com/sindresorhus/ky',
      commit: '51b0129',
    });

    const fileParts = app
      .queryNodes({ kind: 'ArtifactPart' })
      .filter((n) => (n as ArtifactPartNode).part_kind === 'file');
    const symbolParts = app
      .queryNodes({ kind: 'ArtifactPart' })
      .filter((n) => (n as ArtifactPartNode).part_kind === 'symbol');

    expect(fileParts.length).toBeGreaterThan(10);
    expect(symbolParts.length).toBeGreaterThan(100);

    // Verify locator format
    for (const part of symbolParts) {
      expect((part as ArtifactPartNode).locator).toMatch(/^.+#.+$/); // path#symbol
    }
  });

  it('projection includes all artifacts', async () => {
    const app = new GraphApp({ with_default_policies: true });
    await app.ingestRepo({
      url: 'https://github.com/sindresorhus/ky',
      commit: '51b0129',
    });

    const projection = app.runProjection('CurrentCommittedTruth');
    const artifactNodes = projection.nodes.filter(
      (n) => n.kind === 'ArtifactRoot' || n.kind === 'ArtifactPart',
    );

    expect(artifactNodes.length).toBeGreaterThan(0);
  });
});
```

**File:** `e2e/v1-0/lifecycle.test.ts`

```typescript
describe('E2E: v1.0 lifecycle workflow', () => {
  it('maintains invariants across decision → requirement → spec chain', async () => {
    const app = new GraphApp({ with_default_policies: true })

    const decision = app.createAssertion('Decision', { ... })
    const requirement = app.createAssertion('Requirement', { derived_from: decision.id, ... })
    const spec = app.createAssertion('SpecClause', { refines: requirement.id, ... })

    const health = app.checkInvariants()
    expect(health.errors).toHaveLength(0)
  })

  it('detects scope conflicts', async () => {
    const app = new GraphApp({ with_default_policies: true })

    const req1 = app.createAssertion('Requirement', {
      text: 'Use TypeScript',
      scope: { environment: 'prod', platform: 'all' },
    })

    const req2 = app.createAssertion('Requirement', {
      text: 'Use JavaScript',
      scope: { environment: 'all', platform: 'all' },
    })

    const projection = app.runProjection('CurrentCommittedTruth')
    const conflictItem = projection.items.find(i => i.item_id === req1.id)
    expect(conflictItem?.conflicted).toBe(true)
  })
})
```

---

## Execution Modes

Summary: Single scenario, batch, E2E, and interactive modes for different use cases.

### Mode 1: Single Scenario (Local Development)

```bash
# Run one scenario with beautiful Ink UI + JSON files
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base

# Terminal Output (Ink+Pastel UI):
# ┌─────────────────────────────────────┐
# │  repo-ingestion-base (v0.1)         │
# ├─────────────────────────────────────┤
# │ ⏳ Cloning repo...                   │
# │ ✓ Installed dependencies            │
# │ ⏳ Running scip-typescript...        │
# │   Indexed: 156 symbols in 42 files  │
# │ ✓ Created artifact nodes            │
# │   Root: 1 | State: 1 | Parts: 45    │
# │ ✓ Generated JSON dumps              │
# ├─────────────────────────────────────┤
# │ Success (12.3s)                     │
# │ Dump: ./tmp/graph-dump              │
# └─────────────────────────────────────┘

# Files Created:
# ./tmp/graph-dump/artifacts.json (47 nodes, 52 edges)
# ./tmp/graph-dump/policies.json (2 policies)
# ./tmp/graph-dump/projection.json (CurrentCommittedTruth)
# ./tmp/graph-dump/graph_dump_summary.json (metadata)
```

**With flags:**

```bash
# JSON output only (for CI/CD automation)
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --json

# Console output is JSON (no UI):
# {
#   "scenario": "repo-ingestion-base",
#   "version": "v0.1",
#   "success": true,
#   "duration_ms": 12345,
#   "node_count": 47,
#   "edge_count": 52,
#   "symbols_indexed": 156,
#   "dump_path": "./tmp/graph-dump"
# }

# Suppress UI, files only (for headless execution)
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --quiet
# No terminal output, files written to ./tmp/graph-dump/
```

### Mode 2: Batch Scenarios (CI/CD)

```bash
# Run all v0.1 scenarios with live progress UI (Ink)
pnpm -C apps/graph-app run-scenarios v0.1/* --report

# Terminal Output (Ink+Pastel live UI):
# ┌──────────────────────────────────────────┐
# │ Running v0.1 Scenarios (5/5)             │
# ├──────────────────────────────────────────┤
# │ ✓ repo-ingestion-base (2.1s)             │
# │ ✓ repo-ingestion-determinism (4.2s)      │
# │ ✓ json-dumps-format (1.8s)               │
# │ ⏳ projection-current-truth-basic...      │
# │   projection-current-truth-basic (0.8s)  │
# │ ⏳ toolchain-provenance...               │
# ├──────────────────────────────────────────┤
# │ Passed: 5/5  |  Duration: 9.4s           │
# │ Artifacts: 224  |  Conflicts: 0          │
# └──────────────────────────────────────────┘

# For CI/CD parsing, use JSON flag (no UI)
pnpm -C apps/graph-app run-scenarios v0.1/* --report --json

# Console Output (JSON, no Ink UI):
# {
#   "batch_name": "v0.1",
#   "total_scenarios": 5,
#   "passed": 5,
#   "failed": 0,
#   "duration_ms": 9400,
#   "scenarios": [
#     {"name": "repo-ingestion-base", "success": true, "duration_ms": 2100},
#     {"name": "repo-ingestion-determinism", "success": true, "duration_ms": 4200},
#     ...
#   ],
#   "summary": {"artifacts": 224, "assertions": 0, "conflicts": 0}
# }
```

### Mode 3: E2E Tests

```bash
# Run full test suite with Ink progress UI
pnpm -C apps/graph-app test

# Terminal Output (Ink+Pastel):
# ┌────────────────────────────┐
# │ Running Test Suite          │
# ├────────────────────────────┤
# │ Unit Tests: 12/12 ✓        │
# │ Integration: 8/8 ✓         │
# │ E2E (v0.1): 5/5 ✓          │
# │ E2E (v1.0): 8/8 ✓          │
# ├────────────────────────────┤
# │ Total: 33 ✓  |  45.2s      │
# │ Pass Rate: 100%            │
# └────────────────────────────┘

# Or just e2e
pnpm -C apps/graph-app test:e2e
```

### Mode 4: Interactive Inspector (Ink TUI)

```bash
# Start interactive Ink-based TUI with app context
pnpm -C apps/graph-app inspect

# Terminal UI (Ink+Pastel interactive):
# ┌──────────────────────────────────────┐
# │ Graph Inspector (Interactive Mode)   │
# ├──────────────────────────────────────┤
# │                                      │
# │ > _                                  │
# │                                      │
# │ Commands: ingest, dump, trace,       │
# │           diff, project, exit        │
# │ Help: type 'help' for all commands   │
# └──────────────────────────────────────┘

# Interactive commands:
# > ingest({ url: 'https://github.com/...', commit: '...' })
#
# ┌──────────────────────────────────────┐
# │ ⏳ Ingesting repository...            │
# │ ✓ Ingestion complete                 │
# │   Nodes: 47 | Edges: 52              │
# └──────────────────────────────────────┘

# > dump()
#
# ┌──────────────────────────────────────┐
# │ Graph State                          │
# ├──────────────────────────────────────┤
# │ Nodes (47 total)                    │
# │ ├── ArtifactRoot: 1                  │
# │ ├── ArtifactState: 1                 │
# │ ├── ArtifactPart (file): 28          │
# │ ├── ArtifactPart (symbol): 17        │
# │ └── Policy: 2                        │
# │                                      │
# │ Edges (52 total)                    │
# │ ├── HasState: 1                      │
# │ ├── HasPart: 45                      │
# │ └── HasPolicy: 2                     │
# └──────────────────────────────────────┘

# > trace('node-456')  # Follow relationship chains
# > diff(snap1, snap2)  # Compare graph snapshots
# > project('CurrentCommittedTruth')  # Run projection
# > exit()  # Leave interactive mode
```

---

## Extensibility Contract

Summary: New graph features add Scenarios and E2E tests; libraries remain unchanged.

**Adding a v1.0 Feature:**

When you add a new lifecycle assertion kind (e.g., `Plan`):

1. **Library package updates** (graph-lifecycle):
   - Define `PlanNode` schema in graph-core
   - Add validator for Plan in graph-validation
   - Update store to persist Plan nodes

2. **App updates** (graph-app):
   - Add `planFixture()` in `src/fixtures/assertions.ts`
   - Create new scenario `src/scenarios/v1-0/plan-execution.ts`
   - Add E2E test `e2e/v1-0/planning.test.ts`
   - Register scenario in `src/scenarios/index.ts`

3. **Result:**
   - Existing v0.1 scenarios unchanged
   - New v1.0 scenarios test Plan features
   - Full backward compatibility

**Adding a v2.0 Feature:**

When you add external ingestion (forum/issue):

1. **Library package**: New `graph-ingest-connector-forum`
2. **App package**: New `src/scenarios/v2-0/forum-ingestion.ts` + E2E tests
3. **Result**: v0.1 and v1.0 scenarios still pass; v2.0 scenarios test new connector

**Principle:**

- App grows by **addition** only
- No rewrites to existing scenarios
- Libraries never reference app
- New features = new scenarios + new tests + new fixtures

---

## Non-Throwaway Guarantees

Summary: App designed to grow with system without architectural rewrites.

**Stable Contracts:**

- **Scenario interface**: Defined once, extended via tagging and composition
- **Fixture model**: Factory functions, never change; new fixtures added
- **GraphApp API**: Methods only added, never removed
- **Inspector tools**: Can add new inspectors; existing ones remain stable
- **Output model**: JSON dumps always available; database persistence added in v2.0+ without
  breaking v0.1/v1.0

**Version Boundaries:**

- v0.1 scenarios isolated in `src/scenarios/v0-1/`
- v1.0 scenarios in `src/scenarios/v1-0/`
- v2.0+ in `src/scenarios/v2-0/`
- No cross-version dependencies (v1.0 scenarios don't call v0.1 scenarios)

**Backward Compatibility:**

- v0.1 tests must pass even when v1.0 is added
- v1.0 tests must pass even when v2.0 is added
- Snapshot files are versioned (v0.1/, v1.0/)

**Validation:**

- `pnpm -C apps/graph-app test:v0.1` always passes
- New version adds new test suite, doesn't break old ones
- Nx dependency graph enforced at build time

---

## Open Questions

1. Should Scenarios support conditional branches (e.g., skip if v1.0 not available)?
2. Should inspector tools be interactive CLI or programmatic only?
3. Should snapshot files be committed or generated?
4. How to handle long-running scenarios (timeouts, parallelization)?

---

## Related Documents

- REQ-graph-system-graph-system-architecture.md
- REQ-graph-system-graph-knowledge-system.md
- REQ-graph-ingestion.md
- REQ-graph-projection.md
- REQ-graph-lifecycle.md
- SPEC-graph-system-vertical-slice-v0-1.md
