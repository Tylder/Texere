# Nx Templates (Dec 2025)

Purpose: fast, spec-aligned scaffolds for new packages/apps without running Nx generators. Use when
you need deterministic boilerplate that already matches our TypeScript, lint, and test standards.

## Which template to pick

- **Node Library (ESM)** (`templates/nx/node-lib`)
  - Use for non-web, publishable libraries (runtime, tools, shared logic) targeting Node/ESM.
  - Extends `@repo/typescript-config/node-library.json` (ES2023, NodeNext, declarations on,
    verbatimModuleSyntax, incremental). Follows lib/spec tsconfig split (see
    `docs/specs/engineering/typescript_configuration.md §4.1`).
- **React Library** (`templates/nx/react-lib`)
  - Use for component libraries or hooks meant to be consumed by web apps. Extends
    `@repo/typescript-config/react-library.json` (adds JSX + DOM libs). Peer deps on
    `react`/`react-dom`.
- **Next.js App** (`templates/nx/next-app`)
  - Use for web apps. Extends `@repo/typescript-config/nextjs.json` (Bundler resolution, JSX
    preserve, no emit). Targets wired for dev/build/lint/test; place routes in `app/`.

## How to scaffold (manual copy)

1. Copy template into place:
   - Node/React lib → `cp -r templates/nx/<node-lib|react-lib> packages/<name>/`
   - Next app → `cp -r templates/nx/next-app apps/<name>/`
2. Replace placeholders in copied files:
   - `__name__` → folder & package name (e.g., `lang-utils` / `@repo/lang-utils`)
   - `__description__` → short description
   - `__scope__` → tag scope for Nx (e.g., `scope:orch`, `scope:tools`)
3. Adjust tags in `project.json` if needed; ensure they match repo conventions.
4. Run `pnpm install` if new deps were added (React/Next templates).
5. Run `pnpm nx graph` to verify the project is picked up.

## What’s included (libraries)

- `package.json` with `type: module`, exports map, build/check-types/lint/vitest scripts.
- `project.json` targets (build, check-types, lint, test, test:coverage, test:watch).
- Tsconfig split: `tsconfig.json` (references only) + `tsconfig.lib.json` (emit) +
  `tsconfig.spec.json` (tests with vitest/globals).

## What’s included (Next app)

- `project.json` targets: dev, build, start, lint, check-types, test, test:coverage.
- `tsconfig.json` extends nextjs preset; paths alias `@/*` → project root.
- `package.json` scripts aligned with Next + vitest.

## When NOT to use

- If you need a custom bundler (e.g., esbuild library) or different module target, start from Nx
  generators instead and then align configs manually.
- If you need CJS output, these templates assume ESM-only; adjust `type` and tsconfig accordingly.

## References (keep in sync)

- Nx TypeScript project linking: https://nx.dev/concepts/typescript-project-linking
- Nx TS workspace recipe: https://nx.dev/recipes/other/switch-to-workspaces-project-references
- Nx Next.js guide: https://nx.dev/recipes/next/overview
- TypeScript NodeNext resolution: https://www.typescriptlang.org/tsconfig/moduleResolution.html
- Repo spec: `docs/specs/engineering/typescript_configuration.md` (lib/spec split §4.1)
