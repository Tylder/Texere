# Contributing to Texere

Thanks for considering a contribution to Texere.

Texere is a TypeScript monorepo with two public surfaces:

- `packages/graph` — the core immutable graph library
- `apps/mcp` — the MCP server built on top of the graph library

## Before you start

- Node.js 20 or later
- pnpm 10.29.3 or later

From the repo root:

```bash
pnpm install
pnpm build
```

## Development workflow

### Recommended flow

1. Create a branch from the branch you are working against.
2. Make a focused change.
3. Run the relevant checks locally.
4. Open a pull request with a clear summary and rationale.

Please prefer small, reviewable pull requests over large mixed changes.

## Quality checks

Texere uses strict TypeScript, linting, formatting, and tests.

Common commands from the repo root:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm quality
```

If you changed only one package, it is still helpful to run the root-level commands before opening a
PR because release validation runs from the monorepo root.

## Project conventions

### General

- Use TypeScript with explicit types where the project expects them.
- Follow the existing import ordering and naming conventions.
- Prefer small, targeted diffs over broad rewrites.
- Keep public documentation accurate when behavior changes.

### Graph model rules

- Nodes are immutable.
- Do not introduce in-place node mutation flows.
- Use replacement and invalidation semantics that match the existing graph model.

### MCP tool rules

- Keep MCP inputs JSON-friendly and schema-first.
- Preserve the snake_case external API used by the tool surface.
- Avoid adding top-level schema unions that are awkward for MCP consumers.

## Tests and validation

When you change behavior, add or update tests close to the affected code.

- graph package tests live alongside `packages/graph/src`
- MCP package tests live alongside `apps/mcp/src`

Use real project behavior where possible instead of replacing the core graph model with mocks.

## Documentation changes

If your change affects how the project is used or understood, update the relevant docs:

- `README.md` for the repo entry point
- `apps/mcp/README.md` for MCP usage and tool-surface changes
- `packages/graph/README.md` for library API or model changes

## Pull requests

Please include:

- what changed
- why it changed
- how you validated it
- any follow-up work that remains

If a change is intentionally internal, experimental, or not meant for the public branch yet, keep it
out of the public-facing promotion path.

## Code of conduct

By participating in this project, you agree to follow the guidelines in
[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
