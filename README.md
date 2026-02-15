# Texere

**Knowledge graph database with semantic search for AI agents**

Texere is a SQLite-based knowledge graph with full-text search (FTS5) and semantic search (vector
embeddings), exposed via the [Model Context Protocol](https://modelcontextprotocol.io) (MCP).

## Features

- **Immutable node/edge graph** with typed nodes and semantic relationships
- **Multi-mode search**: Keyword (BM25), semantic (embeddings), and hybrid (RRF fusion)
- **Graph traversal** with recursive CTEs and depth control
- **MCP server** exposing 14 tools for graph operations
- **Type-safe API** with Zod validation and TypeScript throughout
- **Debounced embedding pipeline** for efficient semantic search

## Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/texere.git
cd texere

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Usage

#### As MCP Server

```bash
# Run MCP server with default database location
./apps/mcp/dist/index.js

# Or specify custom database path
./apps/mcp/dist/index.js --db-path=/path/to/database.db
```

Configure in your MCP client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "texere": {
      "command": "/path/to/texere/apps/mcp/dist/index.js",
      "args": ["--db-path", ".texere/texere.db"]
    }
  }
}
```

#### As Library

```typescript
import { Texere, NodeType, NodeRole } from '@texere/graph';

// Initialize database
const db = new Texere('./my-knowledge.db');

// Store a node
const node = db.storeNode({
  type: NodeType.Knowledge,
  role: NodeRole.Finding,
  title: 'Important Discovery',
  content: 'Details about the discovery...',
  tags: ['research', 'insight'],
  importance: 0.8,
});

// Search with semantic mode
const results = await db.search({
  query: 'discoveries about machine learning',
  mode: 'semantic',
  limit: 10,
});

// Traverse graph
const neighbors = db.traverse({
  startId: node.id,
  direction: 'outgoing',
  maxDepth: 2,
});

// Close when done
db.close();
```

## Project Structure

This is a monorepo with the following packages:

```
texere/
├── apps/
│   └── mcp/              # MCP server (14 tools over stdio)
├── packages/
│   └── graph/            # Core graph library (SQLite + embeddings)
└── tooling/
    ├── eslint-config/    # Shared ESLint configuration
    └── typescript-config/# Shared TypeScript configuration
```

## Development

### Prerequisites

- Node.js 20 or later
- pnpm 10.29.3 or later

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test:unit          # Fast unit tests
pnpm test:integration   # Full integration tests

# Quality checks
pnpm lint               # Run oxlint + eslint
pnpm typecheck          # Type check all packages
pnpm quality            # Run all checks (format, lint, typecheck, test)
```

### Development Workflow

```bash
# Watch mode (MCP server only)
pnpm dev

# Format code
pnpm format

# Fix linting issues
pnpm lint:fix
```

## MCP Tools

The MCP server exposes 14 tools for graph operations:

**Node CRUD:**

- `texere_store_node` / `texere_store_nodes` — Create nodes (single/batch)
- `texere_get_node` — Retrieve node by ID
- `texere_replace_node` — Replace node (creates DEPRECATED_BY edge)
- `texere_invalidate_node` — Soft-delete node

**Edge CRUD:**

- `texere_create_edge` / `texere_create_edges` — Create edges (single/batch)
- `texere_delete_edge` — Delete edge

**Search & Traversal:**

- `texere_search` — Multi-mode search (keyword/semantic/hybrid)
- `texere_search_batch` — Batch search (up to 50 queries)
- `texere_traverse` — Graph traversal with depth control
- `texere_about` — Semantic neighborhood (search + traverse)

**Metadata:**

- `texere_stats` — Database statistics
- `texere_validate` — Pre-write validation

See [apps/mcp/AGENTS.md](apps/mcp/AGENTS.md) for detailed tool documentation.

## Type System

**Node Types:**

- `Knowledge` — Decisions, findings, principles, requirements
- `Issue` — Problems, errors
- `Action` — Tasks, solutions, fixes, workflows, commands
- `Artifact` — Code patterns, file context, examples
- `Context` — Projects, technologies, concepts
- `Meta` — Conversations, system metadata
- `Source` — Web URLs, file paths, repositories, API docs

**Edge Types:**

- `ANCHORED_TO` — Links to file/code location
- `BASED_ON` — Built upon source material
- `CAUSES` — Causal relationship
- `DEPENDS_ON` — Dependency relationship
- `RELATED_TO` — General association
- `RESOLVES` — Solution to problem
- `DEPRECATED_BY` — Replacement relationship
- ...and 9 more

See [packages/graph/src/types.ts](packages/graph/src/types.ts) for the complete type system.

## Architecture

### Core Design Principles

1. **Immutability** — Nodes are never updated, only replaced (DEPRECATED_BY edge)
2. **Type Safety** — Type-role validation via constraint matrix
3. **Batch Operations** — Atomic transactions with 50-item limit
4. **Prepared Statements** — Cached via WeakMap for performance
5. **Debounced Embeddings** — Async pipeline with batch processing

### Search Modes

- **Keyword** — FTS5 with BM25 ranking, field weights
- **Semantic** — Vector similarity via embeddings (384-dim)
- **Hybrid** — Reciprocal Rank Fusion combining both
- **Auto** — Mode detection based on query structure

See [packages/graph/AGENTS.md](packages/graph/AGENTS.md) for architecture details.

## Contributing

### Code Conventions

- **File naming**: kebab-case (e.g., `my-module.ts`)
- **No default exports** (except config files)
- **Explicit return types** required for all functions
- **Import ordering**: builtin → external → internal → parent → sibling
- **Type-only imports**: Use `import type` syntax

### Testing

- **Co-located**: Tests live next to source (`*.test.ts`)
- **Unit/Integration split**: `*.test.ts` vs `*.int.test.ts`
- **No mocking**: Real SQLite (`:memory:`) for all tests
- **Test naming**: Descriptive sentences (e.g., `it('creates node with auto-generated ID')`)

See [AGENTS.md](AGENTS.md) for complete development guidelines.

## Documentation

- [AGENTS.md](AGENTS.md) — Project knowledge base for AI agents
- [packages/graph/AGENTS.md](packages/graph/AGENTS.md) — Graph library internals
- [apps/mcp/AGENTS.md](apps/mcp/AGENTS.md) — MCP server architecture
- [docs/kg-redesign.md](docs/kg-redesign.md) — Design decisions and rationale
- [docs/node-modeling-test-findings.md](docs/node-modeling-test-findings.md) — Anti-patterns

## License

[License details to be added]

## Acknowledgments

Built with:

- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast SQLite3 bindings
- [sqlite-vec](https://github.com/asg017/sqlite-vec) — Vector search extension
- [HuggingFace Transformers.js](https://huggingface.co/docs/transformers.js) — In-browser embeddings
- [Model Context Protocol](https://modelcontextprotocol.io) — AI integration standard
- [Vitest](https://vitest.dev) — Testing framework
- [Turbo](https://turbo.build) — Monorepo task runner
