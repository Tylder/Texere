# Texere Indexer – Configuration & Server Setup Specification

**Document Version:** 1.0  
**Status:** Active Specification  
**Last Updated:** December 2025  
**Purpose:** Define server configuration hierarchy, per-repo config discovery, and runtime behavior

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration Architecture](#configuration-architecture)
3. [Design Decisions](#design-decisions)
4. [Server Config Specification](#server-config-specification)
5. [Per-Repo Config Specification](#per-repo-config-specification)
6. [CLI Interface](#cli-interface)
7. [Server Runtime Behavior](#server-runtime-behavior)
8. [Config Loading & Precedence](#config-loading--precedence)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

The Texere Indexer supports two **first-class non-server runtimes** and an **optional server/queue
extension**:

- **Run-Once Mode (non-server, no queue)**: Programmatic + CLI entrypoint that runs ingest once and
  exits (cron/CI friendly) via `runSnapshot/runTrackedBranches` and `scripts/indexer-run-once.ts`.
- **Daemon Mode (non-server, no queue)**: Long-lived loop that polls for updates and triggers ingest
  inline; still uses the same core API; no HTTP/BullMQ required.
- **Server/Queue Mode (optional, post-v1)**: Persistent HTTP service plus BullMQ workers that
  enqueue indexing jobs. Implemented later as `apps/indexer-server` + `apps/indexer-worker`; not
  required for v1.

All modes share a **three-layer hierarchical configuration system**:

1. **Server Config** (default/fallback): Central configuration for server behavior
2. **Per-Repo Config** (overrides server): Repository-specific indexing rules
3. **Runtime Overrides** (CLI args, API params): Highest precedence

---

## Configuration Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Server Config (INDEXER_CONFIG_PATH env var)             │
│ • Server port, logging, worker threads                  │
│ • Default indexing behavior (fallback)                  │
│ • Repo registration/discovery rules                     │
└─────────────────────────────────────────────────────────┘
                          ↓ (overridden by)
┌─────────────────────────────────────────────────────────┐
│ Per-Repo Config (.indexer-config.json in repo root)     │
│ • Tracked branches to index                             │
│ • Language-specific rules                               │
│ • Security/privacy settings                             │
│ • Custom extractors or patterns                         │
└─────────────────────────────────────────────────────────┘
                          ↓ (overridden by)
┌─────────────────────────────────────────────────────────┐
│ Runtime (CLI args, API params, environment)             │
│ • --branch, --repo, --force flags                       │
│ • Ad-hoc indexing requests                              │
└─────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Config Location (Env-Based, all modes)

Config location is determined by `INDEXER_CONFIG_PATH` when set; otherwise:

- Use `--config <path>` (CLI) / option (programmatic) if provided.
- Else, if `.indexer-config.json` exists in repo root, load it.
- Else, fall back to app/global defaults plus required runtime options (`repoPath`, `codebaseId`,
  `trackedBranches`).

**Rationale**: Works for repos without local config (third-party), keeps 12-factor friendliness, and
stays testable.

**Implementation**:

- If file unreadable: fail run with exit code 1 (config/validation) and clear error.
- Config is re-read on every run (run-once/daemon) and on every request (server); no caching.

---

### Per-Repo Config Discovery (Optional; mainly for self-owned repos)

Daemon/server may scan a configured repos directory automatically for `.indexer-config.json` files,
but per-repo files are **optional**. Third-party repos can be fully configured via app/global
config. Per-repo configs, when present, override app/global defaults for that repo.

**Rationale**:

- Automatic discovery reduces manual registration overhead
- Scales as new repos are added
- Consistent with monorepo patterns (e.g., Nx workspaces)

**Implementation**:

- Server config includes `reposDirectory` or `repoPatterns` (glob)
- On startup and periodically (configurable interval): scan for `.indexer-config.json` files
- Each discovered repo becomes available for indexing
- Repo config is re-read on every indexing operation (not cached)
- Periodic scan does **not** trigger indexing, only discovery

**Example**:

```json
{
  "reposDirectory": "/home/anon/code",
  "repoPatterns": ["**/", "!node_modules/"],
  "configRefreshIntervalMs": 300000
}
```

---

### Dependency Indexing (Deferred to v1.1)

In v1, the indexer focuses on **single-repo analysis** (own codebase only).

**v1.1 plan** (explicit manual registration):

Dependencies are registered explicitly in server config (shared across repos) or per-repo config
(repo-specific). Each dependency is indexed independently and reused across consuming repos.

**Server-level dependency registry** (shared):

```json
{
  "dependencies": [
    {
      "name": "axios",
      "gitUrl": "https://github.com/axios/axios.git",
      "version": "1.6.0"
    },
    {
      "name": "zod",
      "gitUrl": "https://github.com/colinhacks/zod.git",
      "version": "3.22.4"
    }
  ]
}
```

**Per-repo dependency references** (links to server registry or overrides):

```json
{
  "trackedBranches": ["main"],
  "dependencies": [
    {
      "name": "axios",
      "version": "1.6.0"
    },
    {
      "name": "custom-internal-lib",
      "gitUrl": "https://github.com/company/custom-lib.git",
      "commit": "abc123def456"
    }
  ]
}
```

**Documentation sources** (per-repo config):

Three cases handled:

```json
{
  "documentation": {
    "location": "colocated|separate|hosted",
    "paths": ["docs/", "website/"],
    "gitUrl": "https://github.com/company/docs.git",
    "ref": "main",
    "websiteUrl": "https://docs.example.com",
    "crawlPatterns": ["/**"],
    "excludePatterns": ["/search", "/admin"]
  }
}
```

See [documentation_indexing_spec.md](./documentation_indexing_spec.md) for:

- Detailed source configuration
- Processing pipeline
- Linking strategies (14 patterns: explicit mentions, docstrings, parameters, examples, errors, data
  flow, endpoints, features, patterns, config, dependencies, tests, architecture)
- Implementation checklist

**v1.1 behavior**:

- Each dependency is indexed independently (like a separate repo)
- Snapshot created for each dependency version/commit
- Dependencies indexed on-demand (when repo references them)
- Reused across repos (same version = same snapshot node in graph)
- Cross-repo edges: codebase → dependency relationship edges
- gitUrl is manually specified (user-provided); no automatic registry lookup in v1.1

**v1.1 Validation & Safety**:

Version alignment check between package.json and indexer config:

1. Load dependency version from package.json (e.g., `"axios": "1.6.0"`)
2. Load indexer config gitUrl and resolve version tag (e.g., `v1.8`)
3. If versions don't match: **warn** (non-blocking)
4. Log message: "axios: package.json specifies 1.6.0, but config gitUrl resolves to v1.8 (version
   mismatch)"
5. User must manually reconcile (update either package.json or config)

This catches accidental drift where package.json is updated but indexer config is not (or vice
versa).

**Current v1 behavior**:

- Per-repo config: `trackedBranches` only (no dependency indexing)
- Server config: registers available repos; no cross-repo indexing yet

---

### Runtime Precedence (all modes)

Runtime/flags → per-repo (if present) → app/global config → defaults.

**Precedence (highest to lowest)**:

1. Runtime flags/params (CLI `--branch`, `--force`, `--fetch/--no-fetch`, `--config`, `--dry-run`;
   programmatic options)
2. Per-repo config (`.indexer-config.json`, optional)
3. App/global config (from `INDEXER_CONFIG_PATH` or passed object)
4. Defaults

**Implementation**:

- If neither config nor CLI args provided: CLI prompts interactively
- If config exists but no CLI args: use config (no prompt)
- If CLI args provided: ignore config, use CLI (explicit override)

**Example**:

```bash
# Use repo's .indexer-config.json
pnpm indexer:index --repo /path/to/repo

# Override repo config, index specific branch
pnpm indexer:index --repo /path/to/repo --branch feature/x

# Force re-index even if snapshot exists
pnpm indexer:index --repo /path/to/repo --branch main --force
```

---

### Dynamic Config Reload (No Restart Required)

Server does **not** just load configs at startup. Instead:

- **On startup**: Load server config, validate paths, check DB connectivity
- **On every indexing request** (CLI or API): Re-read per-repo configs for changes
- **Periodic refresh** (configurable): Scan `reposDirectory` for new repos

**Rationale**:

- Allows live config updates without server restart
- Supports rapid iteration during development
- Consistent with dynamic monorepo tooling (e.g., Nx)

**Implementation**:

1. Server starts, loads `INDEXER_CONFIG_PATH`
2. Validates: DB connectivity, repos directory exists
3. On CLI/API request to index repo X:
   - Check if repo X exists in reposDirectory
   - Read `.indexer-config.json` from repo X (if exists)
   - Merge with server defaults
   - Apply CLI/API overrides
   - Execute indexing
4. No caching of per-repo configs (fresh read each time)

---

## Server Config Specification

### File Location

Determined by environment variable: `INDEXER_CONFIG_PATH`

### Schema

```json
{
  "version": "1.0",
  "server": {
    "port": 3001,
    "host": "localhost",
    "logLevel": "info"
  },
  "database": {
    "neo4jUri": "neo4j://localhost:7687",
    "neo4jAuth": {
      "username": "neo4j",
      "password": "password"
    },
    "qdrantUrl": "http://localhost:6334"
  },
  "repos": {
    "reposDirectory": "/home/anon/code",
    "configRefreshIntervalMs": 300000,
    "discoveryPatterns": ["**/"]
  },
  "indexing": {
    "defaultBranches": ["main"],
    "maxFilesPerSnapshot": 1000,
    "enableLlmFeatureMapping": true
  },
  "security": {
    "denyPatterns": [".env*", "*.key", "secrets/"],
    "allowedLanguages": ["ts", "tsx", "js", "py"]
  },
  "logging": {
    "format": "json",
    "outputFile": null
  }
}
```

### Required Fields

- `server.port`, `server.host`
- `database.neo4jUri`, `database.qdrantUrl`
- `repos.reposDirectory`

### Optional Fields

All others have sensible defaults. See defaults below.

### Default Values

```json
{
  "version": "1.0",
  "server": {
    "port": 3001,
    "host": "localhost",
    "logLevel": "info"
  },
  "database": {
    "neo4jUri": "neo4j://localhost:7687",
    "qdrantUrl": "http://localhost:6334"
  },
  "repos": {
    "configRefreshIntervalMs": 300000,
    "discoveryPatterns": ["**/"]
  },
  "indexing": {
    "defaultBranches": ["main"],
    "maxFilesPerSnapshot": 5000,
    "enableLlmFeatureMapping": true
  },
  "security": {
    "denyPatterns": [".env*", "*.key", "secrets/", ".git/"]
  },
  "logging": {
    "format": "text",
    "outputFile": null
  }
}
```

---

## Per-Repo Config Specification

### File Location

Must be named `.indexer-config.json` in the repository root.

### Schema

```json
{
  "version": "1.0",
  "codebaseId": "texere",
  "trackedBranches": ["main", "develop", "snapshot-1"],
  "indexing": {
    "languages": ["ts", "tsx"],
    "excludePatterns": ["node_modules/", "dist/", ".next/"],
    "includePatterns": ["src/**", "docs/**"],
    "enableLlmFeatureMapping": true
  },
  "security": {
    "denyPatterns": [".env.local", "private/"]
  }
}
```

### Required Fields

- `codebaseId`: Unique identifier for this codebase (used in graph)
- `trackedBranches`: Array of git branches to index

### Optional Fields

All others override server defaults for this repo.

---

## CLI Interface (non-server run-once)

### Commands

```bash
# Run once (non-server, no queue); config path optional if in workdir
pnpm tsx scripts/indexer-run-once.ts --repo /path/to/repo [--branch main] [--force] [--fetch|--no-fetch] [--dry-run] [--log-format json|text] [--config /path/to/config.json]
```

### Exit Codes (run-once)

- `0`: Success (or dry-run plan emitted)
- `1`: Config error or validation failure
- `2`: Git/IO error
- `3`: Database error
- `4`: External/LLM/other

---

## Run-Once Runtime Behavior (non-server)

**Input**: `{ repoPath, branch?, force?, fetch?, configPath?, dryRun? }`

1. Resolve/clone repo: if `repoPath` is missing locally, clone into `cloneBasePath` from config and
   checkout branch/commit.
2. Load config per precedence.
3. Resolve branch (or trackedBranches) → commit hash.
4. Check snapshot cache; skip if already indexed unless `force`.
5. Git diff → changed files.
6. Run indexers + higher-level extractors.
7. Persist graph/vectors (unless `dryRun`, which emits a plan JSON and exits).
8. Exit with code (0/1/2/3/4). Dry-run returns 0 if plan succeeds.

## Daemon Runtime Behavior (non-server)

**Input**:
`{ reposDirectory?, repoPatterns?, intervalMs, maxConcurrent, fetch=true, cloneBasePath, lockProvider }`

1. Optional periodic discovery of repos + per-repo configs (if present).
2. On each interval: fetch (if enabled), resolve branches, skip unchanged commits, respect
   per-repo/branch lock and global concurrency.
3. Invoke `runSnapshot` inline (no queue) for work items.
4. Graceful shutdown on SIGINT/SIGTERM: stop scheduling, wait for in-flight jobs, exit.

## Server Runtime Behavior (optional, post-v1)

### Startup Sequence

1. Load `INDEXER_CONFIG_PATH` → parse server config
2. Validate: DB connectivity (Neo4j, Qdrant), repos directory exists
3. If validation fails: log errors, exit with code 1
4. Start HTTP server on configured port
5. Schedule periodic repo discovery (configurable interval)
6. Log: "Indexer server ready on port X"

### Indexing Request (API)

1. Resolve repo (clone if missing using `cloneBasePath`).
2. Load per-repo config (if present); merge with server config and request params.
3. Resolve branch → commit hash.
4. Check snapshot cache; if not `force`, skip when already indexed.
5. Enqueue job (if queue enabled) or call `runSnapshot` inline.
6. Return: Snapshot ID, file count, symbol count, status.

### Config Refresh (Periodic)

On interval (default: 5 minutes):

1. Scan `reposDirectory` for `.indexer-config.json` files
2. Compare against cached repo list
3. If new repos found: log and make available
4. If repos deleted: log and remove from available list
5. Do **not** trigger indexing (only discovery)

---

## Config Loading & Precedence

### Loading Order

```
1. Start with server defaults
     ↓
2. Load server config from INDEXER_CONFIG_PATH (if set)
     ↓
3. For specific repo: load per-repo .indexer-config.json
     ↓
4. Apply CLI/API args (highest precedence)
     ↓
Final merged config
```

### Merge Rules

- **Object fields**: Deep merge (per-repo adds to server)
- **Array fields**: Per-repo **replaces** server (not appended)
  - Exception: `denyPatterns` are **merged** (both apply)
- **Primitive fields**: Per-repo/CLI overrides server

### Example

**Server config**:

```json
{
  "indexing": {
    "enableLlmFeatureMapping": true
  },
  "security": {
    "denyPatterns": [".env*", "*.key"]
  }
}
```

**Per-repo config** (`.indexer-config.json`):

```json
{
  "indexing": {
    "languages": ["ts", "tsx"]
  },
  "security": {
    "denyPatterns": ["private/"]
  }
}
```

**CLI args**: `--branch feature/x`

**Final merged config**:

```json
{
  "indexing": {
    "enableLlmFeatureMapping": true,
    "languages": ["ts", "tsx"]
  },
  "security": {
    "denyPatterns": [".env*", "*.key", "private/"]
  },
  "branch": "feature/x"
}
```

---

## Implementation Checklist

### Server Config

- [ ] Load `INDEXER_CONFIG_PATH` environment variable
- [ ] Parse JSON with schema validation
- [ ] Apply defaults for optional fields
- [ ] Validate required fields on startup
- [ ] Log loaded config (sanitize secrets)
- [ ] Watch file for changes and reload on next request

### Per-Repo Config

- [ ] Scan `reposDirectory` for `.indexer-config.json` files
- [ ] Parse and validate each config
- [ ] Re-read on every indexing request (no caching)
- [ ] Merge with server config per precedence rules
- [ ] Handle missing config gracefully (use server defaults)

### CLI

- [ ] Implement `--repo` argument (required)
- [ ] Implement `--branch` argument (optional, overrides config)
- [ ] Implement `--force` flag (skip cache)
- [ ] Implement `--interactive` mode (prompt for missing args)
- [ ] Implement `repos list` command
- [ ] Implement `config validate` command

### Server Runtime

- [ ] Startup validation sequence (DB, repos directory)
- [ ] HTTP endpoints for indexing requests
- [ ] Periodic repo discovery task
- [ ] Config reload logic (no server restart required)
- [ ] Error handling and logging

---

## References

- [ingest_spec.md](./ingest_spec.md) – Indexing pipeline details
- [nx_layout_spec.md](./nx_layout_spec.md) – Library structure
- [test_repository_spec.md](./test_repository_spec.md) – Test setup

---

**End of Configuration & Server Setup Specification**
