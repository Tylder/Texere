# Option 1: Temp IDs + Inline Edges

## TL;DR

> **Quick Summary**: Enhance all 5 per-type store tools to accept `temp_id` on nodes and an optional
> `edges` array alongside nodes. Edges can reference call-scoped temp_ids or existing real IDs. All
> within a single atomic transaction per store call. Includes unit tests, integration tests, and full
> documentation updates (README, AGENTS.md, SKILL.md).
>
> **Deliverables**:
> - New `storeNodesWithEdges()` function in graph library
> - Updated schemas for all 5 store MCP tools (temp_id + edges)
> - Unit tests for temp_id resolution + edge creation
> - Integration tests for all 5 updated tools
> - Updated README.md, AGENTS.md (root + apps/mcp + packages/graph), SKILL.md
>
> **Estimated Effort**: Medium (~6-10 hours)
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 6

---

## Context

### Original Request

Implement Option 1 from `docs/batch-api-design-options.md` — add temp_id + inline edges to all 5
per-type store tools. Include unit tests, integration tests, README updates, tool definition updates,
and SKILL.md updates. User explicitly warned: "careful here do not mix read and write sections and
keep it clean" regarding SKILL.md.

### Interview Summary

**Key Discussions**:
- Per-type tools are sacred: 5 separate store tools must be preserved for schema-level agent guidance
- temp_ids are call-scoped only — no persistence, no server-side state
- Edges in a store call reference temp_ids from same call OR existing real IDs
- Response echoes temp_id per node and includes created edges with resolved real IDs
- Option 4 (staged transactions) is designed/documented but deferred — ship Option 1 first

**Research Findings**:
- `validate.ts` already handles temp_id pattern (collects into Set, validates edges against temp_ids
  OR DB nodes) — exact precedent
- `replaceNode` calls `createEdge()` inside a `db.transaction().immediate()` — proven nested
  transaction pattern via better-sqlite3 savepoints
- `insertNodeWithAnchors()` creates auto-provenance edges (sources→BASED_ON, anchor_to→ANCHORED_TO)
  via raw prepared statements — inline edges compose alongside these
- All 5 store tools have identical execute structure — changes are mechanical once pattern established

### Metis Review

**Identified Gaps** (addressed):
- **FK constraint ordering**: edges table has FK to nodes(id) — nodes MUST be inserted before edges.
  Solved by two-phase transaction (nodes first, then edges)
- **Overload explosion**: Adding edges to `storeNode()` would create 8+ overloads. Solved by
  creating new `storeNodesWithEdges()` function instead
- **REPLACES auto-invalidation**: Inline REPLACES edges must auto-invalidate source node. Solved by
  delegating to existing `createEdge()` which handles this
- **FK error messages**: Raw FK failures are cryptic. Solved by pre-validating real ID existence
  before transaction
- **temp_id shadowing**: If temp_id matches an existing DB node ID, temp_id takes priority. Follows
  validate tool convention

---

## Work Objectives

### Core Objective

Add call-scoped temp_id + inline edges support to all 5 per-type store MCP tools, enabling agents to
create nodes and same-type edges in a single atomic tool call without manual ID bookkeeping.

### Concrete Deliverables

- `packages/graph/src/nodes.ts` — New `storeNodesWithEdges()` function
- `packages/graph/src/types.ts` — `InlineEdgeInput` type
- `packages/graph/src/index.ts` — Texere class `storeNodesWithEdges()` method + exports
- `apps/mcp/src/tools/store-knowledge.ts` — temp_id + edges schema
- `apps/mcp/src/tools/store-issue.ts` — temp_id + edges schema
- `apps/mcp/src/tools/store-action.ts` — temp_id + edges schema
- `apps/mcp/src/tools/store-artifact.ts` — temp_id + edges schema
- `apps/mcp/src/tools/store-source.ts` — temp_id + edges schema
- `packages/graph/src/nodes.test.ts` — Unit tests for storeNodesWithEdges
- `apps/mcp/src/tools.test.ts` — Integration tests for temp_id + edges
- `README.md` — Updated MCP tools description
- `AGENTS.md` — Updated root knowledge base
- `apps/mcp/AGENTS.md` — Updated MCP app docs
- `packages/graph/AGENTS.md` — Updated graph library docs
- `.opencode/skills/texere/SKILL.md` — Updated WRITE section with temp_id + edges docs

### Definition of Done

- [ ] `pnpm quality` passes (format:check + lint + typecheck + test:unit)
- [ ] `pnpm test:integration` passes
- [ ] All 5 store tools accept temp_id + edges
- [ ] Backward compatibility: existing calls without temp_id/edges work identically
- [ ] Documentation is accurate and reflects new capabilities

### Must Have

- temp_id field on node objects in all 5 store tools
- edges array on all 5 store tools (sibling of nodes and minimal)
- Single-transaction atomicity (nodes + edges roll back together)
- temp_id echo in response
- Created edges in response (with resolved real IDs)
- Pre-transaction validation: duplicate temp_ids, dangling temp_id refs, self-referential edges
- Real ID existence pre-check (better error than raw FK failure)
- Unit tests for new function
- Integration tests for MCP tools
- README.md, all AGENTS.md files, SKILL.md updated

### Must NOT Have (Guardrails)

- ❌ DO NOT modify `storeNode()` overloads — create new `storeNodesWithEdges()` function instead
- ❌ DO NOT modify `Node` or `MinimalNode` types — temp_id echoing is MCP tool-layer presentation
- ❌ DO NOT add temp_id to database schema — call-scoped only, never persisted
- ❌ DO NOT add temp_id to `texere_create_edge` — out of scope
- ❌ DO NOT add temp_id to `texere_replace_node` — out of scope
- ❌ DO NOT modify `createEdge()` in edges.ts — reuse as-is inside transaction
- ❌ DO NOT modify the validate tool — it already handles temp_ids correctly
- ❌ DO NOT use `anyOf`/`oneOf`/`allOf` in MCP schemas — flat schemas only (project constraint)
- ❌ DO NOT touch the READ section of SKILL.md — user explicitly warned about this
- ❌ DO NOT refactor existing store tool code paths when no edges are present (but DO merge
  temp_ids onto response nodes — this is additive, not a refactor)
- ❌ DO NOT implement Option 4 (staged transactions) — deferred
- ❌ DO NOT add semantic edge type validation (e.g. "RESOLVES should go action→issue")

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (Vitest, co-located tests)
- **Automated tests**: YES (Tests-after — write impl then tests)
- **Framework**: Vitest (existing)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Verification tool by deliverable type:

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Library code | Bash (`pnpm test:unit`) | Run unit tests, assert pass |
| MCP tools | Bash (`pnpm test:unit`) | Run tool tests, assert pass |
| Type safety | Bash (`pnpm typecheck`) | Assert zero errors |
| Code quality | Bash (`pnpm quality`) | Assert all checks pass |
| Documentation | Grep/Read | Verify content accuracy |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Core types + new function (graph library)
└── (sequential — foundation for everything)

Wave 2 (After Wave 1):
├── Task 2: Update all 5 store MCP tools (mechanical, parallel-safe)
├── Task 3: Unit tests for storeNodesWithEdges
└── (Task 2 and 3 can run in parallel)

Wave 3 (After Wave 2):
├── Task 4: Integration tests for MCP tools (needs Task 2)
├── Task 5: Documentation updates (README, AGENTS.md, SKILL.md)
└── (Task 4 and 5 can run in parallel)

Wave 4 (After Wave 3):
└── Task 6: Quality gate verification (needs all previous)

Critical Path: Task 1 → Task 2 → Task 4 → Task 6
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | None (foundation) |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 6 | 2 |
| 4 | 2 | 6 | 5 |
| 5 | 1 | 6 | 4 |
| 6 | 3, 4, 5 | None (final) | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `task(category="unspecified-high", load_skills=["texere"])` |
| 2 | 2, 3 | `task(category="quick", load_skills=["texere"])` × 2 parallel |
| 3 | 4, 5 | `task(category="quick", load_skills=["texere"])` × 2 parallel |
| 4 | 6 | `task(category="quick", load_skills=["texere"])` |

---

## TODOs

- [ ] 1. Core Library: New `storeNodesWithEdges()` function + types

  **What to do**:

  1. In `packages/graph/src/types.ts`:
     - Add `InlineEdgeInput` interface: `{ source_id: string; target_id: string; type: EdgeType }`
     - Export it

  2. In `packages/graph/src/nodes.ts`:
     - Add `temp_id?: string` to `StoreNodeInput` interface
     - Create new `StoreNodesWithEdgesResult` type:
       ```typescript
       interface StoreNodesWithEdgesResult {
         nodes: Array<Node & { temp_id?: string }>;
         edges: Edge[];
       }
       interface MinimalStoreNodesWithEdgesResult {
         nodes: Array<MinimalNode & { temp_id?: string }>;
         edges: MinimalEdge[];
       }
       ```
     - Create new exported function `storeNodesWithEdges()` with 2 overloads:
       ```typescript
       export function storeNodesWithEdges(
         db: Database.Database,
         nodes: StoreNodeInput[],
         edges: InlineEdgeInput[],
         options?: StoreNodeOptions & { minimal?: false },
       ): StoreNodesWithEdgesResult;
       export function storeNodesWithEdges(
         db: Database.Database,
         nodes: StoreNodeInput[],
         edges: InlineEdgeInput[],
         options: StoreNodeOptions & { minimal: true },
       ): MinimalStoreNodesWithEdgesResult;
       ```
     - Implementation:
       a. Validate batch limits (nodes ≤ 50, edges ≤ 50)
       b. Pre-validate all type-role combinations
       c. Collect temp_ids into a Map — reject duplicates
       d. Pre-validate edges: reject self-referential (same temp_id both sides), reject dangling
          temp_id refs (referenced in edge but not on any node)
       e. Pre-validate real IDs in edges: for any edge ID not in temp_id Map, call `getNode(db, id)`
          — throw descriptive error if not found
       f. Open `db.transaction(() => {...}).immediate()`:
          - Phase 1: Insert all nodes via existing `insertNodeWithAnchors()` pattern, building
            `tempToReal` Map
          - Phase 2: Resolve edge source_id/target_id (temp_id → real ID via Map, real ID passthrough),
            call `createEdge(db, resolvedEdge)` for each edge (reuses REPLACES auto-invalidation)
       g. Build and return result with temp_id echoed on nodes

  3. In `packages/graph/src/index.ts`:
     - Import new function and types
     - Add `storeNodesWithEdges()` method to Texere class with 2 overloads (mirrors storeNode pattern)
     - Call `this.embedder.schedulePending()` after the call
     - Add new types to the `export type` block

  **Must NOT do**:
  - DO NOT modify existing `storeNode()` function or its overloads
  - DO NOT modify `createEdge()` in edges.ts
  - DO NOT add temp_id to database schema or Node interface
  - DO NOT modify `MinimalNode` or `Node` types in types.ts

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core library change affecting multiple files with complex type system, transaction
      logic, and careful API design. Not UI work, not trivially quick.
  - **Skills**: [`texere`]
    - `texere`: Knowledge of project conventions, type system, transaction patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/graph/src/nodes.ts:207-298` — `storeNode()` implementation: overload pattern, batch
    handling, `buildNode()` helper, `insertNodeWithAnchors()` transaction, minimal vs full response
  - `packages/graph/src/nodes.ts:125-185` — `insertNodeWithAnchors()`: how auto-provenance (sources,
    anchor_to) edges are created inside transaction. Inline edges compose AFTER this.
  - `packages/graph/src/replace-node.ts:40-65` — Proven pattern: calling `createEdge()` inside
    `db.transaction().immediate()`. This is the exact pattern for inline edge creation.
  - `packages/graph/src/edges.ts:97-141` — `createEdge()` batch implementation: single + batch
    overloads, FK validation, REPLACES auto-invalidation logic at lines 115-117.

  **API/Type References** (contracts to implement against):
  - `packages/graph/src/types.ts:1-56` — NodeType, NodeRole, EdgeType enums
  - `packages/graph/src/types.ts:98-106` — Edge interface (return type for created edges)
  - `packages/graph/src/nodes.ts:7-17` — `StoreNodeInput` interface (add temp_id here)
  - `packages/graph/src/nodes.ts:27` — `MinimalNode` type
  - `packages/graph/src/edges.ts:8-14` — `CreateEdgeInput` and `MinimalEdge` types

  **Validation Reference** (temp_id handling precedent):
  - `apps/mcp/src/tools/validate.ts:77-140` — How validate tool collects temp_ids into Set,
    resolves edge references against temp_ids OR DB nodes. This is the exact validation logic
    pattern to follow.

  **Architecture Reference**:
  - `packages/graph/src/index.ts:58-83` — Texere class `storeNode()` wrapper: overload signatures,
    `(storeNodeImpl as any)` cast pattern, `schedulePending()` call. Follow this for the new method.
  - `docs/batch-api-design-options.md:192-216` — Option 1 implementation pseudocode

  **Acceptance Criteria**:

  - [ ] `StoreNodeInput` interface has `temp_id?: string` field
  - [ ] `InlineEdgeInput` type exported from types.ts
  - [ ] `storeNodesWithEdges()` function exported from nodes.ts with 2 overloads
  - [ ] Texere class has `storeNodesWithEdges()` method with 2 overloads
  - [ ] New types exported from `packages/graph/src/index.ts`
  - [ ] `pnpm typecheck` passes with zero errors
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Typecheck passes after core changes
    Tool: Bash
    Preconditions: Task 1 changes applied
    Steps:
      1. Run: pnpm typecheck
      2. Assert: exit code 0
      3. Assert: no errors in output
    Expected Result: All type definitions are valid
    Evidence: Command output captured

  Scenario: Lint passes after core changes
    Tool: Bash
    Preconditions: Task 1 changes applied
    Steps:
      1. Run: pnpm lint
      2. Assert: exit code 0
    Expected Result: No lint errors
    Evidence: Command output captured
  ```

  **Commit**: YES
  - Message: `feat(graph): add storeNodesWithEdges function with temp_id resolution`
  - Files: `packages/graph/src/nodes.ts`, `packages/graph/src/types.ts`,
    `packages/graph/src/index.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 2. MCP Tools: Update all 5 store tools with temp_id + edges

  **What to do**:

  For each of the 5 store tools (`store-knowledge.ts`, `store-issue.ts`, `store-action.ts`,
  `store-artifact.ts`, `store-source.ts`):

  1. **Add temp_id to node schema** — add `temp_id: z.string().min(1).optional()` to the per-type
     node schema object (e.g., `knowledgeNodeSchema`). Place it as the FIRST field for visibility.

  2. **Add edges array to input schema** — add to the `inputSchema` z.object (sibling of `nodes`
     and `minimal`):
     ```typescript
     edges: z.array(z.object({
       source_id: z.string().min(1),
       target_id: z.string().min(1),
       type: z.nativeEnum(EdgeType),
     })).max(50).optional(),
     ```
     Import `EdgeType` from `@texere/graph`.

  3. **Update execute function** — branch on edges presence:
     ```typescript
     execute: ({ db }, input) => {
       const minimal = input.minimal ?? true;
       const nodeInputs: StoreNodeInput[] = input.nodes.map((n) => ({
         type: NodeType.Knowledge,  // or appropriate type
         role: n.role as NodeRole,
         title: n.title,
         content: n.content,
         ...(n.tags !== undefined ? { tags: n.tags } : {}),
         importance: n.importance,
         confidence: n.confidence,
         ...(n.anchor_to !== undefined ? { anchor_to: n.anchor_to } : {}),
         ...(n.sources !== undefined ? { sources: n.sources } : {}),
         ...(n.temp_id !== undefined ? { temp_id: n.temp_id } : {}),
       }));

       // If edges present, use new atomic function
       if (input.edges && input.edges.length > 0) {
         const result = minimal
           ? db.storeNodesWithEdges(nodeInputs, input.edges, { minimal: true })
           : db.storeNodesWithEdges(nodeInputs, input.edges);
         return ok(result as unknown as Record<string, unknown>);
       }

       // No edges — use existing storeNode path, then merge temp_ids into response
       let storedNodes;
       if (nodeInputs.length === 1) {
         const result = minimal
           ? db.storeNode(nodeInputs[0]!, { minimal: true })
           : db.storeNode(nodeInputs[0]!);
         storedNodes = [result];
       } else {
         storedNodes = minimal
           ? db.storeNode(nodeInputs, { minimal: true })
           : db.storeNode(nodeInputs);
       }
       // Merge temp_ids from input onto response nodes (by array index)
       const nodesWithTempIds = (Array.isArray(storedNodes) ? storedNodes : [storedNodes]).map(
         (node, i) => {
           const tempId = input.nodes[i]?.temp_id;
           return tempId ? { ...node, temp_id: tempId } : node;
         }
       );
       return ok({ nodes: nodesWithTempIds } as unknown as Record<string, unknown>);
     },
     ```

  4. **Update tool description** — append to the existing description string:
     `" Supports 'temp_id' on nodes and optional 'edges' array for atomic node+edge creation within a single call."`

  5. **Update imports** — add `EdgeType` and `type InlineEdgeInput` to the import from `@texere/graph`.

  **Apply the SAME changes to ALL 5 store tools.** The only difference per tool is the `NodeType`
  constant (Knowledge, Issue, Action, Artifact, Source) and the role enum values.

  **Must NOT do**:
  - DO NOT change the no-edges code path — backward compatibility is critical
  - DO NOT use `anyOf`/`oneOf`/`allOf` in schemas
  - DO NOT add temp_id to the response Node type — it's echoed via the result from
    `storeNodesWithEdges()`
  - DO NOT modify `apps/mcp/src/tools/validate.ts` — it already works
  - DO NOT modify `apps/mcp/src/tools/create-edge.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical, repetitive changes across 5 files following an established pattern. Once
      the first tool is done, the other 4 are copy-paste with enum changes.
  - **Skills**: [`texere`]
    - `texere`: Tool definition conventions, import patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `apps/mcp/src/tools/store-knowledge.ts` — Full reference implementation (59 lines). This is the
    template — understand the exact pattern before modifying. Note: `knowledgeNodeSchema` (line 8),
    `inputSchema` (line 19), `execute` (line 32), node mapping (lines 34-44), single vs batch
    branching (lines 46-56).
  - `apps/mcp/src/tools/store-action.ts` — Second example for comparison. Same pattern, different
    NodeType + roles.
  - `apps/mcp/src/tools/store-issue.ts` — Same pattern.
  - `apps/mcp/src/tools/store-artifact.ts` — Same pattern.
  - `apps/mcp/src/tools/store-source.ts` — Same pattern.

  **API/Type References**:
  - `packages/graph/src/types.ts:43-56` — `EdgeType` enum (import for edge schema)
  - `packages/graph/src/nodes.ts` — `StoreNodeInput` interface with new `temp_id` field (from Task 1)
  - `packages/graph/src/index.ts` — `Texere.storeNodesWithEdges()` method (from Task 1)

  **Validation Reference**:
  - `apps/mcp/src/tools/validate.ts:39-48` — Edge schema in validate tool. Use same pattern for
    the edges array in store tools.

  **Acceptance Criteria**:

  - [ ] All 5 store tools accept `temp_id` on nodes (optional string)
  - [ ] All 5 store tools accept `edges` array (optional, max 50, with source_id, target_id, type)
  - [ ] Calls without temp_id/edges work identically to before
  - [ ] `pnpm typecheck` passes
  - [ ] `pnpm lint` passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All 5 store tool schemas include temp_id and edges
    Tool: Bash (grep)
    Preconditions: Task 2 changes applied
    Steps:
      1. grep -l "temp_id" apps/mcp/src/tools/store-*.ts
      2. Assert: 5 files listed
      3. grep -l "edges" apps/mcp/src/tools/store-*.ts
      4. Assert: 5 files listed
    Expected Result: All store tools updated
    Evidence: grep output captured

  Scenario: Typecheck and lint pass
    Tool: Bash
    Steps:
      1. Run: pnpm typecheck
      2. Assert: exit code 0
      3. Run: pnpm lint
      4. Assert: exit code 0
    Expected Result: No type or lint errors
    Evidence: Command output captured
  ```

  **Commit**: YES
  - Message: `feat(mcp): add temp_id and inline edges to all 5 store tools`
  - Files: `apps/mcp/src/tools/store-knowledge.ts`, `apps/mcp/src/tools/store-issue.ts`,
    `apps/mcp/src/tools/store-action.ts`, `apps/mcp/src/tools/store-artifact.ts`,
    `apps/mcp/src/tools/store-source.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 3. Unit Tests: `storeNodesWithEdges` in graph library

  **What to do**:

  Add a new `describe('storeNodesWithEdges')` block in `packages/graph/src/nodes.test.ts`.

  Follow existing test patterns: `decision()` helper for creating StoreNodeInput, beforeEach/afterEach
  with `:memory:` database.

  **Required test cases**:

  1. `it('creates nodes and inline edges in single transaction')` — 2 nodes with temp_ids, 1 edge
     between them. Assert both nodes exist, edge exists with correct source/target real IDs.

  2. `it('resolves temp_ids to real IDs in edge source_id and target_id')` — Create 2 nodes with
     temp_ids "a" and "b", edge from "a" to "b". Assert returned edge has real IDs (not "a"/"b").

  3. `it('echoes temp_id on returned nodes')` — Create node with temp_id "x". Assert returned node
     has `temp_id: "x"` alongside `id`.

  4. `it('supports edge from temp_id node to existing DB node')` — Pre-create a node, then call
     storeNodesWithEdges with 1 new node + 1 edge referencing the pre-existing real ID.

  5. `it('supports edge between two existing DB nodes')` — Pre-create 2 nodes, call
     storeNodesWithEdges with 1 new node + 1 edge between the 2 existing nodes. (Edge between
     existing nodes is like using texere_create_edge but in the same transaction.)

  6. `it('creates auto-provenance edges alongside inline edges')` — Node with `sources: ['https://example.com']`
     and an inline edge. Assert both the auto-provenance BASED_ON edge and the inline edge exist.

  7. `it('handles REPLACES edge auto-invalidation')` — Pre-create node A. New node B with inline
     REPLACES edge (source=A, target=B). Assert A gets invalidated_at set.

  8. `it('rolls back all nodes and edges on edge failure')` — 2 nodes + 1 edge referencing a
     nonexistent real ID. Assert error thrown AND neither node was persisted.

  9. `it('rejects duplicate temp_ids')` — 2 nodes both with temp_id "dup". Assert error.

  10. `it('rejects self-referential edge')` — 1 node with temp_id "x", edge from "x" to "x". Assert
      error about self-referential edge.

  11. `it('rejects edge referencing nonexistent temp_id')` — 1 node with temp_id "a", edge referencing
      temp_id "b" (not on any node). Assert descriptive error.

  12. `it('with empty edges array behaves like storeNode')` — Nodes + empty edges array. Assert
      nodes created, result shape is correct.

  13. `it('with minimal:true returns ids only')` — Assert minimal response shape:
      `{ nodes: [{ id, temp_id }], edges: [{ id }] }`.

  14. `it('preserves node array ordering')` — 3 nodes with temp_ids. Assert returned nodes are in
      same order as input.

  **Must NOT do**:
  - DO NOT use mocking — real SQLite `:memory:` (project convention)
  - DO NOT modify existing tests
  - DO NOT import from `@texere/graph` — import from relative paths (`./nodes`, `./db`, `./types`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Writing tests from a clear spec. No architectural decisions needed.
  - **Skills**: [`texere`]
    - `texere`: Test conventions, factory patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Test References** (testing patterns to follow):
  - `packages/graph/src/nodes.test.ts:1-27` — Import pattern, `decision()` factory helper,
    beforeEach/afterEach with `createDatabase(':memory:')`. Follow this exact pattern.
  - `packages/graph/src/nodes.test.ts:28-37` — Test style: descriptive sentence, assertion patterns
    (toMatch nanoid regex, toBeGreaterThanOrEqual for timestamps).
  - `packages/graph/src/edges.test.ts:10-16` — `makeNode()` helper for creating nodes as test
    prerequisites. Reuse or create similar helper for tests needing pre-existing nodes.
  - `packages/graph/src/edges.test.ts:57-66` — Error assertion pattern: `expect(() => ...).toThrow()`.

  **API References** (what to test against):
  - `packages/graph/src/nodes.ts` — `storeNodesWithEdges()` function (from Task 1)
  - `packages/graph/src/nodes.ts:300-318` — `getNode()` function for verifying stored nodes
  - `packages/graph/src/edges.ts` — `getEdgesForNode()` for verifying stored edges

  **Acceptance Criteria**:

  - [ ] 14 test cases in `describe('storeNodesWithEdges')` block
  - [ ] All tests pass: `pnpm test:unit -- packages/graph/src/nodes.test.ts`
  - [ ] No existing tests broken

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All new unit tests pass
    Tool: Bash
    Preconditions: Tasks 1 and 3 changes applied
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/nodes.test.ts --reporter=verbose
      2. Assert: exit code 0
      3. Assert: output contains "storeNodesWithEdges" describe block
      4. Assert: 14 new test names visible in output
      5. Assert: zero failures
    Expected Result: All 14 tests pass
    Evidence: Test output captured

  Scenario: No existing tests broken
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit -- packages/graph/src/nodes.test.ts --reporter=verbose
      2. Assert: all pre-existing "node CRUD" tests still pass
    Expected Result: Zero regressions
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(graph): add unit tests for storeNodesWithEdges`
  - Files: `packages/graph/src/nodes.test.ts`
  - Pre-commit: `pnpm test:unit -- packages/graph/src/nodes.test.ts`

---

- [ ] 4. Integration Tests: MCP tools with temp_id + edges

  **What to do**:

  Add new test cases to `apps/mcp/src/tools.test.ts` (unit-level MCP tests) and optionally to
  `apps/mcp/src/server.int.test.ts` (full server integration).

  **In `tools.test.ts`** — add to existing `describe('Texere MCP tools')`:

  1. `it('store_knowledge with temp_id + edges creates nodes and edges atomically')` — Call
     `mcp.callTool('texere_store_knowledge', { nodes: [{ temp_id: "d1", role: "decision", ... },
     { temp_id: "f1", role: "finding", ... }], edges: [{ source_id: "d1", target_id: "f1",
     type: "BASED_ON" }], minimal: false })`. Assert response has 2 nodes with temp_ids echoed
     and 1 edge with resolved real IDs.

  2. `it('store_action with temp_id + edges works')` — Same pattern with action tool, task + solution
     roles, RESOLVES edge.

  3. `it('store_artifact with edge to existing node works')` — Pre-create a knowledge node via
     store_knowledge. Then store_artifact with 1 node + 1 edge referencing the pre-existing real ID.

  4. `it('store_issue with temp_id but no edges works (backward compat)')` — Call with temp_id on
     nodes but no edges array. Assert temp_id echoed in response, no edges in response.

  5. `it('store_source without temp_id or edges works identically to before')` — Call without
     temp_id or edges. Assert response shape unchanged from pre-Task-2 behavior.

  6. `it('all 5 store tools accept edges array in schema')` — Verify via schema parsing that all
     5 tools accept the edges field (Zod safeParse test).

  7. `it('store_knowledge rejects invalid edge type')` — Call with an invalid edge type string.
     Assert Zod validation error.

  **In `server.int.test.ts`** — add to existing `describe('MCP server integration')`:

  8. `it('tool schemas include edges property without anyOf/oneOf/allOf')` — Iterate all 5 store
     tool JSON schemas, verify edges property exists and no forbidden union keywords at top level.

  **Must NOT do**:
  - DO NOT modify existing test cases
  - DO NOT create separate test files — add to existing test files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding tests to existing test files following established patterns.
  - **Skills**: [`texere`]
    - `texere`: MCP tool test conventions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:

  **Test References**:
  - `apps/mcp/src/tools.test.ts:1-50` — Test setup pattern: `createTexereMcpServer(db)`, `callTool`
    pattern, `structuredContent` assertion pattern.
  - `apps/mcp/src/tools.test.ts:52-78` — Example of calling store tool and asserting structured
    response. Follow this pattern for temp_id + edges tests.
  - `apps/mcp/src/server.int.test.ts:17-23` — `STORE_TOOL_BY_TYPE` map for iterating all store tools.
  - `apps/mcp/src/server.int.test.ts:25-49` — `storeNode()` helper function for creating nodes via
    MCP tools.
  - `apps/mcp/src/server.int.test.ts:72-77` — `hasTopLevelUnion()` check — extend for edges schema.

  **Acceptance Criteria**:

  - [ ] 7+ new test cases in tools.test.ts
  - [ ] 1+ new test case in server.int.test.ts
  - [ ] All tests pass: `pnpm test:unit -- apps/mcp/src/tools.test.ts`
  - [ ] All integration tests pass: `pnpm test:integration`
  - [ ] No existing tests broken

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All MCP tool tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit -- apps/mcp/src/tools.test.ts --reporter=verbose
      2. Assert: exit code 0
      3. Assert: output contains "temp_id" or "edges" in test names
      4. Assert: zero failures
    Expected Result: All new and existing tests pass
    Evidence: Test output captured

  Scenario: Integration tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:integration --reporter=verbose
      2. Assert: exit code 0
    Expected Result: Full server integration tests pass
    Evidence: Test output captured

  Scenario: Tool count remains 15
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit -- apps/mcp/src/tools.test.ts --reporter=verbose
      2. Assert: "registers exactly 15 tools" test passes
    Expected Result: No accidental tool registration changes
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(mcp): add integration tests for temp_id and inline edges`
  - Files: `apps/mcp/src/tools.test.ts`, `apps/mcp/src/server.int.test.ts`
  - Pre-commit: `pnpm test:unit -- apps/mcp`

---

- [ ] 5. Documentation: README.md, AGENTS.md (×3), SKILL.md

  **What to do**:

  Update all project documentation to reflect the new temp_id + inline edges capability. This task
  covers 5 files total.

  **5a. `README.md` (root)**:
  - In the "MCP Tools" section, update the "Node CRUD (per-type stores)" description to mention
    inline edge creation:
    ```
    **Node CRUD (per-type stores + inline edges):**
    ```
  - Add a brief note after the 5 store tool bullet points:
    ```
    All store tools support `temp_id` for call-scoped node identification and optional `edges` array
    for atomic node+edge creation in a single tool call.
    ```
  - In the "Quick Start → As Library" code example, consider adding a brief
    `storeNodesWithEdges()` example after the existing `storeNode` example (if it doesn't make the
    section too long — use judgment).

  **5b. `AGENTS.md` (root)**:
  - In the CODE MAP → Core Exports section, add `storeNodesWithEdges()` to the Texere class method
    list:
    ```
    - Node CRUD: `storeNode()`, `storeNodesWithEdges()`, `getNode()`, `replaceNode()`, `invalidateNode()`
    ```
  - In the COMMANDS section, no changes needed (pnpm commands unchanged).

  **5c. `packages/graph/AGENTS.md`**:
  - In the OVERVIEW, update: "11 source files" stays (no new files created).
  - In the WHERE TO LOOK table, no new rows needed (nodes.ts is already there).
  - In the CONVENTIONS → Batch Operations section, add note about `storeNodesWithEdges()`:
    ```
    ### Atomic Node+Edge Creation
    - `storeNodesWithEdges()` creates nodes and edges in a single transaction
    - temp_ids resolve within the call (call-scoped, not persisted)
    - Delegates to existing `createEdge()` for edges (reuses REPLACES auto-invalidation)
    - Composes with `insertNodeWithAnchors()` — auto-provenance + inline edges in same transaction
    ```
  - In CRITICAL PATTERNS, add a `storeNodesWithEdges` example:
    ```typescript
    // Atomic nodes + edges
    const result = texere.storeNodesWithEdges(
      [
        { type: NodeType.Knowledge, role: NodeRole.Decision, temp_id: 'd1', title: '...', content: '...' },
        { type: NodeType.Knowledge, role: NodeRole.Finding, temp_id: 'f1', title: '...', content: '...' },
      ],
      [{ source_id: 'd1', target_id: 'f1', type: EdgeType.BasedOn }],
    );
    // result.nodes[0].temp_id === 'd1', result.edges[0].source_id === result.nodes[0].id
    ```

  **5d. `apps/mcp/AGENTS.md`**:
  - In TOOL ORGANIZATION table, update "Node CRUD" row:
    ```
    | **Node CRUD** | store_knowledge, store_issue, store_action, store_artifact, store_source, get_node, replace_node, invalidate_node | Store tools: batch up to 50 nodes + optional inline edges (up to 50) |
    ```
  - In CONVENTIONS → Zod-First Tool Definition, add note:
    ```
    ### Inline Edge Support (Store Tools)
    - All 5 store tools accept optional `edges` array alongside `nodes`
    - If edges present → calls `db.storeNodesWithEdges()` (atomic)
    - If no edges → calls `db.storeNode()` (backward compatible)
    - `temp_id` on nodes echoed in response for cross-call correlation
    ```

  **5e. `.opencode/skills/texere/SKILL.md`** (CRITICAL — handle with care):

  Changes go ONLY in the WRITE section (after line 122 "## WRITE (Store & Modify)"). The READ
  section (lines 1-121) MUST NOT be touched.

  For EACH of the 5 per-type store tool subsections (texere_store_knowledge, texere_store_issue,
  texere_store_action, texere_store_artifact, texere_store_source):

  1. Add `temp_id` to the node fields table:
     ```
     | temp_id    | string       | no       | Client-assigned ID, scoped to this call. Echoed in response.         |
     ```

  2. After the node fields table, add the edges array documentation:
     ```
     **Optional edges (atomic node+edge creation):**

     | field | type | required | notes |
     | ----- | ---- | -------- | ----- |
     | edges | EdgeInput[] | no | Array of edges to create atomically with nodes (max 50) |

     **EdgeInput fields:**

     | field     | type     | required | notes                                            |
     | --------- | -------- | -------- | ------------------------------------------------ |
     | source_id | string   | yes      | temp_id from this call's nodes OR existing real ID |
     | target_id | string   | yes      | temp_id from this call's nodes OR existing real ID |
     | type      | EdgeType | yes      | Edge type (11 values, see reference below)        |
     ```

  3. Update the tool-level input table to show edges:
     ```
     | arg     | type            | required | default | notes                                     |
     | ------- | --------------- | -------- | ------- | ----------------------------------------- |
     | nodes   | KnowledgeNode[] | yes      | —       | Array of knowledge nodes (1-50)           |
     | edges   | EdgeInput[]     | no       | —       | Edges to create atomically (max 50)       |
     | minimal | boolean         | no       | true    | Return only `{ id }` per node if true     |
     ```

  4. Update examples to show temp_id + edges usage.

  After the 5 per-type tool subsections and before `texere_create_edge`, add a new section:

  ```markdown
  ### Inline Edges: Atomic Node+Edge Creation

  All 5 store tools support creating edges alongside nodes in a single atomic call. This eliminates
  within-type ID bookkeeping.

  **How temp_id resolution works:**
  - Assign `temp_id` strings to nodes in your call (e.g., "d1", "f1")
  - Reference these temp_ids in the `edges` array's `source_id` and `target_id`
  - Server resolves temp_ids to real IDs within the transaction
  - Response echoes `temp_id` on each node alongside the real `id`
  - Edges in response show resolved real IDs

  **Edge references can be:**
  1. A temp_id from this call's nodes → resolved to generated real ID
  2. An existing real ID in the database → passed through as-is

  **temp_ids are call-scoped only.** They don't persist across calls.

  **Example:**
  ```
  texere_store_knowledge({
    nodes: [
      { temp_id: "d1", role: "decision", title: "Use Hono", content: "...", importance: 0.9, confidence: 0.95 },
      { temp_id: "f1", role: "finding", title: "Hono benchmarks", content: "...", importance: 0.7, confidence: 0.9 }
    ],
    edges: [
      { source_id: "d1", target_id: "f1", type: "BASED_ON" }
    ]
  })
  → {
    nodes: [{ id: "abc", temp_id: "d1" }, { id: "def", temp_id: "f1" }],
    edges: [{ id: "edge-1", source_id: "abc", target_id: "def", type: "BASED_ON" }]
  }
  ```

  **Multi-type workflow:**
  ```
  # Call 1: Knowledge nodes + intra-knowledge edges
  texere_store_knowledge({ nodes: [...], edges: [...] })
  → { nodes: [{id: "abc", temp_id: "d1"}, ...], edges: [...] }

  # Call 2: Artifact nodes + edges to knowledge nodes (via real IDs from call 1)
  texere_store_artifact({
    nodes: [{ temp_id: "c1", role: "concept", ... }],
    edges: [{ source_id: "c1", target_id: "abc", type: "PART_OF" }]
  })
  ```
  ```

  Update the Limits section at the bottom to include:
  ```
  - Batch nodes: max 50 per store call
  - Inline edges: max 50 per store call
  - Batch edges: max 50 per create_edge call
  ```

  **Must NOT do**:
  - DO NOT touch SKILL.md lines 1-121 (READ section)
  - DO NOT mix temp_id/edges documentation into the READ section
  - DO NOT add new tools to the tool list (still 15 tools)
  - DO NOT change the Limits section numbers — only ADD the inline edges limit line

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation-focused task requiring careful prose, accurate technical content, and
      strict section boundary adherence.
  - **Skills**: [`texere`]
    - `texere`: Understanding of tool definitions and conventions for accurate documentation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (needs to know exact API surface)

  **References**:

  **Documentation References**:
  - `README.md` — Current MCP Tools section (lines ~80-130). Update here.
  - `AGENTS.md` — Root knowledge base. CODE MAP → Core Exports section.
  - `packages/graph/AGENTS.md` — Graph library docs. CONVENTIONS and CRITICAL PATTERNS sections.
  - `apps/mcp/AGENTS.md` — MCP app docs. TOOL ORGANIZATION table and CONVENTIONS section.
  - `.opencode/skills/texere/SKILL.md:122-431` — WRITE section only. Per-type tool subsections
    starting at line 182 (texere_store_knowledge), line 216 (texere_store_issue), etc.

  **Source References** (for accuracy):
  - `docs/batch-api-design-options.md:85-302` — Option 1 design doc. API shapes, workflows, and
    examples to reference for documentation accuracy.
  - `packages/graph/src/nodes.ts` — `storeNodesWithEdges()` function signature (from Task 1)
  - `packages/graph/src/types.ts` — `InlineEdgeInput` type definition (from Task 1)

  **Acceptance Criteria**:

  - [ ] README.md mentions temp_id + inline edges in MCP Tools section
  - [ ] AGENTS.md (root) lists `storeNodesWithEdges()` in Core Exports
  - [ ] packages/graph/AGENTS.md has Atomic Node+Edge Creation section
  - [ ] apps/mcp/AGENTS.md has Inline Edge Support section
  - [ ] SKILL.md READ section (lines 1-121) is UNCHANGED (diff shows zero changes)
  - [ ] SKILL.md WRITE section has temp_id + edges docs for all 5 store tools
  - [ ] SKILL.md has "Inline Edges" section between per-type tools and texere_create_edge
  - [ ] SKILL.md Limits section includes inline edges limit
  - [ ] `pnpm format:check` passes (markdown formatting)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: SKILL.md READ section untouched
    Tool: Bash (git diff)
    Preconditions: Task 5 changes applied
    Steps:
      1. Run: git diff .opencode/skills/texere/SKILL.md | head -50
      2. Assert: first changed line is at or after line 122
      3. Assert: no changes to lines 1-121
    Expected Result: READ section preserved
    Evidence: diff output captured

  Scenario: All documentation files updated
    Tool: Bash (grep)
    Steps:
      1. grep "temp_id" README.md
      2. Assert: at least 1 match
      3. grep "storeNodesWithEdges" AGENTS.md
      4. Assert: at least 1 match
      5. grep "storeNodesWithEdges" packages/graph/AGENTS.md
      6. Assert: at least 1 match
      7. grep "Inline Edge" apps/mcp/AGENTS.md
      8. Assert: at least 1 match
      9. grep "temp_id" .opencode/skills/texere/SKILL.md
      10. Assert: multiple matches (5 store tools × temp_id field)
    Expected Result: All docs contain new content
    Evidence: grep output captured

  Scenario: Format check passes
    Tool: Bash
    Steps:
      1. Run: pnpm format:check
      2. Assert: exit code 0
    Expected Result: All markdown properly formatted
    Evidence: Command output captured
  ```

  **Commit**: YES
  - Message: `docs: add temp_id and inline edges documentation`
  - Files: `README.md`, `AGENTS.md`, `packages/graph/AGENTS.md`, `apps/mcp/AGENTS.md`,
    `.opencode/skills/texere/SKILL.md`
  - Pre-commit: `pnpm format:check`

---

- [ ] 6. Quality Gate: Full verification

  **What to do**:

  Run the complete quality pipeline and verify everything passes. This is the final gate before the
  work is considered done.

  1. Run `pnpm quality` (format:check + lint + typecheck + test:unit)
  2. Run `pnpm test:integration`
  3. Verify `pnpm build` succeeds (tsdown for MCP app, tsc for graph library)
  4. Spot-check: call each store tool with temp_id + edges via a quick smoke test

  If any failures occur, fix them in this task (don't create separate fix tasks).

  **Must NOT do**:
  - DO NOT skip any quality check
  - DO NOT suppress warnings

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running commands and verifying output. No implementation work unless fixes needed.
  - **Skills**: [`texere`]
    - `texere`: Understanding of quality commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (solo, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 3, 4, 5

  **References**:

  **Command References**:
  - `AGENTS.md` — COMMANDS section lists all quality commands
  - `package.json` — Script definitions for pnpm commands

  **Acceptance Criteria**:

  - [ ] `pnpm quality` passes (exit code 0)
  - [ ] `pnpm test:integration` passes (exit code 0)
  - [ ] `pnpm build` succeeds (exit code 0)
  - [ ] Zero lint errors, zero type errors, zero test failures

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full quality pipeline passes
    Tool: Bash
    Steps:
      1. Run: pnpm quality
      2. Assert: exit code 0
      3. Assert: output shows format, lint, typecheck, test all passing
    Expected Result: All quality checks pass
    Evidence: Full output captured

  Scenario: Integration tests pass
    Tool: Bash
    Steps:
      1. Run: pnpm test:integration --reporter=verbose
      2. Assert: exit code 0
      3. Assert: zero failures
    Expected Result: Full server integration tests pass
    Evidence: Test output captured

  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. Run: pnpm build
      2. Assert: exit code 0
      3. Assert: dist/ artifacts created for both packages
    Expected Result: Production build works
    Evidence: Build output captured

  Scenario: Backward compatibility smoke test
    Tool: Bash
    Steps:
      1. Run: pnpm test:unit -- --reporter=verbose 2>&1 | grep "FAIL"
      2. Assert: no output (zero failures)
    Expected Result: No test regressions
    Evidence: grep output captured
  ```

  **Commit**: YES (if any fixes were needed)
  - Message: `fix: address quality gate issues for temp_id + inline edges`
  - Pre-commit: `pnpm quality`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(graph): add storeNodesWithEdges function with temp_id resolution` | nodes.ts, types.ts, index.ts | `pnpm typecheck` |
| 2 | `feat(mcp): add temp_id and inline edges to all 5 store tools` | store-*.ts (×5) | `pnpm typecheck` |
| 3 | `test(graph): add unit tests for storeNodesWithEdges` | nodes.test.ts | `pnpm test:unit -- nodes.test.ts` |
| 4 | `test(mcp): add integration tests for temp_id and inline edges` | tools.test.ts, server.int.test.ts | `pnpm test:unit -- apps/mcp` |
| 5 | `docs: add temp_id and inline edges documentation` | README.md, AGENTS.md (×3), SKILL.md | `pnpm format:check` |
| 6 | `fix: address quality gate issues` (if needed) | varies | `pnpm quality` |

---

## Success Criteria

### Verification Commands

```bash
pnpm quality         # Expected: exit code 0 (format + lint + typecheck + test:unit)
pnpm test:integration # Expected: exit code 0
pnpm build           # Expected: exit code 0
```

### Final Checklist

- [ ] All "Must Have" items present
- [ ] All "Must NOT Have" guardrails respected
- [ ] `pnpm quality` passes
- [ ] `pnpm test:integration` passes
- [ ] `pnpm build` succeeds
- [ ] SKILL.md READ section (lines 1-121) unchanged
- [ ] All 5 store tools accept temp_id + edges
- [ ] Backward compatibility: no existing tests broken
- [ ] Documentation accurate across all 5 files
