import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@repo/source'],
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
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['dist', '**/*.d.ts'],
    },
    setupFiles: './vitest.setup.ts',
  },
});
