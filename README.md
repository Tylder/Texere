# Texere

**Knowledge graph database with semantic search for AI agents**

Texere is an immutable knowledge graph built on SQLite with full-text search (FTS5) and semantic
search (vector embeddings), exposed via the
[Model Context Protocol](https://modelcontextprotocol.io) (MCP). It provides persistent,
cross-session memory for AI agents.

## Features

- **5 node types, 20 roles, 11 edge types** — Typed graph with type-role constraint validation
- **Multi-mode search** — Keyword (BM25), semantic (embeddings), hybrid (RRF fusion), auto-detection
- **Graph traversal** — Recursive CTEs with depth control, edge type filtering, and cursor
  pagination
- **18 MCP tools** — Per-type store tools, retrieval, search, traversal, validation
- **Immutable design** — Nodes never mutate, only replaced with REPLACES edges
- **Soft-delete** — Invalidation timestamps preserve history
- **Debounced embeddings** — Async batch processing for efficient semantic search

## Quick Start

### Installation

```bash
git clone https://github.com/danscan/texere.git
cd texere

pnpm install
pnpm build
```

### As MCP Server

```bash
# Run with default database location
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

### As Library

```typescript
import { Texere, EdgeType, NodeType, NodeRole } from '@texere/graph';

// Initialize database
const db = new Texere('./my-knowledge.db');

// Store a node
const node = db.storeNode({
  type: NodeType.Knowledge,
  role: NodeRole.Decision,
  title: 'Use SQLite with WAL mode',
  content: 'Chose SQLite over PostgreSQL because...',
  tags: ['database', 'architecture'],
  importance: 0.9,
  confidence: 0.95,
});

// Atomic nodes + edges with temp_id
const result = await db.storeNodesWithEdges(
  [
    {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      temp_id: 'd1',
      title: 'Use Hono',
      content: '...',
      importance: 0.9,
      confidence: 0.95,
    },
    {
      type: NodeType.Knowledge,
      role: NodeRole.Finding,
      temp_id: 'f1',
      title: 'Benchmarks',
      content: '...',
      importance: 0.7,
      confidence: 0.9,
    },
  ],
  [{ source_id: 'd1', target_id: 'f1', type: EdgeType.BasedOn }],
);
// result.nodes[0].temp_id === 'd1', result.edges[0].source_id === result.nodes[0].id

// Fetch multiple nodes while preserving input order
const nodes = db.getNodes([node.id, 'missing-id'], { includeEdges: true });
// nodes === [NodeWithEdges, null]

// Search with semantic mode and pagination
const searchPage = await db.search({
  query: 'database decisions',
  mode: 'semantic',
  limit: 10,
});

// searchPage.results
// searchPage.page.nextCursor
// searchPage.page.mode

// Traverse graph with pagination
const neighborsPage = db.traverse({
  startId: node.id,
  direction: 'outgoing',
  maxDepth: 2,
  limit: 25,
});

// Fetch the next search page if needed
if (searchPage.page.nextCursor) {
  await db.search({
    query: 'database decisions',
    mode: 'semantic',
    limit: 10,
    cursor: searchPage.page.nextCursor,
  });
}

await db.search({
  query: '',
  tags: ['database'],
});

// Close when done
db.close();
```

## MCP Tools

The MCP server exposes **18 tools** for graph operations:

**Node CRUD (per-type stores + inline edges):**

- `texere_store_knowledge` — Store decisions, findings, principles, constraints, pitfalls,
  requirements
- `texere_store_issue` — Store problems, errors
- `texere_store_action` — Store tasks, solutions, commands, workflows
- `texere_store_artifact` — Store code patterns, concepts, examples, technologies
- `texere_store_source` — Store web URLs, file paths, repositories, API docs

All store tools support `temp_id` for call-scoped node identification and optional `edges` array for
atomic node+edge creation in a single tool call.

- `texere_get_node` — Retrieve node by ID
- `texere_get_nodes` — Retrieve up to 200 nodes by ID while preserving input order
- `texere_replace_node` — Replace node (creates REPLACES edge, invalidates old)
- `texere_invalidate_node` — Soft-delete node
- `texere_invalidate_nodes` — Soft-delete up to 250 nodes by ID

**Edge CRUD:**

- `texere_create_edge` — Create edges (single or batch up to 50)
- `texere_delete_edge` — Delete edge
- `texere_delete_edges` — Delete up to 250 edges by ID

**Search & Traversal:**

- `texere_search` — Multi-mode search (keyword/semantic/hybrid) with cursor pagination
- `texere_traverse` — Graph traversal with depth control and cursor pagination
- `texere_search_graph` — Search + traverse with cursor pagination over the final deduped result set

`texere_search.page.mode` reflects the effective mode, which is especially useful when the request
uses `mode: 'auto'`.

`texere_search` and `texere_search_graph` both support filter-only queries (`query: ""`) when one or
more filters are provided (`tags`, `type`, `role`, or `min_importance`).

`texere_search_graph` also supports seed tuning via `seed_limit` (cap seed count before traversal)
and `min_seed_relevance` (drop weak seeds relative to the top match quality).

**Metadata:**

- `texere_stats` — Database statistics
- `texere_validate` — Pre-write validation

See [.opencode/skills/texere/SKILL.md](.opencode/skills/texere/SKILL.md) for detailed tool
documentation.

## Type System

### Node Types (5)

- **Knowledge** — Decisions, constraints, principles, findings, requirements, pitfalls
- **Issue** — Problems, errors
- **Action** — Tasks, solutions, commands, workflows
- **Artifact** — Code patterns, concepts, examples, technologies
- **Source** — Web URLs, file paths, repositories, API docs

### Node Roles (20)

Roles are constrained by type via validation matrix:

- **Knowledge** (6): constraint, decision, finding, pitfall, principle, requirement
- **Issue** (2): error, problem
- **Action** (4): command, solution, task, workflow
- **Artifact** (4): code_pattern, concept, example, technology
- **Source** (4): web_url, file_path, repository, api_doc

### Edge Types (11)

- `ALTERNATIVE_TO` — X and Y are options (bidirectional)
- `ANCHORED_TO` — X is relevant to code file Y
- `BASED_ON` — X derived from Y
- `CAUSES` — X leads to Y
- `CONTRADICTS` — X conflicts with Y (bidirectional)
- `DEPENDS_ON` — X requires Y
- `EXAMPLE_OF` — X demonstrates Y
- `PART_OF` — X is component of Y
- `RELATED_TO` — X and Y are related (last resort)
- `REPLACES` — X replaces Y (auto-invalidates Y)
- `RESOLVES` — X fixes/solves Y

See [packages/graph/src/types.ts](packages/graph/src/types.ts) for complete type definitions.

## Project Structure

Monorepo with Turbo task orchestration:

```
texere/
├── apps/
│   └── mcp/              # MCP server (18 tools over stdio)
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

### Commands

```bash
# Build all packages
pnpm build

# Run tests
pnpm test:unit          # Fast unit tests
pnpm test:integration   # Full integration tests

# Quality checks
pnpm lint               # Run oxlint + eslint
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Format code with Prettier
pnpm format:check       # Check formatting only
pnpm typecheck          # Type check all packages
pnpm quality            # Run all checks (format, lint, typecheck, test:unit)
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
- [.opencode/skills/texere/SKILL.md](.opencode/skills/texere/SKILL.md) — MCP tool reference
- [docs/kg-redesign.md](docs/kg-redesign.md) — Design decisions and rationale
- [docs/node-modeling-test-findings.md](docs/node-modeling-test-findings.md) — Anti-patterns

## License

[License details to be added]

## Built With

- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast SQLite3 bindings
- [sqlite-vec](https://github.com/asg017/sqlite-vec) — Vector search extension
- [Transformers.js](https://huggingface.co/docs/transformers.js) — In-browser embeddings
- [Model Context Protocol](https://modelcontextprotocol.io) — AI integration standard
- [Vitest](https://vitest.dev) — Testing framework
- [Turbo](https://turbo.build) — Monorepo task runner
