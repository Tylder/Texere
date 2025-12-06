import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './vitest.setup.ts',
    passWithNoTests: true,
    // Include test blocks in source files (colocated pattern per testing_specification §3.1)
    include: ['src/**/*.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/', 'dist/', '**/*.spec.ts', '**/*.spec.tsx'],
    },
  },
});
