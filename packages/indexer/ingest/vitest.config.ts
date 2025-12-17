import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@repo/source', 'import', 'module', 'default'],
  },
  ssr: {
    resolve: {
      // Ensure Vitest (SSR) prefers source before dist; keep node/import defaults for fallbacks
      conditions: ['@repo/source', 'node', 'import', 'module', 'default'],
    },
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    exclude: ['**/.cache/**', 'dist', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      thresholds: {
        statements: 60,
        lines: 60,
        functions: 60,
        branches: 50,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/.cache/**', 'dist', '**/*.d.ts', '**/node_modules/**'],
    },
    setupFiles: './vitest.setup.ts',
  },
});
