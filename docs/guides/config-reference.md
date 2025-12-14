# Indexer Configuration Reference

Complete reference for `.indexer-config.json` configuration file format, field definitions,
defaults, and examples.

**See also:**

- [Configuration Specification](../specs/feature/indexer/configuration_spec.md) — detailed field
  descriptions and validation rules
- [Configuration & Server Setup](../specs/feature/indexer/configuration_and_server_setup.md) —
  precedence hierarchy, env var substitution, per-repo discovery
- [CLI Specification](../specs/feature/indexer/implementation/cli_spec.md) — command-line interface

---

## Quick Start

1. Copy [.indexer-config.example.json](../../.indexer-config.example.json) to `.indexer-config.json`
   in your project root
2. Set environment variables (see [Environment Variables](#environment-variables) below)
3. Validate: `pnpm indexer validate --config ./.indexer-config.json`

---

## File Location & Precedence

Configuration is loaded in this order (first found wins):

1. **Runtime** (CLI flags) — highest priority  
   `pnpm indexer run --config ./custom-config.json`

2. **Per-repo** (optional in third-party repos)  
   `./.indexer-config.json` at repository root

3. **Global** (app/orchestrator configuration)  
   File pointed to by `INDEXER_CONFIG_PATH` environment variable, or `./.indexer-config.json` at app
   root

4. **Defaults** — hardcoded fallbacks  
   Used when no config file is found and `allowMissing=true`

**See:**
[configuration_and_server_setup.md §8](../specs/feature/indexer/configuration_and_server_setup.md#8-precedence-hierarchy)
for full precedence rules.

---

## Required Fields

These fields must be present in every `.indexer-config.json`:

| Field                         | Type   | Example                   | Purpose                                      |
| ----------------------------- | ------ | ------------------------- | -------------------------------------------- |
| `version`                     | string | `"1.0"`                   | Config file format version (currently `1.0`) |
| `codebases[].id`              | string | `"my-repo"`               | Unique identifier for each codebase          |
| `codebases[].root`            | string | `"/home/user/my-repo"`    | Absolute path to repository root             |
| `codebases[].trackedBranches` | array  | `["main", "develop"]`     | Git branches to index (≥1 required)          |
| `graph.neo4jUri`              | string | `"bolt://localhost:7687"` | Neo4j connection URI                         |
| `graph.neo4jUser`             | string | `"neo4j"`                 | Neo4j username                               |
| `graph.neo4jPassword`         | string | `"password"`              | Neo4j password                               |
| `vectors.qdrantUrl`           | string | `"http://localhost:6333"` | Qdrant instance URL                          |

---

## Optional Fields with Defaults

### Vectors Configuration

| Field                    | Type   | Default               | Description                                   |
| ------------------------ | ------ | --------------------- | --------------------------------------------- |
| `vectors.collectionName` | string | `"texere-embeddings"` | Qdrant collection name for storing embeddings |

### Embedding Configuration

| Field                  | Type   | Default                    | Description                                                                        |
| ---------------------- | ------ | -------------------------- | ---------------------------------------------------------------------------------- |
| `embedding.model`      | enum   | `"openai"`                 | Embedding provider: `"openai"`, `"local"`                                          |
| `embedding.modelName`  | string | `"text-embedding-3-small"` | Model ID for provider (OpenAI: `text-embedding-3-small`, `text-embedding-3-large`) |
| `embedding.dimensions` | number | `1536`                     | Vector dimensionality (must match Qdrant collection)                               |
| `embedding.batchSize`  | number | `128`                      | Batch size for embedding requests                                                  |

### LLM Configuration

| Field             | Type   | Default         | Description                                                  |
| ----------------- | ------ | --------------- | ------------------------------------------------------------ |
| `llm.provider`    | enum   | `"openai"`      | LLM provider: `"openai"`, `"anthropic"`                      |
| `llm.model`       | string | `"gpt-4o-mini"` | Model ID for provider                                        |
| `llm.temperature` | number | `0.3`           | Generation temperature (0.0–1.0); lower = more deterministic |
| `llm.maxTokens`   | number | `1024`          | Max output tokens for LLM responses                          |

### Worker/Executor Configuration

| Field                  | Type   | Default   | Description                                                         |
| ---------------------- | ------ | --------- | ------------------------------------------------------------------- |
| `worker.type`          | enum   | `"local"` | Executor type: `"local"` (single-process), `"bullmq"` (distributed) |
| `worker.concurrency`   | number | `4`       | Max concurrent index operations                                     |
| `worker.retryAttempts` | number | `3`       | Number of retries on failure                                        |
| `worker.retryDelayMs`  | number | `5000`    | Delay between retries (milliseconds)                                |

### Security & Privacy Configuration

| Field                    | Type        | Default             | Description                                                                                 |
| ------------------------ | ----------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `security.denyPatterns`  | array       | `[".env", "*.key"]` | Glob patterns to exclude from indexing and LLM processing                                   |
| `security.allowPatterns` | array\|null | `null`              | If set, **only** files matching these patterns are indexed (intersection with denyPatterns) |

### Per-Repo Discovery (v1 Stub)

| Field            | Type   | Default | Description                                                        |
| ---------------- | ------ | ------- | ------------------------------------------------------------------ |
| `cloneBasePath`  | string | (none)  | Base directory for git clones if codebase root doesn't exist       |
| `reposDirectory` | string | (none)  | Base directory to auto-discover per-repo configs (planned for v2+) |
| `repoPatterns`   | array  | (none)  | Glob patterns for per-repo config discovery (planned for v2+)      |

---

## Environment Variable Substitution

Fields that support environment variable references use `${VAR_NAME}` syntax:

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

Before indexing, ensure these environment variables are set in your shell or `.env` file:

```bash
# .env (not committed to repo)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=sk-...  # For embedding & LLM providers
```

**Note:** Missing environment variables will cause validation errors. Use `pnpm indexer validate` to
check before indexing.

---

## Examples

### 1. Local Development Setup

Minimal local configuration with docker-compose services:

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "my-project",
      "root": "/home/user/projects/my-project",
      "trackedBranches": ["main", "develop"]
    }
  ],
  "graph": {
    "neo4jUri": "bolt://localhost:7687",
    "neo4jUser": "neo4j",
    "neo4jPassword": "neo4j"
  },
  "vectors": {
    "qdrantUrl": "http://localhost:6333"
  }
}
```

Start services: `docker-compose -f docker-compose.yml up -d`

### 2. Production with Environment Variables

Use env var references for sensitive credentials:

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "production-repo",
      "root": "/opt/repos/production",
      "trackedBranches": ["main"],
      "gitUrl": "https://github.com/myorg/production.git"
    }
  ],
  "graph": {
    "neo4jUri": "${NEO4J_URI}",
    "neo4jUser": "${NEO4J_USER}",
    "neo4jPassword": "${NEO4J_PASSWORD}"
  },
  "vectors": {
    "qdrantUrl": "${QDRANT_URL}",
    "collectionName": "prod-embeddings"
  },
  "embedding": {
    "model": "openai",
    "modelName": "text-embedding-3-large"
  },
  "worker": {
    "type": "bullmq",
    "concurrency": 16,
    "retryAttempts": 5
  }
}
```

Set env vars in production deployment (k8s secrets, environment variables, etc.)

### 3. Multiple Codebases

Index several repositories in one configuration:

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "backend",
      "root": "/repos/backend",
      "trackedBranches": ["main", "staging"]
    },
    {
      "id": "frontend",
      "root": "/repos/frontend",
      "trackedBranches": ["main", "develop"]
    },
    {
      "id": "shared-lib",
      "root": "/repos/shared-lib",
      "trackedBranches": ["main"]
    }
  ],
  "graph": {
    "neo4jUri": "bolt://localhost:7687",
    "neo4jUser": "neo4j",
    "neo4jPassword": "neo4j"
  },
  "vectors": {
    "qdrantUrl": "http://localhost:6333"
  }
}
```

### 4. Allow-Only Security Mode

Whitelist specific file types instead of denylist:

```json
{
  "version": "1.0",
  "codebases": [
    {
      "id": "open-source",
      "root": "/repos/open-source",
      "trackedBranches": ["main"]
    }
  ],
  "graph": {
    "neo4jUri": "bolt://localhost:7687",
    "neo4jUser": "neo4j",
    "neo4jPassword": "neo4j"
  },
  "vectors": {
    "qdrantUrl": "http://localhost:6333"
  },
  "security": {
    "allowPatterns": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "README.md", "docs/**/*.md"],
    "denyPatterns": [".env", "*.key", "secrets/**"]
  }
}
```

With allow-only mode, **only** files matching `allowPatterns` are indexed (after denylist
filtering).

---

## Validation

### Pre-Indexing Validation

Always validate configuration before running the indexer:

```bash
pnpm indexer validate --config ./.indexer-config.json
```

This checks:

- JSON syntax validity
- All required fields present
- Field types and constraints (e.g., temperature 0.0–1.0)
- Environment variables can be resolved
- Database connections reachable (Neo4j, Qdrant)

### Schema Validation (IDE)

For IDE autocomplete and inline validation in VSCode:

1. Locate the JSON Schema file:

   ```
   node_modules/@repo/indexer-core/dist/schemas/indexer-config.schema.json
   ```

2. Add to `.vscode/settings.json`:

   ```json
   {
     "json.schemas": [
       {
         "fileMatch": [".indexer-config.json"],
         "url": "./node_modules/@repo/indexer-core/dist/schemas/indexer-config.schema.json",
         "description": "Texere Indexer configuration schema"
       }
     ]
   }
   ```

3. Restart VSCode; you'll now get autocomplete and validation hints in `.indexer-config.json`

---

## Troubleshooting

### "No configuration file found"

- Check `INDEXER_CONFIG_PATH` env var is set correctly
- Verify `.indexer-config.json` exists in current directory or parent directories
- Try explicit path: `pnpm indexer run --config ./path/to/.indexer-config.json`

### "Missing required field: neo4jUri"

- Ensure all graph credentials are present (see [Required Fields](#required-fields))
- If using env vars (`${NEO4J_URI}`), check the variable is set: `echo $NEO4J_URI`
- Run validation: `pnpm indexer validate`

### "Environment variable NEO4J_PASSWORD not set"

- Add to `.env` or shell environment before running indexer
- Do not commit `.env` to version control
- For CI/CD, use secrets management (e.g., GitHub Actions Secrets)

### "Neo4j connection failed"

- Check Neo4j is running: `curl http://localhost:7687`
- Verify credentials in config file
- Check firewall/network access to Neo4j host

### "Qdrant collection not found"

- Verify Qdrant is running on the configured URL
- Collection will be created automatically if missing
- Check `vectors.collectionName` matches Qdrant setup

---

## Related Documents

- **[Configuration Specification](../specs/feature/indexer/configuration_spec.md)** — detailed field
  descriptions, validation rules, type schemas
- **[Configuration & Server Setup](../specs/feature/indexer/configuration_and_server_setup.md)** —
  server initialization, config discovery, precedence
- **[CLI Specification](../specs/feature/indexer/implementation/cli_spec.md)** — command-line
  interface reference
- **[Example Config File](<(../../.indexer-config.example.json)>)** — commented template for copying
