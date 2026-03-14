# TEXERE PROJECT KNOWLEDGE BASE

**Updated:** 2026-02-15  
**Commit:** 76a1ec6  
**Branch:** remake-as-knowledge-graph

## OVERVIEW

Knowledge graph database with semantic search (SQLite + embeddings), exposed via MCP server.
Designed for AI-assisted development with multi-agent integration (OpenCode, Serena, Sisyphus).

## STRUCTURE

```
texere/
├── apps/mcp/              # MCP server (Model Context Protocol)
│   └── src/tools/         # 18 tool definitions
├── packages/graph/        # Core graph library (SQLite + embeddings)
│   └── src/               # 11 source files, Texere class API
├── tooling/               # Shared ESLint + TypeScript configs
│   ├── eslint-config/     # Custom rules, import ordering
│   └── typescript-config/ # Strict mode, Node.js modules
├── docs/                  # Design docs (kg-redesign, anti-patterns)
├── .Claude/               # Claude Code AI agent workspace
├── .serena/               # Serena IDE language server config
└── .sisyphus/             # Agent execution state tracking
```

## WHERE TO LOOK

| Task                | Location                              | Notes                                |
| ------------------- | ------------------------------------- | ------------------------------------ |
| Add MCP tool        | `apps/mcp/src/tools/`                 | Create file, add to `tools/index.ts` |
| Modify graph API    | `packages/graph/src/index.ts`         | Texere class facade                  |
| Database schema     | `packages/graph/src/schema.ts`        | DDL with FTS5 + vector tables        |
| Search algorithm    | `packages/graph/src/search.ts`        | Keyword/semantic/hybrid modes        |
| Graph traversal     | `packages/graph/src/traverse.ts`      | Recursive CTE                        |
| Embedding pipeline  | `packages/graph/src/embedder.ts`      | Debounced batch processing           |
| Type validation     | `packages/graph/src/types.ts`         | Type-role matrix                     |
| Custom ESLint rules | `tooling/eslint-config/base.js`       | Import ordering, naming              |
| TypeScript config   | `tooling/typescript-config/`          | Strict mode, custom conditions       |
| Design decisions    | `docs/kg-redesign.md`                 | Edge types, immutability             |
| Anti-patterns       | `docs/node-modeling-test-findings.md` | Forbidden practices                  |

## CODE MAP

### Core Exports

- **@texere/graph**: `Texere` class (main API)
  - Node CRUD: `storeNode()`, `storeNodesWithEdges()`, `getNode()`, `getNodes()`, `replaceNode()`,
    `invalidateNode()`, `invalidateNodes()`
  - Edge CRUD: `createEdge()`, `deleteEdge()`, `deleteEdges()`, `getEdgesForNode()`
  - Search: `search()`, `about()`
  - Traversal: `traverse()`
  - Metadata: `stats()`

- **@texere/mcp**: 18 MCP tools
  - `texere_store_knowledge`, `texere_store_issue`, `texere_store_action`, `texere_store_artifact`,
    `texere_store_source`
  - `texere_get_node`, `texere_get_nodes`, `texere_replace_node`, `texere_invalidate_node`,
    `texere_invalidate_nodes`
  - `texere_create_edge`, `texere_delete_edge`, `texere_delete_edges`
  - `texere_search`, `texere_traverse`, `texere_about`
  - `texere_stats`, `texere_validate`

### Type System

- **5 NodeTypes**: Knowledge, Issue, Action, Artifact, Source
- **20 NodeRoles**: Constrained by type via `VALID_ROLES_BY_TYPE` matrix
- **11 EdgeTypes**: AlternativeTo, AnchoredTo, BasedOn, Causes, Contradicts, DependsOn, ExampleOf,
  PartOf, RelatedTo, Replaces, Resolves
- Validation enforced at insertion time

## CONVENTIONS (Project-Specific Only)

### File Naming

- **MUST** use kebab-case: `my-file.ts` (enforced by check-file plugin)
- Test files: `.test.ts` (unit), `.int.test.ts` (integration)
- Config files: `.config.ts`, `.config.mjs`

### Import Organization

- **Strict ordering**: builtin → external → internal → parent → sibling
- **Special handling**: `node:*` first, `@texere/**` before other `@`-scoped
- **No default exports** (except config files)

### Type Safety

- **Explicit return types required** for all functions
- **Type-only imports**: Use `import type` syntax
- Test files: Type checking disabled, `any` allowed

### Build Tools

- **Dual linting**: oxlint (Rust) + eslint (TypeScript)
- **Monorepo**: Turbo for task orchestration
- **MCP app**: tsdown bundler (single executable)
- **Graph library**: tsc compiler (with .d.ts)

### Testing

- **Co-located**: Tests next to source (`src/*.test.ts`)
- **Vitest**: Node environment, `@texere/source` condition
- **No mocking**: Real SQLite (`:memory:`) for all tests

## ANTI-PATTERNS (Explicitly Forbidden)

### Workflow

- ❌ **Creating nodes without searching first** → causes duplicates
- ✅ Always `search()` before `storeNode()`

### Immutability

- ❌ **No node updates/mutations** → nodes are immutable
- ✅ Use `replaceNode()` (creates new + REPLACES edge)
- ❌ **No `updated_at`** field → immutable design

### Type Safety

- ❌ **No `as any`, `@ts-ignore`, `@ts-expect-error`** in production code
- ❌ **No MCP schema unions** (`anyOf`, `oneOf`, `allOf`)

### Edge Types (Deprecated)

- ❌ Older edge types dropped (too subtle for LLMs)
- Use: `CAUSES` not `TRIGGERS`, `RESOLVES` not `SOLVES`, `REPLACES` not `SUPERSEDES`

### Database

- ❌ **No hard-deleting nodes** → use `invalidateNode()` (soft-delete)
- ❌ **No self-referential edges** (enforced by CHECK constraint)
- ❌ **Batch limit: 50 items max** for `storeNode()`, `createEdge()`

## UNIQUE STYLES

### Prepared Statement Caching

```typescript
const statementsByDb = new WeakMap<Database.Database, Statements>();
```

- WeakMap allows GC when db is closed
- Avoid re-preparing on every operation

### Debounced Embedding Pipeline

- `schedulePending()`: Debounced (10s default)
- `flushPending()`: Immediate before semantic search
- Batch embeddings to reduce HuggingFace calls

### Hybrid Search (RRF)

- Reciprocal Rank Fusion: `1 / (60 + rank)`
- Combines keyword (FTS5 BM25) + semantic (vector similarity)
- Mode auto-detection based on query structure

### Transactional Node Replacement

```typescript
db.transaction(() => {
  storeNode(newNode);
  createEdge({ type: 'REPLACES', ... });
  // Old node auto-invalidated
}).immediate();
```

### Minimal Response Mode

- `storeNode(input, { minimal: true })` → returns `{ id }` only
- Reduces payload for bulk operations

## COMMANDS

### Development

```bash
pnpm dev              # Watch mode (MCP app only)
pnpm build            # Build all packages (Turbo)
pnpm typecheck        # Type check all packages
```

### Quality

```bash
pnpm lint             # oxlint + eslint (both must pass)
pnpm lint:fix         # Auto-fix linting issues
pnpm format           # Prettier with cache
pnpm format:check     # Check formatting only
pnpm quality          # Run ALL checks (format, lint, typecheck, test:unit)
```

### Testing

```bash
pnpm test:unit        # Fast unit tests (*.test.ts)
pnpm test:integration # Full integration tests (*.int.test.ts)
```

### Monorepo

```bash
turbo run build       # Build with task dependencies
turbo run test:unit   # Test all packages
```

## NOTES

### Custom Export Condition

- `@texere/source` resolves to TypeScript source during tests
- Defined in vitest.config.ts `resolve.conditions`
- Enables testing source without compilation

### pnpm Built Dependencies

- `onlyBuiltDependencies: ['onnxruntime-node', 'protobufjs', 'sharp']`
- Forces native modules to build from source

### AI Agent Integration

- **Claude Code**: MCP servers (memory-graph, serena, texere)
- **Serena**: TypeScript language server for IDE
- **Sisyphus**: Active plan tracking (`.sisyphus/boulder.json`)

### Database Pragmas (Required)

```sql
pragma journal_mode = WAL;
pragma synchronous = NORMAL;
pragma foreign_keys = ON;
```

- Defined in `packages/graph/src/db.ts`

### FTS5 Query Sanitization

- Barewords OK: `hello world`
- Operators preserved: `hello AND world`
- Non-barewords quoted: `"better-sqlite3"`
- Graceful fallback on syntax errors

### Large Files (>500 lines)

- Only 5 files exceed 500 lines (out of 53 total)
- Most modules are focused, single-purpose
