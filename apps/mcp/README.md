# @texere/mcp

`@texere/mcp` is the Model Context Protocol server for Texere.

It exposes Texere's immutable graph, retrieval, traversal, and validation capabilities as a
structured tool surface for AI agents over stdio.

## Package role in the repo

Read this package README if you want the agent-facing server layer.

- Read [`packages/graph/README.md`](../../packages/graph/README.md) if you want the core database,
  graph model, and TypeScript API.
- Read this file if you want to run Texere through MCP, configure a client, or understand the tool
  surface exposed to agents.

**Current status:** this package is publish-ready from the monorepo, but `npx @texere/mcp` will only
work after the first npm release.

## What it does

The MCP app is a thin integration layer over [`@texere/graph`](../../packages/graph/README.md):

- creates or opens a local Texere SQLite database
- registers 18 MCP tools for graph operations
- translates MCP-style snake_case input into the graph library's camelCase API
- returns structured, machine-readable tool responses for agent workflows

If you want the database and retrieval model itself, start with
[`packages/graph/README.md`](../../packages/graph/README.md). If you want agent integration, start
here.

## What it provides

- 5 per-type store tools for knowledge, issues, actions, artifacts, and sources
- node retrieval, replacement, and invalidation tools
- edge creation and deletion tools
- search, traversal, and search+traverse tools
- validation and stats tools
- cursor-aware pagination surfaces for search and graph traversal
- stdio transport for MCP clients such as Claude Desktop and other agent runtimes

Tool registration lives in [`src/tools/index.ts`](./src/tools/index.ts).

## How it relates to `@texere/graph`

The MCP server does not reimplement graph logic.

Its job is to expose the graph library through a consistent MCP interface:

1. accept MCP tool input
2. validate it with Zod schemas
3. convert snake_case fields to the graph library's camelCase API shape
4. call the corresponding `Texere` method
5. return a structured MCP response

That separation keeps the core graph model reusable outside MCP while making the agent interface
explicit and typed.

## Running locally

### Prerequisites

- Node.js 20 or later
- pnpm 10.29.3 or later
- built repo output from `pnpm build`

From the repo root:

```bash
pnpm install
pnpm build
./apps/mcp/dist/index.js
```

Use a custom database path if needed:

```bash
./apps/mcp/dist/index.js --db-path=/path/to/texere.db
```

Default database path: `.texere/texere.db`

On successful startup, the process connects over stdio and waits for MCP requests from the client.

## Run with `npx`

After the package has been published to npm, you can run it without cloning the repo:

```bash
npx @texere/mcp --db-path ~/.texere/texere.db
```

Equivalent explicit form:

```bash
npx --package @texere/mcp texere-mcp --db-path ~/.texere/texere.db
```

## Example MCP client configuration

Use an absolute path for `command` unless your client documents repo-relative resolution.

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

## Tool surface

| Group                          | What it covers                                                        |
| ------------------------------ | --------------------------------------------------------------------- |
| Node CRUD                      | Store typed nodes, fetch them back, replace them, and invalidate them |
| Edge CRUD                      | Create and delete graph edges                                         |
| Retrieval and graph operations | Search, traverse, and combine search with traversal                   |
| Metadata and safety            | Validate writes before execution and inspect database stats           |

Full tool names:

### Node CRUD

- `texere_store_knowledge`
- `texere_store_issue`
- `texere_store_action`
- `texere_store_artifact`
- `texere_store_source`
- `texere_get_node`
- `texere_get_nodes`
- `texere_replace_node`
- `texere_invalidate_node`
- `texere_invalidate_nodes`

### Edge CRUD

- `texere_create_edge`
- `texere_delete_edge`
- `texere_delete_edges`

### Retrieval and graph operations

- `texere_search`
- `texere_traverse`
- `texere_search_graph`

### Metadata and safety

- `texere_stats`
- `texere_validate`

## Design notes worth knowing

- Store tools support `temp_id` plus inline `edges` for atomic node+edge creation in a single call.
- Search supports keyword, semantic, hybrid, and auto-detected modes.
- Traversal and search-graph surfaces return cursor metadata so large result sets stay bounded.
- Validation happens before execution, and errors come back in a structured MCP-friendly format.

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

Until the first npm release exists, the public entry path remains monorepo checkout plus local
build.
