# Texere Indexer – CLI Usage Guide

**Version**: 0.0.0 (Slice 1)  
**Binary**: `indexer` (from `apps/indexer-cli`)  
**Entry**: `node dist/main.js` or `pnpm start --filter indexer-cli`

---

## Quick Start

### Configuration

First, create or locate an `.indexer-config.json` file. By default, the CLI searches in this order:

1. `INDEXER_CONFIG_PATH` environment variable
2. `--config <path>` CLI flag
3. `.indexer-config.json` in current working directory
4. `.indexer-config.json` in repo root

**Minimal example**:

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "my-repo",
      "root": "/path/to/repo",
      "trackedBranches": ["main", "develop"],
      "languages": ["ts", "tsx", "js"]
    }
  ],
  "graph": {
    "neo4jUri": "neo4j://localhost:7687",
    "neo4jUser": "neo4j",
    "neo4jPassword": "password"
  },
  "vectors": {
    "qdrantUrl": "http://localhost:6333",
    "collectionName": "texere-embeddings"
  }
}
```

### Index a Single Branch

```bash
# Index main branch (default)
indexer --repo my-repo

# Index specific branch
indexer --repo my-repo --branch develop

# Force reindex (skip cache check)
indexer --repo my-repo --force

# Skip git fetch
indexer --repo my-repo --no-fetch
```

### Index All Tracked Branches

```bash
# Index all branches from config
indexer --repo my-repo --tracked-branches

# Force reindex all
indexer --repo my-repo --tracked-branches --force

# Suppress output (errors only)
indexer --repo my-repo --tracked-branches --quiet
```

### Dry-Run Mode

Outputs JSON plan without writing to graph/vectors:

```bash
# Single branch plan
indexer --repo my-repo --branch main --dry-run

# All branches plan
indexer --repo my-repo --tracked-branches --dry-run | jq .
```

### Output Formats

```bash
# Text logging (default)
indexer --repo my-repo --log-format text

# JSON logging (for parsing)
indexer --repo my-repo --log-format json --verbose | jq .

# Quiet mode (errors only)
indexer --repo my-repo --quiet

# Debug logging
indexer --repo my-repo --verbose
```

---

## Complete Command Reference

### Top-Level Usage

```
Usage: indexer [options] [command]

Options:
  -V, --version          Output version
  -h, --help            Display help

Commands:
  snapshot [options]     Index a single snapshot (branch)
  branches [options]     Index all tracked branches for a codebase
```

### Snapshot Command

```bash
indexer snapshot [options]

Options:
  --repo <id>           Codebase ID from config (REQUIRED)
  --branch <name>       Branch to index (default: main)
  --dry-run             Output JSON plan without writes
  --force               Reindex even if snapshot cached
  --fetch               Fetch latest from remote (default: true)
  --no-fetch            Skip git fetch
  --config <path>       Explicit config file path
  --log-format <fmt>    'json' or 'text' (default: text)
  --verbose             Enable debug logging
  --quiet               Suppress non-error output
  -h, --help            Display help
```

**Examples**:

```bash
# Basic
indexer snapshot --repo my-repo

# Specific branch with debug logs
indexer snapshot --repo my-repo --branch develop --verbose

# Dry-run with JSON output
indexer snapshot --repo my-repo --dry-run --log-format json > plan.json

# Force reindex without fetch
indexer snapshot --repo my-repo --force --no-fetch
```

### Branches Command

```bash
indexer branches [options]

Options:
  --repo <id>           Codebase ID from config (REQUIRED)
  --dry-run             Output JSON plan for all branches
  --force               Reindex all snapshots
  --fetch               Fetch latest from remote (default: true)
  --no-fetch            Skip git fetch
  --config <path>       Explicit config file path
  --log-format <fmt>    'json' or 'text' (default: text)
  --verbose             Enable debug logging
  --quiet               Suppress non-error output
  -h, --help            Display help
```

**Examples**:

```bash
# Index all tracked branches
indexer branches --repo my-repo

# Dry-run for all branches
indexer branches --repo my-repo --dry-run | jq .

# JSON output with debug logging
indexer branches --repo my-repo --log-format json --verbose

# Continue on errors, quiet output
indexer branches --repo my-repo --quiet
```

---

## Output Formats

### Text Logging

```
[2025-12-12T10:06:33.123Z] INFO: Texere Indexer – Snapshot mode {"codebaseId":"my-repo","branch":"main","dryRun":false,"force":false,"fetch":true}
[2025-12-12T10:06:33.456Z] INFO: Configuration loaded {"codebaseCount":1,"config":{"codebaseIds":["my-repo"],"neo4jUri":"neo4j://localhost:7687"}}
[2025-12-12T10:06:33.789Z] DEBUG: Fetching latest commits from remote {"branch":"main"}
[2025-12-12T10:06:34.234Z] DEBUG: Resolved snapshot {"snapshotId":"my-repo:abc123","commitHash":"abc123"}
[2025-12-12T10:06:34.567Z] INFO: Computed changed files {"added":5,"modified":3,"deleted":1,"renamed":0}
[2025-12-12T10:06:34.890Z] INFO: Snapshot indexed successfully {"snapshotId":"my-repo:abc123","commitHash":"abc123","addedFiles":5,"modifiedFiles":3,"deletedFiles":1,"renamedFiles":0}
```

### JSON Logging

```json
{
  "timestamp": "2025-12-12T10:06:33.123Z",
  "level": "INFO",
  "message": "Texere Indexer – Snapshot mode",
  "codebaseId": "my-repo",
  "branch": "main",
  "dryRun": false,
  "force": false,
  "fetch": true
}
{
  "timestamp": "2025-12-12T10:06:33.456Z",
  "level": "INFO",
  "message": "Configuration loaded",
  "codebaseCount": 1,
  "config": {
    "codebaseIds": ["my-repo"],
    "neo4jUri": "neo4j://localhost:7687"
  }
}
```

### Dry-Run JSON Plan

```json
{
  "config": {
    "codebaseId": "my-repo",
    "neo4jUri": "neo4j://localhost:7687",
    "qdrantUrl": "http://localhost:6333",
    "languages": ["ts", "tsx", "js"]
  },
  "snapshot": {
    "snapshotId": "my-repo:abc123",
    "commitHash": "abc123",
    "branch": "main",
    "changedFiles": {
      "added": ["src/new-file.ts"],
      "modified": ["src/index.ts", "package.json"],
      "deleted": ["src/old-file.ts"],
      "renamed": []
    },
    "plannedOperations": ["index-files", "extract-symbols", "write-graph", "generate-embeddings"]
  }
}
```

---

## Exit Codes

| Code | Meaning                       | Examples                                      |
| ---- | ----------------------------- | --------------------------------------------- |
| `0`  | Success or successful dry-run | Snapshot indexed, plan generated              |
| `1`  | Config/validation error       | Missing --repo, config file not found         |
| `2`  | Git/IO error                  | Branch not found, repo clone failed           |
| `3`  | Database error                | Neo4j/Qdrant connection failed (v1: reserved) |
| `4`  | External/LLM error            | API key invalid, external service timeout     |

```bash
indexer --repo my-repo && echo "Success" || echo "Failed (exit code: $?)"
```

---

## Environment Variables

### Configuration Path

```bash
export INDEXER_CONFIG_PATH=/path/to/.indexer-config.json
indexer --repo my-repo
```

### Graph Database

```bash
export NEO4J_URI=neo4j://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=password
```

### Vector Store

```bash
export QDRANT_URL=http://localhost:6333
```

### Override in Config

```json
{
  "graph": {
    "neo4jUri": "${NEO4J_URI}",
    "neo4jUser": "${NEO4J_USER}",
    "neo4jPassword": "${NEO4J_PASSWORD}"
  },
  "vectors": {
    "qdrantUrl": "${QDRANT_URL}"
  }
}
```

---

## Programmatic API

For use in Node.js code (vs CLI):

```typescript
import { runSnapshot, runTrackedBranches } from '@repo/indexer-ingest';
import { loadIndexerConfig } from '@repo/indexer-core';

// Load config
const config = loadIndexerConfig({ path: '.indexer-config.json' });

// Index single snapshot
const result = await runSnapshot({
  codebaseId: 'my-repo',
  codebaseRoot: '/path/to/repo',
  branch: 'main',
  config,
  dryRun: false,
  force: false,
  fetch: true,
});

console.log(result.snapshotRef); // { codebaseId, commitHash, branch, snapshotId }
console.log(result.changedFiles); // { added, modified, deleted, renamed }

// Index all tracked branches
const results = await runTrackedBranches({
  codebaseId: 'my-repo',
  config,
  dryRun: false,
  force: false,
  fetch: true,
});

// Generate dry-run plan
const plan = await generateDryRunPlan({
  codebaseId: 'my-repo',
  config,
});

console.log(plan); // JSON-serializable plan object
```

**See** `packages/indexer/ingest/src/orchestrator.ts` for full API documentation.

---

## Troubleshooting

### Missing Configuration

```
Error: No configuration file found. Set INDEXER_CONFIG_PATH env var, pass --config <path>, or place .indexer-config.json in working directory or repo root.
```

**Solution**: Create `.indexer-config.json` or set `INDEXER_CONFIG_PATH`:

```bash
export INDEXER_CONFIG_PATH=/path/to/.indexer-config.json
indexer --repo my-repo
```

### Branch Not Found

```
Error: Failed to resolve ref 'refs/heads/develop' in repository /path/to/repo: fatal: Needed a single revision
```

**Solution**: Check branch exists and is configured:

```bash
git -C /path/to/repo branch -a  # List all branches
# Update trackedBranches in config
```

### Missing Codebase

```
Error: Codebase not found: unknown-repo. Available: my-repo, my-other-repo
```

**Solution**: Use correct codebase ID from config:

```bash
indexer --repo my-repo  # From available list
```

### Database Connection Failed

```
[ERROR] Failed to initialize database: Connection refused (port 7687)
```

**Note**: Database errors are reserved for Slice 3 (Neo4j integration). Slice 1 only validates
connection strings.

---

## Tips & Tricks

### Batch Indexing with Dry-Run

```bash
# Generate plan for all branches (no writes)
indexer --repo my-repo --tracked-branches --dry-run > plan.json

# Review plan
jq '.snapshots[] | {snapshotId, branch, changedFileCount: (.changedFiles.added | length)}' plan.json

# Execute after review (in Slice 3+)
indexer --repo my-repo --tracked-branches  # When DB ready
```

### CI/CD Integration

```bash
#!/bin/bash
# Dry-run first
indexer --repo my-repo --force --no-fetch --dry-run || exit 1

# Index if dry-run succeeded
indexer --repo my-repo --force --no-fetch --log-format json >> /var/log/indexer.log

echo "Indexing complete (exit code: $?)"
```

### Monitoring

```bash
# Watch debug logs in real-time
indexer --repo my-repo --verbose --log-format json | jq 'select(.level == "ERROR")'

# Count changed files across all branches
indexer --repo my-repo --tracked-branches --dry-run | jq '.snapshots[] | .changedFiles | add'
```

---

## Next Steps

- **Slice 2**: Language indexers will process changed files (TypeScript, Python)
- **Slice 3**: Graph persistence will write to Neo4j
- **Slice 4+**: Doc ingestion, embeddings, and query API

For implementation details, see:

- `docs/specs/feature/indexer/implementation/plan.md`
- `docs/specs/feature/indexer/ingest_spec.md`
- `docs/specs/feature/indexer/configuration_and_server_setup.md`
