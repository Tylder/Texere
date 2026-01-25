---
type: ANALYSIS
status: draft
created: 2026-01-24
summary: Comprehensive analysis of CLI tool specification gaps and recommendations for closure
area: graph-system
feature: graph-cli-app
---

# CLI Tool Specification & Plan Gap Analysis

## Overview

This document systematically addresses the gaps identified in **IMPL-PLAN-graph-cli-app.md** and
synthesizes insights from **SPEC-graph-cli-app.md** and related requirements to provide concrete,
implementable specifications for the CLI tool.

The plan identifies **12 gaps** (2 critical, 2 high, 6 medium, 2 low) totaling ~16-20 hours of work
to fix. This analysis organizes closure strategies by priority and provides detailed specifications
for each gap.

---

## Part 1: Critical Gaps Closure

### Gap 1: CLI Commands & Entry Points Not Defined

**Status:** 🔴 CRITICAL  
**Impact:** Developers won't know how to run the app  
**Current State:** Plan describes internal app structure but no CLI commands

#### Specification: CLI Commands

The app MUST expose four execution modes via command-line interface:

**Command: `pnpm -C apps/graph-app run-scenario <name>`**

Execute a single scenario by name with optional flags.

```bash
# Basic usage (default: Ink UI output)
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base

# JSON output only (for CI/CD automation)
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --json

# Suppress UI, files only
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --quiet

# Specify output directory
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --output ./custom-dump
```

**Command: `pnpm -C apps/graph-app run-scenarios <pattern>`**

Execute multiple scenarios matching a glob pattern.

```bash
# Run all v0.1 scenarios with live progress UI
pnpm -C apps/graph-app run-scenarios v0.1/*

# Run all scenarios
pnpm -C apps/graph-app run-scenarios **/*

# With report flag for CI/CD integration
pnpm -C apps/graph-app run-scenarios v0.1/* --report --json
```

**Command: `pnpm -C apps/graph-app test`**

Run full test suite (unit + integration + E2E).

```bash
# Run all tests
pnpm -C apps/graph-app test

# Run specific test type
pnpm -C apps/graph-app test:unit
pnpm -C apps/graph-app test:integration
pnpm -C apps/graph-app test:e2e
pnpm -C apps/graph-app test:e2e:v0.1

# With coverage report
pnpm -C apps/graph-app test:coverage
```

**Command: `pnpm -C apps/graph-app inspect`**

Start interactive inspector mode (TUI with Ink).

```bash
# Start interactive mode
pnpm -C apps/graph-app inspect
```

#### Implementation Details

**Technology Stack:**

- **Commander.js** — CLI framework for command routing and flag parsing
- **Ink + Pastel** — React components for beautiful terminal UI
- **Enquirer** — Interactive prompts for inspect mode

**Code Structure:**

```
apps/graph-app/
├── src/
│   ├── index.ts              # Entry point, calls CLI setup
│   ├── cli/
│   │   ├── index.ts          # Commander setup & routing
│   │   ├── commands/
│   │   │   ├── run-scenario.ts
│   │   │   ├── run-scenarios.ts
│   │   │   ├── test.ts
│   │   │   └── inspect.ts
│   │   └── flags.ts          # Shared flag definitions
│   └── ...
├── package.json              # Commander, Ink, Pastel deps
└── ...
```

**Deliverables:**

- `src/cli/index.ts` — Commander setup and help text
- `src/cli/commands/*.ts` — 4 command implementations
- `src/cli/flags.ts` — Flag interface and defaults
- Tests: `unit/cli/commands.test.ts`

**Effort:** 2-3 hours

**Verification:**

- [ ] `pnpm -C apps/graph-app --help` shows all commands
- [ ] `run-scenario` command works with fixtures
- [ ] `run-scenarios` accepts glob patterns
- [ ] Flags `--json`, `--quiet`, `--report` are recognized
- [ ] Unit tests verify command routing

---

### Gap 2: Ink + Pastel Components Not in Milestones

**Status:** 🔴 CRITICAL  
**Impact:** SPEC promises beautiful Ink UI, but plan allocates no effort for it  
**Current State:** Ink rendering completely absent from milestone deliverables

#### Specification: Ink Components

The app MUST render all user output via React components compiled to Ink + Pastel terminal output.
Four main component classes:

**1. ScenarioBox (Single Scenario Progress)**

Renders progress for one scenario execution.

```tsx
// Props interface
interface ScenarioBoxProps {
  name: string; // e.g., "v0.1/repo-ingestion-base"
  status: 'running' | 'success' | 'failed';
  progress?: {
    current: number; // e.g., 2
    total: number; // e.g., 5
    message: string; // e.g., "Cloning repo..."
  };
  error?: Error;
  duration?: number; // milliseconds
}

// Renders:
// ┌─────────────────────────────────────┐
// │  repo-ingestion-base (v0.1)         │
// ├─────────────────────────────────────┤
// │ ⏳ Cloning repo...                   │
// │ ✓ Installed dependencies            │
// │ ⏳ Running scip-typescript...        │
// │   Indexed: 156 symbols in 42 files  │
// ├─────────────────────────────────────┤
// │ Success (12.3s)                     │
// │ Dump: ./tmp/graph-dump              │
// └─────────────────────────────────────┘
```

**2. BatchBox (Multiple Scenarios Progress)**

Renders live progress for batch scenario execution.

```tsx
interface BatchBoxProps {
  total: number;
  completed: number;
  failed: number;
  currentName: string;
  scenarios: Array<{
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    duration?: number;
  }>;
  totalDuration?: number;
}

// Renders:
// ┌──────────────────────────────────────────┐
// │ Running v0.1 Scenarios (5/5)             │
// ├──────────────────────────────────────────┤
// │ ✓ repo-ingestion-base (2.1s)             │
// │ ✓ repo-ingestion-determinism (4.2s)      │
// │ ✓ json-dumps-format (1.8s)               │
// │ ⏳ projection-current-truth-basic...      │
// ├──────────────────────────────────────────┤
// │ Passed: 5/5  |  Duration: 9.4s           │
// └──────────────────────────────────────────┘
```

**3. TestBox (Test Results Display)**

Renders test suite results with category breakdown.

```tsx
interface TestBoxProps {
  categories: {
    unit: { total: number; passed: number };
    integration: { total: number; passed: number };
    e2e: { total: number; passed: number };
  };
  totalDuration: number;
}

// Renders:
// ┌────────────────────────────┐
// │ Running Test Suite          │
// ├────────────────────────────┤
// │ Unit Tests: 12/12 ✓        │
// │ Integration: 8/8 ✓         │
// │ E2E (v0.1): 5/5 ✓          │
// ├────────────────────────────┤
// │ Total: 33 ✓  |  45.2s      │
// │ Pass Rate: 100%            │
// └────────────────────────────┘
```

**4. InspectorPrompt (Interactive Input)**

Renders command input prompt with help text.

```tsx
interface InspectorPromptProps {
  onInput: (command: string) => void;
  commands: string[]; // available commands for autocomplete
}

// Renders:
// ┌──────────────────────────────────────┐
// │ Graph Inspector (Interactive Mode)   │
// ├──────────────────────────────────────┤
// │ > _                                  │
// │ Commands: ingest, dump, trace,       │
// │           diff, project, exit        │
// │ Help: type 'help' for all commands   │
// └──────────────────────────────────────┘
```

**5. GraphDumper (Graph Visualization)**

Renders hierarchical graph structure with node/edge summaries.

```tsx
interface GraphDumperProps {
  nodes: Array<{ kind: string; count: number }>;
  edges: Array<{ kind: string; count: number }>;
  totalDuration?: number;
}

// Renders:
// ┌──────────────────────────────────────┐
// │ Graph State                          │
// ├──────────────────────────────────────┤
// │ Nodes (47 total)                    │
// │ ├── ArtifactRoot: 1                  │
// │ ├── ArtifactState: 1                 │
// │ ├── ArtifactPart: 45                 │
// │ └── Policy: 2                        │
// │ Edges (52 total)                    │
// │ ├── HasState: 1                      │
// │ ├── HasPart: 45                      │
// │ └── HasPolicy: 2                     │
// └──────────────────────────────────────┘
```

#### Implementation Details

**Code Structure:**

```
apps/graph-app/src/cli/
├── components/
│   ├── ScenarioBox.tsx
│   ├── BatchBox.tsx
│   ├── TestBox.tsx
│   ├── InspectorPrompt.tsx
│   ├── GraphDumper.tsx
│   └── common/
│       ├── Box.tsx           # Wrapper for box drawing
│       └── colors.ts         # Pastel color palette
├── render.ts                 # Render function helpers
└── ...
```

**Deliverables:**

- `src/cli/components/*.tsx` — 5 component files
- `src/cli/render.ts` — Ink render wrapper
- Tests: `unit/cli/components.test.ts` (snapshot tests)

**Dependencies to Add:**

```json
{
  "ink": "^5.0.0",
  "pastel": "^1.0.0",
  "react": "^18.0.0"
}
```

**Effort:** 2-3 hours (includes Ink + Pastel learning curve)

**Verification:**

- [ ] All components compile and render
- [ ] ScenarioBox renders progress correctly
- [ ] BatchBox updates live during execution
- [ ] TestBox displays category breakdowns
- [ ] InspectorPrompt accepts input
- [ ] Snapshot tests pass

---

## Part 2: High Priority Gaps Closure

### Gap 3: Work Breakdown Table Missing

**Specification:**

Add a "Work Breakdown" section to the IMPL-PLAN with task-level sequencing.

| Task ID   | Task Name                    | Owner | Duration | Dependencies | Type    |
| --------- | ---------------------------- | ----- | -------- | ------------ | ------- |
| M1.1      | Setup Nx app structure       | —     | 2h       | none         | Setup   |
| M1.2      | Add CLI commands (Commander) | —     | 2-3h     | M1.1         | Feature |
| M1.3      | Add Ink components           | —     | 2-3h     | M1.1         | Feature |
| M1.4      | Add Vitest config            | —     | 1h       | M1.1         | Setup   |
| M2.1      | Implement GraphApp class     | —     | 6h       | M1.1         | Core    |
| M2.2      | Implement Inspectors         | —     | 2h       | M2.1         | Feature |
| M3.1      | Implement Fixtures           | —     | 4h       | M2.1         | Core    |
| M4.1-M4.5 | v0.1 Scenarios               | —     | 10h      | M3.1         | Core    |
| M5        | Unit tests                   | —     | 3h       | M4           | QA      |
| M6        | Integration tests            | —     | 3h       | M4           | QA      |
| M7        | E2E tests (sindresorhus/ky)  | —     | 4h       | M6           | QA      |

**Effort to Add:** 1 hour

---

### Gap 4: Package Dependencies Not Explicit

**Specification:**

Add explicit npm dependencies to M1 preconditions.

```json
{
  "dependencies": {
    "@repo/graph-core": "*",
    "@repo/graph-store": "*",
    "@repo/graph-ingest": "*",
    "@repo/graph-ingest-connector-ts": "*",
    "@repo/graph-projection": "*"
  },
  "devDependencies": {
    "commander": "^12.0.0",
    "enquirer": "^2.4.0",
    "ink": "^5.0.0",
    "pastel": "^1.0.0",
    "react": "^18.0.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

**Effort to Add:** 15 minutes

---

## Part 3: Medium Priority Gaps Closure

### Gap 5: Database Persistence (v2.0+) Not Planned

**Recommendation:** Defer to Phase 3. Add placeholder to IMPL-PLAN Phase 3 section:

```markdown
### Phase 3 Database Milestones (v2.0+)

**M10: Database Adapter Interface**

Define interface for pluggable database backends.

- `src/adapters/database.ts` — abstract DatabaseAdapter
- Support: PostgreSQL, Neo4j, in-memory
- Environment: `GRAPH_DB_URL` for connection string

**M11: Database Write Integration**

Integrate database adapter with scenarios.

- Flag: `--db-write` enables database persistence
- Fallback: JSON dumps if DB not configured
```

**Effort:** 2 hours to plan; defer implementation to Phase 3

---

### Gap 6: Snapshot Management Strategy Vague

**Specification:**

Define snapshot workflow for E2E tests.

**Snapshot File Location:**

```
e2e/v0-1/snapshots/
├── repo-ingestion-base.json
├── repo-ingestion-determinism.json
├── json-dumps-format.json
├── projection-current-truth-basic.json
└── toolchain-provenance.json
```

**Snapshot Format:**

```json
{
  "scenario": "repo-ingestion-base",
  "version": "v0.1",
  "repo": "sindresorhus/ky@v1.14.2",
  "node_counts": {
    "ArtifactRoot": 1,
    "ArtifactState": 1,
    "ArtifactPart": 45,
    "Policy": 2
  },
  "edge_counts": {
    "HasState": 1,
    "HasPart": 45,
    "HasPolicy": 2
  },
  "symbol_count": 156,
  "total_nodes": 47,
  "total_edges": 52,
  "content_hash": "sha256:abc123...",
  "file_count": 42,
  "created_at": "2026-01-24T12:00:00Z"
}
```

**Update Workflow:**

```bash
# Generate snapshots (interactive confirmation)
pnpm -C apps/graph-app update-snapshots

# Or with force flag
pnpm -C apps/graph-app update-snapshots --force
```

**CI Behavior:**

- Snapshots committed to git
- Test compares output to committed snapshot
- Mismatch fails test (prevents silent changes)
- Override via explicit flag or PR approval

**Effort:** 30 minutes

---

### Gap 7: Test Infrastructure Setup Assumed, Not Detailed

**Specification:**

Add new milestone **M1.5: Test Infrastructure & Vitest Setup**

**Deliverables:**

```
apps/graph-app/
├── vitest.config.ts          # Coverage thresholds, watch mode
├── unit/                     # Fast, isolated tests
│   ├── fixtures.test.ts
│   ├── app.test.ts
│   └── ...
├── integration/              # Multi-step tests
│   ├── ingestion.test.ts
│   └── ...
└── e2e/                      # Slow, real data
    ├── v0-1/
    │   ├── repo-ingestion.test.ts
    │   └── snapshots/
    └── ...
```

**vitest.config.ts:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    include: ['**/*.test.ts'],
    testTimeout: 30000, // 30s per test
  },
});
```

**Effort:** 1 hour

---

### Gap 8: Interactive Mode (Inspect) Under-Specified

**Specification:**

Add new milestone **M5b: Interactive Inspector Mode (Ink TUI)**

**Architecture:**

```
src/cli/commands/inspect.ts
├── Start Enquirer prompt loop
├── Parse user input (command + args)
├── Execute command (ingest, dump, trace, diff, project)
├── Render result via Ink component
├── Keep graph in memory across commands
└── Loop until "exit" command
```

**Command Syntax:**

```bash
> ingest({ url: 'https://github.com/sindresorhus/ky', commit: 'v1.14.2' })
> dump()                      # Print current graph
> trace('node-456')           # Follow relationship chains
> diff(snap1, snap2)          # Compare snapshots
> project('CurrentCommittedTruth')  # Run projection
> exit()                      # Leave interactive mode
```

**Implementation:**

```typescript
// src/cli/commands/inspect.ts
import { GraphApp } from '../app';
import enquirer from 'enquirer';
import { renderPrompt } from '../render';

async function inspect() {
  const app = new GraphApp(/* ... */);

  while (true) {
    const { command } = await enquirer.prompt({
      type: 'input',
      name: 'command',
      message: '> ',
      // autocomplete + history
    });

    if (command === 'exit') break;

    try {
      const result = await parseAndExecute(command, app);
      renderInkComponent(result);
    } catch (err) {
      renderError(err);
    }
  }
}
```

**Deliverables:**

- `src/cli/commands/inspect.ts`
- `src/cli/parser.ts` — Command parser
- Tests: `unit/cli/inspect.test.ts`

**Effort:** 4-6 hours (includes Enquirer + Ink learning curve)

---

### Gap 9: Backwards Compatibility Not Tested in Phase 2

**Specification:**

Add regression test to Phase 2 exit criteria.

**Update Phase 2 Exit Criteria:**

```markdown
Phase 2 (v1.0) MUST verify:

- [ ] All v1.0 scenarios pass
- [ ] All v0.1 scenarios still pass (regression check)
  - Run: `pnpm -C apps/graph-app test:v0.1`
  - All tests must pass without modification
- [ ] No breaking changes to GraphApp API
- [ ] No breaking changes to Scenario interface
```

**Implementation:**

Add test suite:

```typescript
// e2e/v0-1/backwards-compat.test.ts
describe('v0.1 scenarios (backwards compatibility check)', () => {
  test('repo-ingestion-base still passes', async () => {
    const result = await runScenario('v0-1/repo-ingestion-base');
    expect(result.success).toBe(true);
  });

  // ... repeat for all v0.1 scenarios
});
```

**Effort:** 30 minutes

---

### Gap 10: Clone & Workspace Lifecycle Vague

**Specification:**

Define E2E test lifecycle management.

**Clone Location:**

```bash
GRAPH_INGEST_ROOT=/tmp/Texere/graph-ingest

# Test creates:
${GRAPH_INGEST_ROOT}/sindresorhus-ky/
├── .git/
├── package.json
├── src/
└── ...
```

**Cleanup Strategy:**

- Keep cloned repos for developer inspection (but limit disk usage)
- Add cleanup script: `pnpm -C apps/graph-app clean:repos`
- Check directory size before clone (warn if >1GB)
- Optional: add `--clean-after` flag to E2E tests

**Timeout Policy:**

- Clone: 2 minutes
- Dependencies: 1 minute
- SCIP indexing: 2 minutes
- Total per test: 5 minutes
- Use `vitest` timeout: `testTimeout: 300000` (5 min)

**Network Dependency:**

- Mark E2E tests as `@flaky` if offline
- Require internet for full E2E suite
- Unit + integration tests MUST work offline

**Implementation:**

```typescript
// e2e/v0-1/repo-ingestion.test.ts
describe('E2E: Repo Ingestion (requires internet)', { timeout: 300000 }, () => {
  beforeAll(async () => {
    const size = await checkDiskSpace(GRAPH_INGEST_ROOT);
    if (size > 1_000_000_000) {
      console.warn(`⚠️ Ingest root is ${size / 1e9}GB, consider cleanup`);
    }
  });

  test('clone and ingest sindresorhus/ky', async () => {
    const result = await app.ingestRepo({
      url: 'https://github.com/sindresorhus/ky',
      commit: 'v1.14.2',
    });
    expect(result.nodeCount).toBe(47);
  });

  afterAll(async () => {
    // Optional: await cleanup(GRAPH_INGEST_ROOT);
  });
});
```

**Effort:** 30 minutes

---

## Part 4: Low Priority Gaps Closure

### Gap 11: Documentation Deliverables Not Planned

**Specification:**

Add documentation deliverables to Phase 1 & 2.

**Phase 1 Docs:**

- `README.md` — Getting started, running scenarios
- `SCENARIOS.md` — Describe each v0.1 scenario
- `ARCHITECTURE.md` — GraphApp design, Fixture patterns

**Phase 2 Docs:**

- `LIFECYCLE.md` — v1.0 scenario examples

**Effort:** 2 hours

---

### Gap 12: Error Handling & Logging Strategy Not Defined

**Specification:**

Define error handling and logging approach.

**Logger Setup:**

- v0.1: Use `console.log()` (simple)
- v1.0: Upgrade to `pino` or `winston` if needed

**Error Categories:**

1. **Ingestion Errors** — Repository clone/SCIP failure
2. **Validation Errors** — Schema/policy violations
3. **Scenario Errors** — Test assertions failed
4. **Ink Render Errors** — Terminal rendering failure

**Ink Error Display:**

```tsx
<Box borderStyle="double" borderColor="red">
  <Text>❌ Error in {scenarioName}</Text>
  <Text color="red">{error.message}</Text>
  {debug && <Text color="gray">{error.stack}</Text>}
</Box>
```

**Debug Flag:**

```bash
pnpm -C apps/graph-app run-scenario v0.1/repo-ingestion-base --debug
# Enables verbose logging + full stacktraces
```

**Effort:** 1 hour

---

## Summary: Gap Closure Roadmap

### Timeline

**Before Phase 1 Starts (~7-8 hours):**

1. **Gap 1** — CLI Commands (2-3h) ← CRITICAL
2. **Gap 2** — Ink Components (2-3h) ← CRITICAL
3. **Gap 3** — Work Breakdown (1h) ← HIGH
4. **Gap 4** — Package Dependencies (15m) ← HIGH

**During Phase 1 Implementation (~5-10 hours):**

5. **Gap 7** — Vitest Setup (1h)
6. **Gap 6** — Snapshot Strategy (30m)
7. **Gap 10** — Clone Lifecycle (30m)
8. **Gap 9** — Backwards Compat checks (30m)
9. **Gap 12** — Error Handling (1h)
10. **Gap 11** — Documentation (2h)

**Phase 3 Planning (Defer):**

11. **Gap 5** — Database Persistence (2h plan)
12. **Gap 8** — Interactive Mode (4-6h, Phase 2+)

### Total Effort: ~16-20 hours

### Risk Mitigation

**Risk: CLI interface changes during Phase 1**

- Mitigation: Define CLI contract in Gap 1; freeze before coding
- Review: Stakeholder approval on commands before implementation

**Risk: Ink components too rigid for v1.0 features**

- Mitigation: Design components as composable, reusable
- Review: Architect interactive mode early (Gap 8) to stress-test components

**Risk: Snapshot files diverge in CI**

- Mitigation: Snapshots committed to git; CI enforces exact match
- Review: Document snapshot update workflow clearly (Gap 6)

---

## Recommendations

### High Priority Actions (Before Phase 1)

1. **Approve CLI command interface** (Gap 1)
   - Stakeholder sign-off on `run-scenario`, `run-scenarios`, `test`, `inspect`
   - Validate flags: `--json`, `--quiet`, `--output`, `--report`, `--debug`

2. **Confirm Ink component design** (Gap 2)
   - Validate visual mockups with team
   - Decide: React + Ink or alternative (Blessed, etc.)?

3. **Review work breakdown** (Gap 3)
   - Assign owners to tasks
   - Update timeline estimates

### Medium Priority Actions (During Phase 1)

4. **Implement test infrastructure early** (Gap 7)
   - Vitest setup before writing tests
   - Establish coverage targets (80% minimum)

5. **Document snapshot workflow** (Gap 6)
   - Add to developer guide
   - Include CI integration examples

6. **Plan interactive mode** (Gap 8)
   - Prototype Enquirer + Ink integration
   - Validate command parser design

### Low Priority Actions (Phase 2+)

7. **Add full documentation suite** (Gap 11)
   - SCENARIOS.md with examples
   - ARCHITECTURE.md with diagrams

8. **Database planning** (Gap 5)
   - Research PostgreSQL + Neo4j adapters
   - Design `DatabaseAdapter` interface

---

## Appendix: CLI Flags Reference

All CLI commands support these flags:

| Flag        | Type    | Default            | Description                        |
| ----------- | ------- | ------------------ | ---------------------------------- |
| `--json`    | boolean | false              | Output JSON instead of Ink UI      |
| `--quiet`   | boolean | false              | Suppress all output; files only    |
| `--output`  | string  | `./tmp/graph-dump` | Output directory for dumps         |
| `--debug`   | boolean | false              | Verbose logging + full stacktraces |
| `--report`  | boolean | false              | Generate HTML report (batch mode)  |
| `--force`   | boolean | false              | Overwrite existing snapshots       |
| `--timeout` | number  | 300000             | Test timeout in ms                 |

---

## Related Documents

- IMPL-PLAN-graph-cli-app.md
- SPEC-graph-cli-app.md
- REQ-graph-system-graph-system-architecture.md
- SPEC-graph-system-vertical-slice-v0-1.md
