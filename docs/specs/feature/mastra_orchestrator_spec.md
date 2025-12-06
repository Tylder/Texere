# Texere Mastra Orchestrator Spec (v0.1)

## 1. Purpose and Scope

This document specifies the **Mastra-based orchestrator** for Texere, implemented in TypeScript with
Mastra as the core framework. The orchestrator’s primary job in v1 is to act as a **coding agent for
repositories**:

- Read, understand, and navigate code across one or more repos.
- Implement features and bugfixes according to a written spec.
- Apply edits as patches, not blind overwrites.
- Run and interpret tests.
- Manage branches and commits (and optionally PRs in later versions).

### 1.1 Goals

1. Provide a **reliable, debuggable orchestration layer** for repo-focused coding tasks using Mastra
   agents, workflows, and tools.
2. Make tools **framework-agnostic** so they can later be reused by a Python/LangGraph backend with
   minimal adapters.
3. Express core behaviors as **explicit workflows** (graphs), not opaque “magic agents,” to ease
   debugging, evaluation, and future migration.
4. Integrate cleanly into an **Nx monorepo** and reuse shared packages (especially observability and
   tools).
5. Be immediately usable via **Mastra Studio** in v1, with a **TUI CLI** planned for v2.

### 1.2 Non-goals (v1)

- Running or managing the **indexing pipeline** itself (AST/SCIP/embeddings) as a core
  responsibility. The orchestrator consumes indexes via tools; indexing daemons are separate.
- Multi-tenant auth, quotas, or billing. v1 assumes single-user or trusted environment.
- Complex cross-repo dependency management beyond what the tools and index expose.
- Rich GUI for end users (web/app). v1 interaction surface is Mastra Studio and internal
  programmatic use.

## 2. High-Level Architecture

### 2.1 Nx Monorepo Layout

The orchestrator integrates into an Nx monorepo with at least the following structure (names
illustrative):

- `packages/orchestrator`
  - Mastra configuration (agents, workflows, storage, registries).
  - TypeScript API surface for triggering workflows and agent runs programmatically.
  - Wiring between tools (from the separate tools packages) and Mastra.

- `packages/tools-*`
  - Existing and future tool packages (code, git, tests, repo-intel, etc.) as defined in the
    separate **Tools Spec**.
  - Tools are pure TS modules with Zod schemas and are _not_ Mastra-specific.

- `apps/mastra-dev`
  - Mastra dev server and Mastra Studio entrypoint for local development.
  - Exposes HTTP endpoints (as per Mastra defaults) for running workflows/agents.

- `apps/orchestrator-tui` (v2, future)
  - TUI-style CLI application that calls into `packages/orchestrator` (directly or via HTTP).
  - Not implemented in v1; requirements are reserved in this spec.

### 2.2 Core Mastra Primitives Used

The orchestrator uses the following Mastra primitives:

- **Agents**: Role-specific LLM-backed entities with access to tools and optional memory.
- **Workflows**: Deterministic orchestration graphs for multi-step processes (branching, loops,
  parallelism, suspend/resume, HITL).
- **Agent Networks**: Optional multi-agent routing patterns used inside workflow steps for fuzzier
  subtasks.
- **Storage**: Mastra Storage for workflow state, memory (if used), and metadata, backed by Postgres
  in production.

### 2.3 Environments

- **Local development**
  - Run `apps/mastra-dev` with Mastra Studio.
  - Storage: LibSQL or in-memory store for fast iteration.
  - Indexes likely run locally (MCP servers / daemons) accessed via tools.

- **Production / shared environment**
  - Orchestrator runs as a Node service or serverless functions.
  - Storage: PostgreSQL via `@mastra/pg` (vector + DB capabilities).
  - External indexes and services accessed via tools or MCP connections.

## 3. Interaction Surfaces

### 3.1 Mastra Studio (v1 primary)

- Primary interaction in v1 is through Mastra Studio and the underlying dev server.
- Supported operations:
  - Start/stop workflows (e.g. `implementFeature`, `bugfix`, `refactor`).
  - Inspect steps, intermediate tool calls, and agent messages.
  - Inspect failures and replay or resume as supported by Mastra.

### 3.2 Programmatic API (internal)

`packages/orchestrator` exposes a TS API, e.g.:

- `runImplementFeature(params: ImplementFeatureParams): Promise<ImplementFeatureResult>`
- `runBugfix(params: BugfixParams): Promise<BugfixResult>`
- `runRefactor(params: RefactorParams): Promise<RefactorResult>`

These functions internally:

- Validate params (Zod schemas shared with tools where relevant).
- Trigger Mastra workflows with a normalized **TaskContext** (see §7).
- Return typed results (including metadata and references to stored artifacts).

### 3.3 TUI CLI (v2 placeholder)

Not implemented in v1, but the spec reserves requirements:

- The TUI CLI will:
  - Enumerate available workflows (e.g. `feature`, `bugfix`, `refactor`, `qna`).
  - Guide the user with prompts (e.g. select repo, branch, spec file, etc.).
  - Display progress aligned with workflow steps and sub-steps.
  - Stream key events (planning, patch proposals, test results, review outcome).

- The TUI CLI will **only** call public APIs from `packages/orchestrator` and will not access tools
  directly.

## 4. Agents and Roles

The orchestrator defines several role-specific agents. Roles are logical; implementation may reuse
underlying models/config where appropriate.

### 4.1 Shared Agent Design Principles

- Each agent is configured with:
  - A **clear system prompt** describing its responsibilities and constraints.
  - A curated **tool list** (subset of global tool registry).
  - Optional memory configuration (if/when memory is used for coding sessions).

- Agents should:
  - Be **idempotent** at the workflow step level (safe to retry with same inputs where possible).
  - Return **structured outputs** (Zod schemas, e.g. plans, patch lists, structured reviews) rather
    than free text.

### 4.2 Agent Roles (v1)

1. **Spec Interpreter Agent**
   - Reads SPEC.md, AGENTS.md, tickets, and user prompts.
   - Outputs a normalized, structured **TaskSpec** including:
     - Goals, non-goals.
     - Constraints and assumptions.
     - Explicit acceptance criteria.
     - Affected modules / domains according to docs and index hints.
   - Tools: docs reader, repo-intel (read-only), simple search.

2. **Planner Agent**
   - Consumes TaskSpec + current codebase context (from repo-intel tools).
   - Outputs a structured **ImplementationPlan**:
     - Ordered steps.
     - Expected files/modules to touch.
     - Required tests to write/modify.
     - Potential risks.
   - Tools: repo-intel, code search (read-only), spec/doc tools.

3. **Coder Agent**
   - Takes ImplementationPlan + context from repo-intel.
   - Proposes **patches** (not raw file contents) via code-editing tools.
   - Iterates where necessary (e.g. refine patch after tool feedback).
   - Tools: code-edit tools, repo-intel, test runner (for quick checks), formatting tools.

4. **Reviewer Agent**
   - Compares proposed patches against TaskSpec and ImplementationPlan.
   - Produces a structured **ReviewReport**:
     - Summary of changes.
     - Checklist vs acceptance criteria.
     - Potential regressions or missing tests.
     - Go/no-go recommendation.
   - Tools: diff viewer, repo-intel, test results.

5. **Test Runner Agent**
   - Coordinates running tests via test tools.
   - Interprets results and surfaces:
     - Failing tests and error messages.
     - Likely causes mapped back to changed files/plan steps.
   - Tools: test runner tools, log/trace access.

6. **Git Manager Agent**
   - Handles branch creation, commits, and (later) PR descriptions.
   - Applies patches from Coder Agent via code-edit tools.
   - Enforces safety policies (e.g. no commits to protected branches in future versions).
   - Tools: git tools, patch application, optional remote hosting (GitHub/GitLab) tools.

7. **Risk Assessor Agent** (lightweight in v1)
   - Optionally runs before applying changes.
   - Flags high-risk operations:
     - Large-scale refactors.
     - Potentially destructive DB or external API modifications.
   - Tools: diff summarizer, repo-intel.

8. **Doc Writer Agent** (optional in v1)
   - Updates or generates docs and inline comments after code changes.
   - Tools: docs writer, code search, diff viewer.

## 5. Workflows

Top-level entrypoints are **Mastra workflows**. They orchestrate agents, tools, and (optionally)
agent networks.

### 5.1 Common Concepts

All workflows operate over a shared **TaskContext**:

- `taskId`: unique identifier.
- `repos`: list of repo descriptors (root path, identity, capabilities).
- `primaryRepoId`: the main repo for edits.
- `targetBranch`: branch where changes should be applied.
- `baseBranch`: base branch for diffs.
- `specSources`: references to spec documents (paths, URLs, ticket IDs).
- `indexHandles`: identifiers for index services (SCIP, embeddings, etc.).
- `capabilities`: allowed operations (v1: assumed full; see §9 for future tightening).
- `userPreferences`: misc configuration (style, formatting, frameworks, etc.).

Workflows use the following common step patterns:

- `interpret_spec` (Spec Interpreter Agent).
- `plan` (Planner Agent).
- `retrieve_context` (repo-intel tools).
- `propose_patches` (Coder Agent).
- `apply_patches` (Git Manager Agent + code-edit tools).
- `run_tests` (Test Runner Agent/tools).
- `review_changes` (Reviewer Agent).
- `update_index` (index-maintenance tools, if configured).
- `gate_and_finalize` (risk assessment and optional human-in-the-loop gate).

### 5.2 Implement Feature Workflow

**Name:** `implementFeature`

**Input:**

- TaskContext.
- Feature description (free text) and/or link to a spec/ticket.

**Steps (high-level):**

1. `interpret_spec`
   - Spec Interpreter Agent -> TaskSpec.
2. `plan`
   - Planner Agent -> ImplementationPlan.
3. `retrieve_context`
   - Repo-intel tool(s) gather relevant files, symbols, and docs based on ImplementationPlan.
4. `propose_patches`
   - Coder Agent proposes patches using code-edit tools.
   - May internally perform multiple iterations (plan → patch → validate) within one workflow step.
5. `run_tests`
   - Test Runner Agent invokes test tools (scope determined by plan and changed files).
6. `review_changes`
   - Reviewer Agent evaluates patches and test results vs TaskSpec.
7. `update_index` (optional, recommended)
   - Calls index-maintenance tool(s) to update embeddings/SCIP slices for changed files.
8. `gate_and_finalize`
   - Risk Assessor Agent runs on diff and plan.
   - If HITL is enabled, wait for human approval.
   - Git Manager Agent commits to targetBranch when approved.

**Output:**

- Final status (success/failure).
- Patches applied (or proposed and not applied, depending on settings).
- Diffs and test results.
- ReviewReport and RiskReport.
- Pointers to any updated index artifacts.

### 5.3 Bugfix Workflow

**Name:** `bugfix`

Similar to `implementFeature`, with differences:

- Input includes:
  - Bug description.
  - Repro steps and logs, if available.
- Planner and repo-intel steps emphasize:
  - Locating failing tests or logs.
  - Identifying likely culprit modules.
- Test step must include:
  - Reproducing the failure first.
  - Verifying that failure is resolved.

### 5.4 Refactor Workflow

**Name:** `refactorModule`

Focuses on structural, non-functional changes:

- Spec step emphasizes invariants and non-goals (“no behavior change”).
- Planner and coder steps focus on API changes, call-graph adjustments, and internal structural
  improvements.
- Test step must:
  - Run a broader set of tests (or at least all tests affected by changed modules).
- Risk step is more conservative; may require HITL by default.

### 5.5 Q&A / Exploration Workflow

**Name:** `answerQuestion`

Read-only workflow:

- Uses Spec Interpreter and Planner in a lightweight way to understand the question.
- Uses repo-intel tools and docs readers to answer questions about the codebase.
- No Git or write tools are available in this workflow.

### 5.6 Index Maintenance Workflow

**Name:** `updateIndexForChanges`

Triggered from other workflows or manually:

- Input: list of changed files (and optionally symbols).
- Steps:
  - For each changed file, call index-maintenance tools to update embeddings/SCIP slices or other
    relevant indexes.
- Output: summary of index update results.

## 6. Tools Integration

### 6.1 Tool Design

Tools are defined in separate packages, under the existing **Tools Spec**, with these properties:

- **Pure TypeScript functions** implementing core logic.
- **Zod schemas** for inputs/outputs, enabling type-safe use by Mastra agents.
- **No Mastra-specific imports**; Mastra integrations are thin wrappers around these pure functions.
- **Side effects** (file writes, git, network) are explicit in tool naming and documentation.

Mastra agent/tool integration layer lives in `packages/orchestrator` and:

- Registers tools with Mastra’s tool system.
- Handles translation from Mastra’s runtime representations to the underlying tool API.
- Treats external MCP-based tools as first-class, alongside local tools.

### 6.2 Tool Categories

1. **Repo-Intel Tools**
   - Query AST/SCIP/index for:
     - File locations of symbols.
     - Callers/callees.
     - References and definitions.
     - Related files by semantic similarity.
   - Read-only; never modify repository.

2. **Code Editing Tools**
   - Apply patches (unified diff, structured edits, or “edit ranges”).
   - Run formatters and linters.
   - Provide “what changed?” summaries.

3. **Git Tools**
   - Branch creation and switching.
   - Staging, committing, and (later) pushing.
   - Generating commit messages from summaries.

4. **Test Tools**
   - Run test suites or subsets (e.g. only changed tests).
   - Capture results (pass/fail, logs, stack traces).

5. **Docs and Spec Tools**
   - Read SPEC.md/AGENTS.md and other docs.
   - Write or update documentation and changelogs (for Doc Writer Agent).

6. **Index Maintenance Tools**
   - Re-index changed files for embeddings and/or SCIP.
   - Report status per file or per batch.

## 7. Retrieval and Indexing Layer

### 7.1 Responsibility Split

- The **indexing pipeline** (SCIP, AST extraction, embeddings, etc.) is built and operated outside
  of Mastra.
- The orchestrator interacts with indexes via tools, which expose a stable contract.

### 7.2 Repo-Intel Tool Contract (High-Level)

Input (simplified):

- `repoId`
- `query`: symbol name, path, or free-text.
- `operation`: e.g. `FIND_DEFINITION`, `FIND_REFERENCES`, `SIMILAR_CHUNKS`,
  `NEAREST_CODE_FOR_SPEC_SECTION`.
- Optional filters: language, path prefix, etc.

Output (simplified):

- `locations`: file paths + line/column ranges.
- `snippets`: surrounding code fragments.
- `symbolGraph`: optional references/definition relationships.
- `relevanceScores`: for ranking.

The spec does not prescribe implementation, only the shape of the contract.

### 7.3 Index Maintenance Tool Contract

- Input: list of changed files (paths) and metadata (repoId, branch, etc.).
- Output: per-file status (`UPDATED`, `SKIPPED`, `ERROR`) and optional error details.

## 8. Storage and Infrastructure

### 8.1 Storage Providers

- **Local dev:**
  - Use LibSQL or in-memory storage providers for fast iteration.
  - Accept loss of state between restarts.

- **Production:**
  - Use PostgreSQL via `@mastra/pg` as the primary Mastra storage provider.
  - Store:
    - Workflow state and snapshots.
    - Agent memory threads (if/when used).
    - Eval and run metadata.
  - Optionally use pgvector for any vector-related storage that Mastra uses directly.

### 8.2 Deployment

- Supported deployment patterns:
  - Node server (e.g. Express/Fastify) wrapping Mastra.
  - Serverless functions (Vercel, Cloudflare, etc.) using Mastra’s HTTP integrations.
- The orchestrator spec assumes:
  - A single logical Mastra app per environment.
  - Stable `DATABASE_URL` and other configuration via environment variables.

## 9. Safety and Permissions

### 9.1 v1 Trust Model

- v1 assumes a **trusted environment**:
  - The process has read/write access to repos configured in TaskContext.
  - Git operations have the same power as the underlying system user.
  - External services (e.g. Git hosts) are configured out-of-band via tokens.

### 9.2 Future Capability Model (Design Placeholder)

Although not implemented in v1, the spec anticipates a capability-based model:

- **Capabilities** attached to TaskContext:
  - `allowedRepos`: explicit list of repo IDs and allowed operations (`READ`, `WRITE`, `GIT`,
    `TEST`, `INDEX_UPDATE`).
  - `allowedNetworks`: which external services the orchestrator can call for this task.
  - `maxDiffSize`, `maxFileCount`, etc. for guardrails.

- **Enforcement points:**
  - Tool adapter layer in `packages/orchestrator` checks capabilities before executing a tool.
  - Workflows can branch or fail early on insufficient capabilities.

## 10. Observability

### 10.1 Mastra Defaults

- Use Mastra’s built-in tracing and logging as the primary observability mechanism in v1.
- Ensure:
  - Each workflow run has a unique ID and is traceable across steps and tool calls.
  - Agent and tool logs are structured where possible (e.g. JSON payloads).

### 10.2 Integration with `@repo/observability` (Future)

- The spec reserves integration hooks:
  - Wrap Mastra logging with the monorepo observability packages for:
    - Metrics (e.g. run duration, tokens used, failure counts).
    - Structured logs and traces.
  - No direct dependency in v1 to keep the orchestrator focused.

## 11. Evals and Metrics (v1)

### 11.1 Per-run Metrics

For each workflow run, capture at minimum:

- Workflow name and version.
- TaskContext summary (repo, branch, high-level task type).
- Start/end timestamps and duration.
- Token usage (where available from the LLM provider).
- Test results (pass/fail, number of tests run, failing test names).
- Diff statistics (files changed, lines added/removed).
- Final status (`SUCCESS`, `PARTIAL`, `FAILED`, `ABORTED`).

### 11.2 Eval Hooks

- Store enough metadata to support later offline evals:
  - Input spec and final summaries.
  - Key intermediate artifacts (plans, reviews, risk assessments).
- No full-blown eval harness is required in v1, but the data model must make it easy to:
  - Reconstruct runs.
  - Compare different versions of workflows/agents over the same tasks.

## 12. Extensibility and Future Work

### 12.1 TUI CLI (v2)

- Provide a stable TypeScript API in `packages/orchestrator` that can be called by a future TUI,
  including:
  - Listing available workflows and their input schemas.
  - Triggering runs and streaming progress events.
  - Fetching run histories and artifacts.

- The TUI should:
  - Mirror workflow steps in its UI (panels for spec, plan, patches, tests, review).
  - Support resuming failed or paused runs.

### 12.2 LangGraph / Python Backend Interop

- Because tools are framework-agnostic pure TS modules, a future LangGraph/Python backend can:
  - Call the same tools via MCP servers or HTTP wrappers.
  - Recreate workflows conceptually as LangGraph graphs using the same step structure as in this
    spec.

### 12.3 Additional Workflows

Potential future workflows (not required in v1):

- `codeAudit` – inspect a subsystem for performance, security, or correctness issues.
- `migration` – structured changes across multiple services/repos.
- `bulkRefactor` – large-scale changes (e.g. library migrations) with extra safeguards.

## 13. Versioning and Governance

- This spec is **v0.1** and should be versioned alongside the code in the repo (e.g.
  `SPEC_MASTRA_ORCHESTRATOR.md`).
- Any incompatible changes to workflows, agents, or APIs must:
  - Bump the spec version.
  - Include a migration note for existing runs and any TUI/frontends.
