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
   - After adding/moving a project, run `nx sync` to refresh the Nx + TypeScript project graph
     (keeps root `tsconfig.json` references in sync with the workspace).

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

## Development Commands

### Quick Feedback During Coding

These commands run while you're actively writing code:

- **`pnpm dev`** – Run all packages in development mode (Nx parallel). Use this to see runtime
  changes as you code.
- **`pnpm dev:log`** – Run with filtered dev logs written to `logs/dev.log`. Recommended for
  agent-driven development (reduces noise, keeps focus).
- **`pnpm typecheck:watch:log`** – Watch mode for type checking; logs to `logs/typecheck.log`. Run
  in a separate terminal while developing.

### After Each Code Change

- **`pnpm post:report:fast`** – Quick validation (~30s): format + oxlint fix + typecheck +
  test:coverage. Use this after each code change to catch obvious issues without waiting for full
  ESLint.

### Quality Gates

These commands validate code quality:

- **`pnpm format:check`** – Check if code is formatted with Prettier (no changes). Part of CI.
- **`pnpm format`** – Auto-format code with Prettier (modifies files).
- **`pnpm lint:fast`** – Run oxlint only (~550ms) for instant baseline checks (syntax, unused
  variables, import order validation).
- **`pnpm lint:fix:fast`** – Run oxlint with `--fix` to auto-fix basic issues (fast iteration).
- **`pnpm lint`** – Full hybrid linting: oxlint (~550ms) + ESLint (~8-15s). Validates import order,
  type safety, monorepo discipline, async safety.
- **`pnpm lint:fix`** – ESLint fix (import order, type imports) + oxlint fix. Use before committing
  to fix all auto-fixable issues.
- **`pnpm typecheck`** – TypeScript type checking. Catches type errors without running code.
- **`pnpm test`** – Run all tests with Vitest.
- **`pnpm test:coverage`** – Run tests with coverage reports aggregated across monorepo.
- **`pnpm build`** – Build all packages in parallel (creates dist/ outputs). Uses Nx task
  orchestration with TypeScript composite projects for proper dependency ordering. See
  `docs/specs/engineering/build_system.md` for architecture and troubleshooting.

### Validation Workflows

- **`pnpm post:report:fast`** (~30s) – Use after each code change: format + oxlint fix + typecheck +
  test coverage. Skips full ESLint and build for speed.
- **`pnpm post:report`** (~60s) – Use at end of feature/section: format + lint (full ESLint) +
  typecheck + test:coverage + build. Comprehensive validation before handoff.
- **`pnpm quality`** – One-time quality check: format:check + lint + typecheck + test + build. Does
  not modify files.
- **`pnpm format:staged`** – Format only staged files (runs on pre-commit via Husky).

### Workflow Summary

**During active development:**

```bash
# Terminal 1: Runtime feedback
pnpm dev:log

# Terminal 2: Type feedback
pnpm typecheck:watch:log

# Terminal 3: As you make changes
pnpm post:report:fast  # After each code change (~30s)
```

**Before committing:**

```bash
pnpm post:report  # Full validation (~60s)
```

**In CI/before merge:**

```bash
pnpm quality  # Comprehensive check
```

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
