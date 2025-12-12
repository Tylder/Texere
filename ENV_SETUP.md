# Environment Variable Setup

## Quick Setup

Copy these values to your `.env` file in the project root:

```env
# LangGraph Studio (local dev only - no tracing)
LANGSMITH_API_KEY=dev-local-key
LANGSMITH_TRACING=false

# Ollama LLM Configuration (Required)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b-instruct-q5_K_S

# Langfuse Observability (Optional - leave empty if not using)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=http://localhost:3030

# Indexer Configuration (Optional - required for indexer CLI/daemon)
INDEXER_CONFIG_PATH=
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=
```

## Variable Explanation

### Ollama (Required for LLM)

- **`OLLAMA_BASE_URL`**: URL to your local Ollama instance
  - Default: `http://localhost:11434`
  - Change only if running Ollama on different host/port
- **`OLLAMA_MODEL`**: Model name to use for inference
  - Default: `llama3.2:3b-instruct-q5_K_S` (small, fast)
  - Alternatives: `llama2`, `mistral`, `neural-chat`, etc.
  - Must be installed on your Ollama instance

### Langfuse (Optional - for observability)

- **`LANGFUSE_PUBLIC_KEY`**: Public key from Langfuse project
  - Leave empty `""` to disable Langfuse integration
  - Get from Langfuse UI after starting: http://localhost:3333

- **`LANGFUSE_SECRET_KEY`**: Secret key from Langfuse project
  - Leave empty `""` to disable Langfuse integration

- **`LANGFUSE_BASE_URL`**: Langfuse API endpoint
  - Default: `http://localhost:3030` (local docker compose)
  - Change if running Langfuse elsewhere

### Indexer (Optional - required only for indexer CLI/daemon mode)

- **`INDEXER_CONFIG_PATH`**: Path to system-wide indexer config file
  - Default: `.indexer-config.json` in working directory
  - Copy `.indexer-config.example.json` to `.indexer-config.json` and customize
  - Can be overridden per-run with `--config` CLI flag

- **`NEO4J_URI`**: Neo4j connection URI for graph database
  - Default: `bolt://localhost:7687`
  - Customize if Neo4j runs on different host/port

- **`NEO4J_USER`**: Neo4j username
  - Default: `neo4j`

- **`NEO4J_PASSWORD`**: Neo4j password
  - Default: `password`

- **`QDRANT_URL`**: Qdrant vector store endpoint
  - Default: `http://localhost:6333`
  - Customize if Qdrant runs elsewhere

- **`OPENAI_API_KEY`**: OpenAI API key for embeddings/LLM-assisted extraction
  - Leave empty to use stub providers (deterministic for testing)
  - Only needed if real embeddings are required

## Verification

After setting env vars, verify the setup:

```bash
# Check Ollama is accessible
curl http://localhost:11434/api/version

# Check Langfuse is running (if using)
curl http://localhost:3030/api/health
```

## For Testing

Run tests to verify env vars are loaded:

```bash
# Unit tests (doesn't use env vars - uses mocks)
pnpm --filter @repo/langgraph-orchestrator test

# Integration test (uses Ollama - requires OLLAMA_* env vars)
cd packages/langgraph-orchestrator
npx tsx test-classifier.ts
```
