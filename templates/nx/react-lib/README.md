# **name** (React)

> **description**

React library template (ESM, Nx, strict TypeScript).

## At a Glance

- Extends `@repo/typescript-config/react-library.json` (JSX + DOM, NodeNext, `sideEffects`: false)
- Tsconfig split: `tsconfig.json` (references), `tsconfig.lib.json` (emit), `tsconfig.spec.json`
  (tests)
- Scripts: `build`, `check-types`, `lint`, `test`, `test:coverage` (vitest v8, jsdom)
- Coverage thresholds + include/exclude in `vitest.config.ts` (testing_strategy §2.2)
- Peer deps: `react`, `react-dom`; exports map provided; `type: module`
- Tags: replace `scope:__scope__` with an allowed scope (see AGENTS/README)

## Quickstart

1. Copy to `packages/<name>/`; replace placeholders.
2. Add the project to root `tsconfig.json` references.
3. `pnpm install` → `pnpm nx graph` to verify.
4. `pnpm post:report:fast` during development.

## Structure

- `src/` – components/hooks; colocate `*.test.tsx` with spec references in describes.
- `tsconfig.*` – lib/spec split; React preset.
- `vitest.config.ts` – jsdom env, v8 coverage thresholds + include/exclude.

## Quality & Tooling

- Husky pre-commit runs `pnpm format:staged`; ensure new paths are formatted.
- Lint: `pnpm nx run __name__:lint`; Typecheck: `...:check-types`; Build emits d.ts to `dist/`.
- Lint target caches inputs (src + optional local eslint config) and uses the shared root ESLint
  config by default.

## Docs & Specs

- TypeScript config: `docs/specs/engineering/typescript_configuration.md`
- Testing strategy/specification: `docs/specs/engineering/testing_strategy.md`,
  `docs/specs/engineering/testing_specification.md`
