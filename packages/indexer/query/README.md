# indexer-query

> Indexer query layer: agent-facing read APIs over graph/vector stores.

Modern Node/ESM library template aligned with Nx + strict TypeScript.

## At a Glance

- Extends `@repo/typescript-config/node-library.json` (ES2023, NodeNext, declarations,
  `sideEffects`: false)
- Tsconfig split: `tsconfig.json` (references), `tsconfig.lib.json` (emit), `tsconfig.spec.json`
  (tests)
- Scripts: `build` (tsc lib), `check-types` (noEmit), `lint` (eslint), `test` / `test:coverage`
  (vitest v8)
- Coverage thresholds + include/exclude pre-set in `vitest.config.ts` (testing_strategy §2.2)
- Exports map provided; `type: module`; treeshaking-friendly
- Tags: replace `scope:indexer` with an allowed scope (see AGENTS/README)

## Quickstart

1. Copy to `packages/<name>/`; replace `indexer-query`,
   `Indexer query layer: agent-facing read APIs over graph/vector stores.`, `indexer`.
2. Add the project to root `tsconfig.json` references.
3. `pnpm install` if new deps → `pnpm nx graph` to verify pickup.
4. `pnpm post:report:fast` during development.

## Structure

- `src/` – library source (colocate `*.test.ts` with spec references in describes).
- `tsconfig.*` – lib/spec split; NodeNext; no bundler resolution.
- `vitest.config.ts` – v8 coverage thresholds + include/exclude.

## Quality & Tooling

- Husky pre-commit runs `pnpm format:staged`; ensure new paths are formatted.
- Lint: `pnpm nx run indexer-query:lint`; Typecheck: `pnpm nx run indexer-query:check-types`; Build
  emits d.ts to `dist/`.
- Lint target caches inputs (src + optional local eslint config) and uses the shared root ESLint
  config by default.

## Docs & Specs

- TypeScript config: `docs/specs/engineering/typescript_configuration.md`
- Testing strategy/specification: `docs/specs/engineering/testing_strategy.md`,
  `docs/specs/engineering/testing_specification.md`
