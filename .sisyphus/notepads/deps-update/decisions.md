# Decisions: deps-update

## Architectural Choices

- Stay on ESLint 9.39.2 (latest 9.x) - ESLint 10 ecosystem not ready
- Use @types/node@25.2.3 (latest, compatible with Vitest 4 peer dep >=24)
- Exclude .opencode/package.json from updates (outside pnpm workspace)
- All-at-once upgrade strategy (fix breakage iteratively after)
