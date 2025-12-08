# **name** (Next.js)

> **description**

Next.js app template aligned with Nx + strict TypeScript.

## At a Glance

- Extends `@repo/typescript-config/nextjs.json` (Bundler resolution, JSX preserve, no emit)
- Tsconfig split: `tsconfig.json` + `tsconfig.app.json` (noEmit) + `tsconfig.spec.json` (tests)
- Scripts: `dev`, `build`, `start`, `lint`, `check-types`, `test`, `test:coverage` (vitest v8,
  jsdom)
- Coverage thresholds + include/exclude in `vitest.config.ts` (testing_strategy §2.2)
- Tags: replace `scope:__scope__` with an allowed scope (see AGENTS/README)

## Quickstart

1. Copy to `apps/<name>/`; replace placeholders.
2. Add the project to root `tsconfig.json` references.
3. `pnpm install` → `pnpm nx graph` to verify.
4. `pnpm dev` to start; `pnpm post:report:fast` for quick QA.

## Structure

- `app/` – routes/pages; add your UI here.
- `tsconfig.*` – app/spec split; Bundler resolution only here (not for libs).
- `vitest.config.ts` – jsdom env, v8 coverage thresholds + include/exclude.

## Quality & Tooling

- Husky pre-commit runs `pnpm format:staged`; ensure new paths are formatted.
- Lint: `pnpm nx run __name__:lint`; Typecheck: `...:check-types`; Build via Next (`next build`).
- Lint target caches inputs (app/pages/components + optional local eslint config) and uses the
  shared root ESLint config by default.

## Docs & Specs

- TypeScript config: `docs/specs/engineering/typescript_configuration.md`
- Testing strategy/specification: `docs/specs/engineering/testing_strategy.md`,
  `docs/specs/engineering/testing_specification.md`
