---
type: SPEC
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-cli-app
summary_short: >-
  Interactive CLI testing tool that grows with the graph system—add new commands as features are
  implemented
summary_long: >-
  Specifies a simple, extensible interactive CLI application for personal testing of graph features.
  The CLI is designed to grow: as new graph features are implemented (v0.1 repo ingestion, v1.0
  assertions, v1.0+ validation), corresponding commands are added to the CLI. The architecture
  supports adding new commands without requiring architectural changes. Primary purpose: manual
  testing of features during development. Secondary: can serve as E2E test harness.
keywords:
  - cli
  - repl
  - interactive
  - testing
  - extensible
implements:
  - REQ-graph-system-graph-system-architecture
  - REQ-graph-ingestion
  - REQ-graph-projection
related:
  - SPEC-graph-system-vertical-slice-v0-1
index:
  sections:
    - title: 'TLDR'
      lines: [105, 119]
      token_est: 90
    - title: 'Core Design Principle: Extensibility'
      lines: [121, 143]
      token_est: 177
    - title: 'Scope'
      lines: [145, 170]
      token_est: 115
    - title: 'Architecture: Extensible Command Pattern'
      lines: [172, 237]
      token_est: 289
    - title: 'Entry Point'
      lines: [239, 250]
      token_est: 28
    - title: 'GraphCLI Class'
      lines: [252, 292]
      token_est: 199
    - title: 'Command Roadmap: More Commands Coming'
      lines: [294, 341]
      token_est: 309
    - title: 'v0.1 Commands (Currently Available)'
      lines: [343, 733]
      token_est: 1633
      subsections:
        - title: '1. `ingest repo <url> [options]`'
          lines: [345, 417]
          token_est: 418
        - title: '2. `dump [--format <format>]`'
          lines: [419, 492]
          token_est: 271
        - title: '3. `trace <node-id> [--depth <n>]`'
          lines: [494, 556]
          token_est: 288
        - title: '4. `diff <snap1> <snap2>`'
          lines: [558, 615]
          token_est: 247
        - title: '5. `project <name>`'
          lines: [617, 700]
          token_est: 341
        - title: '6. `help [command]`'
          lines: [702, 721]
          token_est: 49
        - title: '7. `exit`'
          lines: [723, 733]
          token_est: 16
    - title: 'Future Commands (v1.0+)'
      lines: [735, 757]
      token_est: 114
    - title: 'State Management'
      lines: [759, 779]
      token_est: 72
    - title: 'Extensibility Example: Adding a v1.0 Command'
      lines: [781, 833]
      token_est: 181
    - title: 'Error Handling'
      lines: [835, 856]
      token_est: 81
    - title: 'Testing'
      lines: [858, 873]
      token_est: 71
    - title: 'Non-Goals'
      lines: [875, 883]
      token_est: 37
    - title: 'Related Documents'
      lines: [885, 889]
      token_est: 12
---

# SPEC-graph-cli-app

---

## TLDR

**What:** Interactive CLI REPL for personally testing graph features as they are implemented.

**Why:** Provide a hands-on tool to manually test and explore each graph feature during development.

**How:** Simple command loop—as features are added to graph libraries, add corresponding commands to
the CLI.

**Philosophy:** The CLI grows with the graph system. Not all commands exist yet. Architecture is
designed for easy expansion.

**Status:** Draft specification

---

## Core Design Principle: Extensibility

The graph-cli-app is built to grow alongside the graph system. **MORE COMMANDS WILL BE ADDED AS
FEATURES ARE IMPLEMENTED.**

**Timeline:**

- **v0.1 (now):** 7 commands—repo ingestion + inspection (dump, trace, diff, project)
- **v1.0 (future):** Add ingestion commands for docs, forums, blogs, etc. (`ingest site`,
  `ingest forum`, etc.)
- **v1.0 (future):** Add assertion commands (create decision, create requirement, etc.)
- **v1.0+ (future):** Add evidence, validation, subjects, queries, analysis
- **v2.0+ (future):** Add specialized commands for export, etc.

**Total expected commands by v2.0+:** 30-50+ (rough estimate)

**Key rule:** Adding a new feature should require minimal CLI changes. Commands follow a standard
pattern and are registered centrally. No architectural rewrites required when adding features.

**This is not a finished CLI.** It's designed to accept new commands continuously as the graph
system evolves.

---

## Scope

**Includes:**

- Interactive REPL entry point and command loop
- `GraphCLI` class: manages in-memory store and graph operations
- Command dispatcher and argument parsing
- Extensible command pattern (how to add new commands)
- Ink+Pastel terminal UI rendering
- Error handling and debug mode

**Excludes:**

- Automated test framework or CI/CD workflows
- Database persistence (deferred to v2.0+)
- Web API

**Future (when features exist):**

- Assertion commands (v1.0)
- Validation commands (v1.0+)
- Evidence linking (v1.0+)
- Subject management (v1.0+)
- Advanced projections (v1.0+)

---

## Architecture: Extensible Command Pattern

Every command follows the same pattern:

```typescript
// Step 1: Define the command handler
export async function ingestRepoCommand(
  args: string[],
  flags: Record<string, any>,
  cli: GraphCLI
): Promise<CommandResult> {
  const url = args[0];
  const commit = flags.commit;

  const result = await cli.ingestRepo(url, { commit });
  return {
    success: result.success,
    message: `Ingested ${result.nodeCount} nodes`,
    data: result
  };
}

// Step 2: Register it in the dispatcher
const commands = {
  'ingest repo': {
    handler: ingestRepoCommand,
    description: 'Clone and ingest a repository',
    usage: 'ingest repo <url> [--commit <ref>]',
  }
};

// Step 3: When a new feature exists, add a new command following the same pattern
export async function createDecisionCommand(
  args: string[],
  flags: Record<string, any>,
  cli: GraphCLI
): Promise<CommandResult> {
  const text = args.join(' ');
  const decision = await cli.createAssertion('Decision', { text });
  return {
    success: true,
    message: `Created Decision: ${decision.id}`,
    data: decision
  };
}

const commands = {
  'ingest repo': { ... },
  'create decision': {
    handler: createDecisionCommand,
    description: 'Create a decision assertion',
    usage: 'create decision <text>',
  }
};
```

**Pattern:**

1. Implement command handler that calls `GraphCLI` methods
2. Return `CommandResult` with status, message, and data
3. Register command in dispatcher with usage/description
4. CLI automatically adds it to help, parsing, and execution flow

**No changes to REPL loop required.** Just add command handlers and register them.

---

## Entry Point

```bash
$ pnpm -C apps/graph-cli-app dev

Graph CLI v0.1
Type 'help' for available commands.

> _
```

---

## GraphCLI Class

The `GraphCLI` class manages the in-memory graph store and provides methods that commands invoke.

**Current v0.1 Interface:**

```typescript
class GraphCLI {
  // State
  private store: GraphStore;

  // v0.1 methods (ingestion & projection)
  async ingestRepo(
    url: string,
    options?: { commit?: string; branch?: string },
  ): Promise<IngestResult>;
  getNodes(): Array<{ kind: string; count: number }>;
  getEdges(): Array<{ kind: string; count: number }>;
  getNodeById(id: string): Node | undefined;
  trace(nodeId: string, depth?: number): TraceResult;
  diff(snap1: GraphSnapshot, snap2: GraphSnapshot): DiffResult;
  async runProjection(name: string): Promise<ProjectionResult>;
  dumpToJSON(): GraphSnapshot;
  dumpToText(): string;

  // Future v1.0 methods (will be added)
  // async createAssertion(kind: string, fields: object): Promise<Assertion>;
  // async queryAssertions(filter: object): Promise<Assertion[]>;
  // async createSubject(name: string): Promise<Subject>;
  // async linkEvidence(...): Promise<void>;
  // async validate(): Promise<ValidationResult>;
}
```

**Key properties:**

- `store: GraphStore` — In-memory graph store (persists across commands in a session)
- All methods are synchronous except I/O-bound ones (`ingestRepo()`, `runProjection()`)
- New methods added as features are implemented

---

## Command Roadmap: More Commands Coming

**IMPORTANT:** The commands shown below are only v0.1. Many more commands will be added as features
are implemented.

**v0.1 (Current):** 7 commands for repo ingestion and inspection

- `ingest repo` — Ingest a repository (code source)
- `dump` — View current graph state
- `trace` — Follow relationships
- `diff` — Compare snapshots
- `project` — Run projections
- `help` — Show available commands
- `exit` — Leave CLI

**v1.0 (When more ingestion sources are implemented):** Add ingestion commands

- `ingest site` — Ingest a documentation site
- `ingest forum` — Ingest forum/discussion threads
- `ingest blog` — Ingest blog posts
- ... and other source types

**v1.0 (When assertions are implemented):** Add assertion commands

- `create decision` — Create a Decision assertion
- `create requirement` — Create a Requirement assertion
- `create spec-clause` — Create a SpecClause assertion
- `list assertions` — Query assertions by filter
- `link-evidence` — Link evidence to assertions
- `validate` — Run graph validation
- ... and others

**v1.0+ (When evidence/validation added):** Add more commands

- `create subject` — Create a Subject node
- `create evidence` — Create evidence assertion
- `query` — Advanced graph queries
- `analyze` — Impact analysis
- ... and others

**v2.0+ (Future):** Add even more commands

- `export` — Export graph to database
- ... and others

**The pattern stays the same:** Add handler → register command → done.

---

## v0.1 Commands (Currently Available)

### 1. `ingest repo <url> [options]`

Clone a repository and ingest it into the graph. Creates canonical Artifact nodes representing
repository code.

**What it does (in graph terms):**

1. **Clone** the repository to disk
2. **Index** symbols using SCIP TypeScript
3. **Create Artifact nodes:**
   - `ArtifactRoot` — Stable identity of the repo (URL-based)
   - `ArtifactState` — Immutable snapshot at commit/tag
   - `ArtifactPart` (files) — One per file in the repo
   - `ArtifactPart` (symbols) — One per TypeScript symbol (class, function, etc.)
4. **Create edges:** HasState (Root→State), HasPart (State→Parts)
5. **Create Policies:** IngestionPolicy and ProjectionPolicy for this artifact
6. **Store in memory:** All nodes and edges saved to `cli.store`

**Why this matters:**

- Transforms external code into queryable graph nodes
- Each symbol becomes an anchor point that Evidence and future Assertions can link to
- Deterministic: same repo+commit always produces same node IDs
- Locators (`path#symbol_name`) are stable references to specific code locations

**Syntax:**

```bash
> ingest repo <url> [--commit <ref>] [--branch <branch>]
```

**Examples:**

```bash
> ingest repo https://github.com/sindresorhus/ky
# Clones main branch, indexes all symbols

> ingest repo https://github.com/sindresorhus/ky --commit v1.14.2
# Clones specific tag/commit, indexes at that point in time
```

**Output:** Ink UI with progress

```
┌──────────────────────────────────┐
│ Ingesting repository...          │
├──────────────────────────────────┤
│ ⏳ Cloning repo...               │
│ ✓ Cloned (2.3s)                 │
│ ✓ Dependencies (1.2s)           │
│ ⏳ Running SCIP indexing...       │
│ ✓ Indexed: 156 symbols in 42 files
│ ✓ Created artifact nodes (0.8s) │
│   Root: 1                        │
│   State: 1                       │
│   Parts: 45 (files+symbols)      │
├──────────────────────────────────┤
│ Success (12.3s)                 │
│ Total nodes: 47                 │
│ Total edges: 52                 │
└──────────────────────────────────┘
```

**Result:** Graph store now contains:

- 1 ArtifactRoot node (the repo identity)
- 1 ArtifactState node (snapshot at commit)
- 45 ArtifactPart nodes (28 files + 17 symbols)
- 2 Policy nodes (ingestion + projection)
- 52 edges linking them
- All queryable via `dump`, `trace`, `project` commands

---

### 2. `dump [--format <format>]`

Display the current graph state. Inspect all nodes and edges in `cli.store`.

**What it does:**

- Lists all nodes by kind (ArtifactRoot, ArtifactState, ArtifactPart, Policy, etc.)
- Shows node counts and types
- Shows all edges by kind (HasState, HasPart, HasPolicy, etc.)
- Format: human-readable text or JSON

**In graph terms:**

- Shows what's currently stored in memory
- After `ingest`, dump shows the created artifact structure
- After `project`, dump shows what was selected for the projection

**Syntax:**

```bash
> dump [--format json|text]
```

**Examples:**

```bash
> dump
# Shows text summary to terminal

> dump --format json
# Outputs JSON to stdout (useful for scripting)
```

**Output (text format):**

```
┌──────────────────────────────┐
│ Graph State (47 nodes, 52 edges)
├──────────────────────────────┤
│ Nodes:                       │
│  • ArtifactRoot: 1           │
│  • ArtifactState: 1          │
│  • ArtifactPart: 45          │
│  • Policy: 2                 │
│                              │
│ Edges:                       │
│  • HasState: 1               │
│  • HasPart: 45               │
│  • HasPolicy: 2              │
│  • Total: 52                 │
└──────────────────────────────┘
```

**Output (--format json):**

```json
{
  "nodes": {
    "ArtifactRoot": 1,
    "ArtifactState": 1,
    "ArtifactPart": 45,
    "Policy": 2,
    "total": 47
  },
  "edges": {
    "HasState": 1,
    "HasPart": 45,
    "HasPolicy": 2,
    "total": 52
  }
}
```

---

### 3. `trace <node-id> [--depth <n>]`

Follow relationships from a node. Shows the graph neighborhood of a node.

**What it does:**

- Starts at a node (by ID)
- Walks outward following edges up to `depth` levels
- Shows every node and edge encountered
- Displays as a tree structure

**In graph terms:**

- Answer "what is this node connected to?"
- After `ingest`, trace from ArtifactState to see all its parts
- Trace a symbol (ArtifactPart) to see what policies apply to it
- Useful for understanding graph structure

**Syntax:**

```bash
> trace <node-id> [--depth <n>]
```

**Arguments:**

- `<node-id>` — Node to start from (find IDs via `dump`)
- `--depth <n>` — How many levels deep (default: 3)

**Examples:**

```bash
> trace artifact_state_def456
# Shows all parts of that artifact state

> trace artifact_part_abc123 --depth 2
# Shows what that symbol/file is connected to
```

**Output:**

```
┌──────────────────────────────────┐
│ Trace from artifact_state_def456 │
│ (depth=3)                        │
├──────────────────────────────────┤
│ artifact_state_def456            │
│  (ArtifactState)                 │
│  ├─ HasRoot → artifact_root_001  │
│  │   (ArtifactRoot)              │
│  │   └─ HasPolicy → policy_123   │
│  │       (IngestionPolicy)       │
│  │                               │
│  └─ HasPart → artifact_part_001  │
│      (ArtifactPart: file)        │
│      ├─ HasPart → artifact_part_002
│      │   (ArtifactPart: symbol)  │
│      └─ HasPolicy → policy_456   │
│          (ProjectionPolicy)      │
└──────────────────────────────────┘
```

---

### 4. `diff <snap1> <snap2>`

Compare two graph snapshots. Identify what changed between two states.

**What it does:**

- Loads two snapshots (from files or memory)
- Compares node counts, edge counts, node IDs
- Reports added, removed, and modified nodes
- Useful for detecting changes or verifying determinism

**In graph terms:**

- "What changed when I ingested a different commit?"
- "Did the projection select different nodes?"
- "Are two ingestions of the same code identical?" (determinism check)

**Syntax:**

```bash
> diff <snap1> <snap2>
```

**Arguments:**

- `<snap1>` — First snapshot (file path or label)
- `<snap2>` — Second snapshot (file path or label)

**Examples:**

```bash
> dump --format json > /tmp/snap1.json
[... do something ...]
> dump --format json > /tmp/snap2.json
> diff /tmp/snap1.json /tmp/snap2.json
```

**Output:**

```
┌──────────────────────────────────┐
│ Diff: snap1 → snap2              │
├──────────────────────────────────┤
│ Nodes: 47 → 49 (+2)              │
│ Edges: 52 → 55 (+3)              │
│                                  │
│ Added nodes:                     │
│  • ArtifactPart: 2 (new files)   │
│                                  │
│ Modified nodes:                  │
│  • ArtifactState: 1 (hash change)│
│                                  │
│ Removed nodes:                   │
│  • (none)                        │
└──────────────────────────────────┘
```

---

### 5. `project <name>`

Run a projection. Compute a deterministic view of the graph.

**What it does:**

- Reads all nodes from `cli.store`
- Applies projection rules to select/filter nodes
- Returns a subset of nodes representing a specific view
- Each selected node includes an explanation (why it was selected)

**In graph terms:**

- Projections are deterministic, read-only views of canonical nodes
- `CurrentCommittedTruth` selects all nodes representing "what code currently exists"
- Future projections: `ActiveWork` (what's being worked on), `GraphHealth` (validation issues)
- Projections don't modify the store—all changes are read-only

**Syntax:**

```bash
> project <name>
```

**Arguments:**

- `<name>` — Projection name (e.g., `CurrentCommittedTruth`)

**v0.1 Projections:**

- `CurrentCommittedTruth` — All artifact nodes (deterministic selection)

**Future Projections (v1.0+):**

- `ActiveWork` — Assertions marked as in-progress
- `GraphHealth` — Validation errors and warnings
- `ImpactAnalysis` — Trace what's affected by changes

**Examples:**

```bash
> project CurrentCommittedTruth
# Computes the current committed truth projection
```

**Output:**

```
┌──────────────────────────────────┐
│ Projection: CurrentCommittedTruth│
├──────────────────────────────────┤
│ ✓ Computed successfully          │
│   Duration: 124ms               │
│                                  │
│ Selected nodes:                  │
│  • ArtifactRoot: 1               │
│  • ArtifactState: 1              │
│  • ArtifactPart: 45              │
│  • Policy: 2                     │
│                                  │
│ Rules applied:                   │
│  • Include all artifact nodes    │
│  • Include all policies          │
│  • Exclude superseded nodes      │
│                                  │
│ Output: ./tmp/projection.json   │
└──────────────────────────────────┘
```

**Explanation:**

Each node in the projection includes metadata explaining why it was selected:

```json
{
  "node_id": "artifact_part_abc123",
  "kind": "ArtifactPart",
  "selected_because": "Artifact node in CurrentCommittedTruth",
  "rule": "CurrentCommittedTruthRule v1",
  "applied_at": "2026-01-24T12:00:00Z"
}
```

---

### 6. `help [command]`

Show available commands or help for a specific command.

**Syntax:**

```bash
> help [command]
```

**Examples:**

```bash
> help
> help ingest
```

**Output:** Command list or detailed help for one command

---

### 7. `exit`

Exit the CLI.

**Syntax:**

```bash
> exit
```

---

## Future Commands (v1.0+)

When the graph libraries add assertion support, you will add commands like:

```bash
> create decision "Use TypeScript for backend"
> create requirement "Must support PostgreSQL"
> create spec-clause "API must return 200 on success"
> link-evidence artifact_part_xyz123 to decision_id123
> list assertions
> validate graph
> query subjects
```

Each new command follows the same pattern:

1. Create a handler function
2. Call the appropriate `GraphCLI` method
3. Register the command

No changes to the REPL architecture. Just add new handlers.

---

## State Management

Single `GraphCLI` instance per session:

```
User types:   > ingest repo https://github.com/...
                        ↓
REPL parses:  command="ingest", subcommand="repo", args=[url], flags={}
                        ↓
Dispatcher:   ingestRepoCommand(args, flags, cli)
                        ↓
GraphCLI:     cli.ingestRepo(url) → stores nodes in cli.store
                        ↓
Render:       renderProgressBox(result)
                        ↓
Loop:         Prompt for next command
```

Commands query/modify `cli.store`. Session ends when user types `exit`.

---

## Extensibility Example: Adding a v1.0 Command

When you implement Assertions in the graph libraries:

**1. Add method to GraphCLI:**

```typescript
async createAssertion(kind: string, fields: object): Promise<Assertion> {
  // Call graph-lifecycle package
  // Store in this.store
}
```

**2. Create command handler:**

```typescript
// src/commands/create-decision.ts
export async function createDecisionCommand(
  args: string[],
  flags: Record<string, any>,
  cli: GraphCLI,
): Promise<CommandResult> {
  const text = args.join(' ');
  const decision = await cli.createAssertion('Decision', { text });
  return {
    success: true,
    message: `Created Decision: ${decision.id}`,
    data: decision,
  };
}
```

**3. Register in dispatcher:**

```typescript
// src/dispatcher.ts
commands['create decision'] = {
  handler: createDecisionCommand,
  description: 'Create a decision assertion',
  usage: 'create decision <text>',
};
```

**4. Test immediately:**

```bash
$ pnpm -C apps/graph-cli-app dev
> create decision "Use TypeScript for backend"
```

No rewrites. No new patterns. Just add a handler and register it.

---

## Error Handling

Invalid commands, missing args, runtime errors all show helpful messages:

```
> invalid-cmd
✗ Unknown command: invalid-cmd
Type 'help' for available commands.

> ingest repo
✗ Missing required argument: <url>
Usage: ingest repo <url> [--commit <ref>]

> ingest repo https://github.com/invalid/repo
⏳ Cloning repo...
✗ Error: Repository not found (404)

> ingest repo ... --debug
[Shows full stacktrace]
```

---

## Testing

CLI can be used manually for testing during development, and later can support automated E2E tests:

```bash
# Manual testing (primary purpose)
$ pnpm -C apps/graph-cli-app dev
> ingest repo ...
> dump
> project CurrentCommittedTruth

# E2E testing (secondary)
# Can wrap REPL in test harness to automate workflows
```

---

## Non-Goals

- Automated CI/CD testing framework (use Vitest for that)
- Database persistence (v2.0+)
- Web UI or API
- Complex workflow composition
- Batch execution

---

## Related Documents

- IMPL-PLAN-graph-cli-app.md
- SPEC-graph-system-vertical-slice-v0-1.md
- REQ-graph-system-graph-system-architecture.md
