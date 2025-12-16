import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@repo/source'],
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        // CLI package has thin wrapper design; core logic tested in indexer-core/ingest
        // Commands delegate to orchestrator and config modules (tested elsewhere)
        // Slice 1 focuses on CLI contracts & daemon lifecycle; deeper coverage in Slice 7+
        statements: 38,
        lines: 38,
        functions: 50,
        branches: 30,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['dist', '**/*.d.ts', 'src/main.ts'],
    },
    setupFiles: './vitest.setup.ts',
  },
});
