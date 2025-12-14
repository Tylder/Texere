# @repo/indexer-utils

> Shared utilities for indexer CLI, workers, servers, and agents

Modern Node/ESM library of reusable utility functions extracted from the Texere Indexer CLI.

## At a Glance

- **OutputFormatter** — Consistent text and JSON formatting for CLI commands
- **JsonFormatter** — JSON output structure with command and timestamp
- **OutputHandler** — Generic output router based on format type
- Zero external dependencies (pure utility)
- Extends `@repo/typescript-config/node-library.json` (ES2023, NodeNext, declarations)
- Full test coverage via Vitest + v8

## Exports

```typescript
// Output formatting
export { TextFormatter, JsonFormatter, OutputHandler };
export type { OutputFormat, JsonOutput };
```

## Usage

```typescript
import { TextFormatter, OutputHandler } from '@repo/indexer-utils';

// Text output
const header = TextFormatter.section('Status');
const pair = TextFormatter.pair('Daemon', 'running');

// JSON output
const handler = new OutputHandler('json');
handler.output(textContent, jsonContent);
```

## Dependencies

- **No runtime dependencies** — pure utility functions
- Dev: @repo/eslint-config, @repo/typescript-config, @vitest/coverage-v8, vitest

## Allowed Dependencies

- `@repo/indexer-types` (if logging/config types needed in future)

## Forbidden Dependencies

- `@repo/indexer-core` (avoid circular deps)
- `@repo/indexer-ingest` (avoid circular deps)
- `@repo/indexer-query` (avoid circular deps)

## Commands

```bash
pnpm nx run indexer-utils:build      # Build to dist/
pnpm nx run indexer-utils:test       # Run tests
pnpm nx run indexer-utils:test:coverage  # Tests + coverage
pnpm nx run indexer-utils:check-types    # Type check
pnpm nx run indexer-utils:lint       # Lint & format
```

## Tests

Tests are colocated with source (e.g., `output-formatter.test.ts` next to `output-formatter.ts`).
Reference spec section in test `describe()` blocks per
[testing_specification.md §3.6](../../../docs/specs/engineering/testing_specification.md#36-test-file-structure).

## See Also

- [testing_specification.md](../../../docs/specs/engineering/testing_specification.md) — Test
  patterns & structure
- [testing_strategy.md](../../../docs/specs/engineering/testing_strategy.md) — Testing philosophy
- [config-schema-cli-refactoring.md](../../../docs/specs/feature/indexer/implementation/config-schema-cli-refactoring.md)
  — Phase 3 extraction details
