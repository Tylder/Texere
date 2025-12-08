# **name** (React library)

Template React library (ESM, Nx, TypeScript 5.9).

- Extends `@repo/typescript-config/react-library.json` (JSX + DOM libs, NodeNext)
- Uses lib/spec tsconfig split per docs/specs/engineering/typescript_configuration.md §4.1
- Peer deps on react/react-dom; `type: module`; exports map provided.
- Coverage thresholds set in `vitest.config.ts` per testing_strategy §2.2.
- Align scope tag (`scope:__scope__`) with AGENTS/README; update before use.
- Husky pre-commit runs `pnpm format:staged`; ensure new paths are covered.
