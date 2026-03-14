# MCP SERVER (@texere/mcp)

**Model Context Protocol server** — Exposes Texere graph via 18 tools over stdio transport

## OVERVIEW

CLI executable (`texere-mcp`) that creates MCP server with request handlers for graph operations.
Built with tsdown to single ESM file.

## STRUCTURE

```
src/
├── index.ts              # CLI entry: --db-path parsing, server startup
├── server.ts             # MCP server factory, request handlers
├── tools/
│   ├── index.ts          # Tool registry (18 tools)
│   ├── types.ts          # ToolDefinition, ToolContext
│   ├── helpers.ts        # ok(), invalidInput(), toolFailure()
│   ├── store-knowledge.ts # Store knowledge nodes
│   ├── store-issue.ts    # Store issue nodes
│   ├── store-action.ts   # Store action nodes
│   ├── store-artifact.ts # Store artifact nodes
│   ├── store-source.ts   # Store source nodes
│   ├── get-node.ts       # Single-node retrieval
│   ├── get-nodes.ts      # Batch node retrieval
│   ├── replace-node.ts   # Node replacement
│   ├── invalidate-node.ts # Node soft-delete
│   ├── invalidate-nodes.ts # Batch node soft-delete
│   ├── create-edge.ts    # Edge creation
│   ├── delete-edge.ts    # Edge deletion
│   ├── delete-edges.ts   # Batch edge deletion
│   ├── search.ts         # Full-text search
│   ├── traverse.ts       # Graph traversal
│   ├── search-graph.ts   # Search + traverse
│   ├── stats.ts          # Database statistics
│   └── validate.ts       # Pre-write validation
└── *.test.ts             # 2 test files (unit + integration)
```

## WHERE TO LOOK

| Task                   | File               | Action                                         |
| ---------------------- | ------------------ | ---------------------------------------------- |
| Add new tool           | `tools/{name}.ts`  | Create ToolDefinition, add to `tools/index.ts` |
| Modify CLI args        | `index.ts`         | Update `parseDbPathArg()`                      |
| Change server behavior | `server.ts`        | Update `createTexereMcpServer()`               |
| Add response helper    | `tools/helpers.ts` | Export new helper function                     |

## CONVENTIONS (App-Specific)

### Tool Definition Pattern

```typescript
export const toolName: ToolDefinition<typeof inputSchema> = {
  name: 'texere_tool_name',
  description: 'What it does',
  inputSchema: z.object({
    /* Zod schema */
  }),
  execute: ({ db }, input) => {
    // Convert snake_case → camelCase
    const result = db.methodName(convertedInput);
    return ok({ result });
  },
};
```

### Zod-First Tool Definition

- Schema is source of truth (validation + JSON schema + TS types)
- Use `z.infer<typeof schema>` for type safety
- `safeParse()` for validation, errors handled by `executeToolDefinition()`

### Inline Edge Support (Store Tools)

- All 5 store tools accept optional `edges` array alongside `nodes`
- If edges present → calls `db.storeNodesWithEdges()` (atomic)
- If no edges → calls `db.storeNode()` (backward compatible)
- `temp_id` on nodes echoed in response for cross-call correlation

### Snake_case Input → camelCase API

- MCP tools accept `snake_case` (JSON convention)
- Convert to `camelCase` for Texere API
- Example: `include_edges` → `includeEdges`

### Conditional Option Spreading

```typescript
const options = {
  query: input.query,
  ...(input.type !== undefined ? { type: input.type } : {}),
};
```

- Only include optional fields if provided
- Prevents `undefined` values in API calls

## UNIQUE PATTERNS

### Minimal Mode for Batch Ops

```typescript
const result = minimal
  ? db.storeNode(input, { minimal: true }) // Returns { id }
  : db.storeNode(input); // Returns full Node
```

- Reduces payload for bulk operations
- Tools: `store_knowledge`, `store_issue`, `store_action`, `store_artifact`, `store_source`,
  `create_edge`, `replace_node`

### Batch Limits (Max 50)

- `create_edge` is limited to 50 items per call; `invalidate_nodes` and `delete_edges` are limited
  to 250
- Enforced in Zod schema per tool (`max(50)` for `create_edge`, `max(250)` for `invalidate_nodes`
  and `delete_edges`)
- Per-type store tools accept batch `nodes` input (up to 50) and optional inline `edges` (up to 50)

### Validation Tool (Pre-Write)

- `texere_validate` checks nodes/edges WITHOUT writing
- Returns `{ valid: boolean, issues: ValidationIssue[] }`
- Checks: batch size, type-role validity, self-referential edges, similar nodes

### Structured Error Responses

```typescript
return {
  isError: true,
  content: [{ type: 'text', text: message }],
  structuredContent: { error_code: 'TOOL_ERROR', message, details },
};
```

- All errors include error code for programmatic parsing
- Codes: `UNKNOWN_TOOL`, `INVALID_INPUT`, `TOOL_ERROR`

## TOOL ORGANIZATION (18 Tools)

| Category      | Tools                                                                                                                                          | Batch Support                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node CRUD** | store_knowledge, store_issue, store_action, store_artifact, store_source, get_node, get_nodes, replace_node, invalidate_node, invalidate_nodes | Store tools: batch up to 50 nodes + optional inline edges (up to 50); `get_nodes` accepts up to 200 IDs; `invalidate_nodes` accepts up to 250 IDs |
| **Edge CRUD** | create_edge, delete_edge, delete_edges                                                                                                         | Yes (`create_edge` up to 50, `delete_edges` up to 250)                                                                                            |
| **Search**    | search                                                                                                                                         | No                                                                                                                                                |
| **Graph**     | traverse, search_graph                                                                                                                         | No                                                                                                                                                |
| **Meta**      | stats, validate                                                                                                                                | No                                                                                                                                                |

## INTEGRATION WITH @TEXERE/GRAPH

**Pattern**: MCP tools are **thin wrappers** around Texere methods

1. Accept snake_case input (MCP)
2. Convert to camelCase
3. Call `db.methodName()`
4. Return structured response via `ok()` helper

**Example** (`search.ts`):

```typescript
execute: async ({ db }, input) => {
  const results = await db.search({
    query: input.query,
    ...(input.type !== undefined ? { type: input.type } : {}),
  });
  return ok({ results });
};
```

## STARTUP & LIFECYCLE

1. **CLI**: `texere-mcp [--db-path=<path>]`
2. **Parse args**: Extract `--db-path` or use `.texere/texere.db`
3. **Init DB**: `new Texere(absoluteDbPath)` — opens/creates SQLite
4. **Create server**: `createTexereMcpServer(db)` — registers handlers
5. **Attach transport**: `StdioServerTransport()` — stdio communication
6. **Connect**: `server.connect(transport)` — listen for requests
7. **Error handling**: Catch startup errors → log to stderr → exit 1

**Request flow**:

- Client sends `CallToolRequest`
- Server routes to `callToolHandler`
- Handler calls `executeToolDefinition`
- Validates input (Zod), executes tool, catches errors
- Returns `ToolCallResult`

## BUILD & DEPLOYMENT

**Build**: tsdown (TypeScript → single ESM file)

- Entry: `src/index.ts`
- Output: `dist/index.js` (executable with shebang)
- External: `better-sqlite3` (native module)

**Run**: `pnpm build` then `./dist/index.js --db-path=<path>`

## TESTING

- `tools.test.ts`: Unit tests (tool registration, validation, round-trips)
- `server.int.test.ts`: Integration tests (full server lifecycle, schema validation)
- Vitest with `@texere/source` condition for source resolution

## ANTI-PATTERNS (App-Specific)

- ❌ **Top-level unions in schemas** (`anyOf`, `oneOf`, `allOf`) → MCP incompatible
- ❌ **Async without await** → Triggers `require-await` lint error
- ❌ **Exceed tool batch limits** → Enforced in Zod (`create_edge` 50;
  `invalidate_nodes`/`delete_edges` 250)
- ❌ **Modify server after connect()** → Server is immutable after connection

## NOTES

- **Server is stateless**: All state in `Texere` db instance
- **Tools are synchronous wrappers**: Async only for db calls
- **Error handling**: All errors caught and formatted as MCP responses
- **Schema validation**: Zod schemas validate before tool execution
