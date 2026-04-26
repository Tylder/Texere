# Texere
[![npm version](https://img.shields.io/npm/v/@texere/graph?label=%40texere%2Fgraph&logo=npm)](https://www.npmjs.com/package/@texere/graph)
[![npm version](https://img.shields.io/npm/v/@texere/mcp?label=%40texere%2Fmcp&logo=npm)](https://www.npmjs.com/package/@texere/mcp)

Persistent knowledge-graph memory for AI agents, with an MCP server and a TypeScript library.

Texere gives agents a local, structured memory system instead of a flat note store. It combines
typed graph storage, immutable history, keyword and semantic retrieval, graph traversal, and an MCP
server that makes those capabilities available to agent clients.

## Why use Texere

- **Persistent local memory** backed by SQLite
- **Immutable history** through replace-and-invalidate flows instead of in-place mutation
- **Structured retrieval** with keyword, semantic, hybrid, and auto modes
- **Graph traversal** for related-context exploration
- **Two entry points**: `@texere/mcp` for MCP clients, `@texere/graph` for direct TypeScript use

## Quick start

Run the MCP server directly from npm:

```bash
npx -y @texere/mcp
```

Texere uses `.texere/texere.db` by default. Pass `--db-path /absolute/path/to/texere.db` only if you
want a custom database location.

If you want to work from source instead:

```bash
git clone https://github.com/Tylder/Texere.git Texere
cd Texere
pnpm install
pnpm build
./apps/mcp/dist/index.js
```

## Add Texere to your client

The safest default for a published npm MCP package is `npx -y @texere/mcp`. Different clients use
different config shapes, so the examples are grouped by config family.

If you want a custom database location, add:

- `--db-path`
- followed by an absolute path to your database file

### Clients using `mcpServers`

Applies to:

- Claude Code
- Cline
- Windsurf

```json
{
  "mcpServers": {
    "texere": {
      "command": "npx",
      "args": ["-y", "@texere/mcp"]
    }
  }
}
```

With a custom database path:

```json
{
  "mcpServers": {
    "texere": {
      "command": "npx",
      "args": ["-y", "@texere/mcp", "--db-path", "/absolute/path/to/texere.db"]
    }
  }
}
```

Notes:

- **Claude Code** uses `.mcp.json` or user-level Claude config.
- **Cline** may also support extra fields such as `disabled`, `alwaysAllow`, or timeout controls.
- **Windsurf** uses the same high-level `mcpServers` shape but stores config in a different file.

### Clients using `servers`

Applies to:

- Cursor
- VS Code / Copilot

```json
{
  "servers": {
    "texere": {
      "command": "npx",
      "args": ["-y", "@texere/mcp"]
    }
  }
}
```

With a custom database path:

```json
{
  "servers": {
    "texere": {
      "command": "npx",
      "args": ["-y", "@texere/mcp", "--db-path", "/absolute/path/to/texere.db"]
    }
  }
}
```

Notes:

- **Cursor** uses a `servers` root, not `mcpServers`.
- **VS Code / Copilot** also uses `servers`; depending on the exact config mode you use, you may
  want to add `"type": "stdio"`.

### Clients using TOML

Applies to:

- Codex

```toml
[mcp_servers.texere]
command = "npx"
args = ["-y", "@texere/mcp"]
enabled = true
```

With a custom database path:

```toml
[mcp_servers.texere]
command = "npx"
args = ["-y", "@texere/mcp", "--db-path", "/absolute/path/to/texere.db"]
enabled = true
```

### Claude Desktop

Claude Desktop should be documented separately from Claude Code. Current Anthropic docs emphasize
desktop extensions for local MCP integrations rather than lumping Desktop into the same raw config
flow as Claude Code.

## What Texere gives you

### MCP server

`@texere/mcp` exposes the graph through 18 MCP tools:

- 5 typed store tools
- single and batch node retrieval / invalidation
- edge creation and single/batch edge deletion
- search, traversal, and search+traverse
- stats and validation

The actual registered tools are:

- `texere_store_knowledge`
- `texere_store_issue`
- `texere_store_action`
- `texere_store_artifact`
- `texere_store_source`
- `texere_get_node`
- `texere_get_nodes`
- `texere_invalidate_node`
- `texere_invalidate_nodes`
- `texere_replace_node`
- `texere_create_edge`
- `texere_delete_edge`
- `texere_delete_edges`
- `texere_search`
- `texere_traverse`
- `texere_search_graph`
- `texere_stats`
- `texere_validate`

### TypeScript library

`@texere/graph` gives you the same graph model directly from code:

- typed node and edge storage
- immutable replacement semantics
- keyword, semantic, hybrid, and auto retrieval
- traversal with pagination
- graph stats and validation helpers

Install it with:

```bash
npm install @texere/graph
```

## Common use cases

Use Texere when you want to:

- store findings, decisions, constraints, and artifacts as durable agent memory
- retrieve context with keyword, semantic, or hybrid search depending on the query
- traverse related context instead of relying on flat note lookup
- preserve history explicitly instead of mutating memory in place
- expose the same graph model to MCP clients and TypeScript code

## Operating model

- **Local-first**: Texere stores graph data in a local SQLite database.
- **MCP over stdio**: the MCP server runs as a stdio process.
- **Persistent state**: data survives between runs in the selected database path.
- **Immutable history**: node changes are modeled as replacement and invalidation, not in-place
  edits.

## Package map

- [`apps/mcp/README.md`](apps/mcp/README.md) — MCP server usage and tool surface
- [`packages/graph/README.md`](packages/graph/README.md) — graph library API and retrieval model

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

## Contributing and project policies

- [CONTRIBUTING.md](CONTRIBUTING.md) — development workflow and quality expectations
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — collaboration guidelines
- [SECURITY.md](SECURITY.md) — vulnerability reporting guidance
- [CHANGELOG.md](CHANGELOG.md) — notable public-facing changes

## License

MIT. See [LICENSE](LICENSE).
