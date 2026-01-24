# **name**

> **description**

Modern Node/ESM server application template aligned with Nx + strict TypeScript.

## At a Glance

- Extends `@repo/typescript-config/node-library.json` (ES2023, NodeNext, declarations,
  `type: module`)
- Tsconfig split: `tsconfig.json` (references), `tsconfig.lib.json` (emit), `tsconfig.spec.json`
  (tests)
- Scripts: `build` (tsc app), `check-types` (noEmit), `dev` (node --watch), `start` (node), `lint`
  (eslint), `test` / `test:coverage` (vitest v8)
- Coverage thresholds + include/exclude pre-set in `vitest.config.ts` (testing_strategy §2.2)
- Tags: replace `scope:graph` with an allowed scope (see AGENTS.md)

## Quickstart

1. Copy to `apps/<name>/`; replace `graph-cli-app`,
   `Interactive CLI for testing graph system features`, `graph`.
2. Add the project to root `tsconfig.json` references.
3. `pnpm install` if new deps → `pnpm nx graph` to verify pickup.
4. `pnpm post:report:fast` during development.

## Structure

- `src/index.ts` – application entry point.
- `src/` – server source; colocate `*.test.ts` with spec references in describes.
- `tsconfig.*` – lib/spec split; NodeNext; no bundler resolution.
- `vitest.config.ts` – v8 coverage thresholds + include/exclude.

## Testing Standards

All test files must cite their governing spec sections in the describe block:

```typescript
describe('MyService (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('does something', () => {
    // test body
  });
});
```

This ensures traceability to the testing standards documented in
[SPEC-tooling-testing-trophy-strategy §2.2–§4.4](../../../../../docs/engineering/03-adrs/SPEC-tooling-testing-trophy-strategy-testing-strategy-trophy.md)
and
[SPEC-tooling-testing-implementation-specification §3–§6](../../../../../docs/engineering/03-adrs/SPEC-tooling-testing-implementation-specification-testing-implementation-specification.md).

Coverage targets are **70–80%** per
[SPEC-tooling-testing-implementation-specification §Coverage Targets](../../../../../docs/engineering/03-adrs/SPEC-tooling-testing-implementation-specification-testing-implementation-specification.md#coverage-targets--quality-gates).
Focus on critical paths at 100%; aim for 70%+ overall.

## Development

- `pnpm nx run <name>:dev` – Node with file watch (rebuilds on src changes).
- `pnpm nx run <name>:build` – Compile to `dist/`; needed before running locally.
- `pnpm nx run <name>:start` – Run the built app from `dist/index.js`.

## Quality & Tooling

- Husky pre-commit runs `pnpm quality`; ensure new paths are formatted.
- Lint: `pnpm nx run <name>:lint`; Typecheck: `pnpm nx run <name>:check-types`; Build emits to
  `dist/`.
- Lint target caches inputs (src + optional local eslint config) and uses the shared root ESLint
  config by default.

## Docs & Specs

- TypeScript config: `docs/specs/engineering/typescript_configuration.md`
- Testing strategy/specification:
  [SPEC-tooling-testing-trophy-strategy](../../../../../docs/engineering/03-adrs/SPEC-tooling-testing-trophy-strategy-testing-strategy-trophy.md)
  (§2.2),
  [SPEC-tooling-testing-implementation-specification](../../../../../docs/engineering/03-adrs/SPEC-tooling-testing-implementation-specification-testing-implementation-specification.md)
  (§3)
