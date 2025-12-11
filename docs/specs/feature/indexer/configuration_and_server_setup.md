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

The Texere Indexer operates in two modes:

- **Server Mode**: Persistent HTTP service that indexes repos on-demand or scheduled
- **CLI Mode**: Interactive or scripted command-line tool for manual indexing

Both modes share a **three-layer hierarchical configuration system**:

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

### Server Config Location (Env-Based)

Server config location is determined by environment variable `INDEXER_CONFIG_PATH`.

**Rationale**:

- Flexible: testable, works in Docker, CI/CD pipelines
- Explicit: no hidden search paths
- Standard: follows 12-factor app principles

**Implementation**:

- If `INDEXER_CONFIG_PATH` is set: load from that path
- If not set: server uses sensible defaults (warn in logs)
- If file is unreadable: fail startup with clear error message
- Config changes are detected and reloaded on next indexing request (not cached)

---

### Per-Repo Config Discovery (Automatic Scanning)

Server scans a configured repos directory automatically for `.indexer-config.json` files.

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

### Runtime Precedence (CLI Override Config)

Both config files and CLI arguments are supported; **CLI arguments override config**.

**Precedence (highest to lowest)**:

1. CLI flags (e.g., `--branch feature/x`, `--force`)
2. API request parameters (for server mode)
3. Per-repo config (`.indexer-config.json`)
4. Server config (fallback defaults)

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

## CLI Interface

### Commands

```bash
# Index with config (requires .indexer-config.json)
pnpm indexer:index --repo /path/to/repo

# Index specific branch (overrides config)
pnpm indexer:index --repo /path/to/repo --branch feature/x

# Force re-index (skip snapshot cache)
pnpm indexer:index --repo /path/to/repo --branch main --force

# Interactive mode (prompts if no config)
pnpm indexer:index --repo /path/to/repo --interactive

# List available repos (from server config)
pnpm indexer:repos list

# Validate configs
pnpm indexer:config validate --repo /path/to/repo
```

### Exit Codes

- `0`: Success
- `1`: Config error or validation failure
- `2`: Missing required config/args (interactive mode available)
- `3`: Database error

---

## Server Runtime Behavior

### Startup Sequence

1. Load `INDEXER_CONFIG_PATH` → parse server config
2. Validate: DB connectivity (Neo4j, Qdrant), repos directory exists
3. If validation fails: log errors, exit with code 1
4. Start HTTP server on configured port
5. Schedule periodic repo discovery (configurable interval)
6. Log: "Indexer server ready on port X"

### Indexing Request (CLI or API)

**Input**: `{ repoPath, branch?, force? }`

1. **Resolve repo**: Check if `repoPath` exists in reposDirectory
2. **Load per-repo config**: Read `.indexer-config.json` (re-read every time)
3. **Merge configs**: Server defaults + per-repo config + CLI/API overrides
4. **Resolve branch**: `git rev-parse <branch>`
5. **Check snapshot cache**: If snapshot exists and `!force`, skip to graph queries
6. **Index**: Run language indexers, extractors, persist to graph
7. **Return**: Snapshot ID, file count, symbol count, status

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
