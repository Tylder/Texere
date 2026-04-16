# Texere

**Immutable knowledge graph and retrieval system for AI agents**

Texere is a TypeScript infrastructure project for persistent agent memory.

It combines a typed knowledge graph, SQLite-backed storage, full-text search, vector embeddings,
hybrid retrieval, graph traversal, and an MCP tool surface for agent integration.

## What Texere is

Texere gives agents a local, persistent memory system with explicit structure.

Instead of storing arbitrary notes and hoping retrieval behaves well later, it stores typed nodes
and edges, preserves history through immutable replacement, and exposes retrieval and graph
operations through both a TypeScript library and an MCP server.

If you want a concrete mental model: Texere is a small graph database and retrieval layer for agent
workflows, designed to make memory, provenance, and search behavior easier to reason about.

## Why it exists

Texere is built to make the reliability-sensitive parts explicit.

- typed node and edge model to reduce ambiguity
- immutable replacement model to preserve history
- keyword, semantic, and hybrid retrieval for different query shapes
- traversal-aware retrieval for connected context
- MCP tools so the system is usable by real agent workflows, not just directly in code

## Implemented today

Texere is already implemented as two real surfaces in this repo:

- [`packages/graph`](packages/graph/README.md) — the core graph library
- [`apps/mcp`](apps/mcp/README.md) — the MCP server that exposes the graph to agents

Current capabilities:

- **5 node types, 20 roles, 11 edge types** with type-role constraint validation
- **Immutable graph operations** through create, invalidate, and replace flows
- **Atomic node+edge writes** with `temp_id` support for call-scoped references
- **Keyword, semantic, hybrid, and auto-detected retrieval**
- **Graph traversal and search+traverse** with cursor pagination
- **18 MCP tools** for storage, retrieval, traversal, validation, and metadata
- **Debounced embedding pipeline** for semantic search workloads
- **Unit and integration tests** across the graph and MCP surfaces

## Quick start

**Current status:** Texere is implemented and usable from this monorepo today. The release workflow
is set up for npm publishing via GitHub tags, but `npx @texere/mcp` will only work after the first
package release is published.

```bash
git clone https://github.com/danscan/texere.git
cd texere
pnpm install
pnpm build
```

### Run as an MCP server

```bash
./apps/mcp/dist/index.js
```

Use a custom database path if needed:

```bash
./apps/mcp/dist/index.js --db-path=/path/to/database.db
```

After the first npm release, the same server can be started without cloning the repo:

```bash
npx @texere/mcp --db-path ~/.texere/texere.db
```

Example MCP client configuration:

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

### Use as a library

```typescript
import { NodeRole, NodeType, Texere } from '@texere/graph';

const main = async (): Promise<void> => {
  const db = new Texere('./my-knowledge.db');

  const decision = db.storeNode({
    type: NodeType.Knowledge,
    role: NodeRole.Decision,
    title: 'Use SQLite with WAL mode',
    content: 'Chosen for local-first durability and simple deployment.',
    tags: ['database', 'architecture'],
    importance: 0.9,
    confidence: 0.95,
  });

  const results = await db.search({
    query: 'database architecture decisions',
    mode: 'hybrid',
    limit: 10,
  });

  const neighbors = db.traverse({
    startId: decision.id,
    direction: 'outgoing',
    maxDepth: 2,
    limit: 25,
  });

  console.log(results.results.length, neighbors.results.length);
  db.close();
};

void main();
```

For the detailed API and graph model, see [`packages/graph/README.md`](packages/graph/README.md).

## MCP tool surface

The MCP server exposes 18 tools across four groups:

- **store tools** for typed node creation, including atomic node+edge writes with `temp_id`
- **retrieval and mutation tools** for fetching, replacing, invalidating, and linking graph data
- **search and graph tools** for keyword, semantic, hybrid, traversal, and search+traverse flows
- **metadata and safety tools** for validation and database stats

For the full tool list and package-level usage details, see
[`apps/mcp/README.md`](apps/mcp/README.md).

## Implemented vs evolving

### Implemented now

- core immutable graph storage
- typed node, role, and edge validation
- keyword, semantic, and hybrid retrieval
- cursor-based pagination for search and traversal
- MCP integration over stdio
- test coverage across graph and MCP layers

### Still evolving

- public packaging and distribution beyond the monorepo workflow
- broader documentation curation and architecture storytelling
- future expansion areas described in deeper design and research docs

This repo is meant to separate shipped capability from ongoing cleanup and future expansion.

## Project structure

```text
texere/
├── apps/
│   └── mcp/               # MCP server over stdio
├── packages/
│   └── graph/             # Core graph library
├── tooling/               # Shared lint and TS config
└── docs/                  # Design docs, research, and implementation notes
```

## Development

### Prerequisites

- Node.js 20 or later
- pnpm 10.29.3 or later

### Commands

```bash
pnpm build
pnpm test:unit
pnpm test:integration
pnpm lint
pnpm format:check
pnpm typecheck
pnpm quality
```

## Documentation guide

### Start here

- [README.md](README.md) — public overview and entry point
- [packages/graph/README.md](packages/graph/README.md) — graph library API and retrieval model
- [apps/mcp/README.md](apps/mcp/README.md) — MCP server usage and tool surface

### Core design docs

- [docs/v4-type-system.md](docs/v4-type-system.md) — canonical type-system reference and stable
  modeling rules

### Internal and research-heavy material

The `docs/research/` area plus design plans, benchmark notes, and draft documents are intentionally
kept for deeper context. They are useful if you want implementation history and exploratory work,
but they are not the recommended first path through the repo.

## Release workflow

Texere uses an explicit release flow for npm publishing.

1. Update package versions if needed.
2. Push changes to the default branch as normal.
3. Create and push a release tag such as `v0.1.0`.
4. GitHub Actions publishes `@texere/graph` first, then `@texere/mcp`.
5. The same workflow creates a GitHub Release for that tag with generated notes.

Normal pushes do not publish to npm or create GitHub Releases.

## License

MIT. See [LICENSE](LICENSE).

## Built with

- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Vitest](https://vitest.dev)
- [Turbo](https://turbo.build)
