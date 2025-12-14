# Texere Indexer – CLI Specification

**Document Version:** 1.0  
**Status:** Active Specification  
**Last Updated:** December 2025  
**Purpose:** Define CLI interface, commands, modes, and user workflows for the Texere Indexer

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Command Reference](#command-reference)
4. [Run Modes](#run-modes)
5. [Options & Flags](#options--flags)
6. [Exit Codes](#exit-codes)
7. [Typical User Workflows](#typical-user-workflows)
8. [Output Formats](#output-formats)
9. [Configuration Integration](#configuration-integration)
10. [Graceful Shutdown](#graceful-shutdown)
11. [Implementation Checklist](#implementation-checklist)

---

## Overview

The Texere Indexer CLI (`indexer`) is the primary user-facing entrypoint for:

- **Discovery**: List configured codebases and their tracked branches
- **Readiness checks**: Verify daemon status and database connectivity
- **Indexing execution**: Run indexing once or as a long-lived daemon
- **Lifecycle management**: Start, monitor, and stop daemon processes

The CLI operates on **entire configured repository trees** (no per-repo filtering). It supports both
**run-once mode** (cron/CI friendly) and **daemon mode** (background workers with status
monitoring).

**Design inspired by**: Docker CLI (`docker run`, `docker ps`, `docker stop`)

---

## Design Philosophy

### Principles

1. **Simple for common cases**: Default behavior (`indexer run --once`) works out-of-the-box
2. **No filtering complexity**: Always operates on all configured repos × tracked branches
3. **Config-driven**: All repo/branch decisions come from config files; CLI adds operational flags
   only
4. **Graceful by default**: Daemon stops wait for in-flight work; `--force` for emergencies
5. **Readable output**: Human-friendly text by default; `--log-format json` for automation
6. **Safe prerequisites**: `list` and `status` never modify state; safe to call anytime

### What the CLI Does NOT Do (v1)

- Modify config files (readonly)
- Filter by repo/branch at CLI level (use config files instead)
- Interactive prompts (non-interactive, script-friendly)
- Manage HTTP server (server is separate concern; CLI orchestrates workers)
- Implement dependency indexing (single-repo focus in v1)

---

## Command Reference

### Recursive Config Discovery (All Commands)

**Core Pattern**: All CLI commands automatically discover and use per-repo configuration files in
addition to the orchestrator config, **unless disabled with `--no-recursive` flag**.

**What this means**:

- Default behavior: `indexer list`, `indexer status`, `indexer run`, `indexer stop`, and
  `indexer validate` all recursively discover `.indexer-config.json` files at each codebase's root
  path
- Recursion can be disabled: Add `--no-recursive` flag to validate against orchestrator config only
- Config merging: Per-repo configs override orchestrator settings (e.g., per-repo `trackedBranches`
  override global list)
- Ambiguity safeguard: Error if multiple configs found in same codebase directory (prevents
  misconfiguration)

**Full details**: See
[`RECURSIVE_CONFIG_DISCOVERY.md`](./implementation/RECURSIVE_CONFIG_DISCOVERY.md) (implementation
guide and unified discovery pattern).

---

### `indexer validate`

**Purpose**: Validate configuration syntax and structure without executing indexing. Useful for
CI/setup scripts to catch config errors early. Validation must be **exhaustive for messaging but
blocking for execution**: collect all errors across orchestrator + per-repo configs, report them in
one run, and still exit 1 to prevent indexing.

**Usage**:

```bash
indexer validate [OPTIONS]
```

**Behavior**:

1. Load orchestrator config from `INDEXER_CONFIG_PATH` (or discover in working directory/parents)
2. **[Recursive Discovery]** If `--recursive` enabled (default):
   - For each codebase in orchestrator config
   - Check for `.indexer-config.json` at codebase `root` path
   - Collect all discovered per-repo config files
   - Error if multiple config files found in same codebase directory
3. Parse all config files (orchestrator + per-repo)
4. Validate required fields, types, URI formats, path accessibility, and environment substitution
   (flag any unresolved `${VAR}` placeholders)
5. Print validation results grouped by config type (Orchestrator vs Per-Repo)
6. Exit with code 0 (all valid) or 1 (any errors)

**Output**:

```
Texere Indexer – Config Validation
═══════════════════════════════════

Orchestrator Config
  Path: /path/to/.indexer-config.json
  Status: ✗ invalid
  Errors:
    - database.neo4jUri: "${NEO4J_URI}" → NEO4J_URI not set
    - repos.reposDirectory: "/not/found" is not readable

Per-Repo Configs
  texere/.indexer-config.json
    Status: ✓ valid
    Codebase ID: texere
    Tracked branches: main, develop

  my-lib/.indexer-config.json
    Status: ✗ invalid
    Errors:
      - codebases[0].trackedBranches: required (per-repo overrides do not fallback)
      - Ambiguous configs in /home/anon/my-lib: /home/anon/my-lib/.indexer-config.json,
        /home/anon/my-lib/config/.indexer-config.json

Summary: 3 configs checked, 1 valid, 2 invalid ✗
Exit code: 1
```

**Options**:

| Flag             | Type         | Default       | Purpose                                                        |
| ---------------- | ------------ | ------------- | -------------------------------------------------------------- |
| `--config`       | string       | auto-discover | Explicit orchestrator config file path                         |
| `--no-recursive` | boolean      | false         | Disable per-repo config discovery (validate only orchestrator) |
| `--log-format`   | `json\|text` | `text`        | Output format (JSON must return structured error array)        |

**Exit Codes**:

- `0`: All configs valid
- `1`: Validation errors (syntax, missing fields, unresolved env vars, ambiguous/multiple configs in
  same directory). Collect and report all errors; still exit 1 even when multiple are present.
- (Future: `2` for IO errors, `3` for DB connectivity issues)

---

### `indexer list`

**Purpose**: Discover all configured codebases, their tracked branches, and current index status.

**Usage**:

```bash
indexer list [OPTIONS]
```

**Behavior**:

1. **[Recursive Discovery]** Load orchestrator config and discover per-repo configs
   - See `RECURSIVE_CONFIG_DISCOVERY.md` for unified pattern
   - Slice 1 behavior: if no orchestrator config is found via auto-discovery, return an empty list
     with exit code 0 (informational). Per-repo configs are detected but not merged into the
     displayed list yet (override merge deferred to Slice 2).
2. For each discovered codebase:
   - Display codebase ID, root path, tracked branches
   - Database status lookups for branch snapshots are deferred; in Slice 1 every branch is reported
     as `not indexed`.
3. Exit with code 0 (success) or 1 (config error)

**Output**:

```
Texere Indexer – Discovered Codebases
═════════════════════════════════════

Codebase: texere
  Root: /home/anon/Texere
  Branches:
    main
      Status: indexed (2025-12-14 10:00 UTC, commit abc123de)
      Symbols: 1,245 | Boundaries: 42 | Tests: 387
    develop
      Status: not indexed
    snapshot-1
      Status: indexed (2025-12-13 15:30 UTC, commit def456ab)
      Symbols: 1,200 | Boundaries: 40 | Tests: 380

Codebase: my-lib
  Root: /home/anon/my-lib
  Branches:
    main
      Status: indexed (2025-12-14 08:45 UTC, commit ghi789jk)
      Symbols: 456 | Boundaries: 12 | Tests: 95

Total: 2 codebases, 5 branches (3 indexed, 2 pending)
```

**Options**:

| Flag           | Type         | Default | Purpose                                             |
| -------------- | ------------ | ------- | --------------------------------------------------- |
| `--log-format` | `json\|text` | `text`  | Output format                                       |
| `--verbose`    | bool         | false   | Show discovery details (config paths scanned, etc.) |

**Exit Codes**: `0` (success), `1` (config error)

---

### `indexer status`

**Purpose**: Check daemon status and database connectivity. Validate prerequisites before running.

**Usage**:

```bash
indexer status [OPTIONS]
```

**Behavior**:

1. **[Recursive Discovery]** Load orchestrator and per-repo configs
   - See `RECURSIVE_CONFIG_DISCOVERY.md` for unified pattern
   - Merge configs for complete connectivity picture
2. Check if daemon is running (query lock/PID file, or via HTTP if daemon has status endpoint)
3. Test database connectivity (from merged config):
   - Neo4j: ping connection
   - Qdrant: ping connection
4. If daemon is running:
   - Query worker pool size
   - Query queue depth (if using BullMQ, post-v1)
   - Query in-flight job count
5. Display readiness summary grouped by config source
6. Exit with code 0 if all prerequisites met, 1 if any blocker found

**Output**:

```
Texere Indexer – System Status
═══════════════════════════════

Daemon Status
  State: running
  PID: 12345
  Mode: daemon
  Uptime: 2h 15m

Workers
  Total: 4
  Available: 3
  In-Flight Jobs: 1

Databases
  Neo4j:     ✓ connected (neo4j://localhost:7687)
  Qdrant:    ✓ connected (http://localhost:6334)

Configuration
  Config Path: /path/to/.indexer-config.json
  Repos Directory: /home/anon/code
  Default Branch: main

Summary: Ready to index ✓
```

**Output (daemon not running)**:

```
Texere Indexer – System Status
═══════════════════════════════

Daemon Status
  State: stopped

Databases
  Neo4j:     ✓ connected (neo4j://localhost:7687)
  Qdrant:    ✓ connected (http://localhost:6334)

Configuration
  Config Path: /path/to/.indexer-config.json
  Repos Directory: /home/anon/code

Summary: Ready to index ✓ (use 'indexer run --daemon' to start daemon)
```

**Output (with blockers)**:

```
Texere Indexer – System Status
═══════════════════════════════

Daemon Status
  State: stopped

Databases
  Neo4j:     ✗ connection failed (neo4j://localhost:7687)
             Error: ECONNREFUSED (is Neo4j running?)
  Qdrant:    ✓ connected (http://localhost:6334)

Configuration
  Config Path: /path/to/.indexer-config.json

Summary: NOT ready ✗
  • Neo4j is unavailable (required)

Action: Start Neo4j or update INDEXER_CONFIG_PATH
```

**Options**:

| Flag           | Type         | Default | Purpose       |
| -------------- | ------------ | ------- | ------------- |
| `--log-format` | `json\|text` | `text`  | Output format |

**Exit Codes**: `0` (all OK), `1` (blocker found)

---

### `indexer run`

**Purpose**: Execute indexing across all configured codebases and branches. Supports one-time
execution (cron/CI) or daemon mode (background workers).

**Usage**:

```bash
indexer run [OPTIONS]
```

**Behavior** (common to all modes):

1. **[Recursive Discovery]** Load orchestrator and per-repo configs
   - See `RECURSIVE_CONFIG_DISCOVERY.md` for unified pattern
   - Merge configs (per-repo overrides orchestrator)
2. **Fetch latest from all remotes** (always enabled by default; use `--no-fetch` to disable)
3. Resolve all repos and tracked branches using merged config
4. Check prerequisites (DB connectivity, git access)
5. If `--dry-run`: generate plan, print JSON, exit 0
6. Otherwise: begin indexing using merged config

**Validation Rules** (enforced before execution):

1. If `--dry-run` is set: `--daemon` and `--detached` are invalid
   - Error: "`--dry-run` cannot be combined with `--daemon` or `--detached`. Use `--dry-run` with
     `--once` (default)."
   - Exit code: 1

2. If `--daemon` or `--detached` is requested: Check if daemon already running
   - If running: Error: "Daemon already running (PID 12345). Stop existing daemon with
     `indexer stop` first."
   - Exit code: 2 (or 1 for config/validation context)
   - Exception: If lock file is stale (PID doesn't exist), auto-clean and proceed

3. Ensure at least one codebase is configured
   - If none: Error: "No codebases found in config. Add repos to configuration."
   - Exit code: 1

**Mode-specific behavior** – see [Run Modes](#run-modes) section below.

**Options**:

| Flag           | Type         | Default       | Purpose                                             |
| -------------- | ------------ | ------------- | --------------------------------------------------- |
| `--once`       | bool         | true          | Run once, block until complete, exit (cron/CI mode) |
| `--daemon`     | bool         | false         | Run in foreground with streaming output             |
| `--detached`   | bool         | false         | Start daemon in background, return immediately      |
| `--dry-run`    | bool         | false         | Generate plan without writing to graph/vectors      |
| `--force`      | bool         | false         | Reindex even if snapshot already exists             |
| `--no-fetch`   | bool         | false         | **DISABLE** fetching; use only local git state      |
| `--log-format` | `json\|text` | `text`        | Output format                                       |
| `--verbose`    | bool         | false         | Enable debug logging                                |
| `--quiet`      | bool         | false         | Suppress non-error output                           |
| `--config`     | string       | auto-discover | Explicit config file path                           |

**Exit Codes**: See [Exit Codes](#exit-codes) section

---

### `indexer stop`

**Purpose**: Gracefully shutdown a running daemon. Wait for in-flight work, then terminate.

**Usage**:

```bash
indexer stop [OPTIONS]
```

**Behavior**:

1. Locate daemon (via lock/PID file or HTTP status endpoint)
2. Send SIGTERM to daemon process
3. Wait for graceful shutdown (timeout configurable)
4. If timeout exceeded: send SIGKILL (unless `--force` used immediately)
5. Remove lock/PID file
6. Exit with code 0 (success) or 2 (process not found)

**Options**:

| Flag           | Type         | Default | Purpose                                          |
| -------------- | ------------ | ------- | ------------------------------------------------ |
| `--force`      | bool         | false   | Force kill immediately (SIGKILL) without waiting |
| `--timeout`    | seconds      | 30      | Seconds to wait for graceful shutdown            |
| `--log-format` | `json\|text` | `text`  | Output format                                    |

**Exit Codes**: `0` (stopped), `1` (config error), `2` (process not found)

---

## Run Modes

### Mode 1: `--once` (Default, Run-Once)

**Typical use**: Cron jobs, CI/CD pipelines, one-time indexing

**Behavior**:

```
┌─ Load config
├─ Resolve all repos × tracked branches
├─ Index sequentially (or with concurrency per config)
├─ Write results to graph/vectors
└─ Exit with status code (0/1/2/3/4)
```

- **Blocks until complete**: Caller waits for all indexing to finish
- **No daemon**: Process exits after work is done
- **Logging**: Printed to stdout/stderr; streamed or batched per `--log-format`
- **Errors**: Exit code reflects severity (see [Exit Codes](#exit-codes))

**Example**:

```bash
indexer run --once --dry-run
indexer run --once --force --fetch
indexer run --once --verbose
```

---

### Mode 2: `--daemon` (Foreground Daemon)

**Typical use**: Development, manual monitoring, testing

**Behavior**:

```
┌─ Load config
├─ Start work loop (poll for updates or scheduler)
├─ Index repos as needed
├─ Stream logs to stdout
├─ Handle SIGINT/SIGTERM
│  ├─ Graceful shutdown on SIGTERM
│  │  ├─ Stop accepting new work
│  │  ├─ Wait for in-flight jobs
│  │  └─ Exit
│  └─ Force kill on SIGINT (Ctrl+C) with prompt
└─ Exit with status code
```

- **Blocks in foreground**: User sees logs in real-time
- **Interactive signals**: Ctrl+C (SIGINT) prompts user; SIGTERM waits gracefully
- **Logging**: Streamed to stdout (real-time updates)
- **No detach**: Process tied to terminal session

**Example**:

```bash
indexer run --daemon --verbose
# In another terminal:
indexer status
indexer stop
```

---

### Mode 3: `--detached` (Background Daemon)

**Typical use**: Startup scripts, systemd, long-running background processes

**Behavior**:

```
┌─ Validate config
├─ Create lock/PID file
├─ Fork to background (or use nohup-like behavior)
├─ Return immediately with daemon PID
└─ Parent exits 0 (if fork successful)

┌─ Background process
├─ Load config
├─ Start work loop
├─ Log to file or syslog
├─ Graceful shutdown on SIGTERM
└─ Clean up lock/PID on exit
```

- **Non-blocking**: Parent returns immediately; caller can continue
- **Logging**: Directed to file (configurable path) or syslog
- **Daemonization**: Process detaches from terminal; runs in background
- **Lock file**: Created to prevent duplicate daemons

**Example**:

```bash
indexer run --detached
# Returns immediately with message: "Daemon started (PID 12345, logs: /var/log/indexer.log)"

indexer status          # Check daemon status anytime
indexer stop            # Stop daemon gracefully
```

---

## Options & Flags

### Common Options (all commands)

| Flag           | Type         | Default | Purpose           |
| -------------- | ------------ | ------- | ----------------- |
| `--help`       | —            | —       | Show command help |
| `--version`    | —            | —       | Show CLI version  |
| `--log-format` | `json\|text` | `text`  | Output format     |

### Run Command Options

#### Execution Mode (mutually exclusive)

- `--once` (default): Run once and exit
- `--daemon`: Run in foreground with streaming logs
- `--detached`: Run in background (daemonize)

#### Indexing Behavior

- `--dry-run`: Generate plan without writing; exit 0 if plan is valid
- `--force`: Re-index even if snapshot already exists
- **Default behavior: Fetch latest from remotes before indexing**
- `--no-fetch`: Disable fetching; use only local git state (opt-out)

#### Logging

- `--verbose`: Enable debug-level logging
- `--quiet`: Suppress non-error output
- `--log-format json|text`: Output format for logs

#### Configuration

- `--config <path>`: Explicit config file path (default: `INDEXER_CONFIG_PATH` env var, then
  `.indexer-config.json`, then defaults)

---

## Exit Codes

Exit codes follow a consistent severity scale:

| Code | Category          | Meaning                                                  | Recovery                         |
| ---- | ----------------- | -------------------------------------------------------- | -------------------------------- |
| 0    | Success           | Indexing succeeded or dry-run valid plan                 | N/A                              |
| 1    | Config/Validation | Config error, missing required field, codebase not found | Fix config, retry                |
| 2    | Git/IO            | Git operation failed, file system error, repo not found  | Check repo path, git permissions |
| 3    | Database          | Neo4j/Qdrant unavailable, write constraint violated      | Check DB connectivity            |
| 4    | External/Other    | LLM API error, network timeout, unexpected error         | Retry, check external service    |

**Command-specific codes**:

- **`list`**: Always 0 (success) or 1 (config error only)
- **`status`**: 0 (all OK) or 1 (blocker found)
- **`run`**: 0/1/2/3/4 (depends on failure point)
- **`stop`**: 0 (stopped), 2 (daemon not found), 1 (config/other error)

---

## Typical User Workflows

### Workflow 1: First-Time Setup (New User)

**Goal**: User has a repo with `.indexer-config.json` and wants to index it.

```bash
# Step 1: Discover what's configured
$ indexer list
Texere Indexer – Discovered Codebases
...
Total: 1 codebase, 2 branches (0 indexed, 2 pending)

# Step 2: Check prerequisites before running
$ indexer status
Texere Indexer – System Status
...
Summary: Ready to index ✓

# Step 3: Preview what will happen (optional)
$ indexer run --once --dry-run
{
  "config": {
    "codebaseId": "texere",
    "branch": "main"
  },
  "snapshots": [
    { "branch": "main", "commit": "abc123de", "changedFiles": 45 },
    { "branch": "develop", "commit": "def456ab", "changedFiles": 12 }
  ]
}

# Step 4: Run indexing (blocking, cron-friendly)
$ indexer run --once
Texere Indexer – Run Once Mode
  Codebase: texere
    main: indexed ✓ (1,245 symbols)
    develop: indexed ✓ (1,200 symbols)
Indexing completed successfully
$ echo $?
0

# Step 5: Verify results
$ indexer list
Texere Indexer – Discovered Codebases
...
Total: 1 codebase, 2 branches (2 indexed)
```

---

### Workflow 2: CI/CD Integration (Automated)

**Goal**: Index on every commit to ensure graph is up-to-date.

```bash
#!/bin/bash
# .github/workflows/index.yml or .gitlab-ci.yml

set -e  # Exit on error

# Validate config
indexer status > /dev/null || exit 1

# Index in dry-run first
indexer run --once --dry-run --log-format json > /tmp/plan.json
jq '.snapshots | length' /tmp/plan.json

# Index for real
indexer run --once --force --fetch --log-format json | tee /tmp/result.json

# Report success
echo "Indexing succeeded"
exit 0
```

---

### Workflow 3: Long-Running Daemon (Development)

**Goal**: Keep a daemon running that periodically indexes repos.

```bash
# Terminal 1: Start daemon in foreground (see logs in real-time)
$ indexer run --daemon --verbose
Texere Indexer – Daemon Mode
  Started: 2025-12-14T10:00:00Z
  Workers: 4
  Fetching from remotes...
  texere/main: indexed ✓
  texere/develop: indexed ✓
  my-lib/main: indexed ✓
  [polling for updates every 5m...]

# Terminal 2: Check daemon status anytime
$ indexer status
Texere Indexer – System Status
  Daemon Status: running (uptime 5m)
  In-Flight Jobs: 1
  Summary: Ready ✓

# Stop daemon gracefully when done
$ indexer stop --timeout 30
Stopping daemon (PID 12345)...
Waiting for in-flight work to complete...
Daemon stopped ✓
```

---

### Workflow 4: Background Daemon (Production)

**Goal**: Start daemon on system boot, log to file, manage via `systemd` or similar.

```bash
# Start daemon in background
$ indexer run --detached --config /etc/indexer/config.json
Daemon started (PID 12345)
Logs: /var/log/texere-indexer/daemon.log

# Later: check status
$ indexer status
Daemon Status: running (uptime 2h 15m)

# Graceful shutdown (systemd handles this via ExecStop)
$ indexer stop
Daemon stopped ✓
```

**Systemd integration** (post-v1, example):

```ini
[Unit]
Description=Texere Indexer Daemon
After=network.target neo4j.service

[Service]
Type=simple
ExecStart=/usr/local/bin/indexer run --detached --config /etc/indexer/config.json
ExecStop=/usr/local/bin/indexer stop --timeout 30
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

---

## Output Formats

### Text Format (Default)

Human-readable, with colors/Unicode where possible. Suitable for terminal output.

```
Texere Indexer – Discovered Codebases
═════════════════════════════════════

Codebase: texere
  Root: /home/anon/Texere
  Branches:
    main
      Status: indexed (2025-12-14 10:00 UTC)
      Symbols: 1,245
```

### JSON Format (`--log-format json`)

Machine-parseable output. Suitable for automation, log aggregation, CI/CD pipelines.

```json
{
  "command": "list",
  "timestamp": "2025-12-14T10:00:00.000Z",
  "codebases": [
    {
      "id": "texere",
      "root": "/home/anon/Texere",
      "branches": [
        {
          "name": "main",
          "status": "indexed",
          "lastIndexed": "2025-12-14T10:00:00Z",
          "commitHash": "abc123de",
          "symbols": 1245
        }
      ]
    }
  ],
  "summary": {
    "total": 1,
    "indexed": 1,
    "pending": 1
  }
}
```

**All commands support `--log-format json`**. Schema varies per command but follows this pattern:

- Top-level `command` field (e.g., `"list"`, `"status"`, `"run"`)
- Top-level `timestamp` (ISO 8601)
- Data-specific fields (e.g., `codebases`, `daemon`, `snapshots`)
- For `run` command: status and counts per codebase

---

## Configuration Integration

### Config Loading Precedence

1. CLI `--config <path>` (if provided)
2. Environment variable `INDEXER_CONFIG_PATH`
3. `.indexer-config.json` in current directory
4. Work orchestrator defaults (hardcoded fallbacks)

### Config Validation

`indexer status` validates:

- Config is readable and valid JSON
- Required fields present
- Database URIs are well-formed
- Git paths are accessible

### Per-Repo Config Discovery

If `reposDirectory` is configured, the CLI scans for `.indexer-config.json` files in subdirectories
and includes them in operations.

---

## Daemon Lifecycle Management

### Lock File

**Location**: `~/.texere-indexer/daemon.lock` (or `$XDG_RUNTIME_DIR/texere-indexer.lock` on systems
with XDG support)

**Format**: JSON containing:

```json
{
  "pid": 12345,
  "createdAt": "2025-12-14T10:00:00Z",
  "mode": "daemon",
  "configPath": "/path/to/.indexer-config.json"
}
```

**Purpose**: Prevent multiple daemons from running; allow `status` and `stop` commands to locate the
daemon process.

### Stale Lock Recovery

If a daemon dies ungracefully (killed -9, crash), the lock file may be stale:

1. On `indexer run --daemon` or `indexer run --detached`:
   - Check if lock file exists
   - If it does: Check if PID is still alive (`ps <pid>`)
   - If PID is dead: Log warning, auto-clean lock file, proceed with startup
   - If PID is alive: Reject with error (see [Validation Rules](#validation-rules) #2)

2. On `indexer status`:
   - Same check: if lock file exists but PID is dead, log "Last daemon crashed (PID 12345)"
   - Do not auto-clean (let user decide)

3. User can force cleanup with `indexer stop --force` if needed

---

## Graceful Shutdown

### For `--daemon` Mode (Foreground)

1. User presses Ctrl+C or daemon receives SIGINT
2. CLI prompts: "Shutdown daemon? (y/n) [n]"
3. If yes: Send SIGTERM to self, exit gracefully
4. If no: Continue running

### For `--detached` Mode (Background)

1. User calls `indexer stop`
2. CLI finds daemon PID from lock file
3. Sends SIGTERM to daemon
4. Waits up to `--timeout` seconds for graceful shutdown
5. If still running after timeout: sends SIGKILL
6. Removes lock file
7. Exits with code 0 (success) or 2 (not found)

### Graceful Shutdown Behavior (Daemon Process)

When daemon receives SIGTERM:

1. Stop accepting new work (mark queue as closed)
2. Wait for in-flight jobs to complete
3. Flush any pending writes to graph/vectors
4. Log final summary
5. Exit with code 0

Timeout is configurable (default: 30 seconds). If not complete by timeout, log warning and exit
anyway.

---

## Implementation Checklist

### Command: `indexer validate`

**Discovery & Validation**:

- [ ] Load orchestrator config (discover in cwd/parents or use `--config`)
- [ ] If `--recursive` enabled (default):
  - [ ] For each codebase in orchestrator config
  - [ ] Check for `.indexer-config.json` at codebase `root` path
  - [ ] Collect per-repo config files
  - [ ] Error if multiple configs found in same codebase directory
- [ ] Validate each config file (required fields, types, URI formats)
- [ ] Validate environment variable substitution (all required vars present)
- [ ] Check git paths accessibility (warn if inaccessible but don't fail)

**Output & Exit**:

- [ ] Report per-config pass/fail status (grouped: Orchestrator vs Per-Repo)
- [ ] Format output as text or JSON per `--log-format`
- [ ] Exit with code 0 (all valid) or 1 (validation errors)

**Tests** (cite `testing_specification.md §3–7`):

- [ ] Orchestrator config discovery (cwd, parents, explicit --config)
- [ ] Recursive per-repo discovery with multiple codebases
- [ ] `--no-recursive` flag disables per-repo discovery
- [ ] Error on multiple configs in same codebase
- [ ] Valid/invalid syntax in orchestrator and per-repo configs
- [ ] Missing required fields, env var substitution errors
- [ ] Inaccessible git paths (warning, not fail)
- [ ] Text and JSON output formats
- [ ] Exit codes (0 success, 1 validation error)

### Command: `indexer list`

**Discovery & Loading** (see `RECURSIVE_CONFIG_DISCOVERY.md`):

- [ ] Load orchestrator config (discover in cwd/parents or use `--config`)
- [ ] If `--recursive` enabled (default): discover per-repo configs at each codebase root
- [ ] Error if multiple configs in same directory
- [ ] Merge configs (per-repo overrides orchestrator)

**Listing**:

- [ ] For each discovered codebase: display ID, root path, tracked branches
- [ ] Query graph for latest snapshots per branch (graceful if DB unavailable)
- [ ] Format output as text or JSON per `--log-format`
- [ ] Exit with code 0 (success) or 1 (config error)

**Tests** (cite `testing_specification.md §3–7`):

- [ ] Recursive discovery with multiple codebases
- [ ] `--no-recursive` flag disables per-repo discovery
- [ ] Error on multiple configs in same directory
- [ ] Text/JSON output, missing DB, missing config

### Command: `indexer status`

**Discovery & Loading** (see `RECURSIVE_CONFIG_DISCOVERY.md`):

- [ ] Load orchestrator config (discover in cwd/parents or use `--config`)
- [ ] If `--recursive` enabled (default): discover per-repo configs at each codebase root
- [ ] Error if multiple configs in same directory
- [ ] Merge configs for complete connectivity picture

**Status Checks**:

- [ ] Check daemon process (via lock file, read PID, check if alive)
  - [ ] If lock exists and PID is dead: report "Last daemon crashed (PID 12345)" (do not auto-clean)
  - [ ] If PID is alive: report running status and stats
- [ ] Test Neo4j connection (from merged config)
- [ ] Test Qdrant connection (from merged config)
- [ ] Query daemon stats if running (worker count, queue depth, in-flight jobs)

**Output & Exit**:

- [ ] Format output as text or JSON per `--log-format`
- [ ] Group results by config source (Orchestrator vs Per-Repo)
- [ ] Exit with code 0 (all OK) or 1 (blocker)

**Tests** (cite `testing_specification.md §3–7`):

- [ ] Recursive discovery with multiple codebases
- [ ] `--no-recursive` flag disables per-repo discovery
- [ ] Error on multiple configs in same directory
- [ ] Daemon running/not running, stale lock detected, DB up/down, various blockages

### Command: `indexer run`

**Discovery & Loading** (see `RECURSIVE_CONFIG_DISCOVERY.md`):

- [ ] Load orchestrator config (discover in cwd/parents or use `--config`)
- [ ] If `--recursive` enabled (default): discover per-repo configs at each codebase root
- [ ] Error if multiple configs in same directory
- [ ] Merge configs (per-repo overrides orchestrator)

**Validation & Pre-flight Checks**:

- [ ] If `--dry-run` is set: reject if `--daemon` or `--detached` also set (error, exit 1)
- [ ] If `--daemon` or `--detached` requested: check for existing daemon
  - [ ] Check lock file exists and PID is alive
  - [ ] If alive: reject with error (exit 2)
  - [ ] If stale: log warning, auto-clean lock, proceed
- [ ] Ensure at least one codebase configured (exit 1 if not)

**Execution**:

- [ ] Validate merged config
- [ ] Fetch latest from remotes (default; skip if `--no-fetch`)
- [ ] Resolve all repos and tracked branches using merged config
- [ ] If `--dry-run`: generate and output plan, exit 0
- [ ] Otherwise: call `runSnapshot` / `runTrackedBranches` from ingest layer
- [ ] Handle `--once` mode: block, collect results, exit
- [ ] Handle `--daemon` mode: create lock file, start loop, stream logs, handle SIGTERM/SIGINT
- [ ] Handle `--detached` mode: daemonize, write lock, return PID, parent exits 0
- [ ] Format output per `--log-format`
- [ ] Exit with appropriate code (0/1/2/3/4)

**Tests** (cite `testing_specification.md §3–7`):

- [ ] Recursive discovery with multiple codebases and merged configs
- [ ] `--no-recursive` flag disables per-repo discovery
- [ ] Error on multiple configs in same directory
- [ ] Validation: dry-run + daemon rejection, existing daemon detection, stale lock cleanup
- [ ] All modes (once, daemon, detached)
- [ ] All flag combinations and edge cases
- [ ] Signal handling (SIGTERM graceful, SIGINT with prompt)
- [ ] Error paths (git, DB, external)

### Command: `indexer stop`

**Discovery & Loading** (see `RECURSIVE_CONFIG_DISCOVERY.md`):

- [ ] Load orchestrator config (for daemon lock location, though configs not strictly needed)
- [ ] Consistent with other commands (recursive enabled by default)

**Shutdown**:

- [ ] Find daemon process (lock file location, read PID)
- [ ] If PID not found: exit with error 2 ("Daemon not found")
- [ ] Send SIGTERM to daemon
- [ ] Wait up to `--timeout` seconds for graceful shutdown
- [ ] If still running after timeout: send SIGKILL (unless `--force` used)
- [ ] Remove lock file after daemon exits
- [ ] Exit with code 0 (stopped), 2 (not found), or 1 (other error)

**Tests** (cite `testing_specification.md §3–7`):

- [ ] Daemon running, not running, timeout scenarios, `--force` flag, stale lock cleanup
- [ ] Config discovery consistent with other commands

### Logging & Output

- [ ] Text format: human-readable, colored where helpful
- [ ] JSON format: valid JSON per schema, proper timestamps
- [ ] `--verbose` flag: include debug logs
- [ ] `--quiet` flag: suppress info logs (errors still printed)
- [ ] Consistent timestamps (ISO 8601)

### Error Handling

- [ ] Config errors → exit 1
- [ ] Git/IO errors → exit 2
- [ ] DB errors → exit 3
- [ ] External errors → exit 4
- [ ] Clear error messages (what failed, why, how to fix)

### Integration with Ingest Layer

- [ ] CLI calls `runSnapshot` / `runTrackedBranches` from `@repo/indexer-ingest`
- [ ] Passes config, logger, flags (force, fetch, dryRun) correctly
- [ ] Collects results and formats output

### Documentation

- [ ] Command help strings (via `--help`)
- [ ] Examples in this spec for each workflow
- [ ] Integration guide (systemd, cron, Docker)

---

## References

- [configuration_and_server_setup.md](./configuration_and_server_setup.md) – Config precedence,
  per-repo discovery
- [ingest_spec.md](./ingest_spec.md) – `runSnapshot` / `runTrackedBranches` API
- [implementation/plan.md](./implementation/plan.md) – Slice 1 (CLI implementation)
- [testing_strategy.md](../../engineering/testing_strategy.md) – Test structure
- Docker CLI – Inspiration for command design (list, run, stop)

---

**End of CLI Specification**
