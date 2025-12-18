# Texere Indexer – Non‑Code Assets Ingest Specification

**Document Version:** 0.1  
**Last Updated:** December 18, 2025  
**Status:** Draft (authoritative for non-code assets once promoted)  
**Backlink:** [High-Level Spec](../README.md) → [Ingest Spec](./ingest_spec.md)

## Quick Navigation

- [1. Scope & Audience](#1-scope--audience)
- [2. Assets Covered](#2-assets-covered)
- [3. Responsibilities & Pipelines](#3-responsibilities--pipelines)
- [4. Node Extraction Rules](#4-node-extraction-rules)
- [5. Edge Emission Rules](#5-edge-emission-rules)
- [6. Error Handling](#6-error-handling)
- [7. Testing Guidance](#7-testing-guidance)
- [8. Changelog](#8-changelog)

## 1. Scope & Audience

Defines ingestion rules for **non-code assets** that are shared across languages and may be produced
outside language passes: documentation (SpecDoc), configuration, dependencies, secrets, messages,
workflows, and errors. Audience: ingest engineers and agents coordinating language passes with
cross-language pipelines.

## 2. Assets Covered

- Documentation: SpecDoc nodes and DOCUMENTS edges (see documentation_indexing_spec.md).
- Configuration: config files and environment variable templates.
- Dependency: package/dependency manifests (npm, pnpm, yarn).
- Secret: detected secret-like literals (hash-only storage).
- Message: event buses and pub/sub topics defined outside language-specific semantics.
- Workflow: schedulers/orchestrators defined in config or scripts.
- Error: custom error metadata defined in config or docs (v2).

## 3. Responsibilities & Pipelines

- Language passes (e.g., TS) may emit stubs; this spec defines **deterministic enrichment** that is
  language-agnostic and runs after language passes.
- **Documentation pipeline** (documentation_indexing_spec.md) owns content extraction, embeddings,
  and DOCUMENTS edges; language passes only emit SpecDoc stubs + LOCATION.
- **Config/dependency pipeline** parses well-known manifest files at repo root (package.json,
  pnpm-lock.yaml, yarn.lock, .env.example, _.env.sample, config/_.ts|_.js|_.json).
- **Secret detection** runs on config + manifest content; never stores raw secret values.
- **Message/workflow extraction** falls back to script/config parsing when not found in language
  ASTs (e.g., cron YAML).

## 4. Node Extraction Rules

### 4.1 SpecDoc

- Sources: colocated/separate/hosted docs (documentation_indexing_spec.md §2–§5).
- ID: `${snapshotId}:specdoc:${path}`; properties include `source` ("colocated"|"separate"|
  "hosted"|"generated"), `path`, `title`, `contentPreview` (first 5KB).
- Language passes emit stubs; doc pipeline fills content + embeddings.

### 4.2 Configuration

- Files: `.env.example`, `*.env.sample`, `config/**/*.{ts,js,json}`, `next.config.*`,
  `vite.config.*`, `jest.config.*`.
- ID: `${snapshotId}:config:${relativePath}:${keyPath}`.
- Values are **redacted**; keep key names and types. Mark `confidence:'static'`.

### 4.3 Dependency

- Parse package.json + lockfile (pnpm-lock.yaml, package-lock.json, yarn.lock).
- ID: `${snapshotId}:dep:${name}@${version}`.
- Store `name`, `version`, `manager`, `sourceFile`.

### 4.4 Secret

- Heuristic regex on key/value names (`secret|token|api[_-]?key|password|private[_-]?key`).
- Replace value with deterministic hash; mark `confidence:'heuristic'`.
- ID: `${snapshotId}:secret:${relativePath}:${key}`.

### 4.5 Message

- Config-based topics/queues (e.g., `topics.yaml`, `serverless.yml`, `infra/events.json`).
- ID: `${snapshotId}:message:${channel}`; properties `protocol`, `channel`, `sourcePath`.
- Classified as producer/consumer later via edges.

### 4.6 Workflow

- Cron YAML/JSON (`cron.yaml`, `schedules/*.json`), Temporal/Conductor config files.
- ID: `${snapshotId}:workflow:${name}`; properties `schedule`, `entrypoint`.

### 4.7 Error (v2)

- Error catalog files (`errors.yaml`, `errors.json`); ID `${snapshotId}:error:${name}`.

## 5. Edge Emission Rules

- **IN_SNAPSHOT**: exactly one per node above (ingest_spec §6.3).
- **CONTAINS**: Snapshot→Module/File→{SpecDoc,Configuration,Dependency,Secret,Message,Workflow} when
  path-owned; if config is root-scoped, attach Module = repo root.
- **LOCATION**: Non-code node → File/Module with `role:'IN_FILE'|'IN_MODULE'`.
- **DOCUMENTS**: Created by documentation pipeline (documentation_indexing_spec.md); not by language
  passes.
- **DEPENDS_ON**: Module/Symbol/Boundary → Dependency/Configuration/ExternalService (if URL host
  literal present in config).
- **EVENT** (v2): Message producers/consumers (PUBLISHES/CONSUMES/EMITS/LISTENS_TO) added when
  message channel referenced in config + code.
- **TRACKS**: Added centrally using file hashes for INTRODUCED/MODIFIED events.

## 6. Error Handling

- Missing or unreadable files: log + skip (non-blocking).
- YAML/JSON parse error: log with path, continue; emit diagnostic for operator visibility.
- Secret detection failures never block indexing; default to no Secret nodes.

## 7. Testing Guidance

- Golden fixtures for: `.env.example`, package.json + pnpm-lock.yaml, docs folder with markdown,
  cron.yaml, topics.yaml.
- Unit tests cite this spec section (meta/spec_writing §9). Coverage: IDs, redaction, IN_SNAPSHOT
  cardinality, DEPENDS_ON edges from package manifests.

## 8. Changelog

| Date       | Version | Editor | Summary                                     |
| ---------- | ------- | ------ | ------------------------------------------- |
| 2025-12-18 | 0.1     | @agent | Initial non-code asset ingest spec (draft). |
