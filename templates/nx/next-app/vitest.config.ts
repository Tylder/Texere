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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 60,
        lines: 60,
        functions: 60,
        branches: 50,
      },
      include: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['.next', 'dist', '**/*.d.ts'],
    },
    setupFiles: './vitest.setup.ts',
  },
});
