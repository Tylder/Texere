# Texere: LLM Agent Platform for Repository Understanding & Code Implementation

A TypeScript-first platform for building stateful LLM workflows that understand codebases and
implement changes across repositories. Built on LangGraph.js orchestration and an extensible tool
architecture.

**Objective:** Enable AI agents to read, understand, and modify code according to specifications
with production-ready reliability and observability.

## Quickstart

- Install: `pnpm install` (pnpm 10.23.0+, Node >= 20).
- Dev: `pnpm dev` (runs all apps in parallel via Nx).
- Quality loop: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
  - `pnpm lint` = oxlint (instant baseline checks) + ESLint (comprehensive type-aware validation)
- Commit-ready: `pnpm format:staged` (also runs on pre-commit via Husky).

## Repository Layout

### Architecture Layers

Texere is organized into three primary layers (see `docs/specs/README.md` § 5):

1. **Orchestration Core** – LangGraph.js-based workflows, agents, and state management
2. **API & Transport Layer** – HTTP boundary with async streaming (SSE/WebSockets)
3. **Client Layer** – TypeScript applications consuming the API

### Apps

Currently no user-facing apps in v1; focus is on core orchestration and tools.

### Packages

#### Core Orchestration

- **`packages/langgraph-orchestrator`** – LangGraph.js configuration, agents, workflows, and task
  execution. Main entry point for running coding tasks programmatically.

#### Framework-Agnostic Tools

- **`packages/tools-core`** – Framework-independent tool definitions with Zod schemas, types, and
  handler contracts. Single source of truth for tool logic across frameworks.
- **`packages/tools-langgraph`** – LangGraph.js integration for CoreTool definitions, enabling tools
  to work natively with LangGraph agents and workflows.

#### Shared Tooling

- **`packages/eslint-config`** – Shared ESLint flat configs for consistent code quality.
- **`packages/typescript-config`** – Shared TypeScript configs for type checking and module
  resolution.

### Tooling Roots

Configuration files at the workspace root:

- `prettier.config.mjs` – Formatting config (tailwindcss, package.json plugins, printWidth 100;
  import ordering handled by ESLint)
- `eslint.config.mjs` – Shared ESLint flat config entry
- `vitest.config.ts` – Shared Vitest config (jsdom, coverage via V8)
- `.husky/` – Git hooks (pre-commit → `pnpm format:staged`)
- `scripts/` – Utility scripts for development and CI

## Development Workflow

Follow the fast-feedback pattern documented in `AGENTS.md`:

1. **Start watchers** (run in separate terminals):
   - `pnpm dev:log` – Runtime + tests; filtered logs to `logs/dev.log`
   - `pnpm typecheck:watch:log` – Type checking; filtered logs to `logs/typecheck.log`

2. **Read specs first**: Consult `docs/specs/` for architecture and requirements
   - High-level entrypoint: `docs/specs/README.md`
   - Feature specs: `docs/specs/feature/langgraph_orchestrator_spec.md`,
     `docs/specs/feature/texere-tool-spec.md`
   - Engineering specs: `docs/specs/engineering/` (testing, linting, TypeScript setup)

3. **Implement in small units**: Make changes, watch logs for feedback
   - Tests reference spec sections in descriptions
   - Fix issues surfaced in log files

4. **Before handoff**: Run `pnpm post:report`
   - Ensures all quality gates pass (format, lint, typecheck, test, build)

## Tooling Defaults

- **Formatting**: Prettier with package.json plugin, printWidth 100 (import order handled by
  linting)
- **Linting**: Hybrid oxlint + ESLint for speed and comprehensive coverage
  - **Oxlint** (instant, ~550ms): 600+ rules for correctness, suspicious patterns, best practices
  - **ESLint** (comprehensive, ~8-15s): Type-aware rules, monorepo discipline, import ordering,
    naming conventions
  - Run both: `pnpm lint` executes oxlint first (fast feedback) then ESLint (full validation)
  - ESLint plugin automatically disables rules oxlint already checks (eliminates redundancy)
  - See `docs/specs/engineering/eslint_code_quality.md` §3.3 for import ordering details
- **Testing**: Vitest (jsdom, coverage via V8) with colocated test files (`*.test.ts`)
- **Type Checking**: TypeScript 5.9 strict mode (see
  `docs/specs/engineering/typescript_configuration.md`)
- **Tasks**: Nx orchestrates build, dev, lint, check-types, test, test:coverage; outputs cached
  except format/dev. Use `nx graph` to visualize the project graph
- **Hooks**: Husky pre-commit → `pnpm format:staged` (lint-staged)

## Core Concepts

### Agents & Workflows

Texere uses **LangGraph.js** to orchestrate multi-step coding tasks:

- **Agents**: Role-specific LLM entities with tool access (Spec Interpreter, Planner, Implementer,
  Reviewer, etc.)
- **Workflows**: Deterministic orchestration graphs (branching, loops, suspend/resume)
- **Tools**: Framework-agnostic functions for repo operations (code search, test running, VCS
  operations, etc.)
- **Threads & Runs**: Long-lived contexts for stateful interactions and checkpoints

See `docs/specs/feature/langgraph_orchestrator_spec.md` for full agent and workflow specifications.

### Framework-Agnostic Tools

Tools are defined once in `@repo/tools-core` and integrate with LangGraph.js via
`@repo/tools-langgraph`. See `docs/specs/feature/texere-tool-spec.md` for the tool abstraction
contract.

## Nx Generators (for reference)

For adding new packages/apps to the monorepo structure, refer to `AGENTS.md` for the fast-feedback
development workflow. Common Nx generation patterns are documented below for reference.

### Generate Apps

#### Next.js App

```bash
pnpm dlx nx generate @nx/next:app apps/my-app
```

#### Node.js App

```bash
pnpm dlx nx generate @nx/node:app apps/my-api --bundler=esbuild --unitTestRunner=vitest
```

### Generate Packages

#### TypeScript/Shared Library (Non-Buildable)

```bash
pnpm dlx nx generate @nx/js:library packages/shared-utils --bundler=none --unitTestRunner=vitest
```

#### TypeScript Library (Buildable with TSC)

```bash
pnpm dlx nx generate @nx/js:library packages/my-lib --bundler=tsc --unitTestRunner=vitest --linter=none
```

### Visualize & Verify

```bash
pnpm dlx nx graph           # View dependency graph
pnpm dlx nx show project my-lib  # Show targets for a project
pnpm --filter my-lib add dep  # Install deps in a specific workspace package
```

## Common Commands Summary

- `pnpm dev` – Run all packages in development mode (Nx parallel)
- `pnpm dev:log` – Run with filtered dev logs (for agent-driven development)
- `pnpm lint` – Hybrid linting: oxlint (fast baseline) then ESLint (comprehensive checks with
  type-aware rules)
- `pnpm typecheck` – Nx run-many for `check-types`
- `pnpm test` – Nx run-many for Vitest
- `pnpm test:coverage` – Nx run-many with coverage aggregation
- `pnpm build` – Nx run-many to build all packages
- `pnpm post:report` – Full quality gate: format, lint, typecheck, test, build
- `pnpm quality` – Quick quality check: format:check, lint, typecheck, test, build

## Specs & Documentation

**Canonical Spec Entrypoint:** `docs/specs/README.md`

Role-based reading order:

- **Developers/Agents**: Start with high-level spec, then feature specs
- **DevOps/Infra**: See observability and persistence sections (TBD)
- **Contributors**: Read `AGENTS.md` for development workflow and `docs/specs/meta/spec_writing.md`
  for how specs are authored

Key specs:

- **Architecture**: `docs/specs/README.md` (§ 3–7)
- **LangGraph Orchestrator**: `docs/specs/feature/langgraph_orchestrator_spec.md`
- **Tool Abstraction**: `docs/specs/feature/texere-tool-spec.md`
- **Engineering Standards**: `docs/specs/engineering/` (testing, linting, TypeScript, etc.)
- **Workflow Process**: `docs/specs/meta/llm_feature_workflow_full.md` (spec-first, TDD, iterative)

## Contributing

1. Clone the repo and run `pnpm install`
2. Read `AGENTS.md` for development workflow and validation requirements
3. Consult relevant specs in `docs/specs/` before making changes
4. Write tests that reference spec sections
5. Run `pnpm post:report` before committing
6. Specs are authoritative; code changes must align with specs or update specs first
