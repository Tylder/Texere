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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 70,
        lines: 70,
        functions: 70,
        branches: 60, // Lower for integration-heavy module with many external tool error paths
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/.cache/**', 'dist', '**/*.d.ts', '**/node_modules/**'],
    },
    setupFiles: './vitest.setup.ts',
  },
});
