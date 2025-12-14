# Texere Indexer CLI

**CLI application for Texere Indexer snapshot resolution and diff computation (Slice 1).**

## Purpose

Provides a command-line interface for:

- Resolving Git branches to commit hashes
- Computing changed files via Git diff (treating renames as delete+add)
- Generating dry-run plans (JSON output without writes)
- Running full snapshot indexing workflows (when later slices are ready)

## Tags & Dependencies

- **Tags**: `domain:indexer`, `layer:app`, `type:cli`
- **Allowed Dependencies**:
  - `@repo/indexer-core` (config loading, DB clients)
  - `@repo/indexer-ingest` (orchestration API)
  - `@repo/indexer-types` (type definitions)
  - `commander` (CLI framework)
- **Node version**: >=18

## Usage

### Commands

```bash
# Discover configured codebases and branches
pnpm --filter @repo/indexer-cli dev:list
pnpm --filter @repo/indexer-cli dev:list:verbose

# Check system status (daemon, database connectivity, readiness)
pnpm --filter @repo/indexer-cli dev:status

# Validate configuration files without running
pnpm --filter @repo/indexer-cli dev:validate

# Run indexing once (dry-run by default)
pnpm --filter @repo/indexer-cli dev:run:once
pnpm --filter @repo/indexer-cli dev:run:once:force  # Force reindex

# Run as foreground daemon (for development/monitoring)
pnpm --filter @repo/indexer-cli dev:run:daemon

# Start background daemon
pnpm --filter @repo/indexer-cli dev:run:detached

# Stop daemon gracefully
pnpm --filter @repo/indexer-cli dev:stop
```

### Root-Level Convenience Commands

From the workspace root:

```bash
pnpm indexer:list         # Discover codebases
pnpm indexer:status       # Check system readiness
pnpm indexer:validate     # Validate configuration
pnpm indexer:run          # Run once (dry-run mode)
pnpm indexer:daemon       # Run as foreground daemon
```

### CLI Flags

For all commands, use `--help` to see available flags:

```bash
pnpm --filter @repo/indexer-cli dev:help
```

| Flag                  | Description                                      | Default |
| --------------------- | ------------------------------------------------ | ------- |
| `--config <path>`     | Explicit config file path                        | auto    |
| `--log-format`        | Output format: `json` or `text`                  | text    |
| `--verbose`           | Enable debug logging                             | false   |
| `--quiet`             | Suppress non-error output                        | false   |
| `--dry-run`           | Generate plan without writing (run command only) | false   |
| `--force`             | Reindex even if snapshot exists (run only)       | false   |
| `--no-fetch`          | Skip fetching from remote (run only)             | false   |
| `--once`              | Run once and exit (default run mode)             | true    |
| `--daemon`            | Run as foreground daemon with streaming logs     | false   |
| `--detached`          | Start background daemon (non-blocking)           | false   |
| `--timeout <seconds>` | Graceful shutdown timeout (stop command only)    | 30      |

### Exit Codes

- **0**: Success or dry-run completed
- **1**: Configuration or validation error
- **2**: Git or IO error
- **3**: Database error
- **4**: External/LLM error or unexpected failure

## Testing

```bash
pnpm --filter @repo/indexer-cli test           # Run all tests
pnpm --filter @repo/indexer-cli test:watch     # Watch mode
pnpm --filter @repo/indexer-cli test:coverage  # Coverage report
```

## Implementation Notes

### Slices

- **Slice 1** (this PR): Git resolution, diff plumbing, dry-run mode
- **Slice 2+**: Language indexers, graph persistence, embeddings, query APIs

### Configuration Precedence

1. CLI flag: `--config <path>`
2. Environment variable: `INDEXER_CONFIG_PATH`
3. Current working directory: `.indexer-config.json`
4. Repository root: `.indexer-config.json` (per-repo config discovery)
5. Defaults: hardcoded in `@repo/indexer-core`

See `configuration_and_server_setup.md §8` for full hierarchy.

### Git Operations

- **Branch resolution**: `git rev-parse refs/heads/<branch>`
- **Commit metadata**: `git log -n 1 --format=%an|%s|%ci`
- **Diff computation**: `git diff-tree -r --name-status <base> <commit>`
- **Renames**: Treated as delete + add per `ingest_spec.md §2.5`

See `git.ts` for implementation details.

## References

- **Implementation Plan**: `docs/specs/feature/indexer/implementation/plan.md` (Slice 1)
- **Ingest Spec**: `docs/specs/feature/indexer/ingest_spec.md` §6 (orchestration)
- **Config Spec**: `docs/specs/feature/indexer/configuration_spec.md` §1–2
- **Configuration Setup**: `docs/specs/feature/indexer/configuration_and_server_setup.md` §2–9
- **Type Definitions**: `@repo/indexer-types`

## Debugging

For VS Code, add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug indexSnapshot",
  "runtimeExecutable": "node",
  "runtimeArgs": ["--loader", "tsx"],
  "args": ["apps/indexer-cli/src/main.ts", "--repo", "test-repo", "--branch", "main", "--dry-run"],
  "cwd": "${workspaceFolder}",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```
