# **name**

Template library (Node ESM, Nx, TypeScript 5.9).

- Extends `@repo/typescript-config/node-library.json`
- Uses lib/spec tsconfig split (see docs/specs/engineering/typescript_configuration.md §4.1)
- Scripts: build (tsc lib), check-types (noEmit), lint (eslint), vitest (+coverage)
- Exports map required; default `type: module`
- Coverage thresholds set in `vitest.config.ts` per testing_strategy §2.2 (trophy targets baseline).
- See allowed scope tags in AGENTS/README; replace `scope:__scope__` accordingly.
- Husky pre-commit runs `pnpm format:staged`; ensure new paths are covered.
