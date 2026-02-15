# Test Suite Overhaul: Delete Fluff, Test Intent, Add Critical Coverage

## TL;DR

> **Quick Summary**: Scorched-earth overhaul of Texere's 14 test files. Delete pure fluff, rewrite surviving tests to verify user intent (not implementation mechanics), strengthen all weak assertions, and add missing critical coverage: performance benchmarks, concurrency tests, failure scenarios, and true MCP integration tests.
> 
> **Deliverables**:
> - 14 test files overhauled (3 deleted/rewritten, 7 surgically fixed, 1 new, 3 with new test categories)
> - Performance benchmark suite (search, traverse, embed at scale)
> - Concurrency test suite (concurrent writes, read+write overlap)
> - Failure scenario coverage (embedding service down, malformed data, resource exhaustion)
> - True MCP integration tests (malformed JSON, error boundaries, stdio edge cases)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (delete/clean) → Tasks 2-10 (rewrites) → Tasks 11-13 (new coverage)

---

## Context

### Original Request
User requested a critical audit of the test suite, found major quality issues, and wants a complete overhaul. Tests must follow best practices, test intent, never be fluff.

### Interview Summary
**Key Discussions**:
- Deletion approach: **Scorched earth** — delete entire files >50% fluff, rewrite from scratch
- Performance benchmarks: **Include** — search at 10k nodes, traverse timing, embed batches
- Concurrency tests: **Include** — concurrent writes, read+write overlap, transaction conflicts
- MCP integration: **Rewrite as true integration** — malformed JSON, error boundaries, stdio edge cases

**Audit Findings** (from full read of all 14 test files):
- `fts5.test.ts`: Pure exploration code with console.log, zero assertions
- `types.test.ts`: >50% enum counting (fluff), rest is valid type-role validation
- `db.test.ts`: Tests SQLite itself, not our code
- `index.test.ts`: Duplicates unit tests at facade level; actually the ONLY facade test (Metis correction)
- `nodes.test.ts`: Tests SQLite triggers directly instead of user outcomes
- `search.test.ts`: Good structure but weak assertions (toBeGreaterThan(0))
- `integration.test.ts`: Weak semantic search assertions, no ranking quality
- `server.int.test.ts`: Unit tests disguised as integration tests
- `replace-node.ts`: Has ZERO dedicated tests (Metis caught this critical gap)
- Overall: False confidence — many tests would pass even if system is broken

### Metis Review
**Identified Gaps** (addressed):
- `replace-node.ts` has no dedicated test file → Added Task 9
- `index.test.ts` is the only facade test, not a duplicate → Rewrite instead of delete (Task 3)
- Scorched earth overcorrects for nodes/search/types → Applied surgical fix where 80%+ is good
- Test architecture decision: internal functions vs Texere class → Specified per-task

---

## Work Objectives

### Core Objective
Transform the test suite from "tests that pass" to "tests that catch bugs." Every test must answer: "What user outcome does this verify?" If the answer is about SQLite internals or TypeScript types, the test is wrong.

### Concrete Deliverables
- `packages/graph/src/fts5.test.ts` — DELETED
- `packages/graph/src/db.test.ts` — Rewritten for schema intent
- `packages/graph/src/index.test.ts` — Rewritten as facade contract tests
- `packages/graph/src/types.test.ts` — Surgically cleaned (fluff removed)
- `packages/graph/src/nodes.test.ts` — Rewritten for behavioral intent
- `packages/graph/src/edges.test.ts` — Assertions strengthened
- `packages/graph/src/search.test.ts` — Assertions strengthened, ranking quality added
- `packages/graph/src/integration.test.ts` — Assertions strengthened, quality tests added
- `packages/graph/src/embedder.test.ts` — Failure scenarios added
- `packages/graph/src/replace-node.test.ts` — NEW file (dedicated tests)
- `packages/graph/src/traverse.test.ts` — Minor improvements
- `packages/graph/src/index.int.test.ts` — Minor improvements
- `apps/mcp/src/tools.test.ts` — Minor improvements
- `apps/mcp/src/server.int.test.ts` — Rewritten as true integration tests
- Performance benchmark tests (new describe blocks in relevant files)
- Concurrency tests (new describe blocks)
- Failure scenario tests (new describe blocks)

### Definition of Done
- [ ] `pnpm test:unit` passes with 0 failures
- [ ] `pnpm test:integration` passes with 0 failures
- [ ] Zero tests use `console.log`
- [ ] Zero tests assert only `toBeDefined()` or `toBeInstanceOf()` without behavioral verification
- [ ] Zero tests assert `toBeGreaterThan(0)` where exact count is knowable
- [ ] Every test name answers "what user outcome does this verify?"
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes

### Must Have
- Every test verifies a user-facing outcome, not an implementation detail
- All assertions are strong (exact values when knowable)
- Performance benchmarks with explicit time limits
- Concurrency tests for a database library
- Failure scenario coverage
- True MCP integration tests

### Must NOT Have (Guardrails)
- ❌ No tests that count enum values (e.g., "has exactly 7 node types")
- ❌ No tests that only assert `toBeDefined()` or `toBeInstanceOf()` (proves nothing)
- ❌ No tests that use `console.log` (exploration code, not tests)
- ❌ No tests that verify SQLite internals (triggers, pragmas, FTS5 syntax) — test the OUTCOME
- ❌ No `toBeGreaterThan(0)` when exact count is knowable
- ❌ No shared test-helpers.ts file — keep helpers co-located per Texere convention
- ❌ No changes to source code — this is test-only refactor
- ❌ No new test framework or infrastructure — use existing vitest + `:memory:` SQLite
- ❌ No mocking — real SQLite, real embeddings (existing convention)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (vitest, configured)
- **Automated tests**: Tests-after (we ARE the tests)
- **Framework**: vitest with real SQLite `:memory:`

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Every task MUST verify by running the test suite:

```
Tool: Bash
Steps:
  1. Run: pnpm test:unit --reporter=verbose 2>&1
  2. Assert: Exit code 0
  3. Assert: All test files mentioned in task show PASS
  4. Run: pnpm lint 2>&1
  5. Assert: Exit code 0
  6. Run: pnpm typecheck 2>&1
  7. Assert: Exit code 0
Expected Result: All tests pass, no lint errors, no type errors
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Delete fts5.test.ts + clean types.test.ts [no dependencies, fast]

Wave 2 (After Wave 1):
├── Task 2: Rewrite db.test.ts [independent file]
├── Task 3: Rewrite index.test.ts [independent file]
├── Task 4: Fix nodes.test.ts [independent file]
├── Task 5: Fix search.test.ts [independent file]
├── Task 6: Fix edges.test.ts [independent file]
├── Task 7: Fix integration.test.ts [independent file]
├── Task 8: Fix embedder.test.ts [independent file]
├── Task 9: Create replace-node.test.ts [independent new file]
└── Task 10: Fix traverse.test.ts + index.int.test.ts + tools.test.ts [minor fixes]

Wave 3 (After Wave 2):
├── Task 11: Rewrite server.int.test.ts [MCP true integration]
├── Task 12: Add performance benchmarks [needs stable test patterns from Wave 2]
└── Task 13: Add concurrency tests [needs stable test patterns from Wave 2]

Critical Path: Task 1 → Task 5 → Task 12 (search perf depends on search test patterns)
Parallel Speedup: ~60% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2-13 (establishes pattern) | None (fast, do first) |
| 2 | 1 | 12 | 3, 4, 5, 6, 7, 8, 9, 10 |
| 3 | 1 | None | 2, 4, 5, 6, 7, 8, 9, 10 |
| 4 | 1 | None | 2, 3, 5, 6, 7, 8, 9, 10 |
| 5 | 1 | 12 | 2, 3, 4, 6, 7, 8, 9, 10 |
| 6 | 1 | None | 2, 3, 4, 5, 7, 8, 9, 10 |
| 7 | 1 | None | 2, 3, 4, 5, 6, 8, 9, 10 |
| 8 | 1 | 13 | 2, 3, 4, 5, 6, 7, 9, 10 |
| 9 | 1 | None | 2, 3, 4, 5, 6, 7, 8, 10 |
| 10 | 1 | None | 2, 3, 4, 5, 6, 7, 8, 9 |
| 11 | 1 | None | 12, 13 |
| 12 | 2, 5 | None | 11, 13 |
| 13 | 8 | None | 11, 12 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | task(category="quick", load_skills=[], run_in_background=false) |
| 2 | 2-10 | dispatch parallel, each task(category="unspecified-low", ...) |
| 3 | 11, 12, 13 | dispatch parallel, each task(category="unspecified-high", ...) |

---

## TODOs

### Test Architecture Decision (Per-Task Guide)

> Unit tests in `packages/graph/src/*.test.ts` call **internal module functions** directly (e.g., `storeNode(db, input)` from `./nodes.ts`).
> Facade tests in `index.test.ts` and `index.int.test.ts` call **Texere class methods** (e.g., `db.storeNode(input)`).
> MCP tests call **`mcp.callTool()`** wrappers.
> Each task below specifies which pattern to use.

---

- [ ] 1. Delete fts5.test.ts + Clean types.test.ts

  **What to do**:
  - DELETE `packages/graph/src/fts5.test.ts` entirely (exploration code, console.log, zero assertions)
  - SURGICALLY CLEAN `packages/graph/src/types.test.ts`:
    - REMOVE these fluff tests:
      - `it('has exactly 7 node types')` — counting enums
      - `it('has exactly 26 node roles')` — counting enums
      - `it('has exactly 16 edge types')` — counting enums
      - `it('has new v1.2 node roles')` — testing string literals
      - `it('has new v1.2 edge types')` — testing string literals
      - `it('has all 7 node types in VALID_ROLES_BY_TYPE')` — counting
      - `it('knowledge type has 7 valid roles')` — counting
      - `it('issue type has 2 valid roles')` — counting
      - `it('action type has 5 valid roles')` — counting
      - `it('artifact type has 6 valid roles')` — counting
      - `it('context type has 1 valid role')` — counting
      - `it('meta type has 1 valid role')` — counting
      - `it('Node interface does not have embedding property')` — testing TS type, not behavior
      - `it('SearchOptions accepts mode field')` — testing TS type
      - `it('SearchMode accepts all valid values')` — testing TS type
    - KEEP these (they test real validation logic):
      - All `isValidTypeRole` tests — these test actual runtime validation
    - VERIFY the remaining tests still cover the intent: "invalid type-role combinations are rejected"

  **Must NOT do**:
  - Do not modify any source files
  - Do not add new tests in this task — just delete/clean

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file deletion and line removal, no complex logic
  - **Skills**: `[]`
    - No special skills needed for deletion

  **Parallelization**:
  - **Can Run In Parallel**: NO (first task, establishes pattern)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2-13
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/graph/src/fts5.test.ts` — ENTIRE FILE to delete (22 lines, exploration code with console.log)
  - `packages/graph/src/types.test.ts` — Lines 14-68 are fluff (enum counting), lines 70-128 are valid (isValidTypeRole tests), lines 130-146 are fluff (TS type checks)

  **Acceptance Criteria**:
  - [ ] `packages/graph/src/fts5.test.ts` no longer exists
  - [ ] `packages/graph/src/types.test.ts` contains ONLY `isValidTypeRole` tests
  - [ ] Zero enum-counting tests remain
  - [ ] Zero TS-type-checking tests remain
  - [ ] `pnpm test:unit` passes (remaining types tests still pass)
  - [ ] `pnpm typecheck` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: fts5.test.ts is deleted
    Tool: Bash
    Preconditions: File exists at packages/graph/src/fts5.test.ts
    Steps:
      1. Run: ls packages/graph/src/fts5.test.ts 2>&1
      2. Assert: "No such file or directory"
    Expected Result: File does not exist
    Evidence: Command output captured

  Scenario: types.test.ts has no enum counting tests
    Tool: Bash
    Preconditions: types.test.ts has been cleaned
    Steps:
      1. Run: grep -c "toHaveLength" packages/graph/src/types.test.ts
      2. Assert: Output is "0" (no length assertions on enum/array counts)
      3. Run: grep -c "isValidTypeRole" packages/graph/src/types.test.ts
      4. Assert: Output is greater than 0 (validation tests remain)
    Expected Result: Only validation logic tests remain
    Evidence: grep output captured

  Scenario: All remaining tests pass
    Tool: Bash
    Preconditions: Deletions complete
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0
      3. Assert: "types.test.ts" shows PASS in output
      4. Assert: "fts5.test.ts" does NOT appear in output
    Expected Result: Test suite passes with cleaned files
    Evidence: Full test output captured
  ```

  **Commit**: YES
  - Message: `test(graph): delete exploration code and enum-counting fluff`
  - Files: `packages/graph/src/fts5.test.ts`, `packages/graph/src/types.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 2. Rewrite db.test.ts for Schema Intent

  **What to do**:
  - DELETE the entire current content of `packages/graph/src/db.test.ts`
  - REWRITE from scratch to test **schema creation side-effects** — what the user cares about:
    - "When I create a database, the required tables exist and are usable"
    - "When I insert a node, it appears in FTS5 search"
    - "When I insert a node with tags, tags are queryable"
    - "Foreign keys are enforced (inserting edge with bad node_id fails)"
    - "WAL mode is enabled (concurrent reads work)"
  - Tests call **internal** `createDatabase()` function directly
  - REMOVE these fluff tests from current file:
    - `it('creates an in-memory sqlite database')` — tests SQLite, not our code
    - `it('applies foreign key PRAGMA')` — tests SQLite pragma, not behavior
    - `it('loads sqlite-vec extension and vec_version() returns a version string')` — tests extension loading
  - REPLACE with intent-based tests:
    - `it('enforces foreign keys: edge with nonexistent node_id is rejected')` — test the OUTCOME of FK enforcement
    - `it('FTS5 index is populated on node insert and searchable')` — test that search works, not that trigger fired
    - `it('tags are normalized into node_tags and filterable')` — test filtering, not row counting
    - `it('nodes_vec table accepts embeddings for stored nodes')` — test that embedding storage works

  **Must NOT do**:
  - Do not test SQLite itself (pragma values, extension versions)
  - Do not test that tables "exist" — test that they're functional
  - Do not modify source code

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Single file rewrite, well-defined scope
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3-10)
  - **Blocks**: Task 12 (performance benchmarks)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/db.test.ts` — Current file (132 lines) — read to understand what to replace
  - `packages/graph/src/db.ts` — Source: `createDatabase()` function, pragma setup, extension loading
  - `packages/graph/src/schema.ts` — DDL constants: table definitions, triggers, indexes

  **API/Type References**:
  - `packages/graph/src/nodes.ts:storeNode` — Used to insert test nodes for FTS/tag verification
  - `packages/graph/src/edges.ts:createEdge` — Used to test FK enforcement

  **Acceptance Criteria**:
  - [ ] Zero tests that check pragma values or extension version strings
  - [ ] All tests verify behavioral outcomes (FK enforcement, FTS searchability, tag filtering)
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm lint` passes
  - [ ] `pnpm typecheck` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: db.test.ts contains no pragma/extension checks
    Tool: Bash
    Preconditions: File has been rewritten
    Steps:
      1. Run: grep -ci "pragma" packages/graph/src/db.test.ts
      2. Assert: Output is "0"
      3. Run: grep -ci "vec_version" packages/graph/src/db.test.ts
      4. Assert: Output is "0"
    Expected Result: No implementation-detail tests remain
    Evidence: grep output captured

  Scenario: All tests pass after rewrite
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0
      3. Assert: "db.test.ts" shows PASS
    Expected Result: Rewritten tests pass
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(graph): rewrite db tests for schema intent, not SQLite internals`
  - Files: `packages/graph/src/db.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 3. Rewrite index.test.ts as Facade Contract Tests

  **What to do**:
  - This file tests the **Texere class facade** — it's the ONLY test that verifies the class delegates correctly to internal modules. Metis identified this as critical to keep, but it currently duplicates unit test content.
  - DELETE current content and REWRITE to test **facade contract** — "does the Texere class correctly expose all graph operations?"
  - Tests call **Texere class methods** (e.g., `db.storeNode()`, `db.search()`, `db.traverse()`)
  - Focus on what's UNIQUE to the facade:
    - Lifecycle: constructor creates usable instance, close() releases resources, double-close doesn't crash
    - Delegation: each method works (thin smoke tests — detailed testing is in unit test files)
    - Embedding integration: `search({ mode: 'semantic' })` triggers flush, returns results
    - Error propagation: facade re-throws internal errors with useful messages
    - Options forwarding: `{ minimal: true }`, `{ includeEdges: true }` are passed through
  - REMOVE all duplicate tests that retest what nodes.test.ts/edges.test.ts/search.test.ts already cover in depth
  - Current fluff to eliminate:
    - `it('creates a working database instance')` — `toBeDefined()` + `toBeInstanceOf()` only
    - Detailed assertion on every field of storeNode result (already in nodes.test.ts)
    - Detailed edge direction tests (already in edges.test.ts)
    - Detailed search filter tests (already in search.test.ts)

  **Must NOT do**:
  - Do not deeply test node/edge/search behavior — that's what unit test files are for
  - Do not test implementation details of delegation
  - Do not create a shared test helper file

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Single file rewrite, clear scope
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4-10)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/index.test.ts` — Current file (605 lines) — read to understand what to replace
  - `packages/graph/src/index.ts` — Texere class: all public methods, constructor, close()
  - `packages/graph/src/nodes.test.ts` — What NOT to duplicate (detailed node tests)
  - `packages/graph/src/search.test.ts` — What NOT to duplicate (detailed search tests)

  **Acceptance Criteria**:
  - [ ] File tests Texere class methods only (not internal functions)
  - [ ] No duplicate coverage of what nodes/edges/search tests already cover
  - [ ] Lifecycle tests present (constructor, close, double-close)
  - [ ] Options forwarding tested (minimal mode, includeEdges)
  - [ ] Error propagation tested
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: index.test.ts tests facade, not internals
    Tool: Bash
    Preconditions: File rewritten
    Steps:
      1. Run: grep -c "import.*from.*'./nodes" packages/graph/src/index.test.ts
      2. Assert: Output is "0" (no direct internal module imports)
      3. Run: grep -c "new Texere" packages/graph/src/index.test.ts
      4. Assert: Output is greater than 0 (uses Texere class)
    Expected Result: Tests use Texere facade, not internals
    Evidence: grep output

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0, "index.test.ts" shows PASS
    Expected Result: All facade tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): rewrite index tests as facade contract, remove duplication`
  - Files: `packages/graph/src/index.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 4. Fix nodes.test.ts — Test Behavior, Not Triggers

  **What to do**:
  - SURGICAL REWRITE — file is ~80% good, fix the bad parts
  - Tests call **internal** `storeNode()`, `getNode()`, `invalidateNode()` from `./nodes.ts`
  - REWRITE these tests to verify **user outcome** instead of **SQLite trigger mechanics**:
    - `it('invalidation trigger deletes from nodes_vec')` → Rewrite as: `it('invalidated nodes are excluded from vector search candidates')` — verify via a query against nodes_vec that checks no row exists, but frame it as "search won't find this" not "trigger fired"
    - `it('storeNode inserts content into FTS5 index')` → Rewrite as: `it('stored node is findable via FTS5 full-text search')` — test via an FTS MATCH query that returns the node, not by checking rowid existence
    - `it('invalidated nodes remain in FTS5 index')` → This is actually testing a design decision (FTS entries persist for audit). Keep but improve assertion: verify the node IS in FTS but would be filtered by invalidated_at in search
  - STRENGTHEN weak assertions:
    - `it('storeNode with tags creates rows in node_tags')` — Currently counts rows. Rewrite to verify tags are **retrievable and correct**: query node_tags and check actual tag values
  - INLINE test data where it matters to the test, keep `decision()` helper only where data is irrelevant to the assertion
  - KEEP all batch tests, minimal mode tests, duplicate warning tests, sources field tests — these are solid

  **Must NOT do**:
  - Do not rewrite the entire file — surgical fixes only
  - Do not remove batch/minimal/warning/sources tests
  - Do not create shared helpers

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Surgical fixes in single file
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 5-10)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/nodes.test.ts` — Current file (457 lines). Lines 101-165 need rewriting (trigger tests). Lines 167-185 need assertion strengthening.
  - `packages/graph/src/nodes.ts` — storeNode, getNode, invalidateNode implementations
  - `packages/graph/src/schema.ts` — Trigger definitions (context for understanding what behavior to test instead)

  **Acceptance Criteria**:
  - [ ] Zero direct SQL queries against `nodes_vec` to check trigger side-effects
  - [ ] FTS tests verify searchability, not rowid existence
  - [ ] Tag tests verify actual tag values, not just count
  - [ ] All existing batch/minimal/warning/sources tests still pass unchanged
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No trigger-testing patterns remain
    Tool: Bash
    Steps:
      1. Run: grep -n "nodes_vec" packages/graph/src/nodes.test.ts
      2. Assert: No lines reference nodes_vec (trigger internals removed)
      3. Run: grep -n "SELECT rowid" packages/graph/src/nodes.test.ts
      4. Assert: No rowid checks
    Expected Result: No implementation-detail tests
    Evidence: grep output

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0, "nodes.test.ts" shows PASS
    Expected Result: Rewritten tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): rewrite node tests for behavioral intent, not trigger mechanics`
  - Files: `packages/graph/src/nodes.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 5. Fix search.test.ts — Strengthen Assertions, Add Ranking Quality

  **What to do**:
  - SURGICAL FIXES — file structure is good, assertions need strengthening
  - Tests call **internal** `search()`, `searchBatch()` from `./search.ts`
  - STRENGTHEN these weak assertions:
    - `expect(results.length).toBeGreaterThanOrEqual(1)` → exact expected count where knowable
    - `expect(results.some(r => r.title.includes('...')))` → exact position assertions: `expect(results[0]!.id).toBe(expectedId)`
    - `it('supports FTS5 phrase matching with quotes')` lines 298-301 → assert exact result count AND that phrase-match result is ranked first
  - ADD ranking quality tests:
    - `it('exact title match outranks partial content match')` — store 3 nodes with varying match quality, verify order
    - `it('multi-field match outranks single-field match')` — node matching title+content ranks above title-only
    - `it('semantic search ranks closest embedding first')` — verify `results[0]` is the semantically closest node, not just "some result contains it"
    - `it('hybrid RRF boost is measurable: dual-signal node scores higher than single-signal')` — assert `results[0].match_quality > results[1].match_quality`
  - FIX test isolation: `it('auto mode detects semantic for question queries')` currently depends on embeddings being manually inserted — this is fine but should be documented in the test name

  **Must NOT do**:
  - Do not restructure the file — keep existing describe blocks
  - Do not change search behavior — only fix test assertions
  - Do not remove any existing test — only strengthen and add

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Assertion strengthening in single file
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-4, 6-10)
  - **Blocks**: Task 12 (performance benchmarks build on search patterns)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/search.test.ts` — Current file (573 lines). Lines 299, 447, 505 have weak assertions.
  - `packages/graph/src/search.ts` — search(), searchBatch(), detectSearchMode() implementations
  - `packages/graph/src/search.test.ts:99-116` — GOOD example of ranking test to follow (strongest vs weaker)

  **Acceptance Criteria**:
  - [ ] Zero `toBeGreaterThanOrEqual(1)` assertions where exact count is knowable
  - [ ] At least 3 new ranking quality tests added
  - [ ] All new ranking tests verify ORDER (results[0] vs results[1]), not just presence
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No weak assertions remain
    Tool: Bash
    Steps:
      1. Run: grep -c "toBeGreaterThanOrEqual(1)" packages/graph/src/search.test.ts
      2. Assert: Output is "0"
      3. Run: grep -c "toBeGreaterThan(0)" packages/graph/src/search.test.ts
      4. Assert: Output is "0"
    Expected Result: All assertions are strong
    Evidence: grep output

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0, "search.test.ts" shows PASS
    Expected Result: Strengthened tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): strengthen search assertions and add ranking quality tests`
  - Files: `packages/graph/src/search.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 6. Fix edges.test.ts — Minor Assertion Strengthening

  **What to do**:
  - MINOR FIXES — file is mostly solid
  - Tests call **internal** `createEdge()`, `deleteEdge()`, `getEdgesForNode()` from `./edges.ts`
  - STRENGTHEN:
    - Verify error messages in `.toThrow()` calls are specific (not just `.toThrow()` without message)
    - `it('createEdge with nonexistent source_id throws')` — assert error message contains "FOREIGN KEY" or "source" (currently just `.toThrow()`)
    - `it('createEdge with nonexistent target_id throws')` — same
    - `it('createEdge with source_id === target_id throws')` — assert message mentions "self-referential" or similar
  - ADD one missing test:
    - `it('duplicate edge between same nodes with same type is allowed')` — verify this IS or ISN'T allowed (document the behavior)

  **Must NOT do**:
  - Do not restructure the file
  - Do not change source behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Minor fixes in single file
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-5, 7-10)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/edges.test.ts` — Current file (348 lines). Lines 57-91: error assertions need messages.
  - `packages/graph/src/edges.ts` — createEdge, deleteEdge, getEdgesForNode implementations
  - `packages/graph/src/schema.ts` — CHECK constraint for self-referential edges

  **Acceptance Criteria**:
  - [ ] All `.toThrow()` assertions include expected error substring
  - [ ] Duplicate edge behavior is documented via a test
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All throw assertions have messages
    Tool: Bash
    Steps:
      1. Run: grep -n "\.toThrow()" packages/graph/src/edges.test.ts | grep -v "toThrow(" | grep -v "not.toThrow"
      2. Assert: No bare .toThrow() calls (all have message argument)
    Expected Result: Every throw assertion checks a specific message
    Evidence: grep output

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0, "edges.test.ts" shows PASS
    Expected Result: Strengthened tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): strengthen edge error assertions, add duplicate edge test`
  - Files: `packages/graph/src/edges.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 7. Fix integration.test.ts — Strengthen Semantic Search Assertions

  **What to do**:
  - SURGICAL FIXES — file tests real integration scenarios but with weak assertions
  - Tests call **Texere class methods** (facade-level integration)
  - STRENGTHEN these assertions:
    - `expect(results.some(r => r.id === authNode.id)).toBe(true)` → assert POSITION: `expect(results[0]!.id).toBe(authNode.id)` (closest semantic match should be first)
    - `expect(results[0]?.search_mode).toBe('semantic')` — good, keep
    - Add assertion on result COUNT where knowable
  - ADD ranking quality verification:
    - In "vocabulary mismatch" tests: verify the semantically-closer node ranks ABOVE the distant one, not just that it appears somewhere
    - In "hybrid RRF boost" test: verify `match_quality` of dual-match node is strictly higher than single-match
  - ADD negative precision test:
    - `it('semantic search does NOT return completely unrelated nodes')` — store 5 nodes (2 related, 3 unrelated), verify unrelated ones are NOT in results with limit=3

  **Must NOT do**:
  - Do not restructure describe blocks
  - Do not change timeouts (30_000 is needed for model loading)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Assertion strengthening in single file
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-6, 8-10)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/integration.test.ts` — Current file (231 lines). Lines 41, 67, 116 have weak assertions.
  - `packages/graph/src/search.test.ts:99-116` — Good ranking assertion pattern to follow

  **Acceptance Criteria**:
  - [ ] Zero `.some()` assertions where position is verifiable — use `results[0]!.id` instead
  - [ ] Ranking quality verified (closer match ranks higher)
  - [ ] At least 1 negative precision test (unrelated nodes excluded)
  - [ ] `pnpm test:unit` passes (this runs as unit test despite name)
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No weak .some() assertions where ordering matters
    Tool: Bash
    Steps:
      1. Run: grep -c "results.some" packages/graph/src/integration.test.ts
      2. Note count — should be reduced from current (verify at least 2 fewer than before)
    Expected Result: .some() replaced with positional assertions where possible
    Evidence: grep output

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0, "integration.test.ts" shows PASS
    Expected Result: Strengthened tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): strengthen semantic search assertions, add ranking and precision tests`
  - Files: `packages/graph/src/integration.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 8. Fix embedder.test.ts — Add Failure Scenarios

  **What to do**:
  - KEEP existing tests (they're good) — ADD failure scenarios
  - Tests call **internal** `Embedder` class from `./embedder.ts`
  - ADD these failure scenario tests in a new `describe('failure handling')` block:
    - `it('embedNode silently handles node deleted between queue and execution')` — store node, invalidate it, then call embedNode — verify no crash, no vec row
    - `it('embedPending handles empty database gracefully')` — fresh DB, call embedPending, verify returns 0, no errors
    - `it('embed returns consistent dimensions regardless of input length')` — embed a 1-word string and a 10,000-char string, both should return Float32Array of length 384
    - `it('destroy() prevents further embed calls from starting pipeline')` — call destroy(), then embed(), verify it throws or returns gracefully (document which)
  - STRENGTHEN:
    - `it('embeddings are normalized (L2 norm ≈ 1)')` — already good, but add a second test with different input to verify consistency

  **Must NOT do**:
  - Do not change the 120_000 timeout
  - Do not mock the embedding pipeline — use real embeddings
  - Do not remove existing tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Adding tests to single file
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-7, 9-10)
  - **Blocks**: Task 13 (concurrency tests may test embedder)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/embedder.test.ts` — Current file (262 lines). Lines 119-186: node embedding tests. Lines 188-260: debounce tests.
  - `packages/graph/src/embedder.ts` — Embedder class: embed(), embedBatch(), embedNode(), embedPending(), schedulePending(), flushPending(), destroy()

  **Acceptance Criteria**:
  - [ ] At least 4 new failure scenario tests added
  - [ ] All existing tests unchanged and passing
  - [ ] Failure tests verify graceful handling (no crashes)
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Failure tests exist and pass
    Tool: Bash
    Steps:
      1. Run: grep -c "failure\|Failure\|error\|graceful\|silently" packages/graph/src/embedder.test.ts
      2. Assert: Count > 0 (failure scenario tests exist)
      3. Run: pnpm test:unit --reporter=verbose 2>&1
      4. Assert: Exit code 0, "embedder.test.ts" shows PASS
    Expected Result: Failure scenarios added and passing
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): add embedder failure scenarios (deleted nodes, empty DB, destroy)`
  - Files: `packages/graph/src/embedder.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 9. Create replace-node.test.ts — New Dedicated Test File

  **What to do**:
  - CREATE `packages/graph/src/replace-node.test.ts` — Metis identified this critical gap: `replace-node.ts` is an atomic transactional module with `.immediate()` transactions and has ZERO dedicated unit tests
  - Tests call **internal** `replaceNode()` from `./replace-node.ts`
  - Currently tested only at facade level in `index.int.test.ts` — needs unit-level coverage
  - Tests to write:
    - `it('replaces node atomically: new node created, old node invalidated, REPLACES edge created')` — verify all three outcomes in one transaction
    - `it('new node has different ID from old node')` — ID is fresh nanoid
    - `it('REPLACES edge points from old to new')` — verify edge direction
    - `it('old node invalidated_at is set to current timestamp')` — verify timestamp is recent
    - `it('throws when old_id does not exist')` — error handling
    - `it('throws when old node is already invalidated')` — can't replace an invalidated node
    - `it('rolls back atomically on invalid type-role combination')` — if new node validation fails, old node is NOT invalidated
    - `it('preserves edges pointing TO old node after replacement')` — incoming edges on old node still exist
    - `it('minimal mode returns only { id } for new node')` — options forwarding

  **Must NOT do**:
  - Do not duplicate index.int.test.ts tests — these are unit-level, testing the internal function
  - Do not modify source code
  - Do not create shared helpers

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: New test file creation, well-defined scope
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-8, 10)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/replace-node.ts` — Source file to test: replaceNode() function with .immediate() transaction
  - `packages/graph/src/index.int.test.ts:140-267` — Existing facade-level replaceNode tests (shows what behaviors exist, but tests Texere class not internal function)
  - `packages/graph/src/nodes.test.ts` — Follow this test pattern: same beforeEach/afterEach, same import style, same factory helpers

  **API/Type References**:
  - `packages/graph/src/replace-node.ts` — Function signature, ReplaceNodeInput type
  - `packages/graph/src/types.ts` — NodeType, NodeRole, EdgeType enums

  **Acceptance Criteria**:
  - [ ] `packages/graph/src/replace-node.test.ts` exists as new file
  - [ ] At least 8 test cases covering: happy path, atomicity, error handling, rollback, minimal mode
  - [ ] Tests call internal `replaceNode()` function, not Texere class
  - [ ] Rollback test verifies old node is NOT invalidated on failure
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm lint` passes
  - [ ] `pnpm typecheck` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: File exists with correct test count
    Tool: Bash
    Steps:
      1. Run: ls packages/graph/src/replace-node.test.ts
      2. Assert: File exists
      3. Run: grep -c "it(" packages/graph/src/replace-node.test.ts
      4. Assert: Count >= 8
    Expected Result: New file with comprehensive tests
    Evidence: ls and grep output

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose 2>&1
      2. Assert: Exit code 0, "replace-node.test.ts" shows PASS
    Expected Result: All new tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): add dedicated replace-node unit tests (atomicity, rollback, errors)`
  - Files: `packages/graph/src/replace-node.test.ts`
  - Pre-commit: `pnpm test:unit`

---

- [ ] 10. Fix traverse.test.ts + index.int.test.ts + tools.test.ts — Minor Improvements

  **What to do**:
  - THREE files with minor fixes, grouped into one task because changes are small
  
  **traverse.test.ts** (calls internal `traverse()`, `about()`, `stats()`):
  - STRENGTHEN: `it('handles cycles without infinite recursion via depth limit')` line 241 — `expect(result.length).toBeLessThanOrEqual(3)` is weak. Assert exact: `expect(result).toHaveLength(2)` (only b and c are reachable, and CTE deduplicates)
  - Verify: all tests already have strong positional assertions — mostly good
  
  **index.int.test.ts** (calls Texere class — facade integration):
  - STRENGTHEN: `expect(searchResults.length).toBeGreaterThan(0)` line 97 → assert exact expected count or at minimum verify the correct node is `results[0]`
  - STRENGTHEN: `expect(traverseResults.length).toBeGreaterThanOrEqual(1)` line 106 → assert exact count (should be 1, since fix→solution is 1 hop)
  - STRENGTHEN: `expect(aboutResults.length).toBeGreaterThan(0)` line 115 → verify specific node IDs
  
  **tools.test.ts** (calls `mcp.callTool()` — MCP wrapper tests):
  - CLEAN: Remove `(result.structuredContent as any)` casts where possible — use proper typing or at minimum type the extraction helper
  - STRENGTHEN: `expect((result.structuredContent as any).results.length).toBeGreaterThan(0)` → exact counts where knowable

  **Must NOT do**:
  - Do not restructure any of these files
  - Do not remove tests — only strengthen assertions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Minor fixes across 3 files, well-scoped
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-9)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `packages/graph/src/traverse.test.ts` — Line 241: weak cycle assertion
  - `packages/graph/src/index.int.test.ts` — Lines 97, 106, 115: weak toBeGreaterThan assertions
  - `apps/mcp/src/tools.test.ts` — Multiple `(result.structuredContent as any)` casts

  **Acceptance Criteria**:
  - [ ] Zero `toBeGreaterThan(0)` in traverse.test.ts where exact count is knowable
  - [ ] Zero `toBeGreaterThan(0)` in index.int.test.ts where exact count is knowable
  - [ ] `as any` casts reduced in tools.test.ts (at least extraction helpers typed)
  - [ ] `pnpm test:unit` passes
  - [ ] `pnpm test:integration` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Weak assertions removed
    Tool: Bash
    Steps:
      1. Run: grep -c "toBeGreaterThan(0)" packages/graph/src/traverse.test.ts
      2. Assert: Output is "0"
      3. Run: grep -c "toBeGreaterThan(0)\|toBeGreaterThanOrEqual(1)" packages/graph/src/index.int.test.ts
      4. Assert: Output is "0"
    Expected Result: All weak assertions replaced with exact values
    Evidence: grep output

  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit --reporter=verbose && pnpm test:integration --reporter=verbose 2>&1
      2. Assert: Exit code 0
    Expected Result: All three files pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test: strengthen assertions in traverse, index.int, and tools tests`
  - Files: `packages/graph/src/traverse.test.ts`, `packages/graph/src/index.int.test.ts`, `apps/mcp/src/tools.test.ts`
  - Pre-commit: `pnpm test:unit && pnpm test:integration`

---

- [ ] 11. Rewrite server.int.test.ts as True Integration Tests

  **What to do**:
  - KEEP existing workflow tests that are genuinely integration-level (they go through MCP server factory)
  - ADD true integration tests that test **cross-boundary behavior** the unit tests can't:
    - `describe('malformed input handling')`:
      - `it('handles completely missing arguments gracefully')` — callTool with `{}`
      - `it('handles extra unknown fields without crashing')` — callTool with extra properties
      - `it('handles null/undefined values in required fields')` — edge cases
      - `it('handles extremely long strings without crash')` — title with 100k chars
    - `describe('error boundary propagation')`:
      - `it('database errors surface as structured TOOL_ERROR responses')` — trigger a real DB error, verify error code and message
      - `it('validation errors include field-level details')` — invalid type-role combo shows which field failed
      - `it('concurrent tool calls to same server instance dont corrupt state')` — Promise.all multiple callTool
    - `describe('schema compliance')`:
      - KEEP and STRENGTHEN existing `tools/list` schema regression test
      - ADD: `it('every tool input schema has required fields documented')` — verify each schema has `required` array
    - KEEP the stdio handshake test — it's genuinely excellent
  - REMOVE tests that are just store→get round trips (already tested in tools.test.ts):
    - The "round-trip: store_node -> get_node" describe block is duplicated from tools.test.ts
    - "invalidate_node -> get_node -> verify invalidated_at" is a unit test, not integration
    - "node storage without source field" is a unit test

  **Must NOT do**:
  - Do not remove the stdio handshake test
  - Do not remove schema regression tests
  - Do not modify server source code

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex rewrite requiring understanding of MCP protocol and error boundaries
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 13)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/mcp/src/server.int.test.ts` — Current file (695 lines). Lines 633-693: excellent stdio test to keep. Lines 69-96: unit test disguised as integration (remove).
  - `apps/mcp/src/server.ts` — createTexereMcpServer() factory, callToolHandler, error handling
  - `apps/mcp/src/tools/helpers.ts` — ok(), invalidInput(), toolFailure() response helpers
  - `apps/mcp/src/tools/types.ts` — ToolCallResult type, error codes

  **Acceptance Criteria**:
  - [ ] Malformed input tests present (missing args, extra fields, null values, long strings)
  - [ ] Error boundary tests present (DB errors, validation errors with field details)
  - [ ] Concurrent tool call test present
  - [ ] Stdio handshake test preserved
  - [ ] Unit-test-disguised-as-integration tests removed (store→get round trips moved or deleted)
  - [ ] `pnpm test:integration` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Malformed input tests exist
    Tool: Bash
    Steps:
      1. Run: grep -c "malformed\|missing.*arg\|extra.*field\|null\|undefined" apps/mcp/src/server.int.test.ts
      2. Assert: Count > 0
    Expected Result: Error handling tests present
    Evidence: grep output

  Scenario: Tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:integration --reporter=verbose 2>&1
      2. Assert: Exit code 0, "server.int.test.ts" shows PASS
    Expected Result: Rewritten integration tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(mcp): rewrite server integration tests for error boundaries and protocol compliance`
  - Files: `apps/mcp/src/server.int.test.ts`
  - Pre-commit: `pnpm test:integration`

---

- [ ] 12. Add Performance Benchmarks

  **What to do**:
  - ADD new `describe('performance benchmarks')` blocks to relevant test files
  - These are INTEGRATION tests — add to `packages/graph/src/index.int.test.ts` (uses Texere class)
  - Benchmarks to add:
    - `describe('performance benchmarks', { timeout: 60_000 })`:
      - `it('keyword search completes in <200ms with 10,000 nodes')`:
        - Bulk insert 10,000 nodes using batch storeNode (50 per batch, 200 batches)
        - Run keyword search
        - Assert: `elapsed < 200` (milliseconds)
      - `it('traverse depth-5 completes in <100ms with 1,000-node graph')`:
        - Create a graph with 1,000 nodes and ~2,000 edges (tree-like)
        - Traverse from root with maxDepth 5
        - Assert: `elapsed < 100`
      - `it('batch storeNode (50 nodes) completes in <50ms')`:
        - Time a single batch of 50 nodes
        - Assert: `elapsed < 50`
      - `it('stats() completes in <20ms with 10,000 nodes')`:
        - After bulk insert, time stats()
        - Assert: `elapsed < 20`
  - Use `performance.now()` for timing
  - Set generous time limits that catch REGRESSIONS (not micro-optimization). If search takes 50ms today, set limit at 200ms. The point is catching 10x regressions, not enforcing tight SLAs.

  **Must NOT do**:
  - Do not set unrealistically tight time limits (these run on CI too)
  - Do not modify source code for performance
  - Do not add embedding benchmarks (model loading time is external dependency)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires designing bulk data insertion and timing infrastructure
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 5 (needs stable test patterns)

  **References**:

  **Pattern References**:
  - `packages/graph/src/index.int.test.ts` — Add benchmarks here (uses Texere class, already has lifecycle setup)
  - `packages/graph/src/nodes.ts:storeNode` — Batch overload accepts array of up to 50
  - `packages/graph/src/search.ts` — search() function being benchmarked
  - `packages/graph/src/traverse.ts` — traverse() function being benchmarked

  **Acceptance Criteria**:
  - [ ] At least 4 performance benchmark tests added
  - [ ] Each benchmark uses `performance.now()` and asserts `elapsed < threshold`
  - [ ] Thresholds are generous (catch 10x regressions, not tight SLAs)
  - [ ] 10,000-node bulk insert works without error
  - [ ] `pnpm test:integration` passes (benchmarks run with integration tests due to timeout)
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Benchmarks exist and pass
    Tool: Bash
    Steps:
      1. Run: grep -c "performance.now\|elapsed\|benchmark" packages/graph/src/index.int.test.ts
      2. Assert: Count > 0
      3. Run: pnpm test:integration --reporter=verbose 2>&1
      4. Assert: Exit code 0, benchmark tests show PASS
    Expected Result: Performance benchmarks pass within thresholds
    Evidence: Test output with timing info
  ```

  **Commit**: YES
  - Message: `test(graph): add performance benchmarks (10k-node search, traverse, batch insert)`
  - Files: `packages/graph/src/index.int.test.ts`
  - Pre-commit: `pnpm test:integration`

---

- [ ] 13. Add Concurrency Tests

  **What to do**:
  - ADD new `describe('concurrency')` block to `packages/graph/src/index.int.test.ts`
  - Tests call **Texere class methods** (facade level)
  - Concurrency scenarios to test:
    - `it('concurrent storeNode calls do not corrupt data')`:
      - Launch 10 parallel `db.storeNode()` via `Promise.all` (even though storeNode is sync, test that rapid sequential calls don't interleave)
      - Verify: all 10 nodes exist with correct data, stats shows exactly 10
    - `it('storeNode during search does not cause errors')`:
      - Start a search, storeNode in parallel
      - Verify: neither operation throws
    - `it('invalidateNode during traverse does not crash')`:
      - Build graph, start traverse, invalidate a node during traversal
      - Verify: traverse completes without error (may or may not include invalidated node depending on timing — just verify no crash)
    - `it('concurrent batch operations maintain atomicity')`:
      - Run two batch storeNode calls in parallel (2x 50 nodes)
      - Verify: exactly 100 nodes exist, no partial batches
    - `it('replaceNode is atomic under concurrent access')`:
      - Store a node, then concurrently: replaceNode + getNode
      - Verify: getNode returns either old (not yet replaced) or new (already replaced), never corrupted state
  - NOTE: SQLite with WAL mode serializes writes, so these tests verify that the library handles this gracefully rather than testing true parallelism

  **Must NOT do**:
  - Do not expect true parallel writes (SQLite serializes)
  - Do not use worker threads (single-process is fine)
  - Do not modify source code

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Concurrency test design requires careful thinking about race conditions
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: None
  - **Blocked By**: Task 8 (embedder failure handling informs concurrency patterns)

  **References**:

  **Pattern References**:
  - `packages/graph/src/index.int.test.ts` — Add concurrency tests here
  - `packages/graph/src/db.ts` — WAL mode setup, transaction handling
  - `packages/graph/src/replace-node.ts` — `.immediate()` transaction pattern

  **Acceptance Criteria**:
  - [ ] At least 4 concurrency tests added
  - [ ] Tests use `Promise.all` or rapid sequential calls to exercise concurrent access
  - [ ] All tests verify data integrity after concurrent operations
  - [ ] No tests expect true parallel writes (acknowledge SQLite serialization)
  - [ ] `pnpm test:integration` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Concurrency tests exist and pass
    Tool: Bash
    Steps:
      1. Run: grep -c "concurrent\|Concurrent\|Promise.all\|concurrency" packages/graph/src/index.int.test.ts
      2. Assert: Count > 0
      3. Run: pnpm test:integration --reporter=verbose 2>&1
      4. Assert: Exit code 0
    Expected Result: Concurrency tests pass
    Evidence: Test output
  ```

  **Commit**: YES
  - Message: `test(graph): add concurrency tests (parallel writes, read+write overlap, atomic replace)`
  - Files: `packages/graph/src/index.int.test.ts`
  - Pre-commit: `pnpm test:integration`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `test(graph): delete exploration code and enum-counting fluff` | fts5.test.ts, types.test.ts | pnpm test:unit |
| 2 | `test(graph): rewrite db tests for schema intent` | db.test.ts | pnpm test:unit |
| 3 | `test(graph): rewrite index tests as facade contract` | index.test.ts | pnpm test:unit |
| 4 | `test(graph): rewrite node tests for behavioral intent` | nodes.test.ts | pnpm test:unit |
| 5 | `test(graph): strengthen search assertions and add ranking` | search.test.ts | pnpm test:unit |
| 6 | `test(graph): strengthen edge error assertions` | edges.test.ts | pnpm test:unit |
| 7 | `test(graph): strengthen semantic search assertions` | integration.test.ts | pnpm test:unit |
| 8 | `test(graph): add embedder failure scenarios` | embedder.test.ts | pnpm test:unit |
| 9 | `test(graph): add dedicated replace-node unit tests` | replace-node.test.ts | pnpm test:unit |
| 10 | `test: strengthen assertions in traverse, index.int, tools` | 3 files | pnpm test:unit && pnpm test:integration |
| 11 | `test(mcp): rewrite server integration tests` | server.int.test.ts | pnpm test:integration |
| 12 | `test(graph): add performance benchmarks` | index.int.test.ts | pnpm test:integration |
| 13 | `test(graph): add concurrency tests` | index.int.test.ts | pnpm test:integration |

---

## Success Criteria

### Verification Commands
```bash
pnpm test:unit          # Expected: all PASS, 0 failures
pnpm test:integration   # Expected: all PASS, 0 failures
pnpm lint               # Expected: 0 errors
pnpm typecheck          # Expected: 0 errors
pnpm quality            # Expected: all checks pass
```

### Final Checklist
- [ ] Zero tests that count enum values
- [ ] Zero tests with only `toBeDefined()` / `toBeInstanceOf()` assertions
- [ ] Zero tests with `console.log`
- [ ] Zero `toBeGreaterThan(0)` where exact count is knowable
- [ ] `fts5.test.ts` deleted
- [ ] `replace-node.test.ts` exists with ≥8 tests
- [ ] Performance benchmarks pass within thresholds
- [ ] Concurrency tests verify data integrity
- [ ] MCP integration tests cover error boundaries
- [ ] Every test name answers "what user outcome does this verify?"
- [ ] `pnpm quality` passes clean
