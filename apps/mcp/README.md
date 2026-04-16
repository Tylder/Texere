# @texere/mcp

`@texere/mcp` is Texere's published Model Context Protocol server.

It exposes Texere's local knowledge graph through a structured stdio MCP interface so clients can
store durable memory, search it, traverse related context, and validate writes before execution.

## Why use `@texere/mcp`

- run Texere as a published npm MCP server
- persist agent memory in a local SQLite-backed graph
- use typed storage instead of flat note blobs
- combine keyword, semantic, and hybrid retrieval with graph traversal
- keep the same graph model available through `@texere/graph`

If you want the direct TypeScript API instead of MCP, start with
[`packages/graph/README.md`](../../packages/graph/README.md).

## Quick start

Run the published package directly:

```bash
npx -y @texere/mcp
```

Default database path: `.texere/texere.db`

Use a custom database location only if needed:

```bash
npx -y @texere/mcp --db-path /absolute/path/to/texere.db
```

### Run from source (optional)

From the repo root:

```bash
pnpm install
pnpm build
./apps/mcp/dist/index.js
```

Override the default database path only if needed:

```bash
./apps/mcp/dist/index.js --db-path /absolute/path/to/texere.db
```

## Add Texere to your client

For a published npm MCP package, the safest default launcher is `npx -y @texere/mcp`.

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
- **Cline** may support extra client-specific fields such as `disabled`, `alwaysAllow`, or timeout
  controls.
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
desktop extensions for local MCP integrations rather than treating Desktop as the same raw config
flow as Claude Code.

## What the server does

The MCP app is a thin integration layer over [`@texere/graph`](../../packages/graph/README.md):

- creates or opens a local Texere SQLite database
- exposes 18 registered MCP tools
- translates MCP-style snake_case input into the graph library's camelCase API shape
- returns structured, machine-readable responses for agent workflows

## MCP tool surface

`@texere/mcp` currently registers **18 tools**.

### Store tools

These create typed nodes and optionally create edges atomically in the same call.

| Tool                     | Purpose                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `texere_store_knowledge` | Store knowledge nodes such as decisions, findings, principles, constraints, pitfalls, and requirements. Supports `temp_id`, `sources`, and optional atomic edges.  |
| `texere_store_issue`     | Store issue nodes such as errors and problems, including reproduction context and failed attempts. Supports `temp_id` and optional atomic edges.                   |
| `texere_store_action`    | Store action nodes such as commands, solutions, tasks, and workflows. Content is expected to be directly actionable. Supports `temp_id` and optional atomic edges. |
| `texere_store_artifact`  | Store artifact nodes such as code patterns, concepts, examples, and technologies. Supports `temp_id` and optional atomic edges.                                    |
| `texere_store_source`    | Store provenance/source nodes such as web URLs, file paths, repositories, and API docs. Supports `temp_id` and optional atomic edges.                              |

### Node and edge mutation tools

| Tool                      | Purpose                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `texere_get_node`         | Read a node by ID, with optional edge expansion.                                                         |
| `texere_get_nodes`        | Read multiple nodes by ID, preserving input order and returning `null` for missing nodes.                |
| `texere_invalidate_node`  | Soft-invalidate a node by setting `invalidated_at`.                                                      |
| `texere_invalidate_nodes` | Soft-invalidate multiple nodes in one call.                                                              |
| `texere_replace_node`     | Atomically replace a node: create the new version, link it with `REPLACES`, and invalidate the old node. |
| `texere_create_edge`      | Create one or many typed edges between nodes.                                                            |
| `texere_delete_edge`      | Hard-delete an edge by ID.                                                                               |
| `texere_delete_edges`     | Hard-delete multiple edges by ID.                                                                        |

### Retrieval and graph tools

| Tool                  | Purpose                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `texere_search`       | FTS5-based search with keyword, semantic, hybrid, and auto modes plus type/role/tag/importance filters. |
| `texere_traverse`     | Traverse the graph from a starting node using recursive CTEs.                                           |
| `texere_search_graph` | Search for seed nodes and then traverse their neighborhood in one call.                                 |

### Metadata and safety tools

| Tool              | Purpose                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `texere_stats`    | Get node and edge counts by type.                                       |
| `texere_validate` | Validate proposed nodes and edges without writing them to the database. |

Tool registration lives in [`src/tools/index.ts`](./src/tools/index.ts).

## Common MCP workflows

Teams typically use `@texere/mcp` to:

- store decisions, findings, constraints, and artifacts as durable agent memory
- attach provenance using source nodes or `sources` fields on store tools
- validate proposed writes before they hit the graph
- search memory with keyword, semantic, hybrid, or auto retrieval
- traverse related graph context after retrieving a relevant node
- replace outdated nodes while preserving provenance and history

## Operating model and boundaries

- **Local database**: Texere stores data in a local SQLite file, not a hosted backend.
- **stdio transport**: this package runs as a stdio MCP server process.
- **Persistent state**: the selected `--db-path` persists graph state between client sessions.
- **Thin wrapper**: most business logic lives in `@texere/graph`; this package exposes it to MCP.
- **Snake_case tool input**: the MCP surface accepts snake_case fields and converts them to the
  graph library's camelCase API internally.

## Minimal MCP example

Example tool call:

```json
{
  "name": "texere_search",
  "arguments": {
    "query": "database decisions",
    "mode": "hybrid",
    "limit": 5
  }
}
```

Example response shape:

```json
{
  "structuredContent": {
    "results": {
      "results": [
        {
          "id": "node_123",
          "type": "knowledge",
          "role": "decision",
          "title": "Use SQLite with WAL mode"
        }
      ],
      "page": {
        "hasMore": false,
        "returned": 1,
        "limit": 5,
        "nextCursor": null
      }
    }
  }
}
```

## Quality signals

- unit tests for tool registration and validation behavior
- integration tests for end-to-end MCP server lifecycle
- thin-wrapper architecture that keeps most business logic in `@texere/graph`
