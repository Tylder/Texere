# Texere

**Immutable knowledge graph and retrieval system for AI agents**

Texere is a TypeScript infrastructure project for persistent agent memory.

It combines a typed knowledge graph, SQLite-backed storage, full-text search, vector embeddings,
hybrid retrieval, graph traversal, and an MCP tool surface for agent integration.

## Choose your path

### I want to run an MCP server

Start with [`apps/mcp/README.md`](apps/mcp/README.md) if you want to plug Texere into an MCP client
such as Claude Desktop, Cursor, Cline, or VS Code-compatible tooling.

### I want a TypeScript graph library

Start with [`packages/graph/README.md`](packages/graph/README.md) if you want to use Texere directly
from code without MCP.

### I want the data model and design rules

Start with [`packages/graph/README.md`](packages/graph/README.md) if you want the current graph
model, API surface, and TypeScript usage details.

## Quick start

**Current status:** Texere is implemented and usable from this monorepo today. The release workflow
is set up for npm publishing via GitHub tags, but `npx @texere/mcp` will only work after the first
package release is published.

### Fastest path after the first npm release

```bash
npx @texere/mcp --db-path ~/.texere/texere.db
```

### Run from source today

If you are working from a local checkout today:

```bash
git clone https://github.com/Tylder/Texere.git Texere
cd Texere
pnpm install
pnpm build
./apps/mcp/dist/index.js --db-path ~/.texere/texere.db
```

## Client setup examples

Use an absolute `command` path unless your client explicitly documents relative resolution.

### Claude Desktop

```json
{
  "mcpServers": {
    "texere": {
      "command": "/path/to/texere/apps/mcp/dist/index.js",
      "args": ["--db-path", "/absolute/path/to/.texere/texere.db"]
    }
  }
}
```

### Cursor or Cline

After the first npm release:

```json
{
  "mcpServers": {
    "texere": {
      "command": "npx",
      "args": ["--yes", "@texere/mcp", "--db-path", "/absolute/path/to/.texere/texere.db"]
    }
  }
}
```

Before the first npm release, use the built local executable path shown in the source-based
quickstart instead of `npx`.

### VS Code-compatible local config

```json
{
  "servers": {
    "texere": {
      "type": "stdio",
      "command": "/path/to/texere/apps/mcp/dist/index.js",
      "args": ["--db-path", "/absolute/path/to/.texere/texere.db"]
    }
  }
}
```

For more client-oriented guidance, see [`apps/mcp/README.md`](apps/mcp/README.md).

## What Texere is

Texere gives agents a local, persistent memory system with explicit structure.

Instead of storing arbitrary notes and hoping retrieval behaves well later, it stores typed nodes
and edges, preserves history through immutable replacement, and exposes retrieval and graph
operations through both a TypeScript library and an MCP server.

If you want a concrete mental model: Texere is a small graph database and retrieval layer for agent
workflows, designed to make memory, provenance, and search behavior easier to reason about.

## Operating model

- **Local-first**: Texere stores graph data in a local SQLite database.
- **MCP over stdio**: the MCP server is a stdio process, not a hosted remote service.
- **Persistent state**: data survives across runs in the database path you choose.
- **Immutable history**: nodes are replaced and invalidated rather than updated in place.
- **Two entry points**: use `@texere/mcp` for agent integration or `@texere/graph` for direct code.

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

## Common workflows

Use Texere when you want to:

- store decisions, findings, constraints, and artifacts as typed graph nodes
- retrieve context with keyword, semantic, or hybrid search depending on query shape
- traverse related context instead of relying on flat note lookup
- preserve history through immutable replacement instead of editing memory in place
- expose that graph to MCP clients through a structured tool surface

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
└── tooling/               # Shared lint and TS config
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

- [README.md](README.md) — public overview and entry point
- [apps/mcp/README.md](apps/mcp/README.md) — MCP server usage and tool surface
- [packages/graph/README.md](packages/graph/README.md) — graph library API, model, and retrieval
  behavior

This public branch keeps the documentation surface intentionally small. Deeper working notes,
experiments, and internal planning material are intentionally left out of the public landing path.

## Contributing and project policies

- [CONTRIBUTING.md](CONTRIBUTING.md) — development workflow and quality expectations
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — collaboration guidelines
- [SECURITY.md](SECURITY.md) — vulnerability reporting guidance
- [CHANGELOG.md](CHANGELOG.md) — notable public-facing changes

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
