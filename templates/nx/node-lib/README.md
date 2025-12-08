# **name**

Template library (Node ESM, Nx, TypeScript 5.9).

- Extends `@repo/typescript-config/node-library.json`
- Uses lib/spec tsconfig split (see docs/specs/engineering/typescript_configuration.md §4.1)
- Scripts: build (tsc lib), check-types (noEmit), lint (eslint), vitest (+coverage)
- Exports map required; default `type: module`
