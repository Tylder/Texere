import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@repo/source', 'import', 'module', 'default'],
  },
  ssr: {
    resolve: {
      conditions: ['@repo/source', 'node', 'import', 'module', 'default'],
    },
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/.cache/**', 'dist', '**/node_modules/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      thresholds: {
        statements: 10,
        lines: 10,
        functions: 10,
        branches: 10,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/.cache/**', 'dist', '**/*.d.ts', '**/node_modules/**'],
    },
    setupFiles: './vitest.setup.ts',
  },
});
