import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      exclude: ['src/**/*.integration.test.ts', 'dist/**', '**/node_modules/**'],
    },
  }),
);
