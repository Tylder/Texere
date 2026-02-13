import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['@texere/source', 'import', 'module', 'default'],
  },
  ssr: {
    external: ['better-sqlite3'],
    resolve: {
      conditions: ['@texere/source', 'node', 'import', 'module', 'default'],
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts', 'dist/**', '**/node_modules/**'],
  },
});
