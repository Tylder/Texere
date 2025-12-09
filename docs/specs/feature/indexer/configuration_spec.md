# Texere Indexer – Configuration & Environment Specification

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** v1 Specification

## Overview

This specification defines environment variables, configuration files, and runtime configuration for
the Texere Indexer. Configuration is **branch-driven** for own repositories (per §6.1 of
[ingest_spec.md](./ingest_spec.md)) and **version-driven** for dependencies.

## Scope

- Environment variables and defaults
- Configuration file format (`.indexer-config.json`)
- Tracked branches configuration (branch names per repository)
- Allow/deny lists for sensitive paths (security & privacy)
- Embedding model selection and parameters
- Graph (Neo4j) and vector store (Qdrant) connection strings
- Worker/executor configuration (optional BullMQ)

## Out of Scope

- Deployment procedures (handled elsewhere)
- Operational runbooks
- Secret management (vault integration)
- Horizontal scaling configuration (v2+)

## Table of Contents

1. [Configuration File (.indexer-config.json)](#1-configuration-file)
2. [Environment Variables](#2-environment-variables)
3. [Tracked Branches](#3-tracked-branches)
4. [Security & Privacy Lists](#4-security--privacy-lists)
5. [Embedding & LLM Configuration](#5-embedding--llm-configuration)
6. [Changelog](#6-changelog)

---

## 1. Configuration File (`.indexer-config.json`)

The primary configuration is stored in `.indexer-config.json` at the repository root. This file is
**not committed** to version control (add to `.gitignore`); use `.indexer-config.example.json` as a
template.

### Schema

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "my-repo",
      "root": "/path/to/my-repo",
      "trackedBranches": ["main", "develop", "staging"],
      "languages": ["ts", "tsx", "py"],
      "defaultBranch": "main"
    }
  ],
  "graph": {
    "neo4jUri": "${NEO4J_URI}",
    "neo4jUser": "${NEO4J_USER}",
    "neo4jPassword": "${NEO4J_PASSWORD}"
  },
  "vectors": {
    "qdrantUrl": "${QDRANT_URL}",
    "collectionName": "texere-embeddings"
  },
  "security": {
    "denyPatterns": [".env", "*.key", "*.pem", "secrets/**"],
    "allowPatterns": null
  },
  "embedding": {
    "model": "openai",
    "modelName": "text-embedding-3-small",
    "dimensions": 1536,
    "batchSize": 128
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "maxTokens": 1024
  },
  "worker": {
    "type": "local",
    "concurrency": 4,
    "retryAttempts": 3,
    "retryDelayMs": 5000
  }
}
```

### Key Fields

| Field                         | Type   | Required | Default                  | Notes                                                      |
| ----------------------------- | ------ | -------- | ------------------------ | ---------------------------------------------------------- |
| `version`                     | string | Yes      | —                        | Schema version (e.g., "1.0")                               |
| `codebases[].id`              | string | Yes      | —                        | Unique identifier for codebase (e.g., "my-repo")           |
| `codebases[].root`            | string | Yes      | —                        | Absolute path to repo root                                 |
| `codebases[].trackedBranches` | array  | Yes      | —                        | Array of branch names to index (e.g., ["main", "develop"]) |
| `codebases[].languages`       | array  | No       | ["ts", "tsx", "js"]      | Language IDs to index                                      |
| `codebases[].defaultBranch`   | string | No       | "main"                   | Default branch for incremental diff baseline               |
| `graph.neo4jUri`              | string | Yes      | —                        | Neo4j connection URI (env var substitution supported)      |
| `graph.neo4jUser`             | string | Yes      | —                        | Neo4j user (env var substitution supported)                |
| `graph.neo4jPassword`         | string | Yes      | —                        | Neo4j password (env var substitution supported)            |
| `vectors.qdrantUrl`           | string | Yes      | —                        | Qdrant instance URL (env var substitution supported)       |
| `vectors.collectionName`      | string | No       | "texere-embeddings"      | Collection name for embeddings in Qdrant                   |
| `security.denyPatterns`       | array  | No       | `[".env", "*.key"]`      | Glob patterns to exclude from indexing/LLM processing      |
| `security.allowPatterns`      | array  | No       | null                     | If set, **only** files matching these patterns are indexed |
| `embedding.model`             | string | No       | "openai"                 | Embedding provider ("openai", "local", etc.)               |
| `embedding.modelName`         | string | No       | "text-embedding-3-small" | Model identifier for provider                              |
| `embedding.dimensions`        | number | No       | 1536                     | Embedding vector dimensionality                            |
| `embedding.batchSize`         | number | No       | 128                      | Batch size for embedding requests                          |
| `llm.provider`                | string | No       | "openai"                 | LLM provider ("openai", "anthropic", etc.)                 |
| `llm.model`                   | string | No       | "gpt-4o-mini"            | Model identifier for LLM                                   |
| `llm.temperature`             | number | No       | 0.3                      | Temperature for LLM generation (0.0–1.0)                   |
| `llm.maxTokens`               | number | No       | 1024                     | Max output tokens for LLM responses                        |
| `worker.type`                 | string | No       | "local"                  | Executor type ("local" or "bullmq")                        |
| `worker.concurrency`          | number | No       | 4                        | Max concurrent index operations                            |
| `worker.retryAttempts`        | number | No       | 3                        | Number of retries on failure                               |
| `worker.retryDelayMs`         | number | No       | 5000                     | Delay between retries (milliseconds)                       |

### Example: .indexer-config.example.json

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "test-typescript-app",
      "root": "/home/user/projects/test-typescript-app",
      "trackedBranches": ["main", "snapshot-1", "snapshot-2"],
      "languages": ["ts", "tsx", "js"],
      "defaultBranch": "main"
    }
  ],
  "graph": {
    "neo4jUri": "bolt://localhost:7687",
    "neo4jUser": "neo4j",
    "neo4jPassword": "password"
  },
  "vectors": {
    "qdrantUrl": "http://localhost:6333",
    "collectionName": "texere-embeddings"
  },
  "security": {
    "denyPatterns": [".env", "*.key", "*.pem", "secrets/**"],
    "allowPatterns": null
  },
  "embedding": {
    "model": "openai",
    "modelName": "text-embedding-3-small",
    "dimensions": 1536,
    "batchSize": 128
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "maxTokens": 1024
  },
  "worker": {
    "type": "local",
    "concurrency": 4,
    "retryAttempts": 3,
    "retryDelayMs": 5000
  }
}
```

---

## 2. Environment Variables

Environment variables can be used to override configuration file values using `${VAR_NAME}` syntax
in JSON (e.g., `"neo4jUri": "${NEO4J_URI}"`). Create a `.env` file at the project root (not
committed).

### Required Variables

| Variable         | Default | Notes                                                   |
| ---------------- | ------- | ------------------------------------------------------- |
| `NEO4J_URI`      | —       | Neo4j connection string (e.g., `bolt://localhost:7687`) |
| `NEO4J_USER`     | —       | Neo4j username                                          |
| `NEO4J_PASSWORD` | —       | Neo4j password                                          |
| `QDRANT_URL`     | —       | Qdrant instance URL (e.g., `http://localhost:6333`)     |
| `OPENAI_API_KEY` | —       | OpenAI API key (if using OpenAI for embeddings/LLM)     |

### Optional Variables

| Variable              | Default                  | Notes                                        |
| --------------------- | ------------------------ | -------------------------------------------- |
| `INDEXER_CONFIG_PATH` | `./.indexer-config.json` | Path to configuration file                   |
| `LOG_LEVEL`           | `info`                   | Log level ("debug", "info", "warn", "error") |
| `BATCH_SIZE`          | 128                      | Embedding batch size (overrides config)      |

---

## 3. Tracked Branches

### Purpose

The `trackedBranches` array in `.indexer-config.json` specifies which Git branches should be
indexed. Per [ingest_spec.md §6.1](./ingest_spec.md#61-snapshot-selection--branch-based-indexing),
the indexer:

1. Reads the configured branch names.
2. Resolves each to a commit hash via `git rev-parse <branch>`.
3. Creates an immutable Snapshot for each branch (with `snapshotType: "branch"`).
4. Computes Git diffs between old and new commits to detect incremental changes.

### Example

```json
{
  "codebases": [
    {
      "id": "my-repo",
      "root": "/path/to/my-repo",
      "trackedBranches": ["main", "develop", "staging"],
      "defaultBranch": "main"
    }
  ]
}
```

In this example:

- Indexer will index the latest commits of `main`, `develop`, and `staging`.
- When `main` updates, indexer computes `git diff main@{old}..main@{new}` and indexes changed files.
- Each branch's latest snapshot is immutable; branch updates create new Snapshot nodes.

### Default Behavior

If `trackedBranches` is not specified, the indexer defaults to `["main"]` (or the value of
`defaultBranch` if set).

---

## 4. Security & Privacy Lists

### Deny Patterns

Files matching `denyPatterns` glob patterns are **excluded** from indexing and **never sent to LLM
components**. Default patterns include `.env`, `*.key`, `*.pem`, and `secrets/**`.

```json
{
  "security": {
    "denyPatterns": [".env", "*.key", "*.pem", "secrets/**", "config/api-keys/**"]
  }
}
```

### Allow Patterns (Optional)

If `allowPatterns` is set (non-null), **only** files matching these patterns are indexed. This
provides an allow-only mode for sensitive repositories.

```json
{
  "security": {
    "allowPatterns": ["src/**", "tests/**", "docs/**"]
  }
}
```

When both are set, a file is indexed if:

- It matches `allowPatterns` **AND**
- It does **not** match `denyPatterns`

---

## 5. Embedding & LLM Configuration

### Embedding Provider

The `embedding` section controls vector generation for symbols, endpoints, test cases, and
documentation.

```json
{
  "embedding": {
    "model": "openai",
    "modelName": "text-embedding-3-small",
    "dimensions": 1536,
    "batchSize": 128
  }
}
```

- `model`: Provider ("openai", "local", etc.)
- `modelName`: Provider-specific model identifier
- `dimensions`: Embedding vector size (must match Qdrant collection)
- `batchSize`: Batch size for requests (tune based on API rate limits)

### LLM Provider (for Feature Mapping)

The `llm` section configures the LLM used for:

- Feature mapping (heuristics + LLM assistance)
- Test ↔ Feature associations
- Boundary ↔ Feature associations

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "maxTokens": 1024
  }
}
```

- `provider`: LLM provider ("openai", "anthropic", etc.)
- `model`: Provider-specific model identifier
- `temperature`: Generation temperature (0.0–1.0); 0.3 is conservative for determinism
- `maxTokens`: Max output length

**Note**: Per [ingest_spec.md §8](./ingest_spec.md#8-guarantees-in-v1), LLM outputs are best-effort,
not strictly deterministic.

---

## 6. Changelog

| Date       | Version | Editor | Summary                                                   |
| ---------- | ------- | ------ | --------------------------------------------------------- |
| 2025-12-09 | 1.0     | @agent | Full specification with branch-driven config, JSON schema |
| 2025-12-08 | 0.1     | @agent | Placeholder created                                       |

---

## References

- [Ingest Specification](./ingest_spec.md) – Snapshot selection (§3.1, §6.1), security (§6.5)
- [Snapshot Node](./nodes/Snapshot.md) – Branch-based snapshots, snapshotType enum
- [Test Repository Spec](./test_repository_spec.md) – Example .indexer-config.json usage
- [README.md](./README.md) – Performance targets, security overview
