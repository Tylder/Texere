import { defineConfig } from 'vitest/config';

const reportersInCI = process.env.CI ? ['text', 'json'] : ['text', 'json', 'html'];

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './vitest.setup.ts',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: reportersInCI,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/', 'dist/', '**/*.spec.ts', '**/*.spec.tsx'],
    },
  },
});
