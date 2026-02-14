# Issues: deps-update

## Known Issues

- eslint-plugin-oxlint@1.46 may have API change: configs.recommended.rules →
  configs['flat/recommended']

## Resolved Issues

- ✅ vitest.workspace.ts deprecated in Vitest 4 (renamed to projects) — RESOLVED: Deleted file,
  per-package configs handle discovery

## Gotchas

## Task 4 Updates

- ✅ eslint-plugin-oxlint@1.46 API concern was a false alarm — `configs.recommended.rules` still
  works unchanged
- ✅ Prettier 3.8 formatting differences were trivially auto-fixed with `pnpm format`
- ✅ TypeScript 5.9.3 and @types/node 25.2.3 introduced zero breaking changes
