# Texere v2.1 — Search Quality, Source Type, Tooling

## TL;DR

> **Quick Summary**: 7 tasks across 4 waves. Add `Source` NodeType, rewrite FTS5 sanitizer, improve embedding composition, add batch search + validate tools, rewrite SKILL.md for LLMs. Clean slate — no migrations, no backward compat.
>
> **Deliverables**:
> - Robust FTS5 query sanitizer that handles all non-bareword characters
> - Batch search MCP tool for dedup checking
> - Improved embedding text composition (selective tags)
> - New `Source` NodeType with roles: web_url, file_path, repository, api_doc
> - New `sources` field on StoreNodeInput for auto-creating source nodes
> - `texere_validate` dry-run tool for batch validation
> - Complete SKILL.md rewrite (LLM-optimized, read/write split)
> - Fix traverse.ts missing columns (role, status, scope)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6

---

## Context

### Original Request
User requested 6 improvements from benchmark findings (ingest-benchmark.md, run-2026-02-14.md): FTS5 sanitizer rewrite, batch search API, embedding improvement, SKILL.md restructure, dry-run validate tool, source provenance fix. Clean slate — no migrations.

### Interview Summary
**Key Decisions**:
- FTS5 sanitizer: Intelligent quoting approach. Store side unchanged. Only query side needs fixing.
- Batch search: New MCP tool, not modification of existing search.
- Embedding: Include selective novel tags (max 3) with newline separator. Don't include role.
- SKILL.md: LLM-only doc. Read section first, write second. Per-tool arg tables.
- Source: Promote to own NodeType. New `sources` field on StoreNodeInput (separate from `anchor_to`).
- Validate: Read-only tool accepting proposed nodes+edges, returns structured validation results.
- Clean slate: No migrations, no backward compat shims.

### Metis Review
**Identified Gaps (addressed)**:
- traverse.ts SQL missing `role`, `status`, `scope` columns → added as Task 0
- Sanitizer has TWO call sites (search.ts + nodes.ts duplicate detection) → both addressed in Task 2
- embedder.ts SQL queries don't fetch tags_json → addressed in Task 3
- `anchor_to` semantics differ for files vs URLs → resolved: add separate `sources` field instead of overloading `anchor_to`
- NEAR/N operator edge case → documented in sanitizer spec
- Test count assertions will break → explicitly listed in Task 1 acceptance criteria
- Hardcoded test for `artifact/source` in tools.test.ts → updated in Task 1

---

## Work Objectives

### Core Objective
Improve Texere's search quality, source provenance model, and agent DX based on findings from the Feb 14 ingestion benchmark.

### Concrete Deliverables
- `packages/graph/src/sanitize.ts` — rewritten FTS5 sanitizer
- `packages/graph/src/types.ts` — new Source NodeType + 4 roles
- `packages/graph/src/nodes.ts` — new `sources` field handling
- `packages/graph/src/embedder.ts` — improved text composition
- `packages/graph/src/traverse.ts` — missing column fix
- `packages/graph/src/search.ts` — batch search function
- `apps/mcp/src/tools/search-batch.ts` — new MCP tool
- `apps/mcp/src/tools/validate.ts` — new MCP tool
- `skills/texere/SKILL.md` — complete rewrite

### Definition of Done
- [ ] `pnpm test:unit` — all unit tests pass
- [ ] `pnpm test:integration` — all integration tests pass
- [ ] `pnpm turbo build` — TypeScript compiles clean

### Must Have
- FTS5 queries with `.` `-` `/` `:` `@` characters don't throw syntax errors
- Source is a first-class NodeType with its own roles
- Batch search returns results keyed by query index
- SKILL.md read section is self-contained (agents don't need write section to query)

### Must NOT Have (Guardrails)
- No migration logic, no backward compatibility shims
- No FTS5 query grammar parser — sanitizer makes input safe, not smart
- No configurable embedding formula — hardcoded `title\n{novel_tags}\n{content}`
- No HTTP fetching or URL content extraction in source nodes
- No semantic edge-type validation in validate tool (only structural)
- SKILL.md must NOT exceed 390 lines (target shorter than current)
- Batch search must NOT include relationships by default
- Validate tool must have ZERO side effects on the database

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after — update existing + add new)
- **Framework**: vitest
- **Commands**: `pnpm test:unit`, `pnpm test:integration`, `pnpm turbo build`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start immediately):
├── Task 0: Fix traverse.ts missing columns [trivial]
└── Task 1: Source NodeType + sources field [foundational]

Wave 2 (After Wave 1):
├── Task 2: FTS5 Sanitizer rewrite [independent]
└── Task 3: Embedding improvement [independent]

Wave 3 (After Wave 2):
├── Task 4: Batch Search API [depends: 2]
└── Task 5: Validate Tool [depends: 1, 2]

Wave 4 (After Wave 3):
└── Task 6: SKILL.md rewrite [depends: ALL]

Critical Path: Task 1 → Task 2 → Task 4 → Task 6
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 0 | None | None | 1 |
| 1 | None | 5, 6 | 0 |
| 2 | None | 4, 5, 6 | 3 |
| 3 | None | 6 | 2 |
| 4 | 2 | 6 | 5 |
| 5 | 1, 2 | 6 | 4 |
| 6 | ALL | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 0, 1 | quick (Task 0), unspecified-high (Task 1) |
| 2 | 2, 3 | unspecified-high (Task 2), quick (Task 3) |
| 3 | 4, 5 | unspecified-high (Task 4), unspecified-high (Task 5) |
| 4 | 6 | writing (Task 6) |

---

## TODOs

- [ ] 0. Fix traverse.ts missing columns (role, status, scope)

  **What to do**:
  - All three `buildWalkSql()` SQL templates (outgoing, incoming, both) are missing `n.role`, `n.status`, `n.scope` in their SELECT and GROUP BY clauses
  - The `TraverseRow` TypeScript type extends `Node` which includes these fields, so at runtime they're `undefined` while TS thinks they're defined
  - Add the 3 missing columns to all 3 SQL queries in both SELECT and GROUP BY

  **Must NOT do**:
  - Don't change the traverse algorithm or add new features
  - Don't change function signatures

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 SQL templates need identical column additions — mechanical, low-risk
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations needed during task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `packages/graph/src/traverse.ts:48-198` — `buildWalkSql()` function with all 3 SQL templates. Each has a SELECT and GROUP BY that need `n.role`, `n.status`, `n.scope` added
  - `packages/graph/src/types.ts:121-134` — `Node` interface showing all expected fields including role, status, scope
  - `packages/graph/src/traverse.test.ts` — existing tests that should still pass (traverse results will now include role/status/scope fields)

  **Acceptance Criteria**:
  - [ ] All 3 SQL templates in `buildWalkSql()` include `n.role, n.status, n.scope` in SELECT and GROUP BY
  - [ ] `pnpm test:unit -- packages/graph/src/traverse.test.ts` → PASS
  - [ ] `pnpm test:unit -- packages/graph/src/index.test.ts` → PASS (about() uses traverse)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Traverse results include role, status, scope
    Tool: Bash (vitest)
    Preconditions: None
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/traverse.test.ts
      2. Assert: all tests pass, 0 failures
      3. Run: pnpm test:unit -- packages/graph/src/index.test.ts
      4. Assert: all tests pass, 0 failures
    Expected Result: All existing traverse and about tests pass
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `fix(graph): add missing role, status, scope columns to traverse SQL`
  - Files: `packages/graph/src/traverse.ts`

---

- [ ] 1. Add Source NodeType with roles + `sources` field on StoreNodeInput

  **What to do**:

  **1a. Type system changes** (`packages/graph/src/types.ts`):
  - Add `Source = 'source'` to `NodeType` enum (7th type)
  - Add 4 new roles to `NodeRole` enum under a `// Source roles (4)` comment:
    - `WebUrl = 'web_url'`
    - `FilePath = 'file_path'`
    - `Repository = 'repository'`
    - `ApiDoc = 'api_doc'`
  - Remove `Source` from the `// Artifact roles` section (it moves to its own type). Artifact drops to 6 roles.
  - Add `[NodeType.Source]: [NodeRole.WebUrl, NodeRole.FilePath, NodeRole.Repository, NodeRole.ApiDoc]` to `VALID_ROLES_BY_TYPE`
  - Update `[NodeType.Artifact]` to remove `NodeRole.Source`

  **1b. Node storage** (`packages/graph/src/nodes.ts`):
  - Add `sources?: string[]` to `StoreNodeInput` interface
  - In `insertNodeWithAnchors()` (rename to `insertNodeWithLinks()` or similar), add source handling:
    - For each string in `sources`:
      - If starts with `http://` or `https://` → create `source/web_url` node with ID `source:web:${url}`
      - Otherwise → create `source/file_path` node with ID `source:file:${path}`
    - Auto-created source nodes: `INSERT OR IGNORE` (idempotent), title = the URL/path, content = the URL/path, tags = `[]`
    - Create `BASED_ON` edge: `new_node → source_node`

  **1c. MCP tool schema** (`apps/mcp/src/tools/store-node.ts`):
  - Add `sources: z.array(z.string().min(1)).optional()` to `nodeSchema`
  - Pass through to `StoreNodeInput`

  **1d. Update tests**:
  - `types.test.ts`: Update count assertions (7 types, 26 roles, Artifact has 6 roles, add Source type validations)
  - `nodes.test.ts`: Add test for `sources` field creating source nodes + BASED_ON edges
  - `tools.test.ts`: Update `artifact/source` test to use `source/web_url`

  **Must NOT do**:
  - Don't modify `anchor_to` behavior — it stays for file paths only
  - Don't add URL fetching or content extraction
  - Don't add URL normalization (exact string matching for now)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touches type system, node storage, MCP schemas, and multiple test files. Requires careful coordination.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 0)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None

  **References**:
  - `packages/graph/src/types.ts:1-119` — Complete type system: enums, validation matrix, `isValidTypeRole()`. This is the primary file to modify.
  - `packages/graph/src/types.test.ts:1-118` — Tests with exact count assertions that must be updated: line 17 (6→7 types), line 19 (23→26 roles), line 42 (6→7 types in matrix), line 58 (7→6 artifact roles), line 100 (artifact/source → remove)
  - `packages/graph/src/nodes.ts:16-27` — `StoreNodeInput` interface where `sources` field is added
  - `packages/graph/src/nodes.ts:137-173` — `insertNodeWithAnchors()` function showing the anchor_to pattern to replicate for sources (INSERT OR IGNORE + edge creation)
  - `apps/mcp/src/tools/store-node.ts:8-19` — Zod `nodeSchema` where `sources` field is added to MCP tool
  - `apps/mcp/src/tools.test.ts:295-320` — Test creating `artifact/source` node that must be updated to `source/web_url`
  - `packages/graph/src/edges.ts:4` — `EdgeType` enum showing `BasedOn = 'BASED_ON'` for source edges

  **Acceptance Criteria**:
  - [ ] `NodeType` enum has 7 values including `Source`
  - [ ] `NodeRole` enum has 26 values including `WebUrl`, `FilePath`, `Repository`, `ApiDoc`
  - [ ] `VALID_ROLES_BY_TYPE[NodeType.Source]` has 4 roles
  - [ ] `VALID_ROLES_BY_TYPE[NodeType.Artifact]` has 6 roles (Source removed)
  - [ ] `isValidTypeRole(NodeType.Source, NodeRole.WebUrl)` returns `true`
  - [ ] `isValidTypeRole(NodeType.Artifact, NodeRole.Source)` returns `false` (removed)
  - [ ] Storing a node with `sources: ["https://hono.dev"]` auto-creates a `source/web_url` node and BASED_ON edge
  - [ ] Storing a node with `sources: ["docs/arch.md"]` auto-creates a `source/file_path` node and BASED_ON edge
  - [ ] Duplicate source URLs use INSERT OR IGNORE (no duplicate nodes)
  - [ ] `pnpm test:unit` → all tests pass

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Source type-role validation
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/types.test.ts
      2. Assert: all tests pass with updated counts
    Expected Result: 7 types, 26 roles, all valid combos verified
    Evidence: Terminal output

  Scenario: sources field creates nodes and edges
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/nodes.test.ts
      2. Assert: new source node tests pass
      3. Run: pnpm test:unit -- apps/mcp/src/tools.test.ts
      4. Assert: updated source tests pass
    Expected Result: Source nodes auto-created with BASED_ON edges
    Evidence: Terminal output

  Scenario: Full test suite
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit
      2. Assert: 0 failures across all packages
    Expected Result: Complete green
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `feat(graph): add Source NodeType with web_url, file_path, repository, api_doc roles`
  - Files: `packages/graph/src/types.ts`, `packages/graph/src/nodes.ts`, `apps/mcp/src/tools/store-node.ts`, `packages/graph/src/types.test.ts`, `packages/graph/src/nodes.test.ts`, `apps/mcp/src/tools.test.ts`

---

- [ ] 2. Rewrite FTS5 query sanitizer

  **What to do**:

  **2a. New sanitizer** (`packages/graph/src/sanitize.ts`):
  Replace `sanitizeFtsQueryStrict()` with a proper implementation:

  Algorithm:
  1. If input is empty → return `''`
  2. Split input on whitespace into raw tokens
  3. For each token:
     - If it's a reserved operator (`AND`, `OR`, `NOT`, `NEAR` — case-sensitive) → pass through
     - If it's a valid FTS5 bareword (regex: `/^[a-zA-Z0-9_\u0080-\uffff]+$/`) → pass through
     - If it ends with `*` and the rest is a valid bareword → pass through (prefix query)
     - If it ends with `*` and the rest is NOT a valid bareword → quote the non-star part, keep star: `"hello-world"*`
     - If it starts and ends with `"` → pass through (user-quoted phrase)
     - Otherwise → double-quote it, escaping internal `"` as `""`: `sql.js` → `"sql.js"`
  4. Join with spaces and return

  FTS5 bareword definition (from spec): one or more consecutive characters that are `a-z`, `A-Z`, `0-9`, `_` (underscore), unicode > 127, or substitute char (codepoint 26).

  **2b. Update both call sites**:
  - `search.ts:352-355` — fallback sanitizer on FTS5 syntax error
  - `nodes.ts:175-192` — `findSimilarNodes()` duplicate detection. Currently builds `title:${term}` queries from sanitized tokens. The new sanitizer produces properly quoted tokens, and the `title:` prefix is added per-token in `findSimilarNodes()`. This interaction must be verified.

  **2c. Comprehensive tests** (`packages/graph/src/sanitize.test.ts`):
  Replace existing 5 tests with 15+ covering:
  - Valid barewords: `hello`, `test123`, `_private`, `über` → pass through
  - Dotted terms: `sql.js` → `"sql.js"`
  - Hyphenated: `better-sqlite3` → `"better-sqlite3"`
  - Slashes: `/api/users` → `"/api/users"`
  - At-signs: `@hono/validator` → `"@hono/validator"`
  - Colons: `file:src/db.ts` → `"file:src/db.ts"`
  - Operators preserved: `foo AND bar` → `foo AND bar`
  - Prefix queries: `auth*` → `auth*`
  - Prefix with special chars: `hello-world*` → `"hello-world"*`
  - Quoted phrases: `"exact phrase"` → `"exact phrase"`
  - Empty input: `""` → `""`
  - All special chars: `@./::-` → proper quoting
  - Mixed: `sql.js OR "exact phrase" auth*` → `"sql.js" OR "exact phrase" auth*`
  - Quotes inside token: `it's` → `"it''s"` or similar escaping

  **2d. Integration test** — add to `search.test.ts`:
  - Store node with title containing dots/hyphens, search for it using raw terms → found

  **Must NOT do**:
  - Don't parse full FTS5 grammar (no column filter support, no NEAR/N parsing)
  - Don't change the function export name (`sanitizeFtsQueryStrict`)
  - Don't change the try-raw-first / catch-sanitize fallback pattern in search.ts

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core search quality fix. Needs careful FTS5 spec understanding and thorough test coverage.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None (functionally independent, but scheduled after Wave 1 for cleaner git history)

  **References**:
  - `packages/graph/src/sanitize.ts:1-22` — Current 22-line implementation to replace entirely
  - `packages/graph/src/sanitize.test.ts:1-28` — Current 5 tests to replace with 15+
  - `packages/graph/src/search.ts:348-356` — Fallback call site: raw query tried first, sanitizer used on FTS5 error
  - `packages/graph/src/nodes.ts:175-192` — `findSimilarNodes()`: second call site, builds `title:${term}` queries from sanitized tokens
  - `packages/graph/src/schema.ts:34-41` — FTS5 table definition with `tokenize='unicode61'`
  - SQLite FTS5 spec section 3.1: FTS5 bareword = `[a-zA-Z0-9_\u0080+]`. Everything else must be quoted. Double quotes escaped as `""`.
  - SQLite FTS5 spec section 3.2: `"sql.js"` in query → tokenizer splits to `[sql, js]` → phrase search for adjacent tokens. This matches how `sql.js` was tokenized during indexing.

  **Acceptance Criteria**:
  - [ ] `sanitizeFtsQueryStrict("sql.js")` returns a string that doesn't throw when used in FTS5 MATCH
  - [ ] `sanitizeFtsQueryStrict("better-sqlite3")` returns a valid FTS5 query
  - [ ] `sanitizeFtsQueryStrict("@hono/validator")` returns a valid FTS5 query
  - [ ] `sanitizeFtsQueryStrict("foo AND bar")` preserves AND operator
  - [ ] `sanitizeFtsQueryStrict("auth*")` preserves prefix query
  - [ ] Searching for "sql.js" finds a node titled "sql.js performance" (integration test)
  - [ ] `pnpm test:unit -- packages/graph/src/sanitize.test.ts` → all 15+ tests pass
  - [ ] `pnpm test:unit -- packages/graph/src/search.test.ts` → all tests pass

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Sanitizer handles all non-bareword characters
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/sanitize.test.ts
      2. Assert: 15+ tests, 0 failures
    Expected Result: All special character cases handled
    Evidence: Terminal output

  Scenario: End-to-end search with dotted terms
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/search.test.ts
      2. Assert: new integration test for "sql.js" search passes
    Expected Result: Technical terms with dots/hyphens are searchable
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `fix(graph): rewrite FTS5 sanitizer with intelligent quoting for non-bareword chars`
  - Files: `packages/graph/src/sanitize.ts`, `packages/graph/src/sanitize.test.ts`, `packages/graph/src/search.test.ts`

---

- [ ] 3. Improve embedding text composition

  **What to do**:

  **3a. Add novel-tag extraction** to `embedder.ts`:
  - Create helper: `buildEmbeddingText(title: string, content: string, tagsJson: string): string`
  - Parse tags from `tags_json`
  - Filter to "novel" tags: tags whose lowercase form does NOT appear as a substring in `(title + " " + content).toLowerCase()`
  - Take first 3 novel tags max
  - If novel tags exist: return `title\n${novelTags.join(' ')}\n${content}`
  - If no novel tags: return `title\n${content}`

  **3b. Update SQL queries** in `embedder.ts`:
  - `embedNode()` (line 51): Change SELECT to include `tags_json`
  - `embedPending()` (line 67): Change SELECT to include `n.tags_json`

  **3c. Update both methods** to use `buildEmbeddingText()` instead of inline `${row.title} ${row.content}`

  **3d. Tests** (`packages/graph/src/embedder.test.ts`):
  - Test `buildEmbeddingText()` directly:
    - Novel tags included: title="Auth", content="JWT tokens", tags=["security","auth"] → "Auth\nsecurity\nJWT tokens" (only "security" is novel, "auth" is in title)
    - No novel tags: title="SQLite WAL", tags=["sqlite","wal"] → "SQLite WAL\n{content}" (both tags in title)
    - Empty tags: → "title\ncontent"
    - Max 3 tags: 5 novel tags → only first 3 included

  **Must NOT do**:
  - Don't include `role` in embedding text
  - Don't change the embedding dimension (384) or model
  - Don't change query-side embedding format (queries don't have tags — asymmetry is acceptable)
  - Don't make the formula configurable

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused change to embedder.ts — helper function + SQL column addition + 2 method updates
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - `packages/graph/src/embedder.ts:49-62` — `embedNode()` method: currently selects only title+content, needs tags_json
  - `packages/graph/src/embedder.ts:64-92` — `embedPending()` method: same issue, batch path
  - `packages/graph/src/embedder.ts:56` — Current inline composition: `${row.title} ${row.content}` → replace with `buildEmbeddingText()`
  - Research finding: Haystack framework uses `\n` separator. all-MiniLM-L6-v2 has 256 token limit. Only novel tags (not in title/content) should be included to avoid token waste.

  **Acceptance Criteria**:
  - [ ] `buildEmbeddingText("Auth", "JWT tokens", '["security","auth"]')` returns `"Auth\nsecurity\nJWT tokens"`
  - [ ] `buildEmbeddingText("SQLite WAL", "...", '["sqlite","wal"]')` returns `"SQLite WAL\n..."`
  - [ ] `embedPending()` SQL includes `n.tags_json`
  - [ ] `embedNode()` SQL includes `tags_json`
  - [ ] `pnpm test:unit -- packages/graph/src/embedder.test.ts` → PASS

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Embedding includes novel tags
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/embedder.test.ts
      2. Assert: all tests pass including new tag composition tests
    Expected Result: Novel tags included in embedding text, redundant tags excluded
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `feat(graph): include selective novel tags in embedding text composition`
  - Files: `packages/graph/src/embedder.ts`, `packages/graph/src/embedder.test.ts`

---

- [ ] 4. Add batch search API

  **What to do**:

  **4a. Core batch function** (`packages/graph/src/search.ts`):
  - Add `searchBatch(db, queries: SearchOptions[]): SearchResult[][]`
  - Runs each query through the existing `search()` function
  - Returns results indexed by query position: `results[0]` = results for `queries[0]`
  - Wraps all queries in a single `db.transaction().immediate()` for consistency
  - Skips relationship aggregation by default for performance

  **4b. Expose on Texere class** (`packages/graph/src/index.ts`):
  - Add `searchBatch(queries: SearchOptions[]): SearchResult[][]` method

  **4c. MCP tool** (`apps/mcp/src/tools/search-batch.ts`):
  - New tool: `texere_search_batch`
  - Input schema: `{ queries: z.array(searchOptionsSchema).min(1).max(50) }`
  - Output: `{ results: SearchResult[][] }`
  - Description: "Run multiple searches in one call. Results indexed by query position."

  **4d. Register tool** in `apps/mcp/src/tools/index.ts`

  **4e. Tests**:
  - Unit test in `search.test.ts`: batch of 3 queries returns 3 result arrays
  - MCP tool test in `tools.test.ts`: round-trip test
  - Edge case: empty queries array → error
  - Edge case: one query fails FTS5 → that query returns sanitized results, others unaffected

  **Must NOT do**:
  - Don't modify the existing `texere_search` tool
  - Don't merge/deduplicate results across queries
  - Don't include relationships in batch results
  - Don't batch embedding generation for semantic queries

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New tool + core function + MCP registration + tests. Moderate complexity.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2 (sanitizer must be rewritten first — batch search uses it via search())

  **References**:
  - `packages/graph/src/search.ts:231-394` — Existing `search()` function that batch wraps
  - `packages/graph/src/index.ts` — `Texere` class where `searchBatch` method is added
  - `apps/mcp/src/tools/search.ts:8-17` — Existing search tool Zod schema to reuse for batch
  - `apps/mcp/src/tools/index.ts:15-28` — Tool registration array where new tool is added
  - `apps/mcp/src/tools/types.ts:12-20` — `ToolDefinition` interface pattern for new tool

  **Acceptance Criteria**:
  - [ ] `searchBatch(db, [{query:"foo"}, {query:"bar"}])` returns array of length 2
  - [ ] Each element is its own result array for that query
  - [ ] Failed FTS5 query in batch → that index returns sanitized results, rest unaffected
  - [ ] `TOOL_DEFINITIONS` includes `texere_search_batch` (total: 13 tools)
  - [ ] `pnpm test:unit` → all tests pass

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Batch search returns indexed results
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/search.test.ts
      2. Assert: new batch search tests pass
      3. Run: pnpm test:unit -- apps/mcp/src/tools.test.ts
      4. Assert: texere_search_batch tool test passes
    Expected Result: Batch queries return per-index results
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `feat(graph): add batch search API and texere_search_batch MCP tool`
  - Files: `packages/graph/src/search.ts`, `packages/graph/src/index.ts`, `apps/mcp/src/tools/search-batch.ts`, `apps/mcp/src/tools/index.ts`, tests

---

- [ ] 5. Add validate (dry-run) tool

  **What to do**:

  **5a. MCP tool** (`apps/mcp/src/tools/validate.ts`):
  - New tool: `texere_validate`
  - Input schema:
    ```
    {
      nodes: Array<{
        temp_id?: string,       // optional reference ID for edge validation within batch
        type: NodeType,
        role: NodeRole,
        title: string,
        content: string,
        tags?: string[],
        importance?: number,
        confidence?: number,
        sources?: string[],
        anchor_to?: string[],
      }>,
      edges: Array<{
        source_id: string,      // can be temp_id from proposed nodes
        target_id: string,      // can be temp_id from proposed nodes
        type: EdgeType,
      }>
    }
    ```
  - Output:
    ```
    {
      valid: boolean,
      issues: Array<{
        severity: 'error' | 'warning',
        item: 'node' | 'edge',
        index: number,
        message: string,
      }>
    }
    ```
  - Validations:
    1. Type-role matrix (error): each node's type-role combo passes `isValidTypeRole()`
    2. Required fields (error): title and content are non-empty strings
    3. Edge endpoints (error): source_id and target_id each exist in DB OR match a `temp_id` in the proposed batch
    4. Self-referential edges (error): source_id !== target_id
    5. Duplicate title warning (warning): FTS5 search for similar existing nodes (using sanitized titles)
    6. Batch size (error): nodes.length <= 50, edges.length <= 50

  **5b. Register tool** in `apps/mcp/src/tools/index.ts`

  **5c. Tests** in `tools.test.ts`:
  - Valid batch → `{ valid: true, issues: [] }`
  - Invalid type-role → error issue
  - Edge with missing endpoint → error issue
  - Duplicate title → warning issue
  - Self-referential edge → error issue
  - Zero side effects: store node before validate, validate doesn't change node count

  **Must NOT do**:
  - ZERO database writes — read-only
  - Don't validate edge-type semantics (e.g., "RESOLVES should go solution→problem")
  - Don't validate source URL format
  - Don't block on embedding generation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New tool with multiple validation paths and edge cases
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (type system), Task 2 (sanitizer for duplicate detection)

  **References**:
  - `packages/graph/src/types.ts:116-119` — `isValidTypeRole()` function used for type-role validation
  - `packages/graph/src/nodes.ts:175-192` — `findSimilarNodes()` pattern for duplicate title detection
  - `packages/graph/src/sanitize.ts` — Sanitizer used for safe FTS5 title search
  - `apps/mcp/src/tools/helpers.ts:13-16` — `ok()` helper for structured responses
  - `apps/mcp/src/tools/helpers.ts:30-39` — `toolFailure()` pattern
  - `apps/mcp/src/tools/types.ts:12-20` — `ToolDefinition` interface

  **Acceptance Criteria**:
  - [ ] Valid batch returns `{ valid: true, issues: [] }`
  - [ ] Invalid type-role combo returns error issue with index
  - [ ] Edge with nonexistent target returns error issue
  - [ ] Self-referential edge returns error issue
  - [ ] Similar existing title returns warning issue
  - [ ] Database is unchanged after validate (same node count before and after)
  - [ ] `TOOL_DEFINITIONS` total is now 14
  - [ ] `pnpm test:unit -- apps/mcp/src/tools.test.ts` → PASS

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Validate is read-only
    Tool: Bash (vitest)
    Steps:
      1. Run: pnpm test:unit -- apps/mcp/src/tools.test.ts
      2. Assert: validate tool tests pass
      3. Assert: zero-side-effect test confirms no DB changes
    Expected Result: Validation works without modifying database
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `feat(mcp): add texere_validate dry-run tool for batch validation`
  - Files: `apps/mcp/src/tools/validate.ts`, `apps/mcp/src/tools/index.ts`, `apps/mcp/src/tools.test.ts`

---

- [ ] 6. Rewrite SKILL.md for LLMs

  **What to do**:

  Complete rewrite of `skills/texere/SKILL.md`. This doc is ONLY read by LLMs. Structure:

  **6a. Structure**:
  ```
  --- (frontmatter: name, description, compatibility — preserve format) ---

  ## READ (Search & Retrieve)
  - texere_search — args table, return shape, example
  - texere_search_batch — args table, return shape, example
  - texere_about — args table, return shape, example
  - texere_get_node — args table, return shape, example
  - texere_traverse — args table, return shape, example
  - texere_stats — args table, return shape, example

  ## WRITE (Store & Modify) — skip this section if you only need to read
  - texere_store_node / texere_store_nodes — args table, return shape, example
  - texere_create_edge / texere_create_edges — args table, return shape, example
  - texere_replace_node — args table, return shape, example
  - texere_invalidate_node — args table, return shape, example
  - texere_delete_edge — args table, return shape, example
  - texere_validate — args table, return shape, example

  ## Type System Reference
  - NodeType enum (7 values) with 1-line definitions
  - NodeRole enum (26 values) grouped by type, with 1-line definitions
  - Type-role decision tree (compact)
  - EdgeType enum (16 values) with 1-line definitions
  - Edge selection decision tree (compact)
  ```

  **6b. Per-tool format**:
  Each tool gets:
  - Name + one-line description
  - Args table: `| arg | type | required | default | notes |`
  - Return shape (JSON skeleton, not example data)
  - One minimal usage example

  **6c. Decision trees**:
  Compact if/then format, not prose paragraphs.

  **6d. Target**: Shorter than current 390 lines while containing all 14 tools, all 7 types, all 26 roles, all 16 edge types, plus decision trees.

  **Must NOT do**:
  - Don't write for humans — no prose explanations, no "Getting Started" sections
  - Don't add emojis
  - Don't exceed 390 lines
  - Don't change the frontmatter field names

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Pure documentation task — no code changes, requires clear technical writing for LLM audience
  - **Skills**: [`texere`]
    - `texere`: Provides context on the existing SKILL.md format and what texere tools do

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential, final)
  - **Blocks**: None (final task)
  - **Blocked By**: ALL other tasks (documents the finished system)

  **References**:
  - `skills/texere/SKILL.md` — Current file to completely rewrite (preserve frontmatter format)
  - `apps/mcp/src/tools/*.ts` — All 14 tool definitions with Zod schemas (source of truth for args)
  - `packages/graph/src/types.ts` — All enums (source of truth for type system)
  - All other tasks in this plan — the SKILL.md must reflect ALL changes made in Tasks 0-5

  **Acceptance Criteria**:
  - [ ] Frontmatter preserved with correct `name`, `description`, `compatibility` fields
  - [ ] READ section appears BEFORE write section
  - [ ] All 14 tools documented with args tables
  - [ ] All 7 NodeTypes defined with 1-line descriptions
  - [ ] All 26 NodeRoles defined, grouped by type
  - [ ] All 16 EdgeTypes defined
  - [ ] Type-role decision tree present and compact
  - [ ] Edge selection decision tree present and compact
  - [ ] Total line count < 390
  - [ ] No human-oriented prose ("Welcome to...", "Getting started...")

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: SKILL.md has correct structure and content
    Tool: Bash
    Steps:
      1. Run: grep -c "^name:" skills/texere/SKILL.md → assert 1
      2. Run: grep -c "texere_" skills/texere/SKILL.md → assert >= 14
      3. Run: wc -l skills/texere/SKILL.md → assert < 390
      4. Run: grep -n "## READ" skills/texere/SKILL.md → confirm appears before "## WRITE"
      5. Run: grep -c "source" skills/texere/SKILL.md → assert >= 3 (new Source type documented)
    Expected Result: All structural assertions pass
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `docs(skill): rewrite SKILL.md for LLM agents with read/write split and arg tables`
  - Files: `skills/texere/SKILL.md`

---

## Commit Strategy

| After Task | Message | Key Files |
|------------|---------|-----------|
| 0 | `fix(graph): add missing role, status, scope columns to traverse SQL` | traverse.ts |
| 1 | `feat(graph): add Source NodeType with web_url, file_path, repository, api_doc roles` | types.ts, nodes.ts, store-node.ts, tests |
| 2 | `fix(graph): rewrite FTS5 sanitizer with intelligent quoting for non-bareword chars` | sanitize.ts, tests |
| 3 | `feat(graph): include selective novel tags in embedding text composition` | embedder.ts, tests |
| 4 | `feat(graph): add batch search API and texere_search_batch MCP tool` | search.ts, index.ts, search-batch.ts, tests |
| 5 | `feat(mcp): add texere_validate dry-run tool for batch validation` | validate.ts, index.ts, tests |
| 6 | `docs(skill): rewrite SKILL.md for LLM agents with read/write split and arg tables` | SKILL.md |

---

## Success Criteria

### Verification Commands
```bash
pnpm test:unit                        # All unit tests pass
pnpm test:integration                 # All integration tests pass
pnpm turbo build                      # TypeScript compiles
wc -l skills/texere/SKILL.md          # < 390 lines
```

### Final Checklist
- [ ] FTS5 queries with dots, hyphens, slashes, colons, @-signs don't throw
- [ ] Source is a first-class NodeType with 4 roles
- [ ] `sources` field auto-creates source nodes + BASED_ON edges
- [ ] Embeddings include novel tags
- [ ] Batch search tool registered and functional (14 total tools)
- [ ] Validate tool is read-only and catches type-role, edge, duplicate issues
- [ ] SKILL.md is LLM-optimized with read section first
- [ ] Traverse results include role, status, scope
- [ ] All "Must NOT Have" guardrails respected
