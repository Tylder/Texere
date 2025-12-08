# **name** (Next.js app)

Template Next.js app aligned with Nx and repo TypeScript presets.

- Extends `@repo/typescript-config/nextjs.json` (Bundler resolution, JSX preserve, no emit)
- Targets wired in `project.json` for dev/build/lint/test/check-types
- Uses `tsconfig.app.json` (noEmit) and `tsconfig.spec.json` for tests.
- Coverage thresholds set in `vitest.config.ts` per testing_strategy §2.2.
- Add Next routing/files under `apps/__name__/app`.
- Align scope tag (`scope:__scope__`) with AGENTS/README; update before use.
- Husky pre-commit runs `pnpm format:staged`; ensure new paths are covered.
