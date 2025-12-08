# Nx LangGraph Feature Package Layout Spec

## 1. Purpose and principles

This spec defines how to structure LangGraph-based code in an Nx monorepo using **feature-first**
packages under `packages/feature/*`.

Principles:

- Organize by **domain/feature**, not by framework.
- Each feature = **one Nx library** (no separate libs per node/agent/graph by default).
- Shared infrastructure lives in `packages/platform/*`, shared integrations in `packages/toolkit/*`,
  and repo-wide tooling in `packages/config/*`.
- Architectural rules are enforced via Nx tags and `@nx/enforce-module-boundaries`.
- Only extract new libraries when there is clear reuse or a separate lifecycle.

## 2. Top-level workspace layout

```text
packages/
  feature/
    email-assistant/
    repo-assistant/
    doc-qa/
    index/
      core/
        src/
          index.ts
      types/
        src/
          index.ts
  platform/
    langgraph-core/
    llm-providers/
    observability/
  toolkit/
    github/
    jira/
  config/
    eslint/
    tsconfig/

apps/
  api/
  web/
  jobs/
```

Roles:

- `feature/*`: domain-specific agents/workflows implemented with LangGraph.
- `platform/*`: cross-cutting infrastructure and shared plumbing.
- `toolkit/*`: cross-feature domain integrations (e.g. GitHub, JIRA).
- `config/*`: repo-wide configuration packages (ESLint, TypeScript, etc.).
- `apps/*`: API, web, worker, or CLI entrypoints that consume features.

## 3. Project types and tags

Each Nx project defines tags in `project.json` to encode its role and scope.

Recommended tags:

- Feature libraries: `"tags": ["type:feature", "scope:<feature-name>", "tech:langgraph"]`
- Platform libraries: `"tags": ["type:platform", "scope:platform"]`
- Toolkit libraries: `"tags": ["type:toolkit", "scope:<domain>"]`
- Config libraries: `"tags": ["type:config", "scope:config"]`
- Apps: `"tags": ["type:app", "scope:<app-name>"]`

These tags are used by `@nx/enforce-module-boundaries` to control allowed dependencies.

## 4. Feature libraries (`packages/feature/*`)

Each feature is a **single Nx project** under `packages/feature/<feature-name>`.

Example: `packages/feature/email-assistant`:

```text
packages/feature/email-assistant/
  src/
    domain/
      schemas.ts        # Zod types for inputs, outputs, internal state
      model.ts          # domain entities and value objects
      rules.ts          # business rules, policies, scoring
    runtime/
      state.ts          # GraphState built from domain schemas
      nodes/
        triage-node.ts
        llm-node.ts
        tool-node.ts
        hitl-node.ts
      graphs/
        email-assistant.ts        # main agent graph
        email-assistant-hitl.ts   # variant with HITL, etc.
    tools/
      calendar-tool.ts
      crm-tool.ts
    adapters/
      http.ts           # HTTP/Next.js/Fastify wrappers (optional)
      jobs.ts           # queue/worker wrappers (optional)
    index.ts            # feature public API
  project.json
```

Responsibilities by folder:

- `domain/`: pure business logic and types, no LangGraph, no LLMs, no I/O.
- `runtime/`: LangGraph-specific code (state definitions, nodes, graphs).
- `tools/`: feature-specific tools that talk to external systems (may reuse `toolkit/*`).
- `adapters/`: thin HTTP/worker-specific integration. **Default** location for feature-scoped
  adapters; in very large systems they can be extracted into separate libs or implemented in
  `apps/*`.
- `index.ts`: the only public entrypoint for the feature.

### 4.1 Feature public API

Each feature exposes a **small, stable API** from `src/index.ts`:

- Types:
  - `FooState` – validated state shape used by the graph.
  - `FooConfig` – configuration (thread ID, user ID, limits, etc.).
- Graphs:
  - `fooGraph` – compiled LangGraph graph for advanced usage.
- Facade:
  - `runFoo(args: { state: FooState; config: FooConfig }): Promise<FooState>` – convenience wrapper
    used by apps.

Example:

```ts
export type { EmailAssistantState, EmailAssistantConfig } from './domain/schemas';
export { emailAssistantGraph } from './runtime/graphs/email-assistant';

export async function runEmailAssistant(args: {
  state: EmailAssistantState;
  config: EmailAssistantConfig;
}) {
  return emailAssistantGraph.invoke(args.state, args.config);
}
```

Apps and adapters import only from `@repo/feature-email-assistant`, not from internal files.

## 5. Platform libraries (`packages/platform/*`)

### 5.1 `packages/platform/langgraph-core`

Responsibilities:

- Shared helpers for creating and compiling LangGraph graphs.
- Base `GraphStateBase` pattern and Zod registry helpers.
- Checkpointer configuration (database connections, table naming, etc.).
- Optional tracing hooks for graphs.

Usage pattern in features:

- Import `createStateGraph`, `compileGraph`, `START`, `END`, and any shared state helpers from this
  library.
- Avoid importing directly from `@langchain/langgraph` in apps.

### 5.2 `packages/platform/llm-providers`

Responsibilities:

- Factories for chat and embedding models (OpenAI, Ollama, Anthropic, etc.).
- Standard model configuration interfaces.
- Optional helpers for binding tools to models.

Features depend on this library instead of talking to LLM providers directly.

### 5.3 `packages/platform/observability`

Responsibilities:

- Initialization for observability tooling (e.g. Langfuse, metrics, logging).
- Helpers to wrap graph invocation with tracing, correlation IDs, and logging.

Features and apps call into this library to instrument graphs consistently.

## 6. Toolkit libraries (`packages/toolkit/*`)

`packages/toolkit/*` contain cross-feature domain integrations:

Examples:

- `packages/toolkit/github`: GitHub API client + higher-level operations.
- `packages/toolkit/jira`: JIRA API client + higher-level operations.

Responsibilities:

- Provide stable APIs for external systems.
- Optionally include LangChain tools built on top of these APIs.

Features depend on toolkit libraries rather than duplicating external integrations.

## 7. Config libraries (`packages/config/*`)

Repo-wide ESLint and TypeScript config live under `packages/config/*`:

Examples:

- `packages/config/eslint` → `@repo/config-eslint`
- `packages/config/tsconfig` → `@repo/config-tsconfig`

Characteristics:

- Tooling-only; no runtime logic.
- May be consumed by any app or library for configuration.
- Should not depend on `feature/*` or `platform/*` projects.

Recommended tags:

- ESLint config project: `"tags": ["type:config", "scope:config"]`
- TS config project: `"tags": ["type:config", "scope:config"]`

Module boundary rules for config:

- `type:config` may depend only on external packages or other `type:config` projects.
- Other project types (`feature`, `platform`, `toolkit`, `app`) may depend on `type:config`.

## 8. Apps and adapters (`apps/*`)

Apps are thin entrypoints that call into feature libraries and platform/toolkit libraries.

Patterns:

- API app (e.g. `apps/api`):
  - Validates incoming HTTP requests.
  - Maps them into `FooState` + `FooConfig`.
  - Calls `runFoo` from a feature library.
  - Serializes the result back to HTTP.
- Web app (e.g. `apps/web`):
  - UI only; calls API or server actions that themselves use feature libraries.
- Jobs app (e.g. `apps/jobs`):
  - Consumes queue messages or scheduled tasks.
  - Calls `runFoo` or lower-level graphs directly.

Apps should never construct graphs directly; they use `runFoo` or similar facades from features.

## 9. Module boundary rules (conceptual)

Enforced via `@nx/enforce-module-boundaries` using tags:

- `type:app` may depend on `type:feature`, `type:platform`, `type:toolkit`, `type:config`.
- `type:feature` may depend on `type:platform`, `type:toolkit`, `type:config`.
- `type:platform` may depend on `type:config` and other `type:platform` libraries, but not on
  `type:feature`.
- `type:toolkit` may depend on `type:config` and other `type:toolkit` libraries, but not on
  `type:feature`.
- `type:config` should not depend on any other project type.

Feature-to-feature dependencies are disallowed by default.

## 10. Testing guidelines

Testing is layered to keep most tests fast and deterministic.

- Unit test `domain/` logic as pure functions (no LangGraph, no network, no LLM).
- Unit test `tools/` with external systems stubbed or mocked.
- Unit test `runtime/nodes` as plain async functions with fake state and mocked tools/models.
- Add a small number of integration tests per feature that run the full graph via `runFoo`.
- Keep real LLM calls in separate, slower suites (or use replayed responses) if needed.

## 11. Evolution and extraction

- Start with a single feature library per feature.
- Only extract additional Nx libraries when:
  - Code is reused across multiple features, or
  - A part of a feature needs its own build/publish/release cycle.

When extracting:

- Prefer to create new `platform` or `toolkit` libraries, leaving each feature as the primary
  vertical slice.
- Avoid splitting one feature into many small libraries unless there is a clear ownership or
  lifecycle reason (for example, separate team owning adapters).

## 12. Reusable building blocks and refactoring

Goal: allow reuse of smaller capabilities in larger features without creating tangled
feature-to-feature dependencies.

Recommended approach:

- Keep `type:feature` libraries as **composite, top-level vertical slices**.
- Extract reusable parts into `type:platform` or `type:toolkit` libraries:
  - Cross-feature domain logic or integrations → `packages/toolkit/*`.
  - Cross-feature LangGraph patterns or mini-graphs → `packages/platform/*` (e.g.
    `platform/langgraph-patterns`).
- Larger features depend on these shared libraries, not on other `feature/*` projects.

Refactoring pattern when a feature contains reusable logic:

1. Identify the candidate:
   - Pure domain logic used (or likely to be used) in multiple features.
   - A generic LangGraph sub-flow (e.g. classification, summarization, retrieval+answer) that is not
     specific to a single feature.
2. Move the generic parts into a new shared library:
   - If it talks to an external system (GitHub, JIRA, etc.) → create or extend a `toolkit/<domain>`
     library.
   - If it is a generic LangGraph capability → create or extend a `platform` library (for example
     `platform/langgraph-capabilities`).
   - Keep feature-specific wiring and policies inside the original feature.
3. Update dependencies:
   - The original feature now depends on the new toolkit/platform library.
   - Other features can also depend on the same toolkit/platform library.
4. Keep module boundaries strict:
   - `type:feature` → may not depend on other `type:feature` projects.
   - Reuse always flows **downward** into `platform` / `toolkit`, then **upward** into multiple
     features.

This preserves clean layering while still enabling reusable building blocks for larger composite
features.
