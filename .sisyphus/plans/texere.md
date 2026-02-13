# Texere V1 — Knowledge Graph for LLM Coding Agents

> **This plan supersedes ALL prior plans.** The previous `.sisyphus/plans/texere.md` (Session 1) is obsolete and replaced entirely by this document reflecting Sessions 1–5 decisions.

## TL;DR

> **Quick Summary**: Build Texere V1 — a TypeScript knowledge graph library (`packages/graph/`) and MCP server (`apps/mcp/`) backed by SQLite with FTS5 search and recursive CTE traversal. Immutable Datomic-inspired nodes, hard-delete edges, 9 MCP tools. Strict TDD throughout.
>
> **Deliverables**:
> - `packages/graph/` — Core graph library (types, schema, CRUD, FTS5 search, CTE traversal)
> - `apps/mcp/` — MCP server with 9 tools, stdio transport, CLI entry point
> - `skills/texere.md` — LLM Quick Reference Guide for agents using Texere
> - `tooling/typescript-config/` — Shared strict TypeScript configuration
> - `tooling/eslint-config/` — Shared ESLint + oxlint configuration
> - Full monorepo infrastructure: pnpm + turborepo, vitest, prettier, quality gates
>
> **Estimated Effort**: Large (10 tasks, ~3-5 days with parallel execution)
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Tasks 5,6 → Task 7 → Task 8 → Task 10

---

## Context

### Original Request
Build Texere — a TypeScript knowledge graph for LLM coding agents. V1 ships the core graph library + MCP server + skill file. Project must be structured from day 1 to accommodate V2 (ingest packages) and V3 (opencode plugin + orchestrator agent).

### Interview Summary (Sessions 1–5)
**Key Discussions**:
- **Session 1**: Initial architecture exploration, first-pass patterns
- **Session 2**: Deep schema design — FTS5, CTE traversal, performance research, build toolchain
- **Session 3**: Version boundaries finalized, immutable nodes (Datomic-inspired), DEPRECATED_BY edge, tool set locked to 9
- **Session 4**: SQLite benchmarks (better-sqlite3 vs sql.js, CTE depth×density, WAL mode), full draft audit (30 issues found and fixed), edge schema finalized to hard-delete
- **Session 5**: conduit-ai research for strict TS/lint/prettier/oxlint configs, vitest infrastructure, monorepo patterns. User decisions: Turborepo, tsdown, nanoid, @texere/ scope, tooling/ for configs

**Research Findings**:
- **conduit-ai monorepo**: Provides battle-tested templates for shared TS configs, ESLint flat config + oxlint integration, vitest three-tier testing, workspace protocol patterns
- **better-sqlite3 benchmarks**: 6-1000x faster than sql.js, FTS5 BM25 is single-digit ms at 100K docs, recursive CTE depth 3 = <50ms at 100K nodes
- **Performance config**: WAL mode (12-33% faster writes), prepared statement caching (10-30% faster), UNION ALL + DISTINCT for sparse graph traversal

### Metis Review
**Identified Gaps (all addressed)**:
- FTS5 JOIN bug: search query had TEXT↔INTEGER type mismatch — fixed to use implicit `rowid`
- tsup deprecated — replaced with tsdown
- Missing `@types/better-sqlite3` — added to deps
- Missing vitest `ssr.external` for native modules — added to vitest config
- Missing `@repo/source` custom condition — added to tsconfig/vitest
- FTS5 query sanitization — added to search task
- Self-referential edge protection — CHECK constraint added
- Empty `tags_json` default — `'[]'` not NULL

---

## Work Objectives

### Core Objective
Ship a production-quality TypeScript knowledge graph library with MCP server interface, backed by SQLite, enabling any LLM coding agent to store, search, traverse, and manage structured knowledge across sessions.

### Concrete Deliverables
- `packages/graph/` — Importable library: `import { TextereDB } from '@texere/graph'`
- `apps/mcp/` — Standalone MCP server: `npx @texere/mcp` or `bun apps/mcp/dist/index.js`
- `skills/texere.md` — Copy into any agent's skill directory for instant Texere fluency
- Full monorepo with quality gates: `pnpm quality` passes (lint + typecheck + test + build)

### Definition of Done
- [ ] `pnpm quality` passes (lint + typecheck + test + build across all packages)
- [ ] `pnpm test:unit` — all unit tests pass with >70% coverage on `packages/graph/`
- [ ] `pnpm test:integration` — MCP client→server→graph→SQLite round-trip works
- [ ] `pnpm typecheck` — zero type errors across all packages
- [ ] `pnpm lint` — zero lint errors (oxlint + eslint)
- [ ] `pnpm format:check` — all files formatted
- [ ] All 9 MCP tools respond correctly to valid and invalid input
- [ ] `skills/texere.md` contains accurate tool schemas and usage examples

### Must Have
- Immutable, eternal nodes (no update, no delete — only invalidation)
- Hard-delete edges (DELETE row, no soft-delete)
- FTS5 full-text search with BM25 ranking
- Recursive CTE graph traversal (max depth 5)
- DEPRECATED_BY edge auto-invalidates source node
- Strict TypeScript (all safety flags)
- oxlint + ESLint dual linting
- Vitest with TDD (Red → Green → Refactor)
- V2/V3-ready monorepo structure

### Must NOT Have (Guardrails)
- **No `texere_update_node`** — nodes are immutable. Changes via deprecation pattern.
- **No `texere_delete_node`** — nodes are eternal. Only `invalidate_node`.
- **No bi-temporal on edges** — edges use hard-delete, no `invalidated_at`/`valid_from`/`valid_until`
- **No cycle detection via path tracking** — use UNION ALL + depth limit + DISTINCT only
- **No bulk/batch operations** — single-item CRUD only in V1
- **No application-level fuzzy matching** — FTS5 handles search
- **No schema migration tooling** — V1 is fresh schema, no migrations needed
- **No more than 9 MCP tools** — exactly the 9 specified
- **No analytics, dashboards, or reporting** — just the core graph
- **No Bun-specific APIs** — standard ESM, Bun is runtime only
- **No test stubs that pass without implementation** — tests MUST fail before code exists

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks are verifiable WITHOUT any human action. Every criterion is a command or assertion the executing agent runs directly.

### Test Decision
- **Infrastructure exists**: NO (greenfield — must be set up)
- **Automated tests**: YES — strict TDD (Red → Green → Refactor)
- **Framework**: Vitest 4.x with v8 coverage provider
- **Test tiers**: Unit (`.test.ts`) + Integration (`.integration.test.ts`)
- **Organization**: Co-located with source in `src/` (not separate `__tests__/`)
- **Coverage target**: >70% line coverage on `packages/graph/`

### TDD Discipline (CRITICAL — User Mandate)

> "NEVER any tests added to non implemented code, tests MUST NEVER pass if the code is not implemented"

Every code task follows this EXACT cycle:
1. **RED**: Write test that imports from the module-to-be-implemented. Run test. It MUST fail (import error or assertion failure — NOT a pass).
2. **GREEN**: Write minimum implementation to make the test pass. Run test. It MUST pass.
3. **REFACTOR**: Clean up while keeping tests green.
4. **Repeat**: Next test for next behavior.

**Enforcement**: Each task's acceptance criteria includes verification that tests fail before implementation exists.

### Agent-Executed QA (ALL tasks)

Every task includes QA scenarios using:
- **Bash**: `pnpm test:unit`, `pnpm typecheck`, `pnpm lint`, `pnpm build`
- **Bash**: Direct Node.js/Bun REPL for import verification
- **Bash**: SQLite CLI for schema verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Monorepo Foundation [no dependencies]

Wave 2 (After Wave 1):
├── Task 2: Graph Library — Schema + DB Layer [depends: 1]
└── Task 9: Skill File (skills/texere.md) [depends: 1]

Wave 3 (After Task 2):
├── Task 3: Graph Library — Node CRUD [depends: 2]
└── Task 4: Graph Library — Edge CRUD [depends: 2]
    (Note: Task 4 uses node creation from Task 3 in tests,
     but can start edge schema/types while Task 3 finishes.
     Practical dependency: Task 3 should complete first.)

Wave 3b (After Tasks 3+4):
├── Task 5: Graph Library — FTS5 Search [depends: 3, 4]
└── Task 6: Graph Library — CTE Traversal [depends: 3, 4]

Wave 4 (After Tasks 5+6):
├── Task 7: Graph Library — Public API [depends: 5, 6]

Wave 5 (After Task 7):
└── Task 8: MCP Server [depends: 7]

Wave 6 (After Tasks 8+9):
└── Task 10: Integration Tests + Quality Gate [depends: 8, 9]

Critical Path: 1 → 2 → 3 → 4 → 5 → 7 → 8 → 10
Parallel Speedup: Task 9 runs alongside Wave 2-5. Tasks 5,6 parallelize.
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 9 | None (first) |
| 2 | 1 | 3, 4 | 9 |
| 3 | 2 | 5, 6 | 9 |
| 4 | 2 (+ 3 practically) | 5, 6 | 9 |
| 5 | 3, 4 | 7 | 6, 9 |
| 6 | 3, 4 | 7 | 5, 9 |
| 7 | 5, 6 | 8 | 9 |
| 8 | 7 | 10 | 9 |
| 9 | 1 | 10 | 2-8 |
| 10 | 8, 9 | None (final) | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `task(category="unspecified-high", load_skills=[], ...)` |
| 2 | 2, 9 | Dispatch parallel: 2=`deep`, 9=`writing` |
| 3 | 3, then 4 | Sequential: both `deep` |
| 3b | 5, 6 | Dispatch parallel: both `deep` |
| 4 | 7 | `unspecified-low` |
| 5 | 8 | `deep` |
| 6 | 10 | `unspecified-high` |

---

## Architecture Reference

### Monorepo Structure (V1 ships, V2/V3 ready)

```
texere/
├── packages/
│   └── graph/                    ← V1: Core graph library
│       ├── src/
│       │   ├── index.ts          ← Public API barrel
│       │   ├── db.ts             ← Database initialization + PRAGMA
│       │   ├── schema.ts         ← DDL statements
│       │   ├── types.ts          ← TypeScript types + enums
│       │   ├── nodes.ts          ← Node CRUD operations
│       │   ├── edges.ts          ← Edge CRUD operations
│       │   ├── search.ts         ← FTS5 search
│       │   ├── traverse.ts       ← Recursive CTE traversal
│       │   ├── sanitize.ts       ← FTS5 query sanitizer
│       │   ├── nodes.test.ts     ← Co-located tests
│       │   ├── edges.test.ts
│       │   ├── search.test.ts
│       │   ├── traverse.test.ts
│       │   └── db.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.base.json
│       ├── tsconfig.lib.json
│       ├── vitest.config.ts
│       └── vitest.unit.config.ts
├── apps/
│   └── mcp/                      ← V1: MCP server application
│       ├── src/
│       │   ├── index.ts          ← CLI entry + stdio transport
│       │   ├── server.ts         ← MCP server setup
│       │   ├── tools/            ← Tool handler modules
│       │   │   ├── store-node.ts
│       │   │   ├── get-node.ts
│       │   │   ├── invalidate-node.ts
│       │   │   ├── create-edge.ts
│       │   │   ├── delete-edge.ts
│       │   │   ├── search.ts
│       │   │   ├── traverse.ts
│       │   │   ├── about.ts
│       │   │   └── stats.ts
│       │   └── tools.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.base.json
│       ├── tsconfig.lib.json
│       ├── tsdown.config.ts
│       ├── vitest.config.ts
│       └── vitest.unit.config.ts
├── tooling/
│   ├── typescript-config/        ← Shared TS configs
│   │   ├── base.json
│   │   ├── node-library.json
│   │   └── package.json
│   └── eslint-config/            ← Shared ESLint configs
│       ├── base.js
│       └── package.json
├── skills/
│   └── texere.md                 ← V1: LLM Quick Reference Guide
├── agents/                       ← V3: (empty, ready)
├── package.json                  ← Root workspace
├── pnpm-workspace.yaml
├── turbo.json
├── eslint.config.mjs
├── prettier.config.mjs
├── .oxlintrc.json
├── .prettierignore
├── .gitignore
└── vitest.workspace.ts
```

### SQL Schema (Authoritative — from `.sisyphus/drafts/kg-redesign.md`)

```sql
-- Nodes: immutable, eternal, Datomic-inspired
CREATE TABLE nodes (
  id             TEXT PRIMARY KEY,       -- nanoid, 21 chars
  type           TEXT NOT NULL,          -- one of 17 semantic types
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  tags_json      TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
  importance     REAL NOT NULL DEFAULT 0.5,
  confidence     REAL NOT NULL DEFAULT 0.8,
  created_at     INTEGER NOT NULL,       -- unix ms UTC
  invalidated_at INTEGER,                -- NULL = current, non-NULL = invalidated
  embedding      BLOB                    -- unpopulated in V1, ready for V1.5
);

-- Edges: hard-delete (wrong edges are DELETEd, not soft-deleted)
CREATE TABLE edges (
  id         TEXT PRIMARY KEY,           -- nanoid, 21 chars
  source_id  TEXT NOT NULL REFERENCES nodes(id),
  target_id  TEXT NOT NULL REFERENCES nodes(id),
  type       TEXT NOT NULL,              -- one of 14 semantic types
  strength   REAL NOT NULL DEFAULT 0.5,
  confidence REAL NOT NULL DEFAULT 0.8,
  created_at INTEGER NOT NULL,           -- unix ms UTC
  CHECK (source_id != target_id)         -- no self-referential edges
);

-- Tags: denormalized for fast lookup, trigger-synced
CREATE TABLE node_tags (
  node_id TEXT NOT NULL REFERENCES nodes(id),
  tag     TEXT NOT NULL,
  PRIMARY KEY (node_id, tag)
);

-- FTS5: contentless, trigger-synced (INSERT + DELETE only — nodes are immutable)
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  title, content, tags,
  content='',
  tokenize='unicode61'
);

-- Node indexes: partial (only current nodes)
CREATE INDEX idx_nodes_type ON nodes(type) WHERE invalidated_at IS NULL;
CREATE INDEX idx_nodes_created ON nodes(created_at) WHERE invalidated_at IS NULL;

-- Edge indexes: covering composites (all rows are current — hard-deleted when wrong)
CREATE INDEX idx_edges_source ON edges(source_id, target_id);
CREATE INDEX idx_edges_target ON edges(target_id, source_id);
CREATE INDEX idx_edges_source_type ON edges(source_id, type);
CREATE INDEX idx_edges_target_type ON edges(target_id, type);

-- Tag index
CREATE INDEX idx_tags_tag ON node_tags(tag);
```

### PRAGMA Config

```typescript
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');       // 64MB
db.pragma('mmap_size = 268435456');     // 256MB
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');
db.pragma('wal_autocheckpoint = 1000');
```

### Node Types (17)
`task`, `code_pattern`, `problem`, `solution`, `project`, `technology`, `error`, `fix`, `command`, `file_context`, `workflow`, `general`, `conversation`, `decision`, `requirement`, `constraint`, `research`

### Edge Types (14)
`RELATED_TO`, `CAUSES`, `SOLVES`, `REQUIRES`, `CONTRADICTS`, `BUILDS_ON`, `DEPRECATED_BY`, `PREVENTS`, `VALIDATES`, `ALTERNATIVE_TO`, `MOTIVATED_BY`, `IMPLEMENTS`, `CONSTRAINS`, `ANCHORED_TO`

### MCP Tools (9)
| # | Tool | Purpose |
|---|------|---------|
| 1 | `texere_store_node` | Create immutable node. Auto-creates ANCHORED_TO edges for `anchor_to: string[]`. |
| 2 | `texere_get_node` | Read node by ID. Optional `include_edges: true`. |
| 3 | `texere_invalidate_node` | Set `invalidated_at=now`. "Just wrong, no replacement." |
| 4 | `texere_create_edge` | Link two nodes. DEPRECATED_BY type auto-sets `invalidated_at` on source node. |
| 5 | `texere_delete_edge` | Hard-delete edge row. `DELETE FROM edges WHERE id = ?`. |
| 6 | `texere_search` | FTS5 + BM25 + filters (type, tag, importance, limit). |
| 7 | `texere_traverse` | Recursive CTE. Direction: outgoing/incoming/both. Max depth 5. |
| 8 | `texere_about` | Compound: FTS5 search finds seeds → traverse neighbors. |
| 9 | `texere_stats` | Node/edge counts by type. Quick health check. |

---

## TODOs

### — [ ] 1. Monorepo Foundation + Quality Tooling

  **What to do**:
  - Initialize pnpm workspace with `packages/*`, `apps/*`, `tooling/*` directories
  - Create root `package.json` with devDependencies: typescript, eslint, oxlint, prettier, vitest, turbo, eslint-plugin-oxlint, prettier-plugin-packagejson
  - Create `pnpm-workspace.yaml` with workspace paths
  - Create `turbo.json` with build pipeline (build depends on ^build, typecheck, lint, test:unit, test:integration)
  - Create `tooling/typescript-config/` package:
    - `base.json`: strict mode — `target: "ES2023"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, `useUnknownInCatchVariables: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`, `noEmitOnError: true`, `sourceMap: true`, `skipLibCheck: true`, `customConditions: ["@texere/source"]`
    - `node-library.json`: extends base, adds `composite: true`, `declaration: true`, `declarationMap: true`
    - `package.json` with `"name": "@texere/typescript-config"` and exports
  - Create `tooling/eslint-config/` package:
    - `base.js`: ESLint flat config with typescript-eslint recommended + type-checked, import ordering, no default exports, filename convention (kebab-case), explicit return types, eslint-plugin-oxlint integration
    - `package.json` with `"name": "@texere/eslint-config"` and exports
  - Create root `eslint.config.mjs` importing from `@texere/eslint-config/base`
  - Create root `.oxlintrc.json`: `correctness: "error"`, `suspicious: "warn"`, `style: "off"`, `nursery: "off"`, with test file overrides
  - Create root `prettier.config.mjs`: `printWidth: 100`, `semi: true`, `singleQuote: true`, `trailingComma: "all"`, `endOfLine: "lf"`, plugin `prettier-plugin-packagejson`
  - Create root `.prettierignore`: node_modules, dist, coverage, pnpm-lock.yaml, .turbo, *.db
  - Create root `vitest.workspace.ts` pointing to all packages
  - Create root `.gitignore`: node_modules, dist, coverage, .turbo, *.db, .texere/
  - Create root `tsconfig.json` with project references (empty for now, filled as packages are added)
  - Root package.json scripts:
    - `"lint": "oxlint && turbo lint"` (oxlint first — fast, catches obvious issues)
    - `"lint:fix": "turbo lint -- --fix && oxlint --fix"`
    - `"format": "prettier . --write --cache"`
    - `"format:check": "prettier . --check --cache"`
    - `"typecheck": "turbo check-types"`
    - `"test:unit": "turbo test:unit"`
    - `"test:integration": "turbo test:integration"`
    - `"build": "turbo build"`
    - `"quality": "pnpm format:check && turbo lint check-types test:unit build"`
  - Run `pnpm install` and verify workspace resolves
  - Run `pnpm format:check` (should succeed with no source files)
  - Run `pnpm typecheck` (should succeed with no packages yet)

  **Must NOT do**:
  - Do NOT install Nx or any Nx plugins
  - Do NOT create source code files (only config/infrastructure)
  - Do NOT add any Bun-specific config
  - Do NOT add test files yet (no code to test)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Infrastructure task requiring careful config file creation across many files. Not visual, not algorithmic — just thorough file creation.
  - **Skills**: `[]`
    - No specialized skills needed — pure file creation + package management
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI in this task
    - `playwright`: No browser interaction

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (alone)
  - **Blocks**: Tasks 2, 9
  - **Blocked By**: None (start immediately)

  **References**:

  **Pattern References** (existing configs to replicate):
  - `~/conduit-ai/tsconfig.base.json` — Root TypeScript strict settings (ES2023, all safety flags, verbatimModuleSyntax)
  - `~/conduit-ai/libs/typescript-config/base.json` — Shared TS config package pattern
  - `~/conduit-ai/libs/typescript-config/node-library.json` — Node library config (composite, declaration)
  - `~/conduit-ai/libs/eslint-config/base.js` — Shared ESLint flat config with typescript-eslint, import ordering, filename conventions, oxlint plugin
  - `~/conduit-ai/libs/eslint-config/package.json` — ESLint config package exports pattern
  - `~/conduit-ai/eslint.config.mjs` — Root ESLint config extending shared base
  - `~/conduit-ai/.oxlintrc.json` — Oxlint config (correctness=error, suspicious=warn, style=off)
  - `~/conduit-ai/prettier.config.mjs` — Prettier config (printWidth 100, singleQuote, trailingComma all)
  - `~/conduit-ai/.prettierignore` — Prettier ignore patterns
  - `~/conduit-ai/pnpm-workspace.yaml` — Workspace definition pattern
  - `~/conduit-ai/package.json` — Root scripts pattern (lint, format, typecheck, test, quality)
  - `~/conduit-ai/vitest.workspace.ts` — Vitest workspace definition

  **Documentation References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 1688-1710 — V1 scope (monorepo structure, pnpm + turborepo)

  **External References**:
  - Turborepo docs: https://turbo.build/repo/docs — turbo.json pipeline config
  - ESLint flat config: https://eslint.org/docs/latest/use/configure/configuration-files — eslint.config.mjs format
  - Oxlint config: https://oxc-project.github.io/docs/guide/usage/linter/config-file-reference.html — .oxlintrc.json schema
  - eslint-plugin-oxlint: https://github.com/oxc-project/eslint-plugin-oxlint — Disables ESLint rules already covered by oxlint

  **Acceptance Criteria**:

  - [ ] `pnpm install` succeeds with no errors
  - [ ] `pnpm format:check` exits 0
  - [ ] `pnpm typecheck` exits 0 (no packages to check yet — should not error)
  - [ ] `pnpm lint` exits 0 (no source files yet — should not error)
  - [ ] `ls packages/ apps/ tooling/ skills/ agents/` — all directories exist
  - [ ] `cat tooling/typescript-config/base.json | grep '"strict": true'` — strict mode enabled
  - [ ] `cat tooling/typescript-config/base.json | grep '"noUncheckedIndexedAccess": true'` — safety flag
  - [ ] `cat tooling/typescript-config/base.json | grep '"exactOptionalPropertyTypes": true'` — safety flag
  - [ ] `cat tooling/typescript-config/base.json | grep '"verbatimModuleSyntax": true'` — ESM enforcement
  - [ ] `cat .oxlintrc.json | grep '"correctness"'` — oxlint config exists
  - [ ] `cat prettier.config.mjs | grep 'singleQuote'` — prettier config exists
  - [ ] `cat turbo.json | grep '"build"'` — turbo pipeline exists
  - [ ] `cat pnpm-workspace.yaml` — workspace definition exists with packages/*, apps/*, tooling/*

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Workspace packages resolve correctly
    Tool: Bash
    Preconditions: pnpm install completed
    Steps:
      1. Run: pnpm ls --depth 0
      2. Assert: output lists @texere/typescript-config
      3. Assert: output lists @texere/eslint-config
    Expected Result: Both tooling packages visible in workspace
    Evidence: Terminal output captured

  Scenario: Quality gate runs without error on empty workspace
    Tool: Bash
    Preconditions: All configs created, pnpm install completed
    Steps:
      1. Run: pnpm format:check
      2. Assert: exit code 0
      3. Run: pnpm typecheck
      4. Assert: exit code 0
    Expected Result: Quality scripts work even with no source code
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(infra): initialize monorepo with pnpm, turbo, strict TS, eslint+oxlint, prettier, vitest`
  - Files: All root configs, tooling/*, pnpm-workspace.yaml, turbo.json, package.json
  - Pre-commit: `pnpm format:check`

---

### — [ ] 2. Graph Library — Schema + Database Layer

  **What to do**:
  - Create `packages/graph/` package structure:
    - `package.json`: name `@texere/graph`, dependencies: `better-sqlite3`, `nanoid`; devDependencies: `@types/better-sqlite3`, `@texere/typescript-config`, `@texere/eslint-config`, `vitest`
    - `tsconfig.json` with project references
    - `tsconfig.base.json` extending `@texere/typescript-config/node-library.json`
    - `tsconfig.lib.json` for build (outDir: dist, exclude tests)
    - `vitest.config.ts` with `ssr: { external: ['better-sqlite3'] }` and `@texere/source` custom condition
    - `vitest.unit.config.ts` extending base (include `*.test.ts`, exclude `*.integration.test.ts`)
    - `eslint.config.mjs` extending `@texere/eslint-config/base`
    - Package scripts: `build`, `check-types`, `lint`, `test:unit`, `test:unit:dev`, `test:integration`
    - Dual exports pattern: `@texere/source` → `./src/index.ts`, `import` → `./dist/index.js`
  - Update root `tsconfig.json` to add project reference to `packages/graph`
  - **TDD — `src/types.ts`**:
    - RED: Write `src/types.test.ts` testing that NodeType enum has 17 values and EdgeType enum has 14 values. Run → FAIL (module doesn't exist).
    - GREEN: Create `src/types.ts` with `NodeType` enum (17 values), `EdgeType` enum (14 values), `Node` interface, `Edge` interface, `NodeTag` interface, `SearchOptions` interface, `TraverseOptions` interface. Run → PASS.
  - **TDD — `src/schema.ts`**:
    - RED: Write `src/db.test.ts` testing that `createDatabase(':memory:')` returns a DB where `PRAGMA journal_mode` = `wal` (in-memory won't be WAL — test PRAGMA foreign_keys = 1 instead), nodes table exists, edges table exists, FTS5 table exists.
    - GREEN: Create `src/schema.ts` with all DDL from the Architecture Reference above (nodes, edges, node_tags, nodes_fts, all indexes, triggers for FTS5 sync, triggers for tag sync). Create `src/db.ts` with `createDatabase(path: string)` that opens better-sqlite3, applies PRAGMAs, runs schema DDL, returns db instance. Run → PASS.
  - **FTS5 Triggers** (in schema.ts):
    - INSERT trigger: on nodes INSERT → INSERT INTO nodes_fts(rowid, title, content, tags) VALUES (new.rowid, new.title, new.content, new.tags_json)
    - DELETE trigger: on nodes DELETE → INSERT INTO nodes_fts(nodes_fts, rowid, title, content, tags) VALUES('delete', old.rowid, old.title, old.content, old.tags_json)
    - No UPDATE trigger (nodes are immutable)
  - **Tag Sync Triggers** (in schema.ts):
    - INSERT trigger: on nodes INSERT → parse tags_json → INSERT INTO node_tags
    - No UPDATE/DELETE triggers (nodes are immutable/eternal)
  - **TDD — Tag sync**:
    - RED: Test that inserting a node with `tags_json: '["foo","bar"]'` creates 2 rows in `node_tags`. Run → FAIL.
    - GREEN: Tag sync trigger handles it. Run → PASS.
  - **TDD — PRAGMA verification**:
    - RED: Test that after `createDatabase`, `db.pragma('foreign_keys')` returns `[{foreign_keys: 1}]` (or equivalent). Test `cache_size` returns expected value.
    - GREEN: PRAGMAs are applied in `createDatabase`. Run → PASS.

  **Must NOT do**:
  - Do NOT add node/edge CRUD functions yet (that's Tasks 3-4)
  - Do NOT use `sql.js` — only `better-sqlite3`
  - Do NOT add `updated_at` to nodes or `invalidated_at` to edges
  - Do NOT create migration files
  - Do NOT add a `summary` column to nodes

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Database schema and SQLite configuration require deep understanding of FTS5 triggers, contentless tables, PRAGMA behavior, and better-sqlite3 API. Must get DDL exactly right.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction
    - `frontend-ui-ux`: No UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9)
  - **Parallel Group**: Wave 2 (with Task 9)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `~/conduit-ai/libs/provider-registry/package.json` — Package structure with workspace:* deps, dual exports, scripts
  - `~/conduit-ai/libs/provider-registry/tsconfig.json` — Project references pattern
  - `~/conduit-ai/libs/provider-registry/tsconfig.base.json` — Extends shared config
  - `~/conduit-ai/libs/provider-registry/tsconfig.lib.json` — Build config (outDir, exclude tests)
  - `~/conduit-ai/libs/provider-registry/vitest.config.ts` — Base vitest config with custom conditions
  - `~/conduit-ai/libs/provider-registry/vitest.unit.config.ts` — Unit tier config

  **API/Type References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 720-774 — Node schema (10 columns, exact types, defaults)
  - `.sisyphus/drafts/kg-redesign.md` lines 818-835 — Edge schema (7 columns, hard-delete)
  - `.sisyphus/drafts/kg-redesign.md` lines 1150-1196 — Index strategy (partial for nodes, covering for edges)
  - `.sisyphus/drafts/kg-redesign.md` lines 940-970 — PRAGMA config
  - `.sisyphus/drafts/kg-redesign.md` lines 1030-1060 — FTS5 contentless setup
  - `.sisyphus/drafts/kg-redesign.md` lines 1504-1540 — Tag sync triggers

  **External References**:
  - better-sqlite3 API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
  - FTS5 contentless tables: https://www.sqlite.org/fts5.html#contentless_tables
  - nanoid: https://github.com/ai/nanoid

  **Acceptance Criteria**:

  - [ ] `pnpm --filter @texere/graph typecheck` exits 0
  - [ ] `pnpm --filter @texere/graph test:unit` — all tests pass
  - [ ] Test: `createDatabase(':memory:')` returns a db instance without throwing
  - [ ] Test: `db.pragma('foreign_keys')` returns `[{ foreign_keys: 1 }]`
  - [ ] Test: `SELECT name FROM sqlite_master WHERE type='table'` includes `nodes`, `edges`, `node_tags`
  - [ ] Test: `SELECT name FROM sqlite_master WHERE type='table'` includes `nodes_fts`
  - [ ] Test: Node with `tags_json='["a","b"]'` creates 2 rows in `node_tags`
  - [ ] Test: Node with `tags_json='[]'` creates 0 rows in `node_tags`
  - [ ] Test: `NodeType` enum has exactly 17 values
  - [ ] Test: `EdgeType` enum has exactly 14 values
  - [ ] Tests FAIL when run before implementation files exist (TDD RED verified)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Package builds and typechecks independently
    Tool: Bash
    Preconditions: Task 1 complete, pnpm install
    Steps:
      1. Run: pnpm --filter @texere/graph typecheck
      2. Assert: exit code 0
      3. Run: pnpm --filter @texere/graph build
      4. Assert: exit code 0
      5. Assert: packages/graph/dist/index.js exists
      6. Assert: packages/graph/dist/index.d.ts exists
    Expected Result: Package compiles and emits JS + declarations
    Evidence: Terminal output captured

  Scenario: Database schema creates all tables and indexes
    Tool: Bash
    Preconditions: @texere/graph package built
    Steps:
      1. Run: pnpm --filter @texere/graph test:unit -- --reporter=verbose
      2. Assert: all tests pass
      3. Assert: output includes "nodes table exists"
      4. Assert: output includes "FTS5 table exists"
      5. Assert: output includes "tag sync"
    Expected Result: Full schema verified via tests
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(graph): add schema, database layer, types, and FTS5/tag triggers`
  - Files: packages/graph/**
  - Pre-commit: `pnpm --filter @texere/graph typecheck && pnpm --filter @texere/graph test:unit`

---

### — [ ] 3. Graph Library — Node CRUD

  **What to do**:
  - **TDD — `src/nodes.ts`**:
    - RED: Write `src/nodes.test.ts`:
      - Test `storeNode({ type: 'decision', title: 'Use SQLite', content: 'Because...', tags: ['db', 'sqlite'] })` returns a node with nanoid ID, created_at set, invalidated_at null
      - Test returned node has all fields correctly typed
      - Test `getNode(id)` returns the stored node
      - Test `getNode('nonexistent')` returns null (not throws)
      - Test `getNode(id, { includeEdges: true })` returns node with empty edges array
      - Test `invalidateNode(id)` sets `invalidated_at` to a non-null integer
      - Test `invalidateNode(id)` on already-invalidated node is idempotent (doesn't throw)
      - Test `invalidateNode('nonexistent')` throws (node doesn't exist)
      - Test `storeNode` with `anchor_to: ['/path/to/file.ts']` auto-creates ANCHORED_TO edge
    - GREEN: Implement `src/nodes.ts` with `storeNode`, `getNode`, `invalidateNode`. Use prepared statements cached at class/module level. Use `nanoid()` for ID generation. Use `BEGIN IMMEDIATE` for write transactions. Run → PASS.
    - REFACTOR: Clean up, ensure prepared statements are reusable.
  - **TDD — FTS5 integration verification**:
    - RED: Test that after `storeNode`, searching FTS5 for the title returns a rowid. Test that after `invalidateNode`, the node is still in FTS5 (nodes are eternal — FTS5 row stays, but queries filter by invalidated_at).
    - GREEN: Already handled by triggers from Task 2. Run → PASS.
  - **TDD — Tag sync verification**:
    - RED: Test that `storeNode` with `tags: ['a', 'b', 'c']` creates 3 rows in `node_tags`. Test with empty tags creates 0 rows.
    - GREEN: Already handled by triggers from Task 2. Run → PASS.

  **Must NOT do**:
  - Do NOT add `updateNode` — nodes are immutable
  - Do NOT add `deleteNode` — nodes are eternal
  - Do NOT modify the schema from Task 2
  - Do NOT add bulk operations (no `storeNodes`)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core CRUD with transaction semantics, prepared statements, nanoid integration, auto-anchor edges. Must follow TDD strictly.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `~/conduit-ai/libs/conduit-auth/src/index.test.ts` — TDD test patterns (beforeEach/afterEach, temp directory, mock cleanup)
  - `~/conduit-ai/libs/provider-registry/src/provider/registry.test.ts` — Unit test structure (describe blocks, expect assertions)

  **API/Type References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 1483-1503 — Tool specifications (store_node, get_node, invalidate_node)
  - `.sisyphus/drafts/kg-redesign.md` lines 1495-1500 — Two invalidation paths
  - `.sisyphus/drafts/kg-redesign.md` lines 1198-1210 — Prepared statement caching pattern

  **External References**:
  - better-sqlite3 transactions: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function
  - nanoid: `import { nanoid } from 'nanoid'`

  **Acceptance Criteria**:

  - [ ] `pnpm --filter @texere/graph test:unit` — all node tests pass
  - [ ] Test: storeNode returns node with nanoid ID (21 chars, URL-safe)
  - [ ] Test: storeNode sets created_at to current unix ms
  - [ ] Test: getNode returns exact same node
  - [ ] Test: getNode('nonexistent') returns null
  - [ ] Test: invalidateNode sets invalidated_at
  - [ ] Test: invalidateNode on already-invalidated is idempotent
  - [ ] Test: invalidateNode('nonexistent') throws
  - [ ] Test: storeNode with anchor_to creates ANCHORED_TO edge(s)
  - [ ] Test: FTS5 contains the node after storeNode (verified via raw SQL)
  - [ ] Test: node_tags populated after storeNode with tags
  - [ ] Tests FAIL when nodes.ts doesn't exist yet (TDD RED verified)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full node lifecycle
    Tool: Bash
    Preconditions: Task 2 complete, DB layer working
    Steps:
      1. Run: pnpm --filter @texere/graph test:unit -- --grep "storeNode" --reporter=verbose
      2. Assert: all storeNode tests pass
      3. Run: pnpm --filter @texere/graph test:unit -- --grep "getNode" --reporter=verbose
      4. Assert: all getNode tests pass
      5. Run: pnpm --filter @texere/graph test:unit -- --grep "invalidateNode" --reporter=verbose
      6. Assert: all invalidateNode tests pass
    Expected Result: Complete node CRUD verified
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(graph): add node CRUD — store, get, invalidate with tag sync and auto-anchor`
  - Files: packages/graph/src/nodes.ts, packages/graph/src/nodes.test.ts
  - Pre-commit: `pnpm --filter @texere/graph test:unit`

---

### — [ ] 4. Graph Library — Edge CRUD

  **What to do**:
  - **TDD — `src/edges.ts`**:
    - RED: Write `src/edges.test.ts`:
      - Test `createEdge({ source_id, target_id, type: 'SOLVES' })` returns edge with nanoid ID
      - Test edge `created_at` is set automatically
      - Test `createEdge` with nonexistent `source_id` throws (FK constraint)
      - Test `createEdge` with nonexistent `target_id` throws (FK constraint)
      - Test `createEdge` with `source_id === target_id` throws (CHECK constraint)
      - Test `createEdge` with type `DEPRECATED_BY` auto-sets source node's `invalidated_at`
      - Test `createEdge` DEPRECATED_BY on already-invalidated node still succeeds (idempotent)
      - Test `deleteEdge(id)` removes the edge row entirely
      - Test `deleteEdge('nonexistent')` throws or returns false (edge doesn't exist)
      - Test `getEdgesForNode(node_id, 'outgoing')` returns outgoing edges
      - Test `getEdgesForNode(node_id, 'incoming')` returns incoming edges
      - Test `getEdgesForNode(node_id, 'both')` returns all edges
    - GREEN: Implement `src/edges.ts` with `createEdge`, `deleteEdge`, `getEdgesForNode`. DEPRECATED_BY creates edge + updates source node in single transaction (`BEGIN IMMEDIATE`). Run → PASS.

  **Must NOT do**:
  - Do NOT add `invalidateEdge` or soft-delete — edges use hard-delete only
  - Do NOT add `updateEdge` — create new, delete old
  - Do NOT add bi-temporal fields (valid_from, valid_until, recorded_at)
  - Do NOT add `context` field to edges

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Transaction semantics for DEPRECATED_BY compound operation, FK/CHECK constraint validation, direction-aware queries
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs node operations from Task 3 for test setup)
  - **Parallel Group**: Wave 3 (after Task 3)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 3

  **References**:

  **API/Type References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 818-835 — Edge schema (7 columns, hard-delete, no bi-temporal)
  - `.sisyphus/drafts/kg-redesign.md` lines 856-870 — Edge lifecycle (CREATE → DELETE → REPLACE)
  - `.sisyphus/drafts/kg-redesign.md` lines 1483-1503 — Tool specs (create_edge, delete_edge)
  - `.sisyphus/drafts/kg-redesign.md` lines 960-970 — Transaction pattern for DEPRECATED_BY

  **Acceptance Criteria**:

  - [ ] `pnpm --filter @texere/graph test:unit` — all edge tests pass
  - [ ] Test: createEdge returns edge with nanoid ID
  - [ ] Test: createEdge with invalid source_id throws
  - [ ] Test: createEdge with invalid target_id throws
  - [ ] Test: createEdge with source_id === target_id throws (CHECK constraint)
  - [ ] Test: DEPRECATED_BY auto-invalidates source node (invalidated_at non-null after edge creation)
  - [ ] Test: DEPRECATED_BY on already-invalidated node succeeds
  - [ ] Test: deleteEdge removes the row (`SELECT count(*) FROM edges WHERE id = ?` returns 0)
  - [ ] Test: getEdgesForNode with direction filtering works
  - [ ] Tests FAIL when edges.ts doesn't exist yet (TDD RED verified)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: DEPRECATED_BY atomicity
    Tool: Bash
    Preconditions: Node CRUD working from Task 3
    Steps:
      1. Run: pnpm --filter @texere/graph test:unit -- --grep "DEPRECATED_BY" --reporter=verbose
      2. Assert: all DEPRECATED_BY tests pass
      3. Specifically verify: source node invalidated_at is non-null after edge creation
    Expected Result: Compound operation is atomic
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(graph): add edge CRUD — create with DEPRECATED_BY auto-invalidation, delete, direction queries`
  - Files: packages/graph/src/edges.ts, packages/graph/src/edges.test.ts
  - Pre-commit: `pnpm --filter @texere/graph test:unit`

---

### — [ ] 5. Graph Library — FTS5 Search

  **What to do**:
  - **TDD — `src/sanitize.ts`**:
    - RED: Write tests for FTS5 query sanitizer:
      - Test: sanitizes `"` (double quotes) — strips or escapes
      - Test: sanitizes `*` (wildcard) — preserves for prefix search
      - Test: sanitizes `OR`, `AND`, `NOT` operators — escapes as literals when unintended
      - Test: handles empty string → returns empty
      - Test: handles normal text → passes through unchanged
    - GREEN: Implement `src/sanitize.ts` with `sanitizeFtsQuery(input: string): string`. Run → PASS.
  - **TDD — `src/search.ts`**:
    - RED: Write `src/search.test.ts`:
      - Test: `search({ query: 'SQLite' })` returns nodes matching title/content/tags via BM25
      - Test: results are ordered by relevance (most relevant first — BM25 ascending, most negative first)
      - Test: `search({ query: 'SQLite', type: 'decision' })` filters by node type
      - Test: `search({ query: 'SQLite', tags: ['db'] })` filters by tag (via node_tags JOIN)
      - Test: `search({ query: 'SQLite', minImportance: 0.7 })` filters by importance
      - Test: `search({ query: 'SQLite', limit: 5 })` limits results
      - Test: search does NOT return invalidated nodes
      - Test: search with FTS5 special characters (`"test" OR "foo"`) does not throw
      - Test: search on empty database returns empty array
      - Test: BM25 ordering — insert 2 nodes, one with "SQLite database" in title + content, one with "SQLite" only in tags → first ranks higher
    - GREEN: Implement `src/search.ts`. Key: JOIN `nodes n ON n.rowid = nf.rowid` (NOT `n.id = nf.rowid` — type mismatch fix from Metis). Apply `WHERE n.invalidated_at IS NULL` in the JOIN. Use `bm25(nodes_fts, 10.0, 1.0, 3.0)` for column weights (title 10x, content 1x, tags 3x). Run → PASS.

  **Must NOT do**:
  - Do NOT join FTS5 results on `n.id = nf.rowid` (TEXT↔INTEGER type mismatch)
  - Do NOT add application-level fuzzy matching — FTS5 handles search
  - Do NOT add embedding-based search (V1.5+)
  - Do NOT add `texere_update_fts` — triggers handle FTS sync

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: FTS5 BM25 ranking, query sanitization, implicit rowid JOIN, filter composition. Must understand FTS5 query syntax pitfalls.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 3b (with Task 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 4

  **References**:

  **API/Type References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 1030-1070 — FTS5 setup (contentless, BM25 weights, column config)
  - `.sisyphus/drafts/kg-redesign.md` lines 1046-1051 — Search query JOIN (MUST use `n.rowid = nf.rowid`)
  - `.sisyphus/drafts/kg-redesign.md` lines 1060-1070 — BM25 weight config: `bm25(nodes_fts, 10.0, 1.0, 3.0)`

  **External References**:
  - SQLite FTS5: https://www.sqlite.org/fts5.html — BM25, MATCH syntax, special characters
  - FTS5 query syntax pitfalls: `*`, `"`, `OR`, `AND`, `NOT`, `NEAR` are operators

  **Acceptance Criteria**:

  - [ ] `pnpm --filter @texere/graph test:unit` — all search tests pass
  - [ ] Test: search returns BM25-ranked results (title-match ranks higher than tags-only)
  - [ ] Test: invalidated nodes excluded from search results
  - [ ] Test: type/tag/importance filters work
  - [ ] Test: FTS5 special characters don't throw
  - [ ] Test: empty database search returns `[]`
  - [ ] Test: limit parameter works
  - [ ] Tests FAIL before search.ts exists (TDD RED verified)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Search excludes invalidated nodes
    Tool: Bash
    Steps:
      1. Run: pnpm --filter @texere/graph test:unit -- --grep "invalidated" --reporter=verbose
      2. Assert: test "search does NOT return invalidated nodes" passes
    Expected Result: Invalidated nodes filtered in search JOIN
    Evidence: Test output captured

  Scenario: FTS5 special character resilience
    Tool: Bash
    Steps:
      1. Run: pnpm --filter @texere/graph test:unit -- --grep "special characters" --reporter=verbose
      2. Assert: no FTS5 syntax errors thrown
    Expected Result: Query sanitizer protects against injection
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(graph): add FTS5 search with BM25 ranking, query sanitization, and filters`
  - Files: packages/graph/src/search.ts, packages/graph/src/search.test.ts, packages/graph/src/sanitize.ts, packages/graph/src/sanitize.test.ts
  - Pre-commit: `pnpm --filter @texere/graph test:unit`

---

### — [ ] 6. Graph Library — CTE Traversal

  **What to do**:
  - **TDD — `src/traverse.ts`**:
    - RED: Write `src/traverse.test.ts`:
      - Test: `traverse({ startId, direction: 'outgoing', maxDepth: 2 })` returns connected nodes via outgoing edges
      - Test: `traverse({ startId, direction: 'incoming', maxDepth: 2 })` follows incoming edges
      - Test: `traverse({ startId, direction: 'both', maxDepth: 2 })` follows both directions
      - Test: traversal respects `maxDepth` — nodes at depth 3 not returned when maxDepth=2
      - Test: traversal excludes invalidated nodes (even if edges to them exist)
      - Test: traversal from nonexistent node returns empty
      - Test: traversal from node with no edges returns empty
      - Test: traversal handles cycles without infinite loop (UNION ALL + depth limit)
      - Test: traversal with `type` filter only follows edges of specified type
      - Test: default maxDepth is 3 (not 5 — practical default)
      - Test: maxDepth capped at 5 (input validation)
    - GREEN: Implement `src/traverse.ts` with recursive CTE:
      ```sql
      WITH RECURSIVE graph_walk(node_id, depth) AS (
        SELECT target_id, 1 FROM edges WHERE source_id = :start_id
        UNION ALL
        SELECT e.target_id, gw.depth + 1
        FROM graph_walk gw JOIN edges e ON e.source_id = gw.node_id
        WHERE gw.depth < :max_depth
      )
      SELECT DISTINCT n.* FROM nodes n
      JOIN graph_walk gw ON n.id = gw.node_id
      WHERE n.invalidated_at IS NULL
      ORDER BY gw.depth;
      ```
      For `incoming`: swap `source_id`/`target_id`. For `both`: UNION both directions in seed. Run → PASS.
  - **TDD — `about` compound query**:
    - RED: Write tests for `about({ query: 'SQLite' })`:
      - Test: finds seed nodes via FTS5 search, then traverses their neighbors
      - Test: returns both search results and traversal results, deduplicated
      - Test: with no search results, returns empty
    - GREEN: Implement `about` in `src/traverse.ts` (or separate `src/about.ts`). Compose search() + traverse() for each seed node. Deduplicate by node ID. Run → PASS.
  - **TDD — `stats`**:
    - RED: Test `stats()` returns `{ nodes: { total, byType: { decision: N, ... }, invalidated: N }, edges: { total, byType: { SOLVES: N, ... } } }`
    - GREEN: Implement `stats()` with `SELECT type, count(*) FROM nodes GROUP BY type` and similar for edges. Run → PASS.

  **Must NOT do**:
  - Do NOT add cycle detection via `instr()` path tracking — depth limit is sufficient
  - Do NOT exceed max depth of 5
  - Do NOT use `UNION` instead of `UNION ALL` (UNION ALL + DISTINCT is faster for sparse graphs)
  - Do NOT add path information to results (just nodes + depth)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Recursive CTE SQL, direction-aware traversal, compound query composition, cycle handling
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 3b (with Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 4

  **References**:

  **API/Type References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 1111-1143 — Recursive CTE strategies (UNION ALL recommended, UNION as fallback)
  - `.sisyphus/drafts/kg-redesign.md` lines 1095-1110 — CTE performance findings (depth×density matrix)
  - `.sisyphus/drafts/kg-redesign.md` lines 1483-1493 — traverse and about tool specs
  - `.sisyphus/drafts/sqlite-benchmark-research.md` — Comprehensive CTE benchmark data

  **Acceptance Criteria**:

  - [ ] `pnpm --filter @texere/graph test:unit` — all traversal tests pass
  - [ ] Test: outgoing traversal returns correct nodes
  - [ ] Test: incoming traversal returns correct nodes
  - [ ] Test: both-direction traversal works
  - [ ] Test: maxDepth respected
  - [ ] Test: invalidated nodes excluded
  - [ ] Test: cycles handled without hanging
  - [ ] Test: about() combines search + traverse
  - [ ] Test: stats() returns correct counts
  - [ ] Tests FAIL before traverse.ts exists (TDD RED verified)

  **Commit**: YES
  - Message: `feat(graph): add CTE traversal, about compound query, and stats`
  - Files: packages/graph/src/traverse.ts, packages/graph/src/traverse.test.ts
  - Pre-commit: `pnpm --filter @texere/graph test:unit`

---

### — [ ] 7. Graph Library — Public API + Barrel Export

  **What to do**:
  - **TDD — `src/index.ts` (public API)**:
    - RED: Write `src/index.test.ts`:
      - Test: `import { TextereDB } from '@texere/graph'` resolves (via @texere/source condition)
      - Test: `new TextereDB(':memory:')` creates a working database
      - Test: `db.storeNode(...)` / `db.getNode(...)` / `db.invalidateNode(...)` work through the class interface
      - Test: `db.createEdge(...)` / `db.deleteEdge(...)` work through the class interface
      - Test: `db.search(...)` / `db.traverse(...)` / `db.about(...)` / `db.stats()` work through the class interface
      - Test: `db.close()` closes the database cleanly
    - GREEN: Create `src/index.ts` that exports a `TextereDB` class wrapping all operations from nodes.ts, edges.ts, search.ts, traverse.ts. Constructor takes `dbPath: string`, creates database via `createDatabase()`. Expose all operations as methods. Also export types. Run → PASS.
  - Ensure all public types are exported: `Node`, `Edge`, `NodeType`, `EdgeType`, `SearchOptions`, `TraverseOptions`, `SearchResult`, `TraverseResult`, `Stats`
  - Verify `tsconfig.lib.json` produces clean `.d.ts` declarations
  - Run `pnpm --filter @texere/graph build` and verify `dist/` output

  **Must NOT do**:
  - Do NOT export internal utilities (db.ts, schema.ts internals)
  - Do NOT add default exports (ESLint rule: no-default-export)
  - Do NOT change existing module implementations

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Wrapper/barrel task — connects existing modules into clean public API. Low complexity.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (alone)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `~/conduit-ai/libs/provider-registry/package.json` — Dual exports pattern (`@repo/source` + `import`)
  - `~/conduit-ai/libs/provider-registry/src/index.ts` — Barrel export pattern

  **Acceptance Criteria**:

  - [ ] `pnpm --filter @texere/graph build` exits 0
  - [ ] `packages/graph/dist/index.js` exists and is valid ESM
  - [ ] `packages/graph/dist/index.d.ts` exports `TextereDB`, `Node`, `Edge`, `NodeType`, `EdgeType`
  - [ ] Test: `new TextereDB(':memory:')` works
  - [ ] Test: all 9 operations accessible via class methods
  - [ ] Test: `db.close()` works without error

  **Commit**: YES
  - Message: `feat(graph): add TextereDB public API class and barrel exports`
  - Files: packages/graph/src/index.ts, packages/graph/src/index.test.ts
  - Pre-commit: `pnpm --filter @texere/graph typecheck && pnpm --filter @texere/graph test:unit && pnpm --filter @texere/graph build`

---

### — [ ] 8. MCP Server

  **What to do**:
  - Create `apps/mcp/` package structure:
    - `package.json`: name `@texere/mcp`, dependencies: `@texere/graph`, `@modelcontextprotocol/sdk`, `zod`; devDependencies: `@texere/typescript-config`, `@texere/eslint-config`, `tsdown`, `vitest`
    - `tsconfig.json`, `tsconfig.base.json`, `tsconfig.lib.json`
    - `tsdown.config.ts` for bundling (ESM output, single entry, external: better-sqlite3)
    - `vitest.config.ts` and `vitest.unit.config.ts`
    - `eslint.config.mjs`
    - Package scripts: `build`, `check-types`, `lint`, `test:unit`, `dev`
    - `bin` field in package.json pointing to dist entry
  - Update root `tsconfig.json` to add project reference
  - **TDD — `src/server.ts`**:
    - RED: Write `src/tools.test.ts`:
      - Test: MCP server registers exactly 9 tools
      - Test: `texere_store_node` with valid input returns node
      - Test: `texere_store_node` with invalid input (missing title) returns error
      - Test: `texere_get_node` with valid ID returns node
      - Test: `texere_get_node` with nonexistent ID returns appropriate response
      - Test: `texere_invalidate_node` sets invalidated_at
      - Test: `texere_create_edge` with valid input returns edge
      - Test: `texere_create_edge` with DEPRECATED_BY auto-invalidates source
      - Test: `texere_delete_edge` removes edge
      - Test: `texere_search` with query returns results
      - Test: `texere_traverse` from node returns neighbors
      - Test: `texere_about` returns search + traverse results
      - Test: `texere_stats` returns counts
      - Test: each tool has a zod schema for input validation
    - GREEN: Implement:
      - `src/server.ts`: MCP server setup with `@modelcontextprotocol/sdk`, registers 9 tools
      - `src/tools/store-node.ts` through `src/tools/stats.ts`: Individual tool handlers with zod input schemas
      - `src/index.ts`: CLI entry point — parse args (--db-path flag, default `.texere/texere.db`), create TextereDB, create MCP server, connect stdio transport
      - Ensure `--db-path` directory is auto-created if it doesn't exist
    - Run → PASS.
  - Build with tsdown: `pnpm --filter @texere/mcp build`
  - Verify the built artifact works: `echo '{}' | node apps/mcp/dist/index.js --db-path /tmp/test.db`

  **Must NOT do**:
  - Do NOT add more than 9 tools
  - Do NOT add authentication or authorization
  - Do NOT add HTTP transport (stdio only in V1)
  - Do NOT hardcode database path (must be configurable)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: MCP SDK integration, zod schema design for all 9 tools, CLI argument parsing, stdio transport, error formatting. Must understand MCP protocol patterns.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (alone)
  - **Blocks**: Task 10
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `~/conduit-ai/apps/conduit-cli/package.json` — App package structure
  - `~/conduit-ai/apps/conduit-cli/tsconfig.json` — App tsconfig pattern

  **API/Type References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 1483-1503 — All 9 tool specifications
  - `.sisyphus/drafts/kg-redesign.md` lines 1393-1470 — Tool input/output schemas

  **External References**:
  - MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk — Server setup, tool registration, stdio transport
  - tsdown: https://github.com/nicepkg/tsdown — tsup successor, config format
  - zod: https://zod.dev — Input validation schemas

  **Acceptance Criteria**:

  - [ ] `pnpm --filter @texere/mcp typecheck` exits 0
  - [ ] `pnpm --filter @texere/mcp test:unit` — all tool tests pass
  - [ ] `pnpm --filter @texere/mcp build` exits 0 and produces `dist/index.js`
  - [ ] Test: server registers exactly 9 tools (list tool names, assert count)
  - [ ] Test: each tool validates input via zod schema
  - [ ] Test: invalid input returns structured error (not crash)
  - [ ] Test: texere_store_node → texere_get_node round-trip works
  - [ ] Test: texere_search returns results after storing nodes
  - [ ] Tests FAIL before tool implementations exist (TDD RED verified)
  - [ ] Workspace import: `import { TextereDB } from '@texere/graph'` resolves in apps/mcp

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: MCP server starts and accepts stdio
    Tool: Bash
    Preconditions: @texere/mcp built, @texere/graph built
    Steps:
      1. Run: pnpm --filter @texere/mcp build
      2. Assert: apps/mcp/dist/index.js exists
      3. Run: timeout 5 node apps/mcp/dist/index.js --db-path /tmp/texere-test.db < /dev/null || true
      4. Assert: process starts without crash (may timeout waiting for stdio — that's OK)
      5. Assert: /tmp/texere-test.db file was created
    Expected Result: Server boots, creates DB, waits for MCP messages
    Evidence: Terminal output + file existence check

  Scenario: Cross-package import resolution
    Tool: Bash
    Steps:
      1. Run: pnpm --filter @texere/mcp typecheck
      2. Assert: exit code 0 (imports from @texere/graph resolve)
    Expected Result: Workspace imports work
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(mcp): add MCP server with 9 tool handlers, zod schemas, stdio transport`
  - Files: apps/mcp/**
  - Pre-commit: `pnpm --filter @texere/mcp typecheck && pnpm --filter @texere/mcp test:unit`

---

### — [ ] 9. Skill File — LLM Quick Reference Guide

  **What to do**:
  - Create `skills/texere.md` — a comprehensive quick-reference guide for LLM agents that explains:
    - What Texere is and when to use it (vs conversation memory, vs file system)
    - Node type chooser: flowchart or decision tree for picking the right node type
    - Edge type chooser: when to use each edge type with concrete examples
    - Tool usage examples for all 9 tools with realistic parameters
    - Common patterns: "Store a decision", "Record a bug fix", "Link problem to solution", "Replace outdated knowledge", "Search for related work", "Explore knowledge graph"
    - Anti-patterns: don't store transient info, don't create duplicate nodes, don't use wrong edge types
    - Schema reminder: node fields, edge fields, what's required vs optional
  - Keep under 500 lines (LLMs have limited skill file reading budgets)
  - Use concrete examples with realistic data (not placeholder text)

  **Must NOT do**:
  - Do NOT include implementation details (SQL, TypeScript internals)
  - Do NOT include setup/installation instructions (that's for the MCP config)
  - Do NOT exceed 500 lines
  - Do NOT use vague examples ("put something here" — use real scenarios)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation task requiring clear, concise writing optimized for LLM consumption
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (independent of code tasks)
  - **Parallel Group**: Wave 2 (with Task 2), continues through all waves
  - **Blocks**: Task 10 (skill file accuracy verified in integration)
  - **Blocked By**: Task 1 (needs monorepo to exist)

  **References**:

  **API/Type References**:
  - `.sisyphus/drafts/kg-redesign.md` lines 430-520 — Node types with descriptions, edge types with descriptions
  - `.sisyphus/drafts/kg-redesign.md` lines 1483-1503 — Tool specifications
  - `.sisyphus/drafts/kg-redesign.md` lines 1393-1470 — Tool input/output schemas
  - `.sisyphus/drafts/oh-my-opencode-integration.md` — Integration context for opencode agents

  **Acceptance Criteria**:

  - [ ] `skills/texere.md` exists and is <500 lines
  - [ ] Contains all 17 node types with brief descriptions
  - [ ] Contains all 14 edge types with brief descriptions
  - [ ] Contains usage examples for all 9 tools
  - [ ] Contains at least 3 "common pattern" workflows
  - [ ] Contains at least 2 anti-patterns to avoid
  - [ ] No implementation details (SQL, TypeScript) leak into the skill file
  - [ ] No placeholder text — all examples use realistic data

  **Commit**: YES
  - Message: `docs: add skills/texere.md LLM quick reference guide`
  - Files: skills/texere.md
  - Pre-commit: None (markdown only)

---

### — [ ] 10. Integration Tests + Quality Gate

  **What to do**:
  - **Integration test: MCP round-trip** (`apps/mcp/src/server.integration.test.ts`):
    - Test: Create MCP client → connect to server (in-process, not stdio) → call texere_store_node → call texere_get_node → verify round-trip
    - Test: store 3 nodes with edges → call texere_search → verify results
    - Test: store nodes → call texere_traverse → verify graph walk
    - Test: call texere_about → verify combined search + traverse
    - Test: call texere_stats → verify counts match
    - Test: texere_create_edge DEPRECATED_BY → texere_search → old node not in results
    - Test: texere_invalidate_node → texere_get_node → verify invalidated_at set
    - Test: all tools return valid MCP response format
  - **Integration test: package import** (`packages/graph/src/index.integration.test.ts`):
    - Test: `import { TextereDB } from '@texere/graph'` works
    - Test: full workflow: create DB → store nodes → create edges → search → traverse → close
  - **Quality gate verification**:
    - Run `pnpm quality` — must pass: format:check + lint + typecheck + test:unit + build
    - Run `pnpm test:integration` — must pass all integration tests
    - Verify `packages/graph/` has >70% test coverage
    - Run `pnpm lint` — zero errors from both oxlint and eslint
    - Run `pnpm typecheck` — zero errors across all packages
  - **Verify skill file accuracy**: spot-check that tool schemas in `skills/texere.md` match actual MCP tool definitions

  **Must NOT do**:
  - Do NOT add e2e tests (no browser, no external services)
  - Do NOT add performance benchmarks (V1.5)
  - Do NOT change any implementation code (test-only task)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-package integration testing + full quality gate verification. Must understand MCP client/server protocol.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (final gate)
  - **Parallel Group**: Wave 6 (alone, final)
  - **Blocks**: None (last task)
  - **Blocked By**: Tasks 8, 9

  **References**:

  **Pattern References**:
  - `~/conduit-ai/libs/conduit-auth/src/index.test.ts` — Integration test patterns
  - `~/conduit-ai/libs/provider-registry/vitest.integration.config.ts` — Integration tier config

  **External References**:
  - MCP SDK client: https://github.com/modelcontextprotocol/typescript-sdk — Client for testing

  **Acceptance Criteria**:

  - [ ] `pnpm test:integration` — all integration tests pass
  - [ ] `pnpm quality` exits 0 (format + lint + typecheck + test + build)
  - [ ] `pnpm --filter @texere/graph test:unit -- --coverage` shows >70% line coverage
  - [ ] `pnpm lint` — zero errors (both oxlint and eslint)
  - [ ] `pnpm typecheck` — zero errors
  - [ ] `pnpm build` — all packages build successfully
  - [ ] MCP round-trip: store → get → search → traverse works end-to-end
  - [ ] DEPRECATED_BY flow: store → deprecate → search excludes old node
  - [ ] Skill file tool names match actual MCP tool registrations

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full quality gate
    Tool: Bash
    Preconditions: All prior tasks complete
    Steps:
      1. Run: pnpm quality
      2. Assert: exit code 0
      3. Run: pnpm test:integration
      4. Assert: exit code 0
      5. Run: pnpm --filter @texere/graph test:unit -- --coverage
      6. Assert: line coverage >70%
    Expected Result: All quality gates pass
    Evidence: Terminal output captured

  Scenario: MCP end-to-end round-trip
    Tool: Bash
    Steps:
      1. Run: pnpm test:integration -- --grep "round-trip" --reporter=verbose
      2. Assert: store_node → get_node returns same data
      3. Assert: search finds stored nodes
      4. Assert: traverse walks graph correctly
    Expected Result: Full MCP workflow verified
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test: add integration tests and verify quality gate`
  - Files: apps/mcp/src/server.integration.test.ts, packages/graph/src/index.integration.test.ts
  - Pre-commit: `pnpm quality`

---

## Commit Strategy

| After Task | Message | Key Files | Verification |
|------------|---------|-----------|--------------|
| 1 | `feat(infra): initialize monorepo with pnpm, turbo, strict TS, eslint+oxlint, prettier, vitest` | Root configs, tooling/* | `pnpm format:check` |
| 2 | `feat(graph): add schema, database layer, types, and FTS5/tag triggers` | packages/graph/src/{types,schema,db}.ts + tests | `pnpm --filter @texere/graph test:unit` |
| 3 | `feat(graph): add node CRUD — store, get, invalidate with tag sync and auto-anchor` | packages/graph/src/nodes.ts + tests | `pnpm --filter @texere/graph test:unit` |
| 4 | `feat(graph): add edge CRUD — create with DEPRECATED_BY auto-invalidation, delete, direction queries` | packages/graph/src/edges.ts + tests | `pnpm --filter @texere/graph test:unit` |
| 5 | `feat(graph): add FTS5 search with BM25 ranking, query sanitization, and filters` | packages/graph/src/{search,sanitize}.ts + tests | `pnpm --filter @texere/graph test:unit` |
| 6 | `feat(graph): add CTE traversal, about compound query, and stats` | packages/graph/src/traverse.ts + tests | `pnpm --filter @texere/graph test:unit` |
| 7 | `feat(graph): add TextereDB public API class and barrel exports` | packages/graph/src/index.ts + tests | `pnpm --filter @texere/graph build` |
| 8 | `feat(mcp): add MCP server with 9 tool handlers, zod schemas, stdio transport` | apps/mcp/** | `pnpm --filter @texere/mcp test:unit` |
| 9 | `docs: add skills/texere.md LLM quick reference guide` | skills/texere.md | — |
| 10 | `test: add integration tests and verify quality gate` | Integration tests | `pnpm quality` |

---

## Success Criteria

### Verification Commands
```bash
pnpm quality                    # Expected: exit 0 (format + lint + typecheck + test + build)
pnpm test:unit                  # Expected: all unit tests pass, >70% coverage on graph
pnpm test:integration           # Expected: all integration tests pass
pnpm --filter @texere/graph build   # Expected: dist/ with .js and .d.ts files
pnpm --filter @texere/mcp build     # Expected: dist/index.js (bundled)
pnpm typecheck                  # Expected: 0 errors across all packages
pnpm lint                       # Expected: 0 errors (oxlint + eslint)
```

### Final Checklist
- [ ] All "Must Have" present (immutable nodes, hard-delete edges, FTS5, CTE, 9 tools, strict TS, TDD)
- [ ] All "Must NOT Have" absent (no update_node, no delete_node, no bi-temporal edges, no bulk ops, no >9 tools)
- [ ] All tests pass with >70% coverage
- [ ] V2/V3 structure ready (packages/, apps/, agents/ directories exist)
- [ ] Skill file accurate and <500 lines
- [ ] All commits follow conventional commit format
