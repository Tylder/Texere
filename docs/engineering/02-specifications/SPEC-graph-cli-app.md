---
type: SPEC
status: draft
stability: experimental
created: 2026-01-24
last_updated: 2026-01-24
area: graph-system
feature: graph-cli-app
summary_short: >-
  Interactive CLI application for manual testing and exploration of the graph system
summary_long: >-
  Specifies a simple interactive command-line application for developers to manually test graph
  operations, ingest repositories, run projections, and inspect graph state. The app provides an
  interactive REPL with commands for ingestion, querying, projection, and visualization.
keywords:
  - cli
  - repl
  - interactive
  - testing
implements:
  - REQ-graph-system-graph-system-architecture
  - REQ-graph-ingestion
  - REQ-graph-projection
related:
  - SPEC-graph-system-vertical-slice-v0-1
index:
  sections:
    - title: 'TLDR'
      lines: [86, 97]
      token_est: 64
    - title: 'Scope'
      lines: [99, 115]
      token_est: 72
    - title: 'Entry Point'
      lines: [117, 128]
      token_est: 28
    - title: 'Commands'
      lines: [130, 471]
      token_est: 1056
      subsections:
        - title: '1. `ingest repo <url> [options]`'
          lines: [132, 178]
          token_est: 188
        - title: '2. `dump [--format <format>]`'
          lines: [180, 243]
          token_est: 175
        - title: '3. `trace <node-id> [--depth <n>]`'
          lines: [245, 286]
          token_est: 127
        - title: '4. `diff <snap1> <snap2>`'
          lines: [288, 329]
          token_est: 129
        - title: '5. `project <name> [--selection <sel>]`'
          lines: [331, 370]
          token_est: 114
        - title: '6. `help [command]`'
          lines: [372, 452]
          token_est: 301
        - title: '7. `exit`'
          lines: [454, 471]
          token_est: 24
    - title: 'Output Model'
      lines: [473, 492]
      token_est: 120
    - title: 'Interactive Session Example'
      lines: [494, 551]
      token_est: 210
    - title: 'Error Handling'
      lines: [553, 596]
      token_est: 117
    - title: 'State Management'
      lines: [598, 614]
      token_est: 80
    - title: 'Non-Goals'
      lines: [616, 624]
      token_est: 45
    - title: 'Related Documents'
      lines: [626, 631]
      token_est: 15
---

# SPEC-graph-cli-app

---

## TLDR

**What:** Interactive CLI REPL for manual graph testing and exploration.

**Why:** Provide developers a hands-on way to test graph features without writing code.

**How:** `pnpm -C apps/graph-cli-app dev` opens a prompt where you type commands like
`ingest repo <url>`, `dump`, `project CurrentCommittedTruth`, etc.

**Status:** Draft specification

---

## Scope

**Includes:**

- Interactive REPL entry point and command loop
- 7 commands: `ingest`, `dump`, `trace`, `diff`, `project`, `help`, `exit`
- Ink+Pastel terminal UI rendering
- Error handling and debug mode

**Excludes:**

- Scenario registry or automated test framework
- Batch execution or CI/CD workflows
- Database persistence (v2.0+)
- Complex workflow composition

---

## Entry Point

```bash
$ pnpm -C apps/graph-cli-app dev

Graph CLI v0.1
Type 'help' for available commands.

> _
```

---

## Commands

### 1. `ingest repo <url> [options]`

Clone and ingest a repository into the graph.

**Syntax:**

```bash
> ingest repo <url> [--commit <ref>] [--branch <branch>]
```

**Arguments:**

- `<url>` — GitHub repository URL
- `--commit <ref>` — Specific commit/tag (default: HEAD)
- `--branch <branch>` — Specific branch (default: main)

**Examples:**

```bash
> ingest repo https://github.com/sindresorhus/ky
> ingest repo https://github.com/sindresorhus/ky --commit v1.14.2
> ingest repo https://github.com/sindresorhus/ky --branch develop
```

**Output:**

```
┌──────────────────────────────────────┐
│ Ingesting repository...              │
├──────────────────────────────────────┤
│ ⏳ Cloning repo...                   │
│ ✓ Cloned (2.3s)                     │
│ ✓ Installing dependencies (1.2s)    │
│ ⏳ Running SCIP indexing...          │
│   Indexed: 156 symbols in 42 files  │
│ ✓ Created artifact nodes (0.8s)     │
│   Root: 1 | State: 1 | Parts: 45    │
│ ✓ Generated JSON dumps (0.5s)       │
├──────────────────────────────────────┤
│ Success (12.3s)                     │
│ Dump location: ./tmp/graph-dump     │
└──────────────────────────────────────┘

> _
```

---

### 2. `dump [--format <format>]`

Display the current graph state (nodes and edges).

**Syntax:**

```bash
> dump [--format json|text]
```

**Arguments:**

- `--format` — Output format: `json` or `text` (default: `text`)

**Examples:**

```bash
> dump
> dump --format json
```

**Output (text):**

```
┌──────────────────────────────────────┐
│ Graph State                          │
├──────────────────────────────────────┤
│ Nodes (47 total)                    │
│ ├── ArtifactRoot: 1                  │
│ ├── ArtifactState: 1                 │
│ ├── ArtifactPart: 45                 │
│ └── Policy: 2                        │
│                                      │
│ Edges (52 total)                    │
│ ├── HasState: 1                      │
│ ├── HasPart: 45                      │
│ └── HasPolicy: 2                     │
└──────────────────────────────────────┘

> _
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
  },
  "dump_written_to": "./tmp/graph-dump"
}
```

---

### 3. `trace <node-id> [--depth <n>]`

Follow relationships from a node through the graph.

**Syntax:**

```bash
> trace <node-id> [--depth <n>]
```

**Arguments:**

- `<node-id>` — Node ID to trace from
- `--depth <n>` — Relationship depth (default: 3)

**Examples:**

```bash
> trace artifact_part_abc123
> trace artifact_part_abc123 --depth 5
```

**Output:**

```
┌──────────────────────────────────────┐
│ Trace from artifact_part_abc123      │
│ (depth=3)                            │
├──────────────────────────────────────┤
│ artifact_part_abc123 (ArtifactPart)  │
│  └─ HasParent                        │
│     └─ artifact_state_def456 (State) │
│        └─ HasRoot                    │
│           └─ artifact_root_ghi789    │
│              └─ HasPolicy            │
│                 └─ policy_001 (Pol)  │
└──────────────────────────────────────┘

> _
```

---

### 4. `diff <snap1> <snap2>`

Compare two graph snapshots or states.

**Syntax:**

```bash
> diff <snap1> <snap2>
```

**Arguments:**

- `<snap1>` — First snapshot file or state name
- `<snap2>` — Second snapshot file or state name

**Examples:**

```bash
> diff ./dump1.json ./dump2.json
> diff before after
```

**Output:**

```
┌──────────────────────────────────────┐
│ Diff: dump1.json → dump2.json        │
├──────────────────────────────────────┤
│ Nodes: 47 → 49 (+2)                  │
│ Edges: 52 → 55 (+3)                  │
│                                      │
│ Added:                               │
│  • Policy: 2 nodes                   │
│                                      │
│ Modified:                            │
│  • ArtifactState: content hash       │
└──────────────────────────────────────┘

> _
```

---

### 5. `project <name> [--selection <sel>]`

Run a projection to compute a deterministic graph view.

**Syntax:**

```bash
> project <name> [--selection <sel>]
```

**Arguments:**

- `<name>` — Projection name (e.g., `CurrentCommittedTruth`)
- `--selection` — Selection rule (future v1.0+)

**Examples:**

```bash
> project CurrentCommittedTruth
```

**Output:**

```
┌──────────────────────────────────────┐
│ Projection: CurrentCommittedTruth    │
├──────────────────────────────────────┤
│ ✓ Computed successfully              │
│   Selected nodes: 45 artifacts       │
│   Excluded: 2 (superseded/draft)     │
│   Duration: 124ms                    │
│                                      │
│ Output written to:                   │
│  ./tmp/projection.json               │
└──────────────────────────────────────┘

> _
```

---

### 6. `help [command]`

Show available commands or help for a specific command.

**Syntax:**

```bash
> help [command]
```

**Arguments:**

- `[command]` — Optional command name to get detailed help

**Examples:**

```bash
> help
> help ingest
> help project
```

**Output (help):**

```
┌──────────────────────────────────────┐
│ Available Commands                   │
├──────────────────────────────────────┤
│ ingest repo <url>                    │
│   Clone and ingest a repository      │
│                                      │
│ dump [--format json|text]            │
│   Display current graph state        │
│                                      │
│ trace <node-id> [--depth N]          │
│   Follow relationships from a node   │
│                                      │
│ diff <snap1> <snap2>                 │
│   Compare two snapshots              │
│                                      │
│ project <name>                       │
│   Run a projection                   │
│                                      │
│ help [command]                       │
│   Show this help or command help     │
│                                      │
│ exit                                 │
│   Leave the CLI                      │
└──────────────────────────────────────┘

> _
```

**Output (help ingest):**

```
┌──────────────────────────────────────┐
│ ingest repo <url> [options]          │
├──────────────────────────────────────┤
│ Clone and ingest a repository.       │
│                                      │
│ Usage:                               │
│   ingest repo <url>                  │
│   ingest repo <url> --commit v1.0    │
│   ingest repo <url> --branch main    │
│                                      │
│ Options:                             │
│   --commit <ref>   Commit/tag ref    │
│   --branch <name>  Branch name       │
│                                      │
│ Examples:                            │
│   > ingest repo https://github.com/  │
│     sindresorhus/ky                  │
│   > ingest repo https://github.com/  │
│     sindresorhus/ky --commit v1.14.2 │
└──────────────────────────────────────┘

> _
```

---

### 7. `exit`

Exit the CLI application.

**Syntax:**

```bash
> exit
```

**Output:**

```
Goodbye!
$
```

---

## Output Model

All outputs are rendered via Ink+Pastel React components for beautiful terminal rendering.

**Output Types:**

1. **Boxes** — Progress/status displayed in bordered boxes with icons (✓, ✗, ⏳)
2. **Tables** — Node/edge summaries shown as ASCII tables
3. **Trees** — Relationship traces shown as indented trees
4. **JSON** — Optionally dump as JSON for scripting/piping

**Colors:**

- Green (`✓`) — Success, completed operations
- Red (`✗`) — Errors, failed operations
- Yellow (`⏳`) — In progress, pending operations
- Blue (`ℹ`) — Information messages
- Gray — Secondary/muted text

---

## Interactive Session Example

```bash
$ pnpm -C apps/graph-cli-app dev

Graph CLI v0.1
Type 'help' for available commands.

> ingest repo https://github.com/sindresorhus/ky --commit v1.14.2

┌──────────────────────────────────────┐
│ Ingesting repository...              │
├──────────────────────────────────────┤
│ ✓ Cloned (2.3s)                     │
│ ✓ Dependencies (1.2s)               │
│ ✓ SCIP indexing (3.1s)              │
│   156 symbols in 42 files           │
│ ✓ Artifact nodes (0.8s)             │
│ ✓ JSON dumps (0.5s)                 │
├──────────────────────────────────────┤
│ Success (12.3s)                     │
│ Dump: ./tmp/graph-dump              │
└──────────────────────────────────────┘

> dump

┌──────────────────────────────────────┐
│ Graph State (47 nodes, 52 edges)     │
├──────────────────────────────────────┤
│ Nodes:                               │
│  • ArtifactRoot: 1                   │
│  • ArtifactState: 1                  │
│  • ArtifactPart: 45                  │
│  • Policy: 2                         │
│                                      │
│ Edges:                               │
│  • HasState: 1                       │
│  • HasPart: 45                       │
│  • HasPolicy: 2                      │
└──────────────────────────────────────┘

> project CurrentCommittedTruth

┌──────────────────────────────────────┐
│ Projection: CurrentCommittedTruth    │
├──────────────────────────────────────┤
│ ✓ Computed (124ms)                  │
│ Selected: 45 artifacts              │
│ Output: ./tmp/projection.json       │
└──────────────────────────────────────┘

> exit

Goodbye!
$
```

---

## Error Handling

**Invalid Command:**

```
> invalid-command
✗ Unknown command: invalid-command
Type 'help' for available commands.

> _
```

**Invalid Arguments:**

```
> ingest repo
✗ Missing required argument: <url>
Usage: ingest repo <url> [--commit <ref>]

> _
```

**Runtime Error:**

```
> ingest repo https://github.com/nonexistent/repo
⏳ Cloning repo...
✗ Error: Failed to clone repository
  Repository not found (404)

> _
```

**Debug Mode:**

Add `--debug` flag to any session for verbose logging:

```bash
$ pnpm -C apps/graph-cli-app dev --debug

# Shows detailed logs for each operation
```

---

## State Management

The CLI maintains a single in-memory graph state across commands:

- **Ingest** — Populates graph with artifact nodes and edges
- **Dump/Trace/Diff** — Query current graph state
- **Project** — Compute deterministic views (doesn't modify graph)
- **Exit** — Discard all state

If you want to start fresh:

```bash
> exit
$ pnpm -C apps/graph-cli-app dev
```

---

## Non-Goals

- Persistent storage (graphs are ephemeral within a session)
- Automated test framework or scenario registry
- Batch execution or script files
- Database backends
- Web UI or API server

---

## Related Documents

- SPEC-graph-system-vertical-slice-v0-1.md
- REQ-graph-system-graph-system-architecture.md
- REQ-graph-ingestion.md
- REQ-graph-projection.md
