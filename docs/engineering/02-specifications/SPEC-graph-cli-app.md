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
      lines: [102, 116]
      token_est: 90
    - title: 'Core Design Principle: Extensibility'
      lines: [118, 132]
      token_est: 97
    - title: 'Scope'
      lines: [134, 159]
      token_est: 115
    - title: 'Architecture: Extensible Command Pattern'
      lines: [161, 226]
      token_est: 289
    - title: 'Entry Point'
      lines: [228, 239]
      token_est: 28
    - title: 'GraphCLI Class'
      lines: [241, 281]
      token_est: 197
    - title: 'v0.1 Commands (Currently Available)'
      lines: [283, 419]
      token_est: 310
      subsections:
        - title: '1. `ingest repo <url> [options]`'
          lines: [285, 304]
          token_est: 65
        - title: '2. `dump [--format <format>]`'
          lines: [306, 325]
          token_est: 49
        - title: '3. `trace <node-id> [--depth <n>]`'
          lines: [327, 346]
          token_est: 50
        - title: '4. `diff <snap1> <snap2>`'
          lines: [348, 366]
          token_est: 38
        - title: '5. `project <name>`'
          lines: [368, 386]
          token_est: 39
        - title: '6. `help [command]`'
          lines: [388, 407]
          token_est: 49
        - title: '7. `exit`'
          lines: [409, 419]
          token_est: 16
    - title: 'Future Commands (v1.0+)'
      lines: [421, 443]
      token_est: 114
    - title: 'State Management'
      lines: [445, 465]
      token_est: 72
    - title: 'Extensibility Example: Adding a v1.0 Command'
      lines: [467, 519]
      token_est: 181
    - title: 'Error Handling'
      lines: [521, 542]
      token_est: 81
    - title: 'Testing'
      lines: [544, 559]
      token_est: 71
    - title: 'Non-Goals'
      lines: [561, 569]
      token_est: 37
    - title: 'Related Documents'
      lines: [571, 575]
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

The graph-cli-app is built to grow alongside the graph system.

**Timeline:**

- **v0.1 (now):** Repository ingestion commands
- **v1.0 (future):** Add assertion commands (Decisions, Requirements, SpecClauses)
- **v1.0+ (future):** Add validation and evidence commands
- **v2.0+ (future):** Add more specialized commands

**Key rule:** Adding a new feature should require minimal CLI changes. Commands follow a standard
pattern and are registered centrally. No architectural rewrites required when adding features.

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

## v0.1 Commands (Currently Available)

### 1. `ingest repo <url> [options]`

Clone and ingest a repository. Calls `cli.ingestRepo()` internally.

**Syntax:**

```bash
> ingest repo <url> [--commit <ref>] [--branch <branch>]
```

**Examples:**

```bash
> ingest repo https://github.com/sindresorhus/ky
> ingest repo https://github.com/sindresorhus/ky --commit v1.14.2
```

**Output:** Ink UI showing progress (cloning, dependencies, SCIP indexing, node creation)

---

### 2. `dump [--format <format>]`

Display current graph state. Calls `cli.dumpToJSON()` or `cli.dumpToText()`.

**Syntax:**

```bash
> dump [--format json|text]
```

**Examples:**

```bash
> dump
> dump --format json
```

**Output:** Node/edge summary with counts and types

---

### 3. `trace <node-id> [--depth <n>]`

Follow relationships from a node. Calls `cli.trace()`.

**Syntax:**

```bash
> trace <node-id> [--depth <n>]
```

**Examples:**

```bash
> trace artifact_part_abc123
> trace artifact_part_abc123 --depth 5
```

**Output:** Tree showing relationship chain

---

### 4. `diff <snap1> <snap2>`

Compare two snapshots. Calls `cli.diff()`.

**Syntax:**

```bash
> diff <snap1> <snap2>
```

**Examples:**

```bash
> diff ./dump1.json ./dump2.json
```

**Output:** Added/modified/removed nodes summary

---

### 5. `project <name>`

Run a projection. Calls `cli.runProjection()`.

**Syntax:**

```bash
> project <name>
```

**Examples:**

```bash
> project CurrentCommittedTruth
```

**Output:** Projection results with node counts and explanation

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
