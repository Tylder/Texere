# **name** (Next.js)

> **description**

Next.js app template aligned with Nx + strict TypeScript.

## At a Glance

- Extends `@repo/typescript-config/nextjs.json` (Bundler resolution, JSX preserve, no emit)
- Tsconfig split: `tsconfig.json` + `tsconfig.app.json` (noEmit) + `tsconfig.spec.json` (tests)
- Scripts: `dev`, `build`, `start`, `lint`, `check-types`, `test`, `test:coverage` (vitest v8,
  jsdom)
- Coverage thresholds + include/exclude in `vitest.config.ts` (testing_strategy §2.2)
- Tags: replace `scope:__scope__` with an allowed scope (see AGENTS.md)

## Quickstart

1. Copy to `apps/<name>/`; replace placeholders.
2. Add the project to root `tsconfig.json` references.
3. `pnpm install` → `pnpm nx graph` to verify.
4. `pnpm dev` to start; `pnpm post:report:fast` for quick QA.

## Structure

- `app/` – routes/pages; add your UI here.
- `components/` – colocate `*.test.tsx` files with spec references in describes.
- `tsconfig.*` – app/spec split; Bundler resolution only here (not for libs).
- `vitest.config.ts` – jsdom env, v8 coverage thresholds + include/exclude.

## Testing Standards

All test files must cite their governing spec sections in the describe block:

```typescript
describe('MyPage (ADR-VI-TECH-6 §2.2–§4.4, ADR-VI-TECH-7 §3–§6)', () => {
  it('renders the dashboard', () => {
    render(<MyPage />);
    // assertions
  });
});
```

This ensures traceability to the testing standards documented in
[ADR-VI-TECH-6 §2.2–§4.4](../../../../../docs/engineering/03-adrs/ADR-VI-TECH-6-testing-strategy-trophy.md)
and
[ADR-VI-TECH-7 §3–§6](../../../../../docs/engineering/03-adrs/ADR-VI-TECH-7-testing-implementation-specification.md).

Coverage targets are **70–80%** per
[ADR-VI-TECH-7 §Coverage Targets](../../../../../docs/engineering/03-adrs/ADR-VI-TECH-7-testing-implementation-specification.md#coverage-targets--quality-gates).
Focus on integration tests (60–70%) and critical paths at 100%; aim for 70%+ overall.

## Quality & Tooling

- Husky pre-commit runs `pnpm quality`; ensure new paths are formatted.
- Lint: `pnpm nx run __name__:lint`; Typecheck: `...:check-types`; Build via Next (`next build`).
- Lint target caches inputs (app/pages/components + optional local eslint config) and uses the
  shared root ESLint config by default.

## Docs & Specs

- TypeScript config: `docs/specs/engineering/typescript_configuration.md`
- Testing strategy/specification:
  [ADR-VI-TECH-6](../../../../../docs/engineering/03-adrs/ADR-VI-TECH-6-testing-strategy-trophy.md)
  (§2.2),
  [ADR-VI-TECH-7](../../../../../docs/engineering/03-adrs/ADR-VI-TECH-7-testing-implementation-specification.md)
  (§3)
