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
    environment: 'jsdom',
    globals: true,
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
      include: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['**/.cache/**', '.next', 'dist', '**/*.d.ts', '**/node_modules/**'],
    },
    setupFiles: './vitest.setup.ts',
  },
});
